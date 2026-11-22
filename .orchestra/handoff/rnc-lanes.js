export const meta = {
  name: 'rnc-lanes',
  description: 'W1 stream lanes: worktree builder → adversarial reviewer → fixer (≤2 rounds) per stream',
  phases: [{ title: 'Build', detail: 'stream builders in isolated worktrees' }, { title: 'Review', detail: 'adversarial reviewers (detached worktrees, read-only)' }, { title: 'Fix', detail: 'fix chains on --fixN branches' }],
}
const REPO = '/home/user/Rnc-landscaping-web'
const S = '/tmp/claude-0/-home-user-Rnc-landscaping-web/5110250c-2871-5a49-ba20-c506ac0ea22b/scratchpad'
const SEED = args.seed
const WAVE = args.wave
const ATTR = 'Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>\nClaude-Session: https://claude.ai/code/session_014B2BmbM1MDbDgrkVGzif9y'
const BUILD_SCHEMA = { type: 'object', properties: {
  branch: { type: 'string' }, head: { type: 'string' }, base: { type: 'string' },
  files: { type: 'array', items: { type: 'string' } },
  gates: { type: 'array', items: { type: 'object', properties: { cmd: { type: 'string' }, ok: { type: 'boolean' }, note: { type: 'string' } }, required: ['cmd', 'ok'] } },
  acceptance: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, done: { type: 'boolean' }, evidence: { type: 'string' } }, required: ['id', 'done'] } },
  requests: { type: 'array', items: { type: 'string' } }, notes: { type: 'string' } },
  required: ['branch', 'head', 'base', 'gates', 'acceptance'] }
const REVIEW_SCHEMA = { type: 'object', properties: {
  pass: { type: 'boolean' },
  findings: { type: 'array', items: { type: 'object', properties: { severity: { type: 'string', enum: ['blocker', 'major', 'minor'] }, item: { type: 'string' }, detail: { type: 'string' }, file: { type: 'string' }, fix: { type: 'string' } }, required: ['severity', 'item', 'detail'] } },
  gates: { type: 'array', items: { type: 'object', properties: { cmd: { type: 'string' }, ok: { type: 'boolean' }, note: { type: 'string' } }, required: ['cmd', 'ok'] } },
  deferred: { type: 'array', items: { type: 'string' } } },
  required: ['pass', 'findings'] }

const COMMON = (id, B) => `You are part of Wave ${WAVE.slice(1)} of the RNC Landscaping website redesign (main repo ${REPO}; you run in an ISOLATED git worktree — your cwd — sharing the same .git).
Your complete brief: ${REPO}/.orchestra/briefs/${id}.json — use its "${WAVE}" entries (owns, forbidden, port, out, gates, integrationGates) plus deliverables, acceptance, providesRules, rules, context. ALSO READ: ${REPO}/CONTRACT.md (v3), ${REPO}/REDESIGN-PLAN.md (v3), ${REPO}/.orchestra/ownership.json, ${REPO}/.orchestra/carry.json (items for "${id}"), ${S}/PLAN.md (locked user decisions), ${REPO}/DESIGN-DIRECTION.md (art direction "Living Coast"). Where EXECUTION-SPEC.md and CONTRACT/ownership.json differ, CONTRACT + ownership.json win (they are newer). Content streams: also ${REPO}/.orchestra/reports/content-audit.json and research/area-facts/*.json, research/area-verification-V*.md.
Wave base for your stream: ${B} (for W2 this is wave-1-int, or the final tip of the upstream stream you build on). Hard rules: CONTRACT hard rules (never invent RNC facts; samples labelled; no prices; no superlatives; local rules need source + verify); write ONLY files matching your ${WAVE} owns globs; never edit forbidden globs; requests for other owners go to .orchestra/requests/${id}.md. Tools: Playwright 1.63 (site/node_modules after dev-setup), tsc at /opt/node22/bin/tsc or /opt/node-tools/node_modules/.bin/tsc, Chromium in /opt/pw-browsers. Do NOT push. Do not touch the main checkout at ${REPO} (read it only).`

const builder = (id, port, B) => `${COMMON(id, B)}
ROLE: "${id}" stream BUILDER. Lens: see brief.
Setup: confirm \`git rev-parse HEAD\` == ${B} (else \`git checkout --detach ${B}\`); \`git switch -c ${WAVE}/${id}\`; WT=$(git rev-parse --show-toplevel); \`cd $WT/site && node tools/dev-setup.mjs\`; export PORT=${port} and the worktree-local dist per the brief.
Do every deliverable and meet every acceptance item. Commit early and often (each logical deliverable), imperative messages ending with exactly these two lines:
${ATTR}
Before finishing: run every own-branch gate in your brief (record command + pass/fail); run the ownership checker (node ${REPO}/.orchestra/tools/ownership.mjs — read its usage; check stream ${id}, wave ${WAVE}, base ${B}, head HEAD) — it must pass; \`git format-patch ${B}..HEAD -o ${S}/patches/${WAVE}-${id}/\`. Return the structured result (branch name, head sha, base, files, gates, acceptance with evidence, requests, notes).`

