import { useEffect, useState, type CSSProperties } from "react";
import {
  usePluginAction, usePluginData, useHostNavigation, usePluginToast,
  MetricCard, StatusBadge, KeyValueList, JsonTree, Spinner,
  type PluginWidgetProps, type PluginPageProps, type PluginSidebarProps,
} from "@paperclipai/plugin-sdk/ui";

type Item = { slug: string; domain: string; category?: string; status?: string; routes_count?: number; last_run?: string | null; country?: string; logoUrl: string | null; commands: number; description: string };
type Catalog = { generatedAt: string; total: number; matched: number; passing: number; failing: number; blocked: number; routes: number; categories: [string, number][]; items: Item[]; installed: string[] };
type Route = { method?: string; url?: string; kind?: string };
type Detail = { found: boolean; slug: string; installed: { installedAt: string } | null; connector?: Record<string, any> & { routes?: Route[]; commands?: string[]; installSteps: string[]; githubUrl: string; logoUrl: string | null } };

const card: CSSProperties = { border: "1px solid var(--border)", borderRadius: 12, padding: 16, background: "var(--card)" };
const muted: CSSProperties = { color: "var(--muted-foreground)", fontSize: 12 };
const btn: CSSProperties = { border: "1px solid var(--border)", borderRadius: 8, padding: "6px 12px", background: "var(--primary)", color: "var(--primary-foreground)", cursor: "pointer", fontSize: 13 };
const btn2: CSSProperties = { ...btn, background: "transparent", color: "var(--foreground)" };
const input: CSSProperties = { border: "1px solid var(--border)", borderRadius: 8, padding: "6px 10px", background: "transparent", color: "inherit", fontSize: 13 };
const P = "prüfen";

function statusBadge(s?: string) {
  if (s === "passing") return <StatusBadge label="grün" status="ok" />;
  if (s === "failing") return <StatusBadge label="rot" status="error" />;
  if (s === "blocked") return <StatusBadge label="blocked" status="warning" />;
  if (s === "unknown") return <StatusBadge label="unbekannt" status="pending" />;
  return <StatusBadge label={P} status="pending" />;
}
function Logo({ url, size = 20 }: { url: string | null; size?: number }) {
  return url ? <img src={url} width={size} height={size} alt="" style={{ borderRadius: 4, objectFit: "contain" }} /> : <span style={{ display: "inline-block", width: size, height: size, borderRadius: 4, background: "var(--muted)" }} />;
}
const day = (s?: string | null) => (s ? s.slice(0, 16).replace("T", " ") : P);

