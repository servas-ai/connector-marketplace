import { useState } from 'react';
import { Plug } from 'lucide-react';
import type { Connector } from '@/lib/types';
export function ConnectorLogo({ c, size = 40 }: { c: Connector; size?: number }) {
  const [err, setErr] = useState(false);
  if (!c.logo || err) return <div style={{ width: size, height: size }} className="flex items-center justify-center rounded-md bg-muted text-muted-foreground"><Plug size={size / 2} /></div>;
  return <img src={`${import.meta.env.BASE_URL}logos/${c.logo}`} alt="" width={size} height={size} loading="lazy" decoding="async" onError={() => setErr(true)} className="rounded-md bg-white object-contain p-1" style={{ width: size, height: size }} />;
}
