# Independent run-support/controller review: #158, #159 and #160

Reviewed against accepted/fetched `develop@f4146275ce7539816bf57b4ed55a0d2be10e48c7`.
GitHub heads and open/draft states rechecked on 2026-10-19 America/Phoenix.
No merges, settings changes, native prefixes or full-suite run were made in this
review. Integration owns the exact compatible candidate's combined verification.

| Scope | Exact head | Implementation | Decision |
| --- | --- | --- | --- |
| #158 initial power-edge lane | `9fdadb7cc404adbbd6103f33e2b4bf7048298f67` | `1b8fb0c143f64e51fb6dcfc7ef9b1f0f93885461` | **HOLD** installed rush/edge duty and material pressure tradeoff |
| #159 free insertion crossover facing | `57b05b0995d05d9c4f44a8611496c6b966e3e72f` | `dcfb077d6ad2901d5a9110941e86e395bc32edb6` | **ACCEPT** minimal production/test extraction |
| #160 interior acquired lateral target | `3828370a8b6905a7de2af761b72e0be5c41500cd` | `c5c852b88cf4d04bd324209c7755edacab1cd963` | **HOLD** demonstrated hidden-holder activation path |

All three merge bases equal accepted develop exactly. Independent full-source
SHA256 recomputation matches each published runtime digest: #158
`7c154e46a860b8fbc8152298865e10fbe57ae5605fa580485ba01529364d17ed`, #159
`2d76a0ab1edd4fb5ab7ce5ff666b3a4111fea176d4aee6acc72102d0b345de3a`, #160
`5b1b4a5bf5a99c8bdc7d2be4d4d24a43bdfa03ddef8efce5394b88199fad9864`.
Each is independently portable, without #153, other pending runtime, latency,
Physics, capacities or settings changes. Original source/evidence history stays
on its published branch. Do not import either data-only evidence ancestry.

## Accepted #159: the body can turn toward the run it already selected

`executeRunFit` already requests lateral movement toward an acquired run track,
but holds facing at pi. For an insertion with lateral flow and |vy|>|vx|, the
new final facing is atan2(vy,vx). This makes crossover technique available to
the existing body while preserving its finite rotation, directional movement,
traction, acceleration and force limits. It does not award a better tackle or
increase a speed capability.

**Smallest extraction, exact bytes from implementation/head:**

- `src/sim/run-fits.ts`;
- `test/run-fit-crossover.test.ts`;
- `test/fixtures/run-fit-crossover.json.gz`.

Retain the published report/evidence by immutable links instead of importing its
stale WORKBOARD snapshot. There is no dependency on #158 or #160. No source hunk
above the final return changes: accepted #134 observer-specific contradiction
retirement, keyed coverage fits, possession/read gates, conditional force-to-
inside duty, edge gathering, cutback/lag duties, requested gap/point and velocity
selection retain their existing contracts. Conditional inside support is allowed
to turn only after the existing planner has chosen its insertion; the outside
force/edge branch returns earlier and stays unchanged.

Published nine focused checks, 65 compatible controls and typecheck are adequate
contributor evidence. The initial readonly carrier-fixture failure and subsequent
repair remain visible; the successful nine-test receipt uses the same runtime.
Archived receipts confirm all 44 accepted settings/components=1 and source
identity; final own-focused command 1.648s/typecheck 11.495s are reused.

Native evidence supports achieved lateral rally, not a universal better finish.
Mike's 3s lateral speed changes 5.01→6.05 yd/s and the fresh first contact advances
4.05→3.60s. TOSS still worsens 3.84→4.33yd: the earlier support is a rear lunge
with acquired grip .308, while the accepted ending later admits the corner's
front-side reach .801. That is an explained approach/execution tradeoff, not
proof of a grip defect or a reason to prevent an informed free defender running.
Four-verts full identity, counter and mirrored backfield finishes oppose a
blanket run-defense win. Keep this adverse evidence with adoption.

Future investigation can examine turning at fluctuating request boundaries and
continued pursuit; no new persistence/smoothing timer is justified by this review.
The correction does not repair visibility, recognition, run/receiver switching,
cutback decisions, edge release or secondary containment.

## Held #158: the rush method and installed entry contract are conflated

