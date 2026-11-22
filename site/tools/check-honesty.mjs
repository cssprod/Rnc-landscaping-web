#!/usr/bin/env node
// @ts-check
/**
 * Honesty checks (CONTRACT §2 hard rules, §3, §7; blueprint A12 #4–5, A13 #12, #24, C3.4, C5 "trust without prices",
 * P1 #8). Offline: reads the built pages (SITE_DIST) plus content/site.json, content/testimonials, content/pages/
 * commercial.json and media/images.json from the repository (--root=DIR for a scratch copy). Exits 0 with no build.
 *
 * Rules:
 *   unverifiable-claims            no superlative RNC cannot prove ("best landscaper", "#1", "award-winning", "leading",
 *                                  "top-rated"…), no years-in-business claim (visible [FOUNDED], "since 1998", "20 years
 *                                  of experience"), no invented business numbers ("over 500 clients", "98% satisfaction",
 *                                  star ratings) and no counters or tickers (data-count*, .counter, .ticker).
 *   spelling                       Canadian English (colour, centre, neighbour, grey, catalogue, defence, mould, travelled
 *                                  …), a list of common typos, doubled words and stray punctuation (" ." "..").
 *   no-stock-people                a stock photo never stands for the owner or crew: about-owner and about-crew carry no
 *                                  stock, and no page shows a stock slot whose subject is a person (landscaper, crew,
 *                                  worker, owner, team…). Checked on the slots a page uses, so offline builds count too.
 *   commercial-proof               content/pages/commercial.json carries a commitments section of at least 3 concrete
 *                                  items (no adjective-only titles such as "Quality" or "Reliable"), no number outside a
 *                                  [TOKEN] except the 13 municipalities, and no past-client boasts ("trusted by", "clients
 *                                  include", "hundreds of").
 *   stock-in-projects              no stock photo under /projects/: no external image URL and no slot with stock on any
 *                                  /projects/ page (CONTRACT §2, §7; living art or "Photo to come" only).
 *   trust-without-prices           no prices anywhere ($ amounts, "per hour" rates, "starting at", JSON-LD price,
 *                                  priceRange or offers), and the trust that replaces them is shown: /free-quote/ promises a
 *                                  reply ("reply within …"), says the quote is free or without obligation and lists what
 *                                  happens next; /contact/ and every CTA band promise the reply time.
 *   reviews-credentials-guarantee  no Review, AggregateRating or rating markup; every quote on a page is a testimonial
 *                                  from content/testimonials and a sample one carries a visible "Sample" label in its
 *                                  card; /reviews/ points to the Google reviews; credentials rows show each credential's
 *                                  token or value; no credential claim ("fully insured", "licensed and bonded") while
 *                                  that credential is unresolved; a workmanship guarantee is shown with [WARRANTY] (or its
 *                                  value) and never as "money-back", "lifetime" or "100 % satisfaction".
 * Failures name the built page (dist-relative) or the content file.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { DIST, REPO, files, read, report } from './lib.mjs';

export const RULES = ['unverifiable-claims', 'spelling', 'no-stock-people', 'commercial-proof', 'stock-in-projects',
  'trust-without-prices', 'reviews-credentials-guarantee'];

const argv = process.argv.slice(2);
const ROOT = argv.find((a) => a.startsWith('--root='))?.slice(7) || REPO;
/** @type {import('./lib.mjs').Failure[]} */
const failures = [];
const fail = (/** @type {string} */ rule, /** @type {string} */ path, /** @type {string} */ message) => failures.push({ rule, path, message });
const json = (/** @type {string} */ f) => { try { return JSON.parse(readFileSync(join(ROOT, f), 'utf8')); } catch { return null; } };

