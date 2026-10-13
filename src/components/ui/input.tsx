import * as React from 'react';
import { cn } from '@/lib/utils';
export function Input({ className, ...p }: React.ComponentProps<'input'>) { return <input className={cn('h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring placeholder:text-muted-foreground', className)} {...p} />; }
