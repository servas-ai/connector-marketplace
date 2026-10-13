import * as React from 'react';
import { cn } from '@/lib/utils';
// Natives <select> im shadcn-Look (barrierearm, testbar ohne Portal).
export function Select({ className, label, options, ...p }: React.ComponentProps<'select'> & { label: string; options: { value: string; label: string }[] }) {
  return (
    <label className="flex flex-col gap-1 text-xs text-muted-foreground">{label}
      <select aria-label={label} className={cn('h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground', className)} {...p}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}
