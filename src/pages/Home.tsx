import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { dataset } from '@/lib/data';
import { CATEGORIES, categoryOf } from '@/lib/taxonomy';
import { capOn } from '@/lib/capabilities';
import { extra } from '@/lib/extras';
import { fmtMs, lastCheck, median, relTime, successRate } from '@/lib/kpi';
import { Kpi, KpiBar } from '@/components/kit';
import { Tile } from '@/components/Tile';
import { cn } from '@/lib/utils';
import { commercial, enterprise } from '@/lib/compliance';
import type { Connector } from '@/lib/types';

const ALL = dataset.connectors;
const CAP_FILTERS = [['mcp', 'MCP'], ['cli', 'CLI'], ['http', 'HTTP/API'], ['nologin', 'Ohne Login'], ['robots', 'robots ok'], ['llms', 'llms.txt'], ['openapi', 'OpenAPI'], ['shot', 'Screenshot']] as const;
const SORTS = { empfohlen: 'Empfohlen', erfolg: 'Erfolgsrate', latenz: 'Latenz', frisch: 'Zuletzt geprüft', name: 'Name' } as const;
const lvlRank = (c: Connector) => ({ green: 2, yellow: 1, red: 0 })[c.ampel?.level ?? 'red'];

function sorted(list: Connector[], s: keyof typeof SORTS) {
  const by = {
    empfohlen: (a: Connector, b: Connector) => lvlRank(b) - lvlRank(a) || (successRate(b)?.pct ?? -1) - (successRate(a)?.pct ?? -1) || +!!b.logo - +!!a.logo || (a.kpi?.p50 ?? 1e9) - (b.kpi?.p50 ?? 1e9),
    erfolg: (a: Connector, b: Connector) => (successRate(b)?.pct ?? -1) - (successRate(a)?.pct ?? -1),
    latenz: (a: Connector, b: Connector) => (a.kpi?.p50 ?? 1e9) - (b.kpi?.p50 ?? 1e9),
    frisch: (a: Connector, b: Connector) => (lastCheck(b) ?? '').localeCompare(lastCheck(a) ?? ''),
    name: () => 0,
  }[s];
  return [...list].sort((a, b) => by(a, b) || a.id.localeCompare(b.id));
}

