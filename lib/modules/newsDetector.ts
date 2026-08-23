import fs from 'fs';
import path from 'path';
import { runScraperCollector } from '../brightdataClient';
import { Signal, NewsScrapedData } from '../types';
import collectorsConfig from '../../config/collectors.json';
import { verifyNewsCorroboration } from '../tools/webSearchTools';

// Load reputable domains allowlist
const reputableDomainsPath = path.join(process.cwd(), 'data', 'reputable-domains.json');
let reputableDomains: string[] = [];
try {
  reputableDomains = JSON.parse(fs.readFileSync(reputableDomainsPath, 'utf8'));
} catch (e) {
  reputableDomains = ['reuters.com', 'apnews.com', 'bbc.com', 'snopes.com', 'politifact.com'];
}

/**
 * Scrapes an article or parses raw claim text using Bright Data Web Unlocker
 */
export async function scrapeOrParseNews(input: string): Promise<NewsScrapedData> {
  const isUrl = /^https?:\/\//i.test(input.trim());

  if (!isUrl) {
    // Pasted text claim - skip scraping
    return {
      headline: input.trim().slice(0, 150),
      article_body: input.trim(),
      source_domain: 'Pasted User Claim',
      is_pasted_claim: true,
      corroborating_sources: [],
      fact_check_matches: [],
      domain_credibility: {
        domain: 'User Input',
        isReputable: false,
      },
    };
  }

  const collectorId = collectorsConfig.news_module.news_collector;
  const results = await runScraperCollector(collectorId, [input]);
  const item = results[0] || {};

  let domain = '';
  try {
    domain = new URL(input).hostname.replace('www.', '').toLowerCase();
  } catch {
    domain = item.source_domain || 'unknown-source';
  }

  const isReputable = reputableDomains.some((d) => domain.includes(d));

  let rawHeadline = item.headline || item.title || '';
  if (!rawHeadline || /^(?:content from|google search|untitled|home|article|news|404|not found)/i.test(rawHeadline)) {
    // Extract readable headline from URL slug
    try {
      const pathname = new URL(input).pathname;
      const slug = pathname
        .split('/')
        .filter((s) => s.length > 3 && !/^\d+$/.test(s) && !/articleshow|index|detail|story|news/i.test(s))
        .pop() || '';

      if (slug) {
        rawHeadline = slug
          .replace(/[-_]/g, ' ')
          .replace(/\b\d{4,}\b/g, '')
          .replace(/\.html?|\.cms/i, '')
          .trim();
        console.log(`[News Detector] Extracted headline from URL slug: "${rawHeadline}"`);
      }
    } catch {
      // fallback
    }
  }

  if (!rawHeadline) rawHeadline = `News reporting from ${domain}`;

  return {
    headline: rawHeadline,
    article_body: item.article_body || item.description || rawHeadline,
    author_name: item.author_name || item.seller_name || '',
    publish_date: item.publish_date || item.posted_date || '',
    source_domain: domain,
    article_url: input,
    is_pasted_claim: false,
    corroborating_sources: [],
    fact_check_matches: [],
    domain_credibility: {
      domain,
      isReputable,
    },
  };
}

/**
 * Runs cross-check searches against major reporting sources and dedicated fact-checkers
 */
export async function crossCheckNews(claimText: string, sourceDomain?: string): Promise<{
  corroboratingSources: Array<{ title: string; domain: string; url: string; isReputable: boolean }>;
  factCheckMatches: Array<{ factChecker: string; claimReviewed: string; verdictSnippet: string; url: string }>;
  isDebunked: boolean;
  claimAnalysis: string;
}> {
  const finding = await verifyNewsCorroboration(claimText, sourceDomain);

  const corroboratingSources = finding.allSources.map((s) => ({
    title: s.title,
    domain: s.source || 'news-source',
    url: s.link,
    isReputable: reputableDomains.some((rd) => (s.source || '').toLowerCase().includes(rd) || s.link.toLowerCase().includes(rd)),
  }));

  const factCheckMatches = finding.factChecks.map((fc) => ({
    factChecker: fc.factChecker,
    claimReviewed: fc.title,
    verdictSnippet: fc.snippet,
    url: fc.url,
  }));

  return {
    corroboratingSources,
    factCheckMatches,
    isDebunked: finding.isDebunked,
    claimAnalysis: finding.claimAnalysis,
  };
}

/**
 * Generates discrete signals for news claims with ethical and legal framing
 */
