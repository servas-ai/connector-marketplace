import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: 'e2e', timeout: 90000, workers: 4, reporter: [['list']],
  use: { baseURL: 'http://127.0.0.1:4179/', viewport: { width: 1440, height: 1000 } },
  webServer: { command: 'node scripts/static-gzip.mjs dist 4179', url: 'http://127.0.0.1:4179/', reuseExistingServer: true, timeout: 60000 },
});
