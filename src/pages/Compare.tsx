import type { ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus, Trophy, X } from 'lucide-react';
import { dataset } from '@/lib/data';
import type { Connector } from '@/lib/types';
import { capabilities } from '@/lib/capabilities';
import { categoryOf } from '@/lib/taxonomy';
import { extra } from '@/lib/extras';
import { fmtMs, lastCheck, relTime, routeCount, successRate, VERDICT } from '@/lib/kpi';
import { CommercialBadge, EnterpriseBadge } from '@/components/Compliance';
import { codeLicense, dataLicense, enterprise, personal, serverRegion } from '@/lib/compliance';
import { AmpelPill, CapIcon, Logo, capWord, titleOf } from '@/components/kit';

type Val = { show: ReactNode; n?: number | null };
type RowDef = [string, (c: Connector) => Val, ('max' | 'min')?];
const lvl = (c: Connector) => ({ green: 2, yellow: 1, red: 0 })[c.ampel?.level ?? 'red'];
const GROUPS: [string, RowDef[]][] = [
  ['Status & KPIs', [
    ['Ampel', (c) => ({ show: <AmpelPill c={c} />, n: lvl(c) }), 'max'],
    ['Live-Erfolg', (c) => { const s = successRate(c); return { show: s ? `${s.pct} % (${s.label})` : '–', n: s?.pct }; }, 'max'],
    ['Audit-Urteil', (c) => ({ show: VERDICT[extra(c).verdict ?? ''] ?? '–' })],
    ['Stabilität', (c) => ({ show: c.kpi?.stability != null ? `${c.kpi.stability} %` : '–', n: c.kpi?.stability }), 'max'],
    ['Latenz p50', (c) => ({ show: fmtMs(c.kpi?.p50), n: c.kpi?.p50 || null }), 'min'],
    ['Latenz p95', (c) => ({ show: fmtMs(c.kpi?.p95), n: c.kpi?.p95 || null }), 'min'],
    ['Letzte Prüfung', (c) => { const l = lastCheck(c); return { show: relTime(l), n: l ? Date.parse(l) : null }; }, 'max'],
    ['Routen', (c) => ({ show: routeCount(c) || '–', n: routeCount(c) || null }), 'max'],
    ['Datensätze (letzter Lauf)', (c) => ({ show: c.records?.toLocaleString('de-AT') ?? '–' })],
  ]],
  ['Zugriff & Grenzen', [
    ['Zugriffsart', (c) => ({ show: c.interfaces?.access ?? '–' })],
    ['Login', (c) => ({ show: c.loginRequired == null ? 'unbekannt' : c.loginRequired ? 'nötig' : 'nicht nötig' })],
    ['Captcha', (c) => ({ show: capWord(c.captcha) })],
    ['robots.txt', (c) => ({ show: c.robots })],
  ]],
  ['Compliance', [
    ['Enterprise-Ampel', (c) => ({ show: <EnterpriseBadge c={c} />, n: { grün: 2, gelb: 1, rot: 0 }[enterprise(c).level] }), 'max'],
    ['Kommerziell nutzbar', (c) => ({ show: <CommercialBadge c={c} /> })],
    ['Daten-Lizenz', (c) => ({ show: dataLicense(c) ?? 'unbekannt – prüfen' })], ['Code-Lizenz', (c) => ({ show: codeLicense(c) })],
    ['Personenbezug', (c) => ({ show: personal(c).v })], ['Server-Region', (c) => ({ show: serverRegion(c).v })],
  ]],
  ['Version', [ ['Version', (c) => ({ show: extra(c).v ?? '–' })], ['Kategorie / Land', (c) => ({ show: `${categoryOf(c).label} · ${c.country}` })]]],
  ['Server', [['Hoster', (c) => ({ show: c.server?.hoster ?? '–' })], ['ASN', (c) => ({ show: c.server?.asn ?? '–' })], ['CDN', (c) => ({ show: c.net?.cdn ?? c.server?.cdn ?? '–' })], ['Server-Land', (c) => ({ show: c.server?.country ?? '–' })], ['WAF', (c) => ({ show: c.net ? capWord(c.net.waf) : '–' })]]],
];

