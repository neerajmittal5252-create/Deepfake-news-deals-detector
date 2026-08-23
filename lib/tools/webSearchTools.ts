import { SearchResult } from '../types';
import fs from 'fs';
import path from 'path';

// Load reputable domains
const reputableDomainsPath = path.join(process.cwd(), 'data', 'reputable-domains.json');
let reputableDomains: string[] = [];
try {
  reputableDomains = JSON.parse(fs.readFileSync(reputableDomainsPath, 'utf8'));
} catch {
  reputableDomains = ['reuters.com', 'apnews.com', 'bbc.com', 'snopes.com', 'politifact.com'];
}

/**
 * Executes a DuckDuckGo web search via direct HTML/API endpoints (no API key required).
 */
export async function searchDuckDuckGo(query: string, maxResults: number = 6): Promise<SearchResult[]> {
  console.log(`[DuckDuckGo Tool] Searching for: "${query}"`);
  const encodedQuery = encodeURIComponent(query);
  const results: SearchResult[] = [];

  try {
    const url = `https://html.duckduckgo.com/html/?q=${encodedQuery}`;
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-IN,en;q=0.9',
      },
      signal: AbortSignal.timeout(6000),
    });

    if (res.ok) {
      const html = await res.text();

      const snippetRegex = /<a class="result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/gi;
      const titleRegex = /<a class="result__a" href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;

      const titles: { title: string; link: string }[] = [];
      const snippets: string[] = [];

      for (const m of html.matchAll(titleRegex)) {
        const cleanTitle = m[2].replace(/<[^>]+>/g, '').trim();
        const rawLink = m[1];
        let realLink = rawLink;
        const matchUddg = rawLink.match(/uddg=([^&]+)/);
        if (matchUddg) {
          try {
            realLink = decodeURIComponent(matchUddg[1]);
          } catch {
            realLink = rawLink;
          }
        }
        if (cleanTitle) {
          titles.push({ title: cleanTitle, link: realLink });
        }
        if (titles.length >= maxResults) break;
      }

      for (const m of html.matchAll(snippetRegex)) {
        snippets.push(m[1].replace(/<[^>]+>/g, '').trim());
        if (snippets.length >= maxResults) break;
      }

      for (let i = 0; i < titles.length; i++) {
        let domain = '';
        let targetLink = titles[i].link;
        try {
          const parsedUrl = new URL(targetLink, 'https://duckduckgo.com');
          const uddg = parsedUrl.searchParams.get('uddg');
          if (uddg) {
            targetLink = uddg;
            domain = new URL(uddg).hostname.replace('www.', '').toLowerCase();
          } else {
            domain = parsedUrl.hostname.replace('www.', '').toLowerCase();
          }
        } catch {
          domain = '';
        }

        results.push({
          title: titles[i].title,
          link: targetLink,
          snippet: snippets[i] || titles[i].title,
          source: domain || 'DuckDuckGo',
        });
      }

      if (results.length > 0) {
        return results;
      }
    }
  } catch (err: any) {
    // Graceful fallback to Lite
  }

  // 2. Try DuckDuckGo Lite (POST endpoint)
  try {
    const liteRes = await fetch('https://lite.duckduckgo.com/lite/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)',
      },
      body: `q=${encodedQuery}`,
      signal: AbortSignal.timeout(6000),
    });

    if (liteRes.ok) {
      const html = await liteRes.text();
      const linkRegex = /<a[^>]*class="result-link"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
      const snippetRegex = /<td[^>]*class="result-snippet"[^>]*>([\s\S]*?)<\/td>/gi;

      const titles: { title: string; link: string }[] = [];
      const snippets: string[] = [];

      for (const m of html.matchAll(linkRegex)) {
        const cleanTitle = m[2].replace(/<[^>]+>/g, '').trim();
        let rawLink = m[1];
        const matchUddg = rawLink.match(/uddg=([^&]+)/);
        if (matchUddg) {
          try { rawLink = decodeURIComponent(matchUddg[1]); } catch {}
        }
        if (cleanTitle) titles.push({ title: cleanTitle, link: rawLink });
        if (titles.length >= maxResults) break;
      }

      for (const m of html.matchAll(snippetRegex)) {
        snippets.push(m[1].replace(/<[^>]+>/g, '').trim());
        if (snippets.length >= maxResults) break;
      }

      for (let i = 0; i < titles.length; i++) {
        let domain = '';
        try {
          const parsed = new URL(titles[i].link, 'https://duckduckgo.com');
          const uddg = parsed.searchParams.get('uddg');
          if (uddg) {
            titles[i].link = uddg;
            domain = new URL(uddg).hostname.replace('www.', '').toLowerCase();
          } else {
            domain = parsed.hostname.replace('www.', '').toLowerCase();
          }
        } catch {}
        results.push({
          title: titles[i].title,
          link: titles[i].link,
          snippet: snippets[i] || titles[i].title,
          source: domain || 'DuckDuckGo',
        });
      }

      if (results.length > 0) return results;
    }
  } catch (liteErr) {
    // Fall through to Instant Answer
  }

  // Instant Answer API fallback
  try {
    const apiRes = await fetch(`https://api.duckduckgo.com/?q=${encodedQuery}&format=json&no_html=1`, {
      signal: AbortSignal.timeout(4000),
    });
    if (apiRes.ok) {
      const raw = await apiRes.text();
      if (raw && raw.trim().startsWith('{')) {
        const data = JSON.parse(raw);
        if (data.AbstractText) {
          results.push({
            title: data.Heading || query,
            link: data.AbstractURL || 'https://duckduckgo.com',
            snippet: data.AbstractText,
            source: 'DuckDuckGo Instant Answer',
          });
        }
        if (Array.isArray(data.RelatedTopics)) {
          for (const topic of data.RelatedTopics.slice(0, 4)) {
            if (topic.Text && topic.FirstURL) {
              results.push({
                title: topic.Text.split(' - ')[0] || topic.Text,
                link: topic.FirstURL,
                snippet: topic.Text,
                source: 'DuckDuckGo',
              });
            }
          }
        }
      }
    }
  } catch (apiErr: any) {
    // Graceful fallback
  }

  return results;
}

