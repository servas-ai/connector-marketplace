import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { dataset } from '@/lib/data';
import { AppIcon, AppRow, Section } from '@/appstore/ui';
import { catOf, categories, isGreen, newList, title, topList } from '@/appstore/meta';
import type { Connector } from '@/lib/types';

const headline = (d: string) => { const s = d.split(/[.(]/)[0].trim(); if (s.length <= 64) return s; const cut = s.slice(0, 64); return `${cut.slice(0, cut.lastIndexOf(' '))} …`; };
const date = new Intl.DateTimeFormat('de-AT', { weekday: 'long', day: 'numeric', month: 'long' });

function FeatureCard({ c, kicker, headline, i }: { c: Connector; kicker: string; headline: string; i: number }) {
  const cat = catOf(c);
  return (
    <Link to={`/c/${c.id}`} data-testid="feature-card" className="as-lift as-fade relative flex min-h-[22rem] w-[min(85vw,24rem)] shrink-0 flex-col justify-between overflow-hidden rounded-3xl p-6 text-white shadow-md"
      style={{ background: `linear-gradient(160deg, ${cat.from}, ${cat.to})`, animationDelay: `${i * 60}ms` }}>
      <div><p className="text-xs font-semibold uppercase tracking-wider text-white/90">{kicker}</p><h2 className="mt-1 text-3xl font-bold leading-tight tracking-tight">{headline}</h2></div>
      <div className="flex items-center gap-3 rounded-2xl bg-black/30 p-3 backdrop-blur">
        <AppIcon c={c} size={48} />
        <div className="min-w-0 flex-1"><p className="truncate font-semibold">{title(c)}</p><p className="truncate text-sm text-white/90">{cat.label} · {c.country}</p></div>
        <span className="rounded-full bg-white/90 px-4 py-1 text-sm font-semibold text-[#0058b0]">Laden</span>
      </div>
    </Link>
  );
}

function Grid({ list }: { list: Connector[] }) {
  return <div className="grid grid-cols-1 gap-x-8 sm:grid-cols-2 lg:grid-cols-3">{list.map((c, i) => <AppRow key={c.id} c={c} rank={i + 1} />)}</div>;
}

export function Today() {
  const [cat, setCat] = useState('alle');
  const [q, setQ] = useState('');
  const cats = useMemo(() => categories(), []);
  const base = useMemo(() => dataset.connectors.filter((c) => cat === 'alle' || catOf(c).id === cat), [cat]);
  const hits = useMemo(() => { const s = q.trim().toLowerCase(); return s ? dataset.connectors.filter((c) => [c.id, c.domain, c.description, catOf(c).label].some((x) => x?.toLowerCase().includes(s))) : []; }, [q]);
  const top = topList(base);
  const features = useMemo(() => {
    const seen = new Set<string>(); const out: Connector[] = [];
    const pool = topList().filter(isGreen);
    for (const pass of [true, false]) for (const c of pool) { const k = catOf(c).id; if (!seen.has(k) && (!pass || c.logo)) { seen.add(k); out.push(c); } }
    return out.slice(0, 8);
  }, []);
  const green = dataset.connectors.filter(isGreen).length;
  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-sm font-semibold uppercase text-muted-foreground">{date.format(new Date())}</p><h1 className="text-4xl font-bold tracking-tight">Heute</h1></div>
        <p className="text-sm text-muted-foreground"><strong className="text-foreground">{dataset.count}</strong> Connectoren · <strong className="text-foreground">{green}</strong> mit grüner Ampel</p>
      </header>
      <div className="relative"><Search aria-hidden className="absolute left-3 top-3 text-muted-foreground" size={18} />
        <input type="search" aria-label="Suche" placeholder="Connectoren, Domains, Kategorien" value={q} onChange={(e) => setQ(e.target.value)}
          className="h-11 w-full rounded-xl bg-[color:var(--muted)] pl-10 pr-4 text-base outline-none placeholder:text-muted-foreground" /></div>
      {q ? (
        <Section title={`Ergebnisse (${hits.length})`}>{hits.length ? <Grid list={hits.slice(0, 60)} /> : <p className="py-10 text-center text-muted-foreground">Keine Connectoren gefunden.</p>}</Section>
      ) : (<>
        <div className="as-scroll -mx-4 flex gap-4 overflow-x-auto px-4 pb-2" role="list" aria-label="Empfohlen">
          {features.map((c, i) => <div role="listitem" key={c.id}><FeatureCard c={c} i={i} kicker={`Empfohlen · ${catOf(c).label}`} headline={headline(c.description)} /></div>)}
        </div>
        <nav aria-label="Kategorien" className="as-scroll -mx-4 flex gap-2 overflow-x-auto px-4">
          {[{ id: 'alle', label: 'Alle' }, ...cats].map((k) => (
            <button key={k.id} type="button" aria-pressed={cat === k.id} onClick={() => setCat(k.id)}
              className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium ${cat === k.id ? 'bg-foreground text-background' : 'bg-[color:var(--muted)] text-foreground hover:opacity-80'}`}>{k.label}</button>))}
        </nav>
        <Section title="Top-Connectoren" action={<Link to="/alle" className="text-sm text-[color:var(--link)]">Alle anzeigen</Link>}><Grid list={top.slice(0, 12)} /></Section>
        <Section title="Neu & aktualisiert"><div className="as-scroll -mx-4 flex gap-4 overflow-x-auto px-4">
          {newList(base).slice(0, 16).map((c) => <Link key={c.id} to={`/c/${c.id}`} className="as-lift w-28 shrink-0 rounded-2xl p-1"><AppIcon c={c} size={104} /><span className="mt-2 block truncate text-sm font-medium">{title(c)}</span><span className="block truncate text-xs text-muted-foreground">{catOf(c).label}</span></Link>)}
        </div></Section>
      </>)}
    </div>
  );
}
