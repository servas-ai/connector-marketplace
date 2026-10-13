import type { LiveEndpoint, LivePoint } from './types';

// Öffentliche, CORS-fähige Endpunkte ohne Login (siehe finance/* in opencli-connectors).
export const LIVE_URLS: Record<LiveEndpoint, string> = {
  'kraken-ohlc': 'https://api.kraken.com/0/public/OHLC?pair=XBTEUR&interval=60',
  'coinbase-candles': 'https://api.exchange.coinbase.com/products/BTC-EUR/candles?granularity=3600',
  'binance-klines': 'https://data-api.binance.vision/api/v3/klines?symbol=BTCEUR&interval=1h&limit=48',
};
/** Cache-TTL: 60 s. Innerhalb davon teilen sich alle Karten eine Antwort (auch laufende Requests). */
export const CACHE_TTL_MS = 60_000;
/** Mindestabstand zwischen zwei Requests an denselben Host. */
export const MIN_HOST_GAP_MS = 1_000;

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
export function parseBinance(j: unknown, n = 48): LivePoint[] {
  if (!Array.isArray(j)) return [];
  return (j as unknown[][]).slice(-n).map((c) => ({ t: new Date(Number(c[0])).toISOString(), v: Number(c[4]) })).filter((p) => Number.isFinite(p.v));
}
const PARSERS: Record<LiveEndpoint, (j: never) => LivePoint[]> = { 'kraken-ohlc': parseKraken, 'coinbase-candles': parseCoinbase, 'binance-klines': parseBinance };

const cache = new Map<string, { at: number; p: Promise<LivePoint[]> }>();
const hostNext = new Map<string, number>();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Holt eine Reihe über den gemeinsamen Cache; pro Host ≥1 s Abstand; gleiche URL = ein Request. */
export function fetchLive(ep: LiveEndpoint, now: () => number = Date.now, doFetch: typeof fetch = (...a) => fetch(...a)): Promise<LivePoint[]> {
  const url = LIVE_URLS[ep];
  const hit = cache.get(url);
  if (hit && now() - hit.at < CACHE_TTL_MS) return hit.p;
  const host = new URL(url).host;
  const slot = Math.max(now(), hostNext.get(host) ?? 0);
  hostNext.set(host, slot + MIN_HOST_GAP_MS);
  const p = (async () => {
    const wait = slot - now(); if (wait > 0) await sleep(wait);
    const r = await doFetch(url);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return PARSERS[ep]((await r.json()) as never);
  })();
  p.catch(() => cache.delete(url));
  cache.set(url, { at: now(), p });
  return p;
}
export function _resetLiveCache() { cache.clear(); hostNext.clear(); }

// Ein globaler Takt statt Polling pro Karte.
type Sub = () => void;
const subs = new Set<Sub>(); let timer: ReturnType<typeof setInterval> | null = null;
export function subscribeTick(fn: Sub): () => void {
  subs.add(fn);
  if (!timer) timer = setInterval(() => subs.forEach((s) => s()), CACHE_TTL_MS);
  return () => { subs.delete(fn); if (!subs.size && timer) { clearInterval(timer); timer = null; } };
}

export function change(series: LivePoint[]): number | null {
  if (series.length < 2 || !series[0].v) return null;
  return ((series[series.length - 1].v / series[0].v) - 1) * 100;
}