export function globalKpis() {
  const green = ALL.filter((c) => c.ampel?.level === 'green').length;
  const audited = ALL.filter((c) => extra(c).verdict); const verified = audited.filter((c) => extra(c).verdict === 'echt_gruen').length;
  const p50 = median(ALL.map((c) => c.kpi?.p50).filter((x): x is number => x != null && x > 0));
  const nologin = ALL.filter((c) => c.loginRequired === false).length;
  return { total: dataset.count, green, audited: audited.length, verified, p50, nologin };
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" aria-pressed={on} onClick={onClick} className={cn('inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition', on ? 'border-primary bg-primary text-primary-foreground' : 'bg-card hover:bg-accent')}>{children}</button>;
}
function Sel({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return <label className="flex flex-col gap-1 text-xs text-muted-foreground">{label}<select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} className="h-9 rounded-md border border-input bg-card px-2 text-sm text-foreground">{options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>;
}

export function Home() {
  const [sp, setSp] = useSearchParams();
  const get = (k: string, d = 'all') => sp.get(k) ?? d;
  const set = (k: string, v: string) => { const n = new URLSearchParams(sp); if (!v || v === 'all') n.delete(k); else n.set(k, v); setSp(n, { replace: true }); };
  const ent = get('ent'), kom = get('kom');
  const q = get('q', ''), cat = get('kat'), land = get('land'), ampel = get('ampel'), zugriff = get('zugriff'), sort = get('sort', 'empfohlen') as keyof typeof SORTS;
  const capKey = sp.get('cap') ?? '';
  const caps = capKey.split(',').filter(Boolean);
  const toggleCap = (k: string) => set('cap', (caps.includes(k) ? caps.filter((x) => x !== k) : [...caps, k]).join(','));
  const [limit, setLimit] = useState(48);
  const k = useMemo(() => globalKpis(), []);
  const countries = useMemo(() => [...new Set(ALL.map((c) => c.country).filter(Boolean))].sort(), []);
  const access = useMemo(() => [...new Set(ALL.map((c) => c.interfaces?.access).filter(Boolean) as string[])].sort(), []);
  const catCount = useMemo(() => { const m: Record<string, number> = {}; for (const c of ALL) { const id = categoryOf(c).id; m[id] = (m[id] ?? 0) + 1; } return m; }, []);
  const list = (() => {
    const s = q.trim().toLowerCase();
    return sorted(ALL.filter((c) => (!s || [c.id, c.domain, c.description, categoryOf(c).label].some((x) => x?.toLowerCase().includes(s)))
      && (cat === 'all' || categoryOf(c).id === cat) && (land === 'all' || c.country === land) && (ampel === 'all' || c.ampel?.level === ampel)
      && (zugriff === 'all' || c.interfaces?.access === zugriff) && (ent === 'all' || enterprise(c).level === ent) && (kom === 'all' || commercial(c).v === kom) && capKey.split(',').filter(Boolean).every((x) => (x === 'shot' ? !!extra(c).shot : capOn(c, x)))), sort);
  })();
  const active = [cat, land, ampel, zugriff, ent, kom].filter((x) => x !== 'all').length + caps.length;
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Connectoren entdecken</h1>
        <p className="text-muted-foreground">Read-only Datenconnectoren für öffentliche Quellen, live geprüft. Stand {relTime(dataset.generatedAt)}.</p>
      </header>
      <KpiBar label="Katalog-Kennzahlen">
        <Kpi testid="kpi-total" label="Connectoren" value={k.total.toLocaleString('de-AT')} sub="im Katalog" />
        <Kpi label="Ampel grün" value={`${Math.round((100 * k.green) / k.total)} %`} sub={`${k.green} Connectoren`} />
        <Kpi label="Live verifiziert" value={k.audited ? `${Math.round((100 * k.verified) / k.audited)} %` : '–'} sub={`${k.verified} von ${k.audited} auditiert`} />
        <Kpi label="Median p50" value={fmtMs(k.p50)} sub="Antwortzeit" />
        <Kpi label="Ohne Login" value={`${Math.round((100 * k.nologin) / k.total)} %`} sub={`${k.nologin} sofort nutzbar`} />
        <Kpi label="Datenstand" value={relTime(dataset.sourceGeneratedAt.replace(' UTC', 'Z').replace(' ', 'T'))} sub={dataset.sourceGeneratedAt} />
      </KpiBar>
      <div className="relative"><Search aria-hidden className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
        <input type="search" aria-label="Suche" placeholder="Suche nach Name, Domain, Thema …" value={q} onChange={(e) => set('q', e.target.value)} className="h-11 w-full rounded-lg border border-input bg-card pl-10 pr-4 text-base shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring" /></div>
      <nav aria-label="Kategorien" className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        <Chip on={cat === 'all'} onClick={() => set('kat', 'all')}>Alle <span className="opacity-60">{ALL.length}</span></Chip>
        {CATEGORIES.filter((x) => catCount[x.id]).map((x) => { const I = x.icon; return <Chip key={x.id} on={cat === x.id} onClick={() => set('kat', x.id)}><I size={15} aria-hidden style={{ color: cat === x.id ? undefined : x.hue }} />{x.label} <span className="opacity-60">{catCount[x.id]}</span></Chip>; })}
      </nav>
      <section aria-label="Filter" className="flex flex-col gap-3 rounded-xl border bg-card p-4">
        <div className="flex items-center gap-2 text-sm font-medium"><SlidersHorizontal size={16} aria-hidden />Filter {active > 0 && <button type="button" onClick={() => setSp({}, { replace: true })} className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><X size={12} />zurücksetzen ({active})</button>}</div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          <Sel label="Land" value={land} onChange={(v) => set('land', v)} options={[['all', 'Alle Länder'], ...countries.map((x) => [x, x] as [string, string])]} />
          <Sel label="Ampel" value={ampel} onChange={(v) => set('ampel', v)} options={[['all', 'Alle'], ['green', 'Grün'], ['yellow', 'Gelb'], ['red', 'Rot']]} />
          <Sel label="Zugriff" value={zugriff} onChange={(v) => set('zugriff', v)} options={[['all', 'Alle Zugriffsarten'], ...access.map((x) => [x, x] as [string, string])]} />
          <Sel label="Enterprise-Ampel" value={ent} onChange={(v) => set('ent', v)} options={[['all', 'Alle'], ['grün', 'Grün'], ['gelb', 'Gelb'], ['rot', 'Rot']]} />
          <Sel label="Kommerziell nutzbar" value={kom} onChange={(v) => set('kom', v)} options={[['all', 'Alle'], ['ja', 'ja'], ['mit Namensnennung', 'mit Namensnennung'], ['prüfen', 'prüfen'], ['nein', 'nein']]} />
          <Sel label="Sortierung" value={sort} onChange={(v) => set('sort', v)} options={Object.entries(SORTS)} />
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Fähigkeiten">{CAP_FILTERS.map(([key, l]) => <Chip key={key} on={caps.includes(key)} onClick={() => toggleCap(key)}>{l}</Chip>)}</div>
      </section>
      <p className="text-sm text-muted-foreground" aria-live="polite"><strong className="text-foreground" data-testid="result-count">{list.length}</strong> Treffer</p>
      {list.length ? <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{list.slice(0, limit).map((c) => <Tile key={c.id} c={c} />)}</div>
        : <p className="rounded-xl border border-dashed py-16 text-center text-muted-foreground">Keine Connectoren für diese Filter.</p>}
      {list.length > limit && <button type="button" onClick={() => setLimit(limit + 48)} className="mx-auto rounded-md border bg-card px-4 py-2 text-sm font-medium hover:bg-accent">Mehr laden ({list.length - limit} weitere)</button>}
    </div>
  );
}
