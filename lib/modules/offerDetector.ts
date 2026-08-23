import fs from 'fs';
import path from 'path';
import { runScraperCollector, searchWeb } from '../brightdataClient';
import { Signal, OfferScrapedData } from '../types';
import collectorsConfig from '../../config/collectors.json';
import { findCompetitorPrices } from '../tools/webSearchTools';

// Load offer red flags
const offerRedFlagsPath = path.join(process.cwd(), 'data', 'offer-red-flags.json');
let offerRedFlags: string[] = [];
try {
  offerRedFlags = JSON.parse(fs.readFileSync(offerRedFlagsPath, 'utf8'));
} catch (e) {
  offerRedFlags = ['only next 10 minutes', 'limited to first 3 people', 'act fast before stock ends', 'hurry', 'expires soon', 'flash sale', 'free giveaway'];
}

// Prominent brand official domains catalog
export const KNOWN_BRAND_DOMAINS: Record<string, { officialDomain: string; name: string }> = {
  apple: { officialDomain: 'apple.com', name: 'Apple' },
  iphone: { officialDomain: 'apple.com', name: 'Apple' },
  ipad: { officialDomain: 'apple.com', name: 'Apple' },
  macbook: { officialDomain: 'apple.com', name: 'Apple' },
  airpods: { officialDomain: 'apple.com', name: 'Apple' },
  nike: { officialDomain: 'nike.com', name: 'Nike' },
  adidas: { officialDomain: 'adidas.com', name: 'Adidas' },
  samsung: { officialDomain: 'samsung.com', name: 'Samsung' },
  galaxy: { officialDomain: 'samsung.com', name: 'Samsung' },
  sony: { officialDomain: 'sony.com', name: 'Sony' },
  playstation: { officialDomain: 'playstation.com', name: 'PlayStation' },
  oneplus: { officialDomain: 'oneplus.com', name: 'OnePlus' },
  xiaomi: { officialDomain: 'mi.com', name: 'Xiaomi' },
  redmi: { officialDomain: 'mi.com', name: 'Xiaomi' },
  realme: { officialDomain: 'realme.com', name: 'Realme' },
  google: { officialDomain: 'store.google.com', name: 'Google' },
  pixel: { officialDomain: 'store.google.com', name: 'Google' },
  rolex: { officialDomain: 'rolex.com', name: 'Rolex' },
  puma: { officialDomain: 'puma.com', name: 'Puma' },
  gucci: { officialDomain: 'gucci.com', name: 'Gucci' },
  prada: { officialDomain: 'prada.com', name: 'Prada' },
  zara: { officialDomain: 'zara.com', name: 'Zara' },
  hm: { officialDomain: 'hm.com', name: 'H&M' },
  dyson: { officialDomain: 'dyson.com', name: 'Dyson' },
  twasa: { officialDomain: 'twasa.com', name: 'Twasa' },
  mamaearth: { officialDomain: 'mamaearth.in', name: 'Mamaearth' },
  boat: { officialDomain: 'boat-lifestyle.com', name: 'boAt' },
  noise: { officialDomain: 'gonoise.com', name: 'Noise' },
  dell: { officialDomain: 'dell.com', name: 'Dell' },
  hp: { officialDomain: 'hp.com', name: 'HP' },
  lenovo: { officialDomain: 'lenovo.com', name: 'Lenovo' },
  asus: { officialDomain: 'asus.com', name: 'Asus' },
  fastrack: { officialDomain: 'fastrack.in', name: 'Fastrack' },
  titan: { officialDomain: 'titan.co.in', name: 'Titan' },
  jbl: { officialDomain: 'jbl.com', name: 'JBL' },
  bose: { officialDomain: 'bose.com', name: 'Bose' },
};

// Known authorized enterprise multi-brand marketplaces
export const AUTHORIZED_ENTERPRISE_RETAILERS = [
  'amazon.in', 'amazon.com', 'flipkart.com', 'croma.com', 'reliancedigital.in', 'tatacliq.com',
  'myntra.com', 'nykaa.com', 'ajio.com', 'bestbuy.com', 'walmart.com', 'target.com',
  'gameloot.in', 'cashify.in', 'tata.com'
];

/**
 * Parses a price value from various formats including INR (₹, Rs., INR) and USD ($)
 */
function parsePrice(val: any): number | null {
  if (typeof val === 'number' && val > 0) return val;
  if (!val) return null;
  const cleaned = String(val).replace(/[₹,\s]/g, '').replace(/Rs\.?/gi, '').replace(/INR/gi, '').replace(/\$/g, '').trim();
  const num = parseFloat(cleaned);
  return num > 0 ? num : null;
}

