import { NavLink, Navigate, Route, Routes, Link, useParams } from 'react-router-dom';
import { lazy, Suspense, useState } from 'react';
import { Blocks, Moon, Sun } from 'lucide-react';
import { Home } from '@/pages/Home';
import { ConnectorPage } from '@/pages/ConnectorPage';
import { cn } from '@/lib/utils';
import { dataset } from '@/lib/data';

const Compare = lazy(() => import('@/pages/Compare').then((m) => ({ default: m.Compare })));
const Dashboard = lazy(() => import('@/pages/Dashboard').then((m) => ({ default: m.Dashboard })));
const Agent = lazy(() => import('@/pages/Agent').then((m) => ({ default: m.Agent })));

const tab = ({ isActive }: { isActive: boolean }) => cn('rounded-md px-3 py-1.5 text-sm font-medium transition', isActive ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground');
function ThemeToggle() {
  const [dark, setDark] = useState(() => typeof document !== 'undefined' && document.documentElement.classList.contains('dark'));
  const flip = () => { const d = !dark; setDark(d); document.documentElement.classList.toggle('dark', d); try { localStorage.setItem('theme', d ? 'dark' : 'light'); } catch { /* privat */ } };
  return <button type="button" onClick={flip} aria-label={dark ? 'Helles Design' : 'Dunkles Design'} className="rounded-md border p-2 text-muted-foreground hover:bg-accent">{dark ? <Sun size={16} /> : <Moon size={16} />}</button>;
}
const Old = () => { const { id } = useParams(); return <Navigate to={`/c/${id}`} replace />; };

export function App() {
  return (
    <div className="min-h-screen">
      <a href="#main" className="sr-only focus:not-sr-only">Zum Inhalt</a>
      <header className="sticky top-0 z-20 border-b bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2.5">
          <Link to="/" className="flex shrink-0 items-center gap-2 font-semibold"><span aria-hidden className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground"><Blocks size={17} /></span>Connectors</Link>
          <nav aria-label="Hauptnavigation" className="no-scrollbar ml-auto flex min-w-0 items-center gap-1 overflow-x-auto"><NavLink to="/" end className={tab}>Entdecken</NavLink><NavLink to="/compare" className={tab}>Vergleich</NavLink><NavLink to="/dashboard" className={tab}>Statistik</NavLink><NavLink to="/agent" className={tab}>Für Agenten</NavLink></nav>
          <ThemeToggle />
        </div>
      </header>
      <main id="main" className="mx-auto min-h-[80vh] max-w-7xl px-4 py-8"><Suspense fallback={<div className="p-10 text-center text-muted-foreground">Lädt …</div>}><Routes>
        <Route path="/" element={<Home />} /><Route path="/alle" element={<Navigate to="/" replace />} /><Route path="/c/:id" element={<ConnectorPage />} /><Route path="/c/:id/technik" element={<Old />} />
        <Route path="/dashboard" element={<Dashboard />} /><Route path="/compare" element={<Compare />} /><Route path="/agent" element={<Agent />} /></Routes></Suspense></main>
      <footer className="mx-auto max-w-7xl border-t px-4 py-6 text-xs text-muted-foreground">servas-ai · read-only Katalog · Daten aus <a className="underline" href={`https://github.com/${dataset.sourceRepo}`}>opencli-connectors</a> · Stand {dataset.sourceGeneratedAt} · <a className="underline" href={`${import.meta.env.BASE_URL}llms.txt`}>llms.txt</a> · Lizenz- und Compliance-Angaben automatisch abgeleitet, keine Rechtsberatung</footer>
    </div>
  );
}
