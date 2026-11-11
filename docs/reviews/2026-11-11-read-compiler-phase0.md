# Read-plan compiler, Phase 0: audit report (2026-11-11)

Design: [docs/research/2026-11-11-qb-read-compiler-design.md](../research/2026-11-11-qb-read-compiler-design.md) §21.
This is a diagnostic only. There is no behaviour change and `QBPass` is untouched. Nothing in the game calls
`src/playbook/read-compiler/`.

```sh
node --import tsx scripts/diag/qb-read-compiler.ts --json out/read-compiler/audit.json > out/read-compiler-audit.txt
npx vitest run test/read-compiler.test.ts
```

## What was built

| File | Role |
|---|---|
| `src/playbook/read-compiler/types.ts` | Route descriptor, motif, candidate, read step and compiled play |
| `features.ts` | Route features from the engine: real `PlaySim`, defenders parked out of play, QB frozen once set (§6) |
| `motifs.ts` | High-low, horizontal stretch, smash, levels, mesh, cross-post, flood, isolation, triangle, seams, clear-out and back outlet |
| `candidates.ts` | Pure progression (beam search), pre-snap alert, defender key, half-field; reasons for every rejection; coach profile (default `pure-leaning`) |
| `compile.ts` | Screens bypass. Both flips are sampled and the timing is averaged, so the plan is a property of the play, not the orientation. |
| `scripts/diag/qb-read-compiler.ts` | Full audit: routes and windows, motifs, candidates (accepted and rejected), chosen plan, hand-written progression |
| `test/read-compiler.test.ts` | §22 acceptance checks (below) |

`score.ts` from the illustrative list is folded into `candidates.ts`: the shared plan-quality score plus a coach
prior per style.

## Coverage (§21 counts)

The run covers 38 concepts: the 17 installed, CONCEPT_MENU's 15 and 6 screens. Each runs in 5 formation families
(2x2, 3x1, bunch, empty, 12 personnel wing) × 2 flips, for 380 compiles. It uses one representative team pair
(seeds 41/42, strength 0.6).

| Count | Result | Target |
|---|---|---|
| Legal non-screen plays with at least one plan | **320 / 320** | 100% |
| Plays with two or more valid plans | 310 / 320 | descriptive |
| Invalid defender keys chosen | 0 | 0 |
| Duplicate receivers in a plan | 0 | 0 |
| Non-route (blocking) targets | 0 | 0 |
| Chosen reads that expire before the QB reaches them | 0 | — |
| Screens bypassed (called target) | 60 / 60 | all |

Chosen style under the default profile: `pure` 130, `pure_with_alert` 190 (an alert on an isolated quick or
vertical route, then the same pure order). No `defender_key` or `half_field` plan is chosen under the pure-leaning
priors, although they are valid on most plays. Motif frequency, as a share of plays:

| Motif | Share of plays |
|---|---|
| isolation | 61% |
| back outlet | 60% |
| vertical high-low | 57% |
| horizontal stretch | 53% |
| triangle | 21% |
| clear-out | 15% |
| levels | 4% |
| seams | 3% |
| mesh | 2% |
| cross-post | 1% |

### Acceptance checks (`test/read-compiler.test.ts`, 7/7 pass)

| Check | How it is tested |
|---|---|
| Every ordinary concept gets a plan | All 32, from 2x2 and 3x1 |
| Mirroring mirrors the plan | Same receiver numbers, order, outlet and alert; 2x2/3x1/empty, every third concept |
| Reordering the input does not change the plan | Route-map key order reversed and hand progression reversed; separately, the routes array reversed at the candidate stage |
| A synthetic unnamed concept compiles | Out/post/slant and curl/arrow with a back angle and an empty `progression`: at least 3 reads |
| No blocking back or TE is a target or outlet | `teBlock` plus a back on `block` in `gun_wing_12` |
| Screens bypass | Every concept in `SCREEN_CONCEPTS` |
| Deterministic | The same play compiles to the same plan twice |

`npx tsc --noEmit` is clean. `npm test`: 420 files / 3,991 tests pass.

## Timing from our engine

Every window comes from the engine's own route runner and drop, not nominal numbers. Below are the means over all
samples, with where each looks off.

