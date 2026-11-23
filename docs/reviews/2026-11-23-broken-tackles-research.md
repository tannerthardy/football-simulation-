# Broken and missed tackles in the NFL: how often, when and why (2026-11-23)

The user's question, through Integration: does our sim have far too many broken and missed tackles? Tracking alone
cannot answer it. Research and writing only. Every number carries its source, season, access date (2026-11-23 unless
marked) and the source's own definition: charting services disagree on what "broken", "missed", "missed tackles
forced" and "avoided" mean. No raw data is committed.

## Answer in brief

- **The old band is now sourced.** The project's unverified band of 0.11–0.16 per play (KNOWN_PROBLEMS TKL-1) is
  PFF's **missed tackles** per scrimmage play: 0.107 (2014 full season), 0.124 (2022 weeks 1-9, PFF charting
  released as Big Data Bowl 2024 data) and 0.156 (2024 weeks 1-3). PFF charts at most one miss per defender per play,
  contact is not required, and PFF calls broken tackles a subset of misses. So the band is not misses plus breaks
  added together.
- **Pro Football Reference** (charted by Sportradar) counts fewer: 0.094–0.107 missed tackles per scrimmage play
  (2018–2025, except a broken 2022). Missed-tackle % is 8.4–10.1%. Broken tackles are about one per 14–16 carries
  (0.061–0.072) and 0.058–0.070 per reception. On the same games PFF counts 1.4–1.6× PFR's misses.
- **Per tackle attempt:** a miss on about 12–18% of attempts (Big Data Bowl 2024 labels, depending on the
  denominator); NFL Next Gen Stats puts 2024 at about 13% (not independent: its model was tuned to 15–20%).
- **Plays with at least one miss (PFF, 2022 weeks 1-9):** 10.5% of scrimmage plays, 14.2% of runs and completions.
- **Our engine, like for like** (TKL-1's 24-game counts, defense only, at most one per defender per play):
  - **0.200 failed defender opportunities per snap: about 1.3–1.9× the NFL** (PFF 0.107–0.156);
  - **plays with at least one, 0.153 per snap: about 1.46× the NFL's 10.5%;**
  - the engine's 0.336 total raw events per snap has no NFL counterpart, so do not compare it.
  So the sim has too many, but closer to 1.5× than the 3× the old comparison implied.
  Caveat: these engine counts are TKL-1's (#205, 24 games, an older promoted profile, `scripts/diag/g1/finish.ts`),
  not a measurement on engine-91. Defense should recount on the current engine with the like-for-like rule in the
  table below before acting.
- **When:** defensive backs miss most often and linemen least. Open-field attempts have the highest predicted miss
  probability and near-sideline ones the lowest (Big Data Bowl notebook). Misses rise with fatigue (consecutive
  snaps). No public NFL split exists by approach angle or closing speed.
- **Why:** distance at the attempt is the strongest predictor in the tracking models. Rugby's large studies give
  numbers that need video to apply:
  - tackles from behind triple the risk of a break (relative risk 3.0);
  - arm tackles succeed 11–13 points less than shoulder tackles;
  - leg drive, for either player, has odds ratios of 3–6.
- **Coaching** names overrunning, a wide angle (cutback), breaking down too early, and arm or high tackles.

## Getting the labels (checked 2026-11-23)

- **Official copy:** the Big Data Bowl 2024 competition data is gone from Kaggle. Its only file is a README: "The
  dataset for this competition has been removed at the request of the host." The Big Data Bowl 2025 competition page
  shows the same README.
- **Where the labels came from:** at the user's direction, `tackles.csv` and `plays.csv` were taken from a
  third-party Kaggle re-upload: `kaggle datasets download anis105/database -f nfl-big-data-bowl-2024/tackles.csv`. It
  has 17,426 rows, 9,919 tackles, 2,090 `pff_missedTackle` and 12,025 plays, matching the published counts. The files
  sit locally under `data/raw/bdb2024/` (ignored by git); nothing is committed.
- **Tracking:** the competition's tracking covered the 2022 season, weeks 1-9, the same games as the project's
  Big Data Bowl 2025 archive (`npm run nfl:fetch bdb2025-2022`, the user's Drive copy; checksum verified).
  - 11,333 of the 12,025 labelled plays (94%) are in its `plays.csv`.
  - In week 1, 1,917 of 2,051 labelled defenders (93%) have tracking.
- **What it enables:** miss probability against distance, approach angle and closing speed. No public study gives
  those curves, so they can be computed by joining these labels to that tracking.

## NFL miss probability by approach (computed 2026-11-23)

The Big Data Bowl 2024 PFF labels (one row per defender per play) were joined to the Big Data Bowl 2025 tracking
(2022 weeks 1-9) using Defense's pursuit operator (#868), in `scripts/diag/tackles/bdb2024_miss_curves.py`. The full
tables are in `docs/reviews/data/2026-11-23-tackle-miss-curves/nfl-tables.md`.

**Attempt moment** (agreed with Defense; identical for made tackles, misses and the sim): the defender's first local
minimum of distance to the carrier below 2.5 yd, or his first frame within 1.0 yd if earlier. Features are read 0.3 s
before it, with 0.5 s as a sensitivity check. The rate is missed / (missed + tackle + assist), one per defender per
play. Label limits: PFF charting, one per defender per play, contact not required, and no timestamp (hence the
geometric attempt moment).

Results:
- **Coverage of the labels:** 16,234 attempts observed. Only 150 labelled defenders (30 of 1,966 misses) never came
  within 2.5 yd. **Miss probability 0.119.**
- **Distance at the attempt:** misses p50 0.88 yd (p90 1.06), made tackles p50 0.88 (p90 1.00), assists p50 0.89.
  - 87% of NFL misses come within 1.0 yd.
  - The engine misses at p50 1.95 yd and wraps at p50 1.38 (Defense, 0226f0d3).
  - Defense traced this to the tackle range counting the tackler's own body radius twice (proposed flag
    TACKLE_REACH). **This is the first concrete mechanism for TKL-1.**
- **Closing speed (0.3 s before):** 0.08 below 4 yd/s, 0.12 at 4-6, 0.16 at 6-8, 0.20 at 8 and over. This is the
  strongest single gradient; the 0.5 s look-back gives the same shape.
- **Distance 0.3 s before the attempt:** 0.05 within 1 yd, 0.10 at 1-2, 0.15 at 2-3, 0.24 at 3-5.
- **Approach bearing in the carrier's frame:** ahead 0.13, level 0.11, behind 0.09. Outside is slightly worse than
  inside (ahead-outside 0.14). In the NFL, chasers from behind miss less, not more: rugby's "from behind triples
  the break risk" does not carry over to these labels.
- **Lateral speed difference** of 4 yd/s or more either way: 0.17, against 0.09 within 2. A cut or sideways chase
  doubles it.
- **Traffic** (other defenders within 5 yd): none 0.15, one 0.13, two 0.13, three or more 0.10.
- **Sideline distance:** 0.04 within 3 yd, 0.10 at 3-6, 0.16 at 6-15.
- **Speed:** carrier speed 8 yd/s or more 0.15, against 0.09 at 2-4. Defender speed peaks at 4-6 yd/s (0.15).
- **Position:** CB 0.14, S 0.12, LB 0.11, DL 0.11.
- **Play type:** run 0.125, catch 0.111.
- **Yards after a miss:** median about 6 yd (5.5-8.4 by bearing), against about 1.5 after a made tackle.

**Validation of the attempt moment against the tracking's own events** (BDB 2025 `first_contact` and `tackle` event
frames; weeks 1-3; attempt minus event, in s; distance in yd at the event frame). `first_contact` is a play-level
event (the play's first contact by anyone), not per defender.

| label | event | n | attempt minus event p25 / p50 / p75 | distance at the event p25 / p50 / p75 | distance at the attempt p50 |
|---|---|---|---|---|---|
| tackle | first_contact | 2,842 | -0.1 / 0.0 / +0.2 | 0.73 / 1.03 / 1.63 | 0.88 |
| tackle | tackle | 2,730 | -1.4 / -0.9 / -0.6 | 0.56 / 0.89 / 1.37 | 0.87 |
| assist | first_contact | 1,680 | 0.0 / +0.2 / +0.7 | 1.01 / 1.61 / 3.08 | 0.89 |
| assist | tackle | 1,678 | -1.7 / -1.1 / -0.7 | 0.48 / 0.74 / 1.15 | 0.89 |
| missed | first_contact | 682 | -0.1 / 0.0 / +0.1 | 0.74 / 1.04 / 1.67 | 0.89 |

- **Timing:** for the labelled tackler, the geometric attempt moment coincides with the play's first contact (median
  0.0 s), and comes about 0.9 s before the tackle event, when the runner is down. It is neither early nor late
  against first contact.
- **Distance:** at the tackle event the tackler is at p50 0.89 yd, so the 0.88 yd distance-at-attempt median does not
  change when read at the event. At `first_contact` the median is 1.03, wider only because that event can belong to
  another defender.
- **Assists:** they arrive after the first contact (+0.2 s) and are closest at the tackle (0.74 yd).

**For Defense's recount on engine-91:** superseded by the shared sim dump in the next section
(`tackle-geometry-dump.mts`, then `tackle_geometry.py rows / compare`).

## Tackle geometry, NFL and sim through one operator (computed 2026-11-23)

