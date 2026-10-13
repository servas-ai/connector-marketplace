# UX-Konzept v5: Connector Marketplace (App-Store-Aufbau auf shadcn/ui)

Stand: 2026-10-13. Ziel: ein Katalog, in dem man in 10 Sekunden entscheiden kann, ob ein Connector **heute** verlässlich echte Daten liefert, und in 60 Sekunden, wie man ihn einbindet.

## 1. Leitlinien

1. **Nur echte Werte.** Jede Zahl stammt aus `connectors.json` (Sync aus `opencli-connectors/index.json`, KPI-Ranking, Prüfprotokolle), aus dem Echtheits-Audit (`audit/out/*.json`: echter Live-Aufruf je Route) oder aus dem llms.txt-Check. Fehlt ein Wert, steht „–“ bzw. der Block wird ausgeblendet. Kein Platzhalter-Screenshot, keine geschätzten Zahlen.
2. **Jede Zahl hat einen Zeitstempel.** „92 %“ ohne „gemessen vor 3 h“ ist wertlos. Relativ anzeigen, absolut im Tooltip/`<time>`.
3. **Ampel immer mit Begründung.** Gelb/Rot zeigt die Gründe (`ampel.reasons`) direkt daneben.
4. **Ein einheitliches UI im App-Store-Design, keine 1:1-Kopie.** App-Store-Aufbau (Karten-Raster, großes Logo, Kennzahlenleiste unter dem Kopf, Tabs, Reihen „Mehr aus dieser Kategorie“), aber durchgängig aus shadcn/ui-Bausteinen (Card, Badge, Tabs, Table, Button, Input; Stil ReUI/OpenUI) mit einem gemeinsamen Token-Satz. Alle Seiten (Start, Detail, Vergleich, Statistik) nutzen dieselben Komponenten.
5. **Dark/Light** gleichwertig, WCAG AA, Lighthouse ≥ 90 in allen Kategorien.

## 2. Keine Eitelkeitszahlen

**Sterne und Bewertungen werden komplett entfernt.** Ebenso gestrichen: „Live-Märkte“-Sektion/-Spalte, Gesamt-„Datensätze“-Summe (Summe über heterogene Quellen ist bedeutungslos), Anzahl Kategorien, „Downloads“.

## 3. Globale KPIs (Startseite, KPI-Leiste)

| KPI | Definition | Quelle | Warum |
|---|---|---|---|
| Connectoren | `dataset.count` | connectors.json | Katalogumfang, Abgleich mit index.json im Live-Check |
| Grüne Ampel | Anteil `ampel.level == green` | connectors.json | Verlässlich nutzbar |
| Live verifiziert | Audit-Urteil `echt_gruen` / auditierte | Echtheits-Audit | Trennt echte von nur behaupteten Grünen |
| Median p50-Latenz | Median `kpi.p50` | KPI-Ranking | Typische Antwortzeit |
| Ohne Login | Anteil `loginRequired == false` | connectors.json | Sofort nutzbar |
| Datenstand | `sourceGeneratedAt` relativ | connectors.json | Frische des Katalogs |

## 4. KPIs pro Connector

| KPI | Definition | Quelle |
|---|---|---|
| Ampel + Begründung | `ampel.level`, `ampel.reasons[]` | Index |
| Live-Erfolgsrate | bestandene/gesamte Audit-Läufe (`live_ok`), dazu E2E `e2ePassed/e2eTotal` | Audit, Prüfprotokoll |
| Stabilität | `kpi.stability` (Anteil erfolgreicher Läufe im KPI-Fenster) | KPI-Ranking |
| Uptime | `signals.uptime` aus Beobachtungen | Signals |
| Latenz p50/p95 | `kpi.p50`, `kpi.p95`; je Route `ms` des letzten Audit-Laufs | KPI, Audit |
| Letzte erfolgreiche Prüfung je Route | Audit `audited_at` + `ok` je Fall | Audit |
| Datenfrische | jüngstes Datum in den Daten (`latest_date`) je Route | Audit |
| Schema-Konformität | Läufe ohne `servas.record.v1`-Fehler | Audit |
| Zugriffsart | `interfaces.access` (offene API / HTML / Key …) | Enrich |
| robots.txt, Captcha, Login | `robots`, `captcha`, `loginRequired` | Index |
| Version, Commit, Changelog | `package.json` + `git log` des Connector-Pfads | Repo |
| Lizenz | `license` aus index.json, sonst „unbekannt“ | Index |

Hinweis „7-Tage-Erfolgsrate“: Eine echte Zeitreihe je Route gibt es noch nicht (Audit = Einzellauf, KPI-Fenster = Stabilität). Die UI zeigt deshalb ehrlich „Stabilität (KPI-Fenster)“ und „letzter Live-Lauf“, bis die Beobachtungs-Historie je Route (`signals`) täglich geschrieben wird. Danach: Sparkline 7 Tage je Route.

## 4b. Kategorien-Taxonomie (statt Ordnernamen)

Ordner (`strom`, `mobil`, `register-at`, `opendata` …) werden auf 12 Kategorien mit lucide-Icon abgebildet:
Energie (Zap), Telekom & Internet (Wifi), Finanzen & Krypto (Landmark), Statistik (BarChart3), Open Data (Database), Register & Firmen (Building2), Recht & Vergabe (Scale), Gesundheit (HeartPulse), Umwelt, Wetter & Geo (CloudSun), Mobilität (TrainFront), Entwickler & Pakete (Code2), Shopping & Preise (ShoppingCart), Wissenschaft & Kultur (BookOpen), Sonstige (Shapes). Zuordnung per Ordner + Stichworten in Beschreibung/ID, testbar in `src/lib/taxonomy.ts`.

