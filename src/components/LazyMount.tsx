import { useEffect, useRef, useState, type ReactNode } from 'react';
/** Rendert Kinder erst, wenn der Container sichtbar wird (Charts unterhalb des Folds). */
export function LazyMount({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(typeof IntersectionObserver === 'undefined');
  useEffect(() => {
    if (on || !ref.current) return;
    const io = new IntersectionObserver((e) => { if (e.some((x) => x.isIntersecting)) { setOn(true); io.disconnect(); } }, { rootMargin: '100px' });
    io.observe(ref.current); return () => io.disconnect();
  }, [on]);
  return <div ref={ref} className="h-full w-full">{on ? children : null}</div>;
}
