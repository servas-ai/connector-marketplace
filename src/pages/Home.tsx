import { useMemo, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { dataset } from '@/lib/data';
import { CATEGORIES, categoryOf } from '@/lib/taxonomy';
import { capOn } from '@/lib/capabilities';
import { extra } from '@/lib/extras';
import { fmtMs, lastCheck, median, relTime, successRate } from '@/lib/kpi';
import { AmpelPill, CapIcon, Kpi, KpiBar, Logo, titleOf } from '@/components/kit';
import { Dialog } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { absTime, routeCount } from '@/lib/kpi';
import { cn } from '@/lib/utils';
import { commercial, enterprise } from '@/lib/compliance';
import type { Connector } from '@/lib/types';

const connectors = () => dataset.connectors;
const CAP_FILTERS = [['mcp', 'MCP'], ['cli', 'CLI'], ['http', 'HTTP/API'], ['nologin', 'Ohne Login'], ['robots', 'robots ok'], ['llms', 'llms.txt'], ['openapi', 'OpenAPI'], ['shot', 'Screenshot']] as const;
const lvlRank = (c: Connector) => ({ green: 2, yellow: 1, red: 0 })[c.ampel?.level ?? 'red'];
type Col = { key: string; label: string; sort?: (c: Connector) => number | string; className?: string };
const COLS: Col[] = [
  { key: 'name', label: 'Name', sort: (c) => titleOf(c).toLowerCase() },
  { key: 'kat', label: 'Kategorie', sort: (c) => categoryOf(c).label, className: 'hidden md:table-cell' },
  { key: 'ampel', label: 'Ampel', sort: (c) => lvlRank(c) },
  { key: 'routes', label: 'Routes', sort: (c) => routeCount(c), className: 'text-right' },
  { key: 'version', label: 'Version', sort: (c) => extra(c).v ?? '', className: 'hidden lg:table-cell' },
  { key: 'test', label: 'Letzter Test', sort: (c) => lastCheck(c) ?? '', className: 'hidden sm:table-cell' },
  { key: 'lizenz', label: 'Lizenz', sort: (c) => extra(c).lic ?? '~', className: 'hidden xl:table-cell' },
  { key: 'llms', label: 'llms.txt', sort: (c) => +!!extra(c).llms, className: 'hidden lg:table-cell' },
  { key: 'login', label: 'Login', sort: (c) => (c.loginRequired == null ? 2 : +c.loginRequired), className: 'hidden md:table-cell' },
];
const recommended = (a: Connector, b: Connector) => lvlRank(b) - lvlRank(a) || (successRate(b)?.pct ?? -1) - (successRate(a)?.pct ?? -1) || +!!b.logo - +!!a.logo || (a.kpi?.p50 ?? 1e9) - (b.kpi?.p50 ?? 1e9) || a.id.localeCompare(b.id);
function sortList(list: Connector[], key: string, dir: string) {
  const col = COLS.find((c) => c.key === key);
  if (!col?.sort) return [...list].sort(recommended);
  const f = col.sort; const m = dir === 'desc' ? -1 : 1;
  return [...list].sort((a, b) => { const x = f(a), y = f(b); return (x < y ? -1 : x > y ? 1 : 0) * m || recommended(a, b); });
}
const PAGE = 50;

export function globalKpis() {
  const green = connectors().filter((c) => c.ampel?.level === 'green').length;
  const audited = connectors().filter((c) => extra(c).verdict); const verified = audited.filter((c) => extra(c).verdict === 'echt_gruen').length;
  const p50 = median(connectors().map((c) => c.kpi?.p50).filter((x): x is number => x != null && x > 0));
  const nologin = connectors().filter((c) => c.loginRequired === false).length;
  return { total: dataset.count, green, audited: audited.length, verified, p50, nologin };
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return <button type="button" aria-pressed={on} onClick={onClick} className={cn('inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2.5 py-1 text-sm transition', on ? 'border-primary bg-primary text-primary-foreground' : 'bg-card hover:bg-accent')}>{children}</button>;
}
function Sel({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">{label}<select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} className="h-9 rounded-md border border-input bg-card px-2 text-sm font-normal text-foreground">{options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>;
}
const YesNo = ({ v, yes = 'ja', no = 'nein' }: { v: boolean | null | undefined; yes?: string; no?: string }) => v == null ? <span className="text-muted-foreground">— prüfen</span> : <span className="inline-flex items-center gap-1"><CapIcon v={v} size={14} />{v ? yes : no}</span>;

function Row({ c }: { c: Connector }) {
  const e = extra(c); const lc = lastCheck(c); const cat = categoryOf(c); const I = cat.icon;
  return <tr data-testid="connector-card" className="border-b transition-colors hover:bg-muted/40">
    <td className="py-2 pl-3 pr-2"><Link to={`/c/${c.id}`} tabIndex={-1} aria-hidden><Logo c={c} size={32} /></Link></td>
    <td className="max-w-[16rem] py-2 pr-3"><Link to={`/c/${c.id}`} className="block truncate font-medium hover:underline">{titleOf(c)}</Link><span className="block truncate font-mono text-xs text-muted-foreground">{c.id}</span></td>
    <td className="hidden py-2 pr-3 md:table-cell"><span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs"><I size={14} aria-hidden style={{ color: cat.hue }} />{cat.label}</span></td>
    <td className="py-2 pr-3"><AmpelPill c={c} /></td>
    <td className="py-2 pr-3 text-right tabular-nums">{routeCount(c) || <span className="text-muted-foreground">—</span>}</td>
    <td className="hidden py-2 pr-3 font-mono text-xs lg:table-cell">{e.v ? `v${e.v}` : <span className="font-sans text-muted-foreground">— prüfen</span>}</td>
    <td className="hidden whitespace-nowrap py-2 pr-3 text-xs sm:table-cell"><time dateTime={lc ?? undefined} title={absTime(lc)}>{relTime(lc)}</time></td>
    <td className="hidden max-w-[12rem] py-2 pr-3 text-xs xl:table-cell">{e.lic ? <span className="block truncate" title={e.lic}>{e.lic}</span> : <Badge variant="outline" className="font-normal text-muted-foreground">— prüfen</Badge>}</td>
    <td className="hidden py-2 pr-3 text-xs lg:table-cell">{e.llms ? <YesNo v yes="vorhanden" /> : <span className="text-muted-foreground">—</span>}</td>
    <td className="hidden py-2 pr-3 text-xs md:table-cell"><YesNo v={c.loginRequired == null ? null : !c.loginRequired} yes="kein Login" no="Login nötig" /></td>
  </tr>;
}

export function Home() {
  const [sp, setSp] = useSearchParams();
  const get = (k: string, d = 'all') => sp.get(k) ?? d;
  const set = (k: string, v: string) => { const n = new URLSearchParams(sp); if (!v || v === 'all') n.delete(k); else n.set(k, v); n.delete('p'); setSp(n, { replace: true }); };
  const ent = get('ent'), kom = get('kom');
  const q = get('q', ''), cat = get('kat'), land = get('land'), ampel = get('ampel'), zugriff = get('zugriff'), sortKey = get('sort', ''), dir = get('dir', 'asc');
  const page = Math.max(0, Number(sp.get('p') ?? 0));
  const capKey = sp.get('cap') ?? '';
  const caps = capKey.split(',').filter(Boolean);
  const toggleCap = (k: string) => set('cap', (caps.includes(k) ? caps.filter((x) => x !== k) : [...caps, k]).join(','));
  const [sheet, setSheet] = useState(false);
  const k = useMemo(() => globalKpis(), []);
  const countries = useMemo(() => [...new Set(connectors().map((c) => c.country).filter(Boolean))].sort(), []);
  const access = useMemo(() => [...new Set(connectors().map((c) => c.interfaces?.access).filter(Boolean) as string[])].sort(), []);
  const catCount = useMemo(() => { const m: Record<string, number> = {}; for (const c of connectors()) { const id = categoryOf(c).id; m[id] = (m[id] ?? 0) + 1; } return m; }, []);
  const list = (() => {
    const s = q.trim().toLowerCase();
    return sortList(connectors().filter((c) => (!s || [c.id, c.domain, c.description, categoryOf(c).label].some((x) => x?.toLowerCase().includes(s)))
      && (cat === 'all' || categoryOf(c).id === cat) && (land === 'all' || c.country === land) && (ampel === 'all' || c.ampel?.level === ampel)
      && (zugriff === 'all' || c.interfaces?.access === zugriff) && (ent === 'all' || enterprise(c).level === ent) && (kom === 'all' || commercial(c).v === kom)
      && capKey.split(',').filter(Boolean).every((x) => (x === 'shot' ? !!extra(c).shot : capOn(c, x)))), sortKey, dir);
  })();
  const pages = Math.max(1, Math.ceil(list.length / PAGE)); const pg = Math.min(page, pages - 1);
  const setPage = (p: number) => { const n = new URLSearchParams(sp); if (p) n.set('p', String(p)); else n.delete('p'); setSp(n, { replace: true }); };
  const sortBy = (key: string) => { const n = new URLSearchParams(sp); const d = sortKey === key && dir === 'asc' ? 'desc' : 'asc'; n.set('sort', key); n.set('dir', d); n.delete('p'); setSp(n, { replace: true }); };
  const activeF: [string, string, string][] = ([['land', 'Land', land], ['ampel', 'Ampel', ampel], ['zugriff', 'Zugriff', zugriff], ['ent', 'Enterprise', ent], ['kom', 'Kommerziell', kom]] as [string, string, string][]).filter((x) => x[2] !== 'all');
  const active = activeF.length + caps.length + (cat !== 'all' ? 1 : 0);
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Connectoren</h1>
        <p className="text-sm text-muted-foreground">Read-only Datenconnectoren für öffentliche Quellen, live geprüft. Daten {relTime(dataset.generatedAt)} synchronisiert.</p>
      </header>
      <KpiBar label="Katalog-Kennzahlen">
        <Kpi testid="kpi-total" label="Connectoren" value={k.total} sub="im Katalog" />
        <Kpi label="Ampel grün" value={`${Math.round((100 * k.green) / k.total)} %`} sub={`${k.green} Connectoren`} />
        <Kpi label="Live verifiziert" value={k.audited ? `${Math.round((100 * k.verified) / k.audited)} %` : '–'} sub={`${k.verified} von ${k.audited} auditiert`} />
        <Kpi label="Median p50" value={fmtMs(k.p50)} sub="Antwortzeit" />
        <Kpi label="Ohne Login" value={`${Math.round((100 * k.nologin) / k.total)} %`} sub={`${k.nologin} sofort nutzbar`} />
        <Kpi label="Datenstand" value={relTime(dataset.sourceGeneratedAt.replace(' UTC', 'Z').replace(' ', 'T'))} sub={dataset.sourceGeneratedAt} />
      </KpiBar>
      <nav aria-label="Kategorien" className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        <Chip on={cat === 'all'} onClick={() => set('kat', 'all')}>Alle <span className="opacity-60">{connectors().length}</span></Chip>
        {CATEGORIES.filter((x) => catCount[x.id]).map((x) => { const I = x.icon; return <Chip key={x.id} on={cat === x.id} onClick={() => set('kat', x.id)}><I size={15} aria-hidden style={{ color: cat === x.id ? undefined : x.hue }} />{x.label} <span className="opacity-60">{catCount[x.id]}</span></Chip>; })}
      </nav>
      <section aria-label="Connector-Liste" className="rounded-xl border bg-card">
        <div className="flex flex-wrap items-center gap-2 border-b p-3">
          <div className="relative min-w-[12rem] flex-1"><Search aria-hidden className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <input type="search" aria-label="Suche" placeholder="Liste filtern …" value={q} onChange={(e) => set('q', e.target.value)} className="h-9 w-full rounded-md border border-input bg-background pl-8 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" /></div>
          <button type="button" onClick={() => setSheet(true)} className="inline-flex h-9 items-center gap-2 rounded-md border border-dashed px-3 text-sm hover:bg-accent"><SlidersHorizontal size={15} aria-hidden />Filter{active > 0 && <Badge variant="secondary">{active}</Badge>}</button>
          {activeF.map(([key, l, v]) => <Badge key={key} variant="secondary" className="gap-1">{l}: {v}<button type="button" aria-label={`Filter ${l} entfernen`} onClick={() => set(key, 'all')}><X size={12} /></button></Badge>)}
          {caps.map((x) => <Badge key={x} variant="secondary" className="gap-1">{CAP_FILTERS.find((f) => f[0] === x)?.[1]}<button type="button" aria-label={`Filter ${x} entfernen`} onClick={() => toggleCap(x)}><X size={12} /></button></Badge>)}
          {active > 0 && <button type="button" onClick={() => setSp({}, { replace: true })} className="text-xs text-muted-foreground hover:text-foreground">Zurücksetzen</button>}
          <p className="ml-auto text-xs text-muted-foreground" aria-live="polite"><span data-testid="result-count"><strong className="text-foreground">{list.length}</strong> von {connectors().length}</span> Treffer</p>
        </div>
        {list.length ? <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Tabelle aller Connectoren"><table className="w-full text-sm">
          <thead className="bg-muted/40"><tr className="border-b">
            <th scope="col" className="w-12 py-2 pl-3"><span className="sr-only">Logo</span></th>
            {COLS.map((col) => <th key={col.key} scope="col" aria-sort={sortKey === col.key ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'} className={cn('h-10 whitespace-nowrap pr-3 text-left text-xs font-medium text-muted-foreground', col.className)}>
              <button type="button" onClick={() => sortBy(col.key)} className="-ml-1 inline-flex items-center gap-1 rounded px-1 py-0.5 hover:bg-accent hover:text-foreground">{col.label}{sortKey === col.key ? (dir === 'asc' ? <ArrowUp size={12} aria-hidden /> : <ArrowDown size={12} aria-hidden />) : <ArrowUpDown size={12} aria-hidden className="opacity-40" />}</button></th>)}
          </tr></thead>
          <tbody>{list.slice(pg * PAGE, pg * PAGE + PAGE).map((c) => <Row key={c.id} c={c} />)}</tbody>
        </table></div> : <p className="py-16 text-center text-muted-foreground">Keine Connectoren für diese Filter.</p>}
        <div className="flex items-center justify-between gap-2 border-t px-3 py-2 text-xs text-muted-foreground">
          <span>{sortKey ? `Sortiert nach ${COLS.find((c) => c.key === sortKey)?.label} (${dir === 'asc' ? 'aufsteigend' : 'absteigend'})` : 'Sortiert: Empfohlen (Ampel, Erfolg, Latenz)'}</span>
          <span className="flex items-center gap-2">Seite {pg + 1} von {pages}
            <button type="button" aria-label="Vorherige Seite" disabled={pg === 0} onClick={() => setPage(pg - 1)} className="rounded-md border p-1 disabled:opacity-40"><ChevronLeft size={14} /></button>
            <button type="button" aria-label="Nächste Seite" disabled={pg >= pages - 1} onClick={() => setPage(pg + 1)} className="rounded-md border p-1 disabled:opacity-40"><ChevronRight size={14} /></button></span>
        </div>
      </section>
      <Dialog open={sheet} onClose={() => setSheet(false)} title="Filter" side="right">
        <div className="flex flex-col gap-4 p-4">
          <Sel label="Land" value={land} onChange={(v) => set('land', v)} options={[['all', 'Alle Länder'], ...countries.map((x) => [x, x] as [string, string])]} />
          <Sel label="Ampel" value={ampel} onChange={(v) => set('ampel', v)} options={[['all', 'Alle'], ['green', 'Grün'], ['yellow', 'Gelb'], ['red', 'Rot']]} />
          <Sel label="Zugriff" value={zugriff} onChange={(v) => set('zugriff', v)} options={[['all', 'Alle Zugriffsarten'], ...access.map((x) => [x, x] as [string, string])]} />
          <Sel label="Enterprise-Ampel" value={ent} onChange={(v) => set('ent', v)} options={[['all', 'Alle'], ['grün', 'Grün'], ['gelb', 'Gelb'], ['rot', 'Rot']]} />
          <Sel label="Kommerziell nutzbar" value={kom} onChange={(v) => set('kom', v)} options={[['all', 'Alle'], ['ja', 'ja'], ['mit Namensnennung', 'mit Namensnennung'], ['prüfen', 'prüfen'], ['nein', 'nein']]} />
          <div><p className="mb-1.5 text-xs font-medium text-muted-foreground">Fähigkeiten</p><div className="flex flex-wrap gap-2" role="group" aria-label="Fähigkeiten">{CAP_FILTERS.map(([key, l]) => <Chip key={key} on={caps.includes(key)} onClick={() => toggleCap(key)}>{l}</Chip>)}</div></div>
          <button type="button" onClick={() => setSheet(false)} className="mt-2 h-9 rounded-md bg-primary text-sm font-medium text-primary-foreground">{list.length} Treffer anzeigen</button>
        </div>
      </Dialog>
    </div>
  );
}
