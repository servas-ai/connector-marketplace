import { useEffect, useState } from 'react';
import type { Connector } from './types';

export interface ExtraSummary { shot?: string; v?: string; verdict?: string; liveOk?: string; auditAt?: string; llms?: boolean; openapi?: boolean; lic?: string; rc?: number; cmds?: string[]; codeLic?: string }
export interface AuditRun { case: string; args: string; ok: boolean; exit: number | null; ms: number | null; records: number | null; latestDate: string | null; schemaOk: boolean; schemaErrors: number }
export interface Sample { name: string; input: unknown; fields: string[]; types?: Record<string, string>; rows: number | null; body: string }
export interface Detail {
  audit?: { at: string; verdict: string; liveOk: string; flags: string[]; sourceUrl: string | null; sourceStatus: number | null; sourceMs: number | null; protocolLastRun: string | null; mockFree: boolean; network: boolean; runs: AuditRun[] };
  version?: string; codeLicense?: string; deps?: Record<string, string>; engines?: Record<string, string> | null; pkgName?: string; licenseFrom?: string;
  mx?: { rate_limit?: string; login?: boolean; robots_status?: string; robots?: string; tos?: string; access_chain?: string[]; access_used?: string; schema?: string; data_license?: string; license?: string; license_url?: string; license_evidence?: string; realtime?: boolean };
  tools?: { name: string; displayName?: string; description?: string; command?: string; parametersSchema?: { properties?: Record<string, { type?: string; description?: string; enum?: unknown[]; default?: unknown }>; required?: string[] } }[];
  commit?: { sha: string; at: string; msg: string; repo: string }; changelog?: { sha: string; at: string; msg: string }[];
  manifest?: boolean; routes?: { method: string; url: string; kind: string }[]; license?: string; homepage?: string;
  llms?: { host: string; checkedAt: string; robots: string; llmsTxt: string | null; llmsFull: string | null; openapi: string | null; openapiPaths: number | null; mcp: string | null };
  screenshot?: string; screenshotAt?: string; samples?: Sample[]; index?: Record<string, unknown>;
}
interface Raw { growth: { t: string; total: number; passing: number; green: number | null }[]; connectors: Record<string, ExtraSummary>; builtFrom?: unknown }

let _map: Record<string, ExtraSummary> = {};
export let growth: Raw['growth'] = [];

/** Tests / Node: inject without fetch. */
export function setExtras(d: Raw): void {
  growth = d.growth ?? [];
  _map = d.connectors ?? {};
}

export function extra(c: Connector | string): ExtraSummary {
  return _map[typeof c === 'string' ? c : c.id] ?? {};
}

/** Browser: load extras.json as separate gzip-friendly asset — not bundled into JS. */
export async function loadExtras(): Promise<void> {
  if (Object.keys(_map).length) return;
  const base = import.meta.env.BASE_URL || './';
  const res = await fetch(`${base}data/extras.json`);
  if (!res.ok) throw new Error(`extras.json HTTP ${res.status}`);
  setExtras((await res.json()) as Raw);
}

const base = import.meta.env.BASE_URL;
function useJson<T>(url: string | null): { data: T | null; loading: boolean } {
  const [s, setS] = useState<{ url: string | null; data: T | null }>({ url: null, data: null });
  useEffect(() => {
    if (!url) return;
    let live = true;
    fetch(url).then((r) => (r.ok ? r.json() : null)).catch(() => null).then((d) => { if (live) setS({ url, data: d }); });
    return () => { live = false; };
  }, [url]);
  return { data: s.url === url ? s.data : null, loading: !!url && s.url !== url };
}
export const useDetail = (id: string) => useJson<Detail>(`${base}x/${id}.json`);
export const useManifest = (id: string, on: boolean) => useJson<Record<string, unknown>>(on ? `${base}manifests/${id}.json` : null);
