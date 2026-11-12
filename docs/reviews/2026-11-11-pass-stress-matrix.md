# Pass stress matrix (2026-11-11)

Report only; no engine change. Rules + Coaching, for Integration (Tanner's
request: find what is totally wrong in the pass game before building further).

**Inputs.**
- **Sim:** a forced grid. Every base coverage call (31) is run against every pass
  concept (17), from five formation families (2x2, 3x1, bunch, empty, 12
  personnel), both flips. Rosters and coordinators are league-sampled
  (`leagueSample`, seeds 101–108), and the quarterback plays each one normally.
  That gives 36,700 plays, of which 32,300 are dropbacks with an attempt. The
  build is develop 3e38b6e4 (`engine-27`).
- **NFL:** 2022 tracking, weeks 1–9 (BDB 2025), 9,654 dropbacks, non-play-action.

**Operator.** `scripts/diag/pass-matrix/`: `sim.ts` collects the plays,
`matrix.py` builds the tables, `routelib.py` names routes, and `flight.py`
measures the break on the ball. Both sides run the same code on the common play
format. Coverage is PFF's `pff_passCoverage` label on the NFL side, and the
played call's family on the sim side.

**How to read it.** The findings are in two groups:
- **Solid:** direct position measurements at coverage level, with large n.
- **Weak:** every cell that depends on a category inferred from tracking (route,
  concept, formation). Each such cell carries its classifier's agreement and its n.

## Answer

1. **Zone defenders do not break on the ball** (direct; checked on plays).
   - This is where the zone families' YAC comes from.
   - Man coverage breaks like the NFL; every zone family does not.
2. **Completion barely depends on how open the target is** (direct).
   - It holds in every coverage and every formation. This is the
     throw-and-catch side, not coverage.
3. **Coverage is not too loose at the throw** (direct).
   - Target separation at the throw is equal or tighter than the NFL's in
     every family.
