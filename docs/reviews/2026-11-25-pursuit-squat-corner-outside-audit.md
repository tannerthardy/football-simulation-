# Pursuit after the catch, the Cover 2 squat corner, the double-outs quote: outside reviewer's package (2026-11-25)

Recorded by Integration from the outside reviewer's (Gemini) package, read against develop 9d516a680. Rows marked
**confirmed** were checked in code by Integration; the rest are for the owning lane, each by its staged case first.
Sources are the reviewer's, mostly tertiary; lanes re-open what they build on. Context: the tackle package (#931)
removes grabs from outside the arm, and catches with no contact go from 5.9% to 12.9%.

## 1. Pursuit after a completion

**As taught.**
- Track the near hip and "plot the path to where the ball-carrier will be"; aiming at the front shoulder or at where
  he is now gets a cutback or a stiff arm.
- **Break down only when the carrier is in front and can go either way, "about a yard or two before contact".**
- **"If the runner is moving away or across, the tackler takes an angle and runs through him instead"** (near foot,
  near shoulder, the near hip as the point of contact).
- The next defender keeps leverage: inside-out, forcing him back to the pursuit; the force player turns him in, the
  alley player fits off the last spill defender's hip.

**The code against it.**

| # | Where | What it does | Staged case |
|---|---|---|---|
| 1 | `common.ts:304–353` `gatheringApproach` (**confirmed**) | The close gather reaches 1 at `contact + max(2.5, stopping)` and `stopping` grows with his closing speed, so a fast pursuer starts gathering farther out. Inside it he aims at the seen position plus offset (no lead) and brakes to a closing speed of 2.5–4.5 yd/s at contact. The drive-through floor (`attack`) is scaled by `headOn`, which is 0 unless the carrier is coming at him at more than 1.5 yd/s and his path enters the near-hip corridor: on any crossing or going-away angle there is no run-through. | A crosser caught in stride, a defender closing from the side at full speed. |
| 2 | `common.ts:387–396` with `open-field.ts` (on by default) | After a catch every chase runs "on top": the gather's goal is shifted upfield by a cushion (0.4 of the distance beyond contact) on top of an arrival that already ends at contact distance, so he mirrors the carrier outside arm's length. At gather 1 the intercept point is bypassed (**confirmed**: the `bypassed-close-gather` return). | A hitch caught with a corner 4 yd upfield and 2 yd inside; the receiver turns up the sideline. |
| 3 | `common.ts:398` (**confirmed**) | Effort steps from `0.75 + 0.2·workRate` to 1 at exactly 12 yd, no ramp. | A half safety 14 yd from a flat catch. |
| 4 | `common.ts:174–184, 231–253` | The intercept time is reduced by a per-defender bias, so about half of pursuers aim behind the true intercept; the committed spot is held until the slack is 0.15 s negative. | An angle pursuer with a positive bias on a carrier at 8 yd/s. |
| 5 | `approach-control.ts:45–51, 79–83` | A 0.6 s preview can choose to match the carrier's present velocity early; a carrier still accelerating out of his break leaves him. | A pursuer 5 yd from a receiver coming out of a quick out. |
| 6 | `defense.ts:313–338`; `common.ts:45–77` | Before he has seen possession, the rally goes to the landing area with no carry-through speed: a stop at a spot the receiver has left. | The nearest defender loses sight of the ball at the catch. |
| 7 | `common.ts:165, 435–447` | The around-a-body detour and the bend forecast switch with no margin. | A trailer passing a stalk block half a yard behind the carrier. |

Integration's read: rows 1 and 2 match Run Game's trace (defenders ahead of the ball at 0.40 of top speed as the
carrier passes within 3 yd, 0 of 11 at full effort) and Defense's first suspect (the stopping-distance term). The
taught rule gives the repair its shape: the breakdown belongs to the head-on, two-way case and to the last yard or
two; across or away, he runs through the near hip. That is a decision by the angle he sees, with a margin, not a
speed cap by distance.

**Public numbers.** Next Gen Stats' expected YAC used the receiver's speed, direction and acceleration, the distance
to the nearest defender, and the defenders and blockers in a 170-degree cone ahead of him; a companion measure is
yards gained before a defender closes within 1 yd. Nobody publishes YAC split by a trailing against an in-front
first defender, or open-field missed-tackle rates. One tracking paper (Yurko, Nguyen and Pelechrinis, "NFL Ghosts")
finds defender positions square to the receiver's direction worth more than trailing or head-on ones.

## 2. The Cover 2 squat corner

**As taught.** 5–7 yd off on #1's outside shoulder (or pressed, jamming and funnelling him inside). Eyes: the passer
through #1 on a zone turn; or #2 in trap and palms versions. He sinks at 45 degrees under the corner route and the
fade, and breaks up on the short route on the throw ("when the quarterback's off hand leaves the ball"); trap
versions jump an out by #2. Where coaches differ: press against off; eyes on #1 and the passer against #2; waiting
for the throw against jumping the break.

**The code.** `rules.ts:642–666` (`squatTopDown`) lists #2, #3 and the back as flat runners and leaves #1 out, so
#1's out never counts as a flat threat. `defense.ts:2041–2049` sinks with a vertical #1 from 0.7 yd **inside** him
and drops the sink when he breaks (`2038`); `flatCarry` skips #1 (`2005`); the lane spot (`2495–2499`, the 0.82 line
to the passer) then holds him inside and under #1. This agrees with Coverage's own trace (the wrong key on the
strong side; the lane spot and no read of #1's out on the weak side) and its repair in progress (`FLAT_SINK_ONE`
with `LANE_LEVERAGE`).

## 3. Double outs: the quarterback's read, as quoted

Sposato, 700 Quick Series, "Green 700 Double Outs", quoted by the reviewer (not re-opened by us; Scribd blocks our
fetch):

> "Pre-snap you are reading the alignment and leverage of the defenders over the W and A Backs. If the A Back has a
> defender on his inside, he is your primary target. If Both defenders are playing outside leverage and tight on the
> receivers, look backside to the quick Slant route. If both defenders are playing off or inside the W and A Backs
> you have the choice of throwing to either receiver. If you recognize a blitz, especially backside, look for the
> quick Slant."

The same page has the outs as speed breaks at 6 yd, the backside as a three-step slant, and the wide receiver's fade
thrown if the corner leaves him to sit in the flat; an out converts back to the ball at an angle if the corner rolls
up.