## 5. Informationsarchitektur

- **Start (`/`)**: Kopf mit Suche, KPI-Leiste (6 Werte, s. o.), Filterleiste (Kategorie, Land, Ampel, Zugriff, Fähigkeiten als Toggle-Chips: MCP, CLI, ohne Login, llms.txt, OpenAPI, Screenshot), Sortierung (Empfehlung, Latenz, Stabilität, Name), Karten-Raster. Karte: Logo 48 px, Titel, Domain, Ampel-Badge, 3 Fähigkeits-Icons, p50, letzter Lauf.
- **Detail (`/c/:id`)**: Kopf (Logo 96 px, Titel, Domain, Kategorie, Land, Ampel-Badge mit Gründen, Version, „Installieren“-Button springt in Dev-Tab), Kennzahlenleiste (Live-Erfolg, Stabilität, p50/p95, letzter Lauf, Datenfrische), dann Tabs:
  1. **Übersicht**: Beschreibung, Fähigkeiten-Checkliste mit grünen `CheckCircle2` (MCP, CLI, HTTP/API, Suche, Detail, Export, ohne Login, robots ok, llms.txt), graue `XCircle`/`MinusCircle` für nein/unbekannt; Abdeckung/Lücken.
  2. **Routes**: Tabelle der Befehle (Audit-Läufe: Status-Badge, zuletzt getestet relativ + absolut, Latenz, Datensätze, Datenstand, Schema) und der HTTP-Routen aus dem Index (Methode, URL, Art).
  3. **Screenshots**: echte Screenshots der Quellseite aus dem Audit (Playwright, robots.txt-konform, Captcha-Seiten verworfen) mit Aufnahmezeit. Ohne Screenshot wird der Tab **nicht** angezeigt.
  4. **Dev**: Version, Commit (Link), Installations-Snippets MCP/CLI/HTTP mit Kopieren, Schema `servas.record.v1`, Zugriffskette, Server/ASN/CDN/WAF, Captcha, Links robots.txt / llms.txt / OpenAPI, Manifest-JSON (nachgeladen).
  5. **Tests & Verlauf**: Audit-Urteil + Flags, E2E-Ergebnis, Gate-Ergebnis (`gates`), Beobachtungs-Signale (ok/403/429/captcha/timeout), Changelog (letzte Commits).
  6. **Lizenz & Quelle**: Lizenz, Quelle/Homepage, robots.txt-Status und -Notiz, Betreiber-Typ, Nutzungshinweis.
- **Detail, „Alle Felder“**: Jedes gespeicherte Index- und Manifest-Feld wird angezeigt (Schlüssel/Wert-Baum, Manifest nachgeladen). Je Route: Aufrufbeispiel (CLI/HTTP), Felder der Beispielantwort, echte Beispielantwort aus `samples/` bzw. dem Audit-Lauf (gekürzt).
- **Installieren / Agent-Prompt**: pro Connector ein fertiger System-Prompt mit Kopierknopf (Zweck, Bezug: Repo/Pfad/git, Installation, Aufruf MCP/CLI/HTTP, Routen + Parameter, Grenzen robots/Rate-Limit/Captcha, Ausgabeschema `servas.record.v1`). Global: `/agent` mit Katalog-Prompt und `llms.txt` + `llms-full.txt` der Seite selbst (generiert beim Build).
- **Vergleich (`/compare`)**: 2–4 Connectoren nebeneinander, Zeilen gruppiert: Status & KPIs (Ampel, Live-Erfolg, Stabilität, p50/p95, Datenfrische, letzte Prüfung, Routenzahl), Fähigkeiten (grüne Haken), Zugriff & Grenzen, Lizenz, Server/CDN. Bester Wert je Zeile hervorgehoben. Keine Live-Märkte.
- **Statistik (`/dashboard`)**: Wachstum grüner Connectoren (Timeline), Verteilung Kategorie/Land/Zugriffsart, Ampel-Verteilung + häufigste Gründe, Erfolgsrate- und Latenz-Histogramm, robots/llms.txt/OpenAPI-Abdeckung, Logo-/Screenshot-Abdeckung, häufigste Fehler (Audit-Flags, Gate-Codes), Hoster/CDN/ASN, Captcha-Typen.

## 6. Performance

`connectors.json` + kompakte `extras.json` im Bundle (für Filter), Detail-Daten (`public/x/<id>.json`, Manifest) werden pro Seite nachgeladen. Screenshots als WebP, `loading="lazy"`.

## 7. Qualitäts-Gate (Deploy nur bei Grün)

1. lint, typecheck, vitest
2. Playwright-E2E: alle Tabs, Filter, Suche; axe WCAG 2 A/AA hell + dunkel
3. Bild-Gate: keine kaputten `<img>` (naturalWidth > 0) auf Start + 20 Detailseiten, kein Platzhalter-Screenshot, Tab „Screenshots“ nur wenn Bild existiert
4. Screenshot-Regression: Playwright `toHaveScreenshot` für Start/Detail hell/dunkel (Baseline im Repo, Toleranz 2 %)
5. Lighthouse ≥ 90 (Performance, A11y, Best Practices, SEO), Desktop + Mobil
6. Deploy auf `gh-pages` nur über `scripts/deploy-pages.sh`, das 1–5 ausführt und abbricht, wenn etwas rot ist
7. Live-Check danach: HTTP 200, angezeigte Connector-Zahl == `count` in der ausgelieferten Datenbasis == index.json-Abgleich
