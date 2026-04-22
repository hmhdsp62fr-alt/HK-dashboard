# 🇭🇰 Hong Kong Dashboard

A full-stack **Node.js + Express** web application that aggregates real-time Hong Kong data across three sections: Weather, News, and Gadget Deals. All data is cached server-side and refreshed hourly automatically.

---

## Features

| Section | Sources |
|---|---|
| 🌤️ **HK Weather** | [Hong Kong Observatory (HKO) Open API](https://data.weather.gov.hk/weatherAPI/opendata/weather.php) |
| 📰 **HK Latest News** | [RTHK](https://rthk.hk) · [HK01](https://www.hk01.com) · [Now News](https://news.now.com) · [i-Cable News](https://www.i-cable.com) |
| 🛍️ **Best Gadget Deals** | [Slickdeals](https://slickdeals.net) · [Techlicious](https://www.techlicious.com) · [Tom's Guide](https://www.tomsguide.com) · [PCMag](https://www.pcmag.com) · [DCFever](https://www.dcfever.com) · [Price.com.hk](https://www.price.com.hk) · [Amazon](https://www.amazon.com) |

- News tab splits into **Top Stories**, **Finance**, and **Real Estate**
- Deals tab splits into **International** and **HK Local**
- Server-side **hourly scheduled refresh** (cron)
- **Manual refresh** button (POST `/api/refresh`)
- Previous cached data is **preserved on source failure**
- Per-source failure logging with request timeouts

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/health` | Server health, uptime, cache status |
| `GET` | `/api/weather` | Current conditions, 9-day forecast, warnings |
| `GET` | `/api/news` | General, finance, and real estate news |
| `GET` | `/api/deals` | International + HK local gadget deals |
| `POST` | `/api/refresh` | Trigger manual data refresh (returns 202 immediately) |

All endpoints return JSON envelopes:
```json
{ "ok": true, "data": { ... }, "updatedAt": "2024-01-01T00:00:00.000Z", "error": null }
```

---

## Data Sources

### Weather
- **Current conditions**: `https://data.weather.gov.hk/weatherAPI/opendata/weather.php?dataType=rhrread&lang=en`
- **9-day forecast**: `https://data.weather.gov.hk/weatherAPI/opendata/weather.php?dataType=fnd&lang=en`
- **Warnings**: `https://data.weather.gov.hk/weatherAPI/opendata/weather.php?dataType=warnsum&lang=en`

### News (RSS)
- RTHK all news: `https://rthk9.rthk.hk/rthk/news/rss/e_expressnews_all.xml`
- RTHK business: `https://rthk9.rthk.hk/rthk/news/rss/e_expressnews_businessandfinance.xml`
- HK01, Now News, i-Cable: attempted via public RSS; graceful fallback if unavailable

### Deals (RSS)
- Slickdeals electronics + gadgets RSS
- Techlicious, Tom's Guide, PCMag deal feeds
- DCFever and Price.com.hk as HK local reference links

---

## Setup & Run

### Prerequisites
- **Node.js >= 18**
- **npm**

### Install

```bash
git clone https://github.com/hmhdsp62fr-alt/HK-dashboard.git
cd HK-dashboard
npm install
```

### Configure (optional)

```bash
cp .env.example .env
# Edit .env to override defaults:
# PORT=3000
# REFRESH_INTERVAL_MS=3600000   # 1 hour
# REQUEST_TIMEOUT_MS=10000       # 10 seconds per request
```

### Start

```bash
npm start
```

Open your browser at **http://localhost:3000**

### Development (auto-restart on file changes — Node 18+)

```bash
npm run dev
```

---

## Project Structure

```
HK-dashboard/
├── server.js              # Express app entry point
├── src/
│   ├── cache.js           # In-memory cache with timestamps
│   ├── scheduler.js       # Hourly cron scheduler
│   └── fetchers/
│       ├── weather.js     # HKO API fetcher
│       ├── news.js        # Multi-source RSS news fetcher
│       └── deals.js       # Deal aggregator RSS fetcher
├── public/
│   ├── index.html         # Single-page frontend
│   ├── styles.css         # Responsive dark-theme styles
│   └── app.js             # Frontend JS (fetch + render)
├── .env.example           # Environment variable template
└── package.json
```

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | HTTP port the server listens on |
| `REFRESH_INTERVAL_MS` | `3600000` | Server-side refresh interval (ms) |
| `REQUEST_TIMEOUT_MS` | `10000` | Per-request HTTP timeout (ms) |

---

## License

MIT
