# QB_V2 quick-game card spec: picture age, the adapter boundary, the decision scorecard (2026-11-24)

Recorded by Integration from the outside reviewer's (Gemini) spec, with Integration's rulings marked. It is the gate
for carding QB_V2 as the quick-game passer. It follows `2026-11-24-qbv2-outside-audit.md`.

## 1. Picture age

**The fault.** The arrival spread grows with picture age and is symmetric. For a defender projected to arrive in
time, a wider symmetric spread lowers his arrival chance, which raises the throw's completion estimate. Time alone can
turn a refused throw into a thrown one.

**The rule (accepted).** The spread keeps only observation and forecast noise. Time out of sight acts one way: an
unseen man may have moved toward the catch point, never assumed to have left it.

- fresh spread: `hypot(ARRIVE_SIGMA0, hypot(d.spread, recvSig) / vmax)`;
- unseen advance (seconds): `(0.5 · UNSEEN_DRIFT · age² + UNSEEN_DRIFT · age · horizon) / vmax`;
- `pArrive = phi(((tBall − tArr) + unseenAdvance) / freshSigma)`, at each of the three places arrival is judged.

Properties: identical to today at age 0; arrival chance never falls with age, whatever the margin; one parameter
(`UNSEEN_DRIFT`, to be re-checked on the role calibration rows, expected a little lower).

**Integration's notes.** This is a caution the passer applies, a stated choice, not a claim that unseen defenders
close: label it so. It satisfies our rule (a decision changes only on a perceived change) in the direction that
matters, since age can refuse a throw but not grant one. The coached answer to a stale key remains a look at him;
the cycle should send his eyes to a key whose picture is old before it judges on the shifted number.

## 2. The boundary: `src/sim/qbv2/host.ts` and `src/sim/behaviors/qb.ts`

The host adapter and the step function move into `src/sim/qbv2/host.ts`, and the scan test adds that file and also
rejects the defense's call, `.slot`, roster position, `.profile` and rating reads on defenders.

**What V2 may ask for, and from what it may be built.**

| Asked | Built from | Never from |
|---|---|---|
| His clock and footwork (now, snap, plant, stride, read start) | The play clock, his own drop | Anyone else's timers |
| His own position, facing, release height | His own body | Another body |
| Outside the pocket | The existing test with its enter and exit margins | The raw boundary |
| Felt rush; the hot side | His felt rush; the side of an unblocked rusher he sees | A fixed null; a blocker's true engagement |
| His processing rate, need, bar, lead | The ratings table from his own ratings and felt rush | An archetype; a defender's ratings |
| A defender's believed position and motion, its age and spread | His own picture | True position, velocity, facing |
| Whether a defender is up; where his head points | His cone-updated picture, null if unseen | True down state; a picture taken outside his cone |
| Whether a defender is a defensive back | Visible grouping or alignment | The call's personnel, the slot label, the roster position |
| A defender's believed body and ball skills | The scouting report and seen speed | The true profile or rating |
| His receiver's forecast and route landmarks | The installed route and the seen release | The receiver's true position, engagement, down state |
| Whether a point is in his clear cone | His head, his position, his focus | True visibility |
| The throw's mechanics (catch point, flight time, can it be finished) | His own evaluation on the seen-receiver path | True receiver or defender state |
| His windup and believed placement spread | His own delivery and accuracy belief | The ball's true error |
| The pre-snap picture | His coverage belief, the called protection, the installed alignment | Teammates' live behaviour or positions |

**What V2 may command.**

| Intent | Carried out as | Rule |
|---|---|---|
| Throw | The throw starts | The cycle latches the throw only when the windup begins. A commit that cannot start falls back to the read. |
| Kill | A throw-away at his estimate of the receiver | Latches when the ball leaves. |
| Away | A throw-away | Reachable from the pocket: a contact rung exists. |
| Escape | The scramble, on his seen picture | Returns to the structure when he is back inside and clean. |
| Move, look | Pocket movement and gaze | Never changes the cycle's state. |
| Handoff | The mesh, or marked unsupported until the RPO work | Never falls through silently. |

## 3. The decision scorecard

Graded apart from completion. Each row is a staged cell (a mid-rated passer, `QB_V2=1`, `QB_QUICK_DRIFT=3`). Rows
whose taught answer needs a plan piece we do not have yet are marked and scored as not applicable until it exists;
they are not failures.

| Concept and look | Key and what he does | Taught answer | Check |
|---|---|---|---|
| Quick out vs off coverage | Corner stays off or bails; flat defender inside #2 | The out, before the break | Released at or before the turn; still clears when #1 is widened off his stem |
| Quick out vs squat or trap corner | Corner squats on the out | Refuse the out; next read on the next step (fade over him: needs the fade tag) | Not thrown into the corner; no skip at 0.3 s and no open-ended hold |
| Hitch vs off | Corner still backpedaling | The outside hitch | Out before the corner plants; no extra hitch step |
| Hitch vs press, or two-high with an uncovered slot | Corner pressed; slot with no apex defender | Refuse it; the slot hitch (fade conversion: needs the option route) | Never thrown into a press or squat corner |
| Slant-flat, key widens | Flat defender runs with the flat | The slant behind him | Cue resolves "widens"; read not left before the key declares; thrown on the break |
| Slant-flat, key sits | Flat defender sits or sinks in the slant window | The flat | A still key holds its cue; the flat thrown |
| Slant-flat, hook walls the slant | Hook inside the slant, flat covered | Reset to the backside or the checkdown | Neither front throw forced; backside reached on the next step |
| Stick, key widens | Flat defender widens with the flat | The stick | Eyes start on the key; thrown as the back foot lands |
| Stick, key sits | Flat defender sits on the stick | The flat | No cue flicker |
| Stick vs Cover 2 | The corner squats over the flat | Refuse the flat; the stick inside him (hole shot to #1: needs the plan) | The flat is not thrown into the corner |
| Fade vs press, no safety over the top | Press corner; safety away | The alert fade (needs FADE_FLAT's plan wired) | Alert taken with no help; refused when the safety caps it |

Where coaches differ (key read against pure progression; one step against three quick steps from the gun), the
scorecard uses the standard our plan encodes: a key read on the flat defender, and the measured gun drift.

**Invariants on every cell.**
1. No throw lock: every committed throw starts its windup on that tick, or the commit fails back.
2. No stale-picture flip: with no new observation of a defender, a throw's estimate never rises.
3. No hidden-state read: the scan passes with `host.ts` included.
4. The in-pocket throwaway is reachable, and leaving the pocket uses the margins and can be undone.

## Gates

- **Gate 1, to card the quick game:** the audit rows closed or deferred with a reason; the boundary above; the
  scorecard beating the old controller on decisions and timing; the invariants passing.
- **Gate 2, before intermediate, deep and play action:** cone-gated head and pose everywhere, the checkdown's
  `fromStep`, and post-snap confirmation of the middle of the field.
