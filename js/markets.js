/** Live climate-finance markets — secure proxy data + Chart.js charts */

const $ = (sel) => document.querySelector(sel);

let energyChart = null;
let relativeChart = null;
let marketsData = null;
let energyRange = "1Y";
let relativeRange = "1Y";

const RANGE_DAYS = { "3M": 90, "6M": 180, "1Y": 365, MAX: 9999 };

function fmtNum(n, digits = 2) {
  if (n == null || !Number.isFinite(Number(n))) return "—";
  return Number(n).toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function fmtPct(n) {
  if (n == null || !Number.isFinite(Number(n))) return "—";
  const v = Number(n);
  const sign = v > 0 ? "+" : "";
  return `${sign}${v.toFixed(2)}%`;
}

function pctClass(n) {
  if (n == null || !Number.isFinite(Number(n))) return "";
  return Number(n) >= 0 ? "up" : "down";
}

function sparkSvg(values) {
  if (!values?.length) return "";
  const w = 80;
  const h = 28;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values
    .map((v, i) => {
      const x = (i / (values.length - 1 || 1)) * w;
      const y = h - ((v - min) / span) * (h - 4) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" aria-hidden="true"><polyline fill="none" stroke="currentColor" stroke-width="1.5" points="${pts}"/></svg>`;
}

function regimeLabel(regime) {
  if (regime === "green_outperform") return { text: "Green tilts ahead", level: "good" };
  if (regime === "fossil_outperform") return { text: "Fossil tilts ahead", level: "warn" };
  return { text: "Mixed session", level: "neutral" };
}

function sliceByRange(labels, values, rangeKey) {
  const days = RANGE_DAYS[rangeKey] || 365;
  if (days >= 9999 || !labels?.length) return { labels, values };
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  const idx = labels.findIndex((d) => d >= cutoffStr);
  const start = idx < 0 ? 0 : idx;
  return {
    labels: labels.slice(start),
    values: values.slice(start),
  };
}

function chartDefaults() {
  if (typeof Chart === "undefined") return;
  Chart.defaults.color = "#8fa3b8";
  Chart.defaults.borderColor = "rgba(148,163,184,0.12)";
  Chart.defaults.font.family = "'DM Sans', system-ui, sans-serif";
}

function destroyChart(chart) {
  if (chart) chart.destroy();
  return null;
}

function renderEnergyChart() {
  const canvas = $("#chart-energy");
  if (!canvas || typeof Chart === "undefined" || !marketsData?.charts?.energy) return;

  const series = marketsData.charts.energy.series || [];
  if (!series.length) return;

  energyChart = destroyChart(energyChart);

  const primary = series[0];
  const secondary = series[1];
  const p = sliceByRange(primary.labels, primary.values, energyRange);

  let secondaryAligned = null;
  if (secondary) {
    const s = sliceByRange(secondary.labels, secondary.values, energyRange);
    const map = new Map(s.labels.map((d, i) => [d, s.values[i]]));
    let last = null;
    secondaryAligned = p.labels.map((d) => {
      if (map.has(d)) last = map.get(d);
      return last;
    });
  }

  energyChart = new Chart(canvas, {
    type: "line",
    data: {
      labels: p.labels,
      datasets: [
        {
          label: `${primary.label} (${primary.unit})`,
          data: p.values,
          borderColor: primary.color,
          backgroundColor: `${primary.color}18`,
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.2,
          fill: true,
          yAxisID: "y",
        },
        secondary && secondaryAligned
          ? {
              label: `${secondary.label} (${secondary.unit})`,
              data: secondaryAligned,
              borderColor: secondary.color,
              borderWidth: 2,
              pointRadius: 0,
              tension: 0.2,
              fill: false,
              yAxisID: "y1",
            }
          : null,
      ].filter(Boolean),
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { position: "top", labels: { boxWidth: 10, font: { size: 11 } } },
        title: {
          display: true,
          text: "Energy prices (FRED)",
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
              return l?.slice?.(0, 7) || l;
            },
          },
          title: { display: true, text: "Date" },
        },
        y: {
          position: "left",
          title: { display: true, text: primary.unit },
          grid: { color: "rgba(148,163,184,0.08)" },
        },
        y1: {
          position: "right",
          display: Boolean(secondary),
          title: { display: Boolean(secondary), text: secondary?.unit || "" },
          grid: { drawOnChartArea: false },
        },
      },
    },
  });
}

