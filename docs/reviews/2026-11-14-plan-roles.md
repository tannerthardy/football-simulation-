# Coached read roles, and an audit of geometric read orders (2026-11-14)

Rules + Coaching, for Integration. Flag `PLAN_ROLES` (off).

## Why

On the route card's staged pairing (QB's `drop-staged.ts`, 2def5cd2, the same 3,072 plays an arm), ROUTE_EFFORT alone
took the ten concepts' interceptions from 20 to 36. The routes did not separate less: with the quarterback held, the
same receivers separate the same through their breaks in both arms (the out 1.0 / 1.1 / 1.6 / 2.1 yd at break, +0.3,
+0.6 and +1.0 s). What changed was the read order.

- In flood, trips_outs and trips_sail from doubles, the plan read the out (S2) first and then the clear-out go (S1).
  On full-pace stems it read the go first.
- The cause is the compiler's pure order. A same-side route more than 2 yd deeper is read first (+0.35 otherwise). The
  go is at 11.9 yd at its ready time on full-pace stems (11.6 on develop), so the gap went from 1.9 to 2.1 yd.
- The clear-out motif that should keep a clear-out off the early reads needs the vertical 12 yd or deeper at its ready
  time. At 11.6-11.9 it never fired, on either ground.
- So a 0.3 yd change in where the go was at his ready time rewrote the progression. The out was then thrown as a second
  read, 0.2 s later, at the sideline (35% completion), and that is where the picks were.

A coached read order is football, so it is declared, not derived from step thresholds. The geometric rule stays as the
fallback for a concept nothing declares.

## What changed

**The declared clear-outs (`compile.ts`, `CLEAR_OUTS`, by route so they hold in every formation):** in flood, trips_outs
and trips_sail, the go clears for the out.

**Source:** the flood is a three-level stretch to one side (deep, intermediate, flat). "The deep layer is usually the
outside receiver's vertical", and "the intermediate sideline route is the route many quarterbacks are taught to look for
first" (Youth Football Online, Flood Passing Concepts).

**The rule:** a declared clear-out enters the compiler as a `clearout` motif, so it is not an early read (+0.6 at
depths 0-1, as for a found one). It is also not read as the high of a high-low.

## Measured

Staged pairing on ROUTE_EFFORT, 192 plays a concept:

