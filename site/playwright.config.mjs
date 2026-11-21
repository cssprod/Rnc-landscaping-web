// @ts-check
import { defineConfig } from 'playwright/test';
const PORT = Number(process.env.PORT || 4321);
export default defineConfig({
  testDir: 'tests',
  testMatch: /.*\.spec\.mjs/,
  timeout: 30000,
  workers: 2,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    launchOptions: process.env.CHROME ? { executablePath: process.env.CHROME } : {},
  },
  webServer: {
    command: 'node tools/serve.mjs',
    env: { PORT: String(PORT), ...(process.env.SITE_DIST ? { SITE_DIST: process.env.SITE_DIST } : {}) },
    url: `http://localhost:${PORT}/`,
    reuseExistingServer: false,
  },
});
