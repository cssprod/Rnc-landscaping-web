#!/usr/bin/env node
// @ts-check
/**
 * Static server for a build, behaving like the Netlify CDN so Playwright sees what visitors get (CONTRACT §14):
 *   - pretty URLs (/x/ → /x/index.html) and 404.html with status 404;
 *   - dist/_redirects: one rule per line "from to [status]", exact paths, trailing-slash tolerant, the destination's
 *     query kept (otherwise the request's query is passed through); 3xx redirects, 200 rewrites;
 *   - headers from the netlify.toml [[headers]] blocks (CSP included) and dist/_headers, matched by path pattern;
 *   - gzip like the CDN.
 *
 *   node tools/serve.mjs [port]        PORT (default 4321) and SITE_DIST (default site/dist) also work
 *   import { createSiteServer } from './serve.mjs'   createSiteServer({ dist?, toml? }) → http.Server
 */
import { createServer } from 'node:http';
import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';
import { createGzip } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { DIST } from './lib.mjs';

/** @type {Record<string, string>} */
export const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml', '.json': 'application/json', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json', '.yml': 'text/yaml', '.pdf': 'application/pdf',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif', '.gif': 'image/gif', '.ico': 'image/x-icon',
  '.woff2': 'font/woff2', '.woff': 'font/woff',
};
const COMPRESSIBLE = new Set(['.html', '.css', '.js', '.mjs', '.svg', '.json', '.xml', '.txt', '.webmanifest']);
const TOML = fileURLToPath(new URL('../../netlify.toml', import.meta.url));

/**
 * The [[headers]] blocks of netlify.toml: [{ for, values }]. Only the subset this repo uses (string values).
 * @param {string} toml
 * @returns {{ for: string, values: Record<string, string> }[]}
 */
export function parseTomlHeaders(toml) {
  /** @type {{ for: string, values: Record<string, string> }[]} */
  const out = [];
  /** @type {{ for: string, values: Record<string, string> }|null} */
  let cur = null;
  let inValues = false;
  for (const raw of toml.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    if (/^\[\[headers\]\]$/.test(line)) { cur = { for: '', values: {} }; out.push(cur); inValues = false; continue; }
    if (/^\[headers\.values\]$/.test(line)) { inValues = !!cur; continue; }
    if (/^\[/.test(line)) { cur = null; inValues = false; continue; }
    const kv = line.match(/^("?)([^"=]+?)\1\s*=\s*"((?:[^"\\]|\\.)*)"\s*(?:#.*)?$/);
    if (!kv || !cur) continue;
    if (inValues) cur.values[kv[2].trim()] = kv[3].replace(/\\"/g, '"');
    else if (kv[2].trim() === 'for') cur.for = kv[3];
  }
  return out.filter((b) => b.for);
}

/**
 * dist/_headers (Netlify format): a path line, then indented "Name: value" lines.
 * @param {string} text
 */
export function parseHeadersFile(text) {
  /** @type {{ for: string, values: Record<string, string> }[]} */
  const out = [];
  for (const raw of text.split('\n')) {
    if (!raw.trim() || raw.trim().startsWith('#')) continue;
    if (!/^\s/.test(raw)) { out.push({ for: raw.trim(), values: {} }); continue; }
    const m = raw.trim().match(/^([^:]+):\s*(.*)$/);
    if (m && out.length) out[out.length - 1].values[m[1].trim()] = m[2].trim();
  }
  return out;
}

/** Netlify path pattern: "*" matches anything (including "/"); ":name" one segment. @param {string} pattern */
const patternRe = (pattern) => new RegExp(`^${pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/:[A-Za-z]\w*/g, '[^/]+')}$`);

/**
 * dist/_redirects: [{ from, to, status }]. Exact paths only (CONTRACT §5: no splats).
 * @param {string} text
 */
export function parseRedirects(text) {
  /** @type {{ from: string, to: string, status: number }[]} */
  const out = [];
  for (const raw of text.split('\n')) {
    const line = raw.replace(/#.*$/, '').trim();
    if (!line) continue;
    const [from, to, st] = line.split(/\s+/);
    if (!from || !to) continue;
    out.push({ from, to, status: Number(String(st || '301').replace(/!$/, '')) || 301 });
  }
  return out;
}

/** @param {string} p */
const noSlash = (p) => (p.length > 1 ? p.replace(/\/+$/, '') : p);

/**
 * @param {{ dist?: string, toml?: string }} [o]
 */
export function createSiteServer(o = {}) {
  const dist = o.dist || DIST;
  const tomlText = o.toml ?? (existsSync(TOML) ? readFileSync(TOML, 'utf8') : '');
  const tomlHeaders = parseTomlHeaders(tomlText).map((b) => ({ re: patternRe(b.for), values: b.values }));
  // _redirects and _headers are read per request so a rebuild is picked up without a restart.
  const readOpt = (/** @type {string} */ f) => { try { return readFileSync(join(dist, f), 'utf8'); } catch { return ''; } };

  return createServer((req, res) => {
    const url = new URL(req.url || '/', 'http://x');
    let pathname;
    try { pathname = decodeURIComponent(url.pathname); } catch { res.writeHead(400).end(); return; }

    /* ---- redirects ---- */
    for (const r of parseRedirects(readOpt('_redirects'))) {
      if (noSlash(r.from) !== noSlash(pathname)) continue;
      if (r.status === 200) { pathname = r.to.split('?')[0]; break; } // rewrite
      const dest = r.to.includes('?') || !url.search ? r.to : `${r.to}${url.search}`;
      res.writeHead(r.status, { Location: dest, 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(`Redirecting to ${dest}\n`);
      return;
    }

    /* ---- file ---- */
    const p = normalize(pathname).replace(/^(\.\.[/\\])+/, '');
    let f = join(dist, p);
    if (!f.startsWith(dist)) { res.writeHead(403).end(); return; }
    if (existsSync(f) && statSync(f).isDirectory()) {
      if (!pathname.endsWith('/') && existsSync(join(f, 'index.html'))) { res.writeHead(301, { Location: `${pathname}/${url.search}` }).end(); return; }
      f = join(f, 'index.html');
    }
    const found = existsSync(f) && statSync(f).isFile();
    if (!found) f = join(dist, '404.html');
    const ext = extname(f);

    /* ---- headers: netlify.toml first, then dist/_headers (which wins on a clash, as on Netlify) ---- */
    /** @type {Record<string, string>} */
    const headers = { 'Content-Type': TYPES[ext] || 'application/octet-stream' };
    for (const b of [...tomlHeaders, ...parseHeadersFile(readOpt('_headers')).map((h) => ({ re: patternRe(h.for), values: h.values }))]) {
      if (b.re.test(pathname)) Object.assign(headers, b.values);
    }
    const gzip = COMPRESSIBLE.has(ext) && /\bgzip\b/.test(String(req.headers['accept-encoding'] || ''));
    if (gzip) { headers['Content-Encoding'] = 'gzip'; headers.Vary = 'Accept-Encoding'; }
    if (!existsSync(f)) { res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not found\n'); return; }
    res.writeHead(found ? 200 : 404, headers);
    if (req.method === 'HEAD') { res.end(); return; }
    const stream = createReadStream(f);
    (gzip ? stream.pipe(createGzip()) : stream).pipe(res);
  });
}

/** Default server over SITE_DIST (kept for tools that import it). */
export const server = createSiteServer();
if (import.meta.url === `file://${process.argv[1]}`) {
  const port = Number(process.argv[2] || process.env.PORT || 4321);
  server.listen(port, () => console.log(`Serving ${DIST} at http://localhost:${port}`));
}