const reviewer = (id, port, tip, report, round, B) => `${COMMON(id, B)}
ROLE: "${id}" ADVERSARIAL REVIEWER (round ${round}). Verifier lens: the brief's verifierLens. You are read-only: NEVER commit, never push.
Setup: \`git switch --detach ${tip}\`; \`cd site && node tools/dev-setup.mjs\`; PORT=${port + 10}.
Builder/fixer report (do NOT trust it — verify):
${JSON.stringify(report).slice(0, 5000)}
Do: read \`git diff ${B}...${tip}\` in full; check every deliverable and acceptance item against real evidence (run the code, build, open pages in Chromium); run every own-branch gate; run the ownership checker for ${id}/${WAVE} (base ${B}, head ${tip}); hunt for regressions (pages that changed unintentionally, broken links, CSP errors, a11y regressions, honesty-rule breaches, invented facts). Integration gates: if upstream stream tips exist (\`git for-each-ref --sort=-committerdate refs/heads/${WAVE}/\` — use the newest branch of each upstream stream named in ownership.json integration.${WAVE}.upstream.${id}), do a throwaway \`git merge --no-ff --no-commit <tips>\` in this detached worktree, run the integration gates, then \`git merge --abort\`; otherwise list them as deferred.
Severity: blocker = gate red / hard-constraint breach / data loss / ownership violation; major = missing deliverable or acceptance item, visible defect, wrong behaviour; minor = polish. pass = no blocker and no major. Return structured findings with concrete fixes.`

const fixer = (id, port, tip, findings, n, B) => `${COMMON(id, B)}
ROLE: "${id}" FIXER (round ${n}). Setup: \`git switch -c ${WAVE}/${id}--fix${n} ${tip}\` (builds on the previous tip); \`cd site && node tools/dev-setup.mjs\`; PORT=${port + 20}.
Fix every blocker and major finding below (and minors that are cheap and in scope), staying strictly inside the stream's ${WAVE} owns. If a finding is wrong, say why instead of changing code. Commit (messages ending with the two attribution lines:
${ATTR}
), re-run all own-branch gates + ownership checker, \`git format-patch ${B}..HEAD -o ${S}/patches/${WAVE}-${id}--fix${n}/\`. Return the structured result (branch = ${WAVE}/${id}--fix${n}).
Findings:
${JSON.stringify(findings).slice(0, 9000)}`

async function lane(st, B) {
  const { id, port } = st
  const b = await agent(builder(id, port, B), { label: `${id} build`, phase: 'Build', isolation: 'worktree', schema: BUILD_SCHEMA, effort: 'high' })
  if (!b) return { id, failed: 'builder' }
  let tip = b.branch, last = b, review = null
  for (let round = 1; round <= 3; round++) {
    review = await agent(reviewer(id, port, tip, last, round, B), { label: `${id} review ${round}`, phase: 'Review', isolation: 'worktree', schema: REVIEW_SCHEMA, effort: 'high' })
    if (!review) break
    const serious = (review.findings || []).filter((f) => f.severity !== 'minor')
    log(`${id} review ${round}: ${review.pass ? 'PASS' : 'FAIL'} (${serious.length} blocker/major, ${(review.findings || []).length - serious.length} minor)`)
    if (review.pass || round === 3) break
    const f = await agent(fixer(id, port, tip, review.findings, round, B), { label: `${id} fix ${round}`, phase: 'Fix', isolation: 'worktree', schema: BUILD_SCHEMA, effort: 'high' })
    if (!f) break
    tip = f.branch; last = f
  }
  return { id, finalBranch: tip, head: last.head, pass: !!review?.pass, openFindings: (review?.findings || []).filter((f) => f.severity !== 'minor'), minors: (review?.findings || []).filter((f) => f.severity === 'minor').length, acceptance: last.acceptance, requests: last.requests, deferred: review?.deferred, notes: last.notes }
}
const P = {}
for (const st of args.streams) P[st.id] = (async () => {
  let B = SEED
  if (st.after) { const up = await P[st.after]; if (!up || !up.head) return { id: st.id, failed: "upstream " + st.after }; B = up.head }
  return lane(st, B)
})()
const results = await Promise.all(args.streams.map((st) => P[st.id]))
return results
