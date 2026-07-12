import {
  HAZARDS,
  REGIONS,
  SCENARIOS,
  HORIZONS,
  ALERTS,
  portfolioMetrics,
  hazardScore,
  compositeScore,
  riskLevel,
  riskColor,
  trendSeries,
  scenarioCompare,
  toCsv,
} from "./data.js";

let state = {
  scenario: "SSP2-4.5",
  horizon: 2050,
  region: "all",
  hazard: "flood",
  search: "",
  selectedId: null,
  compare: false,
};

let map = null;
let markersLayer = null;
let trendChart = null;
let hazardChart = null;
let regionChart = null;
let compareChart = null;

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

export function initDashboard() {
  const root = $("#app-dashboard");
  if (!root) return;

  buildControls();
  initMap();
  initCharts();
  bindEvents();
  render();
}

function buildControls() {
  const scenarioSel = $("#ctrl-scenario");
  const horizonSel = $("#ctrl-horizon");
  const regionSel = $("#ctrl-region");
  const hazardSel = $("#ctrl-hazard");

  scenarioSel.innerHTML = SCENARIOS.map((s) => `<option value="${s}">${s}</option>`).join("");
  horizonSel.innerHTML = HORIZONS.map((h) => `<option value="${h}">${h}</option>`).join("");
  regionSel.innerHTML =
    `<option value="all">All regions</option>` +
    REGIONS.map((r) => `<option value="${r}">${r}</option>`).join("");
  hazardSel.innerHTML = HAZARDS.map((h) => `<option value="${h.id}">${h.label}</option>`).join("");

  scenarioSel.value = state.scenario;
  horizonSel.value = String(state.horizon);
  regionSel.value = state.region;
  hazardSel.value = state.hazard;
}

function initMap() {
  const el = $("#risk-map");
  if (!el || typeof L === "undefined") return;

  map = L.map(el, { zoomControl: false, attributionControl: true }).setView([20, 10], 2);
  window.__crmMap = map;
  L.control.zoom({ position: "bottomright" }).addTo(map);

  L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; CARTO',
    maxZoom: 19,
  }).addTo(map);

  markersLayer = L.layerGroup().addTo(map);
}

function initCharts() {
  if (typeof Chart === "undefined") return;

  Chart.defaults.color = "#8fa3b8";
  Chart.defaults.borderColor = "rgba(148,163,184,0.12)";
  Chart.defaults.font.family = "'DM Sans', system-ui, sans-serif";

  const trendCtx = $("#chart-trend");
  const hazardCtx = $("#chart-hazards");
  const regionCtx = $("#chart-regions");
  const compareCtx = $("#chart-compare");

  trendChart = new Chart(trendCtx, {
    type: "line",
    data: { labels: ["2020", "2025", "2030", "2035", "2040", "2045", "2050", "2055"], datasets: [] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { min: 0, max: 100, title: { display: true, text: "Composite score" } },
        x: { title: { display: true, text: "Year" } },
      },
    },
  });

  hazardChart = new Chart(hazardCtx, {
    type: "bar",
    data: { labels: [], datasets: [{ data: [], backgroundColor: [], borderRadius: 6 }] },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { x: { min: 0, max: 100 } },
    },
  });

  regionChart = new Chart(regionCtx, {
    type: "doughnut",
    data: { labels: [], datasets: [{ data: [], backgroundColor: [] }] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: "right", labels: { boxWidth: 10, font: { size: 11 } } } },
    },
  });

  compareChart = new Chart(compareCtx, {
    type: "bar",
    data: { labels: [], datasets: [] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: "top", labels: { boxWidth: 10 } } },
      scales: { y: { min: 0, max: 100 } },
    },
  });
}

function bindEvents() {
  $("#ctrl-scenario").addEventListener("change", (e) => {
    state.scenario = e.target.value;
    render();
  });
  $("#ctrl-horizon").addEventListener("change", (e) => {
    state.horizon = Number(e.target.value);
    render();
  });
  $("#ctrl-region").addEventListener("change", (e) => {
    state.region = e.target.value;
    render();
  });
  $("#ctrl-hazard").addEventListener("change", (e) => {
    state.hazard = e.target.value;
    renderMap();
    renderCompare();
  });
  $("#ctrl-search").addEventListener("input", (e) => {
    state.search = e.target.value.toLowerCase();
    renderTable();
  });
  $("#ctrl-compare").addEventListener("change", (e) => {
    state.compare = e.target.checked;
    $("#compare-panel").hidden = !state.compare;
    renderCompare();
  });
  $("#btn-export").addEventListener("click", exportCsv);
  $("#btn-reset").addEventListener("click", () => {
    state = { ...state, region: "all", search: "", selectedId: null, scenario: "SSP2-4.5", horizon: 2050 };
    $("#ctrl-scenario").value = state.scenario;
    $("#ctrl-horizon").value = state.horizon;
    $("#ctrl-region").value = state.region;
    $("#ctrl-search").value = "";
    render();
  });

  $$(".hazard-toggle").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.hazard = btn.dataset.hazard;
      $("#ctrl-hazard").value = state.hazard;
      $$(".hazard-toggle").forEach((b) => b.classList.toggle("active", b === btn));
      renderMap();
      renderCompare();
    });
  });
}

