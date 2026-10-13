import { NavLink, Route, Routes } from 'react-router-dom';
import { LayoutGrid, BarChart3, Store } from 'lucide-react';
import { Marketplace } from '@/pages/Marketplace';
import { Detail } from '@/pages/Detail';
import { Dashboard } from '@/pages/Dashboard';
import { cn } from '@/lib/utils';

const tab = ({ isActive }: { isActive: boolean }) => cn('flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm', isActive ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground');

export function App() {
  return (
    <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-6 p-6">
      <header className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 text-lg font-semibold"><Store size={20} />Connector Marketplace</div>
        <nav className="flex gap-1"><NavLink to="/" end className={tab}><LayoutGrid size={14} />Entdecken</NavLink><NavLink to="/dashboard" className={tab}><BarChart3 size={14} />Dashboard</NavLink></nav>
        <span className="ml-auto text-xs text-muted-foreground">servas-ai · read-only Katalog</span>
      </header>
      <main><Routes><Route path="/" element={<Marketplace />} /><Route path="/c/:id" element={<Detail />} /><Route path="/dashboard" element={<Dashboard />} /></Routes></main>
    </div>
  );
}
