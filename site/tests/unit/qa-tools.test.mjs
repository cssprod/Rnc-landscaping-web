// @ts-check
/**
 * The qa tools catch what they claim to catch (mutation tests): each test runs a tool on a small broken fixture (a
 * temporary dist, repository root or ci.yml), expects the rule id and the page or file in the report, and expects a
 * clean fixture to pass. Rule ids appear in the titles as #rule (tools/trace.mjs).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { literalRules, testTitles } from '../../tools/trace.mjs';
import { applyBaseline, contrastOf, fileOfUrl, luminance, median, urlOf } from '../../tools/lib.mjs';

const SITE = fileURLToPath(new URL('../..', import.meta.url));
const REPO = join(SITE, '..');

/** @param {string} tool @param {string[]} args @param {Record<string, string>} [env] */
function run(tool, args = [], env = {}) {
  const r = spawnSync(process.execPath, [`tools/${tool}.mjs`, ...args], { cwd: SITE, encoding: 'utf8', env: { ...process.env, SITE_MODE: '', BASELINE_DIR: join(tmpdir(), 'qa-no-baselines'), ...env } });
  return { code: r.status, out: `${r.stdout}${r.stderr}` };
}
/** @param {string} prefix @param {Record<string, string>} files */
function tree(prefix, files) {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  for (const [f, s] of Object.entries(files)) { mkdirSync(dirname(join(dir, f)), { recursive: true }); writeFileSync(join(dir, f), s); }
  return dir;
}
/** @param {string} title @param {string} body @param {string} [head] */
const page = (title, body, head = '') => `<!doctype html><html lang="en-CA"><head><title>${title}</title><meta name="description" content="${title} page"><meta name="viewport" content="width=device-width"><link rel="canonical" href="/">${head}</head><body><header class="site-header"></header><main><h1>${title}</h1>${body}</main><footer class="site-footer"><mark class="ph">[PHONE]</mark> <mark class="ph">[EMAIL]</mark></footer></body></html>`;

/* ------------------------------------------------------------------ lib.mjs */
test('report() baselines: listed failures pass, new ones fail, gone ones are stale #baseline-ratchet', () => {
  const r = applyBaseline([{ rule: 'a', path: 'x.html', message: '' }, { rule: 'b', path: 'y.html', message: '' }], { tool: 't', writtenAt: 'w2', entries: [{ rule: 'a', path: 'x.html' }, { rule: 'c', path: 'z.html' }] });
  assert.deepEqual(r.fresh.map((f) => f.rule), ['b']);
  assert.deepEqual(r.baselined.map((f) => f.rule), ['a']);
  assert.deepEqual(r.stale.map((f) => f.rule), ['c']);
  const dir = tree('qa-bl-', { 'check-honesty.json': JSON.stringify({ tool: 'check-honesty', writtenAt: 'test', entries: [{ rule: 'unverifiable-claims', path: 'index.html' }] }) });
  const dist = tree('qa-dist-', { 'index.html': page('Home', '<p>An award-winning crew.</p>') });
  const root = `--root=${honestyRoot()}`;
  assert.equal(run('check-honesty', [root], { SITE_DIST: dist, BASELINE_DIR: dir }).code, 0, 'a baselined failure passes');
  assert.equal(run('check-honesty', [root, '--no-baseline'], { SITE_DIST: dist, BASELINE_DIR: dir }).code, 1, '--no-baseline fails it');
});

test('two-build baselines: --baseline-merge unions writes, BASELINE_LEDGER + --apply-ledger prunes over both builds #baseline-ratchet', () => {
  const dir = mkdtempSync(join(tmpdir(), 'qa-bl2-'));
  const ledger = join(dir, 'ledger');
  const a = tree('qa-dist-', { 'index.html': page('Home', '<p>An award-winning crew.</p>') });
  const b = tree('qa-dist-', { 'about/index.html': page('About', '<p>Since 1998.</p>') });
  const root = `--root=${honestyRoot()}`;
  run('check-honesty', [root, '--write-baseline'], { SITE_DIST: a, BASELINE_DIR: dir });
  run('check-honesty', [root, '--write-baseline', '--baseline-merge'], { SITE_DIST: b, BASELINE_DIR: dir });
  const entries = () => JSON.parse(readFileSync(join(dir, 'check-honesty.json'), 'utf8')).entries.map((/** @type {any} */ e) => `${e.rule} ${e.path}`).sort();
  assert.deepEqual(entries(), ['unverifiable-claims about/index.html', 'unverifiable-claims index.html']);
  // Build a is fixed, build b still fails: only b's entry survives the ledger prune.
  run('check-honesty', [root, '--prune-baseline'], { SITE_DIST: tree('qa-dist-', { 'index.html': page('Home', '<p>A careful crew.</p>') }), BASELINE_DIR: dir, BASELINE_LEDGER: ledger });
  run('check-honesty', [root, '--prune-baseline'], { SITE_DIST: b, BASELINE_DIR: dir, BASELINE_LEDGER: ledger });
  assert.equal(entries().length, 2, 'ledger runs do not rewrite the baseline');
  assert.equal(run('lib', [`--apply-ledger=${ledger}`]).code, 0);
  assert.deepEqual(entries(), ['unverifiable-claims about/index.html']);
});

