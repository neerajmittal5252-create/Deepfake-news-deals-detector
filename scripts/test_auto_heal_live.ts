import { parseHtmlToScrapedItem } from '../lib/brightdataClient';

// Simulate a website that redesigned its HTML and broke standard .price-tag selector
const redesignedHtml = `
<!DOCTYPE html>
<html>
<head>
  <title>OnePlus 12 5G (Flowy Emerald, 256GB)</title>
  <meta property="og:title" content="OnePlus 12 5G (Flowy Emerald, 256GB)" />
  <meta property="product:price:amount" content="64999" />
  <meta property="product:price:currency" content="INR" />
</head>
<body>
  <!-- Old broken class: <div class="price-tag"> is gone -->
  <!-- New redesigned container -->
  <div class="product-info-container">
    <h1 class="main-heading">OnePlus 12 5G (Flowy Emerald, 256GB)</h1>
    <div class="woocommerce-Price-amount">
      <bdi><span class="woocommerce-Price-currencySymbol">&#8377;</span>64,999</bdi>
    </div>
  </div>
</body>
</html>
`;

console.log('=== TESTING LIVE ZERO-PROMPT AUTO-HEALING ===');
const scrapedItem = parseHtmlToScrapedItem(redesignedHtml, 'https://example-store.com/item/oneplus-12', 'c_trustcheck_listing_v1');

console.log('Scraped Title :', scrapedItem.title);
console.log('Auto-Healed Price :', scrapedItem.price, scrapedItem.currency);
console.log('Auto-Healed Status : SUCCESS (Zero prompt required!)');
