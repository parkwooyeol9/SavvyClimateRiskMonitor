/** Europe extreme heat watch — mortality snapshot + live Open-Meteo city board */

const $ = (sel) => document.querySelector(sel);

let cityChart = null;

function fmt1(n) {
  if (n == null || !Number.isFinite(Number(n))) return "—";
  return Number(n).toFixed(1);
}

function anomalyClass(n) {
  if (n == null || !Number.isFinite(Number(n))) return "";
  if (n >= 2) return "hot";
  if (n <= -2) return "cool";
  return "";
}

function levelLabel(level) {
  const map = {
    extreme: "Extreme",
    severe: "Severe",
    high: "High",
    elevated: "Elevated",
    moderate: "Moderate",
    unknown: "—",
  };
  return map[level] || level || "—";
}

function renderMortality(m) {
  const el = $("#heat-mortality");
  if (!el || !m) return;

  const eu = m.europe || {};
  const ew = m.englandWales || {};
  const att = m.attribution || {};

  el.innerHTML = `
    <div class="mortality-hero">
      <p class="mortality-asof">Situation brief · updated ${m.asOf}</p>
      <h3>${m.headline}</h3>
      <p class="mortality-def">${eu.definition || ""}</p>
    </div>
    <div class="mortality-grid">
      <article class="mortality-card">
        <span class="mortality-label">EuroMOMO excess (peak week)</span>
        <span class="mortality-value">${eu.excessDeaths?.toLocaleString?.() ?? eu.excessDeaths}</span>
        <span class="mortality-sub">${eu.weekLabel || ""}</span>
      </article>
      <article class="mortality-card">
        <span class="mortality-label">Of which age 65+</span>
        <span class="mortality-value">&gt;${(eu.age65PlusExcess || 9000).toLocaleString()}</span>
        <span class="mortality-sub">${eu.age65PlusShareNote || ""}</span>
      </article>
      <article class="mortality-card">
        <span class="mortality-label">England &amp; Wales heat-related</span>
        <span class="mortality-value">~${(ew.heatRelatedEstimate || 0).toLocaleString()}</span>
        <span class="mortality-sub">${ew.period || ""} · study estimate</span>
      </article>
      <article class="mortality-card">
        <span class="mortality-label">Climate attribution</span>
        <span class="mortality-value soft">${att.tempBoostC || "—"}</span>
        <span class="mortality-sub">${att.note || ""}</span>
      </article>
    </div>
    <div class="mortality-tags">
      <span>Very high excess: ${(eu.veryHighExcess || []).join(", ") || "—"}</span>
      <span>Moderate excess: ${(eu.moderateExcess || []).join(", ") || "—"}</span>
    </div>
    <p class="mortality-sources">
      Sources:
      <a href="${eu.sourceUrl || "#"}" target="_blank" rel="noopener noreferrer">${eu.sourceName || "EuroMOMO"}</a>
      ·
      <a href="${eu.pressUrl || "#"}" target="_blank" rel="noopener noreferrer">Euronews reporting (13 Jul 2026)</a>
      ·
      <a href="${ew.sourceUrl || "#"}" target="_blank" rel="noopener noreferrer">${ew.sourceName || "UK study"}</a>
    </p>
    <p class="mortality-disclaimer">${m.disclaimer || ""}</p>
  `;
}

function renderSummary(summary, riskNote) {
  const el = $("#heat-summary");
  if (!el || !summary) return;
  const hot = summary.hottestCity;
  el.innerHTML = `
    <div class="heat-kpi"><span>Cities tracked</span><strong>${summary.citiesTracked ?? "—"}</strong></div>
    <div class="heat-kpi"><span>At high heat+</span><strong>${summary.citiesAtHighHeatOrAbove ?? "—"}</strong></div>
    <div class="heat-kpi"><span>Avg anomaly vs last year</span><strong class="${anomalyClass(summary.avgAnomalyVsLastYearC)}">${fmt1(summary.avgAnomalyVsLastYearC)}°C</strong></div>
    <div class="heat-kpi"><span>Hottest now</span><strong>${hot ? `${hot.name} ${fmt1(hot.tmax)}°C` : "—"}</strong></div>
    <p class="heat-risk-note">${riskNote || ""}</p>
  `;
}

