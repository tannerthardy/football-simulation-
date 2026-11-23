# Simplification arms: one flag-set list (Coverage C14, 2026-11-23)

For Integration to card after the builds. Nothing is removed here. Each arm is a switch to an existing flag, or a
proposed env flag or harness override; none of the proposed ones exists yet. The source and the verdicts are in
`beyond-standard.md`.

**How to run each arm.**
- Use wide-census (`scripts/diag/coverage/wide-census.mts`) and Tools' open census, on the same seeds.
- Split wide-open by coverage family × structure tag (trips, bunch, stack, empty, close_23) and by path label.
- Add yards per throw.
- Add PLAN's scorecard tier when an arm is a merge candidate.

| # | arm | env / harness | what it switches | verdict | what to watch |
|---|---|---|---|---|---|
| 1 | flat-corner merge | `SQUAT_SINK=1` (built; this branch) | FLAT_SINK, FLAT_CARRY and SQUAT_TOPDOWN's sink_corner / cloud_corner become one zone-seat rule | merge (see F10) | Cover 2/6 10-15 yd window; flat throws |
| 2 | style per call | `STD_STYLE=1` (proposed) | plain cover2 / cover3 / cover3_trips play one pinned style (spot), instead of matchRate's per-snap coin flip; cover2_match / cover3_match stay match | remove the coin flip | Cover 2 / Cover 3 wide-open by path; CURL_SINK and CURL_FLAT_BACK only run in match, so check the Sky curl-flat |
| 3 | deterministic shell | `STD_SHELL=1` (proposed) | no random shown-shell pool: two-high trees and `look: 'two-high'` calls show quarters; honest two-high calls; no closed-to-open | remove the random pool | the QB's shell-read errors; P8 / P4 rotation-late rows |
| 4 | checkPick | delete (no flag) | dead: checkPrefer always decides the one two-option check | remove | identical trace on a fixed seed (no change expected) |
| 5 | in-game adaptation | `LEARN=0` (proposed; harness) | `learned()` family re-weighting and trips-check swap | remove from the standard engine; defer as a management feature | family mix drift; noise in controlled comparisons |
| 6 | one-staff variants | `STD_CALLS=1` (proposed) | drops the structure checks to cover6_area, cover6_book, cover9_strap / clue / grab, cover3_clue and cover2_wild; rolex weight 0 in VARIANTS | defer all eight as scheme options | P9 / P10 / P1n on trips, bunch, empty, close_23; Cover 9 vs bunch / empty has no fallback |
| 7 | Screw | `SCREW=0` (existing) | the quarters safety's man on #2 up / out on a run read | defer (a game-plan call in its source) | play-action #1 / #2 deep vs quarters |
| 8 | Book trap | `MUSH_TRAP=0` (existing) | the Book nickel's trap of #3 out / flat | defer (goes with Book) | trips / empty #3 flat |
| 9 | man lock on motion | `MOTION_LOCK=lock|switch` (proposed) | the per-snap 51-69% lock draw becomes a pre-set call | defer as a call option | P10 / P11 on motion plays vs man |
| 10 | per-coach man rate | `MAN_RATE=0.4` (proposed; harness) | coach manRate U(.25, .55) fixed | defer | family mix |
| 11 | Zeus | harness `coach.shadow = false` | Cover 8 / Stuff / Quads redirection | defer | WR1 targets vs two-high |
| 12 | trips check preference | harness: force `cover4_poach` | the system / down split between Stubbie, Trix and Book | keep Poach as standard; defer the split | trips wide-open by path |

The arms touch different seats, so they can run together as "standard engine = 1-12", with each arm alone as its
control.
