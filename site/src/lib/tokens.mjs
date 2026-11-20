// @ts-check
/**
 * Bracket-token handling, applied to every generated file after rendering.
 * - Known values from site.config.mjs are substituted everywhere.
 * - Unresolved tokens: staging wraps text occurrences in <mark class="ph">;
 *   production records them so the build fails with a list.
 */
import { esc } from './html.mjs';
import { tokens } from '../../site.config.mjs';

export const TOKEN_NAMES = Object.keys(tokens);
export const TOKEN_RE = new RegExp(`\\[(${TOKEN_NAMES.map((t) => t.replace(/ /g, ' ')).join('|')})\\]`, 'g');

/** Value for attributes/plain text: real value or the literal token. @param {keyof typeof tokens} name */
export const tok = (name) => tokens[name] ?? `[${name}]`;

/** Digits-only tel: target. */
export const telHref = () => (tokens.PHONE ? `tel:${tokens.PHONE.replace(/[^\d+]/g, '')}` : 'tel:[PHONE]');

const SKIP = /(<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<title>[\s\S]*?<\/title>|<textarea[\s\S]*?<\/textarea>|<option[\s\S]*?<\/option>|<!--[\s\S]*?-->|<[^>]+>)/;

/**
 * @param {string} text file content
 * @param {{ production: boolean, file: string, issues: string[], html: boolean }} ctx
 */
export function finalizeTokens(text, ctx) {
  // 1. substitute resolved values (escaped for HTML)
  let s = text.replace(TOKEN_RE, (m, name) => {
    const v = tokens[/** @type {keyof typeof tokens} */ (name)];
    return v == null ? m : ctx.html ? esc(v) : v;
  });
  // 2. report / highlight unresolved
  const left = [...s.matchAll(TOKEN_RE)].map((m) => m[0]);
  if (left.length) {
    const counts = left.reduce((a, t) => ((a[t] = (a[t] || 0) + 1), a), /** @type {Record<string,number>} */ ({}));
    if (ctx.production) for (const t of Object.keys(counts)) ctx.issues.push(`unresolved token ${t} in ${ctx.file}`);
    if (ctx.html && !ctx.production) {
      s = s.split(SKIP).map((part, i) => (i % 2 === 1 ? part : part.replace(TOKEN_RE, (m) => `<mark class="ph" title="Placeholder: RNC to supply">${m}</mark>`))).join('');
    }
  }
  return s;
}
