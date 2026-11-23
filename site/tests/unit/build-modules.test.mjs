// @ts-check
// Module-graph hashing, modulepreload links, sprite tree-shaking and the legacy CSS slices.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { buildModules, addModulePreloads, findImports, moduleName } from '../../src/lib/build/modules.mjs';
import { shakeSprite } from '../../src/lib/build/sprite-shake.mjs';
import { styleFiles } from '../../src/lib/build/css.mjs';
import { sprite, icon, logo } from '../../src/components/sprite.mjs';

/** Every temporary directory of this file lives under one root, removed when the file's tests end. */
const TMP_ROOT = mkdtempSync(join(tmpdir(), 'rnc-test-'));
after(() => rmSync(TMP_ROOT, { recursive: true, force: true }));
const tmp = (/** @type {string} */ p) => mkdtempSync(join(TMP_ROOT, p));

const SITE = fileURLToPath(new URL('../../', import.meta.url));
const REPO = join(SITE, '..');

/** @param {Record<string, string>} files */
function scripts(files) {
  const dir = tmp('rnc-mods-');
  for (const [f, c] of Object.entries(files)) { mkdirSync(join(dir, f, '..'), { recursive: true }); writeFileSync(join(dir, f), c); }
  return dir;
}

test('modules are hashed leaves first with specifiers rewritten to hashed URLs #module-graph', () => {
  const dir = scripts({
    'main.js': "import { track } from './lib/track.js';\nimport './quote.js';\n// import './nope.js';\ntrack('x');\n",
    'quote.js': "import { track } from './lib/track.js';\nexport const q = 1;\n",
    'lib/track.js': 'export function track() {}\n',
  });
  const { modules, files } = buildModules(dir, { minify: false });
  assert.deepEqual(Object.keys(modules).sort(), ['lib-track', 'main', 'quote']);
  assert.match(modules['lib-track'].src, /^\/assets\/build\/lib-track\.[0-9a-f]{10}\.js$/);
  assert.deepEqual(modules.quote.deps, [modules['lib-track'].src]);
  assert.deepEqual(modules.main.deps, [modules['lib-track'].src, modules.quote.src]);
  const main = /** @type {{ code: string }} */ (files.find((f) => f.name === 'main')).code;
  assert.ok(main.includes(`from '${modules['lib-track'].src}'`));
  assert.ok(main.includes(`import '${modules.quote.src}'`));
  assert.ok(main.includes("// import './nope.js'"), 'commented-out imports are left alone');
  // The static import and a route's scripts: ['quote'] name the same URL, so the module evaluates once.
  assert.ok(main.includes(modules.quote.src));
  // A leaf change changes every importer's URL.
  writeFileSync(join(dir, 'lib/track.js'), 'export function track() { return 1; }\n');
  const again = buildModules(dir, { minify: false }).modules;
  assert.notEqual(again['lib-track'].src, modules['lib-track'].src);
  assert.notEqual(again.main.src, modules.main.src);
  assert.notEqual(again.quote.src, modules.quote.src);
});

test('import cycles and unresolved relative imports fail the build', () => {
  assert.throws(() => buildModules(scripts({ 'a.js': "import './b.js';\n", 'b.js': "import './a.js';\n" })), /cycle/);
  assert.throws(() => buildModules(scripts({ 'a.js': "import './missing.js';\n" })), /does not resolve/);
});

test('findImports and moduleName', () => {
  const code = "import a from './a.js';\nimport {\n  b,\n  c,\n} from \"./lib/b.js\";\nexport * from './c.js';\nexport { d } from './d.js';\nconst x = import('./e.js');\nconst s = 'import \"./no.js\"';\n";
  assert.deepEqual(findImports(code).map((i) => i.spec), ['./a.js', './lib/b.js', './c.js', './d.js', './e.js']);
  assert.equal(moduleName('lib/track.js'), 'lib-track');
  assert.equal(moduleName('main.js'), 'main');
});

test('modulepreload links are added for dependencies, once, before the module script', () => {
  const modules = { main: { src: '/m.js', deps: ['/t.js', '/q.js'] }, quote: { src: '/q.js', deps: ['/t.js'] } };
  const html = '<head><link rel="modulepreload" href="/t.js">\n<script type="module" src="/m.js"></script><script type="module" src="/q.js"></script></head>';
  const out = addModulePreloads(html, modules);
  assert.equal((out.match(/modulepreload/g) || []).length, 1, 'already preloaded and on-page modules are not repeated');
  assert.equal(addModulePreloads('<script type="module" src="/m.js"></script>', { main: { src: '/m.js', deps: ['/t.js'] } }), '<link rel="modulepreload" href="/t.js">\n<script type="module" src="/m.js"></script>');
});

