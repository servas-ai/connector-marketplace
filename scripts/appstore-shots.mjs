#!/usr/bin/env node
// Screenshots der App-Store-UI: hell/dunkel × Desktop/Mobil × Heute/Detail. Ausgabe: --out (Default reports/screens).
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
const out = process.argv.includes('--out') ? process.argv[process.argv.indexOf('--out') + 1] : 'reports/screens';
const id = process.env.SHOT_ID || 'spusu-at';
fs.mkdirSync(out, { recursive: true });
const PORT = 4182; const srv = spawn('node', ['scripts/static-gzip.mjs', 'dist', String(PORT)], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 700));
const b = await chromium.launch();
for (const theme of ['hell', 'dunkel']) for (const [dev, vp] of [['desktop', { width: 1440, height: 1000 }], ['mobil', { width: 390, height: 844 }]]) {
  const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: 2, colorScheme: theme === 'dunkel' ? 'dark' : 'light', reducedMotion: 'reduce' });
  const p = await ctx.newPage();
  for (const [name, hash] of [['heute', ''], ['detail', `#/c/${id}`]]) {
    await p.goto(`http://127.0.0.1:${PORT}/${hash}`, { waitUntil: 'networkidle' }); await p.waitForTimeout(600);
    const f = path.join(out, `appstore-${name}-${dev}-${theme}.png`); await p.screenshot({ path: f, fullPage: dev === 'desktop' }); console.log(f);
  }
  await ctx.close();
}
await b.close(); srv.kill();
