import { FunctionDeclaration, SchemaType } from '@google/generative-ai';
import { ToolInvocation } from '../types';
import { runScraperCollector, searchWeb, parseHtmlToScrapedItem } from '../brightdataClient';
import {
  searchDuckDuckGo,
  checkStoreReputation,
  findCompetitorPrices,
  searchFactCheckers,
  verifyNewsCorroboration,
} from './webSearchTools';

// ---------------------------------------------------------------------------
// TOOL 1: Bright Data Web Scraper (scrape any URL with self-healing)
// ---------------------------------------------------------------------------
const scrapeWebpageDeclaration: FunctionDeclaration = {
  name: 'scrape_webpage',
  description:
    'Scrapes a webpage using Bright Data Web Unlocker proxy with automatic self-healing when DOM selectors break. Extracts structured data: title, price, currency, description, seller/brand name, images, and metadata. Use this to scrape the input URL or ANY additional URL you want to investigate (competitor listings, seller profiles, source articles, official brand pages).',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      url: {
        type: SchemaType.STRING,
        description: 'The full URL to scrape (must start with http:// or https://)',
      },
      reason: {
        type: SchemaType.STRING,
        description: 'Brief explanation of why you are scraping this URL',
      },
    },
    required: ['url', 'reason'],
  },
};

async function executeScrapeWebpage(args: { url: string; reason: string }): Promise<string> {
  console.log(`[Agent Tool: scrape_webpage] Scraping: ${args.url} | Reason: ${args.reason}`);
  try {
    const results = await runScraperCollector('c_trustcheck_agent_v1', [args.url]);
    const item = results[0] || {};
    return JSON.stringify({
      success: true,
      title: item.title || item.headline || '',
      price: item.price,
      currency: item.currency || 'INR',
      description: (item.description || item.article_body || '').slice(0, 500),
      seller_name: item.seller_name || item.brand_name || '',
      brand_name: item.brand_name || '',
      source_domain: item.source_domain || '',
      image_count: item.image_urls?.length || 0,
      posted_date: item.posted_date || '',
      page_url: item.page_url || args.url,
    });
  } catch (err: any) {
    return JSON.stringify({ success: false, error: err.message });
  }
}

// ---------------------------------------------------------------------------
// TOOL 2: DuckDuckGo Web Search (no API key, free)
// ---------------------------------------------------------------------------
const searchWebDeclaration: FunctionDeclaration = {
  name: 'search_web',
  description:
    'Performs a web search using DuckDuckGo. Returns up to 6 results with title, link, snippet, and source domain. Use this for general research: checking reviews, verifying claims, finding news coverage, investigating legitimacy, or any web search you need.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      query: {
        type: SchemaType.STRING,
        description: 'The search query string',
      },
      max_results: {
        type: SchemaType.NUMBER,
        description: 'Maximum number of results to return (default: 6, max: 8)',
      },
    },
    required: ['query'],
  },
};

async function executeSearchWeb(args: { query: string; max_results?: number }): Promise<string> {
  console.log(`[Agent Tool: search_web] Query: "${args.query}"`);
  try {
    const results = await searchDuckDuckGo(args.query, Math.min(args.max_results || 6, 8));
    return JSON.stringify({
      success: true,
      resultCount: results.length,
      results: results.map((r) => ({
        title: r.title,
        link: r.link,
        snippet: r.snippet?.slice(0, 200),
        source: r.source,
      })),
    });
  } catch (err: any) {
    return JSON.stringify({ success: false, error: err.message, results: [] });
  }
}

// ---------------------------------------------------------------------------
// TOOL 3: Fact-Checker Search (Snopes, PolitiFact, AltNews, BoomLive, etc.)
// ---------------------------------------------------------------------------
const searchFactCheckersDeclaration: FunctionDeclaration = {
  name: 'search_fact_checkers',
  description:
    'Searches dedicated fact-checking databases (Snopes, PolitiFact, FactCheck.org, AltNews, BoomLive, Reuters Fact Check) for debunks or verifications of a claim or headline. Also detects known viral hoax patterns instantly. Use this specifically for news/claim verification.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      claim_text: {
        type: SchemaType.STRING,
        description: 'The news headline or claim text to fact-check',
      },
    },
    required: ['claim_text'],
  },
};

async function executeSearchFactCheckers(args: { claim_text: string }): Promise<string> {
  console.log(`[Agent Tool: search_fact_checkers] Checking: "${args.claim_text.slice(0, 80)}..."`);
  try {
    const findings = await searchFactCheckers(args.claim_text);
    return JSON.stringify({
      success: true,
      findingsCount: findings.length,
      isDebunked: findings.some((f) => f.isDebunk),
      findings: findings.map((f) => ({
        factChecker: f.factChecker,
        title: f.title,
        snippet: f.snippet?.slice(0, 200),
        verdictLabel: f.verdictLabel,
        isDebunk: f.isDebunk,
        url: f.url,
      })),
    });
  } catch (err: any) {
    return JSON.stringify({ success: false, error: err.message, findings: [] });
  }
}

// ---------------------------------------------------------------------------
// TOOL 4: Market Price Comparison
// ---------------------------------------------------------------------------
const compareMarketPricesDeclaration: FunctionDeclaration = {
  name: 'compare_market_prices',
  description:
    'Searches major retailers (Amazon, Flipkart, Croma, Reliance Digital, Nykaa) to find the real market price range for a product. Returns individual retailer prices and the computed median. Use this to verify if a listing/offer price is realistic or suspiciously low.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      product_name: {
        type: SchemaType.STRING,
        description: 'The product name to search for price comparison',
      },
    },
    required: ['product_name'],
  },
};

