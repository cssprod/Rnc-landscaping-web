// @ts-check
/**
 * Tokenizer-aware CSS minifier (CONTRACT §12). Zero dependencies.
 *
 * What it does:
 *   - drops comments (a comment that separates two word characters becomes one space, so `1px/**\/solid` stays two tokens);
 *   - collapses whitespace and removes it where the grammar allows (around `{ } ; ,`, after a declaration colon,
 *     before `!important`, inside `( )`, and around the selector combinators `> + ~`);
 *   - drops the last `;` of a block.
 *
 * What it never touches:
 *   - strings ('…' and "…") and unquoted `url(…)` bodies: copied byte for byte;
 *   - custom-property values (`--x: …`): copied verbatim, only trimmed (the spec trims them too);
 *   - at-rule preludes (`@media`, `@supports`, `@container`, `@layer`, …): whitespace is collapsed to single spaces and
 *     comments dropped, nothing else, so `and`/`or`/`not` and `(a: b)` conditions keep their meaning;
 *   - attribute selectors `[…]`: whitespace collapsed only (so `[a=b i]` keeps its flag);
 *   - empty blocks (an empty `@layer x {}` still declares layer order).
 *
 *   minifyCss(src) → string
 */

/** Characters that continue an identifier or number: a comment between two of them must become a space. */
const WORD = /[\w\-\u0080-\uffff\\]/;

/**
 * Split CSS text into raw pieces: strings, comments, url( … ) bodies and single characters.
 * @param {string} src
 * @returns {{ t: 'str'|'comment'|'url'|'ws'|'ch', v: string }[]}
 */
export function tokenize(src) {
  /** @type {{ t: 'str'|'comment'|'url'|'ws'|'ch', v: string }[]} */
  const out = [];
  let i = 0;
  const n = src.length;
  while (i < n) {
    const c = src[i];
    if (c === '/' && src[i + 1] === '*') {
      const end = src.indexOf('*/', i + 2);
      const j = end < 0 ? n : end + 2;
      out.push({ t: 'comment', v: src.slice(i, j) });
      i = j;
    } else if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < n && src[j] !== c) { if (src[j] === '\\') j++; else if (src[j] === '\n') break; j++; }
      j = Math.min(j + 1, n);
      out.push({ t: 'str', v: src.slice(i, j) });
      i = j;
    } else if (/\s/.test(c)) {
      let j = i + 1;
      while (j < n && /\s/.test(src[j])) j++;
      out.push({ t: 'ws', v: ' ' });
      i = j;
    } else if ((c === 'u' || c === 'U') && /^url\(/i.test(src.slice(i, i + 4)) && (i === 0 || !WORD.test(src[i - 1]))) {
      // url( … ): quoted bodies are ordinary strings; an unquoted body is copied raw up to the closing paren.
      let k = i + 4;
      while (k < n && /\s/.test(src[k])) k++;
      if (src[k] === '"' || src[k] === "'") { out.push({ t: 'ch', v: src.slice(i, i + 4) }); i += 4; continue; }
      let j = k;
      while (j < n && src[j] !== ')') { if (src[j] === '\\') j++; j++; }
      out.push({ t: 'url', v: `url(${src.slice(k, j).trim()})` });
      i = Math.min(j + 1, n);
    } else if (c === '\\') {
      out.push({ t: 'ch', v: src.slice(i, i + 2) });
      i += 2;
    } else {
      out.push({ t: 'ch', v: c });
      i++;
    }
  }
  return out;
}

/** @typedef {ReturnType<typeof tokenize>} Tokens */

/**
 * Join tokens back into text, dropping comments (a comment between two word characters becomes a space)
 * and collapsing whitespace runs to one space.
 * @param {Tokens} toks
 */
function plain(toks) {
  let s = '';
  for (let i = 0; i < toks.length; i++) {
    const tk = toks[i];
    if (tk.t === 'comment') {
      const prev = s[s.length - 1];
      let j = i + 1;
      while (j < toks.length && toks[j].t === 'comment') j++;
      const next = toks[j]?.v[0];
      if (prev && next && WORD.test(prev) && WORD.test(next)) s += ' ';
      continue;
    }
    if (tk.t === 'ws') { if (!s.endsWith(' ')) s += ' '; continue; }
    s += tk.v;
  }
  return s;
}

/**
 * Minify a run of tokens that is not a string/url (a "code" run) with a set of characters around which
 * whitespace may be dropped. Strings and url() bodies pass through untouched.
 * @param {Tokens} toks @param {string} tight characters around which spaces are removed
 * @param {{ parens?: boolean, brackets?: boolean }} [o]
 */
function squeeze(toks, tight, o = {}) {
  // Rebuild as segments: protected (str/url) and code text.
  /** @type {{ p: boolean, v: string }[]} */
  const segs = [];
  /** @type {Tokens} */
  let buf = [];
  const flush = () => { if (buf.length) { segs.push({ p: false, v: plain(buf) }); buf = []; } };
  for (const tk of toks) {
    if (tk.t === 'str' || tk.t === 'url') { flush(); segs.push({ p: true, v: tk.v }); }
    else buf.push(tk);
  }
  flush();
  // Remove whitespace next to tight characters, tracking [ ] depth across segments so attribute selectors stay intact.
  let out = '';
  let bracket = 0;
  for (let si = 0; si < segs.length; si++) {
    const seg = segs[si];
    if (seg.p) { out += seg.v; continue; }
    const v = seg.v;
    for (let i = 0; i < v.length; i++) {
      const c = v[i];
      if (c === '[') bracket++;
      else if (c === ']') bracket = Math.max(0, bracket - 1);
      if (c === ' ') {
        const prev = out[out.length - 1];
        const next = i + 1 < v.length ? v[i + 1] : (segs[si + 1]?.v[0] ?? '');
        if (!prev || !next) continue; // leading or trailing
        if (bracket > 0 && !o.brackets) { out += c; continue; }
        if (tight.includes(prev) || tight.includes(next)) continue;
        if (o.parens && (prev === '(' || next === ')')) continue;
        if (next === '!') continue;
        out += c;
        continue;
      }
      out += c;
    }
  }
  return out.trim();
}

