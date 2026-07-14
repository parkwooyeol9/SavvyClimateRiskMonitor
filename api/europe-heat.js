/**
 * GET /api/europe-heat
 * Live European heat monitoring (Open-Meteo, no API key) + curated excess-mortality snapshot
 * from EuroMOMO / peer-reviewed estimates (sourced, not a live death counter).
 */

const CITIES = [
  { id: "paris", name: "Paris", country: "FR", lat: 48.8566, lon: 2.3522, tz: "Europe/Paris" },
  { id: "madrid", name: "Madrid", country: "ES", lat: 40.4168, lon: -3.7038, tz: "Europe/Madrid" },
  { id: "seville", name: "Seville", country: "ES", lat: 37.3891, lon: -5.9845, tz: "Europe/Madrid" },
  { id: "london", name: "London", country: "GB", lat: 51.5074, lon: -0.1278, tz: "Europe/London" },
  { id: "brussels", name: "Brussels", country: "BE", lat: 50.8503, lon: 4.3517, tz: "Europe/Brussels" },
  { id: "rome", name: "Rome", country: "IT", lat: 41.9028, lon: 12.4964, tz: "Europe/Rome" },
  { id: "berlin", name: "Berlin", country: "DE", lat: 52.52, lon: 13.405, tz: "Europe/Berlin" },
  { id: "lisbon", name: "Lisbon", country: "PT", lat: 38.7223, lon: -9.1393, tz: "Europe/Lisbon" },
];

/** Reported excess / heat-related mortality — update when new official releases land */
const MORTALITY_SNAPSHOT = {
  asOf: "2026-07-13",
  headline: "Europe reported ~10,650 excess deaths in the peak heat week (22–28 Jun 2026)",
  europe: {
    excessDeaths: 10650,
    weekLabel: "Week of 22–28 Jun 2026 (EuroMOMO week 26)",
    age65PlusExcess: 9000,
    age65PlusShareNote: "Vast majority of excess deaths were among people aged 65+",
    definition:
      "All-cause excess mortality vs baseline across reporting countries — not a medical “heat death” count on each certificate.",
    veryHighExcess: ["France", "Belgium"],
    moderateExcess: ["Spain", "Netherlands", "Switzerland"],
    sourceName: "EuroMOMO (ECDC / WHO-backed)",
    sourceUrl: "https://www.euromomo.eu/",
    pressUrl: "https://www.euronews.com/my-europe/2026/07/13/europe-records-10000-excess-deaths-during-june-heatwaves-new-data-shows",
  },
  englandWales: {
    heatRelatedEstimate: 2700,
    period: "May–June 2026 heatwaves",
    attributionNote:
      "Study attributed ~42% of those deaths to the extra heat from human-caused climate change.",
    sourceName: "Imperial College / UK Met Office / LSHTM study",
    sourceUrl: "https://www.euronews.com/my-europe/2026/07/13/europe-records-10000-excess-deaths-during-june-heatwaves-new-data-shows",
  },
  attribution: {
    note: "World Weather Attribution: late-June western Europe heatwaves would have been virtually impossible without climate change.",
    tempBoostC: "≈3–4°C higher than a world without human-caused warming (study reporting)",
  },
  disclaimer:
    "Mortality figures are published estimates and may be revised. This panel is for situational awareness — not an official death registry or medical advice.",
};

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "s-maxage=600, stale-while-revalidate=1800");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.end(JSON.stringify(body));
}

