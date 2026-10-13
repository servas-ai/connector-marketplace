import { dataset, defaultFilters, filterConnectors, groupCount, sortConnectors, stats } from './data';
import type { Connector } from './types';

const mk = (o: Partial<Connector>): Connector => ({ id: 'x', name: 'x', domain: 'x.at', description: '', category: 'a', country: 'AT', status: 'passing', repo: '', records: 1, commands: [], logo: null, paperclip: false, lastRun: null, e2ePassed: 1, e2eTotal: 1, kpi: null, loginRequired: false, captcha: false, apiAvailable: null, apiVersion: null, robots: 'unknown', robotsNote: null, incidents: [], links: { skill: null, protocol: null, samples: null }, source: null, ...o });
const kpi = (score: number, p50: number) => ({ stability: 100, p50, p95: p50, throughput: 1, captchaRate: 0, dataQuality: 5, score, blocked: false });
const list = [
  mk({ id: 'b', category: 'mobil', kpi: kpi(50, 300), robots: 'disallowed' }),
  mk({ id: 'a', category: 'energie', country: 'DE', loginRequired: true, captcha: true, kpi: kpi(90, 900), status: 'failing' }),
  mk({ id: 'c', description: 'Firmenbuch Suche' }),
];

describe('Datensatz', () => {
  it('ist nicht leer und hat eindeutige IDs', () => {
    expect(dataset.connectors.length).toBeGreaterThan(50);
    expect(new Set(dataset.connectors.map((c) => c.id)).size).toBe(dataset.connectors.length);
  });
  it('jeder Connector hat Pflichtfelder', () => {
    for (const c of dataset.connectors) { expect(c.id).toBeTruthy(); expect(['allowed', 'disallowed', 'unknown']).toContain(c.robots); expect(Array.isArray(c.incidents)).toBe(true); }
  });
});

describe('filterConnectors', () => {
  it('sucht in Beschreibung', () => expect(filterConnectors(list, { ...defaultFilters, q: 'firmen' }).map((c) => c.id)).toEqual(['c']));
  it('filtert Kategorie, Land, Login, Captcha, Status, robots', () => {
    expect(filterConnectors(list, { ...defaultFilters, category: 'mobil' }).map((c) => c.id)).toEqual(['b']);
    expect(filterConnectors(list, { ...defaultFilters, country: 'DE' }).map((c) => c.id)).toEqual(['a']);
    expect(filterConnectors(list, { ...defaultFilters, login: 'yes' }).map((c) => c.id)).toEqual(['a']);
    expect(filterConnectors(list, { ...defaultFilters, captcha: 'no' }).map((c) => c.id).sort()).toEqual(['b', 'c']);
    expect(filterConnectors(list, { ...defaultFilters, status: 'failing' }).map((c) => c.id)).toEqual(['a']);
    expect(filterConnectors(list, { ...defaultFilters, robots: 'disallowed' }).map((c) => c.id)).toEqual(['b']);
  });
});

describe('sortConnectors', () => {
  it('Score absteigend, ohne KPI zuletzt', () => expect(sortConnectors(list, 'score').map((c) => c.id)).toEqual(['a', 'b', 'c']));
  it('Latenz aufsteigend', () => expect(sortConnectors(list, 'p50').map((c) => c.id)).toEqual(['b', 'a', 'c']));
  it('Name', () => expect(sortConnectors(list, 'name').map((c) => c.id)).toEqual(['a', 'b', 'c']));
});

describe('stats', () => {
  it('zählt korrekt', () => {
    const s = stats(list);
    expect(s).toMatchObject({ total: 3, passing: 2, passRate: 67, login: 1, captcha: 1, robotsDisallowed: 1 });
    expect(groupCount(list, 'category').find((g) => g.name === 'energie')).toEqual({ name: 'energie', total: 1, passing: 0 });
  });
});
