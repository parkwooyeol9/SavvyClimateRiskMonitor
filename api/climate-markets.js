/**
 * GET /api/climate-markets
 * Browser ↔ this endpoint only. FRED / Finnhub / FMP keys stay on the server.
 * Returns quotes, news, and chart-ready time series (same pattern as finance sites).
 */

const FRED_SERIES = [
  { id: "DCOILWTICO", label: "WTI crude oil", unit: "USD/bbl", theme: "energy", chart: true },
  { id: "DHHNGSP", label: "Henry Hub natural gas", unit: "USD/MMBtu", theme: "energy", chart: true },
  { id: "GASREGW", label: "US regular gasoline", unit: "USD/gal", theme: "energy", chart: false },
  { id: "CPIENGSL", label: "CPI: energy", unit: "index", theme: "inflation", chart: false },
];

const ETF_TICKERS = [
  { symbol: "ICLN", name: "iShares Global Clean Energy", tilt: "green", candle: true },
  { symbol: "TAN", name: "Invesco Solar ETF", tilt: "green", candle: false },
  { symbol: "QCLN", name: "First Trust NASDAQ Clean Edge", tilt: "green", candle: false },
  { symbol: "XLE", name: "Energy Select Sector SPDR", tilt: "fossil", candle: true },
  { symbol: "XOP", name: "SPDR S&P Oil & Gas Exploration", tilt: "fossil", candle: false },
  { symbol: "NEE", name: "NextEra Energy", tilt: "utility", candle: false },
];

const CHART_COLORS = {
  DCOILWTICO: "#fbbf24",
  DHHNGSP: "#38bdf8",
  ICLN: "#2dd4a8",
  XLE: "#f87171",
};

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "s-maxage=900, stale-while-revalidate=3600");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.end(JSON.stringify(body));
}

async function fetchJson(url) {
  const r = await fetch(url, {
    headers: { "User-Agent": "SavvyClimateRiskMonitor/1.0" },
  });
  if (!r.ok) {
    const text = await r.text().catch(() => "");
    throw new Error(`HTTP ${r.status}: ${text.slice(0, 120)}`);
  }
  return r.json();
}

function parseFredObs(observations) {
  return (observations || [])
    .filter((o) => o.value !== undefined && o.value !== null && o.value !== ".")
    .map((o) => ({ date: o.date, value: Number(o.value) }))
    .filter((o) => Number.isFinite(o.value));
}

function summarizeSeries(usable) {
  if (!usable.length) return null;
  const latest = usable[usable.length - 1];
  const prev = usable.length > 1 ? usable[usable.length - 2] : null;
  return {
    date: latest.date,
    value: latest.value,
    prev: prev ? prev.value : null,
    changePct:
      prev && prev.value !== 0
        ? ((latest.value - prev.value) / Math.abs(prev.value)) * 100
        : null,
    spark: usable.slice(-24).map((o) => o.value),
    history: {
      labels: usable.map((o) => o.date),
      values: usable.map((o) => o.value),
    },
  };
}

async function fetchFredSeries(apiKey, seriesId) {
  const url = new URL("https://api.stlouisfed.org/fred/series/observations");
  url.searchParams.set("series_id", seriesId);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("file_type", "json");
  url.searchParams.set("sort_order", "asc");
  url.searchParams.set("observation_start", "2020-01-01");
  const data = await fetchJson(url.toString());
  return summarizeSeries(parseFredObs(data.observations));
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

async function fetchFinnhubCandles(apiKey, symbol, days = 365) {
  const to = Math.floor(Date.now() / 1000);
  const from = to - days * 24 * 60 * 60;
  const url =
    `https://finnhub.io/api/v1/stock/candle?symbol=${encodeURIComponent(symbol)}` +
    `&resolution=D&from=${from}&to=${to}&token=${apiKey}`;
  const data = await fetchJson(url);
  if (!data || data.s !== "ok" || !Array.isArray(data.t) || !data.t.length) return null;

  const labels = data.t.map((ts) => new Date(ts * 1000).toISOString().slice(0, 10));
  const closes = data.c.map(Number);
  // Indexed performance (start = 100)
  const base = closes[0] || 1;
  const indexed = closes.map((c) => (c / base) * 100);

  return { labels, values: closes, indexed };
}

async function fetchFinnhubNews(apiKey) {
  const today = new Date();
  const from = new Date(today);
  from.setDate(from.getDate() - 5);
  const fmt = (d) => d.toISOString().slice(0, 10);
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

function alignIndexedSeries(seriesMap) {
  // seriesMap: { ICLN: {labels, indexed}, XLE: {...} }
  const keys = Object.keys(seriesMap);
  if (!keys.length) return null;
  const dateSet = new Set();
  keys.forEach((k) => seriesMap[k].labels.forEach((d) => dateSet.add(d)));
  const labels = [...dateSet].sort();
  const datasets = {};
  for (const k of keys) {
    const lookup = new Map(seriesMap[k].labels.map((d, i) => [d, seriesMap[k].indexed[i]]));
    let last = null;
    datasets[k] = labels.map((d) => {
      if (lookup.has(d)) last = lookup.get(d);
      return last;
    });
  }
  return { labels, datasets };
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
  const charts = {
    energy: null,
    relative: null,
  };

  if (fredKey) {
    await Promise.all(
      FRED_SERIES.map(async (s) => {
        try {
          const obs = await fetchFredSeries(fredKey, s.id);
          if (obs) energy.push({ ...s, ...obs, color: CHART_COLORS[s.id] || "#2dd4a8" });
        } catch (e) {
          errors.push(`FRED ${s.id}: ${e.message}`);
        }
      })
    );

    const chartable = energy.filter((s) => s.chart && s.history?.labels?.length);
    if (chartable.length) {
      charts.energy = {
        series: chartable.map((s) => ({
          id: s.id,
          label: s.label,
          unit: s.unit,
          color: s.color,
          labels: s.history.labels,
          values: s.history.values,
        })),
      };
    }
  }

  const candleMap = {};

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

    await Promise.all(
      ETF_TICKERS.filter((t) => t.candle).map(async (t) => {
        try {
          const candles = await fetchFinnhubCandles(finnhubKey, t.symbol, 400);
          if (candles) candleMap[t.symbol] = candles;
        } catch (e) {
          errors.push(`Finnhub candle ${t.symbol}: ${e.message}`);
        }
      })
    );

    try {
      news = await fetchFinnhubNews(finnhubKey);
    } catch (e) {
      errors.push(`Finnhub news: ${e.message}`);
    }
  }

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

  if (Object.keys(candleMap).length) {
    const aligned = alignIndexedSeries(
      Object.fromEntries(
        Object.entries(candleMap).map(([sym, c]) => [sym, { labels: c.labels, indexed: c.indexed }])
      )
    );
    if (aligned) {
      charts.relative = {
        labels: aligned.labels,
        series: Object.keys(aligned.datasets).map((sym) => {
          const meta = ETF_TICKERS.find((t) => t.symbol === sym);
          return {
            symbol: sym,
            label: meta?.name || sym,
            tilt: meta?.tilt || "other",
            color: CHART_COLORS[sym] || "#94a3b8",
            values: aligned.datasets[sym],
          };
        }),
      };
    }
  }

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
    charts,
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
