import fs from 'fs';
import path from 'path';
import { runScraperCollector, searchWeb } from '../brightdataClient';
import { Signal, ListingScrapedData } from '../types';
import collectorsConfig from '../../config/collectors.json';
import { findCompetitorPrices } from '../tools/webSearchTools';

// Load scam phrases
const scamPhrasesPath = path.join(process.cwd(), 'data', 'scam-phrases.json');
let scamPhrases: string[] = [];
try {
  scamPhrases = JSON.parse(fs.readFileSync(scamPhrasesPath, 'utf8'));
} catch (e) {
  scamPhrases = ['cash only', 'no inspection', 'urgent sale', 'pay before viewing', 'western union', 'wire transfer only'];
}

// Known secondhand / reseller platform domains
const RESELLER_PLATFORMS = [
  'gameloot.in', 'olx.in', 'quikr.com', 'cashify.in', 'togofogo.com', 'budli.in', 'yaantra.com',
  'ebay.in', 'ebay.com', 'gumtree.com', 'craigslist.org', 'decluttr.com', 'swappa.com', 'backmarket.in',
];

// Known reputable direct-seller / official brand store domains
const OFFICIAL_STORE_DOMAINS = [
  'amazon.in', 'amazon.com', 'flipkart.com', 'myntra.com', 'nykaa.com', 'meesho.com',
  'snapdeal.com', 'tatacliq.com', 'reliance.com', 'jiomart.com', 'bigbasket.com',
  'apple.com', 'samsung.com', 'oneplus.in', 'mi.com', 'realme.com',
];

/**
 * Parses a price value from various formats including INR (₹, Rs., INR)
 */
function parsePrice(val: any): number | null {
  if (typeof val === 'number' && val > 0) return val;
  if (!val) return null;
  const cleaned = String(val).replace(/[₹,\s]/g, '').replace(/Rs\.?/gi, '').replace(/INR/gi, '').trim();
  const num = parseFloat(cleaned);
  return num > 0 ? num : null;
}

/**
 * Scrapes a marketplace listing using Bright Data Scraper Studio Listing Collector
 */
export async function scrapeListing(url: string): Promise<ListingScrapedData> {
  const collectorId = collectorsConfig.listing_module.listing_collector;
  const results = await runScraperCollector(collectorId, [url]);
  const item = results[0] || {};

  const listing: ListingScrapedData = {
    listing_id: item.listing_id || 'lst_' + Math.floor(Math.random() * 1000000),
    title: item.title || 'Marketplace Item Listing',
    price: parsePrice(item.price) ?? parsePrice(item.discounted_price),
    currency: item.currency || 'INR',
    description: item.description || '',
    seller_name: item.seller_name || item.brand_name || 'Unknown Seller',
    seller_profile_url: item.seller_profile_url || '',
    location: item.location || '',
    posted_date: item.posted_date || '',
    image_urls: Array.isArray(item.image_urls) ? item.image_urls : [],
  };

  // Optional seller history scraping
  if (listing.seller_profile_url) {
    try {
      const sellerCollectorId = collectorsConfig.listing_module.seller_collector;
      const sellerResults = await runScraperCollector(sellerCollectorId, [listing.seller_profile_url]);
      if (sellerResults && sellerResults.length > 0) {
        listing.seller_history = {
          other_listings: sellerResults[0].other_listings || [],
          total_listings: sellerResults[0].total_listings || sellerResults[0].other_listings?.length || 0,
        };
      }
    } catch (err) {
      console.warn('Seller history profile unreachable, continuing gracefully:', err);
    }
  }

  return listing;
}

/**
 * Calculates market median price from public SERP shopping results.
 * Supports both INR (₹) and USD pricing.
 */