| Route | Break (s) | Ready (s) | Depth at ready (yd) |
|---|---|---|---|
| slant | 1.10 | 1.38 | 2.5 |
| quick_out | 1.61 | 1.75 | 4.3 |
| hitch | 1.69 | 1.80 | 4.5 |
| stick | 1.56 | 1.68 | 3.8 |
| shallow | 1.30 | 1.79 | 3.4 |
| out | 2.15 | 2.25 | 7.7 |
| curl | 2.56 | 2.66 | 10.3 |
| dig | 2.64 | 2.74 | 10.9 |
| corner | 2.55 | 2.68 | 11.0 |
| deep_out | 2.73 | 2.83 | 11.8 |
| comeback | 2.98 | 3.08 | 13.8 |
| go / seam / post | — | ~2.72 | ~11.7 |

The vertical routes are "ready" at 12 yd. QB set (dropped ≥1 yd, then stopped): 1.3 s at the quickest, mean 1.85 s,
2.3 s at the slowest. These are identical across formation families, so the drop sets them.

- **The hitch is close to the NFL.** Measured at the settle (the stop), it is about 5.8 yd at about 2.1 s on the
  3x1 sample; week 1 NFL tracking (`nfl_routes.py`) gives 5.6 yd / 2.20 s. This audit's detector fires earlier, where
  the deceleration begins (mean 1.69 s at about 4.5 yd), so the two operators are not the same. The window uses the
  earlier point, which is when the throw can be started.
- **The corner rounds, it does not cut.** It drifts about 0.7 yd in 0.3 s from about 12 yd. The break detector had
  to measure against the stem heading to see it at all, and 2 of 44 corners still register no break.
- **The post's break is not detected (0/58).** In the engine it is a 30° bend from 12 yd
  (`routes.ts:47`: `{d:12,l:0}` → `{d:40,l:-16}`), which sits exactly at the detector's 30° threshold. Its window
  therefore comes from the 12-yd vertical rule. That rule lands at the same time (about 2.7 s), so no plan changes,
  but a 30° post is flat for a coached post (often nearer 45°). This is worth a look on film before anyone builds
  on post timing.
- **The deep breaks come late against the drop.** Dig, curl and corner are ready at about 2.7 s. That is 0.85 s
  after a 1.85 s set, so they are third-rhythm (hitch-and-throw) reads, never the first look. This is the main
  reason the compiler disagrees with hand-written orders that start deep.
- **The checkdown is ready at 2.3 s at −3 yd, the swing at 3.05 s.** The swing is very late for a release meant
  as an outlet.
- **Mirrored routes run slightly differently.** Windows differ by a few hundredths between flips, enough to tip
  near-ties (4/160 plans before both flips were averaged). That is an engine asymmetry worth a small separate look,
  not a compiler property.
- **The window length is crude.** It is ready + 1.2 s for a route that settles, ready + 1.6 s otherwise. With
  defenders parked there is no coverage, so "last" is a planning bound, not an openness estimate. Settled routes
  (hitch, curl, stick) are where this is weakest, and it decides several of the disagreements below.

## Compiler versus hand-written progressions

Agreement among receivers present in the formation, over 320 plays:

| Agreement | Plays |
|---|---|
| First read | 110 |
| First two reads | 54 |
| First three reads | 26 |

Chosen pure order from 2x2 and 3x1 (unflipped), with the hand-written order:

