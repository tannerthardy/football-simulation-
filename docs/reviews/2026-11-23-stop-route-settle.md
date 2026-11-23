# The settle on stop routes: measured, three attempts, nothing built (2026-11-23)

Rules + Coaching, for Integration. The item was "the hitch stops dead at the settle" (wide 3.3-3.6 vs the NFL's 5.4
yd/s at 2.0 s, Tools' start operator), with Flex's catch-side numbers for stop routes. Ours:
- stand when the ball arrives 49% of the time, against the NFL's 34%;
- catch at 1.9 yd/s, against 2.7.

**Runs.** 24 games per arm (seeds 101-124, `sim_plays.mts --full --all`, engine-91 `0226f0d3`, `npm run ref`) with
RELEASE_PACE on. NFL: BDB 2025 weeks 1-9, through Tools' `nfl_plays.py` and `nfl_catches.py`. Operators, all new in
`scripts/diag/routes/`:
- `stop_plant.py`: the stop route before the throw, matched by plant depth;
- `stop_timing.py`: plant, release and catch timing;
- `stop_catch.py`: at the catch;
- `start_onset.py`.

## What the data say

1. **The 2.0 s gap was the label.**
   - BDB 2025's PFF route list has HITCH but no CURL or COMEBACK, so the NFL "hitch" includes curls. At 2.0 s those
     are still in their stem.
   - Matched by plant depth (3-7.5 yd, WRs not targeted), our hitch already has the NFL's speed curve: at
     1.0 / 1.5 / 2.0 / 2.5 s, ours 3.9 / 5.1 / 3.2 / 1.7 against 3.7 / 4.6 / 3.5 / 1.9.
   - The plant comes at 2.4-2.5 s on both sides.
   - Any future route comparison should match by plant depth, not by label.
2. **Before the throw** (in the second after the plant):
   - the NFL's short hitch comes back 0.0 yd toward the line and slides 1.4 yd across;
   - ours come back 0.8 yd (the drawn 6 -> 5 yd leg) and slide 1.2.
   - Curls and comebacks do come back in the NFL: 0.9 yd at 10-14 yd and 1.6 at 14-20.
3. **Timing** (WR hitch completions, catch under 8 yd):

   | | NFL | ours |
   |---|---|---|
   | release, relative to the plant | 0.2 s before | at it (p50 0.0; p75 +0.5) |
   | speed at the release | 2.6 yd/s | 1.8 |
   | lowest speed between plant and catch | 1.0 yd/s | 0.2 |
   | speed at the catch | 2.4 yd/s | 0.5 |

4. **At the catch** (catch under 8 yd):

   | | NFL | ours |
   |---|---|---|
   | speed p50 | 2.5 yd/s | 0.5 |
   | under 1 yd/s | 10% | 68-76% |
   | nearest defender p50 | 2.3 yd | 3.2 |
   | yards after the catch p50 | 1.5 | 2.5 |

   NFL receivers almost never move toward the ball at the catch: 1% of all completions against our 16-18% (Flex, by
   direction against the ball's flight). They are moving across or away from it.
5. **Where ours stop.**
   - In 37 of 40 hitch targets (2 games), the receiver is already settled when he first sees the ball. Many are
     standing still when it is thrown.
   - The catch-point choice (CATCH_CHOICE) often has no candidate for a chest-high hitch ball: its reachable band is
     0.82-0.92 of his height. He then falls back to the catch spot and stands.
   - With a candidate, the choice plays the *latest* safe point, which keeps his stride on a go ball. A settled hitch
     has no stride, so the latest safe point is where he stands.

## Attempts (none built)

1. **SETTLE_MEET:** a settled receiver plays the point with the best margin, which means coming back to the ball.
   - Staged hitches: he meets the ball about 2 yd closer, at 2.5-4 yd/s.
   - Games: 6% of paired catches changed.
   - It is the wrong direction anyway: NFL receivers almost never move toward the ball at the catch (item 4).
     Reverted.
2. **SETTLE_DRIFT:** (a) the short hitch settles at its plant depth with no come-back leg; and (b) a settled receiver
   in a zone window keeps sliding away from the nearest defender he sees, up to SETTLE_WINDOW.
   - Before the throw it moved toward the NFL: come-back 0.8 -> 0.3 yd, slide 1.5, speed at the release 1.8 -> 2.3,
     release relative to the plant -0.2 s (the NFL's).
   - The catch itself barely moved: 0.5 -> 0.6 yd/s, standing 76 -> 65%.
   - **Completions fell:** hitch completion 72% -> 46% (280/391 -> 163/355).
   - One targeted diagnostic (staged hitches, 4 zone coverages × 6 seeds × 2 flips): caught 36 -> 23 of 48.
     Receivers were drifting at about 3.5 yd/s at the throw and kept going 2+ yd after it, away from where the QB's
     forecast threw the ball.
   - A second attempt stopped the drift once he had seen the ball thrown: 28 of 48, still worse. Two attempts, so I
     stopped.
3. **HITCH_DEPTH** ((a) alone):
   - Staged zone: 36 -> 34 of 48 (noise).
   - Games: hitch completion 69.7% -> 56.2% (381/547 -> 294/523).
   - Staged man (cover 0 / 1 / 2-man / 6): 38 -> 32 of 48.
   - The come-back leg is what separates our hitch from a trailing man defender. Reverted.

## Reading and hand-offs

The stop route itself, stem through plant, already matches the NFL. The visible mismatch, a parked receiver at the
catch, comes from three places:
- **The QB** (QB owner, via Integration): the NFL's hitch ball leaves about 0.2 s before the plant; ours at or after
  it, so ours has stopped and waited.
  - The QB's forecast does not lead a receiver who keeps moving after the settle. That is why any never-park rule (b)
    cost completions.
  - Moving hitches need the QB to throw to where the moving receiver will be, from what he sees.
- **The catch** (Flex, CATCH_STRIDE and the catch-point choice): a chest-high hitch ball has no candidate, and with
  one, the latest safe point keeps a settled receiver still. NFL receivers catch moving across or away from the ball,
  not toward it.
- **The route end** (mine), once the two above land:
  - (b) the never-park drift, re-tried with the QB leading him;
  - (a) the short hitch without its come-back leg, re-tested against man. Against man, our come-back is today's only
    source of separation on the hitch. The NFL's hitch gets it without coming back, presumably from the man
    defender's cushion and turn. That is Coverage's question.

Not pushed: no engine change. The scripts and this review only.
