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

function downsample(labels, values, maxPoints = 90) {
  if (!labels?.length || labels.length <= maxPoints) {
    return { labels, values };
  }
  const step = Math.ceil(labels.length / maxPoints);
  const outL = [];
  const outV = [];
  for (let i = 0; i < labels.length; i += step) {
    outL.push(labels[i]);
    outV.push(values[i]);
  }
  if (outL[outL.length - 1] !== labels[labels.length - 1]) {
    outL.push(labels[labels.length - 1]);
    outV.push(values[values.length - 1]);
  }
  return { labels: outL, values: outV };
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

function chartOptsBase() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    layout: { padding: { top: 4, right: 8, bottom: 0, left: 4 } },
    interaction: { mode: "index", intersect: false },
  };
}

function renderEnergyChart() {
  const canvas = $("#chart-energy");
  if (!canvas || typeof Chart === "undefined" || !marketsData?.charts?.energy) return;

  // Prefer WTI only — dual-axis oil+gas looks broken/oversized on one panel
  const series = marketsData.charts.energy.series || [];
  const primary =
    series.find((s) => s.id === "DCOILWTICO") || series[0];
  if (!primary) return;

  energyChart = destroyChart(energyChart);

  let p = sliceByRange(primary.labels, primary.values, energyRange);
  p = downsample(p.labels, p.values, 80);

  energyChart = new Chart(canvas, {
    type: "line",
    data: {
      labels: p.labels,
      datasets: [
        {
          label: `${primary.label} (${primary.unit})`,
          data: p.values,
          borderColor: primary.color || "#fbbf24",
          backgroundColor: "rgba(251,191,36,0.12)",
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.2,
          fill: true,
        },
      ],
    },
    options: {
      ...chartOptsBase(),
      plugins: {
        legend: { display: false },
        title: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => `${fmtNum(ctx.parsed.y)} ${primary.unit || ""}`,
          },
        },
      },
      scales: {
        x: {
          ticks: {
            maxTicksLimit: 4,
            font: { size: 9 },
            autoSkip: true,
            maxRotation: 0,
            callback(v) {
              const l = this.getLabelForValue(v);
              return typeof l === "string" ? l.slice(2, 7) : l;
            },
          },
          grid: { display: false },
        },
        y: {
          ticks: { maxTicksLimit: 4, font: { size: 9 } },
          title: {
            display: true,
            text: primary.unit || "USD",
            font: { size: 9 },
          },
          grid: { color: "rgba(148,163,184,0.08)" },
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
  const sliced = sliceByRange(labels, labels, relativeRange);
  const slicedLabels = sliced.labels;
  const startIdx = labels.length - slicedLabels.length;

  const sampledMeta = downsample(
    slicedLabels,
    slicedLabels.map((_, i) => i),
    80
  );
  const chartLabels = sampledMeta.labels;
  const pickIdx = sampledMeta.values;

  const datasets = series.map((s) => {
    const raw = s.values.slice(startIdx);
    const picked = pickIdx.map((i) => raw[i]);
    const first = picked.find((v) => v != null && Number.isFinite(v));
    const base = first || 100;
    return {
      label: s.symbol,
      data: picked.map((v) => (v == null ? null : (v / base) * 100)),
      borderColor: s.color,
      borderWidth: 2,
      pointRadius: 0,
      tension: 0.2,
      fill: false,
    };
  });

  relativeChart = new Chart(canvas, {
    type: "line",
    data: { labels: chartLabels, datasets },
    options: {
      ...chartOptsBase(),
      plugins: {
        legend: {
          position: "top",
          labels: { boxWidth: 8, boxHeight: 8, font: { size: 9 }, padding: 6 },
        },
        title: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.dataset.label}: ${fmtNum(ctx.parsed.y, 1)}`,
          },
        },
      },
      scales: {
        x: {
          ticks: {
            maxTicksLimit: 4,
            font: { size: 9 },
            autoSkip: true,
            maxRotation: 0,
            callback(v) {
              const l = this.getLabelForValue(v);
              return typeof l === "string" ? l.slice(2, 7) : l;
            },
          },
          grid: { display: false },
        },
        y: {
          ticks: { maxTicksLimit: 4, font: { size: 9 } },
          title: {
            display: true,
            text: "Index 100",
            font: { size: 9 },
          },
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

  // Compact table — no sparklines (they were blowing layout on some browsers)
  if (energyEl) {
    const rows = data.energy || [];
    energyEl.innerHTML = rows.length
      ? `<div class="fred-table-wrap"><table class="fred-table">
          <thead><tr><th>Series</th><th>Latest</th><th>Δ</th><th>As of</th></tr></thead>
          <tbody>
            ${rows
              .map(
                (s) => `<tr>
                  <td>${s.label}<div class="fred-unit">${s.unit || ""}</div></td>
                  <td class="fred-num">${fmtNum(s.value)}</td>
                  <td class="fred-num ${pctClass(s.changePct)}">${fmtPct(s.changePct)}</td>
                  <td class="fred-date">${s.date || ""}</td>
                </tr>`
              )
              .join("")}
          </tbody>
        </table></div>`
      : `<p class="markets-empty">No FRED energy series returned.</p>`;
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
    if (status) status.textContent = "Fetching live market data…";
    const res = await fetch(`/api/climate-markets?t=${Date.now()}`);
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

    // IMPORTANT: unhide first, then draw — Chart.js mis-sizes inside [hidden]
    const chartsBlock = $("#markets-charts");
    const hasCharts = Boolean(data.charts?.energy || data.charts?.relative);
    if (chartsBlock) {
      chartsBlock.hidden = !hasCharts;
    }

    if (hasCharts) {
      requestAnimationFrame(() => {
        renderEnergyChart();
        renderRelativeChart();
        energyChart?.resize?.();
        relativeChart?.resize?.();
      });
    }
  } catch (err) {
    if (status) {
      status.textContent = `Could not load markets (${err.message}). Deployed APIs required.`;
    }
    root.classList.add("markets-offline");
  }
}
