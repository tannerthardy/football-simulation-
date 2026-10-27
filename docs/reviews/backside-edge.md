# The wide backside end on runs (run game, Defense)

2026-10-27, on #329 (`4039cc84`, develop `55cc9e57` plus the run-only
harness). Tanner's note: wide-9 ends "take themselves out way too fast". The
run-only film shows their overrun is NFL-like. What's wrong is what the
backside end does after it: in on the play 1% vs NFL 18%.

## What an NFL backside end does

[`backside_end.py`](../../scripts/diag/edge/backside_end.py) reuses
`run_film_reference.py`'s readers and edge rule (the widest DL/LB on the line,
1.5+ yd outside the surface) on BDB2025 weeks 1–2 (648 wide backside ends).
Clocks start at the handoff:

| After the handoff | 0 s | 0.5 | 1.0 | 1.5 | 2.0 | 2.5 | 3.0 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Lateral position from the ball's snap y, toward the play side (yd) | −4.4 | −3.4 | −2.3 | −1.2 | −0.2 | 1.1 | 1.9 |
| Depth (yd past the line) | −0.5 | −0.8 | −0.4 | 0.3 | 1.3 | 1.9 | 2.6 |
| Speed (yd/s) | 2.8 | 2.7 | 3.0 | 3.5 | 3.6 | 3.7 | 3.6 |
| Lateral cushion on the carrier's backside (yd) | 5.3 | 5.5 | 5.7 | 5.5 | 5.0 | 4.9 | 4.9 |

- **What he does.** He squeezes and trails without stopping. He comes down
  the line at 3–3.6 yd/s and keeps a nearly constant 5 yd cushion on the
  carrier's backside, the cutback/boot/reverse lane.
- **Depth.** He reaches the carrier's depth by 1.5 s (depth difference
  +0.02 yd).
- **Crossing.** 65% cross the ball's snap spot, at a median 1.2 s.
- **Distance to the carrier** stays about 6 yd through 3 s: 5.0 yd at the end
  of the play, p25 2.1.
- **Blockers.** A blocker comes within 1 yd of him at some point on 68% of
  plays. Even with one on him he keeps moving: 2.2 yd/s overall, 1.1 yd/s down
  the line.

## Ours, and the first wrong stage

The same measure on run-only sim film (seeds 7 and 11, 2 games each, 237 wide
backside ends):

- He starts in the same place (−4.6 yd at the handoff).
- From 1.0 to 2.5 s he stops at −3.2 yd, moving at 1.1–1.4 yd/s.
- The cushion grows from 5 to 12.5 yd, and the distance to the carrier to
  13.6 yd.
- 23% cross the snap spot, at 3.3 s. 0% are in on the play.

| Wide backside end, 0.5–3.0 s after the handoff | NFL | Sim |
| --- | --- | --- |
| Lateral speed toward the play side, free | 2.95 | 0.87 |
| Lateral speed toward the play side, a blocker within 1 yd | 1.10 | 0.05 |

The traces show two stages:

1. **Free: he holds his landmark.** The edge fit (`run-fits.ts`,
   `job.kind === 'edge'`) aims at his own C/D gap (`liveGapY`), 0.3–2.5 yd
   past the line, whatever the ball does.
   - Its gather applies only when the runner threatens his surface.
   - `pursueIfLive` (`preserveEdge`) starts the chase only once the runner is
     seen 2 yd past the line.
