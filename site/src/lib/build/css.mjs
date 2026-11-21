// @ts-check
/**
 * CSS bundle (CONTRACT §12): brand/tokens.css (compiled from tokens.json) unlayered first, then every
 * site/src/styles/*.css in file-name order. 00-layers.css declares the layer order; every other file wraps its rules
 * in exactly one layer, so adding a file never needs a registry edit.
 *
 *   bundleCss({ tokens, stylesDir, minify }) → { css, files: string[] }
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { minifyCss } from './minify-css.mjs';

/** @param {string} stylesDir */
export function styleFiles(stylesDir) {
  // Plain code-point order ("21" < "21x" < "22"), never locale order, so the cascade is the same on every machine.
  return readdirSync(stylesDir).filter((f) => f.endsWith('.css')).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

/**
 * @param {{ tokens: string, stylesDir: string, minify?: boolean }} o
 */
export function bundleCss(o) {
  const files = styleFiles(o.stylesDir);
  if (files[0] !== '00-layers.css') throw new Error(`styles: 00-layers.css must exist and sort first (found ${files[0] || 'nothing'})`);
  const parts = [`/* brand/tokens.css (unlayered) */\n${o.tokens}`, ...files.map((f) => `/* ${f} */\n${readFileSync(join(o.stylesDir, f), 'utf8')}`)];
  const raw = parts.join('\n');
  return { css: o.minify === false ? raw : minifyCss(raw), files };
}