Asked by the user: split the miss curves by open field against traffic, and use the labelled tackles as far as they
go on the geometry of a tackle, for diagnosing the engine. Tool: `scripts/diag/tackles/tackle_geometry.py`, with the
same attempt moment and carrier frame as above. The NFL dump (`dump-nfl`) and the sim dump
(`tackle-geometry-dump.mts`) write one shared play format, so `rows`, `tables` and `compare` run identical code on
both. Tables:
- `docs/reviews/data/2026-11-23-tackle-miss-curves/geometry-nfl.md`;
- `geometry-sim.md`;
- `geometry-compare.md` (each bin's share of attempts and its miss rate, side by side).

**Runs.**
- NFL: 16,234 attempts, miss 0.119.
- Sim: 16 default games (seeds 201-216, two 0.55-strength teams, as Defense's `tackle-rates.mts`) on develop
  engine-91 `0226f0d3`, run with `npm run ref` (the engine's defaults). 3,039 attempts, miss 0.105. Runtime about
  6 min per 8 games.
- **Correction (2026-11-23):** the first version of this section (b71fd2ee) ran the sim through
  `baseline:run --candidate`. That applies `config/baseline.json`'s 2026-10-13 profile (pre-promotion flags,
  LINE_START off and others), not engine-91's defaults. Its sim numbers (miss 0.223; 32% of open-field attempts at
  1.5 yd or more) are void and replaced below.

**Labels differ.** Sim labels are engine events, PFF-style, with a miss taking priority:
- missed = a `missed_tackle` or a broken hold;
- tackle = the initial wrap;
- assist = any other wrap.

PFF charts a miss only when a defender had a real chance at the tackle. The engine logs every failed reach, so some
sim rows (a reach while blocked, a lunge from 2 yd) would not be charted. **Compare where attempts happen (the share
columns) before comparing rates.**

**Open field** means:
- no other defender within 5 yd of the carrier;
- no other defender in contact during the previous 0.5 s;
- no blocker within 1.5 yd of the tackler;
- carrier moving at 2 yd/s or more.

### NFL findings (the open-field split the user asked for)

- **The from-behind result was confounded, as the user suspected.**

  | defenders within 5 yd | ahead | level | behind |
  |---|---|---|---|
  | none | 0.27 | 0.12 | 0.13 |
  | 1-2 | 0.14 | 0.12 | 0.09 |
  | 3+ | 0.10 | 0.10 | **0.05** |

  - The low from-behind rate comes from piles and crowds.
  - An open-field chase from behind misses about as often as an attempt from level (0.11-0.13).
  - Open-field head-on attempts miss at 0.25-0.27, about twice the rate from level or behind.
  - A defender who arrives while another is already in contact misses 0.04, against 0.15. With two or more other
    defenders within 1.5 yd of the carrier, he misses 0.03.
- **Open field, what predicts a miss** (n 2,422, miss 0.14). In the joint logistic model (section F of
  geometry-nfl.md), the terms that survive are below.
  - **Aim against the lead the intercept needs** (z +6.5, the largest):
    - within ±10° of the required lead, 0.07;
    - 10-30° under-led, 0.12;
    - over-led by 10-30°, 0.32;
    - under-led by more than 30°, 0.32.

    Taking the right angle matters more than speed or facing.
  - **Approach angle between the two velocities:** chasing within 45°, 0.09; 45-90°, 0.22; 90°+, 0.25-0.27.
  - **Lateral speed difference:** 0.07 under 1 yd/s, up to 0.31 at 6 yd/s or more.
  - **The carrier's cut over the last 0.5 s:** 0.10 under 10°, rising to 0.27 at 40-60°.
  - **Sideline within 3 yd:** 0.04. The boundary helps the tackler.
  - **The defender's own speed** raises the miss risk at a given geometry (z +4.7). The carrier's speed lowers it.
    Marginally, the fastest defenders (8 yd/s or more) miss least, because they are chasing.
  - **No effect:** slowing down over the last 1.0 s (breaking down; z +0.3); weight ratio; distance at the attempt.

    Slowing down shows no effect once aim is accounted for. A defender who takes the right angle does not need it,
    so it is not the mechanism.
  - **The carrier's facing:** if he faces the tackler, 0.21; if the tackler comes from his blind side, 0.08.
- **Made tackles, how much forward progress the carrier keeps:** forward yards in the 1.0 s after the attempt,
  p25 / p50 / p75.
  - When the tackler's momentum (listed weight × speed) exceeds the carrier's by 1.25×: −0.5 / 1.0 / 2.2. The carrier
    is stopped or driven back.
  - When it is below 0.8× the carrier's: 1.8 / 2.6 / 3.8.

  Mass and speed carry across the contact, as the model rules require. This is the physics check the engine should
  pass.
- **A miss mostly involves contact:**
  - the carrier keeps 0.93 of his speed over the next 0.5 s;
  - he is 1.7 yd from the tackler 0.5 s later;
  - he gains a median 7 yd to the end of the play.

### Sim against NFL, the same operator (geometry-compare.md, engine-91 defaults)

The overall rate is close: 0.105 against 0.119. The open-field rate is not: 0.21 (63/298) against 0.14 (338/2,422).
The misses come from different places. Ranked by frequency × consequence:

1. **Misses from out of range; misses in contact too rare.**

   | distance at the attempt | sim share | NFL share | sim miss | NFL miss |
   |---|---|---|---|---|
   | 1.5 yd or more, all attempts | 9% | 3% | 0.52 | 0.06 |
   | 1.5 yd or more, open field | 13% | 3% | 0.73 | 0.05 |
   | 0.5-1.0 yd, all attempts | | | 0.05 | 0.11 |

   NFL misses happen in contact. The sim's are lunges from range, and its tacklers who get there almost always
   finish. This is Defense's distance finding measured per attempt (TACKLE_REACH, Run Game).
2. **Made tackles finish slowly, so more defenders pile in.**

   | made tackle, open field, p50 | sim | NFL |
   |---|---|---|
   | time from the attempt to the whistle | 1.1 s | 0.7 s |
   | carrier yards to the end | 2.1 | 1.1 |

   - 23% of labelled sim attempts are a third or later tackler, against 4% in the NFL.
   - Mass dominates more than in the NFL. Tacklers with 2× or more of the carrier's momentum: sim 19% of attempts,
     miss 0.04; NFL 8%, miss 0.13.
   - NFL check: momentum over 1.25× the carrier's leaves him p50 1.0 yd forward in 1 s; under 0.8×, 2.6 yd.
3. **After a miss** (open field, p50, sim against NFL):

   | after a miss | sim | NFL |
   |---|---|---|
   | speed kept over the next 0.5 s | 1.00 | 0.93 |
   | separation 0.5 s later | 2.6 yd | 1.7 yd |
   | forward yards in the next 1 s | 5.1 | 2.9 |
   | yards to the end of the play | 7.8 | 7.2 |

   Yards to the end are close: a miss from range costs the carrier no speed, but pursuit still cleans up. This
   follows from item 1.
4. **Pursuit aims at the carrier, not the intercept** (open field):
   - more than 30° under the required lead: sim 24% of attempts, NFL 6% (miss 0.38 and 0.32);
   - tackler squared to the carrier (body within 20° of the line of sight): sim 78%, NFL 43-48%. NFL tacklers
     usually run at a lead angle.

   This is a controller angle (Defense's pursuit), not tackle physics.
5. **The sideline hurts sim tacklers.** Attempts within 3 yd of the sideline: sim miss 0.30 (21/69; open field 9/12),
   NFL 0.04. In the NFL the boundary is the tackler's best help. Small n: read film before naming a mechanism
   (candidates: the tackler giving up the angle to stay in bounds, or the carrier's out-of-bounds finish being scored
   after a missed reach).
6. **Turned and blocked attempts:**
   - running 90°+ off his own facing: miss 0.24 against 0.08;
   - with 2+ blockers within 1.5 yd: 0.15 against 0.07.

   Smaller than before, and partly label asymmetry (PFF would not chart a blocked defender's reach).

**Not changed by this:** no engine code. The sim's open field has 298 attempts, one roster pair, one engine pin.

**Next decision:** re-run this comparison (16 games, about 12 min with `npm run ref`) before and after
TACKLE_REACH. The share at 1.5 yd or more and the 0.5-1.0 yd miss rate should both move toward the NFL. Item 2
needs a film look at slow finishes; item 4 goes to Defense's pursuit work; item 5 needs film.

## Definitions mapped onto our engine events

Our engine records two events (`src/sim/tackle.ts`):
- **missed tackle:** an attempt that never establishes a hold (a failed dive, a whiffed reach, or a grab that does not
  connect);
- **broken tackle:** a hold established, then escaped.

| source term | definition (short) | closest engine event | like-for-like count |
|---|---|---|---|
| PFF missed tackle | a defender fails a "would-be sure tackle"; one per defender per play; contact not required; includes broken | missed + broken, deduplicated per defender per play | per defender per play, defense only, ÷ all scrimmage plays |
| PFF broken tackle | defender "wrapped up" but "couldn't bring him to the ground" | broken | per defender per play |
| PFF missed tackles forced (offense) | misses credited to the carrier | missed + broken, per carry / reception | per carry or reception |
| PFR / Sportradar missed tackle (MTkl) | defender in position fails; MTkl% = MTkl ÷ (MTkl + combined tackles) | missed + broken | per defender per play; % against tackles |
| PFR broken tackle (BrkTkl) | the carrier does "something significant to get past/through a defender" | broken, plus jukes that beat a defender in position | per carry / reception |
| SIS missed tackle | "eluded without meaningful contact" | missed | per defender attempt |
| SIS broken tackle | contact made, carrier escapes (no public written definition) | broken | per defender attempt |
| NGS missed tackle rate | model-based tackle opportunity not converted | missed + broken | per opportunity |
| Big Data Bowl 2024 `pff_missedTackle` | "the given player missed a tackle on the play" (PFF charting, no timestamp) | missed + broken, per defender per play | per defender per play |

Details, conflicts and every source are in the three sections below.

# Part A: how often (rates and definitions)

Research note, written 2026-11-23. All sources were accessed on 2026-11-23 unless marked otherwise.

**Confidence labels**

- **high**: read directly from the page, or computed from the source's own data with the arithmetic shown.
- **med**: read from a secondary article or snippet that quotes the source.
- **low**: inferred.

**How the data was reached**

- pro-football-reference.com (PFR) returned HTTP 403 to every fetch. PFR's numbers here come from the nflverse mirror of PFR's advanced tables. These are the same columns PFR shows (`brk_tkl`, `att_br`, `rec_br`, `m_tkl`, `m_tkl_percent`):
  - season files: https://github.com/nflverse/nflverse-data/releases/download/pfr_advstats/advstats_season_{rush,rec,def}.csv
  - weekly files: https://github.com/nflverse/nflverse-data/releases/download/pfr_advstats/advstats_week_{def,rush,rec}_{2022,2024}.csv
  - The PFR season pages themselves are, for example, https://www.pro-football-reference.com/years/2023/defense_advanced.htm and https://www.pro-football-reference.com/years/2023/rushing_advanced.htm.
- The mirror rows are regular season only. For 2023, PFR's receptions total (11,808) equals the nflverse play-by-play regular-season completions exactly.
- I removed exact duplicate rows that the mirror creates for same-named players (for example, two "David Long" ids). This changed 2023 MTkl from 3,235 to 3,207.
- Play counts come from nflverse play-by-play: https://github.com/nflverse/nflverse-data/releases/download/pbp/play_by_play_{YEAR}.csv.gz
  - A "scrimmage play" is a regular-season play with `play_type` in {run, pass, qb_kneel, qb_spike} and `play==1`. That excludes plays nullified by penalty. Sacks, scrambles and incompletions are included.
- The pff.com and nfl.com pages below were read directly.

---

### Rates

#### 1. PFR advanced stats (charted by Sportradar), league totals, regular season

**Columns**

- **Brk/att**: rushing broken tackles ÷ rushing attempts. PFR's rushing attempts include kneels.
- **Brk/rec**: receiving broken tackles ÷ receptions.
- **MTkl% (computed)**: MTkl ÷ (MTkl + Comb).
- **Team-games**: twice the number of games.
- **Scrim**: nflverse scrimmage plays.

The arithmetic for 2023:

- 956/14,606 = 0.0655
- 829/11,808 = 0.0702
- 3,207/(3,207+34,409) = 8.5%
- 3,207/544 = 5.90 per team-game
- 3,207/33,963 = 0.094 per play
- (956+829)/33,963 = 0.053
- (3,207+956+829)/33,963 = 0.147

| Season | Rush BrkTkl / Att | Brk/att (Att/Br) | Rec BrkTkl / Rec | Brk/rec (Rec/Br) | MTkl / Comb | MTkl% | MTkl / team-game | Scrim plays | MTkl / play | BrkTkl (rush+rec) / play | (MTkl+BrkTkl) / play |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 2018 | 875 / 13,270 | .066 (15.2) | 716 / 11,462 | .063 (16.0) | 3,410 / 30,326 | 10.1% | 6.66 | 31,881 | .107 | .050 | .157 |
| 2019 | 967 / 13,387 | .072 (13.8) | 744 / 11,331 | .066 (15.2) | 3,433 / 30,869 | 10.0% | 6.71 | 32,158 | .107 | .053 | .160 |
| 2020 | 897 / 13,792 | .065 (15.4) | 797 / 11,756 | .068 (14.8) | 3,432 / 31,417 | 9.8% | 6.70 | 32,575 | .105 | .052 | .157 |
| 2021 | 925 / 14,493 | .064 (15.7) | 752 / 12,121 | .062 (16.1) | 3,502 / 34,699 | 9.2% | 6.44 | 34,139 | .103 | .049 | .152 |
| 2022* | 749 / 14,770 | .051 (19.7) | 677 / 11,605 | .058 (17.1) | 2,292 / 34,544 | 6.2% | 4.23 | 33,768 | .068 | .042 | .110 |
| 2023 | 956 / 14,606 | .066 (15.3) | 829 / 11,808 | .070 (14.2) | 3,207 / 34,409 | 8.5% | 5.90 | 33,963 | .094 | .053 | .147 |
| 2024 | 917 / 14,833 | .062 (16.2) | 708 / 11,941† | .059 (16.9) | 3,380 / 35,482 | 8.7% | 6.21 | 33,470 | .101 | .049 | .150 |
| 2025 | 901 / 14,735 | .061 (16.4) | 665 / 11,543† | .058 (17.4) | 3,323 / 36,051 | 8.4% | 6.11 | 32,941 | .101 | .048 | .148 |

Confidence: **high** for the counts read from the data and the arithmetic. Attribution to PFR is through the mirror, which is **med–high**.

**Notes on the table**

- \* **2022 is anomalous.** In weeks 1–9, PFR's weekly file has MTkl 1,303 over 136 games. That leaves only 989 MTkl for the remaining 135 games. Treat 2022 PFR MTkl and BrkTkl as a charting or data gap, not football.
- † **2024–25 reception totals.** PFR's sums exceed nflverse play-by-play regular-season completions: 11,629 in 2024 and 11,217 in 2025. This is unexplained, possibly from duplicated join rows. The per-reception rate shifts by about 3%.
- **Formula check.** PFR's MTkl% = MTkl/(MTkl+Comb) is confirmed by row arithmetic. For example, Foyesade Oluokun 2023 has Comb 173, MTkl 22 and listed 0.113, and 22/195 = 0.1128. (**high**)
- **Team spread, MTkl per 17 games:**
  - 2023: minimum 61 (3.6/game), median 97 (5.7), maximum 129 (7.6).
  - 2024: minimum 69 (4.1), median 100.5 (5.9), maximum 157 (9.2).
  - Confidence: **high**.

**Broken tackles by position, PFR**

Positions are PFR roster positions. HB and FB are counted as RB.

| Season | RB rush Brk/att | WR rush | QB rush Brk/att | RB Brk/rec | WR Brk/rec | TE Brk/rec |
|---|---|---|---|---|---|---|
| 2019 | .079 (876/11,123) | .079 (34/428) | .031 (56/1,798) | .101 (271/2,681) | .053 (329/6,251) | .060 (143/2,370) |
| 2021 | .068 (802/11,768) | .088 (43/488) | .036 (79/2,171) | .101 (273/2,695) | .050 (341/6,885) | .054 (136/2,498) |
| 2023 | .069 (808/11,668) | .104 (48/461) | .042 (99/2,366) | .119 (300/2,512) | .053 (348/6,574) | .066 (176/2,654) |
| 2024 | .065 (780/11,972) | .079 (34/433) | .041 (97/2,355) | .100 (237/2,369) | .049 (334/6,785) | .050 (137/2,767) |
| 2025 | .065 (778/11,975) | .076 (29/383) | .039 (88/2,236) | .099 (232/2,336) | .046 (288/6,313) | .050 (144/2,875) |

Confidence: **high** (data). In every season 2018–25:

- RB rushing is 0.055–0.079 broken tackles per carry, about 1 per 13–18 carries.
- QB rushing is 0.03–0.04, and QB attempts include kneels.
- RB receiving is about 0.10 per catch.
- WR receiving is about 0.05 per catch.
- TE receiving is 0.05–0.066 per catch.

**Illustrative players, 2024 (PFR)**

- Derrick Henry: 42 BrkTkl on 325 rushes (Att/Br 7.7), and 8 receiving.
- Josh Jacobs: 35 on 301 rushes (8.6).
- Saquon Barkley: 19 on 345 rushes (18.2).

Confidence: **high**. Compare these with PFF's missed tackles forced in §2, which are 2–4× larger.

#### 2. PFF (Pro Football Focus)

| Sample | Numerator | Denominator | Rate | Source | Confidence |
|---|---|---|---|---|---|
| 2014 regular season, all 32 defenses | 3,767 defensive missed tackles, summed from the team table | 35,149 defensive snaps, PFF's own snap count | **0.107 missed tackles per defensive snap** (teams 0.086–0.136; 7.4 per team-game) | "Signature Stats: Tackling Efficiency by Team", posted 2015-02-10, https://www.pff.com/news/sig-stats-tackling-efficiency-by-team. It describes the stat as "the average number of players to miss a tackle on defense per play". | high (table read; sum computed) |
| 2014 special teams | 581 missed tackles | n/a | about 18 per team-season | same | high |
| 2024 weeks 1–3, all 32 teams | 901 missed tackles, summed from the team list (teams 14–41) | 5,767 scrimmage plays in those 48 games (nflverse) | **0.156 per scrimmage play**; 9.4 per team-game | "Most/fewest missed tackles through Week 3", posted 2024-09-25, https://www.pff.com/news/nfl-most-fewest-missed-tackles-through-nfl-week-3. No definition is given, and it does not say whether special teams are included. | high for the counts; med for the denominator match |
| 2022 weeks 1–9, PFF charting released in NFL Big Data Bowl 2024 (`tackles.csv`, `pff_missedTackle` flag per defender per play) | 2,090 missed-tackle flags, from 17,426 defender-play rows over 136 games | (a) 12,486 BDB ball-carrier plays (runs and completions); (b) 16,900 nflverse scrimmage plays in the same 136 games | **(a) 0.167 per ball-carrier play; (b) 0.124 per scrimmage play** | BDB 2024 data. I obtained it from a public copy at https://raw.githubusercontent.com/sesh9096/csci4502project/main/data/tackles.csv (plus plays.csv and games.csv). The original is on Kaggle, "NFL Big Data Bowl 2024", which needs a login. | high (computed); med on the copy's fidelity, though its row count of 17,426 and 136 games / 12,486 plays match the published dataset description |
| same BDB sample: **share of plays with ≥1 missed tackle** | 1,777 plays | 12,486 ball-carrier plays / 16,900 scrimmage plays | **14.2% of ball-carrier plays; 10.5% of scrimmage plays** | computed | high |
| same, by play type | runs (6,381 plays): 0.185 per play, 15.6% with ≥1; completed passes (5,634): 0.143 per play, 12.2% with ≥1; scrambles (471): 0.225 per play, 19.7% with ≥1 | | | computed | high |
| same: misses per play distribution | 0 misses: 10,709 plays; 1: 1,509; 2: 232; 3: 30; 4: 4; 5: 1; 6: 1 | | so about 15% of plays with a miss have two or more missing defenders | computed | high |
| same: per-defender miss rate | 2,090 / (2,090 + 9,919 tackles + 5,494 assists) | | **11.9% of defender tackle involvements** | computed | high |
| same: same defender missed and then also got a tackle or assist on the play | 77 rows | | the flag is binary per defender per play, so it cannot count two misses by one defender | computed | high |
| Players, 2024 including playoffs, rush plus receiving | Henry 78 MTF; Barkley 70; Jacobs 67 | | Henry is about 0.21 per touch | "NFL's best tackle-shedding RBs", posted 2025-03-25, https://www.pff.com/news/nfl-best-tackle-shedding-running-backs-derrick-henry-kenneth-walker-2024 | high for the counts; low for the per-touch rate (touches estimated) |

**Same games, two charters**

For the identical 136 games of 2022 weeks 1–9:

- PFF missed tackles: **2,090** (0.124 per scrimmage play).
- PFR/Sportradar MTkl: **1,303** (0.077 per scrimmage play).
- PFR BrkTkl: **769** (415 rushing + 354 receiving; 0.046 per scrimmage play).
- PFF counts about 1.6× PFR's MTkl.
- PFR MTkl + BrkTkl = 2,072, which is numerically close to PFF's 2,090.

For 2024 weeks 1–3, PFF has 901 and PFR has 642, so PFF counts 1.40× PFR. Confidence: **high** (computed).

#### 3. NFL Next Gen Stats (NGS), model-based, 2024 onward

- **League rate, 2024.** "Missed tackle rate" league average was **13%**, the complement of tackle efficiency (about 87%). Teams ranged roughly 83.7%–89.3% efficiency (Cleveland Browns 83.7%, Kansas City Chiefs 89.3%). Carolina Panthers missed the most tackles, **208**.
  - Source: NFL.com, "Ranking all 32 teams by tackling metrics", 2024 season, https://www.nfl.com/news/ranking-all-32-teams-by-tackling-metrics-chiefs-dominate-broncos-crack-top-three-lions-pace-nfc
  - Confidence: **high** (read on page; the publication date field was blank).
- **Calibration caveat.** AWS states that NGS "aimed for a missed tackle rate of around 15-20%, in line with historical data from other sources".
  - Source: AWS, "A new take on tackling…", Ari Entin, 2024-09-10, https://aws.amazon.com/blogs/media/a-new-take-on-tackling-nfl-next-gen-stats-and-aws-bring-data-to-the-gridiron/
  - Confidence: **high**.
  - The NGS rate was therefore **tuned toward earlier charting (likely PFF)** and is not independent evidence.
- **Rough per-play estimate.** If 2024 made tackles are about 35,482 (PFR Comb), then NGS misses ≈ 35,482 × 0.13/0.87 ≈ 5,300, or about 0.16 per scrimmage play. Confidence: **low** (NGS counts its tackle attempts differently from Comb).

#### 4. SIS and FTN / Football Outsiders

- No public league totals were found. SIS publishes these in its subscription Data Hub, and FTN publishes them in paid tables.
- **2016 example.** Acta/SIS reported broken-tackle "percentage per touch" for early 2016 (for example, David Johnson 37% over weeks 1–3; https://actasports.com/statoftheweek/broken-tackle-leaders). This is one player only. Confidence: **med** (search snippet).

---

### Definitions

| Source term | Who charts it | Definition as stated | Contact required? | Counting unit |
|---|---|---|---|---|
| **PFR "BrkTkl"** (rushing and receiving; Att/Br, Rec/Br) | Sportradar game charting. PFR's About Advanced Stats page says its data is "provided by Sportradar game charting" (snippet; page 403 to me). | A broken tackle is when the runner does "something significant to get past/through a defender". | Not stated. "Get past/through" admits both jukes and breaking contact. | Credited to the ball carrier. Per carry/reception counts are summed. Whether one carry can have several is not stated, but the counts are integers per player-game, so several per play are likely possible. Confidence: **med** (search snippet of https://www.pro-football-reference.com/about/advanced_stats.htm). |
| **PFR "MTkl" / "MTkl%"** | Sportradar | Snippet wording: a defender "should have reasonably brought down the ball carrier but failed to do so". MTkl% = MTkl/(MTkl+Comb), verified from the data. | Not stated | Charged per defender. Totals are about 1.8× the offensive BrkTkl, so MTkl includes failures that are not credited as broken tackles (whiffs, sacks or QBs, unclear). Confidence: **med** for the wording, **high** for the formula. |
| **PFF "missed tackle"** (defense) | PFF charters | Glossary: "Did a defender miss a would-be sure tackle on a play?" Tackling efficiency counts misses against the run and after the catch. The 2014 piece calls the per-snap metric "the average number of players to miss a tackle on defense per play". https://www.pff.com/news/pro-pff-signature-statistics-a-glossary | Not required (see MTF) | **One flag per defender per play** (BDB `pff_missedTackle` is 0/1 per player-play). Several defenders can each be charged on one play: 15% of miss plays have two or more. Confidence: **high**. |
| **PFF "missed tackles forced" (MTF)** | PFF | "whether a running back (or any ball carrier) did something to make a would-be sure tackler, miss said tackle" (glossary). The 2025 article says "an attempt must be made but contact isn't required", and that it is "more common when a running back attempts a juke move". | **No** | The offensive mirror of PFF missed tackles, credited to the carrier, one per beaten defender. Confidence: **high**. |
| **PFF "broken tackle"** | PFF | "a tackle attempt occurred where the tackler had the ball carrier wrapped up" but "couldn't bring him to the ground", "effectively requiring contact" (2025-03-25 article). | **Yes** (a wrap) | A **subset of MTF**. Confidence: **high**. |
| **PFF elusive rating** | PFF | Inputs: "yards after contact, missed tackles forced on carries and on receptions". The formula is not given on the glossary page. | n/a | Confidence: **high** for the inputs. |
| **SIS "missed tackle"** | Sports Info Solutions | "missed tackles (i.e. eluded without meaningful contact)". Valued together with broken tackles: "a broken or missed tackle". Total Points primer, 2020-12-01, updated 2024-08, https://www.sportsinfosolutions.com/?p=1069 | **No meaningful contact** | SIS treats "broken" (contact) and "missed" (eluded) as **disjoint** categories of one event family. The "broken + missed" sum is then the count of defenders beaten. Confidence: **high** for the quote; **low** that the categories are disjoint (not stated explicitly). |
| **SIS "broken tackle"** | SIS | No public written definition found. By contrast with the missed-tackle definition, it is the eluded attempt **with** meaningful contact. | Yes (inferred) | Confidence: **low**. |
| **Football Outsiders / FTN "broken tackle"** (SIS-based charting) | FO's game charters, later SIS data | The ball carrier "escapes the defender's grasp" **or** the defender "has good position" but the carrier "jukes him out of his shoes". A slow defender who dives and misses does **not** count. Only standard plays are charted, not special teams. Quoted by ESPN (2009) and a 2012 FO piece, via search snippets. FO rate per defender = broken tackles / (broken tackles + solo tackles). | No (jukes count) | Per defender beaten. Confidence: **med**. |
| **NGS "missed tackle" / "tackle efficiency" / "missed tackles forced"** | Model: the Tackle Probability model, which estimates all 11 defenders' tackle probability every 0.1 s, with thresholds fine-tuned by NGS analysts using video review. AWS, https://aws.amazon.com/blogs/media/beyond-the-box-score-aws-and-nfl-ai-powered-tackle-analysis/ | "Tackle Efficiency (percentage of tackle attempts that result in a successful tackle)". "Missed Tackles Forced by a ball carrier". Open-field attempts have "no other defenders in a certain radius". The exact threshold is not published. | Not required (probability-based) | Per defender attempt. **Calibrated to a 15–20% miss rate.** Confidence: **high** for the quotes. |

**How the sources differ**

- **PFF** charges a miss to every defender who had a would-be sure tackle and failed, with or without contact. Its broken tackle is the contact subset.
- **SIS** separates broken (contact) from missed (no meaningful contact).
- **PFR/Sportradar** BrkTkl is a ball-carrier stat ("something significant"). MTkl is a defender stat and is about 1.8× BrkTkl, so the two are not one-to-one.
- **Summing does not mean the same thing everywhere:**
  - PFR MTkl + BrkTkl very likely **double-counts** events that are charged on both sides (low–med).
  - PFF "missed + broken" would double-count, because PFF broken ⊂ MTF.
  - SIS broken + missed is plausibly a clean union (low).

---

### Mapping to engine events

**Engine events**

- **E1 "missed tackle"** = a tackle attempt that never establishes a hold.
- **E2 "broken tackle"** = a hold established, then escaped.
- The engine reports three operators per snap:
  - all raw events: **0.336**
  - plays with ≥1: **0.153**
  - per-defender failed opportunities: **0.200**
- `scripts/calibrate.ts` labels its 0.11–0.16 band "PFF-style missed tackles: whiffs plus broken tackles" and divides (missed + broken) by scrimmage plays.

**Closest source term for each engine event**

| Engine event | Closest source term | Why |
|---|---|---|
| E1 (no hold) | SIS "missed tackle" ("eluded without meaningful contact"); PFF MTF minus PFF broken tackles; the FO juke branch | A no-hold whiff corresponds to the no-contact or no-wrap category. Caveat: an engine attempt that makes body contact without a hold would be "broken" for PFR, possibly for SIS, but not for PFF (no wrap). |
| E2 (hold then escape) | PFF "broken tackle" ("wrapped up … couldn't bring him to the ground"); FO "escapes the defender's grasp" | The match is close. PFR BrkTkl is broader, because "something significant" includes jukes. |
| E1 + E2, one per defender per play | **PFF missed tackles / MTF** (binary per defender-play, contact not required) | This is the cleanest NFL analogue of a "per-defender failed opportunity". |

**Which NFL number matches which engine operator**

| Engine operator | Engine value | Like-for-like NFL number | NFL value | Engine / NFL |
|---|---|---|---|---|
| Per-defender failed opportunities per snap (E1 ∪ E2, at most one per defender per play) | 0.200 | PFF missed tackles per scrimmage play | 0.124 (2022 weeks 1–9, BDB); 0.156 (2024 weeks 1–3); 0.107 per defensive snap (2014). Roughly 0.11–0.16 | about 1.3–1.9× |
| Plays with ≥1 per snap | 0.153 | PFF BDB share of scrimmage plays with ≥1 missed tackle | **0.105** (0.142 of ball-carrier plays only) | about 1.46× (scrimmage); about 1.08× if the engine denominator were ball-carrier plays only |
| All raw events per snap (E1 + E2, repeats allowed, both counted) | 0.336 | No direct NFL analogue. The nearest double-counting sum is PFR MTkl + BrkTkl per scrimmage play | 0.147–0.160 (2018–25, excluding 2022) | about 2.2×, but not like-for-like |

**What the 0.11–0.16 band most likely is**

- It matches **PFF per-defender missed tackles per scrimmage play**: 0.107 (2014), 0.124 (2022 weeks 1–9), 0.156 (2024 weeks 1–3).
- It also numerically matches **PFR (MTkl + BrkTkl) per scrimmage play**, 0.147–0.160 across 2018–25 (2022: 0.110). That match comes from a different and double-counting construction.
- Under the PFF reading:
  - The numerator is one count per defender who failed a would-be-sure tackle, with or without contact, regular season, defense only.
  - The denominator is scrimmage plays or defensive snaps.
  - **It is not "missed + broken" summed.** PFF broken tackles are already inside PFF misses.
- The engine's comparable number is the **0.200 per-defender operator**, not the 0.336 raw-event sum.

**To be like-for-like, the engine should count:**

1. At most one failure per defender per play. A defender who whiffs, regrips and is escaped counts once.
2. Exclude a defender who failed and then made the tackle, or note it separately: PFF flags both, but only 77 of 2,090 cases.
3. Restrict to defensive scrimmage plays, excluding special teams. Include sacks and scrambles, and divide by all scrimmage plays, including incompletions.
4. Report the share of plays with ≥1 separately, against the NFL value of 10.5% of scrimmage plays or 14.2% of ball-carrier plays.
5. For broken-only comparisons, use E2 against PFF broken tackles, but no league total of those is public. PFR BrkTkl per carry or catch is broader:
   - RB carry: 0.065
   - all rushes: 0.061–0.066
   - receptions: 0.058–0.070
   - RB catch: 0.10
   - WR catch: 0.05
6. Per-carry rates divide by carries (including kneels on PFR) and receptions, not by snaps.

**Unresolved**

- PFR's 2022 data gap.
- The unexplained reception-total mismatch for 2024–25.
- SIS and FTN league totals (paywalled).
- PFF full-season league totals after 2014 are not public. The BDB 9-week sample is the best per-play PFF evidence.
- NGS's threshold is unpublished, and NGS was calibrated toward older charting.


# Part B: when and why

Research only; no repository files changed. Compiled 2026-11-23 from web sources.
Confidence: **H** = primary source read, definition stated; **M** = primary source read but the
definition is vague or partial, or a reliable secondary source; **L** = snippet, anecdote, unverified
or conflicting. Short quotes only.

### 0. Definitions differ. Do not mix numerators.

| Charter | What it counts | Source |
|---|---|---|
| PFF "missed tackle" / "missed tackle forced" | Charted judgement: the ball carrier "did something to make a would-be sure tackler, miss said tackle". It includes jukes that avoid contact, broken arm tackles and runs through a tackler ("truck stick"). Tackling efficiency = attempts per miss. | [PFF glossary](https://www.pff.com/news/pro-pff-signature-statistics-a-glossary); [PFF RB breakdown 2015](https://www.pff.com/news/running-back-breakdown-forcing-missed-tackles) (M) |
| PFR (Sportradar charting) | Broken tackle: the runner "does something significant to get past a defender". Missed tackle: a defender "should reasonably have" brought the carrier down. | [PFR advanced stats](https://www.pro-football-reference.com/about/advanced_stats.htm), via search snippet; the page returned 403 to fetch (L-M) |
| SIS / Football Outsiders | Broken tackles are charted on carries and receptions. FO's 2009 criteria counted an escape from the grasp, or a juke of a defender "in good position". A slow defender who dives and misses does **not** count. | [ESPN NFC North blog 2009](https://www.espn.com/blog/nfcnorth/post/_/id/12716/tracing-broken-tackles-in-the-nfc-north), [ACTA/SIS 2016](https://actasports.com/statoftheweek/broken-tackle-leaders) (L-M) |
| NGS (2024+) | Tracking-based. A tree model uses "20 features for each of the 11 defenders" at 10 Hz, starting after the handoff or catch, and produces tackle opportunities, missed tackles and tackle efficiency. It is built on the 2024 Big Data Bowl winners' method (Chang, Dai, Jiang, Cheng). | [NFL.com NGS 2024 metrics](https://www.nfl.com/news/next-gen-stats-new-advanced-metrics-you-need-to-know-for-the-2024-nfl-season) (M; the article gives no formal definitions) |
| BDB-2024 winners' rule, as reported | A missed tackle is charged when a defender's tackle probability stays above 75% for at least about 0.5 s, then falls, and neither he nor a teammate tackles within 1 s. | [PopSci](https://www.popsci.com/technology/data-football/) (M, secondhand; PopSci also misattributes the winners, see the conflict below) |

**Implication for the simulation:** PFF and PFR misses are judgements that the tackle "should" have been made. The NGS count is a threshold crossing on a modelled probability, so it is proximity, not contact ("Tracking data measures proximity, not physical contact", PopSci). One PopSci example (Ravens-Saints, 7 Nov 2022) shows the gap: a human scorer charged **1** miss on a run, while tracking-based analysis suggested **3 more** opportunities were missed. So tracking-defined miss counts can be materially **higher** than charted ones. Choose the operator before comparing.

### 1. When

#### 1a. Overall rates (anchors)

| Number | Definition and denominator | Season | Source | Conf |
|---|---|---|---|---|
| League missed-tackle rate **about 13%** of tackle opportunities. Team tackle efficiency ranges from **83.7%** (Browns) to **89.3%** (Chiefs), so team miss rates run from about 10.7% to 16.3%. Bills at 86.8% are "just above league average". | NGS tackle model | 2024 | [NFL.com team tackling rankings](https://nfl.com/news/ranking-all-32-teams-by-tackling-metrics-chiefs-dominate-broncos-crack-top-three-lions-pace-nfc); [SI Giants](https://www.si.com/nfl/giants/onsi/big-blue-plus/key-metric-points-to-major-area-of-improvement-needed-by-giants-defense-01jm5fz1fyw6) | M |
| Missed-tackle yards per team-season ranged from **544** (Ravens) to **1,183** (Colts). Definition: yards after a miss, up to the next tackle attempt. | NGS | 2024 | same NFL.com | M |
| **1,669 PFF missed tackles vs 11,313 tackles** over **12,486 plays**, or about 0.13 missed tackles per play (derived). It is unclear whether the tackle count includes assists. | PFF charting in the BDB-2024 data | 2022 weeks 1-9 | [Bajons et al., PEP, arXiv 2407.08508](https://arxiv.org/html/2407.08508v1) | M |
| Rush attempts per forced missed tackle: league average **6.6**, about 0.15 per carry (derived). Leaders reach "nearly one out of four carries". | PFF, rushing only | about 2014 (article July 2015, "last season") | [PFF RB breakdown](https://www.pff.com/news/running-back-breakdown-forcing-missed-tackles) | M |
| Top backs force MT/Att **0.17-0.25**; bell-cow backs 0.08-0.16 | PFF | 2013 | [PFF Contrarian 2014](https://www.pff.com/news/the-contrarian-how-much-is-a-forced-missed-tackle-worth) | H (for the listed players) |
| Tackle-break rate per touch, leaders with 100+ touches: Warren **38.1%**, Achane **36.2%**, Spears **34.2%** | NGS, "per play" break rate | 2024 (partial season?) | [AP via KSAT, Sep 2024](https://www.ksat.com/sports/2024/09/09/nfl-tries-to-tackle-tackling-with-a-new-next-gen-statistic/) | M (exact definition not given) |
| SIS broken + missed tackle % of runs: Fields **30.0%** (led the league), Jacobs **23.2%** | SIS, (BT+MT)/rush attempts | 2022 | [FantasyPros](https://www.fantasypros.com/2022/07/rb-broken-plus-missed-tackles-forced-percentage-analysis-2022-fantasy-football-javonte-williams-elijah-mitchell-ezekiel-elliott/amp/) via snippet | L-M |

**Sanity frame:** NGS puts the league at about 87% of opportunities converted. PFF charting gives about one miss per 7-8 plays and about one forced miss per 6-7 carries. **The 25-38% figures are elite single players, not the league.** A sim in which most carries include a missed tackle sits far outside every source.

#### 1b. By defender position

- **DL miss least, DBs miss most.** PFF's three-season study (about 2008-10, minimum 75 attempts including sacks): "18 of the top 19" ratios were DL and "16 of the poorest 17" were DBs. Extremes ran from 0 misses in 75+ attempts (Idonije) to 1 miss per **4.3** attempts (Asante Samuel). LB examples: Willis 1 per 24.2, Ray Lewis 1 per 14.0. Asomugha had 20 misses, 13 of them against RBs on designed runs. [PFF 2011](https://www.pff.com/news/missed-tackles-three-year-bests-and-worsts) (M; the study gives no position means).
- PFF 2014 DB "tackling efficiency" (attempts per miss): bottom safeties **4.4-5.6**, top **27-33**; bottom CBs **4.3-4.7**, top 20-43. [PFF sig stats DBs](https://www.pff.com/news/sig-stats-tackling-efficiency-dbs) (M).
- PFF positional comment: safeties "miss the most tackles" among positions. [PFF safeties spotlight](https://pff.com/news/pro-signature-stat-spotlight-safeties) (L, snippet only, no figure).
- NGS 2024 single players: the best DT and edge players convert 94-95%. Safety DeShon Elliott's 97.3% on 111 opportunities is the best since 2018. CB Jaylon Johnson's **20.1%** miss rate ranked only 12th-highest among CBs (min 25), which implies many CBs miss 20%+. Budda Baker (S) led the league with **33** misses. [NFL.com](https://nfl.com/news/ranking-all-32-teams-by-tackling-metrics-chiefs-dominate-broncos-crack-top-three-lions-pace-nfc) (M).
- 2023: LB Zaire Franklin led the NFL with **24** misses while also being the No. 2 tackler. **Volume matters:** high-opportunity LBs lead raw counts. [AP/KSAT](https://www.ksat.com/sports/2024/09/09/nfl-tries-to-tackle-tackling-with-a-new-next-gen-statistic/) (M).
- Da Bears Blog built 2018-19 PFR MTkl% baselines by DL, LB and DB and found means above medians (right-skewed: a few bad tacklers inflate the mean). [dabearsblog 2021](https://dabearsblog.com/2021/advanced-defensive-stats-missed-tackles) (L; page returned 503, snippet only, no values).
- **Gap:** no public source gives a clean league mean MTkl% by position. The ordering DL < LB < DB is consistent across sources (M). The probable mechanism is mixed with selection: DL tackle in traffic at short range, often with help, while DBs tackle in space, alone, often against a carrier who has built speed.

#### 1c. By play type, field location and approach

- **Inside vs outside run, screen, or YAC in space vs traffic:** **no published split found** (PFF, SIS, NGS and PFR were all searched). PFF's Elusive Rating and The Analyst's MBTK/TOU pool carries and receptions. NGS said it planned splits for "open-field tackles, downhill tackles, and 'swarm' tackles" (AP, Sep 2024), but none was found published. (Gap; H that the split is absent from public sources searched.)
- Receivers: Deebo Samuel had **38** forced misses in 2023, the most by a receiver; Lamar Jackson had **27**, the most by a QB (AP/KSAT; NGS, M). In 2009 FO charted Percy Harvin's **25** as the most among WRs (ESPN, L).
- **Kickoffs, 2024 dynamic kickoff:** return rate rose to **32.8%** from **21.8%** (NFL). A PFF 2025 piece states a **90% increase** in missed tackles forced on kick returns. The baseline year is ambiguous, and its 2024 return rate (34.7%) conflicts with the NFL figure. [Search summary of NFL / PFF 2025](https://www.pff.com/news/nfl-kickoffs-are-evolving-as-returns-surged-in-2025) (L for the 90%). This is one direct sign that open-field, space-and-speed tackling raises the miss rate, though volume also rose.
- **Direction and approach (rugby, best available):** being tackled front-on reduced offloads and tackle breaks. Tackles from behind raised them (Six Nations RR **3.0**, 95% CI 1.9-4.6). [Hendricks et al. 2017, J Sports Sci](https://eprints.leedsbeckett.ac.uk/id/eprint/3809/) (H). In Tierney et al. 2018 the tackler won the gainline in **48/122 (39%)** front-on tackles but only **28/111 (25%)** side-on tackles (derived from the table n's). [Tierney 2018](https://eprints.whiterose.ac.uk/143528/1/The%20effect%20of%20technique%20on%20tackle%20gainline.pdf) (H for the counts; note this measures gainline, not completion).
- **No NFL source** publishes miss rate by approach angle (head-on, angle, pursuit from behind), sideline vs middle, or box vs open field. (Gap.)

#### 1d. By speed, closing speed and distance

- No NFL source publishes miss rate vs carrier speed or defender closing speed. (Gap.)
- Rugby video kinematics, 0.5 s before contact:
  - Front-on: tacklers about **5.7** m/s vs carriers about **5.0** m/s, with the tackler faster in **67%**. Overall, "physical components alone ... are not good predictors of tackle dominance". 60 tackles across Super 14, Varsity Cup and U19. [Hendricks, Karpul, Lambert 2014, JSSM](https://pmc.ncbi.nlm.nih.gov/articles/PMC4126292) (H, small n).
  - Varsity Cup front-on, 0.5 s out: carriers about 4.6 m/s vs tacklers about 7.1 m/s. The gap vanished by 0.4 s, which the authors read as **tacklers adjusting speed to a suitable relative velocity before contact**, i.e. breaking down. [Hendricks et al. 2012 J Sports Sci abstract](https://informahealthcare.com/doi/full/10.1080/02640414.2012.707328) (M, abstract via snippet). This conflicts with the 5.0 / 5.7 m/s figures that later papers cite for the same work.
  - Sewry et al. 2016 (n=12): the abstract states the carrier's 4.10 m/s was "significantly higher" than the tackler's 5.19 m/s, which is numerically backwards. Treat it as **unreliable** (L).
- Evasion geometry: tackle breaks were associated with a side-step of about **20-60°**, made **1-2 body lengths** from the defender, then straightening. [Wheeler, Askew, Sayers 2010, Eur J Sport Sci](https://www.jssm.org/jssm-09-445.xml-Fulltext) (M; snippet of the abstract). **This is tracking-observable**: distance and cut angle at the defender.

#### 1e. Yards after a miss

- NGS team-season missed-tackle yards: **544-1,183** (2024). The costliest single defenders in 2023 gave up about **200** extra yards (Al-Shaair about 203, Singleton about 200; AP/KSAT). (M)
- PFF "Yards/MT" (after-contact yards ÷ forced MTs) for 2013 backs runs **9.6-28.5**. This is **not** yards caused by a miss; it is mostly the denominator effect (PFF Contrarian, H for the values, but beware the misread).
- No source gives league yards-after-miss per miss. A rough derivation: about 860 yards/team (midpoint of the NGS range) ÷ (13% × opportunities) is **not computable** without opportunity counts. (Gap.)

#### 1f. Trends over time (the "tackling is worse" debate)

- **No league-wide multi-season missed-tackle series was found** from PFF, SIS or NGS. The NGS model was built for 2024, trained on 2018-22 and tested on 2023. The "tackling crisis" talk is mostly coach and media opinion, e.g. Gannon in 2025: tackling must be practised, and the rules limit it. [SI](https://www.si.com/nfl/cardinals/onsi/news/jonathan-gannon-sounds-off-nfl-tackling-crisis) (L as evidence of a trend).
- Practice limits: the 2020-era CBA allows **14** padded regular-season practices vs 28 under the old CBA, per a snippet citing ESPN. [Yardbarker](https://www.yardbarker.com/nfl/articles/jonathan_gannon_sounds_off_on_nfls_tackling_crisis/s1_16655_43218991) (L; the 2011 CBA introduced the 14 figure, so verify against the CBA text).
- Early season: PFF notes things like Chiefs **19** misses in a Week 1, "tied for the third-most" by a team in Week 1. That is an anecdote, and the season was not confirmed. Within-season improvement in NGS 2024: Eagles 15.7% (Wks 1-6) → 12.7% (after); Chiefs 91.2% in Wks 12-17. (L-M; no league week-by-week study found.)
- **Conflict:** the Cardinals' 85 misses through 14 games (PFR) are ranked 22nd by Bleacher Report and 11th by SI.

### 2. Why: technique as taught

| Cue | Teaching claim | Source | Conf |
|---|---|---|---|
| **Track the near hip, keep leverage** | Tracking means "closing the distance with the ball carrier, while maintaining leverage", "eyes on the near hip", shoulders square. Carroll: "We are a shoulder tackling team based on leverage." | [Hawks Tackling youth handout (Carroll / Seto system)](https://cdn1.sportngin.com/attachments/document/7cc5-2995428/WYF_Hawks_Tackling_Handout.pdf); [SI 2014](https://www.si.com/2014/08/15/pete-carroll-seahawks-tackling-video) | M |
| **Near foot, near shoulder** | "close with NEAR FOOT", shoulder contact on the thighs with the head "OUTSIDE or BEHIND (NOT ACROSS)", "WRAP & SQUEEZE", "DRIVE FOR 5" | Hawks handout | M |
| Variants by situation | Roll tackle, lift (hook the opposite leg), and "profile" (shoulder on the near jersey number) for side-on or open-field contact | Hawks handout | M |
| **Overrunning, wide angle** | Players "overrun plays because they fear being outrun to the corner", "open their stride, take a wide angle, and get cut back on". They avoid this in drills because the drill runner never threatens the corner. | [USA Football blog, tracking pt 1](https://blogs.usafootball.com/blog/8485/the-methods-and-importance-of-teaching-tracking-part-one) | M |
| Angle is individual | "the angle taken to a thumper of a tight end is different than the track star wide receiver". A carrier can change pace "almost every step". | same | M |
| **Inside-out pursuit, cutback** | Non-force defenders press the carrier's inside hip, which shrinks the cutback space. A defender pursuing to the back hip should expect a cutback. | [X&O Labs](https://www.xandolabs.com/?p=9839), [X&O Labs drills](https://www.xandolabs.com/?p=13749) | L-M |
| Breaking down too early or too late | "Coming to balance too early" is a common open-field error; stay under control so you don't overrun. Rugby kinematics show elite tacklers shedding speed in the last 0.4 s. | [SportsEngine](https://discover.sportsengineplay.com/?p=2264); [Human Kinetics](https://us.humankinetics.com/blogs/excerpt/keeping-the-head-out-of-tackling); Hendricks 2012 | L / M |
| Heads Up (USA Football) | Breakdown, then hit position, then shoot (uppercut arms, hip extension), then rip, then drive. Assembled from secondary drill pages; the official five-step names were not verified. | [Stack](https://www.stack.com/?p=152975); [NFL.com drills](https://www.nfl.com/news/five-drills-for-textbook-tackling-0ap2000000280824) | L |
| "77% of missed tackles from leverage mistakes" | Stated as "An NFL study". No author, year or method is given. | [Glazier clinic page](https://glazierclinics.com/football-coach-resources/team-drill-for-the-hunting-phase-of-tackling-reduce-leverage-mistakes) | **L, unverifiable** |
| Staff self-study | Many misses and explosive plays traced to poor pursuit angles and leverage | [X&O Labs](https://www.xandolabs.com/?p=19550) | L |

Belichick and Saban pursuit-angle teaching: no citable primary material was found in this pass (gap).

### 3. Why: studies and biomechanics (mostly rugby)

1. **Tackle type and contact height** were studied in Hendricks et al. 2025, *Eur J Sport Sci*: **51,106** tackles in 271 matches across 7 levels, multilevel logistic regression. Success means stopping carrier and ball with no offload, break, try or penalty. Senior Elite marginal success probabilities:

   | Type | Shoulder | Mid-torso | Legs |
   |---|---|---|---|
   | Arm | 75% | 69% | 65% |
   | Active shoulder | 86% | 82% | 78% |
   | Passive shoulder | 84% | 80% | 76% |
   | Smother | 87% | 84% | 81% |

   Arm tackles are lowest everywhere. At senior level, shoulder vs mid-torso height did not differ significantly, and leg contact is lowest. [PMC12254575](https://pmc.ncbi.nlm.nih.gov/articles/PMC12254575/) (H). Note that the arm-vs-shoulder gap (about 11-13 points) is about as large as the entire NFL team spread.
2. **Direction, fend and leg drive** were studied in Hendricks et al. 2017, *J Sports Sci*: 4,479 tackles from the 2014 Six Nations and Championship. Tackles from behind raised offload or break (RR 3.0, 1.9-4.6), and so did jersey tackles (RR 2.9 in the Championship). A strong carrier fend raised offload or break (RR 4.5; Championship 5.1), and carrier leg drive raised breaks. "Front-on shoulder tackles with leg drive" were the tackler's best answer. [Leeds Beckett eprint](https://eprints.leedsbeckett.ac.uk/id/eprint/3809/) (H).
3. **Tackler characteristics** were studied in Hendricks, Matthews, Roode, Lambert 2014, *Eur J Sport Sci*: 2,092 tackles from Super 14 (2010). Success went with head up and forward, countering the fend, shoulder tackles at the mid-torso, arms wrapping or pulling, and leg drive. Relative risk ratios were reported, but the full text was not read. ([DOI 10.1080/17461391.2014.905982](https://informahealthcare.com/doi/full/10.1080/17461391.2014.905982); M)
4. **Gainline outcomes** were studied in Tierney et al. 2018, *IJSSC*: 122 front-on and 111 side-on tackles from the ERC Champions Cup. ORs are expressed for carrier success.
   - Front-on, tackler traits (share present in tackler-won vs carrier-won tackles):
     - leg drive on contact 23% vs 5% (OR 0.19)
     - shoulder drive into contact 40% vs 16% (OR 0.30)
     - explosiveness on contact 31% vs 10% (OR 0.23)
     - straight back, centre of gravity forward 50% vs 22% (OR 0.28)
     - shortening steps and upright-to-low body position were also significant
     - **head placement on the correct side was ~93-94% in both groups**, so it is not discriminating at elite level
   - Carrier traits: leg drive 25% vs 64% (OR 5.22); fend into contact 4% vs 20% (OR 5.85).
   - Side-on: only shoulder drive mattered (OR 0.32), and carrier leg drive (OR 3.25).
   - [PDF](https://eprints.whiterose.ac.uk/143528/1/The%20effect%20of%20technique%20on%20tackle%20gainline.pdf) (H; small n, one competition).
5. **Elite women** were studied by Dane et al. 2024, *J Sports Sci*: 1,500 tackles from the Women's Six Nations 2022-23. "Wrap and clamp" (rate ratio **46.8**) and "ear to body" (**20.9**) were most associated with effective outcomes. Hip and leg contact raised the miss risk. Seven of 22 techniques were significant. (M; abstract via snippet. These rate ratios are on propensity rates, so do not compare them with ORs.)
6. **Momentum and mass** were studied by Hendricks, Karpul, Lambert 2014 (above). Carriers were heavier in 68% of tackles, yet mass, speed and momentum alone did not predict who dominated. **Technique and timing explain more than raw physics in video studies** (M; n = 60).
7. **Fatigue**: Gabbett 2008, *JSCR*, n = 8 rugby league players. Technique fell progressively with fatigue, and the best fresh tacklers declined most. VO2max and agility correlated with the size of the decline. [ACU record](https://acuresearchbank.acu.edu.au/item/88w5v/influence-of-fatigue-on-tackling-technique-in-rugby-league-players) (M; percentages not retrieved).
8. **Football, tracking-based:**
   - Nguyen, Jiang, Ellingwood, Yurko ("Fractional Tackles", arXiv 2403.14769, later *Sci Rep*) use a 1.5-yard carrier-defender contact window. They do not model missed tackles.
   - Bajons et al. (PEP) model yards saved using distance, x/y distance, speed, acceleration, and **the angle between defender direction and the line to the carrier**. Adding PFF misses barely changed the defender rankings (r = 0.88).
   - No Sloan paper on missed tackles was found.
   - (M)

**Conflict:** PopSci credits the BDB-2024 win to Singer and Gordeev. NFL Football Operations and NGS credit Chang, Dai, Jiang and Cheng ("Uncovering Missed Tackle Opportunities"). The NFL attribution is preferred.

### 4. Observable in tracking vs video

| Cause or condition | Tracking (10 Hz x, y, s, a, dir, o) | Needs video or charting | Notes for like-for-like comparison |
|---|---|---|---|
| Distance to carrier at the attempt; opportunity window | **Yes** (e.g. the 1.5 yd window, probability-threshold events) | No | The operator definition drives the counts. NGS-style counts exceed charted ones (PopSci example). |
| Closing speed, relative velocity, deceleration in the last 0.5 s (breakdown timing) | **Yes** | No | Rugby shows tacklers shedding speed over about 0.4 s. Compare the sim's speed profile directly. |
| Approach angle (front, side, behind or pursuit), defender direction vs the line to the carrier | **Yes** (PEP uses this angle) | No | Rugby: from behind gives RR about 3 for breaks; side-on gainline success is lower. |
| Overrun, wide angle, cutback (carrier crosses behind the defender's path) | **Mostly yes** (path geometry, lateral offset, carrier cut angle and distance at the cut) | Partly | Wheeler: 20-60° cuts at 1-2 body lengths. Measurable. |
| Inside-out leverage relative to help and sideline | **Yes** (positions of teammates, boundary) | No | |
| Carrier speed, mass and momentum at contact | **Yes** (with roster mass) | No | Video studies say these alone are not predictive. |
| Number of tacklers, help arriving, gang tackles | **Yes** | No | |
| Body facing (`o`) | Partly: torso orientation only | Gaze needs video | CLAUDE.md: facing is not gaze. |
| Contact occurred at all (whiff vs broken grasp) | **No**: proximity only | **Yes** | PFF counts jukes with no contact. SIS/FO separate grasp-escapes. |
| Contact height (shoulder, torso, legs), arm vs shoulder vs smother, wrap and clamp | No | **Yes** | The largest technique effects in rugby (about 11-13 pp, RR 20-47). |
| Head placement (near or across), eyes up | No | **Yes** | Near-universal at elite level, so not discriminating in Tierney. |
| Leg drive after contact (tackler or carrier), fend or stiff-arm | Indirect: post-contact displacement and velocity of the pair | **Yes** for the actions | Displacement after contact is a usable tracking proxy for "who won the contact". |
| Fatigue | Indirect: snap counts, play length, speed decay | Technique decay needs video | |
| "Should have made it" judgement (PFF/PFR miss) | No | **Yes** | It is a human threshold and differs between charters. |

**Practical takeaway:** the sim can directly compare, on NFL tracking:
- opportunity frequency
- the distance, speed and closing-angle distributions at attempts
- the miss rate conditioned on those
- yards from the attempt to the next attempt or tackle (≈ NGS "missed tackle yards")
- post-contact displacement

Technique causes (arm tackle, contact height, wrap, head) can only be judged against film or rugby priors. The sim should log the **requested** technique and the **achieved** contact separately (per CLAUDE.md), so misses can be attributed.

### Weakest-sourced points

- The "77% of missed tackles are leverage mistakes" figure: unattributed clinic claim.
- The 90% rise in kick-return forced misses: ambiguous baseline year and conflicting return rates.
- Any claim that NFL tackling got worse in 2023-24: no league series was found.
- The CBA padded-practice numbers: snippet only.
- PFR position means: not retrieved.
- The Heads Up step list: secondary pages.
- Sewry 2016 velocities: internally inconsistent.
- The Hendricks 2012 numbers: conflicting citations.
- No public NFL split exists by run direction, screen, field zone, approach angle or speed.


# Part C: the Big Data Bowl 2024 tackling data

Accessed 2026-11-23 unless noted. Research only; no repository files changed, no data files downloaded.
Public Kaggle notebooks were read as text via the anonymous `kernels/pull` endpoint, which returns notebook source only, no competition data.
Confidence: **H** = read in primary source text; **M** = primary source, but the number is derived or the source is a secondary write-up; **L** = search snippet or inference.

Bottom line for the simulation: the public BDB-2024 work gives a solid **base rate**, and the **direction** of most factors is consistent across sources.
Nobody published binned curves of miss probability against distance, approach angle (head-on/side/behind), closing speed or leverage.
Those effects appear only as SHAP or feature-importance plots, mostly as images with no numbers.
To get curves, someone would need to compute them from the data; see Availability.

---

### Dataset and labels

**Scope.** Tracking data for weeks 1-9 of 2022 at 10 Hz, covering all 22 players and the ball, with x, y, s, a, dis, o, dir and event tags (`first_contact`, `tackle`, ...).
The competition supplied 136 games and 12,486 plays.
- Source: Nguyen et al., "Fractional Tackles", arXiv:2403.14769v2 (https://arxiv.org/html/2403.14769v2), "12,486 plays across 136 games". **H**
- PEP paper, arXiv:2407.08508v1 (https://arxiv.org/html/2407.08508v1), gives the same play count and 12,187,398 tracking rows. **H**

**tackles.csv columns.** `gameId, playId, nflId, tackle, assist, forcedFumble, pff_missedTackle`.
The data-dictionary wording, as mirrored in a public GitHub notebook (GabrielDarioGuerra/NFL-Kaggle-project, overview_merges.ipynb, https://github.com/GabrielDarioGuerra/NFL-Kaggle-project), reads:
- `tackle`: "Indicator for whether the given player made a tackle on the play (binary)"
- `assist`: "...made an assist tackle on the play (binary)"
- `forcedFumble`: "...forced a fumble on the play (binary)"
- `pff_missedTackle`: "Provided by Pro Football Focus (PFF). Indicator for whether the given player missed a tackle on the play (binary)" **H**. This is a mirror of the Kaggle data page, which renders only with JavaScript and could not be read directly.

**What the label is.** One row is one player on one play.
- A miss is a single per-player-per-play flag. Two misses by the same player on one play count once, and the flag has no frame timestamp.
- The winners had to assume the miss occurred "at the frame when the ball carrier and the potential tackler's separation were at a minimum" (winning notebook, below). **H**
- PFF's charting criterion (what counts as a "miss" rather than a non-attempt) is not defined in the competition data. **H** that it is absent.
- The PEP authors note "identifying missed tackles ... is not an easy task" and treat the miss sample as too small to analyse alone. **H**

**Counts.**

| Quantity | Value | Source | Conf. |
|---|---|---|---|
| tackles.csv rows | 17,426 | sesh9096/csci4502project `src/analysis.org` printed `[17426 rows x 7 columns]` (https://github.com/sesh9096/csci4502project) | H |
| Sum of `tackle` | 9,919 | Winners' repo `code/spatial_analysis.ipynb` output: "there are 9919 tackles and 2090 missed tackles" (https://github.com/mpchang/uncovering-missed-tackle-opportunities) | H |
| Sum of `pff_missedTackle` | 2,090 | same | H |
| Unique plays in tracking | 11,875 (after the winners' filtering) / 12,486 (raw) | same / arXiv 2403.14769 | H |
| Implied `assist` rows | ≈5,400 (17,426 − 9,919 − 2,090 = 5,417). This is an upper bound and assumes the flags are exclusive per row. | derived | L |
| Winners' cleaned training set, weeks 1-8 | 8,000 made vs 1,583 missed | winning notebook | H |
| Winners' test set, week 9 | 836 made vs 180 missed | winning notebook | H |
| PEP paper, penalties excluded | 11,313 tackles vs 1,669 missed | arXiv 2407.08508 App. A.4 | H |
| Fatigue notebook "tackle attempts" at `first_contact` | 10,336 records (tackle or miss) | Fischer, https://www.kaggle.com/code/jessefis/nfl-bdb-2024-missed-tackles-and-player-fatigue | H |

**Missed share of attempts (derived).** The share depends on the denominator:
- 2,090 / (9,919 + 2,090) = **17.4%** of solo-tackle-or-miss events.
- 2,090 / 17,426 = **12.0%** of all labelled player rows, assists included.
- Winners' clean sets: 1,583/9,583 = **16.5%** (train) and 180/1,016 = **17.7%** (test).
- PEP: 1,669/(11,313+1,669) = **12.9%**.
- All of these are **M**, since the arithmetic is mine on H counts.
- External cross-check with a different definition and season: NFL Next Gen Stats' production Tackle Probability model, built on the winners' method, puts the 2024 league-average missed-tackle rate at about **13%**. Teams range from 11.9% to 14.5% among those quoted, with team tackle efficiency 83.7%-89.3%. Quote: "hovered right around the league average (13%)". https://nfl.com/news/ranking-all-32-teams-by-tackling-metrics-chiefs-dominate-broncos-crack-top-three-lions-pace-nfc (undated, early 2025). **M**

**Reading for the sim.** A realistic NFL miss rate per tackle attempt is about **12-18%**, so roughly 1 in 6 to 1 in 8 attempts fail.
If a sim's attempts fail far more often than about 1 in 5, it is outside anything these labels support.
This holds unless its "attempt" definition is much looser than PFF's, for example counting every proximity event.

---

### Findings (by factor)

#### Winner: "Uncovering Missed Tackle Opportunities" (metric track)
Matthew Chang, Katherine Dai, Daniel Jiang, Harvey Cheng.
- Notebook: https://www.kaggle.com/code/matthewpchang/uncovering-missed-tackle-opportunities (pulled v14)
- Code: https://github.com/mpchang/uncovering-missed-tackle-opportunities

**Model.** XGBoost predicting whether the defender tackles within the next 1 s. It was trained on made and PFF-missed tackles, with features taken 1 s before the event.
Inputs:
- Euclidean distance
- carrier speed
- relative x speed
- |relative y speed|
- "angle of attack"
- forward Voronoi area (congestion)
- team influence
- blocker influence at the defender
- pass/run

Test AUC was **0.93** on week 9. **H**

**Definitions.**
- Tackle opportunity: probability "exceeds 75% for >0.5 second".
- Missed opportunity: probability then "falls below 75% for >0.5 second" with no tackle by anyone. **H**

**Factor directions (SHAP, Fig. A1, an image; no numeric curve).**
- **Distance** "is the strongest feature": closer means more tackles. **H**
- **Blocker influence** near the defender lowers tackle probability. **H**
- **Pass/run** has "little influence". **H**
- **Carrier speed** looks "counterintuitive" because of the 1-s horizon: a fast carrier reaches a defender who is in front of him within the window. **H**
- Relative weight, relative orientation and age "did not contribute much" and were dropped. This matters for the sim: on this evidence, mass ratio adds little predictive power once kinematics are known. **H**

**By position.**
- Linebackers generate more opportunities.
- DBs convert at a higher rate.
- The missed-opportunity rate "is similar between position groups". **H**
- Top-10 secondary players have a missed-opportunity rate of **0.11-0.22** per opportunity, with tackle conversion **0.49-0.62** per opportunity (Table 1). **H**

**Label coverage.**
- On one 18-yard Kenyan Drake run the model flags 4 missed opportunities; PFF charted 1. **H**
- Secondary write-ups say the model found about "4 times more missed tackle opportunities" than labelled and captured "almost 90%" of PFF misses. These come from search snippets of the winner's Medium post (https://medium.com/@mpchang17/my-team-won-the-2024-big-data-bowl-ca9f668d011d), which returned 403. **L**

#### Momentum-Based Fractional Tackles (finalist)
Quang Nguyen, Larry Jiang, Meg Ellingwood, Ron Yurko (CMU).
- Notebook: https://www.kaggle.com/code/tindata/momentum-based-fractional-tackles
- Paper: arXiv:2403.14769, later published in Sci. Rep. 2025, https://www.nature.com/articles/s41598-025-85993-1

Findings:
- **Contact distance:** the nearest-defender distance at `first_contact`/`tackle` events is ≤ **1.5 yd in "about 95%"** of cases. This is a useful sanity check for a sim's contact or engagement radius. **H**
- 7,453 contact windows, with mean length **1.28 s**; most windows involve a single defender. **H**
- Defensive linemen have the highest fractional tackles per play.
- Week-split stability is r = 0.69, versus 0.59 for box-score tackles. **H**
- No miss-probability-by-angle or -speed results: momentum and angle of attack are listed as future work. **H**

#### Predator (honourable mention)
Sam Kirschner, Tim Keller, Andrew May. Notebook: https://www.kaggle.com/code/slayerpark/predator

- Separates **pursuit** (getting an opportunity) from **execution**.
- The execution model is Bayesian hierarchical. Its inputs are angles, speed, momentum, velocity, force, direction and orientation 0.5 s before the event, over all tackle, assist and miss attempts.
- It found "significant random effects" for player tackling ability. **H**
- The tackle-execution probability used as a modifier "typically ranges from 0.6 to 1". In other words, given an attempt, success is mostly 60-100%, which is consistent with the 12-18% mean miss rate. **H**
- Coefficients appear only in a figure; there are no per-factor numbers in the text.

#### Missed Tackles and Player Fatigue (honourable mention)
Jesse Fischer. Notebook: https://www.kaggle.com/code/jessefis/nfl-bdb-2024-missed-tackles-and-player-fatigue

- A CNN on the `first_contact` frame image predicts tackle vs miss over **10,336 attempts**, with accuracy 0.844 and ROC AUC 0.806. **H**
- **Open field:** "Open field tackles stand out as having some of the highest missed tackle likelihoods". **H**
- **Sideline:** "ball carriers with momentum falling out of bounds near the sideline are very unlikely to break a tackle". **H**
- **Fatigue:** missed tackles over expectation rise with consecutive plays on field, steeper for defenders, with a "cliff" near about 10 consecutive defensive snaps and about 30 snaps in a half. **H**. This is a qualitative trend, not a rate.

#### Force Over Expected (student paper, not a finalist)
Yoo, Weber, Detata (Wharton MSAS). https://wsb.wharton.upenn.edu/wp-content/uploads/2024/05/Analyzing-Force-in-Tackling-with-the-Creation-of-the-Expected-Force-Metric.pdf (May 2024)

- About 5,000 solo tackles, of which 4,600 were analysed.
- A box plot shows "force generated" (mass×acceleration, direction-projected) has a slightly **higher median for made tackles than for misses**, but the distributions overlap heavily. The figure is an image only. **M**
- The defines a `tackleAngle` variable (0° = from behind, 180° = head-on) but **does not report miss rates by angle**. **H**
- Average force over expected falls by level, from NT/DT (≈ −13) down to DBs (≈ −60). The authors attribute this to tackling "in space" being harder. **M**, read from the chart.

#### Other entries with relevant numbers
- **Scouting Opponents Through Expected YAC** (runner-up; Patel, Kumar, Wieland, Hoppen; https://www.kaggle.com/code/luckyprophet5/scouting-opponents-through-expected-yac): "Offenses recorded an additional **0.36 EPA/play** on dropbacks with missed tackles compared to those without". **H**. This is the cost of a miss in points, not yards.
- **TAPER** (Trenton Chang; https://trentonchang.org/nfl-bdb-2024-demos/, notebook https://www.kaggle.com/trentonchang/nfl-bdb-24-yards-prevented-by-tackles): expected yards after first contact if the tackle succeeds vs fails.
  - Only top-10 plays are public. The largest gap is 4.6 vs 13.5 yd, so TAPER = 9.0; the 10th largest is 7.8. **H**
  - No league-mean "yards after a miss" is published. These are extreme cases, not averages.
- **Every Step You Take** (runner-up, Toronto; https://www.kaggle.com/code/hassaaninayatali/every-step-you-take-measuring-a-defender-s-moves): expected-yards model with MAE 2.32 yd. "Tackle Evasion Play" means ≥5 yd gained after xY first falls to ≤2. **H**. No miss rate.
- **Making the Tackle: LB Trading Cards** (Cabel; https://www.kaggle.com/code/dcabel02/making-the-tackle-linebacker-trading-cards): opportunity → attempt → completion chain for run-play LBs, with an opportunity defined as ≤2 yd and facing the runner. Aggregate rates are not given in the text. **H**
- **MOTT / ExpectedTackling** (public repo, https://github.com/MLecardonnel/ExpectedTackling):
  - Per-frame tackle probability rises with shorter distance and with higher **defender speed**.
  - It falls when the carrier is very near the end zone.
  - Directions only. **H**
- **PEP** (Bajons, Koslik, Michels, Ötting; honourable mention; arXiv:2407.08508): uses distance to carrier and "defender angle difference" as features but reports no success curves.
  - Models end-of-play yard line as **multimodal**: a made tackle means "minimal yardage gain", while a miss "most definitely leads to a substantial additional gain". **H**
- **NFLNet** (McGuigan & de Loë, J. Comput. Vision & Imaging Sys. 10(1), 2025, https://openjournals.uwaterloo.ca/index.php/vsl/article/view/6370): tackle-prediction accuracy is 75% for a feed-forward network and 92% for a graph transformer. No factor curves. **H**

#### Factor summary (what is and is not known)

| Factor | Best public evidence | Number? |
|---|---|---|
| Distance to carrier | Strongest single predictor (winner SHAP; MOTT); contact occurs within 1.5 yd in about 95% of `first_contact` events (CMU) | Only the 1.5 yd / 95% figure |
| Approach angle (head-on/side/behind) | Used as a feature (winner "angle of attack"; Wharton `tackleAngle`; PEP angle difference) | **None published** |
| Closing / relative velocity | Feature in winner (rel. x and y speed) and Predator | None |
| Carrier speed / acceleration | Winner: counterintuitive sign from the 1-s horizon; Wharton: high carrier acceleration means force leaving the contact point | None |
| Defender speed | MOTT: higher means more tackle/assist probability | None |
| Defenders nearby / congestion / blockers | Winner: Voronoi area, team influence; blocker influence lowers probability | None |
| Leverage (inside/outside), sideline | Sideline/out-of-bounds momentum gives very low miss probability (Fischer); edge-setting entries are about containment, not miss rate | None |
| Position group | Missed-opportunity rate "similar between position groups" (winner); DBs convert more opportunities; DBs lowest force over expected | DB top-10: 0.11-0.22 missed per opportunity |
| Open field vs box | Open field has the highest predicted miss probability (Fischer) | None |
| Mass ratio / age / orientation | Dropped by the winners as not contributing much | — |
| Fatigue | Miss over expectation rises with consecutive snaps; cliff near 10 | None |
| Cost of a miss | +0.36 EPA/play on dropbacks with a miss; TAPER extremes 4.6 vs 13.5 yd | No league-mean yards-after-miss |

---

### Availability

**Kaggle API metadata.** Tried on 2026-11-23 and failed: the expected token injection did not authenticate.
- `curl -s https://www.kaggle.com/api/v1/competitions/data/list/nfl-big-data-bowl-2024` returned `{"code":401,"message":"Unauthenticated"}`. The proxy CONNECT succeeded (`200 Connection Established`), then HTTP 401.
- The new endpoint `POST https://api.kaggle.com/v1/competitions.CompetitionApiService/ListDataFiles` returned `{"error":{"code":401,"message":"Unauthenticated","status":"UNAUTHENTICATED"}}`, with or without a placeholder Bearer header.
- `kernels/list` also returned 401.
- **Anonymous `kernels/pull` of public notebooks worked.** That is how the notebooks above were read: source text only, no data.
- So the file list and sizes are **not verified** here. From the notebooks, the files are:
  - `games.csv`
  - `plays.csv`
  - `players.csv`
  - `tackles.csv` (17,426 rows × 7)
  - `tracking_week_1.csv` … `tracking_week_9.csv`
  - **M** for names; sizes unknown.
- The competition page `https://www.kaggle.com/competitions/nfl-big-data-bowl-2024/data` returns HTTP 200, but it renders with JavaScript, so its text could not be read.

**How a teammate obtains it.**
1. Sign in to Kaggle and open https://www.kaggle.com/competitions/nfl-big-data-bowl-2024/rules.
2. Accept the competition rules. This is required even though the competition has ended; the data is still served to accounts that accept. **M**: standard Kaggle behaviour, and public notebooks still attach this data source.
3. Create an API token at Kaggle → Settings → API, and put it in `~/.kaggle/kaggle.json` or the `KAGGLE_API_TOKEN` environment variable.
4. Run:
   ```
   pip install kaggle
   kaggle competitions files nfl-big-data-bowl-2024        # list
   kaggle competitions download -c nfl-big-data-bowl-2024 -p <dir>   # ~multi-hundred-MB zip (size unverified)
   ```
5. In this cloud session, the injected token must actually authenticate first. It currently gets 401, so the environment's Kaggle credential needs checking.

**Public mirrors.**
- There is no Hugging Face mirror: a search for "big-data-bowl" returned only `ameau01/Big-Data-Bowl-2025`.
- Some GitHub repos contain derived CSVs that include the tackles columns, for example `labounty/DOGRatingNFLBDB24/validation.csv`. No full raw mirror was found.
- The competition rules restrict redistribution, so the recommended route is Kaggle.
- The repo's `docs/NFL_DATA.md` says the project's existing collector uses 2022 all-22 tracking. These weeks 1-9 likely overlap with data already referenced there, but the `tackles.csv` PFF labels are specific to BDB 2024. **L**, not checked against the repo.

### Sources
- NFL finalists announcement (titles, team names, notebook links): https://www.nfl.com/news/nfl-announces-finalists-for-sixth-annual-big-data-bowl
- Winner definition quoted in Knowable/PopSci, Apr 30 2024: https://www.popsci.com/technology/data-football/
- All other URLs are inline above.

