// @ts-check
/**
 * Shared unit-test fixtures: a build env like build.mjs makes (real content, offline images), without writing dist.
 */
import { loadAll } from '../../src/lib/data.mjs';
import { initImages } from '../../src/lib/images.mjs';

/**
 * @param {{ launch?: boolean, modules?: Record<string, { src: string, deps: string[] }> }} [o]
 * @returns {import('../../src/components/layout.mjs').Env}
 */
export function testEnv(o = {}) {
  const data = loadAll();
  initImages(data.images, { offline: true });
  return {
    launch: !!o.launch, context: 'test', origin: o.launch ? 'https://example.test' : '', data,
    assets: { css: '/assets/build/site.test.css', js: '/assets/build/main.test.js', ...(o.modules ? { modules: o.modules } : {}) },
    hasCapability: false, analyticsDomain: null,
  };
}
