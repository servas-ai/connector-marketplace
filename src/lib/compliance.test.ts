import { dataset } from './data';
import { commercial, enterprise, items } from './compliance';
import { extra } from './extras';

describe('Compliance', () => {
  it('unbekannte Datenlizenz wird ehrlich als "prüfen" gezeigt', () => {
    const c = dataset.connectors.find((x) => !extra(x).lic)!;
    expect(commercial(c).v).toBe('prüfen');
    expect(items(c).find((i) => i.key === 'data')!.level).toBe('check');
    expect(enterprise(c).level).not.toBe('grün');
  });
  it('CC0 = kommerziell ja, CC-BY = mit Namensnennung', () => {
    const cc0 = dataset.connectors.find((x) => /CC0/.test(extra(x).lic ?? ''));
    const by = dataset.connectors.find((x) => /^CC-BY-4.0$/.test(extra(x).lic ?? ''));
    if (cc0) expect(commercial(cc0).v).toBe('ja');
    if (by) expect(commercial(by).v).toBe('mit Namensnennung');
  });
  it('robots Disallow macht die Enterprise-Ampel rot', () => {
    const c = dataset.connectors.find((x) => x.robots === 'disallowed')!;
    expect(enterprise(c).level).toBe('rot');
  });
});
