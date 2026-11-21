#!/usr/bin/env node
// @ts-check
/** Minimal static server for dist/ (pretty URLs, 404.html, gzip like the CDN). Usage: node tools/serve.mjs [port] */
import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';
import { createGzip } from 'node:zlib';
import { DIST } from './lib.mjs';
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.json': 'application/json', '.xml': 'application/xml', '.txt': 'text/plain', '.webmanifest': 'application/manifest+json', '.yml': 'text/yaml', '.pdf': 'application/pdf', '.png': 'image/png', '.woff2': 'font/woff2', '.ico': 'image/x-icon' };
const compressible = new Set(['.html', '.css', '.js', '.svg', '.json', '.xml', '.txt', '.webmanifest']);
const port = Number(process.argv[2] || process.env.PORT || 4321);
export const server = createServer((req, res) => {
  const url = new URL(req.url || '/', 'http://x');
  const p = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, '');
  let f = join(DIST, p);
  if (existsSync(f) && statSync(f).isDirectory()) f = join(f, 'index.html');
  const found = existsSync(f);
  if (!found) f = join(DIST, '404.html');
  const ext = extname(f);
  /** @type {Record<string, string>} */
  const headers = { 'Content-Type': /** @type {any} */ (types)[ext] || 'application/octet-stream' };
  const gzip = compressible.has(ext) && /\bgzip\b/.test(String(req.headers['accept-encoding'] || ''));
  if (gzip) { headers['Content-Encoding'] = 'gzip'; headers.Vary = 'Accept-Encoding'; }
  res.writeHead(found ? 200 : 404, headers);
  const stream = createReadStream(f);
  (gzip ? stream.pipe(createGzip()) : stream).pipe(res);
});
if (import.meta.url === `file://${process.argv[1]}`) server.listen(port, () => console.log(`Serving dist/ at http://localhost:${port}`));
