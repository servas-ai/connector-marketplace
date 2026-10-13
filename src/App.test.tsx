import { extra } from '@/lib/extras';
import { configure } from '@testing-library/react';
configure({ asyncUtilTimeout: 90000 });
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { App } from './App';
import { dataset } from '@/lib/data';
import { categoryOf, CATEGORIES } from '@/lib/taxonomy';
import { agentPrompt } from '@/lib/prompt';

const at = (path: string) => render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>);
beforeEach(() => { globalThis.fetch = (() => Promise.resolve({ ok: false, json: () => Promise.resolve(null), text: () => Promise.resolve('') })) as unknown as typeof fetch; });

describe('App v5', () => {
  it('Start: KPI-Leiste mit echter Anzahl, Karten, Suche', async () => {
    at('/');
    expect(screen.getByTestId('kpi-total')).toHaveTextContent(String(dataset.count));
    expect(screen.getByTestId('result-count')).toHaveTextContent(String(dataset.count));
    expect(screen.getAllByTestId('connector-card')).toHaveLength(50);
    fireEvent.change(screen.getByLabelText('Suche'), { target: { value: 'zzzz-nichts' } });
    expect(screen.getByText('Keine Connectoren für diese Filter.')).toBeInTheDocument();
  });
  it('keine Sterne, keine Live-Märkte', () => {
    at('/');
    expect(screen.queryByLabelText(/Sternen/)).toBeNull();
    expect(screen.queryByText(/Live-Märkte/)).toBeNull();
  });
  it('Filter Ampel grün', () => {
    at('/?ampel=green');
    expect(screen.getByTestId('result-count')).toHaveTextContent(String(dataset.connectors.filter((c) => c.ampel?.level === 'green').length));
  });
  it('Taxonomie: jede Karte hat eine definierte Kategorie, kaum Sonstige', () => {
    const ids = new Set(CATEGORIES.map((c) => c.id));
    expect(dataset.connectors.every((c) => ids.has(categoryOf(c).id))).toBe(true);
    expect(dataset.connectors.filter((c) => categoryOf(c).id === 'sonstige').length).toBeLessThan(dataset.count * 0.1);
  });
  it('Detail: Tabs, Fähigkeiten, Installieren mit Agent-Prompt', async () => {
    const c = dataset.connectors.find((x) => x.ampel) ?? dataset.connectors[0];
    at(`/c/${c.id}`);
    expect(await screen.findByTestId('ampel-badge')).toBeInTheDocument();
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual(expect.arrayContaining(['Übersicht', 'Routes', 'Installieren', 'Dev', 'Tests & Verlauf', 'Compliance & Lizenz', 'Alle Felder']));
    // Screenshot-Tab hängt am extras-Flag (nicht an x/<id>.json) → Tab-Leiste verschiebt sich nicht beim Nachladen (CLS).
    if (extra(c).shot) expect(screen.getByRole('tab', { name: 'Screenshots' })).toBeInTheDocument();
    else expect(screen.queryByRole('tab', { name: 'Screenshots' })).toBeNull();
    expect(screen.getByTestId('capabilities').querySelectorAll('li')).toHaveLength(10);
    fireEvent.click(screen.getByRole('button', { name: /Installieren/ }));
    expect(screen.getByTestId('agent-prompt')).toHaveTextContent('servas.record.v1');
    fireEvent.click(screen.getByRole('tab', { name: 'CLI' }));
    expect(screen.getByTestId('snippet')).toHaveTextContent('--format json');
  });
  it('Agent-Prompt enthält Bezug, Aufruf, Grenzen', () => {
    const p = agentPrompt(dataset.connectors[0]);
    for (const s of ['## Bezug', 'git clone', '## Aufruf', '## Grenzen', 'robots.txt', 'servas.record.v1']) expect(p).toContain(s);
  });
  it('Vergleich 2–4 mit Entfernen', async () => {
    const [a, b, c, d, e] = dataset.connectors;
    at(`/compare?ids=${a.id},${b.id},${c.id},${d.id},${e.id}`);
    const t = await screen.findByTestId('compare-table');
    expect(t.querySelectorAll('[role=columnheader]')).toHaveLength(5);
    fireEvent.click(screen.getByLabelText(`${a.id} entfernen`));
    expect(screen.getByTestId('compare-table').querySelectorAll('[role=columnheader]')).toHaveLength(4);
  });
  it('Statistik zeigt Ampel-Gründe', async () => { at('/dashboard'); expect(await screen.findByTestId('ampel-reasons')).toBeInTheDocument(); });
  it('alte Technik-Route leitet um', async () => { const c = dataset.connectors[0]; at(`/c/${c.id}/technik`); expect(await screen.findByTestId('ampel-badge')).toBeInTheDocument(); });
  it('unbekannter Connector', async () => { at('/c/gibtsnicht'); expect(await screen.findByText(/nicht gefunden/)).toBeInTheDocument(); });
});
