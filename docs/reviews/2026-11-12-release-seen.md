# RELEASE_SEEN, and where receivers stall at the line

C14 release, 2026-11-12, engine-42 (develop 97337d57). Flag `RELEASE_SEEN`, off.

## The repair

`RouteRunner.handleRelease` released a receiver around a defender only when the defence's call named that defender
his press-man corner (`defAlign.spots[d.slot].press && manTarget === a.slot`). That is a private assignment the
receiver cannot know.

With RELEASE_SEEN he releases around any defender he saw tight over him at the snap: within 2.5 yd ahead and 1.5 yd
either side, as he saw them. He uses that defender's seen position. The release side (route side against the seen shade) and how cleanly he clears (cut skill by release rating) are the existing PRESS_RELEASE technique. The corner's own jam still reads the corner's own assignment.

Test `test/release-seen.test.ts`:

- A slot with an edge rusher tight over him releases around him only when on.
- The press-man release keeps its technique, within 0.5 yd.

Press fixture (`scripts/diag/risk/press-release.ts`, 192 pairs per route; off → on), the corner now taken at his seen, slightly delayed position:

| route | level with the corner | depth at 3.0 s |
|---|---|---|
| go | 2.05 → 2.10 s | 13.8 → 13.5 |
| slant | unchanged | unchanged |

## Games (sim-export seed 11, 8 games per arm, off → on)

**`press_stall.py`** (NFL BDB 2025 weeks 1–3 alongside):

| | NFL | off | on |
|---|---|---|---|
| receivers with a defender within 2.5 yd at the snap, stalled | 3% | 10% | 7% |
| stall frames p50 | 0.1 s | 0.3 s | 0.1 s |
| with a lineman nearest, stalled | 5% | 31% | 12% |
| others, stalled | 3% | 4% | 6% |
| release at 0.5 s (lateral / depth / speed) | 0.10 / 0.20 / 1.5 | 0.10 / 0.30 / 1.5 | 0.10 / 0.30 / 1.5 |

**`tight_release.py`**, off-ball tight receivers (wing, H-back, tight slot):

| | NFL | off | on |
|---|---|---|---|
| stalled | 5% | 21% | 13% |
| touching | 4% | 32% | 24% |
| lineman nearest: stalled | 20% | 32% | 17% |
| lineman nearest: touching | 15% | 49% | 38% |

In-line TEs: unchanged (stalled 4 → 5%, NFL 15%).

**`press_jam.py`:**

- Contact in 1.0 s: 24 → 19% (NFL 10%).
- Level with the corner p50: 1.3 s both (wide 1.8 s both); level by 3 s rises 70 → 76% (wide 57 → 65%).

**`lane.py`** (all depths):

- Bodies touching: 13 → 15%.
- Releases across the defender: 18 → 23%.
- Around: 21 → 22%.

**Pressed time to 5 yd (`start.py` press rows, off → on, NFL in brackets):**

| route | off → on | NFL |
|---|---|---|
| go | 1.7 → 1.8 s | 1.9 |
| post / corner / in / out / hitch / slant | unchanged | |
| cross | 2.2 → 2.1 s | |
| flat | 3.6 s both; depth at 1.5 s 1.2 → 1.7 | 0.7 |

Speeds at 0.5 / 0.8 / 1.0 s within 0.2 on every press row.

**What moved and why:** the receivers who now release around a defender they saw are mostly tight slots and wings with a DE over them. Their stalls halve and the time stuck shrinks. Hitch to 10 yd drops 5.1 → 4.0 s, a hitch that never gets deep anyway; small n.

The release now passes closer to the defender (across 18 → 23%, lane touching 13 → 15%). He gets past him rather than being stopped by him. "Others stalled" 4 → 6% is within noise at this n (about 290 pairs).

A smaller in-game probe (`edge-stall.ts`, seed 23, 6 games, pass-rusher pairs only, true positions) showed no change (25% both). It was the first reading. It is kept for the cause columns, not the rate.

A second attempt was tried and reverted: carrying the rusher forward on his seen motion (stalls 25 → 31%, touches 40 → 31% on that probe).

## The re-diagnosis: alignment, not release technique

`scripts/diag/pass-operators/tight_release.py` uses the same code on NFL (BDB 2025 weeks 1–3) and sim (seeds 11/23).

**Population:** WR or TE, whatever the listed position, within 2 yd outside the outermost OL. "On the ball" means within 0.6 yd of the OL's depth.

| | NFL | sim |
|---|---|---|
| in-line (on the ball): stalled | 15% | 4–5% |
| in-line, lineman nearest: stalled | 20% | 10–13% |
| off the ball: defender within 2.5 yd / a lineman | 24% / 15% | 71–72% / 43–45% |
| off the ball: touching / stalled | 4% / 5% | 32–36% / 21–23% |
| off the ball, lineman nearest: touching / stalled | 15% / 20% | 49–53% / 32% |
| whole population stalled | about 7.7% | about 13.7% |

**In-line tight ends:** not an item. Ours stall less than the NFL's.

**Off-ball group (wing, H-back, tight slot):** the gap is mostly frequency. A DE is within 2.5 yd of ours three times as often. The routing columns:

| off the ball | NFL | sim |
|---|---|---|
| his depth off the line, all | 1.4 (1.0–1.9) | 0.7–1.0 (0.7–1.0) |
| his depth, lineman nearest | 0.8 (0.7–1.0) | 0.7 |
| his depth, no lineman nearest | 1.6 (1.2–2.0) | 1.0 (0.7–1.6/1.7) |
| his split from the tackle | 1.6 | 1.5 |
| widest DL vs the tackle, all (+ = outside) | +0.6 (−0.7 / +2.3) | +1.5 to +1.9 (−0.8 to −1.0 / +2.4 to +2.6) |
| widest DL vs the tackle, lineman nearest | +1.6 (+1.1 / +2.6) | +2.2 to +2.3 (+1.7 to +1.8 / +2.8) |

Values are p50 with p25–p75 in brackets.

Both alignments contribute:

- **Wing spot:** our off-ball wings and H-backs sit about 0.7 yd shallower (0.7 vs 1.4 yd). In the NFL the shallow ones are the ones with a DE on them. Routed to Rules+Coaching's formation queue.
- **DE width:** our widest DL sits about 1 yd wider of the tackle (+1.5 to +1.9 vs +0.6), over the wing rather than inside him. Routed to Defense's front.

The split from the tackle matches.

**Release residual (small, Coverage, after the alignment is fixed):** with a DE over him, our off-ball receiver touches about 50% vs 15% and stalls 32% vs 20% (flag off). With RELEASE_SEEN it is 38% and 17%, so touching remains the residual.

## Operators added

| script | measures |
|---|---|
| `scripts/diag/pass-operators/press_stall.py` | the stall; release at 0.5 s; lineman split |
| `scripts/diag/pass-operators/align_dl.py` | WR split bands vs the nearest lineman |
| `scripts/diag/pass-operators/edge_release.py` | WR next to a lineman: motion, side, touch, stall |
| `scripts/diag/pass-operators/tight_release.py` | tight-aligned receivers by alignment, with the routing columns |
| `scripts/diag/risk/press-stall-games.ts` | in-game stall cause by defender role |
| `scripts/diag/risk/edge-stall.ts` | edge-adjacent pairs and the release-around |
| `scripts/diag/risk/press-release.ts` | the press-man fixture |