function getMetrics() {
  return portfolioMetrics(state.scenario, state.horizon, state.region);
}

function render() {
  const m = getMetrics();
  renderKpis(m);
  renderMap();
  renderCharts(m);
  renderTable();
  renderAlerts();
  renderTransition(m);
  renderDetail();
  renderHeroPreview(m);
  syncHazardToggles();
}

function renderKpis(m) {
  $("#kpi-score").textContent = m.avgScore;
  $("#kpi-score").className = `kpi-value risk-${riskLevel(m.avgScore)}`;
  $("#kpi-elevated").textContent = `${m.elevatedPct}%`;
  $("#kpi-elevated-sub").textContent = `${m.elevatedCount} of ${m.totalAssets} sites`;
  $("#kpi-var").textContent = `$${m.transitionVaR}M`;
  $("#kpi-var-sub").textContent = `NGFS disorderly · ${state.horizon}`;
  $("#kpi-value").textContent = `$${m.totalValue}M`;
  $("#kpi-value-sub").textContent = "Total insured value";
  $("#kpi-driver").textContent = m.topDriver.label;
  $("#kpi-driver-sub").textContent = `${state.scenario} · ${state.horizon}`;
  $("#dash-updated").textContent = `Scenario: ${state.scenario} · Horizon: ${state.horizon}`;
}

function renderHeroPreview(m) {
  const heroScore = $("#hero-score");
  const heroElevated = $("#hero-elevated");
  const heroVar = $("#hero-var");
  const heroDriver = $("#hero-driver");
  if (heroScore) {
    heroScore.textContent = m.avgScore;
    heroScore.className = `metric-value risk-${riskLevel(m.avgScore)}`;
  }
  if (heroElevated) heroElevated.textContent = `${m.elevatedPct}%`;
  if (heroVar) heroVar.textContent = `$${m.transitionVaR}M`;
  if (heroDriver) heroDriver.textContent = `Top driver: ${m.topDriver.label} · ${state.region === "all" ? "Global portfolio" : state.region}`;
}

function renderMap() {
  if (!map || !markersLayer) return;
  markersLayer.clearLayers();
  const m = getMetrics();

  m.assets.forEach((asset) => {
    const score = state.hazard === "composite"
      ? asset.score
      : hazardScore(asset, state.hazard, state.scenario, state.horizon);
    const color = riskColor(score);
    const isSelected = asset.id === state.selectedId;

    const marker = L.circleMarker([asset.lat, asset.lng], {
      radius: isSelected ? 10 : 7,
      fillColor: color,
      color: isSelected ? "#fff" : color,
      weight: isSelected ? 2 : 1,
      opacity: 1,
      fillOpacity: 0.85,
    });

    const hazardLabel = HAZARDS.find((h) => h.id === state.hazard)?.label ?? "Composite";
    marker.bindPopup(`
      <strong>${asset.name}</strong><br/>
      ${asset.region} · ${asset.sector}<br/>
      <span style="color:${color};font-weight:600">${hazardLabel}: ${score}</span>
    `);
    marker.on("click", () => selectAsset(asset.id));
    markersLayer.addLayer(marker);
  });
}

function renderCharts(m) {
  if (!trendChart) return;

  const trend = trendSeries(state.scenario, state.horizon);
  trendChart.data.datasets = [{
    data: trend,
    borderColor: "#2dd4a8",
    backgroundColor: "rgba(45,212,168,0.12)",
    fill: true,
    tension: 0.35,
    pointRadius: 3,
  }];
  trendChart.update();

  hazardChart.data.labels = HAZARDS.map((h) => h.label);
  hazardChart.data.datasets[0].data = HAZARDS.map((h) => m.hazardAvgs[h.id]);
  hazardChart.data.datasets[0].backgroundColor = HAZARDS.map((h) => {
    const s = m.hazardAvgs[h.id];
    return riskColor(s);
  });
  hazardChart.update();

  const regionLabels = Object.keys(m.regionCounts);
  const palette = ["#2dd4a8", "#38bdf8", "#a78bfa", "#fbbf24", "#f87171", "#fb923c", "#94a3b8"];
  regionChart.data.labels = regionLabels;
  regionChart.data.datasets[0].data = regionLabels.map((r) => m.regionCounts[r]);
  regionChart.data.datasets[0].backgroundColor = regionLabels.map((_, i) => palette[i % palette.length]);
  regionChart.update();

  renderCompare();
}

