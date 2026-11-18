# Short picks under DEF_CATCH + BALL_SIGHT: what the window believed (Flex's rows, traced)

QB lane, 2026-11-18. Tree: develop d57506543 (PR #852) + the quick-clock patch + Flex's def-catch-ball-sight diff,
READ_WINDOW=1, DEF_CATCH=1, BALL_SIGHT=1. League game seed 101 (Flex's setup); picks at plays 35, 38, 93, 114 and 119.
Probes: `pick-list.ts`, `pick-trace.ts` and `pick-path.ts` (scripts/diag/eyes), each with marginProbe.

## Play 35 (hitch_cross against cover3_seam, CB_S picks), three faults on one play

1. **The aim moved after the decision.** Decided at 2.55 s on an aim at y 38.5. At the recheck (2.75 s) his forecast had
   the receiver about 3 yd away (y 35.8), and he released at 2.90 to y 35.0. The ball went where he re-aimed (drawn aim
   0.5 yd from it) and the corner was there. Not an errant throw: Flex's 0.15 yd is against the release aim, right.
2. **QB_ROLE_PATH (engine-88) priced the corner out of the play twice.**
   - At the decision, as "carrying another receiver", priced from where that route takes him (3.0-3.3 s): no factor.
     The ball was 3.5 yd in front of him (aim depth 5.1, his 8.6). 3b had already restricted the deep zone rule to a
     ball at or beyond him (within 2 yd short); the carry rule had no such gate.
   - At the recheck, as "roof over the target, ball under him": no contest. The target was a crosser (hitch_cross Z)
     running across the field, not a vertical; a carry over the top is a technique against a vertical route.
   - Two fixes in scratch (`docs/reviews/patches/engine71-footwork/role-path-carry-fixes-on-pr852-plus-qclock.diff`):
     the carry of another receiver only for a ball at or beyond his depth less 2 yd; a carried receiver must be
     running downfield (within 45 degrees, as the passer sees him). Not yet measured; play 35 still picks without
     the third fault fixed.
3. **His coverage belief was certain and wrong.** cover3_seam (zone, one-high). His belief went from cover4 0.42 /
   cover6 0.25 / cover3 0.17 at the snap to cover0 0.995 by 1.0 s and 1.000 after (pMan 1.00, pSingleHigh 0.00). With man
   belief the window has a facing defender wait for the release (THROW_REACT's man rule). A zone corner with his eyes on
   the QB reads the arm (readArm, arm-bite at the release) and broke 0.34 s earlier than priced.
   - Staged (doubles, curl_flat, all 44 coverages, 192 plays): never confidently wrong (13 confident, all right).
   - League game seed 101 (98 pass plays): 41 confident (>= 0.95), of which 5 wrong on man / zone and 7 wrong on the
     shell. 7 of 88 zone plays believed man >= 0.9, across six formations (2 with motion). 1 of the game's 3 picks is
     on one of them. A QB-lane item: what in league play drives the posterior to certainty (`cov-id-games.ts`).

## Plays 119 and 93

The decision priced the picker as absent (119 NB) or late (93 CB_S, m +0.10 at the recheck). The recheck had nothing to
pull for (no perceived change; rush 0.6-1.9 s). Same three checks to be run on them once the ROLE_PATH fixes are measured.

## For DEF_CATCH's landing (with Flex)

The window's contest → pick conversion is (contest − first) × 0.08 × ball skills, the batted-ball world. It should come
from Flex's catch law (catching.ts `defenderCatch` / `handsCatch`). Also missing: the chance his miss spread puts the
ball within a counted defender's reach. Flex's v2 rows: miss > 1.5 yd from the release aim on 24 of 41 picks.

## The 0.35 s dwell in the drop-back game (Integration's question)

`open-vs-eyes.ts`, develop e27824e8 + the quick clock, 56 zone plays per concept: reads that cleared his bar only after
his eyes had left them: curl_flat 15, dagger 20, flood 31, smash 26. Time to throw p50 2.85 / 3.55 / 3.15 / 3.25 s. The
dwell moves him off drop-back reads before they open too. That is the next timing item after the quick game lands.
