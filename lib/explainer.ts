import { GoogleGenerativeAI } from '@google/generative-ai';
import { Signal, VerdictBand } from './types';

/**
 * Generates a concise, factual explanation of the trust verdict.
 * LLM strictly narrates the deterministic signals. It never invents the verdict.
 */
export async function generateExplanation(
  score: number,
  verdict: VerdictBand,
  signals: Signal[],
  moduleType: string
): Promise<string> {
  const signalSummary = signals
    .map(
      (s) =>
        `- [${s.direction.toUpperCase()} | Strength ${(s.strength * 100).toFixed(0)}%] ${s.name}: ${s.description}`
    )
    .join('\n');

  const prompt = `You are explaining a trust-check result to a general user for a ${moduleType} verification.
Score: ${score}/100 (${verdict}).
Signals found:
${signalSummary}

Write a short, clear, and objective explanation (3-4 sentences) directly referencing the SPECIFIC details from the signals above (actual prices, product names, domain names, percentages). Do not be generic. Do not invent facts not present in the signals.${
    moduleType === 'news'
      ? ' Frame news verdicts strictly as corroboration signals rather than factual truth.'
      : ''
  }`;

  // 1. Try Groq (Fast & Working)
  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey?.trim()) {
    for (const groqModel of ['groq/compound', 'openai/gpt-oss-120b', 'qwen/qwen3.6-27b', 'openai/gpt-oss-20b']) {
      try {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${groqKey}` },
          body: JSON.stringify({
            model: groqModel,
            messages: [
              { role: 'system', content: 'You are a trust auditor. Write 3-4 concise, factual sentences directly explaining the score and signals. Do not include thinking or preamble.' },
              { role: 'user', content: prompt },
            ],
            temperature: 0.3,
            max_tokens: 350,
          }),
          signal: AbortSignal.timeout(12000),
        });
        const data = await res.json();
        let text = data.choices?.[0]?.message?.content?.trim() || '';
        text = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
        if (text && text.length > 20) {
          console.log(`[Explainer] Groq (${groqModel}) generated explanation.`);
          return text;
        }
      } catch (err: any) {
        console.warn(`[Explainer] Groq model ${groqModel} failed: ${err.message}`);
      }
    }
  }

  // 2. Try Gemini
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey?.trim()) {
    for (const modelName of ['gemini-3.6-flash', 'gemini-2.0-flash', 'gemini-1.5-flash-latest']) {
      try {
        const genAI = new GoogleGenerativeAI(geminiKey);
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: { temperature: 0.3, maxOutputTokens: 300 },
        });
        const result = await model.generateContent(prompt);
        const text = result.response.text().trim();
        if (text.length > 20) {
          console.log(`[Explainer] Gemini (${modelName}) generated explanation.`);
          return text;
        }
      } catch (err: any) {
        console.warn(`[Explainer] Gemini model "${modelName}" failed: ${err.message}`);
      }
    }
  }

  // 3. Deterministic fallback — specific, not generic
  console.warn('[Explainer] All LLMs failed, using deterministic fallback.');
  return buildSpecificFallback(score, verdict, signals, moduleType);
}

/**
 * Builds a specific, signal-driven explanation without an LLM.
 * References actual values from signals — not a generic template.
 */
function buildSpecificFallback(
  score: number,
  verdict: VerdictBand,
  signals: Signal[],
  moduleType: string
): string {
  const neg = signals.filter((s) => s.direction === 'negative').sort((a, b) => b.strength - a.strength);
  const pos = signals.filter((s) => s.direction === 'positive').sort((a, b) => b.strength - a.strength);

  const topNeg = neg.slice(0, 2).map((s) => s.description).join(' Additionally, ');
  const topPos = pos.slice(0, 1).map((s) => s.description).join('');

  if (verdict === 'High Risk') {
    return `TrustCheck flagged this as High Risk (${score}/100). ${topNeg || 'Multiple critical anomalies detected.'} ${topPos ? `One positive indicator: ${topPos}` : 'No significant trust signals found.'} Proceed with extreme caution.`;
  }

  if (verdict === 'Some Concerns') {
    return `TrustCheck scored this ${score}/100 (Some Concerns). ${topNeg || 'Some unverifiable data points.'} On the positive side: ${topPos || 'no major fraud patterns detected.'} Independent verification is recommended before proceeding.`;
  }

  return `TrustCheck verified this with a score of ${score}/100 (${verdict}). ${topPos || 'All cross-checks passed.'} ${topNeg.length > 0 ? `Minor note: ${neg[0]?.description}` : 'No significant red flags detected.'}`;
}
