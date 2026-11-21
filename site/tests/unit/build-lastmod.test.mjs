// @ts-check
// Sitemap <lastmod> from git (CONTRACT §14, P3#15): the latest commit date of a route's sources, with the build-date
// fallback on shallow clones.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { gitLastmod } from '../../src/lib/build/lastmod.mjs';

/** A throwaway repository with commits at fixed dates. */
function fixtureRepo() {
  const dir = mkdtempSync(join(tmpdir(), 'rnc-lastmod-'));
  const git = (/** @type {string[]} */ a, /** @type {string} */ date = '2026-01-01T12:00:00Z') => execFileSync('git', a, {
    cwd: dir, stdio: 'pipe', env: { ...process.env, GIT_AUTHOR_DATE: date, GIT_COMMITTER_DATE: date, GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@example.invalid', GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@example.invalid' },
  });
  git(['init', '-q', '-b', 'main']);
  const commit = (/** @type {Record<string, string>} */ files, /** @type {string} */ date) => {
    for (const [f, c] of Object.entries(files)) { mkdirSync(join(dir, f, '..'), { recursive: true }); writeFileSync(join(dir, f), c); }
    git(['add', '-A']); git(['commit', '-q', '-m', `at ${date}`], date);
  };
  commit({ 'content/areas/oak-bay.json': '{}', 'content/areas/sooke.json': '{}', 'site/src/pages/areas.mjs': '//1' }, '2026-03-04T10:00:00Z');
  commit({ 'content/areas/sooke.json': '{"v":2}' }, '2026-05-06T10:00:00Z');
  commit({ 'site/src/pages/areas.mjs': '//2' }, '2026-07-08T23:30:00Z');
  return dir;
}

test('lastmod is the latest commit date of the route sources #git-lastmod', () => {
  const repo = fixtureRepo();
  const lm = gitLastmod(repo);
  assert.equal(lm.reason, null);
  assert.equal(lm.dateFor(['content/areas/oak-bay.json']), '2026-03-04');
  assert.equal(lm.dateFor(['content/areas/sooke.json']), '2026-05-06');
  assert.equal(lm.dateFor(['content/areas/oak-bay.json', 'site/src/pages/areas.mjs']), '2026-07-08');
  // A directory source takes the newest file under it; "./" and trailing slashes are tolerated.
  assert.equal(lm.dateFor(['./content/areas/']), '2026-05-06');
  // Unknown, uncommitted or missing sources give null, and the build falls back to the build date.
  assert.equal(lm.dateFor(['content/areas/nowhere.json']), null);
  assert.equal(lm.dateFor([]), null);
  assert.equal(lm.dateFor(undefined), null);
});

test('a shallow clone falls back to the build date with a reason #git-lastmod', () => {
  const repo = fixtureRepo();
  const shallow = mkdtempSync(join(tmpdir(), 'rnc-lastmod-shallow-'));
  execFileSync('git', ['clone', '-q', '--depth', '1', `file://${repo}`, shallow], { stdio: 'pipe' });
  const lm = gitLastmod(shallow);
  assert.equal(lm.reason, 'shallow');
  assert.equal(lm.dateFor(['content/areas/oak-bay.json']), null);
});

test('outside a git repository the reason is no-git #git-lastmod', () => {
  const lm = gitLastmod(mkdtempSync(join(tmpdir(), 'rnc-lastmod-nogit-')));
  assert.equal(lm.reason, 'no-git');
  assert.equal(lm.dateFor(['x']), null);
});
