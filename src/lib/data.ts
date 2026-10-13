import { INTERFACE_KEYS } from './interfaceKeys';
import type { Connector, Dataset } from './types';

let _ds: Dataset | null = null;
let _full: Dataset | null = null;
let _fullPromise: Promise<Dataset> | null = null;
let _isListOnly = false;

export function getDataset(): Dataset {
  if (!_ds) throw new Error('dataset not loaded — call loadDataset() first');
  return _ds;
}

/** Proxy so existing `dataset.connectors` call sites keep working after loadDataset()/setDataset(). */
export const dataset: Dataset = new Proxy({} as Dataset, {
  get(_t, prop) {
    const d = getDataset();
    const v = Reflect.get(d, prop, d);
    return typeof v === 'function' ? (v as (...a: never[]) => unknown).bind(d) : v;
  },
});

/** Compact public JSON may omit empty arrays — restore shape the UI assumes. */
function normalizeDataset(d: Dataset): Dataset {
  for (const c of d.connectors) {
    if (!Array.isArray(c.incidents)) c.incidents = [];
    if (!Array.isArray(c.commands)) c.commands = [];
    if (!c.links) c.links = { skill: null, protocol: null, samples: null };
    if (c.name == null) c.name = c.id;
    if (c.signals && !c.signals.counts) c.signals.counts = {};
    if (c.ampel && !Array.isArray(c.ampel.reasons)) c.ampel.reasons = [];
  }
  return d;
}

export function setDataset(d: Dataset): void {
  _ds = normalizeDataset(d);
  _full = _ds;
  _isListOnly = false;
}

