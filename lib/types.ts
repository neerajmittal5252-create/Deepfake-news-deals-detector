export type ModuleType = 'listing' | 'offer' | 'news';

export type SignalDirection = 'positive' | 'negative';

export interface Signal {
  name: string;
  direction: SignalDirection;
  strength: number; // 0 to 1
  description: string;
  category?: string;
  weight?: number;
}

export type VerdictBand = 'High Risk' | 'Some Concerns' | 'Looks Genuine';

export interface ScoredResult {
  score: number;
  verdict: VerdictBand;
  signals: Signal[];
  weightsUsed: Record<string, number>;
}

// Agentic tool invocation audit record
export interface ToolInvocation {
  name: string;
  input: Record<string, any>;
  output: string; // Serialized summary of tool result
  durationMs: number;
}

// Structured research summary from agentic analysis
export interface ResearchSummary {
  sourcesConsulted: string[];
  whyGenuine: string[];
  whyFraud: string[];
  storeLegitimacy?: string;
  isPreOwnedOrD2C?: boolean;
  competitorPricesFound?: number;
}

export interface CheckResponse {
  id?: string;
  moduleType: ModuleType;
  inputUrl: string;
  score: number;
  verdict: VerdictBand;
  signals: Signal[];
  explanation: string;
  rawData: any;
  createdAt: string;
  isCached?: boolean;
  toolsUsed?: ToolInvocation[];
  researchSummary?: ResearchSummary;
}

export interface SearchResult {
  title: string;
  link: string;
  snippet: string;
  source?: string;
  price?: number;
}

export interface HealResult {
  collectorId: string;
  status: 'awaiting_approval' | 'approved' | 'failed';
  diff: {
    field: string;
    oldSelector?: string;
    newSelector: string;
    sampleExtractedValue?: any;
  };
  promptUsed: string;
  updatedAt: string;
}

export interface ScrapedItem {
  title: string;
  headline?: string;
  offer_title?: string;
  price: number | null;
  currency: string;
  description: string;
  article_body?: string;
  seller_name: string;
  brand_name: string;
  author_name?: string;
  source_domain: string;
  location?: string;
  posted_date?: string;
  image_urls: string[];
  page_url: string;
  listing_id?: string;
  seller_profile_url?: string;
  original_price?: number | null;
  discounted_price?: number | null;
  discount_percentage?: number | null;
  terms_and_conditions?: string;
  expiry_date?: string;
  publish_date?: string;
  other_listings?: any[];
  total_listings?: number;
}

// Module 1 Data Models
export interface ListingScrapedData {
  listing_id?: string;
  title: string;
  price: number | null;
  currency: string;
  description: string;
  seller_name: string;
  seller_profile_url?: string;
  location?: string;
  posted_date?: string;
  image_urls: string[];
  seller_history?: {
    other_listings: Array<{
      title: string;
      price: number;
      posted_date?: string;
    }>;
    total_listings: number;
  };
  market_median_price?: number;
}

// Module 2 Data Models
export interface OfferScrapedData {
  offer_title: string;
  discount_percentage: number | null;
  original_price: number | null;
  discounted_price: number | null;
  terms_and_conditions: string;
  expiry_date?: string;
  brand_name: string;
  page_url: string;
  brand_domain?: string;
  official_domain_match?: boolean;
  computed_discount_percentage?: number;
  math_consistent?: boolean;
}

// Module 3 Data Models
export interface NewsScrapedData {
  headline: string;
  article_body: string;
  author_name?: string;
  publish_date?: string;
  source_domain: string;
  article_url?: string;
  is_pasted_claim: boolean;
  corroborating_sources: Array<{
    title: string;
    domain: string;
    url: string;
    isReputable: boolean;
  }>;
  fact_check_matches: Array<{
    factChecker: string;
    claimReviewed: string;
    verdictSnippet: string;
    url: string;
  }>;
  domain_credibility: {
    domain: string;
    isReputable: boolean;
  };
}
