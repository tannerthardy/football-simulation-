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
