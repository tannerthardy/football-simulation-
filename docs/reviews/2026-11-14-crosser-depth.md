# Crosser depth: mix or drift (diagnosis, 2026-11-14)

Report for Integration and Coverage. This is the routes and call-mix side of CUT_WALL (#743): Coverage found our
crossers 1-4 yd deeper than the NFL's against zone. No engine change here.

**Answer.** The gap is mostly drift inside the shallow class, from the route's points; the mix is a small part.

- Our shallow is installed on a diagonal: a 2.5 yd stem 2 yd inside, then climbing to 5 yd across 22 yd. It is
  still climbing at 3.0 s, at 4.5 yd mean (4.8 median), against the NFL's about 3. It also moves across slower:
  3.0 vs 5.1 yd from its spot at 2.0 s.
- The deep `cross` stems straight up to 6 yd before it crosses. So it is shallower than the NFL's mid-depth crossers
  at each time, and much slower across (1.2 vs 3.6 yd at 2.0 s).
- The mix (our deep share) adds about 0.1 yd.

## The table

`scripts/diag/eyes/crosser-class.py`, one operator on both sides:

- **NFL:** BDB 2025 weeks 1-6, routeRan CROSS by WRs and TEs. Backs, who cross behind the line, are left out.
- **Sim:** develop 3c2f968d, seeds 101/105/109/113 x 4 games, route ids `shallow`, `shallow_high`, `cross`.
- **Filter:** against zone, non-designed, non-PA dropbacks, ball still held.
- **Class** by depth at 2.0 s: shallow under 4 yd, mid 4-8, deep 8+.

Medians, yd past the line (depth) and from the snap spot (across), at 2.0 / 2.5 / 3.0 s:

| | NFL share | NFL depth | NFL across 2.0 / 3.0 | sim share | sim depth | sim across 2.0 / 3.0 |
|---|---|---|---|---|---|---|
| all crossers | | 3.5 / 4.5 / 5.2 | 4.5 / 9.7 | | 3.9 / 5.2 / 6.6 | 2.2 / 5.8 |
| shallow class | 55% | 2.2 / 2.9 / 3.1 | 5.1 / 11.3 | 50% | 3.3 / 4.5 / 4.8 | 3.0 / 8.9 |
| mid class | 39% | 5.7 / 8.3 / 10.8 | 3.6 / 8.5 | 50% | 5.1 / 7.3 / 9.2 | 1.3 / 5.0 |
| deep class | 6% | 8.8 / 12.0 / 15.3 | 3.6 / 8.1 | 0% | | |
| our `shallow` (id) | | | | | 3.4 / 4.5 / 4.7 | 3.2 / 9.0 |
| our `shallow_high` | | | | | 3.9 / 5.2 / 6.0 | 3.0 / 7.0 |
| our `cross` | | | | | 5.1 / 7.3 / 9.2 | 1.2 / 4.5 |

The NFL pooled row reproduces Coverage's `crosser_depth.py` (3.5 / 4.4 / 5.4). Our pooled row here (develop
3c2f968d) is shallower than theirs (4.5 / 6.1 / 9.2 on engine-64); the class rows are the comparison.

**Mix against drift**, class means at 2.0 / 2.5 / 3.0 s:

- NFL shallow 1.5 / 2.2 / 2.3, sim 2.8 / 3.9 / 4.5: **+1.3 to +2.2 yd**, on half our crossers.
- NFL mid 5.7 / 8.0 / 10.0, sim 5.1 / 7.2 / 8.9: about **−0.6 to −1.1 yd**.
- The NFL's depths at our class shares move the pooled mean only +0.1 yd.

So the pooled gap, +0.45 to +0.57 yd on means, is the shallow running too deep, partly cancelled by the cross being
shallower. Every concept's shallow is the same route: mesh, hitch_cross, flood, drive and dagger all sit at 3.2-3.5
yd at 2.0 s and 4.1-4.7 at 3.0 s.

**Checked on plays** (the class is inferred from depth). Twelve NFL shallow-class crossers, read through 3.5 s
whatever the throw:

- WRs and TEs reach 2-3 yd near 2.0 s and run flat: Jones to Parker 2.5, 3.0, 3.1, 3.0; Lawrence to Kirk 1.5, 1.7,
  1.7, 1.5; Ryan to Pittman 2.9, 3.0, 2.6, 2.3. Some climb late: Ryan to Pittman 1.7, 2.4, 3.4, 4.8.
- It is not the throw cutting the route: at 3.0 s the held routes are at 3.0 yd and those thrown at 2.0-3.0 s at 3.5.
- Backs crossing behind the line made up 7% of the class; they are out of the table.

## Within class: does our shallow hold its depth? (Integration's question 2)

No: it climbs throughout, 1.6, 3.4, 4.5, 4.7 yd at 1.5 / 2.0 / 2.5 / 3.0 s. It is its route points:
`routes.ts:56`, `shallow: [{ d: 2.5, l: -2, s: 0.9 }, { d: 5, l: -24 }]`. That is a short stem, then a straight line
rising 2.5 yd over 22 yd across. So he is always rising, and his early lateral speed is low because the stem is nearly
vertical (2.5 deep for 2 across).

- `shallow_high` is the same shape to 6.5.
- `cross` is `[{ d: 6, l: -1 }, { d: 14, l: -16 }, { d: 18, l: -34 }]`: 6 yd straight up, then 8 yd of climb over 15
  across.

Not the cause, on these plays:
- no sit rule (the routes `continue`);
- no stem angle beyond the points;
- no traffic avoidance: every concept's shallow tracks the same curve;
- no bend from a trail defender: zone only, and the curve matches its points.

