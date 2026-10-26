# Known problems

The long list of what we know is wrong, missing or unproven in the engine,
with the evidence behind each item. [GAPS.md](GAPS.md) is the short ranked list
we work from. This file is the reference behind it: when a gap is picked,
start here for what's already known, what was tried and what's still open.

First drafted on 2026-10-22 from the issue register (`docs/ISSUES.md`), the
Oct 8 engine review (`docs/archive/reviews/2026-10-08-engine-review.md`), the
Oct 22 audit, the diagnostics in #191 and the write-ups in #190, #192, #193,
#194, #196 and #198. The outside audit of 2026-10-23 (two parts, on develop
`c4a03f6`) added ACT-1, TKL-5, COV-7, BALL-2, PERF-3 to PERF-6, RAT-3 and
CALL-4, and corrected TKL-4 and COV-6. Add to it whenever something new is
found, and mark an entry resolved instead of deleting it.

## How to read an entry

- **Symptom:** what looks wrong, in football terms.
- **Measure:** sim against NFL, with where it was measured (see the next list).
  A number is a place to look, not a target.
- **Cause:** what we know. Each one is labeled:
  - *confirmed:* reproduced, with the code path named;
  - *likely:* strong evidence, not isolated;
  - *hypothesis:* a plausible explanation, not yet tested.
- **Tried:** fixes attempted, including ones rejected or withdrawn, and why.
- **Where:** files, flags, PRs.
- **Open:** the next question to answer.

Many problems interact. A defender who closes late on a catch also misses
the tackle, and the run game's explosive tail depends on the deep defenders as
much as on the line. Entries cross-reference each other where that matters.

### Where numbers come from