The accepted power branch does bypass the common initial gap-lane branch; the
published inward first requests are real. However the candidate redirects every
C/D-gap power plan through the existing nonspeed outside lane, not merely through
a named blocker's power shoulder. A run-fit gap and a pass-rush method are related,
but the current installation has no explicit contract making the finesse outside
lane obligatory for every power edge. The preceding source comment explicitly
describes power as going through the blocker's chest toward the QB.

The first request is more gap disciplined in the witnesses. That alone does not
settle the method change or the material pass/PA cost. PA13 changes pressure2.25 /
throwaway2.40 to throw4.30 / catch5.15 and is live at6s. TOSS3.84→6.86 loses the
accepted slowing body collision after both reaches miss; the retained blocked
attack policy still penetrates while the runner is observed outside. Do not
attribute this to weak hands when candidate DE/RB never physically contact.

**Specific hold:** the required power chest/edge-lane responsibility and its
pressure tradeoff have not been resolved. A valid deliberate duty tradeoff can
be accepted despite worse yardage, but must first be named as the installed
contract. Fresh toss evidence selects backside power ends and cannot establish
playside contain transfer. Timing probes are separate and unpromoted.

The next useful action is a bounded installed-rush/box-duty disposition from the
saved PA13/TOSS traces, or a narrower explicit rush-lane correction, not another
broad test batch. Keep this branch/evidence and 47 checks/typecheck intact.
No integration prerequisite is created for #159.

## Held #160: an acquired target still inherits a hidden activation key

The retained interior-only scope correctly excludes all box/spill edges, lag,
cutback/support. Explicit carrying=true RB / carrying=false QB, finite fresh
ages, deep lateral motion, physical inside trail and held target/motion are
reasonable safeguards. It advances the target once and preserves all hand,
release, strength and movement limits. The documented adverse TOSS3.84→5.82 is
not itself a blocker: same CB wrap time and slightly better geometry coexist
with weaker actual execution .475 versus .801, and arithmetic crossed execution
is correctly distinguished from an outcome replay.

**Correctness blocker:** the new mode also requires `reading`, which is computed
from `d.recog.read==='run' || advanced`. `advanced` selects a personally seen
picture using authoritative `sim.carrier`. Thus an *empty* personally seen QB
beyond LOS can turn on the new acquired-RB lateral objective only when the hidden
live holder is QB. The published invariance tests preinstall a run read and do
not exercise this gate.

One targeted staged diagnostic, reusing the published contact fixture, holds
all acquired pictures fixed: deep moving RB carrying=true, QB carrying=false at
LOS+3, own read=pass. Change only the authoritative holder RB→QB:

| Observed output | RB is actual holder | QB is actual holder |
| --- | ---: | ---: |
| `reading` | false | true |
| Target y | 27.137802721312227 | 31.356681818181823 |
| Held target flow | absent | 3 |
| Requested vy | 1.4466504128438247 | 2.8411076533541832 |

This is not just preexisting wrong metadata: the new target mode and emitted
command differ. The empty QB picture is not possession evidence. A fresh cue is
not permission to consult hidden live ownership.

The [portable regression patch](hidden-holder-regression.patch),
[exact launch receipt](hidden-holder-launch.json) and
[observations/limits](hidden-holder-result.json) preserve the failing evidence.
Apply the patch to exact #160 and run only its named test with accepted settings:

```sh
node scripts/baseline.mjs --candidate --flag RUN_CONTACT_COMPONENTS=1 -- \
  node node_modules/vitest/vitest.mjs run --project core \
  test/dl-acquired-flow.test.ts -t 'independent review hidden-holder gate'
```

The diagnostic command failed as intended in 1.730s (Vitest1.28s;53ms test),
Node22.23.3. Sixteen existing tests were intentionally filtered out because their
published passing receipts already answer their questions. Two fixture setups
each run one existing warm-up World step; zero new PlaySim continuations, native
prefixes, games or shared suites ran.

**Smallest repair:** prevent the new consumer from using legacy authoritative-
holder `advanced` as its run-activation source. Requiring the observer's existing
run recognition for this deep-RB mode is one narrow option; an explicitly
acquired possession-derived read is another independently reviewable contract.
Preserve legacy shallow-runner handover and other unrelated contact behavior.
A patch plus this adversarial control needs independent acceptance. Published
native positive cases already have their own run recognition, so a run-read-only
gate correction would leave those activation cases compatible; no new game
campaign is indicated merely to fix the gate.