function DetailView({ slug, onBack }: { slug: string; onBack: () => void }) {
  const { data, loading, error, refresh } = usePluginData<Detail>("connector", { slug });
  const install = usePluginAction("install");
  const uninstall = usePluginAction("uninstall");
  const toast = usePluginToast();
  const [steps, setSteps] = useState<string[] | null>(null);
  if (loading) return <Spinner />;
  if (error) return <div>Fehler: {error.message}</div>;
  if (!data?.found || !data.connector) return <div>Connector {slug} nicht gefunden. <button style={btn2} onClick={onBack}>Zurück</button></div>;
  const c = data.connector;
  const meta = (c.meta ?? {}) as Record<string, any>;
  return (
    <div style={{ display: "grid", gap: 16 }} data-testid="connector-detail">
      <div><button style={btn2} onClick={onBack} data-testid="back">← Alle Connectoren</button></div>
      <div style={{ ...card, display: "flex", gap: 16, alignItems: "center" }}>
        <Logo url={c.logoUrl} size={56} />
        <div style={{ flex: 1 }}>
          <h2 style={{ margin: 0, fontSize: 20 }}>{c.domain}</h2>
          <div style={muted}>{c.description}</div>
          <div style={{ display: "flex", gap: 8, marginTop: 6, alignItems: "center" }}>{statusBadge(c.status)}<span style={muted}>{c.category} · {c.country ?? P}</span></div>
        </div>
        {data.installed
          ? <button style={btn2} data-testid="uninstall" onClick={async () => { await uninstall({ slug }); toast({ title: `${c.domain} entfernt`, tone: "info" } as any); refresh(); }}>Installiert ✓ – entfernen</button>
          : <button style={btn} data-testid="install" onClick={async () => { const r = (await install({ slug })) as { steps: string[] }; setSteps(r.steps); toast({ title: `${c.domain} installiert`, tone: "success" } as any); refresh(); }}>Installieren</button>}
      </div>
      {(steps || data.installed) && (
        <div style={card} data-testid="install-steps">
          <strong>Installation{data.installed ? ` (seit ${day(data.installed.installedAt)})` : ""}</strong>
          <pre style={{ fontSize: 12, whiteSpace: "pre-wrap", margin: "8px 0 0" }}>{(steps ?? c.installSteps).join("\n")}</pre>
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12 }}>
        <MetricCard label="Routes" value={c.routes_count ?? P} />
        <MetricCard label="Commands" value={(c.commands ?? []).length || P} />
        <MetricCard label="Datensätze" value={c.records ?? P} />
        <MetricCard label="E2E" value={c.e2e_total ? `${c.e2e_passed}/${c.e2e_total}` : P} />
      </div>
      <div style={card}>
        <KeyValueList pairs={[
          { label: "Webseite", value: <a href={c.homepage ?? c.source_url} target="_blank" rel="noreferrer">{c.homepage ?? c.source_url ?? P}</a> },
          { label: "GitHub", value: <a href={c.githubUrl} target="_blank" rel="noreferrer">{c.githubUrl}</a> },
          { label: "Letzter Test", value: day(c.last_run) },
          { label: "Lizenz (Code)", value: c.license ?? meta.code_license ?? P },
          { label: "Datenlizenz", value: meta.data_license?.id ?? P },
          { label: "llms.txt", value: c.llms },
          { label: "Login nötig", value: meta.login_required == null ? P : String(meta.login_required) },
        ]} />
      </div>
      <div style={card}>
        <strong>Routes ({(c.routes ?? []).length})</strong>
        {(c.routes ?? []).length === 0 ? <div style={muted}>{P}</div> : (
          <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse", marginTop: 8 }} data-testid="routes">
            <thead><tr style={{ textAlign: "left" }}><th>Methode</th><th>URL</th><th>Art</th></tr></thead>
            <tbody>{(c.routes ?? []).map((r, i) => <tr key={i} style={{ borderTop: "1px solid var(--border)" }}><td><code>{r.method ?? P}</code></td><td style={{ wordBreak: "break-all" }}>{r.url ?? P}</td><td>{r.kind ?? P}</td></tr>)}</tbody>
          </table>)}
        {(c.commands ?? []).length > 0 && <div style={{ marginTop: 8 }}><strong>Commands:</strong> {(c.commands ?? []).map((x: string) => <code key={x} style={{ marginRight: 6 }}>{x}</code>)}</div>}
      </div>
      {meta.screenshot && <div style={card}><strong>Screenshot der Quelle</strong><img src={meta.screenshot} alt="" style={{ width: "100%", marginTop: 8, borderRadius: 8 }} /></div>}
      <div style={card}><strong>Rohdaten (index.json)</strong><JsonTree data={c} defaultExpandDepth={1} /></div>
    </div>
  );
}