export function Compare() {
  const [sp, setSp] = useSearchParams();
  const ids = (sp.get('ids') ?? '').split(',').filter(Boolean).slice(0, 4);
  const list = ids.map((id) => dataset.connectors.find((c) => c.id === id)).filter(Boolean) as Connector[];
  const setIds = (n: string[]) => setSp(n.length ? { ids: n.join(',') } : {}, { replace: true });
  const best = (f: RowDef[1], dir?: 'max' | 'min') => { if (!dir || list.length < 2) return null; const ns = list.map((c) => f(c).n).filter((x): x is number => x != null); if (ns.length < 2) return null; const b = dir === 'max' ? Math.max(...ns) : Math.min(...ns); return ns.every((x) => x === b) ? null : b; };
  const cols = `minmax(9rem,12rem) repeat(${Math.max(list.length, 1)}, minmax(12rem,1fr))`;
  return (
    <div className="flex flex-col gap-6">
      <header><h1 className="text-3xl font-bold tracking-tight">Vergleich</h1><p className="text-muted-foreground">2–4 Connectoren nebeneinander. Der beste Wert je Zeile ist markiert.</p></header>
      {list.length < 4 && <label className="flex max-w-md flex-col gap-1 text-xs text-muted-foreground">Connector hinzufügen
        <select aria-label="Connector hinzufügen" value="" onChange={(e) => e.target.value && setIds([...ids, e.target.value])} className="h-10 rounded-md border border-input bg-card px-2 text-sm text-foreground">
          <option value="">Auswählen …</option>{dataset.connectors.filter((c) => !ids.includes(c.id)).sort((a, b) => a.id.localeCompare(b.id)).map((c) => <option key={c.id} value={c.id}>{c.id}</option>)}</select></label>}
      {list.length === 0 ? <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground"><Plus className="mx-auto mb-2" aria-hidden />Wähle mindestens zwei Connectoren.</div> : (
        <div tabIndex={0} role="region" aria-label="Vergleichstabelle" className="overflow-x-auto rounded-xl border bg-card">
          <div role="table" data-testid="compare-table" className="min-w-fit text-sm">
            <div role="row" className="sticky top-0 grid border-b bg-card" style={{ gridTemplateColumns: cols }}>
              <div role="columnheader" className="p-4 text-xs text-muted-foreground">Connector</div>
              {list.map((c) => <div role="columnheader" key={c.id} className="flex flex-col items-start gap-2 border-l p-4">
                <div className="flex w-full items-start gap-2"><Logo c={c} size={44} /><button type="button" aria-label={`${c.id} entfernen`} onClick={() => setIds(ids.filter((x) => x !== c.id))} className="ml-auto rounded p-1 text-muted-foreground hover:bg-accent"><X size={14} /></button></div>
                <Link to={`/c/${c.id}`} className="font-semibold hover:underline">{titleOf(c)}</Link></div>)}
            </div>
            {GROUPS.map(([g, rows]) => <div key={g} role="rowgroup">
              <div role="row" className="border-b bg-muted/50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><span role="cell">{g}</span></div>
              {rows.map(([l, f, dir]) => { const b = best(f, dir); return <div role="row" key={l} className="grid border-b" style={{ gridTemplateColumns: cols }}>
                <div role="rowheader" className="p-3 pl-4 text-muted-foreground">{l}</div>
                {list.map((c) => { const v = f(c); const win = b != null && v.n === b; return <div role="cell" key={c.id} className={`flex items-center gap-1.5 border-l p-3 ${win ? 'bg-emerald-500/10 font-medium' : ''}`}>{win && <Trophy size={13} aria-label="bester Wert" className="text-emerald-600 dark:text-emerald-400" />}{v.show}</div>; })}
              </div>; })}
            </div>)}
            <div role="rowgroup"><div role="row" className="border-b bg-muted/50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><span role="cell">Fähigkeiten</span></div>
              {capabilities(list[0]).map((cap, i) => <div role="row" key={cap.key} className="grid border-b last:border-0" style={{ gridTemplateColumns: cols }}>
                <div role="rowheader" className="p-3 pl-4 text-muted-foreground">{cap.label}</div>
                {list.map((c) => { const v = capabilities(c)[i].value; return <div role="cell" key={c.id} className="flex items-center gap-2 border-l p-3"><CapIcon v={v} /><span className="sr-only">{capWord(v)}</span></div>; })}
              </div>)}</div>
          </div>
        </div>)}
    </div>
  );
}
