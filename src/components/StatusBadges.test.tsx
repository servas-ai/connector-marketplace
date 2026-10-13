import { render, screen } from '@testing-library/react';
import { LlmsBadge } from './StatusBadges';
import { dataset } from '@/lib/data';

const base = dataset.connectors[0];
describe('LlmsBadge', () => {
  it('zeigt llms.txt/OpenAPI/MCP und verlinkt auf der Detailseite', () => {
    const c = { ...base, llms: { llmsTxt: 'https://x.org/llms.txt', llmsFull: null, openapi: 'https://x.org/openapi.json', mcp: null, aiPolicy: null } };
    render(<LlmsBadge c={c} link />);
    expect(screen.getByText('llms.txt · OpenAPI')).toBeInTheDocument();
    expect(screen.getByLabelText(/KI-Zugang/)).toHaveAttribute('href', 'https://x.org/llms.txt');
  });
  it('rendert nichts ohne Fund', () => {
    const { container } = render(<LlmsBadge c={{ ...base, llms: { llmsTxt: null, llmsFull: null, openapi: null, mcp: null, aiPolicy: null } }} />);
    expect(container).toBeEmptyDOMElement();
  });
});
