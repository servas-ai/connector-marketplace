import type { ReactNode } from 'react';
import { dataset } from '@/lib/data';
import type { Connector } from '@/lib/types';
import { CATEGORIES, categoryOf } from '@/lib/taxonomy';
import { extra, growth } from '@/lib/extras';
import { fmtMs, median, successRate } from '@/lib/kpi';
import { Kpi, KpiBar } from '@/components/kit';
import { globalKpis } from './Home';
import { commercial, enterprise } from '@/lib/compliance';

const connectors = () => dataset.connectors;
const N = () => connectors().length;
const pct = (n: number, d = N()) => (d ? Math.round((100 * n) / d) : 0);
function count<T extends string>(f: (c: Connector) => T | T[] | null | undefined, top = 10) {
  const m = new Map<string, number>();
  for (const c of connectors()) { const v = f(c); for (const k of Array.isArray(v) ? v : [v]) if (k) m.set(k, (m.get(k) ?? 0) + 1); }
  const rows = [...m.entries()].sort((a, b) => b[1] - a[1]);
  return rows.length > top ? [...rows.slice(0, top), ['andere', rows.slice(top).reduce((a, x) => a + x[1], 0)] as [string, number]] : rows;
}
function Card({ title, sub, children, wide }: { title: string; sub?: string; children: ReactNode; wide?: boolean }) {
  return <section aria-label={title} className={`flex flex-col gap-3 rounded-xl border bg-card p-5 ${wide ? 'lg:col-span-2' : ''}`}><div><h2 className="font-semibold">{title}</h2>{sub && <p className="text-xs text-muted-foreground">{sub}</p>}</div>{children}</section>;
}
function Bars({ rows, color = 'var(--foreground)', total, testid }: { rows: [string, number][]; color?: string; total?: number; testid?: string }) {
  const max = Math.max(1, ...rows.map((r) => r[1]));
  return <ul className="flex flex-col gap-1.5" data-testid={testid}>{rows.map(([k, v]) => <li key={k} className="grid grid-cols-[minmax(6rem,11rem)_1fr_3.5rem] items-center gap-2 text-sm"><span className="truncate" title={k}>{k}</span><span className="h-2 rounded-full bg-muted"><span className="block h-2 rounded-full" style={{ width: `${(100 * v) / max}%`, background: color }} /></span><span className="text-right tabular-nums text-muted-foreground">{total ? `${pct(v, total)} %` : v}</span></li>)}</ul>;
}
function Coverage({ rows }: { rows: [string, number][] }) {
  return <ul className="flex flex-col gap-2.5">{rows.map(([k, v]) => <li key={k} className="text-sm"><div className="mb-1 flex justify-between"><span>{k}</span><span className="tabular-nums text-muted-foreground">{v} · {pct(v)} %</span></div><div className="h-2 rounded-full bg-muted"><div className="h-2 rounded-full bg-emerald-500" style={{ width: `${pct(v)}%` }} /></div></li>)}</ul>;
}
function Growth() {
  if (growth.length < 2) return <p className="text-sm text-muted-foreground">Noch zu wenige Messpunkte.</p>;
  const W = 640, H = 180, max = Math.max(...growth.map((g) => g.total));
  const pts = (k: 'total' | 'passing') => growth.map((g, i) => `${(i / (growth.length - 1)) * W},${H - (g[k] / max) * (H - 10)}`).join(' ');
  return <figure><svg viewBox={`0 0 ${W} ${H + 20}`} role="img" aria-label={`Wachstum von ${growth[0].passing} auf ${growth.at(-1)!.passing} bestandene Connectoren`} className="w-full">
    <polyline points={pts('total')} fill="none" stroke="currentColor" strokeOpacity="0.3" strokeWidth="2" /><polyline points={pts('passing')} fill="none" stroke="#10b981" strokeWidth="3" />
    {growth.map((g, i) => <text key={g.t} x={(i / (growth.length - 1)) * W} y={H + 16} fontSize="10" textAnchor={i === 0 ? 'start' : i === growth.length - 1 ? 'end' : 'middle'} fill="currentColor" opacity=".6">{i % 2 === 0 || i === growth.length - 1 ? g.t.slice(11, 16) : ''}</text>)}
  </svg><figcaption className="flex gap-4 text-xs text-muted-foreground"><span><span className="mr-1 inline-block h-0.5 w-4 bg-emerald-500 align-middle" />bestanden ({growth.at(-1)!.passing})</span><span><span className="mr-1 inline-block h-0.5 w-4 bg-current align-middle opacity-30" />gesamt im Index ({growth.at(-1)!.total})</span><span>stündlich, {growth[0].t.slice(0, 10)}</span></figcaption></figure>;
}
const hist = (xs: number[], edges: number[], fmt: (a: number, b: number) => string): [string, number][] => edges.slice(0, -1).map((a, i) => [fmt(a, edges[i + 1]), xs.filter((x) => x >= a && x < edges[i + 1]).length]);

