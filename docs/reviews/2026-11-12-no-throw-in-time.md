# When there is no throw in time: extend, throw away, or take it (2026-11-12)

Diagnosis and proposal only; nothing built.

The population is dropbacks where a free rusher (no offensive body within 1.0 yd of him) comes within 2.0 yd of the QB
before the ball is out. Tool: `scripts/diag/pass-operators/free-rush.py`, the same code on BDB 2025 and on sim-export
(engine-37, seeds 201 and 301, 16 games each, FREE_BOUND off and on).

## The NFL against ours

How often: NFL 23% of dropbacks; ours 21–27%.

| outcome | NFL share / n | time after the moment p50 | QB moved p50 | direction vs the rusher p50 | outside the tackles |
|---|---|---|---|---|---|
| thrown, targeted | 1089 | 0.20 s | 0.5 yd | 123° | 25% |
| thrown away | 15% of throws (195) | 0.70 s | 2.4 yd | 118° | 63% |
| scramble | 17% (392) | 2.00 s | 9.8 yd | 83° (around him) | 82% |
| sacked | 25% (573) | 1.30 s | 3.0 yd | 119° | 36% |

| outcome | ours, off 201 / 301 | ours, FREE_BOUND on 201 |
|---|---|---|
| thrown / sacked / scramble | 77 / 19 / 4%, 77 / 17 / 6% | 84 / 9 / 8% |
| thrown away | 2 / 3 throws | 3 throws |
| targeted throws: time, moved | 0.25 s, 0.1 yd | 0.15 s, 0.1 yd |
| scramble: time, moved, direction, outside | 1.05–1.90 s, 5.4–8.4 yd, 71–84°, 62–71% | 0.20 s, 1.2 yd, 58°, 73% |
| sacked: time, moved, outside | 0.95–1.05 s, 0.8–1.0 yd, 0% | 1.00 s, 1.0 yd, 16% |

NFL sacks come mostly from interior free rushers (87% of sacks have the rusher from inside the tackles). Scrambles come
more often against edge rushers (52%).

## Reading

The NFL QB who has no throw in time **moves**:
- before a sack, about 3 yd, and over a third of those sacks end outside the tackles;
- before a throwaway, about 2.4 yd, mostly ending outside the tackles, where it is legal;
- in a scramble, about 10 yd, around the rusher (83° to his line), not straight away.

Ours **stands**: 0.8–1.0 yd before a sack, 0.1 yd before a throw. Either he hot-throws in 0.15–0.25 s, or he is sacked
in about a second, inside the tackles. Throwaways do not happen (about 1%). Scrambles are rare (4–8%), though they look
NFL-like when they happen (about 8 yd, around the rusher, outside).

So the missing piece is the first act under an alarm with no ready throw: **evade**. Slide, step up, or get outside,
away from the rusher's line, by what the QB sees of the lanes. From where that leaves him, the three NFL outcomes follow:
- a throw on the move if one comes open;
- a throwaway from outside the tackles (or to an eligible's area) when nobody is;
- a scramble when a lane opens;
- otherwise he is caught, later and in a different spot (the sack after 1.3 s, a third of them outside).

## Proposal (not built)

Its own flag, building on SET_DECIDE's movement (felt time to contact at each reachable spot, from his own picture) and
the parked throwaway. Each step is the QB's intent, by his traits.

1. Under an alarm, when the read plan's hot answer has no throw in time (Rules + Coaching's HOT_PLAN decides that;
   this starts where it ends), he evades. He goes to the reachable spot with the most felt time, from what he sees of
   the rush lanes, at a pace set by his mobility. Pocket presence sets how early he moves; decision-making how well he
   picks the spot. A false alarm then costs him: he leaves a pocket that was fine.
2. From there, each tick: a throw on the move if one clears his bar (the read plan's, with the off-platform cost the
   throw already has); a scramble if a lane past the line opens (the existing check).
3. A throwaway when nobody is open and the rush is on him. It must be legal: outside the tackle box with the ball
   reaching the line, or to an eligible receiver's area. Inside the box with nobody near is grounding, and the rules
   call it. Decision-making sets how readily he gives up the play.
4. Otherwise he protects the ball and is caught: the sack, now after his evasion.

Gates:
- the population's outcome split and its geometry (time, distance moved, outside-the-tackles shares) against the NFL
  table above;
- the share of false-alarm evasions from a clean pocket;
- grounding calls;
- sacks, scrambles, throwaways and the run game unaffected.

## EXTEND: built and read (2026-11-12)

Flag `EXTEND`, off. It is the body of Rules + Coaching's `noThrow` hook (rules/hot-plan f4fb6de9, merged), whose
contract is the `NoThrowContext` doc comment. With the flag off the body is theirs, unchanged; the export is identical
to f4fb6de9 with FREE_BOUND and HOT_LOOK on.

With the flag on:
- He evades to the spot with the most felt time. That is SET_DECIDE's spot choice, judged with the same felt time as
  his alarm (FREE_BOUND's bound at each spot), at his mobility's pace 2.2 + 2.8 × mobility yd/s.
- From there, a lane past the line is a scramble.
- With nobody open (`ctx.best` P < 0.15), a sound decision maker (≥ 0.3) throws it away: beyond the sideline from
  outside the box, or, trapped inside, at an eligible's feet.
- A poor decision maker throws it away regardless, and the rules call grounding.
- Otherwise he protects the ball (evade).
- `whileLooking` continues an evasion already under way; a look never starts one.
- No strip chance was added.

Fixtures: `test/extend.test.ts`, 4 tests.

### How often the hook is reached today

`no-throw-reach.mts`, FREE_BOUND + HOT_LOOK, seed 201, 8 games, 744 dropbacks. The branch reaches a scramble on 12
plays, a throwaway on 5 and evade on 72. Most of those evade calls are HOT_LOOK's while-looking sidestep, and 57 of the
72 plays end in a throw. The no-throw hook itself is reached only on alarmed ticks with neither a hot throw nor a look.

### Paired read

FREE_BOUND + HOT_LOOK, EXTEND off against on, sim-export seeds 201 and 301, 16 games each.

| | off 201 / 301 | on 201 / 301 |
|---|---|---|
| sacks | 3.0 / 3.6% | 2.5 / 3.8% |
| scrambles | 1.7 / 2.0% | 1.5 / 1.6% |
| throwaways | 0.9 / 0.7% | 0.7 / 0.3% |
| grounding | 0 / 0 | 0 / 0 |
| free rusher at 2 yd: thrown / sacked / scramble | 81 / 13 / 6%, 79 / 15 / 6% | 84 / 11 / 6%, 79 / 15 / 6% |

No measurable effect, as expected. The population that reaches the hook today is small. The larger one (read-logic
throws under rising urgency that should not clear his bar) enters only through Rules + Coaching's urgency-bar repair.
Read EXTEND again once that lands.

### A finding for Defense: our free rushers come from inside

NFL free rushers at 2 yd come from the edge 23% of the time (511 of 2249). Ours do 3% of the time (9–12 of 311–349).
NFL edge free rushers end in a scramble 40% of the time and a sack 15%; interior ones 11% and 29%. So the outcome mix
starts from the rush. Our free men at the QB are almost all interior.
