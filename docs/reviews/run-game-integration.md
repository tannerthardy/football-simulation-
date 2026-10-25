# Run-game integration, defensive reads and loaded recovery

The controller branches can be combined without an engine conflict, but the
experimental physics still do not support promotion. The observed-pull repair
removes one information leak without materially improving defensive flow.
Continued recovery makes several loaded paths more consistent, retains the
new ordinary controls, and still changes a side-cut ending with resolution.
No NFL deficit is claimed repaired by this pass.

The isolated branch is `codex/run-game-integration`. It combines primary
`1ecae63`, live-gaps `b50fa37`, and second-sim `67301d2`; both workboard sides
were preserved. Main, PR #1 and the shared remote branches were untouched.
Capacities, traction, grip, balance thresholds and production resolution are
unchanged. All experimental flags, including both RB-read flags, retain their
defaults. [Compact receipt](../../data/reviews/current/run-game-integration.json)
retains paired endings, worse spots, missing samples, sources and tool hashes;
full histories remain in ignored `out/run-game-integration/`.

## What should merge

1. **Live-gaps into engine-priorities is the principal integration.** At the
   surveyed pins it has 50 commits absent from primary; primary has three
   workboard commits absent from live-gaps. The only conflict was the board.
   This includes the earlier default-on run-fit, blocking, physical-shed,
   keeper and release work, plus the disabled experiments. The same Tite
   assertion fails; it was not removed or re-pinned. Primary's request to
   inspect its hand/facing/transfer behavior still stands. Document that
   failure when integrating; a statistical improvement does not validate it.
2. **Rescue `83e514a` behind `IN_STRIDE_CATCH=1`, off by default.** The moving
   catch-phase repair did not include it. The original selector/steering is
   preserved behind a guard, including reaction delay, tracking error,
   physical reach checks and fallback. The [source/test patch](in-stride-catch-rescue.patch)
   applies cleanly to primary independently of receipt cleanup. Four focused contracts cover running,
   short and high balls. Default-on coverage/scoring validation is still
   required; the historical 47.5→68 points result is not a current measurement.
3. **Reach-contact work can travel as disabled research, with its adverse
   controls.** This integration includes `REACH_CONTACT` and `TACKLE_TOUCH`;
   it does not endorse enabling them. All 32 default native plays have exact
   state/RNG fingerprints against the archived live-gaps source. Five bulky
   receipts are linked to immutable `67301d2` evidence instead of adding
   approximately 42,500 pretty-printed lines to the integration diff. Small
   replay witnesses remain local; reducers now default their reports to `out/`.
4. **The three parked research documents are preserved separately:**
   [run blocking](run-blocking-diagnosis.md), [pass-rush hands](pass-rush-hands.md),
   [trench investigation](trench-deep-dive.md). Each identifies its original
   source. The pad-line and HANDS2 engine packages remain parked.

`RUN_ANCHOR` and `ANCHOR_SPLIT` do **not** apply two anchors. The former
enables the one controller; the latter selects its lost-depth implementation.
The remaining 30% lateral request during genuine backdrive is still present.
The release now uses torso-relative leverage rather than fixed-frame phi, but
still credits `turnRate*dt`; that ceiling is not achieved loaded rotation.
This review does not silently certify or re-pin that existing behavior.

Easy-gains, defensive-flow and run-game-contact are ancestry-contained here.
Pursuit-coverage and the older decision-dynamics branch have uncontained
commits despite overlapping/superseded code. Do not call them ancestry-clean
deletion candidates. No branches were deleted. Keep trench-investigation and
the physics backup until their source links and any unique material are saved.

## Defensive flow: a real cue defect, an insufficient fix

Reuse the 32 shared run-game inputs, the previously inspected 16 fresh inputs,
and 12 newly declared calls: roster 111/112, seed 23, mirrored power, counter,
OZ, WZ, PA Flood and PA Post Dig. These generated checks are not a blind NFL
test. The experimental stack is exactly the nine flags in Claude's
[combined report](flag-stack.md), excluding HAND_FIGHT. Compare that stack
with only `PULL_CUE=1` added. Every observed execution matches a plain run.