| Tag | Meaning |
| --- | --- |
| `dev` | `develop` with default flags. `dev-24` is `scripts/calibrate.ts`, 24 games at `d91c9014`, 2026-10-22. `dev-12` is `npm run scorecard -- --tier pr`, 12 games, seed 7. |
| `prof190` | #190's line set on develop (PAD_LEVERAGE, DL_ANCHOR, DL_FLATTEN, SNAP_REACT), 8 games, seeds 101–108. |
| `prof194` | #194's candidate profile (13 flags in `config/baseline.json`), 8 games. |
| `rg3` | The run-offense research build on `claude/run-game-v3` (archived; #153 is closed). Its numbers don't certify develop. |
| `audit` | The outside audit (2026-10-23) on develop [c4a03f6](https://github.com/tannerthardy/football-simulation-/commit/c4a03f6463eacb23ce63d01bd32b4f8b547b9bc0): one seed-7 game (Ironmen v Comets, strength .55, 127 live plays), each play restaged exactly from its saved setup and changed one thing at a time. Its counts support selected-case diagnoses, not league frequency or a shared cause for every similar-looking play. Play IDs are that game's; its `G1-P002` is a Comebacks pass, not TKL-4's older P002 clip. |
| `NFL` | Mostly Big Data Bowl 2025 tracking (2022, weeks 1–9). The outcome bands are the scorecard's. |

### Current: develop at `211db9cc`

`npm run scorecard -- --tier pr` at seeds 7 and 8 (12 games each), 2026-10-25,
after #248–#271. #251, #252, #258 and #267 change games, so these are new games,
not a replay of the ones below. Seed 7 / seed 8:

| Metric | Seed 7 | Seed 8 | NFL |
| --- | --- | --- | --- |
| Points / team-game | 34.7 | 36.6 | 21–23.5 (unsourced) |
| Total yards / team-game | 434 | 456 | 320–345 (unsourced) |
| Pass rate | 63.5% | 68.7% | 54.4–66.3% |
| Yards / attempt | 9.57 | 9.80 | 6.35–7.89 |
| Sack rate | 7.5% | 8.2% | 4.6–9.4% |
| INT rate | 3.9% | 4.4% | 1.5–3.2% |
| YAC / reception | 8.03 | 7.83 | 4.53–5.91 |
| Rush yards / carry | 5.59 | 5.60 | 3.70–4.83 |
| 10+ yd runs | 13.8% | 14.5% | 7.6–12.9% |
| Runs of 20+ that reach 40 | 61.5% | 73.1% | 25–35% (unsourced) |
| Missed + broken tackles / play | 0.26 | 0.26 | 0.11–0.16 (unsourced) |
| 3rd-down conversion | 32.0% | 33.6% | 37–41% (unsourced) |
| Accepted penalties / team-game | 3.96 | 3.67 | 4.77–6.53 (nflverse 2022) |

YAC per catch rose from 6.87 / 7.19 to 8.03 / 7.83, and seed 7's old value
sits below its new 90% interval (7.13–8.83). **No engine change in the window
raises YAC; the move is sampling between two sets of diverged games** (Defense
diagnosis, 2026-10-25, `scripts/diag/yac/`):

- **Matched pass plays.** 2,154 scrimmage pass setups were captured from 24
  ordinary games at `211db9cc` and replayed unchanged at `ccdb69cb`, at
  `211db9cc` and at each engine merge between them (#250, #252, #251, #254,
  #259, #258, #267, #271).
  - Completions are identical (no flips).
  - Separation at the catch (3.36 yd), catch depth (8.18 yd), catch to first
    contact (0.90 s) and first-contact tackles (87%) are unchanged.
  - YAC per catch goes 7.75 → 7.61 (paired −0.14, SE 0.10).
  - Six of the eight merges leave every pass play's metrics identical; #258
    changes one play's row (completion and YAC unchanged). Only #267 changes
    pass plays: 453 of them, with changed catches split 163 up / 181 down.
- **Whole games.** 24 games per arm, same seeds, at both endpoints: YAC
  7.62 (90% 6.97–8.32) vs 7.74 (7.00–8.49). Defender energy at the snap, a
  path matched setups can't see, is unchanged (median 0.966 both).
- **Scale of chance.** An independent 12-game sample's YAC varies by about
  0.6 yd (one game ranges 3.7–12.6), because long catch-and-runs dominate the
  mean. The scorecard's two snapshots are independent samples once games
  diverge: seed 7 moved 1.16, seed 8 0.64, both seeds 0.90, about 1.5 SD of
  the difference. Reading an old point against the new sample's interval
  ignores the old sample's own spread.
- **Strongest adverse case** (#267, setup `10:0:124`, Gun Trips Slant-Flat vs
  Cover 1). YAC 35.1 → 65.3, a touchdown instead of an FS tackle at 6.65 s.
  The first changed command is the FS's pursuit, 0.2 s after the catch (frame
  2.95 s, facing 4.20 → 4.21). It's a small pursuit difference compounding
  over a long chase, as common in the other direction (largest: −44.0).

Not a bug, and no separation change for Coverage. G3's YAC excess (about 7.7
vs NFL 4.5–5.9) is the standing level, not a new regression.

### Earlier: develop at `ccdb69cb`

`npm run scorecard -- --tier pr` at seeds 7 and 8 (12 games each), 2026-10-23,
after the film-review fixes (#235–#245). Seed 7 / seed 8, with the scorecard's
sourced NFL team-season range where one exists:

| Metric | Seed 7 | Seed 8 | NFL |
| --- | --- | --- | --- |
| Points / team-game | 33.4 | 33.0 | 21–23.5 (unsourced) |
| Total yards / team-game | 435 | 404 | 320–345 (unsourced) |
| Pass rate | 65.9% | 68.6% | 54.4–66.3% |
| Yards / attempt | 9.16 | 9.07 | 6.35–7.89 |
| Sack rate | 6.4% | 8.6% | 4.6–9.4% |
| INT rate | 4.3% | 5.0% | 1.5–3.2% |
| YAC / reception | 6.87 | 7.19 | 4.53–5.91 |
| Rush yards / carry | 5.93 | 5.17 | 3.70–4.83 |
| 10+ yd runs | 14.8% | 12.0% | 7.6–12.9% |
| Runs of 20+ that reach 40 | 61.5% | 69.6% | 25–35% (unsourced) |
| Missed + broken tackles / play | 0.29 | 0.27 | 0.11–0.16 (unsourced) |
| 3rd-down conversion | 33.8% | 28.6% | 37–41% (unsourced) |
| Accepted penalties / team-game | 4.63 | 4.21 | 4.77–6.53 (nflverse 2022) |

### Earlier: develop at `57f50fc3`

`npm run scorecard -- --tier pr` at seeds 7 and 8 (24 games, default flags),
2026-10-22, after the flag promotion (#210), the rule fixes (#211) and
Defense's pursuit fixes (#205). One 12-game seed can swing points by 10 a game
when games diverge early, so read single-seed moves with care. Compare against
a base arm in the same run.

| Metric | Sim | 90% range | NFL band | vs band |
| --- | --- | --- | --- | --- |
| Points / team-game | 38.17 | 34.88 to 41.50 | 21–23.5 | HIGH |
| Scrimmage plays / team-game | 61.58 | 60.27 to 62.85 | 61–65 | OK |
| Total yards / team-game | 453.52 | 418.72 to 485.55 | 320–345 | HIGH |
| Pass rate (dropbacks / plays) | 67.9% | 66.5% to 69.6% | 56–62% | HIGH |
| Completion % | 64.8% | 63.1% to 66.5% | 63–66% | OK |
| Yards / attempt | 10.70 | 10.09 to 11.41 | 6.8–7.2 | HIGH |
| Sack rate (per dropback) | 10.8% | 9.6% to 11.9% | 6–7.5% | HIGH |
| INT rate | 5.0% | 4.3% to 5.7% | 2–2.5% | HIGH |
| Pass TD rate | 8.9% | 7.9% to 9.9% | 4–4.8% | HIGH |
| 20+ yd completions / att | 16.6% | 15.4% to 18.0% | 7–9% | HIGH |
| aDOT | 9.19 | 8.87 to 9.49 | 7.5–8.5 | HIGH |
| YAC / reception | 8.77 | 8.06 to 9.59 | 4.8–5.6 | HIGH |
| Time to throw (s) | 2.50 | 2.48 to 2.53 | 2.7–2.9 | LOW |
| Scramble rate | 7.5% | 6.1% to 8.8% | 3–5% | HIGH |
| Separation at catch point (yd) | 3.41 | 3.32 to 3.51 | 2.8–3.2 (NGS 2022–24) | HIGH |
| Rush yards / carry | 6.51 | 5.47 to 7.53 | 4.1–4.5 | HIGH |
| Run stuff rate (<=0) | 23.4% | 21.0% to 26.1% | 16–20% | HIGH |
| 10+ yd runs | 15.9% | 13.7% to 18.4% | 10–12% | HIGH |
| Runs of 20+ that reach 40 | 66.7% | 56.4% to 75.5% | 25–35% (PR #190, BDB 2022) | HIGH |
| Yards before contact (runs) | 1.07 | 0.78 to 1.38 | 1.5–2.3 | LOW |
| Missed + broken tackles / play | 0.34 | 0.31 to 0.36 | 0.11–0.16 (source unverified: PFF, definition unknown) | HIGH |
| Failed tackle opportunities / play (unique defenders) | 0.22 | 0.20 to 0.23 | internal |  |
| 3rd-down conversion | 30.8% | 27.6% to 34.0% | 37–41% | LOW |
| FG % | 89.6% | 82.9% to 95.0% | 83–87% | HIGH |
| XP % | 95.5% | 93.0% to 97.7% | 94–97% | OK |
| Fumbles lost / team-game | 0.52 | 0.35 to 0.71 | 0.4–0.7 | OK |
| Punts / team-game | 5.98 | 5.54 to 6.42 | 3.5–4.5 | HIGH |
| Penalties / team-game | 7.10 | 6.27 to 7.88 | 2.5–4 | HIGH |

### After the flag promotion

On 2026-10-22, 31 realistic flags were turned on by default in five groups
(line play, pre-snap alignment, ball and run defense, motion, pressure). The
same `pr` tier against develop `5a52dae3`:

- points 50.6 → 37.8 and total yards 607 → 461 per team-game;
- rush yards per carry 10.5 → 7.8, stuffs 15.7% → 21.5%;
- sacks 5.1% → 11.4% of dropbacks, now above the NFL's 6–7.5% (see PRO-1);
- interceptions 9.0% → 6.0%;
- aDOT 10.0 → 9.2, time to throw 2.60 → 2.49 s;
- 3rd-down conversion 40% → 31%;
- missed and broken tackles and penalties did not move.

The per-group runs are in the promotion PR.

### Baseline: develop at `3f26d694`

Historical measured reference, not the current trunk or a new baseline designation.
See [GAPS](GAPS.md) for the ranked problems; current checkpoint scope and readiness are recorded in the relevant PRs.

`npm run scorecard -- --tier pr` (12 games, 2 leagues, seed 7), default flags,
2026-10-22. It takes about 4 minutes on 4 cores. The splits behind it are in
the scorecard's output (`--md`).

| Metric | Sim | 90% range | NFL band | vs band |
| --- | --- | --- | --- | --- |
| Points / team-game | 51.08 | 44.67 to 57.25 | 21–23.5 | HIGH |
| Scrimmage plays / team-game | 63.88 | 61.08 to 66.83 | 61–65 | OK |
| Total yards / team-game | 613.88 | 558.86 to 664.07 | 320–345 | HIGH |
| Pass rate (dropbacks / plays) | 61.5% | 57.3% to 65.0% | 56–62% | OK |
| Completion % | 62.6% | 59.9% to 65.7% | 63–66% | LOW |
| Yards / attempt | 10.22 | 9.57 to 10.94 | 6.8–7.2 | HIGH |
| Sack rate (per dropback) | 5.6% | 3.3% to 8.3% | 6–7.5% | LOW |
| INT rate | 5.1% | 3.9% to 6.1% | 2–2.5% | HIGH |
| Pass TD rate | 7.7% | 6.5% to 9.2% | 4–4.8% | HIGH |
| 20+ yd completions / att | 16.1% | 14.4% to 17.7% | 7–9% | HIGH |
| aDOT | 9.78 | 9.21 to 10.37 | 7.5–8.5 | HIGH |
| YAC / reception | 7.71 | 6.91 to 8.74 | 4.8–5.6 | HIGH |
| Time to throw (s) | 2.59 | 2.57 to 2.61 | 2.7–2.9 | LOW |
| Scramble rate | 6.4% | 5.0% to 8.2% | 3–5% | HIGH |
| Separation at catch point (yd) | 3.23 | 3.10 to 3.39 | 2.8–3.2 | HIGH |
| Rush yards / carry | 11.15 | 9.77 to 12.60 | 4.1–4.5 | HIGH |
| Run stuff rate (<=0) | 14.9% | 12.0% to 17.6% | 16–20% | LOW |
| 10+ yd runs | 21.0% | 18.8% to 23.3% | 10–12% | HIGH |
| Runs of 20+ that reach 40 | 73.8% | 67.1% to 80.6% | 25–35% | HIGH |
| Yards before contact (runs) | 1.71 | 1.49 to 1.92 | 1.5–2.3 | OK |
| Missed + broken tackles / play | 0.36 | 0.32 to 0.40 | 0.11–0.16 | HIGH |
| 3rd-down conversion | 38.4% | 33.8% to 44.1% | 37–41% | OK |
| FG % | 94.1% | 88.2% to 100.0% | 83–87% | HIGH |
| XP % | 97.9% | 95.9% to 99.4% | 94–97% | HIGH |
| Fumbles lost / team-game | 0.38 | 0.21 to 0.58 | 0.4–0.7 | LOW |
| Punts / team-game | 4.67 | 4.21 to 5.13 | 3.5–4.5 | HIGH |
| Penalties / team-game | 7.54 | 6.50 to 8.63 | 2.5–4 | HIGH |

Small samples are common. Same-seed arms are identical until the first
changed play and then diverge, so an 8-game comparison is closer to 8 paired
observations than to 1,000 plays (`scripts/diag/arm-power.py`, #191).

## Index

Severity says how much the problem distorts ordinary football: **high**
changes most games, **medium** shows up in specific situations, **low** is
rare or cosmetic. Status: open, in work, flag (a fix exists behind a
default-off flag), on (a fix is on by default but not yet shown to close the
problem), resolved.

| ID | Problem | Gap | Severity | Status |
| --- | --- | --- | --- | --- |
| [OUT-1](#out-1) | Scoring and yardage far above the NFL's | all | high | open |
| [RUN-1](#run-1) | Inside-run creases open wide and don't close | G2 | high | in work |
| [RUN-2](#run-2) | Long runs don't get caught: the deep tail | G2, G1 | high | open |
| [RUN-3](#run-3) | Double teams drive defenders back much too far | G2 | medium | open |
| [RUN-4](#run-4) | Defensive linemen run upfield past reach blocks | G2 | medium | on |
| [RUN-5](#run-5) | Pad level had no effect on a push | G2 | medium | on |
| [RUN-6](#run-6) | Gap-scheme blockers took the wrong defenders | G2 | medium | resolved (#192) |
| [RUN-7](#run-7) | The lead puller misses a Mike stacked inside his path | G2 | medium | open |
| [RUN-8](#run-8) | Center covered on almost every snap | G2 | medium | on |
| [RUN-9](#run-9) | Front and edge alignment unlike tracking | G2 | medium | on |
| [RUN-10](#run-10) | Older run-blocking and second-level issues | G2 | low–medium | open |
| [RUN-11](#run-11) | Staged scenes recorded on arm-force hands or true-velocity mirroring | G2, G5 | low | pinned until review 2 |
| [RUN-12](#run-12) | Run blockers lost on their assignments (film, Oct 23) | G2 | high | in work |
| [TKL-1](#tkl-1) | Too many missed and broken tackles | G1 | high | in work |
| [TKL-2](#tkl-2) | Pursuit angles and speed unlike tracking | G1 | high | in work (#259, #263, #267 landed) |
| [TKL-3](#tkl-3) | Fast receivers break catch tackles twice as often | G1, G3 | medium | open |
| [TKL-4](#tkl-4) | Defenders turn their backs on the ball carrier | G1 | medium | on |
| [TKL-5](#tkl-5) | "Reach" means different things in each tackle branch | G1, G10 | high | in work (#264 needs rework) |
| [PRO-1](#pro-1) | Edge rushers meet the tackle at the line and walk through him | G5 | high | in work (G5, #215) |
| [PRO-2](#pro-2) | Pressure arrives too early and from the wrong places | G5 | high | open |
| [PRO-3](#pro-3) | Interior pairs move as one block | G5 | medium | open |
| [PRO-4](#pro-4) | The QB doesn't slide away from an edge | G5 | medium | open |
| [PRO-5](#pro-5) | No pass protection calls | G9 | high | open |
| [COV-1](#cov-1) | Zone defenders barely close while the ball is in the air | G3 | high | open |
| [COV-2](#cov-2) | Too much yardage per attempt and after the catch | G3 | high | open |
| [COV-3](#cov-3) | Coverage rules and calls not yet complete | G3 | medium | in work (#193) |
| [COV-4](#cov-4) | Defenders react late to jet motion | G3 | low | on |
| [COV-5](#cov-5) | Older coverage contracts that fail or are unproven | G3 | high | open (next for Coverage) |
| [COV-6](#cov-6) | Coverage defenders snap through big turns far too often | G3 | high | on (orientation technique); run-fit and ball-play turns open |
| [COV-7](#cov-7) | A man corner can't support a run he has recognized | G1, G3 | medium | in work (cost fixture #271; pilot #269) |
| [BALL-1](#ball-1) | Too many interceptions | G4 | high | flag (partial) |
| [BALL-2](#ball-2) | Throws always leave from standing height | — | low | open |
| [QB-1](#qb-1) | Throws come out early and deep | G3, G7 | medium | open |
| [QB-2](#qb-2) | Too many scrambles, and completions slightly low | G5, G7 | low | open |
| [QB-3](#qb-3) | Scrambling QBs fall with nobody near them (film, Oct 23) | G1, G5 | medium | open |
| [KICK-1](#kick-1) | Kicking too accurate, too many punts | — | low | open |
| [ALN-1](#aln-1) | Defensive pre-snap picture unlike tracking | G2, G3 | medium | on |
| [ALN-2](#aln-2) | Offensive formations over-compress the box | G2, G7 | medium | open |
| [ALN-3](#aln-3) | Motion men ran into the line and the QB | G6, G7 | high | resolved (#237) |
| [ALN-4](#aln-4) | Long across motions are called but not run | G7 | low | open |
| [RULE-1](#rule-1) | Penalty mix unlike the NFL (was: too many penalties) | G6 | medium | open |
| [RULE-2](#rule-2) | Rule coverage incomplete | G6 | low | open |
| [CALL-1](#call-1) | Play-calling not checked against NFL tendencies | G7 | medium | open |
| [CALL-2](#call-2) | Defensive calls read raw ratings that aren't on one scale | G7 | medium | on |
| [CALL-3](#call-3) | Pressure rate ignored the coverage shell | G7 | low | on |
| [CALL-4](#call-4) | The play-caller reads the roster, not the players on the field | G7 | low–medium | open |
| [INFO-1](#info-1) | Players use information they couldn't have seen | G10 | high | in work (#258 landed; #260 needs rework) |
| [ACT-1](#act-1) | Aims outlive the target they were made for | G10 | medium | on (#251) |
| [PHY-1](#phy-1) | Contact and hand physics limits | F2, G5 | medium | open |
| [PHY-2](#phy-2) | Movement detail that's costly or unproven | F2 | low | open |
| [RAT-1](#rat-1) | Ratings and capability mappings uncalibrated | — | medium | open |
| [RAT-2](#rat-2) | Team habits drawn without within-team scatter | — | low | open |
| [RAT-3](#rat-3) | Ratings with no effect on the field | — | low–medium | open |
| [GAME-1](#game-1) | Game-rule and accounting defects from the Oct 8 review | — | — | resolved |
| [GAME-2](#game-2) | Remaining accounting limits | — | low | open |
| [PERF-1](#perf-1) | Games are slow to simulate | F2 | high | open |
| [PERF-2](#perf-2) | Measurement noise and tooling limits | F1 | medium | open |
| [PERF-3](#perf-3) | The mechanics guard passes on missing data; Python tests not in CI | F1 | medium | resolved (#249, #253) except one comment |
| [PERF-4](#perf-4) | Scorecard labels claim more than they show | F1 | low | resolved (#257) |
| [PERF-5](#perf-5) | Film detectors' precision unknown | F1 | medium | open |
| [PERF-6](#perf-6) | The same lineup in a different order plays a different game | F1 | medium | resolved (#250, #252) |
| [VIEW-1](#view-1) | Reviewing film is hard and can mislead | F1 | medium | open (long-term) |
| [REPO-1](#repo-1) | Repository and process debt | — | medium | open |
| [MISS-1](#miss-1) | Football that isn't modeled yet | G7, G8 | — | open |

---

## Whole game

<a id="out-1"></a>
### OUT-1: Scoring and yardage far above the NFL's

- **Symptom:** games look like video-game shootouts.
- **Measure** (`dev-24`): 50.6 points per team-game, NFL 21–23.5. `dev-12`: 51.1
  points and 614 total yards per team-game (NFL 320–345), and 16.1% of attempts
  gain 20+ yards (7–9%). Yards per carry 9.88 (NFL 4.1–4.6); yards
  per attempt 10.1 (6.8–7.4); YAC per catch 8.4 (4.8–5.6). `dev-12` gives 11.15
  yards per carry and 21% of runs going 10+.
- **Cause:** *likely* the sum of RUN-1, RUN-2, TKL-1, COV-1 and COV-2: defenders
  arrive late and don't finish. The main branch (Oct 8, before the physics
  work) had the opposite problem: 2.95 yards per carry and 39% stuffs.
- **Open:** re-measure after each G1–G3 fix. Don't tune toward the total; it
  follows the mechanisms.

## Run game

<a id="run-1"></a>
### RUN-1: Inside-run creases open wide and don't close

- **Symptom:** inside zone and duo hit big lanes, and the lane stays open.
- **Measure** (#191, `rg3` profile): the defender opening at the line is
  3.0–4.6 yd (NFL 2.3–2.9), and it doesn't narrow. NFL creases narrow by
  0.5–0.9 yd in the last second before the back arrives.
- **Cause:** *likely* two parts. The squeeze, meaning defenders don't close
  down on the crease (run defense), and the blocker's frame (run blocking).
  `DL_SQUEEZE` (#190) addresses a held-decision piece.
- **By concept** (`dev-12`, 60–99 carries each): inside zone 15.3 yd per
  carry with 4% stuffs, duo 12.5 with 0% stuffs, power 10.5, trap 8.0. The
  inside runs that should be the hardest yards are the most explosive.
- **Where:** `src/sim/run-fits.ts`, `src/sim/engagement.ts`;
  `scripts/diag/run-hole.py`.
- **Open:** which defender's fit fails first: line, second level or alley.

<a id="run-2"></a>
### RUN-2: Long runs don't get caught: the deep tail

- **Symptom:** a run that breaks 20 yards usually goes 40 or more.
- **Measure:** runs past 20 that reach 40 are 67–90% depending on the build
  (`dev-12` 73.8%), against an NFL 25–35%. In #191 (`rg3`), when the back reaches 10
  yards, the deep defenders are 3.6 yd *behind* him, while NFL deep defenders
  are 3.1 yd ahead.
- **Cause:** *likely* deep support depth and angle, not tackling itself.
  Our safeties fill the alley at linebacker depth to make stops the box
  should make, which leaves nobody deep (#190).
- **Tried:** every deep-cap variant (all defenders, safeties only, corners
  only) raised 10+ yard runs. Diagnosed, not fixed (#190). `DEEP_NO_FORCE`
  (#190, off) keeps deep defenders from taking force.
- **Where:** `run-fits.ts`, `defense.ts`; `scripts/diag/long-run.py`.
- **Open:** whether fixing RUN-1 lets the safeties stay deep on their own.
- **Not grip** (#217, Run Game `taillab.ts`). 32% (`GRIP_HOLD` off) and 38%
  (on) of 40+ runs have no contact past 5 yd. The deep defender reaches the
  runner in 41–42% of them, and breaks are 34–36% either way. The tail is
  about arrivals.

<a id="run-3"></a>
### RUN-3: Double teams drive defenders back much too far

- **Measure** (#190): a duo double at 2.5 s is driven back 0.80 yd; NFL 0.06.
- **Cause:** *likely* physics: two blockers' summed drive beats one
  strength-capped resistance, with no way for the defender to split, sit or
  turn the double. Tracked doubles last as long as ours, so it's the push, not
  the duration.
- **Where:** `src/physics/world.ts`, `engagement.ts`; `climbphase.py` on `rg3`.
- **Open:** whether DL_ANCHOR and PAD_LEVERAGE (RUN-4, RUN-5) are enough, or
  the contact model needs a second-body resistance term. That's a physics
  lane question.

<a id="run-4"></a>
### RUN-4: Defensive linemen run upfield past reach blocks

- **Symptom:** against a reach block, our linemen ran into the backfield and
  opened cutback lanes behind them.
- **Cause:** *confirmed:* the engaged "attack" technique asked for 1.5 yd/s
  upfield whatever the block.
- **Fix** (`DL_FLATTEN`, #190, off): a lineman who sees his blocker move across
  holds the depth where they met. Outside zone at 2.5 s, on `rg3`: single-blocked −1.61 →
  −0.51 yd, doubled −0.87 → −0.33 (NFL −0.62 / −0.59).
- **Open:** on the `rg3` profile it cuts zone losses from 10.2% to 4% (NFL
  9.9%), so it may remove backfield wins real linemen still get.
  `DL_FLATTEN_WON` (off) is the follow-up.

<a id="run-5"></a>
### RUN-5: Pad level had no effect on a push

- **Cause:** *confirmed:* traction was the friction of standing weight
  regardless of contact geometry. A low man against a high man came out
  identical to 0.01 yd.
- **Fix** (`PAD_LEVERAGE`, #190, off): the push runs pad to pad, tilting up into
  the higher man, with traction as Coulomb friction on the resulting normal
  load. A neutral 2-s push, low vs high: +1.95 yd. It's a physics law, so
  making it the default is the physics lane's call.
- **Measure** (`prof190`, with DL_ANCHOR): run mean 8.59 → 6.34 yd, runs 20+
  10.8% → 6.3%.

<a id="run-6"></a>
### RUN-6: Gap-scheme blockers took the wrong defenders

- **Cause:** *confirmed* (#192, audited against written gap rules):
  - on power, combos took the linebackers before the lead puller could;
  - the backside cutoff took the outside man first;
  - the fullback stood idle once every linebacker was claimed;
  - on trap against Under, the playside tackle doubled across the trap.
- **Fix:** #192 (merged), no flag. Default play changes. Yards per carry 11.15 → 9.55
  (`dev-12`, outside noise).
- **Open:**
  - see RUN-7;
  - counter vs Odd, where ≤0-yard runs rise from 5% to 11% because the fullback
    now blocks the backside backer per the written rule. The engine's counter
    is GT (guard kicks, tackle wraps). The old fullback insert matches a
    different play, GF / Counter F. These could be two named concepts, each
    with its own fullback rule;
  - `leadBacker` counts a backer as playside up to 0.5 yd backside of the ball,
    which could misread a shaded front.

<a id="run-7"></a>
### RUN-7: The lead puller misses a Mike stacked inside his path

- **Measure** (#192): on power vs Odd, after the fix, the puller engages his
  Mike in 50 of 150 reps, yet the Mike's tackles rise from 30 to 56.
- **Cause:** *confirmed:* the puller runs to a fixed C-gap landmark and attacks
  only within 1.2 yd, so a Mike stacked inside that path is missed.
- **Open:** the puller should track his target, not a landmark.
  `PULL_EARLY` (#190) is the defense's side of the same play.

<a id="run-8"></a>
### RUN-8: Center covered on almost every snap

- **Measure** (#196): the center is covered on 97% of snaps in Over and 96%
  in Under; tracking has 48% and 51%.
- **Cause:** *confirmed:* the 1 technique sat on the center's shoulder at 0.47
  of the center–guard split. Tracked A-gap players stand at a median 0.69,
  which is mostly a team habit (team medians from 0.30 to 0.82). Our
  offensive line splits are also too narrow: 1.3 yd vs 1.51 tracked.
- **Fix:** `AGAP_ALIGN` (#196, off) takes it to 82/79%. Adding `OL_SPLITS` (#190)
  brings it to 57/54%.
- **Open:** `OL_SPLITS` is develop's line source now: Main Engine chose it
  over `rg3`'s `OL_ALIGN` in the #190 review, and `AGAP_ALIGN` scales by the
  line it sets. `OL_ALIGN` stays parked (see [PARKED.md](PARKED.md)).

<a id="run-9"></a>
### RUN-9: Front and edge alignment unlike tracking

- **Measure** (`FRONT_ALIGN`, #190, 8 games): strong-side edge techniques
  9 / wide 9 / 6 at 43 / 23 / 11%, against NFL 31 / 46 / 13%. Edge outside the
  surface, strong / weak, develop 0.07 / 0.93 yd, with the flag 1.28 / 2.03,
  NFL 1.46 / 2.05.
- **Cause:** *confirmed* on develop: shaded techniques sat mid-gap, and the end
  man didn't set the edge outside the surface.
- **Open:**
  - too many 9s and too few wide 9s;
  - no even or tite front in the nickel mix;
  - double-owned gaps in the installed Under, wide 9 and tite fronts (#194).
    The nickel Under's empty weak C vs a second tight end is fixed
    (`GAP_MATCH`, RUN-12); the doubled weak D (boxing end plus the Will's
    force) remains by design as outside support.
- **After the promotion** (2026-10-22): gap-scheme assignments haven't been
  checked against the aligned fronts (`FRONT_ALIGN`, `BOX_ALIGN`);
  `test/gap-assignment.test.ts` is pinned to the old fronts. This is G2.
  Unpinned, 12 of its 48 cases fail (8 from FRONT_ALIGN, 4 from BOX_ALIGN),
  from two assigner bugs (*confirmed*, Run Game on #210):
  - once the strong safety walks down, a receiver's stalk target becomes a
    front-seven edge defender;
  - trap against Under misclassifies the A-gap 1-technique on one mirror.

<a id="run-10"></a>
### RUN-10: Older run-blocking and second-level issues

Carried over from the issue register; each was measured on an older develop.
- **D01 loaded right tackle** (ISSUES RUN-001) loses useful position by the
  time the runner arrives. Open.
- **Second-level access** (RUN-007): lane and spacing pictures, late Will
  protection. It was the next bounded priority on Oct 16.
- **Tight-end base and dispatch policy** (RUN-003): parked. An intervention
  was adverse.
- **The stalk fit ignores the target's velocity** (RUN-004): parked.
- **Mesh tempo and repeated re-grabs** (RUN-009): research on `rg3`, archived
  with #153.

## Tackling and pursuit

<a id="tkl-1"></a>
### TKL-1: Too many missed and broken tackles

- **Measure:** missed + broken tackles per play: 0.32 (`dev-24`), 0.36
  (`dev-12`); unverified PFF band 0.11–0.16. Runs that break contact are 12.7–19% on the flag
  profiles (#194), NFL 12.5%.
- **Cause:** *partly known* (#205). Too few defenders reach the runner
  (TKL-2), and getting through contact costs the runner nothing (below). The
  approach controller and the grip are not the cause. #191 found that the
  long-run tail (RUN-2) is a deep-support problem, not a missed-tackle one.
- **Where:** `src/sim/tackle.ts`; scorecard probe `missedBy`, split by
  DL, LB, CB and S.
- **Tried:** `BLOCKED_REACH` (#190, off) lets a blocked defender reach for a
  runner passing his free side. Covered/free conversion goes to 13/23% vs NFL
  11/24%. `SHED_PURSUE` (#205, on): blocked defenders work off toward a runner
  past the line. Missed + broken per play 0.37 → 0.33.
- **The counter is not yet comparable to the band** (#205, `scripts/diag/g1/finish.ts`;
  24 games, 3,370 snaps, promoted profile). The band's only source is "PFF":
  no season, numerator or play population. PFF counts several misses per
  play, and a juke with no contact counts. Its rules for a second tackler's
  slipped grip, or a blocked lineman's reach, are not public.

  Raw events per snap:

  | Source | Per snap |
  | --- | --- |
  | **Total raw events** | **0.336** |
  | Grip lost, runner free | 0.109 |
  | Sack attempts (whiffs 0.043, grips lost 0.025) | 0.068 |
  | Whiff reaching off a block | 0.054 |
  | Grip lost while teammates held him (0.030 of them down within 1 s) | 0.039 |
  | Free whiff | 0.038 |
  | Dive | 0.027 |

  Per defender, a failed opportunity (he whiffed or lost his grip and was not the
  tackler) happens 0.200 times per snap, 18% of 1.13 encounters per snap. Plays
  with at least one: 0.153 per snap.

  Against tracking, the meeting itself matches: met→broke 8% vs NFL 9%
  (`meet.py`), and runs that break contact 12.7–19% vs 12.5%.
- **Where failed attempts start** (#205, `scripts/diag/g1/trace.py`; 582 failed
  lunges, reaches, dives and free whiffs; control: 1,072 successful form
  tackles, of which 92% were viable at the attempt).

  **54% were still viable at the attempt.** Two-thirds of those could only
  have caught him with a 1–3 s chase from behind: the runner moves at 0.6 of
  the tackler's top speed and the tackler at 0.49. That makes the arm grab a
  real last chance.

  **40% lost the approach about 0.35 s earlier:**

  | How it was lost | Share of failures |
  | --- | --- |
  | Requested heading about 50° off the intercept | 24% |
  | Requested speed too low on a good line | 10% |
  | Good request the body didn't achieve | 6% |

  In those losses the runner barely turned (7°) but sped up by about 1.35 yd/s
  in 0.65 s. The remaining 6% were blocked, recovering or down (4%), or had no
  history (3%).

  **Lunge holds break 58% and form holds 2%.** These are different encounters,
  so the gap is no evidence of weak grip physics.
- **Replay bounds** (`out/` only). The 92 "lost: heading off" geometries were
  replayed through `chase()` with one runner and no traffic:

  | Replay | Reaches body contact |
  | --- | --- |
  | Current pursuit, runner at constant speed | 57% |
  | Runner bursts at 2 yd/s² | 40% |
  | Best fixed command, chosen with hindsight | 71% (constant), 64% (burst) |

  Three controller variants each stayed within 1 point of the current pursuit:
  no close gather against a faster crossing runner, a gather that leads the
  runner's burst, and keeping the interception run instead of a full gather.
  The successful-tackle controls stayed at 97–98% throughout. **No grip or
  controller change** (decided 2026-10-22).
- **Contact costs the runner nothing.** Run Game's `contactcost.py` on
  `run/G2-backer-flow`, reproduced on #205's exports. These are carriers who
  gain 5+ yd after first contact; speed is a share of their speed before contact:

  | Contact at 0–5 yd | 0.3 s | 0.6 s | 1.0 s | 1.5 s |
  | --- | --- | --- | --- | --- |
  | NFL | 0.94 | 0.88 | 0.77 | 0.67 |
  | Sim | 1.08 | 1.10 | 1.01 | 1.09 |

  Behind the line, the sim reaches 1.47 by 1.0 s (NFL 0.87). This physics
  question goes to Main Engine.
- **The second and third defenders do attempt; their holds don't slow him**
  (#205, `scripts/diag/g1/crowd.ts` and `crowd.py`; 24 games on develop
  `fdd767ab`, 1,037 runs with a first contact).

  Run Game split the contact cost by whether a second defender comes within
  1.5 yd in the 1 s after first contact. About 80% of break-throughs have one
  in both sources. NFL "crowd" runners are at 0.72 of their pre-contact speed
  after 1.0 s; ours are at 0.97–1.08.

  In our break-throughs (5+ yd after contact), the arrivals do attempt: 71%
  wrap, 7% whiff. Of the 21% who don't, most are still blocked. Where 2+
  defenders held him at once, he was still at 0.99 after 1.0 s.

  Holds while the runner is moving at 6+ yd/s:

  | | Break-throughs | Stopped runs |
  | --- | --- | --- |
  | Time held (p50) | 0.4 s | 0.6 s |
  | Grip | 0.45 | 0.84 |
  | Slipping | 79% | 27% |
  | Grip force used / capacity | 0.98 | 0.46 |
  | Drag from the grips | 0.34 BW | 0.45 BW |
  | Runner's own ground force | 0.23 BW | 0.18 BW |
  | Net slowing while held | about 0.1 g | 0.2–0.4 g |

  The accounting closes: measured deceleration matches the runner's ground
  force minus the grip drag. A side or rear holder already asks to keep up
  with the runner (1.02 of his speed along his travel) but is dragged at 0.57.
  Asking him to plant would only add load to a grip that is already saturated.
  So the limit is the weak hold itself: capacity and slip at grip 0.45. The NFL
  crowd takes about 2 yd/s off the runner in 1 s; our break-throughs lose about
  0.45 yd/s. This is physics: Main Engine (Run Game has already sent its
  sliding-grip question).
- **`GRIP_HOLD` (#217, on): the hold, not the controller** (Tools/Physics;
  `crowd.ts`/`crowd.py`, 24 games, seeds 7 and 8, on develop `0671f52`).
  Two defects in `tackle.ts`:
  - Grip followed the arms' current extension and dropped at once when they
    stretched. With the slipping ratchet in `world.ts`, a slip stretched the
    arms, the weaker grip slipped more, and the hold broke. Now a hold keeps
    the grip it acquired; it still slides out while slipping and breaks past
    reach.
  - Below a locked wrap, capacity came from the arm-push mapping, about 0.55
    of the holder's body weight at grip 0.45. A hand hold now holds what two
    hands on a jersey can: Division I dynamometer grip, about half of body
    mass per hand, with 3/4 kept on a slick jersey and a third for a pinch.
    `tackling` stays technique.

  Rulings (in the grasp, forward progress) and the carrier's sense of being
  held read a separate control value that follows the arms, as grip did
  before. Off vs on:

  | | Off | On | NFL |
  | --- | --- | --- | --- |
  | Runs gaining 5+ yd after contact | 155 | 99 | |
  | Clean contact, speed at 0.3 / 0.6 / 1.0 s | 1.03 / 1.12 / 1.17 | 0.98 / 0.94 / 0.98 | about 0.94 / 0.88 |
  | Break-throughs, crowd, at 1.0 s | 0.99 | 0.95 | 0.72 |
  | Break-throughs, 2+ holding, at 1.0 s | 0.91 | 0.81 | |
  | Side/behind holders: braking, grip, slipping, used/capacity | 0.31 BW, 0.46, 79%, 0.98 | 0.41 BW, 0.49, 74%, 0.97 | |

  Break rate by hold origin (6 games): form 2 → 1%, reach 16 → 9%, lunge
  48 → 38%, dive 100 → 91%. A fingertip grab at full stretch on a faster
  runner still breaks. Quick scorecard (paired): failed tackle opportunities
  per play 0.21 → 0.17, missed + broken 0.33 → 0.28, YPC 7.7 → 6.0, 10+ runs
  19.5 → 15.6% (noise in 6 games).

  **Still open:**
  - Side and behind holders are still saturated (0.97) and dragged at 0.64 of
    the runner's speed: they arrive slow (TKL-2), and a hand hold can't make
    up a 2-3 yd/s deficit within the arms' slack. Grip constants are not to be
    tuned toward the crowd band.
  - **Pocket-QB grabs break half as often** (12 → 6%, about 175 holds). The QB
    escapes a grab only through grip physics; a real QB twists and spins out
    of an arm grab. The sack rate's response is not settled: 10.0 → 13.4% per
    dropback before #215; with #215 merged, 5.9% (off) and 7.3% (on), in the
    NFL's 6–7.5%. Logged as a gap under PRO-1: a quarterback can't twist or
    spin out of an arm grab.
  - With #215 merged (quick tier, paired, on vs off): YPC 6.24 vs 9.05,
    10+ runs 15.0 vs 21.5%, missed + broken 0.32 vs 0.38 per play (all
    moved). A wrap pulled out to arm's length now holds as a hand hold, not
    with the wrap law (physics review note).
  - **Independent check (Run Game, `4355cac`, off vs on):**
    - `contactcost.py`, 8 games per arm, all contact zones pooled:
      - Runs through first contact for 5+ yd: 47 → 26.
      - Crowd speed at 0.3 / 0.6 / 1.0 s: 1.05 / 1.09 / 0.96 → 1.02 / 1.00 /
        0.92, against NFL 0.92 / 0.86 / 0.75.
      - Clean contacts still gain speed; in the NFL they lose about 3%.
      - n 12–26: directional only.
    - `taillab.ts`, 1,120 identical lab plays per arm:
      - Runs reaching 20 yd: 82 → 60. Reaching 40 yd: 69 → 56.
      - P(40 | 20) rises 84 → 93%, because the cut falls mostly on 20–39 yd
        runs.
  - Staged scene pinned to `GRIP_HOLD=0` (re-record by review 2): the Cover 2
    vertical curl in `test/cover3-cover2-rules.test.ts`, where the end's grab
    now holds the QB until 3.2 s, before the 3.4 s read.
- **Open:** fewer defenders reach the runner. Free defenders who reach him
  past 5 yd, per run: 1.89 with `SHED_PURSUE`, NFL 2.69. See TKL-2.

<a id="tkl-2"></a>
### TKL-2: Pursuit angles and speed unlike tracking

- **Measure** (#191, research builds): 32–33% of close pursuers (0–6 yd) aim at the carrier
  himself; NFL 19–21%. Real pursuers aim ahead. On runs of 20+, our pursuers
  run at 0.55 of max speed; NFL 0.71.
- **Cause:** *revised* (#205). The pursuit controller asks for the right thing:
  free defenders behind the runner request full speed (effort 1) toward him,
  facing within 5–7° of the request. The low speeds come from where those
  defenders start (below), not from the request.
- **Where:** pursuit in `run-fits.ts` and `defense.ts`; `scripts/diag/pursuit.py`.
- **Who is out of the play** (#205, `scripts/diag/g1/flow.py`; NFL 2022 weeks
  1–9 vs 16 sim games, `SHED_PURSUE` on, promoted profile). Defenders who get
  within 1.5 yd of the runner after he crosses 5 yd, per run reaching 5:

  | | NFL | Sim |
  | --- | --- | --- |
  | **All** | **2.91** | **1.60** |
  | DL | 0.54 | 0.04 |
  | LB | 0.99 | 0.47 |
  | DB | 1.38 | 1.09 |

  - **In the NFL, a block doesn't take a defender out of the play.** Of those
    who get there, 67% of DL and 45% of LB were blocked when the runner crossed
    the line. In the sim almost none were (LB 5%).
  - **Sim blocks are farther from the ball.** Blocked defenders' median distance
    to the runner as he crosses the line: DL 4.3 yd (NFL 3.2), LB 4.8 (NFL 3.6).
    This is the G2 crease.
  - **Sim blocks hold longer.** DL who don't get there and are still within
    1 yd of a blocker when the runner reaches 5 yd: 66% (NFL 34%). Run Game's
    `rallybox.py` shows the same.
  - **The runner gets away from the rally.** From the line to 5 yd takes 1.0 s
    in both. The NFL runner then slows (5.9 → 5.1 yd/s) and the sim runner
    speeds up (6.3 → 7.1 yd/s); see TKL-1, contact cost.
- **Not the cause: acceleration** (`scripts/diag/g1/accel.py`). Speed gained by
  free defenders from 1–3 yd/s within 1 s, p90: DL 2.48 vs NFL 2.50 yd/s; LB
  3.11 vs 3.12.
- **Released DL stay on the blocker's body.** Engine-side: free DL behind the
  runner at 5 yd were released a median 0.45 s earlier. 29% are still touching
  an opponent (median surface gap 0.12 yd); those go from 0.18 to 0.26 of top
  speed in 0.3 s, against 0.35 to 0.44 for the clear ones. For 32%, the
  nearest opponent stands between them and the runner.
- **Both bodies push into each other** (#205, `out/` probe; 18 games). In
  those contacts:
  - 61% of the DL request more than 1 yd/s into the blocker (median 2.95);
  - 64% of the blockers, though engaged with no one, request more than 1 yd/s
    into the DL (median 5.1). All are `run-block`.
- **`PURSUE_AROUND`** (#205, on). A free pursuer whom the runner has passed
  routes around an offensive body on his path, from his acquired picture of
  it, instead of requesting velocity into it. Fits and defenders in front of
  the runner are unchanged.

  | | Off | On |
  | --- | --- | --- |
  | DL request into the body (median) | 2.95 yd/s | −0.38 yd/s |
  | Free trailing DL still touching an opponent | 30% | 23% |
  | DL speed | 0.31 of top | 0.29 of top |

  The blocker still drives: 72% of the remaining blockers request about 6 yd/s
  into the DL. Arrivals per run are 1.52 vs 1.50 (16 games).

  Paired snaps, 800: 272 of 310 runs and 419 of 490 passes are identical; run
  yards +0.25 (SE 0.18). Small on its own; the blocker's half is Run Game's.
- **Owners:**
  - crease width and the DB fits: Run Game (G2);
  - blocks that hold after the runner passes, and blockers who keep driving a
    released man: Run Game, with `SHED_PURSUE` done;
  - contact cost: Main Engine;
  - pursuit path around a released blocker: done (`PURSUE_AROUND`).
- **The chosen point jumps** (`audit`, current `G1-P002`, SS after the
  catch): between 4.25 and 4.30 s the interception point moved 8.3 yd while
  the runner moved 0.4 yd, as the earliest feasible point went from 1.8 to
  2.8 s ahead. Faster yaw, stopping first, or a 0.8 s horizon don't help (the
  last gives up a TD). Predicting the runner's turn from velocities he has
  already seen helped P002 (32.3 → 23.5 yd) but slightly hurt P117 and P038:
  a candidate, not a fix. Separately, `timeToReach` (`src/physics/reach.ts`)
  can promise an arrival faster than full traction allows (6 of 48 designed
  cases), and `interceptPoint` returns its least-bad fallback in the same
  shape as a feasible point. Neither is shown to cause P002: its chosen
  points pass the bound. **Open:** return feasible vs fallback explicitly
  and log it, then compare candidate forecasts on frozen cases. Defense.
- **Prediction interface:** [selected command traces](COMMAND_TRACE.md#inspect-pursuit-prediction-feasibility)
  expose the sampled estimate vs fallback, horizon/arrival/slack and forecast
  assumptions, including the existing bias/leverage applied after that test.
  This is an approximate-estimator contract, with point selection and steering
  unchanged. Forecast/steering repairs and any native link to the isolated
  reach-bound violation remain open.
- **Frozen arrival comparison:** [bounded operator and clock contract](reviews/pursuit-arrival-comparison.md)
  separate the consumed forecast, held/fixed-goal World response and recorded
  future runner. The approximate test can reject an earlier point that the
  tested seek reaches and accept a later point that it misses. A miss under
  that policy is not proof of optimal unreachability; a forecast-point arrival
  is not a tackle. On #259's P002, the estimate budgets full effort while the
  distant chase requests reduced effort. Matching that assumed request changes
  the late arrival without changing capacities, but still misses the recorded
  runner. No production correction or capacity change is made here.
- **Request-budget repair:** [planning/execution contract](reviews/pursuit-effort-contract.md)
  gives chase's estimator and emitted interception sprint the same speed/effort
  request, preserving distant work-rate pacing. The forward model retains the
  full physical drive/braking/cutting profile and handles above-budget momentum.
  It leaves sampled versus biased/shaded objectives distinct, gather/navigation/
  contact ownership intact, and generic reach consumers unchanged. The earlier
  frozen comparison remains historical; transverse/forecast error and contact
  span remain open, including the adverse P002 native ending.
- **Landed** (#259, #263, #267): the feasible-vs-fallback return and its
  trace, the frozen arrival comparison, and the shared speed/effort request.
  Matched plays showed no systematic effect from #267: it makes planning and
  execution agree, it doesn't make pursuers faster.
- **Open from the #267 review** (2026-10-24):
  - *The planner keeps the reduced budget too long.* A pursuer who closes
    inside 12 yd switches to full effort, but the point he chose was planned
    on the reduced budget, so the forecast is pessimistic until the next
    replan and the aim point jumps when it comes.
  - *Far pursuers jog on breakaways.* The distance rule (`dist > 12` →
    effort 0.75 + 0.2 × work rate) ignores the game situation: a defender
    who is the last man between a runner and the goal line paces himself
    like one trailing a short gain. On P002 this is the likely reason a
    32.3-yd run ending out of bounds became a 72.9-yd touchdown in the
    matched replay. A real defender sprints when he is the last chance,
    from what he can see (runner free, nobody ahead of him). Defense, G1;
    judge on matched breakaways and a short-gain control.

<a id="tkl-3"></a>
### TKL-3: Fast receivers break catch tackles twice as often

- **Measure** (#190, `prof190`): catch contacts break 24% of the time, NFL 12.6%.
  Fast receivers break 47% (NFL 23%); mid-speed receivers 7% (NFL 9%).
- **Cause:** *likely* it starts before the catch: the defender arrives late and
  moving the wrong way (COV-1), so the tackle is an arm tackle.

<a id="tkl-4"></a>
### TKL-4: Defenders turn their backs on the ball carrier

- **Symptom:** film review of develop `c5667bc4` (seed 7, game 1), 8 notes:
  linebackers and safeties spin away from the runner as he reaches them
  (P003, P005, P013, P024, P025, P028); on P002 the SS "carries his momentum
  and looks like he's on ice."
- **Measure:** defenders within 5 yd of a non-pocket carrier and facing more
  than 120° away from him, unengaged, LB/DB, per game (matched twin: every
  scrimmage play run from identical setup with and without the change; probe
  in the PR). Seeds 7/8/9: 19/11/17 → 11/9/13. Of the 11 unengaged
  second-level cases in game 1, 11 were a man defender on a back.
- **Cause:** *confirmed,* all six clips were **requested** turns (facing
  intent flipped), not bodies rotated by contact. Five controller paths:
  1. A run-reading man defender whose back has the ball covered him with
     receiver cushion unless his fit was insert/alley. Force players matched
     onto the RB bailed downfield (P003, P025; a 59-yd TD in game 1, P096).
  2. A crossover-running backer braking from an overrun faced his braking
     request, so he turned to run back the way he came (P024, P088).
  3. Reversals took the shortest arc even when it swept his back past the
     ball (P005).
  4. Pull read: with linemen moving behind the line both ways, the fit took
     whichever puller came first in the list, and the landmark jumped ~8 yd
     between ticks.
  5. A spot-dropping underneath defender turned to sprint to his landmark
     before he had read pass (P013, 0.2–0.4 s).
- **Fix (on):** 1 plays his installed fit, keyed on that back; 2 squares up
  when braking; 3 `open-to-ball.ts` turns a defender through the side that
  keeps the carrier in front when both ends of the turn face the ball's
  side (the requested facing is unchanged, the longer turn costs time);
  4 follows the fastest lateral mover; 5 keeps eyes and chest on the
  backfield until the pass read.
- **Kept:** turns that end facing away keep the shortest arc. LBs turning
  to run with verticals on pass plays: 728 → 721 frames in the matched game.
- **Open:**
  - P028 is an overrun on a cutback: the turn is toward the ball but long.
    That is run-fit flow speed, not turning.
  - Earlier P002 SS (*fix on*, PR after #240): hips flipped ~100° in 0.2 s
    while his velocity kept its lateral component for ~0.5 s. The earlier "braking is
    not the cause" (DB decel p90 6.6 vs NFL 5.6 yd/s²) is withdrawn as proof:
    this is a p90 across per-player-play maxima of filtered scalar speed
    loss, including contact. It establishes neither lateral cutting capacity,
    braking timing nor maximum hard-plant capability. When a
    command gives no facing, `commandFacing` faced the *requested* velocity at
    once. Above 2.5 yd/s the default facing now leads his actual path by at
    most 60°; below that he has planted and squares to the new heading.
    Tracking (BDB2025 week 1, `yaw_speed_audit.py`): defenders at 4–6 yd/s
    keep orientation within 60° of travel 72% of frames (6+: 91%).
  - Turn *capability* is unproven either way. The NFL per-path fastest 0.2 s
    turn (p99 650–790°/s; sim ceiling 315–600°/s) comes from provider
    orientation and cannot establish physiological capacity. One 180° glitch
    sample reads as 1,800°/s, and both yaw scripts count players with no
    roster match as DBs. Keeping the ceiling
    fixed during controller work is a controlled choice, not a proven NFL
    capacity. [COV-6](#cov-6) separately diagnoses requested-turn frequency.
  - Native free sweep (`audit`, `G1-P002` SS at `c4a03f6`): the ordinary
    motor with the recorded commands reproduces the path. Doubling yaw rate
    moved it 0.013 yd; doubling lateral capacity moved it 3.6 yd. This is
    selected-case parameter sensitivity, not calibration of either capacity.
  - Engaged defenders face their blocker (`audit`, `G1-P019` LB_W, exact
    restaging): engaged with the center at 4.40 s he faces 143° from the
    runner, because engagement technique (`engagement.ts`, near line 1436)
    replaces his facing with the bearing to his blocker while his pursuit
    request points at the runner. Facing the pursuit direction instead gives
    2.5°, moves him 0.001 yd, and the play is the same 8.78 yd; zeroing hand
    forces leaves 135.5°. So it's a technique facing choice, not yaw or hand
    torque, and facing your blocker can be right. Open: whether a body-relative
    hand model lets him shed better facing the ball. Detector 2 skips engaged
    defenders.
    This appearance change is distinct from the free sweep above; neither
    establishes a common cause for all overruns or facing-away cases.
  - Remaining cases are mostly overruns at speed and defenders on the ground.
  - Man defenders on receivers with a run carrier nearby still watch their
    man; whether that is pass-first discipline or a late read is Defense's
    call (`PASS_FIRST`).

<a id="tkl-5"></a>
### TKL-5: "Reach" means different things in each tackle branch

- **Symptom:** QB-3's falls with nobody near, and more broadly holds that
  form before a body could have got there.
- **Measure** (`audit`, seed-7 game, 127 live plays): of 122 newly acquired
  standing grabs (form, reach, assist and rear variants), 56 formed farther
  apart than the arm-strike envelope (`own reach + other radius`). That
  counts disagreements between our own reach rules, not 56 impossible
  tackles.
- **Cause:** *confirmed.* `PhysicalProfile.reach` is horizontal reach from
  the body center (`src/players/physical.ts`), but each consumer adds its own
  margin to it:

  | Operation | Center-to-center envelope | Where |
  | --- | --- | --- |
  | Arm strike, handoff | reach + target radius | `world.ts`, `ball-transfer.ts` |
  | Free standing tackle | both radii + reach | `tackle.ts` |
  | Free lunge | above + 0.45 yd | `tackle.ts` |
  | Dive | lunge + 0.30 yd | `tackle.ts` |
  | Granted hold | max(both radii + 0.9 reach + 0.9, distance + 0.15) | `tackle.ts` `grasp` |

  The dive creates its grasp at once, before the diving body has moved, and
  the solver then honors the long hold. On `G1-P048` (`audit`, exact
  restaging) removing only the DE's dive hold kept the QB upright; the dive
  itself still happened.
- **Not the cause:** "every remote dive trips the runner" (a 6 yd/s FS-on-QB
  case grabs, pulls and slips without a fall) and body facing (a standing
  reach admits the same hold facing 0°, 90° or 180°).
- **Open:** one contact-geometry contract for standing, lunge, dive and the
  held grasp: from which body point, to which target point, after how much
  movement. Then re-check the 56 cases against it instead of labeling them
  impossible in advance. Don't delete dives (QB-3's tried patch removed
  every one). The same radius convention feeds pursuit stopping distance,
  carrier threat, run support and catch approach, so check those consumers
  too. Defense/Main Engine with TKL-1 and QB-3.
- **Results to keep:** removing the P048 hold made the play *better* for the
  defense (+23.1 → −6.2 yd: the QB stayed up and another defender wrapped him
  before the throw). Removing a later SS hold on that play changed almost
  nothing. A correct fix can move yardage either way, so yardage can't judge
  it.
- **First attempt, #264** (held for rework, 2026-10-24 review, two passes and
  an independent matched probe):
  - *Right:* the standing envelope. The old `c.r + d.r + d.reach` counted
    the holder's radius on top of a reach already measured from his center;
    for an LB on an RB the envelope goes 1.60 → 1.30 yd.
  - *Missing:* the laid-out body. Lunges and dives now get no extra span, so
    every grasp beyond arm's length becomes a full dive chosen on the last
    reach cue. A horizontal tackler's hip-to-fingertip reach is about 1.5 yd
    (QB-3's segment lengths), well past a standing arm. Matched probe:
    dives 17 → 40, about 39 of 40 missed, yards per play 5.54 → 10.47.
  - *Also open:* a retained hold reaches 1.30 yd from the ground point
    against a realistic 1.5–1.9; `contactQuality` shrinks its denominator by
    the holder's radius, dropping a typical grip from 0.59 to 0.25; other
    consumers still disagree (interception stops at 1.34 yd against a 1.30
    reach). Film from the PR also showed a P013 CB_S who reached the runner
    and then slipped, a hold problem rather than a reach one.
  - *Next:* keep the standing fix and add the layout span back in the same
    change, with the grip and consumer radii, then re-run the matched probe.

## Pass protection

<a id="run-11"></a>
### RUN-11: Staged scenes recorded on arm-force hands or true-velocity mirroring

- **What:** `ARM_PRESS` (G5) puts a press through the hands at each player's
  bench max, not the arm-force mapping. Six staged scenes were recorded on
  arm-force hands. They are pinned to `ARM_PRESS=0` until review 2:
  - run: `combo-strike-access`, `planned-climb-fit`, `zone-runoff-work`;
  - legacy trace: `run-hand-control`;
  - pass: `pass-cutoff-approach`, `cover3-cover2-rules`.
- **Open:** whether a double still moves the DL and hands him to the climber
  when the arms don't fold. That is a G2 question; a pin is not an answer.
  Re-record each scene, or replace it with a contract that holds under strong
  arms, by review 2.
- **`RUN_FEEL` (G1).** A run blocker now mirrors the defender's motion as he
  has it: by touch while his hands are on (0.06 s), by sight otherwise
  (0.12–0.24 s). That's the pass rep's PASS_FEEL law. Before, he copied the
  defender's true current velocity. Four tests are pinned to `RUN_FEEL=0`
  until review 2:
  - `stretch-normal-follow`: the island sets the incoming velocity with no
    perception history;
  - `planned-climb-fit`, `zone-helper-check`: staged scenes;
  - `run-hand-control`: legacy trace.

<a id="run-12"></a>
### RUN-12: Run blockers lost on their assignments (film, Oct 23)

Tanner's film review of game 1 on `c5667bc4` (seed 7) left 16 notes on run
blockers, plus 3 on wide and outside zone footwork. Counted across that game's
run plays with the assignment layer (`--telemetry full`):

- **Zone track runs a blocker away from a beaten man.** *Confirmed, fixed
  (on by default).* A backside cutoff whose end ran upfield outside him kept
  running the playside track at full tempo, backpedaling with his back to the
  line (P003, P029, P032 LT). Unengaged linemen facing their own backfield
  were 30–36% of cutoff frames on inside, outside and wide zone, the most of
  any job, on 18 run plays. The track now ends once the man is backside of
  the aim point and deeper than the blocker; he fits the man instead.
  Restaged on the same 61 runs: unengaged OL facing the backfield 6.3% →
  4.0% of OL frames; cutoffs stuck on a man 5+ yd from the runner and moving
  away while a free defender is within 3.5 yd of the runner, 116 → 51
  frames; first-0.6 s lateral flow of every line position unchanged.
- **Targets that never update.** *Partly fixed (on by default).* A climber or
  lead stayed on a backer or safety who was no danger to the runner while
  another free defender reached the runner (P024 FB on the FS while the Mike
  came free; P013 LT; P032 Z).
  Retargeting only happened when the target was engaged by someone else or
  down. Climbing linemen and lead backs now re-read on their decision beat
  ("first threat to show", event `block_threat`). From his own pictures,
  when his man is 4+ yd from the acquired runner, he takes a free defender
  who is clearly nearer the runner (by 2.5 yd, counting closing speed), whom
  he is nearer than the runner is, and whom no teammate is nearer. Restaged
  on game 1's 61 runs (after the track fix): fires 17 times on 9 runs.
  Climbs stuck on a man out of the play went from 45 to 30 OL frames and
  from 19 to 0 TE frames, and P024's FB now blocks the Mike. Still open:
  - stalks (P032 Z, P024 Z on the Mike) keep their perimeter ledger. A
    first try that let receivers switch fired about 3 times a run and pulled
    them off their corners;
  - P013 is a climb that overran a downhill backer, not a stale target;
  - P029 RT staying on the end is correct: the Y fell (inline ends below).
  - **Nearby-help follow-up on accepted `27617221` (includes #258):** a
    bounded ordinary seed-7 prefix produced 60 competing candidate/read vetoes
    across 20 designed runs, not 60 missed blocks. No sole off-feet/departing
    helper met the declared opportunity screen. Exact constructor replays of
    P007 (Ace/Over) and P047 (Gun Wing/Under) retain useful first-level help;
    P047's later corner is beyond the climber's native arrival window. No
    helper-policy correction is supported by these cases. This is a bounded
    negative finding, not a claim that proximity proves protection generally;
    pending possession/work-off changes require their own source qualification.
- **Pullers whiff.** *Partly fixed (on by default).* A kick or trap puller
  tracked the end's shoulder with the end's own velocity fed forward. On P031
  the end penetrated 4 yd deep, so the guard matched his backward speed and
  drifted 6 yd deep while still 3–5 yd away laterally, never touching him.
  The puller now fits the end's shoulder on the end's line to the runner he
  has acquired, with no velocity feed-forward, and carries the held pull
  read through the time held. Restaged on 132 pullers (game 1 runs plus
  power, counter and trap from seeds 8–13): contact with the assigned man
  55 → 66, contact made inside-out 44 → 58, first contact 2.28 → 2.11 s.
  P031's guard now kicks the end at 2.4 s. Still open: a kick target who
  reaches the runner unblocked is unchanged (35 → 36). On P007 (trap) the end
  still slips inside the trapper after contact; that's contact, not approach.
- **Inline tight ends fall on first contact.** *Fixed (on by default).* An
  inline Y or H on a lineman's first-level block (drive, reach, down,
  cutoff) ran at full speed with no base into his man. In game 1's runs an
  inline end fell within 0.3 s of his first block contact 16 times, a
  lineman once. On P029 the Y engaged the end at 0.7 s, fell at 0.75 s and
  stayed down until 2.3 s, so the RT had to stay on the end. The snap base
  and strike fit only applied to the five linemen. An inline end now keeps
  the same base and fit; a detached wing or slot keeps his own approach, and
  the tackle's first step and zone track are unchanged (an inline end's own
  zone track is a separate question). Restaged on the 151 runs of seeds 7–9:
  inline-end falls within 0.3 s of first contact 21 → 3, linemen 3 → 3,
  inline-end block engagements 132 → 133. Restaged run yards moved both
  ways: mean 10.06 → 8.31 on seed 7, 5.63 → 5.93 on seed 8 and 5.45 → 3.31
  on seed 9 (medians 3.09 → 2.73, 2.95 → 3.09, 1.99 → 1.31). A PR-tier
  scorecard on seed 8 (develop `4d17e43` against the change, 12 games each)
  moved rush yards per carry 4.56 → 5.11, stuff rate 25.1% → 22.6% and yards
  before contact 0.93 → 1.10. Open: whether the full-speed run-through was
  also moving defenders on the plays that now gain less (seeds 7 and 9).
  On P029 the jet Z's assignment is a stalk on the corner, not a gap.
  Tanner's idea that a jet-motion Z should insert (crack or arc) is a
  play-design question, logged here, not changed.
- **Left for later** (paused 2026-10-23, after this fix):
  - *Backside crack.* A receiver on the backside of a run cracks into the box
    instead of taking his man; a playside-only crack rule cut backside box
    stalks from 14 to 8 in a first restage. Not landed.
    Current accepted `cac9e100` reproduction: seed-7 G1-P003, flipped Gun
    Trips Outside Zone Weak with actual H-across motion, assigns detached Z
    to backside LB_W and detached Y to NB; the box-first ledger explicitly
    installs these jobs. Neither loads his target. Z's unassigned corner
    stays at least 14.86 yd from RB, LB_W at least 4.46 yd; LB_M makes the
    tackle from the separately installed C/RG combination responsibility.
    No contradictory concept-specific crack/stalk rule or lost perimeter
    protection is established in this case. Do not infer that every backside
    crack is valid, or adopt playside-only eligibility from the old count.
    The current LB_M access is a next witness, not proof of an unsafe/late
    combo release. Helper policy and target/information contracts unchanged.
  - *P007 trap contact.* The end slips inside the trapper after contact;
    the approach is fixed, the contact is not.
  - *An inline end's first step and zone track.* He still runs his own
    approach rather than the linemen's. Adding them cut falls no further
    (track alone 21 → 12, base alone 21 → 4) and changed the recorded Duo
    double and zone-helper scenes, so they need their own look.
  - *Jet-motion Z.* See the inline-end bullet: crack or arc instead of the
    corner stalk is a play-design idea, not a bug.
- **Defensive gaps exposed so far.** None measurable yet: restaged mean run
  yards moved within noise on each fix (6.94 → 7.20, 7.20 → 6.87, gap
  schemes 4.35 → 4.48). Re-check after all three at the PR-tier scorecard.
- **Wide/outside zone with no lateral movement** (P022, P025, P028). *Open.*
  Playside linemen gain 0.4–0.8 yd laterally by 0.6 s on these calls, so the
  first steps do move. On P025 the look comes after contact: the playside
  reach and his end drift together into the backfield. Not yet compared
  with tracking.
- **Blocker and end slide down the line together** (run lane film, Ace12
  weak wide zone vs Under, roster 7 / seed 1; Oct 25). *Fixed (on by
  default, `EDGE_CONTAIN`).* After contact a reach blocker and a blocked edge
  slid sideways in lockstep, 7.5 yd on that clip, while the back cut back
  inside the end. The edge's contact aim was the blocker's live position
  plus 0.65 yd outside, led by the blocker's own velocity, and a stretch
  blocker matches the end's play-side speed, so each chased a point the other
  moved. The edge now widens only as far as containing the back's observed
  track (where it crosses his depth) needs; already wider, he holds. The
  blocker side is unchanged. Restaged on the same snaps, 154 runs of seeds
  7-9 (`scripts/diag/edge-contain-restage.ts`): edge reps carried 4+ yd
  outside with the blocker 18 -> 7, those ending with the runner 3+ yd inside
  the end 11 -> 0. The 7 left go with a runner going wide. Mean run yards
  5.36 -> 4.67 (paired 90% interval -1.67 to +0.31).
- **Nobody owned the gap between the weak tackle and a second tight end in
  the nickel Under** (same clip; Oct 25). *Fixed (on by default,
  `GAP_MATCH`).* Backers took open gaps nearest-first: the Will, the weak
  curl-flat (force behind the boxing wide-9 end), picked the weak A as his
  inside duty and the Mike the strong B, so the weak C was empty while the
  rotated-down strong safety sat over the strong B. Backers now fill the open
  gaps as a set. The gap left open is one an underneath support player still
  covers on that side, never an unsupported or A gap, and distance breaks
  ties. On that snap the Will fits the C inside the end (force only once the
  back bounces outside him), the Mike slides to the weak A and the strong B is
  the safety's, the Seattle/Kiffin Under and cover 3 fit. Over fronts now put
  the Mike in the strong A instead of the C. Restaged on the same snaps, 250
  runs of seeds 7-11 (`scripts/diag/flag-restage.ts`): backer fits changed on
  110, results on 96. Mean run yards 4.51 -> 3.94 (paired 90% interval -1.06
  to -0.09), 10+ yd runs 25 -> 19, stuffs 56 -> 56.
- **A drive blocker runs the end he caught on the inside half out of the
  play** (CEO restage of #275: seed 10 P46 Pistol Twin TE duo, Y on DE_S;
  seed 10 P123 Twin TE duo, RT on DE_S; seed 11 P99 Gun Spread wide zone weak,
  LT on DE_S; Oct 25). *Fixed (on by default, `SEAL_HOLD`).* The end was
  working inside the whole rep (P46: commanded 4.1 yd/s inside from 0.6 to
  2.7 s). The blocker had caught him on his inside half (lateral offset 1.1
  to 1.5 yd) and the rep wanted him head-up (sealTarget 0; 0.31 yd on the
  P99 stretch), so his seal correction ran him toward the end's outside at
  his top lateral request (Y 3.82, RT 2.13, LT 3.01 yd/s) with the hands on.
  The pair moved together, the offset never closed and the request stayed
  pinned for about 2.5 s; the velocity lead in the offset moved the target
  further out as the end was carried. Now, once his own felt load says the
  hands are on, he keeps the leverage he caught the man with (the closest to
  the wanted shoulder reached while loaded) and drives him on it; unloaded
  closing keeps the old correction. Those snaps, end carried outward: P46
  4.50 -> 2.76 yd, P123 4.05 -> 2.80, P99 4.34 -> 1.68. Restaged on the same
  snaps, 250 runs of seeds 7-11 (`scripts/diag/seal-hold-restage.ts`): run
  reps with blocker and defender carried 4+ yd the same way 78 -> 43; stretch
  reps where the blocker reached play side and stayed there 283/359 (79%) ->
  277/341 (81%); edges working outside on their own (mean commanded lateral
  outward over 1 yd/s, 41 reps in both arms) still go outward 0.58 -> 0.56 yd
  with the same lost-block endings. Results changed on 234 runs; median run
  2.78 -> 2.66 yd, stuffs 56 -> 57, 10+ yd runs 25 -> 29, mean +1.26 yd
  (paired 90% -0.18 to +2.70; capped at 20 yd +0.02, -0.58 to +0.62): the
  mean moves with a few breakaways. The rest of the carry on P46 and P123 is
  the open push question in PHY-1.

<a id="pro-1"></a>
### PRO-1: Edge rushers meet the tackle at the line and walk through him

- **Measure** (#191; #198 on `prof194`):
  - edge contact comes 0.45 s after the line starts on develop, NFL 1.25 s;
  - the tackle has retreated 0.0 yd at contact, NFL 2.8 yd;
  - 42% of edge reps end with the rusher free, NFL 5% (`rg3`);
  - the rusher keeps 4.0 yd/s chest to chest (0.63–0.67 yd apart), while
    tracked rushers slow to 3.35 yd/s at arm's length (0.81–1.08 yd);
  - the rusher's heading matches tracking (43–44° off the line).
- **Cause:** *confirmed* in two parts:
  - the tackle's cutoff point met the rusher at the line instead of kicking;
  - the tackle's hand joint is at its muscle cap on 75–80% of ticks, so the
    rusher walks through the arms (#198).
- **Tried:** `PASS_CORNER`/`PASS_KICK` on `rg3` fixed the contact timing there
  (1.16 s, 3.3 yd). They aren't on develop. A probe without PASS_KICK's follow
  term made the tackle worse (rusher past him 27% → 33%), which points to the
  hands rather than the kick.
- **Open:** the hands are a physics or trenches question, not the rusher's
  path. This is G5.
- **After the promotion** (2026-10-22): sacks rose from 5.1% to 11.4% of
  dropbacks. Realistic line splits and stagger (`OL_SPLITS`, `OL_STAGGER`)
  and the line's snap reaction (`SNAP_REACT`) account for most of it: on
  their own they take sacks to 7.8% and 8.8%. They are realistic alignment
  and timing, so they stay on; they show the tackles can't hold an edge.
  In the P019 pass-cutoff scene the tackle also loses edge contact with
  `PASS_FEEL` on (`test/pass-cutoff-approach.test.ts` is pinned).
- **G5** (2026-10-22, `trenches/G5-edge-hands`). Two mechanisms, each
  measured with `scripts/diag/edge-rep.py` on 8 games (seed 301) against
  tracking:
  - **Contact timing: `PASS_KICK`, on.** The tackle sets vertically against
    an edge rusher (ported from `claude/run-game-v3`). First contact moves from
    0.55 s to 1.06 s (NFL 1.20), with the tackle 3.0 yd back (NFL 2.75).
    Edge reps engaged move from 41% to 62% and free from 50% to 30% (NFL 79%
    and 5%). `PASS_CORNER` (cut him off where the arc turns) didn't move
    contact on develop (0.49 s), so it wasn't ported.
  - **The hands: `ARM_PRESS`, on (agreed with G2 for run reps).** A hand joint's push was capped
    at the arm-force mapping, 0.86 body weights for a tackle. That is less
    than the leg drive it resists (traction, 1.1). So the joint asked for
    0.88–0.93 yd and the bodies sat at 0.67, torso to torso, with the push
    at its cap on 85% of edge ticks at 0.2 s. A push is a bench press: each
    player's one-rep max from his combine reps (Epley), about 1.3 body
    weights.
    - Pairs now hold 0.90–0.93 yd apart from 0.6 s. The share of ticks at
      the cap falls to 20–38%.
    - Of free reps, the share that get free *through* the tackle falls from
      71% to 43% (NFL 29%). With PASS_KICK alone it is 73%.
    - The arm budget, and its work and impulse ledgers, count a press in
      press units. Before that, the first version tripped the arm audit
      (`armImpulseExcess`) in 106 staged-scene tests and capped a press's work
      at arm-force work.
    - Corrected, on top of PASS_KICK and ROUTE_CLEAR (8 games, seed 301):
      edge reps engaged / free 62% / 29%, and free reps through the tackle
      73% → 47% (NFL 29%).
    - Quick tier, off → on: sacks 8.0% → 6.0% (moved). Run stuffs 21.7% →
      19.1% and yards before contact 1.25 → 1.54 (both noise, both in band).
      Completion % swings ±9 points between quick-tier arms, against 64–66%
      on the 8-game exports: noise.
    - Six staged scenes recorded on arm-force hands are pinned under RUN-11.
  - **Both:** sacks fall from 13.9% (develop) to 5.9% of dropbacks (NFL
    6–7.5%). PASS_KICK alone gives 7.5%, ARM_PRESS alone 8.8% (quick tier,
    6 games). Time to throw rises 0.10 s. Interior reps (PRO-3) and
    play-action losses are unchanged.
  - **Still open, the hip:** a rusher still keeps speed into the rep (4.9
    yd/s at contact, 3.1–3.3 at 1.2 s; NFL 4.1 and 2.5). The rep ends by
    rule once he is hip to hip (`|phi| >= 1`, "turned the corner"), while
    a tracked tackle rides him past the launch point.
    - In P019 under PASS_KICK, both ends are met at 1.25 s and lost at the
      hip at 1.9 s.
    - `PASS_RIDE` (parked) is the candidate.
    - The pinned scenes are `pass-cutoff-approach`, `redirect-protection`
      and `qb-rusher-recording`.
  - **A back's release: `ROUTE_CLEAR`, on.** A back releasing from the
    backfield ran straight at his waypoint and into the kicking tackle (3.5
    to 1.9 yd/s at 0.9 s in the Cover 3 push scene). Now he paths around a
    body he sees in his lane (a teammate, or a rusher coming at the
    backfield): on the side he is on, or the other if that side is closed.
    - Released backs within 0.8 yd of their own linemen in the first 2 s fall
      from 11% to 6% (8 games). Their speeds are about unchanged.
    - Completion rate on the quick scorecard moved 60.0% → 69.7%, but the
      8-game exports show 64.1% → 62.5%: whole-game noise, not a finding.
    - **Still open:** the back flat route aims at the line 4 yd outside the
      back, which is the end's rush lane at 1.0–1.3 s under PASS_KICK. In
      the Cover 3 scene the back now clears the tackle and the flat defender
      pushes on him at 1.10 s, but he meets the end at 1.35 s. Where a back
      releases against the rush is G3/G7's call; `cover3-cover2-rules` stays
      pinned.
- **After `GRIP_HOLD`** (#217, TKL-1): sacks rose from 10.0% to 13.4% of
  dropbacks (quick tier, paired, moved). A rusher's arm grab on a pocket QB
  now keeps its grip, and those grabs break half as often (12% → 6% of
  about 175 holds; the number of grabs is unchanged). A quarterback can't
  twist or spin out of an arm grab: he escapes only if the grip itself
  slips past reach. That escape is missing, along with the slide away from
  the edge (PRO-4). Don't weaken the grip to fix sacks. With #215 on
  develop (`c22fba2`, quick tier, seed 7, paired), both changes give 7.3%
  of dropbacks, inside the NFL's 6–7.5%; `GRIP_HOLD=0` gives 5.9%.

<a id="pro-2"></a>
### PRO-2: Pressure arrives too early and from the wrong places

- **Measure** (#198, `prof194`, 8 games, against 9,566 NFL dropbacks):

  | | NFL | Sim |
  | --- | --- | --- |
  | Pressured | 30.5% | 28.4% |
  | Pressure hazard 2.0–2.5 / 2.5–3.0 / 3.0–3.5 s | 9.6 / 21.6 / 20.3% | 19.9 / 15.9 / 12.9% |
  | Rep holds at 3.0 s, T / G / C | 79 / 79 / 82% | 65 / 89 / 99% |
  | Pressures where the edge beats the tackle | 40% | 70% |
  | Won still on the block / inside / outside / unblocked | 40 / 36 / 17 / 5% | 6 / 58 / 32 / 2% |
  | Pressurer past his blocker, median | 2.2 s | 1.5 s |

  On a `rg3` build (`547af69d`), #191 had 42.3 pressures per 100 dropbacks (NFL 31.3). The
  excess came from edges shedding after contact (+10) and unblocked edges
  (+4). Same-side tackles blocked nobody on 86% of unblocked edges, vs 39%.
- **Measurement qualification:** #203's merged `sampled-geometric-pressure-v2`
  fixes post-release/post-whistle sample admission and unknown exposure. The numbers above remain the original #191/#198
  measurements, not corrected v2 results. Native QB credit and geometric pressure
  remain different measures; see the [published contract](https://github.com/tannerthardy/football-simulation-/pull/203).
- **Cause:** *likely* PRO-1 and PRO-3, with the measurement limits above. The
  overall rate can look right while the timing and source are wrong.
- **Where:** `scripts/diag/passpro/` (#198), `scripts/diag/pass-pressure.py`, `scripts/diag/edge-rep.py` (#191).
- **Adverse control to keep:** a play-action post-dig snap where a near-matched
  sack persists at 3.15–3.20 s (#189 film).

<a id="pro-3"></a>
### PRO-3: Interior pairs move as one block

- **Measure** (#191, `rg3`): at 1.0 s, the rusher moves toward the QB at 0.00 yd/s
  relative to his blocker (NFL +0.63) and 0.16 yd/s across (NFL 0.45). Off the
  block by 3 s: 10% vs NFL 34%. Interior contact comes early, 0.55–0.59 s vs
  0.79 s, from a flat line depth.
- **Cause:** *hypothesis:* the contact holds a pair together without letting
  either one win ground.

<a id="pro-4"></a>
### PRO-4: The QB doesn't slide away from an edge

- **Measure** (#191): lateral slide after an edge gets level, p75/p90, 0.1 /
  0.2 yd; NFL 0.5 / 2.6 yd. Step-ups are similar: NFL 20%, sim 27%.
- **Cause:** *likely* missing from the QB's pocket controller.

<a id="pro-5"></a>
### PRO-5: No pass protection calls

- **Symptom:** the line has no protection call. There's no slide, half-slide
  or BOB/man install, no Mike ID, no ordered back scan, and no hot or sight
  answer when the defense rushes more than the protection can block.
- **What exists** (*confirmed*, `src/sim/behaviors/blocking.ts`,
  `ProtectionCoordinator`):
  - one generic matcher: at the first rush read, linemen take rushers in
    left-to-right order at the least total lateral distance, with no crossing
    paths;
  - each tick, free blockers pick up rushers in their zone, spare linemen
    double, and backs and tight ends take leftovers;
  - the playbook's `chip` pass assignment (`src/playbook/types.ts`) is declared
    but nothing uses it.
- **Information shortcut** (*confirmed*): `isRusher` reads the defender's
  behavior (`rush` or `blitz`, with a short recognition delay for blitzers)
  instead of what the blockers can see. That breaks the model rule that
  players act on acquired information.
- **Measure** (#191, `rg3`): on unblocked edge pressures, the same-side tackle
  blocked nobody 86% of the time; NFL 39%. Unblocked edges added about 4
  pressures per 100 dropbacks (PRO-2).
- **Teaching:** [trenches handbook §7](football-handbook/trenches.md#7-pass-protection-is-linked-to-the-throw-and-launch-point)
  covers the families, the count and the back scan.
- **Open:** this is G9. Install calls as protection plans the line reads from
  the visible front, with the QB and receivers sharing the hot answer. Start
  it after G5's physics work, because PRO-1 (a tackle losing one-on-one) isn't
  a call problem. Logged 2026-10-22.

## Pass defense and coverage

<a id="cov-1"></a>
### COV-1: Zone defenders barely close while the ball is in the air

- **Measure** (#190): the nearest zone defender closes 0.12 yd during the
  flight; NFL 0.65.
- **Cause** (G3, `scripts/diag/depth/throwbreak.py`, BDB 2022 vs promoted
  profile):
  - *Likely:* the trigger is late. Instant recognition at the release brought
    sim zone closing to 0.60–0.82 yd on two seeds (NFL 0.61), but that was a
    game-level comparison. Closing in 16 games swings ±0.25 yd between arms
    whose recognition is the same, so it does not size the effect.
  - Tracked deep defenders are already driving toward the catch point before
    the release (+1.3 yd/s at −0.4 s, +2.2 at the release). Ours are not
    (−0.5 to +0.5), and their speed dips while they redirect after it. Some of
    that tracked lead is route anticipation, not a read of the arm.
  - Underneath zone is not short: sim ends closer at the catch (2.5–2.8 yd
    vs 4.2).
  - The aim point is the catch point already. The motor's acceleration
    matches tracking peaks.
- **Fixed in part (#207):** zone defenders who watched the QB's throwing
  motion, spot and match alike, react from its start or from when their eyes
  reached him, whichever is later. Deep zone defenders recognize the throw a
  median 0.10 s after the release (was 0.25 s). On 3,147 paired single plays
  (`scripts/diag/paired-plays.ts`), closing in flight rises 0.05 yd (± 0.007)
  for zone defenders, and yards per attempt fall 0.53 (± 0.18).
- **Open:** the QB gives defenders little to read. His eyes settle on the
  target a median 0.10 s before the release, and his throwing motion lasts
  0.10–0.28 s by rating (about 0.15 s at an 80 rating). A full throwing
  action is roughly 0.25–0.46 s on film. Next: the motion's length follows
  the needed ball speed and the release rating (QB-1).

<a id="cov-2"></a>
### COV-2: Too much yardage per attempt and after the catch

- **Measure:** yards per attempt 10.1 (`dev-24`); YAC per catch 8.4 (`dev-24`),
  7.7 (`dev-12`), 10.4–10.7 on `prof194`; NFL 4.8–5.6. Separation at the catch
  3.23 yd (`dev-12`), NFL 2.8–3.2.
- **Cause:** *likely* COV-1 and TKL-3. YAC is measured per catch, so it moves
  with both coverage and tackling.

<a id="cov-3"></a>
### COV-3: Coverage rules and calls not yet complete

From #193's open list:
- rotation timing is still "at the snap" (E3);
- in Box vs three bunch verticals, the middle one goes to the deep zone;
- Banjo calls are installed as match calls;
- Hands Mini is nickel-only;
- the installed quick out stems about 6.3 yd, so traps come late;
- not installed: stack, quads, red-zone and Tampa-variant calls, half-side
  Smack, Read and Patty;
- Cover 2 and Cover 6 run a few points under tracking (#194);
- Fangio E1 (strength and rotation to the nickel side) is not done (#196);
- with `WR_ALIGN` and `OL_SPLITS` on, the match hook and curl/flat defenders
  stop carrying the doubles seams (`test/integration/coverage-panel.test.ts`
  is pinned). *Confirmed cause:* the wider slot's seam is outside the hook's
  band, and the curl/flat's carry starts only once the stem is past 2 yd at
  4.5 yd/s. Until then the lane logic pulls him downhill toward the stem, so
  the receiver runs past him at 2.7 yd/s and he finishes 6 yd behind. The
  hook on Y trails 4 yd underneath the same way. Same failure as deep man
  (G3): the carrier lets the stem eat his cushion without counting the time
  his body needs to turn and reach the receiver's speed.
- with `PASS_KICK` on (#215), the Quarter Flat #3-away scene loses its
  released #3 again: the back's flat release is walled behind the weak
  tackle's vertical kick and is 3.7 yd behind the line at 2.8 s
  (`test/quarters-trips-rules.test.ts` is pinned to `PASS_KICK=0`). Open
  question for Main Engine and Coverage: should `ROUTE_CLEAR` take the back
  around a kicking tackle, or does the scene need another release?

Resolved with the promoted defaults (staging, not coverage):
- Quarter Flat #3-away carry: the back's swing ran into the wider weak end
  and stayed behind the line, which correctly reads as a block. Staged with
  the back's flat release.
- Jet numbering: receivers are numbered outside-in at the snap, so a jet
  inside the inline end on the tracked splits is #2 on his own side. The
  test asserts the side.
- Cover 3 Match corner on #1's short out: his rule zones off and the
  judgment's squeeze-break robs the out when nothing threatens deep. The old
  assertion passed on a one-tick zone. The rep is now staged without the
  rush instead of pinning four flags.
- Weak hook's bump on across motion: a 5.3-yd slide that crosses the ball
  from 2.2 yd is a bump, not a sideline-to-sideline run. The limit is 8 yd.

<a id="cov-4"></a>
### COV-4: Defenders react late to jet motion

- **Measure** (#196, `MOTION_CHECK`): man defenders travel with the jet 8% of
  the time; NFL 47%. Other motion types land close to tracking.
- **Cause:** *confirmed:* the slot's jet speeds up in its last few tenths and
  beats a 0.3-s reaction. The reaction time wasn't tuned to close it.
- **Open:** whether the motion plan's acceleration or the reaction is wrong.
  Shifts and tight-end motion aren't modeled.
- **Changed by ALN-3:** jets now run a deeper lane around their teammates
  (2.05 vs 1.8 yd) and are a little slower at the snap (5.3 vs 6.1 yd/s, at
  5.0 vs 4.8 yd from the ball). Re-measure the travel rate on the new timing.

<a id="cov-5"></a>
### COV-5: Older coverage contracts that fail or are unproven

From the issue register:
- **Seam-gap contract fails** (COV-001): match defenders should squeeze seams
  0.4 yd tighter than spot defenders. Observed match 3.17 yd, spot 3.47 yd.
  Parked.
- **Scramble fixture** (COV-002): a seed now throws at 2.40 s instead of
  scrambling at 3.20 s. Parked.
- **Quarters approach and containment** (PASS-004): cause not resolved.
- **Mesh pre-throw stop** (PASS-007): a tested bend was rejected; no fix is
  ready.
- **Catch and pursuit tradeoffs** (PASS-001): the accepted repair keeps some
  adverse outcomes.

<a id="cov-6"></a>
### COV-6: Coverage defenders snap through big turns far too often

- **Measure** (BDB2025 week 1, CB/S/LB after the snap, provider `o`; sim
  seeds 7–8 on develop `5637ae43`, same operator,
  `scripts/data/yaw_speed_audit.py`, `yaw_capability_audit.py`):

  | | NFL | Sim |
  | --- | --- | --- |
  | 0.2 s windows with a 90°+ swing, 2–4 yd/s | 0.34% | 2.7% |
  | same, 4–6 yd/s | 0.24% | 2.0% |
  | yaw rate p90, 2–4 yd/s | 106°/s | 304°/s |
  | time for a 150°+ turn, median | ~1.5 s | 0.5 s |
  | per-path fastest 0.2 s turn, p99 | 650–790°/s | 490–550°/s |

- **Cause:** *confirmed* for the frequency. 99% of sim swings follow a
  requested facing ≥90° off the body (373 of 374 at 2–4 yd/s), mostly in
  man and zone technique: explicit facings that toggle between the QB,
  square and the receiver's velocity (`hipsOpen`, `turnRun`,
  `carryingAcross`), and track() velocity that reverses on every receiver
  stem. The motor then turns at its ceiling.
- **Caveats** (`audit`): the per-path p99 row is not a capacity measure (see
  TKL-4), and the yaw scripts default unmatched players to DB. Sim and NFL
  operators differ: the sim includes t = 0, takes speed from positions rather
  than provider `s`, and counted some windows that aren't 0.2 s long (a tiny
  effect). Many sim swings turn the body while travel barely changes
  (`G1-P145` SS: 112° body, 4° travel); on the current film 2.55% of 2–4
  yd/s windows still have a 90°+ body swing. The request-toggle diagnosis
  stands.
- **Priority:** Tanner (2026-10-23): handle next, ahead of other
  Coverage work.
- **Which branches** (develop `6ae4bd87`, seeds 7 and 8, two games each,
  `scripts/diag/coverage-turns.ts`, same windows as `yaw-sim.ts`): inside a
  coverage technique, 4.0–4.2% of 2–4 yd/s windows had a 90°+ swing. The
  man pedal-to-run flip (`hipsOpen`) led with 200–273 swings per two games,
  then the seam carry's run-past, the deep turn-and-run and the depth
  chooser dropping the facing. 703 of 705 technique swings turned the body
  while travel turned less than 30°. A fresh match technique (a
  `CoverageDefender` job change) also restarted `hipsOpen` and pedal facing.
- **Tried:** orientation technique, `src/sim/coverage/orientation.ts`, on
  in code. Each technique branch labels the facing it asks for
  (`facingTechnique` in the command trace, stage `coverage-orientation`). The
  defender keeps one orientation across coverage jobs: a change of state
  (square, open with a receiver, run) is held for 0.3–0.5 s by anticipation
  and focus unless his receiver's acquired heading breaks by 60°+; a turn
  from a cue is a rounded hip turn at half the body's turn-rate ceiling, a
  seen break gets the ceiling; running, the hips follow smoothed travel. The
  ceiling is unchanged. Spot droppers start their re-square early enough to
  arrive square. Result, 2–4 yd/s windows with a 90°+ swing: 2.82% → 0.89%
  (seed 7), 2.52% → 0.75% (seed 8), NFL 0.34%; inside a technique 0.08–0.09%.
  Yaw p90 at 2–4 yd/s 305 → 267°/s (NFL 106): the big turns still happen,
  rounded over more frames. Staged controls
  (`scripts/diag/coverage-turn-controls.ts`, 16 plays each): the flip on a
  vertical still happens on 16/16 plays, about 0.25 s later; the out beats
  press man by more (separation 0.6 s after the break 1.96 → 2.54 yd).
  PR tier against develop, seeds 7 and 8: nothing passing-related resolved;
  separation at the catch +0.05 and +0.03 yd, YPA +1.03 and +0.27, YAC
  +0.92 and +0.52 (both up, neither resolved); rush yards per carry +0.57
  and −1.30 (opposite signs, divergence).
- **Caveats:** measured with the legacy operator (#255 is still held), on
  run and pass plays, as the original entry. Off-man separation in the
  staged plays did not change to 0.01 yd with a later flip, so pedaling
  costs that corner nothing there: the hip turn has no price yet in that
  case, a possible missing cost in the motor (open question).
- **Open:** the remaining swings come from run fits, pursuit and ball play
  (behaviors outside the coverage techniques), about 0.6–0.8% of 2–4 yd/s
  windows. Measure with #255's operator once it lands. Check whether a
  pedaling corner should pay more for a late flip.

<a id="cov-7"></a>
### COV-7: A man corner can't support a run he has recognized

- **Active cost capability** (accepted base `50b80062`, subsequent candidate):
  [one installed block-look pair](reviews/cov7-abandonment-cost.md) uses fixed
  Cover1 Off / ace / roster7 / snap1, with a shared Z split and physical
  non-contact presentation. The actor-local existing alley option activates
  at.65 on both Toss and PA; it is **unconfirmed-exchange**, not acquired
  non-QB possession. PA reacquires upright Z at1.4 but takes until2.0 to
  arrest inward movement; same-clock2.4 center separation1.34→3.04yd.
  Both PA passes remain incomplete. This supplies a cost fixture, not a
  promoted defensive rule. #260/#224 are pending and excluded; raw results
  and exact final source/settings remain in the candidate PR/ignored output.
  Landed as #271 (games identical). The pilot gated on it, #269, can now
  proceed against this fixture.

- **Symptom** (`audit`, `G1-P029`, Toss with Z across motion against Cover 0):
  CB_S recognizes run at 0.65 s and sees the back carrying at 1.20 s, but
  keeps tracking Z until the runner crosses the line at 2.70 s.
- **Cause:** *confirmed,* a policy, not a perception failure. `PASS_FIRST`
  (`src/sim/behaviors/defense.ts`, on) stops a non-force perimeter man
  defender from leaving his man until the runner is past the line. It was
  calibrated so wide defenders stop bailing into blocks too early.
- **Tried** (`audit`, sandbox only): with the same seen carrying picture and
  visible blocking on his receiver, let him take his installed alley fit.
  The play went 4.56 → 0.82 yd, but he never made the tackle himself
  (closest 3.77 → 2.92 yd). P017 (pass) and P019 controls were unchanged;
  they never met the cue, so they prove nothing about play action.
- **Open:** this is the first test of a player adapting off his rule (see
  [PLAN](PLAN.md#next-after-the-film-threads)). Options: stay in man, take
  the capped alley fit, or chase. Judge against a matched halfback pass,
  stalk-then-release and delayed route, and keep force/alley duties. Not a
  special case for Toss or this receiver. Coverage with Defense.

## Ball and quarterback

<a id="ball-1"></a>
### BALL-1: Too many interceptions

- **Measure:** INT rate 5.8% (`dev-24`), 5.1% (`dev-12`); NFL 2–2.7%.
- **Cause:** one part is *confirmed*: after a breakup or a bat, the same
  defender could play the tumbling ball 0.25–0.3 s later with up to a 40%
  catch roll.
- **Fix** (`TIP_AWAY`, #190, off): INT 6.7% → 5.2%. Interceptions by the
  defender who touched the ball fall from 12 to 0.
- **Open:** the remaining excess (5.2% vs about 2.2%). *Hypotheses:* risky
  throw selection, how a contested catch is resolved, or late coverage
  producing tipped balls. These need separating.
- **#193 raises it:** its coverage rules take INT from 5.1% to 8.1% in CI,
  mostly against Cover 3 (3.2% → 9.6%), and on comebacks and shots. Being
  explained on #193. Treat it as evidence for this entry, not a reason to drop
  the rules.
- **Where it comes from** (`dev-12` splits, 34–60 attempts each, so noisy):
  short outside throws are intercepted most. Quick outs 18.8%, slant-flat
  14.7%, curl-flat 10.5%, four verticals 8.6%, stick 8.9%. Comebacks, levels and
  dagger sit at 1–2%. By coverage, cover 0 is 9.1% and cover 4 8.3%. A corner
  sitting on a short out is real football. At these rates it suggests the
  throw decision ignores a defender squatting on the route, or that the
  quick out's 6.3-yd stem (COV-3) gives him too long to break.

<a id="ball-2"></a>
### BALL-2: Throws always leave from standing height

- `PlaySim.throwBall` (`src/sim/playsim.ts`) releases every pass at z = 2.2
  yd, offset 0.3 yd along body facing, whatever the QB's support, posture or
  fall. `G1-P048`'s QB throws while falling (`audit`). A thrower can release
  before his knee lands, so this isn't proof of an illegal throw, but it is a
  seam between the body and the ball.
- **Open** (low): a release-height and support check on falling and reaching
  throws, with a body-height approximation stated. No anatomy program.

<a id="qb-1"></a>
### QB-1: Throws come out early and deep

- **Measure:** time to throw 2.55–2.59 s (`dev-12`), NFL 2.7–2.9. Average
  depth of target was 9.77 yd on Oct 8 (NFL 7.5–8.5); re-check on develop with
  the scorecard's `adot`.
- **Cause:** *hypothesis:* early pressure (PRO-2) shortens the clock, and
  open deep windows (COV-1) invite the throw.

<a id="qb-2"></a>
### QB-2: Too many scrambles, and completions slightly low

- **Measure** (`dev-12`): scramble rate 6.4% (NFL 3–5%); completion 62.6%
  (63–66%); sack rate 5.6% (6–7.5%). Pressure arriving early (PRO-2) can turn
  sacks into scrambles.
- **Measurement oddity:** play-action shots show −1.73 yd YAC per catch
  (`dev-12`, 32 attempts). Check how YAC is measured on catches behind the
  catch point before reading it as football.
- **M4 accounting diagnosis** (develop `c5667bc4`, PR tier, seed 7,
  12 games): 545 official completions include 90 negative-YAC records.
  Of those, 28 are end-zone TD catches: receiving yards stop at x110 but
  physical catch depth extends into the end zone. This invents negative YAC
  without any post-catch loss. The official statistical view now bounds those
  catches at the goal line and credits zero YAC; physical stats, intended
  depth and catch segments remain on the raw tape. The scorecard consumes
  that official view and actual completed depth, with target depth on other
  throws and the nflverse statistical goal-line bound. Unknown completed
  depth remains unknown. See the M4 PR for every affected play.
- The other 62 negatives are retained: 60 recorded endings behind the catch
  and two receivers recovering their own fumbles (zero-based game/log indices
  `G7-P159`, `G8-P157`). GSIS pp26,32–33 keeps own-recovery net yardage in the
  original receiving category. This is not a validation of movement or
  forward-progress officiating. One additional negative catch was nullified
  and excluded. On identical games, YAC changes 7.406→7.602 and aDOT
  10.020→9.196; these are measurement corrections, not improved football.
  The legacy −1.73 aggregate is not reproduced on this newer engine:
  `pa_shot` has 25 attempts/10 catches and changes 6.245→6.512 YAC.
- Raw play descriptions/replay statistics and tools that explicitly consume
  the physical tape are not rewritten by this repair. NFL statistical
  consumers need the official view; intended `airYards` is not achieved depth.

<a id="qb-3"></a>
### QB-3: Scrambling QBs fall with nobody near them (film, Oct 23)

- **Symptom** (Tanner's film, seed 7 on develop `c5667bc4`, `G1-P009` and
  `G1-P020`): the QB breaks out to scramble, then falls near the line with no
  defender visibly close to him. Tanner saw it on every scramble he watched.
- **Measure** (`c5667bc4`, seeds 7–9, one game each): 9 diving tackles that
  got a hand on the carrier: 4 on QBs, 4 on backs, 1 on a receiver. All 3
  seed-7 QB scrambles that ended this way (`G1-P009`, `G1-P020`, `G1-P120`)
  had the QB fall 0.2–0.35 s after the grab, with the diver's body center
  2.4–2.6 yd from his. On develop `4d17e43` the games diverge, but the same
  falls show up: seed 8 `G1-P111` (QB scramble, 2.3 yd) and `G1-P112`
  (receiver, 2.1 yd), seed 9 `G1-P049` (QB, 2.9 yd).
- **Cause** (*confirmed*, execution, not the controller): no slide or give-up
  is requested. The fall is `legs`: a defender who was beaten lays out from
  behind (`tryTackles` dive branch, `src/sim/tackle.ts`) and on a roll of about 5–50% (tackling against elusiveness and balance)
  gets "a hand on a foot", a hold that is all on the legs. That hold trips the
  QB, then slips (dive holds break 91–100%, TKL-1). The dive only fires when
  the carrier is already past standing-plus-lunge range (about 2.1 yd center
  to center) and up to 0.3 yd beyond it, and the hold can stretch to about
  2.4 yd (`grasp`'s `extended` adds 0.9 yd). By body geometry a laid-out
  diver reaches about 0.71 of his height from his hips to his fingertips
  (Winter's segment lengths), and a runner's trailing ankle is at most about
  a quarter of his height behind his hips: about 2.0 yd for typical sizes. So
  every dive grab is a foot the diver can't reach, and it happens instantly
  while the runner is pulling away at more than 1.6 yd/s. QBs get most of
  them because the dive needs the defender behind a runner escaping him,
  which is a rusher the QB just slipped.
- **Film:** the viewer draws the diver as a dot on the ground, not laid out,
  and the hold shows only with the contact layer on full telemetry. Even a
  reachable ankle tap would look like nobody touched him.
- **Tried:** gating the dive at that layout reach and capping its hold there
  (patch in the project files, `qb-scramble-fall/dive-layout-gate.patch`).
  It removes every dive grasp on seeds 7–9 (from 1–2 per game to 0), because
  the standing-plus-lunge range already reaches as far as a layout. Not
  landed: it deletes the mechanism rather than fixing it, moves TKL-1's
  missed-tackle counts, and needs a restaged check of the filmed plays.
- **Where:** `src/sim/tackle.ts` (`tryTackles` dive branch, `grasp`),
  `src/physics/world.ts` (leg hold, `feetLock`, trip impulse).
- **Open:** decide with TKL-1 whether a dive should exist past the lunge
  range at all, or whether the lunge range (radii plus reach plus 0.45 yd,
  which counts the tackler's radius twice) is the thing that's long. Then
  draw a diving or fallen player laid out in the viewer. TKL-5 shows the
  reach mismatch is wider than the dive.

<a id="kick-1"></a>
### KICK-1: Kicking too accurate, too many punts

- **Measure** (`dev-12`): FG 94.1% (NFL 83–87%), XP 97.9% (94–97%), punts 4.67
  per team-game (3.5–4.5). Kicking hasn't been reviewed against tracking.
- **Open:** distance bins for field goals; punts may follow from drive
  outcomes rather than the kicking game.

## Pre-snap

<a id="aln-1"></a>
### ALN-1: Defensive pre-snap picture unlike tracking

#190 and #194 measured many parts of the picture and added flags for them:
`DEF_ALIGN`, `FRONT_STRENGTH`, `FRONT_MENU`, `BOX_ALIGN`, `DEF_PACKAGE`,
`SHELL_SHOW`, `COVER_CALL`. Examples, as tracked → develop → with the flag:
- the 3 technique toward the TE vs 21 personnel: 82–86% → 27% → 74–78%;
- the weak #2 unanswered vs empty: 6% → 48% → 2%;
- dime vs 11 personnel on 3rd and 3–6: 29% → 6% → 31%.

Still off on `prof194`: two deep at the snap on runs is 38–50% (NFL 26%), and
DBs make first contact on 29–39% of runs (NFL 23%).

Not modeled: three-interior nickel looks and three-man dime fronts, which
need personnel the sim doesn't have.

<a id="aln-2"></a>
### ALN-2: Offensive formations over-compress the box

- **Measure** (#194): 12-personnel sets attach both ends, and receivers split
  14+ yd outside the end man 3–7 times as often as tracked. The 12/21 box is
  7.0 vs 6.4 tracked.
- **Where:** the formation library; `WR_ALIGN` (#190, off) sets the #1's split by
  his route.

<a id="aln-3"></a>
### ALN-3: Motion men ran into the line and the QB

- **Film** (Tanner, suite game 1 on `c5667bc4`): P007, P012, P013, P024 and
  P026. The motion man knocks the QB aside and bumps through linemen.
- **Measure** (`scripts/diag/motion-contacts.ts`, seeds 7–9, 2 games each):
  on develop, 198 of 215 across motions and 39 of 65 yo-yo motions touched a
  teammate before the snap, and so did 6 of 40 jets. With no motion, there
  were 0 touches.
- **Cause:** *confirmed: the planner.* The path cleared tackles and inline
  ends by `LINE_CLEAR` (0.65 yd) center to center, which is about the sum of
  the two bodies' radii. It ignored the QB (1.6 yd off the ball under center)
  and the backs. A yo-yo stepped 4 yd inside straight into the end or tackle.
  Separately, the body couldn't follow some clean plans: a sharp corner run
  at full speed carried him past the lane or past his set spot, and a short
  drop leg was skipped by the 0.6-yd waypoint capture.
- **Fix** (on by default): the path he will actually run (corners cut where
  `motionIntent` cuts them) keeps 0.2 yd of daylight from every set
  teammate's body. An across motion bellies back to the shallowest clear lane
  (behind a QB under center) on gentle diagonals. Corners are taken no faster
  than he can turn them (`cornerSpeed`), and the travel time models that. A
  wing starting beside his end drops straight back. A motion with no clear
  path isn't called: 13% of across calls (most need more than the 5.5-s
  pre-snap limit), about 15% of yo-yos, 2% of jets.
- **After** (same seeds): 0 touches in 348 motions (368 on develop).
- **Timing:** across motions run 4.7 s (4.3 before). Jets snap 5.0 yd from
  the ball (4.8 before; tracked median 5), 2.05 yd deep (1.8) and at 5.3 yd/s
  (6.1), so they reach the mesh about 0.1 s later; see COV-4. The planner
  now times each leg from where the body cuts the previous corner.
- **Rule (RULE-2):** 7-4-8 never fired on a motion man, because the snap
  inspection had no motion facts. It now reads the motion man's velocity at
  the snap (moving above 0.5 yd/s; toward the line above 0.5 yd/s). Nothing
  fires on these seeds, so games are unchanged by the rule.
- **P024's snap angle:** the ball is held by the QB from the start of the
  play; no center-to-QB exchange is modeled. The odd snap angle was the QB
  being knocked aside at −0.17 s, which no longer happens. Modeling the
  exchange is open (RULE-2).

<a id="aln-4"></a>
### ALN-4: Long across motions are called but not run

- **Measure** (`scripts/diag/motion-contacts.ts`, seeds 7–9, 2 games each,
  develop after #237): the planner drops 28 of 222 across calls (13%), about
  15% of yo-yos and 2% of jets. The play then runs with no motion.
- **Cause:** *confirmed.* Since ALN-3, an across motion bellies back behind
  the line (and behind a QB under center) and comes up into its spot. The
  longest crossings, mostly a wide receiver going to the far side, no longer
  fit `MAX_SECONDS` (5.5 s). A yo-yo with no room to step 1.5 yd inside isn't
  run either.
- **Open** (Tanner, 2026-10-23: logged, for later). Tanner's leaning is the
  simple fix: allow a motion to start more than 5.5 s before the snap. The
  alternatives are to set him wider, or to have the play-caller stop calling
  motions the formation can't fit (G7).

## Rules and penalties

<a id="rule-1"></a>
### RULE-1: Penalty mix unlike the NFL

- **Measure (current,** develop `ccdb69cb`, seed 7 pr tier**):** 4.6 accepted
  per team-game (seed 8: 4.2) vs NFL 5.6 (2022, team range 4.8–6.5,
  `data/reviews/nflverse/game-layer.json`), so the total is now slightly
  *low*. By type, sim vs NFL: holding 1.67 vs 1.49 (offensive 1.10 +
  defensive 0.39); illegal contact 0.83 vs 0.12; intentional grounding 0.42
  vs 0.08; offside + neutral zone 0.80 vs 0.40; false start 0.63 vs 1.06;
  roughing the passer 0.04 vs 0.17; none of DPI (0.41), unnecessary
  roughness (0.29), face mask (0.14) or delay of game (0.30). The old
  2.5–4 band was unsourced and is dropped (GAPS G6).
- **Earlier:** 6.8 penalties per team-game (`dev-24`), 7.5 (`dev-12`).
  Defensive offside about three times the NFL rate (#190).
- **By type** (develop `fdd767ab`, scorecard pr-tier games: 12 games, seed 7;
  NFL: nflverse 2023 regular season, accepted, 544 team-games). Accepted per
  team-game, sim vs NFL:
  - all: 9.17 vs 5.71. The band above (2.5–4) is below the NFL's own total;
    needs-tanner.
  - offensive holding 5.29 vs 0.89;
  - intentional grounding 1.46 vs 0.10;
  - false start 0.67 vs 1.14;
  - defensive offside 0.62 vs 0.27; neutral zone and encroachment 0.25 vs 0.24;
  - illegal contact 0.46 vs 0.16;
  - none in the sim: DPI (NFL 0.50), defensive holding (0.32), delay of game
    (0.29), unnecessary roughness (0.30), face mask (0.16).
- **Cause, grounding:** *confirmed* (G6). All 37 grounding calls were aimed
  passes, not throwaways: 25 thrown from inside a defender's grasp, the rest
  pressured misses landing 2.4–5.8 yd from any eligible receiver. 8-2-1's
  contact exception was never fed (`contactAlteredPass` always false) and
  "vicinity" meant within arm's reach of the ball's path. `GROUNDING_FACTS`
  adds both facts: 1.46 → 0.46 on identical games.
- **Cause, holding:** *confirmed* (G6). None of the 167 called holds followed a
  deliberate grab (`tryHold`): all came from the ordinary controlling grip
  (`hold = 0.25 × control × arm force`) on a defender moving off the block,
  called on a single interval of 0.15 yd/s opposing Δv. 39% came in the
  first 0.25 s of the block and 44% with the defender still squarely in front
  (|phi| < 0.5); 30% had him at or past the blocker's hip. `HOLD_LEVERAGE`
  calls a grip a hold only once the defender has leverage past the blocker
  (|phi| ≥ 1, the engagement's own "beaten at the hip") or it takes his feet:
  5.29 → 1.50 accepted per team-game on identical games.
- **Cause, no DPI or defensive holding:** *confirmed* (G6). DBs never use
  their hands on a receiver. Over 872 targeted passes in 12 pr-tier games:
  - a defender was within 1 yd of the target during the flight on 17%;
  - physical contact happened on 5.6%, all of it body bumps;
  - no hand or grasp joint and no strike occurred.

  Catch-point proximity is close to the NFL's (within 1 yd at arrival on 18%
  of 10+ yd targets vs 25%). The pass-interference detector judges grips,
  shoves and catch-restricting contact, so the gap is DB technique (G3), not
  recognition. Open: hands at the catch point (play through the hands, rake
  the arms) and a beaten DB's grab, at a discipline-set cost.
- **Cause, offside:** *hypothesis* (#190): hard counts draw defenders too
  easily. `SNAP_REACT` models the snap as perception and timing.
- **Open:** holding (above), then the missing defensive fouls.

<a id="rule-2"></a>
### RULE-2: Rule coverage incomplete

- The #189 review kept 350 unresolved rule observations and 62 explicit
  limitations. These are evidence gaps, not 350 proven fouls.
- The holding enforcement spot is fixed, but the accept/decline choice is
  simple (GAME-001).
- No snap exchange: the QB holds the ball from the start of the play, so
  the center's snap, a bad snap and a fumbled exchange aren't modeled. Film
  P024's odd snap angle was the QB being knocked aside before the snap
  (ALN-3, fixed in #237), not a center's delivery.
- Motion: 7-4-8 reads only the motion man's velocity at the snap (#237).
  Shifts and the one-second set after a shift aren't simulated.

## Coaching and play-calling

<a id="call-1"></a>
### CALL-1: Play-calling not checked against NFL tendencies

- **Measure:** pass rate 57% (`dev-24`). The concept mix by down, distance and
  field position is untested.
- **Open:** the archived evaluation plan's NFL play-call replay (E2) would test
  the engine on real calls, separately from coaching. It's the next F1 step.
  Coordinator generation is a later design.

<a id="call-2"></a>
### CALL-2: Defensive calls read raw ratings that aren't on one scale

- **Cause:** *confirmed* (#194): raw ratings put corners 7–10 points above
  receivers. A coordinator weighing man coverage by that matchup sees a 1.44×
  man advantage that doesn't exist.
- **Fix** (`COVER_CALL`, off): reads the matchup against league norms.
- **Open:** the same offset may affect other rating comparisons; see RAT-1.

<a id="call-3"></a>
### CALL-3: Pressure rate ignored the coverage shell

- **Measure** (#196): 5+ rushers from one-high 24% (NFL 38%), two-high 3% (NFL
  11%). A two-high blitz roll with no installable pressure silently rushed four.
- **Fix:** `PRESSURE_CALL` with `DEUCE` (#193, #196, off): 36% and 8%.

<a id="call-4"></a>
### CALL-4: The play-caller reads the roster, not the players on the field

- `src/game/playcaller.ts` picks from all rostered OL, the best roster
  player, the top two CBs by man rating and the top two safeties. A tired or
  benched starter still shapes the call.

## Information and awareness

<a id="info-1"></a>
### INFO-1: Players use information they couldn't have seen

From the issue register:
- **INFO-001:** teammates receive refreshed state without seeing it. A
  correction was prepared but not promoted.
- **INFO-002:** call-based anticipation can expose hidden live state.
- **INFO-003:** other controller reads still need an information review.
- **STALK-001:** a far stalk request reads the defender's hidden position. An
  isolated fix is prepared.

From the outside audit (`audit`):
- **Two routes to true possession** (*confirmed*). `onBallCaught`
  (`src/sim/assign.ts`) gives all 11 defenders `Pursuit` at the catch, which
  chases `sim.carrier`; `pursueIfLive` (`behaviors/defense.ts`) also gates on
  the true `sim.carrier`, and man coverage reads global catch and throw
  flags. On `G1-P002` (SS), delaying the swap alone or gating
  `pursueIfLive` alone changed nothing; both together moved him from 3.35 s
  and the play went 32.3 → 27.2 yd. One play, so not proof that waiting is
  more realistic. Across ten traces, 367 of 3,844 carrier queries came
  before the defender's own picture showed the catch. Fix both together
  with one acquired "who has the ball" belief, keeping anticipation from
  the ball's flight.
- **#238's first-threat reread checks true state.** `rereadThreat`
  (`blocking.ts`) skips defenders by their real `engagement` and `isDown`,
  not the blocker's picture, and ignores a helper's velocity. Fix before any
  blocker adaptation work.
  *Landed* (#258): the gate now uses the blocker's acquired pose of each
  defender, through `availableTarget`/`findWork`, including a filling
  backer's climb-to-drive transition; installed jobs keep their contracts.
  Matched runs were unchanged (2.35 vs 2.37 yd). Open: there is no
  perception channel for "engaged", so a blocker can't see that a defender is
  already taken and slightly over-corrects; helper velocity and other
  live-state reads remain.
- **#260, both possession routes** (held for rework, 2026-10-24). The
  possession belief is coherent, but removing `sim.scrambled` left no
  acquired cue for a QB who has started to run. On matched Smash plays
  scrambles of 0–3 yd became 15–25 yd (1.46 → 5.04 yd per play). A test cue
  (the carrying QB moving toward the line faster than 2.5 yd/s reads as a
  runner) brought it back to 1.47. The carrying channel itself is still
  perfect: no fakes and no occlusion. Next: add the scramble cue in the same
  PR; recompose with #256, which still falls back to
  `acquired?.target ?? sim.carrier`.
- **#256 (#225 rebuilt), engaged work-off toward the runner** (held): coherent,
  with no matched gain on runs; its scorecard moved yards per carry
  5.52 → 6.92. Waiting on Defense's native lab rerun and recomposition with
  #260.
- **Lesson from these reviews:** when a PR removes a leak, add back what a
  real player could see or do in the same PR. In matched plays the honest
  information alone barely moved designed runs; the large jumps came from
  what was deleted with the leak (the scramble cue here, the layout span in
  TKL-5).
- **Run recognition uses the global handoff time** (`recognition.ts`), whether
  or not the defender could see the mesh.

These break the model rule that players act on acquired, delayed information.

<a id="act-1"></a>
### ACT-1: Aims outlive the target they were made for

- **Symptom:** a player switches to a new target but keeps running at the old
  one's point for a beat.
- **Cause:** *confirmed.* `SnapMind.aim(job, desired, t)` (`src/sim/mind.ts`)
  returns the held point until its deadline whenever the job string matches.
  The key has no target identity. Eight production calls use it:
  `block-fit` (`blocking.ts`), `zone-drive` (`defense.ts`), four in
  `run-fits.ts`, `force-track.ts`, and `engagement.ts` (whose key already
  includes the blocker, so it is safe).
- **Measure** (`audit`, all 127 live plays of the seed-7 game, exact
  restaging): 2,915 `block-fit` and 65 `zone-drive` calls; 13 returned an
  unexpired aim made for another target (7 switches in 6 plays). Only 2
  reached the body: `G1-P095` FS picked receiver Z but ran at X's point,
  23.6 yd away (velocity (3.4, −7.2) → (4.7, +6.4) yd/s with the fix; 0.72 yd
  apart); `G1-P093` F, 0.03 yd. In the other 4 plays the stale aim was
  returned but overridden by `CLIMB_PLAN`. Outcomes were unchanged in all
  seven.
- **Not a detector:** "target changed while an old aim exists" is wrong
  (`G1-P029` RT: the new target took a contact branch and never read the
  aim). Check the ladder: stored, returned, commanded, moved the body.
- **Open:** either clear the aim when the target changes, or hold target and
  aim together until the read expires. Keying by `job:target` alone fails
  A→B→A (it returns A's old point). Same-target, no-new-cue and expired-aim
  controls must stay identical. Small shared fix; Coverage (COV-6 seam) and
  Run Game.
- **Landed:** [#251](https://github.com/tannerthardy/football-simulation-/pull/251),
  implementation `6a3f9974`, on accepted `30fbae92`, registers one current
  target index per job and invalidates the old action only on a transition.
  RunBlocker and ZoneCoverage register at selection, including branches that
  do not consume the aim. The other six aim calls retain their existing
  contracts; per-receiver observation/depth memory is not cleared. Twelve
  minimal command witnesses cover both roles, same-target cadence/expiry,
  A→B→A, a non-consuming branch and an ignored planned-climb return; they are
  explicitly not restorations of the unavailable P093/P095 audit inputs.
  The six-game paired quick check changes three games and retains three
  complete play-record sequences. Adverse YAC, fumble and penalty moves
  remain in the PR; no aggregate-yardage benefit is claimed. Merged after
  review; COV-6 work starts from it.

## Physics and movement

<a id="phy-1"></a>
### PHY-1: Contact and hand physics limits

- **Center-hand tangential law loses angular momentum** (PHY-001): a
  *confirmed* live law defect. A correction exists but is experimental.
  `audit`: nonzero in all 127 live plays; finer substeps don't remove it.
  Its football effect is unmeasured, and the `patch` hand mode changes
  several things at once, so comparing modes isn't a one-law test. It isn't
  what turned P019's linebacker (TKL-4).
- **Hands at the muscle cap** in pass protection (PRO-1).
- **Summed double-team drive** (RUN-3).
- **A slightly stronger blocker carries a square, resisting end sideways**
  (first seen on seed 10 P46, Pistol Twin TE duo, Y on DE_S, Oct 25; Y
  113 kg strength 0.77, DE 111 kg 0.62, end asking 4.1 yd/s inside, carried
  outward 1.6-1.95 yd/s for 2 s). **Diagnosed (Oct 25): the leg budget has no
  force-velocity term.** Not fixed.
  - **Reproducer** (`scripts/diag/lateral-carry.ts`): two bodies on the
    World, square, hands on, the P46 masses and strengths, the end asking
    inside with full lean. The end's feet deliver his strength cap, 1208
    kg·yd/s² (1105 N), with traction 1309 to spare. The Y's feet deliver
    1333, where his strength is capped by traction (1.1 mg). So the real
    force gap is 10%, smaller than the ratings suggest. The 125 difference
    never shrinks: the pair accelerates at a constant 0.55 yd/s² and is
    still speeding up at 3 s (1.4 yd/s, 2.1 yd). Controls:
    - equal strength: no carry;
    - same pair, end not resisting: carried at 3.1 yd/s;
    - end the stronger one: he drives the Y back.
  - **Mechanism:** in `world.ts` `feet()`, total ground force is capped by
    `max(gait, pushForce · direction · availability)` and by traction.
    Neither cap depends on speed.
    - The pusher keeps his full static force at any speed: his lean falls
      with speed, and the gait share refills it.
    - The man being driven backward gets no eccentric gain: his lean's 1.2
      credit (`clamp(1 - vp/vmax, 0, 1.2)`) is clipped by the shared cap.

    So any strength gap is a constant net force, and the carry builds on
    itself. This is not:
    - a missing traction limit: the end isn't traction-bound;
    - a bad request: the end leans inside at full strength;
    - leaked hand force: momentum ledgers close to zero.
  - **Statics:** with a linear force-velocity law F = F0(1 - v/vmax), the
    Y's ceiling at 1.65 m/s is 1220 (1 - 1.65/8.06) = 970 N. That is below
    the end's 1105 N even before any eccentric gain; measured multi-joint
    eccentric force is typically 1.1-1.3 times isometric. Sustaining 1.65 m/s
    would need the end to resist with 970 N or less, 0.89 of his weight,
    while his turf friction allows 1.1. A 10% gap should give a stalemate or
    a drift of a few tenths of a yard per second.
  - **Counterfactual** (local, not committed): the strength term scaled by
    `clamp(1 - v_along_force / vmax, 0, 1.2)` gives:
    - the P46 pair: settles at 0.41 yd/s (0.43 by hand), 0.84 yd in 3 s;
    - equal strength: still 0;
    - end not resisting: still carried at 2.5 yd/s;
    - end stronger: drives the Y back at 0.22 yd/s.
  - **Game snaps** (`scripts/diag/lateral-carry-game.ts`, seed 10 on
    b559fdc5): 51 runs with a Y, 32 Y/H/F-on-end run blocks, 4 carried
    episodes (end asking more than 1 yd/s one way, carried more than 1 yd/s
    the other, for 0.5 s or longer): 1.2-2.45 yd/s for 0.5-1.05 s. Ledgers
    close to zero. Two other causes show up:
    - Run 37 (inside zone) is the pure case: ground forces balanced at about
      1060 each, so the pair coasts at 2.4 yd/s on the speed it entered with.
      Carrying the end costs the Y nothing extra.
    - Run 4 (wide zone) is mostly the end's own command flipping (he asks
      3-4 yd/s *with* the carry at 1.05-1.45 s), then the RT's helper hands
      (1.1-1.2k outward from 2.05 s).

    P46 is a different play on current develop. A whole-game comparison
    isn't matched (every play diverges), so none is claimed.
  - **Recommendation:** fix in physics: one force-velocity leg budget in
    `feet()`. Force along his motion shrinks with speed (concentric); this is
    the propulsion half of the parked `LEG_FV`. Force against his motion
    keeps the lean's eccentric credit through the shared cap instead of
    losing it there. It's a realistic law, so it lands on by default in its
    own physics PR, with law tests (equal-strength stalemate, bounded drift
    for small gaps, free running and the sprint curve unchanged) and matched
    restages. Owner: Main Engine. The end's flipping command on run 4 is a
    Defense controller question, not physics.
- **Raw hand operator trusts stale contact validity** (PHY-004): a synthetic
  input contract; not shown to happen in real play.
- **Withdrawn:** `LEG_BIND` broke the rear-finish load contract (#190); the
  repair belongs in physics.

<a id="phy-2"></a>
### PHY-2: Movement detail that's costly or unproven

- Accurate grip timing is costly and not fully composed (PHY-002).
- Long-hold balance and recovery history diverges (PHY-003).
- Anatomical feet and soles are paused research, not production.
- Vertical and airborne motion, and richer hand and foot detail, are
  deferred (MODEL-001). They return only for a repeatable failure that a
  simpler model can't express.

## Players and ratings

<a id="rat-1"></a>
### RAT-1: Ratings and capability mappings uncalibrated

- How ratings map to physical capacity, and contact capacity itself, have no
  calibration (DATA-001). CALL-2 is one visible symptom.
- **Open:** the Big Data Bowl 2027 combine-to-game links
  (`docs/reviews/bdb2027-data-review.md`) can calibrate speed, size and
  strength traits.

<a id="rat-2"></a>
### RAT-2: Team habits drawn without within-team scatter

- `aGapHabit` and `alignStyle` give each team one fixed draw. Tracked teams also
  vary within themselves (A-gap sd 0.23), so our spread is narrower than real.

<a id="rat-3"></a>
### RAT-3: Ratings with no effect on the field

- `leadBlock` is generated and weights FB/H-back selection (`roles.ts`), but
  nothing in `src/sim` reads it (`audit`: ratings 1/50/99 give identical
  commands). Don't generalize: recognition and awareness do change decision
  timing (`audit`: coverage recovery 0.15–0.30 s by trait).
- **Open:** wire a trait to a technique channel only once that channel
  works; check other ratings the same way.

## Game layer and accounting

<a id="game-1"></a>
### GAME-1: Game-rule and accounting defects from the Oct 8 review

**Resolved** in `b0503c10` with scenario tests:
- dead-ball fouls using a down;
- holding unable to wipe out a touchdown;
- partial stat rollback on accepted holding;
- a completion lost to a later fumble;
- overtime ending on a tying TD and PAT;
- 3rd and 4th-down touchdowns skipping conversion counts;
- the two-minute warning restoring elapsed time;
- RNG forks depending on creation order;
- process-global player IDs;
- sprint endurance missing from the integrator.

Later fixes: retained-snap credit and air depth (GAME-002), two-point energy
writeback (GAME-003). On 2026-10-22, a false start at the 3 with a back
standing in the end zone was enforced as a safety and spotted on the goal
line, which crashed the next play; pre-snap fouls are now half the distance
(#211, which also rules a restricted teammate recovery dead in its own end
zone).

<a id="game-2"></a>
### GAME-2: Remaining accounting limits

- The historical baseline audit misses two takeaways in an INT → return
  fumble → recovery sequence. Current candidate games reconcile (#189).
- Compare results through official credit, not raw nullified results.
- **M4 follow-up, separate from the end-zone correction:** on `c5667bc4`,
  zero-based game/log indices `G6-P094`, `G9-P134`, `G11-P092` have receiver
  fumbles recovered by opponents behind the fumble spot. Existing reception
  credit stops at the fumble spot; GSIS pp32–33 requires the lesser advance
  or recovery spot. The raw YAC values are positive, so this does not explain
  the audited negative-YAC anomaly. A complete allocation repair must change
  receiving/passing yardage too, preserving physical endings, returns and
  possession credit. It is outside M4's YAC/air-only correction; no yardage
  adjustment or new fumble allocation is silently included.

## Speed and tools

<a id="perf-1"></a>
### PERF-1: Games are slow to simulate

- **Historical measure:** 31.5 reported CPU s per game (`dev-24`), with
  43–70 s reported for `dev-12` and 60–80 s on some games. The original
  timing operators/hardware must be retained; scorecard `ms` is elapsed, not
  CPU. The legacy engine's reported 1.2 s is not a matched throughput comparison.
- **Merged bounded repair:** #204 at `53d5c241` removes repeated lean-release
  closures without changing physical calculations. On one worker, six quick
  games use 180.117→154.302 measured child CPU seconds and 155.609→130.278
  elapsed seconds; the compiled ordinary-game control saves 5.7% CPU / 6.1%
  elapsed. All six records/probes and two full native state/RNG traces match;
  existing PR-tier CI matches 1,488 play records across 12 games per arm.
  These are sequential workload-specific results, not universal throughput.
- **Profile:** #204's complete sampling tally places 58% in World and 10.7%
  in lean-release function creation/naming. The earlier 43% was partial;
  sampling shares are not measured CPU. [Exact pins, failures and limits](https://github.com/tannerthardy/football-simulation-/pull/204).
- **Effect:** a CI comparison (12 games each for the base and the head)
  takes about 13 minutes, and the
  `game-record` integration tests hit their 60-s budget on a loaded machine
  (#193, #194).
- **Plan:** a guardrail for now (flag a slowdown over 10%). Optimize after G1
  and G2 (F2).

<a id="perf-2"></a>
### PERF-2: Measurement noise and tooling limits

- M3: [`test/scorecard-bands.test.ts`](../test/scorecard-bands.test.ts) checks each sourced band against committed NFL reference keys: equal-weight 2022–2023 team-season p10–p90, linearly interpolated, rounded to 2 decimals. These are descriptive ranges; target approval remains with Tanner. Unsourced values remain explicit, including the unverified PFF definition and game-layer bands waiting on M1.
- M3 `passRate`: 56–62% → 54.43–66.33%, from `reference.json#teamSeasons[].dropbackShare.percent`.
- M3 `comp`: 63–66% → 60.59–68.09%, from `reference.json#teamSeasonRanges.completion`.
- M3 `ypa`: 6.8–7.2 → 6.35–7.89 yd, from `reference.json#teamSeasons[]` completion yards × completions / throws; the 9.78–12.00 yards-per-completion range is a different measure.
- M3 `sack`: 6–7.5% → 4.61–9.36%, from `reference.json#teamSeasonRanges.sackPerDropback`.
- M3 `int`: 2–2.5% → 1.47–3.15%, from `reference.json#teamSeasonRanges.interception`.
- M3 `comp20`: 7–9% → 6.66–11.08%, from `reference.json#teamSeasonRanges.twentyYardCompletionPerThrow`.
- M3 `yac`: 4.8–5.6 → 4.53–5.91 yd, from `reference.json#teamSeasonRanges.meanCompletedYAC`.
- M3 `scramble`: 3–5% → 2.18–7.32%, from `reference.json#teamSeasonRanges.scramblePerDropback`.
- M3 `ypc`: 4.1–4.5 → 3.70–4.83 yd, from `reference.json#teamSeasons[].designedRun.yards.mean`.
- M3 `stuff`: 16–20% → 15.89–23.54%, from `reference.json#teamSeasonRanges.stuffPerDesignedRun`.
- M3 `run10`: 10–12% → 7.58–12.87%, from `reference.json#teamSeasons[].designedRun.explosive.percent`.
- 12 games give wide intervals. Pressure rate is ±8–11 points at 4 games per
  arm, and 5-point precision needs 22–42 games per arm (#191).
- With about 30 metrics at 90% intervals, about 3 false "moved" readings are
  expected per comparison (#192).
- `baseline-runner.test.ts` requires the supported Node 22.23.3. The earlier
  three failures on Node 22.22 do not reproduce on that runtime (#203 and
  combined checkpoint: all five baseline-runner checks pass).
- Earlier `test_orientation_motion_audit` failures/errors were reported on
  #190's tip (#194). All seven orientation checks pass on the assembled
  #202/#203/#204 candidate. This does not claim the complete data suite passed.
- The NFL play-call replay isn't built yet (CALL-1).

<a id="perf-3"></a>
### PERF-3: The mechanics guard passes on missing data; Python tests not in CI

- **Current follow-up:** #249 repairs the missing-evidence guard. The separate
  `.github/workflows/data-tests.yml` adds normal offline Python discovery,
  including those guard cases, on Python 3.12 with declared dependencies;
  reference-only changes do not schedule extra games. The observations below
  describe the original audit; the precision comment remains a separate issue.
- `scripts/mechanics/compare.py`: a guarded metric with no sim data falls
  into the "too few" branch, gets no mark, and counts as still matching. An
  empty sim file prints "12/12 matched metrics still match" and exits 0.
- `.github/workflows/tests.yml` runs `npm test` and `test:integration`, not
  `npm run test:data`.
- `scripts/mechanics/metrics.py` says the sim records positions to 0.1 yd;
  it records hundredths (`playsim.ts`). It changes the DB/LB decel p90 a
  little (6.93 → 6.66 on current film).
- **Resolved** (#249, #253): missing or empty metrics now fail, and the
  data tests run in CI (`data-tests.yml`). Still open: `metrics.py` says
  the sim records 0.1 yd (it records hundredths). Wording only.

<a id="perf-4"></a>
### PERF-4: Scorecard labels claim more than they show

- `scripts/scorecard/run.ts` calls an interval that includes zero "noise" and
  heads a section "Biggest real moves". With ~30 metrics at 90% intervals,
  ~3 false moves per card are expected (PERF-2). Rare rates (17/17 FGs) show
  100–100% intervals.
- **Resolved** (#257): intervals that include zero read "not resolved by
  this sample", and rare rates show their counts.

<a id="perf-5"></a>
### PERF-5: Film detectors' precision unknown

- The #243 detectors are scouts, not error counts. The stuck-blocker scout
  fired on 163 of 262 seed-7 runs; 14 of Tanner's 19 flagged plays were hit,
  which says nothing about the 252 unflagged clips. A turned body can be
  correct coverage technique.
- **Open:** Tanner's real/false call on a sample of the 252 clips gives each
  detector a precision. Stop adding detector types when diagnosis, not
  discovery, is the bottleneck. Never tune the engine to make detector
  counts go away.

<a id="perf-6"></a>
### PERF-6: The same lineup in a different order plays a different game

- **Cause:** *confirmed* (`audit`). `PlaySim` builds actors from
  `Object.entries(setup.offense/defense)` (`src/sim/playsim.ts`), and snap
  planning, assignment and rusher plans draw from a shared stream in actor
  order; `common.ts` pursuit error keys on the numeric actor index. All 18
  reordered comparisons (identical players, slots, call and seed) diverged
  within 0.1–0.6 s. Canonical order made them exactly equal. The same input
  replays exactly, so this is not bias; it breaks paired experiments and
  "re-run this play" (VIEW-1).
- **Also:** at a catch the behavior is swapped to Pursuit before the frame
  is recorded, so the replay labels a coverage command as Pursuit's
  (`telemetry.ts`). Several stages rewrite a command after the behavior
  (containment, engagement technique, tackle bond, spacing, snap guard);
  the final intent alone can't say who decided it.
- **Resolved** (#252, #250): actors are built in a fixed slot order and
  the per-player streams keyed on actor index no longer depend on input
  order; the selective command trace records
  who owned each command. #254 adds saved-play capture and replay on top.

<a id="view-1"></a>
### VIEW-1: Reviewing film is hard and can mislead

A long-term goal (Tanner, 2026-10-23), not a scoped task. Refine it as we
learn what's needed.

- **Symptom:** film review is how Tanner finds most real problems, but the
  viewer doesn't give him all the information he needs, and some of what it
  shows may mislead. We don't know how many apparent problems come from the
  drawing rather than the football. Known example: [QB-3](#qb-3), where a
  diving tackler is drawn as a dot on the ground, hiding the acquired leg
  hold. A clearer drawing does not establish that acquisition was geometrically
  valid; that is a separate [reach question](#tkl-5).
- **Goals:**
  - Show the best information for judging a play: what each player was
    asked to do, what his body actually did, contact and reach, facing, and
    what he could see.
  - Fix visuals that misrepresent what happened.
  - More control for looking through plays: finding, filtering, stepping,
    comparing.
  - Possibly a full program of its own where Tanner can run and test things
    himself: move players, put in his own calls and situations, re-run a play.
  - A way to flag a problem that agents can act on precisely: the play,
    the player, the moment and what looked wrong, recorded in a structured
    form rather than only in free text.
- **Already exists:** the sim suite film room with notes saved per play, the
  replay viewer's layers ([VISUALIZER_PLAN](VISUALIZER_PLAN.md)), and #243's
  film detectors. The viewer's [copyable play reference](../viewer/replay.template.html#L596)
  already includes film identity, play, timestamp and the selected player.
- **In progress:** [Play Lab](PLAY_LAB.md) (`npm run lab`). Tanner builds
  plays and situations, runs them on the real engine, and studies them with
  these layers: requested vs achieved motion, command owner, delayed
  perception, reach and contact, falls, ball flight, pursuit intercepts and
  run fits. Player moves are labelled coach's-hand interventions. Notes
  restore their exact moment headless with `npm run lab:replay`. Still to
  come: branching from a moment (it needs engine snapshot/restore), scripted
  situations, A/B batches and an agent hand-off export.
- **Open:** the outside audit's suggestions on drawing intent versus achieved
  motion and showing reach and contact are now lab layers; whether the shared
  replay viewer should adopt them is open.

## Repository and process

<a id="repo-1"></a>
### REPO-1: Repository and process debt

- GitHub's default branch is still `claude/football-sim-engine`, verified
  2026-10-22; the trunk is `develop`. See the [dated branch map](BRANCHES.md#verified-entry-points--2026-10-22) (REPO-001).
- The roughly 20 older Codex drafts (#86–#166) and #114 were a prior audit
  snapshot, not the current ready queue. Their uncertain dispositions remain
  separate; this checkpoint does not close or merge research to tidy the list.
- Before this factual refresh, tracked `docs/` totaled 131,719,397 bytes
  (about 125.6 MiB), including the source-diagram library and research. This
  is not 128 MB of disposable receipts. Fixtures and unique evidence remain.
- [FLAGS](FLAGS.md) is the source-checked switch inventory; #210 promoted
  its documented defaults. Counts and expiry decisions belong there rather
  than being duplicated in repository status. This navigation cleanup changes
  no source default.
- **Two meanings of "default":** historical `baseline:run` profiles can
  override source defaults; `prof194` used 13 enabled profile flags. #210
  subsequently changed the code defaults recorded in FLAGS. Scorecard/game
  results describe their actual source and overrides, not a moving branch name.
- STATUS, INTEGRATION, ISSUES and WORKBOARD preserve the old process;
  PLAN/GAPS replace their operating instructions. Navigation-only maintenance
  preserves evidence in place; no directory move follows.

## Not modeled yet

<a id="miss-1"></a>
### MISS-1: Football that isn't modeled yet

- League, seasons, rosters over time, the management game (G8).
- Offensive shifts and tight-end motion (#196). Four motion types exist
  behind `MOTION`.
- RPOs, screens and a broader short-yardage package were listed as missing on
  Oct 8. Check the playbook before working on them.
- Three-interior nickel and three-man dime personnel (ALN-1).
- Coordinator generation: how each team's scheme is created (#194).
