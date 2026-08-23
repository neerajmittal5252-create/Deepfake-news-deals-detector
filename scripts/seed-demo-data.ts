import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding TrustCheck demo database with verified baseline cases...');

  // 1. Listing Module - Suspicious Listing Demo
  await prisma.check.create({
    data: {
      moduleType: 'listing',
      inputUrl: 'https://classifieds-market.com/listing/iphone-15-pro-max-250-urgent-sale-scam',
      score: 18,
      verdict: 'High Risk',
      signalsJson: JSON.stringify([
        {
          name: 'price_deviation',
          direction: 'negative',
          strength: 0.9,
          description: 'Listing price ($250) is 78% below market median ($1,150). Extreme discount is a primary fraud indicator.',
          category: 'Pricing Analysis',
          weight: 0.35,
        },
        {
          name: 'seller_pattern',
          direction: 'negative',
          strength: 0.85,
          description: 'Seller profile exhibits spam patterns with 5 duplicate/cloned active listings.',
          category: 'Seller Trust',
          weight: 0.25,
        },
        {
          name: 'red_flag_phrases',
          direction: 'negative',
          strength: 0.95,
          description: 'Detected suspicious phrases commonly associated with classified fraud: "urgent sale", "cash only", "pay before viewing", "western union".',
          category: 'Text Analysis',
          weight: 0.20,
        },
        {
          name: 'data_completeness',
          direction: 'negative',
          strength: 0.7,
          description: 'Incomplete listing metadata: missing images, location, posted date.',
          category: 'Listing Metadata',
          weight: 0.10,
        },
        {
          name: 'account_age_proxy',
          direction: 'negative',
          strength: 0.5,
          description: 'Generic, auto-generated, or anonymous seller identifier detected.',
          category: 'Identity',
          weight: 0.10,
        },
      ]),
      rawDataJson: JSON.stringify({
        listing_id: 'lst_892182',
        title: 'Apple iPhone 15 Pro Max 1TB BRAND NEW UNLOCKED - Urgent Sale',
        price: 250,
        currency: 'USD',
        description: 'Urgent sale! Moving abroad today. Cash only or wire transfer. Pay deposit first before viewing to hold item. No inspection allowed at house due to Covid safety. Western union accepted.',
        seller_name: 'FastSeller992',
        seller_profile_url: 'https://marketplace-example.com/user/dav_9281',
        location: '',
        posted_date: '',
        image_urls: [],
        market_median_price: 1150,
      }),
      explanation: 'TrustCheck assigned a High Risk score of 18/100 due to multiple critical red flags. Listing price ($250) is 78% below market median ($1,150). Additionally, detected suspicious phrases commonly associated with classified fraud ("urgent sale", "cash only", "pay before viewing", "western union"). Exercise extreme caution before proceeding.',
    },
  });

  // 2. Offer Module - Fraudulent Flash Deal
  await prisma.check.create({
    data: {
      moduleType: 'offer',
      inputUrl: 'https://secret-deals-promo.xyz/offer/nike-air-jordan-99-off-deal',
      score: 14,
      verdict: 'High Risk',
      signalsJson: JSON.stringify([
        {
          name: 'brand_mismatch',
          direction: 'negative',
          strength: 0.85,
          description: 'Domain mismatch: Offer domain does not match Nike\'s verified official domain (nike.com). High phishing risk.',
          category: 'Brand Authenticity',
          weight: 0.35,
        },
        {
          name: 'math_inconsistency',
          direction: 'negative',
          strength: 0.9,
          description: 'Extreme discount claim (98% off). Unrealistic price cuts are standard tactics in counterfeit/clearing scams.',
          category: 'Pricing Integrity',
          weight: 0.30,
        },
        {
          name: 'pressure_language',
          direction: 'negative',
          strength: 0.95,
          description: 'High-pressure urgency language detected: "only next 10 minutes", "limited to first 3 people", "enter credit card for age verification".',
          category: 'Psychological Triggers',
          weight: 0.20,
        },
        {
          name: 'terms_vagueness',
          direction: 'negative',
          strength: 0.7,
          description: 'Missing Terms & Conditions or return policy disclosure.',
          category: 'Legal & Policy',
          weight: 0.15,
        },
      ]),
      rawDataJson: JSON.stringify({
        offer_title: 'Nike Air Jordan 1 Retro High OG - 99% Flash Clearance',
        brand_name: 'Nike',
        original_price: 200,
        discounted_price: 5,
        discount_percentage: 99,
        terms_and_conditions: 'Only next 10 minutes! Limited to first 3 people. No refund under any condition. Enter credit card for age verification.',
        expiry_date: '2026-08-20T23:59:00Z',
        page_url: 'https://secret-deals-promo.xyz/offer/nike-air-jordan-99-off-deal',
        brand_domain: 'nike.com',
        official_domain_match: false,
      }),
      explanation: 'TrustCheck assigned a High Risk score of 14/100 due to multiple critical red flags. Domain mismatch: Offer domain does not match Nike\'s verified official domain (nike.com). Additionally, extreme discount claim (98% off) combined with high-pressure countdown language. Phishing and credential harvesting risk detected.',
    },
  });

  // 3. News Module - Genuine NASA Discovery
  await prisma.check.create({
    data: {
      moduleType: 'news',
      inputUrl: 'https://nature.com/articles/nasa-jwst-ancient-early-galaxy-discovery',
      score: 95,
      verdict: 'Looks Genuine',
      signalsJson: JSON.stringify([
        {
          name: 'fact_check_match',
          direction: 'positive',
          strength: 0.7,
          description: 'No prior debunks found across major fact-checking organizations (Snopes, PolitiFact, FactCheck.org).',
          category: 'Fact-Check Records',
          weight: 0.35,
        },
        {
          name: 'corroboration',
          direction: 'positive',
          strength: 0.95,
          description: 'Multiple independent wire/major outlets (reuters.com, bbc.com, nature.com) corroborate reporting on this subject.',
          category: 'Corroboration',
          weight: 0.40,
        },
        {
          name: 'source_credibility',
          direction: 'positive',
          strength: 0.95,
          description: 'Publisher domain (nature.com) is recognized on verified global news and peer-reviewed press allowlist.',
          category: 'Source Authority',
          weight: 0.25,
        },
      ]),
      rawDataJson: JSON.stringify({
        headline: 'NASA James Webb Space Telescope Discovers Ancient Galaxy from Dawn of Cosmos',
        article_body: 'Astronomers using the James Webb Space Telescope have identified a remarkably bright galaxy that formed just 300 million years after the Big Bang, expanding our understanding of early cosmic evolution.',
        author_name: 'Dr. Rebecca Thorne',
        publish_date: '2026-08-19',
        source_domain: 'nature.com',
        article_url: 'https://nature.com/articles/nasa-jwst-ancient-early-galaxy-discovery',
        is_pasted_claim: false,
        corroborating_sources: [
          { title: 'NASA Webb Telescope Identifies Earliest Known Galaxy', domain: 'reuters.com', url: 'https://reuters.com/science/webb-galaxy', isReputable: true },
          { title: 'Ancient Cosmic Structures Unveiled by JWST', domain: 'bbc.com', url: 'https://bbc.com/news/science-space', isReputable: true },
        ],
        fact_check_matches: [],
        domain_credibility: { domain: 'nature.com', isReputable: true },
      }),
      explanation: 'TrustCheck verified this with a high trust score of 95/100 (Looks Genuine). Multiple independent wire/major outlets (reuters.com, bbc.com, nature.com) corroborate reporting on this subject. Furthermore, publisher domain (nature.com) is recognized on verified global news directories.',
    },
  });

  console.log('✅ Demo database seeded successfully with 3 baseline records!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
