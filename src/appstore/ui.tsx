import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Star } from 'lucide-react';
import type { Connector } from '@/lib/types';
import { AMPEL_COLOR, AMPEL_LABEL } from '@/components/ampelMeta';
import { catOf, rating, title } from './meta';

export function AppIcon({ c, size = 64, priority = false }: { c: Connector; size?: number; priority?: boolean }) {
  const [err, setErr] = useState(false);
  const cat = catOf(c);
  const r = Math.round(size * 0.225);
  const eager = priority;
  if (c.logo && !err) return <img src={`${import.meta.env.BASE_URL}logos/${c.logo}`} alt="" width={size} height={size} loading={eager ? "eager" : "lazy"} decoding="async" fetchPriority={eager ? "high" : undefined} onError={() => setErr(true)} className="shrink-0 bg-white object-contain ring-1 ring-black/10" style={{ width: size, height: size, borderRadius: r, padding: size * 0.14 }} />;
  const t = title(c).replace(/^(api|data|www|open)\./, '');
  return <div aria-hidden className="flex shrink-0 items-center justify-center font-semibold text-white ring-1 ring-black/10" style={{ width: size, height: size, borderRadius: r, fontSize: size * 0.4, background: `linear-gradient(135deg, ${cat.from}, ${cat.to})` }}>{t.slice(0, 1).toUpperCase()}</div>;
}

export function AmpelDot({ c, withLabel = false }: { c: Connector; withLabel?: boolean }) {
  const l = c.ampel?.level;
  if (!l) return null;
  return <span className="inline-flex items-center gap-1 text-xs text-muted-foreground" title={c.ampel?.reasons.join(' · ') || 'alles grün'}>
    <span aria-hidden className="inline-block size-2 rounded-full" style={{ background: AMPEL_COLOR[l] }} /><span className={withLabel ? '' : 'sr-only'}>Ampel {AMPEL_LABEL[l]}</span></span>;
}

export function Stars({ c, size = 12 }: { c: Connector; size?: number }) {
  const r = rating(c);
  if (!r) return <span className="text-xs text-muted-foreground">noch keine Live-Tests</span>;
  return <span className="inline-flex items-center gap-0.5" role="img" aria-label={`${r.stars.toFixed(1)} von 5 Sternen (${r.label})`}>
    {[1, 2, 3, 4, 5].map((i) => <Star key={i} size={size} aria-hidden className={i <= Math.round(r.stars) ? 'fill-current text-[#ff9500]' : 'text-muted-foreground/50'} />)}
  </span>;
}

export function GetButton({ to, label = 'Laden' }: { to: string; label?: string }) {
  return <Link to={to} className="rounded-full bg-secondary px-4 py-1 text-sm font-semibold text-[color:var(--link)] hover:bg-muted">{label}</Link>;
}

/** Listeneintrag wie in App-Store-Reihen: Icon, Titel, Untertitel, Laden-Button. */
export function AppRow({ c, rank }: { c: Connector; rank?: number }) {
  return (
    <div data-testid="connector-card" className="flex items-center gap-3 border-b border-[color:var(--border)] py-3 last:border-0">
      {rank != null && <span className="w-5 text-right text-lg font-semibold text-muted-foreground">{rank}</span>}
      <Link to={`/c/${c.id}`} className="flex min-w-0 flex-1 items-center gap-3" aria-label={`${title(c)} – Details`}>
        <AppIcon c={c} size={56} />
        <span className="min-w-0 flex-1"><span className="block truncate font-medium">{title(c)}</span>
          <span className="block truncate text-sm text-muted-foreground">{catOf(c).label} · {c.country}</span>
          <span className="mt-0.5 flex items-center gap-2"><AmpelDot c={c} /><Stars c={c} size={10} /></span></span>
      </Link>
      <GetButton to={`/c/${c.id}#install`} />
    </div>
  );
}

export function Section({ title: t, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return <section className="as-fade" aria-label={t}><div className="mb-3 flex items-baseline justify-between border-t border-[color:var(--border)] pt-5"><h2 className="text-2xl font-bold tracking-tight">{t}</h2>{action}</div>{children}</section>;
}
