# The quarterback's throwing motion

Tanner: "think through every step in the process of how mechanically a ball gets
thrown, and do it in a realistic manner while keeping how fast the ball gets out
realistic." This note measures the motion in NFL tracking, sets it against the
literature and the sim, and proposes the phase model to build.

Why it matters: NFL underneath zone defenders start moving toward the target
about 0.3 s before the release (`2026-11-05-zone-before-throw.md`). They are
reading a visible motion that starts well before the ball leaves. The sim's
throw is one 0.10-0.28 s "windup" (`0.1 + 0.18 × (1 − release)`), shorter than
a defender's perception delay, so no defender can read it before the release.

## Measured: NFL tracking (BDB 2025, 9 weeks)

Quarterback rows around `pass_forward`. NGS orientation (`o`) comes from the
shoulder-pad sensors, so it is the shoulders. "Off target" is the angle between
it and the bearing to the throw's landing point (`targetX/Y`); "toward target" is
his speed along that bearing.

All dropbacks, weeks 1-2 (n 2,012), medians:

| Time vs release | −1.0 | −0.6 | −0.5 | −0.4 | −0.3 | −0.2 | −0.1 | 0 | +0.2 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Shoulders off target | 56° | 59° | 56° | 51° | 44° | 34° | 26° | 18° | 17° |
| Speed toward target (yd/s) | −0.87 | −0.26 | −0.07 | +0.12 | +0.26 | +0.37 | +0.41 | +0.41 | +0.31 |

- He sits **loaded sideways, about 56° off the target**, until about 0.5 s
  before the release, still settling back.
- Then **weight transfer and trunk rotation start together**: he steps toward the
  target and the shoulders turn square, finishing about 18° off at the release.

Traditional dropbacks, all 9 weeks (n 6,040), onset of the motion before the release:

| Group | Shoulders 30° off → release, p25/p50/p75 | Weight transfer start → release |
| --- | --- | --- |
| All | 0.3 / 0.4 / 0.6 s | 0.3 / 0.5 / 0.9 s |
| Pass length < 5 / 5-15 / 15-25 / 25+ yd | p50 0.4 / 0.4 / 0.3 / 0.4 | p50 0.6 / 0.4 / 0.5 / 0.6 |
| Time to throw < 2.0 / 2.0-2.5 / 2.5-3.0 / 3.0+ s | p50 0.4 / 0.4 / 0.4 / 0.4 | p50 0.6 / 0.3 / 0.5 / 0.8 |
| Unblocked pressure | 0.3 / 0.5 / 1.0 | 0.4 / 0.7 / 1.3 |
| Play action | 0.3 / 0.4 / 0.7 | 0.4 / 0.7 / 1.1 |

- The shoulder turn takes about 0.4 s whatever the throw's length or timing.
- Snap to release, traditional completed or incomplete passes: p50 2.50 s, mean 2.56 (n 7,630).

## Literature

Grades: [M] measured, [S] secondary report of a measurement, [L] coaching lore,
[D] design estimate. Full notes and links in the research agent's file, summarized here.

- **Front-foot plant to release: 0.17-0.21 s** [M]: Fleisig et al. 1996 (0.21 ± 0.03
  s, 26 QBs) [S]; Toffan 2009 (university 0.17 s, professional comparison 0.172 s).
- **Phase shares** of the motion from rear-foot plant [M] (Kelly et al. 2002):
  early cocking 49%, late cocking to maximum external rotation 20%, acceleration
  15% (release at about 84%), follow-through 16%.
- **Visible motion to release** (front hand leaving the ball or the start of the
  arm swing): about 0.35 s (quick) to 0.55-0.6 s (long) [S/L; sources disagree on
  the starting event]. Our tracking: 0.4-0.5 s.
- **Longer throws do not need a longer motion** [M, small n] (Toffan); our tracking
  agrees (no trend by pass length).
- **What defenders read** [L]: underneath zone breaks "when the QB's front
  shoulder points and the front hand leaves the ball" (Notre Dame DB manual,
  `docs/references/nfl-playbook-sources.md`); "he can only throw where his off
  shoulder points" (Vanderlinden). Deep defenders break on the ball. Pump fakes
  fool defenders who key the arm; one with the front hand still on the ball
  fools few. NFL installs call a pump against jumpy quick-game defenders (HNFL-225).

## The sim today

Same measures on the seed 7/11 saved snaps (169 passes):

| | NFL | Sim |
| --- | --- | --- |
| Time to throw p50 (mean) | 2.50 (2.56) | 2.45 (2.50) |
| Windup / visible motion before release | 0.4-0.5 s | 0.15 s (p50) |
| Shoulders off target at −0.6 / −0.3 / 0 s | 59° / 44° / 18° | 29° / 25° / 5° |
| Speed toward target at −0.3 s | +0.26 yd/s | 0.00 |

- The snap-to-release time is already right, so a longer motion has to start
  earlier: the quarterback decides and begins his motion sooner, throwing with
  anticipation, rather than the play getting longer.
- The sim quarterback is never loaded sideways and never steps into the throw.

## Proposed phase model

Each phase is a body the defenders can see, not a timer they are told about.

1. **Set.** End of the drop: back foot planted, body loaded sideways (shoulders
   about 55° off the target he is reading, front shoulder toward it). Eyes and
   shoulders track his reads; a look-off moves them.
2. **Load (start of the throwing motion).** Front hand leaves the ball, front
   shoulder points at the target, trunk coils. Visible to a defender watching
   him. 0.15-0.30 s, shorter with a higher `release` rating; overlaps the last
   drop step in quick game.
