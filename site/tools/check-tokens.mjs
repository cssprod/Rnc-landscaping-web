#!/usr/bin/env node
// @ts-check
/** brand/tokens.css must match brand/tokens.json (the build compiles the JSON; the CSS file is the readable copy). */
import { readFileSync } from 'node:fs';
import { generate, readTokens } from '../../brand/build-tokens.mjs';
import { report } from './lib.mjs';

/** tokens-compiled: brand/tokens.css is exactly what build-tokens.mjs generates from brand/tokens.json. */
export const RULES = ['tokens-compiled'];
const css = readFileSync(new URL('../../brand/tokens.css', import.meta.url), 'utf8');
const ok = report('check-tokens', css === generate(readTokens()) ? [] : [{ rule: 'tokens-compiled', path: 'brand/tokens.css', message: 'out of date: run node brand/build-tokens.mjs' }]);
if (import.meta.url === `file://${process.argv[1]}`) process.exit(ok ? 0 : 1);
export default ok;
