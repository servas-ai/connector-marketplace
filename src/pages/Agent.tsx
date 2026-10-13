import { useEffect, useState } from 'react';
import { CopyBlock } from '@/components/kit';
const base = import.meta.env.BASE_URL;
export function Agent() {
  const [p, setP] = useState(''); const [l, setL] = useState('');
  useEffect(() => { fetch(`${base}agent-prompt.txt`).then((r) => r.text()).then(setP).catch(() => {}); fetch(`${base}llms.txt`).then((r) => r.text()).then((t) => setL(t.split('\n').slice(0, 40).join('\n') + '\n…')).catch(() => {}); }, []);
  return <div className="flex flex-col gap-6">
    <header><h1 className="text-3xl font-bold tracking-tight">Für KI-Agenten</h1><p className="text-muted-foreground">Ein Prompt für den ganzen Katalog, plus maschinenlesbare Einstiegspunkte.</p></header>
    <section className="rounded-xl border bg-card p-5"><h2 className="mb-3 font-semibold">Katalog-Prompt</h2>{p ? <CopyBlock testid="global-prompt" label="Katalog-Prompt" text={p} /> : <p className="text-sm text-muted-foreground">Lädt …</p>}</section>
    <section className="rounded-xl border bg-card p-5"><h2 className="mb-3 font-semibold">Dateien</h2><ul className="flex flex-col gap-1 text-sm">{['llms.txt', 'llms-full.txt', 'agent-prompt.txt'].map((f) => <li key={f}><a className="text-[color:var(--link)] hover:underline" href={`${base}${f}`}>{f}</a></li>)}<li className="text-muted-foreground">Detaildaten je Connector: <code>x/&lt;id&gt;.json</code></li></ul>
      {l && <div className="mt-4"><CopyBlock label="llms.txt" text={l} /></div>}</section>
  </div>;
}
