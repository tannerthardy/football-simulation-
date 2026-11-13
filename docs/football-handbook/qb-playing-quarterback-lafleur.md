# "Playing Quarterback" (LaFleur) and the quarterback model

A three-part coaching article by Matt LaFleur, then offensive coordinator at Ashland
University, a small-college program. It is kept at
[`docs/references/lafleur-playing-quarterback.pdf`](../references/lafleur-playing-quarterback.pdf)
(18 pages; PDF dated 2008-08; the user-supplied file was named
`Amer._jalkapallo_334_PlayingquarterbackMattLaFleurAshlandUniv.pdf`; SHA-256
`f82ec74272ce1fcefdfb6b4ea9a3abe9967a25b24affd6491a789ebeea21c105`). The supplier
asked that it go to the QB decision-making work as a source for finding gaps in
the current model.

**Read it as one coach's teaching, not as measured NFL football.** It is a
college-level philosophy from a pre-NFL career and describes one system. Its
numbers ("1 out of every 5 dropback passes will result in a scramble", a 65%
completion goal) are unsourced. It is a good statement of the rules a young
quarterback is coached to follow, which our model rules treat as football: a coached
rule is the player's intent, executed imperfectly, with freedom around it
([CLAUDE.md](../../CLAUDE.md)). Descriptions below are written for this project.

## What it teaches

- **Part I, what to recruit and how to evaluate.** Eight character qualities and seven
  physical ones (footwork first), then a 12-point evaluation scale: leadership,
  competitor, poise, arm strength, footwork, accuracy, release, coverage recognition,
  decision making, work habits, mechanics, production. Teaching order: the offense
  and footwork, then defensive recognition (coverages and fronts), then protections
  and their "hots".
- **Part II, playing the game.** Two ways to determine a read: *progression reading*
  (first, second, third receiver; throw to the first open one, never go back to a
  man eliminated, never pass up an open man, do not wait for a man to get open) and
  *key reading* (watch one defender and throw opposite him). Footwork is the clock
  of the progression: the drop's rhythm tells him when to move on. The read for a
  play comes from the call, coverage rotation (throw away from it), a best-look
  side, personnel match-ups, or the number of weak-side defenders. When unsure, pick
  a read and let the feet run it; throwing it away or scrambling is a decision too.
  Protection: want the blitz, identify it before the snap (front, capped
  defender, front connected to coverage), feel the rush after it (eyes on the
  secondary), check the protection if it cannot hold, so he rarely throws hot.
  Game management: 25-second clock, two-point spot, two-minute and four-minute
  offense. Film study with a fixed question list per play.
- **Part III, fundamentals.** Stance, exchange, departures from center, handoff and
  pitch, three fake types, drops (1, 3, 5 step, sprint out, play-action and
  run-action) and gun drops, pocket movement (step up, hitch, lateral, escape,
  throw on the run), throwing mechanics. The chain it states: stance, first step,
  drop, body position, balance, a properly thrown ball.

## Where it meets the model, and where to look for gaps

Read from develop `516d8729` by reading code; **nothing here was run.** "Candidate"
means worth a diagnostic by whoever owns the quarterback decision work, not a defect.
The owner knows the model better than this table: check each row before relying on it.

| Article | In the engine now | Candidate gap |
| --- | --- | --- |
| Progression vs key reading | `READ_PLAN` (on): compiled plans of pure progression, pre-snap alert, defender key, half-field split; default profile leans pure (`src/playbook/read-compiler/`, `behaviors/qb.ts`) | The article picks the read from coverage rotation, defender alignment, personnel and the number of weak defenders. Plan choice samples routes "with no defenders in play"; only the start order (`orderReads`) uses his pre-snap belief. Check whether plan choice should consult what he sees. |
| Footwork is the clock | Drop time and a rhythm label per read (`drop`, `hitch1`, `hitch2`, `late`) gate each read; `QB_RHYTHM` | Feet are a timer here. The article's chain (stance, first step, balance, then an accurate ball) has no body-state link to accuracy that I found; miss spread uses urgency, composure and consistency. Check whether base and balance should enter it. |
| Never go back to a covered man; never pass up an open man; do not wait for him to open | Finish-the-side rule; each read is evaluated on his own picture; a read not yet ready gets the same look, no extra wait | Probably covered. Confirm that an open man later in the order is thrown to when seen. |
| "Open or not open" decisiveness | A soft window probability and interception risk against a bar that falls with urgency | Not a gap; the model is continuous where the article teaches binary. |
| When confused, throw away or scramble, not force | Throw-away and scramble chances are dice weighted by awareness and being outside the pocket (`qb.ts`) | Confusion (low or split coverage belief) does not obviously steer to a throw-away. Check how belief confidence reaches the decision. |
| Identify the blitz pre-snap, then protect | Pre-snap belief includes pressure; a pressure look puts the hot route first (`orderReads`); box-count checks flip a run or change the call (`QBMind.preSnapCheck`) | No protection checks (slide, max-protect, backs), no front-connected-to-coverage rules (for example 1- and 5-technique with a spinning safety means fire zone). Same finding as the scouting map. |
| Hot throw depends on the protection | Hot path throws to the quickest route when an alarm fires | The article's "which defender makes me throw hot" depends on who the scheme leaves unblocked. Ours is not tied to the scheme. |
| Feel the rush; eyes stay on the secondary | Pressure picture, urgency, look-then-throw timing (`HOT_LOOK`, `QB_FEEL` off) | Likely modelled; flags are off. |
| Three fake types and what follows the fake (boot or set, drop matched to concept, abort the fake under pressure) | One play-action window (`fakeUntil`), a handoff-fake presentation, a play-action drop (`PA_DROP`, off) | No fake variants, no abort of the fake that I found, and the cue a fake gives defenders is not graded by type. |
| Pocket movement rules | Step-up and escape movement with a throw-lane spot (`qb.ts`) | Check hitch, lateral-step-first and "reverse out from back-side pressure" against NFL pocket movement (`docs/reviews/nfl-sim-operators.md` indexes the operators). |
| Game management: 25-second clock, two-minute, four-minute | Game-level tempo (about 16 s hurry, 39 s milking), kneels | No spike, no clock-aware throw-away or scramble choice at the quarterback (his `clock` is the seconds he gives himself); no four-minute "no fakes, sack beats a throw-away". Likely a playcalling and game-management item. |
| 12-point evaluation | Ratings cover arm (`throwPower`), accuracy (short, mid, deep), `release`, `pocketPresence`, `playRecognition`, `decisionMaking`, `composure`, `consistency`, `workRate`, `discipline` | No leadership, competitor, footwork or mechanics rating. A management-game question, not an engine gap. |
| Grading sheet: decision, mechanics, execution, ball placement, result, YAC | Request and execution are separate in the engine (decision window, then miss distance) | A per-play grade that keeps decision apart from execution would suit film review. |

Not recommended to model: grip, six-inch step, high elbow and follow-through as separate
parts. The simplest coherent model is the windup and load already represented. Add
detail only where it changes a decision or a measured ball.

## Related

[Offensive skill and playcalling](offensive-skill-and-playcalling.md),
[Receiver route reads](receiver-route-reads.md),
[Play-action protections](play-action-protections.md),
[Advance scouting checklist](advance-scouting-checklist.md) (the engine map for the
defense's side of the same pre-snap picture), the
[read-compiler design](../research/2026-11-11-qb-read-compiler-design.md), and
the [drop-belief review](../reviews/2026-11-12-drop-belief.md).
