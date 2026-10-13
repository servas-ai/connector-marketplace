#!/usr/bin/env node
// Lighthouse lokal gegen vite preview (npm run build vorher). Schwellen: a11y >= 90, best-practices >= 85, performance >= 60.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';
import { chromium } from 'playwright';

const PORT = 4180, url = `http://127.0.0.1:${PORT}/`;
const srv = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'], { stdio: 'ignore' });
for (let i = 0; i < 50; i++) { try { await fetch(url); break; } catch { await new Promise((r) => setTimeout(r, 300)); } }
const chrome = await chromeLauncher.launch({ chromePath: chromium.executablePath(), chromeFlags: ['--headless=new', '--no-sandbox'] });
const min = { accessibility: 90, 'best-practices': 85, performance: 60 };
let fail = false; const out = {};
for (const [name, hash] of [['grid', ''], ['dashboard', '#/dashboard']]) {
  const r = await lighthouse(url + hash, { port: chrome.port, output: 'json', logLevel: 'error', onlyCategories: Object.keys(min), formFactor: 'desktop', screenEmulation: { disabled: true } });
  out[name] = Object.fromEntries(Object.keys(min).map((k) => [k, Math.round(r.lhr.categories[k].score * 100)]));
  for (const [k, v] of Object.entries(out[name])) if (v < min[k]) fail = true;
}
fs.mkdirSync('reports', { recursive: true }); fs.writeFileSync('reports/lighthouse.json', JSON.stringify(out, null, 2));
console.log(JSON.stringify(out)); await chrome.kill(); srv.kill(); process.exit(fail ? 1 : 0);