3. **Stride and plant.** Steps toward the target (about 0.4 yd/s), front foot plants.
4. **Delivery.** Front-foot plant to release, 0.17 s (elite) to 0.21 s: trunk
   rotates square (to about 15-20° off), arm accelerates, release. Not
   abortable after about the last 0.05 s.
5. **Follow-through.** About 0.1 s, exposed to hits.

Totals: load plus delivery is about 0.32-0.51 s from the visible start, matching
the measured 0.4-0.5 s. Ball speed comes from the delivery (`throwPower`) as now;
the motion's length does not grow with the throw's distance.

Consequences to build in, not tune:
- **Deciding earlier.** The throw's evaluation already predicts the receiver
  `windup + flight` ahead; with a longer motion the quarterback commits earlier
  and throws into windows that are not yet open. Time to throw should stay near
  the NFL's 2.5 s; if it grows, the decision logic is the stage to look at.
- **Pressure.** A quarterback under a hit can shorten the load (a "flick"), which
  costs ball speed and accuracy, not extra time.
- **Pump fakes.** Load (and part of the delivery) stopped before the arm's point
  of no return, then a reset: about 0.3-0.5 s. A defender who broke on the load
  has committed; the quarterback pays the time.
- **The defenders' read.** Zone defenders whose eyes are on him see the load in
  their own delayed picture and can break toward the line of his front
  shoulder before the release (`2026-11-05-zone-before-throw.md`, step 1). Deep
  defenders keep breaking on the ball.

Judge it on: the shoulder and weight-transfer table above (sim vs NFL), snap-to-release
time, and then the defenders' lean toward the target before the release (NFL +0.16
yd/s at −0.3 s, +0.79 at the release).

## Built (qb/G3-throwing-motion) and what it showed

What changed, each a mechanism rather than a number to hit:

- **Load and delivery.** `load = 0.15 + 0.15 × (1 − release)`, `delivery = 0.17 + 0.04 ×
  (1 − release)`: 0.32-0.51 s of visible motion. `sim.windupAt` marks the load (what
  defenders can read); `sim.deliveryAt` marks the plant.
- **Weight transfer.** His velocity toward the target ramps from zero at the load to
  0.45 yd/s at the plant (NFL +0.41 at release).
- **Flick.** He plans his load from the hit he feels coming: if a full motion would
  not finish first, he cuts the load (to 0.05 s at least; the delivery does not
  shorten). The ball pays: miss sigma × (1 + 0.8 × flick), arm speed × (1 − 0.2 × flick) [D].
- **Rhythm.** In the last load-length of his drop he can start the throw to his first
  read (same evaluation and thresholds as when set).
- **Readiness judged at the release.** A route is ready when a throw started now would
  come out no earlier than `break − 0.3 × anticipation`; previously the *start* of the
  motion was gated, so a longer motion released later by its own length.
- **In-grasp ruling respects the delivery.** A passer whose arm is already coming
  forward gets the pass off (wobbling, via the existing grasp penalty to accuracy)
  rather than being ruled down mid-throw.
- **The QB's window model.** A defender facing him sees the motion start; one who is
  not, and is not already on the target, keeps his course until the ball is out.

Seed 7/11 saved dropbacks (183), develop `9a19ced9` vs this branch:

| | Develop | Branch | NFL |
| --- | --- | --- | --- |
| Visible motion p50 | 0.15 s | 0.40 s | 0.4-0.5 s |
| Speed toward target at −0.2 / −0.1 s | 0 / 0 | 0.35 / 0.44 | 0.37 / 0.41 |
| Time to throw p50 | 2.40 | 2.75 | 2.50 |
| Completion | 63.9% | 53.1% | |
| Sacks | 12 | 18 | |
| Throws released while held | 12 | 38 | |
| Yards per dropback | 11.1 | 8.2 | |

Why the passing game got worse (diagnostics on the same snaps):
- Ablation: the old 0.15 s motion with everything else new gives develop's numbers
  back (64.5%, 12 sacks). The motion's length is the whole effect.
- Defenders reading the earlier `windupAt` is not it: stamping the cue at the old time
  changes no outcome. Hiding the QB's eyes during the motion changes none either.
- Same snap, same target, clean in both arms (103 throws): 61 vs 66 completions, 11
  vs 7 breakups. Decisions come at the same moments; the ball is out 0.25 s later.
- Twelve develop "sacks during the windup" were in-grasp rulings 0.3 s after a grab;
  most are now throws made while held, completing about 30%.
- The QB's predicted completion matches the result on clean throws (5-15 yd: 0.69
  predicted, 0.65 actual), so the window model is honest; it is the timing.

**The gap this exposes.** The sim quarterback decides when he did with a 0.15 s motion,
so a real 0.4 s motion makes every release later and lets rushers and defenders close.
NFL quarterbacks begin the motion about 0.4 s before the release (decision near 2.1 s),
throwing on rhythm as the drop ends and the route breaks. The sim QB is set at 1.5 s
and starts his motion 0.7 s later (p50), mostly because the first read is not yet open
when his drop ends (first-read P p50 0.11 in the rhythm window). The next stage is the
quarterback's timing: how a drop and a route's break line up, and when he commits to a
throw he expects to be open at the release.

Not built yet: the shoulders loaded sideways before the motion (NFL about 55° off the
target until −0.5 s; the sim's facing is the throwing line), pump fakes, and zone
defenders breaking toward the shoulder line before release.

Three play-pinned fixtures (command-trace, cov7-abandonment, possession-awareness) assert
one native play's outcome, which the throw timing changes; they need re-recording once
the timing stage settles.
