import { Badge } from '@/components/ui/badge';
import { Bot, Building2, Cloud, Globe2, KeyRound, Landmark, Scale, ShoppingBag, Smartphone, Store, Network, ShieldAlert, ShieldCheck, ShieldQuestion, Shield, Unlock } from 'lucide-react';
import type { Ampel, AmpelLevel, Connector } from '@/lib/types';
import { cn } from '@/lib/utils';

export const AMPEL_COLOR: Record<AmpelLevel, string> = { green: '#22c55e', yellow: '#eab308', red: '#ef4444' };
export const AMPEL_LABEL: Record<AmpelLevel, string> = { green: 'grün', yellow: 'gelb', red: 'rot' };

/** Dreifach-Ampel (rot/gelb/grün) mit aktivem Licht. */
export function AmpelLight({ a, size = 10 }: { a?: Ampel; size?: number }) {
  const lvl = a?.level;
  return (
    <span role="img" aria-label={`Ampel ${lvl ? AMPEL_LABEL[lvl] : 'unbekannt'}`} title={a?.reasons.join(' · ') || 'alles grün'} data-testid="ampel" data-level={lvl}
      className="inline-flex items-center gap-0.5 rounded-full bg-zinc-900 px-1 py-0.5 ring-1 ring-zinc-700">
      {(['red', 'yellow', 'green'] as const).map((l) => <span key={l} style={{ width: size, height: size, background: AMPEL_COLOR[l], opacity: l === lvl ? 1 : 0.18, boxShadow: l === lvl ? `0 0 6px ${AMPEL_COLOR[l]}` : undefined }} className="rounded-full" />)}
    </span>
  );
}
export function AmpelBadge({ a }: { a?: Ampel }) {
  if (!a) return null;
  const v = a.level === 'green' ? 'success' : a.level === 'yellow' ? 'warning' : 'destructive';
  return <Badge variant={v} title={a.reasons.join(' · ') || 'alles grün'}><AmpelLight a={a} size={7} />{AMPEL_LABEL[a.level]}{a.reasons[0] ? ` · ${a.reasons[0]}` : ''}</Badge>;
}

const TYPE_ICON: Record<string, typeof Globe2> = { Register: Building2, Behörde: Landmark, 'Shop/Anbieter': ShoppingBag, Marktplatz: Store, Vergleichsportal: Scale, 'Dienst/API': Network, App: Smartphone };

/** Merkmal-Badges mit Icon: Quellentyp, Hoster, CDN/WAF, Proxy, Captcha-Typ, Login, robots. */
export function FeatureBadges({ c, className }: { c: Connector; className?: string }) {
  const cap = Object.keys(c.signals?.captchaTypes ?? {})[0] ?? (c.captcha ? 'Captcha' : null);
  const T = TYPE_ICON[c.sourceType ?? ''] ?? Globe2;
  return (
    <span className={cn('contents', className)}>
      {c.sourceType && <Badge variant="outline" title="Quellentyp" data-testid="feat-badge"><T size={12} aria-hidden />{c.sourceType}</Badge>}
      {c.server?.hoster && <Badge variant="outline" title={`Hoster (ASN ${c.server.asn ?? '?'})`} data-testid="feat-badge"><Building2 size={12} aria-hidden />{c.server.hoster.slice(0, 22)}</Badge>}
      {c.net?.cdn ? <Badge variant="secondary" title={`CDN/WAF: ${c.net.evidence.join(', ')}`} data-testid="feat-badge"><Cloud size={12} aria-hidden />{c.net.cdn}</Badge>
        : c.net && <Badge variant="outline" title="Kein CDN/WAF erkannt (direkter Origin)" data-testid="feat-badge"><Shield size={12} aria-hidden />Origin</Badge>}
      {c.net?.proxy && !c.net.cdn && <Badge variant="secondary" title="Proxy erkannt (Via-Header)"><Network size={12} aria-hidden />Proxy</Badge>}
      {cap ? <Badge variant="destructive" title="Captcha erkannt (nur gezählt, nie umgangen)" data-testid="feat-badge"><Bot size={12} aria-hidden />{cap}</Badge> : null}
      {c.loginRequired === true ? <Badge variant="warning" title="Login nötig"><KeyRound size={12} aria-hidden />Login</Badge>
        : c.loginRequired === false && <Badge variant="outline" title="Ohne Login nutzbar"><Unlock size={12} aria-hidden />ohne Login</Badge>}
      {c.robots === 'allowed' ? <Badge variant="outline" title="robots.txt erlaubt"><ShieldCheck size={12} aria-hidden />robots ok</Badge>
        : c.robots === 'disallowed' ? <Badge variant="warning" title="robots.txt Disallow – wird respektiert"><ShieldAlert size={12} aria-hidden />robots Disallow</Badge>
        : <Badge variant="secondary" title="robots.txt nicht geprüft"><ShieldQuestion size={12} aria-hidden />robots ?</Badge>}
    </span>
  );
}
