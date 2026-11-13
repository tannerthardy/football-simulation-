# Underneath zone defenders before the throw

Coverage lane, G3. Tanner asked for coach-adjustable behavior rather than one
hard-coded answer: "a lot of the ways a coverage call may handle these sorts of
things may be varied". This note records what coaches teach, what this change
does, and the settings planned next. Sources: the project's references
(`docs/references/Coverage_Operating_System_Manuscript.md`, the coverage
mechanics textbook §3.3/§12.5, `honest-nfl` HNFL-027/227/283) plus clinic
material (Bowen; Saban via Brophy; USA Football; Ravens "3 Lock"). Clinic detail
was often paywalled; no source gives timings in seconds, so the NFL tracking
numbers below stay the quantitative anchor.

## What coaches teach

- **No source teaches an underneath zone defender to drive on a receiver behind
  the line before the throw.** The default is "hold curl, push flat": keep depth
  and outside leverage, play top-down, break on the QB's throw ("ball brings you
  back down"). Driving on a bubble or flat before the ball is out is a called
  role: a trap or cloud corner, or a Patty/trap tag on a backer.
- **The drop waits for evidence.** An unconfirmed play gets read steps and square
  leverage; the drop to landmark depth follows a confirmed pass (linemen high
  and behind the line, the QB's drop, no mesh), and stops when the QB sets or
  opens to throw.
- **Screens are confirmed, not guessed:** linemen leaking downfield, a receiver's
  blocking posture, a QB catch-and-throw. Over-triggering is punished by
  screen-and-go and crack-and-go, which is the cost, not something to ban.
- **Cover 3 vs 3x1:** the Mike relates to and walls #3; the nickel or apex owns #2
  and the strong flat; a strong hook sits between them. With the backside corner
  in man (Mable), the Will plays the weak hook and the back; with a zone corner
  backside, a weak curl-flat stays defensible.

NFL tracking (BDB 2025, measured on `claude/screens` with the same code on both
sides): zone defenders over a quick screen gain 0-1 yd on the receiver before
the throw and their depth barely moves (5.5 → 4.9 yd); box linebackers start a
pass drop about 1.3 s after the snap (+0.44 yd by 1.2 s); a linebacker's velocity
toward a bubble catch point is about +0.1 / +0.5 / +1.3 / +3.2 yd/s at
throw−0.3 / throw / throw+0.3 / catch.

## Where coaches differ, and who sets it

| Dimension | Range | Set by |
| --- | --- | --- |
| Drop start | read step until pass is confirmed ↔ open at the snap | role, down and distance |
| Drop style | vision and break (square, eyes on QB) ↔ match (hips to the key) | call |
| Depth | fixed landmark ↔ stop on the QB's set | call, tag (sticks) |
| A receiver behind the line before the throw | hold ↔ squeeze top-down ↔ trap | role, tag, game plan |
| Screen trigger | the throw ↔ observed evidence ↔ game-plan alert | role, game plan |
| Who forces a WR screen | cloud/press corner ↔ rotated safety/apex ↔ crack-replace | call |

## This change

1. **`flatThreat` on the defensive call: `hold` (default) or `trap`.** Before he
   has seen a throw, an underneath zone defender whose nearest threat is still
   behind the line squeezes its lane from his current depth instead of driving
   down to it. `trap` keeps the old drive-down as a called technique. The
   decision uses only his own picture of the receiver.
   - Develop drove the weak curl-flat nickel from 4.5 to 1.9 yd deep by 1.6 s
     over a back who was only pass-blocking (`gun_doubles_11`, Cover 3).
     With `hold` he stays at 3.5-4.5 yd.
2. **Cover 3 (Sky) vs 3x1 checks to `cover3_trips`:** Mike to the middle hook,
   SS strong hook, nickel strong curl-flat, Will weak curl-flat; same spot-zone
   technique. Before, both backers went to the weak side.

3. **`dropStart` on the defensive call: `early` (default) | `confirmed` | `late`.**
   A box backer in zone leaves his read step for his drop only when his own pass
   belief reaches the call's level: `early` is the belief at which he reads pass
   at all (develop's behavior, unchanged), `confirmed` 0.95, `late` 0.98. Once
   he drops he does not return to the read step.
   - Box backers in zone on pass plays (seeds 7/11): they read pass at a median
     0.40 s (belief 0.95 at a median 0.95 s; run plays reach 0.95 by 2.5 s in 1%).
   - Drop onset (0.5 yd deeper), median: early 0.90 s, confirmed 1.40 s, NFL
     about 1.3 s. Depth gain at 0.8 / 1.2 / 1.6 s: early +0.36 / +1.09 / +1.90,
     confirmed 0 / +0.16 / +0.79, NFL +0.09 / +0.44 / +1.10.
   - **Why `confirmed` is not yet the default.** As a default it moved passes
     −0.37 ± 0.22 yd per snap and broke two integration panels: a late spot
     dropper more than 4 yd from his spot turns and sprints to it (spot droppers
     facing the QB after 1.6 s: 0.71 vs the panel's 0.8), and protection's edge
     engagement fell to 0.875 on `gun_doubles_11` (bar 0.9). Coaches teach a late
     dropper to settle where he is when the QB sets, not to sprint to a 10 yd
     spot; that QB-coupled stop comes first, then `confirmed` as the default.

## Measured: box backers in zone are 2.5-3.5 yd too deep at the throw

Box backers (2.5-8 yd deep and within 6 yd of the ball at the snap) in zone
coverages, depth at the throw by time to throw. NFL from the common-format BDB
plays in `out/mechanics/nfl-plays.jsonl.gz` (coverage label not man/Cover 0/1);
sim from the saved seed 7/11 snaps on this branch's defaults (zone calls).

| Time to throw | NFL n | NFL gain p50 | NFL depth p50 | Sim n | Sim gain p50 | Sim depth p50 |
| --- | --- | --- | --- | --- | --- | --- |
| under 2.0 s | 1,672 | 0.0 | 4.9 | 44 | +1.7 | 6.5 |
| 2.0-2.5 s | 2,288 | +1.3 | 6.2 | 68 | +4.1 | 8.6 |
| 2.5-3.0 s | 2,292 | +1.9 | 6.8 | 54 | +5.5 | 10.4 |
| over 3.0 s | 3,640 | +2.9 | 7.7 | 45 | +5.9 | 10.4 |

NFL backers almost never reach a 10 yd landmark by the throw; ours do.

### Settle on the QB's set, or anticipation? (Tanner's question)

Two separate claims, measured on the same box backers in zone coverages, NFL
(BDB, common format) vs sim (seed 7/11 snaps). QB set: the first moment after he
has dropped 1 yd that his speed stays under 1 yd/s for two samples, before the
throw. Toward target: velocity toward the eventual catch point; the control is
velocity toward a random non-targeted receiver's spot at the same moment.

| | NFL | Sim |
| --- | --- | --- |
| QB set, median | 2.1 s (n 2,595) | 1.6 s (n 103) |
| Depth-gain rate snap → set | +0.79 yd/s | +1.71 |
| Depth-gain rate set → set + 0.4 s | +1.88 | +3.19 |
| Depth-gain rate set + 0.4 s → throw | +1.35 | +2.48 |
| Toward target vs decoy at throw − 0.6 s | −0.14 vs −0.02 | −0.36 vs −0.51 |
| Toward target vs decoy at throw − 0.3 s | **+0.16 vs −0.18** | −0.35 vs −0.18 |
| Toward target vs decoy at the throw | **+0.79 vs −0.37** | +0.12 vs −0.34 |
| Toward target vs decoy at throw + 0.3 s | +1.73 vs −0.69 | +1.07 vs −0.76 |

- **NFL backers do not stop at the QB's set.** They keep gaining depth after it,
  at a moderate rate. A hard "settle on the set" rule would be wrong.
- **Our drop is about twice as fast in every window,** on top of starting early.
  That, not the landmark itself, is why we are 2.5-3.5 yd too deep at the throw.
  Coaches teach the drop with eyes on the QB (shuffle or backpedal); ours runs
  turned to the spot (`spot-drop-run`) whenever he is more than 4 yd from it.
- **NFL backers anticipate.** From 0.3 s before the release they already drift
  toward where the ball will go and away from the decoy: reading the QB's eyes,
  shoulders and wind-up. Ours show no lean toward the target before the release
  and close more slowly after it: they react to the ball, not the QB.

Revised plan (each a decision on the backer's own picture; coach-adjustable):
1. **Drop with eyes on the QB at a controlled pace** (vision-and-break), turning
   to run only on a vertical threat in his zone; a match/turn-and-run style
   stays a call option. Judge on the depth-rate rows and the depth table above.
2. **Anticipation from the QB:** a backer whose own delayed picture shows the QB
   locked on a receiver near his zone, or starting his wind-up, leans toward
   that window before the release. Its cost is real: look-offs (the QB already
   has a look-off) and pump fakes punish it. Judge on the toward-target rows;
   the anticipation rating sets how early and how far.
3. Then `dropStart: 'confirmed'` as the default.

Side finding, not coverage: the sim QB sets about 0.5 s earlier than NFL QBs
(1.6 vs 2.1 s median). Passed to the QB/offense owner.

### Where the excess depth comes from

With `dropStart: 'confirmed'` forced, the phase before the QB's set matches
(depth-gain rate 1.03 yd/s vs NFL 0.79; it was 1.71), but once dropping our
backers still gain 3.1 / 2.8 yd/s against NFL 1.9 / 1.35. Depth gained between
1.4 s and the throw, by the backer's command:

| Command | Share of depth | Rate |
| --- | --- | --- |
| carry-run-past (running with a vertical) | 34% | 2.9 yd/s |
| wall | 22% | 3.5 |
| zone-landmark (drop with no threat) | 21% | 2.6 |
| wall-open | 10% | 4.1 |
| man-pedal, lane, read-step, stem read, spot | 13% | 0.9-4.0 |

About two-thirds of the excess is route-driven: carrying or walling a vertical
release. COV-10 (Defense) found sim releases far too fast and vertical
(4.4-4.8 yd/s downfield by 0.9 s on routes that are much slower in the NFL), so
many releases look like seams and the backers carry them. Slowing the carry to
hit the NFL depth table now would fit the defense to a wrong offense. Order:

1. **Anticipation from the QB** (coverage's own; independent of the routes):
   lean toward the window the QB's visible facing and set point to, before the
   release; look-offs and pump fakes are its cost.
2. **The empty-landmark drop at a controlled pace** (21% of the excess).
3. **`dropStart: 'confirmed'` as the default**, once the spot drop no longer
   sprints to a far spot (the panel failure above).
4. **Re-measure the depth tables after COV-10**, before touching carry or wall.

## Planned next (not in this change)

Each is a decision on observed evidence, set per call, tag, role or game plan;
none changes an outcome directly.

- **A QB-coupled stop on the drop:** a dropper plants when the observed QB sets
  or opens to throw, instead of sprinting to his landmark. Then `dropStart`
  defaults to `confirmed`.
- **Read steps while unconfirmed:** small square steps instead of standing still.
- **Drop style** (vision and break ↔ match).
- **`squeeze`** as a third `flatThreat` option (top-down once the release
  declares flat with no vertical left in the zone).
- **Screen trigger** (`throw` / `evidence` / `alert`) with the combined-evidence
  rule from COV-10, once route releases are NFL-shaped.
- **Screen fits per call:** force, alley, over-the-top, and crack-replace on an
  observed crack.
- **A Mable-style trips check** (backside corner in man; Will as weak hook/#4).
