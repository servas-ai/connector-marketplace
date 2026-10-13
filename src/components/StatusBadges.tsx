import { Badge } from '@/components/ui/badge';
import { Bot, KeyRound, ShieldAlert, ShieldCheck, ShieldQuestion } from 'lucide-react';
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
