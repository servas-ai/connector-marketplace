import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { App } from './App';
import { dataset } from '@/lib/data';
import { PAGE_SIZE } from '@/lib/catalog';

const at = (path: string) => render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>);

describe('App', () => {
  it('zeigt eine begrenzte Ergebnisseite und filtert per Suche', () => {
    at('/');
    expect(screen.getAllByTestId('connector-card')).toHaveLength(Math.min(PAGE_SIZE, dataset.connectors.length));
    fireEvent.change(screen.getByLabelText('Suche'), { target: { value: 'zzzz-nichts' } });
    expect(screen.getByText('Keine Connectoren für diese Filter.')).toBeInTheDocument();
  });
  it('filtert per Status-Select', () => {
    at('/');
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'v:failing' } });
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
    fireEvent.click(await screen.findByRole('tab', { name: 'KPIs' }));
    expect((await screen.findAllByTestId('stat')).length).toBe(9);
  });
  it('Detail-Tabs: Übersicht, Server, Schnittstellen, Gates, Incidents', async () => {
    const c = dataset.connectors.find((x) => x.server?.hoster) ?? dataset.connectors[0];
    at(`/c/${c.id}`);
    const tabs = await screen.findAllByRole('tab');
    expect(tabs.map((t) => t.textContent)).toEqual(['Übersicht', 'Ampel & Signale', 'KPIs', 'Server & Technik', 'Schnittstellen', 'Qualität/Gates', `Incidents (${c.incidents.length})`]);
    fireEvent.click(screen.getByRole('tab', { name: 'Server & Technik' }));
    if (c.server?.hoster) expect(screen.getAllByText(c.server.hoster).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('tab', { name: 'Schnittstellen' }));
    expect(screen.getByRole('table', { name: 'Schnittstellen-Matrix' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Qualität/Gates' }));
    expect(screen.getAllByTestId('fact').length).toBeGreaterThan(0);
  });
  it('Vergleich von bis zu vier Connectoren', async () => {
    const [a, b, c, d] = dataset.connectors;
    at(`/compare?ids=${a.id},${b.id},${c.id},${d.id}`);
    const t = await screen.findByTestId('compare-table');
    expect(t.querySelectorAll('thead th')).toHaveLength(5);
    fireEvent.click(screen.getByLabelText(`${a.id} entfernen`));
    expect(screen.getByTestId('compare-table').querySelectorAll('thead th')).toHaveLength(4);
  });
  it('Grid: Auswahl führt zum Vergleich', () => {
    at('/');
    const [a, b] = screen.getAllByRole('checkbox');
    fireEvent.click(a); fireEvent.click(b);
    expect(screen.getByTestId('compare-link')).toHaveTextContent('2 vergleichen');
  });
  it('Grid: fünfte Auswahl ist gesperrt, Entfernen bleibt möglich', () => {
    at('/');
    const boxes = screen.getAllByRole('checkbox');
    boxes.slice(0, 4).forEach(box => fireEvent.click(box));
    expect(boxes[4]).toBeDisabled();
    expect(boxes[0]).not.toBeDisabled();
    fireEvent.click(boxes[0]);
    expect(boxes[4]).not.toBeDisabled();
    expect(screen.getByTestId('compare-link')).toHaveTextContent('3 vergleichen');
  });
  it('Grid: gefilterte Auswahl bleibt im Vergleich erhalten', () => {
    at('/');
    fireEvent.click(screen.getAllByRole('checkbox')[0]);
    fireEvent.change(screen.getByLabelText('Suche'), { target: { value: 'zzzz-nichts' } });
    expect(screen.getByText('Keine Connectoren für diese Filter.')).toBeInTheDocument();
    expect(screen.getByTestId('compare-link')).toHaveTextContent('1 vergleichen');
    fireEvent.click(screen.getByRole('button', { name: 'Filter zurücksetzen' }));
    expect(screen.getAllByRole('checkbox').filter(box => (box as HTMLInputElement).checked)).toHaveLength(1);
  });
  it('Grid: unbekannter Login ist nicht nein', () => {
    at('/?login=unknown');
    const n = dataset.connectors.filter(c => c.loginRequired == null).length;
    expect(screen.getByTestId('result-count')).toHaveTextContent(`${n} von`);
  });
  it('Vergleich ignoriert unbekannte und doppelte IDs vor dem Limit', async () => {
    const [a, b, c, d] = dataset.connectors;
    at(`/compare?ids=missing-worker-306,${a.id},${a.id},${b.id},${c.id},${d.id}`);
    expect((await screen.findByTestId('compare-table')).querySelectorAll('thead th')).toHaveLength(5);
    expect(screen.getByText(/Ungültige, doppelte oder überzählige/)).toBeInTheDocument();
  });
  it('Dashboard zeigt Ampel-, KPI- und Server-/Gate-Charts', async () => {
    at('/dashboard'); expect(await screen.findAllByTestId('chart')).toHaveLength(8); expect(screen.getAllByTestId('ampel-stat')).toHaveLength(12);
    fireEvent.click(screen.getByRole('tab', { name: 'Server, Schnittstellen & Gates' })); expect(await screen.findAllByTestId('chart')).toHaveLength(8);
  });
  it('unbekannter Connector', async () => { at('/c/gibtsnicht'); expect(await screen.findByText(/nicht gefunden/)).toBeInTheDocument(); });
});
