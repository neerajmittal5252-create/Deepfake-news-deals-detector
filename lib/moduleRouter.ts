import { ModuleType, CheckResponse, Signal } from './types';
import { scrapeListing, computeMarketMedian, extractListingSignals } from './modules/listingDetector';
import { scrapeOffer, brandVerificationCheck, extractOfferSignals } from './modules/offerDetector';
import { scrapeOrParseNews, crossCheckNews, extractNewsSignals } from './modules/newsDetector';
import { scoreModuleSignals } from './scoringEngine';
import { generateExplanation } from './explainer';
import { runAgenticAnalysis } from './agenticAnalyzer';
import { prisma } from './prisma';

/**
 * Intelligent heuristic to auto-detect module type if not explicitly selected.
 * Routes to the correct detector based on URL structure and domain patterns.
 */
export function detectModuleType(input: string): ModuleType {
  const trimmed = input.trim();
  const isUrl = /^https?:\/\//i.test(trimmed);

  if (!isUrl) {
    return 'news'; // Pasted text claim
  }

  const lower = trimmed.toLowerCase();

  // -----------------------------------------------------------------------
  // Explicit offer / deal / coupon page patterns
  // -----------------------------------------------------------------------
  if (
    lower.includes('deal') ||
    lower.includes('/offer') ||
    lower.includes('coupon') ||
    lower.includes('discount') ||
    lower.includes('promo') ||
    lower.includes('clearance') ||
    lower.includes('flash-sale') ||
    lower.includes('hot-deal') ||
    lower.includes('/sale/')
  ) {
    return 'offer';
  }

  // -----------------------------------------------------------------------
  // Secondhand / classified marketplace listing patterns
  // -----------------------------------------------------------------------
  if (
    lower.includes('olx.') ||
    lower.includes('craigslist.') ||
    lower.includes('ebay.') ||
    lower.includes('gumtree.') ||
    lower.includes('gameloot.') ||
    lower.includes('quikr.') ||
    lower.includes('jiji.') ||
    lower.includes('classified') ||
    lower.includes('/listing/') ||
    lower.includes('/listings/') ||
    lower.includes('/item/') ||
    lower.includes('/itm/') ||
    lower.includes('/ad/') ||
    lower.includes('/marketplace/') ||
    lower.includes('/sell/') ||
    lower.includes('/used-') ||
    lower.includes('/secondhand')
  ) {
    return 'listing';
  }

  // -----------------------------------------------------------------------
  // Major brand stores & E-Commerce platforms (Product pages)
  // -----------------------------------------------------------------------
  const isEcomDomain =
    lower.includes('amazon.') ||
    lower.includes('flipkart.com') ||
    lower.includes('myntra.com') ||
    lower.includes('nykaa.com') ||
    lower.includes('meesho.com') ||
    lower.includes('snapdeal.com') ||
    lower.includes('tatacliq.com') ||
    lower.includes('croma.com') ||
    lower.includes('reliancedigital.in') ||
    lower.includes('jiomart.com') ||
    lower.includes('apple.com') ||
    lower.includes('nike.com') ||
    lower.includes('adidas.') ||
    lower.includes('samsung.com') ||
    lower.includes('oneplus.') ||
    lower.includes('mi.com') ||
    lower.includes('realme.com') ||
    lower.includes('zara.com') ||
    lower.includes('hm.com') ||
    lower.includes('shopify.') ||
    lower.includes('twasa.com') ||
    lower.includes('cashify.in');

  const hasProductPath =
    lower.includes('/products/') ||
    lower.includes('/product/') ||
    lower.includes('/shop/') ||
    lower.includes('/store/') ||
    lower.includes('/buy/') ||
    lower.includes('/p/') ||
    lower.includes('/dp/') ||
    lower.includes('/gp/') ||
    lower.includes('/t/') ||
    lower.includes('/d/') ||
    lower.includes('/pd/') ||
    lower.includes('/ip/') ||
    lower.includes('/goods/') ||
    lower.includes('/catalog/');

  if (isEcomDomain || hasProductPath) {
    return 'listing';
  }

  // -----------------------------------------------------------------------
  // Reputable news domains
  // -----------------------------------------------------------------------
  const isNewsDomain =
    lower.includes('reuters.com') ||
    lower.includes('apnews.com') ||
    lower.includes('bbc.') ||
    lower.includes('thehindu.com') ||
    lower.includes('ndtv.com') ||
    lower.includes('indianexpress.com') ||
    lower.includes('hindustantimes.com') ||
    lower.includes('timesofindia.') ||
    lower.includes('nytimes.com') ||
    lower.includes('theguardian.com') ||
    lower.includes('washingtonpost.com') ||
    lower.includes('snopes.com') ||
    lower.includes('politifact.com') ||
    lower.includes('factcheck.org') ||
    lower.includes('altnews.in') ||
    lower.includes('boomlive.in') ||
    lower.includes('livemint.com') ||
    lower.includes('moneycontrol.com') ||
    lower.includes('news18.com') ||
    lower.includes('indiatoday.in') ||
    lower.includes('/news/') ||
    lower.includes('/article/') ||
    lower.includes('/story/') ||
    lower.includes('/articleshow/');

  if (isNewsDomain) {
    return 'news';
  }

  // If URL contains typical article/claim indicators
  if (lower.includes('/blog/') || lower.includes('/post/') || lower.includes('/opinion/')) {
    return 'news';
  }

  // Default for unknown URLs
  return 'listing';
}

