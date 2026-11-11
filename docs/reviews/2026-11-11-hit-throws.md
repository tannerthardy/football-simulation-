# What throws under contact are: NFL vs sim (2026-11-11)

Question (Integration, for Tanner): hit throws complete ~40–50% in the sim against the NFL's 33%. Is that because
the throws are too accurate, or because the sample holds different plays?

## Method

- Operator: `scripts/diag/pass-operators/hit-throws.py`, the same code on both sources.
- Population: dropbacks with a forward pass where a defender's centre is within 1.0 yd of the QB at or before the
  release frame. This is qb-contact.py's definition.
- NFL source: BDB 2025, weeks 1–9 (`out/mechanics/nfl-plays.jsonl.gz`). The ball track and labels come from
  `scripts/mechanics/nfl_bdb2025_ball.py`.
- Sim source: engine-27 default, seeds 201 and 301, 16 games each (`sim-export.ts`).
- Throwaway = the source's own call that a pass had no intended receiver:
  - NFL: the play description names no receiver.
  - Sim: `QBPass.throwAway`.
  - A geometric test (out of bounds, or no WR/TE/RB within 5 yd of the ball) is the cross-check. It agrees on
    about half the NFL hit throwaways and over-fires on clean throws, so it is not the measure.
- Limits:
  - Tracking has no arm, so "contact" means a body within 1 yd.
  - The NFL ball track has no height.
  - NFL arrival tags can lead the ball. The landing point is the nearest of the tag frame and its ±0.1 s
    neighbours, on both sources.
  - NFL drops are not labelled. "Catchable not caught" is a geometric class (ball within 1.5 yd of the target,
    no defender on the ball).

## Exporter fixes made for this measurement (`sim-export.ts`)

- A sim throwaway emits `throwaway`, not `throw`, so it was exported with no `pass_forward`. qb-contact.py
  therefore counted throwaways as no-throw plays (a sack or scramble). Throwaways are now forward passes, as in
  the NFL. They are rare in the sim (11 and 18 per 16 games), so earlier qb-contact splits move little.
- The ball reaching a receiver who could not catch it (`miss`) is now the arrival, as NFL `pass_arrived` is.
- A ball track (`bxy`) and the sim's own labels were added.

## Table

| Throws with a defender within 1 yd before release | NFL | sim 201 | sim 301 |
|---|---|---|---|
| n | 369 | 133 | 160 |
| complete, all | 33% | 40% | 42% |
| **thrown away (no intended receiver)** | **23%** | **1%** | **1%** |
| complete, targeted throws only | 43% | 40% | 42% |
| interception | 2% | 5% | 3% |
| **phase: contact ≤0.2 s before release** | 47% | 89% | 88% |
| 0.3–0.5 s | 11% | 10% | 9% |
| 0.6–1.0 s | 16% | 2% | 2% |
| **more than 1.0 s (contact survived, thrown later)** | **26%** | 0% | 2% |
| target tight (<1.5 yd) / mid / open (≥3), of targeted | 19 / 29 / 53% | 34 / 34 / 32% | 29 / 31 / 39% |
| a more open man existed | 43% | 29% | 38% |
| ball on target (≤1.5 yd) / ordinary / wild, targeted | 71 / 14 / 14% | 59 / 23 / 17% | 65 / 19 / 16% |

Incompletion types, as a share of incompletions:

| | NFL | sim 201 | sim 301 |
|---|---|---|---|
| thrown away | 36% | 1% | 2% |
| defended | 7% | 11% | 11% |
| off target (long / short / wide) | 1 / 14 / 10% | 11 / 12 / 35% | 9 / 16 / 29% |
| catchable, not caught | 33% | 30% | 32% |

Throwaways from a legal spot (QB outside the tackles, or the ball past the line): 76% in the NFL. The sim's
handful are mixed.

Completion by phase × openness, for contact ≤0.2 s before release (cells with n ≥ 30):

| | tight | mid | open |
|---|---|---|---|
| NFL | 7% (30) | 30% (46) | 52% (69) |
| sim 201 | 23% (43) | 45% (38) | 43% (37) |
| sim 301 | 39% (44) | 45% (44) | 40% (50) |
| clean throws, NFL | 28% | 55% | 78% |
| clean throws, sim (201 / 301) | 51 / 54% | 63 / 58% | 65 / 68% |

## Reading

1. **The excess is the throwaway, not the throw.**
   - Targeted hit throws complete 43% in the NFL against 40–42% in the sim.
   - The NFL's 23% throwaways make up the whole gap.
   - Sim hit throws are, if anything, less accurate than the NFL's: on target 59–65% against 71%, with more wide
     misses and more interceptions.
2. **The NFL sample holds a play the sim lacks.**
   - In the NFL, 42% of hit throws come more than 0.5 s after first contact: he survives the contact, escapes or
     resets, and throws.
   - In the sim, 88–89% are hit in the last 0.2 s, and contact otherwise ends in a sack. This is the same missing
     movement as the ends-outside gap.
3. **Target choice under contact differs.**
   - The sim forces covered balls: 29–34% tight against 19%.
   - The NFL QB goes to open men or throws it away.
4. **The sim's completion barely depends on openness, under contact or clean.**
   - Clean tight-window throws complete 51–54% against the NFL's 28%.
   - That is a coverage/catch-point question for Coverage, not specific to contact.
   - Under contact it means tight forced throws complete 23–39% against 7%.
5. **The sim's throwaway is a dice roll.**
   - It is a chance on the hot path and on clock expiry, aimed at the sideline 8 yd ahead.
   - It does not consider whether he is outside the pocket or a receiver is in the area.
   - In 8 games, 8 throwaways drew 0 grounding calls. Not chased further here.

## What this sets

- **Gate for SET_DECIDE and SHOULDERS_SET:** completion of targeted hit throws, and the openness mix of the target
  (with "a more open man existed").
- **Not the gate:** the all-throws hit completion. It mostly measures throwaways.
- **Throwaway share:** this is a decision gap. "When hit and nobody is open, throw it away from a legal spot" is
  a coached rule built from what he sees. It belongs in the read logic (Coverage), alongside a movement that gets
  him outside the tackles.
- **Throw-mechanics gate:** the phase mix cannot match until he survives contact. SHOULDERS_SET's
  hurried-throw gate should be judged inside the ≤0.2 s cell, not on the totals.

## Status (2026-11-11)

- Integration adopted these gates:
  - completion of targeted hit throws, plus the target's openness mix;
  - SHOULDERS_SET's hurried-throw cost judged within the ≤0.2 s cell.
- Point 4 (completion barely depends on openness) went to Coverage.
- The throwaway choice went to Flex: see docs/reviews/2026-11-11-shoulders-set.md, "Where this stands".
- The exporter fix is commit b4ae85d8. It touches only scripts and is meant to land on its own.
