import { NavLink, Route, Routes } from 'react-router-dom';
import { LayoutGrid, BarChart3, Columns3, Store } from 'lucide-react';
import { Marketplace } from '@/pages/Marketplace';
import { lazy, Suspense } from 'react';
import { cn } from '@/lib/utils';

const Compare = lazy(() => import('@/pages/Compare').then((m) => ({ default: m.Compare })));
const Detail = lazy(() => import('@/pages/Detail').then((m) => ({ default: m.Detail })));
const Dashboard = lazy(() => import('@/pages/Dashboard').then((m) => ({ default: m.Dashboard })));

const tab = ({ isActive }: { isActive: boolean }) => cn('flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm', isActive ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground');

export function App() {
  return (
    <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-6 p-6">
      <header className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 text-lg font-semibold"><Store size={20} />Connector Marketplace</div>
        <nav className="flex gap-1"><NavLink to="/" end className={tab}><LayoutGrid size={14} />Entdecken</NavLink><NavLink to="/dashboard" className={tab}><BarChart3 size={14} />Dashboard</NavLink><NavLink to="/compare" className={tab}><Columns3 size={14} />Vergleich</NavLink></nav>
        <span className="ml-auto text-xs text-muted-foreground">servas-ai · read-only Katalog</span>
      </header>
      <main><Suspense fallback={<div className="p-10 text-center text-muted-foreground">Lädt …</div>}><Routes><Route path="/" element={<Marketplace />} /><Route path="/c/:id" element={<Detail />} /><Route path="/dashboard" element={<Dashboard />} /><Route path="/compare" element={<Compare />} /></Routes></Suspense></main>
    </div>
  );
}