/** @param {Tokens} toks */
const trimWs = (toks) => {
  let a = 0, b = toks.length;
  while (a < b && (toks[a].t === 'ws' || toks[a].t === 'comment')) a++;
  while (b > a && (toks[b - 1].t === 'ws' || toks[b - 1].t === 'comment')) b--;
  return toks.slice(a, b);
};

/** Text of tokens with comments kept (whitespace runs are already single spaces): custom-property values. @param {Tokens} toks */
const verbatim = (toks) => toks.map((t) => t.v).join('');

/** Minify the items of one block (or the whole sheet). @param {Tokens} toks */
function minifyBlock(toks) {
  let i = 0;
  /** @type {string[]} */
  const items = [];

  /** Read one item: returns { kind, prelude tokens, body tokens } */
  const readItem = () => {
    // Skip whitespace and comments.
    while (i < toks.length && (toks[i].t === 'ws' || toks[i].t === 'comment')) i++;
    if (i >= toks.length) return null;
    const start = i;
    // Custom property: --name : value (value may contain any balanced brackets, braces included).
    if (toks[i].t === 'ch' && toks[i].v === '-' && toks[i + 1]?.v === '-') {
      let j = i;
      let name = '';
      while (j < toks.length && toks[j].t === 'ch' && /[\w\-\\\u0080-\uffff]/.test(toks[j].v[0])) { name += toks[j].v; j++; }
      let k = j;
      while (k < toks.length && (toks[k].t === 'ws' || toks[k].t === 'comment')) k++;
      if (toks[k]?.v === ':') {
        let depth = 0;
        let m = k + 1;
        for (; m < toks.length; m++) {
          const v = toks[m].t === 'ch' ? toks[m].v : '';
          if (v === '(' || v === '[' || v === '{') depth++;
          else if (v === ')' || v === ']' || (v === '}' && depth > 0)) depth--;
          else if (depth === 0 && (v === ';' || v === '}')) break;
        }
        const value = verbatim(trimWs(toks.slice(k + 1, m))).trim();
        i = m;
        if (toks[i]?.v === ';') i++;
        return { kind: 'decl', text: `${name}:${value}` };
      }
    }
    // Anything else: scan to the first { ; or } outside parentheses.
    let depth = 0;
    let j = i;
    for (; j < toks.length; j++) {
      const v = toks[j].t === 'ch' ? toks[j].v : '';
      if (v === '(' || v === '[') depth++;
      else if (v === ')' || v === ']') depth = Math.max(0, depth - 1);
      else if (depth === 0 && (v === '{' || v === ';' || v === '}')) break;
    }
    const head = trimWs(toks.slice(start, j));
    const stop = toks[j]?.v;
    if (stop === '{') {
      // Find the matching close brace.
      let d = 1;
      let k = j + 1;
      for (; k < toks.length; k++) {
        if (toks[k].t !== 'ch') continue;
        if (toks[k].v === '{') d++;
        else if (toks[k].v === '}' && --d === 0) break;
      }
      const body = toks.slice(j + 1, k);
      i = k + 1;
      const isAt = head[0]?.v === '@';
      const prelude = isAt ? atPrelude(head) : selector(head);
      return { kind: 'block', text: `${prelude}{${minifyBlock(body)}}` };
    }
    // Declaration or at-statement, ended by ; or } or end of input (a stray } is consumed).
    i = stop === ';' || stop === '}' ? j + 1 : j;
    if (!head.length) return { kind: 'skip', text: '' };
    if (head[0].v === '@') return { kind: 'stmt', text: atPrelude(head) };
    return { kind: 'decl', text: declaration(head) };
  };

  for (;;) {
    const it = readItem();
    if (!it) break;
    if (it.kind === 'skip') continue;
    items.push(it.kind === 'block' ? it.text : `${it.text};`);
  }
  // Drop the semicolon after the last item of the block.
  const s = items.join('');
  return s.endsWith(';') ? s.slice(0, -1) : s;
}

/** @param {Tokens} head */
function atPrelude(head) {
  const s = plain(head).trim();
  // @layer a, b, c → @layer a,b,c (a list of names, never a condition).
  if (/^@layer\b/i.test(s)) return s.replace(/\s*,\s*/g, ',');
  // Other preludes keep their spacing (conditions are left intact).
  return s;
}

/** @param {Tokens} head */
function selector(head) {
  return squeeze(head, ',>+~{}', { parens: true });
}

/** @param {Tokens} head */
function declaration(head) {
  // Split at the first colon outside strings/parens.
  let k = -1;
  for (let j = 0, depth = 0; j < head.length; j++) {
    const v = head[j].t === 'ch' ? head[j].v : '';
    if (v === '(') depth++;
    else if (v === ')') depth--;
    else if (v === ':' && depth === 0) { k = j; break; }
  }
  if (k < 0) return squeeze(head, ',', { parens: true });
  const prop = plain(trimWs(head.slice(0, k))).trim();
  const value = squeeze(trimWs(head.slice(k + 1)), ',', { parens: true });
  return `${prop}:${value.replace(/\s*!\s*important$/i, '!important')}`;
}

/**
 * Minify a stylesheet.
 * @param {string} src
 * @returns {string}
 */
export function minifyCss(src) {
  return minifyBlock(tokenize(src));
}
