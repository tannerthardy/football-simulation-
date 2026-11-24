# QB_V2: outside reviewer's cold audit, quick-game reads as taught, catch-rate references (2026-11-24)

Recorded by Integration from the outside reviewer's (Gemini) package. The code audit read the QB lane's branch at
78224c13e and the qb.ts wiring in the stage patch; the lane has moved since, so each row is to be checked against the
landing patch, by its staged case, before it is acted on. Sources are the reviewer's; several are tertiary sites, so
Rules re-opens what is quoted.

## 1. The read cycle

| # | Finding | Where | Staged case |
|---|---|---|---|
| 1 | **A throw state that cannot be left.** `commit()` latches `state = 'throw'` before the wiring checks the throw can start. If `startIfFinish` returns null (cannot finish, a dwell gate, a confirm in progress, `evaluate` null), the windup never starts, and every later tick returns the latched intent before pressure or leaving the pocket is looked at. | `cycle.ts:109, 120–124`; the `v2Step` wiring | A free rusher inside the finish window on the tick he commits to read 1. |
| 2 | **Read 1 abandoned before the key declares** on a key read that mixes an on-break and a seen-open throw (slant-flat). With no cue yet, the on-break throws are not "timed", so "answered no" is vacuously true once the look resolves, about 0.3 s after the snap. | `cycle.ts:145–164`; `drive.ts:172–186` | Slant-flat with a flat defender who hesitates under 1.5 yd/s for half a second. |
| 3 | **An on-break throw that can never clear** if the receiver is re-routed off his installed break point: the latch needs him within a radius of that fixed point, and a jammed or widened receiver never enters it. | `drive.ts:127–134, 253–256`; `cycle.ts:97` | Quick out against press, the corner riding him 2 yd wide of his stem. |
| 4 | **The contact pressure state is never entered** (the table holds only felt and imminent), so the in-pocket throwaway cannot happen; and `hotSide` is passed as null, so side-specific hot rules never apply. | `cycle.ts:59–62, 171–177`; `drive.ts:273` | All covered, four-man rush, he stays in the pocket. |
| 5 | **Escape is one-way**: entered from the pocket boundary, never left, and it skips the checkdown. | `cycle.ts:110, 194–197` | He slides to 4.5 yd from the ball's lane and steps back. |
| 6 | The checkdown's `fromStep` is not checked; `handoff` and `checkdown` intents have no branch in the wiring. | `plan.ts:70`; `cycle.ts`; `v2Step` | A checkdown allowed from step 2, thrown on step 0 under pressure. |

## 2. Reads of hidden state the lane's scan test does not cover

The test scans `src/sim/qbv2/` only; the wiring in `src/sim/behaviors/qb.ts` is outside it.

| # | Where | What is read | Instead |
|---|---|---|---|
| 1 | `drive.ts:148` → `roles.ts:110–113` | The defense's call personnel and `d.slot` to decide who is a defensive back | What he sees: alignment and grouping |
| 2 | The host's `bodyOf` / `believe` in `qb.ts` | True profile when the believed-defender flag is off; roster position; true ball skills | The scouting report only, no raw fallback |
| 3 | `v2Step` on a kill | The receiver's true position | His estimate |
| 4 | `shouldScramble` | Every defender's true down state | The seen pose |
| 5 | `evaluate` with the seen-receiver flag off | The receiver's true down and engaged state | The seen path always |
| 6 | The update's start | A receiver's true y; teammates' `behavior.kind`; their true positions | The installed alignment and the called protection |
| 7 | `sim.see` for head and pose | It returns a delayed picture of a man outside his cone (no cone gate) | His own cone-updated picture |

## 3. Decisions that flip without a perceived change

