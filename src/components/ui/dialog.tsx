import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
/** shadcn-artiger Dialog/Sheet auf Basis von <dialog> (Fokusfalle, Esc, Backdrop nativ). */
export function Dialog({ open, onClose, title, children, side, className }: { open: boolean; onClose: () => void; title: string; children: ReactNode; side?: 'right'; className?: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const d = ref.current; if (!d) return; if (open && !d.open) { if (typeof d.showModal === 'function') d.showModal(); else d.setAttribute('open', ''); } if (!open && d.open) { if (typeof d.close === 'function') d.close(); else d.removeAttribute('open'); } }, [open]);
  return <dialog ref={ref} onClose={onClose} onClick={(e) => { if (e.target === ref.current) onClose(); }} aria-label={title}
    className={cn('bg-card text-card-foreground backdrop:bg-black/50 backdrop:backdrop-blur-[2px] border shadow-lg', side === 'right' ? 'ml-auto mr-0 h-dvh max-h-dvh w-[min(26rem,92vw)] p-0' : 'mx-auto mt-[12vh] w-[min(40rem,92vw)] rounded-xl p-0', className)}>
    {open && <div className="flex h-full flex-col"><div className="flex items-center justify-between border-b px-4 py-3"><h2 className="font-semibold">{title}</h2><button type="button" onClick={onClose} aria-label="Schließen" className="rounded-md p-1 text-muted-foreground hover:bg-accent"><X size={16} /></button></div><div className="min-h-0 flex-1 overflow-auto">{children}</div></div>}
  </dialog>;
}
