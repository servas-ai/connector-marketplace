// Synthetic fixtures only. This suite performs no network calls and never rewrites catalog data.
// Run with Node >=22.6: node --experimental-strip-types --test tests/catalog.node.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import {
  FACETS, PAGE_SIZE, COMPARE_LIMIT, QUERY_LIMIT, createCatalogIndex, readCatalogFilters,
  defaultCatalogFilters, searchCatalog, normalizeComparison, readComparison,
  toggleComparison, pageOf, catalogParams, booleanLabel,
} from '../src/lib/catalog.ts';

function fixture(id, patch = {}) {
  return {
    id, name: id, domain: `${id}.invalid`, description: 'Synthetic test fixture', category: 'test', country: 'AT',
    status: 'passing', repo: '', records: null, commands: ['search'], logo: null, paperclip: false, lastRun: null,
    e2ePassed: null, e2eTotal: null, kpi: null, loginRequired: null, captcha: null, apiAvailable: null,
    apiVersion: null, robots: 'unknown', robotsNote: null, incidents: [], links: { skill: null, protocol: null, samples: null }, source: null,
    ...patch,
  };
}
const kpi = patch => ({ score: null, stability: null, p50: null, p95: null, throughput: null, captchaRate: null, dataQuality: null, blocked: false, ...patch });
const a = fixture('a', { name: 'Öffentliche Straßen', description: 'Verkehr in Österreich', category: 'verkehr',
  loginRequired: false, captcha: false, apiAvailable: true, paperclip: true, robots: 'allowed', sourceType: 'api',
  ampel: { level: 'green', reasons: [] }, gates: { state: 'pass', errors: 0, codes: [] },
  server: { hoster: 'Test Hoster', country: 'DE', cdn: 'Test CDN' }, kpi: kpi({ score: 10, p50: 0 }) });
const b = fixture('b', { name: 'Alpha', country: 'DE', status: 'failing', loginRequired: true, captcha: true,
  robots: 'disallowed', apiAvailable: false, kpi: kpi({ score: 5, p50: 20 }), sourceType: 'dump', ampel: { level: 'red', reasons: [] },
  gates: { state: 'fail', errors: 1, codes: [] }, server: { hoster: 'Other Hoster', country: 'AT', cdn: null } });
const c = fixture('c', { name: 'Bücher', kpi: kpi({ score: NaN, p50: Infinity }) });
const d = fixture('d', { name: 'Alpha', kpi: kpi({ score: 5, p50: 5 }), gates: { state: 'extern', errors: 0, codes: [] } });
const e = fixture('e');
const source = [a, b, c, d, e];
const index = createCatalogIndex(source);
const filters = query => readCatalogFilters(new URLSearchParams(query), index);
const find = query => searchCatalog(index, filters(query)).map(x => x.id);

