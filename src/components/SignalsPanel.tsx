import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AMPEL_LABEL } from '@/components/Ampel';
import { dataset } from '@/lib/data';
import type { Connector } from '@/lib/types';

const KIND_LABEL: Record<string, string> = { ok: 'OK', captcha: 'Captcha', '403': '403 Forbidden', '429': '429 Rate-Limit', timeout: 'Timeout', offline: 'offline/TLS', robots: 'robots-Sperre', error: 'sonstiger Fehler' };
const Row = ({ k, v }: { k: string; v: React.ReactNode }) => <tr className="border-b last:border-0"><th scope="row" className="p-2 text-left font-medium text-muted-foreground">{k}</th><td className="p-2 font-mono text-xs">{v ?? '—'}</td></tr>;

export function SignalsPanel({ c }: { c: Connector }) {
  const a = c.ampel, s = c.signals, n = c.net, srv = c.server;
  const md = `![Ampel](https://github.com/servas-ai/connector-marketplace/raw/main/public/badges/${c.id}.svg)`;
  return (
    <div className="grid gap-4 lg:grid-cols-2" data-testid="signals-panel">
      <Card><CardHeader><CardTitle>Ampel: {a ? AMPEL_LABEL[a.level] : '—'}</CardTitle></CardHeader><CardContent className="flex flex-col gap-2 text-sm">
        {a?.reasons.length ? <ul className="list-disc pl-5">{a.reasons.map((r) => <li key={r}>{r}</li>)}</ul> : <p>Gates grün, keine Captchas, stabil.</p>}
        <img src={`badges/${c.id}.svg`} alt={`Ampel-Badge ${c.id}`} height={20} className="h-5 w-fit" />
        <code className="break-all rounded bg-secondary p-2 text-xs">{md}</code>
      </CardContent></Card>
      <Card><CardHeader><CardTitle>Captcha- & Fehler-Zähler ({s?.observations ?? 0} Beobachtungen)</CardTitle></CardHeader><CardContent>
        <table className="w-full text-sm"><caption className="sr-only">Ereigniszähler</caption><tbody>
          {Object.entries(s?.counts ?? {}).map(([k, v]) => <Row key={k} k={KIND_LABEL[k] ?? k} v={v} />)}
          <Row k="Uptime" v={s?.uptime != null ? `${s.uptime} %` : null} /><Row k="Letzte Beobachtung" v={s?.last} />
          <Row k="Captcha-Typen" v={Object.entries(s?.captchaTypes ?? {}).map(([t, x]) => `${t} ×${x}`).join(', ') || 'keine'} />
        </tbody></table>
        <p className="mt-2 text-xs text-muted-foreground">Captchas werden nur erkannt und gezählt, nie gelöst oder umgangen.</p>
      </CardContent></Card>
      <Card><CardHeader><CardTitle>Server & Netz (passiv)</CardTitle></CardHeader><CardContent>
        <table className="w-full text-sm"><caption className="sr-only">Netzanalyse</caption><tbody>
          <Row k="IP" v={srv?.ip} /><Row k="Reverse-DNS" v={n?.rdns} /><Row k="Netz" v={n?.network} /><Row k="ASN" v={srv?.asn} />
          <Row k="Hoster / Rechenzentrum" v={n?.datacenter} /><Row k="CDN/WAF" v={n?.cdn ? <>{n.cdn} <Badge variant="secondary">{n.evidence.join(', ')}</Badge></> : 'keins erkannt'} />
          <Row k="WAF" v={n ? (n.waf ? 'ja' : 'nein') : null} /><Row k="Proxy vor Origin" v={n ? (n.proxy ? 'ja' : 'nein') : null} />
          <Row k="TLS" v={srv?.tlsIssuer} /><Row k="Eigene Egress-IP" v={dataset.egress ? `${dataset.egress.ip}${dataset.egress.rdns ? ` (${dataset.egress.rdns})` : ''}` : null} />
        </tbody></table>
      </CardContent></Card>
      <Card><CardHeader><CardTitle>Screenshot der Quelle</CardTitle></CardHeader><CardContent>
        {c.screenshot ? <img src={c.screenshot} alt={`Screenshot ${c.domain ?? c.id}`} className="w-full rounded-md border" /> : <p className="text-sm text-muted-foreground">Noch kein Screenshot (Proof-Lauf fehlt).</p>}
      </CardContent></Card>
    </div>
  );
}
