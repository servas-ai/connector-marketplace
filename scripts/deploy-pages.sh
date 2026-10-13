#!/usr/bin/env bash
# Deploy nach gh-pages NUR bei grünem Gate (lint, typecheck, vitest, build, Playwright inkl. axe/Bilder/Screenshot-Regression, Lighthouse >= 90).
# Danach Live-Check: HTTP 200 und Connector-Zahl der ausgelieferten Daten == count.
set -euo pipefail
cd "$(dirname "$0")/.."
[ "$(git rev-parse --abbrev-ref HEAD)" = main ] || { echo "nur von main deployen"; exit 1; }
npm run lint && npm run typecheck && npm test && npm run build && npx playwright test && npm run lighthouse
SHA=$(git rev-parse --short HEAD); TMP=$(mktemp -d)
git worktree add -q "$TMP" origin/gh-pages 2>/dev/null || git worktree add -q "$TMP" -B gh-pages
rsync -a --delete --exclude .git dist/ "$TMP/"; touch "$TMP/.nojekyll"
( cd "$TMP" && git add -A && git commit -qm "deploy: $SHA (Gate grün)" && git push -q origin HEAD:gh-pages ) || echo "nichts zu deployen"
git worktree remove --force "$TMP"
URL=https://servas-ai.github.io/connector-marketplace/
COUNT=$(node -e "console.log(require('./src/data/connectors.json').count)")
for i in $(seq 1 40); do
  if curl -fsS "${URL}llms-full.txt" | grep -q "Stand" && [ "$(curl -s -o /dev/null -w '%{http_code}' $URL)" = 200 ] && curl -fsS "${URL}llms.txt" | grep -q "Katalog von ${COUNT} "; then echo "live ok: ${COUNT} Connectoren"; exit 0; fi
  sleep 15
done
echo "Live-Check fehlgeschlagen"; exit 1
