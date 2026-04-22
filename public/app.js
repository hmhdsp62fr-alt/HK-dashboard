'use strict';

/* ── Utilities ────────────────────────────────────────────────────────────── */

function show(el) { el.hidden = false; }
function hide(el) { el.hidden = true; }

function fmt(isoDate) {
  if (!isoDate) return '';
  try {
    return new Date(isoDate).toLocaleString('en-HK', {
      timeZone: 'Asia/Hong_Kong',
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return isoDate; }
}

function fmtRelative(isoDate) {
  if (!isoDate) return '';
  const diff = Date.now() - new Date(isoDate).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function setUpdatedAt(id, isoDate) {
  const el = document.getElementById(id);
  if (el && isoDate) el.textContent = `Updated ${fmt(isoDate)} (HKT)`;
}

/* ── Fetch wrapper ────────────────────────────────────────────────────────── */

async function apiFetch(path) {
  const res = await fetch(path);
  if (!res.ok && res.status !== 503) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/* ── Weather ──────────────────────────────────────────────────────────────── */

async function loadWeather() {
  const loading = document.getElementById('weather-loading');
  const error   = document.getElementById('weather-error');
  const content = document.getElementById('weather-content');

  show(loading); hide(error); hide(content);

  try {
    const resp = await apiFetch('/api/weather');
    hide(loading);

    if (!resp.data) {
      error.textContent = resp.error || 'Weather data unavailable.';
      show(error); return;
    }

    setUpdatedAt('weather-updated', resp.updatedAt);
    renderWeather(resp.data);
    show(content);

    if (resp.error) {
      error.textContent = `⚠️ Some sources failed: ${resp.error}`;
      show(error);
    }
  } catch (err) {
    hide(loading);
    error.textContent = `Failed to load weather: ${err.message}`;
    show(error);
  }
}

function renderWeather(data) {
  document.getElementById('w-temp').textContent = data.current.temperature;
  document.getElementById('w-humidity').textContent = data.current.humidity;
  document.getElementById('w-rainfall').textContent = data.current.rainfall;
  document.getElementById('w-description').textContent = data.current.description;

  // Warnings
  const warnEl = document.getElementById('w-warnings');
  warnEl.innerHTML = '';
  if (data.warnings && data.warnings.length > 0) {
    data.warnings.forEach((w) => {
      const badge = document.createElement('span');
      badge.className = 'warning-badge';
      badge.textContent = `⚠️ ${w.name}`;
      warnEl.appendChild(badge);
    });
  }

  // Forecast
  const strip = document.getElementById('w-forecast');
  strip.innerHTML = '';
  (data.forecast || []).forEach((day) => {
    const div = document.createElement('div');
    div.className = 'forecast-day';
    div.innerHTML = `
      <div class="f-week">${day.week || ''}</div>
      <div class="f-date">${day.date || ''}</div>
      <div class="f-icon">${(day.icon || '').split(' ')[0]}</div>
      <div class="f-temps">${day.minTemp} – ${day.maxTemp}</div>
      <div class="f-desc">${day.description || ''}</div>
    `;
    strip.appendChild(div);
  });
}

/* ── News ─────────────────────────────────────────────────────────────────── */

async function loadNews() {
  const loading = document.getElementById('news-loading');
  const error   = document.getElementById('news-error');
  const content = document.getElementById('news-content');

  show(loading); hide(error); hide(content);

  try {
    const resp = await apiFetch('/api/news');
    hide(loading);

    if (!resp.data) {
      error.textContent = resp.error || 'News data unavailable.';
      show(error); return;
    }

    setUpdatedAt('news-updated', resp.updatedAt);
    renderNews(resp.data);
    show(content);

    if (resp.error) {
      error.textContent = `⚠️ Some sources failed: ${resp.error}`;
      show(error);
    }
  } catch (err) {
    hide(loading);
    error.textContent = `Failed to load news: ${err.message}`;
    show(error);
  }
}

function renderNewsList(listId, items) {
  const ul = document.getElementById(listId);
  ul.innerHTML = '';
  if (!items || items.length === 0) {
    ul.innerHTML = '<li class="empty-notice">No items available at this time.</li>';
    return;
  }
  items.forEach((item) => {
    const li = document.createElement('li');
    li.className = 'news-item';

    const link = item.link
      ? `<a href="${escapeAttr(item.link)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.title || 'Untitled')}</a>`
      : `<span>${escapeHtml(item.title || 'Untitled')}</span>`;

    const desc = item.description
      ? `<div class="news-desc">${escapeHtml(item.description)}</div>`
      : '';

    li.innerHTML = `
      ${link}
      <div class="news-meta">
        <span class="source-tag">${escapeHtml(item.source || '')}</span>
        ${item.published ? `<span class="news-time">${fmtRelative(item.published)}</span>` : ''}
      </div>
      ${desc}
    `;
    ul.appendChild(li);
  });
}

function renderNews(data) {
  renderNewsList('news-general', data.general);
  renderNewsList('news-finance', data.finance);
  renderNewsList('news-realestate', data.realEstate);

  const sourcesLine = document.getElementById('news-sources-line');
  if (sourcesLine && data.sources) {
    sourcesLine.innerHTML = 'Sources: ' + data.sources.map(
      (s) => `<a href="${escapeAttr(s.url)}" target="_blank" rel="noopener">${escapeHtml(s.name)}</a>`
    ).join(' · ');
  }
}

/* ── Deals ────────────────────────────────────────────────────────────────── */

async function loadDeals() {
  const loading = document.getElementById('deals-loading');
  const error   = document.getElementById('deals-error');
  const content = document.getElementById('deals-content');

  show(loading); hide(error); hide(content);

  try {
    const resp = await apiFetch('/api/deals');
    hide(loading);

    if (!resp.data) {
      error.textContent = resp.error || 'Deals data unavailable.';
      show(error); return;
    }

    setUpdatedAt('deals-updated', resp.updatedAt);
    renderDeals(resp.data);
    show(content);

    if (resp.error) {
      error.textContent = `⚠️ Some sources failed: ${resp.error}`;
      show(error);
    }
  } catch (err) {
    hide(loading);
    error.textContent = `Failed to load deals: ${err.message}`;
    show(error);
  }
}

function renderDealsList(containerId, items) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  if (!items || items.length === 0) {
    container.innerHTML = '<p class="empty-notice">No deals available right now.</p>';
    return;
  }
  items.forEach((item) => {
    const card = document.createElement('div');
    card.className = 'deal-card';

    const title = item.link
      ? `<a href="${escapeAttr(item.link)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.title || 'Deal')}</a>`
      : `<span>${escapeHtml(item.title || 'Deal')}</span>`;

    const price = item.price
      ? `<span class="deal-price">${escapeHtml(item.price)}</span>`
      : '';

    const desc = item.description
      ? `<div class="deal-desc">${escapeHtml(item.description)}</div>`
      : '';

    card.innerHTML = `
      ${title}
      <div class="deal-meta">
        <span class="source-tag">${escapeHtml(item.source || '')}</span>
        ${price}
        ${item.published ? `<span class="news-time">${fmtRelative(item.published)}</span>` : ''}
      </div>
      ${desc}
    `;
    container.appendChild(card);
  });
}

function renderDeals(data) {
  renderDealsList('deals-international', data.international);
  renderDealsList('deals-hklocal', data.hkLocal);

  const sourcesLine = document.getElementById('deals-sources-line');
  if (sourcesLine && data.sources) {
    sourcesLine.innerHTML = 'Sources: ' + data.sources.map(
      (s) => `<a href="${escapeAttr(s.url)}" target="_blank" rel="noopener">${escapeHtml(s.name)}</a>`
    ).join(' · ');
  }
}

/* ── Tab Switching ────────────────────────────────────────────────────────── */

function initTabs(sectionId) {
  const section = document.getElementById(sectionId);
  if (!section) return;

  section.querySelectorAll('.tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.tab;
      section.querySelectorAll('.tab').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      section.querySelectorAll('.tab-panel').forEach((p) => {
        p.classList.toggle('active', p.id === `tab-${target}`);
      });
    });
  });
}

