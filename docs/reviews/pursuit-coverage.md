# Pursuit control and the next contact investigation

Updated 2026-10-11. The pursuit-angle change from `claude/pursuit-coverage`
(`576581b`) is now applied narrowly to `claude/engine-priorities`. The in-stride
receiver change is still experimental; it needs its own coverage/ordinary-catch
controls before installation. Outside/wide-zone technique remains separate work.

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
and the contact solver are unchanged.

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

## Native-game effects: diagnostic evidence

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

All 1,232 TypeScript tests, including integration and preserved research,
and 141 Python tests pass; typecheck and build pass. The isolated known
hand/contact angular-law failure remains open. A green test suite does not
certify finished football or contact physics.

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

Trace current native failed acquisitions and positively loaded holds that
actually break. Record the consumed cue, commitment, applied movement, achieved
support, body impulse, radial/transverse motion, load and release reason. Fix
the first wrong request or response, preserving ordinary and adverse controls.
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
