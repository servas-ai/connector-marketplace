import type { LiveEndpoint, LivePoint } from './types';

// Öffentliche, CORS-fähige Endpunkte ohne Login (siehe finance/* in opencli-connectors).
export const LIVE_URLS: Record<LiveEndpoint, string> = {
  'kraken-ohlc': 'https://api.kraken.com/0/public/OHLC?pair=XBTEUR&interval=60',
  'coinbase-candles': 'https://api.exchange.coinbase.com/products/BTC-EUR/candles?granularity=3600',
};

type KrakenOhlc = { error?: string[]; result?: Record<string, unknown> };
export function parseKraken(j: KrakenOhlc, n = 48): LivePoint[] {
  if (!j?.result || j.error?.length) return [];
  const k = Object.keys(j.result).find((x) => x !== 'last');
  const rows = (k ? j.result[k] : []) as unknown[][];
  return rows.slice(-n).map((c) => ({ t: new Date(Number(c[0]) * 1000).toISOString(), v: Number(c[4]) })).filter((p) => Number.isFinite(p.v));
}
export function parseCoinbase(j: unknown, n = 48): LivePoint[] {
  if (!Array.isArray(j)) return [];
  return (j as number[][]).slice(0, n).reverse().map((c) => ({ t: new Date(c[0] * 1000).toISOString(), v: Number(c[4]) })).filter((p) => Number.isFinite(p.v));
}
export async function fetchLive(ep: LiveEndpoint, signal?: AbortSignal): Promise<LivePoint[]> {
  const r = await fetch(LIVE_URLS[ep], { signal });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const j = await r.json();
  return ep === 'kraken-ohlc' ? parseKraken(j) : parseCoinbase(j);
}
export function change(series: LivePoint[]): number | null {
  if (series.length < 2 || !series[0].v) return null;
  return ((series[series.length - 1].v / series[0].v) - 1) * 100;
}