/* ── Refresh Button ───────────────────────────────────────────────────────── */

async function triggerRefresh() {
  const btn = document.getElementById('btn-refresh');
  const status = document.getElementById('global-status');

  btn.disabled = true;
  btn.textContent = '⟳ Refreshing…';
  status.className = 'status-badge loading';
  status.textContent = 'Refreshing…';

  try {
    await fetch('/api/refresh', { method: 'POST' });
    // Wait a couple of seconds then reload data
    await delay(2500);
    await Promise.all([loadWeather(), loadNews(), loadDeals()]);
    status.className = 'status-badge ok';
    status.textContent = 'Updated';
  } catch {
    status.className = 'status-badge error';
    status.textContent = 'Error';
  } finally {
    btn.disabled = false;
    btn.textContent = '⟳ Refresh';
  }
}

function delay(ms) { return new Promise((r) => setTimeout(r, ms)); }

/* ── Escape helpers ───────────────────────────────────────────────────────── */

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeAttr(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/* ── Auto-refresh (hourly) ────────────────────────────────────────────────── */

function scheduleAutoRefresh() {
  // Reload data from backend every hour (backend also refreshes internally)
  const HOUR_MS = 60 * 60 * 1000;
  setTimeout(async function tick() {
    await Promise.allSettled([loadWeather(), loadNews(), loadDeals()]);
    setTimeout(tick, HOUR_MS);
  }, HOUR_MS);
}

/* ── Init ─────────────────────────────────────────────────────────────────── */

async function init() {
  initTabs('section-news');
  initTabs('section-deals');

  document.getElementById('btn-refresh').addEventListener('click', triggerRefresh);

  const status = document.getElementById('global-status');

  // Load all sections in parallel
  await Promise.allSettled([loadWeather(), loadNews(), loadDeals()]);

  status.className = 'status-badge ok';
  status.textContent = 'Live';

  scheduleAutoRefresh();
}

document.addEventListener('DOMContentLoaded', init);