/**
 * Extracts the genuine brand name from product title and page data.
 * Checks against prominent global/national brands before defaulting to domain.
 */
export function extractBrandFromProduct(title: string, rawBrand: string, offerUrl: string): { brandName: string; officialDomain?: string } {
  const lowerTitle = (title || '').toLowerCase();
  const cleanRaw = (rawBrand || '').toLowerCase().trim();

  // 1. Check if title or raw brand matches any prominent brand catalog
  for (const [key, brandInfo] of Object.entries(KNOWN_BRAND_DOMAINS)) {
    const brandRegex = new RegExp(`\\b${key}\\b`, 'i');
    if (brandRegex.test(lowerTitle) || brandRegex.test(cleanRaw)) {
      return { brandName: brandInfo.name, officialDomain: brandInfo.officialDomain };
    }
  }

  // 2. Check title separators (e.g. "Product Name | Brand")
  const separators = title.split(/[\|–—-]/);
  if (separators.length >= 2) {
    const lastPart = separators[separators.length - 1].trim();
    if (lastPart.length >= 2 && lastPart.length <= 30 && !/buy|shop|online|store|india|discount|offer|deal/i.test(lastPart)) {
      const slug = lastPart.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (KNOWN_BRAND_DOMAINS[slug]) {
        return { brandName: KNOWN_BRAND_DOMAINS[slug].name, officialDomain: KNOWN_BRAND_DOMAINS[slug].officialDomain };
      }
      return { brandName: lastPart };
    }
  }

  // 3. Fallback to rawBrand if non-generic
  if (rawBrand && rawBrand !== 'Generic Brand' && rawBrand !== 'Unknown Brand' && rawBrand !== 'Brand Store') {
    return { brandName: rawBrand };
  }

  // 4. Fallback to host domain
  let domain = '';
  try { domain = new URL(offerUrl).hostname.replace('www.', ''); } catch { domain = offerUrl; }
  return { brandName: domain.split('.')[0] || 'Unknown Brand' };
}

/**
 * Scrapes promo/offer details via Bright Data Scraper Studio Offer Collector
 */
export async function scrapeOffer(url: string): Promise<OfferScrapedData> {
  const collectorId = collectorsConfig.offer_module.offer_collector;
  const results = await runScraperCollector(collectorId, [url]);
  const item = results[0] || {};

  const title = item.offer_title || item.title || 'Product Offer';
  const { brandName, officialDomain } = extractBrandFromProduct(title, item.brand_name || '', url);

  const originalPrice = parsePrice(item.original_price);
  const discountedPrice = parsePrice(item.discounted_price) ?? parsePrice(item.price);

  let discountPct = typeof item.discount_percentage === 'number' ? item.discount_percentage :
    parseFloat(String(item.discount_percentage || '0').replace(/[^0-9.]/g, '')) || null;
  if (!discountPct && originalPrice && discountedPrice && originalPrice > discountedPrice) {
    discountPct = Math.round(((originalPrice - discountedPrice) / originalPrice) * 100);
  }

  return {
    offer_title: title,
    discount_percentage: discountPct,
    original_price: originalPrice,
    discounted_price: discountedPrice,
    terms_and_conditions: item.terms_and_conditions || '',
    expiry_date: item.expiry_date || '',
    brand_name: brandName,
    page_url: url,
    brand_domain: officialDomain,
  };
}

export interface BrandVerificationResult {
  isOfficial: boolean;
  isAuthorizedRetailer: boolean;
  isBrandImpersonation: boolean;
  officialDomain: string;
  brandName: string;
  offerDomain: string;
}

/**
 * Verifies if the promo domain matches the brand's official domain or is an authorized enterprise retailer.
 * Detects domain typosquatting / brand impersonation (e.g. tatacommercial.in mimicking Tata).
 */
