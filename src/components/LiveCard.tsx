import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, TrendingDown, TrendingUp } from 'lucide-react';
import { Area, AreaChart, ResponsiveContainer, YAxis } from 'recharts';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { change, fetchLive, subscribeTick } from '@/lib/live';
import type { Connector, LivePoint } from '@/lib/types';

const fmt = (v: number, unit: string) => new Intl.NumberFormat('de-AT', { style: 'currency', currency: unit, maximumFractionDigits: v < 10 ? 4 : 0 }).format(v);

export function LiveCard({ c, live = true }: { c: Connector; live?: boolean }) {
  const info = c.live!;
  const [series, setSeries] = useState<LivePoint[]>(info.series);
  const [src, setSrc] = useState<'live' | 'sample'>('sample');
  useEffect(() => {
    if (!live || !info.endpoint) return;
    let alive = true;
    const load = () => fetchLive(info.endpoint!).then((s) => { if (alive && s.length) { setSeries(s); setSrc('live'); } }).catch(() => {});
    load();
    const off = subscribeTick(load);
    return () => { alive = false; off(); };
  }, [live, info.endpoint]);
  const last = series.at(-1)?.v ?? null;
  const ch = change(series);
  const up = (ch ?? 0) >= 0;
  return (
    <Link to={`/c/${encodeURIComponent(c.id)}`} data-testid="live-card">
      <Card className="flex flex-col gap-1 p-4 hover:border-zinc-500">
        <div className="flex items-center gap-2 text-xs text-muted-foreground"><Activity size={12} />{c.id} · {info.label}
          <Badge variant={src === 'live' ? 'default' : 'outline'} className="ml-auto">{src === 'live' ? 'LIVE' : 'Sample'}</Badge></div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-semibold tabular-nums" data-testid="live-value">{last != null ? fmt(last, info.unit) : '—'}</span>
          {ch != null && <span className={`flex items-center text-xs tabular-nums ${up ? 'text-emerald-500' : 'text-red-500'}`}>{up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}{ch.toFixed(2)}%</span>}
        </div>
        <div className="h-12" aria-hidden>{series.length > 1 && <ResponsiveContainer width="100%" height="100%"><AreaChart data={series} accessibilityLayer={false}><YAxis hide domain={['dataMin', 'dataMax']} />
          <Area type="monotone" dataKey="v" stroke={up ? '#10b981' : '#ef4444'} fill={up ? '#10b98133' : '#ef444433'} strokeWidth={1.5} isAnimationActive={false} /></AreaChart></ResponsiveContainer>}</div>
      </Card>
    </Link>
  );
}

export function LiveStrip({ list }: { list: Connector[] }) {
  const fin = list.filter((c) => c.live);
  if (!fin.length) return null;
  return <section aria-label="Live-Märkte" className="flex flex-col gap-2"><h2 className="text-sm font-medium text-muted-foreground">Live-Märkte (finance)</h2>
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">{fin.map((c) => <LiveCard key={c.id} c={c} />)}</div></section>;
}
