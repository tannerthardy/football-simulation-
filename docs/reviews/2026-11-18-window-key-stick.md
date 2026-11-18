# QB_WINDOW_ARRIVE, QB_KEY_PLANT, QB_STICK (Integration's items i–iii), all off

QB lane, 2026-11-18. Base: develop 69277a00 plus QB_DRIVE, QB_RHYTHM_THROW v2, QB_ALIGN and QB_BODY_FOLLOW; every arm
below runs QB_DRIVE=1 QB_RHYTHM_THROW=1. Item (iv)'s diagnosis is in `2026-11-18-fv-smash-tampa-mike.md`.

## (i) QB_WINDOW_ARRIVE: a defender's momentum toward where the ball is going

**Question.** Is the window's price of a defender at the arrival right? Off, every defender stands still for a full
reaction and then starts from there.
- A defender driving on the point loses the ground he covers while reacting.
- One bailing away gets that ground back.

On rules/tampa-mike, four_verts' checkdown pick came from exactly this: the corner carrying the back to the flat was
priced 0.36 s late (honest margin, his misjudgment aside) and was there with the ball.

**Built (one term, at the catch point and along the flight).** The part of the reaction he still has to pay is the
part his seen course does not already serve:
- **The lag.** `react × (1 − along × min(1, speed / (0.5 vmax)))`, where `along` is the cosine of his seen velocity
  toward the catch point. The flight path's points use the catch point too.
- **The carry.** He carries his seen velocity through that lag before he redirects.
- **Already there.** If he is on a course to the catch point and his carry passes within reach of the point, he is
  there at that moment.
- **Standing in the window.** A defender already within reach of the point still pays the lag. Standing still, that is
  his full reaction, as before.
- **Seen tied in a block.** He is priced as before: his velocity is the block's, not a course of his own.

**Attempts (re-diagnosed each time, each narrowing the cause).**
1. Momentum carried through the reaction only. It moved four_verts' margin 0.58 → 0.49: the reaction itself is the
   term.
2. Plus the course credit. This collapsed the flight path's clearance on quick throws (median pClear 0.95 → 0.41).
   - A rusher running at the passer was counted as "on a course" to the flight path near the passer.
   - A blocked rusher was carried through his block into the lane.
   - The credit is now measured against the catch point, the crossing shortcut applies only to a course to the catch
     point, and a defender seen tied is excluded.
3. A defender already in reach was charged no reaction at all (the old code charged it). Fixed: he pays the lag.
4. Games tripled interceptions (below). The carry took defenders running away from or across the catch point away at
   full speed through their reaction. The carry is now only his course's share toward the catch point (the velocity
   carried scaled by `along`): the closing half stays, the bailing half goes.

**Gates (attempt 4 unless marked).**
- **Calibration** (`trail-margin.ts`, 480 staged plays: 10 concepts × 4 coverages × 3 rosters × 4 seeds; predicted
  1 − pOpen against the real rate of a defended or picked ball):

| class (nearest defender to the target) | off: pred / real | attempt 3: pred / real | attempt 4: pred / real |
|---|---|---|---|
| facing the QB, < 3 yd | 0.163 / 0.187 (n 107) | 0.230 / 0.247 (n 89) | 0.234 / 0.262 (n 84) |
| facing the QB, ≥ 3 yd | 0.110 / 0.064 (n 202) | 0.120 / 0.048 (n 207) | 0.123 / 0.062 (n 209) |
| trailing (not facing), < 3 yd | **0.188 / 0.367** (n 79) | **0.279 / 0.277** (n 47) | **0.297 / 0.292** (n 48) |
| trailing, ≥ 3 yd | 0.030 / 0.093 (n 43) | 0.080 / 0.109 (n 46) | 0.080 / 0.109 (n 46) |

  - **Defended-ball error** (squared): 0.1395 off, 0.112 attempt 3, 0.1154 attempt 4.
  - **Interception error:** 0.010 off, 0.016 attempt 3, 0.011 attempt 4. Picks were already over-predicted off;
    attempt 3 added to that and attempt 4 does not.
  - **Real defended rate by predicted bin:** flat off (0.10, 0.24, 0.21, 0.15, 0.27) and rising with the prediction on
    (attempt 3: 0.06, 0.13, 0.11, 0.23, 0.38).
  - **Staged throws** (completions / throws, defended, ints): off 276 / 432, 63, 4; attempt 4 262 / 387, 51, 3.