/**
 * Executes full 4-stage pipeline for the chosen module
 */
export async function executeCheckPipeline(
  input: string,
  requestedModule?: ModuleType
): Promise<CheckResponse> {
  const moduleType: ModuleType = requestedModule || detectModuleType(input);
  let signals: Signal[] = [];
  let rawData: any = {};

  if (moduleType === 'listing') {
    // 1. Scrape listing & seller profile
    const listing = await scrapeListing(input);

    // 2. Cross-check market price via public shopping SERP
    const marketMedian = await computeMarketMedian(listing.title, input);
    listing.market_median_price = marketMedian || undefined;

    // 3. Extract signals
    signals = extractListingSignals(listing, marketMedian);
    rawData = listing;
  } else if (moduleType === 'offer') {
    // 1. Scrape offer details
    const offer = await scrapeOffer(input);

    // 2. Cross-check official brand domain
    const brandCheck = await brandVerificationCheck(offer.brand_name, input, offer.brand_domain);
    offer.brand_domain = brandCheck.officialDomain;
    offer.official_domain_match = brandCheck.isOfficial;

    // 3. Extract signals
    signals = extractOfferSignals(offer, brandCheck);
    rawData = offer;
  } else {
    // News / Claim module
    // 1. Scrape or parse claim text
    const newsData = await scrapeOrParseNews(input);

    // 2. Cross-check corroboration & fact-checkers
    const crossCheckResults = await crossCheckNews(newsData.headline || newsData.article_body, newsData.source_domain);
    newsData.corroborating_sources = crossCheckResults.corroboratingSources;
    newsData.fact_check_matches = crossCheckResults.factCheckMatches;

    // 3. Extract signals
    signals = extractNewsSignals(newsData, crossCheckResults);
    rawData = newsData;
  }

  // 4. Initial Deterministic Baseline Scoring
  const baselineScored = scoreModuleSignals(moduleType, signals);

  // 5. Agentic Multi-Source LLM Research (Live Tools + Advanced LLM Synthesis)
  let finalScore = baselineScored.score;
  let finalVerdict = baselineScored.verdict;
  let finalSignals = baselineScored.signals;
  let explanation = '';
  let toolsUsed: any[] = [];
  let researchSummary: any = undefined;

  try {
    const agenticResult = await runAgenticAnalysis({
      moduleType,
      url: input,
      scrapedData: rawData,
      baselineScore: baselineScored.score,
      initialSignals: baselineScored.signals,
    });

    finalScore = agenticResult.finalScore;
    finalVerdict = agenticResult.verdict;
    finalSignals = agenticResult.refinedSignals;
    explanation = agenticResult.explanation;
    toolsUsed = agenticResult.toolsUsed || [];
    researchSummary = agenticResult.researchSummary;
  } catch (agentErr: any) {
    console.warn(`[Agentic Analyzer] Fallback to standard explanation: ${agentErr.message}`);
    explanation = await generateExplanation(
      baselineScored.score,
      baselineScored.verdict,
      baselineScored.signals,
      moduleType
    );
  }

  // 6. Database Persistence
  let recordId = 'chk_' + Date.now();
  try {
    const saved = await prisma.check.create({
      data: {
        moduleType,
        inputUrl: input,
        score: finalScore,
        verdict: finalVerdict,
        signalsJson: JSON.stringify(finalSignals),
        rawDataJson: JSON.stringify(rawData),
        explanation,
      },
    });
    recordId = saved.id;
  } catch (dbErr) {
    console.warn('Prisma SQLite write notice (using generated ID):', dbErr);
  }

  return {
    id: recordId,
    moduleType,
    inputUrl: input,
    score: finalScore,
    verdict: finalVerdict,
    signals: finalSignals,
    explanation,
    rawData,
    createdAt: new Date().toISOString(),
    toolsUsed,
    researchSummary,
  };
}
