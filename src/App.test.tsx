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
  it('Detailseite zeigt KPIs und Links', () => {
    const c = dataset.connectors.find((x) => x.links.protocol)!;
    at(`/c/${c.id}`);
    expect(screen.getByRole('heading', { name: c.id })).toBeInTheDocument();
    expect(screen.getAllByTestId('kpi')).toHaveLength(12);
    expect(screen.getByText('Prüfprotokoll').closest('a')).toHaveAttribute('href', c.links.protocol);
  });
  it('Dashboard zeigt Gesamtstats', () => {
    at('/dashboard');
    expect(screen.getAllByTestId('stat').length).toBe(9);
  });
  it('unbekannter Connector', () => { at('/c/gibtsnicht'); expect(screen.getByText(/nicht gefunden/)).toBeInTheDocument(); });
});
