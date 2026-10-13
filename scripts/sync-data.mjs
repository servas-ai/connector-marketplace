#!/usr/bin/env node
// Erzeugt src/data/connectors.json aus servas-ai/opencli-connectors.
// Quelle: --src <pfad> | CONNECTORS_SRC | ../opencli-connectors (sonst: git clone via gh/git).
// Liest index.json, kpi/ranking.csv, SKILL.md-Frontmatter und PRUEFPROTOKOLL.md. Keine Netzwerk-Abfragen ausser optionalem Clone.
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const REPO = 'servas-ai/opencli-connectors';
const GH = `https://github.com/${REPO}/blob/main`;

export function parseCsv(text) {
  const [head, ...rows] = text.trim().split(/\r?\n/);
  const cols = head.split(',');
  return rows.filter(Boolean).map((r) => Object.fromEntries(r.split(',').map((v, i) => [cols[i], v])));
}

export function parseFrontmatter(md) {
  const m = md.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return {};
  const out = {};
  for (const line of m[1].split(/\r?\n/)) {
    const k = line.match(/^([\w-]+):\s*(.*)$/);
    if (k) out[k[1]] = k[2].replace(/^["']|["']$/g, '').trim();
  }
  return out;
}

export function parseProtocol(md) {
  const fields = {};
  for (const line of md.split(/\r?\n/)) {
    const m = line.match(/^\|\s*([^|]+?)\s*\|\s*(.+?)\s*\|\s*$/);
    if (m && !/^-+$/.test(m[1]) && m[1] !== 'Feld') fields[m[1]] = m[2];
  }
  const tests = [...md.matchAll(/^\|[^|]+\|[^|]+\|\s*(✅|❌|⚠️)[^|]*\|\s*(\d+)?[^|]*\|\s*(\d+)\s*ms/gm)].map((x) => ({ ok: x[1] === '✅', ms: Number(x[3]) }));
  const res = (fields['Ergebnis'] || '').match(/(\d+)\s*\/\s*(\d+)/);
  const no = (v) => (v ? /^nein|^no\b|^–|^-$/i.test(v.replace(/\*/g, '')) : null);
  const robotsTxt = fields['robots.txt / ToS'] || fields['robots.txt'] || '';
  const incidents = [];
  const hints = md.split(/##\s*Hinweise/i)[1];
  if (hints) for (const l of hints.split(/\r?\n/)) if (/^-\s/.test(l) && /(fehl|429|block|captcha|kaputt|instabil|rot|timeout|disallow|achtung)/i.test(l)) incidents.push(l.slice(2).trim());
  tests.filter((t) => !t.ok).forEach(() => incidents.push('Testfall im Prüfprotokoll fehlgeschlagen'));
  return {
    apiVersion: fields['API-Version'] || null,
    loginRequired: fields['Login nötig'] ? !no(fields['Login nötig']) : null,
    captcha: fields['Captcha beim Lauf'] ? !no(fields['Captcha beim Lauf']) : null,
    robots: robotsTxt ? (/disallow:\s*\/(?![\w])|sperrt|verbiete|nicht erlaubt/i.test(robotsTxt) ? 'disallowed' : 'allowed') : 'unknown',
    robotsNote: robotsTxt || null,
    lastRun: fields['Letzter Live-Lauf'] || null,
    e2ePassed: res ? Number(res[1]) : null,
    e2eTotal: res ? Number(res[2]) : null,
    latencies: tests.map((t) => t.ms),
    source: fields['Quelle'] || null,
    incidents,
  };
}

const pct = (arr, p) => {
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.ceil((p / 100) * s.length) - 1)];
};

const COUNTRY_SUFFIX = { fr: 'FR', no: 'NO', fi: 'FI', cz: 'CZ', pl: 'PL', de: 'DE', be: 'BE', ch: 'CH', at: 'AT' };
export function countryOf(id, domain, rel) {
  const suf = id.match(/-([a-z]{2})$/);
  if (suf && COUNTRY_SUFFIX[suf[1]]) return COUNTRY_SUFFIX[suf[1]];
  const tld = (domain || '').split('.').pop();
  if (tld === 'at') return 'AT';
  if (COUNTRY_SUFFIX[tld]) return COUNTRY_SUFFIX[tld];
  if (/international|eu-|sanktion|ted|gleif|vies|eurostat|ezb/.test(rel || id)) return /un-|ofac|sec-|gleif|opencorporates/.test(id) ? 'INT' : 'EU';
  return 'AT';
}

function walk(dir, name, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.') || e.name === 'node_modules') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, name, acc);
    else if (e.name === name) acc.push(p);
  }
  return acc;
}

