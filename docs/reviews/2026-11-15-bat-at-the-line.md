# Batted at the line: what decides it (Flex, 2026-11-15; Integration / Tools' arrival cut; diagnosis only)

Tools' cut: 77 deflected passes in 1,355 attempts (5.7%) against the NFL's tipped flag at 0.5% (undercounted, but
nowhere near). 69 arrive behind the line, most with an interior DL 0.4-1.6 yd from the ball. This is Flex's half: what
decides a bat, how high and wide a rusher's hands reach while engaged, and the rate per rusher in the lane. The QB's
half (throwing through an occupied lane he can see) is the QB lane's.

## The mechanism (catching.ts)

1. **The opportunity is geometry.** In the first 0.4 s of flight (`resolveCatchOpportunities`, `batWindow`), a
   defender, engaged or free, is in play when the ball passes within his reach of his centre (`profile.reach`, about
   0.95 yd) and below 0.95 of his reaction reach (`reactReach` = height x 1.33 + 0.3 of his vertical, about 3.0 yd).
2. **The outcome is a roll** (`defenderPlay`, `isBat`): `pBat = (engaged ? 0.04 : 0.12) x (facing the ball ? 1 : 0.2)
   x (0.5 + playRecognition)`.
3. **The roll repeats every tick** the ball stays in his window. A failed bat sets no `noCatchUntil`, so his chance per
   pass is 1 - (1 - pBat)^ticks, and depends on the tick length. That is why free defenders bat 29% of their
   opportunities when the per-roll ceiling is 18%.
4. **His hands are not in it.** An engaged rusher's hands on the blocker (the blocker's joint loads him at about
   1,000 N), his arms at his pads, have the same vertical window as hands raised. Nothing asks whether he read the
   throw, whether his hands are up, or how long raising them takes.

## Measured (bat-line.mts, default engine-67, seed 11 x 4, 319 passes)

| | engaged | free |
|---|---|---|
| bat opportunities | 99 (0.31 a pass) | 31 (0.10 a pass) |
| batted | 7 (**7.1%** of opportunities) | 9 (**29.0%**) |
| ball height at the opportunity, p50 | 2.47 yd (his height 2.09, reaction reach 3.07) | 2.42 yd |
| the blocker's joint load on him, p50 | 1,061 N | 0 |

- Batted at the line: 16 of 319 passes (5.0%). 15 of the 17 deflections behind the line.
- By slot: DT_S 7, DT_W 3, DE_W 2, DE_S, LB_W, LB_M, CB_S 1 each.
- At the bat: ball height p50 2.47 yd, 0.20 s into its flight.

**Read:**
- The opportunity rate (0.41 rushers in the lane a pass) is the QB's half: he throws through occupied lanes.
- The outcome (7% engaged, 29% free, per lane crossing) is a roll that ignores the hands and repeats per tick. That is
  this half.
- Against the NFL's 0.5% of passes the bat must be rare even with a rusher in the lane: an engaged rusher's hands are on
  the blocker, and a free one has to read the throw and get them up in time.

## Proposed (not built): `BAT_HANDS`, the bat as hands meeting the ball

- **His hands must be up to be in the lane.** A rusher raises them when he reads the throw: the QB's arm coming forward,
  perceived at his sight delay, in his view. Then his hands travel from his pads to overhead at ARM_SPEED. A man
  engaged with his hands on the blocker must first take them off (his hand state under FITTED_HANDS, or the joint
  under the base). Raising them costs his rush: he stops driving.
- **Contact by geometry, once.** The ball's path through his hands' envelope, from where his hands actually are (his
  reach laterally from his shoulder line, up to his raised height), against the ball's position. A ball that passes
  through a raised hand is deflected; one that passes over or wide is not. No pBat roll, no per-tick re-roll.
- **Skill as capability:** his recognition sets how early he reads the arm (the sight delay he has), his height and arm
  length the envelope. Ratings never set the bat.
- **Gates, before any build:**
  - bats per lane crossing, engaged against free;
  - bats behind the line as a share of passes;
  - the remaining excess, if the lane crossings stay at 0.41 a pass, named as the QB's.

The per-tick re-roll is also a defect on its own (a dt dependence in an outcome), worth fixing even before BAT_HANDS:
one roll per opportunity, as the receiver contest already does with `tried`.

## PLAY_ONCE: the same defect downfield (2026-11-15; engine-68, play-once-rows.mts in the patch tree, seed 11 x 8)

defenderPlay's interception / breakup roll for a defender who sees the ball also re-rolled each tick it stayed within
his reach. In 4 games only 31 defender-pass plays reach that roll at all (most contests go through receiverContest);
13 of them rolled more than once, up to 3 times. `PLAY_ONCE` (default on, `=0` restores): one try per defender per
pass. Patch: docs/reviews/patches/play-once-engine68.patch, stacked on bat-once-engine68.patch.

Per attempt, PLAY_ONCE=0 -> on:

| | attempts | complete | intercepted | broken up |
|---|---|---|---|---|
| all | 658 -> 624 | 67.2 -> 67.8% | 1.8 -> 1.3% | 10.0 -> 10.4% |
| man | 215 -> 208 | 55.3 -> 55.3% | 3.7 -> 2.4% | 15.3 -> 18.3% |
| zone | 443 -> 416 | 72.9 -> 74.0% | 0.9 -> 0.7% | 7.4 -> 6.5% |
| short < 5 yd | 322 -> 310 | 76.1 -> 75.5% | 0.9 -> 1.3% | 7.1 -> 6.1% |
| medium 5-15 | 300 -> 281 | 63.0 -> 64.8% | 2.7 -> 1.1% | 14.3 -> 16.0% |

- PBUs by the defender's position relative to the receiver: in front / beside / behind 22 / 22 / 22 -> 20 / 25 / 20.
- Deep (> 15 yd at the aim) is too small to read (13 / 10 attempts).
- The effect is small, as the footprint predicted: interceptions down about half a point. The rest is within an
  8-game read's noise.
- Per-opportunity rates would need a counter inside defenderPlay. The footprint (31 plays in 4 games) says they would
  move little.
