'use strict';

require('dotenv').config();

const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const path = require('path');

const cache = require('./src/cache');
const { startScheduler, refreshAll } = require('./src/scheduler');

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── Helper ──────────────────────────────────────────────────────────────────
function envelope(cacheEntry) {
  if (!cacheEntry) {
    return { ok: false, data: null, updatedAt: null, error: 'Not yet loaded' };
  }
  return {
    ok: !cacheEntry.error || !!cacheEntry.data,
    data: cacheEntry.data,
    updatedAt: cacheEntry.updatedAt,
    error: cacheEntry.error || null,
  };
}

// ─── Routes ──────────────────────────────────────────────────────────────────

/** Health check */
app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    cache: Object.fromEntries(
      Object.entries(cache.all()).map(([k, v]) => [
        k,
        { updatedAt: v.updatedAt, hasData: !!v.data, hasError: !!v.error },
      ])
    ),
  });
});

/** Weather */
app.get('/api/weather', (_req, res) => {
  const entry = cache.get('weather');
  if (!entry) {
    return res.status(503).json({ ok: false, data: null, updatedAt: null, error: 'Weather data not yet available' });
  }
  res.json(envelope(entry));
});

/** News */
app.get('/api/news', (_req, res) => {
  const entry = cache.get('news');
  if (!entry) {
    return res.status(503).json({ ok: false, data: null, updatedAt: null, error: 'News data not yet available' });
  }
  res.json(envelope(entry));
});

/** Deals */
app.get('/api/deals', (_req, res) => {
  const entry = cache.get('deals');
  if (!entry) {
    return res.status(503).json({ ok: false, data: null, updatedAt: null, error: 'Deals data not yet available' });
  }
  res.json(envelope(entry));
});

/** Manual refresh */
app.post('/api/refresh', async (_req, res) => {
  try {
    // Kick off async; don't wait for completion — return 202 immediately
    refreshAll().catch((err) => console.error('[api] Refresh error:', err));
    res.status(202).json({ ok: true, message: 'Refresh started' });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/** Fallback to index.html for SPA */
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[server] HK Dashboard listening on http://localhost:${PORT}`);
  startScheduler();
});

module.exports = app;