function renderCityBoard(cities) {
  const el = $("#heat-city-board");
  if (!el) return;
  el.innerHTML = (cities || [])
    .map(
      (c) => `<article class="heat-city level-${c.latest?.level || "unknown"}">
        <div class="heat-city-top">
          <strong>${c.name}</strong>
          <span class="heat-level">${levelLabel(c.latest?.level)}</span>
        </div>
        <div class="heat-city-temps">
          <span><em>Max</em> ${fmt1(c.latest?.tmax)}°C</span>
          <span><em>Feels</em> ${fmt1(c.latest?.apparentMax)}°C</span>
          <span><em>Min</em> ${fmt1(c.latest?.tmin)}°C</span>
        </div>
        <div class="heat-city-anomaly ${anomalyClass(c.anomalyVsLastYearC)}">
          7d avg max ${fmt1(c.recent7dAvgMax)}°C
          · vs same window last year ${c.anomalyVsLastYearC == null ? "—" : `${c.anomalyVsLastYearC >= 0 ? "+" : ""}${fmt1(c.anomalyVsLastYearC)}°C`}
        </div>
        <div class="heat-city-date">${c.latest?.date || ""} · ${c.country}</div>
      </article>`
    )
    .join("");
}

function renderCityChart(cities) {
  const canvas = $("#chart-europe-heat");
  if (!canvas || typeof Chart === "undefined" || !cities?.length) return;
  if (cityChart) cityChart.destroy();

  // Overlay recent max for top 4 hottest cities
  const top = cities.slice(0, 4);
  const labels = top[0]?.series?.labels || [];
  const colors = ["#f87171", "#fbbf24", "#fb923c", "#38bdf8"];

  cityChart = new Chart(canvas, {
    type: "line",
    data: {
      labels,
      datasets: top.map((c, i) => ({
        label: `${c.name} max °C`,
        data: c.series?.tmax || [],
        borderColor: colors[i % colors.length],
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.25,
        fill: false,
      })),
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { position: "top", labels: { boxWidth: 10, font: { size: 11 } } },
        title: {
          display: true,
          text: "Daily max temperature — last 14 days + short forecast (Open-Meteo)",
          color: "#e8eef5",
          font: { size: 13, weight: "600" },
        },
      },
      scales: {
        x: {
          ticks: {
            maxTicksLimit: 8,
            callback(v) {
              const l = this.getLabelForValue(v);
              return l?.slice?.(5) || l;
            },
          },
          title: { display: true, text: "Date" },
        },
        y: {
          title: { display: true, text: "Daily max (°C)" },
          grid: { color: "rgba(148,163,184,0.08)" },
        },
      },
    },
  });
}

function highlightEuAssets() {
  const el = $("#heat-asset-link");
  if (!el) return;
  el.innerHTML = `
    <p>Demo portfolio assets in Europe (use the dashboard Region filter → <strong>Europe</strong>):</p>
    <ul>
      <li><strong>Rhine Manufacturing Park</strong> (Germany) — heat &amp; flood co-exposure</li>
      <li><strong>Rotterdam Chemical Plant</strong> (Netherlands) — coastal + heat stress on operations</li>
    </ul>
    <a class="btn btn-sm" href="#app-dashboard">Open portfolio dashboard</a>
  `;
}

export async function initEuropeHeat() {
  const root = $("#europe-heat");
  if (!root) return;
  const status = $("#heat-status");
  if (status) status.textContent = "Fetching live European temperatures…";

  try {
    const res = await fetch(`/api/europe-heat?t=${Date.now()}`);
    const data = await res.json();
    if (!res.ok) {
      if (status) status.textContent = data.error || "Heat API unavailable";
      return;
    }

    const when = data.updatedAt
      ? new Date(data.updatedAt).toLocaleString(undefined, {
          dateStyle: "medium",
          timeStyle: "short",
        })
      : "";
    if (status) {
      status.textContent = `Weather live · ${when} · ${data.source || "Open-Meteo"} · mortality snapshot is curated (not live-counted)`;
    }

    renderMortality(data.mortality);
    renderSummary(data.summary, data.riskNote);
    renderCityBoard(data.cities);
    renderCityChart(data.cities);
    highlightEuAssets();

    const charts = $("#heat-chart-panel");
    if (charts) charts.hidden = !(data.cities && data.cities.length);
  } catch (err) {
    if (status) status.textContent = `Could not load Europe heat watch (${err.message})`;
  }
}