test('the real scripts directory builds; feature modules load per route, not from main (W2) #module-graph', () => {
  const { modules } = buildModules(join(SITE, 'src/scripts'));
  for (const n of ['main', 'quote', 'projects', 'living', 'areas', 'lib-track', 'lib-prefs']) assert.ok(modules[n], `missing ${n}`);
  assert.ok(modules.main.deps.includes(modules['lib-track'].src) && modules.main.deps.includes(modules['lib-prefs'].src));
  for (const n of ['quote', 'projects', 'areas', 'living']) assert.ok(!modules.main.deps.includes(modules[n].src), `main must not import ${n}`);
});

test('sprite tree-shaking keeps only referenced symbols and their paint servers #sprite-shake', () => {
  const page = (/** @type {string} */ body) => `<body>${sprite()}<header>${body}</header></body>`;
  const full = page(`${logo()}${icon('phone')}`);
  const r = shakeSprite(full);
  assert.deepEqual(r.kept.sort(), ['i-phone', 'logo-tile', 'logo-word']);
  assert.ok(r.dropped.includes('i-mail'));
  for (const id of ['logo-g', 'logo-s', 'logo-h', 'logo-c']) assert.ok(r.html.includes(`id="${id}"`), `${id} is needed by logo-tile`);
  assert.ok(r.html.length < full.length - 4000);
  // Without the logo the paint servers go too; with nothing referenced the sprite is empty.
  const bare = shakeSprite(page(icon('mail'))).html;
  assert.ok(!bare.includes('logo-g') && bare.includes('id="i-mail"'));
  assert.match(shakeSprite(page('')).html, /<svg class="sprite"[^>]*><\/svg>/);
  // Every id in the sprite is namespaced.
  for (const m of String(sprite()).matchAll(/\bid="([^"]+)"/g)) assert.match(m[1], /^(i|logo)-/);
});

test('legacy slices: one per legacy-css-map segment, in source order, inside @layer legacy, !important declarations byte-identical #legacy-slices', () => {
  const map = JSON.parse(readFileSync(join(REPO, '.orchestra/legacy-css-map.json'), 'utf8'));
  const names = styleFiles(join(SITE, 'src/styles'));
  assert.equal(names[0], '00-layers.css');
  assert.ok(readFileSync(join(SITE, 'src/styles/00-layers.css'), 'utf8').includes(map.layerDecl));
  const legacy = names.filter((n) => n.startsWith('50-legacy-'));
  const planned = map.segments.map((/** @type {any} */ s) => s.file.split('/').pop());
  // Owners delete their slices by each segment's mustDeleteIn wave, so compare only against the segments whose file
  // still exists (W3b proves none remain).
  const present = planned.filter((/** @type {string} */ f) => names.includes(f));
  // A fallback 50-legacy-NNx-ds-core.css may sit between slices; everything else is exactly the map, in order.
  assert.deepEqual(legacy.filter((n) => !/^50-legacy-\d\dx-ds-core\.css$/.test(n)), present);
  for (const seg of map.segments) {
    if (!existsSync(join(REPO, seg.file))) continue;
    const text = readFileSync(join(REPO, seg.file), 'utf8');
    assert.match(text, /@layer legacy \{\n[\s\S]*\n\}\n$/, `${seg.file} wraps its rules in @layer legacy`);
    for (const r of seg.importantRules || []) {
      for (const d of r.declarations) assert.ok(text.includes(d), `${seg.file}:${r.line} ${r.selector} keeps "${d}"`);
      assert.ok(text.includes(r.selector), `${seg.file} keeps ${r.selector}`);
    }
  }
  assert.ok(!existsSync(join(SITE, 'src/styles/site.css')), 'site.css is fully split');
});

test('pre-registered style stubs exist (CONTRACT §4, §12)', () => {
  for (const n of ['01-reset', '02-base', '03-type', '05-layout', '08-utilities', '30-chrome', '40-ui-actions', '41-ui-heads', '42-ui-cards', '43-ui-projects', '44-ui-trust', '45-living', '46-ui-faq', '47-ui-cta', '48-ui-seasons', '49-ui-callouts', '60-home', '61-services', '62-areas', '63-projects', '64-company', '65-editorial', '70-quote', '80-styleguide', '95-motion', '99-print']) {
    assert.ok(existsSync(join(SITE, `src/styles/${n}.css`)), n);
  }
  for (const n of ['living', 'projects', 'areas', 'quote', 'main', 'lib/track', 'lib/prefs']) assert.ok(existsSync(join(SITE, `src/scripts/${n}.js`)), n);
});
