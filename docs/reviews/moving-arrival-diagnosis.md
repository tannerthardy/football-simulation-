# Moving arrival and actual-defender recovery sensitivity — 2026-10-13

**Both moving-arrival prototypes are rejected for integration.** They establish
a useful controller mechanism on P58 and fresh explosive plays, but do not retain
all required controls. The first version loses a fresh interception. The second
restores that interception and retains P58's improvement, but turns an ordinary
fresh 8.44-YAC tackle into a 35.67-YAC touchdown after one changed request.
Stop after these two attempts; no third gate or capability combination was added.

The helper rule is separate and off. Shared physics, generator, controller files
and baseline flags remain unchanged. The separate support-profile sensitivities
do not rescue P58/P173 in their tested ranges; increasing balance worsens P143.
No controller, generator or recovery change is promoted.

## Baseline, inputs and measurement

Integration pin: `4ded6b600fd3785e65034aa5623d7a9f8f3c5db1`, unchanged runtime
SHA-256 `8433e88d7deb31e5c1c031e2f0cb83d1cf0e805609820c0559f6b8f25747340c`.
Every simulation uses `run-game-2026-10-13`, its 43 explicit flags and unchanged
adaptive center-hand physics. No fixed refinement, enhanced grip, prolonged hold,
ground hold, forced catch delay or catch-awareness repair is enabled.

The [predeclared protocol](moving-arrival-protocol.md) fixes the experiments.
[Compact evidence and receipts](../../data/reviews/current/moving-arrival-diagnosis.json)
retain exact source/collector/model hashes, command receipts, flags, all input
signatures, per-play achieved movement/contact/grip/support metrics and every
adverse outcome. Full recordings and detailed report belong in ignored
`out/catch-arrival/`. The original [nine native inputs](../../data/reviews/current/catch-chain-inputs.json)
remain committed. New native games/inputs are reproducible from declared seeds.

| Stage | Exact code/collector source |
| --- | --- |
| First prototype, 72 isolated primary arms, 63 frozen support slices; initial fresh collection | `cf4464bc3c475560496fc1b99857f63403020249` |
| First prototype, 48 uniform fresh inputs | `a58d4267882ef74b0d8ca307257624fd9d445618` |
| Corrected fresh interception guard collection and first-prototype guard test | `134fe16b0c5470811c350c5b25f3fff92ffa54ba` |
| Second prototype, nine primary and all 51 fresh comparisons | `0f37eac6eb20c7834642293c02b2a53d6ada5205` |

Source changes above are diagnostic/harness changes; the runtime fingerprint is
identical throughout. Interception acquisition is identified by `interceptedBy`
and events, not the final whistle category. The first collector incorrectly
checked the terminal outcome for interception and missed supplementary guards.
After correction, all original 48 uniform setups/signatures match exactly;
three predeclared actual-interception guards are added, without selecting on
candidate results. The rejected first-prototype loss remains in the evidence.

Fresh roster pairs are 6103 and 7204, strength .55, game seeds 3001 and 4001.
Uniform strata draw 16 completions plus eight other pass snaps per game, seed
`moving-arrival-20261013:ROSTER`; the first two actual interceptions per roster
are supplemented and deduplicated. Final set: **51 inputs, 48 uniform + three
guards**, including 32 completions, four interceptions and three flagged plays.
Other pass snaps include untouched no-throw/scramble controls. These are selected
native strata and named guards, not an NFL frequency estimate or blind final exam.

One defender is fixed from baseline truth: first positive loaded grasp on the
actual catcher, else nearest at catch, else actual interceptor, else nearest to
the low flight. This is a diagnostic selection operator. The proposed controller
uses consumed pictures, own body state and visible flight; it never reads the
hidden intended target, eventual catcher, future cut or future tip.

Baseline recordings reproduce original result/body/RNG/perception signatures.
Every candidate/profile recording matches its unobserved execution. Prefixes
before intervention match. Event times are native tick labels; solved load/physics
measurements are interval ends, up to .05 s later. No sub-tick onset claim.

## What changes in the controller

