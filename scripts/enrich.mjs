#!/usr/bin/env node
// Reichert src/data/connectors.json passiv an: Server-Hintergrund, Quellentyp, Schnittstellen-Matrix, Gate-Status.
// Netz nur über die webintel-Connectoren aus servas-ai/opencli-connectors (dns, ip-geo, rdap, ct-certspotter, webtech).
// Regeln: höchstens 1 Request pro Ziel-Host (webtech prüft robots.txt vorher und lässt bei Disallow aus),
// Drittanbieter-APIs gedrosselt (>= 1,1 s Abstand), Ergebnisse in data/enrich-cache.json (Re-Run = 0 Requests).
// Optionen: --webintel <pfad zu webintel/connectors.py> (oder WEBINTEL), --offline (nur Cache + Snapshots), --refresh
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const arg = (n) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null; };
const OFFLINE = process.argv.includes('--offline');
const REFRESH = process.argv.includes('--refresh');
const WEBINTEL = arg('--webintel') || process.env.WEBINTEL || path.resolve(ROOT, '../opencli-connectors/webintel/connectors.py');
const CACHE = path.join(ROOT, 'data/enrich-cache.json');
const DATA = path.join(ROOT, 'src/data/connectors.json');
const read = (p, d) => { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return d; } };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const last = {};
async function run(source, args, host) {
  const wait = (last[host] ?? 0) + 1100 - Date.now(); if (wait > 0) await sleep(wait); last[host] = Date.now();
  try {
    const out = execFileSync('python3', [WEBINTEL, source, ...args], { timeout: 25000, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    return JSON.parse(out).records ?? [];
  } catch (e) { return { error: String(e.stderr || e.message).split('\n').filter(Boolean).pop()?.slice(0, 160) ?? 'error' }; }
}

// ---------- reine Klassifizierung (getestet) ----------
const ASN_HOSTER = [[/amazon|aws/i, 'AWS'], [/google/i, 'Google Cloud'], [/microsoft|azure/i, 'Microsoft Azure'], [/cloudflare/i, 'Cloudflare'], [/akamai/i, 'Akamai'], [/fastly/i, 'Fastly'], [/hetzner/i, 'Hetzner'], [/ovh/i, 'OVH'], [/digitalocean/i, 'DigitalOcean'], [/a1 telekom|telekom austria/i, 'A1 Telekom'], [/bundesrechenzentrum|brz/i, 'BRZ (Bund)'], [/world4you/i, 'World4You'], [/easyname|nessus/i, 'easyname'], [/anexia/i, 'Anexia'], [/ionos|1&1/i, 'IONOS'], [/strato/i, 'Strato'], [/github/i, 'GitHub'], [/vercel/i, 'Vercel'], [/netlify/i, 'Netlify']];
export function hosterOf(org) { if (!org) return null; for (const [re, n] of ASN_HOSTER) if (re.test(org)) return n; return org.replace(/\b(GmbH|AG|Inc\.?|LLC|Ltd\.?|S\.A\.|B\.V\.)\b/g, '').trim(); }
export function cdnOf(wt, hoster) {
  const raw = wt?.cdn || '';
  const m = [[/cloudfront/i, 'CloudFront'], [/cloudflare/i, 'Cloudflare'], [/akamai/i, 'Akamai'], [/fastly|varnish/i, 'Fastly/Varnish'], [/google/i, 'Google Frontend']].find(([re]) => re.test(raw));
  if (m) return m[1];
  if (raw) return raw.slice(0, 40);
  return ['Cloudflare', 'Akamai', 'Fastly'].includes(hoster) ? hoster : null;
}
export function cmsOf(wt) {
  if (!wt) return null;
  const cms = ['WordPress', 'Drupal', 'Joomla', 'TYPO3', 'Shopify', 'Wix', 'Next.js', 'Nuxt', 'Angular', 'Vue', 'React'].find((t) => wt.technologies?.includes(t));
  return cms || (wt.generator ? wt.generator.split(/\s/)[0] : null);
}
export function sourceTypeOf(c, src) {
  const t = `${c.category} ${c.id} ${c.domain} ${src?.kategorie ?? ''}`.toLowerCase();
  if (/apps?-|playstore|appstore|-app\b/.test(t)) return 'App';
  if (/firmenbuch|register|gisa|zvr|kbo|brreg|prh|gleif|vies|lobby|handelsreg|edikt|wko|patent|marken|adapters/.test(t)) return 'Register';
  if (/gv\.at|gov|\.eu\b|europa|statistik|oenb|ezb|ecb|eurostat|bev|fma|ris|justiz|opendata|vergabe|ted|sanktion|ofac|un-/.test(t)) return 'Behörde';
  if (/rtr|e-control|energyagency|spritpreis/.test(t)) return 'Behörde';
  if (/opencorporates|peeringdb/.test(t)) return 'Register';
  if (/check24|durchblicker|vergleich/.test(t)) return 'Vergleichsportal';
  if (/g2g|marketplace|willhaben|geizhals|idealo|ebay|amazon/.test(t)) return 'Marktplatz';
  if (/mobil|tarif|energie|strom|gas|internet|kabel|shop|telekom|colocation|festnetz|netz|stadtwerke|pellets|heizoel|fiber|power|energy|liwest|fonira|salzburg-ag|eww|kwg|stww|lampert|voltino|wvnet|kufnet|nessus|efriends/.test(t)) return 'Shop/Anbieter';
  if (/webintel|intel/.test(t)) return 'Dienst/API';
  return 'Sonstige';
}
const ZUGANG = { 'offene API ohne Key': 'apiOpen', 'API mit Key': 'apiKey', 'Open-Data-Dump': 'ogdDump', 'passiv reverse-engineerter JSON-Endpunkt': 'reJson' };
export function interfacesOf(c, src) {
  const z = src?.zugang ?? null; const u = `${c.source ?? ''} ${(src?.urls ?? []).join(' ')}`.toLowerCase();
  return {
    access: z ?? (c.apiAvailable ? 'offene API ohne Key' : 'OpenCLI (HTML)'),
    apiOpen: ZUGANG[z] === 'apiOpen' || (z == null && c.apiAvailable === true),
    apiKey: ZUGANG[z] === 'apiKey' || src?.api_key === true,
    ogdDump: ZUGANG[z] === 'ogdDump' || /data\.gv\.at|\.csv|\.xlsx|ckan|opendata/.test(u),
    reJson: ZUGANG[z] === 'reJson',
    feed: /rss|atom|\.xml|feed/.test(u),
    mcp: true, // jeder Connector ist über den MCP-Server von opencli-factory aufrufbar
    cli: c.commands.length > 0,
    opencli: /opencli/i.test(`${c.repo} ${src?.pfad ?? ''}`) || z === 'OpenCLI (HTML)',
    paperclip: c.paperclip === true,
    playwright: z === 'Playwright/Headless' || src?.playwright_fallback === true,
    pdf: z === 'PDF-Parsing',
  };
}
export function gatesOf(c, gates, srcPath) {
  if (!gates) return { state: 'unknown', errors: 0, codes: [] };
  const key = (srcPath && gates[srcPath] ? srcPath : null) || Object.keys(gates).find((k) => { const s = k.split('/').pop(); return s === c.id || s === `opencli-${c.id}`; });
  if (!key) return { state: 'extern', errors: 0, codes: [], note: 'eigenes Repo, nicht im Mono-Repo-Gate-Lauf' };
  const errs = gates[key] || [];
  const codes = [...new Set(errs.map((e) => e[0]))].sort();
  return { state: errs.length ? 'fail' : 'pass', errors: errs.length, codes, path: key, top: errs.slice(0, 5).map((e) => `${e[0]} ${e[1]}`) };
}
export function domainAge(reg, now = Date.now()) { if (!reg) return null; const y = (now - Date.parse(reg)) / 31557600000; return Number.isFinite(y) ? Math.round(y * 10) / 10 : null; }
const SLD = /\.(gv|co|or|ac)\.at$|\.(co|org|gov|ac)\.uk$|\.com\.\w\w$/;
export const apex = (d) => d.replace(/^www\./, '').split('.').slice(SLD.test(d) ? -3 : -2).join('.');

async function probe(domain, cache) {
  if (!REFRESH && cache[domain]) return cache[domain];
  if (OFFLINE) return null;
  const r = { at: new Date().toISOString() };
  const a = await run('dns', ['--domain', domain, '--type', 'A'], 'dns.google');
  r.ip = Array.isArray(a) ? a.find((x) => /^\d+\.\d+\.\d+\.\d+$/.test(x.data))?.data ?? null : null;
  if (!Array.isArray(a)) r.dnsError = a.error;
  if (r.ip) { const g = await run('ip-geo', ['--ip', r.ip], 'ipapi.co'); r.geo = Array.isArray(g) ? g[0] ?? null : null; if (!Array.isArray(g)) r.geoError = g.error; }
  const wt = await run('webtech', ['--domain', domain], domain); // 1 Request auf den Ziel-Host (+ robots.txt)
  r.webtech = Array.isArray(wt) ? wt[0] ?? null : null; if (!Array.isArray(wt)) r.webtechError = wt.error;
  const rd = await run('rdap', ['--q', apex(domain)], 'rdap.org');
  r.rdap = Array.isArray(rd) ? rd[0] ?? null : null;
  const ct = await run('ct-certspotter', ['--domain', apex(domain), '--limit', '200'], 'api.certspotter.com');
  if (Array.isArray(ct)) { const s = ct.filter((x) => x.issuer).sort((x, y) => String(y.not_before).localeCompare(String(x.not_before))); r.tls = s[0] ? { issuer: s[0].issuer, notAfter: s[0].not_after } : null; } else r.ctError = ct.error;
  return r;
}

async function main() {
  const ds = read(DATA); const cache = read(CACHE, {});
  const sources = read(path.join(ROOT, 'data/sources.snapshot.json'), { sources: [] }).sources;
  const gates = read(path.join(ROOT, 'data/gates.snapshot.json'), null);
  const byId = (c) => sources.find((s) => s.slug === c.id || s.slug === `opencli-${c.id}` || s.pfad?.endsWith(`/${c.id}`) || s.pfad?.endsWith(`/opencli-${c.id}`));
  const domains = [...new Set(ds.connectors.map((c) => c.domain).filter(Boolean))];
  let i = 0;
  for (const d of domains) { cache[d] = await probe(d, cache) ?? cache[d]; if (!OFFLINE) { fs.writeFileSync(CACHE, JSON.stringify(cache, null, 1)); process.stderr.write(`\r${++i}/${domains.length} ${d}          `); } }
  for (const c of ds.connectors) {
    const src = byId(c); const p = c.domain ? cache[c.domain] : null; const wt = p?.webtech;
    const hoster = hosterOf(p?.geo?.org);
    c.server = p ? {
      ip: p.ip ?? null, asn: p.geo?.asn ?? null, hoster, country: p.geo?.country_code ?? null, city: p.geo?.city ?? null,
      cdn: cdnOf(wt, hoster), webserver: wt?.server ?? null, poweredBy: wt?.x_powered_by ?? null, cms: cmsOf(wt), tech: wt?.technologies ?? [],
      hsts: wt?.hsts ?? null, csp: wt?.csp ?? null, tlsIssuer: p.tls?.issuer ?? null, tlsNotAfter: p.tls?.notAfter ?? null,
      registered: p.rdap?.registered ?? null, domainAgeYears: domainAge(p.rdap?.registered), rdap: p.rdap?.status === 'no_rdap_service' ? 'kein RDAP für TLD' : p.rdap ? 'ok' : null,
      robotsBlockedProbe: wt?.status === 'robots_disallow', probedAt: p.at,
    } : null;
    c.sourceType = sourceTypeOf(c, src);
    c.interfaces = interfacesOf(c, src);
    c.features = src?.website_features ?? []; c.covered = src?.abgedeckt ?? []; c.gaps = src?.luecken ?? []; c.urls = src?.urls ?? [];
    c.gates = gatesOf(c, gates, src?.pfad);
  }
  ds.enrichedAt = new Date().toISOString(); ds.gatesSource = gates ? 'check_connectors.py --strict (data/gates.snapshot.json)' : null;
  fs.writeFileSync(DATA, JSON.stringify(ds, null, 2) + '\n');
  const n = ds.connectors.filter((c) => c.server?.hoster).length;
  console.log(`\nangereichert: ${ds.connectors.length} Connectoren, Server-Daten bei ${n}, Gates pass/fail/extern: ${['pass', 'fail', 'extern'].map((s) => ds.connectors.filter((c) => c.gates.state === s).length).join('/')}`);
}
if (process.argv[1] === fileURLToPath(import.meta.url)) main();
