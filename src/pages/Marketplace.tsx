import { useMemo, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { ConnectorCard } from '@/components/ConnectorCard';
import { dataset } from '@/lib/data';
import {
  FACETS, COMPARE_LIMIT, QUERY_LIMIT, createCatalogIndex, readCatalogFilters, searchCatalog,
  readComparison, toggleComparison, catalogParams, defaultCatalogFilters, pageOf, type CatalogFilters,
} from '@/lib/catalog';

const index = createCatalogIndex(dataset.connectors);
const button = 'rounded-md border px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 disabled:cursor-not-allowed disabled:opacity-50';

export function Marketplace() {
  const [sp, setSp] = useSearchParams();
  const filters = useMemo(() => readCatalogFilters(sp, index), [sp]);
  const results = useMemo(() => searchCatalog(index, filters), [filters]);
  const selected = readComparison(sp, index);
  const pagination = pageOf(results, Number(sp.get('page') ?? 1));
  const resultRef = useRef<HTMLParagraphElement>(null);
  const active = FACETS.filter(f => filters[f.key] !== 'all').length;
  const setFilter = (key: keyof CatalogFilters, value: string) => {
    const next = catalogParams(filters, selected);
    next.set(key, value);
    setSp(catalogParams(readCatalogFilters(next, index), selected), { replace: key === 'q' });
  };
  const setSelected = (ids: string[]) => setSp(catalogParams(filters, ids, pagination.page), { replace: true });
  const changePage = (page: number) => {
    setSp(catalogParams(filters, selected, page));
    resultRef.current?.focus();
  };
  const renderFacet = (f: typeof FACETS[number]) => <Select key={f.key} label={f.label} value={filters[f.key]}
    onChange={e => setFilter(f.key, e.target.value)} options={index.options[f.key].map(o => ({ ...o, label: `${o.label} (${o.count})` }))} />;

  return (
    <div className="flex flex-col gap-5">
      <div><h1 className="text-2xl font-semibold">Connectoren entdecken</h1>
        <p className="mt-1 text-sm text-muted-foreground">Read-only Katalog. Unbekannt ist kein Nachweis für „nein“ oder „bestanden“.</p></div>
      <div className="relative"><Search aria-hidden="true" className="absolute left-3 top-2.5 text-muted-foreground" size={16} />
        <Input aria-label="Suche" placeholder="Name, Domain, Thema oder Kommando …" className="pl-9" maxLength={QUERY_LIMIT}
          value={filters.q} onChange={e => setFilter('q', e.target.value)} /></div>
      <section aria-label="Katalogfilter" className="rounded-lg border p-4">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">{FACETS.slice(0, 7).map(renderFacet)}</div>
        <details className="mt-4"><summary className="cursor-pointer py-2 text-sm font-medium">Weitere Filter: API, Technik und Qualität</summary>
          <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">{FACETS.slice(7).map(renderFacet)}</div></details>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <Select label="Sortierung" value={filters.sort} onChange={e => setFilter('sort', e.target.value)} options={[
            { value: 'score', label: 'KPI-Score' }, { value: 'stability', label: 'Stabilität' }, { value: 'p50', label: 'Latenz p50' },
            { value: 'throughput', label: 'Throughput' }, { value: 'dataQuality', label: 'Datenqualität' }, { value: 'name', label: 'Name' },
          ]} />
          <button type="button" className={button} disabled={!active && !filters.q && filters.sort === 'score'}
            onClick={() => setSp(catalogParams(defaultCatalogFilters, selected))}>Filter zurücksetzen</button>
          <p className="text-xs text-muted-foreground">{active} aktive Facetten · Zahlen beziehen sich auf den Gesamtkatalog.</p>
        </div>
      </section>
      <section aria-label="Vergleichsauswahl" className="rounded-lg border bg-secondary/30 p-4">
        <div className="flex flex-wrap items-center gap-3"><h2 className="text-sm font-semibold">Vergleich ({selected.length}/{COMPARE_LIMIT})</h2>
          {selected.length > 0 && <><Link data-testid="compare-link" to={`/compare?${catalogParams(filters, selected, pagination.page)}`}
            className="rounded-md bg-secondary px-3 py-2 text-sm underline">{selected.length} vergleichen →</Link>
            <button type="button" className={button} onClick={() => setSelected([])}>Auswahl leeren</button></>}</div>
        <p id="compare-limit" className="mt-2 text-xs text-muted-foreground">Maximal vier Connectoren. Die Auswahl bleibt beim Filtern und beim Zurückkehren aus dem Vergleich erhalten.</p>
        {selected.length === COMPARE_LIMIT && <p role="status" className="mt-2 text-sm">Limit erreicht: zuerst einen Connector entfernen.</p>}
        {selected.length > 0 && <ul className="mt-3 flex flex-wrap gap-2">{selected.map(id => <li key={id}>
          <button type="button" aria-label={`${id} aus Auswahl entfernen`} className={button}
            onClick={() => setSelected(selected.filter(x => x !== id))}>{index.byId.get(id)!.name || id} ×</button>
        </li>)}</ul>}
      </section>
      <p ref={resultRef} tabIndex={-1} role="status" aria-live="polite" aria-atomic="true" className="text-sm text-muted-foreground" data-testid="result-count">
        {results.length} von {index.entries.length} Connectoren · angezeigt {pagination.start}–{pagination.end}
      </p>
      {results.length === 0 ? <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">Keine Connectoren für diese Filter.</div> :
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{pagination.items.map(c => <div key={c.id} className="flex flex-col gap-1">
          <ConnectorCard c={c} />
          <label className="flex min-h-11 items-center gap-2 rounded-md border px-3 py-2 text-sm">
            <input type="checkbox" aria-label={`${c.id} vergleichen`} aria-describedby="compare-limit" checked={selected.includes(c.id)}
              disabled={selected.length >= COMPARE_LIMIT && !selected.includes(c.id)}
              onChange={() => setSelected(toggleComparison(selected, c.id, index))} />Zum Vergleich hinzufügen
          </label></div>)}</div>}
      {pagination.pages > 1 && <nav aria-label="Ergebnisseiten" className="flex flex-wrap items-center justify-center gap-3">
        <button type="button" className={button} disabled={pagination.page === 1} onClick={() => changePage(pagination.page - 1)}>Vorherige Seite</button>
        <span className="text-sm">Seite {pagination.page} von {pagination.pages}</span>
        <button type="button" className={button} disabled={pagination.page === pagination.pages} onClick={() => changePage(pagination.page + 1)}>Nächste Seite</button>
      </nav>}
    </div>
  );
}
