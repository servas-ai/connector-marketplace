import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Check, CheckCircle2, CircleDashed, Copy, XCircle } from 'lucide-react';
import type { Connector } from '@/lib/types';
import type { Cap } from '@/lib/capabilities';
import { categoryOf } from '@/lib/taxonomy';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { absTime, relTime } from '@/lib/kpi';

export const titleOf = (c: Connector) => (c.domain && /\./.test(c.domain) ? c.domain.replace(/^www\./, '') : c.id);

export function Logo({ c, size = 48, className, eager = false }: { c: Connector; size?: number; className?: string; eager?: boolean }) {
  const [err, setErr] = useState(false);
  const cat = categoryOf(c); const Icon = cat.icon; const r = Math.round(size * 0.22);
  if (c.logo && !err) return <img src={`${import.meta.env.BASE_URL}logos/${c.logo}`} alt="" width={size} height={size} loading={eager ? 'eager' : 'lazy'} decoding="async" fetchPriority={eager ? 'high' : undefined} onError={() => setErr(true)} data-testid="logo"
    className={cn('shrink-0 border bg-white object-contain', className)} style={{ width: size, height: size, borderRadius: r, padding: size * 0.12 }} />;
  return <div aria-hidden data-testid="logo-fallback" className={cn('flex shrink-0 items-center justify-center border text-white', className)} style={{ width: size, height: size, borderRadius: r, background: cat.hue }}><Icon size={size * 0.45} /></div>;
}

const AMPEL = { green: { label: 'Grün', cls: 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300', dot: 'bg-emerald-500' }, yellow: { label: 'Gelb', cls: 'bg-amber-500/15 text-amber-800 dark:text-amber-300', dot: 'bg-amber-500' }, red: { label: 'Rot', cls: 'bg-red-500/15 text-red-800 dark:text-red-300', dot: 'bg-red-500' } } as const;
export function AmpelPill({ c, reasons = false }: { c: Connector; reasons?: boolean }) {
  const l = c.ampel?.level; if (!l) return <Badge variant="outline">Ampel unbekannt</Badge>;
  const a = AMPEL[l];
  return <span className="inline-flex flex-wrap items-center gap-1.5" data-testid="ampel" data-level={l}>
    <span className={cn('inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium', a.cls)} title={c.ampel?.reasons.join(' · ') || 'alle Prüfungen grün'}><span aria-hidden className={cn('size-2 rounded-full', a.dot)} />Ampel {a.label}</span>
    {reasons && (c.ampel?.reasons.length ? c.ampel.reasons.map((r) => <Badge key={r} variant="outline" className="font-normal">{r}</Badge>) : <span className="text-xs text-muted-foreground">alle Prüfungen grün</span>)}
  </span>;
}

export function CapIcon({ v, size = 18 }: { v: Cap['value']; size?: number }) {
  if (v === true) return <CheckCircle2 size={size} aria-hidden className="shrink-0 text-emerald-600 dark:text-emerald-400" />;
  if (v === false) return <XCircle size={size} aria-hidden className="shrink-0 text-muted-foreground" />;
  return <CircleDashed size={size} aria-hidden className="shrink-0 text-muted-foreground/60" />;
}
export const capWord = (v: Cap['value']) => (v === true ? 'ja' : v === false ? 'nein' : 'unbekannt');

export function Kpi({ label, value, sub, testid }: { label: string; value: ReactNode; sub?: ReactNode; testid?: string }) {
  return <div data-testid={testid} className="flex min-w-0 flex-col gap-0.5 px-4 py-3"><dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</dt><dd className="text-xl font-semibold tabular-nums">{value}</dd>{sub != null && <dd className="truncate text-xs text-muted-foreground">{sub}</dd>}</div>;
}
export function KpiBar({ children, label }: { children: ReactNode; label: string }) {
  return <dl aria-label={label} className="grid grid-cols-2 divide-x divide-y rounded-xl border bg-card sm:grid-cols-3 sm:divide-y-0 lg:grid-cols-6 [&>*]:border-border">{children}</dl>;
}
export function When({ iso }: { iso?: string | null }) {
  if (!iso) return <span className="text-muted-foreground">–</span>;
  return <time dateTime={iso} title={absTime(iso)}>{relTime(iso)}<span className="block text-xs text-muted-foreground">{absTime(iso)}</span></time>;
}
export function CopyBlock({ text, label, testid }: { text: string; label: string; testid?: string }) {
  const [ok, setOk] = useState(false);
  const copy = () => navigator.clipboard?.writeText(text).then(() => { setOk(true); setTimeout(() => setOk(false), 1500); }).catch(() => {});
  return <div className="relative"><pre tabIndex={0} aria-label={label} data-testid={testid} className="max-h-[28rem] overflow-auto rounded-lg border bg-zinc-950 p-4 pr-12 text-[13px] leading-relaxed text-zinc-100"><code>{text}</code></pre>
    <button type="button" onClick={copy} aria-label={`${label} kopieren`} className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-md bg-white/10 px-2 py-1 text-xs text-white hover:bg-white/20">{ok ? <Check size={14} /> : <Copy size={14} />}{ok ? 'Kopiert' : 'Kopieren'}</button></div>;
}
export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return <div className="mb-3 flex items-end justify-between gap-3"><h2 className="text-lg font-semibold tracking-tight">{children}</h2>{action}</div>;
}
export function Crumb({ to, children }: { to: string; children: ReactNode }) { return <Link to={to} className="text-sm text-[color:var(--link)] hover:underline">{children}</Link>; }
