'use strict';

const axios = require('axios');
const xml2js = require('xml2js');

const TIMEOUT = parseInt(process.env.REQUEST_TIMEOUT_MS || '10000', 10);

const parser = new xml2js.Parser({ explicitArray: false, mergeAttrs: true });

async function parseXml(xmlString) {
  return parser.parseStringPromise(xmlString);
}

async function fetchRss(url, label, category = 'general') {
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
    const channel = parsed?.rss?.channel || parsed?.feed;
    if (!channel) return [];

    const items = channel.item || channel.entry || [];
    const list = Array.isArray(items) ? items : [items];

    return list.slice(0, 10).map((item) => ({
      title: (item.title?._ || item.title || '').trim(),
      link: item.link?.href || item.link || item.guid?._ || item.guid || '',
      published:
        item.pubDate || item.published || item.updated || item['dc:date'] || null,
      description: stripHtml(
        item.description?._ || item.description || item.summary?._ || item.summary || ''
      ).slice(0, 300),
      source: label,
      category,
    }));
  } catch (err) {
    console.error(`[news] Failed to fetch ${label} (${url}): ${err.message}`);
    return [];
  }
}

function stripHtml(str) {
  return String(str)
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Sources — all public RSS feeds */
const SOURCES = [
  // General HK news
  {
    url: 'https://rthk9.rthk.hk/rthk/news/rss/e_expressnews_all.xml',
    label: 'RTHK',
    category: 'general',
  },
  // Business & finance
  {
    url: 'https://rthk9.rthk.hk/rthk/news/rss/e_expressnews_businessandfinance.xml',
    label: 'RTHK Business',
    category: 'finance',
  },
  // HK01 — attempts their public RSS
  {
    url: 'https://feeds.feedburner.com/hk01news',
    label: 'HK01',
    category: 'general',
  },
  // Now News — public RSS (limited, may require fallback)
  {
    url: 'https://news.now.com/rss/english.xml',
    label: 'Now News',
    category: 'general',
  },
  // i-Cable News RSS (may not be public — handled gracefully)
  {
    url: 'https://www.i-cable.com/feed',
    label: 'i-Cable News',
    category: 'general',
  },
  // Real-estate / property: RTHK property section
  {
    url: 'https://rthk9.rthk.hk/rthk/news/rss/e_expressnews_all.xml',
    label: 'RTHK Property',
    category: 'real-estate',
  },
];

async function fetchNews() {
  const results = await Promise.all(
    SOURCES.map((s) => fetchRss(s.url, s.label, s.category))
  );

  // Flatten, deduplicate by link, sort by date descending
  const seen = new Set();
  const allItems = [];
  for (const batch of results) {
    for (const item of batch) {
      const key = item.link || item.title;
      if (key && !seen.has(key)) {
        seen.add(key);
        allItems.push(item);
      }
    }
  }

  allItems.sort((a, b) => {
    const da = a.published ? new Date(a.published).getTime() : 0;
    const db = b.published ? new Date(b.published).getTime() : 0;
    return db - da;
  });

  const general = allItems.filter((i) => i.category === 'general').slice(0, 15);
  const finance = allItems.filter((i) => i.category === 'finance').slice(0, 10);
  // Heuristic: treat items mentioning property/real estate keywords as real-estate
  const reKeywords = /property|real.?estate|housing|home price|flat|apartment|mortgage/i;
  const realEstate = allItems
    .filter((i) => reKeywords.test(i.title + ' ' + i.description))
    .slice(0, 10);

  return {
    general,
    finance,
    realEstate,
    sources: [
      { name: 'RTHK', url: 'https://www.rthk.hk' },
      { name: 'HK01', url: 'https://www.hk01.com' },
      { name: 'Now News', url: 'https://news.now.com' },
      { name: 'i-Cable News', url: 'https://www.i-cable.com' },
    ],
  };
}

module.exports = { fetchNews };
