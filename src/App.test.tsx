import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { App } from './App';
import { dataset } from '@/lib/data';

const at = (path: string) => render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>);

describe('App', () => {
  it('zeigt alle Karten und filtert per Suche', async () => {
    at('/alle');
    expect(await screen.findAllByTestId('connector-card')).toHaveLength(dataset.count);
    fireEvent.change(screen.getByLabelText('Suche'), { target: { value: 'zzzz-nichts' } });
    expect(screen.getByText('Keine Connectoren für diese Filter.')).toBeInTheDocument();
  });
  it('filtert per Status-Select', async () => {
    at('/alle');
    await screen.findAllByTestId('connector-card');
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'failing' } });
    const n = dataset.connectors.filter((c) => c.status === 'failing').length;
    expect(screen.getByTestId('result-count')).toHaveTextContent(`${n} von`);
  });
  it('Detailseite zeigt KPIs und Links', async () => {
    const c = dataset.connectors.find((x) => x.links.protocol)!;
    at(`/c/${c.id}/technik`);
    expect(await screen.findByRole('heading', { name: c.id })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: /KPIs/ }));
    expect(screen.getAllByTestId('kpi')).toHaveLength(12);
    expect(screen.getByText('Prüfprotokoll').closest('a')).toHaveAttribute('href', c.links.protocol);
  });
  it('Dashboard zeigt Gesamtstats', async () => {
    at('/dashboard');
    fireEvent.click(await screen.findByRole('tab', { name: 'KPIs' }));
    expect((await screen.findAllByTestId('stat')).length).toBe(9);
  });
  it('Detail-Tabs: Übersicht, Server, Schnittstellen, Gates, Incidents', async () => {
    const c = dataset.connectors.find((x) => x.server?.hoster) ?? dataset.connectors[0];
    at(`/c/${c.id}/technik`);
    const tabs = await screen.findAllByRole('tab');
    expect(tabs.map((t) => t.textContent)).toEqual(['Übersicht', 'Ampel & Signale', 'KPIs', 'Server & Technik', 'Schnittstellen', 'Qualität/Gates', `Incidents (${c.incidents.length})`]);
    fireEvent.click(screen.getByRole('tab', { name: 'Server & Technik' }));
    if (c.server?.hoster) expect(screen.getAllByText(c.server.hoster).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('tab', { name: 'Schnittstellen' }));
    expect(screen.getByRole('table', { name: 'Schnittstellen-Matrix' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Qualität/Gates' }));
    expect(screen.getAllByTestId('fact').length).toBeGreaterThan(0);
  });
  it('Vergleich von 2–3 Connectoren', async () => {
    const [a, b, c, d] = dataset.connectors;
    at(`/compare?ids=${a.id},${b.id},${c.id},${d.id}`);
    const t = await screen.findByTestId('compare-table');
    expect(t.querySelectorAll('thead th')).toHaveLength(4);
    fireEvent.click(screen.getByLabelText(`${a.id} entfernen`));
    expect(screen.getByTestId('compare-table').querySelectorAll('thead th')).toHaveLength(3);
  });
  it('Grid: Auswahl führt zum Vergleich', async () => {
    at('/alle');
    await screen.findAllByTestId('connector-card');
    const [a, b] = dataset.connectors;
    fireEvent.click(screen.getByLabelText(`${a.id} vergleichen`)); fireEvent.click(screen.getByLabelText(`${b.id} vergleichen`));
    expect(screen.getByTestId('compare-link')).toHaveTextContent('2 vergleichen');
  });
  it('Dashboard zeigt Ampel-, KPI- und Server-/Gate-Charts', async () => {
    at('/dashboard'); expect(await screen.findAllByTestId('chart')).toHaveLength(8); expect(screen.getAllByTestId('ampel-stat')).toHaveLength(12);
    fireEvent.click(screen.getByRole('tab', { name: 'Server, Schnittstellen & Gates' })); expect(await screen.findAllByTestId('chart')).toHaveLength(8);
  });
  it('Heute: Feature-Karten, Kategorien, Top-Liste, Suche', () => {
    at('/');
    expect(screen.getByRole('heading', { name: 'Heute' })).toBeInTheDocument();
    expect(screen.getAllByTestId('feature-card').length).toBeGreaterThan(0);
    expect(screen.getByRole('navigation', { name: 'Kategorien' })).toBeInTheDocument();
    expect(screen.getAllByTestId('connector-card')).toHaveLength(12);
    fireEvent.change(screen.getByLabelText('Suche'), { target: { value: 'zzzz-nichts' } });
    expect(screen.getByText('Keine Connectoren gefunden.')).toBeInTheDocument();
  });
  it('App-Detail: Ampel, Info-Tabelle, Installations-Snippets', async () => {
    const c = dataset.connectors.find((x) => x.ampel) ?? dataset.connectors[0];
    at(`/c/${c.id}`);
    expect(await screen.findByTestId('ampel-badge')).toBeInTheDocument();
    expect(screen.getAllByTestId('info-row')).toHaveLength(12);
    fireEvent.click(screen.getByRole('tab', { name: 'CLI' }));
    expect(screen.getByTestId('snippet')).toHaveTextContent('--format json');
  });
  it('unbekannter Connector', async () => { at('/c/gibtsnicht'); expect(await screen.findByText(/nicht gefunden/)).toBeInTheDocument(); });
});
