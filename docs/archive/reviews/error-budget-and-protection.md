# Choosing what to fix: error budget, protection, the pocket, the clock and contact

There are many numbers to move and many knobs. Most of the loops we risk come
from tuning a headline statistic that several errors feed into, and fixing
one error by adding a compensating one. This review sets out how to choose
what to work on, applies it to the current engine (building on PR #1,
`9e64fc6`), and records what it found and fixed.

## Status and where to start

- Newest follow-up: [coverage judgment and pocket mechanics](coverage-judgment-and-pocket-mechanics.md).
  Read its coverage, geometric attachment, pocket-width and game-state budget
  regressions before tuning this branch further. Full QB mechanics remain
  later work; keep PR #1 separate until the owner approves reconciliation.

**Newer work:** [coverage-engine-and-playbook-depth.md](coverage-engine-and-playbook-depth.md)
has the current status and next steps; this review remains the method reference.

This work is on the branch `claude/engine-priorities`, built on the head of
the draft PR #1 (`codex/run-blocking-decision-dynamics`, `9e64fc6`); it is
not merged into PR #1 or the default branch. Start from that branch:
`git fetch origin claude/engine-priorities && git checkout claude/engine-priorities`.

- Read "How to choose" below, then the latest [What's next](#whats-next).
- Latest implementation/evidence: [pressure, protection contact and compressed
  coverage](red-zone-pocket-and-film-ids.md). It separates the pressure
  definitions, fixes contact momentum/anchoring and goal-line spacing, and
  records the remaining attached-pressure and early-sack problems.
- The [coverage and contact-choice follow-up](coverage-anticipation-and-contact-choices.md)
  is the next round on this branch: measured coverage fixes, NFL separation
  by event/coverage, paired labs, and the remaining passing/pocket priorities.
- The NFL references and the quoted runs are committed in
  `data/reviews/error-budget/`, so the error budget and anatomy scripts work
  without raw data (commands in the [data guide](../../../data/archive/catalog-2026-10-11.md#error-budget-clock-and-contact-evidence)).
- The tackle rewrite here is the "graded grasps and balance" item of
  [pursuit-contact-follow-up.md](pursuit-contact-follow-up.md). If PR #1 also
  changes `src/sim/tackle.ts`, reconcile the two before merging either.
- Next priority by measured impact: yards per completion (coverage too
  loose), then pocket push (pressure with blockers attached).

## How to choose (and avoid loops)

1. **Decompose the headline before touching anything.** Points per game are
   drives per game × points per drive (+ non-offensive scores). Compare each
   with the NFL (`scripts/error-budget.ts drives` vs.
   `scripts/data/bdb2025_drives.py`). Then split points per drive among play
   components with the error budget (`scripts/error-budget.ts budget`): a
   drive model plays drives from outcome tables by game state (down, distance,
   field zone), each component (play mix, runs, sacks, scrambles,
   interceptions, completion rate, yards per completion) taken from either the
   NFL table (`scripts/data/bdb2025_outcomes.py`) or ours, and the gap is
   shared among components with Shapley values. The fourth-down/field-goal rule
   and the drive start are fixed for every variant, so this isolates
   offensive execution and play mix.
2. **Pick the largest component whose target is well measured,** then take it
   apart with the same definitions on both sides (an "anatomy"): for sacks,
   timing, who made them, blocked or not, what the QB did after pressure.
3. **Find the mechanism in one traced play,** fix it, and prove the fix in a
   controlled lab (fixed calls, fronts and rosters, paired seeds) before
   looking at games.
4. **Re-measure the anatomy, the budget and a guard panel** (the full
   calibration table and the drive structure). A fix is done when its
   component's anatomy matches, not when the headline does.
5. **Never tune a downstream statistic to offset an upstream error.** Each
   change is one hypothesis with before/after numbers.

The trap this avoids, concretely: our games scored 28–33 points per team
(NFL ≈ 21) while our offense was *less* efficient per drive than the NFL's
(1.42 vs. 1.81 points per drive from the 25 in the drive model). The excess
came from about 50% more possessions. Lowering passing efficiency to fix the
headline would have made drives shorter still.

## What the budget found

Before this work (32 games, 4 leagues):

| | NFL 2022 | Simulation |
|---|---|---|
| Drives per team-game | 10.5 | 15.9 |
| Plays per drive | 5.7 | 4.3 |
| Average start | own 28 | own 31 |
| Points per drive | 2.00 | 1.64 |

Shapley shares of the per-drive gap (points per drive; negative = costs us
points): sacks −0.38, yards per completion +0.36, runs −0.34, completion
rate +0.18, scrambles −0.17, interceptions −0.08, play mix +0.03. Sacks were
the largest single component, and the sack anatomy made the cause obvious.

## Protection: 89% of sacks were by unblocked rushers

`scripts/sack-anatomy.ts` (sim) against the 2022 tracking/labels:

- Sacks came a median **2.4 s** after the snap (NFL 4.25 s), at **13.9%** of
  dropbacks (NFL 6.2%).
- **89%** of sacks were by rushers nobody blocked; the weak-side end alone had
  149 of them.

Two defects, both now fixed in `src/sim/behaviors/blocking.ts`:

1. **The tackle set on the chord of the rusher's arc.** He aimed for a point on
   the straight line from the rusher to the QB; a speed rusher runs a curve
   outside that line, so the tackle ran parallel about two yards inside him
   all the way back without contact. Tackles now kick to the earliest point on
   the rusher's projected path they can reach first, on his inside shoulder,
   and ride a rusher who has already won the corner (hands on from a losing
   angle) instead of shadowing him. Weak-side end never engaged, 30 forced
   plays each: Over 15 → 0, 12-personnel Over 23 → 0, Wide-9 25 → 3.
2. **No declared protection.** Each lineman grabbed the nearest rusher: against
   odd fronts both guards took the nose and an edge ran free. Protection is now
   declared at the snap by order-preserving matching (no crossing paths,
   minimal lateral distance), with a leftover rusher for a back in protection;
   live reassignment still handles games and late blitzers. 3-4 Tite vs.
   empty: 27 → 2 of 30 unblocked.

### Against the protection textbook

The user's reference, [*The Protection Engine*](../../references/README.md),
supports both changes and marks the next gaps:

- Its **angle set** aims at an interception spot on the rusher-to-QB line —
  our old target — but only works when the tackle reaches it; overshooting is
  the main failure. Against a wide-nine it prescribes an interception spot
  relative to the QB while protecting the inside half (post foot), which is
  the new cut-off point shaded to the rusher's inside shoulder. A rusher who
  wins upfield should be *escorted past the QB* rather than chased around his
  back ("the outside rush can be a good loss"), which is the new ride.
- Our declared protection is a **BOB/man** family with a no-crossing order.
  Against Tite with an empty backfield it produces the book's "five-man map to
  4i–0–4i–two OLB". Not built yet: slide and half-slide (gap ownership and
  natural exchanges), back scans with first/second windows and a release
  deadline, an explicit **hot/sight answer** for an intentionally unblocked
  rusher ("protected threats + intentionally unblocked threats = rush
  paths"), inside priority against a 4i in six-man protection, and a center
  who doesn't double the nose too eagerly.
- Chapter 19's eight labs (T/E twist vs. half-slide, Tite with two wide edges,
  double-A mug bluffs, boundary nickel overload vs. empty, Bear plus an A-gap
  insert, simulated pressure, motion to empty) are the right fixed-scenario
  tests for that work. `test/protection.test.ts` starts with the edge and
  declared-order checks.

## The pocket

How the QB handles pressure: he estimates the soonest any rusher can reach
him; under about 0.9 s of that he lowers the bar for his current read, accepts
more risk and gets less accurate (composure limits it); under 0.45 s he takes
any reasonable throw, scrambles if there's a lane, sometimes throws it away,
otherwise dodges. An internal clock (about 2.5–4 s with composure and pocket
presence) sends receivers into the scramble drill. The time spent on each
read does not shrink under pressure.

NFL tracking (2022, two weeks, defender within 2 yards from 0.5 s,
`scripts/data/bdb2025_pocket.py`) against ours, same definition:

| | NFL | Before | After |
|---|---|---|---|
| Pressured dropbacks | 30.7% | 27.2% | 23.0% |
| Time to pressure p10 / p50 | 1.9 / 2.7 s | 0.5 / 2.2 s | 1.8 / 2.4 s |
| Pressure → release, sack or scramble, p50 | 0.40 s | 0.35 s | 0.20 s |
| After pressure: throw / sack / scramble | 74 / 18 / 8% | 71 / 26 / 3% | 69 / 25 / 6% |
| Time to throw clean / pressured, p50 | 2.4 / 3.1 s | 2.45 / 2.65 s | 2.45 / 2.55 s |

So the QB already speeds up under pressure about as much as NFL QBs do. Three
changes:

- **Pocket feel.** He used to ignore a rusher still in a block until the block
  was 75% lost, so pressure appeared all at once. A rusher in a block now
  counts as arriving later the more square the block is, and pocket presence
  decides how early a losing rep is noticed.
- **Escaping.** Under pressure he also looks for lanes outside the pocket to
  either side, not only straight upfield (pressured scrambles 3% → 6%).
- **Under-center alignment.** The QB stood 0.9 yd behind the line; NFL tracking
  puts him about 1.7 yd back (the center is between them). That made the nose
  "pressure" him at 0.5 s. Drop depth now tracks the NFL (1.6 / 2.0 / 3.0 / 4.5
  / 6.0 yd at 0–2 s vs. 1.7 / 2.0 / 3.3 / 5.0 / 6.5).

Remaining gap: in the NFL a pressure often lingers — a rusher within 2 yards
who is still being ridden by his blocker (p90 2.5 s from pressure to release).
Ours arrive free and resolve at once (p90 0.6 s), so sacks per pressure stay
high. That belongs to the trench model (rushers win too early, median shed
1.55 s), not to the QB.

## Results after protection and the pocket

Same 32 games (seed 7, four leagues) at each step; NFL drive figures from
`scripts/data/bdb2025_drives.py`, the rest from the calibration targets.

| | NFL | Start (`9e64fc6`) | Protection | Pocket + alignment |
|---|---|---|---|---|
| Points / team-game | 21–23.5 | 28.3 | 31.5 | 33.5 |
| Drives / team-game | 10.5 | 15.9 | 15.0 | 15.1 |
| Plays / drive | 5.7 | 4.3 | 4.7 | 4.7 |
| Points / drive | 2.00 | 1.64 | 2.04 | 2.11 |
| Scrimmage plays / team-game | 61–65 | 66.2 | 68.1 | 68.1 |
| Sack rate | 6.2% | 13.7% | 6.4% | 5.4% |
| Scramble rate | 4.1% | 4.7% | 4.1% | 5.5% |
| Yards / attempt | 6.8–7.2 | 9.3 | 9.0 | 9.3 |
| Rush yards / carry | 4.1–4.5 | 3.4 | 3.1 | 2.9 |
| Run stuffs | 16–20% | 28% | 29% | 27% |
| 3rd-down conversion | 37–41% | 29% | 34% | 36% |
| Punts / team-game | 3.5–4.5 | 7.9 | 6.3 | 6.2 |

Budget from the own 25 after both changes: NFL 1.81, simulation 1.99 points
per drive (was 1.42). Shapley shares: yards per completion +0.47, runs −0.38,
completion rate +0.31, scrambles −0.24, interceptions −0.12, play mix +0.07,
sacks +0.06. Sacks have gone from the largest component to the smallest.

Points per game went *up* while sacks were fixed, which is the expected
direction: per-drive efficiency is now a little above the NFL's, and the
excess points come from possessions. The two largest per-play components
are opposite in sign (passing too good, running too poor); they offset at the
drive level, so the headline cannot be used to judge either one.

Priorities after that round, in order of measured impact (the next section
works through the first two):

1. **Possessions.** 15 drives per team-game against 10.5 is the largest single
   error in points per game (about +45% possessions). Two parts: too many
   snaps per team-game (68 vs. 61–65, a clock and tempo question in the game
   layer) and short drives (4.7 plays, 6.2 punts) from a run game that loses
   yards. Measure seconds per snap by situation against the NFL before
   touching anything.
2. **Run game** (−0.38 per drive). Stuffs 27% vs. 16–20%, yards before contact
   0.85 vs. 1.5–2.3. The run-blocking work is on PR #1; re-run this budget on
   its head rather than tuning around it here.
3. **Pass efficiency per attempt** (+0.78 per drive, completion and yards
   together). Separation at the catch point 4.1 yd (NFL ≈3.0), tight windows
   4.8% (NFL 13–17%), YAC 5.9: coverage is too loose and tackling after the
   catch too weak. Use forced coverage contexts, not full games.
4. **Scrambles** (−0.24). Slightly too frequent (5.5% vs. 4.1%) and they gain
   less than NFL scrambles; check scramble yards by state before changing the
   trigger.
5. **Trench timing.** Rushers beat blocks too early and arrive free; NFL
   pressure lingers with blockers still attached (see above).

## Second round: possessions, the clock and contact

### Too many snaps: the clock

`scripts/data/bdb2025_clock.py` measures game clock between consecutive snaps
of a drive in the 2022 plays (weeks 1–9, outside the last 2:00 of the 2nd
quarter and 5:00 of the 4th), by how the earlier play ended;
`scripts/data/bdb2025_contact.py` measures live time (snap to whistle) in the
tracking. `scripts/clock-anatomy.ts` measures ours the same way.

| Previous play | NFL snap to snap | NFL live | Ours before | Ours after |
|---|---|---|---|---|
| In bounds | 39.4 s | 5.0 s | 37.6 s (live 3.9) | 38.2 s (live 4.4) |
| Out of bounds | 36.0 s | 5.9 s | 12.2 s | 34.1 s |
| Incomplete | 6.6 s | 4.5 s | 4.3 s | 4.3 s |
| Sack | 42.1 s | 4.45 s | 36.1 s | 40.7 s |
| Accepted foul | 24 s | — | 7.9 s | 15.8 s |

The time between the whistle and the next snap after a play in the field was
already right (≈34 s). Three rules were not:

- **Out of bounds** before the late-half windows: the clock restarts on the
  ready signal, about 30 s before the snap; ours ran 7 s.
- **Fouls**: after an accepted foul on a play the clock restarts on the ready
  signal (≈19 s to the snap; ours 14 s). A pre-snap foul with the clock
  running costs the ready-signal runoff (25-second play clock, ≈17 s); ours
  ran none.
- **Sacks**: the offense regroups further back, ≈38 s whistle to snap.

These are small (snaps per team-game 69.5 → 69.1 on their own): out-of-bounds
plays are rare in our games (2–4% of snaps vs. 12%), and plays end too soon.
That second part was the bigger finding.

### Plays end too soon: what happens after contact

Same definitions on both sides (`scripts/contact-anatomy.ts` vs.
`scripts/data/bdb2025_contact.py`; first contact is the first touch on the
carrier, the tackle is the whistle):

| | NFL | Before | After |
|---|---|---|---|
| **Designed runs**: snap → handoff | 1.29 s | 1.28 s | 1.28 s |
| handoff → first contact | 1.60 s | 1.03 s | 1.01 s |
| first contact → tackle | **1.62 s** | **0.48 s** | **1.32 s** |
| yards after first contact | **3.14** (p50 2.33) | **1.23** (p50 0.50) | **2.54** (p50 1.60) |
| **Completions**: catch → first contact | 0.87 s, 2.8 yd | 0.77 s, 2.6 yd | 0.73 s, 2.3 yd |
| first contact → tackle | **1.24 s, 2.1 yd** | **0.44 s, 1.0 yd** | **1.11 s, 2.2 yd** |

Up to first contact our carriers were close to the NFL. After it they went
down in under half a second. `scripts/tackle-lab.ts` (one back, one
linebacker, fixed angles and speeds) isolated it: a solo tackle from any
angle ended 0.32 s after contact with 0.44 yd gained. A wrap fully coupled
the bodies, the tackler's stopping force outweighed the runner's leg drive,
and once the pile slowed a random "down" hazard of about 5/s ended it.

The tackle bond (`src/sim/tackle.ts`) now models the grasp:

- **Grip.** Contact quality sets a grip from a fingertip grab (0.25) to a
  body-to-body wrap (1). A sure tackler works it toward a wrap in about a
  third of a second. Contact couples the bodies in proportion to the grip, so a
  grab drags the tackler and still conserves momentum.
- **Stopping force by position.** Full from in front of the carrier, where the
  tackler drives through him; from the side or behind he is mostly weight being
  dragged (three quarters).
- **Going down.** The tacklers' grip and power take away the carrier's base
  against his balance; a carrier moving fast is easier to trip. Or forward
  progress stops: a pile that gains nothing for 0.8 s is whistled. He falls
  forward if he is still moving forward. The fixed down hazard is gone.

Solo tackles in the lab now take 0.8–1.3 s (head-on stops 0.8–0.9 s with no
gain; from the side or behind 2–3 yd at low speed, about 4 yd at full speed).

### A hidden offset: quarterbacks threw out of tackles

With the old half-second bond a wrapped quarterback could still throw; about
half the wraps on the QB ended in a pass. A longer bond made that obvious —
the sack rate fell to 0.5%. Two rules replace it:

- **In the grasp.** A quarterback held firmly behind the line before he
  throws is down after a quarter second (the rule protects him; set to throw,
  he has no base anyway).
- **Throwing while held.** Wrapped up, he cannot start a throw; a throw
  already in his motion comes out with extra error; with only a hand on him he
  can still throw, inaccurately.

That gave an honest sack rate of 10%, and the sack anatomy showed why: the
weak-side end made 58% of all sacks, a third of them unblocked. Traced, the
tackle aimed at a cut-off point projected along the end's *current* heading,
which early in the rush points upfield and wide; the tackle shuffled outward
(1.4 yd out, 0.5 yd of depth in the first second) while the end bent back
inside behind him. The cut-off now projects the rusher's path as an arc that
bends toward the QB (about 1.2 rad/s, near what our ends do), which puts the
landmark deeper and inside — a vertical set. The quarterback also climbs
the pocket when he senses an edge rusher reaching his depth outside him
(perceived positions, so a blind-side rusher is felt late; pocket presence
decides how early). Free weak-side-end sacks in the lab fell from 10 to 3 of
240 dropbacks.

### Results

Same 32 games (seed 7, four leagues):

| | NFL | Before this round | After |
|---|---|---|---|
| Points / team-game | 21–23.5 | 33.5 | 36.8 |
| Drives / team-game | 10.5 | 15.1 | 13.8 |
| Plays / drive | 5.7 | 4.7 | 5.0 |
| Points / drive | 2.00 | 2.11 | 2.54 |
| Scrimmage plays / team-game | 61–65 | 68.1 | 66.0 |
| Rush yards / carry | 4.1–4.5 | 2.9 | 4.8 |
| Run stuffs | 16–20% | 27% | 17% |
| 10+ yard runs | 10–12% | 5.5% | 10.8% |
| 3rd-down conversion | 37–41% | 36% | 41% |
| Punts / team-game | 3.5–4.5 | 6.2 | 4.4 |
| Sack rate | 6.2% | 5.4% | 4.9% |
| Yards / attempt | 6.8–7.2 | 9.3 | 9.7 |
| YAC / reception | 4.8–5.6 | 5.9 | 6.6 |
| Fumbles lost / team-game | 0.4–0.7 | 0.36 | 0.81 |
| Missed + broken tackles / play | 0.11–0.16 | 0.18 | 0.17 |

Budget from the own 25: NFL 1.81, simulation 2.63 points per drive. Shapley
shares: **yards per completion +0.72**, scrambles −0.21, completion rate
+0.19, runs +0.08, interceptions −0.07, sacks +0.07, play mix +0.03. The run
game went from the largest negative component (−0.38) to a small positive one.
Points per game rose because the run game now works while passing is still far
too efficient; that is the budget doing its job, not a regression to undo.

### What's next

The list below records this round's hand-off. For the subsequent measurements
and current priorities, read [coverage anticipation and contact choices](coverage-anticipation-and-contact-choices.md#whats-next).

1. **Yards per completion** (+0.72 per drive, now nearly the whole gap).
   Separation at the catch point 4.2 yd (NFL ≈3.0), tight windows 3.8% (NFL
   13–17%), 20+ yard completions 12% of attempts (7–9%), YAC 6.6. Up to first
   contact a receiver's YAC is close to the NFL's (above), so the excess is in
   how open he is when the ball arrives and in plays that never meet a
   tackler. Forced coverage contexts: separation by coverage, route and
   leverage at the throw and at the catch.
2. **Pressure with blockers attached.** A defender is within 2 yd of the QB
   on 15% of our dropbacks vs. 31%; NFL pressure is usually a rusher still
   being ridden or pushing the pocket back, ours is a rusher who has come
   free. Rush depth over time while engaged (pocket push) against tracking.
3. **Possessions.** 13.8 drives (10.5). Plays still end ~0.6 s soon (handoff
   to first contact 1.0 s vs. 1.6 s: our backs hit the line faster and more
   directly than NFL backs, who press laterally), and out-of-bounds endings
   are rare (4% vs. 12%): carriers near the sideline don't get out.
4. **Scrambles** (−0.21 per drive): check scramble yards by state.
5. **Fumbles** (0.81 lost per team-game, NFL 0.4–0.7): longer piles mean more
   assists, and every assist rolls a fumble. Fumble risk should follow hit
   power and ball security over the whole carry, not the number of arrivals.
6. **Overlap note.** The tackle work here is the "graded grasps and balance"
   item in [pursuit-contact-follow-up.md](pursuit-contact-follow-up.md); it
   keeps that review's momentum and constraint invariants (its tests pass
   unchanged) and adds lab and scenario tests.
