#!/usr/bin/env node
// Erzeugt Screenshots des gebauten Marketplace (npm run build vorher). Ausgabe: --out <dir> (Default docs/).
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const i = process.argv.indexOf('--out');
const out = i > 0 ? process.argv[i + 1] : 'docs';
const dist = path.resolve('dist');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml' };
const server = createServer((req, res) => {
  const f = path.join(dist, decodeURIComponent(req.url.split('?')[0]) === '/' ? 'index.html' : decodeURIComponent(req.url.split('?')[0]));
  if (!f.startsWith(dist) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
}).listen(0);
const base = `http://127.0.0.1:${server.address().port}/`;
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
const detailId = process.env.DETAIL_ID || 'ris';
const prefix = process.env.PREFIX || 'marketplace';
const cmp = process.env.COMPARE_IDS || 'spusu-at,drei-at,magenta-at';
const shots = [['grid', ''], ['detail', `#/c/${detailId}`], ['detail-ampel', `#/c/${detailId}`, 'Ampel & Signale'], ['detail-server', `#/c/${detailId}`, 'Server & Technik'], ['detail-schnittstellen', `#/c/${detailId}`, 'Schnittstellen'], ['detail-gates', `#/c/${detailId}`, 'Qualität/Gates'], ['compare', `#/compare?ids=${cmp}`], ['dashboard', '#/dashboard'], ['dashboard-kpi', '#/dashboard', 'KPIs'], ['dashboard-server', '#/dashboard', 'Server, Schnittstellen & Gates']];
for (const [name, hash, tabName] of shots) {
  await page.goto(base + hash, { waitUntil: 'networkidle' });
  if (tabName) await page.getByRole('tab', { name: tabName }).click();
  for (let y = 0; y < 6000; y += 600) { await page.mouse.wheel(0, 600); await page.waitForTimeout(120); } // Lazy-Charts einblenden
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(out, `${prefix}-${name}.png`), fullPage: name !== 'grid' });
  console.log(path.join(out, `${prefix}-${name}.png`));
}
await browser.close(); server.close();
