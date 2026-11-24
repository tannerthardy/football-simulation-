# Call-theory matrix: predictions, stated before the runs (2026-11-24, Rules + Coaching)

Design: docs/reviews/2026-11-24-call-theory.md §E, the design of record (#912). This file states each cell's prediction
before it is run. Results are added below each prediction without editing it.

**Setup:**
- Harness: develop d31271e42 merged with tools/qb-harness, plus the QB lane's stage patch (sha256 88784d0d…) and Rules'
  read plans (rules/read-plans). This is the QB lane's own build, so our cells are comparable.
- Operator: `scripts/diag/calls/matrix.ts`.
- 12 seeds per cell, roster 3, one mid-rated passer (as in stage.ts), the old controller. QB_V2 is noted where used.

**What the operator measures:**
- per receiver, by his number, his separation (yd to the nearest defender) at his break and at 1.0 / 1.5 / 2.0 / 2.5 s;
- per defender, whom he covered (the receiver nearest him for most of 0.5-2.0 s);
- per man defender, his traffic: the ticks in the first 1.5 s that another offensive player was within 1.2 yd of him,
  and his path's extra length over the straight line.

The operator reads the defense's call to say who was assigned to whom. No player reads it.

| # | cell | prediction (who comes open, and why) | control |
|---|---|---|---|
| 1 | trips_outs from **gun_bunch_11** vs **cover1** (press) | Bunch creates traffic in man. The point and #2's defenders show traffic (ticks > 0 in most seeds), and #2/#3's separation at 1.5 s is larger than from spread trips. | the same concept from gun_trips_11 vs cover1 |
| 2 | trips_outs from gun_bunch_11 vs **cover1_banjo** | The banjo exchanges the crossers. Traffic and #2/#3's separation fall against cell 1. | cell 1 |
| 3 | trips_stick from **gun_trips_11** vs **cover3_mable** | The trips check isolates X. At 2.0 s the only defender within 5 yd of W1 is the backside corner, with no safety within 10 yd of him. | gun_trips_11 vs cover3 (sky): the free safety in the middle |
| 4 | four_verts from **gun_doubles_11** vs **cover2** | Each half safety has two verticals. On at least one side, #2's seam is ≥ 3 yd from every defender at 2.5 s in most seeds. | four_verts vs cover3 |
| 5 | mesh from gun_doubles_11 vs **cover1** (press) | The crossers' man defenders are slowed at the mesh point: traffic ticks > 0 and extra path length > 0.5 yd in most seeds. S2/W2's separation at 2.0 s is larger than against zone. | mesh vs cover3 |
| 6 | fade_flat from gun_doubles_11 vs **cover2** | The corner reads #2 and squats on the flat. He covers S2 in most seeds, and S1's separation at 2.0 s exceeds 2 yd. | fade_flat vs cover3 (the corner sinks: S2 open) |
| 7 | tight vs wide splits, drive | Deferred: there is no split axis yet (§B1). | |
| 8 | motion vs man | Deferred: the harness sets no motion. This needs the motion call, and the QB lane's or Flex's seen-motion response. | |

## Added before the runs (19:58 UTC): the defense's check per cell, and the reviewer's pick cells

The outside reviewer's coverage audit (docs/reviews/2026-11-24-defense-outside-audit.md, #915, §2) gives the taught
checks. Its sources are being re-verified, and the predictions below rest on them only once checked. Our coverages
carry the checks as called variants: cover1_banjo, cover1_lurk_trips, cover3_mable, cover3_clue, cover9_clue.

| # | the defense's check, as taught |
|---|---|
| 1 | Cover 1 press against bunch, with no check: plain man. The point man's defender is the one picked. |
| 2 | Banjo: the outside defender takes the first man out, the inside defender the first in. The exchange shows in who covered whom (ours: the defender's covered receiver differs from his pre-snap man). |
| 3 | Mable against 3x1: the strong corner bails to his third; the apex is man on #2 unless #2 goes under; the weak corner is man on #1 (X); the safety drops to the passing strength. That is X one-on-one, no safety over him. |
| 4 | Cover 2 against 2x2: each half safety has #1 and #2 vertical in his half. |
| 5 | Cover 1 against mesh: no check (plain man). |
| 6 | Cover 2 corner: #1 climbs while #2 goes to the flat; the corner sits with outside leverage on the first man to the flat. |

**Cell 5a and 5b** (the reviewer's §3B, confirmed in code at spacing.ts:402: a man defender never sees an offensive
player in his path). Mesh vs cover1 press, with the crossers set to cross 0.4 yd apart (5a) and 1.2 yd apart (5b)
(`MESH_GAP`).

**Prediction from the code, which differs from the teaching:**
- At 0.4 yd, a man defender's torso overlaps the other crosser: a collision. Both lose speed, and the crosser he is not
  covering is slowed too.
- At 1.2 yd, he passes at full speed with no delay. Traffic ticks may be counted, but there is no extra path length.

**As taught:** a crosser 1.2 yd from a man defender's path still forces him over or under, so he loses a step. If 5b
shows no delay, the missing mechanism (the man defender seeing and avoiding an offensive body) goes to Coverage.

A cell whose prediction does not appear goes to its owner through Integration, as a named missing mechanism:
- traffic in man and the banjo: Coverage;
- the trips checks: Coverage;
- the corner's #2 read: Coverage;
- the seen motion response: QB lane / Flex.
