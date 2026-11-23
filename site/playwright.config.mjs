// @ts-check
/**
 * Playwright over the built site (CONTRACT §14): SITE_DIST is served by tools/serve.mjs on PORT, which applies
 * _redirects, _headers and the netlify.toml headers, so every test runs under the real CSP. A running server is
 * never reused (another agent's build could be on that port).
 */
import { defineConfig } from 'playwright/test';
const PORT = Number(process.env.PORT || 4321);
export default defineConfig({
  testDir: 'tests',
  testMatch: /.*\.spec\.mjs/,
  timeout: 30000,
  workers: 2,
  reporter: [['list']],
  forbidOnly: !!process.env.CI,
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
