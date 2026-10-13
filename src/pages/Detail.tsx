import { Link, useParams } from 'react-router-dom';
import { AlertTriangle, TrafficCone, ArrowLeft, Check, ExternalLink, FileText, FlaskConical, GitBranch, Gauge, LayoutDashboard, Minus, Plug, ScrollText, Server, ShieldCheck } from 'lucide-react';
import { Tabs } from '@/components/ui/tabs';
import { GateBadge, INTERFACES, InterfaceBadges } from '@/components/InterfaceBadges';
import type { Connector } from '@/lib/types';
import { Renderer } from '@openuidev/react-lang';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LiveCard } from '@/components/LiveCard';
import { ConnectorLogo } from '@/components/ConnectorLogo';
import { StatusBadge } from '@/components/StatusBadges';
import { AmpelBadge, AmpelLight, FeatureBadges } from '@/components/Ampel';
import { SignalsPanel } from '@/components/SignalsPanel';
import { dataset } from '@/lib/data';
import { connectorToOpenUI, factsToOpenUI, gatesToOpenUI, library, serverToOpenUI } from '@/openui/library';

const UI = ({ src }: { src: string }) => <Renderer response={src} library={library} isStreaming={false} />;

export function overviewToOpenUI(c: Connector): string {
  const list = (x?: string[]) => (x && x.length ? x.join(', ') : '—');
  return factsToOpenUI([
    ['Steckbrief', [['Quellentyp', c.sourceType ?? 'UNKNOWN'], ['Kategorie', c.category], ['Land', c.country], ['Zugangsweg', c.interfaces?.access ?? 'UNKNOWN'], ['Datensätze', c.records != null ? String(c.records) : 'UNKNOWN'], ['Befehle', list(c.commands)]]],
    ['Website-Abdeckung', [['Funktionen der Seite', list(c.features)], ['Abgedeckt', list(c.covered), 'good'], ['Lücken', list(c.gaps), c.gaps?.length ? 'warn' : 'good'], ['URLs', String(c.urls?.length ?? 0)]]],
  ]);
}

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
      <div className="flex items-center gap-4"><Link to="/" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft size={14} />Entdecken</Link><Link to={`/compare?ids=${encodeURIComponent(c.id)}`} className="text-sm text-muted-foreground underline hover:text-foreground">Vergleichen …</Link></div>
      <div className="flex flex-wrap items-start gap-4">
        <ConnectorLogo c={c} size={64} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2"><h1 className="text-2xl font-semibold">{c.id}</h1><AmpelLight a={c.ampel} size={12} /></div>
          <div className="text-sm text-muted-foreground">{c.domain} · {c.category} · {c.country}</div>
          <p className="mt-2 max-w-3xl text-sm">{c.description}</p>
          <div className="mt-2 flex flex-wrap gap-1"><AmpelBadge a={c.ampel} /><StatusBadge c={c} /><FeatureBadges c={c} />
            <Badge variant="outline" title="Paperclip #55: Vertrauensklasse 1">Klasse 1 · read-only Katalog</Badge>
            {c.paperclip && <Badge variant="secondary">Paperclip-Manifest</Badge>}<GateBadge state={c.gates?.state} errors={c.gates?.errors} /></div>
          <div className="mt-2 flex flex-wrap gap-1"><InterfaceBadges i={c.interfaces} /></div>
        </div>
      </div>
      {c.live && <section aria-label="Live-Wert" className="max-w-md"><LiveCard c={c} /></section>}
      <Tabs tabs={[
        { id: 'overview', label: 'Übersicht', icon: <LayoutDashboard size={14} />, content: <UI src={overviewToOpenUI(c)} /> },
        { id: 'ampel', label: 'Ampel & Signale', icon: <TrafficCone size={14} />, content: <SignalsPanel c={c} /> },
        { id: 'kpi', label: 'KPIs', icon: <Gauge size={14} />, content: <section aria-label="KPIs"><UI src={connectorToOpenUI(c)} /></section> },
        { id: 'server', label: 'Server & Technik', icon: <Server size={14} />, content: <UI src={serverToOpenUI(c)} /> },
        { id: 'iface', label: 'Schnittstellen', icon: <Plug size={14} />, content: (
          <div className="overflow-hidden rounded-lg border"><table className="w-full text-sm"><caption className="sr-only">Schnittstellen-Matrix</caption><tbody>
            {INTERFACES.map(({ key, label, icon: I, hint }) => { const on = c.interfaces?.[key]; return (
              <tr key={key} className="border-b last:border-0"><th scope="row" className="flex items-center gap-2 p-2 text-left font-medium"><I size={14} aria-hidden />{label}</th><td className="p-2 text-muted-foreground">{hint}</td>
                <td className="p-2 text-right">{on ? <span className="inline-flex items-center gap-1 text-emerald-400"><Check size={14} />ja</span> : <span className="inline-flex items-center gap-1 text-muted-foreground"><Minus size={14} />nein</span>}</td></tr>); })}
          </tbody></table></div>) },
        { id: 'gates', label: 'Qualität/Gates', icon: <ShieldCheck size={14} />, content: <UI src={gatesToOpenUI(c)} /> },
        { id: 'inc', label: `Incidents (${c.incidents.length})`, icon: <AlertTriangle size={14} />, content: <UI src={factsToOpenUI([], c.incidents.length ? c.incidents.map((i) => ['Incident', i, 'bad'] as [string, string, string]) : [['Keine Incidents', 'Keine offenen Probleme im Prüfprotokoll.', 'neutral']])} /> },
      ]} />
      <section className="flex flex-wrap gap-2">
        {links.map(({ href, label, icon: I }) => href ? <Button key={label} asChild variant="outline"><a href={href} target="_blank" rel="noreferrer"><I size={14} />{label}</a></Button>
          : <Button key={label} variant="outline" disabled className="opacity-40"><I size={14} />{label} fehlt</Button>)}
      </section>
      {c.commands.length > 0 && <section><h2 className="mb-2 text-sm font-medium text-muted-foreground">Befehle</h2><div className="flex flex-wrap gap-1">{c.commands.map((x) => <Badge key={x} variant="secondary" className="font-mono">{x}</Badge>)}</div></section>}
      <p className="text-xs text-muted-foreground">Keine Installation aus dem Katalog (Paperclip #52/#55): Installation und Freigaben laufen über den Paperclip-Host.</p>
    </div>
  );
}
