import { useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { X } from 'lucide-react';
import { Select } from '@/components/ui/select';
import { ConnectorLogo } from '@/components/ConnectorLogo';
import { GateBadge, INTERFACES } from '@/components/InterfaceBadges';
import { StatusBadge } from '@/components/StatusBadges';
import { dataset } from '@/lib/data';
import { booleanLabel, COMPARE_LIMIT, createCatalogIndex, readCatalogFilters, readComparison, normalizeComparison, catalogParams } from '@/lib/catalog';
import type { Connector } from '@/lib/types';

const index = createCatalogIndex(dataset.connectors);
const metric = (v: number | null | undefined, suffix = '') => typeof v === 'number' && Number.isFinite(v) ? `${v}${suffix}` : 'Unbekannt';
const rows: [string, (c: Connector) => string][] = [
  ['Quellentyp', c => c.sourceType ?? 'Unbekannt'], ['Kategorie / Land', c => `${c.category} · ${c.country}`], ['Zugangsweg', c => c.interfaces?.access ?? 'Unbekannt'],
  ['Stabilität', c => metric(c.kpi?.stability, ' %')], ['Latenz p50 / p95', c => `${metric(c.kpi?.p50)} / ${metric(c.kpi?.p95)} ms`],
  ['Throughput', c => metric(c.kpi?.throughput, '/min')], ['Datenqualität', c => metric(c.kpi?.dataQuality, '/5')], ['Score', c => metric(c.kpi?.score)],
  ['Login', c => booleanLabel(c.loginRequired)], ['Captcha', c => booleanLabel(c.captcha)], ['API verfügbar', c => booleanLabel(c.apiAvailable)],
  ['robots.txt', c => c.robots === 'allowed' ? 'Erlaubt' : c.robots === 'disallowed' ? 'Disallow' : 'Unbekannt'],
  ['Hoster', c => c.server?.hoster ?? 'Unbekannt'], ['Server-Land', c => c.server?.country ?? 'Unbekannt'], ['CDN', c => c.net?.cdn ?? c.server?.cdn ?? 'Unbekannt'],
  ['CMS/Framework', c => c.server?.cms ?? 'Unbekannt'], ['TLS-Aussteller', c => c.server?.tlsIssuer ?? 'Unbekannt'], ['Domain-Alter', c => metric(c.server?.domainAgeYears, ' J.')],
  ['Erfasste Incidents', c => String(c.incidents.length)],
];

export function Compare() {
  const [sp, setSp] = useSearchParams();
  const heading = useRef<HTMLHeadingElement>(null);
  const filters = readCatalogFilters(sp, index);
  const ids = readComparison(sp, index);
  const list = ids.map(id => index.byId.get(id)!);
  const requested = sp.getAll('ids').flatMap(value => value.split(',')).filter(Boolean);
  const adjusted = requested.join(',') !== ids.join(',');
  const page = Number(sp.get('page') ?? 1);
  const setIds = (next: string[]) => {
    setSp(catalogParams(filters, normalizeComparison(next, index), page), { replace: true });
    heading.current?.focus();
  };
  const opts = [{ value: '', label: 'Connector hinzufügen …' }, ...dataset.connectors.filter(c => !ids.includes(c.id)).map(c => ({ value: c.id, label: c.name || c.id }))];
  return (
    <div className="flex flex-col gap-4">
      <Link to={`/?${catalogParams(filters, ids, page)}`} className="w-fit py-2 text-sm underline">← Zurück zu den Ergebnissen</Link>
      <h1 ref={heading} tabIndex={-1} className="text-xl font-semibold">Vergleich ({list.length}/{COMPARE_LIMIT})</h1>
      <p className="text-sm text-muted-foreground">Unbekannt bedeutet: kein belastbarer Nachweis. Es bedeutet weder „Nein“ noch „Bestanden“.</p>
      {adjusted && <p role="status" className="rounded-md border p-3 text-sm">Ungültige, doppelte oder überzählige Auswahlwerte wurden nicht übernommen.</p>}
      {list.length < COMPARE_LIMIT && <div className="max-w-sm"><Select label="Connector hinzufügen" value=""
        onChange={e => e.target.value && setIds([...ids, e.target.value])} options={opts} /></div>}
      {list.length === COMPARE_LIMIT && <p className="text-sm">Maximal vier Connectoren. Entferne einen, um einen anderen hinzuzufügen.</p>}
      {list.length === 0 ? <p className="text-muted-foreground">Wähle zwei bis vier Connectoren aus.</p> : (
        <div tabIndex={0} role="region" aria-label="Vergleichstabelle, horizontal scrollbar" className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm" data-testid="compare-table"><caption className="sr-only">Merkmale der ausgewählten Connectoren</caption>
            <thead><tr className="border-b"><th scope="col" className="p-3 text-left">Merkmal</th>{list.map(c => (
              <th scope="col" key={c.id} className="min-w-48 p-3 text-left"><div className="flex items-center gap-2"><ConnectorLogo c={c} size={28} />
                <Link to={`/c/${encodeURIComponent(c.id)}`} className="underline">{c.id}</Link>
                <button type="button" aria-label={`${c.id} entfernen`} onClick={() => setIds(ids.filter(x => x !== c.id))}
                  className="ml-auto min-h-11 min-w-11 rounded-md border p-2 text-muted-foreground hover:text-foreground"><X aria-hidden="true" size={16} /></button></div>
                <div className="mt-1 flex flex-wrap gap-1"><StatusBadge c={c} /><GateBadge state={c.gates?.state} errors={c.gates?.errors} /></div></th>))}</tr></thead>
            <tbody>
              {rows.map(([label, value]) => <tr key={label} className="border-b"><th scope="row" className="p-3 text-left font-normal text-muted-foreground">{label}</th>
                {list.map(c => <td key={c.id} className="p-3">{value(c)}</td>)}</tr>)}
              {INTERFACES.map(({ key, label }) => <tr key={key} className="border-b last:border-0"><th scope="row" className="p-3 text-left font-normal text-muted-foreground">{label}</th>
                {list.map(c => <td key={c.id} className="p-3">{booleanLabel(c.interfaces?.[key])}</td>)}</tr>)}
            </tbody>
          </table>
        </div>)}
    </div>
  );
}