Version one replaces only an exact fingerprint of the existing `playBall` drive
branch for a moving observed catch window in the short approach region. It
preserves earlier reachable ball requests, ball points reachable before the
window (+ existing .05-s tolerance), and the existing near-receiver carry.
Engaged/down/loaded/acquired-foot actors and other coverage branches are unchanged.

The moving goal back-projects the visible window using the consumed receiver
velocity, then uses existing `movingArrivalVelocity`. The request changes velocity
only: no new posture, effort, cut skill, facing or physical capability. The original
update/ball-skill roll occurs once; no extra `see` or RNG draw is added.

Version two adds the existing approach planner's short free-movement gate:
the original achievable command must enter contact + 2.5 yd against that moving
lane over .6 s. It preserves constrained/striking/leaning/predicted-falling actors.
This World preview models only the actor's unloaded motion, not future contacts
or another player's private decision. It corrects the overly broad speed-sum gate.

## P58: a demonstrated physical improvement with unchanged capabilities

Actual catcher remains COM-WR2/X; selected defender remains IRN-S2/FS, whose
installed responsibility is weak curl-flat, with IRN-S1/SS in deep support.

| Achieved measurement | Baseline | Both arrival versions |
| --- | ---: | ---: |
| Defender velocity at catch, x/y yd/s | −2.01 / −5.60 | −1.04 / −3.20 |
| First loaded-entry distance | 1.26 yd | 1.06 yd |
| Velocity-heading difference at loaded entry | −130.4° | −57.4° |
| Relative velocity transverse to the grip axis | 9.28 yd/s | 6.19 yd/s |
| First hold origin | rear reach | rear form |
| First loaded boundary | 3.10 s | 3.30 s |
| Observed loaded grip survival | .05 s, slips | .70 s through finish, no slip |
| Runner fall tick | none | 3.55 s, legs |
| Subsequent support | no additional wrap | CB_W joins at 3.55 s |
| Completed ending / YAC | touchdown / 38.60 | tackle / 6.49 |

The new contact occurs later, but arrives with less opposing motion and tighter
geometry. The grip transmits load long enough for runner support to fail and the
corner to rally. The selected defender remains upright through the finish. This
is an achieved trajectory/hold/support improvement, not a better-looking waypoint
or a global speed, strength, braking or grip adjustment. It does not use a forced
delay. The acquired hold/execution differ after the trajectory change; this is
not a same-acquired-grip physics comparison.

Other primary cases: P19 YAC 7.45→5.92, P143 22.42→10.07 and P103 8.02→4.69,
all remaining tackles. P103's NB becomes the initial tackler and the selected FS
assists; identities are retained rather than crediting the selected defender with
another player's first contact. P95/P67/P23 remain exact result controls.
P173 remains a 76.25-YAC TD, and P156 remains a 48.02-YAC tackle; neither is
eligible for the short moving-arrival intervention. Do not broaden gates to
force these cases into the hypothesis.

## Fresh transfer and the controls which reject promotion

The first version repairs three clean fresh TDs: P84 47.06→10.69 YAC,
P64 24.51→15.92 and P145 54.00→14.19. All become ordinary tackles. P84/P64
still have initial misses, but maintain enough physical approach/support to
retry with surviving form rear wraps. No miss or fall is banned.

However, it loses R7204-S4001-P16's actual interception: the play becomes an
incompletion. The first wrong override is 3.30 s, with a hypothetical receiver
window roughly ten yards away, only .35 s ahead. The speed-sum gate admits a
gather despite the defender and observed runner largely travelling alongside.
The interception at 4.40 s follows a later tip, which cannot legitimately be
known at 3.30. This is a premature phase change, not evidence that the controller
should read the eventual deflection. The second gate restores the interception.

The second version retains P58 and the fresh P84/P64 repairs, but P145 no longer
improves. It also loses **R6103-S3001-P4**, an ordinary successful defensive play:

