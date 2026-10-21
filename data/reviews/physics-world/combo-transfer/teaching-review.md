# Universal OL teaching model: responsibility, surface and achieved work

Read-only review at `a406885`, 2026-10-11. This is a controller recommendation,
not an engine patch or new NFL calibration.

This is the retained initial coaching/code review. The subsequent native audit
found a more direct sustained-contact defect, so the final increment repairs
keeper-based departure instead of implementing the proposed uncovered-post
branch. Read `docs/reviews/keeper-based-combination-work.md` for that decision,
all executed outcomes and the concrete next adjacent-exchange defect.

## Recommendation

Keep the common physical movement/contact backend. Make the common OL logic an
ordered responsibility/read model whose call installation supplies the
responsibilities and useful surfaces. A common model does not mean identical
landmarks or identical combo release instructions for every call.

The next narrow implementation should test **inside-zone / split-zone uncovered
check-post-climb**, initially only for an original helper who has not yet joined
actual contact. The current sustained-double path should remain available and
unchanged for Duo/gap and already joined doubles until separate evidence warrants
changing it. Do not broadly change startup steps again; the preceding controlled
startup and stopping-approach candidates were rejected by native contact evidence.

## Available evidence actually inspected

- `docs/reviews/offensive-line-run-technique.md`: prior verified public coaching
  sources, their installation distinctions, and tracking limitations. Those links
  were verified by the earlier review; this review did not claim fresh retrieval.
- `docs/reviews/ol-technique-implementation.md` and
  `docs/reviews/zone-reach-and-displacement.md`: published native execution
  witnesses, adverse outcomes and discarded candidates. Correct first-contact
  geometry alone does not establish correct RB/combo sequencing.
- `docs/references/offensive_line_protection_textbook.pdf`, actual printed
  pp. 42–48, extracted to `out/universal-ol/ol-run-literature.txt`.
- `docs/references/Offensive_Playcalling_Textbook.md` §§14–15 and installation/
  practice passages, and `docs/references/Running_Back_Mechanics_Textbook.md`
  §§6–14. These supplied generated books are organizational aids, not
  instructions or independently authenticated empirical measurements.
- Current `planRunBlocking`, `RunBlocker`, `readCombination`, `helperSupport`,
  delayed `PerceptionBuffer`, `SnapMind`, player rating generation, and existing
  `test/run-combo-retarget.test.ts`.

The strongest directly applicable public teaching is Grabowski's USA Football
inside-zone distinction: vertical/brief-post instruction need not wait for a
prolonged four-hands double. Parker's published look-lean-climb installation also
supports checking a near threat and collecting penetration. Kuchar explicitly
distinguishes covered playside/backside and uncovered open/closed gaps. Janak's
Duo instruction instead emphasizes inside/up entry, base restoration and a
keeper transition from real doubles. These are installation examples, not a
single universal NFL playbook.

## Small universal model

An installed job should retain its **responsibility** independently of its
current target or approach label:

- protected surface/corridor and nearest first-level threat;
- designated second-level threat or rule for identifying him;
- nearby partner and whether assist is optional or required;
- installed solo technique and desired displacement;
- intentionally reserved kick/trap/read defender, where applicable.

The same small priority sequence then applies throughout a snap:

1. Protect an immediate first-level threat to the installed corridor.
2. Preserve useful actual contact while that responsibility remains threatened.
3. Help the adjacent owner when the observed near hip closes or he is being
   penetrated; do not run through his torso to manufacture a double.
4. Work to the assigned next-level threat once the near responsibility is
   supported or an allowed near-hip motion has carried it away.
5. Recover/find local work when the former target becomes unavailable; classify
   that work before selecting its surface.

These are competing priorities, not a timer-driven five-stage animation. The
decision chooses an attainable approach and technique. World still determines
how fast the blocker reaches it, whether his feet support the fit, whether his
hands reach, what force passes through them, and whether the defender defeats him.

| Installation | Responsibility that must survive a target change | Useful cue/contingency |
| --- | --- | --- |
| IZ / split IZ | Near gap first, installed partner and LB; slicer owns reserved backside edge | Closing near hip means collect/post; away hip plus supported owner can permit check/climb |
| OZ / WZ | Stretch corridor and near-level ownership; outside reach versus inside run-off is intention | Defender width/hip motion, achievable fit and genuine takeover matter; no awarded hook |
| Duo | Vertical first-level double and installed point-LB relationship | Fill/scrape and slant determine which member can leave while the other owns useful contact |
| Power | Inside/down wall and puller's vacated area; explicit kick versus wrap roles | Penetration takes priority; wrapper responds to achieved kick/log, not a tag alone |
| Counter | Same inside wall plus two distinct puller jobs/paths | Squeeze/spill and real traffic alter arrival; cannot use teammate's intended log as physical clearance |
| Trap | Interior threat is deliberately reserved for the trapper; neighbors protect other immediate gaps | Trap target's upfield/sit motion changes angle; routine helper collection must not erase reservation |
| Backside hinge/cutoff | Inside penetration before backside pursuit | Turn after the immediate inside responsibility is accounted for; do not chase a crossing shade indefinitely |