`pullers()` used the line picture's departed list. Its classification depends
on the opponent's actual engagement, so a still-seen pulling guard can vanish
from the read as soon as he acquires contact. In counter seed 7, at 1.70–1.75 s,
LB_M still sees RG behind the line moving playside at 4.61–4.63 yd/s, age .20 s,
while that hidden contact disqualifies him. The resulting held target asks
the backer toward the backside. This is an acquired-cue/classification error,
not a late recognition or an offensive-play lookup.

`PULL_CUE=1` uses the **same observed departure geometry** and motion limits
without conditioning on private contact state. It adds no memory timer,
speed, stronger planner or new squeeze/bounce answer. Four mirrored contracts
check retained cues after hidden engagement, and still/stopped negative cues.
It stays disabled:

| Shared mean LB playside displacement at exactly 2 s | Stack | + cue repair |
| --- | ---: | ---: |
| Power, four plays | .678 yd | .678 yd |
| Counter, four plays | .976 yd | .971 yd |
| OZ, six plays including exchanges | 2.117 yd | 2.117 yd |
| WZ, four plays | 2.560 yd | 2.560 yd |

All shared OZ/WZ/IZ paths are exact. The old fresh WZ mirror changes gain
1.922→1.904; the shared counter mirror changes 2.247→2.203 and duo mirror
1.929→1.878. Draw and one PA Flood path change, while their gain remains
unchanged; two new PA Flood paths also change. All new power/counter/OZ/WZ
paths and their gains are exact. Those small/control changes remain explicit;
the cue repair does not establish a broad flow or misdirection improvement.

The next read problem is **handover from the pull/flow target to the runner**.
At counter seed 3's 1.95-s decision, LB_M's desired and held Y are 23.836,
while his acquired carrying RB is at Y=28.383, X=37.292 with lateral speed
.786 yd/s. The pull target can exceed the existing six-yard reach gate, and
the back's lateral motion can drop below the 1.5-yd/s flow gate. The fit then
returns toward the moving down-block gap. Preserve the deep-mesh, contain,
cutback and play-action controls before changing this transition. The earlier
failed PULL_PLAN trial and this insufficient cue trial are retained; no third
planner or target-amplification rule was stacked.

The DL deficit is **not established as a read-only problem**. On the same
counter at 1.45–1.50 s, DT_S requests +4.560 yd/s playside and receives
+53.744 kg·yd/s ground impulse in that direction, yet ends at −2.152 yd/s.
His felt lateral load is −972.821 and he remains upright. That is useful
request/execution separation: contact and prior motion matter. It does not
prove a bad capacity law or justify raising strength. Likewise, the cue
repair leaves OZ exact; increasing its read request cannot be credited with
fixing loaded lateral work. The existing hand/gait alternatives are the
relevant controls, not a requested NFL pair-speed floor.

All fixed-time samples require an actual live frame. Short-ended plays are
absent at 3 s, never replaced by their last frame. The repaired trench
operator and its synthetic negative cases remain intact. Proximity and an
engagement object are not counted as physical runner contact.

## Loaded recovery: broaden the candidate before adopting it

Use primary's unchanged continued-recovery implementation. It clips the ankle
target to the existing base and continues an already-started response through
the inward crossing. Its scratch fixed-point solve is a diagnostic, not a
production implementation. No added grip, deeper hold, stronger leg or new
finishing policy is introduced. Both early-contact flags are off here.

The native impulse observer initially failed because it watched live bodies
while recovery executed scratch Worlds. Sixteen failed captures are retained.
Trial-local impulse journals now move with the **accepted** scratch state;
rejected trials contribute nothing. Work, momentum and arm/support guards
remain strict. This repairs measurement, not the physical law.

With LEG_BRACE, TACKLE_ROLL, WRAP_BIND and GAIT_STEP=.3:

