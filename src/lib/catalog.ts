import type { Connector } from './types';

export const COMPARE_LIMIT = 4;
export const PAGE_SIZE = 24;
export const QUERY_LIMIT = 256;
export const UNKNOWN = 'unknown';
export const SORT_KEYS = ['score', 'stability', 'p50', 'throughput', 'dataQuality', 'name'] as const;
export type CatalogSort = typeof SORT_KEYS[number];
export type FacetKey = 'category' | 'country' | 'login' | 'status' | 'robots' | 'captcha' |
  'ampel' | 'api' | 'sourceType' | 'hoster' | 'serverCountry' | 'cdn' | 'gates' | 'paperclip';
export type CatalogFilters = Record<FacetKey, string> & { q: string; sort: CatalogSort };
export interface Option { value: string; label: string; count?: number; }
interface Facet { key: FacetKey; label: string; value: (c: Connector) => string; literal?: boolean; choices?: readonly string[]; }

const tri = (v: boolean | null | undefined) => v === true ? 'yes' : v === false ? 'no' : UNKNOWN;
// Prefix values from external data so real values named "all"/"unknown" cannot become operators.
const literal = (v: string | null | undefined) => v?.trim() ? `v:${v.trim()}` : UNKNOWN;
const enumValue = (v: string | undefined, allowed: readonly string[]) => allowed.includes(v ?? '') ? v! : UNKNOWN;
export const FACETS: readonly Facet[] = [
  { key: 'category', label: 'Kategorie', value: c => literal(c.category), literal: true },
  { key: 'country', label: 'Land', value: c => literal(c.country), literal: true },
  { key: 'login', label: 'Login', value: c => tri(c.loginRequired), choices: ['yes', 'no'] },
  { key: 'status', label: 'Status', value: c => literal(c.status), literal: true, choices: ['v:passing', 'v:failing'] },
  { key: 'robots', label: 'robots.txt', value: c => enumValue(c.robots, ['allowed', 'disallowed']), choices: ['allowed', 'disallowed'] },
  { key: 'captcha', label: 'Captcha', value: c => tri(c.captcha), choices: ['yes', 'no'] },
  { key: 'ampel', label: 'Ampel', value: c => enumValue(c.ampel?.level, ['green', 'yellow', 'red']), choices: ['green', 'yellow', 'red'] },
  { key: 'api', label: 'API verfügbar', value: c => tri(c.apiAvailable), choices: ['yes', 'no'] },
  { key: 'sourceType', label: 'Quellentyp', value: c => literal(c.sourceType), literal: true },
  { key: 'hoster', label: 'Hoster', value: c => literal(c.server?.hoster), literal: true },
  { key: 'serverCountry', label: 'Server-Land', value: c => literal(c.server?.country), literal: true },
  { key: 'cdn', label: 'CDN', value: c => literal(c.net?.cdn ?? c.server?.cdn), literal: true },
  { key: 'gates', label: 'Quality-Gates', value: c => enumValue(c.gates?.state, ['pass', 'fail', 'extern']), choices: ['pass', 'fail', 'extern'] },
  { key: 'paperclip', label: 'Paperclip', value: c => tri(c.paperclip), choices: ['yes', 'no'] },
];
const labels: Record<string, string> = {
  all: 'Alle', unknown: 'Unbekannt', yes: 'Ja', no: 'Nein', allowed: 'Erlaubt', disallowed: 'Disallow',
  green: 'Grün', yellow: 'Gelb', red: 'Rot', pass: 'Bestanden', fail: 'Fehlgeschlagen', extern: 'Extern / ungeprüft',
};
export const defaultCatalogFilters: CatalogFilters = {
  q: '', sort: 'score', category: 'all', country: 'all', login: 'all', status: 'all', robots: 'all',
  captcha: 'all', ampel: 'all', api: 'all', sourceType: 'all', hoster: 'all', serverCountry: 'all',
  cdn: 'all', gates: 'all', paperclip: 'all',
};
export const booleanLabel = (v: boolean | null | undefined) => labels[tri(v)];
const fold = (s: string) => s.normalize('NFKD').replace(/\p{M}/gu, '').toLocaleLowerCase('de').replace(/ß/g, 'ss');
const collator = new Intl.Collator('de', { numeric: true, sensitivity: 'base' });
const byId = (a: Connector, b: Connector) => collator.compare(a.id, b.id) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
interface IndexedConnector { connector: Connector; text: string; values: Record<FacetKey, string>; }
export interface CatalogIndex {
  entries: readonly IndexedConnector[];
  byId: ReadonlyMap<string, Connector>;
  options: Record<FacetKey, Option[]>;
}

