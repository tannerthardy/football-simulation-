# Historical comparison profile

**Historical record; operating instructions superseded 2026-10-22.**
[PLAN](PLAN.md) and [GAPS](GAPS.md) govern current work on `develop`.
The pins, claims, approval requirements and process directions below describe
past checkpoints. They do not select today's trunk, assign current work or
reinstate mandatory integration-owner verification/Git-tracked receipts.
Evidence, links and historical decisions are preserved in place.

**Deleting a flag (2026-11-14).** `config/baseline.json` is a historical profile, so a flag removed from the engine may stay listed.
`checkFlags` in `scripts/baseline.mjs` now fails only on a flag the profile lacks, not on a stale entry, so deleting a flag and its
legacy path no longer needs an edit here.

---

# Shared integration baseline

Current preparation: [reviewed run/catch corrections](reviews/controller-integration.md)
from approved #8 `c98c2fa`. This candidate has 44 flags/components=1 and requires
`--candidate`; the original 43 values, historical `4ded6b6` and its receipts
remain pinned. No reference or runtime baseline designation has occurred.
The remaining guidance describes that historical comparison and #6-only pass.

Use **`codex/run-game-integration`** for shared development and comparisons.
Baseline ID: **`run-game-2026-10-13`**. The complete profile is
[`config/baseline.json`](../config/baseline.json). It retains the existing
default-on controllers and preserves experimental implementations with their
flags off. This designation does not promote the experimental contact law or
declare that the remaining football mechanisms are finished.

`4ded6b6` remains the historical comparison. The current **#6-only** candidate
and explicitly assigned verification owner are described in
[INTEGRATION.md](INTEGRATION.md). Its receipt is a separate combined-tooling
verification; the engine and all 43 profile flags remain unchanged. The
[exact candidate receipt](../data/reviews/current/shared-integration-verification.json)
records `c3080e8`: 1,669 TypeScript/145 Python checks, typecheck/build, all passing.

