# Known problems

The long list of what we know is wrong, missing or unproven in the engine,
with the evidence behind each item. [GAPS.md](GAPS.md) is the short ranked list
we work from. This file is the reference behind it: when a gap is picked,
start here for what's already known, what was tried and what's still open.

First drafted on 2026-10-22 from the issue register (`docs/ISSUES.md`), the
Oct 8 engine review (`docs/archive/reviews/2026-10-08-engine-review.md`), the
Oct 22 audit, the diagnostics in #191 and the write-ups in #190, #192, #193,
#194, #196 and #198. Add to it whenever something new is found, and mark an
entry resolved instead of deleting it.

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
| `NFL` | Mostly Big Data Bowl 2025 tracking (2022, weeks 1–9). The outcome bands are the scorecard's. |

### Current: develop at `57f50fc3`

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
| [TKL-1](#tkl-1) | Too many missed and broken tackles | G1 | high | in work |
| [TKL-2](#tkl-2) | Pursuit angles and speed unlike tracking | G1 | high | in work (#205) |
| [TKL-3](#tkl-3) | Fast receivers break catch tackles twice as often | G1, G3 | medium | open |
| [PRO-1](#pro-1) | Edge rushers meet the tackle at the line and walk through him | G5 | high | in work |
| [PRO-2](#pro-2) | Pressure arrives too early and from the wrong places | G5 | high | open |
| [PRO-3](#pro-3) | Interior pairs move as one block | G5 | medium | open |
| [PRO-4](#pro-4) | The QB doesn't slide away from an edge | G5 | medium | open |
| [PRO-5](#pro-5) | No pass protection calls | G9 | high | open |
| [COV-1](#cov-1) | Zone defenders barely close while the ball is in the air | G3 | high | open |
| [COV-2](#cov-2) | Too much yardage per attempt and after the catch | G3 | high | open |
| [COV-3](#cov-3) | Coverage rules and calls not yet complete | G3 | medium | in work (#193) |
| [COV-4](#cov-4) | Defenders react late to jet motion | G3 | low | on |
| [COV-5](#cov-5) | Older coverage contracts that fail or are unproven | G3 | medium | open |
| [BALL-1](#ball-1) | Too many interceptions | G4 | high | flag (partial) |
| [QB-1](#qb-1) | Throws come out early and deep | G3, G7 | medium | open |
| [QB-2](#qb-2) | Too many scrambles, and completions slightly low | G5, G7 | low | open |
| [KICK-1](#kick-1) | Kicking too accurate, too many punts | — | low | open |
| [ALN-1](#aln-1) | Defensive pre-snap picture unlike tracking | G2, G3 | medium | on |
| [ALN-2](#aln-2) | Offensive formations over-compress the box | G2, G7 | medium | open |
| [RULE-1](#rule-1) | Too many penalties, especially defensive offside | G6 | medium | open |
| [RULE-2](#rule-2) | Rule coverage incomplete | G6 | low | open |
| [CALL-1](#call-1) | Play-calling not checked against NFL tendencies | G7 | medium | open |
| [CALL-2](#call-2) | Defensive calls read raw ratings that aren't on one scale | G7 | medium | on |
| [CALL-3](#call-3) | Pressure rate ignored the coverage shell | G7 | low | on |
| [INFO-1](#info-1) | Players use information they couldn't have seen | — | medium | open |
| [PHY-1](#phy-1) | Contact and hand physics limits | F2, G5 | medium | open |
| [PHY-2](#phy-2) | Movement detail that's costly or unproven | F2 | low | open |
| [RAT-1](#rat-1) | Ratings and capability mappings uncalibrated | — | medium | open |
| [RAT-2](#rat-2) | Team habits drawn without within-team scatter | — | low | open |
| [GAME-1](#game-1) | Game-rule and accounting defects from the Oct 8 review | — | — | resolved |
| [GAME-2](#game-2) | Remaining accounting limits | — | low | open |
| [PERF-1](#perf-1) | Games are slow to simulate | F2 | high | open |
| [PERF-2](#perf-2) | Measurement noise and tooling limits | F1 | medium | open |
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
  (`dev-12`); NFL 0.11–0.16. Runs that break contact are 12.7–19% on the flag
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

<a id="tkl-3"></a>
### TKL-3: Fast receivers break catch tackles twice as often

- **Measure** (#190, `prof190`): catch contacts break 24% of the time, NFL 12.6%.
  Fast receivers break 47% (NFL 23%); mid-speed receivers 7% (NFL 9%).
- **Cause:** *likely* it starts before the catch: the defender arrives late and
  moving the wrong way (COV-1), so the tackle is an arm tackle.

## Pass protection

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

## Rules and penalties

<a id="rule-1"></a>
### RULE-1: Too many penalties, especially defensive offside

- **Measure:** 6.8 penalties per team-game (`dev-24`), 7.5 (`dev-12`); NFL 2.5–4.
  Defensive offside is about three times the NFL rate (#190).
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
  called on a single interval of 0.15 yd/s opposing Δv. Open: what makes a
  grip prohibited grabbing.
- **Cause, offside:** *hypothesis* (#190): hard counts draw defenders too
  easily. `SNAP_REACT` models the snap as perception and timing.
- **Open:** holding (above), then the missing defensive fouls.

<a id="rule-2"></a>
### RULE-2: Rule coverage incomplete

- The #189 review kept 350 unresolved rule observations and 62 explicit
  limitations. These are evidence gaps, not 350 proven fouls.
- The holding enforcement spot is fixed, but the accept/decline choice is
  simple (GAME-001).

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

These break the model rule that players act on acquired, delayed information.

## Physics and movement

<a id="phy-1"></a>
### PHY-1: Contact and hand physics limits

- **Center-hand tangential law loses angular momentum** (PHY-001): a
  *confirmed* live law defect. A correction exists but is experimental.
- **Hands at the muscle cap** in pass protection (PRO-1).
- **Summed double-team drive** (RUN-3).
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
