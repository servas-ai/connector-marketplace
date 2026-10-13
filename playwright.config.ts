import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: 'e2e', timeout: 90000, workers: 4, reporter: [['list']],
  expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.02 } }, snapshotPathTemplate: 'e2e/__screenshots__/{arg}{ext}',
  use: { baseURL: 'http://127.0.0.1:4189/', viewport: { width: 1440, height: 1000 } },
  webServer: { command: 'node scripts/static-gzip.mjs dist 4189', url: 'http://127.0.0.1:4189/', reuseExistingServer: true, timeout: 60000 },
});