- **Plant gate** (`plant-gate.ts`, staged quick concepts, 192 plays): read 1 ready at the plant 57 / 57.
  - Median price: P 0.47 → 0.36, pOpen 0.71 → 0.57, pClear 0.95 → 0.95.
  - Over the rhythm bar 24 → 20; rhythm throws 11 → 8.
  - Man coverage's quick routes price riskier (a man on the receiver is on a course to the catch point). Zone hitches
    against bailing corners are about neutral: in our cover 3 the hitch's nearest man is the underneath dropper, often
    standing in the window. **The anticipation half is not repaired by this term.**
- **Games** (`drop-timing.ts`, seeds 11 and 31, 4 games each, decision belief recorded at the release):

| arm | throws | completion | ints | air yd | time to throw (median) | no-set | air 10–20 / 20+ (completion) |
|---|---|---|---|---|---|---|---|
| off | 672 | 0.710 | 5 (0.007) | 5.4 | 2.70 | 0.027 | 81 (0.70) / 21 (0.33) |
| attempt 3 | 591 | 0.745 | **13 (0.022)** | 5.1 | 2.70 | 0.044 | 73 (0.73) / 8 (0.75) |
| attempt 4 | 632 | 0.725 | 7 (0.011) | 5.0 | 2.70 | 0.035 | 66 (0.70) / 11 (0.55) |

  Rhythm throws stay rare in every arm (4 / 1 / 1). All rows are non-rhythm throws.

  - **Attempt 3's interceptions** (`int-margin.ts`: the picker as the window priced him at the last evaluation before
    the release):
    - 9 of the 13 came against man coverage: cover 1, cover 0, robber, 2-man.
    - 9 had a believed pick risk under 0.02, unpressured and over his normal bar.
    - The picker was mostly not in the window's trace at all, often running away from or across the catch point at the
      release: a corner driving deep before a comeback, a man on another receiver crossing the throw. In games those
      plant and come back on the ball. Attempt 3 carried them away for a full reaction at full speed.
    - Attempt 4 (the carry only toward the point) puts interceptions back within noise of off (7 against 5). The
      calibration gain stays.
  - **Fewer deep throws** (20+ air yd: 21 → 11). The ones he still throws complete 0.55 against 0.33: deep defenders
    already running to where a deep ball lands are now priced as being there.
  - **No-set share** (the check against the NFL's 31%, not a target): 2.7% → 3.5%.
  - **Squat-corner flat** (held for Coverage):
    - curl_flat's flat at the plant: pOpen 0.94 → 0.89 and intRisk 0.016 → 0.033 against cover 2 and tampa 2;
      unchanged against cover 3; 0.98 → 0.94 against cover 4 and 6.
    - four_verts' checkdown pick (rules/tampa-mike): honest margin 0.36 → 0.06 s with the attempt-2 form. The
      toward-point course credit and carry it used are unchanged in attempt 4.

**Not repaired by this term: the anticipation half.** Pricing a hitch before the break as open against a cushion
needs where the receiver will be when he stops. In our quick game the hitch's nearest man is usually the underneath
dropper already standing in the window (stick and hitches against cover 3), not the bailing corner. Rhythm throws
stay rare until the key read below.

## (ii) QB_KEY_PLANT: the key read on the plant, no default on an undeclared key

**Built.**
- On a keyed quick concept (a rhythm concept with a plan key), the key is read on the plant, from his picture of the
  key man by then.
- An undeclared key (moved less than the commit margin, not standing on either route) gets no sitter default.
  - **His first lean.** He throws the route the key's first lean gives, once he trusts it: the lean, noise included,
    clears KEY_LEAN of the commit margin. That is 0.25 for the best reader and 0.75 for the worst, by awareness and
    experience (chosen).
  - **The re-read.** Without a lean he trusts, he takes one hitch (KEY_REREAD 0.35 s, chosen) with his eyes on the key,
    throwing nothing. Then he goes with the lean he has, right or wrong. The rush ends the hitch early.
  - **No picture of the key at all.** He keeps the old sitter default (2 + 2 plays below).

**Staged** (`plant-gate.ts`, 192 plays: stick, hitches, slant_flat, quick_outs, curl_flat, double_slants × 8
coverages × 2 rosters × 2 seeds; QB_DRIVE and QB_RHYTHM_THROW on; window off):

| | off | on |
|---|---|---|
| keyed plays with a key read | 95 | 128 |
| key read time, median against the plant | +0.25 s | −0.05 s |
| read modes | move 54, on-high 23, sits 13, role 5 | move 75, on-high 30, lean 15, on-low 4, sits 2, role 2 |
| rhythm throws | 11 | 29 |
| completions / ints | 133 / 4 | 135 / 2 |
| yd per play | 7.84 | 6.45 |

- **Yards per play** fall on four 70-yd catch-and-runs off. quick_outs, roster 3, seed 1, against cover3_match, cover 4
  and cover 6: the key was never read, and the quick out went. On, the key sends the ball to the hitch. Per concept:
  - quick_outs 15.5 → 5.8 yd per play (those four);
  - double_slants 4.5 → 5.7;
  - curl_flat 8.9 → 9.2;
  - the rest unchanged.
- **No re-read fired**: every undeclared key had a lean he trusted. The read noise (sd 0.15–0.7 of a 1.0 margin)
  clears the lean threshold on most draws.
- **Lean reads:** 15, caught 15.
- Test: `test/qb-key-plant.test.ts`.

## (iii) QB_STICK: the committed throw sticks (pump part 1)

**Built.** The delivery recheck pulls a started throw down only on a perceived change since the decision, all from
his picture (pose, his read of blocks, his rush belief):
- **On the point:** a defender now within 1.5 yd of the catch point, having been more than 2.5 yd away.
- **In the lane:** a defender now in his reach of the low flight, having been more than 1 yd beyond it.
- **Receiver:** the receiver down, or more than 2 yd from where he expected him now.

After such a pump the same man is not thrown until the cause clears a wider exit (the defender more than 4 yd from the
point; the receiver up and back within 2 yd of his route). The re-priced value is kept as a diagnostic only. Margins
chosen.

**Games** (`pumps.ts`, seed 101, 4 games, QB_DRIVE and QB_RHYTHM_THROW on):

| | off | on |
|---|---|---|
| pumps per dropback | 0.071 (29 / 406) | 0.018 (8 / 433) |
| pumps by family | dropback 20, play action 5, quick 3, screen 1 | dropback 4, quick 3, play action 1 |
| pumps out of the pocket / with the rush under 1 s | 0 / 7 | 0 / 3 |
| pump causes | (re-priced value below zero) | in-lane 3, receiver-off 3, on-point 2 |
| completion / ints / sacks | 0.698 / 8 / 17 | 0.696 / 8 / 22 |
| time to throw, median | 2.55 | 2.60 |

- **Formerly cancelled throws** (the old recheck would have pulled them down; QB_STICK kept them): 24. Caught 16
  (0.67), 1 int, about the ordinary completion rate. The re-priced pumps were mostly cancelling ordinary throws.
- The sacks difference (17 against 22) is within these games' divergence (406 against 433 pass plays). It is not
  attributed here.
- Pump part 2 (the deliberate pump fake as a per-QB trait) is parked in `docs/PARKED.md`.
- Test: `test/qb-stick.test.ts`.

**DEEP_GATE check** (defense/C35-deep-gate 1a2cc3c6 with QB_STICK ported; `deep-gate-pump.ts`, 360 staged plays:
10 concepts × cover2, cover3, cover3_match, tampa2 × 3 rosters × 3 seeds):

| | pumps | deep-seat arm bites / holds | completions | ints | sacks | deep throws (caught) | yd per play |
|---|---|---|---|---|---|---|---|
| STICK off, GATE off | 38 | 560 / 0 | 210 | 2 | 9 | 24 (15) | 6.50 |
| STICK off, GATE on | 38 | 560 / 541 | 210 | 2 | 9 | 24 (15) | 6.35 |
| STICK on, GATE off | 6 | 556 / 0 | 213 | 2 | 7 | 26 (13) | 6.28 |
| STICK on, GATE on | 6 | 556 / 539 | 213 | 3 | 7 | 26 (13) | 6.45 |

- DEEP_GATE's effect on the throw is nil for Cover 2/3 deep players with QB_STICK on or off: completions, sacks and
  deep balls are identical, with one more int in the stick arm.
- Only yards after the catch move (±0.15 yd per play).
- Every deep seat that sees the arm is still tagged as biting it; with DEEP_GATE on he holds instead.

## Checks

- **Information:** the guard, scan and provenance pass. The scan caught QB_STICK's first build reading true down and
  engaged states (isDown, engagement). Those are now his picture's pose and his read of the block.
- **Dither budget:** passes.
- **Typecheck:** passes.
- **Tests:** qb-key-plant, qb-stick, qb-key-read and read-plan pass.