| # | Where | What flips |
|---|---|---|
| 1 | `drive.ts:176–185, 194–202` | The `squats` cue is not in the held-cue score table, so it is re-derived each tick from the receivers' forecasts with no margin: a still defender flips between squats and widens as the forecasts move. |
| 2 | `judge.ts:140–143` | For a defender expected to arrive early, a growing spread with picture age lowers his arrival chance and so raises the throw's completion estimate: an old picture alone can turn a refused throw into a thrown one. Also a hard edge at −0.3 in the lane test. |
| 3 | `judge.ts:176–200` | No exit margin on the coverer's qualifying radii; the reaction time steps between 0.30 s and 0.75 s at cushion 4 yd and at level-with-him. |
| 4 | The host's `outsidePocket` | The raw 4.5 yd boundary feeds the one-way escape; the old controller has enter and exit margins for the same test. |
| 5 | `roles.ts:58–60` | The role areas change at the snap, so a flat defender can fall out of the role on the first tick without moving. |

## 4. The quick game as taught

Footwork: under center, three steps and the ball off the last with no hitch; from the gun, one step ("catch, open,
throw") for 0–5 yd routes, or three quick steps with the ball out as the back foot lands for 5–7 yd outs. No extra
hitch in any version.

- **Quick out.** Pick the side before the snap by the corner's cushion (off past about 7 yd) and the slot's leverage
  on the apex. Thrown before the break. Corner tight or squatting, or a trap corner: do not throw it (the fade over
  him if it is tagged, else work off it). Apex widening into the window: move inside or backside.
- **Hitch.** A pre-snap side pick: the most cushion, or the slot with no apex defender against two-high with a light
  box. "The ball has to be in the receiver's lap before the cornerback's feet stop moving." Corner squats or presses:
  the hitch converts to a fade, or go to the slot hitch.
- **Slant-flat.** Key the curl-flat defender. He widens or runs to the flat: the slant behind him. He sinks under the
  slant or hangs inside: the flat. The hook defender walls the slant: the flat, or reset to the backside. He blitzes:
  the ball into the space he left. No double hitch.
- **Stick.** Eyes start on the flat defender, feet set to the stick. He widens with the flat: the stick in the window
  he left. He sits on the stick or fails to widen: the flat. Cover 2 warning: the corner is the flat defender after
  the snap, and the flat into him is the trap; the hole shot to #1 is the answer.
- **Fade against press.** Before the snap: a press or squat corner and no safety over the top. After: the receiver's
  position on the corner: over the top if he has won, back shoulder ("a foot above and a foot behind") if the corner
  stays on top. Safety capping it: off the alert.
- **Where coaches differ.** Slant-flat and stick as a key read on one defender against a pure progression (and in
  which order); fade against press as a pre-snap gift against a post-snap leverage read; one step against three quick
  steps from the gun for 5–6 yd routes.

## 5. Catch rate against ball placement: what exists publicly

| Source | What it measures | Published figures |
|---|---|---|
| PFF charting | Four placement buckets by film | Completion 93.3% on accurate balls, 78.7% on catchable-but-inaccurate, 2.0% on uncatchable (2020–2022). Drop rate about 7.5% of catchable targets. |
| Sportradar via Pro-Football-Reference | On-target, bad throws, drops per attempt | 2025: 74.9% on target, 16.1% bad throws, 4.4% drops per attempt. |
| SIS, FTN | Catchable and on-target flags | League tables mostly paywalled; play flags public for FTN. |
| Next Gen Stats completion probability | Throw context, not where the ball arrived | Not a placement measure. |
| Tracking papers | 2-D receiver-to-ball distance at the catch | No isolated curve for uncovered receivers; no ball height. |

Nobody publishes a catch rate by distance off an uncovered receiver's frame, by miss direction, or with ball height.
A drop rate per attempt (4.4%) is not comparable to one per catchable target (about 7.5%). Our clean-catch table
(100% at 0, 99% at 0.3, 93% at 0.6, 80% at 0.9 yd) can only be checked against the bucket totals: about 93% on-frame,
about 79% catchable off-target, about 2% uncatchable; those buckets include contested throws.
