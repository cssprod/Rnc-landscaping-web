// @ts-check
/**
 * Sprite tree-shaking. Every page carries one inline <svg class="sprite"> (components/sprite.mjs) holding all symbols;
 * this keeps only the <symbol>s the page references (via href="#id" / url(#id)), plus the <defs> children those
 * symbols need. Ids are namespaced: icons are i-*, the logo and its paint servers logo-*.
 *
 *   shakeSprite(html) → { html, kept: string[], dropped: string[] }
 */

const SPRITE = /<svg class="sprite"[^>]*>([\s\S]*?)<\/svg>/;

/** Ids referenced by href="#x", xlink:href="#x" or url(#x). @param {string} s */
const refs = (s) => new Set([...s.matchAll(/(?:href="#|url\(#)([\w-]+)/g)].map((m) => m[1]));

/**
 * Split the sprite body into its top-level elements (<defs>…</defs>, <symbol>…</symbol>).
 * @param {string} body
 */
function parts(body) {
  /** @type {{ tag: string, id: string|null, text: string }[]} */
  const out = [];
  const re = /<(defs|symbol)\b([^>]*)>([\s\S]*?)<\/\1>/g;
  let m;
  while ((m = re.exec(body))) out.push({ tag: m[1], id: (m[2].match(/\bid="([^"]+)"/) || [])[1] || null, text: m[0] });
  return out;
}

/** @param {string} html */
export function shakeSprite(html) {
  const m = html.match(SPRITE);
  if (!m || m.index === undefined) return { html, kept: [], dropped: [] };
  const before = html.slice(0, m.index);
  const after = html.slice(m.index + m[0].length);
  const open = m[0].slice(0, m[0].indexOf('>') + 1);
  const items = parts(m[1]);
  const symbols = items.filter((p) => p.tag === 'symbol');
  const defs = items.filter((p) => p.tag === 'defs');
  // Paint servers / clip paths inside <defs>, one entry per id.
  /** @type {{ id: string, text: string }[]} */
  const defItems = [];
  for (const d of defs) {
    const inner = d.text.replace(/^<defs\b[^>]*>|<\/defs>$/g, '');
    for (const x of inner.matchAll(/<(\w+)\b[^>]*\bid="([^"]+)"[^>]*?(?:\/>|>[\s\S]*?<\/\1>)/g)) defItems.push({ id: x[2], text: x[0] });
  }
  // Work out what the page uses, following symbol → symbol/def references to a fixed point.
  const need = refs(before + after);
  let grew = true;
  while (grew) {
    grew = false;
    for (const s of [...symbols, ...defItems]) {
      if (!s.id || !need.has(s.id)) continue;
      for (const r of refs(s.text)) if (!need.has(r)) { need.add(r); grew = true; }
    }
  }
  const keptSyms = symbols.filter((s) => s.id && need.has(s.id));
  const keptDefs = defItems.filter((d) => need.has(d.id));
  const body = `${keptDefs.length ? `<defs>${keptDefs.map((d) => d.text).join('')}</defs>` : ''}${keptSyms.map((s) => s.text).join('')}`;
  return {
    html: `${before}${open}${body}</svg>${after}`,
    kept: keptSyms.map((s) => /** @type {string} */ (s.id)),
    dropped: symbols.filter((s) => !s.id || !need.has(s.id)).map((s) => String(s.id)),
  };
}
