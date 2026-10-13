#!/usr/bin/env node
/**
 * Publiziert Katalog-Daten für den Browser (nicht im JS-Bundle):
 *   public/data/list.json        – kompakte Liste für Startseite / Erst-Paint
 *   public/data/connectors.json  – voller Katalog (Detail/Dashboard/Vergleich)
 *   public/data/extras.json      – Audit-/Lizenz-Kurzinfos (lazy, parallel)
 */
import fs from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(ROOT, 'src/data/connectors.json');
const extrasSrc = path.join(ROOT, 'src/data/extras.json');
const destDir = path.join(ROOT, 'public/data');
if (!fs.existsSync(src)) { console.error('fehlt:', src); process.exit(1); }

const data = JSON.parse(fs.readFileSync(src, 'utf8'));
const extras = fs.existsSync(extrasSrc) ? JSON.parse(fs.readFileSync(extrasSrc, 'utf8')) : { growth: [], connectors: {} };
const EU = new Set('AT BE BG HR CY CZ DK EE FI FR DE GR HU IE IT LV LT LU MT NL PL PT RO SK SI ES SE IS LI NO'.split(' '));

function commercial(lic) {
  if (!lic) return 'prüfen';
  if (/\bNC\b|non-?commercial|nicht kommerziell/i.test(lic)) return 'nein';
  if (/^je Dataset|Bedingungen der Quelle|Terms/i.test(lic)) return 'prüfen';
  if (/CC0|public.?domain|gemeinfrei|PDDL|Universal \(Public Domain/i.test(lic)) return 'ja';
  if (/CC.?BY|DL-DE-BY|ODbL|OGL|Open Government Licen|Etalab|Licence Ouverte|Quellenangabe|nennen/i.test(lic)) return 'mit Namensnennung';
  return 'prüfen';
}

function enterpriseLevel(c, e) {
  const bad = [];
  const open = [];
  const lic = e.lic;
  const com = commercial(lic);
  if (!lic) open.push('data');
  if (com === 'nein') bad.push('commercial');
  else if (com === 'prüfen') open.push('commercial');
  if (c.robots === 'disallowed') bad.push('robots');
  else if (c.robots !== 'allowed') open.push('robots');
  if (c.loginRequired || c.captcha) bad.push('login');
  else if (c.loginRequired !== false) open.push('login');
  const cc = c.server?.country;
  if (!cc) open.push('region');
  else if (!EU.has(cc)) open.push('region');
  if (!c.robotsNote) open.push('tos');
  const n429 = c.signals?.counts?.['429'] ?? 0;
  if (n429 > 0) open.push('rate');
  else if (!c.signals) open.push('rate');
  if (!e.codeLic || e.codeLic === 'UNLICENSED') open.push('code');
  if (bad.length) return 'rot';
  if (open.length) return 'gelb';
  return 'grün';
}

function stripFull(c) {
  const o = { ...c };
  delete o.robotsNote;
  if (Array.isArray(o.incidents) && o.incidents.length === 0) delete o.incidents;
  if (Array.isArray(o.commands) && o.commands.length === 0) delete o.commands;
  for (const k of ['apiVersion', 'apiAvailable', 'covered', 'gaps', 'features', 'urls']) {
    if (o[k] == null || (Array.isArray(o[k]) && o[k].length === 0)) delete o[k];
  }
  if (!o.screenshot) delete o.screenshot;
  if (!o.logo) delete o.logo;
  // links: keep samples only (Detail-Tests-Tab)
  if (o.links) {
    const samples = o.links.samples ?? null;
    o.links = samples ? { skill: null, protocol: null, samples } : undefined;
    if (!o.links) delete o.links;
  }
  // signals: drop captchaTypes noise if empty
  if (o.signals?.captchaTypes && !Object.keys(o.signals.captchaTypes).length) {
    const rest = { ...o.signals };
    delete rest.captchaTypes;
    o.signals = rest;
  }
  return o;
}

function lean(c) {
  const e = extras.connectors?.[c.id] || {};
  const o = {};
  for (const k of ['id', 'domain', 'category', 'country', 'logo', 'status', 'loginRequired', 'captcha', 'robots', 'paperclip', 'endpoint', 'sourceType', 'e2ePassed', 'e2eTotal', 'lastRun', 'records']) {
    if (c[k] != null) o[k] = c[k];
  }
  // Verlustfrei verschlankt: name nur wenn ≠ id; leere incidents/links/signals.counts stellt normalizeDataset() wieder her.
  if (c.name != null && c.name !== c.id) o.name = c.name;
  const desc = c.description || '';
  if (desc) o.description = desc.length <= 100 ? desc : `${desc.slice(0, 97)}…`;
  if (c.ampel) o.ampel = { level: c.ampel.level, reasons: (c.ampel.reasons || []).slice(0, 2) };
  if (c.kpi) {
    const k = {};
    for (const x of ['score', 'stability', 'p50', 'p95', 'throughput', 'dataQuality']) if (c.kpi[x] != null) k[x] = c.kpi[x];
    if (Object.keys(k).length) o.kpi = k;
  }
  if (c.interfaces) {
    const i = {};
    for (const x of ['access', 'mcp', 'cli', 'opencli', 'apiOpen', 'paperclip']) if (c.interfaces[x] != null) i[x] = c.interfaces[x];
    if (Object.keys(i).length) o.interfaces = i;
  }
  if (c.server?.country) o.server = { country: c.server.country };
  const n429 = c.signals?.counts?.['429'];
  if (n429) o.signals = { counts: { '429': n429 }, last: c.signals.last ?? null };
  else if (c.signals) o.signals = { last: c.signals.last ?? null };
  if (Array.isArray(c.commands) && c.commands.length) o.commands = c.commands.slice(0, 3);
  o.ent = enterpriseLevel(c, e);
  o.kom = commercial(e.lic);
  return o;
}

fs.mkdirSync(destDir, { recursive: true });

const full = {
  generatedAt: data.generatedAt,
  sourceRepo: data.sourceRepo,
  sourceGeneratedAt: data.sourceGeneratedAt,
  count: data.count,
  connectors: data.connectors.map(stripFull),
};
if (data.enrichedAt) full.enrichedAt = data.enrichedAt;
const fullPath = path.join(destDir, 'connectors.json');
fs.writeFileSync(fullPath, JSON.stringify(full));
const fullGz = gzipSync(fs.readFileSync(fullPath));

const list = {
  generatedAt: data.generatedAt,
  sourceRepo: data.sourceRepo,
  sourceGeneratedAt: data.sourceGeneratedAt,
  count: data.count,
  connectors: data.connectors.map(lean),
};
// Kritischer Pfad: list.json = nur was Home (Tabelle, Filter, Sortierung, KPIs) zum ersten Rendern braucht.
// list-rest.json = Beschreibung/Name/Detail-KPIs/Ampel-Gründe — nach dem ersten Rendern nachgeladen
// (Suche, Detail, Vergleich warten darauf; src/lib/data.ts loadRest()).
const REST_KEYS = ['name', 'description', 'sourceType', 'records', 'server'];
const REST_KPI = ['score', 'p95', 'throughput', 'dataQuality'];
const rest = { generatedAt: list.generatedAt, connectors: {} };
for (const o of list.connectors) {
  const r = {};
  for (const k of REST_KEYS) if (o[k] !== undefined) { r[k] = o[k]; delete o[k]; }
  if (o.kpi) {
    const kx = {};
    for (const x of REST_KPI) if (o.kpi[x] != null) { kx[x] = o.kpi[x]; delete o.kpi[x]; }
    if (Object.keys(kx).length) r.kpi = kx;
    if (!Object.keys(o.kpi).length) delete o.kpi;
  }
  if (o.ampel) { if (o.ampel.reasons?.length) r.reasons = o.ampel.reasons; delete o.ampel.reasons; }
  if (Object.keys(r).length) rest.connectors[o.id] = r;
}
const listPath = path.join(destDir, 'list.json');
fs.writeFileSync(listPath, JSON.stringify(list));
const listGz = gzipSync(fs.readFileSync(listPath));
const restPath = path.join(destDir, 'list-rest.json');
fs.writeFileSync(restPath, JSON.stringify(rest));
const restGz = gzipSync(fs.readFileSync(restPath));
// Deep-Link auf eine Detailseite braucht nur die Restfelder dieses einen Connectors (~0,3 KB statt list-rest.json).
const rDir = path.join(destDir, 'r');
fs.rmSync(rDir, { recursive: true, force: true });
fs.mkdirSync(rDir, { recursive: true });
for (const o of list.connectors) fs.writeFileSync(path.join(rDir, `${o.id}.json`), JSON.stringify(rest.connectors[o.id] || {}));

const extrasOut = {
  growth: extras.growth || [],
  connectors: extras.connectors || {},
};
if (extras.builtFrom) extrasOut.builtFrom = extras.builtFrom;
const extrasPath = path.join(destDir, 'extras.json');
fs.writeFileSync(extrasPath, JSON.stringify(extrasOut));
const extrasGz = gzipSync(fs.readFileSync(extrasPath));

console.log('public/data/list.json', fs.statSync(listPath).size, 'bytes (gzip ~' + listGz.length + ')');
console.log('public/data/list-rest.json', fs.statSync(restPath).size, 'bytes (gzip ~' + restGz.length + ')');
console.log('public/data/connectors.json', fs.statSync(fullPath).size, 'bytes (gzip ~' + fullGz.length + ')');
console.log('public/data/extras.json', fs.statSync(extrasPath).size, 'bytes (gzip ~' + extrasGz.length + ')');
