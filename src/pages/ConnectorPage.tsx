import { useEffect, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Bot, Camera, ChevronLeft, Code2, ExternalLink, FileText, History, LayoutGrid, ListTree, Route as RouteIcon, Scale } from 'lucide-react';
import { dataset } from '@/lib/data';
import type { Connector } from '@/lib/types';
import { categoryOf } from '@/lib/taxonomy';
import { capabilities } from '@/lib/capabilities';
import { extra, useDetail, useManifest, type Detail } from '@/lib/extras';
import { VERDICT, absTime, fmtMs, lastCheck, relTime, routeCount, successRate } from '@/lib/kpi';
import { agentPrompt, snippets, source } from '@/lib/prompt';
import { Tabs } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { AmpelPill, CapIcon, CopyBlock, Kpi, KpiBar, Logo, SectionTitle, When, capWord, titleOf } from '@/components/kit';
import { Tile } from '@/components/Tile';
import { ApiReference, buildRoutes } from '@/components/ApiReference';
import { CommercialBadge, CompliancePanel, EnterpriseBadge } from '@/components/Compliance';

const Row = ({ k, children }: { k: string; children: ReactNode }) => <div className="grid grid-cols-[minmax(8rem,14rem)_1fr] gap-4 border-b py-2.5 text-sm last:border-0"><dt className="text-muted-foreground">{k}</dt><dd className="font-medium">{children ?? '–'}</dd></div>;
const Ext = ({ href, children }: { href?: string | null; children?: ReactNode }) => (href ? <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[color:var(--link)] hover:underline">{children ?? href}<ExternalLink size={12} aria-hidden /></a> : <span className="text-muted-foreground">–</span>);
const P = <span className="text-muted-foreground">— prüfen</span>;
const Panel = ({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) => <section className="rounded-xl border bg-card p-5"><SectionTitle action={action}>{title}</SectionTitle>{children}</section>;
const origin = (c: Connector) => { try { return new URL(c.source || c.endpoint || `https://${c.domain}`).origin; } catch { return null; } };

function Overview({ c, d }: { c: Connector; d: Detail | null }) {
  const caps = capabilities(c);
  return <div className="grid gap-5 lg:grid-cols-3">
    <div className="flex flex-col gap-5 lg:col-span-2">
      <Panel title="Beschreibung"><p className="leading-relaxed">{c.description}</p>{c.ampel && <div className="mt-4"><p className="mb-1.5 text-xs font-medium uppercase text-muted-foreground">Ampel-Begründung</p><AmpelPill c={c} reasons /></div>}</Panel>
      <Panel title="Fähigkeiten"><ul className="grid gap-2 sm:grid-cols-2" data-testid="capabilities">{caps.map((x) => <li key={x.key} className="flex items-start gap-3 rounded-lg border p-3"><CapIcon v={x.value} size={20} /><span><span className="block text-sm font-medium">{x.label} <span className="sr-only">: {capWord(x.value)}</span></span><span className="block text-xs text-muted-foreground">{x.hint}</span></span></li>)}</ul></Panel>
    </div>
    <div className="flex flex-col gap-5">
      <Panel title="Auf einen Blick"><dl>
        <Row k="Anbieter">{titleOf(c)}</Row><Row k="Kategorie">{categoryOf(c).label}</Row><Row k="Land">{c.country || '–'}</Row><Row k="Zugriff">{c.interfaces?.access}</Row>
        <Row k="Version">{d?.version ?? '–'}</Row><Row k="Lizenz">{d?.license ?? '— prüfen'}</Row><Row k="Quellentyp">{c.sourceType}</Row>
      </dl></Panel>
      {(c.covered?.length || c.gaps?.length) ? <Panel title="Abdeckung"><div className="flex flex-wrap gap-1.5">{c.covered?.map((x) => <Badge key={x} variant="success">{x}</Badge>)}{c.gaps?.map((x) => <Badge key={x} variant="outline" className="text-muted-foreground">Lücke: {x}</Badge>)}</div></Panel> : null}
    </div>
  </div>;
}

function Shots({ c, d }: { c: Connector; d: Detail | null }) {
  // Prefer detail screenshot; fall back to extras summary. Some builds still say .png while public/screens has .webp.
  const raw = d?.screenshot || extra(c).shot;
  if (!raw) return null;
  const src = raw.replace(/\.png$/i, '.webp');
  return <Panel title="Echte Screenshots der Quelle"><figure className="flex flex-col gap-2"><img data-testid="screenshot" src={`${import.meta.env.BASE_URL}${src}`} alt={`Bildschirmfoto von ${titleOf(c)}`} width={1280} height={800} loading="eager" decoding="async" className="w-full rounded-lg border" />
    <figcaption className="text-xs text-muted-foreground">Aufgenommen {d?.screenshotAt ? `${relTime(d.screenshotAt)} (${absTime(d.screenshotAt)})` : 'beim Echtheits-Audit'} mit Playwright, robots.txt geprüft, Captcha-Seiten verworfen. {d?.audit?.sourceUrl && <Ext href={d.audit.sourceUrl}>{d.audit.sourceUrl}</Ext>}</figcaption></figure></Panel>;
}

function Install({ c, d }: { c: Connector; d: Detail | null }) {
  const sn = snippets(c); const [k, setK] = useState<keyof typeof sn>('MCP');
  return <div className="flex flex-col gap-5">
    <Panel title="Installieren"><div role="tablist" aria-label="Installationsart" className="mb-3 inline-flex rounded-lg bg-muted p-1">{(Object.keys(sn) as (keyof typeof sn)[]).map((x) => <button key={x} type="button" role="tab" aria-selected={k === x} onClick={() => setK(x)} className={`rounded-md px-4 py-1 text-sm font-medium ${k === x ? 'bg-card shadow-sm' : 'text-muted-foreground'}`}>{x}</button>)}</div>
      <CopyBlock testid="snippet" label={`Snippet ${k}`} text={sn[k]} /></Panel>
    <Panel title="System-Prompt für KI-Agenten"><p className="mb-3 text-sm text-muted-foreground">Fertiger Prompt mit Zweck, Bezug, Aufruf, Befehlen, Grenzen und Ausgabeschema. In den System-Prompt deines Agenten kopieren.</p><CopyBlock testid="agent-prompt" label="Agent-Prompt" text={agentPrompt(c, d)} /></Panel>
  </div>;
}

function Dev({ c, d }: { c: Connector; d: Detail | null }) {
  const man = useManifest(c.id, !!d?.manifest); const s = source(c); const o = origin(c); const srv = c.server; const n = c.net;
  return <div className="grid gap-5 lg:grid-cols-2">
    <Panel title="Build"><dl>
      <Row k="Version">{d?.version}</Row>
      <Row k="Commit">{d?.commit ? <><Ext href={`https://github.com/${d.commit.repo}/commit/${d.commit.sha}`}>{d.commit.sha.slice(0, 7)}</Ext> <span className="block text-xs text-muted-foreground">{d.commit.msg} · {relTime(d.commit.at)}</span></> : '–'}</Row>
      <Row k="Repo"><Ext href={s.url}>{s.repo}{c.path ? `/${c.path}` : ''}</Ext></Row>
      <Row k="Schema"><code>servas.record.v1</code></Row>
      <Row k="Paperclip / MCP">{c.paperclip ? 'Manifest vorhanden' : 'nein'}</Row>
    </dl></Panel>
    <Panel title="Zugriffskette"><dl>
      <Row k="Zugriffsart">{c.interfaces?.access}</Row><Row k="Login">{capWord(c.loginRequired == null ? null : c.loginRequired)}</Row><Row k="Captcha">{capWord(c.captcha)}{c.signals && Object.keys(c.signals.captchaTypes).length ? ` (${Object.keys(c.signals.captchaTypes).join(', ')})` : ''}</Row>
      <Row k="Endpunkt">{c.endpoint ? <span className="font-mono text-xs break-all">{c.endpoint}</span> : '–'}</Row>
      <Row k="robots.txt">{o ? <Ext href={`${o}/robots.txt`}>{c.robots}</Ext> : c.robots}</Row>
      <Row k="llms.txt"><Ext href={d?.llms?.llmsTxt} /></Row><Row k="llms-full.txt"><Ext href={d?.llms?.llmsFull} /></Row>
      <Row k="OpenAPI">{d?.llms?.openapi ? <Ext href={d.llms.openapi}>{`${d.llms.openapiPaths ?? '?'} Pfade`}</Ext> : '–'}</Row>
    </dl></Panel>
    <Panel title="Server & Netz"><dl>
      <Row k="IP / ASN">{srv ? [srv.ip, srv.asn].filter(Boolean).join(' · ') || '–' : '–'}</Row><Row k="Hoster">{srv?.hoster}</Row><Row k="Standort">{srv ? [srv.city, srv.country].filter(Boolean).join(', ') || '–' : '–'}</Row>
      <Row k="CDN">{n?.cdnAll?.join(', ') || srv?.cdn || '–'}</Row><Row k="WAF / Proxy">{n ? `${n.waf ? 'WAF' : 'keine WAF erkannt'} · ${n.proxy ? 'Proxy' : 'kein Proxy'}` : '–'}</Row>
      <Row k="Webserver / CMS">{[srv?.webserver, srv?.cms, srv?.poweredBy].filter(Boolean).join(' · ') || '–'}</Row><Row k="Technik">{srv?.tech?.join(', ') || '–'}</Row>
      <Row k="TLS">{srv?.tlsIssuer ? `${srv.tlsIssuer}, gültig bis ${srv.tlsNotAfter?.slice(0, 10)}` : '–'}</Row><Row k="HSTS / CSP">{srv ? `${capWord(srv.hsts)} / ${capWord(srv.csp)}` : '–'}</Row>
    </dl></Panel>
    <Panel title="Auth, Limits & robots"><dl>
      <Row k="Auth">{d?.mx?.login != null ? (d.mx.login ? 'Login nötig' : 'keine (ohne Login/Key)') : c.loginRequired != null ? (c.loginRequired ? 'Login nötig' : 'keine') : P}</Row>
      <Row k="Rate-Limit">{d?.mx?.rate_limit ?? P}</Row>
      <Row k="robots-Status">{d?.mx?.robots_status ?? c.robots}</Row><Row k="robots-Notiz">{d?.mx?.robots ?? c.robotsNote ?? P}</Row>
      <Row k="Terms (ToS)">{d?.mx?.tos ?? P}</Row>
      <Row k="Zugriffskette">{d?.mx?.access_chain?.length ? <span className="flex flex-wrap gap-1">{d.mx.access_chain.map((x) => <Badge key={x} variant={x === d.mx?.access_used ? 'default' : 'outline'} className="font-mono">{x}</Badge>)}</span> : P}</Row>
      <Row k="Echtzeit">{d?.mx?.realtime != null ? (d.mx.realtime ? 'ja' : 'nein') : P}</Row>
    </dl></Panel>
    <Panel title="Versionen & Abhängigkeiten"><dl>
      <Row k="Paket">{d?.pkgName ? <code className="text-xs">{d.pkgName}</code> : P}</Row><Row k="Version">{d?.version ? `v${d.version}` : P}</Row>
      <Row k="Manifest-apiVersion">{man.data && 'apiVersion' in man.data ? String(man.data.apiVersion) : P}</Row><Row k="Ausgabeschema">{d?.mx?.schema ?? 'servas.record.v1'}</Row>
      <Row k="Node">{d?.engines?.node ?? P}</Row>
      <Row k="Dependencies">{d?.deps ? (Object.keys(d.deps).length ? <span className="flex flex-wrap gap-1">{Object.entries(d.deps).map(([n, v]) => <Badge key={n} variant="secondary" className="font-mono">{n}@{v}</Badge>)}</span> : 'keine (nur Node-Standardbibliothek)') : P}</Row>
      <Row k="Changelog">{d?.changelog?.length ? <ol className="flex flex-col gap-1 text-xs font-normal">{d.changelog.slice(0, 5).map((x) => <li key={x.sha}><code className="text-muted-foreground">{x.sha}</code> {x.msg}</li>)}</ol> : P}</Row>
    </dl></Panel>
    <section className="rounded-xl border bg-card p-5 lg:col-span-2"><details><summary className="cursor-pointer font-semibold">Manifest-Rohdaten (JSON)</summary><div className="mt-3">{d?.manifest ? (man.data ? <CopyBlock label="Manifest-JSON" text={JSON.stringify(man.data, null, 2)} /> : <p className="text-sm text-muted-foreground">Lädt …</p>) : <p className="text-sm text-muted-foreground">— prüfen: kein Manifest gespeichert.</p>}</div></details></section>
  </div>;
}

function Tests({ c, d }: { c: Connector; d: Detail | null }) {
  const a = d?.audit; const sig = c.signals;
  return <div className="grid gap-5 lg:grid-cols-2">
    <Panel title="Echtheits-Audit">{a ? <dl><Row k="Urteil"><Badge variant={a.verdict === 'echt_gruen' ? 'success' : a.verdict === 'teilweise' ? 'warning' : 'destructive'}>{VERDICT[a.verdict] ?? a.verdict}</Badge></Row><Row k="Live-Läufe">{a.liveOk}</Row><Row k="Geprüft"><When iso={a.at} /></Row>
      <Row k="Ohne Fixtures">{capWord(a.mockFree)}</Row><Row k="Netzwerkzugriff im Code">{capWord(a.network)}</Row><Row k="Protokoll-Lauf"><When iso={a.protocolLastRun} /></Row>
      <Row k="Hinweise">{a.flags.length ? <ul className="list-disc pl-4 text-xs font-normal">{a.flags.map((f) => <li key={f}>{f}</li>)}</ul> : 'keine'}</Row></dl> : <p className="text-sm text-muted-foreground">Noch nicht im Echtheits-Audit.</p>}</Panel>
    <Panel title="E2E & Gates"><dl><Row k="E2E">{c.e2eTotal ? `${c.e2ePassed}/${c.e2eTotal} bestanden` : '–'}</Row><Row k="Letzter Lauf"><When iso={c.lastRun} /></Row><Row k="Status">{c.status}</Row>
      <Row k="Gate">{c.gates ? `${c.gates.state}${c.gates.errors ? ` · ${c.gates.errors} Fehler` : ''}` : '–'}</Row>{c.gates?.codes?.length ? <Row k="Fehlercodes">{c.gates.codes.join(', ')}</Row> : null}{c.gates?.note && <Row k="Notiz">{c.gates.note}</Row>}
      <Row k="Nachweis"><Ext href={c.links.samples}>e2e.log</Ext></Row><Row k="Incidents">{c.incidents.length ? c.incidents.join(' · ') : 'keine'}</Row></dl></Panel>
    {sig && <Panel title={`Beobachtungen (${sig.observations})`}><div className="grid grid-cols-4 gap-2 text-center">{Object.entries(sig.counts).map(([k, v]) => <div key={k} className="rounded-lg border p-2"><div className="text-lg font-semibold tabular-nums">{v}</div><div className="text-xs text-muted-foreground">{k}</div></div>)}</div><p className="mt-3 text-xs text-muted-foreground">Uptime {sig.uptime ?? '–'} % · zuletzt {relTime(sig.last)}</p></Panel>}
    <Panel title="Changelog">{d?.changelog?.length ? <ol className="flex flex-col gap-2 text-sm">{d.changelog.map((x) => <li key={x.sha} className="flex gap-3"><code className="text-xs text-muted-foreground">{x.sha}</code><span className="flex-1">{x.msg}</span><time className="shrink-0 text-xs text-muted-foreground" dateTime={x.at} title={absTime(x.at)}>{relTime(x.at)}</time></li>)}</ol> : <p className="text-sm text-muted-foreground">Kein Verlauf gespeichert.</p>}</Panel>
  </div>;
}

function License({ c, d }: { c: Connector; d: Detail | null }) {
  return <Panel title="Lizenz & Quelle"><dl>
    <Row k="Adapter-Code-Lizenz">{d?.codeLicense ?? 'nicht festgelegt'}</Row><Row k="Datenlizenz">{d?.license ?? 'unbekannt (beim Anbieter prüfen)'}</Row><Row k="Quelle"><Ext href={c.source || c.endpoint} /></Row><Row k="Homepage"><Ext href={d?.homepage ?? (c.domain ? `https://${c.domain}` : null)} /></Row>
    <Row k="Betreiber-Typ">{c.sourceType}</Row><Row k="robots.txt">{c.robots}{c.robotsNote ? ` – ${c.robotsNote}` : ''}</Row>
    <Row k="Nutzung">Nur lesend, gedrosselt (≤ 1 Anfrage/s). Keine Logins, Captchas oder Sperren umgehen. Für Weiterverwendung gilt die Lizenz der Quelle.</Row>
    <Row k="Connector-Code"><Ext href={source(c).url}>{source(c).repo}</Ext></Row>
  </dl></Panel>;
}

function Value({ v }: { v: unknown }): ReactNode {
  if (v == null || v === '') return <span className="text-muted-foreground">–</span>;
  if (typeof v !== 'object') return <span className="font-mono text-xs break-all">{String(v)}</span>;
  return <pre className="max-h-64 overflow-auto rounded bg-muted/60 p-2 text-xs">{JSON.stringify(v, null, 2)}</pre>;
}
function AllFields({ c, d }: { c: Connector; d: Detail | null }) {
  const man = useManifest(c.id, !!d?.manifest);
  const groups: [string, Record<string, unknown> | null | undefined][] = [['Katalog (connectors.json)', c as unknown as Record<string, unknown>], ['Index (opencli-connectors/index.json)', d?.index], ['Manifest', man.data]];
  return <div className="flex flex-col gap-5">{groups.filter(([, o]) => o).map(([t, o]) => <Panel key={t} title={`${t} · ${Object.keys(o!).length} Felder`}><dl data-testid="all-fields">{Object.entries(o!).map(([k, v]) => <Row key={k} k={k}><Value v={v} /></Row>)}</dl></Panel>)}</div>;
}

export function ConnectorPage() { const { id = '' } = useParams(); return <ConnectorView key={id} id={id} />; }

function ConnectorView({ id }: { id: string }) {
  const c = dataset.connectors.find((x) => x.id === id);
  const { data: d } = useDetail(id);
  const [tab, setTab] = useState('overview');
  useEffect(() => { window.scrollTo(0, 0); }, [id]);
  if (!c) return <div className="p-10 text-center"><h1 className="text-xl font-semibold">Connector „{id}“ nicht gefunden</h1><p className="mt-2"><Link className="underline" to="/">Zurück</Link></p></div>;
  const cat = categoryOf(c); const CatIcon = cat.icon; const sr = successRate(c);
  const similar = dataset.connectors.filter((x) => x.id !== c.id && categoryOf(x).id === cat.id && x.ampel?.level === 'green').slice(0, 3);
  const tabs = [
    { id: 'overview', label: 'Übersicht', icon: <LayoutGrid size={15} aria-hidden />, content: <Overview c={c} d={d} /> },
    { id: 'routes', label: 'Routes', icon: <RouteIcon size={15} aria-hidden />, content: <ApiReference c={c} d={d} /> },
    ...(d?.screenshot ? [{ id: 'shots', label: 'Screenshots', icon: <Camera size={15} aria-hidden />, content: <Shots c={c} d={d} /> }] : []),
    { id: 'install', label: 'Installieren', icon: <Bot size={15} aria-hidden />, content: <Install c={c} d={d} /> },
    { id: 'dev', label: 'Dev', icon: <Code2 size={15} aria-hidden />, content: <Dev c={c} d={d} /> },
    { id: 'tests', label: 'Tests & Verlauf', icon: <History size={15} aria-hidden />, content: <Tests c={c} d={d} /> },
    { id: 'license', label: 'Compliance & Lizenz', icon: <Scale size={15} aria-hidden />, content: <div className="flex flex-col gap-5"><CompliancePanel c={c} /><License c={c} d={d} /></div> },
    { id: 'fields', label: 'Alle Felder', icon: <ListTree size={15} aria-hidden />, content: <AllFields c={c} d={d} /> },
  ];
  return (
    <article className="flex flex-col gap-6">
      <Link to="/" className="inline-flex w-fit items-center text-sm text-[color:var(--link)] hover:underline"><ChevronLeft size={16} aria-hidden />Alle Connectoren</Link>
      <header className="flex flex-col gap-5 sm:flex-row sm:items-start">
        <Logo c={c} size={112} />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">{titleOf(c)}</h1>
          <p className="inline-flex flex-wrap items-center gap-2 text-sm text-muted-foreground"><CatIcon size={15} aria-hidden style={{ color: cat.hue }} />{cat.label} · {c.country || '–'} · <code className="text-xs">{c.id}</code>{d?.version && <Badge variant="outline">v{d.version}</Badge>}</p>
          <div className="flex flex-wrap items-center gap-2" data-testid="ampel-badge"><AmpelPill c={c} reasons /></div>
          <div className="flex flex-wrap items-center gap-2"><EnterpriseBadge c={c} /><CommercialBadge c={c} /></div>
          <div className="mt-1 flex flex-wrap gap-2"><button type="button" onClick={() => setTab('install')} className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"><Bot size={16} aria-hidden />Installieren</button>
            <Link to={`/compare?ids=${c.id}`} className="inline-flex h-9 items-center gap-2 rounded-md border bg-card px-4 text-sm font-medium hover:bg-accent"><FileText size={16} aria-hidden />Vergleichen</Link></div>
        </div>
      </header>
      <KpiBar label="Kennzahlen">
        <Kpi label="Live-Erfolg" value={sr ? `${sr.pct} %` : '–'} sub={sr?.label ?? 'nicht gemessen'} />
        <Kpi label="Stabilität" value={c.kpi?.stability != null ? `${c.kpi.stability} %` : '–'} sub="KPI-Fenster" />
        <Kpi label="Latenz p50 / p95" value={fmtMs(c.kpi?.p50)} sub={`p95 ${fmtMs(c.kpi?.p95)}`} />
        <Kpi label="Letzte Prüfung" value={relTime(lastCheck(c))} sub={absTime(lastCheck(c))} />
        <Kpi label="Datenfrische" value={d?.audit?.runs.map((r) => r.latestDate).filter(Boolean).sort().pop() ?? '–'} sub="jüngstes Datum in den Daten" />
        <Kpi label="Routes" value={d ? buildRoutes(c, d).length + (d.routes?.length ?? 0) : routeCount(c) || '–'} sub={d ? `${buildRoutes(c, d).length} Commands · ${d.routes?.length ?? 0} HTTP` : 'lädt …'} />
      </KpiBar>
      <Tabs tabs={tabs} value={tab} onChange={setTab} />
      {similar.length > 0 && <section><SectionTitle>Mehr aus {cat.label}</SectionTitle><div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{similar.map((x) => <Tile key={x.id} c={x} />)}</div></section>}
    </article>
  );
}