| Native panel | Baseline finishes | Continued recovery |
| --- | ---: | ---: |
| 16 selected matched cases, 12 steps | 14 | 10 |
| Eight of those controls, 48 steps | 2 | 2 |
| Eight newly declared roster-111/112 cases, seed 7001, 12 steps | 8 | 8 |
| Mirrored patch 45°/8, 12 and 48 steps | 0 / 0 | 0 / 0 |

Four matched coarse finishes become censored: mirrored 135°/3 and 180°/8.
The patch controls remain actual escapes at both resolutions. Every ending,
absolute final spot, actual first-load interval/depth, and speed/live state at
the baseline contact clock is in the receipt. Missing speed samples are null;
later acquisition is not substituted for the shared clock.

Candidate 12-vs-48 maximum common-boundary path differences:

| Mirrored input | Difference | Endings |
| --- | ---: | --- |
| 45°/6 successful control | .01135 yd | Fall / fall |
| 135°/6 | .02628 yd | Censored / censored |
| 180°/8 | .01131 yd | Censored / censored |
| 90°/3 with cut | .95722 yd | Fall / censored |

The side cut is still not reliable. Its first **path difference over .1 yd**
is at 4.35 s, not necessarily its first causal physical error. Requests and
coupling already differ then; depth is the same .52061. This requires an
earlier same-prefix/frozen-request fork, not a new recovery coefficient.
The new ordinary controls preserve all eight finishes; that is bounded
positive evidence, not universal convergence or a claim that NFL .8-s
survival is fixed.

The saved four-body WZ collision also remains an adverse control. The old
12-step World input reproduces exactly; continuation changes the endpoint
only slightly and **LG and DT_W still fall at both 12 and 48**. No acquired
foot is restored without its prefix; this checkpoint has none. A better
recovery law must not automatically erase a legitimate loaded impact.

## Claude's hands work and the next decision

The active hand motor supplies a missing action: passive steering could only
brake relative slip. It uses existing arm-force, speed and work envelopes;
it does not award displacement. The 22 mirrored center/patch drills pass
momentum and force/work budgets with the motor, both with and without
continued recovery. The center drag carries the defender 1.816 yd, versus
1.807 with recovery. The large patch turn remains about 82.6° versus 81.4°;
recovery does not resolve that concern. Center hands' known angular-law
limitation is not certified away by these linear/work audits.

RUN_HANDS and DL_HANDS should remain separate offensive/defensive controls.
HAND_FIGHT should remain off: its driven-back blocker → reduced balance
credit → lost hands → more backdrive loop, and the opposing player's
contact-supported lean, still need a physical leverage explanation. The
new hands do not establish which player earned inside position.

**Single best next step:** isolate the first loaded 90°/3 side-cut divergence
using identical incoming state and frozen decisions, retaining the successful
45°/6 and fast-rear controls. Recover support, grasp/yaw and delivered-load
history before changing the continuation law or promoting gait/hand/tackle
flags. In controller scope, the next separate job is the acquired pull-to-ball
handover, rather than another stronger lateral planner.

Validation: **1,644 TypeScript assertions pass; the existing Tite assertion
fails**, intact. All **145 Python checks**, typecheck/build, 62 focused flow
checks, 24 rescue/catch checks and 21 recovery assertions pass. Native captures
pass observer/plain identity and actual momentum/arm/support/work assertions.
No new combined game/NFL promotion claim is made after the finer controls fail.

Reproduction uses Node 22. Flow/recovery stage source is `00a01c0` (SHA-256
`27e5c5e3289ff11e38381418a8e5db68c02ddd1a36c5517fac523479d178d772`);
the later catch rescue changes the whole source hash while its default remains
exact. Collector/helper hashes identify the executed diagnostic laws separately.
Use `scripts/diag/defense/flow-panel.ts` with the named manifests and stack;
`scripts/diag/physics/reach-contact-panel.ts` accepts `--cells`, `--seed`,
`--rosters`, `--patch`, `--substeps`, `--continued-recovery` and
`--retain-failures`. A collector failure exits nonzero even when retained.
The compact receipt records every selected cell and seed. Reduce collected
panels with `scripts/diag/run-game-integration-report.py`; its default output
and the large histories remain in `out/`.
