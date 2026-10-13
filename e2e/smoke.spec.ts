import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import data from '../src/data/connectors.json' with { type: 'json' };

const pages = [['grid', '#/'], ['detail', `#/c/${data.connectors[0].id}`], ['dashboard', '#/dashboard'], ['compare', `#/compare?ids=${data.connectors.slice(0, 3).map((c) => c.id).join(',')}`]] as const;

for (const [name, hash] of pages) {
  test(`smoke + axe: ${name}`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto(hash);
    await expect(page.getByText('Connector Marketplace')).toBeVisible();
    await page.waitForTimeout(500);
    const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).disableRules(['color-contrast']).analyze();
    expect(axe.violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
    expect(errors.filter((e) => !/favicon|Failed to load resource/.test(e))).toEqual([]);
  });
}

test('Detail-Tabs klicken', async ({ page }) => {
  await page.goto(`#/c/${data.connectors[0].id}`);
  for (const t of ['KPIs', 'Server & Technik', 'Schnittstellen', 'Qualität/Gates']) { await page.getByRole('tab', { name: t }).click(); await expect(page.getByRole('tabpanel')).toBeVisible(); }
});

test('Ampel in Karten, Detail und Dashboard', async ({ page }) => {
  await page.goto('#/');
  await expect(page.getByTestId('ampel').first()).toBeVisible();
  await page.goto(`#/c/${data.connectors[0].id}`);
  await page.getByRole('tab', { name: 'Ampel & Signale' }).click();
  await expect(page.getByTestId('signals-panel')).toBeVisible();
  await page.goto('#/dashboard');
  await expect(page.getByTestId('ampel-stat')).toHaveCount(12);
});
