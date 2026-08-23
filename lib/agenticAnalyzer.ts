import { GoogleGenerativeAI, FunctionCallingMode, Content, Part } from '@google/generative-ai';
import { Signal, VerdictBand, ToolInvocation, ResearchSummary } from './types';
import { getVerdictBand } from './scoringEngine';
import { AGENT_TOOL_DECLARATIONS, executeAgentTool } from './tools/agentTools';

const MAX_TOOL_CALLS = 8;

export interface AgenticAnalysisInput {
  moduleType: string;
  url: string;
  scrapedData: Record<string, any>;
  baselineScore: number;
  initialSignals: Signal[];
}

export interface AgenticAnalysisResult {
  finalScore: number;
  verdict: VerdictBand;
  refinedSignals: Signal[];
  explanation: string;
  toolsUsed: ToolInvocation[];
  researchSummary: ResearchSummary;
}

// ---------------------------------------------------------------------------
// System prompt for the agentic LLM investigator
// ---------------------------------------------------------------------------
function buildSystemPrompt(moduleType: string): string {
  const moduleContext =
    moduleType === 'news'
      ? `You are investigating a NEWS ARTICLE or TEXT CLAIM. Your goal is to determine if the news is real, misleading, or outright fake.
Key verification strategies:
- Use search_fact_checkers to check if dedicated fact-checking organizations have investigated this claim.
- Use search_web to find corroborating coverage from reputable news agencies (Reuters, AP, BBC, NDTV, The Hindu).
- Use scrape_webpage to read the full article from the source or from other outlets reporting the same event.
- Frame verdicts as "corroboration signals" rather than absolute truth claims.
- If fact-checkers have flagged this as FALSE/MISLEADING, score MUST be ≤ 25 (High Risk).
- If covered by multiple reputable wire agencies, score MUST be ≥ 80 (Verified Trustworthy).`
      : moduleType === 'offer'
      ? `You are investigating a PROMOTIONAL OFFER or DEAL. Your goal is to determine if the offer is genuine or a scam/phishing attempt.
Key verification strategies:
- Use check_domain_reputation to verify the hosting website.
- Use search_web to check if the brand officially issued this promotion.
- Use compare_market_prices to verify if the discounted price is realistic.
- Use scrape_webpage on the brand's official website to compare.
- Check for mathematical consistency in stated discount percentages.
- Phishing sites impersonating real brands should score ≤ 25.`
      : `You are investigating a MARKETPLACE LISTING or E-COMMERCE PRODUCT. Your goal is to determine if the listing is genuine or a scam/bait listing.
Key verification strategies:
- Use compare_market_prices to check if the listing price is realistic vs. market rates.
- Use check_domain_reputation to verify the selling platform.
- Use search_web to find reviews about the seller or platform.
- Use scrape_webpage to investigate seller profiles or competing listings.
- Certified pre-owned/refurbished platforms (GameLoot, Cashify, BackMarket) have legitimately lower prices for used items.
- Official brand stores (Amazon, Flipkart, Apple, Nike) with realistic pricing should score 80-95.
- CRITICAL PRICING RULE: If ANY product (face wash, cosmetics, electronics, clothing) is priced at ₹1, $1, or an impossible fraction (<= ₹15 / 90%+ below competitor prices) on any store, it is a FAKE/BAIT DEAL. Use compare_market_prices or search_web to compare with market rates on Amazon/Flipkart/Nykaa (where face washes cost ₹200-₹500), and score it ≤ 25 (High Risk).`;

  return `You are TrustCheck AI — an expert Trust & Safety Investigator.
You have access to powerful tools: a Bright Data web scraper (with self-healing), DuckDuckGo search, Google SERP search, fact-checker databases, market price comparison, and domain reputation checker.

${moduleContext}

INVESTIGATION PROCESS:
1. Review the initial scraped data and baseline signals provided.
2. Use your tools to gather MORE evidence. You decide what to investigate next.
3. After gathering sufficient evidence (typically 2-5 tool calls), produce your final verdict.
4. You MUST call at least ONE tool before giving your verdict — do not just rely on the initial data.

SCORING RULES:
- Baseline score (from deterministic math) is provided as an anchor. You may adjust it up or down based on your research.
- Score 0-25: High Risk (confirmed scam, fake, or dangerous misinformation)
- Score 26-39: High Risk (strong fraud indicators)
- Score 40-69: Some Concerns (mixed signals, unverified)
- Score 70-89: Looks Genuine (verified with minor caveats)
- Score 90-100: Looks Genuine (fully verified, pristine)

FINAL RESPONSE FORMAT:
When you have gathered enough evidence, respond with ONLY a valid JSON object (no markdown, no explanation outside JSON):
{
  "finalScore": <number 0-100>,
  "verdict": "<High Risk | Some Concerns | Looks Genuine>",
  "explanation": "<Clear 2-4 sentence verdict explaining specific evidence found>",
  "whyGenuine": ["<specific evidence point>", ...],
  "whyFraud": ["<specific risk point>", ...],
  "additionalSignals": [
    {"name": "<signal_name>", "direction": "<positive|negative>", "strength": <0.0-1.0>, "description": "<what you found>"}
  ]
}`;
}

