// @ts-check
/**
 * Component API snapshot (C3.6, CONTRACT §10), written by W1 ia from site/COMPONENTS.md.
 * APPEND-ONLY in every wave (.orchestra/tools/ownership.mjs fails on a deleted or changed line): a new export or a new
 * optional parameter is a new api(...) line at the END of this file. Never edit or remove a line.
 *   api(module, exportName, positionalParams | null, optionKeys)
 * Each entry fails when the export disappears, a positional parameter is renamed or dropped, or an option key is no
 * longer read by the function (its source) or documented on it (the JSDoc right above the export).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = new URL('../../src/components/', import.meta.url);

/** Names of a function's declared parameters, in order. @param {Function} fn */
function paramNames(fn) {
  const src = fn.toString();
  const open = src.indexOf('(');
  let depth = 0, end = open;
  for (let i = open; i < src.length; i++) {
    if ('([{'.includes(src[i])) depth++;
    else if (')]}'.includes(src[i]) && --depth === 0) { end = i; break; }
  }
  /** @type {string[]} */ const out = [];
  let cur = '', d = 0;
  for (const ch of src.slice(open + 1, end)) {
    if ('([{'.includes(ch)) d++;
    if (')]}'.includes(ch)) d--;
    if (ch === ',' && d === 0) { out.push(cur); cur = ''; } else cur += ch;
  }
  if (cur.trim()) out.push(cur);
  return out.map((p) => p.split('=')[0].replace(/\/\*[\s\S]*?\*\//g, '').trim()).filter(Boolean);
}

/** JSDoc block directly above `export … name`. @param {string} text @param {string} name */
function docFor(text, name) {
  const at = text.search(new RegExp(`export\\s+(?:async\\s+)?(?:function|const|let|class)\\s+${name}\\b`));
  if (at < 0) return '';
  const before = text.slice(0, at);
  const start = before.lastIndexOf('/**');
  return start >= 0 && !before.slice(start).includes('export ') ? before.slice(start) : '';
}

/**
 * One API entry.
 * @param {string} module path under src/components/ @param {string} name export
 * @param {string[]|null} params positional parameter names (null: not a function) @param {string[]} [keys] option keys
 */
function api(module, name, params, keys = []) {
  test(`${module} exports ${name}(${params ? params.join(', ') : ''})${keys.length ? ` with ${keys.join(', ')}` : ''} #inventory`, async () => {
    const mod = await import(new URL(module, ROOT).href);
    assert.ok(name in mod, `${module} no longer exports ${name}`);
    const v = mod[name];
    if (params) {
      assert.equal(typeof v, 'function', `${name} is not a function`);
      const got = paramNames(v);
      assert.deepEqual(got.slice(0, params.length), params, `${name} parameters changed (only additive optional parameters are allowed)`);
      const text = readFileSync(fileURLToPath(new URL(module, ROOT)), 'utf8');
      const hay = `${v.toString()}\n${docFor(text, name)}`;
      for (const k of keys) assert.ok(new RegExp(`\\b${k}\\b`).test(hay), `${name}: option "${k}" is no longer read or documented`);
    } else assert.ok(v !== undefined && v !== null, `${name} is empty`);
  });
}

/** Every ui/* export is re-exported by ui/index.mjs (frozen after W1). */
test('ui/index.mjs re-exports every ui module #inventory', async () => {
  const index = await import(new URL('ui/index.mjs', ROOT).href);
  for (const m of ['actions', 'heads', 'cards', 'projects', 'trust', 'faq', 'cta', 'seasons', 'callouts']) {
    const mod = await import(new URL(`ui/${m}.mjs`, ROOT).href);
    for (const k of Object.keys(mod)) assert.equal(index[k], mod[k], `ui/index.mjs is missing ${k} from ui/${m}.mjs`);
  }
});

/* ---- entries (append below; never edit or delete a line) ---- */
api('ui/actions.mjs', 'sampleLabel', []);
api('ui/actions.mjs', 'serviceIcon', ['slug']);
api('ui/actions.mjs', 'quoteBtn', [], ['tone', 'size']);
api('ui/actions.mjs', 'secondaryBtn', ['location'], ['tone', 'size']);
api('ui/actions.mjs', 'linkMore', ['href', 'label']);
api('ui/actions.mjs', 'chips', ['links']);
api('ui/heads.mjs', 'hero', ['p'], ['h1', 'lede', 'image', 'ctas', 'variant', 'dock', 'extra']);
api('ui/heads.mjs', 'pageHead', ['p'], ['h1', 'lede', 'extra', 'className']);
api('ui/heads.mjs', 'sectionHead', ['p'], ['id', 'title', 'lede', 'link', 'level']);
api('ui/heads.mjs', 'sections', ['list'], ['level', 'tone', 'id', 'heading', 'body', 'items']);
api('ui/cards.mjs', 'featureBento', ['p'], ['id', 'heading', 'lede', 'items', 'icons', 'link']);
api('ui/cards.mjs', 'serviceTiles', ['data'], ['heading', 'lede', 'id', 'link']);
api('ui/projects.mjs', 'projectCard', ['data', 'p'], ['headingLevel']);
api('ui/projects.mjs', 'projectGrid', ['data', 'projects'], ['filters', 'headingLevel']);
api('ui/projects.mjs', 'beforeAfter', ['before', 'after', 'label']);
api('ui/trust.mjs', 'testimonials', ['data', 'list'], ['heading', 'lede', 'id', 'link']);
api('ui/trust.mjs', 'trustBand', []);
api('ui/faq.mjs', 'faqList', [], ['heading', 'id', 'lede']);
api('ui/cta.mjs', 'ctaBand', [], ['heading', 'body', 'secondary', 'image']);
api('ui/cta.mjs', 'contactCards', []);
api('ui/seasons.mjs', 'seasons', ['list']);
api('layout.mjs', 'layout', ['env', 'p'], ['path', 'title', 'description', 'crumbs', 'body', 'jsonld', 'ogImage', 'ogType', 'bodyClass', 'noindex', 'hero', 'scripts']);
api('layout.mjs', 'breadcrumbNav', ['crumbs']);
api('layout.mjs', 'JS_FLAG', null);
api('sprite.mjs', 'icon', ['name'], ['size', 'className']);
api('sprite.mjs', 'logo', []);
api('sprite.mjs', 'sprite', []);
api('sprite.mjs', 'SERVICE_ICON', null);
api('sprite.mjs', 'SEASON_ICON', null);
api('map.mjs', 'areaMap', ['data'], ['id', 'heading', 'lede', 'current']);
api('forms.mjs', 'quoteForm', ['data', 'page']);
api('living.mjs', 'livingScene', ['sceneId'], ['variant', 'aspect', 'priority', 'label']);
api('living.mjs', 'projectArt', ['project'], ['aspect', 'variant']);
api('living.mjs', 'illustrationChip', []);
/* W2 ds-comp: the C3 primitives and the additive optional parameters (site/COMPONENTS.md "New primitives"). */
api('ui/actions.mjs', 'sampleLabel', ['noun']);
api('ui/actions.mjs', 'callBtn', ['location'], ['tone', 'size', 'label']);
api('ui/actions.mjs', 'contactLinks', ['location'], ['sms', 'email']);
api('ui/heads.mjs', 'hero', ['p'], ['layout', 'scene', 'proof']);
api('ui/heads.mjs', 'sectionHead', ['p'], ['index', 'eyebrow', 'reveal']);
api('ui/heads.mjs', 'inPageToc', ['items'], ['label']);
api('ui/cards.mjs', 'bento', ['items'], ['id', 'heading', 'lede', 'index', 'eyebrow', 'link', 'level', 'layout', 'reveal']);
api('ui/cards.mjs', 'bentoCard', ['item'], ['headingLevel', 'title', 'body', 'href', 'icon', 'scene', 'tone', 'span', 'extra']);
api('ui/projects.mjs', 'beforeAfter', ['before', 'after', 'label', 'o'], ['toggle', 'id']);
api('ui/projects.mjs', 'specStrip', ['items'], ['id', 'compact']);
api('ui/projects.mjs', 'plantPalette', ['list'], ['sample', 'headingLevel', 'id']);
api('ui/trust.mjs', 'reviewCard', ['t'], ['headingLevel']);
api('ui/trust.mjs', 'reviewsBand', ['data', 'list'], ['id', 'heading', 'lede', 'index', 'eyebrow']);
api('ui/trust.mjs', 'credentialsRow', [], ['id', 'items', 'label']);
api('ui/faq.mjs', 'faqList', [], ['level']);
api('ui/cta.mjs', 'ctaBand', [], ['id', 'living', 'reply']);
api('ui/cta.mjs', 'contactFallback', [], ['id', 'heading', 'location', 'level']);
api('ui/seasons.mjs', 'timeline', ['steps'], ['id', 'heading', 'lede', 'orientation', 'index', 'eyebrow', 'level', 'headingLevel', 'reveal']);
api('ui/seasons.mjs', 'perVisitTable', ['t'], ['id']);
api('ui/callouts.mjs', 'localRulesCallout', ['rules'], ['id', 'heading', 'area', 'level']);
api('ui/callouts.mjs', 'sharedRegional', ['blocks'], ['id', 'heading', 'level']);
api('ui/callouts.mjs', 'conditionsList', ['list'], ['id', 'heading', 'level']);
api('ui/callouts.mjs', 'sourceChip', ['url', 'label']);
api('ui/callouts.mjs', 'reviewedOn', ['iso']);
api('ui/callouts.mjs', 'guarantee', [], ['id', 'heading', 'body', 'level']);
api('ui/callouts.mjs', 'reassuranceStrip', ['items']);
api('ui/cards.mjs', 'bentoCard', ['item'], ['reveal']);
