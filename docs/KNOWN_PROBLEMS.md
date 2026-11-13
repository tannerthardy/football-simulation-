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
| `weekly-2026-10-26` | The dated weekly-plan comparison at `a5b024b9`, PR tier, seeds 7 / 8. Seed 7 checked against an existing matching-source CI base card; seed 8 remains plan-supplied. See the evidence qualification below. |
| `NFL` | Mostly Big Data Bowl 2025 tracking (2022, weeks 1–9). The outcome bands are the scorecard's. |

<a id="weekly-check-2026-10-26"></a>
### Current dated comparison: weekly check at `a5b024b9`, 2026-10-26

Source: develop
[`a5b024b9fbf8c51fc31401eefb79737be586814a`](https://github.com/tannerthardy/football-simulation-/commit/a5b024b9fbf8c51fc31401eefb79737be586814a),
PR tier, seeds **7 / 8**, 12 games each as reported in Tanner's October 26
weekly-plan handoff. These identify where to inspect; they are not tuning
targets or measurements of every later develop head.

| Metric | Seed 7 (checked saved CI base) | Seed 8 (plan-supplied) | NFL comparison |
| --- | --- | --- | --- |
| Points / team-game | 43.6 | 38.1 | 21–23.5 (unsourced) |
| Rush yards / carry | 6.19 | 4.40 | 3.70–4.83 |
| 10+ yd runs | 16.1% | 11.4% | 7.6–12.9% |
| Missed + broken tackles / play | 0.29 | 0.27 | 0.11–0.16 (source unverified: PFF, definition unknown) |
| Yards / attempt | 10.54 | 10.01 | 6.35–7.89 |
| YAC / reception | 8.88 | 8.66 | 4.53–5.91 |
| Scramble rate / dropback | 1.4% | 1.4% | 2.2–7.3% |
| Sack rate / dropback | 9.0% | 10.0% | 4.6–9.4% |
| INT rate / throw | 4.3% | 3.3% | 1.5–3.2% |

**Evidence checked without rerunning games:** the saved
[#300 CI scorecard](https://github.com/tannerthardy/football-simulation-/actions/runs/40362404508)
([artifact 12669557335](https://github.com/tannerthardy/football-simulation-/actions/runs/40362404508/artifacts/12669557335))
contains `base.json` pinned to the full `a5b024b9` source above, dated 2026-10-26,
seed 7, 12 games/two leagues, Node 22.23.3, two workers and the `missedBy`/`weird`
probes. Its recorded settings are retained in the artifact. Its rendered base
values match all nine supplied seed-7 figures; scramble is **15/1,061**
dropbacks. The raw seed-8 weekly card was not available in this refresh, so its
figures are attributed to the supplied plan, not an independent reproduction.
No unavailable weekly quantities are filled from an older snapshot. NFL
percent ranges here use the plan's rounded presentation; this does not change
the scorecard's underlying definitions or the GAPS stopping criteria.

**Subsequent accepted correction:** [#300](https://github.com/tannerthardy/football-simulation-/pull/300)
merged at `d81befa1ff33404c19781585f2b3e2a3b6bd29fc`. It adds silent blocking
responsibility transitions to the selected command trace, not a new blocking
policy. The existing CI artifact's base/head arms have exactly matching
football/probe records (12 games, 1,609 play records), excluding only the
explicit wall timers `game.ms`, `game.probe["weird.ms"]` and `game.weird.ms`.
The artifact labels its head as the CI merge `b82fe671`; its engine content
matches the accepted #300 source. This is a saved seed-7 observer comparison,
not a fresh seed-8 card or evidence of improved football outcomes.

Whole-game sampling is noisy, and games with the same seed can diverge after
the first changed play. Use matched snaps and first changed requests to judge
mechanisms; do not restore historical endings or infer a universal noise floor.
The dated YAC study retained below has its own source, sample and uncertainty;
its numerical spread is not a general threshold for other metrics or cohorts.

### Earlier: develop at `211db9cc`

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
| [RUN-7](#run-7) | The lead puller misses a Mike stacked inside his path | G2 | medium | partly fixed |
| [RUN-8](#run-8) | Center covered on almost every snap | G2 | medium | on |
| [RUN-9](#run-9) | Front and edge alignment unlike tracking | G2 | medium | on |
| [RUN-10](#run-10) | Older run-blocking and second-level issues | G2 | low–medium | open |
| [RUN-11](#run-11) | Staged scenes recorded on arm-force hands or true-velocity mirroring | G2, G5 | low | pinned until review 2 |
| [RUN-12](#run-12) | Run blockers lost on their assignments (film, Oct 23) | G2 | high | in work |
| [RUN-13](#run-13) | Box backers untouched: linemen do not climb free to the second level | G2 | high | in work |
| [RUN-14](#run-14) | Engaged DL lose the backside shoulder; play-side DL drift away from the play | G2 | medium | open |
| [RUN-15](#run-15) | Backs leave the mesh too early and take the handoff almost standing | G2 | high | fix with the start law (#336) |
| [RUN-16](#run-16) | Draw: the line does not block the rush while it shows pass | G2 | high | in work |
| [RUN-17](#run-17) | Gap-scheme backside DL stop chasing once the squeeze reads only a seen carrier's lateral track | G2 | medium | open |
| [RUN-18](#run-18) | An engaged edge past his containment bound kept widening on his held flow | G2 | medium | resolved |
| [RUN-19](#run-19) | Run blockers keep a grip only by the pass-rep frame rule | G2 | medium | open |
| [TKL-1](#tkl-1) | Too many missed and broken tackles | G1 | high | in work |
| [TKL-2](#tkl-2) | Pursuit angles and speed unlike tracking | G1 | high | in work (#259, #263, #267 landed; aim jump named) |
| [TKL-3](#tkl-3) | Fast receivers break catch tackles twice as often | G1, G3 | medium | open |
| [TKL-4](#tkl-4) | Defenders turn their backs on the ball carrier | G1 | medium | on |
| [TKL-5](#tkl-5) | "Reach" means different things in each tackle branch | G1, G10 | high | in work (#264 needs rework) |
| [TKL-6](#tkl-6) | An engaged tackler's miss is a flat bonus, not his reach, balance or the blocker's hold | G1 | medium | open |
| [TKL-8](#tkl-8) | The tackling rating slows a defender's approach | P1 | low | open |
| [PRO-1](#pro-1) | Edge rushers meet the tackle at the line and walk through him | G5 | high | in work (G5, #215) |
| [PRO-2](#pro-2) | Pressure arrives too early and from the wrong places | G5 | high | open |
| [PRO-3](#pro-3) | Interior pairs move as one block | G5 | medium | open |
| [PRO-4](#pro-4) | The QB doesn't slide away from an edge | G5 | medium | open |
| [PRO-5](#pro-5) | No pass protection calls | G9 | high | open (rusher read from sight: `PRO_READ`, on) |
| [COV-1](#cov-1) | Zone defenders barely close while the ball is in the air | G3 | high | paused (#324 diagnosis) |
| [COV-2](#cov-2) | Too much yardage per attempt and after the catch | G3 | high | open |
| [COV-3](#cov-3) | Coverage rules and calls not yet complete | G3 | medium | in work (#193) |
| [COV-4](#cov-4) | Defenders react late to jet motion | G3 | low | on |
| [COV-5](#cov-5) | Older coverage contracts that fail or are unproven | G3 | high | open (next for Coverage) |
| [COV-6](#cov-6) | Coverage defenders snap through big turns far too often | G3 | high | on (orientation technique); run-fit and ball-play turns open |
| [COV-7](#cov-7) | A man corner can't support a run he has recognized | G1, G3 | medium | paused; broader cost-fixture requalification first on resume |
| [COV-8](#cov-8) | Trailing man defenders can't find the ball | G3, G4 | high | open (logged with the throw-sight change) |
| [COV-9](#cov-9) | A man defender overruns a turning receiver once nothing slows his pedal | G3 | medium | open (logged with #394; Coverage paused) |
| [REC-1](#rec-1) | Receiver options and continuation can contradict available information or route intent | G3, G10 | medium | candidate: acquired route reads; catch/release limits remain |
| [COV-10](#cov-10) | Sim route releases are too fast and too vertical, so release-keyed reads get no hard negatives | G3 | medium | open (needs an owner: offense route runner) |
| [BALL-1](#ball-1) | Too many interceptions | G4 | high | flag (partial) |
| [BALL-2](#ball-2) | Throws always leave from standing height | — | low | open |
| [QB-1](#qb-1) | Throws come out early and deep | G3, G7 | medium | open |
| [QB-2](#qb-2) | Scramble frequency and escape-lane criteria | G5, G7 | low | open |
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
| [INFO-1](#info-1) | Players use information they couldn't have seen | G10 | high | in work (#258, #274, #280, #282 landed; jet-sweep give cue open) |
| [ACT-1](#act-1) | Aims outlive the target they were made for | G10 | medium | on (#251) |
| [PHY-1](#phy-1) | Contact and hand physics limits | F2, G5 | medium | open |
| [PHY-2](#phy-2) | Movement detail that's costly or unproven | F2 | low | open |
| [PHY-4](#phy-4) | A sub-maximal speed request is approached slowly (by design; note for controller authors) | F2 | low | note |
| [FAT-1](#fat-1) | Starters never rotate: DL, edge and RB play every snap | — | medium | partly fixed (#298); visible-fade cue open |
| [FAT-2](#fat-2) | Fatigue too small to matter: linemen go full power every snap | — | medium | fixed (#298); rush-fade slope noisy under rotation |
| [FAT-3](#fat-3) | No fade within a long engaged rep | — | low–medium | open (waits on Move 1, `world.ts`) |
| [FAT-4](#fat-4) | Fatigue doesn't feed tempo, pacing or coaching | G7 | low | open |
| [RAT-1](#rat-1) | Ratings and capability mappings uncalibrated | — | medium | open |
| [RAT-2](#rat-2) | Team habits drawn without within-team scatter | — | low | open |
| [RAT-3](#rat-3) | Ratings with no effect on the field | — | low–medium | open |
| [RAT-4](#rat-4) | The pursuit rating gives no player a lasting pursuit habit | P1 | low–medium | open |
| [RAT-5](#rat-5) | Acceleration and change of direction are not player traits in motion | — | medium | open |
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
  (#190, off) kept deep defenders from taking force; the flag was removed
  2026-11-10 (docs/REFERENCE_STACK.md, "Pruned after run-ref-16").
- **Where:** `run-fits.ts`, `defense.ts`; `scripts/diag/long-run.py`.
- **Open:** whether fixing RUN-1 lets the safeties stay deep on their own.
- **Not grip** (#217, Run Game `taillab.ts`). 32% (`GRIP_HOLD` off) and 38%
  (on) of 40+ runs have no contact past 5 yd. The deep defender reaches the
  runner in 41–42% of them, and breaks are 34–36% either way. The tail is
  about arrivals.
- **Related post-catch support seam:** historical film `eef43dcc` G6-P018
  has an acquired H carrying picture, but the stalk-contact controller only
  accepts QB/RB holders. Its release check already accepts any acquired
  holder. The scoped repair uses that same ambiguity-checked observation
  contract for contact support, retaining force leverage, decision cadence
  and physical shedding. This is not a diagnosis of every long run or block:
  sustained frontal contact and repeated reacquisition remain separate limits.

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
- **Partly fixed (2026-10-27, `run/G2-pullers`).** Measured with #335's
  `matched-restage.ts` on develop `a58ebc2d` (yaw and leg force-velocity law):
  run-only snaps from seeds 7/9/11/13 (456 snaps), each played on its saved
  dice and 4 shifted streams, develop vs this branch. Tables use #340's
  0.1k s trace clock. Rows are the shared puller rule (power/counter/trap).
  - The pull step opens to the play side (`PULL_STEP` removed). Kick and lead
    corners sit 0.45/0.35 yd behind the puller's own stance; the observed wall
    takes more depth where its bodies need it. Moved at 0.5/1.0/1.5 s, power
    0.21/0.82/2.13 to 0.26/1.15/2.53 yd, counter 0.21/0.81/1.93 to
    0.28/1.14/2.50 (NFL 0.49/1.77/3.31 and 0.48/1.82/3.43). Deepest point
    1.67/1.57 to 1.70/1.42 (NFL 1.31/1.45). First touch 2.4/2.3 to 2.1/2.0 s
    (NFL 1.6/1.6).
  - A kick or trap man the runner has already passed is out of the play: the
    puller turns up (`pull: kick man behind the runner, turn up`), and does not
    retreat after an end going deeper behind the ball. Kickers whose first
    block is on a man deeper than the carrier: counter 30 to 2, power 32 to 5,
    trap 11 to 4.
  - A lead puller (and a kicker who turned up) blocks the first threat in the
    hole from his own pictures (`pull lead: first threat in the hole`). He
    reads once he has cleared the wall, leaves a teammate's called kick man to
    that puller, takes a free man before one he sees on a teammate, and
    finishes a man he is closing on. Counter leads engage 7% to 35% (power
    10% to 52%); first blocks on a man deeper than the carrier 2 of 13 to 5 of
    62 engaged.
  - Still open: box backers touched before the carrier reaches them do not
    move (power 0.64 to 0.62, counter 0.60 to 0.57; NFL 0.91/0.86). A lead
    loads a backer before the runner reaches him on only 4 of 178 counter
    leads; pullers still reach the hole late (speed off the ball, Main
    Engine's ramp). Trap is slower with the open step (moved at 1.0 s 1.20 to
    0.98 yd, first touch 1.8 to 2.0 s). Two attempts to let a trapper fit a
    penetrator already through the wall without first clearing it failed
    (G1-P112), so the trap keeps its installed corners.

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

<a id="run-14"></a>
### RUN-14: Engaged DL lose the backside shoulder; play-side DL drift away from the play

- **Symptom** ([`dl_lag.py`](../scripts/diag/dl_lag.py), BDB weeks 1–2 vs the
  engaged-flow matched restage, 0.3–1.0 s after the snap):
  - Backside DL beside a blocker keep his backside shoulder (behind him at
    1.0 s) 46–49% of the time; NFL 74%.
  - Backside DL move toward the play at 0.57–0.61 yd/s; NFL 1.34.
  - Play-side DL move *away* from the play at −0.27 yd/s; NFL +0.47.
- **Cause:** not yet traced. Both develop and the engaged-flow change
  ([review](reviews/engaged-flow.md)) show it. First question: whether the
  play-side drift is the defender's own request or blockers driving him. If
  it's the blockers, the pair ticks go to Main Engine for the contact side.
- **Related, not this item:** DL first carrier contact happens behind the line
  61–69% of the time (NFL 30%). That's line-of-scrimmage displacement and
  mesh depth, Run Game's. The carrier's 0.2–0.3 yd after that contact (NFL
  1.45) is forward drive through contact, Main Engine's.

<a id="run-17"></a>
### RUN-17: Gap-scheme backside DL don't chase without a puller read

- **Symptom** ([`dl_scheme.py`](../scripts/diag/dl_scheme.py), run-only r7/r11, k = 4):
  - On power, counter, trap and duo, backside DL move toward the play at
    +0.10 yd/s from 1.0 to 2.0 s after the snap (NFL +1.13; before the
    squeeze read, +0.44).
  - Gap runs gain 3.39 → 4.07 yd, 10+ yd 8.8% → 10.3%.
- **Cause:** *confirmed.* DL_SQUEEZE now takes the play's direction only
  from a carrier the DL has seen take the ball, running a lateral track
  ([squeeze-read](reviews/squeeze-read.md)). That fixes zone, where it
  misread the back's mesh path. But a gap back runs downhill, so the read
  waits, and a backside DL facing a gap-scheme cut-off holds. The old
  misread happened to send him toward the play.
- **What should drive him:** what real DL key on gap schemes: the line's
  flow and the pulling guard ("pull, follow the guard"), not the back.
- **Next:** a line-flow / puller read for the squeeze and the backside
  chase, as its own PR (CEO, 2026-10-28).

<a id="run-18"></a>
### RUN-18: An engaged edge past his containment bound kept widening on his held flow

- **Symptom:** on seal-hold (I-jumbo duo, seed 1) with the squeeze read
  (#365), the strong end travels 2.0–2.7 yd outward under a loaded seal.
  At 1.00 s he is outside his containment bound and still asks +1.11 yd/s
  outward (independent trace on #365).
- **Cause:** *confirmed.* The engaged-flow law (#347),
  `flow = held + 3·(target − y)`, set `target` to his own y once he was
  wider than containment needs, but still added the held flow. The old
  squeeze misread hid it by overriding the request inward.
- **Resolved:** while the bound applies, an outward held flow is dropped
  ([contain-flow](reviews/contain-flow.md)). The bound is not too tight:
  with #365 the edge moves toward NFL's position against the last blocker
  (1.5 s: +0.18 → +0.07 yd outside him; NFL −0.03). Develop restage:
  −0.36 ± 0.22 yd per run, on wide zone, toss and trap.

<a id="run-19"></a>
### RUN-19: Run blockers keep a grip only by the pass-rep frame rule

- **Symptom:** `OPEN_HANDS` (engine-52) bounds run-block steering to friction
  under the hand. A run blocker keeps a grip only by the pass rep's frame rule,
  which is drawn against the line to the quarterback. In football, a seal or
  reach block keeps cloth while his body is between the defender and the run's
  path.
- **Measure:** the fixed run set fell 3.86 → 3.59 yd a carry at engine-54. The
  canaries are duo and toss.
- **Cause:** *likely*: there is no run-specific frame (named by Flex,
  2026-11-13).
- **Open:** a run-specific frame for the grip: inside it while the blocker's
  body is between the defender and the run's path.

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
- **Effort read tried** (draft, [evidence](reviews/pursuit-effort-read.md),
  2026-10-25): sprint when he can still get there and is the last man or one
  of the two best placed, pace otherwise. It turns P002 into a 25-yd tackle,
  but on matched games it doesn't lower yardage (develop −0.20 ± 0.19 yd/play;
  on #273 +0.64 ± 0.26), and even every pursuer at full effort adds yards on
  #273 (+0.33 ± 0.22). Effort isn't the lever; arrivals don't convert. Matched
  pass plays also clear #251, #258 and #267 of the YAC rise. **Next:** the
  arrival (gather braking against a fast runner, the jumping intercept), then
  re-test effort on top.
- **Re-steer cause named** ([evidence](reviews/pursuit-resteer-cause.md),
  2026-10-26): two more aim attempts failed (intercept lifetime, heading
  damping). On the same operator as NFL, pursuers at or above the runner's
  speed re-steer at the NFL rate beyond 3 yd. Slower pursuers re-steer 2–3×
  the NFL rate at every distance (44% vs 15% inside 3 yd), which is about 76%
  of the excess. 58% of their re-steers come from the close gather: the
  near-hip arrival asks a slower body to match the runner's across speed, so
  the line of sight rotates every step (the slow hip chase). **Next
  (proposed, not built):** bypass to the near hip only when his attainable
  speed covers the runner's across speed; otherwise keep the intercept line.
- **Aim jump named** ([evidence](reviews/pursuit-aim-jump.md), 2026-10-26,
  develop `a27ccd84`):
  - **Mechanism: forecast acceleration whiplash on a marginal chase.**
    `pursuitPoint` turns one 0.2 s difference of seen speed into a trend
    (V = speed + acceleration·τ). Ordinary runner speed changes are within
    NFL's range on the same operator, yet they swing V by 1–3 yd/s.
  - For a slower pursuer the chooser's slack curve is near-tied, so that swing
    flips feasible↔fallback or hops the least-bad point between t = 0 and the
    horizon.
  - Slow pursuers at 6–15 yd, 8,375 windows: holding only the acceleration
    term equal removes 35% of intercept jumps and 51% of aim turns over 15°.
    No other input removes more than 8% / 20%.
  - Frozen reproducers: s7 G1-P115 LB_W at 3.05 s (the acceleration term
    alone flips F 2.9 → B 3.0) and s8 G1-P111 LB_M at 3.60 s (fallback hop).
  - It's a bug in the chase layer (Defense). #296 can close.
  - **Next (proposed, not built):** estimate the speed trend from about
    0.4–0.6 s of seen pictures. Then, if needed, a commitment margin on the
    chosen time.

- **Backside wide end** ([evidence](reviews/backside-edge.md), 2026-10-27,
  on #329):
  - *NFL:* he squeezes and trails without stopping, at 3–3.6 yd/s, keeping a
    5 yd cushion on the carrier's backside and about 6 yd from him through
    3 s. 18% are in on the play.
  - *Ours:* he stopped at his edge landmark (free) or under `EDGE_CONTAIN`
    (blocked).
  - *Change (on):* he trails the ball when it's carried away behind the line.
    Lateral speed went from 0.87 to 2.18 free (NFL 2.95) and from 0.10 to 1.05
    blocked (NFL 1.10), with matched yards unchanged.
  - *Open (stop rule):* in on the play is still 1%. He loses the ground after
    the runner crosses, at the `preserveEdge` chase gate. **Next (proposed):**
    gate 0 for a backside edge whose ball has gone away.

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

<a id="tkl-6"></a>
### TKL-7: A free tackler's whiff is a rating roll, not contact physics

- **Symptom:** before any contact, `attempt()` in `src/sim/tackle.ts` draws a
  miss with probability `pMiss`. That comes from tackling against
  elusiveness (scaled by open field), approach quality `q`, an overrun term,
  carrier speed and a pocket-escape bonus. A body that is there and closing
  can whiff because a rating gap made the dice say so. This is contrary to
  the model rule that ratings shape capability and never award the result.
  The wrap-quality draw (`execution`) after it is the same kind of draw.
- **Evidence** (Coverage, 2026-11-09, #419 `efe11322`, baseline flags; 300
  runs per coverage, 6 formations × 7 concepts × 2 fronts × flip × 2 rosters):
  - Misses are 24–25% of attempts in every coverage. That is 0.31–0.35 misses
    per run and 0.13–0.15 broken tackles per wrap.
  - Most 10+ yd runs include a miss or a break. Cover 3: 24 of 26.
  - On 22 Cover 1 / 2-Man leaks, the fit put an unblocked defender within
    1.3–3 yd of the carrier at the line; 17 of the 22 then missed or broke.
  - Example: 2-Man / gun_doubles_11 / power / over / team 0 / seed 1696 /
    LOS 35 / ballY 23.6. That is a 75-yd TD after LB_W was free at 2.1 yd.
- **What it should be:** the whiff comes from the bodies:
  - the carrier's actual cut against the tackler's reach and his ability to
    redirect in time (speed, balance, traction, the reaction delay of his
    picture);
  - the arms' actual reach;
  - overrun as momentum he cannot shed.

  Ratings enter only through those capacities and the perception delay. TKL-5
  (reach geometry, #273) is the nearest existing piece.
- **Not a calibration target:** the PFF band (TKL-1) is secondary and its
  charting rules are unknown. The BDB 2024 tackling set had a missed-tackle
  column; that is the place to look for a same-operator reference.
- **Panel:** `data/reviews/tackle/input-manifest-tkl7.json` (Coverage's 22 leaks, with
  s1924 as the untouched fit-failure control).

### TKL-6: An engaged tackler's miss is a flat bonus

- **Symptom:** a defender still engaged with a blocker who tries for the
  carrier misses at a fixed higher rate. `attempt()` in `src/sim/tackle.ts`
  adds +0.3 to his miss chance and takes 0.3 off his wrap quality and his
  legs share, whatever the contact geometry.
- **Where it shows:** engaged run defenders now reach the carrier more often
  (#347's engaged-flow law, then the squeeze read). Each time, the extra
  misses come from these tries. On the same snaps and dice, missed tackles
  by an engaged tackler per run rose 0.143 → 0.169 (#347) and 0.169 → 0.204
  (squeeze read). Free tacklers' misses and broken tackles didn't move
  ([squeeze-read](reviews/squeeze-read.md), [engaged-flow](reviews/engaged-flow.md)).
- **What it should be:** a blocked defender's chance comes from his body and
  information:
  - his actual free-arm reach to the carrier;
  - his balance and support;
  - how much the blocker's hands hold him, which way, and the load on them;
  - whether a body is in between.

  `BLOCKED_REACH` already gates the reach geometry, but the fixed penalty is
  separate.
- **Owner:** tackling (Main Engine for the contact side). Don't tune the run
  fits around it.

<a id="tkl-8"></a>
### TKL-8: The tackling rating slows a defender's approach

- **Symptom:** the better a defender's tackling, the slower he asks to close on
  the carrier. `approach-control.ts` sets the closing speed he keeps at contact
  to 2.5 + 2(1 − tackling) yd/s; `playBall`'s landing approach in
  `behaviors/defense.ts` uses 2.2 + 2.5(1 − tackling). Sim, per defender-play
  (`scripts/diag/effective-mass/pursuit-ratings.mts`): DL approach speed 3–2 yd
  before arrival against tackling, rho −0.36.
- **Measure** (NFL weeks 1–9 by player id, `skill_spread.py`): DL who end the
  play at their arrival more often come in faster (3.5 against 2.9 yd/s, top
  against bottom third by end rate; r 0.21) and more head-on (50 against 61°).
  LB, CB and S show no relation.
- **Not the cause: finishing at speed** (2026-11-13, same operator both sides,
  `arrival_finish.py`, `contact_finish.py`, sim engine-50):
  - From first contact to the end of the play, by the nearest defender's
    closing speed: runs 1.2–1.4 s and 1.8–2.6 yd after contact, NFL 1.3–1.4 s
    and 2.2–2.5 yd. Fast first contacts (4+ yd/s) stop our carrier sooner than
    the NFL's (1.8 against 2.5 yd). Passes match too.
  - Our first arrivals at 4+ yd/s end the play within 1 s less often than slow
    ones (run DB 51 against 81%; NFL flat, 47 against 51%). That split is
    selection, not physics: slow arrivals are mostly late joiners to a play that
    is already ending (86–92% make no tackle attempt), while fast ones are the
    first tackler (about 75% wrap; whiffs and broken wraps 2–5%)
    (`arrival-control.mts`).
  - This is by closing speed. It does not contradict the carrier-speed cells in
    the GAPS row "The tackle at speed" (a side or rear wrap on a fast carrier).
- **Cause:** *confirmed*, a design choice with no NFL support: the rating
  shapes the request, not the body's control.
- **Tried:** flipping the term (sure tacklers keep more speed) was considered
  and not built; the NFL relation is weak for DL and absent elsewhere.
- **Decision (Integration, 2026-11-13): left as is.** Arrivals and finishes
  match the NFL, so changing the term has no gap behind it. A rating-independent
  approach speed is parked ([PARKED](PARKED.md), `TACKLE_APPROACH`), with
  `arrival_finish.py`, `contact_finish.py` and `arrival-control.mts` as the
  measure to re-open it.

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
- **Combination departure execution prototype (not accepted).** Against
  `50b80062`, the released branch bypasses the existing swept-movement climb
  planner, whose null also conflates clear and unvalidated access. Scoped
  direct/detour/unvalidated access and own-state feedback forecasts now compose
  with loaded, tangential foot preparation on the installed helper's acquired
  next-job half. In mirrored controlled opportunities the ordinary release
  earns real backer work while the keeper stays loaded through runner arrival;
  neither component alone produces that protection. An unsafe, unearned
  departure still loses to the down defender. Native transfer remains unproved:
  the selected Ace IZ has no meaningful benefit, Ace weak WZ still misses both
  backers, and the Over stress case still lets Mike wrap at 3.05 s. The initial
  full-vector preparation and preparation across the keeper were adverse and
  are not the candidate. Historical fall/joint-after-fall assertions are not
  protection contracts. Earlier release/traversal remedies remain rejected;
  no capacity, contact law or keeper eligibility change is supported. Pending
  work-off/possession/reach changes remain separate.
- **Zone doubles were given each other's backers.** *Fixed (on by default,
  #284).* The zone installer let each double take the nearest unclaimed
  backer one at a time, outside-in, with no reach. On Ace12 IZ Strong/Over
  (roster 7, seed 1):
  - the outside double H+LT took the Mike (+2.7 yd) over the 3-technique's
    double LG+C;
  - the backside double RG+RT got the nickel 9.6 yd across the formation;
  - the Mike made the tackle (3.10–3.25 s).

  The prototype's native film showed "RT never collects his far NB job".
  This was the cause: an installation fault, not access or spacing. The
  uncovered men now count the backers across the front in order:
  - assignments never cross;
  - they keep the shortest total walk;
  - none takes a backer more than 4.5 yd from him.

  Now LG+C→Mike, RG+RT→Will and H+LT→nickel. RT blocks the Will at 1.90 s
  and C blocks the Mike at 2.10 s, both before the runner reaches them
  (2.85, 3.10 s).

  Ace12 WZ Weak/Under and the recorded climb-traffic fixture keep their
  installation exactly. In WZ/Under:
  - RT already collects the Will at 2.30 s, before the runner (2.50 s);
  - C misses the Mike (closest 0.75 yd);
  - LT's nickel is not reachable.

  **Decided (Move 4, 2026-10-26): SEAL_HOLD stays on for climbers.** With
  his hands loaded on a moving backer, a climber keeps the offset he caught
  him at instead of working to the backer's play-side shoulder (at 2.00 s in
  the controlled climb, C/LG on DT_W, LG to LB_W, LG asks for +2.42 yd/s
  sideways with SEAL_HOLD off and +0.40 with it on). That is the football
  answer: a blocker who catches a moving backer takes him where he is going,
  and the runner cuts off it. Main Engine's alternative (scope the hold to a
  man resisting laterally) is noted on #284; revisit it only after PHY-1's
  force-velocity fix changes the carry.

  The seven scenes the prototype recorded before #281 were pinned to
  `SEAL_HOLD=0`; the pins are removed and the scenes re-baselined on today's
  defaults:
  - the three combo-strike-access scenes: RG now strikes LB_M at 2.20 s
    instead of 2.35 s, so the near-strike decision is staged at 2.15 s; RT
    keeps DT_S to 2.65 s without him falling;
  - the two coupled-World climbs: the backer is loaded with the runner more
    than 4 yd short, and the keeper holds through the runner reaching the
    first level. The scripted runner holds a fixed line into the backer's
    scrape instead of cutting off the block, so the scene ends at the first
    level rather than past the backer;
  - the two mirrored unsafe-release controls: the keeper now holds DT_S on
    his caught leverage, so the climber's exit is no longer obstructed and
    is not assessed as unvalidated, but DT_S still makes first contact on
    the runner (2.45 s). The unvalidated label keeps its own unit test.

  In the two native develop cases, SEAL_HOLD stops neither climb; turning it
  off mostly frees the down linemen.

  **Ordinary set.** Declared before any treatment result:
  `scripts/diag/zone-climb-ordinary.ts`, the first 10 inside, outside, wide
  and split zone runs of normal games 7 and 8, nothing dropped. Each was
  replayed from identical setup bytes on develop `b559fdc5` and on #284.
  - The counting changes no installation among the 20 plays. It repairs the
    constructed case only.
  - The ported prototype works 12 of 36 installed backers before the runner
    reaches them, against 9 on develop: S7-P044, S8-P012 and S8-P025. None is
    lost.
  - Keepers hold the same men at runner arrival in both trees. The same two
    losses (S7-P018, S8-P049) occur on both.
  - On S7-P044, the first changed command is RT's held preparation on DT_S at
    0.75 s (sideways 1.41 → 1.14 yd/s). The consequential one is LG's release
    to LB_W at 1.50 s. On develop it is rewritten by spacing into a backward
    step (−0.64 yd/s at 1.60 s) and never arrives. On #284 it is a detour
    around the bodies in its way: 3.9–4.4 yd/s, engaging LB_W at 2.25 s,
    before the runner (2.55 s).
  - S8-P036 is the strongest adverse case (4.8 → 2.7 yd). LT's held
    preparation on DT_W keeps him on that man until 3.05 s instead of
    2.55 s, the runner's path shifts and SS tackles at 3.25 s. Protection is
    not lost.
  - The remaining 24 backers are not worked:
    - 16 releases come 1.2–2.2 s after the snap with the backer 4–6 yd away,
      and the runner arrives about a second later;
    - 4 doubles never release;
    - 3 release after the runner arrives;
    - 1 reaches the backer without engaging.

    The next stage is release timing and access, not installation.

  **Move 4 step 1 (2026-10-26): stop rule hit, planner expansion stops.**
  Treatment 2 of the climb planner did not pass. Release timing is not the
  first wrong stage. What is missing is a measured reference and lineman
  capability, not another planner rule.
  - *Sets.* The declared games 7–8 set (SHA `f3648920…`, captured on
    `b559fdc5`) and a fresh set declared before any treatment: the first 10
    zone runs of games 9 and 10 (`ZONE_SEEDS=9,10`, SHA `3ec2e3db…`,
    captured on #290's step-0 head `2c863cd`). Backers worked before the
    runner on that head: 12/36 and 9/26.
  - *Trace.* Most unworked climbers release with 0.8–2.2 s to spare and the
    backer 4–6 yd away. They then spend most of that time departing at about
    1 yd/s:
    - the gathered access check brakes (`unvalidated`) or arcs them backward
      around the down man (detour goals at 130–180° from the backer);
    - they are often still in body contact with him.
  - *Probes, all reverted* (patches in project files `zone-climbs/`):
    - Release on the climber's own clock (his sprint time from his current
      motion plus one read, against the runner's time to the backer's
      level). Releases come 0.25–1.2 s earlier and no keeper is lost, but
      12 → 11 and 9 → 11.
    - Departure never brakes or backs up: 12 → 12 and 9 → 10.
    - Both together: 13 and 10, but keepers holding drop 30 → 27.
  - *Ceiling (cheats, not candidates).* Strike range reached before the
    runner, out of 31 and 20 released doubles:

    | Arm | Games 7–8 | Games 9–10 |
    |---|---|---|
    | Real controller | 10/31 | 9/20 |
    | Run at the backer's true live position at full speed from the real release | 10/31 | 9/20 |
    | Lead his true velocity (up to 1.2 s) | 14/31 | 12/20 |
    | Lead, released 1 s earlier | 19/31 | 14/20 |
    | Lead, 1 s earlier, lineman burst about 2x | 20/31 | 15/20 |

    No honest planner rule gets near the omniscient arms. Backers 4–6 yd away
    flow at 2–5 yd/s. A 142 kg guard from a stand covers 2.4 yd in his first
    second, and `GAME_BURST` (2.2) was fitted on WR/TE/RB/CB/S/LB tracking,
    not linemen.
  - *Missing:*
    1. An NFL reference for climbs: the double's release time, the
       climber's speed off the double, and the share of backers contacted
       before the runner reaches them (BDB tracking). Without it, 12/36 has
       no target.
    2. Lineman in-game acceleration checked against tracking. This is
       physics; it pairs with Move 1's force-velocity work.

    Revisit a lead-aim and release-clock treatment only after both.

  **NFL side measured (partial, 2026-10-26).** Source: BDB 2025 weeks 1–2,
  1,394 runs, 693 of them zone. The operator is
  `scripts/mechanics/climb_reference.py`, the same on the sim's common-format
  export. The sim run on develop is not done yet.
  - *Lineman starts:* pullers from the snap reach 2.3 yd/s at 0.5 s and
    3.6 yd/s at 1.0 s, covering 2.2 yd in the first second (p50, n=598).
    Our free-running 142 kg guard reaches 2.5 yd/s, then 4.2 yd/s, and covers
    2.4 yd. So lineman burst is not the gap, and missing item 2 above is
    probably not the cause. The same operator still has to run on the sim
    export to confirm.
  - *Combo climbers* (n=997):
    - release at p50 2.1 s (p25–p75 1.6–2.6 s);
    - the backer is only 2.45 yd away at release (p25–p75 1.55–3.54);
    - they depart at 3.1 yd/s over the first 0.5 s;
    - 58% touch their backer before the carrier reaches him, at p50 0.8 s
      earlier.
  - *Uncovered climbers* (n=287): the backer is 5.4 yd away at the snap, and
    66% touch him first.
  - *Reading:* NFL doubles hold until the backer is about 2.5 yd away; ours
    release with him 4–6 yd away. The likely lever is the double staying on
    until the backer comes to it, and the climber leaving fast. Release isn't
    too late, and the body isn't too slow. Next: the same operator on a
    develop export (`npm run mech:sim` writes the input).

  **Why a released climber stands still (2026-10-26): unresolved.** The
  command trace now records each departure access search
  (`scripts/diag/climb-access-trace.ts`). It is observation only: matched
  restage on games 7–8 changes 0 of 287 snaps, and tracing on or off leaves
  the play byte-identical.

  *Witness.* S7-P070 RT, from the Phase II `current-zone-set.bin`, replayed
  on develop `a5b024b9`. RG+RT double DT_S and LB_M is the backer. RT
  releases at 1.05 s, 4.25 yd from LB_M, and requests exactly zero until
  1.55. The ten zero ticks come from two searches, at 1.05 and 1.30:
  - *1.05 (obstacle DT_S).* All three arcs (+1, −1, 0) fail only the
    clearance check, and only against DT_S, the down man RT is leaving and
    already overlaps (gap −0.174 yd). The check forbids any route deeper
    than his current gap. His own momentum (0.84, 1.74 yd/s) takes every
    request deeper, braking included:

    | Request | DT_S gap |
    |---|---|
    | arc +1 | −0.3006 |
    | braking | −0.3012 |
    | arc 0 | −0.3187 |
    | arc −1 | −0.3348 |

    Arc +1 clears every other surface (RG +0.285). The search rejects it,
    then brakes, and braking is the deeper of the two on the very check
    that rejected the arc.
  - *1.30 (obstacle RG; the original route runs into RG, −0.540).* All
    arcs fail against DT_S again. Arcs −1 and 0 end 0.0007–0.001 yd deeper
    than braking.

  So the first wrong check is the clearance bound on an overlap he already
  has. It is case (i): no request can meet it.

  *One correction, reverted* (its patch is in the description of the PR
  that added this entry). On a surface already overlapped, a route could go no
  deeper than braking would leave him; new collisions stayed forbidden.
  - RT requests movement from 1.05. But the admitted arc aims 0.23 yd
    upfield and further outside DT_S. RT already moves upfield at
    0.84 yd/s, so the arrival law asks him to step back. Later reads arc
    around RG, further back: RT drifts from x 90.24 to 88.9 by 3.15 and
    never works LB_M. DE_W still hits the runner first at 2.20.
  - Sets (base → correction; backers worked before the runner, keepers
    holding at arrival):

    | Set | Backers worked | Keepers holding |
    |---|---|---|
    | Phase II set, 58 backers | 19 → 20 | 42/48 → 42/48 |
    | Move 4 games 7–8 (`f3648920…`) | 11 → 11 | 29/32 → 27/31 |
    | Fresh games 9–10 on `a5b024b9` (`153c308e…`) | 4 → 4 | 17/19 → 17/19 |

  - Matched restage: 15 of 287 snaps change, all runs. The null control
    moved 12.
  - Controls: S7-P041's LG now works LB_W at 2.60, before the runner, with
    the keeper holding. S10-P015, S8-P039 and S7-P071 are unchanged.
  - Adverse:
    - S8-P037: keeper LT loses DE_S, who makes first contact at 2.70;
      2.4 → 0.6 yd.
    - S7-P053: DT_S makes first contact.
    - S10-P009: LB_W makes first contact at 2.55; 4.8 → 1.4 yd.

  *Missing capability.* The search only offers ±0.35 rad foot steps around
  the obstacle at contact radius. When the down man stands between the
  climber and the backer, every step goes around his side or back. None
  reaches his upfield shoulder, so unfreezing the check only exposes a
  backward route. This matches #299's 45°/90° arc witness (S10-P015). An
  upfield-shoulder candidate, with the overlap bound changed alongside it,
  is the next single question. Two changes at once need their own declared
  test.

  On develop, releases still leave the backer at p50 4.1–4.5 yd (p25–p75
  about 3.6–5.3) across the three sets, against NFL p50 2.45. S9-P062 is
  left for Tools' responsibility ledger.

  **Second correction failed (2026-10-26): planner expansion stops.** The
  two-change question was declared on #303 before any result:
  - an upfield-shoulder candidate: the point on the down man's contact
    circle halfway between the climber's flank and the down man → backer
    line;
  - plus the braking-reference overlap bound.

  On develop `d81befa1`, same sets:

  | Set | Backers worked (base / both / shoulder only) | Keepers holding (base / both) |
  |---|---|---|
  | Phase II set | 19 / 20 / 19 | 42/48 / 42/48 |
  | games 7–8 | 11 / 11 / 11 | 29/32 / 27/31 |
  | games 9–10 | 4 / 4 / 4 | 17/19 / 17/19 |

  - Matched restage: 21 of 287 snaps change with both changes (shoulder
    alone: 7).
  - The new candidate points the right way on S7-P070: at 1.05 its goal is
    0.9 yd upfield of RT, outside DT_S. It still fails clearance against
    DT_S, reaching −0.3020 against the braking floor of −0.3012. At 1.30 it
    would run through RG. RT takes the same backward arc as correction 1.
  - Everything else matches correction 1: S7-P041 gains, S8-P037 loses its
    keeper.

  *Missing capability.* Every departure route is judged by
  `previewFreeMovement`, a single-body forecast with no contact. Leaving a
  double, the climber is still touching the down man, and his own momentum
  into him is the deepest thing in every forecast. Braking, the arcs and the
  shoulder all land within a millimetre of the same floor. The forecast
  cannot tell sliding off a shoulder from pushing into the man, because it
  has no contact response.

  Two things would answer it; neither is a planner rule:
  1. A departure preview that includes the bodies he is touching, owned by
     Main Engine and Tools (it is World physics).
  2. Releases that don't start while the climber is still moving into the
     down man. This is the NFL 2.45 yd release question already open above.

  Revisit the route search only after one of them.

  **Why doubles release with the backer 4–6 yd away (2026-10-26).** This
  traces every joined release in the three declared sets on develop
  `a27ccd84`: which trigger fired, the backer's distance in the releasing
  member's picture, and whether he was still moving into the down man. #300's
  `blockingChanges` hook confirms the release time on 30 of 31 climbers in
  games 7–8. The 31st, S8-P004, is now a pre-snap foul.

  Dead-ball plays are excluded: S8-P004, plus S7-P029 and S9-P039 in the
  Phase II set. `PlaySim.run` whistles them before the first tick, but the
  collector ticked them by hand; it now reports them as dead balls.

  A joined double releases once the keeper has been secure for 0.15 s and
  any one of these fires, in the releasing member's own pictures:
  - the backer is within 4.2 yd (`near`);
  - he will be within 4.2 yd in 0.5 s (`ahead`, `FLOW_RELEASE`);
  - he is flowing play side faster than 1.5 yd/s, at any distance (`flow`,
    `FLOW_RELEASE`);
  - the runner's picture is within 2.8 yd of the line (`arriving`), at any
    backer distance.

  Most releases leave the backer at least 4 yd away: 22 of 30 (games 7–8),
  10 of 17 (games 9–10), 29 of 42 (Phase II). By the trigger that released
  them, across the three sets:

  | Trigger that released a late double | Releases | Backer worked before the runner |
  |---|---|---|
  | runner arriving only | 14 | **0** |
  | flow only | 17 | 5 |
  | backer coming (`ahead`, not yet `near`) | 23 | 11 |
  | backer `near` | 7 | 3 |

  - "Still moving into the down man" at release predicts little: 13/36
    worked with the backer in reach, against 12/25 for a climber not moving
    into him.
  - Backer out of reach (neither `near` nor `ahead`): 5 of 32 worked, and
    0 of 12 when the climber was also moving into the down man.

  The first wrong stage is the release decision. The runner's arrival and
  the backer's flow each release a climber to a backer he cannot reach.

  The #307 responsibility ledger reproduces this on develop `4e6fed4e`
  (after #306/#308). Its `combination-release` rows count 30, 17 and 42
  climber releases; 21, 10 and 28 of them leave the backer at least 4 yd
  away (p50 4.52, 4.15 and 4.24 yd).

  **One fix tried, reverted.** Declared on #311 before running: a joined
  double holds its climber until he is no longer moving into the down man
  and the backer is within reach (`near` or `ahead`). The runner's arrival
  and the flow speed no longer release on their own. Results on identical
  snaps, develop `a27ccd84` → fix:

  | Set | Backers worked | Keepers holding | Release p50 | Never released |
  |---|---|---|---|---|
  | games 7–8 | 11/35 → 8/35 | 27/30 → 28/30 | 4.43 → 3.48 yd | 3 → 12 |
  | games 9–10 | 4/24 → 4/24 | 17/19 → 16/19 | 4.30 → 4.09 yd | 5 → 9 |
  | Phase II set | 18/53 → 17/53 | 38/43 → 40/43 | 4.11 → 3.84 yd | 9 → 17 |

  - Matched restage, seeds 7–8: 52 of 276 snaps change, all runs (run
    yards 4.88 → 4.40; passes identical). Plain develop replayed twice
    changes 0.
  - Doubled linemen making first contact: 1 → 0, 2 → 2, 7 → 4.
  - Over 20 release-contract scenes fail (`combo-transfer`,
    `planned-climb-fit`, `combination-access-plan`). They fail through the
    "moving into" hold, not through the removed triggers.

  It fails the declared criteria: backer work falls and a keeper set falls.
  The losses are well-timed releases, made at 1.15–1.55 s with the backer
  3.1–4.8 yd away (S7-P041, S7-P043, S8-P012, S8-P025, S10-P009). The hold
  delays each by 0.2–1.0 s, and the backer gets past. A climber leaving at
  the right moment is usually still pressed into the down man; that is what
  a double is. So "stopped moving into him" can't be a precondition to
  leave.

  Untested, the next single question: the runner-arriving-only release
  (0 of 14 worked) on its own, with the `inward` test left out.

  **Correction: the "4–6 yd vs NFL 2.45 yd" comparison used two different
  measures.** The NFL figure comes from `climb_reference.py`:
  - release is the climber's *last frame within 1.5 yd of a first-level
    man*;
  - only linemen who reach 2 yd past the line before the carrier count;
  - the backer is whichever one the climber comes closest to.

  Our 4–6 yd was the release *decision* against the *installed* backer.
  The identical operator on 8 develop games (`sim-export.ts`, seeds
  101–108, `4e6fed4e`, 147 zone runs):

  | Combo climbers | Sim | NFL |
  |---|---|---|
  | release time p50 | 2.2 s | 2.1 s |
  | backer distance at release p50 | **1.87 yd** | 2.45 yd |
  | speed in the first 0.5 s | 2.19 yd/s | 3.1 yd/s |
  | backer touched before the carrier | 74.5% | 58% |
  | climbers per zone run (combo + uncovered) | **0.67** (98 + 1) | **1.85** (997 + 287) |

  Climbers who do get off already "let the backer come to them". What is
  missing is how many get off at all. In 76 of the 147 sim zone runs, no
  lineman reaches 2 yd past the line before the carrier.

  *Where they are lost.* There are 109 installed doubles in the three
  declared sets:
  - 17 never release;
  - 30 release and reach 2 yd before the carrier;
  - 62 release but don't. In 46 of these the climber is still within
    1.5 yd of a first-level man about until the carrier arrives.

  From the release decision to that last frame takes a median 1.0 s
  (p25–p75 0.7–1.65 s).

  The stuck climbers:
  - are free: within 1.5 yd of their own down man on 79% of ticks, but
    engaged with him on 3%, while the keeper holds him on 89%;
  - request 3.57 yd/s, only 0.92 yd/s of it upfield (climbed: 4.34 and
    2.34).

  The backer's position at release is the same for both groups. The
  difference is the down man: for the stuck climbers he stands between
  both doubled blockers and the backer (backer stacked behind him) in 31 of
  59. `climbRoute`'s `exit` flag shows it:
  - releases with a clear route: 20 of 47 climb, 19 work the backer;
  - releases that must go around the down man: 8 of 41 climb, 9 work.

  *Coaching reading.* "Let the backer come to you" is about the backer
  *declaring*: stepping off the stack to one side, which puts him in a
  lane for the blocker on that side. It is not about his distance. Until
  then the double keeps moving the down man to him. The release triggers
  (`near`, `ahead`, `flow`, `arriving`) don't ask whether anyone has a lane.

  **Second release fix tried, reverted; release changes stop here.**
  Declared on #311 before running: no joined release while the member's
  own route needs an exit around the down man, i.e. until the backer
  declares to his side. On identical snaps, develop `4e6fed4e` → fix:

  | Set | Backers worked | Keepers holding |
  |---|---|---|
  | games 7–8 | 11 → 10 | 27/30 → 28/31 |
  | games 9–10 | 4 → 5 | 17/19 → 16/18 |
  | Phase II | 18 → 16 | 38/43 → 34/41 |

  - Doubles never released 17 → 34; climbers reaching 2 yd before the
    carrier 30 → 28.
  - Same-operator 8-game export: climbers per zone run 0.67 → 0.58, and
    the backer touched first 74.5% → 60.7%.
  - Matched restage: 37 of 285 snaps change, all runs.

  A stacked backer usually doesn't declare in time, so the double just
  stays and nobody climbs. That is two failed release holds (this one and
  the `inward` hold), so release-rule changes stop.

  *Re-diagnosis: the double doesn't move the down man.* Coaching's other
  half is "push the down man to the backer". `trench/timeline.py` on the
  8-game develop export, against the NFL values in
  `docs/reviews/trench-timeline.md` (historical: the NFL tracking export
  isn't in this workspace, so they need refreshing):

  | | Sim | NFL (historical) |
  |---|---|---|
  | engaged OL sideways speed, outside zone | 0.75 yd/s | 3.0 |
  | engaged OL sideways speed, inside zone | 0.50 yd/s | 1.25 |
  | engaged DL depth at 3 s, outside zone | −0.15 | +1.0 |
  | double duration, outside / inside zone | 1.7 / 1.7 s | 1.1 / 1.5 |

  A down man the double doesn't carry stays between the climber and a
  stacked backer, so no route leaves him. Next:
  1. Re-measure the engaged-pair numbers against fresh NFL tracking.
  2. Trace one stuck double's lateral request against what it achieves, to
     separate the controller (what is asked, including SEAL_HOLD's kept
     offset) from contact physics (PHY-1, #297).

  *Traced: it is the request.* Both members of every declared double were
  traced from 0.3 s to the release decision, over engaged ticks only.
  Velocities are play-side sideways, in yd/s:

  | Scheme | member-ticks | decision | after the engagement stage | achieved |
  |---|---|---|---|---|
  | outside zone | 1,111 | 0.04 | 0.88 | 0.68 |
  | inside zone | 1,481 | 0.00 | 0.67 | 0.47 |
  | wide zone | 1,524 | 0.01 | 0.78 | 0.64 |
  | split zone | 377 | 0.03 | 1.46 | 0.49 |

  - The engagement stage (`stepRunRep`, `engagement.ts`) rewrites about
    98% of engaged ticks.
  - The body achieves 75–85% of what is asked on outside, inside and wide
    zone, so contact physics is not the main limit there.
  - The double asks to carry the down man sideways at under 1 yd/s.

  The lever is the engaged zone double's sideways drive request in
  `stepRunRep`. That function holds the SEAL_HOLD and `runContactRead`
  lines owned elsewhere, so the change needs routing to its owner before
  anyone edits it.

  **Tanner approved working in `engagement.ts`; two tests followed, both
  declared on #311.**

  *E1, reverted.* The owner of a live double stops being a stretch reach
  (on a stretch rep he only mirrors the man) and drives at the drive-block
  tempo.
  - Owner sideways request on outside zone rose 0.88 → 1.22 yd/s, but
    achieved speed only 0.68 → 0.73.
  - Climbers reaching +2 stayed at 30; backers worked rose in all three
    sets (11→12, 4→6, 18→20).
  - It fails the declared climber criterion.

  *Why the down man doesn't move.* The doubled DL is never driven back:
  −0.06 to −0.16 yd/s on outside, inside and wide zone. The probes:
  - turning off `DL_ANCHOR` or `PAD_LEVERAGE` changes nothing;
  - removing his depth-hold request moves him (inside zone +0.54 yd/s),
    so two blockers can move one man in this World;
  - ground force along the attack direction is owner +677, **helper
    +144**, DL −804;
  - the helper's final request is 0.38 yd/s upfield, 1.21 sideways: his
    hip-to-hip spot (`toSpot × 3`, set at the owner's depth) and the
    `helperFit` foot replacement pull him back;
  - his sideways force nets −98, toward the backside.

  The double is one pusher plus a helper leaning on the man's flank.

  *E2, a `HELPER_DRIVE` flag (off), not landed.* The helper drives along
  the track, keeping only his width at the partner's hip, with no foot
  replacement while his hands are loaded. Judged on sets not used to
  choose it:

  | | develop | E2 |
  |---|---|---|
  | holdout games 11–12 (`59827691…`): climbers reaching +2 / backers worked / keepers holding | 10 / 11 / 22 of 25 | 12 / 11 / 26 of 26 |
  | 8-game export (seeds 101–108): climbers per zone run / backer touched first | 0.67 / 74.5% | **0.86** / 73.9% |
  | matched restage, seeds 7–8: snaps changed / run yards | — / 8.09 | 77 / 6.92 |

  - Of the 77 restage changes, one pass changes its event path but ends
    with the same yards. Among the runs, #181 (64 yd → 17) is a downfield
    tackle flip at 4.45 s after identical events; #180 (49 → 7.5) is a
    keeper losing DT_S at 2.65 s after the release.
  - On the earlier sets, which only report, keepers holding on games 7–8
    fell 27/30 → 24/30.

  *Correction: where E2's gain came from.* I wrote here that most of it
  came from removing foot replacement. The split on the holdout says the
  opposite. The width-only spot alone gives 12/35 backers and 26/26
  keepers. No foot replacement while loaded, alone, gives 11/35 and 22/25,
  the same as develop. Foot replacement is not what holds the helper back.
  A loaded helper level with or past the man already carries zero
  `helperSupport`, and recovery fires on 77–100% of those ticks.

  *E3, the width-only spot alone (`HELPER_DRIVE`, removed before merge; the
  code is kept on `run/G2-helper-hip-spot` and listed in PARKED.md).*
  `helperFit` is unchanged, so helper-fit's wrong-side tests pass with the
  flag on. Measured on develop 58ae15d7 (branch merged), flag off vs on:

  | | off | on |
  |---|---|---|
  | holdout 11–12: climbers reaching +2 / backers worked / keepers holding | 10 / 10 of 35 / 22 of 25 | 10 / **12** of 35 / 23 of 24 |
  | Move 4, 9–10, Phase II sets (109 doubles): climbers reaching +2 / stuck within 1.5 yd | 24 / 49 | **34 / 37** |
  | Move 4 set keepers holding | 30 of 31 | 27 of 31 |
  | 8-game export: climbers per zone run / backer touched first / departure speed | 0.60 / 65.8% / 2.27 | **0.67** / 66.3% / 2.37 |
  | matched restage, seeds 7–8 (273 snaps): changed / run yards | 0 / 6.37 | 87 / 4.93 |

  It fails two of the criteria declared on #311:
  - holdout climbers do not rise (10 → 10);
  - the Move 4 set loses 3 keepers (S7-P053 twice, S8-P055).

  Both keeper-loss plays are short gains in both arms (1.46 → 0.56 and
  1.51 → −0.11). In S8-P055 the first carrier contact (1.7 s) comes before
  the runner reaches the down man (2.4 s). The keeper count is grading a
  block that broke up after the play was decided.

  The restage run-yard drop is a tail, not a mean shift. Of 85 changed
  runs, 23 gain more than half a yard, 22 lose more, and 40 move less than
  that. Four long runs cut short (−64.5, −60.6, −37.0, −33.4 yd) carry the
  difference. Two passes change: #58 (−2.49 → −2.47) and #160 (same yards,
  different path).

  *Status.* This mechanism has now had five attempts (H, D, E1, E2, E3).
  The stop rule applies.

  What is established:
  - the release decision is not the main loss;
  - the double does not move the down man;
  - the helper's spot at the owner's depth holds him back. Width-only
    clearly frees climbers on the larger sets, without breaking a contract.

  *What holds the stuck holdout climbers (develop 58ae15d7, default path).*
  "Stuck" uses the fate definition: the double released, the climber never
  got +2 before the carrier did, and he was still within 1.5 yd of a
  first-level defender when the carrier got there. That is 15 climbers on
  the default path (14 with the flag on).

  Each climber's window runs from release to the carrier reaching +2 (else
  first carrier contact). Sources:
  - responsibility ledger (#307): his job, every change and its reason,
    his engagement, loaded hands, torso contacts, and which stage owned
    his command;
  - command trace: raw request vs final;
  - `climb-access-trace.ts` for the two stand-stills.

  | play | climber → backer | what holds him |
  |---|---|---|
  | S12-P050 | C → LB_W | Not stuck: he blocks his backer for 62% of the window. The backer filled to him at the line. |
  | S12-P061 | C → FS | Not stuck: he blocks his backer (the rotated safety) for 45%. |
  | S12-P045 | C → LB_W | A threat reread at 2.20 sends him to SS, who is filling. He blocks SS for 30%. |
  | S12-P007 | LG → LB_M | A threat reread at 1.95 returns him to helping on the down man (DT_S), helper for 80%. |
  | S12-P045 | H → SS | find-work retargets him twice, SS → LB_M (2.50) → LB_W (2.80). Free, no contact. |
  | S12-P056 | LG → LB_M | Not a hold: the double releases at 2.85, after first contact (2.35, DE_W). |
  | S11-P021 | LT → LB_M | Late release: 0.55 s before the carrier arrives. Free, no contact, still accelerating (1.41 of 5.08 yd/s). |
  | S12-P007 | RG → LB_W | Free all the way. Asks 4.56 yd/s upfield, gets 1.86. Reaches +1.92, just short. |
  | S11-P012 | LG → NB | **Stand-still**: raw request zero for the whole 0.75 s. Access is unvalidated, every arc fails clearance against DE_W (a neighbouring defender, not his down man, already overlapped), and braking falls back to zero. |
  | S11-P074 | RG → DB | **Stand-still**: raw request zero for 0.85 s. Same rejection, but the overlapped obstacle is his own keeper, RT. Only `spacing` moves him (0.46 yd/s sideways). |
  | S11-P074 | C → LB_M | Asks mostly sideways: 3.02 yd/s, 0.29 of it upfield. |
  | S12-P048 | RG → LB_W | `spacing` cuts his 3.34 yd/s upfield request to 1.16 on half the ticks. Achieves 0.25. |
  | S11-P026 | C → LB_W | Asks 2.20 upfield, achieves 0.36. Beside DT_W, torso contact on 3 ticks. |
  | S11-P030 | RT → NB | Asks 1.40 upfield, achieves 0.72. Torso contact with DE_S (53%) and LB_M. |
  | S11-P019 | C → LB_W | Asks 5.56 yd/s, mostly sideways (2.07 upfield). Achieves 0.87. Torso contact with DT_W (32%). |

  No stuck climber is held by hands on his down man. Only S12-P007 LG is
  engaged with him again, and that came from a reread, not a hold. By
  first cause:
  - **3 are not failures.** Two block their own backer, who came to them.
    One blocks a filling safety after a reread.
  - **3 are timing.** One releases after the play is decided. Two release
    with too little time left to reach +2.
  - **2 are responsibility churn** (threat reread, find-work).
  - **2 stand still** on the #303 access rejection. Both are overlapped
    with a surface that is not their down man: a neighbouring defender,
    or their own keeper.
  - **5 ask too little or the wrong way.** That is a sideways or low raw
    request, `spacing` cutting the request, or torso contact without hands.

  So the hip-side spot cannot help these climbers: it changes the helper
  before release, and none of these 15 is held by the double itself. That
  is why the holdout climbers stay flat (10 → 10) under E3.

  *Keepers re-scored at the runner's first carrier contact.* "Holding"
  now means the down man is still engaged by a blocker at the first
  carrier contact, and did not make it himself. Plays with no carrier
  contact are excluded. Scored this way, E3's keeper loss disappears:

  | set | at runner arrival, off → on | at first contact, off → on |
  |---|---|---|
  | Move 4 (7–8) | 30/31 → 27/31 | 20/34 → 18/34 |
  | 9–10 | 18/20 → 18/19 | 15/23 → 18/23 |
  | Phase II | 40/44 → 40/44 | 31/51 → 31/49 |
  | holdout 11–12 | 22/25 → 23/24 | 21/30 → 21/30 |
  | all | 110/120 → 108/118 | 87/138 → 88/136 |

  The first-contact score has its own censoring. On long runs the first
  contact is a defensive back at 3.5–5 s, and every keeper block has ended
  by then (S7-P031, S8-P054). It is reported alongside, not substituted.

  Next, in order of how many climbers it covers:
  1. The low or sideways climb request, and `spacing` rewriting it
     (5 climbers). Trace the raw climb request against the backer's seen
     path.
  2. The #303 overlap rejection where the overlapped surface is a
     teammate or a neighbouring defender (2 climbers). #303's two
     corrections both targeted the down man.
  3. Reread and find-work churn after release (2 climbers): Competing
     duty (S9-P062).

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

<a id="run-13"></a>
### RUN-13: Box backers untouched: linemen do not climb free to the second level

Measured 2026-10-27 on run-only film (#329), seeds 7/9/11/13 × 2 games, 922 runs,
with the #338 pullers. The NFL comparison uses BDB2025 weeks 1–2 and the same
definition as `run_film_reference.py` (box backer touched by an OL/TE/back before
the carrier reaches him).

- **Measure.** Box backers touched: 56% (NFL 85%); outside zone 48% (86%).
- **Where the gap is.** Linemen touching a backer while still beside a down
  lineman occur at the NFL rate (outside zone 29% vs 35%, inside zone 45% vs 49%).
  Linemen who climbed free do not: outside zone 15% vs 45%, inside zone 18% vs 29%,
  power 19% vs 36%, counter 13% vs 33%. Backers fill at the NFL pace (2.0–2.5 yd
  downhill before the carrier reaches them).
- **Why, for each untouched backer** (all families; nearest blocker whose
  current target was him):

  | Reason | Share of box backers |
  |---|---|
  | No blocker ever targets him. Outside zone's usual call (three reaches, a cutoff, one double) puts all five linemen on four down men. | 13% |
  | His double never releases before the runner reaches him (draw 32%) | 8% |
  | His released climber is free but still at or behind the line | 11% |
  | His released climber is past the line but 3–4 yd short | 10% |
  | His blocker is engaged on someone else | 3% |

- **Released climbers' movement** (outside zone):
  - Ticks by climb-access mode: detour 51%, braking stand-still 19%, direct 18%.
  - Detouring climbers ask for 2.4 yd/s and move toward their backer at
    0.23 yd/s.
  - Even in direct mode, the body achieves about a third of the request
    (5.7 asked, 1.8 achieved), with no contact or spacing rewrite on most
    ticks. That is the start ramp Main Engine is fixing.
  - Control: `GAIT_STEP=0.3` (start fixed, not proposed here) moves untouched
    backers only modestly: outside zone 52% to 48%, power 34% to 27%, trap 40%
    to 26%.
- **Doubles that never release** (outside zone, 90 of 478 before the carrier
  reaches +2):
  - 44% never joined, so no release read ran.
  - 26% are held by the keeper's hidden hand-fight `control` value, which the
    climber cannot see.
  - About 25% fail because the keeper's hands are not touching.
- **Attempt 1, failed (reverted, `run/G2-backer-access`).** A released
  climber's detour ran the tangent off the man's shoulder, carried one stride
  past, instead of 20-degree arcs. Requests rose (2.4 to 3.5 yd/s), but achieved
  motion barely moved (1.19 to 1.28 yd/s) and touched backers did not change
  (outside zone 52% untouched either way).
- **Keeper check without the hidden `control` value (2026-10-27,
  `run/G2-keeper-picture`).** The climber reads his partner's chest on the man,
  within reach and upright, in his own picture; the transfer still needs the
  keeper's real hands. Matched restage on develop `a58ebc2d` (#335's tool,
  456 run-only snaps from seeds 7/9/11/13, saved dice plus 4 shifted streams):
  - Climb backer touched before the carrier, zone doubles: inside zone 0.389
    to 0.430, outside zone 0.253 to 0.287. Box backers touched, all runs, 0.56
    to 0.58 (inside zone 0.62 to 0.63, outside zone 0.54 to 0.57).
  - Keepers are not beaten more: the doubled lineman makes first contact
    0.158 to 0.164 (inside) and 0.102 to 0.098 (outside); more than 1 yd into
    the backfield 0.154 to 0.160 and 0.089 to 0.091.
  - Only 9 of 456 snaps change at every shift; yards 6.46 to 6.44 (the arm
    moves a snap 0.66 yd on average, the dice alone 9.14).
  - A small, honest step: the hidden value was holding releases without
    protecting anything visible. The large buckets above remain.
- **Where released climbers stall (2026-10-27).** With the same position-only
  operator on NFL and sim zone runs, a double gets a man 2 yd off its DL and
  past the line by 2.5 s on 49% of NFL outside-zone doubles and 19% in the sim
  (inside zone 27% vs 18%). The sim's release decision is on time (84-88% of
  planned doubles release, at 1.2 s); only about one released climber in five
  then clears his down man. The start law (#336) does not change that (0.22 to
  0.24). In the departure's climb-access reads the obstacle is the climber's
  own released down man on 59% of non-direct reads (keeper 23%): a step that
  rubs past the man he just left is rejected, and the down man walks with him.
- **Climber steps off the released man's hip (`run/G2-climb-off-hip`).** The
  man he released is his keeper's; World contact decides any rub. His keeper and
  every other body remain surfaces, and the strike corridor still reads the down
  man. Matched restage, 456 run-only snaps, saved dice plus 4 shifts:
  - develop: climb backer touched before the carrier, inside / outside zone
    0.425 / 0.285 to 0.455 / 0.287; box backers touched 0.58 to 0.59.
  - with #336 and #344: 0.373 / 0.267 to 0.443 / 0.337; box backers 0.60 to
    0.63 (outside zone 0.58 to 0.62).
  - Blocks hold: the released man is still blocked when the carrier crosses
    (inside / outside / gap 0.87 / 0.92 / 0.89 to 0.88 / 0.92 / 0.88), goes 1+
    yd deep after the release no more often, and makes first contact slightly
    less often.
  - Rejected first: choosing the climber by his walk around the down man
    changed no play (the first member whose read clears proposes alone).
- **Next, untried.**
  - Zone pairs that climb on the fly: unplanned two-on-ones are only 1-3% of
    untouched-backer moments, so this is small.
  - Released climbers still reach the climb mark only about a quarter of the
    time; the keeper is the next obstacle (23% of non-direct reads).
  - The braking stand-still has had two failed corrections already (#303); it
    waits on the start ramp.
- **Released climbers taken back by the threat reread
  (`run/G2-climber-stays-off`, 2026-10-27).**
  - Found from draw film. A released climber whose backer is 4+ yd from the
    runner re-reads for a nearer threat. The only guard against a man someone
    else has was "a teammate nearer to him than I am, by half a yard". A keeper
    at arm's length on the man the climber just left fails that guard, and the
    released man is usually the nearest threat to the runner.
  - On develop `1ec115c7` (456 run-only snaps, saved dice plus 4 shifts), 310
    of about 2,000 double releases were taken back this way: wide zone 97,
    outside zone 66, inside zone 48, duo 33, power 26, toss 19, trap 16, draw 8.
  - Change: a man a teammate is seen in contact range of (his radius, the
    man's, and his arm) is that teammate's. This uses positions only; no
    engagement state.
  - Result: pull-backs fall from 310 to 2. Box backers touched before the
    carrier: counter 61% to 64%, inside zone 64% to 66%, outside zone 57% to
    60%, power 65% to 67%, draw 17% to 18%.
  - Blocks hold. The released man is still blocked at the cross
    (gap / inside / outside 0.89 / 0.87 / 0.92 to 0.89 / 0.87 / 0.91), goes
    1+ yd deep no more often, and makes first contact about as often (0.093 /
    0.164 / 0.090 to 0.096 / 0.163 / 0.093).
  - Mean run yards are unchanged (6.12 to 6.12).

<a id="run-15"></a>
### RUN-15: Backs leave the mesh too early and take the handoff almost standing

Measured 2026-10-27 on run-only film (#329): seeds 7/9/11/13, 456 snaps, each on
its saved dice plus 4 shifted streams (#335's `matched-restage.ts`), against
BDB2025 weeks 1–2 with the same operator (carrier distance from his snap spot;
the backfield set from the QB's depth at the snap).

- **Measure** (develop): the back is 0.37–0.54 yd from his spot at 0.5 s (NFL
  0.16–0.31) and reaches 0.5 yd/s at 0.15–0.25 s (NFL 0.35–0.45). He takes the
  handoff at 1.9–2.4 yd/s on every look but outside zone from under center
  (NFL 3.8–5.5).
- **Cause:** *confirmed.* `RunnerToMesh` left on the snap at a speed budgeted
  for the old slow start, and on every scheme but stretch braked to a stop at
  the landmark. The start law (#336) makes it worse: backs leave faster still
  and come out past NFL, which is why #336 was held.
- **Fix** (`run/G2-mesh-departure`, on by default):
  - On his beat the back previews his own body going hard to the mesh and
    holds his stance while one more beat would still get him there for the
    installed exchange. A slow start means leaving on the snap; a quick one
    lets him wait.
  - Every handoff but the draw is taken on the move, through the QB's pocket
    (his body at the QB's arm's length, where he sees the QB getting to), and
    only with the QB there: a back who outruns a late QB, or passes beyond his
    hands, is gone past the exchange.
  - With #336, gap runs leave at the NFL time (0.5 yd/s at 0.35 s; 0.00 / 0.01
    / 0.08 / 0.21 / 0.60 / 1.40 yd at 0.2–1.0 s from the gun, NFL 0.02 / 0.04 /
    0.09 / 0.16 / 0.45 / 1.15). Handoff speed rises (gap runs 1.9–2.2 to
    2.8–3.3 yd/s, inside zone 2.0 to 2.6–3.4). Exchanges the QB keeps after the
    back runs past: 0.6% to 0.0% (develop alone 0.8% to 0.1%). Handoffs at 1.6 s
    or later: 3.2% (NFL 5.4%).
- **Open:** zone backs still leave at 0.15 s: their installed exchange (1.15–1.2
  s) and mesh depth leave no slack at full start, so the preview says go now.
  Outside zone from under center takes the ball at 3.3 yd/s, slower than #336
  alone (4.7; NFL 5.5), because the back now waits until he sees the QB will be
  at the stretch mesh.
- **Exchange tempo (same branch).** With the QB there, the back's on-time pace
  (distance over max(0.2 s, time left)) still capped his request as the clock
  ran out, below the ride-through tempo. So he braked to about 3 yd/s in the
  last half yard. Now the pace only slows an early back. With the QB there he
  carries at least the exchange tempo (0.55 of his top speed) into the pocket.
  - Matched restage on develop with this branch, 456 run-only snaps, saved
    dice plus 4 shifts. Handoff speed from under center: inside zone 3.05 to
    3.76 yd/s, outside zone 3.12 to 3.62, gap runs 3.00 to 3.62 (NFL 4.5–5.5).
  - Fumbles 22 to 21 of 2,085 plays; QB keeps 2 to 2. Run yards 5.87 to 5.93.
  - Gun handoffs do not move (inside / outside zone 2.28 / 2.40 yd/s; NFL 3.92
    / 4.96). The gun back reaches the window as it opens, at 1.05 s (NFL 1.1–
    1.2 s), with no run-up, and slows on purpose while he sees the QB will not
    yet reach the mesh. The rest is the body: asking 5.5–7 yd/s from rest he
    accelerates about 3.4 yd/s², half the gait's own start (Main Engine's
    item (b), with the climbers; not #336's start term).
<a id="run-16"></a>
### RUN-16: Draw: the line does not block the rush while it shows pass

Measured 2026-10-27 on run-only film (#329): seeds 7/9/11/13, 456 snaps, each on
its saved dice plus 4 shifted streams (#335's `matched-restage.ts`), against
BDB2025 weeks 1–2 with `run_film_reference.py`.

- **Measure** (develop): the carrier never gets past the line on 62% of draws
  (NFL 10%); first contact at 2.2 s and 3.7 yd behind the line (NFL 3.3 s,
  1.5 yd past it); a DL makes first contact on 70% of draws. DL engaged with a
  lineman: 0% at 0.5 s, 6% at 1.0 s; DL a median 1.8 yd deep at the handoff.
- **Cause:** *confirmed.* For the first second a covered draw lineman walked to
  a set spot 1.2 yd off the ball and engaged nobody; only climbers and combo
  members reacted to penetration.
- **Fix** (`run/G2-draw-set`): the high-set lineman takes on his rusher once
  the rusher reaches his strike, as he sees him, through the ordinary contact
  path; otherwise he keeps the set. DL engaged at 1.0 s 6% to 53%; DL depth at
  the handoff 1.8 to 1.4 yd; DL first contact 70% to 56%; never past the line
  62% to 45%; contact behind the line 72% to 57% (NFL 26%); first contact 2.2 to
  2.7 s.
- **Open:** box backers touched before the carrier stay at 0.16 (NFL 0.77): the
  uncovered draw linemen hold the set for the whole presentation instead of
  releasing to the backers dropping into coverage. Engagement at 0.5 s is still
  0%, because the line gives ground to a set 1.2 yd deep before the rush meets it.
- **Backers on the draw (`run/G2-draw-climb`, on `run/G2-draw-set`).**
  - NFL draw linemen who block a backer stop giving ground by 0.5 s and are
    moving up by 1.0 s: their depth goes -0.72 / -0.64 / -0.38 / +0.45 yd at
    0.5 / 1.0 / 1.4 / 2.0 s. 72% bump a DL on the way, and they touch the
    backer at 2.4 s.
  - In the sim every draw lineman shows pass to a fixed 1.0 s. A double then
    releases only when its backer comes within 4.2 yd or the runner arrives, and
    a draw backer sits 4–5 yd deep reading pass. So first touchers crossed the
    line at 2.4 s and touched at 2.9 s.
  - Attempt 1: release a secured draw double without waiting for the backer to
    fill. No change: the fixed 1.0 s show still held the climber.
  - Change: the uncovered man of a draw double keeps the show only until he sees
    his doubled man come across the line onto his partner, within the partner's
    arm. Then he goes to help, and the secured double releases him to his backer
    without waiting for a fill. Lined up over the partner, the man is already
    within arm's length; the cue needs him across the line. The covered man's
    set, and the climbers, are unchanged.
  - The rest of the gap was the threat reread taking released climbers back to
    the keeper's man (#349, all run families).
  - Matched restage on draws, 456 run-only snaps, saved dice plus 4 shifts:

    | | NFL | `run/G2-draw-set` | + this | with #349 | with #349 + this |
    |---|---|---|---|---|---|
    | box backers touched before the carrier | 0.79 | 0.12 | 0.16 | 0.14 | 0.25 |
    | first toucher crosses LOS+0.5 | 1.4 s | 2.4 s | 1.9 s | 2.4 s | 2.1 s |
    | released climber reaches his backer first | — | 0.17 | 0.16 | 0.19 | 0.32 |

  - Blocks hold with #349:
    - DL engaged at 1.0 s 0.53 to 0.54; DL depth at the handoff 1.43 to 1.42 yd.
    - DL first contact on the carrier 55% to 51% of draws.
    - Holding on the DL 11 to 11 per 145 draws. Four new holds come on
      backers, from TEs and double members who now reach them: 3.4% of draw
      backer engagements against 2.5% on other runs.
    - Draw yards: median 1.94 to 3.06, carries for zero or less 0.46 to 0.42,
      10+ unchanged at 0.19.
  - Still open:
    - Released draw climbers start 6 yd from the backer and move about
      1.4 yd/s in the half second after release.
    - The NFL's first touchers are half TEs and backs; the sim's are about
      three-quarters linemen.
    - Half of draw box backers are nobody's target when the carrier arrives;
      a quarter never were.

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
- **P019 hold duration** (2026-10-26, Main Engine). The pinned P019 scene
  (`test/pass-cutoff-approach.test.ts`, cutoff approach with PASS_KICK and
  five other settings off) now asserts only that both tackles get loaded
  contact with their edge rusher, on their feet, before the throw. How long
  they hold is this problem's measure, re-measured on defaults in Stage 1
  step 5 (week 2):
  - develop: the LT holds DE_W through the 3.15 s throw;
  - turning on actual traction (Stage 1 step 2): the LT, lifted 0.11–0.23
    of body weight by the lower-padded DE from 0.75 s, has less yaw grip;
    DE_W rounds him from 2.0 s and he is free at 3.0 s, just before the
    3.05 s throw;
  - leg force-velocity (#297): DE_W turns the corner at 2.9 s and the throw
    moves to 3.2 s;
  - on defaults (pins off), develop already loses both edges (LT at
    1.5–1.75 s, RT by 2.5 s) and the QB is sacked.
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
    - **#328 redirect-contract limit (2026-10-28):** on accepted
      `db6bc472` plus candidate `e1575023`, whole-rep `carriedPast` is
      **0.2456 yd against the old 0.5 yd bar** (base 0.7362 yd). That
      maximum includes the freed rusher's later pursuit. The replacement
      tests require actual loaded hand forces, causal outward deflection
      and added QB separation, then check free closing separately.
      **A tackle riding the rusher past the QB's depth is not currently
      asserted anywhere.** These phase checks do not establish that outcome.
    - `PASS_RIDE` remains the parked candidate for that unresolved ride;
      #328 does not implement it or claim that the hip problem is solved.
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

- **Re-measured 2026-11-09 (Flex):** `scripts/diag/edge-rep.py` on an 8-game
  `sim-export` (seed 101) from `claude/quirky-franklin-9lbwbp` @ 3af0a53d
  (#415 tip, all experimental flags off, Node 22.23.3). 791 edge reps engaged
  first by an OL. NFL values are this entry's tracking references.

  | | Sim | NFL |
  |---|---|---|
  | Engaged at the end | 85% | 79% |
  | Free | 6% | 5% |
  | First contact after line start | 1.25 s | 1.20 s |
  | Free reps through the tackle | 26% | 29% |
  | Sack-like dropbacks | 4.4% | 4.6–9.4% |

  The tackle's retreat at contact is 3.5 yd (NFL about 2.75–2.8).
  G5's "fixed when" (about 1.1 s of contact before release) is met on this
  base. The GAPS row's 0.4 s predates `PASS_KICK` and `ARM_PRESS`.
  **Proposed for the next review:** close G5. That would open G9 (protection
  calls), which waits on G5's physics.

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

<a id="pro-6"></a>
### PRO-6: An inline TE releasing into a rushing end pushes chest to chest with him

- **Measure** (#336, `test/integration/protection-panel.test.ts`, ace_12 vs
  Over, seeds 1-12): on 4 of 24 edge rushes, H releases on his route straight
  into DE_S head-up:
  - H asks for about 6 yd/s into his route; DE_S asks for 8-9 yd/s at the QB.
  - The two stay 0.54 yd apart, chest to chest, from 0.8 s to the end of the
    3 s window. Neither paths around the other.
  - DE_S never reaches the LT, so the panel counts him unengaged, although
    he never gets free.
  - On develop's start law, H settled at 1.8 s and DE_S came off him to the
    LT at 2.8 s.
- **Tried** (#336): letting a line receiver bend around a rusher coming at
  the backfield (`clearLane`, as `ROUTE_CLEAR` does for backs). The panel
  passes, but unblocked edge pressures rise from 4 to 14 in 8 games (seed
  301; NFL about 0.5 a game). Once H goes around, nobody picks up the end.
  That is PRO-5's missing protection call, so the change was not kept.
- **Open:** whose job is the end when the TE releases (a protection call or a
  chip, PRO-5), and how a release meets a rusher at the line. The panel's
  ace_12 bar is 0.8 until then (was 0.9).

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
  - **Fixed by `PRO_READ` (on, 2026-11-09).** The line declares on the men
    aligned on it, which is visible. After the snap, a man is a rusher once the
    blocker in his area sees him (`sim.see`) attacking the line, and a man on
    the line who is seen dropping is let go.
    - **Contract:** `test/protection.test.ts`. On Sting, the line declares on
      the end who drops, lets him go, and picks up the A-gap Mike only once
      he is seen coming. The test fails with `PRO_READ=0`.
  - **Effect on pressure looks** (704 pass snaps, every pressure call plus a
    no-pressure control, same seeds):
    - **Sacks:** 17 → 12.
    - **A defender within 2 yd of the QB by 2.0 s:** 6 → 0.
    - **Yards:** +0.56 ± 0.30 yd per play.
    - **The no-pressure control:** identical.
  - **Why protection got better rather than worse:** the old read sent the
    center or a back to a blitzing backer while he was still 2.4–3.5 yd off
    the ball, because it knew his call. That pulled the center off his help on
    a tackle, who beat the guard alone by 1.3–1.7 s. Now the center helps
    until the backer is seen coming.
  - **Ordinary games** (matched restage, seed 7/11 × 4 shifts):
    - **Passes:** 233 of 732 changed; +0.61 ± 0.27 yd; sacks 44 → 33;
      completions 428 → 439; interceptions 29 → 33; time to throw unchanged.
    - **Runs:** unchanged.
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

<a id="rec-1"></a>
### REC-1: Receiver options and continuation can contradict their information or route

- **Source inspected:** accepted develop `6676dfc2c4de6b07dbf666465248799b8bbc4e43`.
  Stick/hook conversion reads the private defensive man label, adds a random
  misread, and triggers by elapsed time. The QB's independent forecast has
  only the base path. Settled receivers drift from true defender positions.
  Separately, route continuation can produce a negative extension beyond its
  inner sideline margin and retrace a completed outside route.
- **Candidate:** acquired local keys at an installed read depth; bounded key
  memory; shared immutable alternatives with independent QB expectations;
  visible post-break motion can correct the QB's inferred answer. Forecasts
  preserve the base stem until the same read landmark. Outside continuation
  turns up from the reached point. No speed/contact/probability adjustment.
- **Scope:** [receiver route reads](football-handbook/receiver-route-reads.md).
  The tagged seam read is tested as an explicit native install, not added to
  ordinary play-calling frequencies. Existing stick/hook calls use their
  acquired read by default. Changes are a candidate until reviewed.
- **Recorded test installations:** P019's cutoff protection and the native
  mirror possession-rally control save route IDs, not route geometry. Their
  constructor setup now explicitly preserves the historical flat points;
  throw/catch/rally assertions and deadlines remain unchanged. The new flat
  has separate current-source native controls. At the next receiver review,
  prefer fixtures carrying their installed route definitions rather than
  repeatedly selecting a different play to recover an old clock.
- **Remaining:** COV-10's other early release shapes; pre-contact release technique
  and concept-specific mandatory releases; private scramble/targeted-flight
  shortcuts; and offensive failed opportunities becoming deflections without
  an independent touch test. Do not claim the receiver subsystem is complete.
  Preserve changed native catches and broken tackles as adverse evidence;
  improved decision information alone does not certify every new ending.

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
- **Diagnosis, Oct 26** ([review](reviews/cov1-flight-closing.md), develop
  `58ae15d7`, seeds 101/109 vs 2022 tracking, one operator): the first wrong
  stage is before the throw, not seeing, reacting or running after it.
  - *Confirmed:* where the ball goes. 62–65% of our zone throws go into
    windows under 4 yd (NFL 43%). Re-weighted to the NFL's separation mix,
    our mean closing goes 0.16/0.21 → 0.48/0.60 (NFL 0.61). From 4 yd up,
    closing matches.
  - *Confirmed:* the drop pace at the throw. Zone droppers run about 1 yd/s
    faster in the last second, and 32–42% are faster than 4 yd/s downfield
    at the release (NFL 18–22%). With the target under him in a 2–4 yd window,
    our nearest defender moves away from him at 2.3–2.8 yd/s; the NFL's moves
    toward him at 0.65. The speed is in turned-and-running techniques
    (`deep-turn-run` 43% of deep defenders at 4.7 yd/s, `carry-run-past`).
  - After the throw the ramp toward the target is within about 0.5 yd/s of
    the NFL's over 0.8 s.
  - *Next:* when a zone defender stops running with a receiver before the
    throw (the turn-run and carry latches), on matched snaps. Throw selection
    is logged for the QB lane.

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
  - The direction-free start composition (#353) exposes the same hook
    handoff in the legacy-alignment panel: the lane drive reverses downhill
    before the carry admits the advancing stem, leading to a harder torso
    collision. The repair gathers depth while squeezing that unresolved
    stem's lane, without depth feedforward. An already acquired plant, stop
    or crossing release restores the lane drive; normal vertical carry,
    spot drops and the physical start remain separate. An earlier treatment
    which retained positive depth feedforward opened the opposing hitch and
    was rejected. This does not repair the wider-slot band omission above.
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
- **Re-qualified** (`b559fdc5`, [design](reviews/cov7-support-choice.md)):
  both arms still activate at 0.65 s on the same pictures; PA is unchanged.
  The run benefit (corner wraps, 6.26 → 4.85 yd) holds only under the
  fixture test's `EDGE_CONTAIN=0 SEAL_HOLD=0`; on today's defaults (since
  #275) he never touches the runner. With the look sold until 1.3 s the
  bitten corner intercepts PA Shot from 4 yd inside Z on `b559fdc5` (see
  BALL-1); after #283 (COV-6) Z drops it instead, and nothing else in the
  arms changes beyond 0.1 yd. The
  design for the leave-or-stay choice and the evidence its code PR owes are
  in the review; code waits for COV-6.
- **Paused, first to resume (Tanner, Oct 27).** Coverage work is paused until
  the run game is much better; this is priority 1 when other work resumes.
  The following failures describe the historical Oct 27 checkpoint against
  the then-pending gait start law, not current-develop test results.
  - On that #336 candidate, `test/cov7-abandonment.test.ts` failed 2 of 9
    (Toss / PA Shot, seed 1). The combo C contacts DT_S early, so LB_W goes unblocked and the
    corner never reaches the runner. Z's look settles sooner, so in man the
    QB never throws to Z, and the bitten corner intercepts.
  - With #295's re-recorded version (no `EDGE_CONTAIN`/`SEAL_HOLD` pins) it
    failed 5 of 13: the man-arm corner also ends near the runner, the wider
    split's results flip, and the vertical arm's depth check fails.
  - Seeds 1–50 did not pass, and a lucky seed was ruled out
    (`reviews/cov7-abandonment-cost.md`).
  - **Plan on resume:** re-record once on #336 + #295. Claim the cost through
    same-clock geometry (lateral gap, depth leverage, separation from Z), not
    the QB's target or the outcome. Apply legality checks only when a throw to
    Z happens. Never count an interception as a completion. Add the vertical
    arm, declared before it runs (`reviews/cov7-support-choice.md`).
  - For #336, Tanner approved a narrow repair in a separate thread, only if
    it makes the check stricter: it must tell an interception from a
    completion, and confirm the corner bit and the QB threw where he vacated.
    The broader redesign above is still the resume task.
  - **Subsequent accepted source:** the narrow fixture correction
    `600dc9d161f594f05bda1cf113fa4e85a4cc4ea0` landed with #336 at
    `df9b0b61a8ad66bf72ce6698f7819107d6a9456d`. It distinguishes the
    interception from a completion and checks the vacated window. The
    historical failures above are not an outstanding block on the accepted
    start law; they do not certify the broader cost-fixture redesign either.
  - Also waiting: #295 (squeeze; its seed 7/8 matched numbers predate the
    random-stream split, #323, and need re-running) and #324 (COV-1
    diagnosis; attempt 2 parked on `coverage/G3-cov1-throw-horizon`).

## Ball and quarterback

<a id="cov-8"></a>
### COV-8: Trailing man defenders can't find the ball

- **What:** since the throw reaction keys off what each defender sees
  (`src/sim/throw-sight.ts`, INFO-1), a man defender running with his back
  to the quarterback learns of the throw only when the ball enters his view
  or when his receiver visibly turns for it (his perceived body facing and
  speed, within 3 yd). Before, every defender broke on the ball one reaction
  time after the exact release.
- **Effect** (PR tier against the COV-6 branch, seeds 7 and 8): INT
  5.1 → 3.8% and 5.2 → 3.3% (moved on seed 8), 20+ yd completions
  16.0 → 18.0% and 13.3 → 17.3% (moved on seed 8), YPA +0.34 and +0.94.
  Landed anyway (Tanner, 2026-10-26): the old reaction was hidden
  information, and this gap names the missing mechanism.
- **Matched split** (smash, four verts, mesh vs Cover 1/2/3, 40 plays
  each, develop `9654b03` vs the PR; identical up to the release): of
  1,053 non-DL defenders with the ball in view at the release, none
  reacted more than 0.1 s later than on develop, so the view gate itself
  is clean. Of 1,306 with the release behind the shoulder line, the ball
  enters view at a median 0.55 s and they react at 0.75 s (develop: a
  fixed 0.30 s), and **856 never react before the play ends** (develop: 5).
  Only 41 get the receiver look-back cue. Mean yards per play on those
  plays 7.45 → 9.09 (CEO check, seed 11).
- **Missing mechanism:** a head turn separate from the hips. A coverage
  defender with his back to the QB looks back at moments he could know
  to look: his receiver's visible turn or hands, the expected timing of
  the route stem (from the QB alignment and the snap he saw), or a
  teammate's "ball" call. Looking costs him awareness of his receiver
  (a staler picture of his man while his head is back). Ratings
  (ball skills, awareness) change how often and how well he looks, not
  whether he sees a ball that is in view. Body facing stands in for gaze
  today.
- **Next:** build that look-back. Judge on the same matched 360 plays:
  the behind-the-shoulder bucket must react, without a fixed timer. Then
  check separation at the catch, PBU and INT on contested go and fade
  throws. Don't cap deep completions. Stop rule: two attempts, then
  re-diagnose.

<a id="cov-9"></a>
### COV-9: A man defender overruns a turning receiver once nothing slows his pedal

- **What:** with #394's off-ball spacing a crowded man defender stacks a step
  deeper rather than starting 0.64 yd from a teammate. Against a bunch his
  man pedal is then no longer throttled by the controller's teammate-spacing
  cap, and he overruns the receiver's turn.
- **Witness** (Integration, PR #394 comment 6589782072, `ed899306` vs
  develop `c4fc33d5` + #392): `nativeTraceSetup({ coverage: 'cover1_off',
  concept: 'curl_flat', seed: 9, roster: 7, formation: 'gun_bunch_11', flip:
  false })`, defense replaced by dime (`pickDefense(generateTeam(new
  Rng(7).fork('defense'), 'Defense', 'DEF', { strength: .6 }), 'dime')`),
  seed `new Rng(9).fork('integration394:3')`; capture-before-fork SHA256
  `01cbd22c…568244`. NB on Y (inside shoulder).
  - Only the NB's start depth differs: 6.00 → 6.66 yd (Y and his shoulder
    unchanged). Baseline: 0.637 yd from the SS (radius sum 0.565), and at
    0.20 s the spacing cap cuts his man pedal from (−0.32, 1.03) to (−0.11,
    0.38). Candidate: uncapped; he closes to 1.21 yd of Y at 3.10 s (baseline
    3.50) and is 3.72 yd away at 4.30 as Y turns on the curl.
  - Baseline: throw to X 3.15, PBU CB_W 4.20. Candidate: throw to Y 3.10,
    caught 4.30, 52.4 yd. Four of five bunch curl_flat passes in that panel
    gain more.
- **Cause:** *likely* two coverage mechanisms the old crowding hid, not the
  alignment (Coverage, 2026-11-02): (1) the man break reaction against a
  turning receiver (COV-6 family: big, fast turns) lets him run past the
  turn; (2) the teammate-spacing cap throttles a man defender's pedal from a
  merely crowded start. Does a spacing cap belong on a man pedal at 0.2 s?
- **Decision:** keep the stack-deeper spacing (Coverage chose it over
  resolving only physical contact or dropping spacing): two DBs 0.64 yd
  apart off the ball is not football, and restoring it would tune alignment
  toward this ending. Fix the coverage mechanisms instead; Coverage is
  paused, so this records the witness.
- **Next:** for whoever holds coverage. Judge on this witness and its
  opposing gun_doubles_11 control: the defender keeps his cushion through
  the turn without a pedal cap or a fixed timer.

<a id="cov-10"></a>
### COV-10: Sim route releases are too fast and too vertical

- **Bounded receiver follow-up (2026-11-09):** reproduced the ordinary flat
  on accepted `6676dfc2c4de6b07dbf666465248799b8bbc4e43`. Its LOS-relative
  first landmark makes an off-line receiver gain 2.7 yards downfield for
  two yards of width. The initial diagonal request survives every movement
  modifier and produces the vertical stem without contact. Candidate:
  move only that first flat landmark to the line, retaining the final outlet
  and physical capacities. See [receiver rules](football-handbook/receiver-route-reads.md).
  This does not resolve every route family or qualify a new coverage cue.
  The historical NFL table below has not been re-measured in this workspace.

- **Symptom:** in the first second every sim route looks the same: a fast
  vertical stem. NFL releases vary. Flats and crosses work flat early, run-play
  receivers stalk, and chip and block receivers barely move downfield. Any
  defender read keyed on release pace or direction (a screen look, route
  recognition, match rules) then sees no realistic hard negatives.
- **Measure** (Defense, 2026-11-03; sim on `claude/screens` 245bda1a,
  reproduced for ordinary routes on develop 85952c95; NFL = BDB 2025
  `routeRan`, detached WR/TE).
  Downfield velocity at 0.9 s, p50 (yd/s):

  | Route | NFL | sim |
  | --- | --- | --- |
  | flat | 0.8 | 3.4 |
  | cross | 2.6 | 4.2 |
  | hitch | 3.3 | 4.4 |
  | slant | 2.9 | 4.2 |
  | go | 3.4 | 4.8 |
  | screen blocker | 0.6 (n = 160; 95% bootstrap 0.28–0.70) | bunch 0.6, bubble 0.5 |

  The share of each route that a "slow release" rule would flag (downfield
  velocity below 1.0 / 1.5 / 2.0 yd/s at both 0.6 and 0.9 s):

  | Route | NFL | sim |
  | --- | --- | --- |
  | flat | 55 / 70 / 84% | 0 / 0 / 0% |
  | cross | 20 / 24 / 33% | 0% |
  | slant | 4 / 9 / 19% | 0% |
  | hitch | 4 / 7 / 12% | 0% |
  | run-play WR | 31 / 44 / 57% | not measured |
  | no route (block or chip) | 52 / 56 / 60% | pass-pro 100% |
  | screen blocker | 67 / 82 / 93% | bunch 59 / 75 / 88%, bubble 75 / 75 / 81% |

  Sim negatives: 1,088 ordinary pass plays, 17 concepts × 4 formations × 4
  coverage calls × 4 seeds (`scripts/diag/route-releases.mts`). Operator:
  `scripts/mechanics/release_falsetrip.py`, with the same kinematics as #403's
  `release_pace.py` (central difference over ±0.2 s).
- **Cause:** *likely* the route runner. Stems start at full pace straight
  downfield. The route tree has no detached chip, option, rub or whip release.
  Not isolated further.
- **Consequence:** the screen look for #46 (screen rally) is blocked.
  Coverage and Defense agreed (2026-11-03) not to build a release read on
  these releases, and not to stand in synthetic NFL-shaped negatives in a
  scenario test: that would certify a read the game never challenges.
- **Design note for the screen look:** in the NFL a slow release alone is a
  weak screen cue, since flats and run-play stalks trip it at 31–84%. The
  coached read combines graded evidence: the receiver's release, what the
  defender sees at the QB and line (a quick set, linemen releasing or not
  pass-setting), and the throw.
- **Next:** for the offense's route runner, which needs an owner. Match the
  release shape by route first, then re-run the false-trip table
  (`scripts/mechanics/release_falsetrip.py`) before any release-keyed read is
  built.

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
- **A matched reproducer, pinned to develop `b559fdc5`** (COV-7 PA Shot,
  look until 1.3 s, support arm; [review](reviews/cov7-support-choice.md#results)):
  the QB throws Z's sideline break with an interception risk of 0.03 while
  the corner is 4.0 yd inside and level, recovering into the ball's line. He
  intercepts 2.0 yd short of Z. Since #283 the throw leaves 0.05 s later to a
  point 2 yd shorter, and Z drops it; the risk is still 0.04. *Hypothesis:*
  the risk estimate doesn't weigh an inside defender already closing on the
  lane. The pick depends on the release to within 0.05 s, so it's a fragile
  reproducer.

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
### QB-2: Scramble frequency and escape-lane criteria

- **Dated weekly regression** (`weekly-2026-10-26`, `a5b024b9`): scrambles are
  **1.4% / 1.4%** of dropbacks, below the plan's rounded NFL 2.2–7.3%
  comparison; sacks are **9.0% / 10.0%**. Seed 7's saved count is 15/1,061;
  seed 8 remains plan-supplied as qualified [above](#weekly-check-2026-10-26).
  [#287](https://github.com/tannerthardy/football-simulation-/pull/287) corrected
  the optimistic own-arrival estimate and uses the QB's defender pictures,
  while retaining the strict lane criterion: a non-panic escape needs at least
  two candidate lanes beating every eligible defender by more than 0.35 s.
  Upfield points can sit at LOS+1, 8–9 yd from a set QB. This criterion remains
  an open football question, not a reason to undo the honest timing/input fix.
- **Retained opposing evidence from #287:** its matched sample reports useful
  escapes lost (g5-p111, g0-p87, g1-p85), alongside falsely promised losing
  scrambles removed. It reports 14/534 dropbacks scrambling (2.6%) in the
  matched set, versus 13/1,066 (1.2%) in its diverged CI sample. Those are
  different cohorts from the weekly card, not substitute weekly counts.
  Diagnose the escape criterion and actual opportunity before changing it;
  no capacity, margin or band retune is authorized by the aggregate rate.
- **Historical measure** (`dev-12`): scramble rate 6.4% (NFL 3–5%); completion 62.6%
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
  *Status 2026-11-09 (Flex):*
  - #260 merged on 2026-10-25 with the scramble cue: 39fe5d09, `qbRunning`
    in `src/sim/possession-read.ts`.
  - #256 was closed unmerged.
  - The `executeRunFit` fallback to `sim.carrier` now applies only to direct
    callers that pass no interpretation (`undefined`). `defense.runFit` always
    supplies one.
  - One true-state seam remains in `engagement.ts`: a pass rep converts to
    run on the true carrier or `sim.scrambled`. It fired once in 144 snaps of
    a whole game (seed 9), so it is left as is.
- **Player sight has no field of view** (*confirmed*, 2026-11-02 audit, seeds
  1–2, two games, about 15 million opponent lookups). `PlaySim.see` gives
  every opponent on the observer's reaction delay, projected forward along
  the target's velocity, wherever the observer faces: about 2.9 million
  lookups per two games were of men more than 120° behind his body, at no
  cost. Only the ball (`throw-sight.ts`), the QB's eyes and a carrier's run
  keys model where a player looks. Proposed next: a player keeps his last
  in-view sighting of a man outside his view cone (the throw-sight cones) and
  projects it forward, instead of a fresh reaction-delayed picture. Large
  behavioral reach (man defenders trailing, pursuit from behind); needs its
  own matched restage and a design call.
  *Landed with it, the opposite case:* a defender who had read run saw every
  non-line, non-QB, non-back opponent 0.15 s later, including the tight end,
  fullback or receiver blocking him from in front (4.5% of close in-front
  lookups). A blocker in front of him (inside the throw-sight view cone) and
  within 5 yd is now seen on the ordinary delay; men releasing away from him
  are still seen late. The exemption is judged from his own delayed picture
  of the blocker, never the blocker's live position (integration review on
  #391: live position reselected an already-buffered picture).
  When the run read's 0.15 s starts to apply to a man (his picture leaves
  the exemption, or the defender's read flips to run), the picture he had is
  held and ages, instead of rewinding 0.15 s (a rewound picture of a man
  running away shows synthetic braking; Coverage review on #391).
  *Still open:* other lengthenings of the delay (a man leaving a carrier's
  keys) still take a picture back to an older moment. The same hold applied to every sight changes about 20 recorded
  scenes (blocker rereads, QB memory, command traces) and needs its own
  restage.
  *Tried and stopped:* a field of view with memory (out of the view cone, the
  last sighting projected forward), alone and with a check over the shoulder
  every 1-2 s. Matched restage against #391 (seeds 7/11 x 4 RNG shifts):
  passes +1.26 +/- 0.43 and +0.52 +/- 0.40 yd per play, 20+ yd completions
  106 -> 136 and 124, mostly after the catch, from defenders still running
  coverage who never see the carrier behind them. Body facing is too crude a
  gaze; this needs a head and attention model with cues (the catch, "ball!")
  first. The attempt itself was not kept.
- **#256 (#225 rebuilt), engaged work-off toward the runner** (held): coherent,
  with no matched gain on runs; its scorecard moved yards per carry
  5.52 → 6.92. Waiting on Defense's native lab rerun and recomposition with
  #260.
- **Lesson from these reviews:** when a PR removes a leak, add back what a
  real player could see or do in the same PR. In matched plays the honest
  information alone barely moved designed runs; the large jumps came from
  what was deleted with the leak (the scramble cue here, the layout span in
  TKL-5).
- **Throw reaction used the exact release time** (*landed*, COV-8 PR):
  `sawThrow` in `behaviors/defense.ts` now waits on the first tick the
  ball was in the defender's own view (`ThrowSight`), or, for a man
  defender, on his receiver's visible turn for the ball. A QB windup read
  is kept for defenders keying the QB. The leftover gap is
  [COV-8](#cov-8).
- **Run recognition uses the global handoff time** (`recognition.ts`), whether
  or not the defender could see the mesh.
  *Landed* (#280): run/pass ball cues come from the defender's pictures (a
  seen throw, a backfield player seen holding it at or behind the line, the
  QB seen carrying past it); a seen give latches until a throw (#282).
- **Move 1 landed (2026-10-25):** #274 replaced #260 with an acquired
  scramble cue (`qbRunning`: the pictured QB carrying toward the line faster
  than 2.5 yd/s near the pocket front, or 1.5 yd outside his tackles moving
  downfield; man and deep defenders stay on their men until he crosses).
  #282 recomposed #256: engaged run contacts key the holder in their own
  pictures (the blocker on them is felt, not read for the ball), and an edge
  plays a cutback he saw develop inside him without waiting for the runner to
  clear the line. Matched arms: all within noise. Guard debt left: the
  `sawThrow` reaction gate on `throwAt` (`defense.ts`, with COV-6), the
  blockers' own pass-pro lifecycle in `engagement.ts` (offense side), and the
  `run-fits.ts` legacy fallback.
- **Open: no give cue for a non-backfield carrier** (jet sweep, end-around).
  The give cue watches only backfield spots, so a handoff to a motion
  receiver reaches defenders through the QB's empty hands and the runner's
  later picture. Watching every receiver for the ball breaks the attention
  boundary (a defender queries only his keys). Design question: which
  defenders key a jet motion man through the mesh, and at what cost to their
  other reads. Related: COV-4.
- **Open: the scramble choice is binary.** Tanner (2026-10-25): an
  underneath defender's call between coming up on a scrambling QB and staying
  on his man is a feel read with a real price either way; make it a
  cost-bearing choice when the decision-layer work starts.

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
- **Withdrawn: a grasp's hold distance lags its real stretch** (2026-11-10,
  Flex). The tow bench (`scripts/diag/effective-mass/tow-forces.mts`) compared
  `GraspJoint.hold` with the centre distance (0.90 against 0.72 at 1.0 s). The
  joint and the reach-break test measure from the holder to the grip point on
  the runner, not his centre, and that distance stays within 0.008 yd of `hold`
  (0.725 against 0.717 at 1.0 s): the soft row's elastic stretch. The reach
  test also checks the current grip distance at the start of every step. No
  bookkeeping lag.

<a id="phy-2"></a>
### PHY-2: Movement detail that's costly or unproven

- Accurate grip timing is costly and not fully composed (PHY-002).
- Long-hold balance and recovery history diverges (PHY-003).
- Anatomical feet and soles are paused research, not production.
- Vertical and airborne motion, and richer hand and foot detail, are
  deferred (MODEL-001). They return only for a repeatable failure that a
  simpler model can't express.

### PHY-3: Start force does not depend on facing (checked: by design, not a gap)

*Corrected 2026-11-09.* The first version of this entry said the gait ignores
facing ("a backpedal as fast as a sprint"). That was wrong.

- **What the law does** (`src/physics/kinematics.ts`):
  - Facing caps the speed a body can hold in each direction:
    `directionalSpeedFactor` with each player's `shuffle` and `backpedal`
    factors, used by `effectiveVmax`.
  - The start force does not depend on facing, by design. Tracked NFL pullers
    reach 0.5 yd/s sideways by 0.1 s with their shoulders opened about 10°.
- **What the bench showed** (Flex, develop 283325e1,
  `scripts/diag/lateral-start-bench.mts`): five real OL bodies at the snap of a
  restaged wide-zone play, from rest, on a steady 3.45 yd/s request.
  - Straight ahead, sideways with square hips, 45° open and 90° open give
    identical speeds: C 1.31 / 2.13 / 2.94 yd/s at 0.25 / 0.5 / 1.0 s.
  - That is the facing-free start force acting below every directional cap.
    Larger requests reach the NFL OZ line's 2.25 yd/s at 0.5 s (C 2.32 at
    4.5 yd/s, 2.50 at 6).
  - So the body's capacity is not what keeps the sim's OZ line short; Run
    Game traced that to the centre and backside first step.
- **Open only if evidence asks:** whether a square-hipped lateral start should
  lose force against an open-hipped one. Measure speed by the angle between
  orientation and direction on NFL tracking, beyond the pullers' first 0.3 s,
  before changing anything.

## Fatigue and rotation

Diagnosed in the fatigue audit of 2026-10-25 (develop `b559fdc`, 4 games,
seeds 7–10; write-up in the project files, `fatigue/fatigue-audit-2026-10-25.md`).
`NFL` here is BDB 2025: snap shares from weeks 1–9, rush reps from weeks 1–2.

<a id="fat-1"></a>
### PHY-4: A sub-maximal speed request is approached slowly (by design; a note for controller authors)

- **What the law does** (`locomotionAccel`, `src/physics/kinematics.ts`): the
  start force is full at rest and falls linearly to zero at the speed he asks
  for, dv/dt = (start / tau)(1 - v / wanted). A request below top speed is
  therefore approached with a time constant of about tau x wanted / start:
  about 0.6 s for a 4 yd/s request. This is taken from tracked NFL pullers and
  is not a gap.
- **Consequence for controllers:** a request of 4 yd/s is a request to arrive
  at 4 slowly. A controller that wants to be at pace now asks for more and
  throttles as it gets there.
- **Seen in:** the free backside end on zone runs (fixed run set, 2026-11-13,
  `scripts/diag/concepts/bsend-exec.mts`): before the handoff his request held
  at about 4 yd/s (tracking a mesh point that moves slowly) and his speed rose
  1.9 -> 2.8 yd/s from 0.5 to 1.0 s, as the law predicts; NFL box ends are at
  3.4 yd/s by 1.5 s. The same shape was reported for the safety's pedal.

### FAT-1: Starters never rotate: DL, edge and RB play every snap

- **Symptom:** The same four linemen and the same RB play the whole game.
  Depth on the line is worthless.
- **Measure:** `dev` (`b559fdc`, seeds 7–10): the top DT, edge and RB each play
  1.00 of snaps. `NFL` (median per game): DT1 0.63, DT2 0.46, DE/OLB1 0.76,
  RB1 0.63, TE1 0.74; OL 1.00 in both.
- **Cause:** *confirmed:* `team.ts` `pickBest` only discounts a player below
  0.8 energy, and energy at the snap never goes below about 0.75 (median
  0.95–0.97). No planned rotation exists. See FAT-2.
- **Where:** `src/league/team.ts` `pickBest`, `src/game/game.ts` `recoverAll`.
- **Open:** a coach's rotation from what he can observe (snaps in a row, time
  on the field, visible fade), with depth quality deciding who goes in.
  Defensive substitutions are limited when the offense doesn't substitute
  (no-huddle; FAT-4).
- **Fixed in #298 (merged 2026-10-26):** the coach counts each player's snaps, forgets them
  over about 10 minutes off the field, and spells a player once that count
  passes a stamina-based tolerance, weighted by position (DT and edge most,
  OL and QB never). Changing a unit inside a series costs extra, more so
  against hurry-up. It never reads energy. Seeds 7–14: DT1/2/3 0.60/0.53/0.31,
  EDGE1/2 0.71/0.65, RB1 0.77, TE1 0.74, OL 1.00. Streaks run shorter than
  the NFL's (5+ snaps: 7% against 14%), partly because sim drives are short.
- **Still open:** the coach doesn't read visible fade (a slower get-off or a
  lineman giving ground late in reps). He needs observable evidence, not
  energy. The no-huddle limit on defensive subs is FAT-4.

<a id="fat-2"></a>
### FAT-2: Fatigue too small to matter: linemen go full power every snap

- **Symptom:** Long drives and hurry-up don't wear a front down. The most
  tired player in a game is about 2% weaker.
- **Measure:** `dev`: drain per rep is 0.04–0.08 of the tank (DT 0.076);
  energy at the snap settles near 0.95; the worst fatigue factor in 4 games
  is 0.977–0.980. `NFL` (9,159 pass-rush reps by DL and edge rushers,
  centred on each player's own mean): speed 2.5–4.0 s into the rep fades
  about 1.5% per consecutive snap on the field (−0.039 ± 0.008 yd/s); peak
  acceleration in the first 1.5 s fades about 0.6% per snap and is 6–10%
  lower on snaps under 30 s after the last; peak speed in the first 1.5 s is
  flat. These are confounded first-pass numbers: late-drive snaps differ in
  situation and play type.
- **Cause:** *confirmed:* the curve `1 − 0.14 × deficit^1.4` is flat for
  small deficits and `spendEnergy` charges a max-effort rep only about 8%.
  Recovery (`0.012 + 0.022 × stamina` per s) is in a realistic range. One
  pool, fully refilled at halftime. Stamina changes only recovery.
- **Where:** `src/physics/kinematics.ts` `fatigueFactor`, `spendEnergy`;
  `src/game/game.ts` `recoverAll`.
- **Open:** a fast pool (phosphocreatine-like, refills in tens of seconds)
  and a slow game pool, judged with the same rush-rep operator
  (`scripts/diag/fatigue-probe.ts`).
- **Fixed in #298 (merged 2026-10-26):** fast pool drains 3× under load with curve
  `1 − 0.3 × deficit^2.5`; refill `0.006 + 0.010 × stamina` per s toward a slow
  reserve that loses 1% of each play's spend and gets half back at halftime.
  Seeds 7–14 with rotation: speed 2.5–4.0 s fades −0.053 yd/s per consecutive
  snap (NFL −0.039); peak acceleration +0.039 (NFL −0.017, wrong sign, noisy:
  only 149 reps at 5+ in a row); peak speed −0.03 (NFL flat). Without
  rotation: −0.023, −0.019, −0.013. Lowest energy at a snap 0.27. A fresh 40
  is unchanged. Matched-snap check: no measurable pass effect; the
  matched-pair pass delta was catch-roll variance (see the #298 PR body).
- **Still open:** re-measure the fade slopes on more games once rotation
  settles; the long-streak bins are thin.

<a id="fat-3"></a>
### FAT-3: No fade within a long engaged rep

- **Symptom:** A blocker or rusher on a 6–8 s rep pushes as hard at the end
  as at the start.
- **Measure:** not yet measured against tracking. `dev` drain in the longest
  DT rep is 0.13, a fatigue factor of 0.996.
- **Cause:** *confirmed:* `enduranceFactor` (sprint load) builds only above
  85% of top speed, so engaged pushing never builds it; isometric work
  drains the tank only slightly, and contact force reads the fatigue factor
  only through `world.ts`.
- **Where:** `src/physics/kinematics.ts` `enduranceFactor`, `spendEnergy`;
  `src/physics/world.ts` (`spendEnergy` call, arm cap).
- **After #298:** a 5 s all-out push now spends 0.4–0.6 of the fast pool,
  but the flatter curve keeps the output loss small until the pool is low,
  so the fade inside one rep is still unmeasured and probably small.
- **Open:** waits on the leg force–velocity work in `world.ts` (Move 1).
  Whether tracking can isolate a fade within a rep (long-hold pass-rush reps,
  depth given up by the OL over time).

<a id="fat-4"></a>
### FAT-4: Fatigue doesn't feed tempo, pacing or coaching

- **Symptom:** Offenses never use tempo to wear out or freeze a front.
  Players never pace themselves.
- **Cause:** *confirmed:* tempo depends only on the clock situation
  (`hurry` / `milking`); no effort choices are tied to fatigue.
- **After #298:** a defense facing a hurry-up pays double to substitute
  inside a series; nothing else ties tempo to fatigue. Against a no-huddle
  offense that doesn't substitute, the defense gets no matching time and
  should be limited to quick subs at its own risk (a procedure limit, not
  only a cost). Offenses should be able to choose tempo to tire a front.
- **Open:** pacing belongs with the
  decision-layer research.

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

<a id="rat-4"></a>
### RAT-4: The pursuit rating gives no player a lasting pursuit habit

- **Symptom:** NFL pursuers differ from one another in stable ways; ours do not.
- **Measure** (2026-11-13; NFL weeks 1–9 by player id, `skill_spread.py`,
  `role_spread.py`, `cb_trait.py`; sim by player id, `player-spread.mts`).
  Split-half reliability of player medians, Spearman–Brown corrected:
  - **Corners:** open-field lead (intercept angle minus aim) is a real habit
    within a corner's main pre-snap role (0.65; press and off roles differ by
    6–7°, which hides it when roles are mixed). It tracks nothing tracking can
    measure about him: top speed, acceleration, closing at the throw, redirect
    after the catch (|r| ≤ 0.12, 136 corners). Ours: 0.00.
  - **Safeties:** the lead trait is where they line up. 0.13 once each role's
    mean is removed. Nothing to build.
  - **DL and LB lead:** 0.20 and 0.24, below the 0.4 bar.
  - **Real NFL spreads elsewhere:** LB closing on the catch point at the throw
    0.59; safety closing angle on arrival 0.51; DL approach speed 0.51. Our
    ratings move none of these for LB and DB (|rho| ≤ 0.15).
- **Cause:** *confirmed*: the pursuit rating's only lever is a timing error
  drawn fresh every play.
- **Tried:** `PURSUIT_TENDENCY` (branch `defense/C9-pursuit-tendency`,
  unregistered, no PR). A per-player, zero-mean misjudgment of the meeting time
  gave DL and LB a habit (0.44 / 0.38 at an oversized 0.6 s), but not DBs: a
  DB's requested lead carried it (0.38) while his achieved lead did not. The
  form is also wrong. A trait seeded by player id has no cause a scout could
  see; a habit must come from something the player has.
- **Open:** the corner habit has no measured source. LB closing at the throw
  waits on what the early close is read from (Coverage).

<a id="rat-5"></a>
### RAT-5: Acceleration and change of direction are not player traits in motion

- **Symptom:** our corners do not differ from one another in how they
  accelerate or redirect. A management game needs a quick corner to look quick.
- **Measure** (2026-11-13, `player-spread.mts`, 8 games, 52–66 corners and
  nickels):
  - acceleration from under 3 yd/s: split-half reliability 0.08;
  - heading change in the first 0.5 s after the catch: 0.14 (p10–p90 7.2–14.2°;
    NFL corners 9.0–13.6°);
  - neither tracks the profile's `tau` or `lateral` (|r| ≤ 0.2);
  - top speed is a trait (0.68). Game peak speed tracks profile `vmax` across
    273 players (r 0.89); the corners' own range is about 4%.
- **Cause:** *hypothesis*: in these windows motion is set by the request and the
  shared turn and drive limits more than by the player's own capacities.
- **Open:** the profile owner's call. First check where `tau` and `lateral`
  enter a redirect out of a backpedal or trail.

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