export async function brandVerificationCheck(
  brandName: string,
  offerUrl: string,
  preDeterminedDomain?: string
): Promise<BrandVerificationResult> {
  let offerDomain = '';
  try {
    offerDomain = new URL(offerUrl).hostname.replace('www.', '').toLowerCase();
  } catch {
    offerDomain = offerUrl.toLowerCase();
  }

  let officialDomain = preDeterminedDomain || '';

  // 1. If we have a known brand domain mapping
  const brandSlug = brandName.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!officialDomain && KNOWN_BRAND_DOMAINS[brandSlug]) {
    officialDomain = KNOWN_BRAND_DOMAINS[brandSlug].officialDomain;
  }

  // 2. If official domain is still unknown, search for it
  if (!officialDomain) {
    try {
      const searchResults = await searchWeb(`${brandName} official site`);
      if (searchResults.length > 0) {
        try {
          officialDomain = new URL(searchResults[0].link).hostname.replace('www.', '').toLowerCase();
        } catch {
          officialDomain = searchResults[0].link;
        }
      }
    } catch {
      officialDomain = `${brandSlug}.com`;
    }
  }

  // 3. Match Evaluation:
  // Is this hosted directly on the brand's official domain?
  const cleanOfficial = officialDomain.replace('www.', '').toLowerCase();
  const isOfficial =
    offerDomain === cleanOfficial ||
    offerDomain.endsWith(`.${cleanOfficial}`) ||
    (cleanOfficial.includes(brandSlug) && offerDomain.startsWith(`${brandSlug}.`));

  // Is this hosted on a verified enterprise retailer (Amazon, Flipkart, Croma, Tata Cliq, etc.)?
  const isAuthorizedRetailer = AUTHORIZED_ENTERPRISE_RETAILERS.some(
    (retailer) => offerDomain === retailer || offerDomain.endsWith(`.${retailer}`)
  );

  // Brand Impersonation / Typosquatting Check:
  // Does the offer domain contain a famous brand name (e.g. 'tata', 'apple', 'nike') without being the real domain?
  const isBrandImpersonation =
    !isOfficial &&
    !isAuthorizedRetailer &&
    (/\b(tata|apple|nike|adidas|samsung|sony|flipkart|amazon|myntra)\b/i.test(offerDomain) ||
      (brandSlug.length >= 4 && offerDomain.includes(brandSlug) && !offerDomain.endsWith(`.${cleanOfficial}`)));

  return {
    isOfficial,
    isAuthorizedRetailer,
    isBrandImpersonation,
    officialDomain: cleanOfficial || 'unknown',
    brandName,
    offerDomain,
  };
}

/**
 * Generates auditable discrete signals for offers and deals.
 */
