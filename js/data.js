/** Demo portfolio & scenario model — client-side only */

export const HAZARDS = [
  { id: "flood", label: "Inland flood", color: "#38bdf8" },
  { id: "coastal", label: "Coastal flood", color: "#0ea5e9" },
  { id: "heat", label: "Extreme heat", color: "#f87171" },
  { id: "drought", label: "Drought", color: "#fbbf24" },
  { id: "wildfire", label: "Wildfire", color: "#fb923c" },
  { id: "wind", label: "Extreme wind", color: "#a78bfa" },
  { id: "seaLevel", label: "Sea-level rise", color: "#2dd4a8" },
  { id: "waterStress", label: "Water stress", color: "#94a3b8" },
];

export const REGIONS = [
  "Southeast Asia",
  "North America",
  "Europe",
  "Middle East",
  "East Asia",
  "Oceania",
  "Latin America",
];

export const SCENARIOS = ["SSP2-4.5", "SSP5-8.5"];
export const HORIZONS = [2030, 2040, 2050];

const SCENARIO_MULT = {
  "SSP2-4.5": { 2030: 1.08, 2040: 1.18, 2050: 1.28 },
  "SSP5-8.5": { 2030: 1.15, 2040: 1.35, 2050: 1.55 },
};

const TRANSITION = {
  "SSP2-4.5": { carbonPrice: 85, strandedPct: 4.2, disorderlyVaR: 18.4 },
  "SSP5-8.5": { carbonPrice: 142, strandedPct: 8.7, disorderlyVaR: 31.2 },
};

export const ASSETS = [
  { id: "SGP-01", name: "Jurong Logistics Hub", region: "Southeast Asia", sector: "Industrial", lat: 1.32, lng: 103.72, value: 42, base: { flood: 78, coastal: 45, heat: 82, drought: 38, wildfire: 12, wind: 55, seaLevel: 62, waterStress: 48 } },
  { id: "USA-12", name: "Houston Refinery Complex", region: "North America", sector: "Energy", lat: 29.76, lng: -95.37, value: 128, base: { flood: 72, coastal: 68, heat: 75, drought: 42, wildfire: 18, wind: 71, seaLevel: 58, waterStress: 35 } },
  { id: "DEU-04", name: "Rhine Manufacturing Park", region: "Europe", sector: "Manufacturing", lat: 50.94, lng: 6.96, value: 67, base: { flood: 58, coastal: 22, heat: 48, drought: 52, wildfire: 8, wind: 44, seaLevel: 18, waterStress: 40 } },
  { id: "ARE-02", name: "Dubai Data Center", region: "Middle East", sector: "Technology", lat: 25.2, lng: 55.27, value: 31, base: { flood: 15, coastal: 28, heat: 88, drought: 76, wildfire: 5, wind: 32, seaLevel: 22, waterStress: 85 } },
  { id: "JPN-07", name: "Osaka Port Terminal", region: "East Asia", sector: "Logistics", lat: 34.65, lng: 135.43, value: 89, base: { flood: 65, coastal: 74, heat: 52, drought: 28, wildfire: 10, wind: 68, seaLevel: 71, waterStress: 32 } },
  { id: "AUS-03", name: "Brisbane Office Tower", region: "Oceania", sector: "Commercial", lat: -27.47, lng: 153.03, value: 54, base: { flood: 61, coastal: 55, heat: 58, drought: 45, wildfire: 42, wind: 63, seaLevel: 48, waterStress: 38 } },
  { id: "BRA-05", name: "São Paulo Retail Cluster", region: "Latin America", sector: "Retail", lat: -23.55, lng: -46.63, value: 38, base: { flood: 48, coastal: 12, heat: 55, drought: 62, wildfire: 22, wind: 38, seaLevel: 8, waterStress: 52 } },
  { id: "VNM-01", name: "Ho Chi Minh Factory", region: "Southeast Asia", sector: "Manufacturing", lat: 10.82, lng: 106.63, value: 29, base: { flood: 81, coastal: 52, heat: 79, drought: 35, wildfire: 14, wind: 58, seaLevel: 66, waterStress: 44 } },
  { id: "USA-08", name: "Miami Beach Hotel", region: "North America", sector: "Hospitality", lat: 25.79, lng: -80.13, value: 95, base: { flood: 68, coastal: 86, heat: 72, drought: 30, wildfire: 8, wind: 78, seaLevel: 82, waterStress: 28 } },
  { id: "NLD-02", name: "Rotterdam Chemical Plant", region: "Europe", sector: "Chemicals", lat: 51.92, lng: 4.48, value: 112, base: { flood: 55, coastal: 48, heat: 42, drought: 35, wildfire: 6, wind: 52, seaLevel: 45, waterStress: 30 } },
  { id: "CHN-11", name: "Shanghai Bonded Warehouse", region: "East Asia", sector: "Logistics", lat: 31.23, lng: 121.47, value: 76, base: { flood: 62, coastal: 58, heat: 64, drought: 38, wildfire: 12, wind: 61, seaLevel: 55, waterStress: 42 } },
  { id: "THA-02", name: "Bangkok Distribution Center", region: "Southeast Asia", sector: "Logistics", lat: 13.76, lng: 100.5, value: 33, base: { flood: 84, coastal: 38, heat: 76, drought: 40, wildfire: 10, wind: 48, seaLevel: 52, waterStress: 46 } },
];