async function fetchJson(url) {
  const r = await fetch(url, {
    headers: { "User-Agent": "SavvyClimateRiskMonitor/1.0 (europe-heat)" },
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

function heatLevel(tmax) {
  if (tmax == null || !Number.isFinite(tmax)) return "unknown";
  if (tmax >= 40) return "extreme";
  if (tmax >= 35) return "severe";
  if (tmax >= 32) return "high";
  if (tmax >= 28) return "elevated";
  return "moderate";
}

function avg(arr) {
  const v = arr.filter((x) => x != null && Number.isFinite(x));
  if (!v.length) return null;
  return v.reduce((a, b) => a + b, 0) / v.length;
}

async function fetchCityHeat(city) {
  const forecastUrl =
    `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}` +
    `&daily=temperature_2m_max,temperature_2m_min,apparent_temperature_max` +
    `&timezone=${encodeURIComponent(city.tz)}&past_days=14&forecast_days=3`;

  const forecast = await fetchJson(forecastUrl);
  const daily = forecast.daily || {};
  const dates = daily.time || [];
  const tmax = daily.temperature_2m_max || [];
  const tmin = daily.temperature_2m_min || [];
  const apparent = daily.apparent_temperature_max || [];

  const latestIdx = (() => {
    const today = new Date().toISOString().slice(0, 10);
    const i = dates.indexOf(today);
    if (i >= 0) return i;
    // last observed past day
    for (let j = dates.length - 1; j >= 0; j--) {
      if (dates[j] <= today && tmax[j] != null) return j;
    }
    return dates.length - 1;
  })();

  const recentMax = avg(tmax.slice(Math.max(0, latestIdx - 6), latestIdx + 1));

  // Same calendar window last year for rough anomaly
  const end = dates[latestIdx] || new Date().toISOString().slice(0, 10);
  const endDate = new Date(end + "T12:00:00Z");
  const startDate = new Date(endDate);
  startDate.setUTCDate(startDate.getUTCDate() - 13);
  const y = endDate.getUTCFullYear() - 1;
  const lyStart = `${y}-${String(startDate.getUTCMonth() + 1).padStart(2, "0")}-${String(startDate.getUTCDate()).padStart(2, "0")}`;
  const lyEnd = `${y}-${String(endDate.getUTCMonth() + 1).padStart(2, "0")}-${String(endDate.getUTCDate()).padStart(2, "0")}`;

  let lastYearAvgMax = null;
  let lastYearSeries = null;
  try {
    const archiveUrl =
      `https://archive-api.open-meteo.com/v1/archive?latitude=${city.lat}&longitude=${city.lon}` +
      `&start_date=${lyStart}&end_date=${lyEnd}&daily=temperature_2m_max&timezone=${encodeURIComponent(city.tz)}`;
    const arch = await fetchJson(archiveUrl);
    const lyMax = arch.daily?.temperature_2m_max || [];
    lastYearAvgMax = avg(lyMax);
    lastYearSeries = {
      labels: arch.daily?.time || [],
      values: lyMax,
    };
  } catch {
    /* optional */
  }

  const anomaly =
    recentMax != null && lastYearAvgMax != null ? recentMax - lastYearAvgMax : null;

  return {
    ...city,
    latest: {
      date: dates[latestIdx],
      tmax: tmax[latestIdx],
      tmin: tmin[latestIdx],
      apparentMax: apparent[latestIdx],
      level: heatLevel(tmax[latestIdx]),
    },
    recent7dAvgMax: recentMax,
    lastYearWindowAvgMax: lastYearAvgMax,
    anomalyVsLastYearC: anomaly,
    series: {
      labels: dates,
      tmax,
      apparentMax: apparent,
    },
    lastYearSeries,
  };
}

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.end();
    return;
  }
  if (req.method !== "GET") {
    json(res, 405, { error: "Method not allowed" });
    return;
  }

  const errors = [];
  const cities = [];

  await Promise.all(
    CITIES.map(async (c) => {
      try {
        cities.push(await fetchCityHeat(c));
      } catch (e) {
        errors.push(`${c.name}: ${e.message}`);
      }
    })
  );

  cities.sort((a, b) => (b.latest?.tmax ?? -99) - (a.latest?.tmax ?? -99));

  const hotCount = cities.filter((c) => ["high", "severe", "extreme"].includes(c.latest?.level)).length;
  const avgAnomaly = avg(cities.map((c) => c.anomalyVsLastYearC).filter((x) => x != null));

  json(res, 200, {
    updatedAt: new Date().toISOString(),
    source: "Open-Meteo forecast + archive",
    mortality: MORTALITY_SNAPSHOT,
    summary: {
      citiesTracked: cities.length,
      citiesAtHighHeatOrAbove: hotCount,
      avgAnomalyVsLastYearC: avgAnomaly,
      hottestCity: cities[0]
        ? { name: cities[0].name, tmax: cities[0].latest?.tmax, level: cities[0].latest?.level }
        : null,
    },
    cities,
    riskNote:
      "Extreme heat is a chronic & acute physical risk for European assets — elevates cooling demand, labor productivity loss, and mortality-sensitive operational risk.",
    errors: errors.length ? errors : undefined,
  });
};
