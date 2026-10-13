import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cn } from '@/lib/utils';
export function Button({ className, asChild, variant = 'default', ...p }: React.ComponentProps<'button'> & { asChild?: boolean; variant?: 'default' | 'outline' | 'ghost' }) {
  const C = asChild ? Slot : 'button';
  const v = { default: 'bg-primary text-primary-foreground hover:bg-primary/90', outline: 'border hover:bg-accent', ghost: 'hover:bg-accent' }[variant];
  return <C className={cn('inline-flex h-9 items-center justify-center gap-2 rounded-md px-3 text-sm font-medium transition-colors', v, className)} {...p} />;
}