export const ALERTS = [
  { date: "2026-07-08", level: "high", title: "Inland flood watch", region: "Southeast Asia", detail: "3 assets exceed 80th percentile flood exposure under SSP5-8.5 · 2050." },
  { date: "2026-07-05", level: "medium", title: "Heat stress threshold", region: "Middle East", detail: "Dubai Data Center projected >45 cooling-degree-day anomaly by 2040." },
  { date: "2026-07-02", level: "medium", title: "Coastal surge update", region: "North America", detail: "Miami Beach Hotel sea-level rise score increased +6 pts this quarter." },
  { date: "2026-06-28", level: "low", title: "Wildfire season prep", region: "Oceania", detail: "Brisbane exposure remains below portfolio median across all scenarios." },
  { date: "2026-06-22", level: "high", title: "Transition VaR breach", region: "Portfolio", detail: "Disorderly NGFS pathway VaR exceeds $24M internal limit at 2050 horizon." },
];

const TREND_BASE = [48, 51, 54, 58, 62, 66, 70, 74];

export function clamp(n, min = 0, max = 100) {
  return Math.min(max, Math.max(min, Math.round(n)));
}

export function hazardScore(asset, hazardId, scenario, horizon) {
  const mult = SCENARIO_MULT[scenario][horizon];
  const heatBoost = hazardId === "heat" && scenario === "SSP5-8.5" ? 1.12 : 1;
  const floodBoost = hazardId === "flood" && horizon === 2050 ? 1.08 : 1;
  return clamp(asset.base[hazardId] * mult * heatBoost * floodBoost);
}

export function compositeScore(asset, scenario, horizon) {
  const scores = HAZARDS.map((h) => hazardScore(asset, h.id, scenario, horizon));
  return clamp(scores.reduce((a, b) => a + b, 0) / scores.length);
}

export function riskLevel(score) {
  if (score >= 70) return "high";
  if (score >= 45) return "medium";
  return "low";
}

export function riskColor(score) {
  if (score >= 70) return "#f87171";
  if (score >= 45) return "#fbbf24";
  return "#2dd4a8";
}

export function portfolioMetrics(scenario, horizon, regionFilter = "all") {
  const assets = regionFilter === "all"
    ? ASSETS
    : ASSETS.filter((a) => a.region === regionFilter);

  const scored = assets.map((a) => ({
    ...a,
    score: compositeScore(a, scenario, horizon),
  }));

  const totalValue = scored.reduce((s, a) => s + a.value, 0);
  const elevated = scored.filter((a) => a.score >= 60);
  const avgScore = scored.length
    ? clamp(scored.reduce((s, a) => s + a.score, 0) / scored.length)
    : 0;

  const hazardAvgs = Object.fromEntries(
    HAZARDS.map((h) => [
      h.id,
      clamp(scored.reduce((s, a) => s + hazardScore(a, h.id, scenario, horizon), 0) / (scored.length || 1)),
    ])
  );

  const topDriver = HAZARDS.reduce((best, h) =>
    hazardAvgs[h.id] > (hazardAvgs[best.id] ?? 0) ? h : best
  );

  const regionCounts = {};
  scored.forEach((a) => {
    regionCounts[a.region] = (regionCounts[a.region] || 0) + 1;
  });

  const transition = TRANSITION[scenario];
  const horizonMult = horizon === 2030 ? 0.7 : horizon === 2040 ? 0.85 : 1;
  const transitionVaR = (transition.disorderlyVaR * horizonMult).toFixed(1);

  return {
    assets: scored.sort((a, b) => b.score - a.score),
    totalAssets: scored.length,
    elevatedCount: elevated.length,
    elevatedPct: scored.length ? Math.round((elevated.length / scored.length) * 100) : 0,
    avgScore,
    totalValue,
    hazardAvgs,
    topDriver,
    regionCounts,
    transitionVaR,
    carbonPrice: Math.round(transition.carbonPrice * horizonMult),
    strandedPct: (transition.strandedPct * horizonMult).toFixed(1),
  };
}

export function trendSeries(scenario, horizon) {
  const endMult = SCENARIO_MULT[scenario][horizon] / SCENARIO_MULT[scenario][2030];
  return TREND_BASE.map((v, i) => clamp(v * (1 + (endMult - 1) * (i / (TREND_BASE.length - 1)))));
}

export function scenarioCompare(asset, hazardId) {
  return HORIZONS.map((h) => ({
    horizon: h,
    ssp245: hazardScore(asset, hazardId, "SSP2-4.5", h),
    ssp585: hazardScore(asset, hazardId, "SSP5-8.5", h),
  }));
}

export function toCsv(assets, scenario, horizon) {
  const header = ["id", "name", "region", "sector", "value_musd", "composite_score", ...HAZARDS.map((h) => h.id)].join(",");
  const rows = assets.map((a) => {
    const hazards = HAZARDS.map((h) => hazardScore(a, h.id, scenario, horizon)).join(",");
    return [a.id, `"${a.name}"`, a.region, a.sector, a.value, compositeScore(a, scenario, horizon), hazards].join(",");
  });
  return [header, ...rows].join("\n");
}
