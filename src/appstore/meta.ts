import type { Connector } from '@/lib/types';
import { dataset } from '@/lib/data';

export interface Cat { id: string; label: string; from: string; to: string }
const CATS: Record<string, Omit<Cat, 'id'>> = {
  opendata: { label: 'Open Data', from: '#0a84ff', to: '#5e5ce6' },
  international: { label: 'International', from: '#30b0c7', to: '#0a84ff' },
  finance: { label: 'Finanzen', from: '#34c759', to: '#248a3d' },
  tech: { label: 'Entwickler', from: '#5e5ce6', to: '#bf5af2' },
  energie: { label: 'Energie', from: '#ff9f0a', to: '#ff375f' },
  strom: { label: 'Energie', from: '#ff9f0a', to: '#ff375f' },
  mobil: { label: 'Telekom', from: '#ff375f', to: '#bf5af2' },
  festnetz: { label: 'Telekom', from: '#ff375f', to: '#bf5af2' },
  telekom: { label: 'Telekom', from: '#ff375f', to: '#bf5af2' },
  netz: { label: 'Telekom', from: '#ff375f', to: '#bf5af2' },
  intel: { label: 'Web-Analyse', from: '#64d2ff', to: '#0a84ff' },
  vergabe: { label: 'Vergabe & Register', from: '#8e8e93', to: '#3a3a3c' },
  'register-at': { label: 'Vergabe & Register', from: '#8e8e93', to: '#3a3a3c' },
  adapters: { label: 'Vergabe & Register', from: '#8e8e93', to: '#3a3a3c' },
  marktplaetze: { label: 'Shopping', from: '#ff6482', to: '#ff9f0a' },
  vergleich: { label: 'Shopping', from: '#ff6482', to: '#ff9f0a' },
  lebensmittel: { label: 'Shopping', from: '#ff6482', to: '#ff9f0a' },
  geraete: { label: 'Shopping', from: '#ff6482', to: '#ff9f0a' },
};
const OTHER = { label: 'Weitere', from: '#636366', to: '#48484a' };
export const catOf = (c: Connector): Cat => { const m = CATS[c.category] ?? OTHER; return { id: m.label.toLowerCase().replace(/[^a-z]+/g, '-'), ...m }; };
export const categories = (): Cat[] => {
  const m = new Map<string, { cat: Cat; n: number }>();
  for (const c of dataset.connectors) { const k = catOf(c); const e = m.get(k.id) ?? { cat: k, n: 0 }; e.n++; m.set(k.id, e); }
  return [...m.values()].sort((a, b) => b.n - a.n).map((x) => x.cat);
};

/** Bewertung 0–5 aus Live-Tests (E2E bestanden/gesamt) und KPI-Stabilität. */
export function rating(c: Connector): { stars: number; label: string } | null {
  if (c.e2eTotal) { const s = Math.round((10 * 5 * (c.e2ePassed ?? 0)) / c.e2eTotal) / 10; return { stars: s, label: `${c.e2ePassed}/${c.e2eTotal} Live-Tests` }; }
  if (c.kpi?.stability != null) return { stars: Math.round(c.kpi.stability / 2) / 10, label: `Stabilität ${c.kpi.stability} %` };
  return null;
}
export const title = (c: Connector) => (c.domain && /\./.test(c.domain) ? c.domain.replace(/^www\./, '') : c.id);
export const isGreen = (c: Connector) => c.ampel?.level === 'green';
export const score = (c: Connector) => (c.kpi?.score ?? 0) + (isGreen(c) ? 50 : c.ampel?.level === 'yellow' ? 20 : 0) + (c.logo ? 5 : 0);
export const topList = (list = dataset.connectors) => [...list].filter((c) => c.status === 'passing').sort((a, b) => score(b) - score(a) || a.id.localeCompare(b.id));
export const newList = (list = dataset.connectors) => [...list].filter((c) => c.status === 'passing').sort((a, b) => (b.lastRun ?? '').localeCompare(a.lastRun ?? '') || a.id.localeCompare(b.id));

export function snippets(c: Connector) {
  const cmd = c.commands[0] ?? '--help';
  const dir = c.path ? `opencli-connectors/${c.path}` : (c.repo?.split('/').pop() ?? c.id);
  const clone = c.path ? 'gh repo clone servas-ai/opencli-connectors' : `gh repo clone ${c.repo?.replace(/^https:\/\/github.com\//, '') ?? 'servas-ai/' + c.id}`;
  return {
    MCP: `# Paperclip / MCP-Host: Plugin-Manifest einbinden\n${clone}\n# Manifest: ${dir}/paperclip/manifest.json\n# jedes CLI-Kommando wird als MCP-Tool registriert (agent.tools.register)`,
    CLI: `${clone}\ncd ${dir} && npm install\nnode bin/cli.js ${cmd} --format json`,
    HTTP: c.endpoint ? `# Quell-Endpunkt (öffentlich, gedrosselt nutzen)\ncurl -sL "${c.endpoint}"` : '# kein öffentlicher HTTP-Endpunkt dokumentiert',
  };
}
