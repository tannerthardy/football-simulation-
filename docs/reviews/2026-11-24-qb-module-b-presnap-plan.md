# Module B: the passer's pre-snap plan (design note)

Flex, 2026-11-24. For Integration's review before code. It covers module B of the QB decision plan
(`docs/reviews/2026-11-24-qb-decision-plan.md`, §3 and §6) and builds against the QB lane's interface,
`src/sim/qbv2/plan.ts` at 9a8a39020 (`QbReadPlan`, `PreSnapState`). Everything here sits behind the QB lane's `QB_V2` flag.

## 1. What B does

At the snap, B turns the passer's own pre-snap read into one `PreSnapState` for the plan the call carries:
`{ startRead, flip, alert, hot, confirm, belief }`. The cycle (module E) takes it as given:
- `new Cycle(plan, startRead)`, with the plan mirrored if `flip`;
- the hot answer judged once his pressure state reaches imminent;
- `confirm` as the defender he looks to confirm on the drop.

B decides once, at the snap. Every pre-snap movement (motion, stems, creeps) has already happened by then, because
QBMind is built after `MotionRuntime.finish` and `stageDefense`. So there is nothing to re-score before the snap, and
the commit-to-a-decision rule holds trivially.

## 2. What he may read (information honesty)

He may read:
- **His scan picture (`QB_SCAN`):** all eleven defenders, each with one error of his own, drawn once per play, sized
  by his recognition (0.3 + 1.0 × (1 − rec) yd deep, 0.7 of that across). B reads the same picture as the coverage
  features and the box count, so flip, hot and belief agree with each other.
- **His coverage belief:** QBMind's family belief built from that picture. It includes the disguise spread, so a
  disguised look fools him in the honest way.
- **The visible defensive structure (`QB_CANON_SEEN`):** the personnel and the front's alignment, with corners found
  by where they stand.
- **His own call:** the protection (who stays in) and the plan. These are the offense's own knowledge.
- **Down, distance, field position.**

He may not read the defense's call, slot labels, tags, assignments or ratings, or any defender's true position.

## 3. The fields

**`belief`:** QBMind's belief at the snap, unchanged.

**`flip`:** set only when the plan has a `pick`. Plans are authored on the strong side; `flip` mirrors S and W. Every
pick has an enter margin: he leaves the authored side only when the other side is better by more than the margin, so
a near-tie keeps the coach's side.
- **cushion** (hitches, quick outs): the corner on each side as his scan places him (`cornersSeen`). He flips when the
  weak-side corner's cushion exceeds the strong side's by more than 1.0 yd. His scan error is what lets a poorer reader
  pick the wrong corner on a close call.
- **shell** (slant-flat against double slants): open or closed middle from his belief, P(single-high) against 0.5
  with a 0.1 margin on each side. He flips when the shell he reads is not the one the authored side is for.
  **This needs one field; see §5 (1).**
- **leverage:** the key role on each side, resolved in his scan (§4). He compares that defender's lateral position
  with the receiver he keys (inside, head-up or outside, from the plan's key rules), and flips when the weak side
  gives the throw the plan wants and the strong side does not.

**`startRead`:**
- An alert whose condition held: the alert's read.
- Otherwise 0. In a progression he starts on read 1 by the coaching; the coverage belief shapes the cycle's
  expectation through `expected`, not his start.

**`alert`:** `{ read }` when the alert's pre-snap condition holds in his picture, else null. **The plan has no
condition field yet; see §5 (2).**

**`hot`:** his own box count against his own protection.
- **The box:** defenders his scan places within 7.5 yd of the line and inside the tight ends' width + 2 yd (the box
  `preSnapCheck` already counts), plus a defender walked up within 5 yd over an uncovered gap.
- **Protectors:** five linemen plus the backs and tight ends the call keeps in.
- **`over`:** max(0, box − protectors).
- **`side`:** where the surplus is (box minus blockers per side, as `preSnapCheck` splits it); 'either' when the two
  sides are within 0.5.
- **Ratings:** they act through the scan error near the box's edge (a man at 7.6 yd may be counted in or out). A
  disguised pressure that is not walked up is not counted. That is honest: the hot answers it after the snap through
  the pressure state.

**`confirm`:** `plan.confirm` as authored (most plans: the middle-of-field safety).

## 4. Resolving a role before the snap

B and module C (after the snap) must name the same man for a role, so I propose one shared resolver over a picture,
`resolveRole(picture, role, side)`, owned by the QB lane alongside C, with B calling it on the scan picture. Phase 1
needs these roles:

| role | the defender he picks |
|---|---|
| corner | on that side, the widest defender within 9 yd of the line and 8+ yd off the ball |
| mofSafety | the deepest defender within 6 yd of the ball laterally (none if none is past 9 yd) |
| apex / overhang | on that side, the defender between #2 and the end of the box, 3–7 yd deep |
| flat / curl / hook | after the snap only (they are defined by where he drops). Before the snap, the defender aligned in that area |

## 5. What I need agreed (QB lane, Rules)

1. **Shell pick:** which shell the authored (strong) side is for. Proposed: `pickShell?: 'open' | 'closed'` on the
   plan, or equivalently `expected` naming the side per family.
2. **Alert condition:** proposed `alert?: { read: number; when: { shell?: 'open' | 'closed'; press?: ReceiverRef;
   cushionUnder?: number } }`, as Rules teaches it ("alert the go against single-high press").
3. **`resolveRole`:** owned with C, as in §4.
4. **Protection count:** from his own call (who stays in), which is honest. When the protection side is rebuilt in
   Phase 3, B takes its count instead.

## 6. Ratings

The quality of the read comes from his recognition, through the size of the scan error and the belief's sharpness and
disguise awareness. A fooled read is a wrong starting point he then has to recover from in the cycle:
- the wrong side flipped;
- a missed alert;
- a hot over-count that has him looking for a rusher who does not come.

No rating sets the outcome directly.

## 7. Validation (before games)

Staged first, then the calibration operator.

- **Cushion:** flip rate against the true cushion difference, by recognition. A sharper passer flips correctly on
  closer calls.
- **Shell:** flip correctness against the played shell, by recognition and disguise.
- **Hot:** `over` against the true surplus at the snap. Its error, by recognition, is concentrated near the box's
  edge.
- **Honesty:** with B on, no `PreSnapState` field changes when a defender's slot label, tag or call is permuted while
  every position is held.
- **Dither:** a dither-budget pass.

NFL: BDB has no QB pre-snap intent, so the comparisons stay at the throw-level outcomes the QB lane already measures.
