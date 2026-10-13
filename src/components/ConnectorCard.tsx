import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ConnectorLogo } from './ConnectorLogo';
import { FlagBadges, RobotsBadge, StatusBadge } from './StatusBadges';
import { GateBadge, InterfaceBadges } from './InterfaceBadges';
import type { Connector } from '@/lib/types';
export function ConnectorCard({ c }: { c: Connector }) {
  return (
    <Link to={`/c/${encodeURIComponent(c.id)}`} data-testid="connector-card" className="group">
      <Card className="flex h-full flex-col gap-3 p-4 transition-colors group-hover:border-zinc-500">
        <div className="flex items-start gap-3">
          <ConnectorLogo c={c} />
          <div className="min-w-0 flex-1"><div className="truncate font-semibold">{c.id}</div><div className="truncate text-xs text-muted-foreground">{c.domain ?? '—'}</div></div>
          <StatusBadge c={c} />
        </div>
        <p className="line-clamp-2 text-sm text-muted-foreground">{c.description || 'Keine Beschreibung'}</p>
        <div className="mt-auto flex flex-wrap gap-1">
          <Badge variant="secondary">{c.category}</Badge><Badge variant="outline">{c.country}</Badge><RobotsBadge c={c} /><FlagBadges c={c} />
        </div>
        <div className="flex flex-wrap items-center gap-1"><InterfaceBadges i={c.interfaces} compact /><span className="ml-auto"><GateBadge state={c.gates?.state} errors={c.gates?.errors} /></span></div>
        {c.server?.hoster && <div className="truncate text-xs text-muted-foreground" title="Server-Hintergrund">{c.server.hoster}{c.server.country ? ` · ${c.server.country}` : ''}{c.server.cms ? ` · ${c.server.cms}` : ''}</div>}
        <div className="grid grid-cols-3 gap-2 border-t pt-2 text-center text-xs">
          <div><div className="text-muted-foreground">Stabil</div><div className="font-medium tabular-nums">{c.kpi?.stability != null ? `${c.kpi.stability}%` : '—'}</div></div>
          <div><div className="text-muted-foreground">p50</div><div className="font-medium tabular-nums">{c.kpi?.p50 != null ? `${c.kpi.p50}ms` : '—'}</div></div>
          <div><div className="text-muted-foreground">Score</div><div className="font-medium tabular-nums">{c.kpi?.score ?? '—'}</div></div>
        </div>
      </Card>
    </Link>
  );
}
