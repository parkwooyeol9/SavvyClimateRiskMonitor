/**
 * GET /api/climate-markets
 * Server-side only — uses FRED / Finnhub / FMP keys from env (never exposed to the browser).
 * Aggregates energy prices, transition-tilted ETF quotes, and climate-tagged market news.
 */

const FRED_SERIES = [
  { id: "DCOILWTICO", label: "WTI crude oil", unit: "USD/bbl", theme: "energy" },
  { id: "DHHNGSP", label: "Henry Hub natural gas", unit: "USD/MMBtu", theme: "energy" },
  { id: "GASREGW", label: "US regular gasoline", unit: "USD/gal", theme: "energy" },
  { id: "CPIENGSL", label: "CPI: energy", unit: "index", theme: "inflation" },
];

const ETF_TICKERS = [
  { symbol: "ICLN", name: "iShares Global Clean Energy", tilt: "green" },
  { symbol: "TAN", name: "Invesco Solar ETF", tilt: "green" },
  { symbol: "QCLN", name: "First Trust NASDAQ Clean Edge", tilt: "green" },
  { symbol: "XLE", name: "Energy Select Sector SPDR", tilt: "fossil" },
  { symbol: "XOP", name: "SPDR S&P Oil & Gas Exploration", tilt: "fossil" },
  { symbol: "NEE", name: "NextEra Energy", tilt: "utility" },
];

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "s-maxage=900, stale-while-revalidate=3600");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.end(JSON.stringify(body));
}

async function fetchJson(url, headers = {}) {
  const r = await fetch(url, {
    headers: { "User-Agent": "SavvyClimateRiskMonitor/1.0", ...headers },
  });
  if (!r.ok) {
    const text = await r.text().catch(() => "");
    throw new Error(`HTTP ${r.status} ${url.slice(0, 80)} ${text.slice(0, 120)}`);
  }
  return r.json();
}

function latestFredObs(observations) {
  const usable = (observations || [])
    .filter((o) => o.value !== undefined && o.value !== null && o.value !== ".")
    .map((o) => ({ date: o.date, value: Number(o.value) }))
    .filter((o) => Number.isFinite(o.value));
  if (!usable.length) return null;
  const latest = usable[usable.length - 1];
  const prev = usable.length > 1 ? usable[usable.length - 2] : null;
  const spark = usable.slice(-24).map((o) => o.value);
  return {
    date: latest.date,
    value: latest.value,
    prev: prev ? prev.value : null,
    changePct:
      prev && prev.value !== 0
        ? ((latest.value - prev.value) / Math.abs(prev.value)) * 100
        : null,
    spark,
  };
}

async function fetchFredSeries(apiKey, seriesId) {
  const url = new URL("https://api.stlouisfed.org/fred/series/observations");
  url.searchParams.set("series_id", seriesId);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("file_type", "json");
  url.searchParams.set("sort_order", "asc");
  url.searchParams.set("observation_start", "2022-01-01");
  const data = await fetchJson(url.toString());
  return latestFredObs(data.observations);
}

async function fetchFinnhubQuote(apiKey, symbol) {
  const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${apiKey}`;
  const q = await fetchJson(url);
  if (!q || !q.c) return null;
  return {
    price: q.c,
    change: q.d ?? (q.c && q.pc ? q.c - q.pc : null),
    changePct: q.dp ?? null,
    high: q.h,
    low: q.l,
    prevClose: q.pc,
  };
}

async function fetchFinnhubNews(apiKey) {
  const today = new Date();
  const from = new Date(today);
  from.setDate(from.getDate() - 5);
  const fmt = (d) => d.toISOString().slice(0, 10);
  // Company news for a clean-energy + energy basket (Finnhub free tier)
  const symbols = ["ICLN", "NEE", "XLE", "ENPH", "FSLR"];
  const results = [];
  for (const symbol of symbols) {
    try {
      const url = `https://finnhub.io/api/v1/company-news?symbol=${symbol}&from=${fmt(from)}&to=${fmt(today)}&token=${apiKey}`;
      const items = await fetchJson(url);
      if (Array.isArray(items)) {
        for (const n of items.slice(0, 3)) {
          results.push({
            symbol,
            headline: n.headline,
            summary: n.summary,
            source: n.source,
            url: n.url,
            datetime: n.datetime,
          });
        }
      }
    } catch {
      /* skip */
    }
  }
  // Prefer climate/energy-ish headlines
  const ranked = results
    .filter((n) => n.headline)
    .sort((a, b) => (b.datetime || 0) - (a.datetime || 0));
  const seen = new Set();
  const unique = [];
  for (const n of ranked) {
    const key = n.headline.slice(0, 80);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(n);
    if (unique.length >= 8) break;
  }
  return unique;
}

