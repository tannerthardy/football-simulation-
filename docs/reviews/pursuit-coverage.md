# Pursuit control and the next contact investigation

Updated 2026-10-12. The pursuit-angle change from `claude/pursuit-coverage`
(`576581b`) is now applied narrowly to `claude/engine-priorities`. The in-stride
receiver change is still experimental; it needs its own coverage/ordinary-catch
controls before installation. Outside/wide-zone technique remains separate work.

## Catch/contact follow-up: two controller repairs

The later concurrent integration is recorded in the receipt's `integration`
section and [status](../STATUS.md). The counts and causal stages below preserve
their original source. The same repaired S105-P159 still ends at 4.75 YAC on
the combined source; the ordinary controls now have different paths/gains.

The [contact receipt](../../data/reviews/current/contact-coupling.json) separates
this investigation from the earlier angle repair and its game results below.
We drew 24 clean completions uniformly from 913 in the frozen sixteen-game
cohort, seed `20261012`, before inspecting their outcomes. The supplied
69-YAC escape, original **S105-P159**, is a separate nominated witness.
Thirteen original game prefixes reproduced the selected plays, then observers
logged only existing perceptions, raw requests, applied intents, body impulses,
support, grips and their solved loads. Observed and plain executions agree.

The repeated wrong mechanism was **partial-gather facing**, not weak hands.
In 22/24 ordinary plays, the partial tackle gather turned away from the acquired
hip: `angleDiff` returns the second angle minus the first, but its arguments
were reversed. We confirmed 236 raw and applied facing requests; 15 plays
include errors of at least 30 degrees. Their first affected actors are free,
without their own body contact or grasp. The corrected interpolation turns
toward the hip along the short arc, within the unchanged movement limits.
This repairs a request; it does not award contact or remove aiming uncertainty.

Twenty ordinary plays acquire grips, and all 30 grips carry positive solved
load. Four loaded grips break, but all four plays are subsequently tackled.
The four no-contact touchdowns include one catch already beyond the goal line
and two with less than three YAC. The nominated 69-YAC escape has **no grip and
no opposing body impact**. Calling it a grip failure would select the wrong fix.
Raw velocity is refined before World in 51 affected commands; facing alone
does not establish the achieved speed or causal effect on the eventual gain.

The gather fix alone leaves the nominated touchdown. Its next wrong mechanism
is the **outside-arm reach gate**: the defender declines a passing hip because
the runner is not yet separating at 1.5 yd/s. He never reaches or wraps.
The repaired controller permits the existing marginal lunge when its delayed
picture confirms possession and the production movement preview says the
closest attainable hip is now, outside standing reach but inside lunge reach.
It still waits for a better standing wrap, respects occlusion, and does not
invent a forecast through an existing joint, recent contact or fallen support.
The preview holds the actual applied command; it cannot know future cuts.

At 4.00 s in the original input, SS has first acquired possession, with a
0.15-second-old cue. His predicted closest distance is 1.833 yd, now. Actual
distance is 1.707 yd, outside his 1.538-yd standing reach. The ordinary lunge
creates a weak leg hold, which carries positive load on the following step.
The tackler goes off his feet; the carrier loses support later. The unchanged
grip and World then produce a tackle at 4.70 s: **69.45 → 4.75 YAC**.
No tackling rating, force capacity, miss roll or solver resolution increased.

Four original preplay setups were restored with actual coordinator returns,
personnel, snap RNG, fatigue and learned scouting. The native baseline must
reproduce exactly before a candidate result counts. Three ordinary controls
retain identical final bodies, intents, minds and RNG relative to the gather-only
repair; the nominated fourth changes through the new reach. The final recording
wording also distinguishes waiting from taking a last reach; it has no physical
effect. These are source-only pairs, not later game IDs after calls diverge.

This sample does not certify all tackles. An acquisition is not a body impact;
capacity saturation is not proof of outward grip slip; support failure and an
intentional dive must remain distinct. Separate approach/load traces and all
adverse panel cases are retained in the receipt. Missing assistance was not
established as the repeated cause in this sample.

In the retained 128-encounter and 32-approach panels, all endings, censoring and
initial/profile pins remain. The facing change adds carrier advance in 24 and
7 cells respectively (largest absolute changes 0.79 and 0.32 yd); they are
retained tradeoffs, not ignored bad outcomes. The last-reach increment leaves
all 128 encounter rows exactly unchanged relative to facing alone and changes
only decision records in 16 approach rows. Genuine faster-runner escapes remain.

The final sixteen-game default-center check is mixed: clean mean YAC 10.51→10.53
yd, p90 28.02→30.63, and points per team-game 47.5→48.8. Cohort 101 scores
52.6→57.4, while cohort 202 scores 42.4→40.3. Designed-run success remains
29.9%, but runs of 20+ yd rise from 3.2% to 5.0%. Both cohort guards and the
pooled guard pass 12/12 at their unchanged thresholds. The receipt distinguishes
all-play cohort tracking guards from the clean pooled outcome operator.
This is not a broad YAC/scoring improvement; calls, situations and RNG diverge
after changed results. Re-sample current ordinary mechanisms before another
controller change. The correct angle and visible last-reach rule were not
selected or retuned to improve an average.