4. **The worst-yield jobs:**
   - Corner jobs carry the highest yards an attempt: C2/C3, the corner-over picture.
   - Hook and apex jobs carry the highest 10+ YAC: C5/C8.
   - These are inferred cells (the job is the sim's own label), but the label
     is exact on the sim side.
5. **No formation is wrong on its own.**
   - All five formation families show the same excess, about 2.5–3.5 yards an
     attempt and roughly double the 10+ YAC.
6. **Concept-level cells are weak evidence.**
   - The concept classifier agrees with the called concept 25–80% of the time.
   - 70% of NFL dropbacks fit none of our 17 concepts.

## 1. The break on the ball (solid)

Defenders other than linemen, 3–8 yd from the eventual catch point at the throw,
over the first 0.4 s of the ball's flight, all targeted throws:

| coverage | NFL n | NFL toward the catch point | NFL downfield | NFL moving away | sim n | sim toward | sim downfield | sim moving away |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Cover 0 | 125 | 2.02 yd/s | 0.37 | 26% | 1,764 | 1.61 | 0.71 | 27% |
| Cover 1 | 1,083 | 1.42 | 1.24 | 35% | 6,745 | 1.77 | 1.41 | 26% |
| 2-Man | 111 | 2.44 | 1.24 | 28% | 5,338 | 1.56 | 1.71 | 30% |
| Cover 2 | 788 | 1.09 | 0.69 | 33% | 8,520 | **0.64** | 1.18 | 36% |
| Cover 3 | 1,516 | 1.25 | 0.45 | 33% | 10,267 | **0.27** | 1.46 | 43% |
| Cover 4 | 688 | 1.36 | 0.20 | 31% | 5,440 | **0.24** | 1.78 | 43% |
| Cover 6 | 508 | 1.26 | 0.55 | 33% | 4,703 | **0.37** | 1.64 | 41% |

Reading:
- **Zone defenders keep running their drop or carry downfield** after the ball
  is out: 1.2–1.8 yd/s downfield against 0.2–0.7 in the NFL. They move toward
  the catch point at a fifth to a half of the NFL's speed.
- **Man defenders are NFL-like**, already on their man and moving with him.
- **The same pattern appears at the catch.** Zone families' nearest defender
  at the catch is closing at 1.4–1.9 yd/s against 2.6–3.4. Between throw and
  catch, NFL zone defenders take about 1 yd off the target; ours take about none.

**Checked on four league-game plays** (positions at 0.2 s):

| play | defender | after the throw | outcome |
| --- | --- | --- | --- |
| Cover 4, 3rd & 6 | CB_S | sprints deep at 6–8.7 yd/s through the whole 1.3 s flight; 5 → 14 yd from the catch point | 22 YAC |
| Cover 4 Poach | NB | keeps climbing about 0.6 s, then turns | — |
| Cover 9 | CB_W | keeps retreating about 0.6 s, then breaks | arrives 3.4 yd away |

The fourth play was a rusher, which led to excluding linemen from the measure
(the table above is without them).

**YAC by coverage**, median and the share of catches gaining 10+ after the
catch, sim against NFL:

| coverage | median YAC | 10+ after the catch |
| --- | --- | --- |
| Cover 3 | 3.8 vs 2.9 | 22 vs 15% |
| Cover 4 | 4.1 vs 2.3 | 25 vs 11% |
| Cover 2 | 4.2 vs 2.9 | 22 vs 11% |
| Cover 6 | 3.6 vs 2.5 | 20 vs 15% |
| Cover 1 | 2.1 vs 1.7 | 14 vs 14% |
| 2-Man | 2.0 vs 1.6 | 14 vs 11% |

Yards an attempt in the zone families are 9.7–10.7 against 6.1–7.2.

## 2. Completion against openness (solid)

Openness of the target at the throw, using the bins of `hit-throws.py`: tight
under 1.5 yd, mid 1.5–3, open 3 or more. Completion by bin, sim against NFL:

| | tight | mid | open |
| --- | --- | --- | --- |
| Cover 3 (n 7,258 / 1,858) | 57 / 34% | 61 / 59% | 64 / 80% |
| Cover 4 | 57 / 30% | 65 / 58% | 66 / 79% |
| Cover 2 | 55 / 36% | 62 / 60% | 61 / 79% |
| Cover 1 | 52 / 39% | 62 / 58% | 65 / 78% |
| every formation family | 52–57 / 19–38% | 59–63 / 53–60% | 62–68 / 77–79% |

This is C14, across the board: the sim completes tight balls too often and open
balls too rarely. It sits in the throw and catch, not in coverage.

## 3. Separation at the throw (solid)

Mean separation of the target at the throw, sim against NFL:

| coverage | separation | tight share |
| --- | --- | --- |
| Cover 3 | 4.17 vs 4.46 | 10 vs 10% |
| Cover 4 | 4.21 vs 4.28 | 7 vs 10% |
| Cover 2 | 3.94 vs 4.97 | 10 vs 6% |
| Cover 6 | 3.94 vs 4.28 | — |
| Cover 1 | 1.94 vs 2.69 | 39 vs 31% |
| 2-Man | 1.88 vs 2.21 | — |
| Cover 0 | 2.31 vs 3.25 | — |

The coverage rules do not leave receivers too open at the throw. The quarterback
throws into tighter windows than the NFL's (Flex's finding), and the ball then
completes anyway (section 2).

## 4. Who was responsible (sim only)

This uses the defender nearest the target at the throw, and the rule job he was
running (`CoverageDefender` rule; "no rule" for a plain zone seat; "man").
Attempts by job, zone families, top rows:

