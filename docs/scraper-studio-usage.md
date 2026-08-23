# Bright Data Scraper Studio — Architecture & Collector Usage

> **Hackathon Submission Requirement**: Scrape Verse by WeMakeDevs  
> **Core Compliance**: Uses **Bright Data Scraper Studio** custom collectors (not pre-built scrapers) via `@brightdata/cli` and `bdata search` SERP API. All data collected is strictly public (no login-gated or paywalled content).

---

## 1. Custom Scraper Studio Collectors Overview

TrustCheck utilizes **4 custom collectors** built in Bright Data Scraper Studio to extract structured intelligence across the 3 verification modules:

| Module | Collector Name | Collector ID | Creation Command Prompt | Extracted Schema Fields |
| :--- | :--- | :--- | :--- | :--- |
| **Module 1 (Listing)** | Listing Collector | `c_trustcheck_listing_v1` | `bdata scraper create <url> "Extract title, price, currency, description, seller_name, seller_profile_url, location, posted_date, image_urls, listing_id"` | `title`, `price`, `currency`, `description`, `seller_name`, `seller_profile_url`, `location`, `posted_date`, `image_urls`, `listing_id` |
| **Module 1 (Listing)** | Seller History Collector | `c_trustcheck_seller_v1` | `bdata scraper create <url> "Extract this seller's other active listing titles, prices, and posted dates"` | `seller_name`, `other_listings` (`title`, `price`, `posted_date`), `total_listings` |
| **Module 2 (Offer)** | Offer / Deal Collector | `c_trustcheck_offer_v1` | `bdata scraper create <url> "Extract offer title, discount_percentage, original_price, discounted_price, terms_and_conditions, expiry_date, brand_name, page_url"` | `offer_title`, `brand_name`, `original_price`, `discounted_price`, `discount_percentage`, `terms_and_conditions`, `expiry_date`, `page_url` |
| **Module 3 (News)** | Article Collector | `c_trustcheck_news_v1` | `bdata scraper create <url> "Extract headline, article_body, author_name, publish_date, source_domain, article_url"` | `headline`, `article_body`, `author_name`, `publish_date`, `source_domain`, `article_url` |

---

## 2. Shared Node.js Wrapper & CLI Integration

All scraping runs go through `lib/brightdataClient.ts`, orchestrating `@brightdata/cli` executions:

### Running a Collector
```bash
bdata scraper run c_trustcheck_listing_v1 --urls "https://marketplace-example.com/item/123" --json
```

### Performing Cross-Check Search (SERP)
```bash
bdata search "Apple iPhone 15 Pro Max price" --type shopping --json
bdata search "Nike official site" --json
bdata search "Claim text site:politifact.com" --json
```

---

## 3. Documented Self-Healing Cycle (`bdata scraper heal` $\rightarrow$ `approve`)

When target websites undergo markup redesigns or CSS selector changes, Scraper Studio allows prompt-guided self-healing without manual regex or selector rewriting.

### Step 1: Diagnose Issue & Trigger Heal
When the marketplace updated its price markup from `.price-tag-old` to `span[data-autoid="price-primary"]`, the collector extraction returned `null` for `price`.

**CLI Command Executed:**
```bash
bdata scraper heal c_trustcheck_listing_v1 "The price field is returning null after the site redesign. The price is now shown inside span[data-autoid='price-primary']." --json
```

### Step 2: Review Generated `awaiting_approval` Diff Envelope
Scraper Studio generated an AST schema diff for human verification:

```json
{
  "collectorId": "c_trustcheck_listing_v1",
  "status": "awaiting_approval",
  "diff": {
    "field": "price",
    "oldSelector": ".price-tag-old",
    "newSelector": "span[data-autoid=\"price-primary\"]",
    "sampleExtractedValue": "$320.00"
  },
  "promptUsed": "The price field is returning null after the site redesign. The price is now shown inside span[data-autoid='price-primary'].",
  "updatedAt": "2026-08-20T17:15:30.000Z"
}
```

### Step 3: Approve & Deploy Live
Once verified, the fix was committed and deployed:

**CLI Command Executed:**
```bash
bdata scraper approve c_trustcheck_listing_v1 --json
```

**Output:**
```json
{
  "collectorId": "c_trustcheck_listing_v1",
  "status": "approved",
  "deployedVersion": "v1.1.0",
  "message": "Schema diff approved and deployed to production crawler.",
  "timestamp": "2026-08-20T17:16:02.000Z"
}
```

---

## 4. Audit Log Verification
Every Scraper Studio execution, healing attempt, and SERP lookup is recorded locally in `logs/scraper-usage.log`:

```text
[2026-08-20T17:10:00.000Z] [ACTION: RUN] [TARGET: c_trustcheck_listing_v1] [STATUS: SUCCESS] URLs: 1 items scraped successfully.
[2026-08-20T17:10:02.000Z] [ACTION: SEARCH] [TARGET: Apple iPhone 15 Pro Max] [STATUS: SUCCESS] Results found: 5
[2026-08-20T17:15:30.000Z] [ACTION: HEAL] [TARGET: c_trustcheck_listing_v1] [STATUS: SUCCESS] Prompt: "The price field is returning null..." -> Awaiting Approval
[2026-08-20T17:16:02.000Z] [ACTION: APPROVE] [TARGET: c_trustcheck_listing_v1] [STATUS: SUCCESS] Collector c_trustcheck_listing_v1 heal changes approved and deployed live.
```
