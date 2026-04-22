'use strict';

const cron = require('node-cron');
const cache = require('./cache');
const { fetchWeather } = require('./fetchers/weather');
const { fetchNews } = require('./fetchers/news');
const { fetchDeals } = require('./fetchers/deals');

const INTERVAL_MS = parseInt(process.env.REFRESH_INTERVAL_MS || '3600000', 10);

async function refreshAll() {
  console.log('[scheduler] Starting refresh of all data sources...');

  await Promise.allSettled([
    refreshWeather(),
    refreshNews(),
    refreshDeals(),
  ]);

  console.log('[scheduler] Refresh complete.');
}

async function refreshWeather() {
  try {
    const data = await fetchWeather();
    cache.update('weather', data);
    console.log('[scheduler] Weather updated successfully.');
  } catch (err) {
    console.error(`[scheduler] Weather fetch failed: ${err.message}`);
    cache.update('weather', null, err.message);
  }
}

async function refreshNews() {
  try {
    const data = await fetchNews();
    cache.update('news', data);
    console.log('[scheduler] News updated successfully.');
  } catch (err) {
    console.error(`[scheduler] News fetch failed: ${err.message}`);
    cache.update('news', null, err.message);
  }
}

async function refreshDeals() {
  try {
    const data = await fetchDeals();
    cache.update('deals', data);
    console.log('[scheduler] Deals updated successfully.');
  } catch (err) {
    console.error(`[scheduler] Deals fetch failed: ${err.message}`);
    cache.update('deals', null, err.message);
  }
}

function startScheduler() {
  // Convert ms interval to a cron expression.
  // For intervals >= 1 hour, run at the top of each hour.
  // For shorter intervals (dev), run every minute.
  let cronExpr;
  if (INTERVAL_MS >= 3600000) {
    cronExpr = '0 * * * *'; // top of every hour
  } else if (INTERVAL_MS >= 60000) {
    cronExpr = '* * * * *'; // every minute (dev)
  } else {
    cronExpr = '* * * * *';
  }

  console.log(`[scheduler] Scheduling refresh with cron: "${cronExpr}" (REFRESH_INTERVAL_MS=${INTERVAL_MS})`);

  cron.schedule(cronExpr, () => {
    refreshAll().catch((err) => console.error('[scheduler] Unexpected error:', err));
  });

  // Run immediately on startup
  refreshAll().catch((err) => console.error('[scheduler] Initial refresh error:', err));
}

module.exports = { startScheduler, refreshAll };
