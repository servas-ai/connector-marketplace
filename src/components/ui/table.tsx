import * as React from 'react';
import { cn } from '@/lib/utils';
export function Table({ className, ...p }: React.ComponentProps<'table'>) { return <div tabIndex={0} role="region" aria-label={p['aria-label']} className="w-full overflow-x-auto rounded-lg border"><table className={cn('w-full caption-bottom text-sm', className)} {...p} /></div>; }
export const THead = (p: React.ComponentProps<'thead'>) => <thead className="bg-muted/50 [&_tr]:border-b" {...p} />;
export const TBody = (p: React.ComponentProps<'tbody'>) => <tbody className="[&_tr:last-child]:border-0" {...p} />;
export const TR = ({ className, ...p }: React.ComponentProps<'tr'>) => <tr className={cn('border-b transition-colors hover:bg-muted/40', className)} {...p} />;
export const TH = ({ className, ...p }: React.ComponentProps<'th'>) => <th className={cn('h-10 px-3 text-left align-middle text-xs font-medium text-muted-foreground', className)} {...p} />;
export const TD = ({ className, ...p }: React.ComponentProps<'td'>) => <td className={cn('px-3 py-2.5 align-middle', className)} {...p} />;
