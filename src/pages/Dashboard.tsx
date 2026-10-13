import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { dataset, groupCount, sortConnectors, stats } from '@/lib/data';

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
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-9">
        {tiles.map(([l, v]) => <Card key={l} data-testid="stat"><CardContent className="p-4"><div className="text-xs text-muted-foreground">{l}</div><div className="text-xl font-semibold tabular-nums">{v}</div></CardContent></Card>)}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card><CardHeader><CardTitle>Connectoren pro Kategorie</CardTitle></CardHeader><CardContent className="h-72">
          <ResponsiveContainer><BarChart data={byCat}><XAxis dataKey="name" {...ax} /><YAxis {...ax} /><Tooltip contentStyle={{ background: '#18181b', border: 0 }} />
            <Bar dataKey="passing" fill="#34d399" name="grün" /><Bar dataKey="total" fill="#3f3f46" name="gesamt" /></BarChart></ResponsiveContainer></CardContent></Card>
        <Card><CardHeader><CardTitle>robots.txt-Status</CardTitle></CardHeader><CardContent className="h-72">
          <ResponsiveContainer><BarChart data={byRobots} layout="vertical" margin={{ left: 20 }}><XAxis type="number" {...ax} /><YAxis type="category" dataKey="name" width={90} {...ax} /><Tooltip contentStyle={{ background: '#18181b', border: 0 }} /><Bar dataKey="total" name="Connectoren">{byRobots.map((g) => <Cell key={g.name} fill={g.name === 'allowed' ? '#34d399' : g.name === 'disallowed' ? '#fbbf24' : '#71717a'} />)}</Bar></BarChart></ResponsiveContainer></CardContent></Card>
        <Card><CardHeader><CardTitle>Top 10 KPI-Score</CardTitle></CardHeader><CardContent className="h-72">
          <ResponsiveContainer><BarChart data={top} layout="vertical" margin={{ left: 40 }}><XAxis type="number" {...ax} /><YAxis type="category" dataKey="name" width={110} {...ax} /><Tooltip contentStyle={{ background: '#18181b', border: 0 }} /><Bar dataKey="score" fill="#60a5fa" /></BarChart></ResponsiveContainer></CardContent></Card>
        <Card><CardHeader><CardTitle>Langsamste 10 (p50 / p95 ms)</CardTitle></CardHeader><CardContent className="h-72">
          <ResponsiveContainer><BarChart data={slow} layout="vertical" margin={{ left: 40 }}><XAxis type="number" {...ax} /><YAxis type="category" dataKey="name" width={110} {...ax} /><Tooltip contentStyle={{ background: '#18181b', border: 0 }} /><Bar dataKey="p50" fill="#a78bfa" /><Bar dataKey="p95" fill="#f472b6" /></BarChart></ResponsiveContainer></CardContent></Card>
      </div>
      <p className="text-xs text-muted-foreground">Daten: {dataset.sourceRepo} · Quelle erzeugt {dataset.sourceGeneratedAt} · Sync {dataset.generatedAt}</p>
    </div>
  );
}
