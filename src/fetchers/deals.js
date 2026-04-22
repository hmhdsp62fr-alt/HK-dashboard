'use strict';

const axios = require('axios');
const xml2js = require('xml2js');

const TIMEOUT = parseInt(process.env.REQUEST_TIMEOUT_MS || '10000', 10);
const parser = new xml2js.Parser({ explicitArray: false, mergeAttrs: true });

async function parseXml(xmlString) {
  return parser.parseStringPromise(xmlString);
}

function stripHtml(str) {
  return String(str)
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchRssFeed(url, label) {
  try {
    const res = await axios.get(url, {
      timeout: TIMEOUT,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; HK-Dashboard/1.0; +https://github.com/hmhdsp62fr-alt/HK-dashboard)',
        Accept: 'application/rss+xml, application/xml, text/xml, */*',
      },
      responseType: 'text',
    });

    const parsed = await parseXml(res.data);
    const channel = parsed?.rss?.channel;
    if (!channel) return [];

    const items = channel.item || [];
    const list = Array.isArray(items) ? items : [items];

    return list.slice(0, 12).map((item) => {
      // Extract price if present in title/description
      const text = `${item.title || ''} ${item.description || ''}`;
      const priceMatch = text.match(/HK\$[\d,]+|USD?\s*\$?[\d,]+|\$[\d,]+/i);

      return {
        title: (item.title?._ || item.title || '').trim(),
        link: item.link || item.guid?._ || item.guid || '',
        description: stripHtml(
          item.description?._ || item.description || ''
        ).slice(0, 300),
        price: priceMatch ? priceMatch[0] : null,
        published: item.pubDate || null,
        source: label,
        imageUrl: extractImage(item),
      };
    });
  } catch (err) {
    console.error(`[deals] Failed to fetch ${label} (${url}): ${err.message}`);
    return [];
  }
}

function extractImage(item) {
  // Try enclosure first
  if (item.enclosure && item.enclosure.url) return item.enclosure.url;
  // Try media:content
  if (item['media:content'] && item['media:content'].url) return item['media:content'].url;
  // Try extracting from description HTML
  const desc = item.description?._ || item.description || '';
  const imgMatch = String(desc).match(/<img[^>]+src=["']([^"']+)["']/i);
  return imgMatch ? imgMatch[1] : null;
}

/** Deal RSS sources */
const SOURCES = [
  // Slickdeals — tech & electronics
  {
    url: 'https://slickdeals.net/newsearch.php?mode=frontpage&searcharea=deals&q=electronics&r=1&rss=1',
    label: 'Slickdeals Electronics',
  },
  // Slickdeals gadgets
  {
    url: 'https://slickdeals.net/newsearch.php?mode=frontpage&searcharea=deals&q=gadget&r=1&rss=1',
    label: 'Slickdeals Gadgets',
  },
  // Techlicious deals RSS
  {
    url: 'https://www.techlicious.com/feed/',
    label: 'Techlicious',
  },
  // Tom's Guide deals
  {
    url: 'https://www.tomsguide.com/feeds/all',
    label: "Tom's Guide",
  },
  // PCMag deals
  {
    url: 'https://www.pcmag.com/rss/latest-deals',
    label: 'PCMag Deals',
  },
];

/** Static exemplar HK local deals (DCFever / Price.com.hk cannot be reliably scraped via RSS) */
const HK_LOCAL_PLACEHOLDER = [
  {
    title: 'Check DCFever for latest HK local gadget deals',
    link: 'https://www.dcfever.com/trading/listing.php',
    description:
      'DCFever is a popular HK platform for gadget deals, second-hand electronics, and group buys.',
    price: null,
    published: null,
    source: 'DCFever (HK)',
    imageUrl: null,
  },
  {
    title: 'Price.com.hk — Compare Hong Kong gadget prices',
    link: 'https://www.price.com.hk',
    description:
      'Price.com.hk aggregates prices from HK retailers including Fortress, Broadway, and online shops.',
    price: null,
    published: null,
    source: 'Price.com.hk (HK)',
    imageUrl: null,
  },
  {
    title: 'Hong Kong Amazon — Best Sellers in Electronics',
    link: 'https://www.amazon.com/Best-Sellers-Electronics/zgbs/electronics',
    description:
      "Amazon's best-seller electronics list updated hourly. Ships internationally to Hong Kong.",
    price: null,
    published: null,
    source: 'Amazon',
    imageUrl: null,
  },
];

async function fetchDeals() {
  const results = await Promise.all(
    SOURCES.map((s) => fetchRssFeed(s.url, s.label))
  );

  const seen = new Set();
  const allDeals = [];

  for (const batch of results) {
    for (const item of batch) {
      const key = item.link || item.title;
      if (key && !seen.has(key)) {
        seen.add(key);
        allDeals.push(item);
      }
    }
  }

  allDeals.sort((a, b) => {
    const da = a.published ? new Date(a.published).getTime() : 0;
    const db = b.published ? new Date(b.published).getTime() : 0;
    return db - da;
  });

  return {
    international: allDeals.slice(0, 20),
    hkLocal: HK_LOCAL_PLACEHOLDER,
    sources: [
      { name: 'Slickdeals', url: 'https://slickdeals.net' },
      { name: 'Techlicious', url: 'https://www.techlicious.com' },
      { name: "Tom's Guide", url: 'https://www.tomsguide.com' },
      { name: 'PCMag', url: 'https://www.pcmag.com' },
      { name: 'DCFever', url: 'https://www.dcfever.com' },
      { name: 'Price.com.hk', url: 'https://www.price.com.hk' },
      { name: 'Amazon', url: 'https://www.amazon.com' },
    ],
  };
}

module.exports = { fetchDeals };