Complete checks passed: **1,652 TypeScript tests, 145 Python checks,
typecheck and build**, with no test or worker errors. The
[validation receipt](baseline-validation.json) pins the tested commit, all
43 flag values, source and harness hashes, and known failures. The published
baseline commit is pinned in [PR #2](https://github.com/tannerthardy/football-simulation-/pull/2).

## Revisions and reproduction

The runtime is frozen at `5db48d58747767bc62f2ebb061ceb19a637ee0a8`, SHA-256
`8433e88d7deb31e5c1c031e2f0cb83d1cf0e805609820c0559f6b8f25747340c`.
Primary `862258c`, live-gaps `448313e`, and second-sim `67301d2` are ancestors;
the catch rescue and Tite contract repair are retained. Later harness/docs
commits do not change this runtime. The launcher records the actual checkout
commit and a separate fingerprint of all tests, the launcher, profile,
package manifests and Vitest configuration. Results always describe those
recorded revisions, never just a moving branch name.
The tested code/harness commit is `1f1f1c82b8c030c96e0122ec189d1962be2e51b1`;
the publication follow-up only adds documentation and the receipt. Compare
both fingerprints when repeating results from the published snapshot.

Use Node **22.23.3** (`.nvmrc`), install with `npm ci`, then:

```sh
git fetch origin
git switch codex/run-game-integration
git pull --ff-only origin codex/run-game-integration
npm run baseline:info
```

Use the existing checkout; preserve local work before switching or pulling.
Pin the printed full commit when another session must repeat the comparison.
Reuse the compatible published receipt; joining the baseline does not require
rerunning its full suite. Local agents use `baseline:run` for focused checks.
At integration, the designated owner runs `npm run baseline:verify -- --candidate`
once on the exact combined candidate and shares its receipt.
In this cloud environment activate the retained Node binary first:

```sh
export PATH=/workspace/.cloud-onboarding/node-v22.23.3-linux-x64/bin:$PATH
```

`baseline:verify` runs typecheck, build, all TypeScript tests and Python checks
sequentially and writes a receipt under ignored `out/baseline/`. Each phase's
status is retained; a failed phase or source/test change during validation
makes the aggregate command fail. It never filters tests or automatically
enables a feature. Raw outputs remain in `out/`.
The latest retained additions match all 32 prior native state/RNG histories
through the same 3.5-s window (12 ended, 20 still live). This preserves tested
default trajectories; it is not a new full-play outcome or NFL-accuracy claim.

## Enabled behavior

| Retained behavior | Default-on switches |
| --- | --- |
| Acquired live gaps, runner aim and zone approach | `LIVE_GAPS`, `LIVE_AIM`, `ZONE_FLOW`, `STRETCH_MESH` |
| Loaded block/release and keeper decisions | `RUN_ANCHOR`, `ANCHOR_SPLIT`, `LEVER_FACING`, `STRETCH_REACH`, `KEEPER_TORSO`, `FLOW_RELEASE` |
| Defender fits, cue reads and flow | `DL_FLOW`, `SCRAPE`, `THREAT_READ`, `LB_PLAN`, `FLOW_READ`, `PULL_READ`, `SHED_PHYSICAL` |
| Climb approach and stalk responsibility | `CLIMB_PLAN`, `CLIMB_INTERCEPT`, `STALK_CLAIM` |
| Attention support for optional read features | `READ_EYES` (the RB read itself remains off) |

Both anchors are existing stages of the same request: `RUN_ANCHOR` enables
the bracing response; `ANCHOR_SPLIT` selects its lost-depth criterion. They
do not apply two independent physical force or traction multipliers.

Ordinary physics remains center hands, legacy support, centered hand
integration, per-solve work, speculative impacts, mean support integration,
bounded attachments and adaptive contact substeps (12–16). The patch law,
fixed resolution and diagnostic continued recovery require explicit API or
diagnostic choices and must be reported alongside the command/inputs.

## Preserved experiments

All of these are **off** in the shared profile:

- `GAIT_STEP`, `DL_FIGHT`, `PULL_STEP`, `PULL_PLAN`, `PULL_CUE`, `RUN_CONTACT_TRACK`.
- `HAND_MOTOR`, `RUN_HANDS`, `DL_HANDS`, `HAND_FIGHT`.
- `LEG_BRACE`, `TACKLE_ROLL`, `WRAP_BIND`, `REACH_CONTACT`, `TACKLE_TOUCH`.
- `RUN_READ`, `RUN_READ_TURN`, `IN_STRIDE_CATCH`.
- `PASS_SINK`, `HOLD_SUBSTEPS`, `READ_RISK_TRACE`; counterfactual `CF_FLOW` is unset.

The launcher overwrites inherited values for all 43 runtime flags. Overrides
must be explicit and are saved in the receipt:

```sh
npm run baseline:run -- -- node --import tsx scripts/sim-play.ts oz_strong cover3 1 7
npm run baseline:run -- --flag GAIT_STEP=0.3 -- node --import tsx scripts/sim-play.ts oz_strong cover3 1 7
npm run baseline:run -- --candidate -- node --import tsx scripts/sim-play.ts oz_strong cover3 1 7
```

The first is a baseline run; the second an experiment. The third permits
modified runtime source and labels it a candidate. An unregistered runtime
flag, wrong Node version, or an unacknowledged source change is rejected.
Hand-drive trials require explicit `HAND_MOTOR` plus their controller flags;
the launcher does not infer or enable dependencies.
Use identical input manifests, rosters, seeds and measurement operators for
each arm. CLI API options such as `handContact: 'patch'` and fixed substeps
remain explicit input changes; the environment launcher cannot infer them.

## Branch disposition

This table describes the historical `4ded6b6` consolidation. For the current
remote inventory, PR stacks and proposed cleanup, use [BRANCHES.md](BRANCHES.md).

| Source | Disposition |
| --- | --- |
| `claude/engine-priorities`, `claude/live-gaps` | Latest fetched tips included; primary retains physics promotion ownership |
| `codex/run-game-contact`, `defensive-flow`, `wrap-binding-physics`, `reach-contact-physics`, `reach-contact-closure`, `reach-wrap-transition`, `slow-rear-contact`, `wrap-force-point` | Fetched tips are ancestors; disabled trials, diagnostics and adverse evidence retained |
| `claude/easy-gains` | Fetched tip is an ancestor |
| `claude/in-stride-catch` | Unique controller preserved behind its default-off flag; source/test rescue patch retained |
| `claude/pass-rush-hands`, `claude/run-blocking` | Research documents preserved; HANDS2 and pad-line physics stay parked |
| `claude/trench-investigation` | Historical document preserved with original source pin; keep branch for evidence links |
| `claude/football-sim-engine`, `claude/physics-world-wip`, `codex/run-blocking-decision-dynamics` | Historical lines with distinct ancestry; no automatic remerge or deletion |
| `claude/pursuit-coverage` | Already represented by the accepted pursuit repair; retain historical source |

PR #2 stays draft. Consolidation creates a shared development baseline; it
does not merge the PR, rewrite branch history or delete historical branches.

## Known failures and validation

The historical Tite endpoint is replaced by consumed-cue, supported-keeper and
real-contact takeover contracts; see [its diagnosis](reviews/tite-helper-contract.md).
The full-game harness now gives each of the original four games its own
existing 60-second deadline, preserving inputs, order and assertions. Both
the isolated file and complete baseline pass. Earlier full-suite and isolated
timeout failures remain recorded in the receipt and historical Tite report.

Known physical/football issues remain even when functional tests pass:

- Production center-hand angular accounting has the documented tangential
  momentum defect. The experimental patch still has failed football promotion
  controls; [contact status](STATUS.md) retains the exact pinned results.
- Loaded recovery remains resolution-sensitive, and finer stepping does not
  supply a missing tackle finish. [Loaded recovery](reviews/loaded-recovery.md)
  and [continued recovery](reviews/continued-recovery.md) retain adverse cases.
  `HOLD_SUBSTEPS` affects the shared group of nearby/contact bodies whenever
  any grasp is live, so it can also refine unrelated blocks. It stays off.
- Default-off hand work has large patch turns and unresolved fight feedback;
  [hands evidence](reviews/hands-plan.md) remains required for promotion.
- Gap-run flow, loaded zone movement, approach safety and contact survival
  still need mechanism work. [Integration results](reviews/run-game-integration.md)
  preserve the failed trials and exact inputs.

New research starts from this baseline. Register any new flag before running
comparisons; update the profile/runtime pin only as a named, validated new
baseline. Preserve prior receipts and known failures rather than re-labelling
old measurements as results for the latest source.

## Selective testing cost

Follow [TESTING_COSTS.md](TESTING_COSTS.md): one question, smallest reproducer,
one relevant opposing control and directly affected correctness tests. Add a
transfer subset only for an unresolved risk, not a 2/8/16/32-snap staircase.
One integration owner checks the exact combined candidate; other agents supply
focused evidence. Reuse only compatible code, inputs and settings. Additional
games need a specific interaction question. The behavior categories interpret
results and do not prescribe more tests.
`baseline:verify -- --candidate --fail-fast` retains the
skipped tail after a failure and reports failure. It does not relax assertions
or change the default complete verifier. The launcher now fingerprints all
configuration inputs, including the frozen roster fixture.
