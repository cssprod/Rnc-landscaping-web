#!/usr/bin/env node
// @ts-check
/**
 * Generates event-schema.d.ts from event-schema.yaml (offline stand-in for
 * `npx @clamp-sh/event-schema generate`; CI can run the official CLI too).
 * Supports the subset of YAML used in event-schema.yaml.
 *   node tools/gen-event-types.mjs           write event-schema.d.ts
 *   node tools/gen-event-types.mjs --check   exit 1 when event-schema.d.ts is out of date (writes nothing)
 * Importing this module only exposes parseEvents() / generate(); it writes when run directly.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const YAML_FILE = fileURLToPath(new URL('../event-schema.yaml', import.meta.url));
export const DTS_FILE = fileURLToPath(new URL('../event-schema.d.ts', import.meta.url));

/** A YAML scalar without its surrounding quotes. @param {string} v */
const unquote = (v) => (/^"(.*)"$/.test(v) ? v.slice(1, -1).replace(/\\"/g, '"') : /^'(.*)'$/.test(v) ? v.slice(1, -1) : v);

/**
 * Events declared in the YAML: { name: { intent, deprecated, props: { prop: { type, values?, required?, … } } } }.
 * @param {string} src
 * @returns {Record<string, { intent: string, deprecated: boolean, props: Record<string, Record<string, string>> }>}
 */
export function parseEvents(src) {
  /** @type {Record<string, { intent: string, deprecated: boolean, props: Record<string, Record<string, string>> }>} */
  const events = {};
  let ev = '', prop = '';
  for (const line of src.split('\n')) {
    if (/^\s*#/.test(line) || !line.trim()) continue;
    const ind = line.match(/^ */)?.[0].length ?? 0;
    const [k, ...rest] = line.trim().split(':');
    const v = rest.join(':').trim();
    if (ind === 2) { ev = k; prop = ''; events[ev] = { intent: '', deprecated: false, props: {} }; }
    else if (ind === 4 && k === 'intent') { events[ev].intent = unquote(v); events[ev].deprecated = /^Deprecated:/.test(unquote(v)); }
    else if (ind === 6) { prop = k; events[ev].props[prop] = {}; }
    else if (ind === 8 && prop) events[ev].props[prop][k] = v;
  }
  return events;
}

/** event-schema.d.ts text for the YAML source. @param {string} src */
export function generate(src) {
  const events = parseEvents(src);
  const ts = (/** @type {Record<string, string>} */ p) => p.type === 'number' ? 'number' : p.type === 'boolean' ? 'boolean'
    : p.type === 'enum' ? p.values.replace(/[[\]]/g, '').split(',').map((s) => JSON.stringify(s.trim())).join(' | ') : 'string';
  let out = '// Generated from event-schema.yaml by tools/gen-event-types.mjs. Do not edit.\nexport interface AnalyticsEvents {\n';
  for (const [name, e] of Object.entries(events)) {
    out += `  /** ${e.deprecated ? `@deprecated ${e.intent.replace(/^Deprecated:\s*/, '')}` : e.intent} */\n  ${name}: {${Object.entries(e.props).map(([k, p]) => ` ${k}${p.required === 'true' ? '' : '?'}: ${ts(p)};`).join('')} }${Object.keys(e.props).length ? '' : ' | undefined'};\n`;
  }
  return `${out}}\n`;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const want = generate(readFileSync(YAML_FILE, 'utf8'));
  const n = Object.keys(parseEvents(readFileSync(YAML_FILE, 'utf8'))).length;
  if (process.argv.includes('--check')) {
    let have = '';
    try { have = readFileSync(DTS_FILE, 'utf8'); } catch { /* missing */ }
    if (have !== want) { console.error('event-schema.d.ts is out of date: run node tools/gen-event-types.mjs'); process.exit(1); }
    console.log(`event-schema.d.ts: up to date (${n} events)`);
  } else {
    writeFileSync(DTS_FILE, want);
    console.log(`event-schema.d.ts: ${n} events`);
  }
}