const readJson = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return {}; } };

export function build(src) {
  const overrides = readJson(path.join(src, 'assets/domain-overrides.json'));
  const index = JSON.parse(fs.readFileSync(path.join(src, 'index.json'), 'utf8'));
  const rankFile = path.join(src, 'kpi/ranking.csv');
  const ranking = fs.existsSync(rankFile) ? parseCsv(fs.readFileSync(rankFile, 'utf8')) : [];
  const rankBy = new Map(ranking.map((r) => [r.slug, r]));
  const out = new Map();

  for (const c of index.connectors) {
    const r = rankBy.get(c.slug);
    out.set(c.slug, {
      id: c.slug, name: c.slug, domain: c.domain, description: c.description, category: c.category,
      country: countryOf(c.slug, c.domain), status: c.status, repo: `https://github.com/servas-ai/${c.repo}`,
      records: c.records ?? null, commands: c.commands || [], logo: c.logo ? path.basename(c.logo) : null,
      paperclip: !!c.paperclip, lastRun: r?.last_success || c.last_run || null,
      e2ePassed: c.e2e_passed ?? null, e2eTotal: c.e2e_total ?? null,
      kpi: r ? {
        stability: Number(r.stability_pct), p50: Number(r.latency_p50_ms), p95: Number(r.latency_p95_ms),
        throughput: Number(r.rpm_ok), captchaRate: Number(r.captcha_rate), dataQuality: Number(r.data_quality),
        score: Number(r.score), blocked: r.blocked === 'True',
      } : null,
      loginRequired: r ? r.login_required === 'True' : null, captcha: r ? Number(r.captcha_rate) > 0 : null,
      apiAvailable: r ? r.api_available === 'True' : null, apiVersion: null, robots: 'unknown', robotsNote: null,
      incidents: c.status !== 'passing' ? [c.note || 'Status nicht grün'] : [],
      links: { skill: null, protocol: null, samples: c.proofs?.log ? `${GH}/${c.proofs.log}` : null },
      source: c.source_url || null,
    });
  }

  for (const proto of walk(src, 'PRUEFPROTOKOLL.md')) {
    const dir = path.dirname(proto);
    const rel = path.relative(src, dir);
    const id = path.basename(dir).replace(/^opencli-/, '');
    const p = parseProtocol(fs.readFileSync(proto, 'utf8'));
    const skillPath = path.join(dir, 'SKILL.md');
    const fm = fs.existsSync(skillPath) ? parseFrontmatter(fs.readFileSync(skillPath, 'utf8')) : {};
    const prev = out.get(id) || {};
    const ok = p.e2ePassed != null && p.e2ePassed === p.e2eTotal;
    const p50 = pct(p.latencies, 50), p95 = pct(p.latencies, 95);
    let domain = prev.domain || overrides[id] || null;
    try { domain = domain || new URL(p.source).hostname; } catch { /* keine URL */ }
    const r = rankBy.get(id);
    out.set(id, {
      ...prev,
      id, name: fm.name || id, domain, description: fm.description || prev.description || '',
      category: prev.category || rel.split(path.sep)[0], country: prev.country || countryOf(id, domain, rel),
      status: prev.status || (ok ? 'passing' : 'failing'), repo: prev.repo || `https://github.com/${REPO}/tree/main/${rel}`,
      records: prev.records ?? null, commands: prev.commands || [], logo: prev.logo || null, paperclip: !!prev.paperclip,
      lastRun: p.lastRun || prev.lastRun || null,
      e2ePassed: p.e2ePassed ?? prev.e2ePassed ?? null, e2eTotal: p.e2eTotal ?? prev.e2eTotal ?? null,
      kpi: prev.kpi || (p.latencies.length ? {
        stability: p.e2eTotal ? Math.round((100 * p.e2ePassed) / p.e2eTotal) : null, p50, p95,
        throughput: p50 ? Math.round((60000 / p50) * 10) / 10 : null, captchaRate: p.captcha ? 1 : 0,
        dataQuality: r ? Number(r.data_quality) : null, score: null, blocked: false,
      } : null),
      loginRequired: p.loginRequired ?? prev.loginRequired ?? null, captcha: p.captcha ?? prev.captcha ?? null,
      apiAvailable: prev.apiAvailable ?? (p.apiVersion ? true : null), apiVersion: p.apiVersion,
      robots: p.robots, robotsNote: p.robotsNote,
      incidents: [...(prev.incidents || []), ...p.incidents],
      links: {
        skill: fs.existsSync(skillPath) ? `${GH}/${rel}/SKILL.md` : null,
        protocol: `${GH}/${rel}/PRUEFPROTOKOLL.md`,
        samples: fs.existsSync(path.join(dir, 'samples')) ? `https://github.com/${REPO}/tree/main/${rel}/samples` : prev.links?.samples ?? null,
      },
      source: p.source || prev.source || null,
    });
  }
  const logoDir = path.join(src, 'assets/logos');
  const branding = readJson(path.join(src, 'assets/branding.json'));
  for (const c of out.values()) { if (!c.domain && overrides[c.id]) c.domain = overrides[c.id]; const d = (c.domain || '').replace(/^www\./, ''); if (branding[d]?.favicon) { c.logo = path.basename(branding[d].favicon); c.logoSource = branding[d].source; } }
  for (const c of out.values()) if (!c.logo && c.domain && fs.existsSync(path.join(logoDir, `${c.domain}.png`))) c.logo = `${c.domain}.png`;
  const connectors = [...out.values()].sort((a, b) => (b.kpi?.score ?? -1) - (a.kpi?.score ?? -1) || a.id.localeCompare(b.id));
  return { generatedAt: new Date().toISOString(), sourceRepo: REPO, sourceGeneratedAt: index.generated_at, count: connectors.length, connectors };
}

function resolveSrc() {
  const i = process.argv.indexOf('--src');
  const cand = [i > 0 ? process.argv[i + 1] : null, process.env.CONNECTORS_SRC, path.join(ROOT, '..', 'opencli-connectors')].filter(Boolean);
  for (const c of cand) if (fs.existsSync(path.join(c, 'index.json'))) return c;
  const tmp = path.join(ROOT, '.cache', 'opencli-connectors');
  if (!fs.existsSync(tmp)) execSync(`git clone --depth 1 https://github.com/${REPO}.git ${tmp}`, { stdio: 'inherit' });
  return tmp;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const src = resolveSrc();
  const data = build(src);
  fs.mkdirSync(path.join(ROOT, 'src/data'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'src/data/connectors.json'), JSON.stringify(data, null, 2) + '\n');
  const logos = path.join(src, 'assets/logos');
  if (fs.existsSync(logos)) {
    fs.mkdirSync(path.join(ROOT, 'public/logos'), { recursive: true });
    for (const f of fs.readdirSync(logos)) fs.copyFileSync(path.join(logos, f), path.join(ROOT, 'public/logos', f));
  }
  console.log(`connectors.json: ${data.count} Connectoren aus ${src}`);
}
