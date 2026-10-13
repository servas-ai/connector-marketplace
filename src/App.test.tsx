import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { App } from './App';
import { dataset } from '@/lib/data';

const at = (path: string) => render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>);

describe('App', () => {
  it('zeigt alle Karten und filtert per Suche', () => {
    at('/');
    expect(screen.getAllByTestId('connector-card')).toHaveLength(dataset.count);
    fireEvent.change(screen.getByLabelText('Suche'), { target: { value: 'zzzz-nichts' } });
    expect(screen.getByText('Keine Connectoren für diese Filter.')).toBeInTheDocument();
  });
  it('filtert per Status-Select', () => {
    at('/');
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'failing' } });
    const n = dataset.connectors.filter((c) => c.status === 'failing').length;
    expect(screen.getByTestId('result-count')).toHaveTextContent(`${n} von`);
  });
  it('Detailseite zeigt KPIs und Links', async () => {
    const c = dataset.connectors.find((x) => x.links.protocol)!;
    at(`/c/${c.id}`);
    expect(await screen.findByRole('heading', { name: c.id })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: /KPIs/ }));
    expect(screen.getAllByTestId('kpi')).toHaveLength(12);
    expect(screen.getByText('Prüfprotokoll').closest('a')).toHaveAttribute('href', c.links.protocol);
  });
  it('Dashboard zeigt Gesamtstats', async () => {
    at('/dashboard');
    expect((await screen.findAllByTestId('stat')).length).toBe(9);
  });
  it('Detail-Tabs: Übersicht, Server, Schnittstellen, Gates, Incidents', async () => {
    const c = dataset.connectors.find((x) => x.server?.hoster) ?? dataset.connectors[0];
    at(`/c/${c.id}`);
    const tabs = await screen.findAllByRole('tab');
    expect(tabs.map((t) => t.textContent)).toEqual(['Übersicht', 'KPIs', 'Server & Technik', 'Schnittstellen', 'Qualität/Gates', `Incidents (${c.incidents.length})`]);
    fireEvent.click(screen.getByRole('tab', { name: 'Server & Technik' }));
    if (c.server?.hoster) expect(screen.getByText(c.server.hoster)).toBeInTheDocument();
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
  it('Grid: Auswahl führt zum Vergleich', () => {
    at('/');
    const [a, b] = dataset.connectors;
    fireEvent.click(screen.getByLabelText(`${a.id} vergleichen`)); fireEvent.click(screen.getByLabelText(`${b.id} vergleichen`));
    expect(screen.getByTestId('compare-link')).toHaveTextContent('2 vergleichen');
  });
  it('Dashboard zeigt Server-/Schnittstellen-/Gate-Charts', async () => { at('/dashboard'); expect(await screen.findAllByTestId('chart')).toHaveLength(8); });
  it('unbekannter Connector', async () => { at('/c/gibtsnicht'); expect(await screen.findByText(/nicht gefunden/)).toBeInTheDocument(); });
});
