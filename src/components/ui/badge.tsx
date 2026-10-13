import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
const badgeVariants = cva('inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap', {
  variants: { variant: {
    default: 'border-transparent bg-primary text-primary-foreground', secondary: 'border-transparent bg-secondary text-secondary-foreground',
    outline: 'text-foreground', success: 'border-transparent bg-emerald-500/15 text-emerald-800 dark:text-emerald-300', warning: 'border-transparent bg-amber-500/15 text-amber-800 dark:text-amber-300',
    destructive: 'border-transparent bg-red-500/15 text-red-800 dark:text-red-300',
  } }, defaultVariants: { variant: 'default' },
});
export type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>['variant']>;
export function Badge({ className, variant, ...p }: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants>) { return <span className={cn(badgeVariants({ variant }), className)} {...p} />; }
