# Pursuit effort read (TKL-2, Move 3): evidence

Status: **draft, not for merge.** The read works as designed and fixes P002,
but on matched plays it does not lower yardage, and on top of #273 it raises
it. By the plan's stop rule the move should re-diagnose the arrival (gather
and approach), not ship more effort.

## What changed

`chase` no longer picks effort from distance (`dist > 12` → `0.75 + 0.2 ×
workRate`). `pursuitEffort` (`src/sim/behaviors/common.ts`) asks, from the
pursuer's own pictures only:

- **Can I still get there?** A full-effort `interceptPoint` on his forecast of
  the runner, over the time the runner needs to reach the goal line (3–8 s).
- **Am I needed?** Unblocked, standing teammates whose pictures intercept the
  same path strictly earlier. The last chance, or one of the two best placed,
  sprints; everyone else paces at the existing `0.75 + 0.2 × workRate`.
- **Hysteresis:** a committed sprint holds until two teammates are better
  placed or no feasible intercept has existed for 0.3 s. The intercept is
  planned on the chosen budget in the same tick (`runnerForecast` is shared
  with `pursuitPoint`, so the forecast is computed once).
- The read is in the command trace as `effortRead` on the `chase` record.

Assumed from the plan's open calls (Tanner hadn't answered): sprint when he can
get there and is needed (last man, or one of the two best placed), pace
otherwise. The read horizon (runner's time to the goal line) is my addition:
the 3 s chase horizon makes nearly every breakaway look hopeless.

## Step 0: the YAC rise from 7.0 to 7.9

Matched isolated pass plays (`scripts/diag/yac-grid.ts`: the paired-plays grid,
every coverage × 3 rosters × 2 formations × 15 concepts × flip, a quarter of
it, 1,974 plays, 1,130 completions), same setups on each commit:

| Commit | Plays identical to previous | Matched YAC |
| --- | --- | --- |
| ccdb69c | | 8.369 |
| 0293f70 (#252) | 1974 / 1974 | 8.369 |
| a8c0455 (#251) | 1971 / 1974 | 8.370 |
| 30a1f49 (after #258, #259, #263) | 1974 / 1974 | 8.370 |
| 50b8006 (#267) | 865 / 1974 | 8.368 (±0.12) |
| 211db9c | 1974 / 1974 | 8.368 |

No merge moves YAC on matched plays. #267 changes 56% of plays but not their
mean (YAC ≥ 20 went 92 → 98). Fresh PR-tier scorecards (seeds 9, 10) on
ccdb69c vs 211db9c: 6.40 → 8.01 and 7.43 → 6.97. The rise is not reproduced
by any pursuit mechanism; it looks like game-level variance (one long play
moves a 12-game card by ~0.3) plus #252's lineup changes, which matched single
plays can't test. Nothing here belongs to Coverage's Move 4.

## Matched games

Every scrimmage play of 4 games per seed (seeds 7 and 8, game 1 is the audit
game) run twice from the same constructor inputs: legacy distance rule vs the
read. 1,085 plays on develop, 1,111 on #273 (734e70e). "Rally" is a variant
where everyone within 12 yd keeps full effort and the read only governs far
pursuers (so it only adds sprints).

| Base | Variant | Δ yd/play | Δ YAC/catch | Δ run yd | TDs | 20+ that reach 40 |
| --- | --- | --- | --- | --- | --- | --- |
| develop | read | −0.20 ± 0.19 | +0.05 ± 0.27 | −0.52 ± 0.45 | 73 → 67 | 31/94 → 30/90 |
| develop | rally | +0.09 ± 0.15 | +0.32 ± 0.32 | +0.06 ± 0.30 | 73 → 74 | 31/94 → 33/99 |
| #273 | read | **+0.64 ± 0.26** | +0.62 ± 0.43 | +1.35 ± 0.64 | 107 → 124 | 60/145 → 72/153 |
| #273 | rally | +0.30 ± 0.19 | +0.64 ± 0.34 | +0.32 ± 0.45 | 107 → 114 | 60/145 → 66/145 |

Isolated pass grid vs 211db9c: read +0.53 ± 0.20 YAC, rally +0.51 ± 0.17
(coverage variants repeat plays, so these SEs are optimistic).

- **P002** (seed 7 play 2, Comebacks): develop 72.9-yd TD → 25.2-yd tackle; on
  #273, 32.4 → 25.2. The FS commits to a sprint at 3.45 s instead of pacing to
  4.20 s and reaches the runner.
- **Tackle-reach thread's 42 "never inside the envelope" snaps** (on #273):
  634.7 → 634.4 yd (rally 631.3). The read doesn't reach them. Its witness
  (s8 P070 SS) is in `man`, not `chase`; his command drops from 7.5 to 3.8
  yd/s at 1.1 yd outside the envelope, so the gather-side slowdown is real but
  sits outside this read.
- **How often they sprint:** 19% of chase reads (9 of 796 plays above half);
  rally 54%. The "sprints on nearly every play" failure doesn't happen.
- **Fatigue:** mean defender energy at play end moves less than 0.001 in every
  arm. The read moves effort around (near pursuers pace more, far ones sprint
  more) rather than adding it, and per-play energy can't show late-drive cost.
  This is the stop rule's second failure: the price never shows up.

## Why more effort doesn't help

Speed fraction of unengaged defenders more than 6 yd from a carrier past
5 yd (profile vmax denominator): legacy 0.523, read 0.514, rally 0.526 on
develop. An upper-bound arm with **every** pursuer at full effort, on #273's
8 matched games, raised it only to 0.573 (legacy 0.544) and still added yards:
+0.33 ± 0.22 yd/play, +0.46 ± 0.39 YAC, TDs 107 → 117. So no effort rule can
fix this: more effort makes pursuers arrive sooner, not finish.

On 10 breakaways (develop), 43% of far defender ticks had no feasible
intercept even at full effort (running 0.81 of vmax, already at their pace
ceiling); 38% were feasible but behind two teammates and ran 0.43 of vmax,
well under any effort cap, because they were already in the approach and
gather. This matches #205's revised cause: the request isn't what makes
pursuers slow. A faster arrival can also make things worse: on the grid play
`cover3_match|7|gun_trips_11|slant_flat` the FS arrives at 8.5 yd/s instead of
7.4, wraps, and the runner breaks it for a 71-yd TD instead of a 12-yd gain.

## Recommendation

Hold the effort read. Next in Move 3: the arrival. A pursuer behind or beside
a fast runner shouldn't brake to an arrival speed he can't use (the tackle-reach
thread's P070), and the chosen intercept shouldn't jump (the plan's M step). Then
re-test effort on top, since the read is only useful once arrivals convert.

Cost: one seed-7 game takes 43–45 s vs 41 s on develop (about +8%, inside the 10% guardrail; the games differ).

## Reproduce

Matched games and the 42 snaps need a temporary toggle patch (never commit it):
`/mnt/project-files/pursuit-effort/` has the patch (on #273), `restage-effort.ts`,
`snaps-effort.mts`, `an2.py`, and the grid compare.

```sh
node --import tsx scripts/diag/yac-grid.ts out/grid.0.jsonl 1 0/8   # repeat with 4/8; same on each commit
```

## Arrival diagnosis and an intercept lifetime (also held)

On #273, 512 episodes where a free defender came within 2 yd of the
envelope of a non-QB runner moving faster than 4 yd/s (seeds 7/8 game 1,
`convert.mts` in project files): 58% finished, by him or a teammate within
0.6 s. Among failures, an aim-point jump of more than 3 yd in one tick
appears in 55% (successes 16%); braking below his and the runner's speed while short and
the runner pulls away, 14% (3%); outrun from behind, mostly DL, 64; missed or
broken wraps, 34.

Jump anatomy (seeds 7/8): the earliest-feasible sample flipping across the
feasibility edge (556 of 1,388 jumps), the least-late fallback flipping on a
flat lateness (the DT that alternates between 0.3 s and 3.0 s ahead), and
small heading changes times a 2–3 s straight-line lead.

Lifetime tried: chase keeps its chosen runner-path time until the picture
turns more than 20° or changes speed by 1.5 yd/s, the held point is 0.15 s
late, or a feasible point is 0.3 s earlier. Result:

| Base | Δ yd/play | Δ YAC | TDs | Finish rate (512 episodes) | Jump share, failed / succeeded |
| --- | --- | --- | --- | --- | --- |
| develop | +0.11 ± 0.18 | −0.02 ± 0.16 | 73 → 72 | | |
| #273 | +0.45 ± 0.23 | +0.52 ± 0.39 | 107 → 115 | 0.58 → 0.52 | 0.55/0.16 → 0.55/0.13 |

It doesn't remove jumps: most remaining ones happen while the time is held,
because a few degrees of heading in the delayed picture move a 2–3 s
straight-line lead by several yards. The lever is the forecast itself (how far
ahead a pursuer commits on a straight extrapolation), which needs the plan's
frozen case set before any change.