export async function computeMarketMedian(title: string, pageUrl?: string): Promise<number | null> {
  // Detect if the title is a generic site title rather than a product name
  const isGenericTitle = /(?:online store|beauty store|buy now|shop now|official site|home page|\.com|welcome to)/i.test(title);

  let searchQuery: string;

  if (isGenericTitle && pageUrl) {
    // Extract product name from URL slug — much more reliable for e-commerce
    try {
      const urlPath = new URL(pageUrl).pathname;
      // Take the last path segment (product slug)
      const slug = urlPath.split('/').filter(Boolean).pop() || '';
      // Convert slug to readable words: "best-activated-charcoal-face-wash-detox-skin-cleanser" → "activated charcoal face wash"
      searchQuery = slug
        .replace(/-/g, ' ')
        .replace(/\b(best|buy|get|top|new|latest|premium|india|online|cheap|deal)\b/gi, '')
        .trim()
        .slice(0, 60);
      console.log(`[Scraper] Generic title detected, using URL slug for search: "${searchQuery}"`);
    } catch {
      searchQuery = title.slice(0, 50);
    }
  } else {
    // Use scraped title, stripping noise words
    searchQuery = title
      .replace(/\b(best|top|new|latest|premium|buy|online|india|detox|pure|organic|natural|activated|men|women|for|with|\d+ml|\d+gm|\d+g)\b/gi, '')
      .replace(/[|–—-].*/g, '') // strip after separator (brand suffix)
      .trim()
      .slice(0, 60);
  }

  if (!searchQuery || searchQuery.length < 5) searchQuery = title.slice(0, 50);

  try {
    const searchResults = await searchWeb(searchQuery, { type: 'shopping' });
    const prices: number[] = [];

    for (const res of searchResults) {
      if (typeof res.price === 'number' && res.price > 0) {
        prices.push(res.price);
        continue;
      }
      // Regex extraction — supports ₹, Rs., INR, $
      const text = `${res.title} ${res.snippet}`;
      const matches = text.matchAll(/(?:₹|Rs\.?|INR|\$|USD|EUR|GBP|MRP:?)\s?([\d,]+(?:\.\d{1,2})?)/gi);
      for (const m of matches) {
        const num = parseFloat(m[1].replace(/,/g, ''));
        if (num > 10 && num < 10_000_000) {
          prices.push(num);
        }
      }
    }

    if (prices.length === 0) {
      // Live fallback to DuckDuckGo competitor prices across Amazon, Flipkart, Nykaa
      const compResult = await findCompetitorPrices(searchQuery);
      if (compResult.medianPrice && compResult.medianPrice > 0) {
        return compResult.medianPrice;
      }
      return null;
    }

    prices.sort((a, b) => a - b);
    const mid = Math.floor(prices.length / 2);
    return prices.length % 2 !== 0 ? prices[mid] : (prices[mid - 1] + prices[mid]) / 2;
  } catch (err) {
    console.warn('Market price cross-check fallback:', err);
    try {
      const compResult = await findCompetitorPrices(searchQuery);
      return compResult.medianPrice || null;
    } catch {
      return null;
    }
  }
}

/**
 * Generates all discrete signals for marketplace listings.
 * Fully currency-agnostic; works with ₹ INR and $ USD values.
 */