/** Prepare once per immutable dataset revision, not once per keystroke. No network or storage. */
export function createCatalogIndex(connectors: readonly Connector[]): CatalogIndex {
  const byId = new Map<string, Connector>();
  const counts = Object.fromEntries(FACETS.map(f => [f.key, new Map<string, number>([UNKNOWN, ...(f.choices ?? [])].map(v => [v, 0]))])) as Record<FacetKey, Map<string, number>>;
  const entries = connectors.map(connector => {
    if (!connector.id || connector.id.includes(',') || byId.has(connector.id)) throw new Error('Invalid or duplicate connector ID');
    byId.set(connector.id, connector);
    const values = {} as Record<FacetKey, string>;
    for (const f of FACETS) {
      values[f.key] = f.value(connector);
      counts[f.key].set(values[f.key], (counts[f.key].get(values[f.key]) ?? 0) + 1);
    }
    const text = fold([connector.id, connector.name, connector.domain, connector.description,
      connector.category, connector.country, connector.sourceType, connector.server?.hoster,
      Array.isArray(connector.commands) ? connector.commands.join(' ') : ''].filter(Boolean).join(' '));
    return { connector, text, values };
  });
  const options = Object.fromEntries(FACETS.map(f => [f.key, [
    { value: 'all', label: 'Alle', count: entries.length },
    ...[...counts[f.key]].sort(([a], [b]) => a === b ? 0 : a === UNKNOWN ? 1 : b === UNKNOWN ? -1 : collator.compare(a, b))
      .map(([value, count]) => ({ value, label: value.startsWith('v:') ? value.slice(2) : labels[value] ?? value, count })),
  ]])) as CatalogIndex['options'];
  return { entries, byId, options };
}

/** Allowlisted, bounded URL state. Legacy country=AT/status=failing links remain supported. */
export function readCatalogFilters(params: URLSearchParams, index: CatalogIndex): CatalogFilters {
  const filters = { ...defaultCatalogFilters, q: (params.get('q') ?? '').slice(0, QUERY_LIMIT) };
  const sort = params.get('sort');
  if (SORT_KEYS.includes(sort as CatalogSort)) filters.sort = sort as CatalogSort;
  for (const facet of FACETS) {
    const raw = params.get(facet.key) ?? 'all';
    const options = index.options[facet.key];
    const known = options.some(o => o.value === raw);
    filters[facet.key] = known ? raw : facet.literal && options.some(o => o.value === `v:${raw}`) ? `v:${raw}` : 'all';
  }
  return filters;
}

export function searchCatalog(index: CatalogIndex, filters: CatalogFilters): Connector[] {
  const terms = fold(filters.q.slice(0, QUERY_LIMIT)).trim().split(/\s+/u).filter(Boolean);
  const active = FACETS.filter(f => filters[f.key] !== 'all');
  const result = index.entries.filter(e => terms.every(t => e.text.includes(t)) && active.every(f => e.values[f.key] === filters[f.key]))
    .map(e => e.connector);
  return result.sort((a, b) => {
    if (filters.sort === 'name') return collator.compare(a.name || a.id, b.name || b.id) || byId(a, b);
    const numeric = (c: Connector) => { const v = c.kpi?.[filters.sort as Exclude<CatalogSort, 'name'>]; return typeof v === 'number' && Number.isFinite(v) ? v : null; };
    const va = numeric(a), vb = numeric(b);
    if (va === null) return vb === null ? byId(a, b) : 1;
    if (vb === null) return -1;
    return (filters.sort === 'p50' ? va - vb : vb - va) || byId(a, b);
  });
}

/** Validate before capping: missing/duplicate IDs must not consume comparison slots. */
export function normalizeComparison(ids: readonly string[], index: CatalogIndex): string[] {
  return [...new Set(ids.filter(id => index.byId.has(id)))].slice(0, COMPARE_LIMIT);
}
export function readComparison(params: URLSearchParams, index: CatalogIndex): string[] {
  return normalizeComparison(params.getAll('ids').flatMap(value => value.split(',')), index);
}
export function toggleComparison(ids: readonly string[], id: string, index: CatalogIndex): string[] {
  const valid = normalizeComparison(ids, index);
  return valid.includes(id) ? valid.filter(x => x !== id) : normalizeComparison([...valid, id], index);
}

export function pageOf<T>(items: readonly T[], requested: number, size = PAGE_SIZE) {
  if (!Number.isInteger(size) || size < 1) throw new RangeError('Page size must be a positive integer');
  const pages = Math.max(1, Math.ceil(items.length / size));
  const page = Math.min(pages, Math.max(1, Number.isSafeInteger(requested) ? requested : 1));
  return { page, pages, items: items.slice((page - 1) * size, page * size), start: items.length ? (page - 1) * size + 1 : 0, end: Math.min(page * size, items.length) };
}

/** Share only recognized catalog state, never arbitrary query parameters. */
export function catalogParams(filters: CatalogFilters, ids: readonly string[] = [], page = 1): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.q) params.set('q', filters.q.slice(0, QUERY_LIMIT));
  if (filters.sort !== 'score') params.set('sort', filters.sort);
  for (const f of FACETS) if (filters[f.key] !== 'all') params.set(f.key, filters[f.key]);
  if (ids.length) params.set('ids', [...new Set(ids)].slice(0, COMPARE_LIMIT).join(','));
  if (Number.isSafeInteger(page) && page > 1) params.set('page', String(page));
  return params;
}
