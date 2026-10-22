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
| [TKL-1](#tkl-1) | Too many missed and broken tackles | G1 | high | open |
| [TKL-2](#tkl-2) | Pursuit angles and speed unlike tracking | G1 | high | open |
| [TKL-3](#tkl-3) | Fast receivers break catch tackles twice as often | G1, G3 | medium | open |
| [PRO-1](#pro-1) | Edge rushers meet the tackle at the line and walk through him | G5 | high | open |
| [PRO-2](#pro-2) | Pressure arrives too early and from the wrong places | G5 | high | open |
| [PRO-3](#pro-3) | Interior pairs move as one block | G5 | medium | open |
| [PRO-4](#pro-4) | The QB doesn't slide away from an edge | G5 | medium | open |
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
- **Cause:** *hypothesis* (G1 has just started). Candidates: pursuit angle
  (TKL-2), closing speed, tackle resolution, and a missing second defender.
  #191 found that the long-run tail (RUN-2) is a deep-support problem, not a
  missed-tackle one, so this is a separate fault.
- **Where:** `src/sim/tackle.ts`; scorecard probe `missedBy`, split by
  DL, LB, CB and S.
- **Tried:** `BLOCKED_REACH` (#190, off) lets a blocked defender reach for a
  runner passing his free side. Covered/free conversion goes to 13/23% vs NFL
  11/24%.
- **Open:** split misses by cause before changing anything (G1 brief).

<a id="tkl-2"></a>
### TKL-2: Pursuit angles and speed unlike tracking

- **Measure** (#191, research builds): 32–33% of close pursuers (0–6 yd) aim at the carrier
  himself; NFL 19–21%. Real pursuers aim ahead. On runs of 20+, our pursuers
  run at 0.55 of max speed; NFL 0.71.
- **Cause:** *likely* the pursuit controller aims at the current position and
  doesn't commit to full speed.
- **Where:** pursuit in `run-fits.ts` and `defense.ts`; `scripts/diag/pursuit.py`.

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
- **Cause:** *likely* PRO-1 and PRO-3. The overall rate can look right while
  the timing and source are wrong.
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

## Pass defense and coverage

<a id="cov-1"></a>
### COV-1: Zone defenders barely close while the ball is in the air

- **Measure** (#190): the nearest zone defender closes 0.12 yd during the
  flight; NFL 0.65.
- **Cause:** *hypothesis:* a late trigger (reacting to the catch, not the
  throw), the wrong aim point (the receiver, not the catch point), or a slow
  closing speed. G3 is diagnosing this now.
- **Where:** `src/sim/behaviors/defense.ts`, `coverage/`, `coverage-leverage.ts`.

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
- with `FRONT_ALIGN` on, the Quarters Flat defender's carry changes
  (`test/quarters-trips-rules.test.ts` is pinned to the old front);
- with `WR_ALIGN` and `OL_SPLITS` on, the match hook defender stops carrying
  the doubles seam (5.7 yd away versus 4.8 yd for a spot dropper;
  `test/integration/coverage-panel.test.ts` is pinned);
- with the line stagger on, jet motion numbering inside the tight end is
  unsettled (`test/offensive-motion.test.ts` is pinned);
- with `WR_ALIGN` on, the Cover 3 Match corner never zones off the short out
  (`test/corner-one-release.test.ts` is pinned);
- with `OL_STAGGER` on, the weak linebacker bumps 5.3 yd on across motion,
  past the test's 5-yd limit, which may itself need a look
  (`test/motion-check.test.ts` is pinned).

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
  called on a single interval of 0.15 yd/s opposing Δv. 39% came in the
  first 0.25 s of the block and 44% with the defender still squarely in front
  (|phi| < 0.5); 30% had him at or past the blocker's hip. `HOLD_LEVERAGE`
  calls a grip a hold only once the defender has leverage past the blocker
  (|phi| ≥ 1, the engagement's own "beaten at the hip") or it takes his feet:
  5.29 → 1.50 accepted per team-game on identical games.
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

- **Measure:** 31.5 CPU s per game (`dev-24`), 43–70 s (`dev-12`, depending
  on how many workers share the CPU); some games run
  60–80 s, and high-scoring games are slower. The main branch ran at 1.2 s per
  game. `physics/world.ts` takes 43% of a profiled game.
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
- `baseline-runner.test.ts` refuses Node versions other than 22.23.3, so 3
  core tests fail on 22.22 machines.
- `test:data` has 2 failures and 2 errors in `test_orientation_motion_audit`,
  reproduced on #190's tip (#194).
- The NFL play-call replay isn't built yet (CALL-1).

## Repository and process

<a id="repo-1"></a>
### REPO-1: Repository and process debt

- GitHub's default branch is still the old engine (`main`, Oct 8). The trunk is
  `develop` (REPO-001).
- About 20 Codex draft PRs (#86–#166) and #114 sit outside the integration
  pass. They're decided at the first review.
- `docs/` holds about 128 MB of evidence and receipt files.
- Flags: develop has 44; the integration pass adds about 35, all off by
  default. Each must be made the default or deleted by review 2.
- **Two meanings of "default":** `config/baseline.json` turns flags on for
  `baseline:run` profiles (13 on `prof194`) while the source defaults stay off.
  The scorecard and games use the source defaults. Numbers from a profile are
  not numbers from develop.
- `docs/STATUS.md`, `INTEGRATION.md`, `ISSUES.md` and `WORKBOARD.md` describe
  the old process. `PLAN.md` and `GAPS.md` replace it.

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
