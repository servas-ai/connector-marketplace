#!/usr/bin/env node
/** Kopiert src/data/connectors.json → public/data/ (kompakt, ohne UI-unbenutzte Felder). */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(ROOT, 'src/data/connectors.json');
const destDir = path.join(ROOT, 'public/data');
if (!fs.existsSync(src)) { console.error('fehlt:', src); process.exit(1); }
const data = JSON.parse(fs.readFileSync(src, 'utf8'));
for (const c of data.connectors) {
  delete c.robotsNote;
  // leere Arrays/Nulls weglassen spart Bytes
  if (Array.isArray(c.incidents) && c.incidents.length === 0) delete c.incidents;
  if (Array.isArray(c.commands) && c.commands.length === 0) delete c.commands;
  if (c.apiVersion == null) delete c.apiVersion;
  if (c.apiAvailable == null) delete c.apiAvailable;
  if (c.covered == null) delete c.covered;
  if (c.gaps == null) delete c.gaps;
  if (c.features == null) delete c.features;
  if (c.urls == null) delete c.urls;
  if (!c.screenshot) delete c.screenshot;
  if (!c.logo) delete c.logo;
}
fs.mkdirSync(destDir, { recursive: true });
const out = path.join(destDir, 'connectors.json');
fs.writeFileSync(out, JSON.stringify(data));
const gz = (await import('node:zlib')).gzipSync(fs.readFileSync(out));
console.log('public/data/connectors.json', fs.statSync(out).size, 'bytes (gzip ~' + gz.length + ')');
