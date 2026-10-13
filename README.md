# 🛒 Connector Marketplace

Standalone-Katalog aller servas-ai-Connectoren: Logo-Grid, Suche, Filter, KPI-Detailseiten, Dashboard. Ohne Backend, liest nur `src/data/connectors.json`.

![Grid](docs/marketplace-grid.png)

| | |
|---|---|
| 📦 Stack | Vite · React 19 · TypeScript · Tailwind v4 · shadcn/ui · [OpenUI](https://github.com/thesysdev/openui) (`@openuidev/react-lang`) · Recharts |
| 🔄 Daten | `npm run sync` → `scripts/sync-data.mjs` liest [`opencli-connectors`](https://github.com/servas-ai/opencli-connectors): `index.json`, `kpi/ranking.csv`, `SKILL.md`-Frontmatter, `PRUEFPROTOKOLL.md`, Logos |
| 🔍 Filter | Kategorie · Land · Login · Status · robots.txt · Captcha · Sortierung nach KPI |
| 📊 KPIs | Stabilität · p50/p95 · Throughput · Captcha-Rate · Login · API-Version · letzter Scrape · Datenqualität · robots.txt · Incidents |
| 🔐 Paperclip-Regeln | Vertrauensklasse 1 (statischer read-only Katalog, paperclip #55), kein Install-Button, `UNKNOWN` statt geratener Werte (#52/#64) |

## Start
```bash
npm ci
npm run sync -- --src ../opencli-connectors   # optional, sonst Clone
npm run dev          # http://localhost:5173
npm run lint && npm test && npm run build
npm run screenshot   # Playwright → docs/marketplace-*.png
```

## OpenUI
Die KPI-Ansicht ist eine OpenUI-Bibliothek (`src/openui/library.tsx`: `Panel`, `KpiGrid`, `Kpi`, `Notice` auf shadcn-Basis). Die Detailseite erzeugt daraus deterministisch OpenUI Lang und rendert es mit `<Renderer>`. `library.prompt()` liefert den Systemprompt, damit ein Agent später eigene Connector-Ansichten generieren kann, ohne fremden Code auszuführen.

## robots.txt
Wird nur angezeigt („offiziell nicht erlaubt“), nicht gefiltert oder blockiert. Quelle ist das Prüfprotokoll; fehlt es, steht `UNKNOWN`.

| Detail | Dashboard |
|---|---|
| ![Detail](docs/marketplace-detail.png) | ![Dashboard](docs/marketplace-dashboard.png) |

Änderungen nur per PR.

CI-Workflow liegt in `ci/ci.yml` (Token ohne `workflow`-Scope); nach `gh auth refresh -s workflow` nach `.github/workflows/` verschieben.

## Anreicherung & Quality-Gates (v2)
- `npm run enrich`: passiv über die webintel-Connectoren aus opencli-connectors (`dns`, `ip-geo`, `rdap`, `ct-certspotter`, `webtech`). Höchstens 1 Request pro Ziel-Host, robots.txt wird vorher geprüft, Drittanbieter-APIs ≥ 1,1 s Abstand, Ergebnisse in `data/enrich-cache.json`. `--offline` nutzt nur Cache und Snapshots.
- Daten pro Connector: `server` (Hoster/ASN/Land, CDN, Webserver, CMS, TLS-Aussteller, Domain-Alter), `sourceType`, `interfaces` (API offen/Key, OGD-Dump, Feed, JSON-Backend, MCP, CLI, OpenCLI, Paperclip, Playwright, PDF), `gates` aus `check_connectors.py --strict` (`data/gates.snapshot.json`), Quellen-Matrix aus `data/sources.snapshot.json` (opencli-connectors #31).
- Gates lokal: `npm run gates` = Lint, Typecheck, vitest, Playwright-Smoke + axe (WCAG 2 A/AA), Lighthouse (a11y ≥ 90, best-practices ≥ 85, perf ≥ 60). `ci/ci.yml` ist vorbereitet (aktivieren nach `gh auth refresh -s workflow`).
- Grenzen: `.at`/`.gv.at` haben kein RDAP, daher kein Domain-Alter; Cert Spotter ist ohne Key rate-limitiert (429), fehlende Werte stehen als `UNKNOWN`.
