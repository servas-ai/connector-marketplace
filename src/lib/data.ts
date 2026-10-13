import { INTERFACE_KEYS } from './interfaceKeys';
import raw from '@/data/connectors.json';
import type { Connector, Dataset } from './types';
export const dataset = raw as unknown as Dataset;

export type Tri = 'all' | 'yes' | 'no';
export interface Filters { q: string; category: string; country: string; login: Tri; status: string; robots: string; captcha: Tri; sort: SortKey; }
export type SortKey = 'score' | 'stability' | 'p50' | 'throughput' | 'dataQuality' | 'name';
export const defaultFilters: Filters = { q: '', category: 'all', country: 'all', login: 'all', status: 'all', robots: 'all', captcha: 'all', sort: 'score' };

const tri = (f: Tri, v: boolean | null) => f === 'all' || (f === 'yes' ? v === true : v === false);

export function filterConnectors(list: Connector[], f: Filters): Connector[] {
  const q = f.q.trim().toLowerCase();
  const res = list.filter((c) =>
    (!q || [c.id, c.name, c.domain, c.description, c.category].some((x) => x?.toLowerCase().includes(q))) &&
    (f.category === 'all' || c.category === f.category) && (f.country === 'all' || c.country === f.country) &&
    (f.status === 'all' || c.status === f.status) && (f.robots === 'all' || c.robots === f.robots) &&
    tri(f.login, c.loginRequired) && tri(f.captcha, c.captcha));
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
    incidents: list.reduce((a, c) => a + c.incidents.length, 0),
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