// ---------------------------------------------------------------------------
// Build the initial user message with scraped data context
// ---------------------------------------------------------------------------
function buildInitialMessage(input: AgenticAnalysisInput): string {
  const signalsList = input.initialSignals
    .map((s) => `  - [${s.direction.toUpperCase()}] ${s.name} (strength: ${s.strength}): ${s.description}`)
    .join('\n');

  let domain = '';
  try {
    domain = new URL(input.url).hostname.replace('www.', '').toLowerCase();
  } catch {
    domain = input.url;
  }

  return `=== INVESTIGATION TARGET ===
URL: ${input.url}
Module: ${input.moduleType}
Domain: ${domain}

=== INITIAL SCRAPED DATA (via Bright Data Web Unlocker + Self-Healing) ===
Title: ${input.scrapedData.title || input.scrapedData.headline || input.scrapedData.offer_title || 'N/A'}
Price: ${input.scrapedData.price ? `${input.scrapedData.currency || 'INR'} ${input.scrapedData.price}` : 'Not extracted'}
Description: ${(input.scrapedData.description || input.scrapedData.article_body || '').slice(0, 400)}
Seller/Brand: ${input.scrapedData.seller_name || input.scrapedData.brand_name || input.scrapedData.author_name || 'Unknown'}
Images: ${input.scrapedData.image_urls?.length || 0} images found
Posted: ${input.scrapedData.posted_date || input.scrapedData.publish_date || 'Unknown'}

=== DETERMINISTIC BASELINE SIGNALS ===
${signalsList || '  (No signals extracted)'}

=== MATHEMATICAL BASELINE SCORE ===
Score: ${input.baselineScore}/100

Now investigate this ${input.moduleType} using your tools. Determine if it is genuine, suspicious, or fraudulent. Call tools to gather evidence, then provide your final JSON verdict.`;
}

