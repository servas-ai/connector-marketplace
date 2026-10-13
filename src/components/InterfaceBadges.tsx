import { Badge } from '@/components/ui/badge';
import { Braces, Code2, FileSpreadsheet, FileText, KeyRound, MonitorPlay, Paperclip, Plug, Rss, ScanSearch, Terminal, Unlock } from 'lucide-react';
import type { Interfaces } from '@/lib/types';
import type { LucideIcon } from 'lucide-react';

export const INTERFACES: { key: keyof Omit<Interfaces, 'access'>; label: string; icon: LucideIcon; hint: string }[] = [
  { key: 'apiOpen', label: 'API offen', icon: Unlock, hint: 'Offizielle API ohne Account/Key' },
  { key: 'apiKey', label: 'API mit Key', icon: KeyRound, hint: 'Offizielle API, Key nötig' },
  { key: 'ogdDump', label: 'OGD-Dump', icon: FileSpreadsheet, hint: 'Open-Data-Download (CSV/Excel/CKAN)' },
  { key: 'feed', label: 'Feed', icon: Rss, hint: 'RSS/Atom/XML-Feed' },
  { key: 'reJson', label: 'JSON-Backend', icon: Braces, hint: 'Passiv gefundener JSON-Endpunkt' },
  { key: 'mcp', label: 'MCP', icon: Plug, hint: 'Aufrufbar über den MCP-Server von opencli-factory' },
  { key: 'cli', label: 'CLI', icon: Terminal, hint: 'Standalone-CLI-Befehle' },
  { key: 'opencli', label: 'OpenCLI', icon: Code2, hint: 'OpenCLI-Adapter' },
  { key: 'paperclip', label: 'Paperclip', icon: Paperclip, hint: 'Paperclip-Plugin-Manifest' },
  { key: 'playwright', label: 'Playwright', icon: MonitorPlay, hint: 'Headless-Browser nötig' },
  { key: 'pdf', label: 'PDF', icon: FileText, hint: 'PDF-Parsing' },
];
export function InterfaceBadges({ i, compact = false }: { i?: Interfaces; compact?: boolean }) {
  if (!i) return <Badge variant="secondary"><ScanSearch size={12} />nicht angereichert</Badge>;
  return <>{INTERFACES.filter((d) => i[d.key]).map(({ key, label, icon: I, hint }) => (
    <Badge key={key} variant="outline" title={hint} data-testid="iface-badge" aria-label={label}><I size={12} aria-hidden />{!compact && label}</Badge>
  ))}</>;
}
export function GateBadge({ state, errors }: { state?: string; errors?: number }) {
  if (state === 'pass') return <Badge variant="success" title="check_connectors.py --strict">Gates ✓</Badge>;
  if (state === 'fail') return <Badge variant="destructive" title="check_connectors.py --strict">Gates ✗ {errors}</Badge>;
  if (state === 'extern') return <Badge variant="secondary" title="Eigenes Repo, nicht im Mono-Repo-Gate-Lauf">Gates extern</Badge>;
  return <Badge variant="secondary">Gates ?</Badge>;
}
