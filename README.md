# TrustCheck 🛡️ — Autonomous AI & Web Intelligence Verification Engine

> **Submission for Scrape Verse Hackathon by WeMakeDevs**  
> *Paste a link or claim to get an auditable, deterministic Trust Score (0–100) powered by Bright Data Web Unlocker & SERP API, autonomous tool-calling LLM agents, and multi-source web cross-checking.*

[![Next.js 14](https://img.shields.io/badge/Next.js-14.2-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Bright Data](https://img.shields.io/badge/Bright_Data-Web_Unlocker_%26_SERP-0070f3?style=flat-square)](https://brightdata.com/)
[![Gemini & Groq](https://img.shields.io/badge/LLM_Agent-Gemini_3.6_%26_Groq_Llama_3.3-orange?style=flat-square)](https://ai.google.dev/)
[![Prisma & SQLite](https://img.shields.io/badge/Database-SQLite_via_Prisma-2D3748?style=flat-square&logo=prisma)](https://www.prisma.io/)
[![Tailwind CSS](https://img.shields.io/badge/Styling-Tailwind_CSS-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![Tests](https://img.shields.io/badge/Tests-7%2F7_Passing_(100%25)-brightgreen?style=flat-square&logo=vitest)](https://vitest.dev/)

---

## 📑 Table of Contents
1. [Project Overview](#1-project-overview)
2. [Key Highlights & Architecture](#2-key-highlights--architecture)
3. [Autonomous Tool-Calling Agent Workflow](#3-autonomous-tool-calling-agent-workflow)
4. [The Three Verification Modules](#4-the-three-verification-modules)
   - [Marketplace Listing Detector](#1-marketplace-listing-detector-ecommerce--classifieds)
   - [Offer / Deal Detector](#2-offer--deal-detector-promos-coupons--flash-sales)
   - [News & Claim Detector](#3-news--claim-detector-articles-hoaxes--viral-claims)
5. [Bright Data Scraper Studio & Self-Healing](#5-bright-data-scraper-studio--self-healing)
6. [Scoring Methodology & Auditable Math](#6-scoring-methodology--auditable-math)
7. [Tech Stack & Project Structure](#7-tech-stack--project-structure)
8. [Getting Started & Local Setup](#8-getting-started--local-setup)
9. [API Reference](#9-api-reference)
10. [Hackathon Compliance Statements](#10-hackathon-compliance-statements)

---

## 1. Project Overview

Online shopping, flash deal promos, and social media news feeds are flooded with bait pricing, brand impersonation websites, counterfeit listings, and viral hoaxes.

**TrustCheck** is an end-to-end intelligence engine that gives consumers and researchers a unified **"Paste a Link, Get a Trust Verdict"** platform:
- **Scrapes live web pages** using **Bright Data Web Unlocker** (`cli_unlocker`) with autonomous CSS selector self-healing.
- **Performs autonomous multi-source research** using iterative function-calling tools (SERP searches, live competitor price extraction, WHOIS/domain reputation checks, and certified fact-checker queries).
- **Computes a deterministic, auditable Trust Score (0–100)** weighted by discrete verified signals.
- **Explains risk factors transparently** in natural language with verified evidence badges.

---

## 2. Key Highlights & Architecture

```text
 User Input (URL or Pasted Claim)
        │
        ▼
 ┌─────────────────────────────────────────────────────────────┐
 │  Module Router: Auto-Classifies (Listing / Offer / News)    │
 └──────────────────────────────┬──────────────────────────────┘
                                │
                                ▼
 ┌─────────────────────────────────────────────────────────────┐
 │  Bright Data Web Unlocker (cli_unlocker) + Auto-Heal Engine │
 │  Extracts: Title, Price, Merchant, Domain, Terms, Images    │
 └──────────────────────────────┬──────────────────────────────┘
                                │
                                ▼
 ┌─────────────────────────────────────────────────────────────┐
 │  Autonomous Agentic Loop (Gemini 3.6 Flash / Groq Llama)    │
 │  Iterative Tool Execution:                                  │
 │   • scrape_webpage (Bright Data Unlocker)                   │
 │   • bright_data_serp_search (Google SERP API)               │
 │   • compare_market_prices (Cross-store market median)       │
 │   • check_domain_reputation (Reddit, Trustpilot, Scam db)   │
 │   • search_fact_checkers (Snopes, PolitiFact, Reuters)      │
 │   • search_web (Multi-engine query router)                  │
 └──────────────────────────────┬──────────────────────────────┘
                                │
                                ▼
 ┌─────────────────────────────────────────────────────────────┐
 │  Discrete Signal Engine (config/scoring-weights.json)       │
 │  Auditable Positive / Negative Weighted Point Adjustments   │
 └──────────────────────────────┬──────────────────────────────┘
                                │
                                ▼
 ┌─────────────────────────────────────────────────────────────┐
 │  Deterministic Scoring Core (Baseline: 70, Range: 0–100)    │
 │  Verdict Bands: High Risk (0–39) | Some Concerns (40–69) |  │
 │                 Looks Genuine (70–100)                      │
 └──────────────────────────────┬──────────────────────────────┘
                                │
                                ▼
 ┌─────────────────────────────────────────────────────────────┐
 │  Interactive UI: Neon Gauge, Evidence Badges, Audit Drawer │
 └─────────────────────────────────────────────────────────────┘
```

---

## 3. Autonomous Tool-Calling Agent Workflow

When a link or claim is submitted, TrustCheck's **Autonomous Agent** ([`lib/agenticAnalyzer.ts`](file:///c:/Users/ridha/Desktop/Scraper/lib/agenticAnalyzer.ts)) initiates an iterative investigation loop with access to 6 specialized tool definitions ([`lib/tools/agentTools.ts`](file:///c:/Users/ridha/Desktop/Scraper/lib/tools/agentTools.ts)):

1. **`scrape_webpage`**: Fetches full HTML via Bright Data Web Unlocker for deep DOM inspection.
2. **`compare_market_prices`**: Queries major e-commerce platforms (Amazon, Flipkart, Croma, Nykaa) to compute actual retail price medians.
3. **`check_domain_reputation`**: Audits domain age, scam reports, Trustpilot ratings, and Reddit consumer discussions.
4. **`search_fact_checkers`**: Queries accredited databases (*Snopes, PolitiFact, FactCheck.org, Alt News, Boom Live*).
5. **`bright_data_serp_search`**: Leverages Bright Data SERP API (`serp_api1`) for real-time Google search indexing data.
6. **`search_web`**: Live multi-engine search across global indexing channels.

---

## 4. The Three Verification Modules

### 1. Marketplace Listing Detector (E-Commerce & Classifieds)
- **Collector Schema**: `c_trustcheck_listing_v1` & `c_trustcheck_seller_v1`
- **Verification Capabilities**:
  - **Extreme Bait Price Detection**: Automatically flags impossible pricing (e.g. ₹1 face wash or $10 smartphones) against market medians.
  - **Seller History Analysis**: Detects zero-feedback accounts, throwaway profiles, and duplicate listing spam.
  - **Urgency & Escrow Scam Detection**: Scans descriptions against curated fraud phrasing (`data/scam-phrases.json`).
  - **Metadata Completeness**: Evaluates high-resolution images, timestamps, and return policies.

### 2. Fake Offer / Deal Detector (Promos, Coupons & Flash Sales)
- **Collector Schema**: `c_trustcheck_offer_v1`
- **Verification Capabilities**:
  - **Brand & Domain Impersonation Defense**: Extracts genuine brand from title (e.g. *Apple*, *Nike*, *Samsung*, *Tata*) and cross-references official domains (`apple.com`, `nike.com`) and authorized enterprise retailers (`croma.com`, `tatacliq.com`, `amazon.in`). Detects brand spoofing (e.g. `tatacommercial.in`).
  - **Mathematical Discount Integrity**: Verifies calculated discount percentage matches $\frac{\text{MRP} - \text{Sale Price}}{\text{MRP}}$.
  - **Warranty & Terms Verification**: Penalizes missing manufacturer warranty or ambiguous refund policies.
  - **Artificial Urgency Traps**: Detects fake countdown timers and coercive checkout language (`data/offer-red-flags.json`).

### 3. Fake News / Claim Detector (Articles, Hoaxes & Viral Claims)
- **Collector Schema**: `c_trustcheck_news_v1` (URL scraping & direct claim parsing)
- **Verification Capabilities**:
  - **Tier-1 Wire Corroboration**: Cross-checks claims against recognized global/national news organizations (`data/reputable-domains.json`: Reuters, AP, BBC, The Hindu, NDTV, Indian Express, ISRO, NASA, etc.).
  - **Certified Fact-Check Debunking**: Queries Snopes, PolitiFact, FactCheck.org, Alt News, and Boom Live.
  - **Sensationalist & Hoax Pattern Recognition**: Detects uncorroborated viral conspiracies (*"miracle cure", "microchip in vaccine", "NASA alien secret"*).
  - **Absence-of-Proof Defense**: Prevents false positive scoring by treating uncorroborated viral claims with zero press coverage as High Risk.
  - **Ethical & Legal Framing**: News verdicts are framed strictly as objective corroboration signals from public indexing records.

---

## 5. Bright Data Scraper Studio & Self-Healing

TrustCheck includes deep integration with Bright Data's scraping ecosystem:

- **Web Unlocker (`cli_unlocker`)**: Transparently bypasses bot detection, CAPTCHAs, and JavaScript hydration.
- **SERP API (`serp_api1`)**: High-throughput Google and shopping search indexing.
- **Autonomous Self-Healing**: Automatically detects broken or deprecated CSS selectors and identifies replacements using DOM heuristics (`lib/brightdataClient.ts`).
- **Interactive Self-Healing Sandbox**: Test live selector healing and approve schema modifications directly in the frontend UI.
- Comprehensive technical documentation in [`docs/scraper-studio-usage.md`](./docs/scraper-studio-usage.md) and sample JSON fixtures in [`examples/`](./examples/).

---

## 6. Scoring Methodology & Auditable Math

TrustCheck enforces a **strictly auditable scoring methodology**:

$$\text{Trust Score} = \text{clamp}\left(70 + \sum_{i} \left(\text{Direction}_i \times \text{Strength}_i \times \text{Weight}_i \times 100\right), 0, 100\right)$$

- **Baseline**: Starts at a neutral score of **70**.
- **Weights**: Configured declaratively in [`config/scoring-weights.json`](file:///c:/Users/ridha/Desktop/Scraper/config/scoring-weights.json).
- **Verdict Bands**:
  - 🟢 **70 – 100**: Looks Genuine / Verified Trustworthy
  - 🟡 **40 – 69**: Some Concerns / Exercise Caution
  - 🔴 **0 – 39**: High Risk / Likely Fake or Scam

---

## 7. Tech Stack & Project Structure

```text
trustcheck/
├── app/
│   ├── api/
│   │   ├── check/route.ts       # Main verification API endpoint
│   │   ├── heal/route.ts        # Self-healing diagnosis & simulation API
│   │   └── history/route.ts     # SQLite audit log fetch API
│   ├── layout.tsx               # Root Next.js layout & typography
│   ├── page.tsx                 # Full interactive dashboard with tabs & drawer
│   └── globals.css              # Custom styling, glow gradients & animations
├── lib/
│   ├── types.ts                 # TypeScript types, signals, and tool schemas
│   ├── brightdataClient.ts      # Web Unlocker, SERP API, & Self-Heal engine
│   ├── moduleRouter.ts          # Module auto-detection & execution pipeline
│   ├── agenticAnalyzer.ts       # Gemini 3.6 Flash / Groq autonomous agent loop
│   ├── scoringEngine.ts         # Deterministic weighted signal scoring math
│   ├── explainer.ts             # Evidence summarizer
│   ├── tools/
│   │   ├── agentTools.ts        # Declarations & unified tool executor
│   │   └── webSearchTools.ts    # Multi-engine search & fact-checker clients
│   └── modules/
│       ├── listingDetector.ts   # E-commerce listing verification
│       ├── offerDetector.ts     # Promo & brand impersonation detector
│       └── newsDetector.ts      # News corroboration & fact-checking
├── components/
│   ├── ScoreGauge.tsx           # Animated neon trust score ring
│   ├── EvidenceList.tsx         # Risk Deductions & Trust Credits breakdown
│   ├── SelfHealModal.tsx        # Interactive Scraper Studio Self-Heal Studio
│   └── HistoryDrawer.tsx        # Persistent check audit log with filters
├── config/
│   ├── collectors.json          # Scraper Studio collector configurations
│   └── scoring-weights.json     # Declarative signal weights
├── data/
│   ├── reputable-domains.json   # Accredited global press allowlist
│   ├── scam-phrases.json        # Classifieds & payment fraud phrase catalog
│   └── offer-red-flags.json     # Artificial urgency & bait discount patterns
├── docs/
│   └── scraper-studio-usage.md  # Detailed Scraper Studio setup & self-healing guide
├── examples/                    # Sample JSON outputs for all 3 modules
└── tests/
    └── scoring.test.ts          # Vitest unit test suite (7/7 passing)
```

---

## 8. Getting Started & Local Setup

### Prerequisites
- **Node.js**: `v18.0.0` or higher
- **npm**: `v9.0.0` or higher

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/your-username/trustcheck.git
cd trustcheck
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the root directory (refer to `.env.example`):
```env
# Bright Data API Credentials
BRIGHTDATA_API_KEY="your-brightdata-api-key"

# AI Model Credentials (Gemini primary, Groq fallback)
GEMINI_API_KEY="your-gemini-api-key"
GROQ_API_KEY="your-groq-api-key"

# SQLite Database via Prisma
DATABASE_URL="file:./dev.db"
```

### 3. Initialize SQLite Database
```bash
npm run prisma:generate
npm run prisma:push
npm run seed
```

### 4. Run Development Server
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

### 5. Run Unit Tests
```bash
npm test
```

### 6. Production Docker & Render Deployment
TrustCheck is container-ready with a multi-stage Docker build and Render Blueprint:

- **Build & Run via Docker**:
  ```bash
  docker build -t trustcheck .
  docker run -p 3000:3000 -e BRIGHTDATA_API_KEY="your_key" -e GEMINI_API_KEY="your_key" trustcheck
  ```
- **Deploy to Render**:
  - Push repository to GitHub.
  - Create a **Web Service** on [Render](https://render.com/) pointing to your repository with runtime **Docker**.
  - Configure `BRIGHTDATA_API_KEY` and `GEMINI_API_KEY` in Render Environment Variables.
  - Detailed step-by-step instructions available in [`docs/render-deployment-guide.md`](./docs/render-deployment-guide.md).

---

## 9. API Reference

### `POST /api/check`
Analyzes any URL or claim text across Marketplace Listing, Offer/Deal, or News modules.

#### Request Body:
```json
{
  "input": "https://tatacommercial.in/product/apple-iphone-x-64gb-silver-fully-unlocked/",
  "forcedModule": "offer"
}
```

#### Response Body:
```json
{
  "id": "chk_1787495000000",
  "moduleType": "offer",
  "inputUrl": "https://tatacommercial.in/product/apple-iphone-x-64gb-silver-fully-unlocked/",
  "score": 16,
  "verdict": "High Risk",
  "explanation": "High Risk Alert: Domain Mismatch / Unverified Merchant. Offer for Apple is hosted on an unverified third-party domain (tatacommercial.in) instead of apple.com or an authorized enterprise retailer.",
  "signals": [
    {
      "name": "brand_mismatch",
      "direction": "negative",
      "strength": 1.0,
      "description": "Domain Mismatch / Unverified Merchant: Offer for Apple is hosted on tatacommercial.in instead of apple.com.",
      "category": "Brand Authenticity"
    },
    {
      "name": "math_inconsistency",
      "direction": "negative",
      "strength": 0.7,
      "description": "Unverified third-party single-price listing ($324) without manufacturer MRP breakdown.",
      "category": "Price Math"
    }
  ],
  "toolsUsed": [
    { "name": "check_domain_reputation", "durationMs": 2100 },
    { "name": "search_web", "durationMs": 850 }
  ],
  "researchSummary": {
    "sourcesConsulted": ["tatacommercial.in", "apple.com", "duckduckgo.com"],
    "whyGenuine": [],
    "whyFraud": [
      "Brand mismatch: Apple product sold on unverified domain tatacommercial.in",
      "Missing authorized reseller credentials or warranty"
    ]
  }
}
```

---

## 10. Hackathon Compliance Statements

### 🌐 Public Data Only Statement
TrustCheck strictly processes public, unauthenticated, non-paywalled web pages. No private user data, login-gated content, or terms-violating scraping actions are performed.

### 🤖 AI Assistant Disclosure
In compliance with the Scrape Verse hackathon rules, AI assistance (Antigravity IDE with Gemini 3.7 Flash) was used to accelerate TypeScript development, styling refinements, and test authoring. All scraping collectors, scoring algorithms, and security checks were designed and verified specifically for this project.

### ⚖️ Ethical & Legal Framing Statement
News and claim verdicts are strictly presented as objective corroboration signals derived from public news wire indexing records and certified fact-checkers, preventing harmful authoritative determinations on subjective topics.

---

## 🏆 Built with Pride for the Scrape Verse Hackathon by WeMakeDevs