2. **Blocked: contain freezes him.** Engaged, his aim is his blocker's outside
   shoulder. `EDGE_CONTAIN` (`engagement.ts`) bounds an edge's target to just
   outside the runner's projected crossing, and "already wider than that, he
   stops and holds his ground".
   - On the backside the crossing is far inside him, so that clamp freezes him
     even when his aim moves toward the ball.
   - The interior fits already have a trail along the line ("the runner has
     left this first-level fit laterally"); edges were excluded.
   - Film G1-P144 (seed 11, run-only): the backside DE_S is engaged by the
     attached TE from 1.25 to 3.5 s at 0.1–0.5 yd/s. His trail aim does move
     toward the ball, and the contain clamp holds his target at his own y.

## The change (on, no flag)

From his own picture: the back is carrying the ball, flowing away from his
side at more than 1 yd/s, behind the line, and inside his landmark. While that
holds, the backside edge trails the ball:

- **Free (`run-fits.ts`):** his edge landmark moves with the ball. He keeps the
  lateral cushion his fit already had to the ball's snap spot, never wider
  than his fit, at the ball's depth. The point carries the ball's seen lateral
  motion, as the force track does.
- **Blocked (`engagement.ts`):** the same trail point replaces the
  outside-shoulder aim, with the back's flow as feed-forward (as the interior
  trail does). Containment no longer holds him while he trails; there is no
  outside left to keep.
- **Unchanged:**
  - a ball coming back toward him, or a runner past the line (the existing
    chase and cutback rules own those);
  - unacquired possession;
  - the playside end;
  - every capacity.

`test/edge-backside-trail.test.ts` checks the free request, both sides and the
mirror.

## Evidence: matched restage

Run-only captures, seeds 7 and 11 (game 1 each, 223 runs), 4 RNG-shifted
replays per arm. Base is #329.
[`edge_table.py`](../../scripts/diag/edge/edge_table.py) is
`run_film_reference.py`'s measure on the restage output.

| Wide backside end | NFL | Base | Free trail only (attempt 1) | Free and blocked trail (attempt 2) | Plus ball motion (this change) |
| --- | --- | --- | --- | --- | --- |
| Lateral speed toward the play side, free | 2.95 | 0.87 | 1.57 | 1.93 | 2.18 |
| Lateral speed toward the play side, blocked | 1.10 | 0.10 | 0.33 | 0.95 | 1.05 |
| Lateral position at 2.0 s | −0.2 | −3.3 | −2.8 | −2.0 | −1.7 |
| Crosses the ball's snap spot | 65% | 23% | 35% | 41% | 47% |
| Cushion on the carrier at 3.0 s | 4.9 | 12.4 | 10.6 | 9.4 | 8.6 |
| Distance to the carrier at 2.0 / 3.0 s | 6.1 / 6.3 | 8.9 / 13.6 | — | — | 7.5 / 10.9 |
| In on the play / first contact | 18% / 6% | 0% / 0% | 1% / 0% | 1% / 0% | 1% / 0% |

- **Playside wide end** is identical in every arm: deep 21%, first contact
  11%, in on the play 14%.
- **Yards per run vs base:** −0.01 ± 0.03, +0.02 ± 0.13 and −0.01 ± 0.13 for
  the three arms.
- **Missed + broken tackles per play:** +0.006 and +0.011 (± 0.005), from
  backside ends now reaching tackle range.

## Stop rule: what's still wrong

The movement now goes the right way at roughly the right lateral speeds. The
outcome hasn't moved: in on the play is still 1% against 18%. Two attempts
were made on this mechanism, so I'm stopping here and writing it up.

Where the remaining ground goes: up to 1.5 s he holds about 6.6 yd from the
carrier, as NFL ends do. He loses it after the runner crosses the line. The
trail covers only a ball behind the line, and the chase gate (`pursueIfLive`
`preserveEdge`, seen runner 2 yd past the line) leaves him on his edge
landmark for that beat.

**Proposed next (not built):** when his own picture shows the ball going away
from his side, a backside edge has nothing outside to preserve, so he chases
as soon as the runner crosses (gate 0, as non-edge fits do). Then re-check
far-pursuer effort (TKL-2's "far pursuers jog"), since by then he's often more
than 12 yd from the runner.

The playside end against kick-outs (wrong-arm vs box) waits for Run Game's
puller fix.

## Caveats

- Sim: seeds 7 and 11 run-only, two generated teams. NFL: two weeks.
- "Blocked" means an OL/TE within 1.0 yd on both sides. It's position-only,
  not an engagement.
- The restage arms 1–3 are successive versions of one change, each measured
  against the same base.
