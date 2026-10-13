import type { ReactNode } from 'react';
import { Legend, Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Tabs } from '@/components/ui/tabs';
import { LazyMount } from '@/components/LazyMount';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { dataset, groupBy, groupCount, interfaceCoverage, sortConnectors, stats } from '@/lib/data';

const PAL = ['#60a5fa', '#34d399', '#fbbf24', '#f472b6', '#a78bfa', '#22d3ee', '#fb923c', '#a3e635', '#e879f9', '#94a3b8', '#52525b'];

export function Dashboard() {
  const list = dataset.connectors;
  const s = stats(list);
  const tiles = [
    ['Connectoren', s.total], ['grün', `${s.passing} (${s.passRate} %)`], ['Ø Stabilität', s.avgStability != null ? `${s.avgStability} %` : '—'],
    ['Ø Latenz p50', s.avgP50 != null ? `${s.avgP50} ms` : '—'], ['Datensätze', s.records.toLocaleString('de-AT')], ['Login nötig', s.login],
    ['Captcha', s.captcha], ['robots Disallow', s.robotsDisallowed], ['Incidents', s.incidents],
  ];
  const byCat = groupCount(list, 'category');
  const byRobots = groupCount(list, 'robots');
  const top = sortConnectors(list, 'score').filter((c) => c.kpi?.score != null).slice(0, 10).map((c) => ({ name: c.id, score: c.kpi!.score }));
  const slow = sortConnectors(list, 'p50').filter((c) => c.kpi?.p95).reverse().slice(0, 10).map((c) => ({ name: c.id, p50: c.kpi!.p50, p95: c.kpi!.p95 }));
  const ax = { stroke: '#a1a1aa', fontSize: 11 };
  const tt = { contentStyle: { background: '#18181b', border: 0 } };
  const hoster = groupBy(list, (c) => c.server?.hoster);
  const land = groupBy(list, (c) => c.server?.country);
  const cms = groupBy(list, (c) => c.server?.cms ?? (c.server ? 'kein CMS erkannt' : null));
  const typ = groupBy(list, (c) => c.sourceType);
  const tls = groupBy(list, (c) => c.server?.tlsIssuer, 6);
  const cov = interfaceCoverage(list);
  const gates = groupBy(list, (c) => ({ pass: 'bestanden', fail: 'nicht bestanden', extern: 'externes Repo' } as Record<string, string>)[c.gates?.state ?? ''] ?? null);
  const gateCol: Record<string, string> = { bestanden: '#34d399', 'nicht bestanden': '#f87171', 'externes Repo': '#71717a' };
  const codeMap = new Map<string, number>();
  list.forEach((c) => c.gates?.codes.forEach((k) => codeMap.set(k, (codeMap.get(k) ?? 0) + 1)));
  const codes = [...codeMap].map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total).slice(0, 12);
  const hbar = (data: { name: string; total: number }[], fill: string, w = 120) => (
    <ResponsiveContainer><BarChart data={data} layout="vertical" margin={{ left: 10 }}><XAxis type="number" {...ax} allowDecimals={false} /><YAxis type="category" dataKey="name" width={w} {...ax} /><Tooltip {...tt} /><Bar isAnimationActive={false} dataKey="total" name="Connectoren" fill={fill} /></BarChart></ResponsiveContainer>);
  const pie = (data: { name: string; total: number }[], col?: Record<string, string>) => (
    <ResponsiveContainer><PieChart><Pie isAnimationActive={false} data={data} dataKey="total" nameKey="name" innerRadius="45%" outerRadius="80%" label={({ name, value }) => `${name} (${value})`} fontSize={11}>
      {data.map((d, i) => <Cell key={d.name} fill={col?.[d.name] ?? PAL[i % PAL.length]} />)}</Pie><Tooltip {...tt} /></PieChart></ResponsiveContainer>);
  const extra: [string, ReactNode][] = [
    ['Hoster (ASN)', hbar(hoster, '#60a5fa', 150)], ['Server-Land', hbar(land, '#34d399', 60)], ['CMS / Framework', hbar(cms, '#a78bfa', 130)],
    ['Quellentyp', pie(typ)], ['Schnittstellen-Abdeckung (%)', <ResponsiveContainer><BarChart data={cov} layout="vertical" margin={{ left: 10 }}><XAxis type="number" domain={[0, 100]} {...ax} /><YAxis type="category" dataKey="name" width={100} {...ax} /><Tooltip {...tt} /><Bar isAnimationActive={false} dataKey="pct" name="% der Connectoren" fill="#22d3ee" /></BarChart></ResponsiveContainer>],
    ['Quality-Gate-Status (check_connectors.py --strict)', pie(gates, gateCol)], ['Häufigste Gate-Verstöße', hbar(codes, '#f87171', 70)], ['TLS-Aussteller', hbar(tls, '#fbbf24', 130)],
  ];
  const lvl = (l: string) => list.filter((c) => c.ampel?.level === l).length;
  const sum = (k: string) => list.reduce((a, c) => a + (c.signals?.counts[k] ?? 0), 0);
  const ups = list.map((c) => c.signals?.uptime).filter((x): x is number => x != null);
  const ampelTiles = [['🟢 grün', lvl('green')], ['🟡 gelb', lvl('yellow')], ['🔴 rot', lvl('red')], ['Captcha erkannt', list.filter((c) => c.captcha || c.signals?.counts.captcha).length],
    ['403', sum('403')], ['429', sum('429')], ['Timeouts', sum('timeout')], ['offline/TLS', sum('offline')], ['Ø Uptime', ups.length ? `${Math.round(ups.reduce((a, b) => a + b, 0) / ups.length)} %` : '—'],
    ['hinter CDN/WAF', list.filter((c) => c.net?.cdn).length], ['Proxy erkannt', list.filter((c) => c.net?.proxy).length], ['Egress-IP', dataset.egress?.ip ?? '—']];
  const ampelPie = [{ name: 'grün', total: lvl('green') }, { name: 'gelb', total: lvl('yellow') }, { name: 'rot', total: lvl('red') }];
  const ampelCol = { grün: '#22c55e', gelb: '#eab308', rot: '#ef4444' };
  const reasonMap = new Map<string, number>();
  list.forEach((c) => c.ampel?.reasons.forEach((r) => { const k = r.split(/[:×]/)[0].replace(/\d+ %$/, '').trim(); reasonMap.set(k, (reasonMap.get(k) ?? 0) + 1); }));
  const reasons = [...reasonMap].map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total).slice(0, 10);
  const catAmpel = [...new Set(list.map((c) => c.category))].map((cat) => { const l = list.filter((c) => c.category === cat); return { name: cat, grün: l.filter((c) => c.ampel?.level === 'green').length, gelb: l.filter((c) => c.ampel?.level === 'yellow').length, rot: l.filter((c) => c.ampel?.level === 'red').length }; });
  const capMap = new Map<string, number>();
  list.forEach((c) => { const t = Object.keys(c.signals?.captchaTypes ?? {}); if (t.length) t.forEach((x) => capMap.set(x, (capMap.get(x) ?? 0) + 1)); else if (c.captcha) capMap.set('Captcha (Typ unbekannt)', (capMap.get('Captcha (Typ unbekannt)') ?? 0) + 1); });
  const caps = [...capMap].map(([name, total]) => ({ name, total }));
  const cdn = groupBy(list, (c) => (c.net ? c.net.cdn ?? 'kein CDN (Origin)' : null));
  const proxy = groupBy(list, (c) => (c.net ? (c.net.proxy ? 'Proxy/CDN davor' : 'direkt') : null));
  const upDist = [['100 %', (x: number) => x === 100], ['75–99 %', (x: number) => x >= 75 && x < 100], ['50–74 %', (x: number) => x >= 50 && x < 75], ['< 50 %', (x: number) => x < 50]].map(([name, f]) => ({ name: name as string, total: ups.filter(f as (x: number) => boolean).length }));
  const tl = dataset.timeline ?? [];
  const KCOL: Record<string, string> = { ok: '#22c55e', captcha: '#ef4444', '403': '#f97316', '429': '#eab308', timeout: '#a78bfa', offline: '#64748b', robots: '#f472b6', error: '#94a3b8' };
  const signalCharts: [string, ReactNode][] = [
    ['Ampel-Verteilung', pie(ampelPie, ampelCol)], ['Ampel pro Kategorie', <ResponsiveContainer><BarChart data={catAmpel}><XAxis dataKey="name" {...ax} /><YAxis {...ax} allowDecimals={false} /><Tooltip {...tt} /><Legend /><Bar isAnimationActive={false} dataKey="grün" stackId="a" fill="#22c55e" /><Bar isAnimationActive={false} dataKey="gelb" stackId="a" fill="#eab308" /><Bar isAnimationActive={false} dataKey="rot" stackId="a" fill="#ef4444" /></BarChart></ResponsiveContainer>],
    ['Ereignis-Zeitreihe pro Tag (Captcha, 403, 429, Timeout, offline)', <ResponsiveContainer><BarChart data={tl}><XAxis dataKey="day" {...ax} /><YAxis {...ax} allowDecimals={false} /><Tooltip {...tt} /><Legend />{Object.keys(KCOL).map((k) => <Bar isAnimationActive={false} key={k} dataKey={k} stackId="t" fill={KCOL[k]} />)}</BarChart></ResponsiveContainer>],
    ['Häufigste Ampel-Gründe', hbar(reasons, '#f97316', 160)], ['Captcha-Typen (nur gezählt)', caps.length ? hbar(caps, '#ef4444', 160) : <p className="text-sm text-muted-foreground">Keine Captchas erkannt.</p>],
    ['CDN/WAF vor der Quelle', pie(cdn)], ['Proxy-Erkennung', pie(proxy)], ['Uptime-Verteilung', hbar(upDist, '#22c55e', 80)],
  ];
  return (
    <div className="flex flex-col gap-4">
      <Tabs label="Dashboard-Bereiche" tabs={[
        { id: 'ampel', label: 'Ampel & Signale', content: <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
        {ampelTiles.map(([l, v]) => <Card key={l} data-testid="ampel-stat"><CardContent className="p-4"><div className="text-xs text-muted-foreground">{l}</div><div className="truncate text-xl font-semibold tabular-nums">{v}</div></CardContent></Card>)}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {signalCharts.map(([t, node]) => <Card key={t} data-testid="chart"><CardHeader><CardTitle>{t}</CardTitle></CardHeader><CardContent className="h-72"><LazyMount>{node}</LazyMount></CardContent></Card>)}
      </div>
        </div> },
        { id: 'kpi', label: 'KPIs', content: <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-9">
        {tiles.map(([l, v]) => <Card key={l} data-testid="stat"><CardContent className="p-4"><div className="text-xs text-muted-foreground">{l}</div><div className="text-xl font-semibold tabular-nums">{v}</div></CardContent></Card>)}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card><CardHeader><CardTitle>Connectoren pro Kategorie</CardTitle></CardHeader><CardContent className="h-72">
          <ResponsiveContainer><BarChart data={byCat}><XAxis dataKey="name" {...ax} /><YAxis {...ax} /><Tooltip contentStyle={{ background: '#18181b', border: 0 }} />
            <Bar isAnimationActive={false} dataKey="passing" fill="#34d399" name="grün" /><Bar isAnimationActive={false} dataKey="total" fill="#3f3f46" name="gesamt" /></BarChart></ResponsiveContainer></CardContent></Card>
        <Card><CardHeader><CardTitle>robots.txt-Status</CardTitle></CardHeader><CardContent className="h-72">
          <ResponsiveContainer><BarChart data={byRobots} layout="vertical" margin={{ left: 20 }}><XAxis type="number" {...ax} /><YAxis type="category" dataKey="name" width={90} {...ax} /><Tooltip contentStyle={{ background: '#18181b', border: 0 }} /><Bar isAnimationActive={false} dataKey="total" name="Connectoren">{byRobots.map((g) => <Cell key={g.name} fill={g.name === 'allowed' ? '#34d399' : g.name === 'disallowed' ? '#fbbf24' : '#71717a'} />)}</Bar></BarChart></ResponsiveContainer></CardContent></Card>
        <Card><CardHeader><CardTitle>Top 10 KPI-Score</CardTitle></CardHeader><CardContent className="h-72">
          <ResponsiveContainer><BarChart data={top} layout="vertical" margin={{ left: 40 }}><XAxis type="number" {...ax} /><YAxis type="category" dataKey="name" width={110} {...ax} /><Tooltip contentStyle={{ background: '#18181b', border: 0 }} /><Bar isAnimationActive={false} dataKey="score" fill="#60a5fa" /></BarChart></ResponsiveContainer></CardContent></Card>
        <Card><CardHeader><CardTitle>Langsamste 10 (p50 / p95 ms)</CardTitle></CardHeader><CardContent className="h-72">
          <ResponsiveContainer><BarChart data={slow} layout="vertical" margin={{ left: 40 }}><XAxis type="number" {...ax} /><YAxis type="category" dataKey="name" width={110} {...ax} /><Tooltip contentStyle={{ background: '#18181b', border: 0 }} /><Bar isAnimationActive={false} dataKey="p50" fill="#a78bfa" /><Bar isAnimationActive={false} dataKey="p95" fill="#f472b6" /></BarChart></ResponsiveContainer></CardContent></Card>
      </div>
        </div> },
        { id: 'server', label: 'Server, Schnittstellen & Gates', content: <div className="flex flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-2">
        {extra.map(([t, node]) => <Card key={t} data-testid="chart"><CardHeader><CardTitle>{t}</CardTitle></CardHeader><CardContent className="h-72"><LazyMount>{node}</LazyMount></CardContent></Card>)}
      </div>
        </div> },
      ]} />
      <p className="text-xs text-muted-foreground">Daten: {dataset.sourceRepo} · Quelle erzeugt {dataset.sourceGeneratedAt} · Sync {dataset.generatedAt}{dataset.enrichedAt ? ` · angereichert ${dataset.enrichedAt}` : ''}{dataset.gatesSource ? ` · Gates: ${dataset.gatesSource}` : ''}</p>
    </div>
  );
}