### Jump and landing remain an evidence gap

An independent reconstruction uses the exact ball segment consumed at catch,
not rounded replay height. One of the 24 ordinary catches is 0.262 yd above
`reactReach`; the nominated catch is 0.273 yd above it. `reactReach` already
includes some leap capacity, so these are not counts of every airborne catch.
All are within `maxCatchHeight`. Possession currently leaves achieved body and
support state unchanged: the model lacks a real jump/landing transition.
That gap merits high-versus-low matched catches before implementation. It does
not establish that jumping caused the nominated escape or justify slowing all
receivers after catches.

The frozen probes and their input preparation are preserved in
[the research archive](../archive/research/catch-contact/README.md), outside
production and default tests. Large recordings stay in ignored `out/`.

## What changed, and why

`pursuitPoint` computed an intercept from acquired motion, then subtracted
`(1 - pursuit) * 0.3` seconds in addition to its per-play aiming error. This
systematically flattened poorer pursuers' angles. With identical bodies,
constant-motion observations and zero aiming noise, rating 10 aimed 1.469 yd
behind rating 90. Both should pursue the estimated intercept in this control;
poorer skill can produce larger execution/estimation errors.

The fixed offset is removed. The same delayed observations, acceleration
forecast, reach estimate, force leverage, gathering, random stream and cached
per-play error remain. Error can put a player ahead or behind the estimated
intercept, with its spread still tied to pursuit skill. Physics capabilities
and the contact solver are unchanged by the angle repair. The later shared-branch
merge preserves the other session's opt-in hand patch; default hands remain
`center`. Its promotion failures remain documented in the
[zone prototype review](zone-flow-prototype.md).

Perception already extrapolates old position using old velocity. Constant
straight movement therefore is not simply position-lagged. An unseen cut still
creates an incorrect picture. The repair removes extra underlead; it does not
remove reaction delay or make defenders know the next cut.

The back-man contract now checks a braking request against the actual retreat
velocity. Its existing World assertions still require achieved deceleration,
bounded ground impulse, upright support, mirrored movement and accounted work.
A requested velocity need not be negative to slow positive movement.

## Matched transfer before whole games

The [receipt](../../data/reviews/current/pursuit-control.json) pins source,
inputs, collectors, results and adverse cases. Full states stay ignored.

- **128 paired encounters:** two generated roster pairs, RB/WR carriers,
  two seeds and both mirrors. Front, oblique, trailing, retreat, held reversal,
  boundary force and genuinely faster escape cases reuse ordinary native
  22-body ticks, tackle rolls and grips. All 128 observed runs match their
  unobserved physical/RNG controls on each source; all 64 mirror pairs agree.
- Original 112 encounters remain unchanged after adding the supplemental
  16 free-cut entries. The faster-escape fixture initially failed its capability
  prerequisite; it now selects a genuinely slower native DT by profile, without
  changing abilities or selecting outcomes. Supplemental cuts were declared
  after identifying the original panel's coverage gap, before their outcomes.
- The free runner physically brakes and reverses at 1.90–2.05 s after the
  scenario starts. No defender acquires a grip before the commanded cut at 1 s.
  Acquired/positively loaded grips increase 12→14; missed events fall 4→2.
  All 16 remain live at the five-second bound, so this is not a tackle-success
  rate. Two difficult RB misses remain; their minimum separation worsens
  1.92→2.03 yd. There was no reroll.
- In one mirrored ordinary oblique WR encounter, first acquisition is slightly
  earlier but weaker; completion takes 1.7→3.0 s. This is a retained tradeoff,
  not a universal tackle improvement. Front/retreat outcomes and all 16 faster
  escape controls retain their behavior.
- **32 existing contact/approach cases:** every initial/profile pin matches.
  Ordinary native initial wraps remain 16, loaded grips 19 and broken grips one;
  misses fall two→one. All four adverse split-zone cases still finish. The weak
  glancing reaches and faster-carrier escapes remain difficult/censored.

An acquired grip is not a body impact or proven restraint. These collectors
separate consumed cues, raw commands, applied intents, actual body contacts,
grip acquisition and first positive solved load. The private error-shifted
chosen aim is not recorded; the reconstructed unbiased estimate is labelled.

## Earlier angle-repair game effects: diagnostic evidence

The same two roster pairs played eight games each before and after the angle
repair. After the first changed outcome, later calls and RNG histories diverge;
same game seeds do not make every subsequent play a paired counterfactual.
Outcome rows exclude all flagged fouls and use the corrected actual recipient.