| concept | ref: picks, yd a play | ROUTE_EFFORT | ROUTE_EFFORT + PLAN_ROLES |
|---|---|---|---|
| flood | 2, 8.31 | 2, 7.70 | 0, 8.92 |
| trips_outs | 1, 6.46 | 8, 7.82 | 5, 6.80 (the rest are the out's extension, a separate item) |
| trips_sail | 0, 5.73 | 5, 9.10 | 1, 7.86 |

On develop's routes, the doubles plans of these three are unchanged: the out was already first.

## Audit: where every pool concept's order comes from, and how close the geometric ones sit to a threshold

The two grounds:
- develop: every route flag off;
- the stack: ROUTE_FILLET, ROUTE_EFFORT, ROUTE_END and SCREEN_DECLARE.

PLAN_ROLES is on in both. Compiler sample, five formation families.

"Margin" is coarse: the smallest abs(depth gap - 2 yd) over any same-side pair of routes at their ready times (the
high-low rule), and the smallest abs(depth - 12 yd) over the routes 8 yd or deeper (the clear-out / deep rule).

| concept | order from | formations whose installed plan differs, develop vs stack | min abs(gap - 2 yd), develop / stack | min abs(depth - 12 yd), develop / stack |
|---|---|---|---|---|
| comebacks | geometric | 3x1, bunch, 12p | 0.2 / 0.2 | 0.2 / 0.7 |
| corner_flat | key (PLAN_KEYS) | - | 0.7 / 0.3 | 0.4 / 0.1 |
| curl_flat | geometric | bunch, 12p | 1.6 / 0.0 | 1.5 / 1.7 |
| dagger | key (PLAN_KEYS) | 12p | 1.0 / 1.0 | 0.1 / 0.1 |
| double_outs | geometric | 2x2, 3x1 | 1.0 / 0.6 | 4.0 / none |
| double_slants | key (PLAN_KEYS) | - | 0.4 / 1.1 | 0.7 / 0.5 |
| drive | key (PLAN_KEYS) | 12p | 0.9 / 1.0 | 0.1 / 0.1 |
| fade_flat | key (PLAN_KEYS) | - | 0.6 / 0.2 | 0.2 / 0.1 |
| flood | clear-out role (PLAN_ROLES) | bunch | 0.1 / 0.3 | 0.1 / 0.1 |
| four_verts | geometric | empty | 1.4 / 1.4 | 0.1 / 0.1 |
| hitch_cross | geometric | 2x2, 12p | 0.0 / 0.4 | 0.7 / 0.5 |
| hitch_out | key (PLAN_KEYS) | 2x2 | 0.3 / 0.1 | 4.0 / none |
| hitch_post | geometric | - | 1.1 / 0.4 | 0.0 / 0.0 |
| hitches | geometric | - | 0.6 / 0.5 | none / none |
| levels | key (PLAN_KEYS) | - | 1.0 / 1.3 | 0.1 / 0.3 |
| mesh | install order | - | 0.5 / 0.9 | 0.7 / 0.1 |
| pa_flood | install order | empty | 1.4 / 1.4 | 0.1 / 0.1 |
| pa_post_dig | key (PLAN_KEYS) | - | 0.9 / 1.4 | 0.1 / 0.2 |
| pa_shot | geometric | 3x1, empty | 0.8 / 1.4 | 0.0 / 0.0 |
| post_cross | geometric | - | 0.7 / 1.5 | 0.1 / 0.2 |
| quick_outs | key (PLAN_KEYS) | - | 1.5 / 0.1 | 0.1 / 0.4 |
| sail_corner | geometric | 3x1, bunch, empty, 12p | 1.3 / 0.6 | 0.2 / 0.1 |
| seam_hitch | geometric | empty | 1.6 / 1.5 | 0.1 / 0.1 |
| seam_slant | geometric | bunch, 12p | 0.8 / 0.0 | 0.1 / 0.1 |
| slant_flat | key (PLAN_KEYS) | - | 0.7 / 0.7 | none / none |
| smash | key (PLAN_KEYS) | empty | 0.7 / 0.5 | 0.3 / 0.1 |
| stick | key (PLAN_KEYS) | - | 0.4 / 0.2 | 0.1 / 0.1 |
| trips_outs | clear-out role (PLAN_ROLES) | 12p | 0.1 / 0.3 | 0.1 / 0.1 |
| trips_sail | clear-out role (PLAN_ROLES) | bunch | 0.1 / 0.3 | 0.1 / 0.1 |
| trips_stick | geometric | bunch, 12p | 0.0 / 0.3 | 0.2 / 0.5 |
| verts_hitch | geometric | empty | 1.4 / 1.4 | 0.1 / 0.1 |
| y_cross | install order | - | 1.4 / 0.9 | 0.0 / 0.1 |

Geometric concepts within 1 yd of a threshold on either ground (14): comebacks, curl_flat, double_outs, four_verts, hitch_cross, hitch_post, hitches, pa_shot, post_cross, sail_corner, seam_hitch, seam_slant, trips_stick, verts_hitch.
Concepts whose installed plan differs in at least one formation (19): comebacks, curl_flat, dagger, double_outs, drive, flood, four_verts, hitch_cross, hitch_out, pa_flood, pa_shot, sail_corner, seam_hitch, seam_slant, smash, trips_outs, trips_sail, trips_stick, verts_hitch.

**Reading the table**
- **Flips in the declared concepts** are in formations where the declaration does not apply, or are late reads:
  - drive 12p: its key needs the W2 shallow, which 12p does not have;
  - dagger 12p;
  - trips_outs 12p: a triangle that reads the go top-down;
  - flood and trips_sail from bunch: the third and fourth reads swap;
  - hitch_out, smash and pa_flood: the last read only.
- **The keys are still by receiver number.** Declaring them by route, as CLEAR_OUTS now is, would make them hold in
  every formation, as the clear-outs do. That is a small follow-up.
- **The triangle style can still put a clear-out at its top** (trips_outs 12p). A declared clear-out should not be a
  triangle's first read either. Next attempt, if Integration wants it.
- **The 14 geometric concepts within a yard of a threshold** get their orders declared from their sources, which is the
  next step. Those whose installed plan flips between the grounds come first: comebacks, curl_flat, double_outs,
  hitch_cross, pa_shot, sail_corner, seam_slant and trips_stick, then the empty-formation verticals (four_verts,
  seam_hitch, verts_hitch).

## Follow-ups (Integration, 2026-11-14)

**Keys by route.** Under PLAN_ROLES, a coached key's two receivers are resolved by the routes the concept installs at
them (S1 is strong 1, W2 is weak 2, B is the back), preferring the same receiver, then the same side. So a key holds in
every formation that runs those routes. Where a formation does not install one of the routes (drive from trips has no
weak shallow), the key does not apply, and the plan is the compiler's.

**A declared clear-out is never read before the route he clears for.**
- He is left out of any triangle, which reads top-down and would put him first: trips_outs and trips_sail from trips
  and 12p, flood from 12p.
- In the pure order, reading him before that route costs +1.0 at any depth. The found clear-out's +0.6 applied only to
  the first two reads, so a back inserted second let the go come third, ahead of the out.

Installed plans with PLAN_ROLES, from doubles / trips / 12p / bunch:
- **trips_outs:** S2 (out) first in all four, the go after it.
- **trips_sail:** S2 first in all four.
- **flood:** S2 first from doubles, 12p and bunch. From trips it is the curl-flat key, unchanged.

On develop's routes, the doubles plans are unchanged.
