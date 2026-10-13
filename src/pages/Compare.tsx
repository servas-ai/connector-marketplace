import { Link, useSearchParams } from 'react-router-dom';
import { X } from 'lucide-react';
import { Select } from '@/components/ui/select';
import { ConnectorLogo } from '@/components/ConnectorLogo';
import { GateBadge, INTERFACES } from '@/components/InterfaceBadges';
import { StatusBadge } from '@/components/StatusBadges';
import { dataset } from '@/lib/data';
import type { Connector } from '@/lib/types';

const rows: [string, (c: Connector) => string][] = [
  ['Quellentyp', (c) => c.sourceType ?? '—'], ['Kategorie / Land', (c) => `${c.category} · ${c.country}`], ['Zugangsweg', (c) => c.interfaces?.access ?? '—'],
  ['Stabilität', (c) => (c.kpi?.stability != null ? `${c.kpi.stability} %` : '—')], ['Latenz p50 / p95', (c) => (c.kpi?.p50 != null ? `${c.kpi.p50} / ${c.kpi.p95 ?? '—'} ms` : '—')],
  ['Throughput', (c) => (c.kpi?.throughput != null ? `${c.kpi.throughput}/min` : '—')], ['Datenqualität', (c) => (c.kpi?.dataQuality != null ? `${c.kpi.dataQuality}/5` : '—')],
  ['Score', (c) => String(c.kpi?.score ?? '—')], ['Login / Captcha', (c) => `${c.loginRequired ? 'Login' : 'ohne Login'} · ${c.captcha ? 'Captcha' : 'kein Captcha'}`],
  ['robots.txt', (c) => c.robots], ['Hoster', (c) => c.server?.hoster ?? '—'], ['Server-Land', (c) => c.server?.country ?? '—'], ['CDN', (c) => c.server?.cdn ?? '—'],
  ['CMS/Framework', (c) => c.server?.cms ?? '—'], ['TLS-Aussteller', (c) => c.server?.tlsIssuer ?? '—'], ['Domain-Alter', (c) => (c.server?.domainAgeYears != null ? `${c.server.domainAgeYears} J.` : '—')],
  ['Incidents', (c) => String(c.incidents.length)],
];

export function Compare() {
  const [sp, setSp] = useSearchParams();
  const ids = (sp.get('ids') ?? '').split(',').filter(Boolean).slice(0, 3);
  const list = ids.map((id) => dataset.connectors.find((c) => c.id === id)).filter(Boolean) as Connector[];
  const setIds = (n: string[]) => setSp(n.length ? { ids: n.join(',') } : {}, { replace: true });
  const opts = [{ value: '', label: 'Connector hinzufügen …' }, ...dataset.connectors.filter((c) => !ids.includes(c.id)).map((c) => ({ value: c.id, label: c.id }))];
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Vergleich ({list.length}/3)</h1>
      {list.length < 3 && <div className="max-w-sm"><Select label="Connector hinzufügen" value="" onChange={(e) => e.target.value && setIds([...ids, e.target.value])} options={opts} /></div>}
      {list.length === 0 ? <p className="text-muted-foreground">Wähle 2–3 Connectoren aus.</p> : (
        <div className="overflow-x-auto rounded-lg border"><table className="w-full text-sm" data-testid="compare-table">
          <thead><tr className="border-b"><th scope="col" className="p-2 text-left">Merkmal</th>{list.map((c) => (
            <th scope="col" key={c.id} className="p-2 text-left"><div className="flex items-center gap-2"><ConnectorLogo c={c} size={28} /><Link to={`/c/${c.id}`} className="underline">{c.id}</Link>
              <button type="button" aria-label={`${c.id} entfernen`} onClick={() => setIds(ids.filter((x) => x !== c.id))} className="ml-auto text-muted-foreground hover:text-foreground"><X size={14} /></button></div>
              <div className="mt-1 flex gap-1"><StatusBadge c={c} /><GateBadge state={c.gates?.state} errors={c.gates?.errors} /></div></th>))}</tr></thead>
          <tbody>
            {rows.map(([l, f]) => <tr key={l} className="border-b"><th scope="row" className="p-2 text-left font-normal text-muted-foreground">{l}</th>{list.map((c) => <td key={c.id} className="p-2">{f(c)}</td>)}</tr>)}
            {INTERFACES.map(({ key, label }) => <tr key={key} className="border-b last:border-0"><th scope="row" className="p-2 text-left font-normal text-muted-foreground">{label}</th>{list.map((c) => <td key={c.id} className="p-2">{c.interfaces?.[key] ? '✓' : '—'}</td>)}</tr>)}
          </tbody>
        </table></div>)}
    </div>
  );
}
