import type { Connector } from './types';
import { extra } from './extras';

const rtf = new Intl.RelativeTimeFormat('de-AT', { numeric: 'auto' });
export function relTime(iso?: string | null, now = Date.now()): string {
  if (!iso) return '–';
  const s = (new Date(iso).getTime() - now) / 1000;
  if (Number.isNaN(s)) return '–';
  const a = Math.abs(s);
  if (a < 60) return rtf.format(Math.round(s), 'second');
  if (a < 3600) return rtf.format(Math.round(s / 60), 'minute');
  if (a < 86400) return rtf.format(Math.round(s / 3600), 'hour');
  return rtf.format(Math.round(s / 86400), 'day');
}
export const absTime = (iso?: string | null) => (iso ? new Date(iso).toLocaleString('de-AT', { dateStyle: 'medium', timeStyle: 'short' }) : '–');

/** Live-Erfolgsrate in %: Audit-Läufe, sonst E2E bestanden/gesamt. */
export function successRate(c: Connector): { pct: number; label: string } | null {
  const lo = extra(c).liveOk?.match(/(\d+)\/(\d+)/);
  if (lo && +lo[2] > 0) return { pct: Math.round((100 * +lo[1]) / +lo[2]), label: `${lo[1]}/${lo[2]} Audit-Läufe` };
  if (c.e2eTotal) return { pct: Math.round((100 * (c.e2ePassed ?? 0)) / c.e2eTotal), label: `${c.e2ePassed}/${c.e2eTotal} E2E` };
  return null;
}
export const lastCheck = (c: Connector) => [extra(c).auditAt, c.lastRun, c.signals?.last].filter(Boolean).sort().pop() ?? null;
export const routeCount = (c: Connector) => extra(c).rc || c.urls?.length || c.commands.length || 0;
export const median = (xs: number[]) => { if (!xs.length) return null; const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };
export const fmtMs = (v?: number | null) => (v == null ? '–' : v >= 1000 ? `${(v / 1000).toFixed(1)} s` : `${Math.round(v)} ms`);
export const VERDICT: Record<string, string> = { echt_gruen: 'live verifiziert', teilweise: 'teilweise verifiziert', nur_behauptet: 'nur behauptet', kaputt: 'kaputt', blocked: 'blockiert' };
