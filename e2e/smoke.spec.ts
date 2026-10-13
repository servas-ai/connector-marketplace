import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import data from '../src/data/connectors.json' with { type: 'json' };
import extras from '../src/data/extras.json' with { type: 'json' };

const X = extras.connectors as Record<string, { shot?: string }>;
export const DETAIL = process.env.DETAIL_ID || data.connectors.find((c) => X[c.id]?.shot && c.logo && c.ampel?.level === 'green')!.id;
const NOSHOT = data.connectors.find((c) => !X[c.id]?.shot)!.id;
const pages = [['start', '#/'], ['detail', `#/c/${DETAIL}`], ['dashboard', '#/dashboard'], ['compare', `#/compare?ids=${data.connectors.slice(0, 3).map((c) => c.id).join(',')}`], ['agent', '#/agent']] as const;

async function brokenImages(page: Page) {
  return page.evaluate(async () => {
    const imgs = [...document.querySelectorAll('img')].filter((i) => i.loading !== 'lazy' || i.complete);
    await Promise.all(imgs.map((i) => (i.complete ? null : new Promise((r) => { i.onload = i.onerror = r; }))));
    return imgs.filter((i) => i.complete && i.naturalWidth === 0 && i.loading !== 'lazy').map((i) => i.src);
  });
}

for (const theme of ['light', 'dark'] as const) for (const [name, hash] of pages) {
  test(`smoke + axe + Bilder: ${name} (${theme})`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    await page.addInitScript((t) => localStorage.setItem('theme', t), theme);
    await page.goto(hash);
    await expect(page.getByRole('link', { name: 'Connectors', exact: true })).toBeVisible();
    await page.waitForLoadState('networkidle');
    const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(r.violations.map((v) => `${v.id}: ${v.nodes.length} ${v.nodes[0]?.target}`)).toEqual([]);
    expect(await brokenImages(page)).toEqual([]);
    expect(errors.filter((e) => !/favicon/.test(e))).toEqual([]);
  });
}

test('Start: keine fehlenden Logos auf den ersten Karten, KPI = count', async ({ page }) => {
  await page.goto('#/');
  await expect(page.getByTestId('kpi-total')).toContainText(String(data.count));
  const cards = page.getByTestId('connector-card');
  await expect(cards).toHaveCount(50);
  for (const img of await page.getByTestId('logo').all()) { await img.scrollIntoViewIfNeeded(); expect(await img.evaluate((i: HTMLImageElement) => i.naturalWidth)).toBeGreaterThan(0); }
});

test('Detail: alle Tabs, echter Screenshot, Beispieldaten, Agent-Prompt', async ({ page }) => {
  await page.goto(`#/c/${DETAIL}`);
  for (const t of ['Übersicht', 'Routes', 'Screenshots', 'Installieren', 'Dev', 'Tests & Verlauf', 'Compliance & Lizenz', 'Alle Felder']) {
    await page.getByRole('tab', { name: t }).click(); await expect(page.getByRole('tabpanel')).toBeVisible();
    if (t === 'Screenshots') { const img = page.getByTestId('screenshot'); await expect(img).toBeVisible(); expect(await img.evaluate((i: HTMLImageElement) => i.naturalWidth)).toBe(1280); }
    if (t === 'Installieren') await expect(page.getByTestId('agent-prompt')).toContainText('servas.record.v1');
    if (t === 'Compliance & Lizenz') await expect(page.getByTestId('compliance')).toContainText('Keine Rechtsberatung');
    if (t === 'Alle Felder') await expect(page.getByTestId('all-fields').first()).toBeVisible();
  }
});

test('Detail ohne Screenshot: Tab ausgeblendet', async ({ page }) => {
  await page.goto(`#/c/${NOSHOT}`);
  await expect(page.getByRole('tab', { name: 'Routes' })).toBeVisible();
  await page.waitForLoadState('networkidle');
  await expect(page.getByRole('tab', { name: 'Screenshots' })).toHaveCount(0);
});

test('llms.txt und Agent-Prompt ausgeliefert', async ({ request }) => {
  for (const f of ['llms.txt', 'llms-full.txt', 'agent-prompt.txt']) { const r = await request.get(f); expect(r.status()).toBe(200); expect(await r.text()).toContain('servas'); }
});

// Screenshot-Regression (Baseline in e2e/smoke.spec.ts-snapshots, Toleranz 2 %)
for (const theme of ['light', 'dark'] as const) for (const [name, hash] of [['start', '#/'], ['detail', `#/c/${DETAIL}`]] as const) {
  test(`visuell: ${name} ${theme}`, async ({ page }) => {
    await page.addInitScript((t) => localStorage.setItem('theme', t), theme);
    await page.goto(hash); await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot(`${name}-${theme}.png`, { maxDiffPixelRatio: 0.02, mask: [page.locator('time'), page.locator('[data-testid=kpi-total] ~ *')], animations: 'disabled' });
  });
}
