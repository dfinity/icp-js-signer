import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 15000,
  use: {
    browserName: 'chromium',
    headless: true,
  },
  webServer: {
    command: 'node e2e/serve.mjs',
    port: 3456,
    reuseExistingServer: true,
  },
});