| coverage | job (share) | separation | completion | Y/A | YAC median | 10+ YAC |
| --- | --- | --- | --- | --- | --- | --- |
| Cover 3 | `c3_corner` (23%) | 4.84 | 69% | **12.4** | 3.0 | 19% |
| Cover 3 | no rule (19%) | 4.91 | 63% | 9.8 | 3.1 | 18% |
| Cover 3 | `c3_hook` (12%) | 3.22 | 62% | 10.0 | 4.0 | **28%** |
| Cover 3 | `c3_curl_flat` / `c3_seam` (22%) | 3.2–3.3 | 59–60% | 8.8–10.2 | 3.1–4.3 | 15–23% |
| Cover 4 | `q_corner_mod` (18%) | 5.10 | 74% | **12.4** | 3.3 | 14% |
| Cover 4 | `q_apex` (18%) | 3.25 | 64% | 10.8 | 5.2 | **32%** |
| Cover 4 | `mike_3` (8%) | 4.56 | 63% | 10.0 | 5.4 | **44%** |
| Cover 2 | no rule (29%) | 4.73 | 62% | 11.5 | 4.5 | 23% |
| Cover 2 | `sink_corner` (9%) | 3.79 | 65% | **11.9** | 4.7 | 20% |
| Cover 6 | `q_corner_mod` (20%) | 4.98 | 72% | 11.5 | 2.0 | 10% |

Two groups stand out:
- **Corner jobs** (`c3_corner`, `q_corner_mod`, `sink_corner`) give up the most
  yards an attempt. Those catches come deep with the corner on top: C2/C3
  (corner-over).
- **Hook and apex jobs** (`c3_hook`, `q_apex`, `mike_3`) give up the most 10+
  YAC. Those are underneath catches with the hook or apex not closing: C5, C8
  and the break on the ball.

"Other" (11–13% in the zone families) is a defender not running a coverage job
(a rusher or a pursuer) nearest the target. Those catches have the highest YAC
(median 7–8.5, 30–42% 10+): receivers no coverage player was near.

## 5. Formations (inferred family; agreement on the sim 87–99%)

| formation | att sim / NFL | separation | completion | Y/A | YAC median | 10+ YAC |
| --- | --- | --- | --- | --- | --- | --- |
| 2x2 | 6,840 / 2,061 | 3.15 vs 3.95 | 60 vs 65% | 9.7 vs 6.8 | 4.1 vs 2.2 | 22 vs 12% |
| 3x1 | 7,047 / 2,047 | 3.46 vs 3.88 | 61 vs 63% | 9.1 vs 6.9 | 2.9 vs 2.5 | 18 vs 13% |
| bunch | 6,289 / 274 | 3.35 vs 3.80 | 62 vs 60% | 9.2 vs 5.7 | 3.2 vs 2.1 | 20 vs 13% |
| empty | 6,379 / 1,181 | 3.07 vs 4.05 | 61 vs 64% | 9.1 vs 6.7 | 2.6 vs 2.6 | 18 vs 14% |
| 12 personnel | 5,777 / 597 | 3.52 vs 3.95 | 62 vs 64% | 9.4 vs 6.2 | 3.3 vs 2.1 | 20 vs 12% |

The family check on the sim: 2x2, empty and bunch each read 99%+; 3x1 99%; 12
personnel 87% (the rest read as 3x1).

Reading: no formation is out of line with the others. The excess is the same
everywhere, so it is not a formation-specific rule gap.

## 6. Coverage × concept (weak: inferred concept)

**How concepts are named.** A naive-Bayes model over the play's route mix,
fitted on half the sim plays and checked on the other half. Agreement with the
called concept on the held-out half:

| | agreement |
| --- | --- |
| quick outs | 80% |
| slant-flat | 77% |
| four verts | 66% |
| hitches | 66% |
| cross | 65% |
| curl-flat / stick | 52% |
| drive / levels | 50% |
| flood | 38% |
| smash | 38% |
| mesh | 34% |
| dagger / post-dig | 25% |

- **NFL coverage.** 70% of NFL dropbacks are named "other", because they fit none
  of our 17 concepts better than the league's route mix. So NFL concept cells
  hold only 30–300 plays.
