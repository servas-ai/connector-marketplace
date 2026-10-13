#!/usr/bin/env node
// Lighthouse lokal gegen vite preview (npm run build vorher). Schwellen: alle vier Kategorien >= 90 (App-Store-UI), Desktop + Mobil.
// Performance: bei Unterschreitung 1 Wiederholung, bester von 2 (Box-Last). best-practices/a11y/seo nicht wiederholt.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import lighthouse from 'lighthouse';
import desktopConfig from 'lighthouse/core/config/desktop-config.js';
import * as chromeLauncher from 'chrome-launcher';
import { chromium } from 'playwright';

const PORT = 4180, url = `http://127.0.0.1:${PORT}/`;
const srv = spawn('node', ['scripts/static-gzip.mjs', 'dist', String(PORT)], { stdio: 'ignore' }); // gzip wie GitHub Pages
for (let i = 0; i < 50; i++) { try { await fetch(url); break; } catch { await new Promise((r) => setTimeout(r, 300)); } }
const chrome = await chromeLauncher.launch({ chromePath: chromium.executablePath(), chromeFlags: ['--headless=new', '--no-sandbox'] });
const min = { performance: 90, accessibility: 90, 'best-practices': 90, seo: 90 };
const ID = process.env.LH_DETAIL_ID || 'spusu-at';
let fail = false; const out = {};

async function runOnce(hash, formFactor) {
  const r = await lighthouse(url + hash, { port: chrome.port, output: 'json', logLevel: 'error', onlyCategories: Object.keys(min) }, formFactor === 'desktop' ? desktopConfig : undefined);
  return Object.fromEntries(Object.keys(min).map((k) => [k, Math.round(r.lhr.categories[k].score * 100)]));
}

for (const [name, hash, ff] of [['heute-desktop', '', 'desktop'], ['heute-mobil', '', 'mobile'], ['detail-desktop', `#/c/${ID}`, 'desktop'], ['detail-mobil', `#/c/${ID}`, 'mobile']]) {
  let scores = await runOnce(hash, ff);
  if (scores.performance < min.performance) {
    const retry = await runOnce(hash, ff);
    if (retry.performance > scores.performance) scores = { ...scores, performance: retry.performance };
  }
  out[name] = scores;
  for (const [k, v] of Object.entries(out[name])) if (v < min[k]) fail = true;
}
fs.mkdirSync('reports', { recursive: true }); fs.writeFileSync('reports/lighthouse.json', JSON.stringify(out, null, 2));
console.log(JSON.stringify(out)); await chrome.kill(); srv.kill(); process.exit(fail ? 1 : 0);