| Measure | Before | Angle repair |
| --- | ---: | ---: |
| Points per team-game, all game events | 55.9 | 47.5 |
| Mean YAC, clean completions | 12.32 yd | 10.51 yd |
| YAC p90, clean completions | 39.68 yd | 28.02 yd |
| Mean gain per clean completion | 20.17 yd | 18.11 yd |
| Completed gains of 20+ yd per throw | 19.9% | 17.6% |
| Designed-run success, 40/60/100 distance rule | 27.7% | 29.9% |
| Interceptions per throw | 6.1% | 6.2% |
| Sacks per dropback | 3.9% | 3.4% |

Both scoring cohorts improve: 67.4→52.6 and 44.4→42.4. YAC remains far above
the NFL reference. The [prior comparison](nfl-gap-review.md) pins that reference
and its limits. These figures did not select the offset or a physical capacity.

**One guard fails and remains reported.** Seed 101 and pooled pass 12/12;
seed 202 passes 11/12 because run box-count median changes seven→six. Its mean
changes 6.732→6.692, with 51.8% now at six or fewer rather than 46.5%. The
integer median crosses a threshold as calling/situation exposure changes.
All 32 fixed native/encounter starting states are unchanged. The guard and its
thresholds are preserved; this is a flagged full-game mix change, not a passing
guard or evidence of an alignment repair.

At the angle-only source, all 1,232 TypeScript tests, including integration
and preserved research, and 141 Python tests pass; typecheck and build pass. The isolated known
hand/contact angular-law failure remains open. A green test suite does not
certify finished football or contact physics.

The later merge of the other session's `36c294c` was rechecked at source
`0398418c`. All 1,238 TypeScript tests and 141 Python tests, typecheck and
build pass. Both eight-game exporters reproduce the angle-stage tracking
files byte-for-byte; native rosters, games and play outcomes also match exactly.
The outcome/guard comparisons above therefore still apply to this default.
All 128 controlled encounters retain their initial/profile pins, ending,
events, contact/grip/load timing and RNG. Tiny internal floating-point differences
remain (maximum body position difference 5.19e−11 yd); do not claim exact
physical-state identity across the merge. Observation controls pass on both.
The common hand patch stays opt-in, with its native promotion failures retained.

## What the supplied research establishes

The new pursuit write-up is right to distinguish a chosen angle from an
achievable movement. But analytical reach being approximate does not prove
that it is always optimistic. `chooseApproach` already previews three held
commands through the production World near an upcoming approach. More previews,
fixed aim dwell or a new foot model need a demonstrated failure and measured cost.

The branch report also overstates what its comparisons rule out. Marginal
acceleration distributions cannot certify constrained movement; receiver course
correction cannot independently establish QB accuracy. A speed/further-gain
broken-contact proxy does not identify a grip failure. The joint's `slipping`
flag means force-budget saturation, including inward reeling, rather than a
measured outward slide. Nominal grip capacity is not the effective shared budget.

We tested one further controller hypothesis: an upright side holder requests
running velocity while facing toward the hip, potentially causing a shuffle.
Changing only the applied facing to the travel direction did not reproduce a
secure-grip failure or consistently improve the encounter. Advances were mixed,
and a natural side case gained more. Front/stationary/aligned-rear controls were
identical. That candidate was rejected; tackle behavior and strength remain as
before. The receipt distinguishes natural and staged-grip trials. The small
[archived probe](../archive/research/held-facing-probe.ts) retains reproduction
on its pinned source; it is outside production and the default test run.

## Next work

Re-sample current ordinary catch approaches before selecting another change.
Use the consumed cue, commitment, applied movement, achieved support, body
impulse, radial/transverse motion, load and release reason to distinguish a
missed acquisition from a positively loaded hold that actually breaks.
The repaired witness no longer supports a grip-strength diagnosis. Continue
the hand-contact promotion investigation alongside this review; its independent
law correction is not yet a safe production default.
Do not strengthen a grip to compensate for a missed or unattainable approach.

For coverage, collect actual pre-release technique/request traces before
installing in-stride catches. A nearby defender's slowing after the throw is
not proof of a pre-throw error. One candidate is a deep match defender's
break-and-drive branch retaining QB-facing during a fast horizontal break;
the cap and competing vertical responsibilities can make that legitimate.
Compare crossers with stationary windows and normal vertical carries first.

No broad optimizer, compulsory pursuit dwell or expanded foot solver follows
from this work. If two candidates fail the visible mechanism or an ordinary
control breaks, stop and re-diagnose.

Reproduction, Node 22; old source can be read through the baseline archive
described in the receipt rather than changing the live checkout:

```sh
node --import tsx scripts/diag/pursuit-transfer.ts out/pursuit-controller/transfer.json.gz
node --import tsx scripts/diag/tackle-approach-review.ts out/pursuit-controller/approaches.json.gz
node --import tsx scripts/mechanics/sim-export.ts --seed 101 --games 8 --out out/pursuit-controller/plays101.jsonl.gz --review-out out/pursuit-controller/outcomes101.json
# Repeat seed202; use the existing outcomes.py and measure.py from the prior review.
npm run test:all
npm run test:data
npm run typecheck
npm run build
```
