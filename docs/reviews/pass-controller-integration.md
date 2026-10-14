# Stalk and observed-threat coverage integration candidate

This prepares the immediate scope from the [passing-game handoff](https://github.com/tannerthardy/football-simulation-/blob/b890686a507a06959337bb9425e2550337d5a1a3/docs/reviews/pass-game-integration-handoff.md).
It does not merge, adopt a reference, or claim the whole passing-game bundle is ready.

**BLOCKED: the frozen combination fails two preserved integration checks.**
PR #29 has no identified isolated correctness blocker; the coverage combination
is not ready to merge. No assertions or thresholds were changed after failure.

## What changed

Accepted development reference: `a1b16e666a9ee7d1bc1d2aecba141fc535863b24`.
Frozen intended candidate: **`cb240d236b3b5bbc13c855dab251fdf986a3ae77`**,
runtime SHA256 **`b26011413de2b12fd06f96c64ef48b53cf75563d7e4f6f9c9d694b7dd22d6a7b`**.
The comparison `0e7d2e747eaa136d9faef61d5420ad51e6911889` has exactly
PR #29's measured runtime `1eb3b26a97eacc6896c2ee510ef5afefe9583381307f5d754925cb4a5d1d544d`.

Only two production files change relative to accepted develop:

- `blocking.ts`: the exact PR #29 two-line acquired-position correction for
  the far stalk movement request. Contact eligibility and collection policy stay fixed.
- `defense.ts`: the complete tested ZoneCoverage bundle from
  `b0b197ff3b68b5bb9e65811728868ff5cf76cf15`: remove five uses of private QB
  read identity, squeeze an observed spot lane, and allow either ordinary #1/#2
  selection into the existing guarded curl/flat conflict rule.

The extracted ZoneCoverage section matches the contribution exactly. The entire
accepted `playBall` function/tail and its file prefix remain intact; the moving
catch helper, contact controller, engagement, physics, players, playbook, QB and
receiver code are unchanged. Original flat assertions remain; four preconditions
use a visible ordinary curl instead of the removed private-read advantage.
No research ancestry is merged. Stick is a separate optional review decision;
seam/post, QB-pressure policy, experimental hands/grips, helpers and ratings are excluded.

Node **22.23.3**, all **44 accepted flags**, **`RUN_CONTACT_COMPONENTS=1`**,
and accepted center/centered/legacy/mean World defaults apply to every new launch.
Profile, dependency files and launcher remain byte-identical to accepted develop.
The launcher still calls this a candidate relative to its historical profile;
that label does not designate a new baseline. Historical comparison remains
`4ded6b600fd3785e65034aa5623d7a9f8f3c5db1` with its distinct 43-flag evidence.

## Evidence for and against

[PR #29](https://github.com/tannerthardy/football-simulation-/pull/29) was reviewed
independently. Its final measured runtime/tests/input/probe/support/profile/lock/
launcher match publication, including recorded hashes. Its **29 focused checks
and typecheck are reused** for that exact isolated source. The full combined
candidate additionally passes **94 affected checks** across eight existing/new
contract files, including acquired information, block fit, zone ownership,
flat guards and accepted catch-phase behavior.

The information correction is supported, with a retained limit: a synthetic held
picture requests **2.5505** instead of fresh **4.7746 yd/s**. The unchanged static
fit ignores known target velocity; normal projection of the archived sample
requests 4.7096. These are controller/free-step controls, not native protection
improvements. The portable source receipt and original adverse evidence are
preserved in [the stalk review](stalk-visual-request.md). Its prose actor-index
typo is corrected here to match the unchanged witness (9/18).

The only new transfer question was whether the complete coverage bundle coexists
with the accepted catch controller. Two existing, frozen R12953 inputs were
selected before candidate results: a CurlFlat spot witness and adverse FourVerts
match witness. They use the exact archived calls/players/seeds/setup, no new
roster draw. Both current-source arms use the same collector and accepted settings.

| Existing input | Current comparison (#29, accepted catch) | Combined coverage candidate |
| --- | --- | --- |
| CurlFlat spot, seed 61001 | +2.44 yd; 1.028999 YAC; first contact 4.35; tackle 4.90 | +1.91 yd; .495035 YAC; first contact 4.20; tackle 4.75 |
| FourVerts match, seed 61002 | LB_M interception 3.05; defensive return TD 10.65 | Same interceptor/time; defensive return TD 10.50 |

The spot throw/catcher/time remain the same. At **1.60**, SS has the same
pre-World body and consumed pictures but requests `(−1.1643, −6.4287)` rather
than `(2.7113, −4.0225)`. This is a changed informed lane choice followed by
earlier achieved contact, not added speed or strength. In the match case at
**1.75**, FS has the same body/pictures but requests vy **+1.599883** instead
of **−1.336887**, splitting observed verticals rather than following private read
identity. The interception and score remain; earlier return timing is a changed
outcome, not proof of better coverage or independently diagnosed return quality.

Each observed execution has an exact plain execution counterpart for the final
result, every body, applied intents, RNG and perception signature: **eight complete
runs total, zero timeouts/skips**. This duplicates only two cases per arm to verify
that the reused observational collector remains neutral under current source.
Neither a large panel nor a new game/roster campaign was run. The portable
[bounded observation packet](../../data/reviews/current/pass-controller-observations.json.gz)
preserves exact numbers, all-tick selected actors and full-row hashes, detailed
coverage pictures at relevant ticks, results, holds and full-film hashes.
Full raw observed films remain locally under `out/pass-integration/{comparison,candidate}`;
the published subset is not a complete restartable World serialization.

## Unresolved risk and preserved history

The old 43-flag match outcomes are **not** the current baseline. The original
coverage review retains fresh +5.44 YAC and incomplete-to-19.87-yard completion
losses, the source/contract failures and their fixes, and contest/execution analysis:
[historical coverage evidence](https://github.com/tannerthardy/football-simulation-/blob/b0b197ff3b68b5bb9e65811728868ff5cf76cf15/docs/reviews/coverage-cue-repair.md).
The current adverse input instead intercepts in both arms; it cannot validate or
erase those older containment/contest costs. Current transfer is intentionally
narrow. No league-wide coverage or YAC claim follows.

Accepted moving-catch adverse P4 execution, interception/return and sideline
tradeoffs remain in [the accepted controller review](controller-integration.md).
Shared contact/angular/recovery limitations remain. QB position still anchors
coverage lanes/facing; other information debt and deterministic tie ordering
are outside this extraction. An unchanged or improved gain is not the verdict:
the supported improvements are removing private identity dependence and
restoring observed spot-lane behavior with opposing responsibilities preserved.

## Runtime and exact verification

One [unaltered combined launcher receipt](../../data/reviews/current/pass-controller-combined-verification.json)
records **exit 1**: typecheck and build pass; **1,698/1,700 TypeScript checks pass**
in 140 passing/two failing files. Fail-fast **skips Python**; no current Python
pass or successful combined verification is claimed. The preserved
[full failure log](../../data/reviews/current/pass-controller-combined-verification.log)
and [canonical integration receipt](../../data/reviews/current/pass-controller-integration.json)
retain the failure details, focused/transfer costs, source/flag/input/collector
hashes, all complete outcomes, exclusions and risks.

Combined wall time **205.662 s**: typecheck 10.694, build 14.391, TypeScript
180.574 s. The prior focused group costs 3.155 s; comparison/candidate transfer
launches cost 2.913/3.144 s. Four targeted diagnostic launches cost 2.585 s
combined. Total new launcher command time is **217.456 s**; reuse #29's prior
14.891-s evidence without paying again. One shared-suite attempt, no rerun.
Additional games beyond those already in the preserved suite: zero.

Two failures receive one small diagnostic each, **six censored prefixes total**,
not another panel or game:

- `test/integration/coverage-panel.test.ts:75`: mean match gap **3.166882** is
  not less than spot **3.467355 − .4 = 3.067355**. The following depth/facing
  assertions are not reached. On the exact fixture's seed 1, stopped at 3 s,
  comparison/candidate match decisions and recorded motion are identical.
  Spot gaps tighten from 3.5355/4.0460 to 3.5114/3.4438; depths remain
  11.2/11.1 and QB-facing fraction .8571 in that prefix. This supports a
  changed relative spot/match margin, **not certification of the 24-seed
  contract or permission to relax its margin**.
- `test/qb-rusher-recording.test.ts:55`: seed 0 no longer scrambles. A native
  prefix starts a throw at decision 2.35/completed boundary **2.40**, pending
  Y/index 7 with estimated completion .562917 and interception risk .035052;
  the comparison instead scrambles at decision 3.15/boundary **3.20**.
  QB code is unchanged. This exposes a changed football precondition, not
  evidence that the recorder caused the decision. The original recording
  neutrality assertions after the failed scramble check remain unverified.

The exact diagnostic scripts are archived as evidence under
[`pass-controller-diagnostics/`](pass-controller-diagnostics/coverage-gap-prefix.mjs):
[gap prefix](pass-controller-diagnostics/coverage-gap-prefix.mjs) and
[QB prefix](pass-controller-diagnostics/qb-recording-prefix.mjs), with source,
settings and harness hashes in the receipt and packet. They import the source
from the chosen repository working directory and stop before full-play endings.
No seed search, forced QB transition or replacement outcome assertion was added.
The test/coverage owners need to resolve these two contracts before a new
candidate is frozen. A material correction would justify new verification;
this unchanged failed candidate does not.
The integration owner in this chat owns this one combined run; contributors
should reuse it rather than repeat the shared suite. No publication changes
runtime, tests, config, dependencies, inputs or diagnostic scripts after the freeze.

Transfer command (two IDs required; never defaults to a larger panel):

```sh
node scripts/baseline.mjs --candidate --flag RUN_CONTACT_COMPONENTS=1 --receipt out/pass-integration/candidate-launcher.json -- node --import tsx scripts/diag/pass-controller-transfer.mjs out/pass-integration/candidate FRESH-12953-curl_flat-spot-61001 FRESH-12953-four_verts-match-61002
```

Read the committed receipt/packet first. Replaying is for a named new question,
not a requirement for every worker. Python standard-library `json` and `gzip`
can inspect the packet with zero simulations.

## Next decision

Review the exact **#29 plus coverage** candidate and its two blockers before
integration into `develop`. Resolve whether the relative-gap requirement and
outcome-coupled native scramble fixture need a supported contract correction,
or the controller needs repair. Preserve meaningful carry, spot-depth/facing
and native recorder-neutrality coverage; do not choose thresholds or seeds just
to recover a pass. This pass changes neither test.
PR #29 retains an independent reviewable correction; this branch includes its
exact code without importing its branch ancestry. If it is merged separately,
compare the resulting tree/settings with this frozen candidate before reusing
verification; do not automatically rerun a suite for an equivalent tree.
No merge, default switch or baseline designation occurs in this pass.
Keep Stick as a separate candidate decision and seam/post/QB-pressure policy
out. Additional football testing needs a specific unresolved decision-changing risk.