| Concept | 2x2 compiler | 2x2 hand | 3x1 compiler | 3x1 hand | First read agrees |
|---|---|---|---|---|---|
| slant_flat | S1 S2 W1 W2 | S1 S2 W1 W2 | S3 S1 S2 W1 | S1 S2 W1 S3 | 8/10 |
| stick | S2 W1 W2 S1 | S2 W1 W2 B | S2 S3 S1 W1 | S2 S3 W1 B | 10/10 |
| quick_outs | S2 S1 W1 W2 | S1 W1 S2 W2 | S1 S2 S3 W1 | S1 W1 S2 | 8/10 |
| hitches | S2 S1 W1 W2 | S1 W1 S2 W2 B | S1 S2 S3 W1 | S1 W1 S2 B | 4/10 |
| smash | S1 S2 W1 W2 | S2 S1 W2 W1 B | S1 S3 W1 S2 | S2 S1 W1 B | 0/10 |
| curl_flat | S2 S1 W1 W2 | S1 S2 W1 W2 B | S1 S3 S2 W1 | S1 S2 W1 B | 4/10 |
| mesh | S2 W1 W2 S1 | S2 W2 S1 B | S1 S3 S2 W1 | S2 S1 B S3 | 6/10 |
| four_verts | S2 S1 W1 W2 | S2 W2 S1 W1 B | S3 S2 S1 W1 | S2 S1 W1 B | 6/10 |
| flood | S2 W1 W2 S1 | S2 S1 W1 B | S2 S3 S1 W1 | S2 S3 S1 W1 B | 6/10 |
| dagger | W1 W2 S1 S2 | S1 S2 W2 B | S3 S1 S2 W1 | S1 S2 B | 0/10 |
| drive | W1 W2 S1 S2 | W2 S2 B S1 | S3 S2 S1 W1 | S2 B S1 | 2/10 |
| y_cross | S2 W1 W2 S1 | S2 W1 B | S2 S3 S1 W1 | S2 S3 W1 B | 6/10 |
| levels | S2 W1 W2 S1 | S1 S2 W2 B | S3 S1 S2 W1 | S1 S2 B | 0/10 |
| comebacks | S2 S1 W1 W2 | S1 W1 S2 B | S3 S1 S2 W1 | S1 W1 S2 B | 0/10 |
| pa_post_dig | W1 W2 S1 | S1 W1 | S3 S1 S2 W1 | S1 W1 S2 | 2/10 |
| pa_flood | S1 W1 W2 S2 | S2 W1 B | S3 S2 S1 W1 | S2 W1 S3 B | 4/10 |
| pa_shot | W1 W2 S1 | S1 W1 | S3 S2 S1 W1 | S2 S1 W1 | 4/10 |
| double_slants | S1 S2 W1 W2 | S2 S1 W2 | S1 S2 S3 W1 | S2 S1 S3 | 2/10 |
| fade_flat | S2 W1 W2 S1 | S1 S2 W1 B | S3 S2 W1 S1 | S1 S2 S3 W1 B | 0/10 |
| hitch_post | S1 W1 W2 S2 | S2 S1 W2 B | S1 S3 S2 W1 | S2 S1 S3 B | 2/10 |
| double_outs | S2 W2 W1 S1 | S2 S1 W1 B | S3 S2 S1 W1 | S2 S1 S3 W1 B | 6/10 |
| hitch_out | S2 S1 W1 W2 | S2 S1 W1 B | S3 S1 S2 W1 | S2 S1 S3 W1 B | 6/10 |
| seam_slant | S2 W1 W2 S1 | S2 W1 S1 | S3 S2 W1 S1 | S2 W1 S3 S1 | 8/10 |
| hitch_cross | S1 S2 W1 W2 | S2 W2 S1 B | S1 S2 S3 W1 | S2 S1 S3 B | 2/10 |
| post_cross | S2 W1 W2 S1 | S1 S2 W2 | S2 S3 S1 W1 | S1 S2 S3 | 0/10 |
| sail_corner | S2 W1 W2 S1 | S1 S2 W1 B | S2 S3 S1 W1 | S1 S2 S3 W1 B | 2/10 |
| corner_flat | S2 W1 W2 S1 | S1 S2 W1 B | S3 S2 S1 W1 | S1 S2 S3 W1 B | 0/10 |
| trips_stick | S1 S2 W1 W2 | S2 S1 W1 B | S1 S2 S3 W1 | S3 S2 S1 W1 B | 0/10 |
| trips_sail | S2 W1 W2 S1 | S2 S1 W1 B | S3 W1 S1 S2 | S2 S3 S1 W1 B | 4/10 |
| seam_hitch | S1 W1 W2 S2 | S2 S1 W2 B | S3 S1 W1 S2 | S2 S1 S3 B | 0/10 |
| trips_outs | S2 W1 W2 S1 | S2 S1 W1 | S3 W1 S1 S2 | S2 S3 S1 W1 | 6/10 |
| verts_hitch | W1 W2 S1 S2 | S2 W2 S1 B | S3 S2 S1 W1 | S2 S3 S1 B | 2/10 |

The compiler's back is the separate outlet, never a numbered read, so the hand orders' trailing `B` does not count
against agreement.

### Which is right

There are three different kinds of disagreement.

**1. The hand-written order reads a deep route first, ahead of its rhythm. The compiler is right on timing, the hand
order on intent.**

These concepts are smash (S2 corner), dagger (S1 dig), levels, hitch_post, sail_corner, corner_flat, fade_flat,
post_cross, pa_post_dig and pa_shot. The hand order starts on a route that is not ready until about 2.7 s, while
the short answer under it is ready at about 1.8 s and would be read first in rhythm.