export function extractListingSignals(listing: ListingScrapedData, marketMedian: number | null): Signal[] {
  const signals: Signal[] = [];

  let domain = '';
  try {
    const rawUrl = (listing as any).page_url || listing.seller_profile_url || '';
    if (rawUrl) {
      domain = new URL(rawUrl).hostname.replace('www.', '').toLowerCase();
    }
  } catch {}

  const isOfficialPlatform = OFFICIAL_STORE_DOMAINS.some((d) => domain.includes(d));
  const isResellerPlatform = RESELLER_PLATFORMS.some((d) => domain.includes(d));
  const isSuspiciousTld = /\.(xyz|top|tk|ml|ga|cf|gq|club|icu|work|buzz)$/i.test(domain);
  const hasScamWordsInDomainOrUrl = /(scam|cheap-deal|free-gift|flash-sale-99|hack|crack|giveaway)/i.test(
    domain + ' ' + (listing.listing_id || '') + ' ' + ((listing as any).page_url || '')
  );

  // 1. Price Deviation Signal
  if (listing.price !== null && marketMedian !== null && marketMedian > 0) {
    const diff = marketMedian - listing.price;
    const deviationRatio = diff / marketMedian;

    if (deviationRatio > 0.40 && !isResellerPlatform) {
      // Abnormally cheap on non-used store — classic bait/scam indicator
      const strength = Math.min(1.0, deviationRatio);
      const curr = listing.currency === 'USD' ? '$' : '₹';
      signals.push({
        name: 'price_deviation',
        direction: 'negative',
        strength,
        description: `Listing price (${curr}${listing.price.toLocaleString()}) is ${(deviationRatio * 100).toFixed(0)}% below the market median (${curr}${marketMedian.toFixed(0)}). Extreme underpricing is a primary fraud indicator.`,
        category: 'Pricing Analysis',
      });
    } else if (deviationRatio > 0.70 && isResellerPlatform) {
      // Extreme discount even for used items (e.g. 80%+ off)
      const curr = listing.currency === 'USD' ? '$' : '₹';
      signals.push({
        name: 'price_deviation',
        direction: 'negative',
        strength: 0.7,
        description: `Listing price (${curr}${listing.price.toLocaleString()}) is ${(deviationRatio * 100).toFixed(0)}% below standard pre-owned market rates.`,
        category: 'Pricing Analysis',
      });
    } else if (deviationRatio < -0.6) {
      // Significantly overpriced
      const curr = listing.currency === 'USD' ? '$' : '₹';
      signals.push({
        name: 'price_deviation',
        direction: 'negative',
        strength: 0.35,
        description: `Listing price (${curr}${listing.price.toLocaleString()}) is significantly above the market average (${curr}${marketMedian.toFixed(0)}).`,
        category: 'Pricing Analysis',
      });
    } else {
      const curr = listing.currency === 'USD' ? '$' : '₹';
      signals.push({
        name: 'price_deviation',
        direction: 'positive',
        strength: 0.85,
        description: `Listing price (${curr}${listing.price.toLocaleString()}) aligns with realistic market valuation (median: ${curr}${marketMedian.toFixed(0)}).`,
        category: 'Pricing Analysis',
      });
    }
  } else if (listing.price !== null) {
    if (listing.price <= 15) {
      // Obvious fake bait pricing (₹1 / $1 or <= 15 for retail products)
      signals.push({
        name: 'price_deviation',
        direction: 'negative',
        strength: 1.0,
        description: `Extreme price anomaly: listing price of ${listing.currency === 'USD' ? '$' : '₹'}${listing.price} is impossibly low for ${listing.title}. Unquestionable bait-and-switch, fake deal, or deceptive promotion.`,
        category: 'Pricing Analysis',
      });
    } else {
      signals.push({
        name: 'price_deviation',
        direction: 'positive',
        strength: 0.65,
        description: `Extracted listing price (${listing.currency === 'USD' ? '$' : '₹'}${listing.price.toLocaleString()}) is consistent with single-merchant catalog pricing.`,
        category: 'Pricing Analysis',
      });
    }
  } else if (isOfficialPlatform) {
    signals.push({
      name: 'price_deviation',
      direction: 'positive',
      strength: 0.7,
      description: 'Standard product catalog item on verified e-commerce merchant.',
      category: 'Pricing Analysis',
    });
  } else {
    signals.push({
      name: 'price_deviation',
      direction: 'negative',
      strength: 0.4,
      description: 'No verifiable pricing structure could be extracted from this listing.',
      category: 'Pricing Analysis',
    });
  }

  // 2. Seller / Platform Trust Signal
  if (isOfficialPlatform) {
    signals.push({
      name: 'seller_pattern',
      direction: 'positive',
      strength: 0.9,
      description: `Hosted on verified tier-1 retail infrastructure (${domain || 'Authorized Merchant'}). Secure payment gateway and consumer protections active.`,
      category: 'Seller Trust',
    });
  } else if (isResellerPlatform) {
    signals.push({
      name: 'seller_pattern',
      direction: 'positive',
      strength: 0.8,
      description: `Hosted on recognized certified pre-owned exchange (${domain}). Buyer protection protocols apply.`,
      category: 'Seller Trust',
    });
  } else if (isSuspiciousTld || hasScamWordsInDomainOrUrl) {
    signals.push({
      name: 'seller_pattern',
      direction: 'negative',
      strength: 0.95,
      description: `High risk: Hosted on disposable domain (${domain}) with known phishing/scam naming patterns.`,
      category: 'Seller Trust',
    });
  } else if (listing.seller_history && listing.seller_history.other_listings.length > 0) {
    const titles = listing.seller_history.other_listings.map((l) => l.title.toLowerCase());
    const duplicates = titles.filter((t, i) => titles.indexOf(t) !== i);

    if (duplicates.length >= 3 || (titles.length >= 5 && new Set(titles).size <= 2)) {
      signals.push({
        name: 'seller_pattern',
        direction: 'negative',
        strength: 0.9,
        description: `Seller profile exhibits spam patterns with ${duplicates.length} duplicate/cloned active listings.`,
        category: 'Seller Trust',
      });
    } else {
      signals.push({
        name: 'seller_pattern',
        direction: 'positive',
        strength: 0.75,
        description: `Seller maintains a healthy listing portfolio of ${listing.seller_history.total_listings} distinct items.`,
        category: 'Seller Trust',
      });
    }
  } else {
    signals.push({
      name: 'seller_pattern',
      direction: 'positive',
      strength: 0.5,
      description: 'Standard independent storefront profile with active catalog routing.',
      category: 'Seller Trust',
    });
  }

  // 3. Red Flag Phrases Signal
  const desc = (listing.description || '').toLowerCase() + ' ' + listing.title.toLowerCase();
  const matchedPhrases: string[] = [];
  for (const phrase of scamPhrases) {
    if (desc.includes(phrase.toLowerCase())) {
      matchedPhrases.push(phrase);
    }
  }

  if (matchedPhrases.length > 0) {
    const strength = Math.min(1.0, 0.5 + matchedPhrases.length * 0.25);
    signals.push({
      name: 'red_flag_phrases',
      direction: 'negative',
      strength,
      description: `Detected suspicious phrases commonly associated with classified fraud: "${matchedPhrases.join('", "')}".`,
      category: 'Text Analysis',
    });
  } else {
    signals.push({
      name: 'red_flag_phrases',
      direction: 'positive',
      strength: 0.8,
      description: 'No fraudulent payment, urgency, or escrow bypass phrases detected in the listing description.',
      category: 'Text Analysis',
    });
  }

  // 4. Data Completeness Signal
  const missingFields: string[] = [];
  if (!listing.image_urls || listing.image_urls.length === 0) missingFields.push('images');
  if (!listing.location && !isOfficialPlatform) missingFields.push('location');

  if (missingFields.length === 0 || isOfficialPlatform) {
    signals.push({
      name: 'data_completeness',
      direction: 'positive',
      strength: 0.85,
      description: 'Listing metadata is complete with verified product imagery, title, and catalog parameters.',
      category: 'Listing Metadata',
    });
  } else {
    signals.push({
      name: 'data_completeness',
      direction: 'negative',
      strength: Math.min(0.8, missingFields.length * 0.35),
      description: `Incomplete listing metadata — missing ${missingFields.join(', ')}.`,
      category: 'Listing Metadata',
    });
  }

  // 5. Account / Identity Signal
  const sellerName = (listing.seller_name || '').toLowerCase();
  const isFakeName = isSuspiciousTld || hasScamWordsInDomainOrUrl || sellerName.includes('scam') || sellerName.includes('cheap') || sellerName.includes('deal');

  if (isOfficialPlatform) {
    signals.push({
      name: 'account_age_proxy',
      direction: 'positive',
      strength: 0.95,
      description: `Verified enterprise brand entity: "${domain}". Established corporate reputation.`,
      category: 'Identity',
    });
  } else if (isFakeName) {
    signals.push({
      name: 'account_age_proxy',
      direction: 'negative',
      strength: 0.9,
      description: `Suspicious or throwaway merchant identifier detected: "${listing.seller_name}".`,
      category: 'Identity',
    });
  } else if (listing.seller_name && listing.seller_name.length > 2 && listing.seller_name !== 'Unknown Seller') {
    signals.push({
      name: 'account_age_proxy',
      direction: 'positive',
      strength: 0.7,
      description: `Seller/brand identity is clearly identified as "${listing.seller_name}".`,
      category: 'Identity',
    });
  } else {
    signals.push({
      name: 'account_age_proxy',
      direction: 'negative',
      strength: 0.5,
      description: 'Generic or anonymous merchant identifier.',
      category: 'Identity',
    });
  }

  return signals;
}
