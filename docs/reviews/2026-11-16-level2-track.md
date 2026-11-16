# LEVEL2_TRACK (off): the zone climber's time cost measured from his track (G1-P018)

Run Game for Integration, 2026-11-16, on engine-70 (develop fb870814 merged).

## The defect

`test/receiver-run-eligibility.test.ts`, case G1-P018: outside zone strong, gun bunch, against cover0 with zero_6
(six rushers against five linemen). On the defaults the line leaves the play-side backer free:

| | LG | C | RG | free |
|---|---|---|---|---|
| defaults | reach DT_W | double DT_S → **LB_W** (backside, +2.1 yd) | reach DT_S | **LB_M** (−0.7, play side of the double's track) |
| all flags off | double DT_W → LB_M | reach DT_W | reach DT_S | LB_W |
| LEVEL2_TIME=0 | reach DT_W | double DT_S → LB_M | reach DT_S | LB_W |
| ZONE_GAP=0 | double DT_W → LB_W | reach DT_W | reach DT_S | LB_M |

Delta-debugging the 32 promoted blocking flags (`scripts/diag/mirror/p018-ddmin.py`): the minimal set whose
off-ness passes is {LEVEL2_TIME, ZONE_GAP}; either alone on fails. Each moves a different decision:

- **ZONE_GAP picks the double.** The centre leaves the backside-shaded DT_W to LG and doubles DT_S with RG; that is
  its NFL-backed rule and is not the fault.
- **LEVEL2_TIME picks the double's backer, and that is the fault.**
  - Without LEVEL2_TIME, a worker's cost to a backer is measured from his track: his y plus the play-side lead, 1.5 yd
    for a double's climber and 1 yd for a lone climber or a wing.
  - LEVEL2_TIME's time cost (start + run / 0.75 vmax) measured the run from his body, dropping that lead.
  - With the two backers about equally far (LB_M 5.05 yd, LB_W 5.06 from the centre) the play-side double climbs
    backside, with either ZONE_GAP double, and the play-side backer is the one left free.
- **This is an inconsistency between two versions of one rule, not a design choice.**
- **The counting case is real.** Six rushers against five linemen means one backer is free by arithmetic. The zone
  rule leaves the backside one.

## The change

LEVEL2_TRACK (off; with LEVEL2_TIME): the run is measured from the worker's track point (`blocking.ts`, the
LEVEL2_TIME cost). Start times (a double's climber 0.9 s, a lone climber or wing 0.3 s) and the wings are unchanged.
Flag rows: FLAGS.md, reference-stack `off`, baseline `"0"`.

**Bound.** Moving the reference by the lead (at most 1.5 yd) changes a worker's time cost to any backer by at most
1.5 / (0.75 × vmax), about 0.25–0.3 s. A choice can therefore change only between backers whose costs were within
about twice that, roughly 3 yd of run. With two backers clearly unequal in distance, nothing changes.

**Pin restated (test-only, same patch).** Instead of "LG climbs to LB_M", the G1-P018 case now asserts:

- LB_M is owned by someone: a target, a climb or a double's backer;
- any of LB_M / LB_W left free is backside of the ball.

With `TEST_ENGINE_DEFAULTS=1` it fails on the defaults (the defect) and passes with LEVEL2_TRACK=1 (36/36). All flags
off: 36/36.

## Gates

**Staged plans** (`scripts/diag/level2-plans.mts`; the line plan at the snap). 7 zone runs × 6 formations × 8 fronts ×
5 coverages (plus cover0 with zero_6) × flip = 1,728 cases.

- **Plan changed: 186 (10.8%).**
  - By front: stack33 67/216, mint 51/216, under34 15/216, odd 13/216, bear34 11/216, tite 11/216, penny 9/216,
    penny_bear 9/216.
  - By run: oz_strong / wz_strong 47/288 each, oz_weak / wz_weak 28/288 each, iz_strong / iz_weak 18/288 each.
- **Which backer is free, over all 1,728 cases:**

  | | free box defenders | play side | backside | middle | cases with a play-side backer free |
  |---|---|---|---|---|---|
  | off | 1,236 | 476 | 682 | 78 | 476 |
  | on | 1,250 | 373 | 805 | 72 | 373 |

  - Among the changed cases: play-side-free → backside-free 49; (backside, play side) → (backside, backside) 46;
    play-side-free → none 16; the reverse (backside → backside + play side) 6.
  - The total free rises by 14: some re-routed climbs take a deep defender sitting in the box, and the backer behind
    him is now the free one, backside.

**Run set.** `npm run ref:report -- --set fresh --flag LEVEL2_TRACK=1 --placebo 2`: engine-70 at f6ef1d9b, clean tree,
1,295 plays; yards capped at 20.

| family | ref mean / stuffs (≤0) | LEVEL2_TRACK mean / stuffs | paired (SE) | placebo mean / RMS |
|---|---|---|---|---|
| OZ (343) | 2.90 / 19.8% | 2.98 / 19.8% | +0.08 (0.09) | +0.12 / 0.13 |
| IZ (240) | 3.10 / 14.2% | 3.15 / 14.2% | +0.04 (0.05) | +0.06 / 0.16 |
| gap (436) | 3.98 / 6.7% | 3.98 / 6.7% | +0.00 (0.00) | −0.10 / 0.21 |
| duo (139) | 4.15 / 7.2% | 4.15 / 7.2% | +0.00 (0.00) | −0.25 / 0.25 |
| toss (45) | 3.18 / 31.1% | 2.96 / 31.1% | −0.22 (0.44) | −0.82 / 0.83 |
| draw (92) | 3.52 / 33.7% | 3.49 / 33.7% | −0.03 (0.06) | +0.50 / 0.51 |
| all (1,295) | 3.49 / 14.4% | 3.51 / 14.4% | +0.02 (0.03) | −0.01 / 0.02 |

Other readings:

- Missed + broken in the open: 0.286 → 0.287 a run.
- Share of plays whose yards change: 5% (placebos 94–95%).

**Read.** A defect fix with no measurable run-game effect.

- Every family sits inside its placebo floor, and stuffs are unchanged in every family.
- Gap and duo are untouched by construction (no LEVEL2_TIME zone count there).
- The change moves which backer is free (play side 476 → 373 of 1,728 staged plans) on the roughly 10% of zone
  snaps where two backers are near-equidistant.
- In the fresh set those plays are few (5% change yards) and their yards net out.