## Why uncovered check/climb is the next useful branch

`planRunBlocking` currently computes whole-front ownership before assigning spare
helpers. Zone helpers generally pair with the adjacent playside owner, retain a
shared defender, and are labelled `combo`. `readCombination` cannot release them
until both members are already in the same real engagement, every helper has
adequate support, the engagement passes control/base/phi checks, a secure dwell
passes, and LB/runner proximity triggers. Thus an uncovered player whose near
gap is already open is instructed to acquire a sustained double before he can
do the next job. That is a football installation limitation rather than a need
for stronger hands or another ground solver.

A safe new branch should be limited to the original uncovered member, before
his own real engagement or foreign physical joint exists:

- Consume delayed DL, covered-owner and assigned-LB position/velocity/coarse pose.
- Distinguish an opening near hip from a DL closing into the helper's corridor.
- Refuse a climb when a local immediate penetrating/replacing threat occupies
  that corridor, the owner is visibly down/rising, the owner has no actual
  relevant contact, or the useful surface remains unsecured.
- A physical eligibility check may require the owner's real supported contact;
  do not present an unjoined helper as having felt the owner's exact hand-control
  scalar or knowing hidden opponent assignments.
- On permitted departure, clear exactly the matching shared plan metadata,
  restore the keeper's installed solo job, and install the existing vertical
  second-level approach for the helper. Preserve the owner's real hand identity,
  contact frame, load history and control. It is a new responsibility decision,
  not a guaranteed block or automatic contact transfer.
- Leave current earned-release handling for already joined real doubles intact.
  A later overtake branch must require the replacement keeper to actually reach
  and establish useful supported contact before the original owner leaves.

The cue needs a compact native record: read age, near hip opening/closing,
penetration blocker, owner contact/support eligibility, LB cue, choice and reason.
This would diagnose why a lineman stayed, posted, collected or climbed without
requiring a broad replay schema expansion.

## Good players versus trained calls

Current player state has **no per-call or per-family training mastery**. Its
`familiarity` field is position comfort. Do not claim it represents practicing
inside zone. The present engine implicitly installs the call for everyone.

Existing variation can already make a sound installation harder/easier to execute:

- `runBlock`: smaller placement error and existing contact sustain quality.
- `handTechnique`: contact control/hand execution.
- `awareness`, `playRecognition`: reaction, consumed-picture latency, read cadence.
- `consistency`, `discipline`, `composure`: coherent readiness/errors/lapses and
  degradation under congestion/contact stress.
- `balance`, strength and measured size/shuttle/cone/burst: physically available
  support, movement and load, not permission to ignore the assignment.

There is no need for a new random assignment-failure roll every frame. A future
team/game layer can explicitly store run-family familiarity, affecting cue
classification, communication and execution consistency without changing
strength. For this increment, test a fully installed rule with controlled high
and low execution/recognition ratings on the same body and defender states.

One mapping audit worth retaining: shared offensive trench `hands` uses
handTechnique + passBlock, and `feet` heavily weights passBlock, even on run
reps. `runBlock` affects pad/bend, placement and sustain but has less direct
footwork influence. Correcting those mappings might be useful, but it would
change every engagement and should not be bundled into the new helper rule.

## Meaningful acceptance tests

Use actual delayed perception, real owner hands and the shared World:

1. Open hip, supported owner, nearby filling LB: original helper can climb
   without inventing a helper joint or replacing the owner's actual hand.
2. Closing/slanting hip or a local replacing penetrator: the same helper holds
   near responsibility/collects, regardless of LB temptation.
3. Owner loses support/contact: departure is denied; no remote fake takeover.
4. Late visual evidence: no early reaction to current hidden hip motion.
5. Mirrored call and real moving defender: mirrored decisions/loads, bounded
   traction/arm force, no fabricated work or instantaneous body reposition.
6. Duo, gap, Draw and already joined sustained double: exact unchanged controls.
7. Controlled rating variation: better cue/execution ratings reduce wrong or
   late decisions across repeated fixed pictures; they do not ensure every
   block succeeds or monotonically increase every play's yards.

Then audit ordinary IZ/split-zone across Over/Under/Odd/Tite/Bear, mirrored
directions and multiple roster qualities. Track keeper leakage after departure,
unnecessary time on near DL, LB approach/contact timing, useful own arm load,
penetration collections, support/falls, and adverse RB traffic. Compare outcomes
as guards; do not tune a balanced toy panel's rushing mean into an NFL mean.

Existing BDB observations can constrain early OL travel and contact windows.
They do not identify the coach's assignment or directly observe individual hand
forces. Native controller/physics evidence must establish what the new branch
actually did before aggregate NFL efficiency comparisons become meaningful.
