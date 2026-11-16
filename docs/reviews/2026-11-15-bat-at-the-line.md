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

## Engine-68, BAT_HANDS staging, and the lanes (2026-11-15)

**Engine-68 already took most of the bat excess, through the look, not the hands.** bat-line.mts, seed 11 x 4,
default engine (BAT_ONCE not in it):

| | batted at the line, % of passes | engaged: per chance | free: per chance |
|---|---|---|---|
| engine-67 | 16 of 319 (5.0%) | 7.1% | 29.0% |
| engine-68 with ENGAGE_TRUNK and CHEST_SHOULDERS off | 12 of 372 (3.2%) | 6.7% | 15.4% |
| **engine-68** | **2 of 353 (0.6%)** | **1.5%** | 0.0% |

The trunk pair puts an engaged rusher's look (his shoulders) on the man he is engaged with. The roll's facing term
(x 0.2 when he does not face the ball) then takes most of his chance. It is the roll's own term doing it, not his hands.

**Lane crossings, NFL against ours** (lane-cross.py, the same code; ball path from tracking / the export; QB lane's
population; the closest horizontal distance from the ball to any DL in its first 0.4 s):

| | within 0.55 yd | within 0.95 yd | tipped per crossing (0.55 / 0.95) |
|---|---|---|---|
| NFL (6,342 passes; tipped flag on 2.57% of passes) | 5.9% | 18.0% | 5.6 / 5.2% |
| base (engine-67 patch base, seed 11 x 8) | 8.4% | 26.2% | |
| FH + PO + FM2 | 10.3% | 31.2% | |

- Our QBs throw through the rush's lanes about 1.5 times as often as the NFL's. That is the QB lane's half.
- The NFL tips about one in twenty passes that cross within a DL's reach.
- The tipped flag is on 2.57% of NFL passes in this population, more than the 0.5% quoted. It is probably any tip,
  not only at the line, so the comparison per crossing is the cleaner one.

**BAT_HANDS staging (built, off; seed 11 x 4, engine-68):**
- Batted 24 of 344 (7.0% of passes). Engaged: 19 of 134 chances (14.2%); free: 5 of 29 (17.2%).
- Against the NFL's about 5% per crossing, that is about three times too many.
- The cause is in the decision, not the geometry. Every rusher who sees the windup and cannot hit the QB raises his
  hands, engaged or not. With hands topping out near 3.0 yd against a ball at about 2.4 yd, nearly every ball through
  his body's width is caught.
- What decides whether a rusher stops rushing to get his hands up is a coached judgment ("if you can't get there, get
  your hands up"), plus whether his hands are free of the blocker. It is not built honestly yet.
  - Options: the raise needs his hands off the blocker first (a real time cost: his reaction plus the arm's travel back
    from the blocker's chest before it rises); and the judgment from what he perceives (his time to the QB against the
    ball's release).
- Not for the card. Engine-68's 0.6% is under the NFL's per crossing (1.5% engaged against 5%), BAT_HANDS' 7.0% is
  over it, and the honest decision sits between.

## BAT_HANDS parked (Integration, 2026-11-15, option (b))

- **Engine-68's rate is near the NFL's per pass for a reason that is not the hands:** the roll's facing term, which
  the trunk pair's look (an engaged rusher's shoulders on his blocker) now catches.
- **Per crossing we are now under:** engaged 1.5% of chances against about 5% per crossing in the NFL. The BDB tipped
  flag is on 2.57% of passes, against our 0.6% batted.
- **The bat comes back when the roll is replaced, not before.** BAT_HANDS stays in the tree, off. Its next step is the
  raise decision:
  - his hands come off the blocker first (his reaction, then the arm's travel back from the blocker's chest, before
    they can rise);
  - then the judgment "if you can't get there, get your hands up", from his own time to the QB against the release he
    sees.
- The lane-crossing rate (ours 8.4 / 26.2% within 0.55 / 0.95 yd, against the NFL's 5.9 / 18.0%) has gone to the QB
  lane.

**Which path the interceptions and breakups come through** (engine-68 + BAT_ONCE + PLAY_ONCE, seed 11 x 8, 624
attempts; a counter in defenderPlay's roll):
- interceptions: 8, of which 2 come through defenderPlay's roll (the path PLAY_ONCE fixes); the other 6 through the
  receiver contest;
- breakups: 67 PBU events, of which 28 come through defenderPlay's roll; the other 39 through receiverContest and the
  securing window (secureStep).
So PLAY_ONCE governs about two fifths of the breakups and a quarter of the interceptions. Its effect on the totals is
small because only the repeated rolls change: 13 of 31 defender-pass plays in 4 games.
