# Savvy Climate Risk Monitor

Standalone climate risk intelligence platform — separate from [SavvyETF](https://github.com/parkwooyeol9/SavvyETF).

Interactive landing page + local portfolio dashboard for physical and transition risk, IPCC scenario analysis, and disclosure-ready reporting.

**Planned domain:** [SavvyClimateRiskMonitor.com](https://savvyclimateriskmonitor.com)

## Quick start

```bash
git clone <your-repo-url>
cd climate-risk-monitor
python3 -m http.server 8081
```

Open **http://localhost:8081** (ES modules require a local server; `file://` will not work).

## What's included (v1 demo)

### Landing page
- Hero with live-linked portfolio snapshot
- Physical vs. transition risk overview
- 12-hazard coverage grid
- SSP2-4.5 / SSP5-8.5 scenario comparison table
- Workflow + regulatory badges (TCFD, ISSB S2, CSRD, NGFS, SFDR)
- Waitlist form (client-side placeholder)

### Interactive dashboard
| Feature | Description |
|---|---|
| Scenario engine | SSP2-4.5 / SSP5-8.5 × 2030 / 2040 / 2050 |
| Geographic map | Leaflet + dark tiles, color-coded asset markers |
| 12 demo assets | Global portfolio across 7 regions |
| Charts | Risk trend, hazard breakdown, regional distribution |
| SSP compare | Side-by-side scenario bar chart per asset |
| Asset detail | Per-hazard score breakdown |
| Alerts feed | Sample climate risk notifications |
| Transition panel | Carbon price, stranded assets, disorderly VaR |
| CSV export | Download filtered portfolio with hazard scores |

## Project structure

```
climate-risk-monitor/
├── index.html          # Landing page + dashboard shell
├── css/styles.css      # Styles
├── js/
│   ├── data.js         # Demo portfolio + scenario engine
│   ├── dashboard.js    # Map, charts, filters, export
│   └── main.js         # App bootstrap
└── README.md
```

## Stack

Static HTML, CSS, vanilla JS (ES modules). CDN: Leaflet, Chart.js, Google Fonts. No build step, no API keys required for the demo.

## Deploy (when ready)

1. Push to GitHub
2. Connect to [Vercel](https://vercel.com) or [Netlify](https://netlify.com) (free)
3. Point `SavvyClimateRiskMonitor.com` DNS to the host

## Roadmap

See [Development recommendations](#development-recommendations) in issues or project board.

### Phase 1 — Ship the demo
- [ ] GitHub repo + CI (lint HTML, deploy preview)
- [ ] Vercel/Netlify deploy + custom domain
- [ ] Waitlist backend (Formspree or Resend)

### Phase 2 — Real data
- [ ] Open climate APIs (Open-Meteo, NASA POWER, Copernicus)
- [ ] Geocoding (Nominatim or Mapbox)
- [ ] Replace mock scenario engine with documented methodology

### Phase 3 — Product
- [ ] Portfolio CSV upload + persistence
- [ ] User auth + saved portfolios
- [ ] PDF / ISSB S2 report export

## License

TBD

## Disclaimer

Demo data only. Not financial or insurance advice.
