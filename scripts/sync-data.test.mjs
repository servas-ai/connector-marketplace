import { describe, expect, it } from 'vitest';
import { countryOf, parseCsv, parseFrontmatter, parseProtocol } from './sync-data.mjs';

describe('sync-data', () => {
  it('parst Frontmatter', () => expect(parseFrontmatter('---\nname: opencli-ris\ndescription: "X"\n---\n# T')).toEqual({ name: 'opencli-ris', description: 'X' }));
  it('parst CSV', () => expect(parseCsv('a,b\n1,2\n')).toEqual([{ a: '1', b: '2' }]));
  it('parst Prüfprotokoll', () => {
    const md = '| Feld | Wert |\n|---|---|\n| API-Version | v2.6 |\n| Login nötig | nein (getestet) |\n| Captcha beim Lauf | nein |\n| robots.txt / ToS | sperrt Crawler (Disallow: /) |\n| Letzter Live-Lauf | 2026-10-13T02:17:43Z |\n| Ergebnis | **3/4 grün** |\n\n| Fall | Aufruf | Status | Datensätze | Dauer | x |\n|---|---|---|---|---|---|\n| a | `x` | ✅ | 5 | 100 ms | – |\n| b | `y` | ❌ | 0 | 300 ms | – |\n\n## Hinweise\n- Achtung: 429 bei schnellen Anfragen\n';
    const p = parseProtocol(md);
    expect(p).toMatchObject({ apiVersion: 'v2.6', loginRequired: false, captcha: false, robots: 'disallowed', e2ePassed: 3, e2eTotal: 4, latencies: [100, 300] });
    expect(p.incidents).toHaveLength(2);
  });
  it('erkennt Länder', () => {
    expect(countryOf('brreg-no', 'data.brreg.no')).toBe('NO');
    expect(countryOf('a1-net', 'a1.net')).toBe('AT');
    expect(countryOf('gleif', 'api.gleif.org', 'international/welle-int/gleif')).toBe('INT');
  });
});
