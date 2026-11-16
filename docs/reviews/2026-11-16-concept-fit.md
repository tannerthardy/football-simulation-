# CONCEPT_FIT: a concept is called only from a field it is drawn for (2026-11-16)

Rules + Coaching, on Integration's ruling: "a concept is installed from the formations it's drawn for". The flag is off.

## The fault
`choosePass` weighted every pool concept from every formation, and the motion was drawn before the concept and without
regard to it.

**Count.** At the snap, after motion, on PlaySim's own numbering: 8 league games, seeds 101-108, develop e90c204c
defaults. 116 of 718 concept calls (16%) came from a field without a receiver the concept's read names. (125 of 699 in
the first count, before four_verts' "two seams" fix below.)

**What a misfit compiles to.** Checked on `installedPlan`, each is another play:
- mesh from trips compiles to S1, S2, S3, W1: one crosser;
- trips_outs from 2x2 reads #2's out first, with no #3;
- verts_hitch from 2x2 has no #3 under the seam (the QB lane's failing cell);
- pa_shot from trips loses its weak dig, and the key falls to S2/S1.

**Motion.** It made a misfit fit on 32 calls and broke a fit on 33.

## The requirement, as data (`PassConcept.needs`)
`needs` lists the receivers the concept's read names. It is taken from the concept's `read` line where it has one, else
its coached key (read-compiler KEYS / ROLE_KEYS), else the structure its order is drawn on. An inner list means any one
of. A receiver the read does not name (a backside route) is not required: from trips it is simply not run.

| concept | needs | from |
|---|---|---|
| double_slants | S1 S2 S3 | read: "#1 slant ... #2 slant ... he drops: #3 flat" |
| fade_flat, hitch_post, double_outs, hitch_out, post_cross, sail_corner, corner_flat, seam_hitch | S1 S2 | read (a #1/#2 high-low) |
| seam_slant | S2 S3 | read: "#3 hitch ... #2 slant" |
| hitch_cross | S1 S2 W2 | read: "the weak shallow under him, then #1 hitch ... the cross past him" |
| trips_stick, trips_sail, trips_outs, verts_hitch | S2 S3 | read (#2 and #3 on one side) |
| smash, slant_flat, quick_outs, dagger, levels | S1 S2 | key low/high |
| stick | S2 S3 | key: the flat defender, #2 stick over #3 flat |
| drive, pa_shot | S2 W2 | key: the weak shallow (drive) or dig (pa_shot) under the strong route |
| pa_post_dig | S1 W1 | key low/high |
| mesh | S2 W2 | order: the two crossers |
| four_verts | S2, W2 or S3 | order: two seams (#2 and the other side's #2 from 2x2, #2 and #3 from trips) |
| flood, pa_flood, y_cross | S2 S3 | order: the strong side's levels (#2, then the #3 flat) |
| hitches, comebacks | S1 W1 | order: the two outside receivers |
| curl_flat | S1 S2 | order: curl, flat |

## The change (`CONCEPT_FIT`, off)
- **Prediction.** `src/game/concept-fit.ts` `fieldRefs` predicts the field at the snap the way the play builds it:
  - `alignOffense` with the play's context (the concept's room, down and distance, the team's style);
  - the called motion planned with the team's own bodies (`pickOffense`, `derivePhysical`);
  - then `realignOffense`.
  - A motion the planner would not run leaves the field as aligned.
- **The offer.** `choosePass` offers only the concepts whose `needs` the field has. Their weights are unchanged and
  renormalize by the draw: no CALL_MIX refit.
- **Order.** The motion is still drawn first.

A first version with nominal bodies and no alignment context mispredicted about 1 in 40 motion plays: the play's own
planner refused a crowded across motion, or set it on the other side of the count. With the play's context and bodies,
the misfit count is 0.

## Results (8 games, seeds 101-108, off -> on)
**Calls.** Misfits 116 of 718 -> **0 of 728**. Motion is what makes the concept available on 33 of 369 motion calls
(about 4.5% of concept calls).

**Concept shares** (of concept calls; the "on" games run their own course, so small cells move by noise too):
- **Down:**
  - verts_hitch 5.0 -> 1.6%
  - drive 2.4 -> 0.5%
  - y_cross 3.6 -> 1.9%
  - hitch_cross 3.1 -> 1.9%
  - trips_sail 2.2 -> 1.2%
  - stick 2.2 -> 1.2%
  - pa_flood 1.8 -> 0.8%
  - mesh 2.8 -> 1.9%
  - trips_outs 3.3 -> 2.6%
  - seam_slant 2.5 -> 1.8%
- **Up:**
  - levels 2.8 -> 6.2%
  - four_verts 3.2 -> 5.6%
  - hitch_post 3.3 -> 5.8%
  - curl_flat 2.5 -> 4.0%
  - double_outs 2.9 -> 4.1%
  - corner_flat, dagger, fade_flat, post_cross about +0.8 each

**Route class of the routes run:**

| class | off | on |
|---|---|---|
| breaking | 11.2% | 13.0% |
| cross | 5.8% | 4.4% |
| vertical | 35.8% | 34.4% |
| flat | 10.1% | 10.9% |
| quick | 37.1% | 37.3% |

**Structures at the snap:**

| structure | off | on |
|---|---|---|
| 3x1 with a back | 38.3% | 39.3% |
| 2x2 with a back | 37.9% | 37.6% |
| empty 3x2 | 18.2% | 18.1% |
| two backs | 4.6% | 4.7% |
| quads | 1.0% | 0.3% |

**The staged cells' concepts**, as the share of calls with a #3 on the strong side:

| concept | off | on |
|---|---|---|
| verts_hitch | 50% | 100% |
| flood | 55% | 100% |
| trips_outs | 58% | 100% |
| trips_sail | 69% | 100% |
| stick | 56% | 100% |
| y_cross | 81% | 100% |
| drive | 47% | 0% |
| mesh | 85% | 50% |
| dagger | 64% | 47% |
| smash | 57% | 69% |
| curl_flat | 39% | 52% |

The QB lane's staged cells (gun doubles only) therefore no longer stand for how these concepts are called: verts_hitch,
flood, trips_outs, trips_sail, stick and y_cross are now called only with a #3.

## Follow-ups (not built)
1. **The back as #3** (Integration: build straight after, as its own off flag). Stick, flood and pa_flood from 2x2,
   with the back to the flat as #3, are staples. Today CONCEPT_FIT takes them off the menu from 2x2.
   - Each is to be sourced before the back is given the route.
   - A back who is #3 in the route is not in the protection, and the call must say so (BACK_CHECK and the protection
     call).
   - Carded as CONCEPT_FIT alone and CONCEPT_FIT plus that flag.
2. **Motion chosen for the concept.** A real call picks the motion for the concept. Here the motion is drawn first and
   is uncorrelated with the concept, so motion makes the concept available on only 33 of 369 motion calls. This is
   noted, not built.
3. **Audibles.** The QB's pre-snap check (`preSnapCheck`) can change the concept at the line. It runs on the play's own
   menu and is outside this flag.