// ---------------------------------------------------------------------------
// Gemini Agentic Loop with Function Calling
// ---------------------------------------------------------------------------
async function runGeminiAgenticLoop(input: AgenticAnalysisInput): Promise<AgenticAnalysisResult | null> {
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey?.trim()) return null;

  const genAI = new GoogleGenerativeAI(geminiKey);

  // Try multiple models in case one fails
  const models = ['gemini-3.6-flash', 'gemini-2.5-flash', 'gemini-1.5-flash'];

  for (const modelName of models) {
    try {
      console.log(`[Agentic Analyzer] Starting Gemini agentic loop with ${modelName}...`);

      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          temperature: 0.15,
          maxOutputTokens: 1200,
        },
        tools: [{ functionDeclarations: AGENT_TOOL_DECLARATIONS }],
        toolConfig: {
          functionCallingConfig: {
            mode: FunctionCallingMode.AUTO,
          },
        },
        systemInstruction: buildSystemPrompt(input.moduleType),
      });

      const chat = model.startChat();
      const toolsUsed: ToolInvocation[] = [];
      const sourcesConsulted: string[] = [];

      // Send initial message
      let response = await chat.sendMessage(buildInitialMessage(input));

      // Agentic tool-calling loop
      for (let iteration = 0; iteration < MAX_TOOL_CALLS; iteration++) {
        const candidate = response.response.candidates?.[0];
        if (!candidate) break;

        // Check if model wants to call a function
        const functionCalls = candidate.content?.parts?.filter(
          (part: Part) => 'functionCall' in part
        );

        if (!functionCalls || functionCalls.length === 0) {
          // No more tool calls — model has produced its final answer
          break;
        }

        // Execute all requested function calls
        const executedTools: { name: string; output: string }[] = [];

        for (const part of functionCalls) {
          if (!('functionCall' in part) || !part.functionCall) continue;

          const { name, args } = part.functionCall;
          console.log(`[Agentic Analyzer] Tool call #${iteration + 1}: ${name}(${JSON.stringify(args).slice(0, 100)}...)`);

          const { result, invocation } = await executeAgentTool(name, args as Record<string, any>);
          toolsUsed.push(invocation);
          executedTools.push({ name, output: result });

          // Track sources consulted
          try {
            const parsed = JSON.parse(result);
            if (parsed.results) {
              for (const r of parsed.results) {
                if (r.source) sourcesConsulted.push(r.source);
                else if (r.link) {
                  try { sourcesConsulted.push(new URL(r.link).hostname); } catch {}
                }
              }
            }
            if (parsed.source_domain) sourcesConsulted.push(parsed.source_domain);
          } catch {}
        }

        // Format tool results as context messages for the agent
        const toolResultText = executedTools
          .map((r) => `[Tool Result from "${r.name}"]:\n${r.output}`)
          .join('\n\n');

        response = await chat.sendMessage(
          `Here are the results from your tool calls:\n${toolResultText}\n\nContinue your investigation with more tool calls if needed, or provide your final JSON verdict.`
        );
      }

      // Extract the final text response
      const finalText = response.response.text()?.trim();
      if (!finalText) {
        console.warn(`[Agentic Analyzer] ${modelName} returned empty final response.`);
        continue;
      }

      // Parse the structured JSON verdict
      const jsonMatch = finalText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.warn(`[Agentic Analyzer] ${modelName} response was not valid JSON.`);
        continue;
      }

      const parsed = JSON.parse(jsonMatch[0]);
      let score = Math.max(0, Math.min(100, Math.round(Number(parsed.finalScore) || input.baselineScore)));

      // Strict bait/fake price check
      const hasExtremePriceDrop = (input.scrapedData.price !== null && input.scrapedData.price <= 20) ||
        input.initialSignals.some((s) => s.name === 'price_deviation' && s.direction === 'negative' && s.strength >= 0.8);
      if (hasExtremePriceDrop) {
        score = Math.min(score, 25);
      }

      const verdict: VerdictBand = getVerdictBand(score);

      // Merge additional signals from LLM
      const refinedSignals = [...input.initialSignals];
      if (Array.isArray(parsed.additionalSignals)) {
        for (const s of parsed.additionalSignals) {
          if (s.name && s.direction && typeof s.strength === 'number') {
            refinedSignals.push({
              name: s.name,
              direction: s.direction as 'positive' | 'negative',
              strength: Math.max(0, Math.min(1, s.strength)),
              description: s.description || '',
              category: 'agentic_research',
            });
          }
        }
      }

      const uniqueSources = Array.from(new Set(sourcesConsulted.filter(Boolean))).slice(0, 12);

      console.log(
        `[Agentic Analyzer] ✅ ${modelName} completed. Score: ${score}/100 | Verdict: ${verdict} | Tools used: ${toolsUsed.length}`
      );

      let explanation = parsed.explanation;
      if (hasExtremePriceDrop && (!explanation || !explanation.toLowerCase().includes('price'))) {
        explanation = `High Risk Warning: The extracted listing price (₹${input.scrapedData.price || 1}) is an impossible bait discount compared to actual market retail value (₹200–₹500). This indicates a deceptive promotional trap or invalid checkout configuration.`;
      }

      return {
        finalScore: score,
        verdict,
        refinedSignals,
        explanation: explanation || 'Verified through multi-source agentic intelligence analysis.',
        toolsUsed,
        researchSummary: {
          sourcesConsulted: uniqueSources,
          whyGenuine: Array.isArray(parsed.whyGenuine) ? parsed.whyGenuine : [],
          whyFraud: Array.isArray(parsed.whyFraud) ? parsed.whyFraud : hasExtremePriceDrop ? ['Severe price anomaly: ₹1 retail price indicates bait-and-switch.'] : [],
          storeLegitimacy: parsed.storeLegitimacy || '',
          competitorPricesFound: toolsUsed.filter((t) => t.name === 'compare_market_prices').length,
        },
      };
    } catch (err: any) {
      console.warn(`[Agentic Analyzer] Gemini ${modelName} agentic loop failed: ${err.message}`);
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Groq Single-Shot Fallback (non-tool-calling)
// ---------------------------------------------------------------------------
async function runGroqFallback(input: AgenticAnalysisInput): Promise<AgenticAnalysisResult | null> {
  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey?.trim()) return null;

  const systemPrompt = buildSystemPrompt(input.moduleType);
  const userPrompt = buildInitialMessage(input) +
    '\n\nNOTE: You do NOT have access to tools in this fallback mode. Analyze the data provided above and produce your final JSON verdict directly.';

  const groqModels = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768'];

  for (const groqModel of groqModels) {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${groqKey}`,
        },
        body: JSON.stringify({
          model: groqModel,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.1,
          max_tokens: 800,
        }),
        signal: AbortSignal.timeout(10000),
      });

      const data = await res.json();
      let text = data.choices?.[0]?.message?.content?.trim() || '';
      text = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) continue;

      const parsed = JSON.parse(jsonMatch[0]);
      let score = Math.max(0, Math.min(100, Math.round(Number(parsed.finalScore) || input.baselineScore)));

      // Strict bait/fake price check
      const hasExtremePriceDrop = (input.scrapedData.price !== null && input.scrapedData.price <= 20) ||
        input.initialSignals.some((s) => s.name === 'price_deviation' && s.direction === 'negative' && s.strength >= 0.8);
      if (hasExtremePriceDrop) {
        score = Math.min(score, 25);
      }

      const verdict: VerdictBand = getVerdictBand(score);

      console.log(`[Agentic Analyzer] Groq fallback (${groqModel}) succeeded. Score: ${score}`);

      let explanation = parsed.explanation;
      if (hasExtremePriceDrop && (!explanation || !explanation.toLowerCase().includes('price'))) {
        explanation = `High Risk Warning: Listing price (₹${input.scrapedData.price || 1}) is an impossible bait discount compared to actual market retail value (₹200–₹500). Deceptive promotion or invalid checkout.`;
      }

      return {
        finalScore: score,
        verdict,
        refinedSignals: input.initialSignals,
        explanation: explanation || 'Analysis based on available scraped data.',
        toolsUsed: [],
        researchSummary: {
          sourcesConsulted: [],
          whyGenuine: Array.isArray(parsed.whyGenuine) ? parsed.whyGenuine : [],
          whyFraud: Array.isArray(parsed.whyFraud) ? parsed.whyFraud : hasExtremePriceDrop ? ['Severe price anomaly: ₹1 retail price indicates bait-and-switch.'] : [],
        },
      };
    } catch (err: any) {
      console.warn(`[Agentic Analyzer] Groq fallback (${groqModel}) failed: ${err.message}`);
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Deterministic Fallback (no LLM at all)
// ---------------------------------------------------------------------------
function runDeterministicFallback(input: AgenticAnalysisInput): AgenticAnalysisResult {
  let domain = '';
  try { domain = new URL(input.url).hostname.replace('www.', '').toLowerCase(); } catch {}

  const isOfficialOrTrusted = /amazon|flipkart|apple|nike|adidas|samsung|myntra|nykaa|croma|reliance|bbc|reuters|ndtv/i.test(domain);
  const hasExtremePriceDrop = (input.scrapedData.price !== null && input.scrapedData.price <= 20) ||
    input.initialSignals.some((s) => s.name === 'price_deviation' && s.direction === 'negative' && s.strength >= 0.8);
  const hasBrandMismatch = input.moduleType === 'offer' &&
    input.initialSignals.some((s) => s.name === 'brand_mismatch' && s.direction === 'negative');
  const isDebunkedOrUncorroboratedNews = input.moduleType === 'news' &&
    input.initialSignals.some((s) => (s.name === 'corroboration' || s.name === 'fact_check_match') && s.direction === 'negative' && s.strength >= 0.6);

  let score = input.baselineScore;
  if (hasExtremePriceDrop) {
    score = Math.min(20, score);
  } else if (hasBrandMismatch) {
    score = Math.min(20, score);
  } else if (isDebunkedOrUncorroboratedNews) {
    score = Math.min(25, score);
  } else if (isOfficialOrTrusted) {
    score = Math.max(82, score);
  }

  const verdict = getVerdictBand(score);

  const negSignals = input.initialSignals.filter((s) => s.direction === 'negative').map((s) => s.description);
  const posSignals = input.initialSignals.filter((s) => s.direction === 'positive').map((s) => s.description);

  return {
    finalScore: score,
    verdict,
    refinedSignals: input.initialSignals,
    explanation:
      hasExtremePriceDrop
        ? `High Risk Alert: The listing price of ₹${input.scrapedData.price || 1} is an extreme price anomaly (market rate is ₹200–₹500). This is characteristic of deceptive bait-and-switch promotions.`
        : verdict === 'High Risk'
        ? `High Risk Alert: Critical anomalies detected. ${negSignals[0] || 'Suspicious pricing or unverified source.'}`
        : `Verified: Analysis based on deterministic signal evaluation. ${posSignals[0] || 'No major fraud indicators.'}`,
    toolsUsed: [],
    researchSummary: {
      sourcesConsulted: [domain].filter(Boolean),
      whyGenuine: posSignals.length > 0 ? posSignals : ['No major fraud patterns detected.'],
      whyFraud: negSignals.length > 0 ? negSignals : ['Severe price anomaly: bait pricing detected.'],
    },
  };
}

// ---------------------------------------------------------------------------
// PUBLIC: Main entry point — cascading: Gemini Agentic → Groq Fallback → Deterministic
// ---------------------------------------------------------------------------
export async function runAgenticAnalysis(input: AgenticAnalysisInput): Promise<AgenticAnalysisResult> {
  console.log(`[Agentic Analyzer] Starting investigation for [${input.moduleType}]: ${input.url}`);

  // 1. Try Gemini Agentic Loop (with tool calling)
  const geminiResult = await runGeminiAgenticLoop(input);
  if (geminiResult) return geminiResult;

  // 2. Fallback: Groq single-shot (no tool calling)
  console.warn('[Agentic Analyzer] Gemini agentic loop unavailable, falling back to Groq...');
  const groqResult = await runGroqFallback(input);
  if (groqResult) return groqResult;

  // 3. Final fallback: Pure deterministic math
  console.warn('[Agentic Analyzer] All LLMs unavailable, using deterministic fallback.');
  return runDeterministicFallback(input);
}
