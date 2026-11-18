# Running with a twisted trunk is free (Tools item, from Flex, 2026-11-18): RETRACTED

**Retracted the same day.** A twisted trunk is priced. `trunkPrice` (`src/physics/kinematics.ts`) takes `TRUNK_PRICE`
(0.0018 per degree: 10 percent of the speed cap at the 55 deg limit; Coverage's stated choice, checked against the NFL's
shoulder-off-travel curve, `twist_price.py`) off the speed cap whenever the trunk is twisted (DIR_CAP on). My matched
arrival speeds showed no loss because a cap only binds a body running at it, and these defenders mostly were not. The
price also shows in `test/pursuit-commit.test.ts`. With BALL_SIGHT's look, pursuers' requests turn more: 9.14 against
8.40 deg/s. With `trunkPrice` held at 1 the claim holds again. With the gaze cone on the hips instead of the shoulders,
or with the look's hip turn removed, it still fails. So nothing here is for Tools. What follows is kept as the record.

---



Integration asked for this to be logged for Tools, to hand over after DIR_START lands. Not built.

## What was seen

BALL_SIGHT's zone turn (`src/sim/behaviors/defense.ts`, `lookBackJoints` → `lookJoints`) turns a defender's head and
shoulders to the ball while he runs with a receiver. The turn is taken by the neck and the trunk (`TRUNK_TWIST`,
up to `TRUNK_RANGE`). Only what is left past both turns the hips, and only the hips are priced, by the facing speed cap.

On the same staged throws (Defense's deep-close selection, 15+ air yards against cover 2 / 3 / 4 / 6; `DICE_UNIQUE=1`;
`scripts/diag/pass-operators/deep-catch.mts`, develop 097e3b13 plus the DEF_CATCH / BALL_SIGHT diff), the deep man's
speed at the ball's arrival, flags off against `DEF_CATCH=1 BALL_SIGHT=1`, p50 (yd/s):

| group on | n (matched throws) | on | off |
|---|---|---|---|
| zone turn (head and trunk on the ball) | 663 | 5.89 | 5.84 |
| no look | 33 | 5.86 | 5.86 |

He loses no speed while looking back at the ball over his shoulder. Football teaches that he does: a defender who
turns his head and shoulders to find the ball runs slower and loses his feel for the receiver. That cost is why a
trailing man is taught to play the hands rather than look.

## The question for Tools

`updateTrunk` (`src/physics/kinematics.ts`) moves the shoulders toward `cmd.look` at `TRUNK_RATE` within
`TRUNK_RANGE`, and nothing in the gait reads the twist. What does a twisted trunk cost a running body:
- stride and propulsion (arm swing, ground force off the line of run);
- balance;
- the turn back?

It should come from the body model, not a speed multiplier on the look.

## Why it matters here

With it free, every defender who saw the release keeps the ball at no cost. Within 2 yd at arrival the receiver catches
38.6% of balls while the defender is looking, against 55.6% while he is not. NFL, all defenders: 29.5%.
