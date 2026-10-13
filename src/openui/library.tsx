// OpenUI-Komponentenbibliothek (thesysdev/openui, @openuidev/react-lang) auf shadcn/ui-Basis.
// Die KPI-Ansicht der Detailseite wird als OpenUI Lang beschrieben und vom Renderer gezeichnet.
// Dieselbe Bibliothek liefert per library.prompt() den Systemprompt, mit dem ein Agent später
// eigene Connector-Ansichten generieren kann (generative UI), ohne fremden Code auszuführen.
import { createLibrary, defineComponent, useRenderNode } from '@openuidev/react-lang';
import { z } from 'zod';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { Connector } from '@/lib/types';

const tone = z.enum(['good', 'warn', 'bad', 'neutral']);
const toneCls = { good: 'text-emerald-400', warn: 'text-amber-400', bad: 'text-red-400', neutral: 'text-foreground' } as const;

export const Kpi = defineComponent({
  name: 'Kpi', description: 'Eine Kennzahl mit Label, Wert, Hinweis und Ampel',
  props: z.object({ label: z.string(), value: z.string(), hint: z.string().optional(), tone: tone.optional() }),
  component: ({ props }) => (
    <Card data-testid="kpi"><CardContent className="p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{props.label}</div>
      <div className={cn('mt-1 text-2xl font-semibold tabular-nums', toneCls[props.tone ?? 'neutral'])}>{props.value}</div>
      {props.hint && <div className="mt-1 text-xs text-muted-foreground">{props.hint}</div>}
    </CardContent></Card>
  ),
});

export const KpiGrid = defineComponent({
  name: 'KpiGrid', description: 'Raster aus Kpi-Kacheln',
  props: z.object({ items: z.array(Kpi.ref) }),
  component: function KpiGridView({ props }) {
    const render = useRenderNode();
    return <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{render(props.items)}</div>;
  },
});

export const Notice = defineComponent({
  name: 'Notice', description: 'Hinweisbox, z.B. robots.txt oder Incident',
  props: z.object({ title: z.string(), text: z.string(), tone: tone.optional() }),
  component: ({ props }) => (
    <div className={cn('rounded-md border p-3 text-sm', props.tone === 'bad' ? 'border-red-500/40 bg-red-500/5' : props.tone === 'warn' ? 'border-amber-500/40 bg-amber-500/5' : 'bg-muted/40')}>
      <div className="font-medium">{props.title}</div><div className="mt-1 text-muted-foreground">{props.text}</div>
    </div>
  ),
});

export const Fact = defineComponent({
  name: 'Fact', description: 'Zeile Label/Wert in einer FactList',
  props: z.object({ label: z.string(), value: z.string(), tone: tone.optional() }),
  component: ({ props }) => (
    <div data-testid="fact" className="flex items-baseline justify-between gap-4 border-b py-2 text-sm last:border-0">
      <dt className="text-muted-foreground">{props.label}</dt><dd className={cn('text-right font-medium', toneCls[props.tone ?? 'neutral'])}>{props.value}</dd>
    </div>
  ),
});

export const FactList = defineComponent({
  name: 'FactList', description: 'Karte mit Titel und Fact-Zeilen',
  props: z.object({ title: z.string(), items: z.array(Fact.ref) }),
  component: function FactListView({ props }) {
    const render = useRenderNode();
    return <Card><CardContent className="p-4"><h3 className="mb-1 text-sm font-semibold">{props.title}</h3><dl>{render(props.items)}</dl></CardContent></Card>;
  },
});

export const Columns = defineComponent({
  name: 'Columns', description: 'Zwei Spalten mit FactLists',
  props: z.object({ items: z.array(FactList.ref) }),
  component: function ColumnsView({ props }) {
    const render = useRenderNode();
    return <div className="grid gap-4 md:grid-cols-2">{render(props.items)}</div>;
  },
});

export const Panel = defineComponent({
  name: 'Panel', description: 'Vertikaler Container',
  props: z.object({ children: z.array(z.union([KpiGrid.ref, Notice.ref, Columns.ref, FactList.ref])) }),
  component: function PanelView({ props }) {
    const render = useRenderNode();
    return <div className="flex flex-col gap-4">{render(props.children)}</div>;
  },
});