For a coached high-low (smash, corner-flat, sail), "read high to low" means the QB *looks at* the high defender
first and throws the high route only if he sinks out of it. The look comes first; the throw comes on the high
route's time. So the hand order is the right *intent*, but it is executed as a key read on the flat or curl
defender, not as a first look at an undeveloped route. The compiler finds these as `vertical_high_low` keys and
marks them valid, but the pure-leaning priors never choose them.

- **Verdict: the hand orders for smash, corner_flat, sail_corner and fade_flat are right as football. They are
  defender keys, and the pure order is the wrong representation for them.**
- **Dagger and levels:** the hand order (dig first) is right for a post-snap safety-rotation read. The compiler's
  weak-side or short start is a legal pure fallback, but not how the concept is taught.
- **pa_post_dig and pa_shot:** play action is a shot read, and the hand order is right. The compiler has no notion
  of a called shot.

This disagreement matters for execution today. The concept-menu report found fade_flat and corner_flat checked
down rather than run as keyed reads, so Phase 2 keys, not Phase 1 pure orders, would change that.

**2. The compiler reads the route that is open earliest, the hand order the route the concept is built around. Mixed;
usually the hand order is right.**

- **stick / trips_stick / double_slants / quick_outs / hitches.** In trips_stick the hand order starts on S3, the
  stick. In the engine S1 is ready about 0.1–0.2 s earlier, so the compiler starts outside. Quick game is built
  around one read: here the hand order is right, and a 0.1 s timing edge should not override the concept's primary.
  This argues for Phase 1 to take the hand-written first read as a coach tag where one exists, and to compile only
  the order after it.
- **hitches / quick_outs (2x2): S2 before S1.** The slot's hitch is ready a few hundredths earlier. Either is fine.
  The hand order reads outside-in, and the compiler's choice is a coin flip on our engine's timing.

**3. The compiler hops fields in 2x2 (S2 → W1 → W2 → S1). The hand order is right; this is a compiler weakness.**

With two receivers a side and one strong route late, the beam search pays two cross-field costs rather than wait
on a strong route. In about a third of the 2x2 plays this gives "one look strong, then the whole weak side, then
back". No coach teaches that. The cause is the cost model: a wait is priced per second, crossing at a flat 0.6,
and there is no notion of a half-field read finishing its side.

The half-field candidate exists and is valid on most of these plays, but its prior (−1.0) keeps it from being
chosen. I have not tuned this further: it is the second attempt at the cost weights. Per our two-attempts rule the
next step is re-diagnosis (§23 conditional nodes, or treating "finish the side" as a structural rule), not another
weight.

**Overall judgement.** The compiler is right about *when* each route can be thrown. That is useful as an audit:
the hand orders put several deep routes first that our engine cannot deliver until the third rhythm, and they
sometimes reach shallow routes after their window. The hand-written orders are right about *what the concept is
for* far more often than the pure compiler.

As it stands, I would not replace the hand-written `reads[]` with the compiled pure order (§22's Phase 1
experiment) without one of these two changes:

1. Keep the hand-written first read as a coach tag and compile the rest.
2. Choose keyed high-low plans where a concept is built on them.

That is a decision for Integration and Tanner.

## Repository claims verified

| Claim | Verified at |
|---|---|
| QB look at a receiver | `qbmind` `receiverLook` (line 419) |
| Route key pictures | `routeKeyPictures` (line 435) |
| y_cross progression `['S2','S3','W1','B']` | `concepts.ts` lines 68–70 |
| Play-caller uses `c.progression[0]` | line 497 |
| Ordinary concepts on develop | 17 |

**QB_RHYTHM mismatch:** the comment says "off; QB_RHYTHM=1 turns it on" (`qb.ts:80`), but the code is
`process.env.QB_RHYTHM !== '0'` (line 86), which is **on by default**. The comment is stale; nothing was changed
here.

## Limits of this phase

- There is one team pair and one drop per concept as installed. The design's "representative personnel" is not
  varied.
- Windows come from parked defenders. They say when a route has declared, not whether it is open.
- The motif confidences and the style priors are engine calibration, not NFL numbers.
- Defender-key cue times are checked against the windows only. Whether the QB can *see* the keyed defender (gaze,
  delay) is Phase 2 work.
- Nothing here has been run in games, and nothing should be until Integration decides on Phase 1.
