import { Link } from 'react-router-dom';
import { Camera, Clock, Gauge, Route } from 'lucide-react';
import type { Connector } from '@/lib/types';
import { categoryOf } from '@/lib/taxonomy';
import { capabilities } from '@/lib/capabilities';
import { extra } from '@/lib/extras';
import { fmtMs, lastCheck, relTime, routeCount, successRate } from '@/lib/kpi';
import { AmpelPill, CapIcon, Logo, titleOf } from './kit';
import { EnterpriseBadge } from './Compliance';

export function Tile({ c }: { c: Connector }) {
  const cat = categoryOf(c); const sr = successRate(c); const caps = capabilities(c).filter((x) => ['mcp', 'cli', 'nologin', 'robots'].includes(x.key));
  return (
    <Link to={`/c/${c.id}`} data-testid="connector-card" aria-label={`${titleOf(c)} – Details`}
      className="group flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-xs transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start gap-3">
        <Logo c={c} size={52} />
        <div className="min-w-0 flex-1"><p className="truncate font-semibold">{titleOf(c)}</p><p className="truncate text-xs text-muted-foreground">{cat.label} · {c.country || '–'}</p><div className="mt-1.5 flex flex-wrap gap-1"><AmpelPill c={c} /><EnterpriseBadge c={c} /></div></div>
        {extra(c).shot && <Camera size={14} aria-label="echter Screenshot vorhanden" className="text-muted-foreground" />}
      </div>
      <p className="line-clamp-2 text-sm text-muted-foreground">{c.description}</p>
      <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs" aria-label="Fähigkeiten">{caps.map((x) => <li key={x.key} className="inline-flex items-center gap-1"><CapIcon v={x.value} size={14} /><span className={x.value ? '' : 'text-muted-foreground'}>{x.label}</span></li>)}</ul>
      <dl className="mt-auto grid grid-cols-4 gap-2 border-t pt-3 text-xs">
        <div><dt className="sr-only">Erfolgsrate</dt><dd className="font-semibold tabular-nums">{sr ? `${sr.pct} %` : '–'}</dd><dd className="text-muted-foreground">Erfolg</dd></div>
        <div><dt className="sr-only">Latenz</dt><dd className="inline-flex items-center gap-1 font-semibold tabular-nums"><Gauge size={12} aria-hidden />{fmtMs(c.kpi?.p50)}</dd><dd className="text-muted-foreground">p50</dd></div>
        <div><dt className="sr-only">Routen</dt><dd className="inline-flex items-center gap-1 font-semibold tabular-nums"><Route size={12} aria-hidden />{routeCount(c) || '–'}</dd><dd className="text-muted-foreground">Routen</dd></div>
        <div><dt className="sr-only">Letzte Prüfung</dt><dd className="inline-flex items-center gap-1 truncate font-semibold"><Clock size={12} aria-hidden />{relTime(lastCheck(c)).replace(/^vor /, '')}</dd><dd className="text-muted-foreground">geprüft</dd></div>
      </dl>
    </Link>
  );
}