export const library = createLibrary({ root: 'Panel', components: [Panel, KpiGrid, Kpi, Notice, Columns, FactList, Fact] });

const s = (v: string) => JSON.stringify(v);
const yn = (v: boolean | null) => (v == null ? 'UNKNOWN' : v ? 'ja' : 'nein');
const ms = (v: number | null | undefined) => (v == null ? 'UNKNOWN' : `${v} ms`);
const date = (v: string | null) => (v ? new Date(v).toISOString().slice(0, 16).replace('T', ' ') + ' UTC' : 'UNKNOWN');

/** Baut aus einem Connector deterministisch OpenUI Lang (kein LLM nötig). */
export function connectorToOpenUI(c: Connector): string {
  const k = c.kpi;
  const st = k?.stability;
  const items: [string, string, string, string][] = [
    ['Stabilität', st == null ? 'UNKNOWN' : `${st} %`, c.e2eTotal ? `E2E ${c.e2ePassed}/${c.e2eTotal}` : 'kein E2E-Lauf', st == null ? 'neutral' : st >= 95 ? 'good' : st >= 70 ? 'warn' : 'bad'],
    ['Latenz p50', ms(k?.p50), 'Median pro Aufruf', 'neutral'],
    ['Latenz p95', ms(k?.p95), '95. Perzentil', k?.p95 && k.p95 > 5000 ? 'warn' : 'neutral'],
    ['Throughput', k?.throughput == null ? 'UNKNOWN' : `${k.throughput}/min`, 'erfolgreiche Aufrufe', 'neutral'],
    ['Captcha-Rate', k?.captchaRate == null ? 'UNKNOWN' : `${Math.round(k.captchaRate * 100)} %`, c.captcha ? 'Captcha gesehen' : 'kein Captcha', c.captcha ? 'bad' : 'good'],
    ['Login nötig', yn(c.loginRequired), c.loginRequired ? 'Account nötig' : 'öffentlich', c.loginRequired ? 'warn' : 'good'],
    ['API-Version', c.apiVersion ?? (c.apiAvailable ? 'API' : 'Scrape'), c.apiAvailable ? 'offizielle API' : 'HTML/Web', 'neutral'],
    ['Letzter Scrape', date(c.lastRun), c.records != null ? `${c.records} Datensätze` : '', 'neutral'],
    ['Datenqualität', k?.dataQuality == null ? 'UNKNOWN' : `${k.dataQuality}/5`, 'Feldabdeckung', k?.dataQuality == null ? 'neutral' : k.dataQuality >= 4 ? 'good' : 'warn'],
    ['robots.txt', c.robots === 'allowed' ? 'erlaubt' : c.robots === 'disallowed' ? 'Disallow' : 'UNKNOWN', 'nur Empfehlung, Hinweis', c.robots === 'disallowed' ? 'warn' : c.robots === 'allowed' ? 'good' : 'neutral'],
    ['Score', k?.score == null ? 'UNKNOWN' : String(k.score), 'KPI-Ranking', 'neutral'],
    ['Incidents', String(c.incidents.length), 'offene Probleme', c.incidents.length ? 'bad' : 'good'],
  ];
  const lines: string[] = [];
  items.forEach(([l, v, h, t], i) => lines.push(`k${i} = Kpi(${s(l)}, ${s(v)}, ${s(h)}, ${s(t)})`));
  lines.push(`grid = KpiGrid([${items.map((_, i) => `k${i}`).join(', ')}])`);
  const kids = ['grid'];
  if (c.robots === 'disallowed') { lines.push(`robots = Notice(${s('robots.txt: offiziell nicht erlaubt')}, ${s(c.robotsNote ?? 'Disallow')}, "warn")`); kids.push('robots'); }
  c.incidents.forEach((inc, i) => { lines.push(`inc${i} = Notice(${s('Incident')}, ${s(inc)}, "bad")`); kids.push(`inc${i}`); });
  return [`root = Panel([${kids.join(', ')}])`, ...lines].join('\n');
}

