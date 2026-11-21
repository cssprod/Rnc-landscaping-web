// Lets `node --test site/tests/unit/` run every *.test.mjs in this folder
// (Node resolves a directory argument to its index.js).
const { readdirSync } = require('node:fs');
const { join } = require('node:path');
const { pathToFileURL } = require('node:url');
for (const f of readdirSync(__dirname).filter((x) => x.endsWith('.test.mjs')).sort()) import(pathToFileURL(join(__dirname, f)).href);
