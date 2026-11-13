# Inferring coverage and defender jobs from tracking

**Question.** From pre-snap alignment and what happens after the snap, which coverage was it, and what was each
defender's job (man, deep half, quarter, deep third, hook/curl, flat)? On as many snaps as we have.

**Short answer.** On full 22-man tracking the inference is good. Scored on games it never saw, and then on a
different season it never saw, it gets the coverage family right about four times in five and man versus zone
about nine times in ten. It gets worse as less of the field is visible, and it is weak where PFF's own
labels are a judgment call (Quarters versus Cover 3 versus Cover 6). This is an inferred label, weaker evidence than
positions and outcomes. Use it to find plays and to measure, not as truth.

Code: `scripts/coverage_infer/` (`extract.py`, `features.py`, `fit.py`, `transfer.py`, `solo.py`, `apply_runs.py`, `apex.py`, `roles_table.py`).
Results regenerate into ignored `out/coverage-infer/` (numbers below are from the 2026-11-13 run). Needs scikit-learn (not in the repo's stdlib set) and the
BDB 2025/2026 raw data (`npm run nfl:fetch`). Test: `test/test_coverage_infer_features.py` (no feature sees past its time limit).

## Method

1. **Frame.** Rotate each play so the offense moves toward +x with the ball at the origin (a 180-degree turn, so left stays left).
2. **Per defender, from tracking only:** snap position and rank among the defense; path at 0.5 s steps to 4 s;
   the receiver he stays closest to (mean distance, how steady the gap is, whether his velocity matches the receiver's);
   the receivers on his side in order from the sideline (#1, #2, #3) and where they go (vertical, out, in); how many
   teammates are deep and on which side. No PFF label is a feature.
3. **Stage 1:** a gradient-boosted classifier turns those into the defender's job. Training labels are PFF's per-defender
   coverage assignment (`player_play.csv`), merged left/right into 13 classes (MAN, HOL, CF, HC, 3M, 3S, DF, 2, 4I, 4O, FL, PRE, none/rusher).
4. **Stage 2:** the play's soft count of jobs, the number of deep defenders and their depths, and the man share give the
   coverage family (Cover 0/1/2/3/4=Quarters/6, 2-Man, Other) and man versus zone.
5. **Held out.** Every score below is on games the model was not fit on. Stage 2 is fit only on stage-1 predictions
   that were themselves made on held-out games (nested), so no label leaks through the stack.
6. **Time limit.** `window` says how many seconds after the snap a feature may look. 0 is the pre-snap look.

## Results

| Test | Plays | Family accuracy | Man/zone accuracy | Majority-class baseline |
|---|---|---|---|---|
| 2022, full tracking, 3 s window, held-out games | 9,704 | **80.2%** | **92.4%** | 31.8% / 72.0% |
| 2022, pre-snap look only | 9,704 | 53.9% | 84.6% | 31.8% / 72.0% |
| 2022 cut to the BDB 2026 view, held-out games | 8,836 | 80.9% | 91.6% | 33.7% / 72.0% |
| **2023, fit on 2022 only, never fit on 2023**, view cut at release | 14,064 | **82.7%** | **92.2%** | 31.9% / 71.5% |

The 2023 row is the non-circular check: a different season, different rosters and schemes, and a partial view
(only the coverage defenders and route runners, snap to release; PFF's family and man/zone labels).
Accuracy by time to release, 2023: under 2 s 79.2% (n 2,574), 2-2.5 s 83.7% (3,778), 2.5-3 s 84.0% (3,297),
3-3.5 s 84.2% (2,186), over 3.5 s 81.9% (2,221).

2023 by family (recall / precision, n):

| Family | Recall | Precision | n |
|---|---|---|---|
| Cover 3 | 0.90 | 0.83 | 4,481 |
| Cover 2 | 0.87 | 0.86 | 1,837 |
| Cover 0 | 0.82 | 0.83 | 601 |
| Cover 1 | 0.78 | 0.85 | 3,174 |
| Quarters | 0.78 | 0.82 | 2,346 |
| Cover 6 | 0.76 | 0.75 | 1,388 |
| 2-Man | 0.69 | 0.84 | 237 |

### What it gets wrong

- **Cover 1 read as Cover 3** (561 of 3,174 in 2023) and the reverse (239 of 4,481): single high with man underneath versus
  zone underneath looks the same until receivers cross. The man/zone read is better than the family read for this reason.
- **Quarters, Cover 6 and Cover 3 blur into each other** (Cover 6 to Quarters 137, Cover 6 to Cover 2 154, Quarters to Cover 3 201, Quarters to Cover 6 155).
  Cover 6 is Quarters on one side and Cover 2 on the other, and PFF's call depends on rules (who the safety reads, whether
  the corner sits or runs) that only show when the routes force them. Quarters outside-quarter jobs (4O) are the weakest job: 47% recall with the full secondary.
- **Per-defender jobs** (2022, all 11 defenders including rushers, n 106,744 defender-snaps, 80.8% overall, 39% of them rushers
  or non-coverage): Hole 51%, outside quarter 47%, prevent 43%, deep-free 58% are the weak ones; deep halves 82%, man 74%, cloud-flat 74% are the strong ones.
- **PFF's labels are a human chart of film.** Part of every error above is label noise we cannot see.

### How much of the field must be visible?

Your question about seeing one or two players: 2022 coverage defenders only (n 65,462 defender-snaps, 3 s window, held-out games;
majority job 23%, man share 23%).

| What the model sees | Job accuracy (12 classes) | Man vs not-man |
|---|---|---|
| His own path alone | 52.6% | 83.8% (baseline 76.6%) |
| + the receivers on his side | 63.4% | 87.1% |
| + the rest of the secondary | 70.2% | 89.2% |

One defender's own path says roughly half his job and only slightly more than the base rate about man versus zone. With his
receivers it is much better. So a single cohort player per snap supports a rough man/zone read and the deep jobs
(deep half 71%, deep third 66%) but not Quarters versus Cover 3, and not the outside-quarter job (9% from his own path).

### Designed runs and scrambles (no coverage label exists)

`apply_runs.py` reads the pre-snap shell of 6,335 non-dropback plays (2022). It is the **look**, not what the defense did
after the snap, which a run changes for every defender. Pre-snap accuracy on labelled drop-backs is only 53.9% for family, 84.6% for man/zone.
The inferred shell on runs is 46% Cover 3, 20% Cover 1, 12% Quarters, 8% Cover 2, 4% Cover 6, against PFF's 32% / 21% / 13% / 14% / 10% on drop-backs. The pre-snap model
leans toward the most common class, so read these as shares of a look, and use the per-play probabilities, not the argmax. Per-play output:
`out/coverage-infer/runs-inferred.csv.gz` (ignored). By run concept: `out/coverage-infer/runs-summary.json`.


## Quarters apex and the role table

For Quarters and the quarter side of Cover 6 (PFF's call; BDB 2025 weeks 1-9), `apex.py` takes the curl-flat defender
(PFF job CF) on each side that has exactly one, and measures him against #2 (the second receiver in from the
sideline at the snap) and against a back who releases flat (3 yd or more toward that sideline, 4 yd or less downfield by 2 s).
2251 play-sides in 1750 plays. The apex is a CB (nickel) 1031 times, an inside linebacker 451,
an outside linebacker 330, a free safety 180, the Mike 109, a strong safety 105.
#2's release is read from tracking at 2 s (vertical: 7 yd or more downfield; flat/under: 3 yd or less downfield and 3 yd or more outside/inside; break: between; stay: neither).

Median apex depth in yards past the ball at 1 / 2 / 3 s, his lateral position against #2 at 2 s (negative: inside #2), and the share who are 7 yd or deeper at 2 s:

| Cell (family, #2, back) | n | Depth 1 / 2 / 3 s | Out vs #2 at 2 s | 7 yd+ at 2 s |
|---|---|---|---|---|
| Quarters | #2 break | back not flat | 528 | 4.5 / 5.4 / 6.7 | -0.3 | 20% |
| Quarters | #2 break | back flat | 162 | 4.1 / 4.4 / 5.0 | 0.6 | 10% |
| Quarters | #2 flat | back not flat | 73 | 4.4 / 4.5 / 4.8 | -1.6 | 11% |
| Quarters | #2 stay | back not flat | 147 | 4.0 / 4.0 / 4.8 | -0.2 | 4% |
| Quarters | #2 stay | back flat | 30 | 4.5 / 4.1 / 4.5 | 1.5 | 13% |
| Quarters | #2 under | back not flat | 54 | 3.5 / 3.5 / 4.6 | 5.6 | 9% |
| Quarters | #2 under | back flat | 45 | 3.2 / 2.6 / 3.6 | 10.8 | 2% |
| Quarters | #2 vertical | back not flat | 434 | 5.2 / 7.0 / 9.0 | -0.1 | 49% |
| Quarters | #2 vertical | back flat | 125 | 4.7 / 5.8 / 7.2 | 0.8 | 30% |
| Cover 6 (quarter side) | #2 break | back not flat | 215 | 4.2 / 5.6 / 7.2 | 0.5 | 27% |
| Cover 6 (quarter side) | #2 break | back flat | 69 | 3.7 / 3.8 / 5.0 | 1.9 | 4% |
| Cover 6 (quarter side) | #2 flat | back not flat | 39 | 3.5 / 4.0 / 4.5 | -2.2 | 8% |
| Cover 6 (quarter side) | #2 stay | back not flat | 39 | 3.6 / 3.1 / 4.2 | 1.1 | 5% |
| Cover 6 (quarter side) | #2 vertical | back not flat | 184 | 4.8 / 6.9 / 9.7 | 0.1 | 47% |
| Cover 6 (quarter side) | #2 vertical | back flat | 41 | 4.5 / 5.7 / 7.1 | 1.2 | 32% |

Reading it: against a vertical #2 with no flat back the apex is at about 5 yd at 1 s, 7 at 2 s, 9 at 3 s, level with #2 laterally
(about half are 7 yd or deeper by 2 s: he walls #2 up the field). When a back releases flat the same apex is held to about 4-6 yd
(5.8 yd at 2 s against a vertical #2, 4.4 against a break), outside of #2 by about 1 yd. Against an under route he is 5.6 to 10.8 yd
outside of #2 and shallow (about 3 yd at 2 s): he is not with #2 at all.

Behaviour labels (`variant`, named from where he is by 2 s, not from his instruction): Quarters sit 52%, carry 15%, carry-late 11%,
to-flat 12%, sink 7%. Cover 6 quarter side is within 2 points of that on every label.

Who is nearest the back when he reaches the flat (n 493; the back's first frame at 4 yd or more outside and 4 yd or less downfield,
arrival 1.6 s median): the nearest coverage defender is the PFF apex 61% of the time, otherwise the Mike
(HOL) 22%. By position ILB 43%, CB 20%, OLB 18%, MLB 10%. At that moment he is
8.3 yd deeper than the back (IQR 6.5-10.2) and 1.0 yd outside
(IQR -1.0 to 2.5), 8.8 yd away. That is the moment the back arrives, not the catch; the table
has the apex's path to 3 s (`a_vsB_dx`, `a_vsB_out`) for any later moment.

**The role table** (`roles_table.py`, one row per defender per play on BDB 2025, 106744 rows, 9704 plays):
game, play, nflId, pos, side, job_pff, job_inferred, job_conf, family_pff, family_inferred, family_conf, no_template, variant (the apex's), cues.
Inferred columns are held-out-game predictions. Label names are PFF's job names with left/right merged (CF is curl-flat, HC hook-curl, HOL hole, 4I/4O inside/outside quarter, 3S/3M deep thirds, 2 deep half, DF deep free, FL flat).

**No template fits.** In the table `no_template` means no coverage family reaches 0.5 in the inferred family probabilities: 4.8% of plays
(9.8% of defender rows have a job under 0.5), highest in the rare calls (Cover 3 Cloud and Double Cloud 16-22%, Cover 1 Double 14%) and
Cover 0 10%, Cover 6 8%, Quarters 9%. This is **not** yet the share the engine's installed rules (`rules.ts`) do not cover: that needs each installed call mapped to a PFF job multiset and the unmatched
rest counted, which is the next step.

## What this is for

- **Finding plays by coverage in the film tools** (a Cover 3 or Quarters sample) without a PFF label, and in seasons or partial views that have none.
- **Calibrating the engine's coverage rules.** The engine's rule set (`src/sim/coverage/rules.ts`) names these jobs. The inferred
  job shares per coverage, the safety and corner depths at 1-3 s, and the man/zone mix are matched measurements against the sim, to be
  scored as football-transfer evidence, not tuned toward.
- **Scouting.** Any team's tendency by down, distance, formation and personnel from partial tracking.

## Not done, and why

- **BDB 2027 per-player validation.** That dataset covers the draft cohort only (one or two defenders on a snap) and has no coverage
  assignment labels. The test above (hold out a whole season, show only the partial view) is the usable version of that check.
- **Eye-check plots, a dozen per cell.** Not done. The error table above names the confusions that matter; plots belong with any
  later calibration use.
- **Other seasons.** 2021 (BDB 2023) and 2017 (BDB 2019) tracking can be restored with `npm run nfl:fetch` and scored the same way.
