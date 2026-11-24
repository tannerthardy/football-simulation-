# The QB's calibration contract: operator, baseline on the old controller, standing test (harness item 1)

Tools/Physics, 2026-11-24, for Integration (docs/reviews/2026-11-24-qb-decision-plan.md section 3 module D and section 4; engine-95, develop 703fc628c). Measurement only: a read-only tap on `QBPass.startThrow` and the play's outcome, no RNG draw, no behaviour change. Branch `tools/qb-harness`.

## What it measures

`scripts/diag/qb/calibration.ts` (`league <seed> <games>` or `staged <rating> [seeds]`) writes one row per pass play with a throw: what he believed at the decision (`ThrowEval`: `P` the completion belief and `intRisk`, with the window's parts, the flight, the catch point), the defense as the engine had it (every defender's role, distance to the catch point and to the ball's path, facing to the passer, assignment) and what happened (completed, intercepted and by whom, broken up and by whom, dropped). `calibration_report.py` tabulates believed against actual overall, by the strongest role present, by the role that mattered, by route family, rating band and coverage.

Roles, at the decision: **coverer** (the man on the receiver: a man defender whose target he is, else the nearest defender within 8 yd), **driver** (another non-rusher within 8 yd of the catch point whose body faces the passer within 45 degrees: he can drive on the throw; the tap's looser 14 yd / 60 degree version is nearly everyone, so the report tightens it), **lane** (another defender or a rusher within reach + 0.5 yd of the ball's path), **other**. The role that mattered = the role of the defender credited with the interception or breakup; for a completion, the coverer.

## Baseline on the old controller

League games (24, seeds 21-44, 1,824 throws; `data/reviews/qb/calibration-league-baseline.md`, rows `.jsonl.gz`):

- **Overall: believed completion .673, actual .701 (+.028, SE .011); believed interception .011, actual .017 (31 events against 19.8 expected from the beliefs).** He under-prices his own interceptions by about a third.
- By believed completion: .50-.70 (n 951) believed .621, actual .657; .70-.85 (692) .772 | .803; **.85-1.00 (65) .865 | .769 (-.096)** over-believes the very best windows.
- **By the strongest role present** (what he had to price): driver within 8 yd facing him (n 838) believed .678, actual .684 (+.006), int .014 | .019; lane man, no driver (243) .677 | .675, int .011 | .025; coverer only (663) .669 | .715 (+.046); **nobody within 14 yd of the catch point (80) .640 | .850 (+.21)**: a wide-open throw he rates as 64% completes 85%.
- **Who made the plays that went wrong** (interceptions 31: coverer 17, driver 5, lane 2, other 5, outside the 14 yd list 2; breakups 181: coverer 107, driver 29, lane 14, other 21, outside 10). The coverer is the role that mattered in 55-59% of both; drivers 16-17%; defenders he had no picture of (outside 14 yd) 1-2 interceptions of 31.
- **By route family** (believed | actual completion; n): stop (580) .681 | .717; flat (477) .682 | **.759**; in (276) .663 | **.620**; out (196) .677 | .699; **vertical (109) .578 | .468 (-.110)**; screen (104) .723 | .904; slant (74) .644 | .622. He prices every family within a narrow band (.58-.72) where the actual rates run .47-.90.
- **By coverage called**: the gaps run -.09 (cover0, tampa2) to +.11 (cover2); cells of 70-160.
- **By rating band**: the league passers are mid (1,000 throws, believed .663, actual .707) and high (824, .685 | .694); there is no low-rated league passer (the staged panel covers it).

Staged panel (the QB lane's rating panel concepts x coverages x rosters x flips, one passer at every mental rating 60, seeds 1 and 2; 230 throws, `data/reviews/qb/calibration-staged60-baseline.md`): believed .672, actual .691 (+.019, SE .030); interception believed .009, actual .013 (3 events); driver present (134) +.058 (SE .038); coverer only (57) +.042 (SE .060). The role cells are too small to read except those two.

What this does and does not say. The belief is one number per throw (P = pOpen x pClear x pAcc x hands), so the believed side cannot be split by the role of the defender who mattered; the split is by the strongest role present at the decision and by the role that made the play. The overall figures are close because the errors of opposite sign cancel across families (flat and screen under-priced by .08-.18, vertical and in over-priced by .04-.11); the interception under-pricing is the one that does not. The QB lane's earlier finding that defenders who reach the catch point are priced a median 0.58 s late (scripts/diag/eyes/arrival-check.ts) is a statement about the arrival term inside `window()` and is not re-measured here; this operator is the outcome-level check that term feeds. The believed drop rate (DROP_BELIEF 0.165 - 0.13 hands) was fitted to the engine before the three catching defects (HANDS_ON_ARMS, SECURE_SPLIT, SECURE_FACE_GEOM, in review) and should be re-read for the calibration contract when they land; I have not refitted it.

## The standing test

`test/integration/qb-calibration.test.ts` (integration project, about 2.5 minutes; it removes the legacy pins and runs the engine as it is): a mid-rated passer (all seven mental ratings 60) on the staged panel, seeds 1 and 2 (230 throws). Fails, naming the role, when the believed completion differs from the actual by more than **0.08 overall, 0.13 in the driver-present cell, 0.17 in the coverer-only cell** (cells with at least 40 throws), or the interception rate by more than **0.03**. The tolerances are a stated choice: the baseline gap plus two standard errors, so a change of the defense that moves the judgment by more than the sampling noise goes red; they are not a target. The league interception under-pricing (31 against 19.8) is reported here and not asserted in the test (3 events in the staged set); the rebuild's gate should tighten both.

## Caveats

- One league draw of 24 games and one staged panel; role cells under 100 throws have standard errors of .04-.09.
- A defender "within 8 yd facing the passer" is a proxy for one who can drive on the throw (his body's facing, not a measured gaze); the engine's perception of the passer's arm is the defense's own information, not read here.
- The league passers are 'mid' and 'high' bands; 'low' is empty in league and exists only in the staged panel (rating panel, item 2).