- **Routes** are named by the nearest labelled NFL route shapes. Held-out week 9
  agrees with BDB `routeRan` on 64.5%: flat 88, cross 82, angle 81, go 68, out
  57, slant 57, hitch 57, in 48, post 43, corner 30%.
- Full table: `out/pass-matrix/grid.txt`, sorted by the separation gap, cells
  under 30 attempts on either side greyed.

**One standout, checked on plays: quick outs against Cover 3 and Cover 4.**

| | Cover 4 (n 372 / 32) | Cover 3 (n 689 / 78) |
| --- | --- | --- |
| separation | 5.12 vs 4.04 | 4.91 vs 4.62 |
| Y/A | 14.4 vs 4.7 | 12.6 vs 6.9 |
| YAC median | 4.7 vs 0.1 | 5.1 vs 0.9 |
| 10+ YAC | 22 vs 4% | 26 vs 9% |

On completed quick outs, the nearest defender at the throw is the corner:

| corner job | completions | YAC median |
| --- | --- | --- |
| `c3_corner` | 64 | 7.0 |
| `q_corner_mod` | 66 | 5.7–6.0 |
| `cloud_corner` | 16 | 17.7 |

- In Cover 4 Box the MOD corner is in man on #1 but 5.6–6.1 yd off at the
  throw. He then does not close (section 1), and the catch gains 13–18.
- Coached rules: the Cover 3 corner is man on #1 unless In (HNFL Tight 1/3;
  audit item 9), and NFL corners drive on the out from their cushion. The NFL
  cell is small (32–78), but its YAC median of about 0 is the sideline tackle
  on the catch.
- This is C9 plus the corner rule, not a new mechanism.

## What this rules out and what it points to

**Ruled out as the main cause of the pass-game excess:**
- coverage looseness at the throw;
- any one formation;
- tackling after the catch (broken tackles were already NFL-like).

**Points to, in order of size:**
1. **C9, the break on the ball.** Zone only, every zone family, measured
   directly and seen on plays. It is the largest single difference and sits
   downstream of the rules: `sawThrow` / `playBall` in `defense.ts`, and the
   zone seats' "keep playing the zone until he sees the throw".
2. **C14, completion against openness.** Every coverage and formation; Flex's
   lane.
3. **The corner jobs' yards an attempt (C2/C3)** and **the hook/apex jobs' YAC
   (C5, C8).** These are what the rule tables fix, but they will not show their
   full effect while C9 stands.

## Suggested changes to GAPS (C-numbers)

- **C9:** from "seen in the matrix first cut; flight-window diagnostic queued" to:
  - measured in every coverage family on the forced grid (zone 0.24–0.64 yd/s
    toward the catch point in the first 0.4 s against 1.09–1.36; man
    NFL-like);
  - checked on four plays;
  - rank it first under P1.
- **C14:** add "in every formation family too (section 2)".
- **P1, "What we see":** replace "not yet checked on plays" with the section 1
  table, and add that man coverage is NFL-like (Cover 1 YAC median 2.1 vs 1.7,
  10+ 14 vs 14%).
- **C2/C3:** add the job table (corner jobs, Y/A 11.9–12.4 against a family
  average of 9.7–10.7).
- **C5/C8:** add hook and apex jobs, 10+ YAC 28–44%.
- **C3 / audit item 9:** add the quick-out cell (Cover 3/4 against quick outs:
  YAC median 4.7–5.1 against 0.1–0.9; NFL n 32–78).
- **Measurement artefacts:** add "concept classifier: 25–80% agreement on the
  sim; 70% of NFL dropbacks fit no installed concept; concept cells are weak".
- **Other open problems, "Deep throws too easy":** the matrix supports C14 as
  the cause. Deep cells go with corner jobs (Y/A 12.4) and completion barely
  falls with tightness.

## Reproduce

