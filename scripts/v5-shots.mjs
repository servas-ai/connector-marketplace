#!/usr/bin/env node
// Screenshots aller Seiten und Detail-Tabs (hell/dunkel). Nutzung: node scripts/v5-shots.mjs <baseUrl> <outDir> [detailId]
import { chromium } from 'playwright';
import fs from 'node:fs';
const [base = 'http://127.0.0.1:4189/', out = 'docs/screens', id = 'artifacthub'] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch();
const TABS = ['Übersicht', 'Routes', 'Screenshots', 'Installieren', 'Dev', 'Tests & Verlauf', 'Compliance & Lizenz', 'Alle Felder'];
const slug = (s) => s.toLowerCase().replace(/ü/g, 'ue').replace(/[^a-z]+/g, '-').replace(/-$/, '');
for (const theme of ['hell', 'dunkel']) {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 }, colorScheme: theme === 'dunkel' ? 'dark' : 'light' });
  await ctx.addInitScript((t) => localStorage.setItem('theme', t), theme === 'dunkel' ? 'dark' : 'light');
  const p = await ctx.newPage();
  for (const [n, h] of [['start', '#/'], ['vergleich', `#/compare?ids=${id},bfs-ch,aemo-au`], ['statistik', '#/dashboard'], ['agent', '#/agent']]) {
    await p.goto(base + h); await p.waitForLoadState('networkidle'); await p.waitForTimeout(500);
    await p.screenshot({ path: `${out}/v5-${n}-${theme}.png`, fullPage: n !== 'start' });
  }
  await p.goto(`${base}#/c/${id}`); await p.waitForLoadState('networkidle');
  for (const t of TABS) {
    const tab = p.getByRole('tab', { name: t, exact: true }); if (!(await tab.count())) continue;
    await tab.click(); await p.waitForLoadState('networkidle'); await p.waitForTimeout(400);
    await p.screenshot({ path: `${out}/v5-detail-${slug(t)}-${theme}.png`, fullPage: true });
  }
  await ctx.close();
}
const m = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 }); const mp = await m.newPage();
for (const [n, h] of [['start', '#/'], ['detail', `#/c/${id}`]]) { await mp.goto(base + h); await mp.waitForLoadState('networkidle'); await mp.screenshot({ path: `${out}/v5-mobil-${n}-hell.png` }); }
await b.close(); console.log('ok');