async function fetchFmpQuotes(apiKey, symbols) {
  if (!apiKey || !symbols.length) return {};
  try {
    const url = `https://financialmodelingprep.com/stable/quote?symbol=${symbols.join(",")}&apikey=${apiKey}`;
    const data = await fetchJson(url);
    const list = Array.isArray(data) ? data : [];
    const out = {};
    for (const row of list) {
      if (!row?.symbol) continue;
      out[row.symbol] = {
        price: row.price,
        change: row.change,
        changePct: row.changesPercentage,
        name: row.name,
      };
    }
    return out;
  } catch {
    return {};
  }
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

  const fredKey = (process.env.FRED_API_KEY || "").trim();
  const finnhubKey = (process.env.FINNHUB_API_KEY || "").trim();
  const fmpKey = (process.env.FMP_API_KEY || "").trim();

  const sources = {
    fred: Boolean(fredKey),
    finnhub: Boolean(finnhubKey),
    fmp: Boolean(fmpKey),
  };

  if (!fredKey && !finnhubKey && !fmpKey) {
    json(res, 503, {
      error: "No market API keys configured",
      hint: "Set FRED_API_KEY, FINNHUB_API_KEY, and/or FMP_API_KEY in Vercel env.",
      sources,
    });
    return;
  }

  const errors = [];
  const energy = [];
  const etfs = [];
  let news = [];

  if (fredKey) {
    await Promise.all(
      FRED_SERIES.map(async (s) => {
        try {
          const obs = await fetchFredSeries(fredKey, s.id);
          if (obs) energy.push({ ...s, ...obs });
        } catch (e) {
          errors.push(`FRED ${s.id}: ${e.message}`);
        }
      })
    );
  }

  if (finnhubKey) {
    await Promise.all(
      ETF_TICKERS.map(async (t) => {
        try {
          const quote = await fetchFinnhubQuote(finnhubKey, t.symbol);
          if (quote) etfs.push({ ...t, ...quote, source: "finnhub" });
        } catch (e) {
          errors.push(`Finnhub ${t.symbol}: ${e.message}`);
        }
      })
    );
    try {
      news = await fetchFinnhubNews(finnhubKey);
    } catch (e) {
      errors.push(`Finnhub news: ${e.message}`);
    }
  }

  // Fill any missing ETF quotes via FMP
  if (fmpKey) {
    const missing = ETF_TICKERS.filter((t) => !etfs.find((e) => e.symbol === t.symbol)).map(
      (t) => t.symbol
    );
    if (missing.length) {
      const fmp = await fetchFmpQuotes(fmpKey, missing);
      for (const t of ETF_TICKERS) {
        if (etfs.find((e) => e.symbol === t.symbol)) continue;
        const q = fmp[t.symbol];
        if (q?.price != null) {
          etfs.push({
            ...t,
            price: q.price,
            change: q.change,
            changePct: q.changePct,
            source: "fmp",
          });
        }
      }
    }
  }

  // Simple green vs fossil relative signal (for UI)
  const green = etfs.filter((e) => e.tilt === "green" && e.changePct != null);
  const fossil = etfs.filter((e) => e.tilt === "fossil" && e.changePct != null);
  const avg = (arr) =>
    arr.length ? arr.reduce((s, x) => s + Number(x.changePct), 0) / arr.length : null;
  const greenAvg = avg(green);
  const fossilAvg = avg(fossil);
  let regime = "mixed";
  if (greenAvg != null && fossilAvg != null) {
    if (greenAvg - fossilAvg > 0.4) regime = "green_outperform";
    else if (fossilAvg - greenAvg > 0.4) regime = "fossil_outperform";
  }

  json(res, 200, {
    updatedAt: new Date().toISOString(),
    sources,
    energy,
    etfs,
    news,
    signal: {
      regime,
      greenAvgPct: greenAvg,
      fossilAvgPct: fossilAvg,
      note:
        regime === "green_outperform"
          ? "Clean-energy basket beating fossil ETFs today — transition-tilt in favor."
          : regime === "fossil_outperform"
            ? "Fossil energy ETFs leading clean-energy basket — watch transition VaR narratives."
            : "Clean vs fossil ETFs roughly in line — no strong same-day tilt.",
    },
    errors: errors.length ? errors : undefined,
    disclaimer:
      "Market data for climate-finance context only. Not investment advice. Demo product.",
  });
};