function renderRelativeChart() {
  const canvas = $("#chart-relative");
  if (!canvas || typeof Chart === "undefined" || !marketsData?.charts?.relative) return;

  relativeChart = destroyChart(relativeChart);
  const { labels, series } = marketsData.charts.relative;
  const slicedLabels = sliceByRange(labels, labels, relativeRange).labels;
  const startIdx = labels.length - slicedLabels.length;

  // Re-index so each visible range starts at 100
  const datasets = series.map((s) => {
    const raw = s.values.slice(startIdx);
    const first = raw.find((v) => v != null && Number.isFinite(v));
    const base = first || 100;
    return {
      label: `${s.symbol} (${s.tilt})`,
      data: raw.map((v) => (v == null ? null : (v / base) * 100)),
      borderColor: s.color,
      borderWidth: 2,
      pointRadius: 0,
      tension: 0.2,
      fill: false,
    };
  });

  relativeChart = new Chart(canvas, {
    type: "line",
    data: {
      labels: slicedLabels,
      datasets,
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { position: "top", labels: { boxWidth: 10, font: { size: 11 } } },
        title: {
          display: true,
          text: "Green vs fossil — indexed (100 = start of selected range)",
          color: "#e8eef5",
          font: { size: 13, weight: "600" },
        },
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.dataset.label}: ${fmtNum(ctx.parsed.y, 1)}`,
          },
        },
      },
      scales: {
        x: {
          ticks: {
            maxTicksLimit: 8,
            callback(v) {
              const l = this.getLabelForValue(v);
              return l?.slice?.(0, 7) || l;
            },
          },
          title: { display: true, text: "Date" },
        },
        y: {
          title: { display: true, text: "Indexed level" },
          grid: { color: "rgba(148,163,184,0.08)" },
        },
      },
    },
  });
}

function bindRangeToggles() {
  document.querySelectorAll("[data-chart-range]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.chartRange;
      const range = btn.dataset.range;
      const group = btn.parentElement;
      group.querySelectorAll("button").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      if (target === "energy") {
        energyRange = range;
        renderEnergyChart();
      } else {
        relativeRange = range;
        renderRelativeChart();
      }
    });
  });
}

function renderCards(data) {
  const energyEl = $("#markets-energy");
  const etfEl = $("#markets-etfs");
  const newsEl = $("#markets-news");
  const signalEl = $("#markets-signal");

  if (signalEl && data.signal) {
    const r = regimeLabel(data.signal.regime);
    signalEl.innerHTML = `
      <span class="signal-pill signal-${r.level}">${r.text}</span>
      <p>${data.signal.note || ""}</p>
      <p class="signal-meta">Green basket ${fmtPct(data.signal.greenAvgPct)} · Fossil basket ${fmtPct(data.signal.fossilAvgPct)}</p>
    `;
  }

  if (energyEl) {
    energyEl.innerHTML = (data.energy || [])
      .map(
        (s) => `<article class="mkt-card">
          <div class="mkt-card-top">
            <span class="mkt-label">${s.label}</span>
            ${sparkSvg(s.spark)}
          </div>
          <div class="mkt-value">${fmtNum(s.value)} <span class="mkt-unit">${s.unit || ""}</span></div>
          <div class="mkt-delta ${pctClass(s.changePct)}">${fmtPct(s.changePct)} <span class="mkt-date">${s.date || ""}</span></div>
        </article>`
      )
      .join("") || `<p class="markets-empty">No FRED energy series returned.</p>`;
  }

  if (etfEl) {
    etfEl.innerHTML = (data.etfs || [])
      .map(
        (e) => `<article class="mkt-card mkt-etf tilt-${e.tilt}">
          <div class="mkt-card-top">
            <span class="mkt-symbol">${e.symbol}</span>
            <span class="tilt-tag">${e.tilt}</span>
          </div>
          <div class="mkt-name">${e.name}</div>
          <div class="mkt-value">$${fmtNum(e.price)}</div>
          <div class="mkt-delta ${pctClass(e.changePct)}">${fmtPct(e.changePct)}</div>
        </article>`
      )
      .join("") || `<p class="markets-empty">No ETF quotes returned.</p>`;
  }

  if (newsEl) {
    newsEl.innerHTML = (data.news || [])
      .map((n) => {
        const href = n.url ? `href="${n.url}" target="_blank" rel="noopener noreferrer"` : "";
        const tag = n.symbol ? `<span class="news-sym">${n.symbol}</span>` : "";
        return `<li>
          ${tag}
          <a ${href}>${n.headline}</a>
          <span class="news-src">${n.source || ""}</span>
        </li>`;
      })
      .join("") || `<li class="markets-empty">No recent company news.</li>`;
  }
}

export async function initClimateMarkets() {
  const root = $("#climate-markets");
  if (!root) return;

  const status = $("#markets-status");
  chartDefaults();
  bindRangeToggles();

  try {
    if (status) status.textContent = "Loading live market data…";
    const res = await fetch("/api/climate-markets");
    const data = await res.json();

    if (!res.ok) {
      if (status) {
        status.textContent =
          data.hint || data.error || "Market APIs not configured yet.";
      }
      root.classList.add("markets-offline");
      return;
    }

    marketsData = data;

    const when = data.updatedAt
      ? new Date(data.updatedAt).toLocaleString(undefined, {
          dateStyle: "medium",
          timeStyle: "short",
        })
      : "";
    const src = Object.entries(data.sources || {})
      .filter(([, on]) => on)
      .map(([k]) => k.toUpperCase())
      .join(" · ");
    if (status) {
      status.textContent = `Updated ${when}${src ? ` · ${src}` : ""} · charts via secure proxy`;
    }

    renderCards(data);
    renderEnergyChart();
    renderRelativeChart();

    const chartsBlock = $("#markets-charts");
    if (chartsBlock) {
      chartsBlock.hidden = !(data.charts?.energy || data.charts?.relative);
    }
  } catch (err) {
    if (status) {
      status.textContent = `Could not load markets (${err.message}). Deployed APIs required.`;
    }
    root.classList.add("markets-offline");
  }
}
