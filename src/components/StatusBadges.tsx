import { Badge } from '@/components/ui/badge';
import { Bot, FileText, KeyRound, ShieldAlert, ShieldCheck, ShieldQuestion } from 'lucide-react';
import type { Connector } from '@/lib/types';
export function StatusBadge({ c }: { c: Connector }) {
  return c.status === 'passing' ? <Badge variant="success">● grün</Badge> : <Badge variant="destructive">● {c.status === 'failing' ? 'rot' : c.status}</Badge>;
}
export function RobotsBadge({ c }: { c: Connector }) {
  if (c.robots === 'allowed') return <Badge variant="outline" title="robots.txt erlaubt"><ShieldCheck size={12} />robots ok</Badge>;
  if (c.robots === 'disallowed') return <Badge variant="warning" title="robots.txt: offiziell nicht erlaubt"><ShieldAlert size={12} />robots Disallow</Badge>;
  return <Badge variant="secondary" title="robots.txt nicht geprüft"><ShieldQuestion size={12} />robots ?</Badge>;
}
export function FlagBadges({ c }: { c: Connector }) {
  return <>{c.loginRequired && <Badge variant="warning"><KeyRound size={12} />Login</Badge>}{c.captcha && <Badge variant="destructive"><Bot size={12} />Captcha</Badge>}</>;
}
/** llms.txt / OpenAPI / MCP aus dem llms-Check (opencli-connectors tools/llms). Nur sichtbar, wenn etwas gefunden wurde. */
export function LlmsBadge({ c, link = false }: { c: Connector; link?: boolean }) {
  const l = c.llms;
  if (!l) return null;
  const parts = [l.llmsTxt && 'llms.txt', l.openapi && 'OpenAPI', l.mcp && 'MCP'].filter(Boolean) as string[];
  if (!parts.length) return null;
  const href = l.llmsTxt || l.openapi || l.mcp || undefined;
  const badge = <Badge variant="success" title={`Leichter KI-Zugang: ${parts.join(' · ')}`}><FileText size={12} />{parts.join(' · ')}</Badge>;
  if (!link) return badge;
  return (
    <a href={href} target="_blank" rel="noreferrer" aria-label={`KI-Zugang: ${parts.join(', ')}`}>
      {badge}
    </a>
  );
}
