# Worker-306: Suche und Vierer-Vergleich

Stand: 13.10.2026. Teilpaket von Epic #6; Arbeitspaket #8. **Kein Gesamtpass, kein Deployment, kein eigener Merge.**

## Basis und Abgrenzung

Eigener Branch `worker-306/marketplace-search-compare`, basiert auf dem unveränderten Head von PR #7:
`70d1ab490ce1db3fd9d06d60766d140307f1fcf7` (Tree `bbfbbaebf1c4736b1ecd95b50cd9955e3b3c3b5f`).
Der Review-Diff muss gegen `feat/ampel-server-stats` erfolgen, nicht gegen `main`; sonst enthält er fremde Änderungen aus #1/#3/#7.
Nach deren Squash-Merges: eigener Branch rebasen, Zielbasis aktualisieren und sämtliche Gates wiederholen. Kein fremder Branch wurde geändert.
`src/data/connectors.json`, Monitoring, Connectoren und Credentials bleiben unverändert. Es gibt keine neuen Dependencies, Konten, Scrapes oder externen Aufrufe.

## Umgesetzt

- Vorbereiteter Suchindex statt wiederholter Textnormalisierung: Mehrwort-UND über Name, Domain, Beschreibung, Kategorie, Land, Quellentyp, Hoster und Kommandos; Groß-/Kleinschreibung, Akzente und ß normalisiert.
- 14 fachliche Facetten: Kategorie, Land, Login, Status, robots.txt, Captcha, Ampel, API, Quellentyp, Hoster, Server-Land, CDN, Gates, Paperclip. Facettenzahlen bezeichnen ausdrücklich den Gesamtkatalog, nicht eine kontextuelle Restmenge.
- Unbekannt bleibt getrennt von Ja/Nein; Null, NaN und Infinity werden nicht als Messung sortiert. p50=0 bleibt eine gültige Messung. Gleichstände haben eine reproduzierbare ID-Reihenfolge.
- URL-Vertrag mit Allowlist und begrenzter Suchlänge. Dynamische Werte sind `v:<Wert>`; alte Links wie `country=AT`/`status=failing` werden weiterhin verstanden. Ungültige Facettenwerte fallen auf Alle zurück. Fremde Parameter werden nicht in generierte Links kopiert.
- Vergleich mit bis zu vier eindeutigen, im Katalog vorhandenen IDs. Validierung erfolgt VOR dem Limit. Auswahl bleibt bei Filtern, Reload und dem Rücklink erhalten. Fünfte Auswahl wird mit sichtbarem Hinweis gesperrt; Entfernen bleibt möglich.
- Höchstens 24 Karten pro Ergebnisseite, URL-Pagination mit begrenzten Seitenwerten, Ergebnisansage und Fokusübergabe; native Tastaturbedienung, keine überlagernden Auswahlcheckboxen mehr.
- Vergleichstabelle: `null` wird nicht mehr zu „ohne Login“/„kein Captcha“. Fehlende Schnittstellen sind Unbekannt statt Nein. Tabellenüberschriften, Caption, horizontal fokussierbarer Scrollbereich und beschriftete Entfernen-Tasten.
- `npm test` führt künftig auch `npm run test:catalog` aus; die bestehende Vitest-Suite bleibt nachgeschaltet. Keine bestehenden Gates entfernt oder gelockert.

## Tatsächlich ausgeführt

`npm run test:catalog`: **38 bestanden, 0 fehlgeschlagen, 0 übersprungen**, Node 22.16.0. Die synthetischen Fixtures liegen ausschließlich unter `tests/`; keine Live-Samples wurden erfunden oder Produktdaten ersetzt.

Letzter protokollierter 1500-Datensatz-Lauf: 100 gemessene Suchen nach 10 Warmups, Indexaufbau 10.51 ms, p95 1.31 ms, Maximum 2.54 ms. Gemessen werden Parsing, vorbereitete Suche, Sortierung und Seitenauswahl in Node. **Keine Aussage über Browser-Rendering, Endgerät-Latenz oder Lighthouse.**