function baseUrl(): string {
  return import.meta.env.BASE_URL || './';
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} HTTP ${res.status}`);
  return (await res.json()) as T;
}

/** Load compact list.json for first paint (Home). Falls back to full connectors.json. */
export async function loadDataset(): Promise<Dataset> {
  if (_ds) return _ds;
  const base = baseUrl();
  try {
    const list = await fetchJson<Dataset>(`${base}data/list.json`);
    _ds = normalizeDataset(list);
    _isListOnly = true;
    return _ds;
  } catch {
    const full = await fetchJson<Dataset>(`${base}data/connectors.json`);
    _ds = normalizeDataset(full);
    _full = _ds;
    _isListOnly = false;
    return _ds;
  }
}

/** Boot helper: always load full connectors.json (Detail deep-links). */
export async function loadFullDataset(): Promise<Dataset> {
  if (_full) { _ds = _full; _isListOnly = false; return _full; }
  return ensureFullDataset();
}

/** Ensure full connectors.json is loaded (Detail, Dashboard, Compare). Merges into live dataset. */
export async function ensureFullDataset(): Promise<Dataset> {
  if (_full) {
    _ds = _full;
    _isListOnly = false;
    return _full;
  }
  if (_fullPromise) return _fullPromise;
  _fullPromise = (async () => {
    const full = normalizeDataset(await fetchJson<Dataset>(`${baseUrl()}data/connectors.json`));
    _full = full;
    _ds = full;
    _isListOnly = false;
    return full;
  })();
  try {
    return await _fullPromise;
  } catch (e) {
    _fullPromise = null;
    throw e;
  }
}

// ── list-rest.json: Beschreibung, Name, Detail-KPIs, Ampel-Gründe (nach erstem Rendern, s. copy-public-data.mjs) ──
interface RestEntry { name?: string; description?: string; sourceType?: string; records?: number | null; server?: Connector['server']; kpi?: Partial<NonNullable<Connector['kpi']>>; reasons?: string[] }
let _restReady = false;
let _restPromise: Promise<void> | null = null;
const _restListeners = new Set<() => void>();

const _restIds = new Set<string>();
export function isRestReady(id?: string): boolean { return _restReady || !_isListOnly || (id != null && _restIds.has(id)); }
export function onRest(cb: () => void): () => void { _restListeners.add(cb); return () => { _restListeners.delete(cb); }; }

function mergeRest(ds: Dataset, rest: Record<string, RestEntry>): void {
  for (const c of ds.connectors) {
    const r = rest[c.id]; if (!r) continue;
    const { kpi, reasons, ...flat } = r;
    Object.assign(c, flat);
    if (kpi) c.kpi = { ...(c.kpi ?? {}), ...kpi } as Connector['kpi'];
    if (reasons && c.ampel) c.ampel.reasons = reasons;
  }
}

/** Restfelder nachladen und in das Listen-Dataset mergen (idempotent). Ohne list-rest.json → volles connectors.json. */
export function loadRest(): Promise<void> {
  if (isRestReady()) return Promise.resolve();
  if (_restPromise) return _restPromise;
  _restPromise = (async () => {
    try {
      const r = await fetchJson<{ connectors: Record<string, RestEntry> }>(`${baseUrl()}data/list-rest.json`);
      if (_ds && _isListOnly) mergeRest(_ds, r.connectors);
    } catch {
      await ensureFullDataset();
    }
    _restReady = true;
    _restListeners.forEach((cb) => cb());
  })();
  _restPromise.catch(() => { _restPromise = null; });
  return _restPromise;
}

/** Deep-Link Detailseite: nur data/r/<id>.json mergen (list-rest.json folgt nach dem ersten Paint). */
export async function loadRestFor(id: string): Promise<void> {
  if (isRestReady(id)) return;
  let r: RestEntry;
  try { r = await fetchJson<RestEntry>(`${baseUrl()}data/r/${encodeURIComponent(id)}.json`); } catch { return loadRest(); }
  if (_ds && _isListOnly && !_restReady) mergeRest(_ds, { [id]: r });
  _restIds.add(id);
  _restListeners.forEach((cb) => cb());
}

export function isListOnly(): boolean {
  return _isListOnly;
}

export type Tri = 'all' | 'yes' | 'no';
export interface Filters { q: string; category: string; country: string; login: Tri; status: string; robots: string; captcha: Tri; ampel: string; sort: SortKey; }
export type SortKey = 'score' | 'stability' | 'p50' | 'throughput' | 'dataQuality' | 'name';
export const defaultFilters: Filters = { q: '', category: 'all', country: 'all', login: 'all', status: 'all', robots: 'all', captcha: 'all', ampel: 'all', sort: 'score' };

const tri = (f: Tri, v: boolean | null) => f === 'all' || (f === 'yes' ? v === true : v === false);

export function filterConnectors(list: Connector[], f: Filters): Connector[] {
  const q = f.q.trim().toLowerCase();
  const res = list.filter((c) =>
    (!q || [c.id, c.name, c.domain, c.description, c.category].some((x) => x?.toLowerCase().includes(q))) &&
    (f.category === 'all' || c.category === f.category) && (f.country === 'all' || c.country === f.country) &&
    (f.status === 'all' || c.status === f.status) && (f.robots === 'all' || c.robots === f.robots) &&
    (f.ampel === 'all' || c.ampel?.level === f.ampel) && tri(f.login, c.loginRequired) && tri(f.captcha, c.captcha));
  return sortConnectors(res, f.sort);
}

export function sortConnectors(list: Connector[], key: SortKey): Connector[] {
  if (key === 'name') return [...list].sort((a, b) => a.id.localeCompare(b.id));
  const asc = key === 'p50';
  const val = (c: Connector) => c.kpi?.[key] ?? null;
  return [...list].sort((a, b) => {
    const va = val(a), vb = val(b);
    if (va == null && vb == null) return a.id.localeCompare(b.id);
    if (va == null) return 1;
    if (vb == null) return -1;
    return asc ? va - vb : vb - va;
  });
}

export const uniq = (list: Connector[], k: 'category' | 'country') => [...new Set(list.map((c) => c[k]))].sort();

export function stats(list: Connector[]) {
  const n = list.length || 1;
  const withKpi = list.filter((c) => c.kpi?.stability != null);
  const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null);
  const count = (pred: (c: Connector) => boolean) => list.filter(pred).length;
  return {
    total: list.length, passing: count((c) => c.status === 'passing'), passRate: Math.round((100 * count((c) => c.status === 'passing')) / n),
    avgStability: avg(withKpi.map((c) => c.kpi!.stability!)), avgP50: avg(list.filter((c) => c.kpi?.p50).map((c) => c.kpi!.p50!)),
    records: list.reduce((a, c) => a + (c.records ?? 0), 0), login: count((c) => c.loginRequired === true),
    captcha: count((c) => c.captcha === true), robotsDisallowed: count((c) => c.robots === 'disallowed'),
    incidents: list.reduce((a, c) => a + (c.incidents?.length ?? 0), 0),
  };
}

export function groupCount(list: Connector[], k: 'category' | 'country' | 'status' | 'robots') {
  const m = new Map<string, { name: string; total: number; passing: number }>();
  for (const c of list) { const e = m.get(c[k]) ?? { name: c[k], total: 0, passing: 0 }; e.total++; if (c.status === 'passing') e.passing++; m.set(c[k], e); }
  return [...m.values()].sort((a, b) => b.total - a.total);
}

export function groupBy(list: Connector[], f: (c: Connector) => string | null | undefined, top = 10) {
  const m = new Map<string, number>();
  for (const c of list) { const k = f(c) || 'unbekannt'; m.set(k, (m.get(k) ?? 0) + 1); }
  const all = [...m.entries()].map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total);
  if (all.length <= top) return all;
  return [...all.slice(0, top), { name: 'andere', total: all.slice(top).reduce((a, x) => a + x.total, 0) }];
}
export function interfaceCoverage(list: Connector[]) {
  const n = list.length || 1;
  return INTERFACE_KEYS.map(([key, name]) => { const total = list.filter((c) => c.interfaces?.[key]).length; return { name, total, pct: Math.round((100 * total) / n) }; });
}
