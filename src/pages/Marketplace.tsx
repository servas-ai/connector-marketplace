import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { ConnectorCard } from '@/components/ConnectorCard';
import { LiveStrip } from '@/components/LiveCard';
import { dataset, defaultFilters, filterConnectors, uniq, type Filters } from '@/lib/data';

const all = { value: 'all', label: 'Alle' };
const triOpts = [all, { value: 'yes', label: 'ja' }, { value: 'no', label: 'nein' }];

export function Marketplace() {
  const [sp, setSp] = useSearchParams();
  const f = useMemo(() => ({ ...defaultFilters, ...Object.fromEntries(sp) }) as Filters, [sp]);
  const set = (k: keyof Filters, v: string) => { const n = new URLSearchParams(sp); if (v === defaultFilters[k]) n.delete(k); else n.set(k, v); setSp(n, { replace: true }); };
  const list = dataset.connectors;
  const res = useMemo(() => filterConnectors(list, f), [list, f]);
  return (
    <div className="flex flex-col gap-4">
      {(f.category === 'all' || f.category === 'finance') && <LiveStrip list={list} />}
      <div className="relative"><Search className="absolute left-3 top-2.5 text-muted-foreground" size={16} />
        <Input aria-label="Suche" placeholder="Connector, Domain, Beschreibung …" className="pl-9" value={f.q} onChange={(e) => set('q', e.target.value)} /></div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
        <Select label="Kategorie" value={f.category} onChange={(e) => set('category', e.target.value)} options={[all, ...uniq(list, 'category').map((v) => ({ value: v, label: v }))]} />
        <Select label="Land" value={f.country} onChange={(e) => set('country', e.target.value)} options={[all, ...uniq(list, 'country').map((v) => ({ value: v, label: v }))]} />
        <Select label="Login" value={f.login} onChange={(e) => set('login', e.target.value)} options={triOpts} />
        <Select label="Status" value={f.status} onChange={(e) => set('status', e.target.value)} options={[all, { value: 'passing', label: 'grün' }, { value: 'failing', label: 'rot' }]} />
        <Select label="robots.txt" value={f.robots} onChange={(e) => set('robots', e.target.value)} options={[all, { value: 'allowed', label: 'erlaubt' }, { value: 'disallowed', label: 'Disallow' }, { value: 'unknown', label: 'unbekannt' }]} />
        <Select label="Captcha" value={f.captcha} onChange={(e) => set('captcha', e.target.value)} options={triOpts} />
        <Select label="Sortierung" value={f.sort} onChange={(e) => set('sort', e.target.value)} options={[{ value: 'score', label: 'KPI-Score' }, { value: 'stability', label: 'Stabilität' }, { value: 'p50', label: 'Latenz p50' }, { value: 'throughput', label: 'Throughput' }, { value: 'dataQuality', label: 'Datenqualität' }, { value: 'name', label: 'Name' }]} />
      </div>
      <div className="text-sm text-muted-foreground" data-testid="result-count">{res.length} von {list.length} Connectoren</div>
      {res.length === 0 ? <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">Keine Connectoren für diese Filter.</div> :
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{res.map((c) => <ConnectorCard key={c.id} c={c} />)}</div>}
    </div>
  );
}
