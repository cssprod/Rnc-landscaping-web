#!/usr/bin/env node
// @ts-check
/** Minimal static server for dist/ (pretty URLs, 404.html). Usage: node tools/serve.mjs [port] */
import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';
import { DIST } from './lib.mjs';
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.json': 'application/json', '.xml': 'application/xml', '.txt': 'text/plain', '.webmanifest': 'application/manifest+json', '.yml': 'text/yaml', '.pdf': 'application/pdf', '.png': 'image/png' };
const port = Number(process.argv[2] || process.env.PORT || 4321);
export const server = createServer((req, res) => {
  const url = new URL(req.url || '/', 'http://x');
  if (req.method === 'POST') { res.writeHead(303, { Location: '/quote/thanks/' }); return res.end(); } // stub for Netlify Forms
  let p = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, '');
  let f = join(DIST, p);
  if (existsSync(f) && statSync(f).isDirectory()) f = join(f, 'index.html');
  if (!existsSync(f)) { res.writeHead(404, { 'Content-Type': types['.html'] }); return createReadStream(join(DIST, '404.html')).pipe(res); }
  res.writeHead(200, { 'Content-Type': /** @type {any} */ (types)[extname(f)] || 'application/octet-stream' });
  createReadStream(f).pipe(res);
});
if (import.meta.url === `file://${process.argv[1]}`) server.listen(port, () => console.log(`Serving dist/ at http://localhost:${port}`));
