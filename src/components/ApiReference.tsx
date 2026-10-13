import { useState } from 'react';
import { Clock, Terminal } from 'lucide-react';
import type { Connector } from '@/lib/types';
import type { AuditRun, Detail, Sample } from '@/lib/extras';
import { source } from '@/lib/prompt';
import { fmtMs } from '@/lib/kpi';
import { Badge } from '@/components/ui/badge';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { CopyBlock, When } from './kit';
import { cn } from '@/lib/utils';

type Tool = NonNullable<Detail['tools']>[number];
export interface ApiRoute { name: string; tool?: Tool; runs: AuditRun[]; samples: Sample[] }
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-');

export function buildRoutes(c: Connector, d: Detail | null): ApiRoute[] {
  const m = new Map<string, ApiRoute>();
  const add = (n: string) => { const k = norm(n); if (!m.has(k)) m.set(k, { name: n, runs: [], samples: [] }); return m.get(k)!; };
  for (const t of d?.tools ?? []) add(t.name).tool = t;
  for (const n of c.commands) add(n);
  const keys = () => [...m.keys()].sort((a, b) => b.length - a.length);
  const match = (n: string) => keys().find((k) => norm(n) === k || norm(n).startsWith(`${k}-`));
  for (const r of d?.audit?.runs ?? []) (m.get(match(r.case) ?? '') ?? add(r.case.split(/[\s-]/)[0])).runs.push(r);
  for (const s of d?.samples ?? []) { if (/^(data|fehler|error)/.test(s.name) && !match(s.name)) continue; (m.get(match(s.name) ?? '') ?? add(s.name)).samples.push(s); }
  return [...m.values()];
}

const prüfen = <span className="text-muted-foreground">— prüfen</span>;
function cliCall(c: Connector, r: ApiRoute, s?: Sample) {
  const run = r.runs[0]?.args; const inp = s?.input && typeof s.input === 'object' && 'command' in s.input ? String((s.input as { command: unknown }).command) : '';
  const args = run ?? (inp && !inp.includes('/') ? inp : r.name);
  const call = args.startsWith('node ') ? args : `node bin/cli.js ${args}`;
  return `cd ${source(c).dir}\n${/--format/.test(call) ? call : `${call} --format json`}`;
}

function RouteDetail({ c, r, at }: { c: Connector; r: ApiRoute; at?: string }) {
  const [si, setSi] = useState(0); const s = r.samples[si]; const run = r.runs[0];
  const props = r.tool?.parametersSchema?.properties; const req = new Set(r.tool?.parametersSchema?.required ?? []);
  const observed = r.runs.map((x) => x.args).filter(Boolean);
  return <div className="flex flex-col gap-5" data-testid="route-detail">
    <div className="flex flex-wrap items-center gap-2"><Badge variant="outline" className="font-mono">CLI</Badge><code className="text-base font-semibold">{r.tool?.command ?? `bin/cli.js ${r.name}`}</code>
      {run ? <Badge variant={run.ok ? 'success' : 'destructive'}>{run.ok ? 'ok' : 'Fehler'}</Badge> : <Badge variant="outline" className="text-muted-foreground">nicht einzeln geprüft</Badge>}</div>
    {r.tool?.description && <p className="text-sm text-muted-foreground">{r.tool.description}</p>}
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {[['Letzter Test', run && at ? <When iso={at} /> : prüfen], ['Latenz', run ? fmtMs(run.ms) : prüfen], ['Datensätze', run?.records ?? prüfen], ['Ausgabeschema', run ? (run.schemaOk ? 'servas.record.v1' : `${run.schemaErrors} Abweichungen`) : prüfen]].map(([k, v], i) =>
        <div key={i} className="rounded-lg border p-3"><dt className="text-[11px] font-medium uppercase text-muted-foreground">{k}</dt><dd className="mt-0.5 text-sm font-medium">{v}</dd></div>)}
    </dl>
    <section><h4 className="mb-2 text-sm font-semibold">Parameter</h4>
      {props && Object.keys(props).length ? <Table aria-label={`Parameter ${r.name}`}><THead><TR><TH>Name</TH><TH>Typ</TH><TH>Pflicht</TH><TH>Beschreibung</TH></TR></THead><TBody>
        {Object.entries(props).map(([n, p]) => <TR key={n}><TD className="font-mono text-xs">{n}</TD><TD><Badge variant="secondary" className="font-mono">{p.type ?? '?'}</Badge></TD><TD>{req.has(n) ? 'ja' : 'nein'}</TD><TD className="text-xs">{p.description ?? ''}{p.enum ? ` (${p.enum.join(', ')})` : ''}{p.default != null ? ` · Standard ${String(p.default)}` : ''}</TD></TR>)}</TBody></Table>
        : <p className="text-sm">{prüfen} <span className="text-xs text-muted-foreground">Kein parametersSchema im Manifest.{observed.length ? ` Getestete Aufrufe: ${observed.join(' · ')}` : ''}</span></p>}
    </section>
    <section><h4 className="mb-2 text-sm font-semibold">Ausgabe</h4>
      {s?.types && Object.keys(s.types).length ? <Table aria-label={`Ausgabefelder ${r.name}`}><THead><TR><TH>Feld (rows[])</TH><TH>Typ im Beispiel</TH></TR></THead><TBody>
        {Object.entries(s.types).map(([f, t]) => <TR key={f}><TD className="font-mono text-xs">{f}</TD><TD><Badge variant="secondary" className="font-mono">{t}</Badge></TD></TR>)}</TBody></Table>
        : <p className="text-sm">{prüfen} <span className="text-xs text-muted-foreground">Keine Beispielantwort gespeichert.</span></p>}
      <p className="mt-2 text-xs text-muted-foreground">Hülle: <code>{'{ schema: "servas.record.v1", source, fetched_at, rows: [...] }'}</code>. Typen aus der echten Beispielantwort abgeleitet.</p>
    </section>
    <section className="grid gap-4 xl:grid-cols-2">
      <div><h4 className="mb-2 text-sm font-semibold">Beispiel-Request</h4><CopyBlock label={`Request ${r.name}`} text={cliCall(c, r, s)} /></div>
      <div><div className="mb-2 flex flex-wrap items-center gap-2"><h4 className="text-sm font-semibold">Beispiel-Response</h4>
        {r.samples.length > 1 && <div className="flex flex-wrap gap-1">{r.samples.map((x, i) => <button key={x.name} type="button" aria-pressed={i === si} onClick={() => setSi(i)} className={cn('rounded border px-1.5 py-0.5 text-xs', i === si ? 'bg-primary text-primary-foreground' : 'hover:bg-accent')}>{x.name}</button>)}</div>}</div>
        {s ? <CopyBlock testid="sample" label={`Response ${s.name}`} text={s.body} /> : <p className="text-sm">{prüfen}</p>}</div>
    </section>
  </div>;
}

