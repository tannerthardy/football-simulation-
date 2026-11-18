# QB_CLOSE_BELIEF (off), QB_STANCE's readers, and the deep-accuracy read

QB lane, 2026-11-18. Patch: `docs/reviews/patches/engine71-footwork/qb-close-belief-stance-readers-on-pr842-e51c228a.patch`,
on Integration's engine-83 (PR #842, e51c228a).

## Deep accuracy (one read, Rules' rows)

Develop bcb27ea1, staged 15+ air-yd throws (`deep-acc.ts`; only 19 in 12 concepts × 6 coverages × 2 formations × 4 seeds
× flip). At the planned arrival:

| distance | median | IQR | over 2 yd |
|---|---|---|---|
| ball vs aim (his release error) | 1.76 | 1.32–2.02 | 26% |
| receiver vs aim | 1.54 | | |
| ball vs receiver | 0.35 | | 21% |

The NFL's ball vs receiver is 1.42 yd, 36% over 2 yd. Rules' 0.5 yd is receiver vs aim, so it does not measure the
throw. His release error is NFL-sized; the receiver then gets to the ball. Not widened.

## QB_CLOSE_BELIEF

**Built.** A defender he sees occupied (within 2.5 yd of another receiver and moving with him) or moving away from the
catch point is priced from the engine's own body step (`stepBody`) from the state he sees:
- his velocity is kept through his start, then he brakes, turns and runs at the point;
- an occupied man, or one moving away with his back to the passer, starts from the ball seen in the air;
- everyone else is priced as before.

**Held-ball truth** (seam-staged, the key's seam at the second hitch). Believed to contest / real share within 1.5 yd
at the arrival:

| state (facing him or not) | n | off | on |
|---|---|---|---|
| occupied, facing | 47 | 0.46 / 0.18 | **0.15 / 0.11** |
| occupied, not facing | 12 | 0.39 / 0.27 | **0.11 / 0.33** |
| away, facing | 36 | 0.52 / 0.00 | 0.45 / 0.00 |

- **Occupied is repaired.**
- **Away is not.** These men face him, backpedalling with something else in their coverage. By the engine's physics
  they could reach the ball (brake, turn, run 6–8 yd in about 1.3 s), but our defenders do not.
- That is the eyes-on finding again (0.59 / 0.19): our defenders' behavior, Coverage's repair. Attempt 2 (an away man
  with his back turned starts from the seen ball) changed nothing: one such man in 37.

**Games** (drop-timing, seeds 11 and 31, 4 games each, on engine-83):

| arm | throws | completion | ints | air yd | time to throw (median) |
|---|---|---|---|---|---|
| off | 640 | 0.694 | 9 (0.014) | 5.3 | 2.67 |
| on | 649 | 0.737 | 13 (0.020) | 5.2 | 2.75 |

Interceptions rise in small counts. Not yet explained; it needs the pick traces before any card.

**The scan** caught a new read of the defender's true speed scale. It now uses the window's existing mover's value.

## QB_STANCE: who reads his facing, and the cross-body cost (Integration's two checks)

**Readers of the passer's facing** (outside qb.ts):
1. **coverage/judgment.ts**, a zone defender's confidence in a break from the QB's "eyes". It used the chest. Under
   QB_STANCE it now uses his perceived head.
2. **defense.ts `seenQbEyes`** (SEEN_EYES). It already uses the head (QB_BODY_SEEN on).
3. **defense.ts `shoulderTarget`**, the arm read's pick on the load. It used the chest (open 51.5° in the stance until
   the delivery). Under QB_STANCE it now uses his perceived head (his eyes are on the man).
4. **ball-estimate.ts**, the shoulder line at the release, and **playsim.ts**, the release point. Both read at the
   release, where he is square. Unchanged.
5. **His own vision** is along his head (QB_HEAD). Unchanged.

**The cross-body cost** (`release-square.ts`, staged release):
- His trunk is still a median 10.5° short of the throw line at the release (p90 15.5°), on throws left and right alike
  (−10.8° / −10.0°). Off, it is 0.9°.
- With SHOULDERS_SET and QB_ALIGN off, nothing charges that. The turn is free unless QB_ALIGN is on, as it prices the
  residual: QB_STANCE wants QB_ALIGN.
- **Not explained yet:** staged completion 0.730 → 0.690 with QB_STANCE on in this run. The base-side run before the
  reader changes showed 0.702 against 0.693. To be traced before QB_STANCE lands.

**The constant.** STANCE_OPEN 51.5° is the measured NFL set angle (BDB `o`, 0.3–0.6 s before the release), not fitted
to an outcome.
- Coaching's "front shoulder to the target" is nearer 90° of the chest.
- The tracking operator reads about 52° because the window starts the shoulders' rotation into the throw, and because
  passers set partly open.
