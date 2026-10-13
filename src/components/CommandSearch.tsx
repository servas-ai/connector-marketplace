import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { dataset } from '@/lib/data';
import { categoryOf } from '@/lib/taxonomy';
import { Dialog } from './ui/dialog';
import { Logo, titleOf } from './kit';

/** Command-Suche (⌘K / Strg+K) wie shadcn <CommandDialog>. */
export function CommandSearch() {
  const [open, setOpen] = useState(false); const [q, setQ] = useState(''); const [i, setI] = useState(0); const nav = useNavigate();
  useEffect(() => { const h = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setOpen((o) => !o); } }; window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h); }, []);
  const hits = useMemo(() => { const s = q.trim().toLowerCase(); return (s ? dataset.connectors.filter((c) => [c.id, c.domain, c.description].some((x) => x?.toLowerCase().includes(s))) : dataset.connectors.filter((c) => c.ampel?.level === 'green')).slice(0, 8); }, [q]);
  const go = (id: string) => { setOpen(false); setQ(''); nav(`/c/${id}`); };
  return <>
    <button type="button" onClick={() => setOpen(true)} className="hidden h-9 w-56 items-center gap-2 rounded-md border bg-card px-3 text-sm text-muted-foreground hover:bg-accent md:inline-flex"><Search size={15} aria-hidden />Suchen …<kbd className="ml-auto rounded border bg-muted px-1.5 text-[10px]">⌘K</kbd></button>
    <button type="button" onClick={() => setOpen(true)} aria-label="Befehlspalette öffnen" className="rounded-md border p-2 text-muted-foreground hover:bg-accent md:hidden"><Search size={16} /></button>
    <Dialog open={open} onClose={() => setOpen(false)} title="Befehlspalette">
      <div className="flex items-center gap-2 border-b px-3"><Search size={16} aria-hidden className="text-muted-foreground" />
        <input autoFocus aria-label="Befehlssuche" value={q} onChange={(e) => { setQ(e.target.value); setI(0); }} onKeyDown={(e) => { if (e.key === 'ArrowDown') setI(Math.min(i + 1, hits.length - 1)); if (e.key === 'ArrowUp') setI(Math.max(i - 1, 0)); if (e.key === 'Enter' && hits[i]) go(hits[i].id); }}
          placeholder="Name, Domain, Thema …" className="h-11 flex-1 bg-transparent text-sm outline-none" /></div>
      <ul role="listbox" aria-label="Treffer" className="p-1">{hits.length ? hits.map((c, k) => <li key={c.id} role="option" aria-selected={k === i}><button type="button" onClick={() => go(c.id)} onMouseEnter={() => setI(k)} className={`flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm ${k === i ? 'bg-accent' : ''}`}><Logo c={c} size={24} /><span className="min-w-0 flex-1 truncate">{titleOf(c)}</span><span className="text-xs text-muted-foreground">{categoryOf(c).label}</span></button></li>) : <li className="p-6 text-center text-sm text-muted-foreground">Keine Treffer.</li>}</ul>
      {!q && <p className="border-t px-3 py-2 text-xs text-muted-foreground">Vorschläge: Connectoren mit grüner Ampel</p>}
    </Dialog>
  </>;
}
