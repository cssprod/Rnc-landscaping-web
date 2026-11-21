// @ts-check
/**
 * Conservative JS minifier for the site's own ES modules. Zero dependencies.
 *
 * It removes comments, indentation, trailing spaces and blank lines, collapses runs of spaces and drops a space next to
 * a bracket or separator (after `( [ { , ;`, before `) ] } , ;`), and nothing else:
 * every line break between tokens is kept, so automatic semicolon insertion and every statement boundary are exactly
 * as written. Strings, template literals (with nested ${\u2026}) and regular-expression literals are copied byte for byte.
 * A comment that sits between two tokens becomes a space (or a line break when it spanned lines).
 *
 * Regex vs division: a `/` starts a regular expression unless the previous token ends an expression (a name, number,
 * string, template, `)` or `]`); after keywords such as `return` or `typeof` it starts one. `--no-minify` turns this off.
 *
 *   minifyJs(src) \u2192 string
 */

const KEYWORD_BEFORE_EXPR = new Set(['return', 'typeof', 'instanceof', 'in', 'of', 'new', 'delete', 'void', 'throw', 'case', 'do', 'else', 'yield', 'await']);
const WORD = /[\w$\u0080-\uffff]/;

/** @param {string} src */
export function minifyJs(src) {
  let out = '';
  let i = 0;
  const n = src.length;
  /** last significant token: 'word:<w>', 'num', 'str', 'tmpl', 're', or 'p:<char>' */
  let prev = '';
  let depth = 0;
  /** @type {number[]} brace depths at which an open ${ \u2026 } substitution closes */
  const tmpl = [];

  // No space after an opening bracket or separator, and none before a closing one: those never merge with a neighbour.
  const space = () => { if (out && !/[ \n([{,;]$/.test(out)) out += ' '; };
  const newline = () => { out = out.replace(/ +$/, ''); if (out && !out.endsWith('\n')) out += '\n'; };

  /** Copy template-literal characters from i (just after ` or }) to the closing ` or the next ${. */
  const templateChars = () => {
    let j = i;
    while (j < n) {
      if (src[j] === '\\') { j += 2; continue; }
      if (src[j] === '`') { out += src.slice(i, j + 1); i = j + 1; prev = 'tmpl'; return; }
      if (src[j] === '$' && src[j + 1] === '{') { out += src.slice(i, j + 2); i = j + 2; tmpl.push(depth); prev = 'p:{'; return; }
      j++;
    }
    throw new Error('minifyJs: unterminated template literal');
  };

  const regexAllowed = () => {
    if (!prev) return true;
    if (prev.startsWith('word:')) return KEYWORD_BEFORE_EXPR.has(prev.slice(5));
    if (prev === 'num' || prev === 'str' || prev === 'tmpl' || prev === 're') return false;
    return prev !== 'p:)' && prev !== 'p:]';
  };

  while (i < n) {
    const c = src[i];
    const d = src[i + 1];
    if (c === '/' && d === '/') {
      const j = src.indexOf('\n', i);
      i = j < 0 ? n : j; // the newline itself is handled as whitespace
      continue;
    }
    if (c === '/' && d === '*') {
      const j = src.indexOf('*/', i + 2);
      if (j < 0) throw new Error('minifyJs: unterminated comment');
      if (src.slice(i, j).includes('\n')) newline(); else space();
      i = j + 2;
      continue;
    }
    if (c === '\n' || c === '\r' || c === ' ' || c === '\t' || c === '\f' || c === '\v' || c === '\u00a0' || c === '\ufeff' || c === '\u2028' || c === '\u2029') {
      let j = i;
      let nl = false;
      while (j < n && /[\s\ufeff]/.test(src[j])) { if (src[j] === '\n' || src[j] === '\r' || src[j] === '\u2028' || src[j] === '\u2029') nl = true; j++; }
      if (nl) newline(); else space();
      i = j;
      continue;
    }
    if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < n && src[j] !== c) { if (src[j] === '\\') j++; else if (src[j] === '\n') throw new Error('minifyJs: unterminated string'); j++; }
      out += src.slice(i, j + 1);
      i = j + 1;
      prev = 'str';
      continue;
    }
    if (c === '`') { out += '`'; i++; templateChars(); continue; }
    if (c === '}' && tmpl.length && tmpl[tmpl.length - 1] === depth) { tmpl.pop(); out += '}'; i++; templateChars(); continue; }
    if (c === '/' && regexAllowed()) {
      let j = i + 1;
      let cls = false;
      while (j < n) {
        const x = src[j];
        if (x === '\\') { j += 2; continue; }
        if (x === '\n') throw new Error(`minifyJs: unterminated regular expression at ${src.slice(i, i + 30)}`);
        if (cls) { if (x === ']') cls = false; } else if (x === '[') cls = true; else if (x === '/') break;
        j++;
      }
      j++;
      while (j < n && /[a-z]/i.test(src[j])) j++; // flags
      out += src.slice(i, j);
      i = j;
      prev = 're';
      continue;
    }
    if (WORD.test(c) || (c === '.' && /\d/.test(d || ''))) {
      let j = i;
      while (j < n && (WORD.test(src[j]) || (src[j] === '.' && /\d/.test(src[i])))) j++;
      const w = src.slice(i, j);
      out += w;
      prev = /^[\d.]/.test(w) ? 'num' : `word:${w}`;
      i = j;
      continue;
    }
    if (c === '{') depth++;
    else if (c === '}') depth--;
    if (')]},;'.includes(c) && out.endsWith(' ')) out = out.slice(0, -1);
    out += c;
    prev = `p:${c}`;
    i++;
  }
  return `${out.replace(/^\n+/, '').replace(/\s+$/, '')}\n`;
}
