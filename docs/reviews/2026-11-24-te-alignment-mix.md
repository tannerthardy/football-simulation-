# Tight end alignment mix: a playbook proposal (2026-11-24; not built)

Rules + Coaching, for Integration and the user ("standard first"). Same data as the alignment chart
(`docs/reviews/2026-11-24-alignment-chart.md`): BDB 2025 weeks 1-9 dropbacks against our 24 games (engine-92, ref).

**TE class, by position at the snap** (the same code on both sides):
- attached: within 2.5 yd of the tackle and on the line;
- wing / close: off the line or 2.5-4 yd outside the tackle;
- detached: more than 4 yd outside;
- backfield: behind the tackle box.

## NFL against ours, by personnel

| personnel | NFL attached / wing-close / detached / backfield | ours |
|---|---|---|
| 11 (n NFL 6,787, ours 1,137) | 31 / 39 / 28 / 2% | 57 / 11 / 32 / 0% |
| 12 (2,722 / 604 TEs) | 38 / 38 / 20 / 5% | 74 / 25 / 0 / 1% |
| 13 (729 / -) | 34 / 32 / 31 / 3% | no 13 personnel formation |
| 21 (602 / 222) | 51 / 22 / 25 / 2% | 75 / 10 / 0 / 14% |
| 22 (298 / 116) | 49 / 23 / 26 / 3% | 82 / 0 / 0 / 18% |

The NFL's standard tight end is a moving piece. In every personnel group he is attached a third to a half of the time,
and otherwise off the ball beside the tackle (a wing, a close flex, the H) or detached in the slot or wide. Ours is
attached by default, almost never in a wing or close alignment in 11 personnel, and never detached in 12, 21 or 22.

## Where it comes from (src/playbook/formations.ts)

24 formations; 18 of 31 TE-type slots are `inline` or `wing`. By formation (our TE class shares on dropbacks):

| formation | TE now | NFL-standard change (proposal) |
|---|---|---|
| gun_doubles_11 | attached 78%, wing 22% | Y as a close flex (3-4 yd, off the ball) as the standard 2x2 11 look; keep the attached variant as a call option |
| gun_trey_11 | attached 100% | keep (trey is an attached-TE look by definition) |
| pistol_11, ace_11, ace_trips_11 | attached 97-99% | add the Y-off (wing / H) variant beside each, so the 11 mix can reach about a third attached |
| gun_trips_11 | detached 43%, attached 31%, wing 25% | keep (already near the NFL's 11 split) |
| gun_bunch_11, gun_empty_11 | detached 77-100% | keep |
| gun_wing_12, ace_12, pistol_12 | attached 49-100%, wing 0-51%, detached 0% | add a 12 look with one TE detached (2x2 with Y as #2 to the field): the NFL's 12 detaches a TE on 20% |
| i_jumbo_22, i_twins_21, offset_i_21, i_pro_21 | attached 73-82%, the rest the FB | add a 21 look with the TE detached (the NFL's 21 detaches him 25%) |
| (none) | - | 13 personnel is absent: a later scheme option, not standard-first |

The lever is the formation set first, the call mix second. Each called concept picks among the formations that fit
it. The library has no flexed-TE 11 or 12 option for most concepts, so no call mix can reach the NFL's share. Once the
variants exist, the existing call-mix weights (CALL_MIX) can be pointed at NFL formation frequencies by personnel.

## What it changes on the field

- **Run fits and box counts:**
  - An attached TE is a seventh gap the defense must fit, plus an edge blocker for the run.
  - A wing or close TE still threatens the edge and the C gap, but from off the ball he can arc, kick out or release.
  - A detached TE takes the run blocker out of the box, so the box count falls by one and our run game sees lighter
    boxes, as the NFL's does from 11 with the TE flexed.
  - Run-fit rules key the formation's surface (`FRONT_ALIGN`, the wing rule), so the change carries through without
    new defense code. Defense should re-check the edge-width rows (Flex's wide-9 vs wing) after it.
- **Coverage counts:**
  - A detached TE is a #2 or #3 receiver: it moves 2x1 / 3x1 counts, the defense's nickel-versus-base checks and the
    coverage card's motion rules.
  - In man, a LB or safety now carries a TE in space instead of an attached blocker.
  - This touches every coverage row keyed to receiver distribution, which is the main reason to card it on its own.
- **The pass game:** the flexed TE releases from 2-point and wider, so his start is faster (the start chart's TE-flexed
  row) and his routes change families.

## Proposal

As a playbook decision for the user, standard first:
1. Add the flexed and detached TE variants above to the formation set: about six formations, the same slots and
   concepts.
2. Point the call mix at the NFL's formation frequencies by personnel (BDB 2025: by personnel group and receiver
   alignment).
3. Card it on its own: run fits, coverage counts and the pass game all move.

13 personnel and new route packages for the TE are later scheme options.

**Also for the run-game queue:** the single back under center and in the pistol. Ours stand 7.3-7.5 yd deep and
exactly behind the ball; the NFL's stand 6.7 yd deep, offset up to 2 yd.