export function MarketplacePage(_props: PluginPageProps) {
  const [q, setQ] = useState(""); const [dq, setDq] = useState("");
  const [category, setCategory] = useState(""); const [status, setStatus] = useState("");
  const [offset, setOffset] = useState(0); const [slug, setSlug] = useState<string | null>(null);
  useEffect(() => { const t = setTimeout(() => { setDq(q); setOffset(0); }, 250); return () => clearTimeout(t); }, [q]);
  const { data, loading, error } = usePluginData<Catalog>("catalog", { q: dq, category, status, offset, limit: 50 });
  if (slug) return <div style={{ padding: 24 }}><DetailView slug={slug} onBack={() => setSlug(null)} /></div>;
  return (
    <div style={{ padding: 24, display: "grid", gap: 16 }} data-testid="marketplace">
      <div>
        <h1 style={{ margin: 0, fontSize: 22 }}>🧩 Connector Marketplace</h1>
        <div style={muted}>Quelle: <a href="https://servas-ai.github.io/connector-marketplace/data/connectors.json" target="_blank" rel="noreferrer">Marketplace-Datensatz (Sync aus opencli-connectors main)</a>{data ? ` · Stand ${data.generatedAt}` : ""} · <a href="https://servas-ai.github.io/connector-marketplace/" target="_blank" rel="noreferrer">Web-Marketplace</a></div>
      </div>
      {data && <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 12 }}>
        <MetricCard label="Connectoren" value={data.total} /><MetricCard label="grün" value={data.passing} />
        <MetricCard label="blocked" value={data.blocked} /><MetricCard label="rot" value={data.failing} />
        <MetricCard label="Installiert" value={data.installed.length} />
      </div>}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input style={{ ...input, flex: 1, minWidth: 220 }} placeholder="Suche nach Domain, Kategorie, Command …" value={q} onChange={(e) => setQ(e.target.value)} data-testid="search" />
        <select style={input} value={category} onChange={(e) => { setCategory(e.target.value); setOffset(0); }} data-testid="category">
          <option value="">Alle Kategorien</option>
          {(data?.categories ?? []).map(([k, n]) => <option key={k} value={k}>{k} ({n})</option>)}
        </select>
        <select style={input} value={status} onChange={(e) => { setStatus(e.target.value); setOffset(0); }}>
          <option value="">Alle Status</option><option value="passing">grün</option><option value="blocked">blocked</option><option value="failing">rot</option>
        </select>
      </div>
      {error && <div>Fehler: {error.message}</div>}
      {loading && !data ? <Spinner /> : data && (
        <div style={card}>
          <div style={muted}>{data.matched} Treffer · zeige {data.matched ? offset + 1 : 0}–{Math.min(offset + 50, data.matched)}</div>
          <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse", marginTop: 8 }} data-testid="list">
            <thead><tr style={{ textAlign: "left", ...muted }}><th></th><th>Name</th><th>Kategorie</th><th>Routes</th><th>Commands</th><th>Status</th><th>Letzter Test</th><th></th></tr></thead>
            <tbody>{data.items.map((it) => (
              <tr key={it.slug} style={{ borderTop: "1px solid var(--border)", cursor: "pointer" }} onClick={() => setSlug(it.slug)} data-testid={`row-${it.slug}`}>
                <td style={{ padding: "6px 4px" }}><Logo url={it.logoUrl} /></td>
                <td><strong>{it.domain}</strong><div style={{ ...muted, maxWidth: 420, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.description}</div></td>
                <td>{it.category ?? P}</td><td>{it.routes_count || P}</td><td>{it.commands || P}</td><td>{statusBadge(it.status)}</td><td style={muted}>{day(it.last_run)}</td>
                <td>{data.installed.includes(it.slug) ? "✓" : ""}</td>
              </tr>))}</tbody>
          </table>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button style={btn2} disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - 50))}>← Zurück</button>
            <button style={btn2} disabled={offset + 50 >= data.matched} onClick={() => setOffset(offset + 50)} data-testid="next">Weiter →</button>
          </div>
        </div>)}
    </div>
  );
}

export function SidebarLink(_props: PluginSidebarProps) {
  const nav = useHostNavigation();
  return <a {...nav.linkProps("/connectors")} className="flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium text-foreground/80 hover:bg-accent/50">🧩 Connectors</a>;
}

export function DashboardWidget(_props: PluginWidgetProps) {
  const { data, loading, error } = usePluginData<{ total: number; passing: number; generatedAt: string; installed: number }>("health");
  const nav = useHostNavigation();
  if (loading) return <Spinner />;
  if (error) return <div>Marketplace-Fehler: {error.message}</div>;
  return (
    <div style={{ display: "grid", gap: 6 }}>
      <strong>🧩 Connector Marketplace</strong>
      <div>{data?.total} Connectoren · {data?.passing} grün · {data?.installed} installiert</div>
      <div style={muted}>Index-Stand {data?.generatedAt}</div>
      <a {...nav.linkProps("/connectors")}>Marketplace öffnen →</a>
    </div>
  );
}
