import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { ChevronLeft, Copy, Check } from 'lucide-react';
import { dataset } from '@/lib/data';
import { AMPEL_COLOR, AMPEL_LABEL } from '@/components/ampelMeta';
import { AppIcon, AppRow, Section, Stars } from '@/appstore/ui';
import { catOf, rating, snippets, title, topList } from '@/appstore/meta';

const yn = (v: boolean | null | undefined) => (v == null ? 'unbekannt' : v ? 'ja' : 'nein');

export function AppDetail() {
  const { id } = useParams();
  const c = dataset.connectors.find((x) => x.id === id);
  const [tab, setTab] = useState<'MCP' | 'CLI' | 'HTTP'>('MCP');
  const [copied, setCopied] = useState(false);
  const { hash } = useLocation();
  const toInstall = () => document.getElementById('install')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  useEffect(() => { if (hash === '#install') document.getElementById('install')?.scrollIntoView({ block: 'center' }); else window.scrollTo(0, 0); }, [hash, id]);
  if (!c) return <div className="p-10 text-center">Connector „{id}“ nicht gefunden. <Link className="underline" to="/">Zurück</Link></div>;
  const cat = catOf(c); const r = rating(c); const sn = snippets(c); const lvl = c.ampel?.level;
  const s = c.server; const n = c.net;
  const info: [string, string][] = [
    ['Anbieter', title(c)], ['Kategorie', cat.label], ['Land', c.country || 'unbekannt'],
    ['Zugriff', c.interfaces?.access ?? (c.loginRequired ? 'Login' : 'ohne Login')], ['Lizenz / robots.txt', c.robots === 'allowed' ? 'erlaubt' : c.robots === 'disallowed' ? 'Disallow (nur dokumentiert)' : 'unbekannt'],
    ['Server / ASN', s ? [s.hoster, s.asn, s.city].filter(Boolean).join(' · ') || 'unbekannt' : 'nicht analysiert'],
    ['CDN / WAF', n ? [n.cdn ?? 'kein CDN erkannt', n.waf ? 'WAF' : null].filter(Boolean).join(' · ') : 'nicht analysiert'],
    ['Captcha', yn(c.captcha)], ['Login nötig', yn(c.loginRequired)], ['Datensätze', c.records != null ? c.records.toLocaleString('de-AT') : 'unbekannt'],
    ['Letzter Live-Lauf', c.lastRun ? new Date(c.lastRun).toLocaleDateString('de-AT') : 'unbekannt'], ['Paperclip', c.paperclip ? 'Manifest vorhanden' : 'nein'],
  ];
  const similar = topList(dataset.connectors.filter((x) => x.id !== c.id && catOf(x).id === cat.id)).slice(0, 6);
  const copy = () => { navigator.clipboard?.writeText(sn[tab]).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }).catch(() => {}); };
  return (
    <article className="as-fade flex flex-col gap-8">
      <Link to="/" className="inline-flex w-fit items-center text-[color:var(--link)]"><ChevronLeft size={18} aria-hidden />Heute</Link>
      <header className="flex flex-wrap items-start gap-5">
        <AppIcon c={c} size={128} priority />
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-bold tracking-tight">{title(c)}</h1>
          <p className="text-muted-foreground">{c.id} · {cat.label}</p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button type="button" onClick={toInstall} className="rounded-full bg-[color:var(--primary)] px-6 py-1.5 font-semibold text-[color:var(--primary-foreground)]">Installieren</button>
            <Link to={`/c/${c.id}/technik`} className="text-sm text-[color:var(--link)]">Technische Details</Link>
          </div>
        </div>
      </header>
      <dl tabIndex={0} aria-label="Kennzahlen" className="as-scroll -mx-4 flex divide-x divide-[color:var(--border)] overflow-x-auto px-4 text-center">
        <div className="min-w-32 px-4"><dt className="text-xs uppercase text-muted-foreground">Bewertung</dt><dd className="text-xl font-bold">{r ? r.stars.toFixed(1) : '–'}</dd><dd><Stars c={c} size={11} /></dd></div>
        <div className="min-w-32 px-4"><dt className="text-xs uppercase text-muted-foreground">Ampel</dt><dd className="flex items-center justify-center gap-1.5 text-xl font-bold" data-testid="ampel-badge">{lvl && <span aria-hidden className="inline-block size-3 rounded-full" style={{ background: AMPEL_COLOR[lvl] }} />}{lvl ? AMPEL_LABEL[lvl] : '–'}</dd><dd className="text-xs text-muted-foreground">{c.ampel?.reasons[0] ?? 'alles grün'}</dd></div>
        <div className="min-w-32 px-4"><dt className="text-xs uppercase text-muted-foreground">Live-Tests</dt><dd className="text-xl font-bold">{c.e2eTotal ? `${c.e2ePassed}/${c.e2eTotal}` : '–'}</dd><dd className="text-xs text-muted-foreground">{c.status === 'passing' ? 'bestanden' : c.status}</dd></div>
        <div className="min-w-32 px-4"><dt className="text-xs uppercase text-muted-foreground">Land</dt><dd className="text-xl font-bold">{c.country || '–'}</dd><dd className="text-xs text-muted-foreground">{cat.label}</dd></div>
        <div className="min-w-32 px-4"><dt className="text-xs uppercase text-muted-foreground">Latenz p50</dt><dd className="text-xl font-bold">{c.kpi?.p50 != null ? `${c.kpi.p50} ms` : '–'}</dd><dd className="text-xs text-muted-foreground">KPI-Score {c.kpi?.score ?? '–'}</dd></div>
      </dl>
      {c.screenshot && <Section title="Vorschau"><div className="as-scroll -mx-4 flex gap-4 overflow-x-auto px-4"><img src={`${import.meta.env.BASE_URL}${c.screenshot}`} alt={`Bildschirmfoto der Quelle ${title(c)}`} width={320} height={120} loading="lazy" decoding="async" className="h-auto w-52 max-w-full rounded-2xl ring-1 ring-black/10 object-contain" /></div></Section>}
      <Section title="Beschreibung"><p className="max-w-3xl leading-relaxed">{c.description}</p></Section>
      <Section title="Installieren"><div id="install" className="scroll-mt-20 rounded-2xl bg-[color:var(--card)] p-4 shadow-sm ring-1 ring-[color:var(--border)]">
        <div role="tablist" aria-label="Installationsart" className="mb-3 inline-flex rounded-lg bg-[color:var(--muted)] p-0.5">
          {(['MCP', 'CLI', 'HTTP'] as const).map((k) => <button key={k} role="tab" type="button" aria-selected={tab === k} onClick={() => setTab(k)} className={`rounded-md px-4 py-1 text-sm font-medium ${tab === k ? 'bg-[color:var(--card)] shadow-sm' : 'text-muted-foreground'}`}>{k}</button>)}
        </div>
        <div className="relative"><pre tabIndex={0} data-testid="snippet" className="overflow-x-auto rounded-xl bg-[#1d1d1f] p-4 text-sm leading-relaxed text-[#f5f5f7]"><code>{sn[tab]}</code></pre>
          <button type="button" onClick={copy} aria-label="Snippet kopieren" className="absolute right-2 top-2 rounded-md bg-white/15 p-1.5 text-white hover:bg-white/25">{copied ? <Check size={16} /> : <Copy size={16} />}</button></div>
      </div></Section>
      <Section title="Informationen"><dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8">{info.map(([k, v]) => <div key={k} data-testid="info-row" className="flex justify-between gap-4 border-b border-[color:var(--border)] py-3 text-sm"><dt className="text-muted-foreground">{k}</dt><dd className="text-right font-medium">{v}</dd></div>)}</dl></Section>
      {similar.length > 0 && <Section title={`Mehr aus ${cat.label}`}><div className="grid grid-cols-1 gap-x-8 sm:grid-cols-2 lg:grid-cols-3">{similar.map((x) => <AppRow key={x.id} c={x} />)}</div></Section>}
    </article>
  );
}
