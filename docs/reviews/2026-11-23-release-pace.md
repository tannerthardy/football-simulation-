# Release pace: one get-off for every route (RELEASE_PACE, 2026-11-23)

Rules + Coaching, for Integration. This follows Tools' start-and-turn measurement
(`docs/reviews/2026-11-23-start-and-turn-speed.md`, tools/open-census 0a0c86fa5). Ours leave the line late, and two
designed throttles were the suspects:
- LINE_START's get-off share, which rises with the depth of the first break;
- the per-family stem caps in `routeEffort`.

**Question:** do the two throttles have a taught reason? If they are removed, does the start match the NFL's by
alignment and route, without a new constant?

## What is taught

- **The release is the same on every route.**
  - "It is much harder for a DB to run the underneath routes when the receiver is taking off the ball with the same
    pace on vertical routes, quick game routes, running plays and everything in between." (USA Football, Coaching the
    Wide Receiver: Beating Loose Coverage, https://blogs.usafootball.com/blog/7192/here)
  - Every route should look the same off the ball, so the DB cannot read tendencies. (AFCA, Winning Vertically at the WR
    Position, https://www.afca.com/winning-vertically-at-the-wr-position/)
  - A depth-dependent get-off (a hitch at 0.5-0.6 of start force, a go at 0.7) has no taught reason. It is the opposite
    of the teaching. **H.**
- **The stem's pace before the break.** The teaching is to sell the vertical. Slowing is taught only into the break
  and at a settle, and both have their own mechanisms here (the route law's through speed, the settle and sit rules).
  No source gives a per-family cap. **M.**
- **TE in-line.** Most in-line TEs start from a three-point stance. A release against a defensive end starts with a
  step inside, not an immediate fire at the end (Waldman, N.C. State TE George Bryan,
  https://mattwaldmanrsp.com/2012/02/21/n-c-state-te-george-bryan-great-hands/). No source measures what the stance
  costs in time. **M.**
- **Back.** On a check-release he first confirms there is no rusher, then leaves (Football Nation, Blitz pickup,
  https://www.footballnationusa.com/post/what-is-blitz-pickup-football). **H** for the rule; **L** for how often an NFL
  back is on one.

## Measurement

- **Operator:** Tools' `scripts/diag/census/start_speed.py` (0a0c86fa5), unchanged. Also an onset split: the time to
  0.2 yd from the snap spot, and the speed 0.3 / 0.6 s after it.
- **Runs:** 24 default games per arm (seeds 101-124, `sim_plays.mts --full --all`) on develop engine-91 `0226f0d3`,
  run with `npm run ref` (the engine defaults). NFL: BDB 2025 weeks 1-9, 9,657 dropbacks.
- **Arms:**
  - **default**;
  - **getoff**: RELEASE_PACE=1, every route gets off with the go's share;
  - **golike**: getoff, plus every stem at the deep family's cap. This was a diagnostic arm and is not built.
- Runtime about 25 min per arm on 4 cores.
- **Correction:** an earlier set of arms ran under `baseline:run --candidate`. That applies the 2026-10-13 baseline
  profile (LINE_START off, among others), not engine-91's defaults, so those arms are discarded. Its "default"
  overshot the NFL by 1.3 yd/s at 0.5 s.

Speed at 0.5 / 1.0 / 1.5 / 2.0 s, by alignment:

| group | NFL | default | getoff | golike |
|---|---|---|---|---|
| wide | 1.6 / 4.1 / 5.7 / 6.2 | 1.3 / 3.9 / 5.6 / 5.9 | 1.4 / 4.0 / 5.6 / 5.9 | 1.4 / 4.1 / 5.7 / 5.9 |
| slot | 1.7 / 4.2 / 5.7 / 6.1 | 1.1 / 3.4 / 5.1 / 5.4 | 1.3 / 3.7 / 5.3 / 5.5 | 1.3 / 3.7 / 5.3 / 5.4 |
| TE in-line | 1.4 / 3.3 / 4.4 / 4.9 | 1.3 / 3.2 / 4.3 / 4.7 | 1.5 / 3.4 / 4.3 / 4.6 | 1.5 / 3.5 / 4.6 / 4.8 |
| TE flexed | 1.6 / 3.7 / 4.9 / 5.3 | 1.6 / 3.5 / 4.5 / 4.8 | 1.8 / 3.7 / 4.5 / 4.6 | 1.8 / 3.7 / 4.6 / 4.7 |
| back | 1.1 / 3.1 / 4.2 / 4.7 | 1.7 / 3.2 / 3.8 / 4.1 | 1.9 / 3.4 / 3.9 / 4.1 | 1.9 / 3.4 / 3.9 / 4.1 |

By route, wide (slot in brackets), speed at 0.5 / 1.0 / 1.5 / 2.0 s:

| route | NFL | default | getoff |
|---|---|---|---|
| hitch | 1.6 / 4.2 / 5.5 / 5.4 (1.6 / 4.1 / 5.2 / 4.9) | 1.2 / 3.6 / 5.0 / 3.6 (1.1 / 3.3 / 4.8 / 4.1) | 1.4 / 3.9 / 5.1 / 3.3 (1.3 / 3.7 / 5.0 / 3.7) |
| go | 1.6 / 4.2 / 5.9 / 6.8 | 1.4 / 4.2 / 6.1 / 7.2 | 1.4 / 4.2 / 6.1 / 7.3 |
| slant | 1.3 / 3.4 / 4.5 / 5.2 | 1.0 / 3.2 / 4.8 / 5.9 | 1.4 / 3.8 / 5.1 / 6.0 |
| flat (slot) | 1.2 / 3.2 / 4.6 / 5.3 | 1.0 / 3.1 / 4.8 / 5.8 | 1.3 / 3.6 / 5.1 / 6.0 |

**Onset** (time to 0.2 yd p50; speed 0.3 s after it, p50):

| group | NFL | default | getoff + stem (golike) |
|---|---|---|---|
| wide | 0.5 s; 3.30 | 0.6 s; 3.35 | 0.6 s; 3.44 |
| slot | 0.5 s; 3.32 | 0.6 s; 3.00 | 0.6 s; 3.31 |
| TE in-line | 0.5 s; 2.68 | 0.6 s; 2.75 | 0.5 s; 2.81 |
| TE flexed | 0.5 s; 3.02 | 0.5 s; 2.69 | 0.4 s; 2.80 |
| back | 0.6 s; 2.76 | 0.5 s; 2.72 | 0.4 s; 2.94 |

**Time to 3 yd p50:** slot NFL 1.3 s, default 1.5, getoff 1.4. TE flexed 1.3, 1.4, 1.3. Back 1.5, 1.5, 1.4.

## Reading

1. **The depth-dependent get-off was the slot's early deficit, and the hitch shows it.**
   - The NFL's hitch leaves at the go's pace: 4.2 yd/s at 1.0 s, both.
   - Ours left at 3.6 (wide) and 3.3 (slot). With RELEASE_PACE, 3.9 and 3.7.
   - Once he is moving, the slot's push matches the NFL's (3.31 vs 3.32 yd/s 0.3 s after onset; default 3.00).
   - Wide is now 4.0 vs 4.1 at 1.0 s. Slot is 3.7 vs 4.2.
   - What is left at 0.5 s is onset: ours at 0.6 s against the NFL's 0.5, with no spread. Tools' caveat applies:
     0.1-0.2 s of it may be NFL snap anticipation. No constant should be added for it.
2. **The stem caps are not the late deficit.** Running every stem at the deep cap (golike) moved wide and slot at
   2.0 s by 0.0 to -0.1 (5.9 / 5.4 either way) and pushed the slant further over. So STEM_PACE is not built.
   - The 2.0 s gap is the hitch: wide 3.3-3.6 vs 5.4, slot 3.7-4.1 vs 4.9. The hitch stops dead at the settle; the
     NFL's is still moving. This is a known open item (FLAGS ROUTE_EFFORT row: "the hitch and curl stopping dead").
     It is the next route item, a settle mechanism, not a pace constant.
3. **The slant and the flat now leave the line too fast.**
   - Wide slant at 1.0 s: 3.8 vs the NFL's 3.4. Slot flat: 3.6 vs 3.2. With the default share they were closer, by
     accident: the share's depth term held them down.
   - The NFL's cost is the release angle, not the break depth. The slant's first step is angled inside and the flat's
     is lateral.
   - Our body has no direction law: the start force is isotropic, and #850 measured a lateral start at 0.95 of the
     forward one against the NFL's 0.66-0.70. **DIR_START (#850, parked) is the mechanism that charges these starts.**
     With RELEASE_PACE set, it should be re-read with the offence's loaded-start rule, as Integration ordered.
4. **TE and back.**
   - TE in-line and flexed are now 0.1-0.2 yd/s over at 0.5 s and level at 1.0 s; in-line is level later.
   - The back is too fast at 0.5 s in every arm (1.7-1.9 vs 1.1) and starts earlier than the NFL's (0.4-0.5 s vs
     0.6 s). That is the protection scan: the NFL back checks his blitz responsibility before he releases. Ours, on a
     free release, leaves at 0.1 s, and a check-release only when the box count needs him (PRO_CALL).
   - The flexed TE's flat is far over (NFL 1.0 / 2.6 at 0.5 / 1.0 s; ours 1.5-1.8 / 3.3-3.6). NFL TE flats are often
     a chip or a delayed release.
   - Both are taught causes (a scan, a chip), not a share. They need the protection owner, and are outside this
     flag. Proposed next: a back on a dropback whose protection gives him a responsibility checks it (looks at his
     key) before he releases. How often an NFL back is on one is not sourced (L).

## Decision

- **RELEASE_PACE** (built, off): every route gets off with the go's share. The depth term is gone. The defender and
  route-running terms stay.
- The share itself stays; LINE_START's FLAGS row explains why. With no share at all, the body leaves the line far
  faster than NFL receivers do: the earlier, discarded arm ran 2.9 yd/s at 0.5 s against 1.6.
- **Not built:** STEM_PACE (no effect). Next items:
  - the hitch's settle;
  - DIR_START re-read on top of this;
  - the back's protection scan and the TE chip (protection owner).

Test: `test/release-pace.test.ts`. Registered off in config/baseline.json, config/reference-stack.json and
docs/FLAGS.md.
