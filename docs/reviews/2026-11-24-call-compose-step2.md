# CALL_COMPOSE step 2: the axes opened (2026-11-24, Rules + Coaching, flag off)

Design: docs/reviews/2026-11-24-call-composition.md §5, approved by the user on 2026-11-24. Step 1 (#900) holds the 32
concepts as compositions and compiles them to today's concepts exactly. This step changes what is called when the flag
is on, so Integration cards it.

## What changes with CALL_COMPOSE=1

1. **Base weights.** In `choosePass`, each composition's weight starts at its NFL share relative to the pool mean,
   instead of 1 for every concept. Play action keeps 1, because its rate is the situation's (PA_CALL). The existing
   multipliers are unchanged: family by down and distance, arm, the first read's talent, learned, CALL_MIX.
2. **The open axes.** Once the concept is picked, each axis is drawn by NFL share on its own stream (`call-axes:n`).
   The axes are:
   - levels' two named versions (neither is the core);
   - the backside half, for the 23 half × half compositions;
   - the back's job;
   - mesh's W1 tag (go or corner).

   Play action, and the full-field concepts other than mesh, keep their authored call. An axis option under 3% of its
   axis is not offered.
3. **The variant** keeps its concept's id, so the id-keyed install tables still find it: the read compiler's keys,
   CONCEPT_FIT, learned weights, the plan cache (whose key includes the routes and back).
   - Its name records the setting, e.g. "Slant-Flat (backside Slant-Go, back check)".
   - Its old-controller progression follows the setting. A new backside half's read receivers replace the authored
     backside reads, and its clear-outs (go, seam) are not read. A back kept in is not read; a released back is read
     last.
   - Levels' coached key (the in under the dig) follows its routes when the outside receiver runs the short in.
4. **The call checks** (`dropFits`, `protectionFits`). A variant that fails falls back to the authored call.
   - **Drop:** a quick drop (quick, gun3) cannot lead with a planted break at 8 yd or deeper, and a five-step drop not
     at 18 or deeper.
   - **Protection:** five linemen, plus the back unless he free-releases (scat), plus a blocking tight end. Fewer than
     six in protection needs a hot route on each side that has receivers.
   - **Eligibility** (Flex's adapter, `src/game/call-eligibility.ts`, applied verbatim from Flex's patch as its own
     commit): the formation is legal (seven on the line, every ruling resolved), and every player the call hands a
     route is eligible at the snap after motion. CONCEPT_FIT at the call site still checks that each half's receivers
     are on the field.

   In 10,988 drawn variants, neither the drop check nor the protection check rejected one, because:
   - every released back in step 2 is a check-release;
   - the axes never change the front side's primary reads.

   The tests show each check binds on a constructed case: a quick drop leading with a dig; a scat back with no hot
   route; a covered receiver handed a route; six on the line.

## #896's five changes are settings

| #896 change | setting here (NFL share within the axis) |
|---|---|
| levels: outside receiver on the short in | strong version: outside short in 71%, outside deep in (today's) 29% |
| slant_flat: back check-releases | back: check 68%, angle 18%, in 14% |
| quick_outs: back runs the shoot | back: angle 33%, in 32%, back_flat 30%, check 6% |
| flood: backside slant | backside half: slant-go, among the NFL's pairings, beside the dig-shallow |
| mesh: backside #1 on the corner | tag: W1 go 80%, corner 20% |

#896 can be closed once this step is accepted.

## Smoke (4 games per arm, seeds 401-404, `npm run ref`, out/dbg/compose-smoke.mts)

The question: does the composed caller run cleanly, open the axes and break the mirroring? Both arms complete without
errors.

| | off | on |
|---|---|---|
| passes (no screens) | 273 | 318 |
| calls that are a variant | 0% | 77.7% |
| mirror concepts (slant-flat, speed outs, hitches, smash, curl-flat) with the same routes on both sides | 58 of 58 | 32 of 91 |
| back in protection | 18.7% | 16.7% |
| four verticals | 2.9% | 2.5% |
| most called | corner_flat 7.3, comebacks 6.2, hitch_post 5.9, slant_flat 5.1 | fade_flat 10.7, slant_flat 8.2, curl_flat 7.2, hitches 6.0 |

The four-verticals figure of 5.6% in the design note came from the #876 sim set (another stack). In these games it was
already 2.9% with the flag off, so its base weight (0.49) changes little here.

The first on run, before generic-pair cores were tightened in the operator (68c022818), had fade_flat at 14.7% and
seam_hitch at 13.3%. Seam-hitch's core had been the hitch-go pair, which every hitch-go side matches. Its NFL share is
now 0.6%, from its trips shape, and it is called 1.6%.

Fade-flat stays the most called: an NFL two-receiver side with a go over a flat is 4.7% of plays by these labels.

Calls are not outcomes. What the composed calls do to games is for the card.

## The shares

Operator: `scripts/diag/routes/call_shares.py` on rules/route-chart (#876), 2022 BDB, 7,207 non-PA dropbacks. Output:
`config/call-shares.json` (NFL and ours). The engine's copy is `src/playbook/calls/shares.ts`, which a test keeps equal
to the config.
- **Core share.** A half's core is the routes a coach names it by, on the receiver number it starts at: #1, or #2
  behind a clear-out (stick is #2's hitch and #3's flat). A trips half with an add-on #3 is named by its first two. A
  final flat may be the back's.
- **Full-field concepts** use the census's rules: mesh is a shallow on each side; drive a shallow and a dig; Y-cross a
  deep cross and a post.
- **Pairings and the back's job** are counted on plays with a half's core.

**Limits:**
- A play can count for several halves.
- Tagging uses labels and break depth only.
- Halves whose tag sequences are equal share a side (go-hook / go-hitch, hitch-go / hitch-seam).
- Many NFL backsides match none of our two-receiver halves ('unmatched', 32-72% by half). The backside axis is drawn
  only over the matched ones.

These are labelled defaults, a starting call sheet. Game outcomes are judged as usual, not by matching these shares.

### Axes by composition (shares within each axis, %)

| composition | base weight | strong version | backside half | back | tags |
|---|---|---|---|---|---|
| slant_flat | 2.04 | - | slant_flat 24, slant_go 22, quick_out_hitch 13, hitch_go 6, hitch_seam 6, slant_stick 5, slant_hitch 5, hitches 5, go_hook 4, go_hitch 4, smash 3, comeback_seam 3 | check 68, angle 18, in 14 | - |
| stick | 1.93 | - | slant_flat 35, curl_flat 14, go_hook 9, go_hitch 9, dig_shallow 7, hitches 7, slant_go 5, quick_out_hitch 5, slant_stick 4, slant_hitch 4, fade_flat 4 | check 96, angle 4 | - |
| quick_outs | 0.89 | - | quick_out_hitch 57, slant_flat 21, hitches 9, go_hook 7, go_hitch 7 | angle 33, in 32, back_flat 30, check 6 | - |
| hitches | 1.23 | - | hitches 62, slant_flat 11, quick_out_hitch 11, go_hook 6, go_hitch 6, fade_flat 4 | check 55, angle 23, in 21 | - |
| smash | 1.14 | - | levels_outside_short 18, slant_flat 12, smash 12, dig_shallow 12, levels_outside_deep 12, comeback_seam 6, curl_flat 6, hitch_go 6, hitch_seam 6, go_hook 4, go_hitch 4 | check 63, in 18, angle 11, back_out 8 | - |
| curl_flat | 2.26 | - | curl_flat 26, comeback_dig 15, levels_outside_short 10, dig_shallow 10, comeback_seam 8, hitch_go 7, hitch_seam 7, slant_go 6, fade_flat 4, go_hook 3, go_hitch 3 | check 84, angle 9, in 7 | - |
| mesh | 1.96 | - | - | swing 52, wheel 17, in 16, angle 11, back_out 4 | none 80, W1 corner 20 |
| four_verts | 0.53 | - | - | - | - |
| flood | 0.34 | - | slant_go 38, levels_outside_short 29, dig_shallow 19, curl_flat 10, fade_flat 5 | check 83, in 11, back_out 6 | - |
| dagger | 0.78 | - | curl_flat 32, slant_go 24, hitches 16, fade_flat 12, levels_outside_short 8, slant_flat 8 | check 46, angle 22, in 18, back_out 13 | - |
| drive | 4.10 | - | - | - | - |
| y_cross | 0.54 | - | - | - | - |
| levels | 0.28 | levels_outside_deep 29, levels_outside_short 71 | smash 67, quick_out_hitch 33 | check 62, in 17, back_out 10, angle 7, wheel 3 | - |
| comebacks | 0.46 | - | curl_flat 55, comeback_seam 18, fade_flat 9, slant_flat 9, quick_out_hitch 9 | angle 33, in 26, check 31, back_out 10 | - |
| pa_post_dig | 1.00 | - | - | - | - |
| pa_flood | 1.00 | - | - | - | - |
| pa_shot | 1.00 | - | - | - | - |
| double_slants | 1.74 | - | slant_flat 48, slant_stick 10, slant_hitch 10, smash 7, fade_flat 7, hitch_go 4, hitch_seam 4, slant_go 4, comeback_seam 4 | check 54, angle 24, in 22 | - |
| fade_flat | 2.82 | - | dig_shallow 20, fade_flat 15, slant_go 10, comeback_seam 10, levels_outside_short 10, curl_flat 8, hitches 8, comeback_dig 5, slant_flat 5, slant_stick 4, slant_hitch 4 | check 83, angle 11, in 6 | - |
| hitch_post | 0.93 | - | hitch_go 24, hitch_seam 24, smash 14, fade_flat 11, comeback_seam 9, go_hook 5, go_hitch 5, slant_go 5, hitch_out 5 | check 49, in 24, angle 18, back_out 9 | - |
| double_outs | 0.50 | - | levels_outside_deep 21, dig_shallow 21, levels_outside_short 10, hitch_out 10, slant_flat 10, fade_flat 5, slant_stick 5, slant_hitch 5, hitch_go 5, hitch_seam 5 | check 31, in 31, angle 29, back_out 8 | - |
| hitch_out | 0.28 | - | hitches 58, go_hook 12, go_hitch 12, slant_go 9, levels_outside_short 9 | angle 39, check 43, in 11, back_out 7 | - |
| seam_slant | 0.13 | - | slant_flat 78, fade_flat 13, go_hook 4, go_hitch 4 | check 86, in 7, angle 7 | - |
| hitch_cross | 0.10 | - | - | - | - |
| post_cross | 0.23 | - | - | - | - |
| sail_corner | 0.76 | - | smash 27, dig_shallow 20, levels_outside_deep 20, hitch_go 7, hitch_seam 7, slant_flat 7, go_hook 6, go_hitch 6 | check 42, in 30, angle 23, back_out 5 | - |
| corner_flat | 1.08 | - | dig_shallow 22, levels_outside_short 22, smash 22, go_hook 6, go_hitch 6, fade_flat 6, hitch_go 6, hitch_seam 6, hitch_out 6 | check 74, in 15, angle 8, back_out 4 | - |
| trips_stick | 0.30 | - | slant_flat 40, hitches 40, quick_out_hitch 20 | check 94, angle 6 | - |
| trips_sail | 0.13 | - | - | angle 29, back_out 21, in 14, wheel 14, check 21 | - |
| seam_hitch | 0.35 | - | hitch_go 29, hitch_seam 29, slant_flat 17, comeback_seam 8, curl_flat 8, slant_stick 4, slant_hitch 4 | angle 35, check 41, in 24 | - |
| trips_outs | 0.06 | - | - | check 67, in 33 | - |
| verts_hitch | 1.11 | - | curl_flat 27, slant_flat 22, hitch_go 20, hitch_seam 20, fade_flat 7, comeback_seam 4 | check 44, angle 23, in 23, back_out 5, wheel 4 | - |
