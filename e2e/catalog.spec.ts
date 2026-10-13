import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Uses the built catalog; blocks external requests (no live probes or account use).
for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
  test.describe(`catalog ${viewport.width}px`, () => {
    test.use({ viewport });
    test.beforeEach(async ({ page, baseURL }) => {
      const origin = new URL(baseURL!).origin;
      await page.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
      await page.goto('/');
      await expect(page.getByRole('heading', { name: 'Connectoren entdecken' })).toBeVisible();
    });
    test('bounded rendering, empty search and reset', async ({ page }) => {
      expect(await page.getByTestId('connector-card').count()).toBeLessThanOrEqual(24);
      await page.getByLabel('Suche', { exact: true }).fill('zzzz-worker-306-no-match');
      await expect(page.getByText('Keine Connectoren für diese Filter.')).toBeVisible();
      await page.getByRole('button', { name: 'Filter zurücksetzen' }).click();
      await expect(page.getByTestId('connector-card').first()).toBeVisible();
    });
    test('fourteen facets plus sort; keyboard opens advanced section', async ({ page }) => {
      const disclosure = page.locator('summary').filter({ hasText: 'Weitere Filter' });
      await disclosure.focus(); await page.keyboard.press('Enter');
      await expect(page.getByLabel('API verfügbar', { exact: true })).toBeVisible();
      await expect(page.getByRole('region', { name: 'Katalogfilter' }).getByRole('combobox')).toHaveCount(15);
    });
    test('four selections, fifth blocked, reload and remove', async ({ page }) => {
      const boxes = page.getByRole('checkbox');
      const first = (await boxes.first().getAttribute('aria-label'))!.replace(/ vergleichen$/, '');
      for (let n = 0; n < 4; n++) await boxes.nth(n).check();
      await expect(boxes.nth(4)).toBeDisabled();
      await expect(page.getByText('Limit erreicht:', { exact: false })).toBeVisible();
      await page.getByTestId('compare-link').click(); await page.reload();
      await expect(page.getByRole('heading', { name: 'Vergleich (4/4)' })).toBeVisible();
      await expect(page.getByTestId('compare-table').locator('thead th')).toHaveCount(5);
      await page.getByRole('button', { name: `${first} entfernen`, exact: true }).click();
      await expect(page.getByRole('heading', { name: 'Vergleich (3/4)' })).toBeFocused();
      await expect(page.getByLabel('Connector hinzufügen')).toBeVisible();
    });
    test('selection survives filtering, comparison and return link', async ({ page }) => {
      await page.getByRole('checkbox').first().check();
      await page.getByLabel('Suche', { exact: true }).fill('zzzz-worker-306-no-match');
      await page.getByTestId('compare-link').click();
      await page.getByRole('link', { name: '← Zurück zu den Ergebnissen' }).click();
      await expect(page.getByLabel('Suche', { exact: true })).toHaveValue('zzzz-worker-306-no-match');
      await expect(page.getByTestId('compare-link')).toHaveText('1 vergleichen →');
      await page.getByRole('button', { name: 'Filter zurücksetzen' }).click();
      await expect(page.getByRole('checkbox', { checked: true })).toHaveCount(1);
    });
    test('pagination, history and focus', async ({ page }) => {
      await page.getByRole('button', { name: 'Nächste Seite' }).click();
      await expect(page.getByTestId('result-count')).toBeFocused();
      await expect(page).toHaveURL(/page=2/);
      await page.goBack(); await expect(page.getByRole('button', { name: 'Vorherige Seite' })).toBeDisabled();
      await page.goForward(); await expect(page).toHaveURL(/page=2/);
      await page.getByLabel('Suche', { exact: true }).fill('zzzz-worker-306-no-match');
      expect(new URL(page.url()).searchParams.has('page')).toBe(false);
    });
    test('comparison sanitizes duplicate, missing and excess IDs', async ({ page }) => {
      const ids = (await page.getByRole('checkbox').evaluateAll(nodes => nodes.slice(0, 5).map(n => n.getAttribute('aria-label')!.replace(/ vergleichen$/, ''))));
      const params = new URLSearchParams({ ids: ['missing-worker-306', ids[0], ...ids].join(',') });
      await page.goto(`/compare?${params}`);
      await expect(page.getByRole('heading', { name: 'Vergleich (4/4)' })).toBeVisible();
      await expect(page.getByText(/Ungültige, doppelte oder überzählige/)).toBeVisible();
      await expect(page.getByTestId('compare-table').locator('thead th')).toHaveCount(5);
    });
    test('unknown tri-state filter survives reload', async ({ page }) => {
      await page.getByLabel('Login', { exact: true }).selectOption('unknown');
      const before = await page.getByTestId('result-count').textContent();
      await page.reload();
      await expect(page.getByLabel('Login', { exact: true })).toHaveValue('unknown');
      await expect(page.getByTestId('result-count')).toHaveText(before!);
    });
    test('axe including color contrast and desktop/mobile evidence', async ({ page }, testInfo) => {
      await page.locator('summary').filter({ hasText: 'Weitere Filter' }).click();
      const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
      await page.screenshot({ path: testInfo.outputPath(`catalog-${viewport.width}.png`), fullPage: true });
      await testInfo.attach('axe-catalog', { body: JSON.stringify(results, null, 2), contentType: 'application/json' });
      expect(results.violations).toEqual([]);
      for (let n = 0; n < 4; n++) await page.getByRole('checkbox').nth(n).check();
      await page.getByTestId('compare-link').click();
      await expect(page.getByRole('heading', { name: 'Vergleich (4/4)' })).toBeVisible();
      await page.screenshot({ path: testInfo.outputPath(`compare-${viewport.width}.png`), fullPage: true });
      const comparison = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
      await testInfo.attach('axe-compare', { body: JSON.stringify(comparison, null, 2), contentType: 'application/json' });
      expect(comparison.violations).toEqual([]);
    });
  });
}