/* ------------------------------------------------------------------ text helpers */
const ENT = /** @type {Record<string, string>} */ ({ amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', mdash: '—', ndash: '–', hellip: '…', middot: '·' });
const decode = (/** @type {string} */ s) => s.replace(/&(#x[\da-f]+|#\d+|\w+);/gi, (m, e) => (e[0] === '#' ? String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : Number(e.slice(1))) : ENT[e.toLowerCase()] ?? m));
const INLINE = 'a|abbr|b|bdi|bdo|cite|code|data|dfn|em|i|kbd|mark|q|s|samp|small|span|strong|sub|sup|time|u|var|wbr';
/** Visible text of an HTML fragment: no scripts, styles, SVG or templates; inline tags join words, block tags break them. @param {string} h */
export function visibleText(h) {
  return decode(h.replace(/<!--[\s\S]*?-->/g, '').replace(/<(script|style|svg|template)\b[\s\S]*?<\/\1>/gi, ' ')
    .replace(new RegExp(`</?(?:${INLINE})\\b[^>]*>`, 'gi'), '').replace(/<[^>]+>/g, ' ')).replace(/[ \t\r\n ]+/g, ' ').trim();
}
const norm = (/** @type {string} */ s) => decode(s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
/** A short quotation of the match for the message. @param {string} t @param {number} i @param {number} n */
const around = (t, i, n) => `"…${t.slice(Math.max(0, i - 40), i + n + 40).trim()}…"`;

/* ------------------------------------------------------------------ patterns */
const SUPERLATIVE = [
  /\b(?:the\s+)?(?:best|top|leading|premier|number[- ]one|no\.\s?1|#\s?1)\s+(?:landscap\w*|lawn\w*|garden\w*|irrigation\s+\w+|tree\s+(?:service|care|company)|company|companies|contractors?|crews?|teams?|choice|provider|service\s+provider|in\s+(?:greater\s+)?victoria|in\s+(?:the\s+)?(?:region|town|city|bc|province|business))\b/i,
  /#\s?1\b/, /\baward[- ]winning\b/i, /\btop[- ]rated\b/i, /\bhighest[- ]rated\b/i, /\bunbeatable\b/i, /\bunmatched\b/i, /\bunrivall?ed\b/i,
  /\bsecond to none\b/i, /\bworld[- ]class\b/i, /\bmost trusted\b/i, /\b(?:victoria|greater victoria)[’']s\s+(?:best|favou?rite|leading|top)\b/i,
  /\bbest[- ]in[- ](?:class|town|victoria)\b/i, /\bguaranteed\s+(?:best|lowest)\b/i, /\bcheapest\b/i, /\blowest\s+prices?\b/i,
];
const YEARS = [
  /\[FOUNDED\]/, /\bsince\s+(?:19|20)\d{2}\b/i, /\b(?:founded|established|est\.)\s+(?:in\s+)?(?:19|20)\d{2}\b/i,
  /\b\d+\+?\s+years?\s+(?:of\s+)?(?:experience|in\s+(?:the\s+)?business|serving|of\s+service|in\s+the\s+industry)\b/i,
  /\b(?:decades?|generations?)\s+of\s+(?:experience|service)\b/i, /\bfamily[- ]owned\s+(?:and\s+operated\s+)?since\b/i,
];
const NUMBERS = [
  /\b(?:over|more than|nearly|almost)\s+[\d,]+\+?\s+(?:happy\s+|satisfied\s+)?(?:clients|customers|projects|properties|homes|jobs|sites|reviews|lawns|gardens|trees)\b/i,
  /\b[\d,]+\+\s+(?:happy\s+|satisfied\s+)?(?:clients|customers|projects|properties|homes|jobs|sites|reviews|lawns|gardens|trees|years)\b/i,
  /\b[\d,]+\s+(?:happy|satisfied)\s+(?:clients|customers)\b/i, /\b\d{1,3}(?:\.\d+)?\s?%\s+(?:satisfaction|of\s+(?:our\s+)?(?:clients|customers)|customer|client|on[- ]time|repeat)\b/i,
  /\b[1-5](?:\.\d)?\s*(?:\/\s*5\s*)?(?:stars?|★)/i, /★{3,}/,
];
/** US spellings → Canadian. Word-boundary, case-insensitive; proper names in ALLOW are skipped. */
const US = /** @type {[RegExp, string][]} */ ([
  [/\bcolor(s|ed|ful|ing|ation)?\b/i, 'colour'], [/\bfavor(s|ed|ing|ite|ites|able)?\b/i, 'favour'], [/\bneighbor(s|hood|hoods|ing|ly)?\b/i, 'neighbour'],
  [/\bhonor(s|ed|ing|able)?\b/i, 'honour'], [/\blabor(s|ed|ing|er|ers)?\b/i, 'labour'], [/\bbehavior(s|al)?\b/i, 'behaviour'], [/\bharbor(s)?\b/i, 'harbour'],
  [/\bflavor(s|ed|ful)?\b/i, 'flavour'], [/\brumor(s)?\b/i, 'rumour'], [/\bvigor\b/i, 'vigour'], [/\bendeavor(s|ed)?\b/i, 'endeavour'], [/\bsavor(s|y)?\b/i, 'savour'],
  [/\bcenter(s|ed|ing)?\b/i, 'centre'], [/\btheater(s)?\b/i, 'theatre'], [/\bfiber(s|glass)?\b/i, 'fibre'], [/\bliter(s)?\b/i, 'litre'], [/\b\d[\d.,]*\s*meters?\b|\bmeters?\b(?=\s+(?:long|wide|high|deep|tall|apart|away|square|squared)\b)/i, 'metre (a length; "meter" is the device)'],
  [/\b(?:kilo|centi|milli)meters?\b/i, '-metre'], [/\bgray(s|er|ish)?\b/i, 'grey'], [/\bcatalog(s|ed)?\b/i, 'catalogue'], [/\bdefense\b/i, 'defence'], [/\boffense\b/i, 'offence'],
  [/\bmold(s|y|ed|ing)?\b/i, 'mould'], [/\b(travel|cancel|label|model|fuel|level|signal|channel|tunnel|total)(ed|ing)\b/i, 'double the l (travelled, labelled, …)'],
  [/\bjewelry\b/i, 'jewellery'], [/\bfulfill(ment|s)?\b/i, 'fulfil'], [/\benroll(ment|s)?\b/i, 'enrol'], [/\bskillful(ly)?\b/i, 'skilful'], [/\bplow(s|ed|ing)?\b/i, 'plough'],
  [/\banalog\b/i, 'analogue'], [/\bdialog\b/i, 'dialogue'], [/\bcheck(s)?\b(?=\s+(?:payable|or\s+cash|by\s+mail))/i, 'cheque'], [/\bmanoeuver|\bmaneuver(s|ed|ing)?\b/i, 'manoeuvre'],
]);
const TYPOS = /\b(recieve\w*|seperat\w*|occured|occuring|accomodat\w*|definately|untill|wich|teh|alot|existance|maintainance|maintenence|maintanence|irigation|irrigaton|landscapping|landscapeing|awlays|alwasy|comanies|custoom|carpenty|reccomend\w*|recomend\w*|guarentee\w*|garantee\w*|neccessar\w*|occassion\w*|wierd|thier|truely|arborest\w*|perenial\w*|hedgeing|pruneing|mulchs|shurbs?|shrubery|untill|enviroment\w*|goverment\w*|commited|committment|publically|seperately|refered|liason|independant)\b/i;
const DOUBLED = /\b(the|a|an|and|or|of|to|in|on|for|with|is|are|be|we|you|our|your|it|this|at|by|as|from)\s+\1\b/i;
const VAGUE = /^(?:quality|high quality|reliable|reliability|professional(?:ism)?|excellence|trusted|trust|experienced|experience|dedicated|passionate|world[- ]class|premium|best[- ]in[- ]class|peace of mind|integrity|value|great service|customer service|satisfaction)$/i;
const PEOPLE = /\b(landscapers?|gardeners?|arborists?|crews?|teams?|workers?|worker|staff|employees?|owners?|foreman|labou?rers?|person|people|man|men|woman|women|someone|technicians?|operators?|installers?|contractors?)\b/i;
const CRED_CLAIM = /** @type {[RegExp, string][]} */ ([
  [/\bfully\s+insured\b|\binsured\s+(?:and|&)\s+bonded\b|\bbonded\s+(?:and|&)\s+insured\b|\b(?:licen[cs]ed|bonded)\s+(?:and|&|,)\s+insured\b|\bwe\s+are\s+(?:fully\s+)?insured\b/i, 'LIABILITY LIMIT'],
  [/\b(?:fully\s+)?licen[cs]ed\s+(?:and|&|,)\s+(?:bonded|insured)\b|\bwe\s+are\s+(?:fully\s+)?licen[cs]ed\b/i, 'LICENCES'],
  [/\b(?:our|we\s+have|we\s+are)\s+(?:an?\s+)?(?:ISA[- ])?certified\b|\bred\s+seal\b|\bcertified\s+(?:crews?|team|staff)\b/i, 'CERTIFICATIONS'],
  [/\bBBB\b|\bA\+\s+rating\b|\baccredited\s+business\b/i, 'MEMBERSHIPS'],
  [/\bWorkSafeBC[- ](?:covered|registered|compliant)\b|\bcovered\s+by\s+WorkSafeBC\b/i, 'WORKSAFEBC STATUS'],
]);

/* ------------------------------------------------------------------ inputs */
const site = json('content/site.json') || { tokens: {}, credentials: [] };
const tokens = site.tokens || {};
const resolved = (/** @type {string} */ k) => tokens[k] !== null && tokens[k] !== undefined && tokens[k] !== '';
const imageList = json('media/images.json') || json('site/fixtures/media/images.json') || [];
const slots = new Map((Array.isArray(imageList) ? imageList : []).map((/** @type {any} */ s) => [s.id, s]));
const hasStock = (/** @type {any} */ s) => !!(s && s.stock && (s.stock.imageUrl || s.stock.pageUrl || s.stock.provider));
const tDir = join(ROOT, 'content', 'testimonials');
const testimonials = existsSync(tDir) ? readdirSync(tDir).filter((f) => f.endsWith('.json')).map((f) => json(`content/testimonials/${f}`)).filter(Boolean) : [];

/* ------------------------------------------------------------------ source checks */
for (const id of ['about-owner', 'about-crew']) if (hasStock(slots.get(id))) fail('no-stock-people', 'media/images.json', `slot "${id}" has a stock photo: the owner and crew are never shown by stock (CONTRACT §7)`);

const commercial = json('content/pages/commercial.json');
if (commercial) {
  const path = 'content/pages/commercial.json';
  const sections = Array.isArray(commercial.sections) ? commercial.sections : [];
  const commit = sections.find((/** @type {any} */ s) => /commit|expect|guarantee|standards|promise/i.test(`${s.id || ''} ${s.heading || ''}`));
  if (!commit) fail('commercial-proof', path, 'no commitments section ("What you can expect"): commercial proof is concrete operational commitments (A12 #5)');
  else if ((commit.items || []).length < 3) fail('commercial-proof', path, `the commitments section "${commit.heading}" has ${(commit.items || []).length} item(s); it needs at least 3 concrete commitments`);
  for (const s of sections) for (const it of s.items || []) if (VAGUE.test(String(it.title || '').trim().replace(/[.!]$/, ''))) fail('commercial-proof', path, `item "${it.title}" in "${s.heading}" is an adjective, not a commitment: say what the buyer gets`);
  const strings = [];
  const walk = (/** @type {any} */ v, /** @type {string} */ at) => { if (typeof v === 'string') strings.push([at, v]); else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) if (k !== '_notes' && k !== 'seo') walk(x, at ? `${at}.${k}` : k); };
  walk(commercial, '');
  for (const [at, v] of strings) {
    const plain = v.replace(/\[[A-Z][A-Z ]*\]/g, ' ').replace(/\]\([^)]*\)/g, ']').replace(/\b13\s+(?:Greater Victoria\s+)?municipalit(?:y|ies)\b/gi, ' ').replace(/\/[\w/.-]+/g, ' ');
    const m = plain.match(/\d[\d,.]*\s*(?:%|\+|\w+)?/);
    if (m) fail('commercial-proof', path, `${at}: the number "${m[0].trim()}" is not a [TOKEN]; commercial proof carries no invented figures`);
    const boast = v.match(/\btrusted by\b|\bclients include\b|\bhundreds of\b|\bthousands of\b|\bdozens of\b|\bcountless\b|\bwe(?:’|')ve served\b|\bour (?:many|numerous) clients\b/i);
    if (boast) fail('commercial-proof', path, `${at}: "${boast[0]}" claims past results; use commitments about how the work is run`);
  }
}

/* ------------------------------------------------------------------ built pages */
const pages = existsSync(DIST) ? files('.html') : [];
for (const f of pages) {
  const html = read(f);
  const body = html.replace(/<head\b[\s\S]*?<\/head>/i, '');
  const text = visibleText(body);
  const isProject = f.startsWith('projects/');

  /* unverifiable-claims */
  for (const re of [...SUPERLATIVE, ...YEARS, ...NUMBERS]) { const m = re.exec(text); if (m) fail('unverifiable-claims', f, `${m[0]}: ${around(text, m.index, m[0].length)} (only claim what can be verified; no superlatives, years in business or invented numbers)`); }
  const counter = body.match(/<[^>]+(?:\sdata-(?:count|counter|count-to|countup|ticker)\b|\sclass="[^"]*\b(?:counter|count-up|countup|ticker|odometer|stat-counter)\b)[^>]*>/i);
  if (counter) fail('unverifiable-claims', f, `counter/ticker markup: ${counter[0].slice(0, 90)} (no counters or tickers)`);

  /* spelling */
  const prose = text.replace(/\b[\w.-]+\.(?:ca|com|org|net|gov|bc\.ca)\b\S*/gi, ' ').replace(/https?:\/\/\S+/g, ' ');
  for (const [re, fix] of US) { const m = re.exec(prose); if (m) fail('spelling', f, `"${m[0]}" → ${fix} (Canadian English): ${around(prose, m.index, m[0].length)}`); }
  const typo = TYPOS.exec(prose); if (typo) fail('spelling', f, `typo "${typo[0]}": ${around(prose, typo.index, typo[0].length)}`);
  const dbl = DOUBLED.exec(prose); if (dbl) fail('spelling', f, `doubled word "${dbl[0]}": ${around(prose, dbl.index, dbl[0].length)}`);
  const stray = /\w\s+[.,;:](?=\s|$)|(?<!\.)\.\.(?!\.)|[,;:]\s*[.,;:]|\s\.\w/.exec(prose);
  if (stray) fail('spelling', f, `stray punctuation: ${around(prose, stray.index, stray[0].length)}`);

  /* slots used on the page */
  const used = [...body.matchAll(/\sdata-slot="([^"]+)"/g)].map((m) => m[1]);
  // Where a pictured person reads as RNC's own owner or crew: the company pages, and the hero that introduces a page.
  const company = /^(?:about|process|contact|reviews)\//.test(f);
  const heroBlock = body.match(/<(section|header)\b[^>]*class="[^"]*\b(?:hero|page-head)\b[\s\S]*?<\/\1>/)?.[0] || '';
  const heroSlots = new Set([...heroBlock.matchAll(/\sdata-slot="([^"]+)"/g)].map((m) => m[1]));
  for (const id of new Set(used)) {
    const s = slots.get(id);
    const subject = `${s?.alt || ''} ${s?.purpose || ''}`;
    if (hasStock(s) && PEOPLE.test(subject) && (company || heroSlots.has(id) || /\b(?:crew|team|owner|staff|our)\b/i.test(subject))) fail('no-stock-people', f, `slot "${id}" is a stock photo of a person ("${String(s.alt || s.purpose).slice(0, 70)}") ${company ? 'on a company page' : heroSlots.has(id) ? 'in the page hero' : 'described as RNC\'s people'}: no stock person may stand for the owner or crew`);
    if (isProject && hasStock(s)) fail('stock-in-projects', f, `slot "${id}" has a stock photo (${s.stock.provider || 'stock'}); /projects/ uses per-project living art until RNC supplies photos`);
  }
  if (isProject) {
    for (const m of body.matchAll(/<(?:img|source)\b[^>]*\s(?:src|srcset)="([^"]*)"[^>]*>/gi)) if (/(?:^|[\s,])(?:https?:)?\/\//.test(m[1])) fail('stock-in-projects', f, `external image ${m[1].split(/[\s,]/)[0].slice(0, 80)} under /projects/ (no stock photos here)`);
    for (const m of body.matchAll(/url\(\s*['"]?((?:https?:)?\/\/[^'")]+)/gi)) fail('stock-in-projects', f, `external background image ${m[1].slice(0, 80)} under /projects/`);
  }

  /* trust-without-prices */
  const price = /(?:CA)?\$\s?\d|\b\d[\d,.]*\s?(?:dollars|CAD)\b|\b(?:starting|starts|prices?|rates?)\s+(?:at|from)\s+\$?\d|\bper\s+(?:hour|visit|month|week|square\s+(?:foot|feet|metre|meter))\b[^.]{0,20}\d|\d[^.]{0,20}\bper\s+(?:hour|visit|month|week)\b|\/\s?(?:hr|hour)\b/i.exec(text);
  if (price) fail('trust-without-prices', f, `price: ${around(text, price.index, price[0].length)} (free quotes only, no prices anywhere)`);
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    if (/"(?:priceRange|price|priceSpecification|offers|lowPrice|highPrice)"\s*:/.test(m[1])) fail('trust-without-prices', f, 'JSON-LD carries a price, priceRange or offers');
    if (/"@type"\s*:\s*"(?:Review|AggregateRating|Rating)"|"(?:review|aggregateRating|reviewRating|ratingValue)"\s*:/.test(m[1])) fail('reviews-credentials-guarantee', f, 'JSON-LD carries Review / AggregateRating / rating markup (CONTRACT §2: never)');
  }
  const reply = /\breply\s+(?:with)?in\b|\bwe\s+(?:will\s+)?(?:get\s+back|respond)\s+(?:to\s+you\s+)?within\b/i;
  if (f === 'free-quote/index.html') {
    if (!reply.test(text)) fail('trust-without-prices', f, 'no reply-time promise ("We reply within [REPLY TIME]")');
    if (!/\bno[- ]obligation\b|\bfree,?\s+(?:no|with no|without)\b|\bfree quote\b/i.test(text)) fail('trust-without-prices', f, 'no "free, no obligation" reassurance');
    if (!/what happens next|next steps/i.test(text)) fail('trust-without-prices', f, 'no "What happens next" steps');
  }
  if (f === 'contact/index.html' && !reply.test(text)) fail('trust-without-prices', f, 'no reply-time promise ("We reply within [REPLY TIME]")');
  for (const m of body.matchAll(/<section\b[^>]*class="[^"]*\bcta-band\b[\s\S]*?<\/section>/g)) if (!reply.test(visibleText(m[0]))) { fail('trust-without-prices', f, 'the CTA band has no reply-time promise ("We reply within [REPLY TIME]")'); break; }

  /* reviews-credentials-guarantee */
  for (const m of body.matchAll(/<blockquote\b[\s\S]*?<\/blockquote>/gi)) {
    const q = norm(visibleText(m[0]));
    if (!q) continue;
    const t = testimonials.find((/** @type {any} */ x) => { const n = norm(String(x.quote || '')); return n && (n.includes(q.slice(0, 60)) || q.includes(n.slice(0, 60))); });
    const isSample = !t || t.sample !== false;
    if (!t && /quote|review|testimonial/i.test(body.slice(Math.max(0, /** @type {number} */ (m.index) - 400), m.index))) fail('reviews-credentials-guarantee', f, `a review quote that is not in content/testimonials: "${q.slice(0, 60)}"`);
    if (!isSample) continue;
    const before = body.slice(0, m.index);
    const open = Math.max(before.lastIndexOf('<li'), before.lastIndexOf('<figure'), before.lastIndexOf('<article'));
    const tag = open >= 0 ? (body.slice(open + 1).match(/^(li|figure|article)/)?.[1] || 'li') : null;
    const end = tag ? body.indexOf(`</${tag}>`, /** @type {number} */ (m.index)) : -1;
    const card = open >= 0 && end > 0 ? body.slice(open, end) : m[0];
    if (!/class="[^"]*\bsample-label\b|>\s*Sample\s*</.test(card)) fail('reviews-credentials-guarantee', f, `sample review "${q.slice(0, 60)}" has no visible "Sample" label in its card`);
  }
  if (f === 'reviews/index.html' && !/reviews?\s+on\s+google|google\s+(?:business\s+)?(?:profile|reviews)/i.test(text)) fail('reviews-credentials-guarantee', f, 'no "Read all reviews on Google" link or text (with the [GOOGLE PROFILE] chip until it is known)');
  for (const m of body.matchAll(/<(\w+)\b[^>]*class="[^"]*\bcred(?:entials?|s)?(?:[-_][\w-]*)?\b[^"]*"[\s\S]*?<\/\1>/g)) {
    const t = visibleText(m[0]);
    for (const c of site.credentials || []) {
      if (!t.includes(c.label)) continue;
      const tok = String(c.value || '').match(/^\[([A-Z][A-Z ]*)\]$/)?.[1];
      const value = tok ? tokens[tok] : c.value;
      if (!t.includes(tok ? `[${tok}]` : String(c.value)) && !(value && t.includes(String(value)))) fail('reviews-credentials-guarantee', f, `credentials row shows "${c.label}" without its value or [${tok || c.label}] chip`);
    }
  }
  for (const [re, tok] of CRED_CLAIM) { const m = re.exec(text); if (m && !resolved(tok)) fail('reviews-credentials-guarantee', f, `credential claim "${m[0]}" while [${tok}] is unresolved: ${around(text, m.index, m[0].length)}`); }
  const warranty = resolved('WARRANTY') ? String(tokens.WARRANTY) : null;
  if (/\bworkmanship\s+(?:guarantee|warranty)\b/i.test(text) && !text.includes('[WARRANTY]') && !(warranty && text.includes(warranty))) fail('reviews-credentials-guarantee', f, 'a workmanship guarantee is mentioned without [WARRANTY] (or its value)');
  const bad = /\bmoney[- ]back\b|\b100\s?%\s+(?:satisfaction|guaranteed)\b|\bsatisfaction\s+guaranteed\b|\blifetime\s+(?:guarantee|warranty)\b/i.exec(text);
  if (bad && !(warranty && warranty.toLowerCase().includes(bad[0].toLowerCase()))) fail('reviews-credentials-guarantee', f, `guarantee claim "${bad[0]}" that [WARRANTY] does not state: ${around(text, bad.index, bad[0].length)}`);
}

console.log(`  check-honesty: ${pages.length} page(s), ${testimonials.length} testimonial(s), ${slots.size} image slot(s)`);
const ok = report('check-honesty', failures);
if (import.meta.url === `file://${process.argv[1]}`) process.exitCode = ok ? 0 : 1;
export default ok;