## Composition and preserved evidence

#159's source file is distinct from #158 defense.ts and #160 engagement.ts. A
later accepted #160 can coexist without changing #159's target/recognition gate.
#164 independently touches the same run-contact held-target fields and lateral
planner: preserve `read.flow` in the coherent target snapshot at adoption, not
live per-tick motion, and retain its new target-mode handover. Do not blindly
choose either complete engagement.ts file. In particular the fallback remains
`read.declared ? 0 : read.flow ?? read.stack?.flow ?? 0` where used, and a moving
reference must advance only once. Neither #160 nor #164 depends on promoting
GAIT_STEP or another physical law.

Published sources used in review:

- [#158 report](https://github.com/tannerthardy/football-simulation-/blob/9fdadb7cc404adbbd6103f33e2b4bf7048298f67/docs/reviews/defensive-snap-response-2026-10-19.md),
  [preserved native evidence](https://github.com/tannerthardy/football-simulation-/tree/55d672c90a68aa6d830fc0019d863b191bf39c80/data/reviews/defensive-snap-response).
- [#159/#160 report](https://github.com/tannerthardy/football-simulation-/blob/3828370a8b6905a7de2af761b72e0be5c41500cd/docs/reviews/run-flow-2026-10-19.md),
  [immutable run-flow evidence](https://github.com/tannerthardy/football-simulation-/tree/d56a4509db0c26210b472d8ee1882064c0151ef9/data/reviews/run-flow).

The manifest, analysis, archived launch/typecheck/failure logs and exact source
patches were inspected; full-source digests independently recomputed. Fifty
published native prefixes /40 completed /10 censored /43.42s and eight reused
baselines describe the author's multi-arm study, **not newly executed review
work**. Final #160 inactive pass controls are prior-source compatible evidence,
not final-source executions; the report states that limitation correctly.

## Follow-up: bounded gate repair, awaiting Integration's independent review

At Integration's request, the separate repair is published as
[`1b5668c89cc0f5c98bc2314a0b57afb8cd14a65a`](https://github.com/tannerthardy/football-simulation-/commit/1b5668c89cc0f5c98bc2314a0b57afb8cd14a65a)
on `codex/dl-flow-recognition-repair`. Its parent is the exact original #160
head; the [portable repair](recognition-gate-repair.patch) changes one production
condition and adds two direct tests. Original #160 remains held at its reviewed
head. This reviewer authored the follow-up, so Integration must independently
adjudicate it before extraction. No self-approval is asserted.

The new mode requires `d.recog?.read==='run'` instead of the legacy `reading`
alias. Pass/unsure states now cannot activate the new deep lateral mode through
a hidden advanced-holder alias. Original16 plus two new directly affected checks
pass: [receipt](recognition-gate-focused.json), [log](recognition-gate-focused.log);
source SHA256 `a9a5b96909a810fe8ba0688bbf9fb3fa8f9cdad1f2f66327a0f64d768de91d1e`.
No additional typecheck, native continuation or suite was run for this patch.

The initial proposed tests equated *all* output aims/commands under pass/unsure.
That was too broad: after suppressing the new mode, unchanged legacy `declared`
can still choose the observed advanced-but-empty QB via hidden live ownership.
The first repair run was16 passes/two failures; its [receipt](overbroad-assertion-focused.json)
and [log](overbroad-assertion-focused.log) remain. The retained two tests explicitly
assert only that neither hidden holder activates **new heldTargetFlow**. Existing
run-recognized tests continue asserting full request invariance. This is a new-
consumer contract repair, not a claim that legacy contact information is cured.
Do not broaden to that older declaration policy in this extraction.

Zero-tick reanalysis of all seven final DL and four final diagnostic-composition
tapes found262 active heldTargetFlow samples, each with the defender's own
recorded recognition `run`; member hashes match the published manifest.
[Per-case source/hash/sample counts](native-gate-reuse.json). Under a run read,
the old `reading` and new condition are both true, so the one changed clause
leaves those activation decisions unchanged. This supports compatible reuse
for this clause, not any other newly combined engine or #164 movement law.

The gate repair's first focused command took1.652s and the passing corrected
command took1.528s according to their launcher receipts (Vitest1.30/1.15s).
No new full plays or games were collected. The earlier original-source
1.730s failing diagnostic is separately preserved above.