test('fourteen distinct fachliche facets; sort is not counted', () => {
  assert.equal(FACETS.length, 14); assert.equal(new Set(FACETS.map(f => f.key)).size, 14);
});
test('all records remain available without filters', () => assert.equal(find('').length, 5));
test('multiword AND matches across fields with case, accents and ß folded', () => assert.deepEqual(find('q=OFFENTLICHE+strassen+osterreich+AT'), ['a']));
test('search includes connector commands', () => assert.equal(find('q=search').length, 5));
test('search text is literal, never a regular expression', () => assert.deepEqual(find('q=%28.*%29'), []));
test('whitespace-only search returns all records', () => assert.equal(find('q=+++').length, 5));
test('q is bounded and arbitrary URL fields are not copied', () => {
  const f = filters(`q=${'x'.repeat(1000)}&token=synthetic&__proto__=polluted&sort=__proto__`);
  assert.equal(f.q.length, QUERY_LIMIT); assert.equal(f.sort, 'score'); assert.equal(Object.hasOwn(f, 'token'), false);
  assert.equal(Object.hasOwn(f, '__proto__'), false);
});
test('unknown boolean is not equivalent to false', () => {
  assert.deepEqual(find('login=no'), ['a']); assert.deepEqual(find('login=yes'), ['b']);
  assert.deepEqual(new Set(find('login=unknown')), new Set(['c', 'd', 'e']));
});
test('captcha unknown is separate from no', () => {
  assert.deepEqual(find('captcha=no'), ['a']); assert.deepEqual(new Set(find('captcha=unknown')), new Set(['c', 'd', 'e']));
});
test('API availability does not infer false from missing data', () => {
  assert.deepEqual(find('api=yes'), ['a']); assert.deepEqual(find('api=no'), ['b']); assert.equal(find('api=unknown').length, 3);
});
test('known zero-count boolean and unknown filters produce zero, not all', () => {
  const idx = createCatalogIndex([a]);
  for (const query of ['login=unknown', 'login=yes', 'captcha=unknown', 'gates=extern', 'status=failing']) {
    assert.equal(searchCatalog(idx, readCatalogFilters(new URLSearchParams(query), idx)).length, 0);
  }
});
test('legacy literal URLs normalize to collision-free option values', () => {
  assert.deepEqual(find('country=DE&status=failing'), ['b']); assert.equal(filters('country=AT').country, 'v:AT');
});
test('literal all/unknown values cannot become filter operators', () => {
  const idx = createCatalogIndex([fixture('one', { category: 'all' }), fixture('two', { category: 'unknown' }), fixture('three')]);
  for (const [query, id] of [['category=v:all', 'one'], ['category=v:unknown', 'two']]) {
    assert.deepEqual(searchCatalog(idx, readCatalogFilters(new URLSearchParams(query), idx)).map(x => x.id), [id]);
  }
});
test('unknown enum URL values normalize to all, invalid sort defaults to score', () => {
  const f = filters('login=not-a-choice&robots=maybe&sort=constructor');
  assert.equal(f.login, 'all'); assert.equal(f.robots, 'all'); assert.equal(f.sort, 'score');
});
test('all fourteen facets participate in intersection', () => {
  const query = 'category=verkehr&country=AT&login=no&status=passing&robots=allowed&captcha=no&ampel=green&api=yes&sourceType=api&hoster=Test+Hoster&serverCountry=DE&cdn=Test+CDN&gates=pass&paperclip=yes';
  assert.deepEqual(find(query), ['a']);
  assert.deepEqual(find(query.replace('paperclip=yes', 'paperclip=no')), []);
});
test('missing enrichment is unknown, not green or no CDN', () => {
  assert.deepEqual(new Set(find('ampel=unknown')), new Set(['c', 'd', 'e']));
  assert.equal(find('cdn=unknown').length, 4);
});
test('missing and invalid KPI values sort after known measurements', () => assert.deepEqual(find('sort=score'), ['a', 'b', 'd', 'c', 'e']));
test('zero p50 is a real measurement and latency sorts ascending', () => assert.deepEqual(find('sort=p50'), ['a', 'd', 'b', 'c', 'e']));
test('name sort uses display name and deterministic ID tie-break', () => assert.deepEqual(find('sort=name'), ['b', 'd', 'c', 'e', 'a']));
test('sort ties do not depend on incoming dataset order', () => {
  const reversed = createCatalogIndex([...source].reverse());
  assert.deepEqual(searchCatalog(reversed, defaultCatalogFilters).map(x => x.id), find(''));
});
test('index and query do not mutate original array or records', () => {
  const before = JSON.stringify(source); const original = [...source]; find('sort=name'); find('q=AT');
  assert.deepEqual(source, original); assert.equal(JSON.stringify(source), before);
});
test('facet totals use the full index and include unknown counts', () => {
  assert.equal(index.options.login.find(x => x.value === 'unknown').count, 3);
  assert.equal(index.options.login.find(x => x.value === 'all').count, 5);
});
test('empty catalog remains queryable with zero-count facets', () => {
  const empty = createCatalogIndex([]); assert.deepEqual(searchCatalog(empty, defaultCatalogFilters), []);
  assert.equal(empty.options.paperclip.find(x => x.value === 'unknown').count, 0);
});
test('ambiguous duplicate or comma-separated catalog IDs are rejected', () => {
  assert.throws(() => createCatalogIndex([a, a]), /duplicate/);
  assert.throws(() => createCatalogIndex([fixture('a,b')]), /Invalid/);
});
test('comparison removes unknown IDs before applying the four-slot cap', () => assert.deepEqual(normalizeComparison(['missing', 'a', 'a', 'b', 'c', 'd', 'e'], index), ['a', 'b', 'c', 'd']));
test('comparison supports repeated URL ids and deduplicates preserving order', () => assert.deepEqual(readComparison(new URLSearchParams('ids=a,a,missing&ids=b,c,d,e'), index), ['a', 'b', 'c', 'd']));
test('a fifth selection is refused without replacing existing choices', () => assert.deepEqual(toggleComparison(['a', 'b', 'c', 'd'], 'e', index), ['a', 'b', 'c', 'd']));
test('a full comparison can always remove an entry, then add another', () => {
  const after = toggleComparison(['a', 'b', 'c', 'd'], 'b', index);
  assert.deepEqual(toggleComparison(after, 'e', index), ['a', 'c', 'd', 'e']);
});
test('invalid selected ID cannot enter the state', () => assert.deepEqual(toggleComparison(['a'], 'missing', index), ['a']));
test('comparison URLs encode reserved characters in valid identifiers', () => {
  const id = 'synthetic & test/#'; const idx = createCatalogIndex([fixture(id)]);
  assert.deepEqual(readComparison(catalogParams(defaultCatalogFilters, [id]), idx), [id]);
});
test('filter changes and URL roundtrips retain selection', () => {
  const f = filters('country=AT&q=search'); const params = catalogParams(f, ['a', 'c'], 2);
  assert.deepEqual(readComparison(params, index), ['a', 'c']); assert.deepEqual(readCatalogFilters(params, index), f);
  assert.equal(params.get('page'), '2');
});
test('URL serializer omits defaults and duplicates; never copies arbitrary fields', () => {
  assert.equal(catalogParams(defaultCatalogFilters).toString(), '');
  assert.equal(catalogParams(filters('token=synthetic&login=no'), ['a', 'a']).get('ids'), 'a');
  assert.equal(catalogParams(filters('token=synthetic')).has('token'), false);
});
test('pagination renders no more than 24 items with valid boundaries', () => {
  const items = Array.from({ length: 50 }, (_, n) => n);
  assert.equal(pageOf(items, 1).items.length, PAGE_SIZE);
  assert.deepEqual(pageOf(items, 3), { page: 3, pages: 3, items: [48, 49], start: 49, end: 50 });
});
test('invalid, negative and too-large pages are clamped', () => {
  const items = Array.from({ length: 50 }, (_, n) => n);
  for (const value of [NaN, Infinity, -5, 0, 1.5]) assert.equal(pageOf(items, value).page, 1);
  assert.equal(pageOf(items, 999).page, 3);
});
test('empty results do not produce negative ranges', () => assert.deepEqual(pageOf([], 20), { page: 1, pages: 1, items: [], start: 0, end: 0 }));
test('page size zero and fractions are rejected', () => { assert.throws(() => pageOf([], 1, 0), RangeError); assert.throws(() => pageOf([], 1, 1.5), RangeError); });
test('comparison display keeps false, null and true distinct', () => {
  assert.equal(booleanLabel(false), 'Nein'); assert.equal(booleanLabel(true), 'Ja');
  assert.equal(booleanLabel(null), 'Unbekannt'); assert.equal(booleanLabel(undefined), 'Unbekannt');
});
test('1500-record prepared search stays below 100 ms p95 in this environment', t => {
  const large = Array.from({ length: 1500 }, (_, n) => fixture(`synthetic-${n}`, { category: `category-${n % 12}`,
    description: 'Synthetic benchmark only', country: n % 2 ? 'AT' : 'DE', kpi: kpi({ score: n % 100 }) }));
  const start = performance.now(); const idx = createCatalogIndex(large); const buildMs = performance.now() - start;
  const queries = ['', 'q=synthetic+benchmark', 'country=AT', 'category=category-3&sort=name', 'q=absent'];
  const durations = [];
  for (let n = 0; n < 110; n++) {
    const begin = performance.now(); const f = readCatalogFilters(new URLSearchParams(queries[n % queries.length]), idx);
    const result = searchCatalog(idx, f); pageOf(result, 1);
    const ms = performance.now() - begin; if (n >= 10) durations.push(ms);
  }
  durations.sort((x, y) => x - y); const p95 = durations[Math.ceil(durations.length * 0.95) - 1];
  t.diagnostic(JSON.stringify({ synthetic: true, records: large.length, measuredQueries: durations.length, buildMs, p95Ms: p95, maxMs: durations.at(-1), compareLimit: COMPARE_LIMIT }));
  assert.ok(p95 < 100, `p95 ${p95.toFixed(2)} ms exceeds 100 ms; not a browser/Lighthouse result`);
});
