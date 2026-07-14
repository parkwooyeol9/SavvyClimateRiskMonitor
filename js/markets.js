/** Live climate-finance markets panel — fetches /api/climate-markets */

const $ = (sel) => document.querySelector(sel);

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

export async function initClimateMarkets() {
  const root = $("#climate-markets");
  if (!root) return;

  const status = $("#markets-status");
  const energyEl = $("#markets-energy");
  const etfEl = $("#markets-etfs");
  const newsEl = $("#markets-news");
  const signalEl = $("#markets-signal");

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
    if (status) status.textContent = `Updated ${when}${src ? ` · ${src}` : ""}`;

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
  } catch (err) {
    if (status) status.textContent = `Could not load markets (${err.message}). Deployed APIs required.`;
    root.classList.add("markets-offline");
  }
}
