// @ts-check
/**
 * Tiny escaping tagged-template engine. Interpolated values are HTML-escaped
 * unless wrapped with raw() or produced by html``. Arrays are joined.
 * (Astro port: these become .astro components; html`` maps to JSX-like markup.)
 */

export class Safe {
  /** @param {string} s */
  constructor(s) { this.s = s; }
  toString() { return this.s; }
}

/** @param {unknown} s */
export const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => /** @type {Record<string,string>} */ ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/** @param {unknown} s */
export const raw = (s) => new Safe(String(s ?? ''));

/** @param {unknown} v @returns {string} */
function out(v) {
  if (v == null || v === false || v === true) return '';
  if (Array.isArray(v)) return v.map(out).join('');
  if (v instanceof Safe) return v.s;
  return esc(v);
}

/**
 * @param {TemplateStringsArray} strings
 * @param {...unknown} vals
 */
export function html(strings, ...vals) {
  let s = strings[0];
  for (let i = 0; i < vals.length; i++) s += out(vals[i]) + strings[i + 1];
  return new Safe(s);
}

/**
 * Inline Markdown subset used by content: [text](/path/) links and **bold**.
 * @param {string} text
 */
export function md(text) {
  let s = esc(text ?? '');
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, t, href) => {
    const ext = /^https?:/.test(href);
    return `<a href="${href}"${ext ? ' rel="noopener"' : ''}>${t}</a>`;
  });
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  return new Safe(s);
}

/** @param {string[]|string|undefined} paras */
export const paras = (paras) => (Array.isArray(paras) ? paras : paras ? [paras] : []).map((p) => html`<p>${md(p)}</p>`);

/** @param {string} s */
export const slugify = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
