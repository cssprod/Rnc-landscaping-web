#!/usr/bin/env node
// @ts-check
/**
 * Generates event-schema.d.ts from event-schema.yaml (offline stand-in for
 * `npx @clamp-sh/event-schema generate`; CI can run the official CLI too).
 * Supports the subset of YAML used in event-schema.yaml.
 */
import { readFileSync, writeFileSync } from 'node:fs';
const src = readFileSync(new URL('../event-schema.yaml', import.meta.url), 'utf8');
/** @type {Record<string, {intent:string, props: Record<string, any>}>} */
const events = {};
let ev = '', prop = '';
for (const line of src.split('\n')) {
  if (/^\s*#/.test(line) || !line.trim()) continue;
  const ind = line.match(/^ */)?.[0].length ?? 0;
  const [k, ...rest] = line.trim().split(':');
  const v = rest.join(':').trim();
  if (ind === 2) { ev = k; prop = ''; events[ev] = { intent: '', props: {} }; }
  else if (ind === 4 && k === 'intent') events[ev].intent = v;
  else if (ind === 6) { prop = k; events[ev].props[prop] = {}; }
  else if (ind === 8 && prop) events[ev].props[prop][k] = v;
}
const ts = (/** @type {any} */ p) => p.type === 'number' ? 'number' : p.type === 'boolean' ? 'boolean'
  : p.type === 'enum' ? p.values.replace(/[[\]]/g, '').split(',').map((/** @type {string} */ s) => JSON.stringify(s.trim())).join(' | ') : 'string';
let out = '// Generated from event-schema.yaml by tools/gen-event-types.mjs. Do not edit.\nexport interface AnalyticsEvents {\n';
for (const [name, e] of Object.entries(events)) {
  out += `  /** ${e.intent} */\n  ${name}: {${Object.entries(e.props).map(([k, p]) => ` ${k}${p.required === 'true' ? '' : '?'}: ${ts(p)};`).join('')} }${Object.keys(e.props).length ? '' : ' | undefined'};\n`;
}
out += '}\n';
writeFileSync(new URL('../event-schema.d.ts', import.meta.url), out);
console.log(`event-schema.d.ts: ${Object.keys(events).length} events`);