```sh
node --import tsx scripts/diag/pass-matrix/sim.ts --seeds 101-108 --out out/pass-matrix/sim-0.jsonl.gz --shard 0/3   # and 1/3, 2/3
python3 -I scripts/diag/pass-matrix/routelib.py build data/raw/bdb2025/big-data-bowl-data 1,2,3,4,5,6 out/pass-matrix/routelib.npz
python3 -I scripts/diag/pass-matrix/routelib.py test data/raw/bdb2025/big-data-bowl-data 9 out/pass-matrix/routelib.npz
python3 scripts/diag/pass-matrix/matrix.py out/mechanics/nfl-plays.jsonl.gz data/raw/bdb2025/big-data-bowl-data out/pass-matrix/sim-0.jsonl.gz,out/pass-matrix/sim-1.jsonl.gz,out/pass-matrix/sim-2.jsonl.gz --check --floor 30
python3 -I scripts/diag/pass-matrix/flight.py out/mechanics/nfl-plays.jsonl.gz data/raw/bdb2025/big-data-bowl-data out/pass-matrix/sim-0.jsonl.gz,out/pass-matrix/sim-1.jsonl.gz,out/pass-matrix/sim-2.jsonl.gz
```

`matrix.py` needs `out/pass-matrix/covfam.json`, the coverage id → family map
(written by a one-line `COVERAGES` dump), only for league-game inputs.

## Addendum: drop-back passes only (2026-11-11)

Tanner's ask: compare drop-back passes on both sides, and leave screens out.

**Who is left out.** `scripts/diag/pass-matrix/population.py` keeps 6,098 of
9,736 NFL dropbacks, dropping those that are:

| left out | plays |
| --- | --- |
| play action | 2,469 |
| screens (any player's `routeRan` is SCREEN) | 865 |
| run-pass options (`pff_runPassOption`) | 169 |
| designed rollouts or runs (`dropbackType` DESIGNED_*) | 112 |
| spikes, kneels, sneaks or nullified plays | 23 |

A scramble out of a normal drop stays in. The sim side was already drop-back
passes: the forced grid has no screens, rollouts or RPOs, and play action is
left out of the tables. `matrix.py` and `flight.py` use this population by
default; `--population all` restores the old one.

**What moves (NFL side; the sim is unchanged):**

| measure | coverage | before | after | sim |
| --- | --- | --- | --- | --- |
| break on the ball (toward the catch point) | Cover 3 | 1.25 | 1.25 | 0.27 |
| | Cover 4 | 1.36 | 1.31 | 0.24 |
| | Cover 2 | 1.09 | 1.05 | 0.64 |
| | Cover 1 | 1.42 | 1.41 | 1.77 |
| separation at the throw | Cover 3 | 4.46 | **4.26** | 4.17 |
| | Cover 4 | 4.28 | **4.10** | 4.21 |
| | Cover 2 | 4.97 | 4.97 | 3.94 |
| | Cover 1 | 2.69 | 2.61 | 1.94 |
| | Cover 0 | 3.25 | 3.02 | 2.31 |
| YAC median / 10+ after the catch | Cover 3 | 2.9 / 15% | **2.2 / 12%** | 3.8 / 22% |
| | Cover 4 | 2.3 / 11% | **1.8 / 9%** | 4.1 / 25% |
| | Cover 2 | 2.9 / 11% | **2.4 / 7%** | 4.2 / 22% |
| | Cover 1 | 1.7 / 14% | 1.4 / 13% | 2.1 / 14% |

Completion by openness barely moves: tight / mid / open NFL 29–40 / 57–60 /
77–78%.

**Material changes:**
- **Separation at the throw.** Screens are wide-open catches, so removing them
  lowers the NFL's separation. In Cover 3 and Cover 4 ours is now equal to the
  NFL's, not tighter. It is still tighter in Cover 2, Cover 1 and Cover 0.
  Section 3's conclusion stands in its weaker form: coverage is not too loose at
  the throw.
- **YAC.** Screens carry YAC, so the NFL's zone YAC falls and our excess is
  larger than reported: Cover 4 10+ after the catch 25% against 9%.
- **The break on the ball and completion by openness** are unchanged. The order
  of conclusions stands.
