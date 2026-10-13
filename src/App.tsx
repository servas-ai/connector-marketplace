import { NavLink, Route, Routes, Link } from 'react-router-dom';
import { lazy, Suspense, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { Today } from '@/pages/Today';
import { Marketplace } from '@/pages/Marketplace';
import { AppDetail } from '@/pages/AppDetail';
import { cn } from '@/lib/utils';
import { dataset } from "@/lib/data";

const Compare = lazy(() => import('@/pages/Compare').then((m) => ({ default: m.Compare })));
const Detail = lazy(() => import('@/pages/Detail').then((m) => ({ default: m.Detail })));
const Dashboard = lazy(() => import('@/pages/Dashboard').then((m) => ({ default: m.Dashboard })));

const tab = ({ isActive }: { isActive: boolean }) => cn('rounded-full px-3 py-1 text-sm font-medium', isActive ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground');

function ThemeToggle() {
  const [dark, setDark] = useState(() => typeof document !== 'undefined' && document.documentElement.classList.contains('dark'));
  const flip = () => { const d = !dark; setDark(d); document.documentElement.classList.toggle('dark', d); try { localStorage.setItem('theme', d ? 'dark' : 'light'); } catch { /* privat */ } };
  return <button type="button" onClick={flip} aria-label={dark ? 'Helles Design' : 'Dunkles Design'} className="rounded-full p-2 text-muted-foreground hover:bg-[color:var(--muted)]">{dark ? <Sun size={18} /> : <Moon size={18} />}</button>;
}

export function App() {
  return (
    <div className="min-h-screen">
      <a href="#main" className="sr-only focus:not-sr-only">Zum Inhalt</a>
      <header className="sticky top-0 z-20 border-b border-[color:var(--border)] bg-[color:var(--background)]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2">
          <Link to="/" className="flex items-center gap-2 font-semibold"><span aria-hidden className="flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#0a84ff] to-[#5e5ce6] text-white">⌘</span>Connectors</Link>
          <nav aria-label="Hauptnavigation" className="ml-auto flex min-w-0 gap-1 overflow-x-auto"><NavLink to="/" end className={tab}>Heute</NavLink><NavLink to="/alle" className={tab}>Alle</NavLink><NavLink to="/dashboard" className={tab}>Statistik</NavLink><NavLink to="/compare" className={tab}>Vergleich</NavLink></nav>
          <ThemeToggle />
        </div>
      </header>
      <main id="main" className="mx-auto min-h-[80vh] max-w-6xl px-4 py-8"><Suspense fallback={<div className="p-10 text-center text-muted-foreground">Lädt …</div>}><Routes>
        <Route path="/" element={<Today />} /><Route path="/alle" element={<Marketplace />} /><Route path="/c/:id" element={<AppDetail />} /><Route path="/c/:id/technik" element={<Detail />} />
        <Route path="/dashboard" element={<Dashboard />} /><Route path="/compare" element={<Compare />} /></Routes></Suspense></main>
      <footer className="mx-auto max-w-6xl px-4 pb-10 text-xs text-muted-foreground">servas-ai · read-only Katalog · Daten aus <a className="underline" href="https://github.com/servas-ai/opencli-connectors">opencli-connectors</a> · Stand {dataset.sourceGeneratedAt?.slice(0, 10)}</footer>
    </div>
  );
}
