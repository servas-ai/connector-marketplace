import { render, screen } from '@testing-library/react';
import { Renderer, createParser } from '@openuidev/react-lang';
import { connectorToOpenUI, library } from './library';
import { dataset } from '@/lib/data';

const c = { ...dataset.connectors[0], robots: 'disallowed' as const, robotsNote: 'Disallow: /', incidents: ['429 Too Many Requests'] };

describe('OpenUI-Bibliothek', () => {
  it('erzeugt gültiges OpenUI Lang ohne Parserfehler', () => {
    const res = createParser(library.toJSONSchema()).parse(connectorToOpenUI(c));
    expect(res.meta.errors).toEqual([]);
    expect(res.meta.unresolved).toEqual([]);
  });
  it('rendert 12 KPI-Kacheln plus robots- und Incident-Hinweis', () => {
    render(<Renderer response={connectorToOpenUI(c)} library={library} isStreaming={false} />);
    expect(screen.getAllByTestId('kpi')).toHaveLength(12);
    expect(screen.getByText('robots.txt: offiziell nicht erlaubt')).toBeInTheDocument();
    expect(screen.getByText('429 Too Many Requests')).toBeInTheDocument();
    expect(screen.getByText('Latenz p95')).toBeInTheDocument();
  });
  it('liefert einen Systemprompt für generative UI', () => {
    expect(library.prompt()).toContain('KpiGrid');
  });
});
