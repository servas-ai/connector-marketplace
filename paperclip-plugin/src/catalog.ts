// Reine Daten-Logik (ohne Host) – testbar mit echter index.json.
// Öffentliche Quelle: Marketplace-Datensatz (Auto-Sync aus opencli-connectors main/index.json).
// opencli-connectors ist privat → raw index.json ist ohne Token nicht abrufbar.
export const INDEX_URL = "https://servas-ai.github.io/connector-marketplace/data/connectors.json";
export const SITE = "https://servas-ai.github.io/connector-marketplace/";
export const REPO = "https://github.com/servas-ai/opencli-connectors";
export const PRUEFEN = "prüfen";

export type Route = { method?: string; url?: string; kind?: string };
export type Connector = {
  repo: string; slug: string; domain: string; description?: string; category?: string; status?: string;
  records?: number; routes_count?: number; routes?: Route[]; commands?: string[]; source_url?: string; homepage?: string;
  last_run?: string | null; e2e_passed?: number; e2e_total?: number; logo?: string; path?: string; embedded?: boolean;
  license?: string; llms_txt?: string | null; llms_checked?: boolean; ampel?: string; country?: string; meta?: Record<string, unknown>;
};
export type Index = { generated_at: string; total: number; passing: number; failing: number; blocked: number; routes: number; connectors: Connector[] };

export type ListItem = Pick<Connector, "slug" | "domain" | "category" | "status" | "routes_count" | "last_run" | "country"> & { logoUrl: string | null; commands: number; description: string };

export function logoUrl(c: Connector): string | null {
  if (!c.logo) return null;
  return `${SITE}logos/${c.logo.split("/").pop()}`;
}

/** Akzeptiert index.json (opencli-connectors) und data/connectors.json (Marketplace). */
export function normalize(raw: any): Index {
  if (raw && Array.isArray(raw.connectors) && raw.connectors[0] && "slug" in raw.connectors[0]) return raw as Index;
  const cs: Connector[] = (raw?.connectors ?? []).map((m: any) => ({
    repo: typeof m.repo === "string" ? m.repo.replace(/^https:\/\/github\.com\/servas-ai\//, "") : m.id,
    slug: m.id, domain: m.domain ?? m.id, description: m.description, category: m.category, status: m.status,
    records: m.records, routes_count: Array.isArray(m.urls) ? m.urls.length : undefined,
    routes: (m.urls ?? []).map((u: string) => ({ url: u, kind: m.interfaces?.access })),
    commands: m.commands ?? [], source_url: m.source ?? m.endpoint, homepage: m.endpoint,
    last_run: m.lastRun ?? null, e2e_passed: m.e2ePassed, e2e_total: m.e2eTotal, logo: m.logo ?? undefined,
    path: m.path ?? undefined, country: m.country,
    meta: { login_required: m.loginRequired, robots: m.robots, ampel: m.ampel?.level, sourceType: m.sourceType, screenshot: m.screenshot ? `${SITE}${m.screenshot}` : null, kpi: m.kpi, server: m.server },
  }));
  const n = (s: string) => cs.filter((c) => c.status === s).length;
  return { generated_at: raw?.sourceGeneratedAt ?? raw?.generatedAt, total: cs.length, passing: n("passing"), failing: n("failing"), blocked: n("blocked"),
    routes: cs.reduce((a, c) => a + (c.routes_count ?? 0), 0), connectors: cs };
}
export function githubUrl(c: Connector): string {
  return c.path ? `${REPO}/tree/main/${c.path}` : `https://github.com/servas-ai/${c.repo}`;
}
export function installSteps(c: Connector): string[] {
  if (c.path) return [
    `git clone --depth 1 --filter=blob:none --sparse ${REPO}.git`,
    `cd opencli-connectors && git sparse-checkout set ${c.path} lib scripts`,
    `cd ${c.path} && npm install --omit=dev && npm run e2e`,
  ];
  return [`git clone --depth 1 https://github.com/servas-ai/${c.repo}.git`, `cd ${c.repo} && npm install`];
}

export function search(idx: Index, p: { q?: string; category?: string; status?: string; offset?: number; limit?: number }) {
  const q = (p.q ?? "").trim().toLowerCase();
  let list = idx.connectors.filter((c) =>
    (!p.category || c.category === p.category) && (!p.status || c.status === p.status) &&
    (!q || [c.domain ?? "", c.slug, c.description, c.category, ...(c.commands ?? [])].some((v) => (v ?? "").toLowerCase().includes(q))));
  list = list.sort((a, b) => (a.category ?? "").localeCompare(b.category ?? "") || (a.domain ?? a.slug ?? "").localeCompare(b.domain ?? b.slug ?? ""));
  const offset = Math.max(0, p.offset ?? 0), limit = Math.min(200, p.limit ?? 50);
  const cats: Record<string, number> = {};
  for (const c of idx.connectors) cats[c.category ?? "sonstige"] = (cats[c.category ?? "sonstige"] ?? 0) + 1;
  return {
    generatedAt: idx.generated_at, total: idx.connectors.length, matched: list.length,
    passing: idx.passing, failing: idx.failing, blocked: idx.blocked, routes: idx.routes,
    categories: Object.entries(cats).sort((a, b) => b[1] - a[1]),
    items: list.slice(offset, offset + limit).map<ListItem>((c) => ({
      slug: c.slug, domain: c.domain, category: c.category, status: c.status, routes_count: c.routes_count,
      last_run: c.last_run, country: c.country, logoUrl: logoUrl(c), commands: (c.commands ?? []).length, description: c.description ?? "",
    })),
  };
}

export function detail(idx: Index, slug: string) {
  const c = idx.connectors.find((x) => x.slug === slug);
  if (!c) return null;
  return {
    ...c, logoUrl: logoUrl(c), githubUrl: githubUrl(c), installSteps: installSteps(c),
    llms: c.llms_checked === undefined ? PRUEFEN : c.llms_checked ? (c.llms_txt ?? "nein") : PRUEFEN,
    license: c.license ?? PRUEFEN, last_run: c.last_run ?? PRUEFEN,
  };
}
