import { Badge } from '@/components/ui/badge';
import { Bot, KeyRound, ShieldAlert, ShieldCheck, ShieldQuestion } from 'lucide-react';
import type { Connector } from '@/lib/types';
export function StatusBadge({ c }: { c: Connector }) {
  const e2e = c.e2eTotal ? ` ${c.e2ePassed ?? 0}/${c.e2eTotal}` : '';
  return c.status === 'passing'
    ? <Badge variant="success" title="End-to-End-Tests grün"><span className="relative mr-0.5 inline-flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-60" /><span className="relative inline-flex h-2 w-2 rounded-full bg-current" /></span>grün{e2e}</Badge>
    : <Badge variant="destructive" title="End-to-End-Tests rot"><span className="mr-0.5 inline-flex h-2 w-2 rounded-full bg-current" />{c.status === 'failing' ? 'rot' : c.status}{e2e}</Badge>;
}
export function RobotsBadge({ c }: { c: Connector }) {
  if (c.robots === 'allowed') return <Badge variant="outline" title="robots.txt erlaubt"><ShieldCheck size={12} />robots ok</Badge>;
  if (c.robots === 'disallowed') return <Badge variant="warning" title="robots.txt: offiziell nicht erlaubt"><ShieldAlert size={12} />robots Disallow</Badge>;
  return <Badge variant="secondary" title="robots.txt nicht geprüft"><ShieldQuestion size={12} />robots ?</Badge>;
}
export function FlagBadges({ c }: { c: Connector }) {
  return <>{c.loginRequired && <Badge variant="warning"><KeyRound size={12} />Login</Badge>}{c.captcha && <Badge variant="destructive"><Bot size={12} />Captcha</Badge>}</>;
}