/**
 * Investigates domain/store reputation across the web (Trustpilot, Reddit, Quora, scam reports).
 */
export async function checkStoreReputation(domain: string, storeName: string): Promise<{
  isKnownLegit: boolean;
  isPreOwnedMarketplace: boolean;
  reputationSummary: string;
  sources: SearchResult[];
}> {
  const cleanDomain = domain.replace(/^https?:\/\//, '').replace('www.', '').split('/')[0];
  console.log(`[Store Reputation Tool] Checking reputation for domain: ${cleanDomain} (${storeName})`);

  const knownPreOwnedPlatforms = [
    'gameloot.in',
    'cashify.in',
    'quikr.com',
    'olx.in',
    'backmarket.com',
    'decluttr.com',
    'webuy.com',
    'cex.in',
    'sahivalue.com',
    'budli.in',
  ];

  const knownTrustedD2C = [
    'twasa.com',
    'mamaearth.in',
    'mcaffeine.com',
    'wowskinscience.com',
    'plumgoodness.com',
    'beardo.in',
    'themancompany.com',
    'nykaa.com',
    'myntra.com',
    'flipkart.com',
    'amazon.in',
    'croma.com',
    'reliancedigital.in',
    'tatacliq.com',
  ];

  const isPreOwned = knownPreOwnedPlatforms.some((p) => cleanDomain.includes(p));
  const isDirectD2C = knownTrustedD2C.some((d) => cleanDomain.includes(d));

  const queries = [
    `"${cleanDomain}" review OR legit OR scam site:reddit.com OR site:trustpilot.com`,
    `is "${cleanDomain}" safe to buy genuine`,
  ];

  const allSources: SearchResult[] = [];
  for (const q of queries) {
    const res = await searchDuckDuckGo(q, 3);
    allSources.push(...res);
  }

  const textCorpus = allSources.map((s) => `${s.title} ${s.snippet}`).join(' ').toLowerCase();
  const hasScamWarning = /\b(scam|fake website|phishing|fraud|ripoff|stole my money|never received)\b/.test(
    textCorpus
  );
  const hasLegitEndorsement = /\b(legit|genuine|trusted|received my order|authentic|safe|good experience)\b/.test(
    textCorpus
  );

  let summary = '';
  if (isPreOwned) {
    summary = `${storeName} (${cleanDomain}) is an established Indian pre-owned/refurbished marketplace. Lower pricing compared to brand-new retail MRP is typical for certified second-hand electronics and games.`;
  } else if (isDirectD2C) {
    summary = `${storeName} (${cleanDomain}) is a direct-to-consumer brand store. Deals and factory direct pricing are issued directly by the manufacturer.`;
  } else if (hasScamWarning && !hasLegitEndorsement) {
    summary = `Caution: Community reports include fraud or non-delivery warnings regarding ${cleanDomain}.`;
  } else if (hasLegitEndorsement) {
    summary = `Online community discussions indicate ${cleanDomain} is an active, recognized vendor with completed customer transactions.`;
  } else {
    summary = `Standard independent web store: no major systemic scam alerts detected for ${cleanDomain}.`;
  }

  return {
    isKnownLegit: isPreOwned || isDirectD2C || (hasLegitEndorsement && !hasScamWarning),
    isPreOwnedMarketplace: isPreOwned,
    reputationSummary: summary,
    sources: allSources,
  };
}

/**
 * Searches alternative major retailers to find genuine market price ranges for an item.
 */
export async function findCompetitorPrices(
  productName: string
): Promise<{ prices: { store: string; price: number; title: string }[]; medianPrice: number | null }> {
  console.log(`[Competitor Price Tool] Cross-checking market prices for: "${productName}"`);

  const cleanName = productName
    .replace(/\b(best|top|new|latest|buy|online|india|detox|pure|color|storage)\b/gi, '')
    .replace(/[|–—-].*/g, '')
    .trim()
    .slice(0, 60);

  const query = `${cleanName} price India Amazon Flipkart Croma`;
  const searchResults = await searchDuckDuckGo(query, 6);

  const prices: { store: string; price: number; title: string }[] = [];

  for (const item of searchResults) {
    const text = `${item.title} ${item.snippet}`;
    const match = text.match(/(?:₹|Rs\.?|INR)\s?([\d,]{3,}(?:\.\d{0,2})?)/i);
    if (match) {
      const p = parseFloat(match[1].replace(/,/g, ''));
      if (p > 50 && p < 1000000) {
        let store = 'Market';
        if (/amazon/i.test(text)) store = 'Amazon.in';
        else if (/flipkart/i.test(text)) store = 'Flipkart';
        else if (/croma/i.test(text)) store = 'Croma';
        else if (/reliance/i.test(text)) store = 'Reliance Digital';
        else if (/nykaa/i.test(text)) store = 'Nykaa';

        prices.push({ store, price: p, title: item.title });
      }
    }
  }

  const numericPrices = prices.map((p) => p.price).sort((a, b) => a - b);
  let medianPrice: number | null = null;
  if (numericPrices.length > 0) {
    const mid = Math.floor(numericPrices.length / 2);
    medianPrice = numericPrices.length % 2 !== 0 ? numericPrices[mid] : (numericPrices[mid - 1] + numericPrices[mid]) / 2;
  }

  return { prices, medianPrice };
}

// ---------------------------------------------------------------------------
// DEDICATED LIVE NEWS & FACT-CHECK SEARCH TOOLS
// ---------------------------------------------------------------------------

export interface FactCheckFinding {
  factChecker: string;
  title: string;
  snippet: string;
  url: string;
  isDebunk: boolean;
  verdictLabel: string;
}

export interface NewsCorroborationFinding {
  corroboratedByReputableWire: boolean;
  reputableOutlets: string[];
  allSources: SearchResult[];
  isDebunked: boolean;
  factChecks: FactCheckFinding[];
  claimAnalysis: string;
}

// Known viral misinformation / debunk patterns for instantaneous zero-latency detection
const KNOWN_DEBUNKED_PATTERNS = [
  /drinking bleach|drink bleach|disinfectant cure/i,
  /miracle mineral solution|mms cure/i,
  /5g (?:causes|spreads|creates) (?:covid|coronavirus|cancer)/i,
  /microchip(?:s)? in (?:vaccine|water|blood)/i,
  /secret cure for (?:cancer|aids) (?:doctors|fda) (?:hide|banned)/i,
  /earth is flat|flat earth dome/i,
  /illuminati secret lizard/i,
];

/**
 * Searches dedicated fact-check databases (Snopes, PolitiFact, FactCheck.org, AltNews, BoomLive, Reuters Fact Check)
 * and general fact-checking queries.
 */
export async function searchFactCheckers(claimText: string): Promise<FactCheckFinding[]> {
  console.log(`[Fact Check Tool] Investigating claim: "${claimText.slice(0, 80)}..."`);
  
  // Instant pattern check for common dangerous viral hoaxes
  for (const pattern of KNOWN_DEBUNKED_PATTERNS) {
    if (pattern.test(claimText)) {
      console.log(`[Fact Check Tool] Known viral hoax pattern matched: ${pattern}`);
      return [
        {
          factChecker: 'Verified Fact-Check Consensus (WHO / PolitiFact / Snopes)',
          title: `Debunked: "${claimText.slice(0, 70)}"`,
          snippet: 'Certified fact-checkers and health authorities have repeatedly debunked this claim as FALSE, HAZARDOUS, and scientifically unfounded.',
          url: 'https://snopes.com/fact-check',
          isDebunk: true,
          verdictLabel: 'FALSE / MISLEADING',
        },
      ];
    }
  }

  const cleanKeywords = claimText
    .replace(/[^\w\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);

  const findings: FactCheckFinding[] = [];
  const queries = [
    `${cleanKeywords} fact check`,
    `${cleanKeywords} Snopes PolitiFact fact check`,
    `${cleanKeywords} debunk hoax fake`,
  ];

  for (const q of queries) {
    const results = await searchDuckDuckGo(q, 4);
    for (const r of results) {
      const text = `${r.title} ${r.snippet}`.toLowerCase();
      const isFactCheckOrg = /snopes|politifact|factcheck\.org|altnews|boomlive|reuters|afp|bbc.*verify|leadstories/i.test(
        r.source + ' ' + r.link
      );

      const hasDebunkKeywords = /\b(false|fake|hoax|pants on fire|misleading|fabricated|unproven|debunk|debunked|incorrect|satire|altered|conspiracy)\b/i.test(
        text
      );

      const hasTrueKeywords = /\b(true|correct|accurate|verified|confirmed|fact)\b/i.test(text) && !hasDebunkKeywords;

      if (isFactCheckOrg || hasDebunkKeywords) {
        findings.push({
          factChecker: r.source || 'Fact-Checker',
          title: r.title,
          snippet: r.snippet,
          url: r.link,
          isDebunk: hasDebunkKeywords,
          verdictLabel: hasDebunkKeywords ? 'FALSE / MISLEADING' : hasTrueKeywords ? 'TRUE / VERIFIED' : 'INVESTIGATED',
        });
      }
    }
    if (findings.some((f) => f.isDebunk)) break; // Found definitive debunk
  }

  return findings;
}

/**
 * Verifies whether a news headline or claim is corroborated by tier-1 global/national news organizations
 * (Reuters, AP, BBC, The Hindu, Indian Express, ANI, PTI, NDTV, etc.).
 */
export async function verifyNewsCorroboration(
  claimText: string,
  sourceDomain?: string
): Promise<NewsCorroborationFinding> {
  console.log(`[News Corroboration Tool] Cross-checking mainstream press for: "${claimText.slice(0, 80)}..."`);
  
  // Extract key search terms preserving numbers and identifiers
  const stopWords = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'in', 'on', 'at', 'to', 'for', 'of', 'by', 'with', 'from', 'about', 'into', 'over', 'after', 'that', 'this', 'and', 'or', 'so', 'has', 'have', 'had', 'been']);
  const words = claimText.replace(/[-_]/g, ' ').replace(/[^\w\s]/gi, '').split(/\s+/).filter(w => w.length >= 1 && !stopWords.has(w.toLowerCase()));
  const conciseKeywords = words.slice(0, 6).join(' ');

  // Run fact-check lookup and mainstream news queries in parallel
  const [factChecks, generalNewsResults, keywordResults] = await Promise.all([
    searchFactCheckers(claimText),
    searchDuckDuckGo(`${conciseKeywords} news`, 6),
    searchDuckDuckGo(conciseKeywords, 6),
  ]);

  const allSources = [...generalNewsResults, ...keywordResults];
  const reputableOutlets: string[] = [];

  if (sourceDomain && reputableDomains.some((rd) => sourceDomain.toLowerCase().includes(rd))) {
    const cleanSourceDomain = sourceDomain.toLowerCase().replace('www.', '');
    if (!reputableOutlets.includes(cleanSourceDomain)) {
      reputableOutlets.unshift(cleanSourceDomain);
    }
  }

  for (const s of allSources) {
    let domain = '';
    try {
      domain = new URL(s.link).hostname.replace('www.', '').toLowerCase();
    } catch {
      domain = (s.source || '').toLowerCase();
    }

    if (reputableDomains.some((rd) => domain.includes(rd) || (s.title && s.title.toLowerCase().includes(rd.split('.')[0])))) {
      if (domain && !reputableOutlets.includes(domain)) {
        reputableOutlets.push(domain);
      }
    }
  }

  const isDebunked = factChecks.some((f) => f.isDebunk);
  // Corroboration strictly requires at least ONE verified tier-1 reputable news outlet from the allowlist
  const isDirectlyCorroborated = reputableOutlets.length >= 1;
  const corroboratedByReputableWire = isDirectlyCorroborated && !isDebunked;

  let claimAnalysis = '';
  if (isDebunked) {
    const topDebunk = factChecks.find((f) => f.isDebunk)!;
    claimAnalysis = `Debunked Claim: Certified fact-checking organizations (${topDebunk.factChecker}) have flagged this claim as FALSE/MISLEADING.`;
  } else if (corroboratedByReputableWire) {
    claimAnalysis = `Corroborated Reporting: Verified mainstream news coverage confirmed across reporting channels (${reputableOutlets.slice(0, 3).join(', ') || 'Global News Media'}).`;
  } else if (allSources.length === 0) {
    claimAnalysis = `Zero Mainstream Corroboration: No reputable global or national press has reported this event.`;
  } else {
    claimAnalysis = `Unverified Rumor / Single-Source: Zero coverage from accredited news agencies (${reputableOutlets.length} verified wire outlets found).`;
  }

  return {
    corroboratedByReputableWire,
    reputableOutlets,
    allSources,
    isDebunked,
    factChecks,
    claimAnalysis,
  };
}
