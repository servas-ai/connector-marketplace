import { AlertTriangle, CheckCircle2, HelpCircle, ShieldCheck, ShieldAlert, ShieldX, XCircle } from 'lucide-react';
import type { Connector } from '@/lib/types';
import { commercial, enterprise, items, type Level } from '@/lib/compliance';
import { cn } from '@/lib/utils';

const LV: Record<Level, { cls: string; Icon: typeof CheckCircle2; word: string }> = {
  ok: { cls: 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300', Icon: CheckCircle2, word: 'ok' },
  warn: { cls: 'bg-amber-500/15 text-amber-800 dark:text-amber-300', Icon: AlertTriangle, word: 'Achtung' },
  bad: { cls: 'bg-red-500/15 text-red-800 dark:text-red-300', Icon: XCircle, word: 'kritisch' },
  check: { cls: 'bg-muted text-muted-foreground', Icon: HelpCircle, word: 'prüfen' },
};
export function CBadge({ level, children }: { level: Level; children: React.ReactNode }) {
  const { cls, Icon } = LV[level];
  return <span className={cn('inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium', cls)}><Icon size={12} aria-hidden />{children}</span>;
}
export function EnterpriseBadge({ c }: { c: Connector }) {
  const e = enterprise(c); const I = e.level === 'grün' ? ShieldCheck : e.level === 'gelb' ? ShieldAlert : ShieldX;
  const cls = e.level === 'grün' ? LV.ok.cls : e.level === 'gelb' ? LV.warn.cls : LV.bad.cls;
  return <span data-testid="enterprise" title={e.reasons.join(' · ')} className={cn('inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium', cls)}><I size={12} aria-hidden />Enterprise {e.level}</span>;
}
export function CommercialBadge({ c }: { c: Connector }) {
  const v = commercial(c).v;
  return <CBadge level={v === 'ja' || v === 'mit Namensnennung' ? 'ok' : v === 'nein' ? 'bad' : 'check'}>kommerziell: {v}</CBadge>;
}
export function CompliancePanel({ c }: { c: Connector }) {
  const e = enterprise(c);
  return <div className="flex flex-col gap-5" data-testid="compliance">
    <section className="rounded-xl border bg-card p-5"><div className="mb-3 flex flex-wrap items-center gap-2"><h2 className="text-lg font-semibold">Compliance-Gesamtampel</h2><EnterpriseBadge c={c} /><CommercialBadge c={c} /></div>
      <ul className="list-disc pl-5 text-sm text-muted-foreground">{e.reasons.map((r) => <li key={r}>{r}</li>)}</ul></section>
    <section className="rounded-xl border bg-card p-5"><h2 className="mb-3 text-lg font-semibold">Lizenz, Datenschutz & Zugriff</h2>
      <dl className="flex flex-col">{items(c).map((x) => <div key={x.key} className="grid gap-1 border-b py-3 last:border-0 sm:grid-cols-[14rem_1fr_auto] sm:items-center sm:gap-4">
        <dt className="text-sm text-muted-foreground">{x.label}</dt><dd className="text-sm font-medium">{x.value}<span className="block text-xs font-normal text-muted-foreground">Beleg: {x.basis}</span></dd><dd><CBadge level={x.level}>{LV[x.level].word}</CBadge></dd></div>)}</dl></section>
    <p className="text-xs text-muted-foreground">Automatisch aus gespeicherten Feldern abgeleitet. Keine Rechtsberatung. „prüfen“ heißt: nicht belegt, vor geschäftlicher Nutzung selbst klären.</p>
  </div>;
}
