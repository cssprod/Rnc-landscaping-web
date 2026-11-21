// @ts-check
/** Living art (owner: living from W2). W1 holds the no-JS baseline only. */
import { test, expect } from 'playwright/test';

test('without JavaScript nothing is alive: no data-alive, no js class', async ({ browser }) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, (r) => r.abort());
  await page.goto('/');
  await expect(page.locator('html')).not.toHaveAttribute('data-alive', /.*/);
  await expect(page.locator('html')).not.toHaveClass(/\bjs\b/);
  await ctx.close();
});