Zusätzlich bestanden:
- Strikter isolierter TypeScript-Check des neuen Kernmoduls mit dem vorhandenen Compiler **5.8.3**, gegen den unveränderten `types.ts`-Blob `6eb7bfcddf9bb637fdc013cc0b047094f7f68b53`.
- Syntax-/Transpilerprüfung von fünf TS/TSX-Dateien: 0 Diagnosen. Das ist KEIN vollständiger React-Typecheck.
- `node --check tests/catalog.node.mjs`, JSON-Parsing und Whitespace-/NUL-Prüfung.

Maschinenlesbarer Nachweis und Quell-Hashes: `worker-306-evidence.json` neben diesem Bericht. Der lokale TAP-Lauf wird zusätzlich im Chat-Artefakt beigelegt.

## Nicht ausgeführt / Merge-Blocker

Der Terminal-Connector scheiterte zweimal mit Verbindungsfehlern. Der Container kann GitHub und npm nicht per DNS erreichen; der vollständige Checkout und die gelockten Dependencies sind deshalb hier nicht ausführbar. Nicht als grün bewiesen sind: vollständiges `npm test`/Vitest, Projekt-Typecheck mit TypeScript 6.0.3, ESLint, Vite-Build, Playwright, axe, Lighthouse und gitleaks.

Vier zusätzliche React-Regressionstests und **16 Browserfälle** (8 Szenarien × Desktop/Mobile) sind geschrieben, aber nicht ausgeführt. Die Browserfälle prüfen auch axe **ohne ausgeschlossene Kontrastprüfung**, blockieren externe Requests und erstellen erst im echten Lauf Screenshots. **Es wurden keine neuen UI-Screenshots erzeugt.** Vorhandene Screenshots aus fremden PRs sind kein Nachweis dieses Branches.

PR #7 Head hat beim Abruf **0 Check-Runs und 0 Commit-Statuses**. Die PR-Beschreibung meldet lokale Ergebnisse, aber Performance 75/74 statt Epic-Ziel 95. Das ist keine unabhängige Mergefreigabe. Teilreview fand konkret:
1. `Compare.tsx` nutzte Truthiness für nullable Login/Captcha und zeigte unbekannt als nein.
2. Doppelte/fehlende URL-IDs belegten Vergleichsplätze; Limit war drei statt vier, ohne sichtbares Limitfeedback.
3. Die Grid-Auswahl ging beim Routenwechsel verloren; die gesamte Ergebnisliste wurde ohne Begrenzung gerendert.
Diese Punkte werden in diesem eigenen Slice behandelt; andere Bereiche von #7 sind damit nicht umfassend reviewt.

## Reproduktion im vollständigen Checkout

Node >=22.6 ist für den zusätzlichen Type-Stripping-Test erforderlich. Keine Pakete wurden hierfür hinzugefügt.

```sh
npm ci
npm run test:catalog
npm run lint
npm run typecheck
npm test
npm run build
npm run e2e -- e2e/catalog.spec.ts
npm run lighthouse
```

Zusätzlich gitleaks nach Squad-Regeln für die Commit-Spanne ausführen. `npm run gates` bleibt die bestehende Gesamtpipeline. Ein grüner Unit-Lauf allein erfüllt sie nicht.

## Weitere Aufgaben unter #6

- Stack-Rebase und vollständige Gate-Abnahme, mindestens 40 E2E insgesamt, Desktop-/Mobile-Screenshots, axe=0, Lighthouse >=95 in allen vier Kategorien.
- Dark-Mode, de/en und Dashboard-Ziel >=12 Charts gegen die tatsächlich integrierte Basis prüfen und offene Arbeit verteilen.
- Gemeinsame modulare Filter-API mit den älteren Exporten aus `lib/data.ts` konsolidieren: diese bleiben für bestehende Konsumenten unverändert; die neue UI verwendet ausschließlich `lib/catalog.ts`.
- Bei einem späteren Remote-/Live-Datasetwechsel Index genau einmal pro Datenrevision neu erstellen; der aktuelle Katalog ist ein unveränderlicher Build-Snapshot.

Grundlagen: `opencli-connectors/docs/WORKER_PROMPT.md`, `docs/MASTER_ARCHITECT_PROMPT.md`, `docs/QUALITY_GATES.md`, Koordination #37. Referenzen zur verwendeten Laufzeit: https://reactrouter.com/api/hooks/useSearchParams und https://nodejs.org/download/release/v22.17.0/docs/api/cli.html#--experimental-strip-types .
