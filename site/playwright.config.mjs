// @ts-check
import { defineConfig } from 'playwright/test';
export default defineConfig({
  testDir: 'tests',
  testMatch: /.*\.spec\.mjs/,
  timeout: 30000,
  workers: 2,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4321',
    launchOptions: process.env.CHROME ? { executablePath: process.env.CHROME } : {},
  },
  webServer: { command: 'node tools/serve.mjs 4321', url: 'http://localhost:4321/', reuseExistingServer: true },
});
