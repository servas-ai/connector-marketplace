#!/usr/bin/env node
// Ampel, Captcha-/Fehler-Zeitreihe, Netz-Analyse und SVG-Badges. Rein lokal, 0 Netz-Requests.
// Eingaben: src/data/connectors.json (nach enrich), data/netintel.json, data/enrich-cache.json, Proof-Logs (--proofs <dir>).
// Captchas werden nur ERKANNT und GEZÄHLT, nie gelöst oder umgangen.
// Ausgaben: connectors.json (+ net, signals, ampel, screenshot), data/observations.json (anhängende Zeitreihe), public/badges/*.svg
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const arg = (n) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null; };
const read = (p, d) => { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return d; } };

// ---------- reine Funktionen (getestet) ----------
export const CAPTCHA_MARKERS = [
  ['reCAPTCHA', /google\.com\/recaptcha|grecaptcha|g-recaptcha|\brecaptcha\b/i],
  ['hCaptcha', /hcaptcha\.com|h-captcha|\bhcaptcha\b/i],
  ['Turnstile', /challenges\.cloudflare\.com\/turnstile|cf-turnstile|\bturnstile\b/i],
  ['Cloudflare-Challenge', /cf-chl-|just a moment\.\.\.|cf_chl_opt|attention required! \| cloudflare/i],
  ['Akamai-Bot-Manager', /_abck|bm-verify|akamai bot manager/i],
  ['DataDome', /datadome|captcha-delivery\.com/i],
  ['PerimeterX', /px-captcha|perimeterx|_pxhd/i],
  ['eigenes Captcha', /\bcaptcha\b/i],
];
export function captchaTypeOf(text) { if (!text) return null; for (const [n, re] of CAPTCHA_MARKERS) if (re.test(text)) return n; return null; }
// Klassifiziert eine Beobachtung (HTTP-Status + Text/Fehler) in eine Ereignisklasse.
export function classify({ http = null, error = null, text = null } = {}) {
  const e = String(error ?? '');
  const cap = captchaTypeOf(`${text ?? ''} ${e}`);
  if (cap && !/kein captcha|no captcha|captcha-umgehen|captcha umgehen/i.test(`${text ?? ''} ${e}`)) return { kind: 'captcha', captcha: cap };
  if (/robots|"status": "blocked"/i.test(e)) return { kind: 'robots' };
  if (http === 429 || /\b429\b|too many requests/i.test(e)) return { kind: '429' };
  if (http === 403 || /\b403\b|forbidden/i.test(e)) return { kind: '403' };
  if (/timed? ?out|ETIMEDOUT|timeout/i.test(e)) return { kind: 'timeout' };
  if (http >= 500 || /ssl|EOF occurred|RemoteDisconnected|ECONNRE|ENOTFOUND|URLError/i.test(e)) return { kind: 'offline' };
  if (http && http >= 200 && http < 400) return { kind: 'ok' };
  return { kind: error ? 'error' : 'unknown' };
}
export const KINDS = ['ok', 'captcha', '403', '429', 'timeout', 'offline', 'robots', 'error'];
export function summarize(events) {
  const counts = Object.fromEntries(KINDS.map((k) => [k, 0])); const captchaTypes = {};
  for (const ev of events) { if (ev.kind in counts) counts[ev.kind]++; if (ev.captcha) captchaTypes[ev.captcha] = (captchaTypes[ev.captcha] ?? 0) + 1; }
  const measured = events.filter((e) => e.kind !== 'unknown');
  const up = measured.filter((e) => ['ok', 'captcha', '403', '429', 'robots'].includes(e.kind)).length; // Server antwortet
  return { counts, captchaTypes, observations: measured.length, uptime: measured.length ? Math.round((100 * up) / measured.length) : null, last: events.at(-1)?.at ?? null };
}
// Ampel: rot schlägt gelb schlägt grün. Gründe werden mitgegeben (für Tooltip/Badge).
export function ampelOf(c, sig) {
  const red = [], yellow = [];
  const k = sig?.counts ?? {};
  if (c.status === 'failing') red.push('e2e rot');
  if (c.gates?.state === 'fail') (c.gates.errors >= 20 ? red : yellow).push(`Gates: ${c.gates.errors} Fehler`);
  if (c.robots === 'disallowed' || c.server?.robotsBlockedProbe || k.robots) red.push('robots.txt Disallow');
  if (c.captcha === true || k.captcha) red.push('Captcha');
  if ((c.kpi?.captchaRate ?? 0) > 0) yellow.push(`Captcha-Rate ${c.kpi.captchaRate}`);
  if (k['403']) (k['403'] >= 3 ? red : yellow).push(`403 ×${k['403']}`);
  if (k['429']) yellow.push(`429 ×${k['429']}`);
  if (k.offline) (sig.uptime != null && sig.uptime < 50 ? red : yellow).push(`offline ×${k.offline}`);
  if (k.timeout) yellow.push(`Timeout ×${k.timeout}`);
  if (c.kpi?.stability != null && c.kpi.stability < 90) yellow.push(`Stabilität ${c.kpi.stability} %`);
  if (c.kpi?.dataQuality != null && c.kpi.dataQuality < 3) yellow.push(`Datenqualität ${c.kpi.dataQuality}/5`);
  if (c.lastRun && Date.parse(c.lastRun) < Date.parse(sig?.now ?? new Date().toISOString()) - 7 * 864e5) yellow.push('Drift: letzter Lauf > 7 Tage');
  if (c.loginRequired) yellow.push('Login nötig');
  if (c.gates?.state === 'extern' || c.gates?.state === 'unknown') yellow.push('Gates nicht geprüft');
  const level = red.length ? 'red' : yellow.length ? 'yellow' : 'green';
  return { level, reasons: [...red, ...yellow] };
}
export function timelineOf(series) {
  const m = new Map();
  for (const o of series) { const d = o.at.slice(0, 10); const e = m.get(d) ?? { day: d, ...Object.fromEntries(KINDS.map((k) => [k, 0])) }; if (o.kind in e) e[o.kind]++; m.set(d, e); }
  return [...m.values()].sort((a, b) => a.day.localeCompare(b.day));
}
const COL = { green: '#22c55e', yellow: '#eab308', red: '#ef4444' };
const LBL = { green: 'grün', yellow: 'gelb', red: 'rot' };
const esc = (s) => String(s).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
export function badgeSvg(label, ampel, text) {
  const right = text ?? `${LBL[ampel.level]}${ampel.reasons[0] ? ` · ${ampel.reasons[0]}` : ''}`;
  const w1 = 8 + label.length * 6.5, w2 = 22 + right.length * 6.2, w = Math.round(w1 + w2);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="20" role="img" aria-label="${esc(label)}: ${esc(right)}"><title>${esc(ampel.reasons.join(', ') || 'alles grün')}</title>` +
    `<rect width="${w}" height="20" rx="3" fill="#3f3f46"/><rect x="${Math.round(w1)}" width="${Math.round(w2)}" height="20" rx="3" fill="${COL[ampel.level]}"/>` +
    `<circle cx="${Math.round(w1) + 10}" cy="10" r="4" fill="#fff" fill-opacity=".9"/>` +
    `<g fill="#fff" font-family="Verdana,DejaVu Sans,sans-serif" font-size="11"><text x="5" y="14">${esc(label)}</text><text x="${Math.round(w1) + 18}" y="14">${esc(right)}</text></g></svg>\n`;
}

// ---------- Lauf ----------
function main() {
  const DATA = path.join(ROOT, 'src/data/connectors.json');
  const ds = read(DATA); const cache = read(path.join(ROOT, 'data/enrich-cache.json'), {});
  const net = read(path.join(ROOT, 'data/netintel.json'), { hosts: {} });
  const OBS = path.join(ROOT, 'data/observations.json');
  const obs = read(OBS, { series: [] });
  const proofs = arg('--proofs') || path.resolve(ROOT, '../../opencli-connectors/proofs');
  const seen = new Set(obs.series.map((o) => `${o.id}|${o.src}|${o.at}`));
  const add = (o) => { const key = `${o.id}|${o.src}|${o.at}`; if (!seen.has(key)) { seen.add(key); obs.series.push(o); } };
  for (const c of ds.connectors) {
    const p = c.domain ? cache[c.domain] : null;
    if (p?.at) { const r = classify({ http: p.webtech?.http ?? null, error: p.webtechError ?? null }); add({ id: c.id, at: p.at, src: 'probe', ...r }); }
    if (c.lastRun) add({ id: c.id, at: c.lastRun, src: 'e2e', ...(c.status === 'passing' ? { kind: 'ok' } : classify({ error: c.incidents.join(' ') || 'e2e failing' })) });
    const log = path.join(proofs, `opencli-${c.id}`, 'e2e.log');
    if (fs.existsSync(log)) { const t = fs.readFileSync(log, 'utf8'); const cap = captchaTypeOf(t.replace(/kein[^.\n]*captcha[^.\n]*/gi, '')); if (cap) add({ id: c.id, at: c.lastRun ?? fs.statSync(log).mtime.toISOString(), src: 'proof-log', kind: 'captcha', captcha: cap }); }
  }
  obs.series.sort((a, b) => a.at.localeCompare(b.at)); obs.updatedAt = new Date().toISOString();
  fs.writeFileSync(OBS, JSON.stringify(obs, null, 1) + '\n');
  const badges = path.join(ROOT, 'public/badges'); fs.mkdirSync(badges, { recursive: true });
  const egress = null; // eigene Egress-IP wird nie veröffentlicht
  for (const c of ds.connectors) {
    const h = c.domain ? net.hosts?.[c.domain] : null;
    c.net = h ? { rdns: h.rdns, network: h.network, cdn: h.cdn, cdnAll: h.cdnAll, evidence: h.evidence, waf: h.waf, proxy: h.proxy, datacenter: [c.server?.hoster, c.server?.city, c.server?.country].filter(Boolean).join(' · ') || null } : null;
    if (c.server && h?.cdn && !c.server.cdn) c.server.cdn = h.cdn;
    const sig = summarize(obs.series.filter((o) => o.id === c.id));
    c.signals = sig;
    c.ampel = ampelOf(c, { ...sig, now: ds.generatedAt });
    c.screenshot = fs.existsSync(path.join(ROOT, 'public/screens', `${c.id}.png`)) ? `screens/${c.id}.png` : null;
    fs.writeFileSync(path.join(badges, `${c.id}.svg`), badgeSvg(c.id, c.ampel));
  }
  ds.timeline = timelineOf(obs.series);
  ds.egress = egress; ds.observationsAt = obs.updatedAt; ds.observationCount = obs.series.length;
  fs.writeFileSync(DATA, JSON.stringify(ds, null, 2) + '\n');
  const n = (l) => ds.connectors.filter((c) => c.ampel.level === l).length;
  const worst = n('red') > ds.connectors.length / 2 ? 'red' : n('green') > ds.connectors.length / 2 ? 'green' : 'yellow';
  fs.writeFileSync(path.join(badges, '_all.svg'), badgeSvg('Ampel', { level: worst, reasons: [] }, `${n('green')} grün · ${n('yellow')} gelb · ${n('red')} rot`));
  console.log(`signals: ${obs.series.length} Beobachtungen, Ampel grün/gelb/rot ${n('green')}/${n('yellow')}/${n('red')}, Screenshots ${ds.connectors.filter((c) => c.screenshot).length}`);
}
if (process.argv[1] === fileURLToPath(import.meta.url)) main();
