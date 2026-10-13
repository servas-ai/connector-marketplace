import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { createTestHarness } from "@paperclipai/plugin-sdk/testing";
import manifest from "../src/manifest.js";
import plugin from "../src/worker.js";
import { search, detail, normalize, INDEX_URL, type Index } from "../src/catalog.js";

// Echte Daten: INDEX_JSON=/pfad/index.json|connectors.json, sonst Live-Download des öffentlichen Marketplace-Datensatzes.
async function realIndex(): Promise<Index> {
  const p = process.env.INDEX_JSON;
  if (p && existsSync(p)) return normalize(JSON.parse(readFileSync(p, "utf8")));
  const r = await fetch(INDEX_URL);
  return normalize(await r.json());
}

describe("connector marketplace plugin", () => {
  it("declares page + sidebar + http capabilities", () => {
    for (const cap of ["http.outbound", "ui.page.register", "plugin.state.write"]) expect(manifest.capabilities).toContain(cap);
    expect(manifest.ui?.slots?.some((s: { type: string }) => s.type === "page")).toBe(true);
  });

  it("search + detail on real index.json", async () => {
    const idx = await realIndex();
    const all = search(idx, {});
    expect(all.total).toBe(idx.connectors.length);
    expect(all.items.length).toBe(50);
    const one = idx.connectors.find((c) => (c.routes ?? []).length > 0)!;
    const hit = search(idx, { q: one.domain });
    expect(hit.items.some((i) => i.slug === one.slug)).toBe(true);
    const d = detail(idx, one.slug)!;
    expect(d.routes!.length).toBeGreaterThan(0);
    expect(d.githubUrl).toMatch(/^https:\/\/github\.com\/servas-ai\//);
  }, 60000);

  it("worker: catalog, connector, install/uninstall via harness", async () => {
    const idx = await realIndex();
    const harness = createTestHarness({ manifest });
    (harness.ctx.http as any).fetch = async () => new Response(JSON.stringify(idx), { status: 200 });
    await plugin.definition.setup(harness.ctx);
    const cat = await harness.getData<any>("catalog", { q: "", limit: 5 });
    expect(cat.items.length).toBe(5);
    const slug = cat.items[0].slug;
    const r = await harness.performAction<any>("install", { slug });
    expect(r.ok).toBe(true);
    expect((await harness.getData<any>("connector", { slug })).installed).not.toBeNull();
    await harness.performAction("uninstall", { slug });
    expect((await harness.getData<any>("connector", { slug })).installed).toBeNull();
  }, 60000);
});
