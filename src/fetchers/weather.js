'use strict';

const axios = require('axios');

const HKO_BASE = 'https://data.weather.gov.hk/weatherAPI/opendata/weather.php';
const TIMEOUT = parseInt(process.env.REQUEST_TIMEOUT_MS || '10000', 10);

async function fetchHKO(dataType) {
  const res = await axios.get(HKO_BASE, {
    params: { dataType, lang: 'en' },
    timeout: TIMEOUT,
  });
  return res.data;
}

/**
 * Map HKO icon code to a human-readable label and emoji.
 * Reference: https://www.hko.gov.hk/textonly/v2/explain/wxicon_e.htm
 */
function iconLabel(code) {
  const map = {
    50: '☀️ Sunny',
    51: '🌤️ Sunny Periods',
    52: '⛅ A Few Showers',
    53: '🌦️ Sunny Periods with a Few Showers',
    54: '⛈️ Cloudy with Thunderstorms',
    60: '☁️ Cloudy',
    61: '🌧️ Overcast with Light Rain',
    62: '🌧️ Light Rain',
    63: '🌧️ Rain',
    64: '🌧️ Heavy Rain',
    65: '⛈️ Thunderstorm',
    70: '🌫️ Fine',
    71: '☀️ Fine',
    72: '🌤️ Fine',
    73: '⛅ Fine',
    74: '🌦️ Fine',
    75: '☁️ Fine',
    76: '🌫️ Mist',
    77: '🌁 Fog',
    80: '☀️ Mainly Sunny',
    81: '⛅ Partly Cloudy',
    82: '☁️ Mainly Cloudy',
    83: '🌦️ Cloudy with Showers',
    84: '🌦️ Sunny Periods & Showers',
    85: '⛈️ Thundery Showers',
    90: '🌡️ Hot',
    91: '🌡️ Warm',
    92: '🌡️ Cool',
    93: '❄️ Cold',
  };
  return map[code] || `Condition ${code}`;
}

async function fetchWeather() {
  const [current, forecast, warnings] = await Promise.allSettled([
    fetchHKO('rhrread'),
    fetchHKO('fnd'),
    fetchHKO('warnsum'),
  ]);

  const currentData = current.status === 'fulfilled' ? current.value : null;
  const forecastData = forecast.status === 'fulfilled' ? forecast.value : null;
  const warningsData = warnings.status === 'fulfilled' ? warnings.value : null;

  if (!currentData && !forecastData) {
    throw new Error('All HKO API calls failed');
  }

  // --- Current conditions ---
  const tempEntry = currentData?.temperature?.data?.find(
    (d) => d.place === 'Hong Kong Observatory'
  ) || currentData?.temperature?.data?.[0];

  const humEntry = currentData?.humidity?.data?.find(
    (d) => d.place === 'Hong Kong Observatory'
  ) || currentData?.humidity?.data?.[0];

  const rainfall = currentData?.rainfall?.data?.[0] || null;

  const iconCode = currentData?.icon?.[0];

  const current_ = {
    temperature: tempEntry ? `${tempEntry.value}°${tempEntry.unit}` : 'N/A',
    humidity: humEntry ? `${humEntry.value}%` : 'N/A',
    description: iconCode ? iconLabel(iconCode) : (currentData?.generalSituation || 'N/A'),
    generalSituation: currentData?.generalSituation || '',
    rainfall: rainfall ? `${rainfall.max} mm` : '0 mm',
    updateTime: currentData?.updateTime || null,
  };

  // --- Warnings ---
  const activeWarnings = [];
  if (warningsData) {
    for (const [key, val] of Object.entries(warningsData)) {
      if (val && typeof val === 'object' && val.name) {
        activeWarnings.push({ code: key, name: val.name, actionCode: val.actionCode });
      }
    }
  }

  // --- 9-day forecast ---
  const forecastDays = (forecastData?.weatherForecast || []).map((d) => ({
    date: d.forecastDate,
    week: d.week,
    description: d.forecastWeather,
    maxTemp: d.forecastMaxtemp ? `${d.forecastMaxtemp.value}°${d.forecastMaxtemp.unit}` : 'N/A',
    minTemp: d.forecastMintemp ? `${d.forecastMintemp.value}°${d.forecastMintemp.unit}` : 'N/A',
    maxHumidity: d.forecastMaxrh ? `${d.forecastMaxrh.value}%` : 'N/A',
    minHumidity: d.forecastMinrh ? `${d.forecastMinrh.value}%` : 'N/A',
    icon: d.ForecastIcon ? iconLabel(d.ForecastIcon) : '',
  }));

  return {
    current: current_,
    warnings: activeWarnings,
    forecast: forecastDays.slice(0, 9),
    source: 'Hong Kong Observatory (data.weather.gov.hk)',
    sourceUrl: 'https://www.hko.gov.hk',
  };
}

module.exports = { fetchWeather };
