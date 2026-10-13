import { describe, expect, it } from 'vitest';
import { apex, cdnOf, cmsOf, domainAge, gatesOf, hosterOf, interfacesOf, sourceTypeOf } from './enrich.mjs';

const c = (o = {}) => ({ id: 'x', category: 'mobil', domain: 'x.at', commands: ['a'], repo: 'https://github.com/servas-ai/opencli-x', paperclip: true, apiAvailable: false, source: 'https://x.at', ...o });
describe('enrich', () => {
  it('hoster aus ASN-Org', () => { expect(hosterOf('Amazon.com, Inc.')).toBe('AWS'); expect(hosterOf('Hetzner Online GmbH')).toBe('Hetzner'); expect(hosterOf(null)).toBeNull(); expect(hosterOf('Foo GmbH')).toBe('Foo'); });
  it('CDN und CMS', () => {
    expect(cdnOf({ cdn: null }, 'Cloudflare')).toBe('Cloudflare'); expect(cdnOf({ cdn: 'Akamai' }, 'AWS')).toBe('Akamai'); expect(cdnOf({ cdn: '1.1 abc.cloudfront.net (CloudFront)' }, 'AWS')).toBe('CloudFront');
    expect(cmsOf({ technologies: ['jQuery', 'WordPress'] })).toBe('WordPress'); expect(cmsOf({ technologies: [], generator: 'TYPO3 CMS' })).toBe('TYPO3'); expect(cmsOf(null)).toBeNull();
  });
  it('Quellentyp', () => {
    expect(sourceTypeOf(c())).toBe('Shop/Anbieter'); expect(sourceTypeOf(c({ id: 'firmenbuch', category: 'adapters' }))).toBe('Register');
    expect(sourceTypeOf(c({ id: 'statistik-austria', category: 'opendata', domain: 'statistik.at' }))).toBe('Behörde');
  });
  it('Schnittstellen-Matrix', () => {
    const i = interfacesOf(c(), { zugang: 'offene API ohne Key', urls: ['https://x.at/feed.xml'] });
    expect(i).toMatchObject({ apiOpen: true, apiKey: false, feed: true, cli: true, opencli: true, paperclip: true, mcp: true });
    expect(interfacesOf(c({ commands: [] }), { zugang: 'Open-Data-Dump' })).toMatchObject({ ogdDump: true, cli: false });
  });
  it('Gate-Status', () => {
    const g = { 'adapters/opencli-x': [['QG-002', 'a'], ['QG-002', 'b']], 'b/y': [] };
    expect(gatesOf(c(), g)).toMatchObject({ state: 'fail', errors: 2, codes: ['QG-002'] });
    expect(gatesOf(c({ id: 'y' }), g).state).toBe('pass'); expect(gatesOf(c({ id: 'z' }), g).state).toBe('extern'); expect(gatesOf(c(), null).state).toBe('unknown');
  });
  it('apex inkl. gv.at', () => { expect(apex('www.evi.gv.at')).toBe('evi.gv.at'); expect(apex('www.spusu.at')).toBe('spusu.at'); });
  it('Domain-Alter', () => { expect(domainAge('2016-10-13T00:00:00Z', Date.parse('2026-10-13T00:00:00Z'))).toBe(10); expect(domainAge(null)).toBeNull(); });
});