export function extractOfferSignals(
  offer: OfferScrapedData,
  brandCheck: BrandVerificationResult
): Signal[] {
  const signals: Signal[] = [];
  const curr = offer.discounted_price && offer.discounted_price > 1000 ? '₹' : (offer.original_price && offer.original_price > 1000 ? '₹' : '$');

  // 1. Brand Mismatch & Impersonation Signal
  if (brandCheck.isOfficial) {
    signals.push({
      name: 'brand_mismatch',
      direction: 'positive',
      strength: 0.95,
      description: `Verified official brand domain: Offer is hosted directly on ${brandCheck.brandName}'s official website (${brandCheck.officialDomain}).`,
      category: 'Brand Authenticity',
    });
  } else if (brandCheck.isAuthorizedRetailer) {
    signals.push({
      name: 'brand_mismatch',
      direction: 'positive',
      strength: 0.8,
      description: `Verified enterprise retail platform: Hosted on authorized multi-brand retailer (${brandCheck.offerDomain}) for authentic ${brandCheck.brandName} distribution.`,
      category: 'Brand Authenticity',
    });
  } else if (brandCheck.isBrandImpersonation) {
    signals.push({
      name: 'brand_mismatch',
      direction: 'negative',
      strength: 1.0,
      description: `Severe Brand Impersonation Risk: Domain "${brandCheck.offerDomain}" mimics corporate trademarks and does not match ${brandCheck.brandName}'s verified official domain (${brandCheck.officialDomain}) or any authorized retailer. High probability of phishing or counterfeit scam.`,
      category: 'Brand Authenticity',
    });
  } else {
    signals.push({
      name: 'brand_mismatch',
      direction: 'negative',
      strength: 0.95,
      description: `Domain Mismatch / Unverified Merchant: Offer for ${brandCheck.brandName} is hosted on an unverified third-party domain (${brandCheck.offerDomain}) instead of ${brandCheck.brandName}'s official store (${brandCheck.officialDomain}) or an authorized enterprise retailer.`,
      category: 'Brand Authenticity',
    });
  }

  // 2. Math & Discount Integrity Check
  const orig = offer.original_price;
  const disc = offer.discounted_price;
  const statedPct = offer.discount_percentage;

  if (orig && disc && orig > disc) {
    const computedPct = Math.round(((orig - disc) / orig) * 100);
    const difference = Math.abs(computedPct - (statedPct || computedPct));

    if (difference > 10) {
      signals.push({
        name: 'math_inconsistency',
        direction: 'negative',
        strength: 0.9,
        description: `Mathematical inconsistency: Stated discount is ${statedPct}%, but price cut from ${curr}${orig.toLocaleString()} to ${curr}${disc.toLocaleString()} represents a ${computedPct}% reduction.`,
        category: 'Pricing Integrity',
      });
    } else if (computedPct >= 85) {
      signals.push({
        name: 'math_inconsistency',
        direction: 'negative',
        strength: 0.85,
        description: `Extreme discount claim (${computedPct}% off from ${curr}${orig.toLocaleString()} to ${curr}${disc.toLocaleString()}). Discounts above 85% on ${brandCheck.brandName} are standard indicators of counterfeit or bait listings.`,
        category: 'Pricing Integrity',
      });
    } else if (brandCheck.isOfficial || brandCheck.isAuthorizedRetailer) {
      signals.push({
        name: 'math_inconsistency',
        direction: 'positive',
        strength: 0.85,
        description: `Pricing math is internally consistent (${computedPct}% discount correctly computed from ${curr}${orig.toLocaleString()} to ${curr}${disc.toLocaleString()}).`,
        category: 'Pricing Integrity',
      });
    } else {
      signals.push({
        name: 'math_inconsistency',
        direction: 'negative',
        strength: 0.5,
        description: `Unverified discount claim (${computedPct}% off) hosted on an unauthorized merchant domain without official manufacturer pricing confirmation.`,
        category: 'Pricing Integrity',
      });
    }
  } else if (disc && disc <= 15) {
    signals.push({
      name: 'math_inconsistency',
      direction: 'negative',
      strength: 1.0,
      description: `Extreme price anomaly: listing price of ${curr}${disc} on ${brandCheck.brandName} products is an impossible bait price or fake promotion.`,
      category: 'Pricing Integrity',
    });
  } else if (!brandCheck.isOfficial && !brandCheck.isAuthorizedRetailer) {
    signals.push({
      name: 'math_inconsistency',
      direction: 'negative',
      strength: 0.7,
      description: `Unverified third-party single-price listing (${curr}${disc?.toLocaleString() || 'N/A'}) with no manufacturer MRP discount breakdown or official price protection.`,
      category: 'Pricing Integrity',
    });
  } else {
    signals.push({
      name: 'math_inconsistency',
      direction: 'positive',
      strength: 0.7,
      description: 'Standard pricing structure without suspicious extreme discount claims.',
      category: 'Pricing Integrity',
    });
  }

  // 3. Pressure Language & Manipulation Patterns
  const textContent = `${offer.offer_title} ${offer.terms_and_conditions}`.toLowerCase();
  const matchedUrgency: string[] = [];

  for (const phrase of offerRedFlags) {
    if (textContent.includes(phrase.toLowerCase())) {
      matchedUrgency.push(phrase);
    }
  }

  if (matchedUrgency.length > 0) {
    signals.push({
      name: 'pressure_language',
      direction: 'negative',
      strength: Math.min(1.0, 0.5 + matchedUrgency.length * 0.25),
      description: `High-pressure urgency language detected: "${matchedUrgency.join('", "')}".`,
      category: 'Psychological Triggers',
    });
  } else {
    signals.push({
      name: 'pressure_language',
      direction: 'positive',
      strength: 0.6,
      description: 'No artificial scarcity or manipulative countdown triggers found in the offer text.',
      category: 'Psychological Triggers',
    });
  }

  // 4. Terms and Conditions Vagueness
  const terms = (offer.terms_and_conditions || '').trim();
  if (brandCheck.isOfficial || brandCheck.isAuthorizedRetailer) {
    signals.push({
      name: 'terms_vagueness',
      direction: 'positive',
      strength: 0.85,
      description: `Governed by verified corporate terms & conditions and standard consumer refund policies on ${brandCheck.offerDomain}.`,
      category: 'Legal & Policy',
    });
  } else if (terms.length === 0) {
    signals.push({
      name: 'terms_vagueness',
      direction: 'negative',
      strength: 0.8,
      description: `Missing official ${brandCheck.brandName} manufacturer warranty, corporate terms & conditions, or certified refund policy on ${brandCheck.offerDomain}.`,
      category: 'Legal & Policy',
    });
  } else if (terms.length < 50) {
    signals.push({
      name: 'terms_vagueness',
      direction: 'negative',
      strength: 0.6,
      description: `Suspiciously brief or vague merchant policy on unverified domain ${brandCheck.offerDomain}.`,
      category: 'Legal & Policy',
    });
  } else {
    signals.push({
      name: 'terms_vagueness',
      direction: 'negative',
      strength: 0.45,
      description: `Unverified merchant-generated terms on third-party domain: lacks official ${brandCheck.brandName} authorized warranty protection.`,
      category: 'Legal & Policy',
    });
  }

  return signals;
}
