# Directional speed cap against NFL shoulder-angle rows: operator check and proposal

Question (Integration, from Coverage's `nfl_open_run.py`): `directionalSpeedFactor` caps a receiver whose shoulders are turned 90–135° off his path at 0.52–0.54 of top speed; the NFL p95 is 0.7–0.8. Is the operator trustworthy, and what is the simplest coherent fix? No engine change here. Scripts: `scripts/diag/open-run/` (`flip_check.py`, `profiles.ts`, `open_run_check.py`). BDB 2025 weeks 1–3, drop-backs, snap to the pass's arrival.

## 1. The operator

- It reproduces. On week 1 the rows match Coverage's to two decimals (WR 0.93/1.00, 0.81/0.93, 0.75/0.90, 0.71/0.89 at 75–135°).
- By eye, 12 WR frames at 105–135° (s ≥ 6, steady) and 12 CB frames at 75–105° (s ≥ 5, steady): all 24 are smooth tracks with shoulders held 100–130° (WR) or about 90° (CB) off the path for two seconds or more at 5–8.7 yd/s. They are open-hip crossing runs looking back at the QB and zone-DB side-on shuffles, not sensor flips. (Plots: `out/open-run/wr105-135.png`, `cb75-105.png`, ignored.)
- Sensor flips are real, though, and they are in the high-angle bins. `o` points the wrong way (more than 120° from the expected stance, offense downfield, defense toward the offense) on 2.4% of WR player-plays, 2.3% TE, 1.3% RB, 1.9% CB and 5.8% S, weeks 1–3. Of WR frames at 150–180° and s ≥ 5, 72% come from flagged player-plays (a flipped 30° run looks like 150°). Of WR frames at 105–135° the share is 17%; for CB 75–105° it is 2%.
- Without the flagged player-plays, WR p95 at 135–150 / 150–165 / 165–180° is 0.60 / 0.54 / 0.53 of own p99, not 0.80 / 0.78 / 0.84. That is the backpedal's 0.55, which the cap already has. The 90–135° rows barely move (WR 0.81 / 0.74 / 0.66 p95, 0.93 / 0.89 / 0.84 p99). So the finding holds for 75–135°, and not above.
- Caveats that stay: `o` is the shoulder pads, not the hips, so hips are never observed here; p99 of a player's own frames from the snap to the arrival is a generous bound; the table is a p95 or p99 envelope, not what a typical turned run does (the medians in the 105–135° bins are 1.7–2.2 yd/s, mostly turning and decelerating frames).

## 2. The cap in yd/s, not shares

Shares are of each player's own p99 (WR 8.7, CB 8.3 yd/s), while the sim's `vmax` is 9.8–9.9, so a share compares different denominators. In yd/s, median sim profiles by group (`profiles.ts`), cap against NFL p95 / p99, cleaned:

| Shoulder angle | WR cap | WR p95 / p99 | CB cap | CB p95 / p99 |
|---|---|---|---|---|
| 68° | 7.2 | 8.4 / 9.2 | 7.8 | 6.7 / 7.9 |
| 82° | 6.0 | 8.0 / 9.0 | 6.8 | 6.2 / 7.2 |
| 98° | 5.2 | 7.2 / 8.4 | 6.2 | 5.6 / 6.6 |
| 112° | 5.2 | 6.5 / 7.9 | 5.9 | 5.1 / 6.1 |
| 128° | 5.2 | 5.9 / 7.3 | 5.7 | 4.7 / 5.8 |
| 142° | 5.2 | 5.4 / 7.0 | 5.5 | 4.4 / 5.4 |
| 172° | 5.2 | 4.7 / 6.3 | 5.0 | 4.3 / 5.2 |

- WR, TE and RB are too slow by 1.8–3.0 yd/s against p99 at 70–130° (TE and RB the same shape). The default `MOVEMENT_TECHNIQUE` entry (shuffle 0.52) is all they have; there is no WR/TE/RB entry.
- CB and S are not too slow in absolute speed: the cap sits between NFL p95 and p99 at every angle, and at 82–98° it is 0.4–0.6 yd/s under p99 (6.8 vs 7.2, 6.2 vs 6.6). The "0.62 against 0.75" reading comes from the denominator.

## 3. Implied trunk twist

If the cap read hips and the shoulders could twist off the hips by T, the existing cap shape fits the NFL p95 envelope with T of about 52 / 54 / 58° at 98 / 112 / 128° for WR (TE 52 / 54 / 60, RB 70 / 68 / 68). CB and S need T of 0–14° (S 24–26 at 112–142). So a receiver's shoulders turn a lot with the hips on the path; a DB's technique turns his hips with his shoulders. A constant T of 55–60° reproduces WR ratios to within about 0.05 at 98–128° and runs a little low (0.05–0.1) above 140°.

## 4. Proposal

Candidate (a), minimal: keep `facing` as the gait (hips) heading everywhere it already is, and add a bounded, rate-limited trunk twist (`trunk`, shoulders minus hips, |trunk| ≤ T ≈ 55–60°). The cap keeps reading hips. A request to look or open the shoulders (a receiver turning to the ball, a carrier opening up) asks for `trunk`; a technique request for hips (coverage open / square / turn-and-run in `coverage/orientation.ts`, a blocker's hips) is unchanged. A request beyond T has to turn the hips, and the cap bites there as it does now. No new table by position: WR and CB differ by what they ask for.

Cannot represent: hips are not observed, so T is inferred from the envelope and cannot be checked from tracking (film would have to); twist has no cost of its own (the 0.88 at 98° and 0.80 at 112° are the share lost to something, and a smaller T would read it as hips); every consumer that reads shoulders for contact, catch, throw sight or interference legality would have to be mapped, since `.facing` appears 185 times in `src`; head and gaze are separate already (HEAD).

Candidate (b), cheaper: keep one `facing` and add the missing receiver technique row (WR/TE/RB `shuffle` about 0.88–0.90, `backpedal` about 0.55–0.58) so the same cap shape fits their NFL p95 envelope (ratios 0.88 / 0.80 / 0.73 / 0.66 / 0.60 / 0.58 at 98 / 112 / 128 / 142 / 158 / 172°; the existing shape gives 0.90 / 0.82 / 0.76 / 0.70 / 0.64 / 0.59). No new state, one table entry, DB and S untouched. Cannot represent: a receiver who really shuffles hips-square sideways is a different body and a slower one, but under (b) he gets 0.9 as well; and any other position that twists the trunk (a QB, an LB looking back) would need its own row.

Recommendation: (a). (b) is correct as an envelope but says nothing about why, and it prices a real hips-open shuffle as a twisted run. If (a) turns out larger than the evidence supports, (b) is the fallback, and it is a one-line change.

## 5. Witnesses, stated before any read

1. Lone-body table: cap in yd/s by shoulder angle for WR / TE / RB / CB / S against the cleaned NFL p95–p99 band; WR, TE and RB inside the band (or within 0.5 yd/s of it) over 75–140°; CB and S unchanged to 0.05 yd/s.
2. The same rows re-measured on sim output by Coverage's operator (sim side), with flagged player-plays excluded from the NFL rows: WR 90–135° p95 share within 0.05 of the NFL; CB 75–105° within 0.05.
3. DB trail and break speeds unchanged to 0.1 yd/s (their requests do not change).
4. The deep receiver's arrival speed: 6.7 now, NFL 6.7; the NFL's turned receivers slow 7.5 to 6.4. If a looser cap erases the slowing, say so: it came from the cap and not from the receiver, and the cost of turning has to come from the receiver's own decision instead.
5. Dither budget (`test/dither-budget.test.ts`): no added reversal rate. The trunk is a smooth bounded follower of its request.
6. Fresh run set and falls: byte-identical for any play where no body asks for a trunk request; falls and the run-game card unchanged where they do.
7. Before anything is built: a consumer map of the 185 `.facing` readers by meaning (hips / shoulders / gaze), so no reader changes meaning silently.

Staging after the map: lone-body table (analytic here, then the real `locomotionAccel`), staged pairs (WR against a trailing DB, deep go with a look-back), then games. Not run: the sim-side rows (Coverage), the pairs, games.

## 6. Lone-body table for (a) (Stage 1 read, step 1)

`scripts/diag/open-run/trunk-bench.ts`: the real `stepBody` (locomotionAccel plus the traction clamp), energy 0.85, a full-speed request along the path from 6 yd/s held 5 s, with the hips set to `max(0, shoulder angle - T)`. NFL band: p95 and p99 of speed by shoulder-angle bin, BDB 2025 weeks 1-3 with flipped player-plays removed (`out/open-run/nfl-band.json`). "Within the band" = within 0.5 yd/s of [p95, p99].

WR, speed (yd/s) by shoulder angle off the path:

| Angle | NFL p95 / p99 | Current | T 45 | T 55 | T 65 |
|---|---|---|---|---|---|
| 83° | 8.0 / 9.0 | 5.9 | 8.9 | 9.2 | 9.5 |
| 98° | 7.2 / 8.4 | 5.2 | 8.2 | 8.7 | 9.1 (out) |
| 113° | 6.5 / 7.9 | 5.2 | 7.2 | 7.9 | 8.4 (out) |
| 128° | 5.9 / 7.3 | 5.2 | 5.9 | 6.8 | 7.5 |
| 143° | 5.4 / 7.0 | 5.2 | 5.2 | 5.4 | 6.4 |
| 158-173° | 4.7-4.9 / 6.3-6.8 | 5.1 | 5.2 | 5.2 | 5.2 |

The sim's top speed is above the NFL's in these frames (forward cap 9.6 against an NFL forward p95 of 8.1), so the band test is generous. Comparing ratios to the forward run removes that: RMS error of cap(theta)/cap(forward) against the NFL p95 ratio over 90-135°:

| Group | Current | T 45 | T 55 | T 65 |
|---|---|---|---|---|
| WR | 0.275 | 0.076 | **0.017** | 0.063 |
| TE | 0.285 | 0.087 | **0.025** | 0.059 |
| RB | 0.358 | 0.158 | 0.083 | **0.021** |
| CB | **0.024** | 0.186 | 0.240 | 0.286 |
| S | **0.034** | 0.159 | 0.213 | 0.259 |

T = 55° is the minimum for WR and TE, with error rising to 0.06-0.08 at 45 and 65 (the sensitivity read). RBs fit a larger twist (65-70°). CB and S are best with no twist, and they ask for none in Stage 1 (their hips techniques are unchanged), so the cap on a DB stays what it is. In absolute speed the sim's receivers still run 0.2-1 yd/s above the NFL p95 at 98-113° (the sim's top speed is higher than the NFL's in-play top speed; that is a separate calibration, not the twist).

Rate: 360°/s, a stated choice. Only transients depend on it (a 55° look takes 0.15 s); the table does not.

Neck on top: `GAZE_NECK` on develop is ±90° of the facing, now of the shoulders, so with T 55 the head reaches 145° off the hips. Coverage's HEAD narrowing at speed (90 to 45°, #720) gives 55 + 45 = 100° off the path for a receiver whose hips run straight; a look directly behind him (180°) needs the hips to turn about 80°, which the cap prices. That is about what a receiver looking over his shoulder at speed does (shoulders 100-130° off the path at p95).
