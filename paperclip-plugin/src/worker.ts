import { definePlugin, runWorker, type PluginContext } from "@paperclipai/plugin-sdk";
import { INDEX_URL, detail, installSteps, normalize, search, type Index } from "./catalog.js";

const TTL_MS = 10 * 60 * 1000;
let cache: { at: number; idx: Index } | null = null;

async function loadIndex(ctx: PluginContext, force = false): Promise<Index> {
  if (!force && cache && Date.now() - cache.at < TTL_MS) return cache.idx;
  const res = await ctx.http.fetch(INDEX_URL, { method: "GET" });
  if (!res.ok) throw new Error(`Katalog HTTP ${res.status} (${INDEX_URL})`);
  const idx = normalize(await res.json());
  cache = { at: Date.now(), idx };
  ctx.logger.info("index.json geladen", { total: idx.connectors.length, generated_at: idx.generated_at });
  return idx;
}

type Installed = Record<string, { installedAt: string; path?: string; repo: string }>;
const KEY = { scopeKind: "instance" as const, stateKey: "installed-connectors" };

const plugin = definePlugin({
  async setup(ctx) {
    ctx.data.register("catalog", async (params) => {
      const p = (params ?? {}) as Record<string, unknown>;
      const r = search(await loadIndex(ctx), {
        q: typeof p.q === "string" ? p.q : undefined,
        category: typeof p.category === "string" && p.category ? p.category : undefined,
        status: typeof p.status === "string" && p.status ? p.status : undefined,
        offset: Number(p.offset ?? 0), limit: Number(p.limit ?? 50),
      });
      const installed = ((await ctx.state.get(KEY)) as Installed | null) ?? {};
      return { ...r, installed: Object.keys(installed) };
    });
    ctx.data.register("connector", async (params) => {
      const slug = String((params as Record<string, unknown> | undefined)?.slug ?? "");
      const d = detail(await loadIndex(ctx), slug);
      if (!d) return { found: false, slug };
      const installed = ((await ctx.state.get(KEY)) as Installed | null) ?? {};
      return { found: true, connector: d, installed: installed[slug] ?? null };
    });
    ctx.actions.register("install", async (params) => {
      const slug = String((params as Record<string, unknown> | undefined)?.slug ?? "");
      const c = (await loadIndex(ctx)).connectors.find((x) => x.slug === slug);
      if (!c) throw new Error(`Connector ${slug} nicht im Index`);
      const installed = ((await ctx.state.get(KEY)) as Installed | null) ?? {};
      installed[slug] = { installedAt: new Date().toISOString(), path: c.path, repo: c.repo };
      await ctx.state.set(KEY, installed);
      return { ok: true, slug, steps: installSteps(c), installed: Object.keys(installed).length };
    });
    ctx.actions.register("uninstall", async (params) => {
      const slug = String((params as Record<string, unknown> | undefined)?.slug ?? "");
      const installed = ((await ctx.state.get(KEY)) as Installed | null) ?? {};
      delete installed[slug];
      await ctx.state.set(KEY, installed);
      return { ok: true, slug };
    });
    ctx.actions.register("refresh", async () => {
      const idx = await loadIndex(ctx, true);
      return { ok: true, total: idx.connectors.length, generated_at: idx.generated_at };
    });
    ctx.data.register("health", async () => {
      const idx = await loadIndex(ctx);
      const installed = ((await ctx.state.get(KEY)) as Installed | null) ?? {};
      return { total: idx.connectors.length, passing: idx.passing, generatedAt: idx.generated_at, installed: Object.keys(installed).length };
    });
  },
  async onHealth() {
    return { status: "ok", message: cache ? `Index geladen (${cache.idx.connectors.length})` : "Index noch nicht geladen" };
  },
});

export default plugin;
runWorker(plugin, import.meta.url);