function renderCompare() {
  if (!compareChart || !state.compare) return;
  const asset = getMetrics().assets.find((a) => a.id === state.selectedId) ?? getMetrics().assets[0];
  if (!asset) return;

  const rows = scenarioCompare(asset, state.hazard);
  const hazardLabel = HAZARDS.find((h) => h.id === state.hazard)?.label ?? state.hazard;
  $("#compare-title").textContent = `${asset.name} — ${hazardLabel}`;

  compareChart.data.labels = rows.map((r) => String(r.horizon));
  compareChart.data.datasets = [
    { label: "SSP2-4.5", data: rows.map((r) => r.ssp245), backgroundColor: "#2dd4a8", borderRadius: 4 },
    { label: "SSP5-8.5", data: rows.map((r) => r.ssp585), backgroundColor: "#f87171", borderRadius: 4 },
  ];
  compareChart.update();
}

function renderTable() {
  const tbody = $("#asset-table tbody");
  const m = getMetrics();
  let assets = m.assets;

  if (state.search) {
    assets = assets.filter(
      (a) =>
        a.name.toLowerCase().includes(state.search) ||
        a.id.toLowerCase().includes(state.search) ||
        a.region.toLowerCase().includes(state.search)
    );
  }

  tbody.innerHTML = assets
    .map((a) => {
      const lvl = riskLevel(a.score);
      const topH = HAZARDS.reduce((best, h) => {
        const s = hazardScore(a, h.id, state.scenario, state.horizon);
        return s > best.score ? { id: h.id, label: h.label, score: s } : best;
      }, { score: 0, label: "—" });
      const selected = a.id === state.selectedId ? "selected" : "";
      return `<tr class="${selected}" data-id="${a.id}">
        <td><button class="row-select" type="button">${a.id}</button></td>
        <td>${a.name}</td>
        <td>${a.region}</td>
        <td>${a.sector}</td>
        <td>$${a.value}M</td>
        <td><span class="pill pill-${lvl === "high" ? "high" : lvl === "medium" ? "med" : "low"}">${a.score}</span></td>
        <td>${topH.label}</td>
      </tr>`;
    })
    .join("");

  tbody.querySelectorAll("tr").forEach((row) => {
    row.addEventListener("click", () => selectAsset(row.dataset.id));
  });
}

function renderAlerts() {
  const list = $("#alert-list");
  list.innerHTML = ALERTS.map(
    (a) => `<li class="alert-item alert-${a.level}">
      <time>${a.date}</time>
      <strong>${a.title}</strong>
      <span>${a.region}</span>
      <p>${a.detail}</p>
    </li>`
  ).join("");
}

function renderTransition(m) {
  $("#trans-carbon").textContent = `$${m.carbonPrice}/t`;
  $("#trans-stranded").textContent = `${m.strandedPct}%`;
  $("#trans-var").textContent = `$${m.transitionVaR}M`;
  $("#trans-scenario-label").textContent = state.scenario;
}

function renderDetail() {
  const panel = $("#asset-detail");
  const asset = getMetrics().assets.find((a) => a.id === state.selectedId);

  if (!asset) {
    panel.innerHTML = `<p class="detail-empty">Select an asset on the map or table to view hazard breakdown.</p>`;
    return;
  }

  const bars = HAZARDS.map((h) => {
    const s = hazardScore(asset, h.id, state.scenario, state.horizon);
    const lvl = riskLevel(s);
    return `<div class="detail-bar">
      <div class="detail-bar-head"><span>${h.label}</span><span class="pill pill-${lvl === "high" ? "high" : lvl === "medium" ? "med" : "low"}">${s}</span></div>
      <div class="detail-bar-track"><div class="detail-bar-fill risk-${lvl}" style="width:${s}%"></div></div>
    </div>`;
  }).join("");

  panel.innerHTML = `
    <h3>${asset.name}</h3>
    <p class="detail-meta">${asset.id} · ${asset.region} · ${asset.sector} · $${asset.value}M</p>
    <p class="detail-score">Composite: <strong class="risk-${riskLevel(asset.score)}">${asset.score}</strong></p>
    <div class="detail-bars">${bars}</div>
  `;
}

function selectAsset(id) {
  state.selectedId = id;
  renderTable();
  renderMap();
  renderDetail();
  if (state.compare) renderCompare();

  const asset = getMetrics().assets.find((a) => a.id === id);
  if (asset && map) {
    map.flyTo([asset.lat, asset.lng], 5, { duration: 0.8 });
  }
}

function syncHazardToggles() {
  $$(".hazard-toggle").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.hazard === state.hazard);
  });
}

function exportCsv() {
  const m = getMetrics();
  const csv = toCsv(m.assets, state.scenario, state.horizon);
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `climate-risk-${state.scenario}-${state.horizon}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
