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

**Sources re-verified (20:05 UTC, before any run).** 118 quotes, each checked verbatim (scratchpad pages8,
quotes8.tsv; 0 misses).
- **Mable.** "the safety is dropping down to the passing strength"; "Strong Corner – Bail to deep third. Man on all #1
  vertical"; "Strong Apex – Man on #2 except when #2 goes under"; "Weak Corner – MEG: Man Everywhere he Goes" (Soran,
  Throw Deep, Saban's pass coverages [BLOG]).
- **Solo.** "the DS is reading the departure of #3. If the WR goes vertical, the DS will take him man-to-man"; "the
  boundary CB (BC) is left to handle the single-WR by himself" (Cody Alexander, MatchQuarters [CLINIC]).
- **Banjo.** "the outside defender will take the first [receiver] to release outside or the second receiver to go
  inside, and the inside defender will take the first receiver inside or the second outside" (Breakdown Sports [BLOG]).
- **Bunch against man.** Press the point and In/Out the other two, with the risk that the press defender "can easily be
  picked or rubbed off the LOS" (Waugh, ULM co-DC, Coaches Insider [CLINIC]).
- **Man against mesh (cells 5, 5a, 5b).** "cornerbacks can be taught to always get over the mesh, while safeties and
  linebackers can always be taught to stay under" (Waugh). The taught defender sees the crossers and chooses over or
  under; the prediction from the code is that he does neither.
- **Conflicts:** Skate means the safety rotating weak (Soran) or the star inside #1 (USA Football, "skinny"); Special is
  Stubbie in most sources and Solo-like in one. Neither cell here depends on them.

A cell whose prediction does not appear goes to its owner through Integration, as a named missing mechanism:
- traffic in man and the banjo: Coverage;
- the trips checks: Coverage;
- the corner's #2 read: Coverage;
- the seen motion response: QB lane / Flex.

## Results (20:30 UTC; nothing above edited)

**Setup:**
- 12 seeds per cell, `HOLD=2.6`: no throw before 2.6 s, so the coverage is measured to then. The read is not under test
  here.
- Old controller. The cells run as listed in out/matrix/cells.txt.
- Cell 1 runs with `NOCHECK=1`. Cover 1 carries a structure check to cover1_banjo against bunch (coverages.ts:81), so
  "plain man against bunch" exists only with the check removed. Without NOCHECK, cells 1 and 2 were the same play.
- Summary: docs/reviews/data/2026-11-24-call-matrix/summary.txt (`scripts/diag/calls/matrix_agg.py`).

| # | prediction | result | verdict |
|---|---|---|---|
| 1 | Bunch against press man: traffic frees #2/#3 | #2's separation at 1.5 s beat spread trips in 0 of 12 paired seeds (#3: 9 of 12). The defenders on #1 and #2 had others within 1.2 yd (11 and 9 of 12), but their path was only 0.09-0.14 yd longer. A delay over 0.5 yd in 3 of 24. | **Does not appear.** The bodies are there; they do not obstruct. |
| 2 | Banjo removes cell 1's traffic | The banjo exchange is in the roles (CB_S zone on the first out). #2's separation was 1.06 against 0.83 in plain man. | Inconclusive: cell 1 had no advantage to remove. |
| 3 | The trips check (Mable) isolates X | 12 of 12: only CB_W within 5 yd at 2.0 s, the nearest safety 22 yd away. The same in plain Cover 3, 12 of 12. Mable's difference is CB_W in man (X's separation 2.6 yd) against a zone third (3.2). | **Appears.** X is alone against Cover 3 too, which the teaching does not dispute: Cover 3's corner has his third. |
| 4 | Four verticals against Cover 2: a #2 seam ≥ 3 yd at 2.5 s | 12 of 12 (Cover 3: 5 of 12). The #1 go was also ≥ 3 yd in 12 of 12. The hook defenders carried S2, the corners squatted, and the safeties sat about 10 yd from #1. | **Appears.** The stretch shows on #1 as well. |
| 5 | Mesh against press man: the crossers' defenders are slowed | The crossers never meet: their closest point is 3.2 yd p50 (1.0 against zone). No crosser's defender was delayed (0 of 24). S2/W2 separation at 2.0 s: 2.3 / 0.8 against 4.5 / 2.1 against zone. | **Does not appear,** for two reasons below. |
| 5a/5b | 0.4 / 1.2 yd crossing gap | MESH_GAP moved the under route's depth, but the closest point stayed 2.6 / 3.3 yd: timing, not depth, keeps them apart against man. | **Could not be staged** until the crossers' timing is fixed. |
| 6 | Fade-flat against Cover 2: the corner squats on #2's flat; the fade opens | The fade is open (S1 > 2 yd at 2.0 s in 12 of 12, about 6 yd p50), but CB_S was nearest S2 in 0 of 12: he stays nearest #1 and loses him. The flat is > 2 yd open in 6 of 12. | **Outcome appears, mechanism does not:** the corner does not read #2. |

**Missing mechanisms, by owner (through Integration):**
1. **Coverage: no man defender is ever obstructed by an offensive body** (cells 1 and 5). The reviewer's §3B is
   confirmed: defenders pass within 1.2 yd of other receivers with no extra path. There is no over or under the
   traffic either; the teaching is "cornerbacks can be taught to always get over the mesh, while safeties and
   linebackers can always be taught to stay under" (Waugh).
2. **Coverage: the Cover 2 corner does not take the first man to the flat** (cell 6), the reviewer's §3A. He stays on
   #1 and the fade still opens behind him, so the outcome looks right for the wrong reason.
3. **Rules + Coaching (mine): mesh's crossers do not meet against press man** (cell 5). Against zone their closest
   point is 1.0 yd; against press man 3.2 yd. One crosser is delayed at the line and the other runs on, so there is no
   mesh point. The taught mesh has both crossers aim at the same landmark and time to it (Win With The Pass, Black41).
   This blocks cells 5, 5a and 5b until it is fixed. Next: why, on a few plays (the jam on the H?), then a fix of the
   crossers' timing to the mesh landmark.
4. **Deferred cells** (splits, motion), unchanged.
