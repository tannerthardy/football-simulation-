# CALL_COMPOSE step 2: the axes opened (2026-11-24, Rules + Coaching, flag off)

Design: docs/reviews/2026-11-24-call-composition.md §5, approved by the user on 2026-11-24. Step 1 (#900) holds the 32
concepts as compositions and compiles them to today's concepts exactly. This step changes what is called when the flag
is on, so Integration cards it.

## What changes with CALL_COMPOSE=1

1. **Base weights.** In `choosePass`, each composition's weight starts at its NFL share (among plays with room for it) relative to the pool mean,
   instead of 1 for every concept. Play action keeps 1, because its rate is the situation's (PA_CALL). The existing
   multipliers stay: family by down and distance, arm, the first read's talent, learned. CALL_MIX applies only its
   situational tilt (`CALL_MIX_TILT`), since its pool correction would double the base weights.
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

## Called share against NFL share (16 games, flag on)

Three double counts were found and removed, each with the same fix: a term on top of a base weight that already holds
the NFL's overall share must average 1.
1. **CALL_MIX's pool correction.** It was fitted on the equal-weight pool (breaking ×0.35-0.7, quick up to ×2.2), so it
   counted a second time on NFL-share base weights.
   - **Fix:** under CALL_COMPOSE only `CALL_MIX_TILT` applies: each class divided by its NFL-weighted geometric mean over
     the buckets.
   - The first smoke had fade-flat at 10.7% of passes, against 4.7% NFL.
2. **Formation availability.**
   - **Fix:** base weights use each half's core share among the plays whose formation has room for it
     (`core_share_given_room`, operator 375557142).
3. **The caller's situation and talent terms.** Each is divided by its mean (`COMPOSE_NORM`, src/game/call-mix.ts):
   - quick-family terms: mean 0.83 over the NFL's down-and-distance mix;
   - dropback terms: mean 1.42;
   - the arm term: league mean of 0.5 + arm, 1.224, over 256 generated starting QBs;
   - comebacks' hurry-up term: our hurry share of 23%, with no NFL figure to hand.

   The terms' sizes themselves are the caller's stated choices, not fitted: quick ×2.2 on third and short and ×0.6 on
   long yardage, dropback ×1.6 on long yardage, `0.5 + arm`, comebacks ×2 in the hurry-up. With the flag off, every
   term is as before.

**The run:** 16 games, seeds 501-516 in 4 processes of 4 games, `npm run ref` with CALL_COMPOSE=1, out/dbg/compose-table.mts.
- 1,408 pass calls, without screens.
- 953 non-PA composed calls in the table. The NFL share is renormalised over the same non-PA pool.
- With 10-100 calls per row, a ratio is good to about ±25%.

| composition | NFL share (of the non-PA pool) | called share | called / NFL | base weight | back in: expected / called |
|---|---|---|---|---|---|
| drive | 13.3% | 8.0% (76) | 0.60 | 3.85 | 0% / 0% |
| fade_flat | 9.2% | 11.3% (108) | 1.23 | 2.67 | 6% / 4% |
| curl_flat | 7.4% | 10.5% (100) | 1.42 | 2.14 | 7% / 5% |
| slant_flat | 6.6% | 9.0% (86) | 1.36 | 1.93 | 14% / 22% |
| stick | 6.5% | 8.4% (80) | 1.28 | 1.90 | 0% / 0% |
| verts_hitch | 6.4% | 4.1% (39) | 0.64 | 1.86 | 23% / 10% |
| mesh | 6.3% | 3.3% (31) | 0.51 | 1.84 | 16% / 13% |
| double_slants | 5.8% | 2.9% (28) | 0.50 | 1.70 | 22% / 25% |
| hitches | 4.1% | 4.8% (46) | 1.17 | 1.19 | 21% / 26% |
| smash | 3.8% | 4.3% (41) | 1.13 | 1.10 | 18% / 17% |
| corner_flat | 3.5% | 3.5% (33) | 0.98 | 1.03 | 15% / 12% |
| hitch_post | 3.1% | 3.7% (35) | 1.17 | 0.91 | 24% / 26% |
| quick_outs | 3.0% | 3.9% (37) | 1.30 | 0.87 | 32% / 43% |
| dagger | 2.6% | 3.1% (30) | 1.19 | 0.77 | 18% / 17% |
| sail_corner | 2.5% | 3.4% (32) | 1.32 | 0.74 | 30% / 28% |
| seam_hitch | 2.0% | 2.1% (20) | 1.04 | 0.59 | 24% / 20% |
| y_cross | 1.7% | 1.3% (12) | 0.72 | 0.51 | 0% / 0% |
| four_verts | 1.7% | 2.0% (19) | 1.15 | 0.50 | 0% / 0% |
| double_outs | 1.7% | 2.1% (20) | 1.24 | 0.49 | 31% / 35% |
| comebacks | 1.5% | 1.5% (14) | 0.96 | 0.45 | 26% / 36% |
| flood | 1.1% | 1.5% (14) | 1.30 | 0.33 | 11% / 0% |
| trips_stick | 1.0% | 0.8% (8) | 0.83 | 0.29 | 0% / 0% |
| levels | 0.9% | 1.6% (15) | 1.69 | 0.27 | 17% / 33% |
| hitch_out | 0.9% | 0.6% (6) | 0.67 | 0.27 | 11% / 0% |
| post_cross | 0.8% | 0.9% (9) | 1.25 | 0.22 | 100% / 100% |
| seam_slant | 0.7% | 0.4% (4) | 0.58 | 0.21 | 7% / 0% |
| trips_sail | 0.7% | 0.7% (7) | 1.02 | 0.21 | 14% / 0% |
| hitch_cross | 0.3% | 0.0% (0) | 0.00 | 0.10 | 0% / - |
| trips_outs | 0.3% | 0.3% (3) | 0.95 | 0.10 | 33% / 33% |

**Reading it:**
- Nothing is called at 2× its NFL share. Before the term normalisation, four_verts was 1.88× (now 1.15×), comebacks
  1.71× (0.96×) and corner_flat 1.66× (0.98×).
- **Above 1.4×:**
  - curl_flat 1.42× (100 calls);
  - levels 1.69×, on 15 calls, inside the noise.
- **Below 0.65×:**
  - drive (0.60×) and mesh (0.51×) were low in both runs. They are full-field concepts that need two receivers on each
    side; their NFL share is unconditional, while CONCEPT_FIT offers them only from 2x2 and wider. That is the same
    availability effect as the halves had, the other way round. The fix, if wanted, is the halves' fix for full-field
    concepts: their share among plays with room for them.
  - double_slants (0.50×), whose half has a #3.
  - The trips concepts are now near their share. The rest of their shortfall is formation frequency (Flex).
- **Back in:** non-PA composed calls expected from the axes 14.0%, called 14.3%; all pass calls 17.3%. The NFL's back protects on about 12-23%, by family.

### After the full-field room fix (operator a5736c1e9; the same 16 games' seeds)

Full-field concepts now also take their share among the plays with room for them:
- mesh, drive and hitch-cross: two receivers on each side;
- Y-cross: three to a side;
- post-cross: two to a side;
- four verticals: four receivers.

| composition | NFL share (of the non-PA pool) | called share | called / NFL | base weight | back in: expected / called |
|---|---|---|---|---|---|
| drive | 21.5% | 12.8% (122) | 0.59 | 6.23 | 0% / 0% |
| mesh | 10.3% | 6.5% (62) | 0.63 | 2.98 | 16% / 23% |
| fade_flat | 7.6% | 10.1% (96) | 1.32 | 2.21 | 6% / 7% |
| curl_flat | 6.1% | 7.1% (68) | 1.16 | 1.78 | 7% / 3% |
| slant_flat | 5.5% | 8.3% (79) | 1.50 | 1.60 | 14% / 30% |
| stick | 5.4% | 6.9% (66) | 1.27 | 1.58 | 0% / 0% |
| verts_hitch | 5.3% | 4.1% (39) | 0.77 | 1.54 | 23% / 21% |
| double_slants | 4.9% | 4.0% (38) | 0.82 | 1.41 | 22% / 34% |
| hitches | 3.4% | 6.2% (59) | 1.81 | 0.99 | 21% / 17% |
| smash | 3.2% | 3.9% (37) | 1.23 | 0.92 | 18% / 11% |
| corner_flat | 2.9% | 3.9% (37) | 1.32 | 0.85 | 15% / 5% |
| y_cross | 2.6% | 1.9% (18) | 0.73 | 0.75 | 0% / 0% |
| hitch_post | 2.6% | 2.5% (24) | 0.97 | 0.75 | 24% / 46% |
| quick_outs | 2.5% | 3.5% (33) | 1.39 | 0.72 | 32% / 33% |
| dagger | 2.2% | 2.4% (23) | 1.10 | 0.64 | 18% / 17% |
| sail_corner | 2.1% | 2.4% (23) | 1.14 | 0.61 | 30% / 30% |
| seam_hitch | 1.7% | 1.9% (18) | 1.12 | 0.49 | 24% / 17% |
| four_verts | 1.5% | 1.7% (16) | 1.08 | 0.45 | 0% / 0% |
| double_outs | 1.4% | 2.0% (19) | 1.42 | 0.41 | 31% / 32% |
| comebacks | 1.3% | 2.0% (19) | 1.56 | 0.37 | 26% / 26% |
| flood | 0.9% | 1.0% (10) | 1.12 | 0.27 | 11% / 0% |
| trips_stick | 0.8% | 0.1% (1) | 0.12 | 0.24 | 0% / 0% |
| levels | 0.8% | 1.4% (13) | 1.76 | 0.22 | 17% / 38% |
| hitch_out | 0.8% | 1.3% (12) | 1.62 | 0.22 | 11% / 0% |
| post_cross | 0.6% | 0.7% (7) | 1.14 | 0.19 | 100% / 100% |
| seam_slant | 0.6% | 0.6% (6) | 1.05 | 0.17 | 7% / 17% |
| trips_sail | 0.6% | 0.6% (6) | 1.05 | 0.17 | 14% / 17% |
| hitch_cross | 0.5% | 0.2% (2) | 0.41 | 0.15 | 0% / 0% |
| trips_outs | 0.3% | 0.2% (2) | 0.76 | 0.08 | 33% / 0% |

**Reading it:**
- **Drive and mesh:** called more (drive 8.0% → 12.8% of the pool), but their ratio stays about 0.6. Their NFL share also
  rose, and the census rule for full-field concepts is loose: drive is any shallow and any dig on the play, so it
  overlaps mesh. That is a limit of the operator, not a weight to raise.
- **Run-to-run variation:** hitches is 1.81× here, against 1.17-1.25 in the two earlier runs, so a ratio's run-to-run
  spread is wider than ±25%.
- **Small rows:** levels (1.76×) and hitch_out (1.62×) are on 12-13 calls.
- Nothing well sampled is at 2×.
- **Back in:** non-PA composed calls expected from the axes 13.5%, called 15.2%; all pass calls 17.7%.

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