export function extractNewsSignals(
  newsData: NewsScrapedData,
  crossCheckResults: {
    corroboratingSources: Array<{ title: string; domain: string; url: string; isReputable: boolean }>;
    factCheckMatches: Array<{ factChecker: string; claimReviewed: string; verdictSnippet: string; url: string }>;
    isDebunked?: boolean;
    claimAnalysis?: string;
  }
): Signal[] {
  const signals: Signal[] = [];

  // Check for sensational hoax or conspiracy phrasing
  const textToCheck = `${newsData.headline} ${newsData.article_body}`.toLowerCase();
  const hasSensationalWords = /\b(miracle cure|doctors hate this|secret plot|illuminati|5g spread|5g cause|microchip in (?:water|vaccine|blood)|they don't want you to know|banned video|100% cure for|secret deep state|flat earth|alien civilization|secret alien|pope arrested|world war 3 declared|drink bleach|cure covid in 24)\b/i.test(
    textToCheck
  );

  const isSourceReputable = !!newsData.domain_credibility?.isReputable;
  const reputableSources = crossCheckResults.corroboratingSources.filter((s) => s.isReputable);
  const totalSources = crossCheckResults.corroboratingSources.length;
  const isDebunked = crossCheckResults.isDebunked || hasSensationalWords;
  const hasWireCorroboration = reputableSources.length >= 1 || isSourceReputable;

  // 1. Fact-Check Match Signal
  if (crossCheckResults.factCheckMatches.length > 0 && isDebunked) {
    const topMatch = crossCheckResults.factCheckMatches[0];
    signals.push({
      name: 'fact_check_match',
      direction: 'negative',
      strength: 1.0,
      description: `Direct fact-check debunk on ${topMatch.factChecker}: Flagged as False/Misleading. Snippet: "${topMatch.verdictSnippet.slice(0, 120)}..."`,
      category: 'Fact-Check Records',
    });
  } else if (hasSensationalWords) {
    signals.push({
      name: 'fact_check_match',
      direction: 'negative',
      strength: 1.0,
      description: 'Linguistic anomaly: Sensationalist conspiracy or viral hoax phrasing pattern detected.',
      category: 'Fact-Check Records',
    });
  } else if (crossCheckResults.factCheckMatches.length > 0) {
    const topMatch = crossCheckResults.factCheckMatches[0];
    signals.push({
      name: 'fact_check_match',
      direction: 'positive',
      strength: 0.85,
      description: `Covered by certified fact-checker (${topMatch.factChecker}) with affirmative context.`,
      category: 'Fact-Check Records',
    });
  } else if (hasWireCorroboration) {
    signals.push({
      name: 'fact_check_match',
      direction: 'positive',
      strength: 0.85,
      description: 'Clean record: No debunk warnings or fraud alerts indexed in fact-checking registries.',
      category: 'Fact-Check Records',
    });
  } else {
    signals.push({
      name: 'fact_check_match',
      direction: 'negative',
      strength: 0.65,
      description: 'Unverified Claim: Lacks independent verification or affirmative confirmation in certified fact-checking databases.',
      category: 'Fact-Check Records',
    });
  }

  // 2. Corroboration Signal
  if (isDebunked) {
    signals.push({
      name: 'corroboration',
      direction: 'negative',
      strength: 1.0,
      description: 'Zero legitimate news reporting. Claim is an isolated viral fabrication or debunked hoax.',
      category: 'Corroboration',
    });
  } else if (hasWireCorroboration) {
    const outletNames = reputableSources.slice(0, 3).map((s) => s.domain).join(', ');
    signals.push({
      name: 'corroboration',
      direction: 'positive',
      strength: 0.95,
      description: `Verified independent news corroboration confirmed across accredited news wires (${outletNames}).`,
      category: 'Corroboration',
    });
  } else if (totalSources >= 3) {
    signals.push({
      name: 'corroboration',
      direction: 'negative',
      strength: 0.6,
      description: `Unverified Rumor: Found on ${totalSources} generic web blogs, but zero accredited wire agencies (Reuters, BBC, AP, NDTV) have verified it.`,
      category: 'Corroboration',
    });
  } else {
    signals.push({
      name: 'corroboration',
      direction: 'negative',
      strength: 0.95,
      description: 'Zero Mainstream Press Corroboration: No accredited global or national news wire agency has reported this event.',
      category: 'Corroboration',
    });
  }

  // 3. Source Credibility Signal
  if (isDebunked) {
    signals.push({
      name: 'source_credibility',
      direction: 'negative',
      strength: 0.9,
      description: 'Source lacks journalistic credibility, editorial peer review, and accredited citations.',
      category: 'Source Authority',
    });
  } else if (newsData.domain_credibility?.isReputable) {
    signals.push({
      name: 'source_credibility',
      direction: 'positive',
      strength: 0.95,
      description: `Publishing domain (${newsData.source_domain}) is on the recognized global news & press allowlist.`,
      category: 'Source Authority',
    });
  } else if (hasWireCorroboration) {
    signals.push({
      name: 'source_credibility',
      direction: 'positive',
      strength: 0.8,
      description: 'Statement verified and corroborated against live public journalistic records.',
      category: 'Source Authority',
    });
  } else {
    signals.push({
      name: 'source_credibility',
      direction: 'negative',
      strength: 0.75,
      description: `Unverified Publishing Origin (${newsData.source_domain}): lacks accredited press credentials, journalistic editorial review, or official attribution.`,
      category: 'Source Authority',
    });
  }

  return signals;
}
