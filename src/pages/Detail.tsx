import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ExternalLink, FileText, FlaskConical, GitBranch, ScrollText } from 'lucide-react';
import { Renderer } from '@openuidev/react-lang';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LiveCard } from '@/components/LiveCard';
import { ConnectorLogo } from '@/components/ConnectorLogo';
import { FlagBadges, RobotsBadge, StatusBadge } from '@/components/StatusBadges';
import { dataset } from '@/lib/data';
import { connectorToOpenUI, library } from '@/openui/library';

export function Detail() {
  const { id } = useParams();
  const c = dataset.connectors.find((x) => x.id === id);
  if (!c) return <div className="p-10 text-center">Connector „{id}“ nicht gefunden. <Link className="underline" to="/">Zurück</Link></div>;
  const links = [
    { href: c.links.skill, label: 'SKILL.md', icon: FileText }, { href: c.links.protocol, label: 'Prüfprotokoll', icon: ScrollText },
    { href: c.links.samples, label: 'Samples', icon: FlaskConical }, { href: c.repo, label: 'Repository', icon: GitBranch }, { href: c.source, label: 'Quelle', icon: ExternalLink },
  ];
  return (
    <div className="flex flex-col gap-6">
      <Link to="/" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft size={14} />Entdecken</Link>
      <div className="flex flex-wrap items-start gap-4">
        <ConnectorLogo c={c} size={64} />
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold">{c.id}</h1>
          <div className="text-sm text-muted-foreground">{c.domain} · {c.category} · {c.country}</div>
          <p className="mt-2 max-w-3xl text-sm">{c.description}</p>
          <div className="mt-2 flex flex-wrap gap-1"><StatusBadge c={c} /><RobotsBadge c={c} /><FlagBadges c={c} />
            <Badge variant="outline" title="Paperclip #55: Vertrauensklasse 1">Klasse 1 · read-only Katalog</Badge>
            {c.paperclip && <Badge variant="secondary">Paperclip-Manifest</Badge>}</div>
        </div>
      </div>
      {c.live && <section aria-label="Live-Wert" className="max-w-md"><LiveCard c={c} /></section>}
      <section aria-label="KPIs"><Renderer response={connectorToOpenUI(c)} library={library} isStreaming={false} /></section>
      <section className="flex flex-wrap gap-2">
        {links.map(({ href, label, icon: I }) => href ? <Button key={label} asChild variant="outline"><a href={href} target="_blank" rel="noreferrer"><I size={14} />{label}</a></Button>
          : <Button key={label} variant="outline" disabled className="opacity-40"><I size={14} />{label} fehlt</Button>)}
      </section>
      {c.commands.length > 0 && <section><h2 className="mb-2 text-sm font-medium text-muted-foreground">Befehle</h2><div className="flex flex-wrap gap-1">{c.commands.map((x) => <Badge key={x} variant="secondary" className="font-mono">{x}</Badge>)}</div></section>}
      <p className="text-xs text-muted-foreground">Keine Installation aus dem Katalog (Paperclip #52/#55): Installation und Freigaben laufen über den Paperclip-Host.</p>
    </div>
  );
}
