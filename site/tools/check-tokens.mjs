#!/usr/bin/env node
// @ts-check
/** brand/tokens.css must match brand/tokens.json (the build compiles the JSON; the CSS file is the readable copy). */
import { readFileSync } from 'node:fs';
import { generate, readTokens } from '../../brand/build-tokens.mjs';
import { report } from './lib.mjs';
const css = readFileSync(new URL('../../brand/tokens.css', import.meta.url), 'utf8');
const ok = report('design tokens compiled', css === generate(readTokens()) ? [] : ['brand/tokens.css is out of date: run node brand/build-tokens.mjs']);
if (import.meta.url === `file://${process.argv[1]}`) process.exit(ok ? 0 : 1);
export default ok;