test('lib helpers: URL ↔ dist file, median, WCAG contrast', () => {
  assert.equal(fileOfUrl('/areas/oak-bay/'), 'areas/oak-bay/index.html');
  assert.equal(fileOfUrl('/'), 'index.html');
  assert.equal(fileOfUrl('/404.html'), '404.html');
  assert.equal(urlOf('areas/oak-bay/index.html'), '/areas/oak-bay/');
  assert.equal(median([3, 1, 2]), 2);
  assert.equal(median([4, 1, 3, 2]), 2);
  assert.equal(contrastOf(luminance([0, 0, 0]), luminance([255, 255, 255])).toFixed(1), '21.0');
});

/* ------------------------------------------------------------------ trace.mjs */
test('trace reads RULES and test titles statically #rule-exported #test-exists', () => {
  assert.deepEqual(literalRules("export const RULES = ['a', \"b\", // c\n `d`];"), ['a', 'b', 'd']);
  assert.equal(literalRules('export const RULES = [...OTHER];'), null);
  assert.equal(literalRules('const RULES = []'), null);
  assert.deepEqual(testTitles("test('x #one', () => {}); test.describe(`y ${a} #two`, () => {}); it(\"z\", f)"), ['x #one', 'y ${a} #two', 'z']);
  const root = tree('qa-trace-', {
    '.orchestra/traceability.json': JSON.stringify({ items: {
      X1: { stream: 's', verifier: 'qa', check: 'tool-a#present', kind: 'tool', checkFile: 'site/tools/tool-a.mjs', due: 'w2' },
      X2: { stream: 's', verifier: 'qa', check: 'tool-a#missing', kind: 'tool', checkFile: 'site/tools/tool-a.mjs', due: 'w2' },
      X3: { stream: 's', verifier: 'qa', check: 'e2e/a.spec#has-test', kind: 'e2e', checkFile: 'site/tests/e2e/a.spec.mjs', due: 'w2' },
      X4: { stream: 's', verifier: 'qa', check: 'e2e/a.spec#no-test', kind: 'e2e', checkFile: 'site/tests/e2e/a.spec.mjs', due: 'w3' },
      X5: { stream: 't', verifier: 't', check: 'tool-b#later', kind: 'tool', checkFile: 'site/tools/tool-b.mjs', due: 'w4' },
    } }),
    'site/tools/tool-a.mjs': "export const RULES = ['present'];\n",
    'site/tests/e2e/a.spec.mjs': "test('does the thing #has-test', () => {});\n",
  });
  const bad = run('trace', [`--repo=${root}`, '--upto=w3']);
  assert.equal(bad.code, 1);
  assert.match(bad.out, /\[rule-exported\] site\/tools\/tool-a\.mjs: X2 .*"missing" is not in RULES/);
  assert.match(bad.out, /\[test-exists\] site\/tests\/e2e\/a\.spec\.mjs: X4 .*#no-test/);
  assert.doesNotMatch(bad.out, /X5/, '--upto leaves out later items');
  assert.equal(run('trace', [`--repo=${root}`, '--upto=w2']).code, 1, 'X2 is due by w2');
  assert.equal(run('trace', [`--repo=${root}`, '--upto=w4', '--stream=t']).code, 1, 'X5: tool-b.mjs does not exist');
});

test('every qa tool declares a literal RULES list (tools/trace.mjs can read it)', () => {
  const tools = readdirSync(join(SITE, 'tools')).filter((f) => /^(check-.*|a11y|lighthouse|measure|motion-audit|text-over-media|budgets|trace|csp|screenshots)\.mjs$/.test(f));
  assert.ok(tools.length >= 16, tools.join(', '));
  for (const t of tools) assert.ok(literalRules(readFileSync(join(SITE, 'tools', t), 'utf8')), `${t} has no literal RULES`);
  assert.equal(run('trace', ['--upto=w2', '--stream=qa']).code, 0);
});

/* ------------------------------------------------------------------ check-ci.mjs */
test('check-ci requires every gate, hard, at 5 widths, on C1 URLs #required-gates', () => {
  const good = readFileSync(join(REPO, '.github/workflows/ci.yml'), 'utf8');
  assert.equal(run('check-ci').code, 0, 'the committed ci.yml passes');
  const file = (/** @type {string} */ s) => { const d = tree('qa-ci-', { 'ci.yml': s }); return `--file=${join(d, 'ci.yml')}`; };
  const noA11y = run('check-ci', [file(good.replace(/node tools\/a11y\.mjs[^\n]*/, 'echo skipped'))]);
  assert.equal(noA11y.code, 1);
  assert.match(noA11y.out, /\[required-gates\] \.github\/workflows\/ci\.yml: no step runs the a11y matrix/);
  const soft = run('check-ci', [file(good.replace('run: node node_modules/playwright/cli.js test --trace off', 'run: node node_modules/playwright/cli.js test --trace off\n        continue-on-error: true'))]);
  assert.equal(soft.code, 1);
  assert.match(soft.out, /Playwright gate runs only with continue-on-error/);
  const widths = run('check-ci', [file(good.replace('--widths=320,390,768,1024,1440', '--widths=320,1440'))]);
  assert.match(widths.out, /does not cover 390, 768, 1024 px/);
  const old = run('check-ci', [file(good.replace('node tools/lighthouse.mjs --runs=3', 'node tools/lighthouse.mjs --runs=3 --pages=/,/quote/'))]);
  assert.match(old.out, /names the retired URL \/quote\//);
  const lhci = run('check-ci', [file(`${good}\n      - name: lhci\n        run: npx @lhci/cli autorun --assert.assertions.categories:performance=warn\n`)]);
  assert.match(lhci.out, /turns the Lighthouse performance budget into a warn/);
  assert.equal(run('check-ci', ['--file=/nonexistent/ci.yml']).code, 0, 'no ci.yml: nothing to check');
});

/* ------------------------------------------------------------------ check-html#data-track-names */
test('check-html flags unknown and deprecated analytics names #data-track-names', () => {
  const bad = run('check-html', [], { SITE_DIST: tree('qa-dist-', {
    'index.html': page('Home', '<a href="/contact/" data-track="call_clicked">Call</a><a href="/x/" data-track="made_up">X</a>'),
    'assets/build/main.0123456789.js': "track('email_clicked',{location});track(\"quote_mailto_opened\",{});",
  }) });
  assert.equal(bad.code, 1);
  assert.match(bad.out, /\[data-track-names\] index\.html: data-track "call_clicked" is a deprecated v2 event name/);
  assert.match(bad.out, /\[data-track-names\] index\.html: data-track "made_up" is not an event/);
  assert.match(bad.out, /\[data-track-names\] site\/src\/scripts\/main\.js: track\(\) "email_clicked" is a deprecated/);
  assert.doesNotMatch(bad.out, /quote_mailto_opened/);
  const ok = run('check-html', [], { SITE_DIST: tree('qa-dist-', { 'index.html': page('Home', '<a href="/contact/" data-track="call_click" data-track-location="header">Call</a>') }) });
  assert.doesNotMatch(ok.out, /data-track-names/);
});

/* ------------------------------------------------------------------ check-honesty.mjs */
/** A repository root for check-honesty: site.json, testimonials, commercial.json, images.json. */
function honestyRoot(/** @type {Record<string, string>} */ extra = {}) {
  return tree('qa-root-', {
    'content/site.json': JSON.stringify({ tokens: { WARRANTY: null, 'LIABILITY LIMIT': null }, credentials: [{ id: 'insurance', label: 'Liability insurance', value: '[LIABILITY LIMIT]' }] }),
    'content/testimonials/a.json': JSON.stringify({ slug: 'a', sample: true, quote: 'They kept the beds tidy all season.', attribution: 'Strata council member, Langford' }),
    'content/pages/commercial.json': JSON.stringify({ sections: [{ id: 'commitments', heading: 'What you can expect', items: [{ title: 'A written scope', body: 'Tasks per visit.' }, { title: 'One contact', body: 'One person.' }, { title: 'Visit notes', body: 'A note after each visit.' }] }] }),
    'media/images.json': JSON.stringify([{ id: 'proj-a', alt: 'Garden bed', purpose: 'project', stock: { provider: 'Unsplash', imageUrl: 'https://images.unsplash.com/photo-1' } }, { id: 'about-owner', alt: 'Owner', stock: null }, { id: 'hero-a', alt: 'A landscaper mowing', purpose: 'hero', stock: { provider: 'Unsplash', imageUrl: 'https://images.unsplash.com/photo-2' } }]),
    ...extra,
  });
}
const QUOTE_OK = '<p>We reply within <mark class="ph">[REPLY TIME]</mark>. Free, no obligation.</p><h2>What happens next</h2>';

test('check-honesty catches a stock photo under /projects/ and names the page #stock-in-projects', () => {
  const root = honestyRoot();
  const bad = run('check-honesty', [`--root=${root}`], { SITE_DIST: tree('qa-dist-', {
    'projects/index.html': page('Projects', '<img src="https://images.unsplash.com/photo-9?w=800" width="800" height="600" alt="">'),
    'projects/a/index.html': page('A', '<figure class="media media--art" data-slot="proj-a"><img src="/assets/art/proj-a.svg" width="4" height="3" alt=""></figure>'),
  }) });
  assert.equal(bad.code, 1);
  assert.match(bad.out, /\[stock-in-projects\] projects\/index\.html: external image https:\/\/images\.unsplash\.com/);
  assert.match(bad.out, /\[stock-in-projects\] projects\/a\/index\.html: slot "proj-a" has a stock photo/);
});

test('check-honesty flags superlatives, years in business and invented numbers #unverifiable-claims', () => {
  const out = run('check-honesty', [`--root=${honestyRoot()}`], { SITE_DIST: tree('qa-dist-', {
    'index.html': page('Home', '<p>The best landscaping company in Victoria.</p>'),
    'about/index.html': page('About', '<p>Serving Victoria since 1998, with over 500 happy clients.</p>'),
    'reviews/index.html': page('Reviews', '<p>Reviews on Google</p><span data-counter="500">0</span>'),
    'services/index.html': page('Services', '<p>Pruning that follows Best Arboriculture Practices; the best time to prune is late winter.</p>'),
  }) }).out;
  assert.match(out, /\[unverifiable-claims\] index\.html: The best landscaping/);
  assert.match(out, /\[unverifiable-claims\] about\/index\.html: since 1998/);
  assert.match(out, /\[unverifiable-claims\] reviews\/index\.html: counter\/ticker markup/);
  assert.doesNotMatch(out, /services\/index\.html/, 'ordinary uses of "best" pass');
});

test('check-honesty enforces Canadian spelling and catches typos #spelling', () => {
  const out = run('check-honesty', [`--root=${honestyRoot()}`], { SITE_DIST: tree('qa-dist-', {
    'index.html': page('Home', '<p>We match the color of your neighborhood.</p>'),
    'about/index.html': page('About', '<p>We AWLAYS reply.</p>'),
    'faq/index.html': page('FAQ', '<p>Mulch the the beds.</p>'),
    'terms/index.html': page('Terms', '<p>Neighbourhoods, colour, centre and a water meter.</p>'),
  }) }).out;
  assert.match(out, /\[spelling\] index\.html: "color" → colour/);
  assert.match(out, /\[spelling\] about\/index\.html: typo "AWLAYS"/);
  assert.match(out, /\[spelling\] faq\/index\.html: doubled word "the the"/);
  assert.doesNotMatch(out, /terms\/index\.html/);
});

test('check-honesty keeps stock people from standing for the owner or crew #no-stock-people', () => {
  const root = honestyRoot({ 'media/images.json': JSON.stringify([{ id: 'about-owner', alt: 'Owner portrait', stock: { provider: 'Unsplash', imageUrl: 'https://images.unsplash.com/p' } }, { id: 'hero-a', alt: 'A landscaper mowing', purpose: 'hero', stock: { provider: 'Unsplash', imageUrl: 'https://images.unsplash.com/q' } }]) });
  const out = run('check-honesty', [`--root=${root}`], { SITE_DIST: tree('qa-dist-', {
    'services/a/index.html': page('A', '<section class="hero"><figure data-slot="hero-a"><img src="https://images.unsplash.com/q" width="1" height="1" alt=""></figure></section>'),
  }) }).out;
  assert.match(out, /\[no-stock-people\] media\/images\.json: slot "about-owner" has a stock photo/);
  assert.match(out, /\[no-stock-people\] services\/a\/index\.html: slot "hero-a" is a stock photo of a person/);
});

test('check-honesty wants concrete commercial commitments without invented figures #commercial-proof', () => {
  const root = honestyRoot({ 'content/pages/commercial.json': JSON.stringify({ sections: [{ id: 'commitments', heading: 'What you can expect', items: [{ title: 'Quality', body: 'Trusted by hundreds of property managers.' }, { title: '24/7 response', body: 'Within 2 hours.' }] }] }) });
  const out = run('check-honesty', [`--root=${root}`], { SITE_DIST: tree('qa-dist-', { 'index.html': page('Home', '<p>Hi</p>') }) }).out;
  assert.match(out, /\[commercial-proof\] content\/pages\/commercial\.json: the commitments section "What you can expect" has 2 item/);
  assert.match(out, /item "Quality" .* is an adjective/);
  assert.match(out, /the number "24/);
  assert.match(out, /"Trusted by" claims past results|"hundreds of" claims past results/i);
  const ok = run('check-honesty', [`--root=${honestyRoot()}`], { SITE_DIST: tree('qa-dist-', { 'index.html': page('Home', '<p>Hi</p>') }) }).out;
  assert.doesNotMatch(ok, /commercial-proof/);
});

test('check-honesty bans prices and wants the reply-time promise #trust-without-prices', () => {
  const out = run('check-honesty', [`--root=${honestyRoot()}`], { SITE_DIST: tree('qa-dist-', {
    'services/index.html': page('Services', '<p>Lawn care from $49 per visit.</p>'),
    'free-quote/index.html': page('Quote', '<p>Send your request.</p>'),
    'contact/index.html': page('Contact', `<p>${QUOTE_OK}</p>`),
    'about/index.html': page('About', '<section class="cta-band"><h2>Talk to us</h2><p>Get a free quote.</p></section>', '<script type="application/ld+json">{"@type":"LocalBusiness","priceRange":"$$"}</script>'),
  }) }).out;
  assert.match(out, /\[trust-without-prices\] services\/index\.html: price/);
  assert.match(out, /\[trust-without-prices\] free-quote\/index\.html: no reply-time promise/);
  assert.match(out, /\[trust-without-prices\] about\/index\.html: JSON-LD carries a price/);
  assert.match(out, /\[trust-without-prices\] about\/index\.html: the CTA band has no reply-time promise/);
  assert.doesNotMatch(out, /contact\/index\.html/);
});

test('check-honesty: no rating markup, labelled samples, credentials and guarantee from tokens #reviews-credentials-guarantee', () => {
  const out = run('check-honesty', [`--root=${honestyRoot()}`], { SITE_DIST: tree('qa-dist-', {
    'reviews/index.html': page('Reviews', '<ul><li class="quote"><blockquote><p>They kept the beds tidy all season.</p></blockquote></li></ul>', '<script type="application/ld+json">{"@type":"AggregateRating","ratingValue":"4.9"}</script>'),
    'about/index.html': page('About', '<p>We are fully insured. Our workmanship guarantee covers you. Satisfaction guaranteed.</p><dl class="credentials"><dt>Liability insurance</dt><dd>Yes</dd></dl>'),
    'faq/index.html': page('FAQ', '<ul><li class="quote"><blockquote><p>They kept the beds tidy all season.</p></blockquote><span class="sample-label">Sample</span></li></ul><p>Workmanship guarantee: <mark class="ph">[WARRANTY]</mark>.</p>'),
  }) }).out;
  assert.match(out, /\[reviews-credentials-guarantee\] reviews\/index\.html: JSON-LD carries Review \/ AggregateRating/);
  assert.match(out, /\[reviews-credentials-guarantee\] reviews\/index\.html: sample review .* has no visible "Sample" label/);
  assert.match(out, /\[reviews-credentials-guarantee\] reviews\/index\.html: no "Read all reviews on Google"/);
  assert.match(out, /\[reviews-credentials-guarantee\] about\/index\.html: credentials row shows "Liability insurance" without/);
  assert.match(out, /\[reviews-credentials-guarantee\] about\/index\.html: credential claim "[^"]*fully insured"/);
  assert.match(out, /\[reviews-credentials-guarantee\] about\/index\.html: a workmanship guarantee is mentioned without \[WARRANTY\]/);
  assert.match(out, /\[reviews-credentials-guarantee\] about\/index\.html: guarantee claim "Satisfaction guaranteed"/);
  assert.doesNotMatch(out, /faq\/index\.html/);
});

/* ------------------------------------------------------------------ check-motion-policy.mjs */
test('check-motion-policy lints banned effects, raw durations and prefers-reduced-motion #banned-effects #raw-durations #reduced-motion-placement', () => {
  const site = tree('qa-site-', {
    'site/src/styles/42-ui-cards.css': `@layer components {
  .card { transition: transform 200ms ease; }
  .card--ok { transition: transform var(--dur-t0) var(--ease-out); }
  .drift { animation: drift 40s linear infinite; }
  .spin { animation: spin 1.2s linear infinite; }
  @keyframes hue { to { --angle: 360deg; } }
  @keyframes grow { to { width: 100%; } }
  .rail { animation-timeline: view(); }
  .carousel__track { display: flex; }
  @media (prefers-reduced-motion: reduce) { .card { transition: none; } }
}`,
    'site/src/styles/95-motion.css': '@layer motion { @media (prefers-reduced-motion: reduce) { :root { --x: 0 } } [data-entered] .sc-land { transition: scale 1.4s; } }',
    'site/src/styles/50-legacy-07-ds-chrome.css': '@layer legacy { .x { transition: opacity .3s } @media (prefers-reduced-motion: reduce) { .x { transition: none } } }',
    'site/src/scripts/main.js': "const m = matchMedia('(prefers-reduced-motion: reduce)');",
    'site/src/scripts/lib/prefs.js': "const os = matchMedia('(prefers-reduced-motion: no-preference)');",
  });
  const dist = tree('qa-dist-', { 'index.html': page('Home', '<video autoplay src="/x.mp4"></video><svg><animate attributeName="x"/></svg>') });
  const out = run('check-motion-policy', [`--site=${join(site, 'site')}`], { SITE_DIST: dist }).out;
  assert.match(out, /\[raw-durations\] site\/src\/styles\/42-ui-cards\.css: line 2: transition: transform 200ms/);
  assert.match(out, /\[raw-durations\] site\/src\/styles\/42-ui-cards\.css: line 5: animation: spin 1\.2s/);
  assert.doesNotMatch(out, /line 3: transition|drift 40s/, 'token durations and T2 loop periods pass');
  assert.match(out, /\[banned-effects\] site\/src\/styles\/42-ui-cards\.css: line \d+: @keyframes hue animates the custom property --angle/);
  assert.match(out, /@keyframes grow animates width/);
  assert.match(out, /animation-timeline: view\(\) is banned/);
  assert.match(out, /selector "\.carousel__track"/);
  assert.match(out, /\[reduced-motion-placement\] site\/src\/styles\/42-ui-cards\.css: line 10/);
  assert.doesNotMatch(out, /\] site\/src\/styles\/(?:95-motion|50-legacy-07)/, '95-motion.css and legacy slices may use prefers-reduced-motion and raw times');
  assert.match(out, /\[reduced-motion-placement\] site\/src\/scripts\/main\.js: line 1: reads matchMedia/);
  assert.doesNotMatch(out, /\] site\/src\/scripts\/lib\/prefs\.js/);
  assert.match(out, /\[banned-effects\] index\.html: <video> is banned/);
  assert.match(out, /\[banned-effects\] index\.html: SMIL animation is banned/);
});

/* ------------------------------------------------------------------ budgets.mjs */
test('budgets: third parties, image widths, picture pipeline and the v2 table #third-party-origins #image-widths #picture-pipeline #v2', () => {
  const svg = `<svg>${'<path d="M0 0L10 10"/>'.repeat(2500)}</svg>`;
  const out = run('budgets', [], { SITE_DIST: tree('qa-dist-', {
    'index.html': page('Home', `<img src="/a.svg" width="1" height="1" fetchpriority="high" alt="">${svg}`, '<script src="https://cdn.example.com/x.js"></script>'),
    'about/index.html': page('About', '<img src="/b.svg" alt=""><img src="https://images.unsplash.com/p?w=2400" srcset="https://images.unsplash.com/p?w=2400 2400w" width="2" height="1" loading="lazy" decoding="async" alt="">'),
    'contact/index.html': page('Contact', '<img src="/c.jpg" width="2" height="1" loading="lazy" decoding="async" alt="">'),
    'a.svg': '<svg/>', 'b.svg': '<svg/>', 'c.jpg': 'x',
  }) }).out;
  assert.match(out, /\[third-party-origins\] index\.html: loads from cdn\.example\.com/);
  assert.match(out, /\[v2\] index\.html: inline SVG/);
  assert.match(out, /\[image-widths\] about\/index\.html: image candidate https:\/\/images\.unsplash\.com\/p\?w=2400 is 2400 px/);
  assert.match(out, /\[picture-pipeline\] about\/index\.html: <img> without width and height/);
  assert.match(out, /\[picture-pipeline\] about\/index\.html: <img> below the hero without loading="lazy"/);
  assert.match(out, /\[picture-pipeline\] contact\/index\.html: local photo \/c\.jpg is not a <picture> with AVIF then WebP/);
  assert.doesNotMatch(out, /about\/index\.html: loads from images\.unsplash\.com/, 'an online build may use the CDN photos');
});

/* ------------------------------------------------------------------ schemas/quote.schema.json */
test('quote.schema.json validates quote.json v3 (CONTRACT §6) and rejects a broken one', () => {
  const root = mkdtempSync(join(tmpdir(), 'qa-content-'));
  cpSync(join(REPO, 'content'), join(root, 'content'), { recursive: true });
  cpSync(join(REPO, 'media'), join(root, 'media'), { recursive: true });
  mkdirSync(join(root, '.orchestra'));
  cpSync(join(REPO, '.orchestra/url-map.json'), join(root, '.orchestra/url-map.json'));
  const v3 = {
    seo: { title: 'Get a free landscaping quote | RNC Landscaping', description: 'Six short questions, then your email app opens with the request.' }, h1: 'Get a free quote', lede: 'Six short questions.',
    reassurance: ['Free, no obligation', 'We reply within [REPLY TIME]', 'No prices shown here — every quote is site-specific'],
    fields: {
      services: { label: 'What do you need?', help: 'Choose one or more', error: 'Choose at least one service' },
      area: { label: 'Municipality', placeholder: 'Choose your municipality', other: 'Somewhere else in Greater Victoria', error: 'Choose a municipality' },
      details: { label: 'About the property or job', help: 'A few lines', examples: ['Lawn size'], maxLength: 1200, error: 'Tell us a little' },
      timing: { label: 'Timing', options: [{ value: 'asap', label: 'As soon as possible' }, { value: 'this-season', label: 'This season' }, { value: 'planning', label: 'Planning ahead' }] },
      name: { label: 'Your name', error: 'Add your name' },
      contact: { label: 'Best way to reach you', options: [{ value: 'email', label: 'Reply by email' }, { value: 'call', label: 'Call me' }, { value: 'text', label: 'Text me' }], phone: { label: 'Phone number', help: 'Needed for a call or text', error: 'Add a phone number' } },
    },
    subject: 'Free quote request — {services} — {area}',
    buttons: { submit: 'Open my email app', copy: 'Copy request', copied: 'Copied', copyAddress: 'Copy address', restart: 'Start again', gmail: 'Gmail', outlook: 'Outlook.com', call: 'Call', text: 'Text us' },
    messages: { errorSummary: 'Check these', ready: { heading: 'Your email app should have opened', body: 'Did not open?' }, truncated: 'Paste the full text', noJs: 'Send it by email', copyFailed: 'Copy it by hand' },
    nextSteps: [{ title: 'We read it', body: 'And reply.' }], privacy: 'We store nothing.',
  };
  const check = () => run('check-content', [`--root=${root}`, '--rules=schema-v3']);
  writeFileSync(join(root, 'content/pages/quote.json'), JSON.stringify(v3));
  const good = check();
  assert.doesNotMatch(good.out, /pages\/quote\.json/, good.out);
  writeFileSync(join(root, 'content/pages/quote.json'), JSON.stringify({ ...v3, fields: { ...v3.fields, contact: undefined, email: { label: 'Email' } } }));
  const bad = check();
  assert.equal(bad.code, 1);
  assert.match(bad.out, /content\/pages\/quote\.json: .*matches none of the allowed shapes/);
});