## The routes as taught (Integration's question 3)

- **Shallow / drag.** Sources put it "no deeper than three yards", in front of the linebackers (Bleacher Report, the
  crossing route), and at 1-3 yd (Youth Football Online). The Rams' and Air Raid shallow is 5-6 yd, "designed to be run
  at a depth of 5-6 yards" (Smart Football, St. Louis Rams shallow cross concepts), "about 5 yards ... behind the
  defensive linemen, but in front of (or through) the linebackers" (footballadvantage).

  The sources split by system. The NFL's shallow class sits at 2-3 yd. Both readings run it flat at its depth once he
  is there: "run under the linebackers, flat across".
- **Mesh.** The crossers meet at 4-6 yd. The Air Raid's Y sets the depth "to the toes of the linebackers" and X runs
  "just underneath the Y as tightly as they can" (footballplaycard; Holgorsen). One crosser at the mesh depth, the
  other just under him, both flat across.
- **Drive.** The shallow under a dig at 10-12 (Smart Football, "shallow cross, drag and drive"); the shallow pulls the
  linebackers.
- **Y-cross / deep over.** Not found with a depth in these sources. The NFL's mid class reaches 8 yd at 2.5 s and 11
  at 3.0, and the deep class 12 and 15. It needs a source before its points change.

## The defect, and the proposal (not built)

**Defect:** the shallow's route points. It climbs on a diagonal instead of reaching its depth and running flat, and
its near-vertical first leg slows its release across.

**Proposal** (`CROSS_FLAT`, off, built by Rules + Coaching): the crossers reach their depth in the first leg and run
flat.

- `shallow`: a flatter release, depth 2.5-3 yd by about 4 yd across, then flat. This is the NFL class and the "no
  deeper than three yards" teaching.
- `shallow_high`: mesh's top crosser, at the linebackers' toes (5-6 yd) and flat. Its partner `shallow` runs under him.
- `cross` is unchanged until the over's teaching is sourced. It is the one that is shallower and slower than the NFL's.

**Witness:** the same `crosser-class.py` rows by class and by concept, then Coverage's re-read of CUT_WALL on the
corrected crossers.

## Built: CROSS_FLAT (off), and its witnesses (2026-11-14)

The drag (`shallow`) releases flatter to 2.5 yd by 4.5 across, then runs flat. Mesh has its own pair, as Integration
ruled: `shallow_high` at the linebackers' toes and a new `mesh_under` a yard under him. `cross` is unchanged.

**Population.** Paired exports on the same code (rules/crosser-depth 9d2bc96d) and seeds: 201 and 205, 4 games each,
flag off and on. Plays re-roll after the first change, so the arms are unpaired, small cells.

**Class rows** (crosser-class.py, against zone, ball held), depth at 2.0 / 2.5 / 3.0 s and across at 2.0 / 3.0 s:

| | depth | across |
|---|---|---|
| shallow class, off | 3.5 / 4.5 / 4.9 | 2.9 / 7.8 |
| shallow class, on | **3.0 / 3.5 / 3.4** | **4.2 / 10.4** |
| shallow class, NFL | 2.2 / 2.9 / 3.1 | 5.1 / 11.3 |
| mid class, off | 5.4 / 7.6 / 9.7 | |
| mid class, on | 5.3 / 7.6 / 9.5 | |

- The mid class is unchanged, as intended.
- With the flag on, the drag in drive, flood, dagger and hitch_cross is flat at 3.1-3.4 yd by 3.0 s.
- Mesh in the games: `mesh_under` 3.5 / 4.6 / 4.8, `shallow_high` 4.5 / 5.9 / 6.6, about a yard and a half apart at
  2.5-3.0 s.

**Separation**, nearest defender p50 at 2.0 / 2.5 / 3.0 s, by class:

| | zone (NFL) | zone (off) | zone (on) | man (NFL) | man (off) | man (on) |
|---|---|---|---|---|---|---|
| shallow class | 3.7 / 3.9 / 3.6 | 3.2 / 3.5 / 2.9 | 3.6 / 3.4 / 3.9 | 2.1 / 2.0 / 1.9 | 2.2 / 2.0 / 1.0 | 1.5 / 1.9 / 2.6 |
| mid+ class | 3.0 / 3.1 / 3.3 | 2.2 / 2.0 / 1.9 | 1.9 / 1.7 / 1.8 | 1.6 / 1.4 / 1.6 | 0.9 / 0.9 / 0.7 | 1.0 / 0.9 / 0.6 |

The zone shallow-class sample is n 38 off and 52 on; man is n 13-18.

- The flat drag's zone separation reaches the NFL's at 3.0 s (3.9 vs 3.6), without any coverage change: under the
  hooks, he is off their line.
- The mid+ class (the unchanged deep cross) keeps its gap: 1.8-2.0 against 3.0-3.3 in zone, and about 0.6-1.0 against
  1.4-1.6 in man. That is the next crosser defect, and it is the over's, not the drag's.

**Targets, of 392 / 397 throws.** These are catches as recorded, small n.

- Shallow class: off 17 targets, 9 caught, 7.1 yd a target; on 18 targets, 13 caught, 4.5 yd a target.
- NFL shallow class: 27.7% of the routes run are targeted, 73% complete.
- Mid+: 5 targets per arm.

**The mesh rub in man:** 7 off, 4 on, too few to read; it needs a staged man set (mesh vs Cover 1, seeds 1-24).

**For Coverage:** CUT_WALL re-read on the corrected drag. On the zone shallow class, the gap it was built for is now
mostly gone at 3.0 s, so read the deep cross separately.
