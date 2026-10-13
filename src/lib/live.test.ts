import { describe, expect, it } from 'vitest';
import { change, parseCoinbase, parseKraken } from './live';

describe('live', () => {
  it('parst Kraken OHLC', () => {
    const s = parseKraken({ error: [], result: { XXBTZEUR: [[1760000000, '1', '2', '0.5', '100', '0', '1', 3], [1760003600, '1', '2', '0.5', '110', '0', '1', 3]], last: 1 } });
    expect(s.map((p) => p.v)).toEqual([100, 110]);
  });
  it('Kraken-Fehler ergibt leere Reihe', () => expect(parseKraken({ error: ['EQuery:Unknown asset pair'] })).toEqual([]));
  it('parst Coinbase-Kerzen (neueste zuerst -> chronologisch)', () => {
    expect(parseCoinbase([[2, 0, 0, 0, 20, 1], [1, 0, 0, 0, 10, 1]]).map((p) => p.v)).toEqual([10, 20]);
    expect(parseCoinbase({ message: 'NotFound' })).toEqual([]);
  });
  it('berechnet Änderung', () => { expect(change([{ t: 'a', v: 100 }, { t: 'b', v: 110 }])).toBeCloseTo(10); expect(change([])).toBeNull(); });
});

describe('fetchLive cache', () => {
  it('teilt Antworten innerhalb der TTL und hält ≥1 s pro Host ein', async () => {
    const { fetchLive, _resetLiveCache, CACHE_TTL_MS } = await import('./live');
    _resetLiveCache();
    let t = 0; const calls: number[] = [];
    const f = (async () => { calls.push(t); return new Response(JSON.stringify([[1, 0, 0, 0, 5, 1]])); }) as unknown as typeof fetch;
    await Promise.all([fetchLive('coinbase-candles', () => t, f), fetchLive('coinbase-candles', () => t, f)]);
    expect(calls).toHaveLength(1);
    t = CACHE_TTL_MS + 1; await fetchLive('coinbase-candles', () => t, f);
    expect(calls).toHaveLength(2);
  });
});
