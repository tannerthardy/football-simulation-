# QB_V2 decision scorecard: who the key is and what he did (2026-11-24)

Recorded by Integration from the outside reviewer's (Gemini) definitions, as an independent check on the QB lane's
scorecard classifier (`scripts/diag/qbv2/decision-card.ts`). This is a measurement operator: it reads true tracks and
is never an input to the passer. Every threshold below is a stated choice; check the labels by hand on about ten plays
a cell before trusting a table built on them.

## Frame and window

- depth = yards past the line of scrimmage; out = yards from the ball's lane toward the read side.
- t0 = the snap. The label is taken at t_eval = the release, capped at t0 + 0.85 s and no earlier than t0 + 0.45 s.

## Who the key is, fixed at the snap

1. **Corner:** the widest defender on the read side at depth −0.5 to 12 with out ≥ max(4, #1's out − 3.5).
2. **Apex (the Cover 3 flat key):** not the corner, not deeper than 8.5; depth 0 to 8.5 and out ≥ 3.5 (and no more
   than 3.5 inside #2 when there is a #2); the widest such man inside the corner. **If nobody qualifies, the key is
   none (vacated). Never fall back to a linebacker aligned inside 3.5 yd.**
3. **Hook:** depth 2.5 to 7.5, out −1 to 3.5, staying in the inside lane. Used only to detect a walled slant; never
   the flat key.
4. **A route's man (Cover 1 and 2-man only):** the defender within 3.5 yd of that receiver at t0 + 0.35 s who then
   stays within 2.5 yd, or moves with him (direction cosine above 0.6 within 4.5 yd).

Which one is the taught key: Cover 3, the apex (with the corner as the first check on quick outs). Cover 2, **the
corner** (he is the flat defender after the snap; the apex drops to the hook). Cover 1 and 2-man: no zone key; each
route's own man, by leverage.

## What the key did (first match wins)

| Label | Condition over [t0, t_eval] |
|---|---|
| blitzing | At or behind 0.5 yd depth, moved at least 1.5 yd toward the line, heading at the passer |
| widening | Moved out at least 2 yd (or 2.5 yd/s outward for 0.3 s); or within 1.5 yd inside the outside route and moving out at 1 yd/s |
| sinking (bailing, for a corner) | Gained at least 3 yd of depth (or 3.5 yd/s) without widening |
| sitting inside | Stays underneath, at least 0.5 yd inside the midpoint between the two routes' landmarks |
| sitting outside (squatting, for a corner) | Stays underneath, at least 0.5 yd outside that midpoint (a corner: depth ≤ 7, gained under 2.5) |
| sitting mid | Within 0.5 yd of the midpoint: either taught throw scores as valid |

Man coverage uses no zone labels. Each candidate route's man is: **open on the break** (trailing by more than 2.2 yd,
or on the wrong side of the break, or 5 yd or more off a hitch or out); **contested in phase** (within 2 yd on the
break side); or **rubbed or vacated** (more than 3 yd behind).

## The taught answer, by cell

| Concept | Cover 3 | Cover 2 | Cover 1 | 2-man |
|---|---|---|---|---|
| **Quick outs** | Corner bails and apex stays inside: the out. Apex widens into it: read 2. | Corner squats: refuse the out; read 2 (fade or hole shot when the plan has it). | #1's man inside or off: the out. Pressed or outside leverage: read 2. | As Cover 1; no fade into two deep safeties. |
| **Slant-flat** | Apex widens: slant. Sits inside or sinks: flat. Blitzes: the vacated window. Hook walls the slant while the apex widens: backside. | Corner squats the flat and the hook walls the slant: backside or checkdown. Corner bails: flat. | Whichever of slant and flat has the winning leverage; both contested: backside. | Slant's man is usually inside and tight: the flat if its man trails; else backside. |
| **Stick** | Apex widens with the flat: stick. Sits on the stick or sinks: flat. | Corner squats the flat: refuse the flat; the stick between corner and apex, or the hole shot, or backside. | Stick away from his man's leverage, or the flat if its man trails. | As Cover 1; no fade to #1. |

## Three checks on the lane's classifier

1. Count plays where it named a defender aligned inside 3.5 yd as the flat key. Under this definition there are none.
2. In Cover 2, confirm it reads the corner squatting the flat, not the apex dropping inside as "flat open".
3. Confirm Cover 1 and 2-man go to the man rubric: a defender following #2 to the flat must not score as "widening,
   so the slant".
