# Savvy Climate Risk Monitor

Standalone climate risk intelligence platform — separate from [SavvyETF](https://github.com/parkwooyeol9/SavvyETF).

Interactive landing page + local portfolio dashboard for physical and transition risk, IPCC scenario analysis, and disclosure-ready reporting.

**Live site:** [https://climate-risk-monitor.vercel.app](https://climate-risk-monitor.vercel.app)  
**Planned domain:** [SavvyClimateRiskMonitor.com](https://savvyclimateriskmonitor.com)

## Quick start

```bash
git clone https://github.com/parkwooyeol9/SavvyClimateRiskMonitor.git
cd SavvyClimateRiskMonitor
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
├── vercel.json         # Vercel static deploy config
├── css/styles.css      # Styles
├── js/
│   ├── data.js         # Demo portfolio + scenario engine
│   ├── dashboard.js    # Map, charts, filters, export
│   └── main.js         # App bootstrap
└── README.md
```

## Stack

Static HTML, CSS, vanilla JS (ES modules). CDN: Leaflet, Chart.js, Google Fonts. No build step, no API keys required for the demo.

## Deploy (Vercel)

**Production:** https://climate-risk-monitor.vercel.app  
**Project:** https://vercel.com/s-quant/climate-risk-monitor

Config: [`vercel.json`](./vercel.json) — static site, no build step, security + cache headers.

### Redeploy

```bash
npm install
npx vercel --prod
```

### Custom domain (`SavvyClimateRiskMonitor.com`)

1. Buy the domain at your registrar
2. Vercel → project → **Settings → Domains** → add the domain
3. Set DNS as Vercel instructs (`A` / `CNAME`)
4. Wait for SSL

### Phase 1 — Ship the demo
- [x] Vercel deploy config (`vercel.json`)
- [x] Production deploy (climate-risk-monitor.vercel.app)
- [ ] GitHub repo connected for auto-deploy
- [ ] Custom domain
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