| P4 measurement | Unchanged baseline | Version two |
| --- | ---: | ---: |
| Actual defender / catcher | C6103-S4/FS, I6103-WR3/H | same identities |
| Generated defender balance | 17 | 17 |
| First wrap tick | 3.50 s | 3.55 s |
| Loaded-entry distance | 1.08 yd | .93 yd |
| Loaded-entry closing | +1.21 yd/s | −.26 yd/s |
| Loaded-entry transverse relative speed | 6.34 yd/s | 6.22 yd/s |
| Hold origin | side reach | rear form |
| Execution draw / resulting grip quality | .993 / .710 | .466 / .417 |
| Recorded capacity | 876 | 412 model kg·yd/s² |
| Loaded grip survival | .80 s through finish | .20 s, slips |
| Runner fall | 3.95 s | none |
| Completed ending / YAC | tackle / 8.44 | TD / 35.67 |

Only one request changes, at **2.80 s**, the catch tick: original velocity
`(−8.14,+.41)` becomes `(−2.85,+2.55)`. It slows the downhill drive, then
immediately hands movement back to ordinary post-catch pursuit. Geometry is
tighter but the runner is already separating at load. Later execution draws
also differ because attempts/RNG consumption move; **do not attribute the entire
lost tackle to angle or generated balance**. Form origin alone is not secure
grip quality. Version one changed two pre-catch requests here and retained a
7.80-YAC tackle; the sparse late transition in version two is the useful witness.

All 51 second-version inputs end naturally; zero timeouts. All receiver identities
and four interception identities remain. The three penalties are unchanged and
labelled separately. On 48 clean inputs: offensive TD endings 7→6, offensive
tackles 22→23, incompletions 10→10, OOB 4→4, defensive-return tackles 4→4 and
slides 1→1. These net counts conceal the lost ordinary tackle and are not grounds
for promotion. Small adverse gains also remain: P47 +.50 yd and P138 +.56 yd.
Existing offensive wins including P104/P109 remain; no universal tackle outcome
is imposed.

[Local achieved-motion and recovery plot](../../out/catch-arrival/arrival-film.png)
compares P58, the lost P4 control and fresh P84. Blue is version two; gray is
baseline. Large files remain local/ignored; regenerate the figure with the saved
collector and plot script.

## Balance generation and bounded recovery sensitivities

LB/CB/S omit balance from their rating tiers, and balance is not universal.
They inherit low-tier mean `22 + 12*quality`, plus noise/mass correction.
Across four original/fresh roster pairs, audit medians are:

| Position | Players | Generated balance | Derived step speed, yd/s | Get-up, s |
| --- | ---: | ---: | ---: | ---: |
| LB | 40 | 28.5 | 3.59 | .913 |
| CB | 48 | 26.5 | 3.87 | .820 |
| S | 32 | 25.0 | 3.76 | .851 |
| WR | 48 | 51.0 | 4.00 | .823 |
| RB | 24 | 60.0 | 3.87 | .875 |

These are generated roster populations, not NFL measurements or all starters.
The asymmetry deserves a generator-owner review, but low rating does not imply
equally low recovery capability: combine agility strongly drives step speed.
Get-up depends on agility/mass, not balance. The actual nine tacklers' step speeds
span 3.49–3.97 yd/s despite balance ratings 17–39.

Each of six profile arms changes only the selected actual defender after the
common native throw prefix; the controller stays baseline:

- Shadow balance −10/+10, bounded 1–99, re-derives **only** physical balance,
  bend and stepSpeed. Raw rating/coaching/roll inputs stay original. Brake,
  lateral, speed, acceleration, mass, power, reach and grip remain fixed.
- Step speed −5%/+5%, within the existing 2.3–4.8 range; other fields fixed.
- Get-up −10%/+10%, within the existing .6–1.4 range; other fields fixed.

The balance perturbation changes nominal base radius about ±.0051 yd and
step speed about ±.0612 yd/s for these unsaturated profiles. No profile arm
repairs P58/P173 or changes a primary ending. Most YAC shifts are very small;
**P143 balance +10 increases YAC 22.42→25.66**, showing that better nominal
support does not monotonically improve the full tackle. P156 balance −10 adds
about .009 yd; other shifts remain small. Get-up changes are ineffective in
these selected endings, not proof get-up never matters.

