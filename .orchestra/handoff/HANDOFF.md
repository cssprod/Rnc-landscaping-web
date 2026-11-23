# Handoff: RNC "Living Coast" redesign (continue from Wave 2)

Previous session: https://claude.ai/code/session_014B2BmbM1MDbDgrkVGzif9y. It stopped at its usage limit partway through Wave 2. **Be mindful of token use:** the user asked for lean runs.

## Read first
- `.orchestra/handoff/PLAN.md` is the approved plan with the locked user decisions:
  - dark-first "Fir night" with Dark theme and Animations toggles;
  - living vector art, no AI photos;
  - deploy = PR #3 plus the Netlify Deploy Preview; **the user merges, never us**.
- `.orchestra/handoff/EXECUTION-SPEC.md` holds the ownership rules, effects inventory, motion policy, gates and budgets.
- `CONTRACT.md` v3 and `.orchestra/ownership.json` win over EXECUTION-SPEC where they differ.
- `.orchestra/briefs/*.json`, `DESIGN-DIRECTION.md`, `.orchestra/carry.json` and `.orchestra/handoff/RESUME-NOTES.md`.
- `.orchestra/handoff/rnc-lanes.js` is the Workflow script used for stream lanes. Run it with args `{seed: <wave base sha>, wave: "w2"|"w3", streams: [{id, port, after?}]}`. Each lane is builder → reviewer → fixer, in worktrees.

## Where things stand
- **Branch:** `ccr-384bdb88-mx8gtv`. Push only to this branch; tag pushes are refused.
- **PR:** https://github.com/cssprod/Rnc-landscaping-web/pull/3 is a draft. Subscribe to it. The previous session posted one comment saying the Lighthouse-CI step is red until the templates land.
- **Preview:** https://deploy-preview-3--rnc-landscaping-web.netlify.app. It is behind team SSO and has not changed visually yet, because only W0/W1 is merged.
- **W0 is done**: contract, briefs, design direction, and verified municipal facts.
- **W1 is integrated and verified**: the `a3a99dd` merge, which was `wave-1-int` locally.
- **W2 stream branches live only in `.orchestra/handoff/w2-all.bundle`**, because local branches can't be pushed. Restore them with:
  ```
  git fetch .orchestra/handoff/w2-all.bundle 'refs/heads/w2/*:refs/heads/w2/*'
  ```
  Base for every W2 stream is `a3a99dd`; ds-chrome and ds-comp were built on the ds-core tip `bc475c6`.

| Stream | Final tip | Status |
|---|---|---|
| ds-core | w2/ds-core bc475c6 | PASS (review) |
| ds-chrome | w2/ds-chrome 9f25391 | built; **review not run** (limit) |
| ds-comp | w2/ds-comp c3d7269 | built; **review not run** (limit) |
| living | w2/living--fix1 e9a7484 | fix 1 done; **re-review not run**. Open item: glass blur over living loops. Request 17 to ds-comp/ds-chrome is to drop backdrop-filter over `[data-living]` heroes. |
| seo | w2/seo 55267dc | PASS |
| quote | w2/quote--fix1 8fc8731 | PASS |
| qa | w2/qa--fix1 dc7cff9 | the fixer committed one fix (one rule id per hard constraint), then hit the limit; **re-review not run**. The original major: a check-honesty baseline masked the "no prices" rule. |
| areas-content | w2/areas-content 33130d9 | PASS |
| content | w2/content--fix1 e077106 | PASS |

## Next steps, in order
1. Restore the W2 branches from the bundle. Delete `.orchestra/handoff/w2-all.bundle` from the tree in the W2 integration commit; it stays in history.
2. **First priority: get a visibly new preview to the user.**
   - Run reviews, plus one fix round where needed, for ds-chrome, ds-comp, living (re-review) and qa (re-review).
   - Keep it lean: one workflow with 4 review lanes.
3. W2 integrator (barrier per `ownership.json`):
   - Merge order: ds-core → ds-chrome → ds-comp → living → seo → quote → qa → areas-content → content.
   - Apply mechanical integrator requests: the `build-modules.test #legacy-slices` fix, `#route-shape`, `#parallel-out`.
   - Run the codemod, regenerate generated files, write baselines, run the full gate, push.
   - Then an independent verifier.
   - Tell the user the preview now shows the new design (dark theme, glass header, toggles, living landscapes).
4. W3 templates (6 family lanes + css-consolidator W3b) → W4 verify loop (evidence pack, 7 finders) → W5 docs/CI/OG cards/TRACEABILITY → mark PR #3 ready.
5. Also open:
   - The Netlify Lighthouse Performance score of 18 on the W1 preview (W2/W4 to fix).
   - 3 area facts with `reviewedOn: null`, because their hosts are blocked.
   - The View Royal 20 cm vs 30 cm conflict.

## Environment
- Cloud environment `rnc-landscaping-web` allows the municipal sites, the CRD, gov.bc.ca and Unsplash.
- Playwright 1.63 is in `/opt/node-tools`; run `node site/tools/dev-setup.mjs` in each worktree.
- 4 CPUs, so 2 agents per workflow. Run sibling workflows for parallelism, but prefer fewer agents (token budget).
- Agent worktrees are under `.claude/worktrees/`. Add that path to `.git/info/exclude`.


## Update 2026-11-23 (session 014B2BmbxghRKSaZqjQgzRvE)
- **W2 is integrated and pushed** at `5740f57` (fast-forward of local `wave-2-int`). The Deploy Preview shows the Living Coast design. The full gate is green; baselines are in `.orchestra/baselines/`; the carry log is in `.orchestra/carry.json`.
- **W2 independent verification:** `.orchestra/reports/w2-verify.json`.
  - The gates and honesty lenses completed.
  - The design lens and most skeptic confirmations hit the usage limit.
  - The findings route to W3 (t-home, t-company, t-projects) and W4 (fix-qa).
- **CI on 5740f57:** motion-audit `[policy-tiers]` fails on /process/: 4 glass step cards in a 390px viewport, budget 3. The t-company process template must fix it.
- **Netlify Lighthouse:** Performance is still 18, which goes to W4 f-perf.
- **W3 builders hit the usage limit mid-build.**
  - Partial branches are in `.orchestra/handoff/w3-wip.bundle` (t-home, t-services, t-projects, t-company; base `5740f57`). Restore them with `git fetch .orchestra/handoff/w3-wip.bundle 'refs/heads/w3/*:refs/heads/w3/*'`.
  - t-areas and t-editorial have no commits yet.