async function executeCompareMarketPrices(args: { product_name: string }): Promise<string> {
  console.log(`[Agent Tool: compare_market_prices] Product: "${args.product_name}"`);
  try {
    const result = await findCompetitorPrices(args.product_name);
    return JSON.stringify({
      success: true,
      medianPrice: result.medianPrice,
      pricesFound: result.prices.length,
      prices: result.prices.map((p) => ({
        store: p.store,
        price: p.price,
        title: p.title?.slice(0, 100),
      })),
    });
  } catch (err: any) {
    return JSON.stringify({ success: false, error: err.message });
  }
}

// ---------------------------------------------------------------------------
// TOOL 5: Domain / Store Reputation Check
// ---------------------------------------------------------------------------
const checkDomainReputationDeclaration: FunctionDeclaration = {
  name: 'check_domain_reputation',
  description:
    'Investigates a domain/store reputation across the web — checks Reddit, Trustpilot, scam report databases. Identifies if the domain is a known pre-owned marketplace, trusted D2C brand, or has scam reports. Use this to verify if the website hosting a listing/offer is legitimate.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      domain: {
        type: SchemaType.STRING,
        description: 'The domain to check (e.g., "gameloot.in", "shadystore.xyz")',
      },
      store_name: {
        type: SchemaType.STRING,
        description: 'The brand or store name',
      },
    },
    required: ['domain'],
  },
};

async function executeCheckDomainReputation(args: { domain: string; store_name?: string }): Promise<string> {
  console.log(`[Agent Tool: check_domain_reputation] Domain: ${args.domain}`);
  try {
    const result = await checkStoreReputation(args.domain, args.store_name || args.domain.split('.')[0]);
    return JSON.stringify({
      success: true,
      isKnownLegit: result.isKnownLegit,
      isPreOwnedMarketplace: result.isPreOwnedMarketplace,
      reputationSummary: result.reputationSummary,
      sourcesChecked: result.sources.length,
      sources: result.sources.slice(0, 4).map((s) => ({
        title: s.title?.slice(0, 100),
        link: s.link,
        snippet: s.snippet?.slice(0, 150),
      })),
    });
  } catch (err: any) {
    return JSON.stringify({ success: false, error: err.message });
  }
}

// ---------------------------------------------------------------------------
// TOOL 6: Bright Data SERP Search (Google Search via proxy)
// ---------------------------------------------------------------------------
const brightDataSerpDeclaration: FunctionDeclaration = {
  name: 'bright_data_serp_search',
  description:
    'Performs a Google search using Bright Data SERP API proxy. More powerful than DuckDuckGo for finding shopping prices, official brand sites, and structured search results. Use this when DuckDuckGo results are insufficient or when you need Google Shopping data.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      query: {
        type: SchemaType.STRING,
        description: 'The Google search query',
      },
      search_type: {
        type: SchemaType.STRING,
        description: 'Type of search: "web" (default), "shopping" for price comparison',
      },
      site_filter: {
        type: SchemaType.STRING,
        description: 'Optional site: filter (e.g., "amazon.in" to search within a specific site)',
      },
    },
    required: ['query'],
  },
};

async function executeBrightDataSerp(args: {
  query: string;
  search_type?: string;
  site_filter?: string;
}): Promise<string> {
  console.log(`[Agent Tool: bright_data_serp_search] Query: "${args.query}" | Type: ${args.search_type || 'web'}`);
  try {
    const results = await searchWeb(args.query, {
      type: args.search_type || 'web',
      siteFilter: args.site_filter,
    });
    return JSON.stringify({
      success: true,
      resultCount: results.length,
      results: results.map((r) => ({
        title: r.title,
        link: r.link,
        snippet: r.snippet?.slice(0, 200),
        source: r.source,
        price: r.price,
      })),
    });
  } catch (err: any) {
    return JSON.stringify({ success: false, error: err.message, results: [] });
  }
}

// ---------------------------------------------------------------------------
// REGISTRY: All tool declarations + executor map
// ---------------------------------------------------------------------------

/** All Gemini function declarations for the agentic loop */
export const AGENT_TOOL_DECLARATIONS: FunctionDeclaration[] = [
  scrapeWebpageDeclaration,
  searchWebDeclaration,
  searchFactCheckersDeclaration,
  compareMarketPricesDeclaration,
  checkDomainReputationDeclaration,
  brightDataSerpDeclaration,
];

/** Executor map: tool name → async function */
const TOOL_EXECUTORS: Record<string, (args: any) => Promise<string>> = {
  scrape_webpage: executeScrapeWebpage,
  search_web: executeSearchWeb,
  search_fact_checkers: executeSearchFactCheckers,
  compare_market_prices: executeCompareMarketPrices,
  check_domain_reputation: executeCheckDomainReputation,
  bright_data_serp_search: executeBrightDataSerp,
};

/**
 * Executes a tool by name with the given arguments.
 * Returns the tool result string and a ToolInvocation audit record.
 */
export async function executeAgentTool(
  toolName: string,
  args: Record<string, any>
): Promise<{ result: string; invocation: ToolInvocation }> {
  const executor = TOOL_EXECUTORS[toolName];
  if (!executor) {
    const errorResult = JSON.stringify({ success: false, error: `Unknown tool: ${toolName}` });
    return {
      result: errorResult,
      invocation: { name: toolName, input: args, output: errorResult, durationMs: 0 },
    };
  }

  const startTime = Date.now();
  const result = await executor(args);
  const durationMs = Date.now() - startTime;

  console.log(`[Agent Tool] ${toolName} completed in ${durationMs}ms`);

  return {
    result,
    invocation: {
      name: toolName,
      input: args,
      output: result.length > 1000 ? result.slice(0, 1000) + '...' : result,
      durationMs,
    },
  };
}
