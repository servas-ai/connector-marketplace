import { useId, useState, type ReactNode, type KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';
export interface TabDef { id: string; label: string; icon?: ReactNode; content: ReactNode }
/** shadcn-Tabs (WAI-ARIA tablist, Pfeiltasten), optional kontrolliert. */
export function Tabs({ tabs, initial, value, onChange, label = 'Connector-Details' }: { tabs: TabDef[]; initial?: string; value?: string; onChange?: (id: string) => void; label?: string }) {
  const [own, setOwn] = useState(initial ?? tabs[0]?.id);
  const active = tabs.some((t) => t.id === (value ?? own)) ? (value ?? own) : tabs[0]?.id;
  const setActive = (id: string) => { setOwn(id); onChange?.(id); };
  const uid = useId();
  const onKey = (e: KeyboardEvent) => {
    const i = tabs.findIndex((t) => t.id === active);
    if (e.key === 'ArrowRight') setActive(tabs[(i + 1) % tabs.length].id);
    if (e.key === 'ArrowLeft') setActive(tabs[(i - 1 + tabs.length) % tabs.length].id);
  };
  return (
    <div className="flex flex-col gap-5">
      <div role="tablist" aria-label={label} className="no-scrollbar inline-flex w-full gap-1 overflow-x-auto rounded-lg bg-muted p-1" onKeyDown={onKey}>
        {tabs.map((t) => (
          <button key={t.id} role="tab" type="button" id={`${uid}-t-${t.id}`} aria-controls={`${uid}-p-${t.id}`} aria-selected={active === t.id} tabIndex={active === t.id ? 0 : -1}
            onClick={() => setActive(t.id)} className={cn('inline-flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition', active === t.id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>
      {tabs.map((t) => <div key={t.id} role="tabpanel" id={`${uid}-p-${t.id}`} aria-labelledby={`${uid}-t-${t.id}`} hidden={active !== t.id}>{active === t.id && t.content}</div>)}
    </div>
  );
}