export function ApiReference({ c, d }: { c: Connector; d: Detail | null }) {
  const routes = buildRoutes(c, d); const [sel, setSel] = useState(0); const http = d?.routes ?? [];
  return <div className="flex flex-col gap-5">
    <div className="flex flex-wrap items-center gap-2 text-sm"><Badge variant="secondary">{routes.length} Commands</Badge><Badge variant="secondary">{http.length} HTTP-Routen der Quelle</Badge>
      {d?.audit && <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Clock size={12} aria-hidden />Letzter Live-Test: <When iso={d.audit.at} /></span>}</div>
    {routes.length > 0 ? <div className="grid gap-5 rounded-xl border bg-card lg:grid-cols-[16rem_1fr]">
      <nav aria-label="Commands" className="flex flex-col gap-0.5 border-b p-2 lg:border-b-0 lg:border-r">{routes.map((r, i) => { const run = r.runs[0]; return <button key={r.name} type="button" aria-current={i === sel} onClick={() => setSel(i)}
        className={cn('flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm', i === sel ? 'bg-accent font-medium' : 'hover:bg-muted')}>
        <Terminal size={14} aria-hidden className="shrink-0 text-muted-foreground" /><span className="min-w-0 flex-1 truncate font-mono text-xs">{r.name}</span>
        <span aria-label={run ? (run.ok ? 'Test ok' : 'Test fehlgeschlagen') : 'nicht geprüft'} className={cn('size-2 shrink-0 rounded-full', run ? (run.ok ? 'bg-emerald-500' : 'bg-red-500') : 'bg-muted-foreground/30')} /></button>; })}</nav>
      <div className="min-w-0 p-4 lg:pl-0">{routes[sel] && <RouteDetail key={routes[sel].name} c={c} r={routes[sel]} at={d?.audit?.at} />}</div>
    </div> : <p className="rounded-xl border p-6 text-sm">{prüfen} <span className="text-muted-foreground">Keine Commands im Manifest oder Index.</span></p>}
    {http.length > 0 && <section className="rounded-xl border bg-card p-5"><h3 className="mb-3 font-semibold">HTTP-Routen der Quelle ({http.length})</h3><Table aria-label="HTTP-Routen"><THead><TR><TH>Methode</TH><TH>Pfad</TH><TH>Art</TH></TR></THead>
      <TBody>{http.map((r, i) => { let host = '', path = r.url; try { const u = new URL(r.url.replace(/\{[^}]*\}/g, 'x')); host = u.host; path = r.url.slice(r.url.indexOf(u.host) + u.host.length) || '/'; } catch { /* Platzhalter-URL */ }
        return <TR key={i}><TD><Badge variant="outline" className="font-mono">{r.method}</Badge></TD><TD className="font-mono text-xs break-all"><span className="text-muted-foreground">{host}</span>{path}</TD><TD className="text-xs">{r.kind}</TD></TR>; })}</TBody></Table></section>}
  </div>;
}
