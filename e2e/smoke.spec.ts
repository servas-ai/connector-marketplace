import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import data from '../src/data/connectors.json' with { type: 'json' };

const first = data.connectors[0].id;
const pages = [['heute', '#/'], ['alle', '#/alle'], ['app-detail', `#/c/${first}`], ['technik', `#/c/${first}/technik`], ['dashboard', '#/dashboard'], ['compare', `#/compare?ids=${data.connectors.slice(0, 3).map((c) => c.id).join(',')}`]] as const;
// Neue App-Store-Seiten werden inkl. Farbkontrast geprüft, hell und dunkel.
const strict = new Set(['heute', 'app-detail']);

for (const theme of ['light', 'dark'] as const) for (const [name, hash] of pages) {
  test(`smoke + axe: ${name} (${theme})`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    await page.addInitScript((t) => localStorage.setItem('theme', t), theme);
    await page.goto(hash);
    await expect(page.getByRole('link', { name: 'Connectors', exact: true })).toBeVisible();
    await page.waitForTimeout(500);
    // /alle rendert 1000+ Karten — axe überschreitet 90s/OOM; Smoke + keine Page-Errors reicht.
    if (name === 'alle') {
      await expect(page.getByTestId('connector-card').first()).toBeVisible();
      expect(errors.filter((e) => !/favicon|Failed to load resource/.test(e))).toEqual([]);
      return;
    }
    let axe = new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']);
    if (!strict.has(name)) axe = axe.disableRules(['color-contrast']);
    const r = await axe.analyze();
    expect(r.violations.map((v) => `${v.id}: ${v.nodes.length} ${v.nodes[0]?.target}`)).toEqual([]);
    expect(errors.filter((e) => !/favicon|Failed to load resource/.test(e))).toEqual([]);
  });
}

test('Heute: Suche, Kategorie-Tab, Detail, Installieren', async ({ page }) => {
  await page.goto('#/');
  await expect(page.getByTestId('feature-card').first()).toBeVisible();
  const tabs = page.getByRole('navigation', { name: 'Kategorien' }).getByRole('button');
  await tabs.nth(1).click(); await expect(tabs.nth(1)).toHaveAttribute('aria-pressed', 'true');
  await page.getByTestId('connector-card').first().getByRole('link').first().click();
  await expect(page.getByTestId('ampel-badge')).toBeVisible();
  await page.getByRole('button', { name: 'Installieren' }).click();
  for (const t of ['MCP', 'CLI', 'HTTP']) { await page.getByRole('tab', { name: t }).click(); await expect(page.getByTestId('snippet')).not.toBeEmpty(); }
  await page.goto('#/'); await page.getByLabel('Suche').fill(first); await expect(page.getByTestId('connector-card').first()).toBeVisible();
});

test('Technik-Tabs klicken', async ({ page }) => {
  await page.goto(`#/c/${first}/technik`);
  for (const t of ['KPIs', 'Server & Technik', 'Schnittstellen', 'Qualität/Gates']) { await page.getByRole('tab', { name: t }).click(); await expect(page.getByRole('tabpanel')).toBeVisible(); }
});

test('Ampel in Karten, Technik und Dashboard', async ({ page }) => {
  await page.goto('#/alle');
  await expect(page.getByTestId('ampel').first()).toBeVisible();
  await page.goto(`#/c/${first}/technik`);
  await page.getByRole('tab', { name: 'Ampel & Signale' }).click();
  await expect(page.getByTestId('signals-panel')).toBeVisible();
  await page.goto('#/dashboard');
  await expect(page.getByTestId('ampel-stat')).toHaveCount(12);
});
