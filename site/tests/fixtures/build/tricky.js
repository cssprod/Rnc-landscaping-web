// Golden fixture for minify-js.mjs: everything below must survive byte-for-byte where it matters.
/* block comment */ const a = 1 /* between */ + 2;
const url = 'http://example.ca/path'; // a // inside a string is not a comment
const s2 = "it's /* not */ a comment";
const re = /\/\*[^*]*\*\//g; // a regex that looks like a comment
const re2 = /[/]+/.test('a//b') ? 'yes' : 'no';
const half = a / 2 / 1; // division, not a regex
const arr = [1, 2][0] / 2;
const t = `line one
    indented line two ${a + `nested ${'q'}`} // not a comment
  /* not a comment either */`;
function f() {
  return /^\s*Step \d+/.test(t);
}
const obj = { k: 1 };
const g = (x) => x
  ? 1
  : 2;
let i = 0
i++
const n = .5 + 1.25e-3;
if (typeof re === 'object') console.log(half, arr, f(), obj, g(n), re2, url, s2, i);
export { a, t };