The independent mechanical operator rebuilds each exact native World prefix,
preserves its acquired joint/geometry/capacity and first queued strikes, then
holds six saved commands while varying that defender's support profile alone.
All nine baseline first steps reproduce within `1e-10` yd. All 63 **.30-s slices
are censored**, not completed outcomes. Every variant retains the first selected
hold's observed break/survival category: P58/P173/P156 still break; the six other
holds remain unbroken through the slice. Balance/step variants change support
deviation, while get-up variants have no effect inside this short interval.
Later acquisitions/bond decisions/strikes are excluded identically from all arms.

This is a local, post-throw support sensitivity. It does not test a generator-wide
rewrite, larger rating shifts, pre-throw movement effects or numerical convergence.
No stronger-recovery candidate is justified here. **No combined controller/profile
arm was run:** both controller versions fail controls and the capability changes
offer no independent rescue of the targeted failures.

## Next smallest diagnostic

Keep P58/P84 as the repaired approach witnesses, P4 as the ordinary failed
transition, P16 as the tipped-ball contest, and P173/P156 as out-of-scope controls.
Compare baseline/version-one/version-two P4 from the identical pre-2.80-s state:
track one coherent requested/achieved approach through the catch-to-pursuit
handoff, not another distance gate or an outcome-selected persistence timer.

Then separate P4's changed geometry/timing from changed execution using a
diagnostic matched-execution contact replay. Preserve both actual draw values as
adverse arms; use the existing quality/capacity laws and physics, without choosing
a favorable draw for a live controller. Physics owns that acquired-contact replay
and any force/recovery law change. This distinguishes inadequate approach from a
legitimate poorer execution before another controller proposal.

The balance-generation tier question is a separate input-model review. Its local
sensitivities do not justify hiding P4 with stronger grip, wider bases, faster
recovery, global speed/braking changes or forced post-catch waits. Shared controller
installation still requires run-game coordination. This one-defender study also
does not validate simultaneous adoption by all defenders.

## Validation and reproduction

**294 observed/unobserved full-play pairs** across both versions/profile arms pass
(repeated source inputs counted as executions, not new population samples).
Nine plus 51 original baselines reproduce in the final stage. All full executions
finish naturally. The 63 mechanical slices remain censored. Typecheck, build and
**128 focused tests in ten files pass** on the second version; earlier receipts
are preserved. Runtime/test/profile/launcher/package files are unchanged, and all
retained launcher receipts report exit 0 and unchanged inputs.

Use Node 22.23.3 and the launcher. Outputs belong in ignored `out/`:

```sh
export PATH=/workspace/.football-tools/node-v22.23.3-linux-x64/bin:$PATH
# Exact source for version two: 0f37eac6eb20c7834642293c02b2a53d6ada5205.
npm run baseline:run -- --receipt out/catch-arrival/repeat-collect.json -- node --import tsx scripts/diag/catch-arrival-study.ts collect out/catch-arrival/fresh-guarded-inputs.json
npm run baseline:run -- --receipt out/catch-arrival/repeat-primary.json -- node --import tsx scripts/diag/catch-arrival-study.ts run data/reviews/current/catch-chain-inputs.json out/catch-arrival/revised-primary recheck
npm run baseline:run -- --receipt out/catch-arrival/repeat-fresh.json -- node --import tsx scripts/diag/catch-arrival-study.ts run out/catch-arrival/fresh-guarded-inputs.json out/catch-arrival/revised-fresh fresh
MPLCONFIGDIR=/tmp/catch-arrival-matplotlib python3 scripts/diag/catch-arrival-figures.py
```

Preserve previous destinations. The version-one/profile stage runs `primary`
instead of `recheck` at its pinned source; `frozen OUTDIR` requires the baseline
`out/catch-chain/native-expanded.json.gz`, reproducible with `catch-chain.ts native`.
`catch-arrival-report.py` aggregates all retained stages and receipts, saving the
full report locally and the compact receipt for review. Do not relabel a current
collector run as an older prototype. No production patch or promotion is claimed.