type Row = [string, string, ('good' | 'warn' | 'bad' | 'neutral')?];
const v = (x: unknown) => (x == null || x === '' ? 'UNKNOWN' : String(x));
/** Baut FactLists als OpenUI Lang. groups: [Titel, Zeilen][] */
export function factsToOpenUI(groups: [string, Row[]][], notices: [string, string, string][] = []): string {
  const lines: string[] = []; const lists: string[] = [];
  groups.forEach(([title, rows], g) => {
    rows.forEach(([l, val, t], r) => lines.push(`f${g}_${r} = Fact(${s(l)}, ${s(val)}, ${s(t ?? 'neutral')})`));
    lines.push(`l${g} = FactList(${s(title)}, [${rows.map((_, r) => `f${g}_${r}`).join(', ')}])`); lists.push(`l${g}`);
  });
  lines.push(`cols = Columns([${lists.join(', ')}])`);
  const kids = ['cols'];
  notices.forEach(([t, x, tn], i) => { lines.push(`n${i} = Notice(${s(t)}, ${s(x)}, ${s(tn)})`); kids.push(`n${i}`); });
  return [`root = Panel([${kids.join(', ')}])`, ...lines].join('\n');
}

export function serverToOpenUI(c: Connector): string {
  const sv = c.server;
  if (!sv) return factsToOpenUI([], [['Keine Server-Daten', 'Noch nicht angereichert (npm run enrich).', 'neutral']]);
  const yn2 = (b: boolean | null): Row[1] => (b == null ? 'UNKNOWN' : b ? 'ja' : 'nein');
  return factsToOpenUI([
    ['Hosting', [['Hoster', v(sv.hoster)], ['ASN', v(sv.asn)], ['IP', v(sv.ip)], ['Standort', sv.country ? `${sv.city ?? ''} ${sv.country}`.trim() : 'UNKNOWN'], ['CDN', v(sv.cdn ?? 'keins erkannt')]]],
    ['Technik', [['Webserver', v(sv.webserver)], ['X-Powered-By', v(sv.poweredBy)], ['CMS/Framework', v(sv.cms)], ['Erkannt', sv.tech.length ? sv.tech.join(', ') : '—'], ['HSTS', yn2(sv.hsts), sv.hsts ? 'good' : 'warn'], ['CSP', yn2(sv.csp), sv.csp ? 'good' : 'neutral']]],
    ['TLS & Domain', [['TLS-Aussteller', v(sv.tlsIssuer)], ['Zertifikat bis', sv.tlsNotAfter ? sv.tlsNotAfter.slice(0, 10) : 'UNKNOWN'], ['Registriert', sv.registered ? sv.registered.slice(0, 10) : v(sv.rdap)], ['Domain-Alter', sv.domainAgeYears != null ? `${sv.domainAgeYears} Jahre` : 'UNKNOWN']]],
    ['Quelle', [['Quellentyp', v(c.sourceType)], ['Zugangsweg', v(c.interfaces?.access)], ['Geprüft', sv.probedAt.slice(0, 16).replace('T', ' ') + ' UTC']]],
  ], sv.robotsBlockedProbe ? [['robots.txt', 'Startseite per robots.txt gesperrt, Technik-Fingerprint ausgelassen.', 'warn']] : []);
}

export function gatesToOpenUI(c: Connector): string {
  const g = c.gates;
  if (!g || g.state === 'unknown') return factsToOpenUI([], [['Gate-Status unbekannt', 'Kein check_connectors.py-Lauf vorhanden.', 'neutral']]);
  if (g.state === 'extern') return factsToOpenUI([['Quality-Gates', [['Status', 'extern'], ['Hinweis', v(g.note)]]]]);
  const e2e: Row = ['E2E', c.e2eTotal ? `${c.e2ePassed}/${c.e2eTotal}` : 'UNKNOWN', c.e2eTotal && c.e2ePassed === c.e2eTotal ? 'good' : 'warn'];
  return factsToOpenUI([['Quality-Gates (--strict)', [['Status', g.state === 'pass' ? 'bestanden' : 'nicht bestanden', g.state === 'pass' ? 'good' : 'bad'], ['Fehler', String(g.errors), g.errors ? 'bad' : 'good'], ['Regeln verletzt', g.codes.join(', ') || '—'], ['Pfad', v(g.path)], e2e]]],
    (g.top ?? []).map((t) => ['Gate-Fehler', t, 'bad'] as [string, string, string]));
}