export function Dashboard() {
  const k = globalKpis();
  const lv = { green: 0, yellow: 0, red: 0 }; for (const c of connectors()) if (c.ampel) lv[c.ampel.level]++;
  const p50s = connectors().map((c) => c.kpi?.p50).filter((x): x is number => !!x);
  const srs = connectors().map((c) => successRate(c)?.pct).filter((x): x is number => x != null);
  const captcha = new Map<string, number>(); for (const c of connectors()) for (const [t, n] of Object.entries(c.signals?.captchaTypes ?? {})) captcha.set(t, (captcha.get(t) ?? 0) + n);
  const sig: Record<string, number> = {}; for (const c of connectors()) for (const [t, n] of Object.entries(c.signals?.counts ?? {})) sig[t] = (sig[t] ?? 0) + n;
  return (
    <div className="flex flex-col gap-6">
      <header><h1 className="text-3xl font-bold tracking-tight">Statistik</h1><p className="text-muted-foreground">Alle Werte live aus der Datenbasis ({dataset.count} Connectoren, Stand {dataset.sourceGeneratedAt}).</p></header>
      <KpiBar label="Kennzahlen">
        <Kpi label="Connectoren" value={k.total} /><Kpi label="Ampel grün" value={`${pct(k.green)} %`} sub={`${k.green}`} /><Kpi label="Live verifiziert" value={`${k.verified}`} sub={`von ${k.audited} auditiert`} />
        <Kpi label="Median Erfolg" value={srs.length ? `${median(srs)} %` : '–'} sub={`${srs.length} gemessen`} /><Kpi label="Median p50" value={fmtMs(median(p50s))} /><Kpi label="Median p95" value={fmtMs(median(connectors().map((c) => c.kpi?.p95).filter((x): x is number => !!x)))} />
      </KpiBar>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Wachstum bestandener Connectoren" sub="aus der Git-Historie von index.json" wide><Growth /></Card>
        <Card title="Ampel-Verteilung"><div className="flex h-4 overflow-hidden rounded-full" role="img" aria-label={`grün ${lv.green}, gelb ${lv.yellow}, rot ${lv.red}`}>{(['green', 'yellow', 'red'] as const).map((l) => <span key={l} style={{ width: `${pct(lv[l])}%`, background: { green: '#10b981', yellow: '#f59e0b', red: '#ef4444' }[l] }} />)}</div>
          <p className="text-sm text-muted-foreground">grün {lv.green} · gelb {lv.yellow} · rot {lv.red}</p><h3 className="mt-2 text-sm font-medium">Häufigste Gründe für Gelb/Rot</h3><Bars testid="ampel-reasons" rows={count((c) => c.ampel?.reasons.map((r) => r.replace(/\d+ Fehler/, 'n Fehler')), 8)} color="#f59e0b" /></Card>
        <Card title="Kategorien"><Bars rows={CATEGORIES.map((x) => [x.label, connectors().filter((c) => categoryOf(c).id === x.id).length] as [string, number]).filter((r) => r[1]).sort((a, b) => b[1] - a[1])} color="#6366f1" /></Card>
        <Card title="Länder"><Bars rows={count((c) => c.country, 12)} color="#0ea5e9" /></Card>
        <Card title="Zugriffsart"><Bars rows={count((c) => c.interfaces?.access)} total={N()} color="#14b8a6" /></Card>
        <Card title="Live-Erfolgsrate" sub="Audit-Läufe bzw. E2E je Connector"><Bars rows={hist(srs, [0, 50, 80, 100, 101], (a, b) => (a === 100 ? '100 %' : `${a}–${b - 1} %`))} color="#10b981" /></Card>
        <Card title="Latenz p50" sub="Anzahl Connectoren je Bereich"><Bars rows={hist(p50s, [0, 200, 500, 1000, 3000, 1e9], (a, b) => (b > 1e8 ? `≥ ${a / 1000} s` : `${fmtMs(a)}–${fmtMs(b)}`))} color="#8b5cf6" /></Card>
        <Card title="Maschinenlesbarkeit & Zugang"><Coverage rows={[['robots.txt erlaubt', connectors().filter((c) => c.robots === 'allowed').length], ['llms.txt', connectors().filter((c) => extra(c).llms).length], ['OpenAPI', connectors().filter((c) => extra(c).openapi).length], ['Ohne Login', connectors().filter((c) => c.loginRequired === false).length], ['MCP-fähig', connectors().filter((c) => c.interfaces?.mcp || c.paperclip).length]]} /></Card>
        <Card title="Darstellung"><Coverage rows={[['Logo', connectors().filter((c) => c.logo).length], ['Echter Screenshot', connectors().filter((c) => extra(c).shot).length], ['Lizenz bekannt', connectors().filter((c) => extra(c).lic).length], ['Version bekannt', connectors().filter((c) => extra(c).v).length]]} /></Card>
        <Card title="Häufigste Fehler" sub="Audit-Hinweise, Gate-Codes und Beobachtungen"><Bars rows={count((c) => [...(c.gates?.codes ?? []), ...(c.incidents ?? []).map((x) => x.split(':')[0])], 8)} color="#ef4444" />
          <h3 className="mt-2 text-sm font-medium">Beobachtete Antworten</h3><Bars rows={Object.entries(sig).filter(([t]) => t !== 'ok').sort((a, b) => b[1] - a[1])} color="#ef4444" /></Card>
        <Card title="Captcha-Typen">{captcha.size ? <Bars rows={[...captcha.entries()].sort((a, b) => b[1] - a[1])} color="#f97316" /> : <p className="text-sm text-muted-foreground">Keine Captchas beobachtet.</p>}<p className="text-xs text-muted-foreground">{connectors().filter((c) => c.captcha).length} Connectoren mit Captcha</p></Card>
        <Card title="Compliance (Enterprise-Ampel)" sub="aus belegbaren Feldern, keine Rechtsberatung"><Bars rows={count((c) => enterprise(c).level)} total={N()} color="#10b981" /><h3 className="mt-2 text-sm font-medium">Kommerziell nutzbar</h3><Bars rows={count((c) => commercial(c).v)} total={N()} color="#0ea5e9" /></Card>
        <Card title="Hoster"><Bars rows={count((c) => c.server?.hoster, 10)} color="#64748b" /></Card>
        <Card title="CDN"><Bars rows={count((c) => c.net?.cdn ?? c.server?.cdn, 10)} color="#64748b" /></Card>
        <Card title="ASN"><Bars rows={count((c) => c.server?.asn, 10)} color="#64748b" /></Card>
      </div>
    </div>
  );
}
