import { useId, useState, type ReactNode, type KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';
export interface TabDef { id: string; label: string; icon?: ReactNode; content: ReactNode }
/** shadcn-artige Tabs (WAI-ARIA tablist, Pfeiltasten). */
export function Tabs({ tabs, initial, label = "Connector-Details" }: { tabs: TabDef[]; initial?: string; label?: string }) {
  const [active, setActive] = useState(initial ?? tabs[0]?.id);
  const uid = useId();
  const onKey = (e: KeyboardEvent) => {
    const i = tabs.findIndex((t) => t.id === active);
    if (e.key === 'ArrowRight') setActive(tabs[(i + 1) % tabs.length].id);
    if (e.key === 'ArrowLeft') setActive(tabs[(i - 1 + tabs.length) % tabs.length].id);
  };
  return (
    <div className="flex flex-col gap-4">
      <div role="tablist" aria-label={label} className="flex flex-wrap gap-1 border-b" onKeyDown={onKey}>
        {tabs.map((t) => (
          <button key={t.id} role="tab" type="button" id={`${uid}-t-${t.id}`} aria-controls={`${uid}-p-${t.id}`} aria-selected={active === t.id} tabIndex={active === t.id ? 0 : -1}
            onClick={() => setActive(t.id)} className={cn('-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm', active === t.id ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground')}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>
      {tabs.map((t) => <div key={t.id} role="tabpanel" id={`${uid}-p-${t.id}`} aria-labelledby={`${uid}-t-${t.id}`} hidden={active !== t.id}>{active === t.id && t.content}</div>)}
    </div>
  );
}
