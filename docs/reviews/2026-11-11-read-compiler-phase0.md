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
- **The checkdown is ready at 2.3 s at −3 yd.** *Corrected in the addendum:* the swing's 3.05 s came from this
  compiler, not the engine. The declared-route rule required a back to cross the line of scrimmage. With that
  removed, the swing is ready at 1.8 s.
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
on a strong route. In half of the 2x2 plays (32 of 64; 76 of 320 plays overall) this gives "one look strong, then the whole weak side, then
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

---

# Addendum: HonestNFL as the second comparison arm (2026-11-11)

Integration asked for this with Tanner: the coached reads in
[the HonestNFL library](../references/honest-nfl/README.md), set beside the compiler's candidates.

**How it was collected.** Every sheet was read:

- the 20 sheets in `text/quarterback-process`;
- the 99 sheets in `text/pass-concepts`.

Each read was extracted in our own words: where the eyes start, the order, the key defender, alerts and hots.
Each was then matched to our 32 concepts. This follows the library's rules
([`nfl-playbook-sources.md`](../references/nfl-playbook-sources.md)): paraphrase only, and no images reproduced.

The scans and transcriptions duplicate some sheets. Counting each once (124/144, 294/328, 142/361, 177/235,
224/297, 205/322, 366/374) leaves **95 sheets with a read and 187 reads**.

A few readings carry uncertainty:

- Some route names are inferred across sheets: Pirate is a short in-breaking stop, Basic a deeper in, Bingo a dig.
- Several diagram-only reads in the late-numbered pass-concept sheets are thin.

So this is a check on the read grammar. It is a small, selected sample, not a measure of how often the NFL uses
each read.

## Read families the sheets use

| Family | Reads (deduplicated) | Examples |
|---|---|---|
| Defender key (high-low or stretch on one defender) | 51 | 135 corner collapse; 294 smash, levels and dagger; 306 Mike read; 224 stick off the apex; 295 slant-flat off the apex |
| Alert, then progression | 34 | 141; 307 sail (yes/no on the go, then sail/flat); 133 drive (post and corner alerts); 298 PA (post alert vs quarters) |
| Pure progression | 30 | 140 (five reads in a fixed order); 043; 107 post/cross → shallow → back |
| Triangle | 25 | 123, 340; the Tampa family (036, 044–049, 160–164): corner → arrow → flat |
| Half-field / either-or pair | 11 | 045, 046, 076 (corner or return/read); 182 (front side of a split-field call) |
| Other | 36 | See below |

The "other" reads break down as:

- either/or-then-reset;
- read direction (top-down, inside-out, outside-in, bottom-up);
- timing to leverage;
- deep horizontal stretch;
- diamond;
- coverage-dictated;
- best-look side.

**What this says about the grammar.**

1. **Our four styles cover the bulk.** Pure, alert, key and half-field are all used.
2. **Many reads called "pure" are a key in disguise.** They open with an either/or on two routes read off one
   defender, then reset down a fixed order (043, 107, 133, 205). Our key candidate already continues into the
   pure order after the key, so the grammar can express them.
3. **Three things in the sheets have no counterpart in ours:**
   - a **triangle as a read** (we detect the triangle motif but generate no plan from it);
   - **read direction as a coached choice** (we hard-code a top-down preference);
   - **coverage-dictated reads**, where the pre-snap shell picks which read is run (110, 112, 326). Those belong
     to Phase 2's conditional nodes.

## Finding 1: the deep-first concepts

The compiler's valid key candidate for each concept, beside what the sheets teach. The compiler candidates are the
unflipped 2x2 and 3x1 plays; "cue → X" means "throw X if the key does Y".

| Concept | What the sheets teach | Compiler's key candidate | Agree? |
|---|---|---|---|
| smash | **135, 294/328, 311.** Key the cloud or outside corner (the flat defender under the corner). Top-down: corner if he squats, short route if he sinks. 135 decides it during the drop. | **3x1:** playside curl-flat, cue → S2 corner, else S1 hitch. **2x2:** the strong-side smash pair is **not detected**. | **3x1: same defender, same order.** 2x2 misses because of the corner route (route item 1 below): it runs about 15° outward, not its drawn 40°, so the corner never gets over #1 (8.1 yd apart at its ready, beyond the 8-yd lane). |
| corner_flat | **10 sheets** (Tampa family 036, 044–049, 160, 161, 164; 326). Top-down corner → arrow → flat, or corner vs flat off the flat defender (161; 111, cloud corner). | Playside curl-flat, cue → S1 corner, else S2 flat, in both formations. | **Yes.** |
| sail_corner | **329 (exact):** top-down corner → out, keying the curl-flat apex or cloud corner. **326:** outside-in either/or. | "Hook", cue → S1 corner, else S2 quick out. | **Order agrees; role wrong.** We name the role from where the low route is when ready (inside 9 yd → hook). It should come from where the low route goes: an out-breaker stretches the curl-flat defender. |
| fade_flat | **111:** stretch the cloud corner vertically. **294/328:** a different set of routes: key the deep-half safety between two deep routes. | Playside curl-flat, cue → S1 fade, else S2 flat. | **Agrees with the cloud-corner version.** We don't run the two-deep version. |
| dagger | **294/328:** clear the half safety with the inside vertical, throw the dig into the void beneath him; a third route anchors the underneath. Key the half safety. | 2x2: playside-apex horizontal stretch, S1 dig vs S2 seam. 3x1: apex or hook. | **No.** Wrong defender and wrong motif. We have no "clear-and-void" motif: a vertical that takes a deep defender away, with an in-breaker arriving under where he was. |
| levels | **294/328:** weak apex, top-down Basic then Pirate (apex gains depth → Pirate; hangs → Basic). **311, 150, 160, 164:** inside-out off the apex, Will or midpoint. | 2x2: "hook", cue → S1 dig, else S2 short in. 3x1: curl-flat or apex. | **Order agrees.** The role label differs (hook vs apex): we name roles by width, the sheets by the defender's zone. Mapping one to the other needs the coverage, which is Phase 2. |
| flood (for comparison) | **307 (exact):** yes/no on the go, then sail/flat top-down off the flat defender. **111, 327:** key the curl-flat. **035:** key the deep defender first. | 3x1: playside curl-flat, cue → S2 out, else S3 flat. Alert on the isolated go. | **Yes** (alert plus key). |
| PA shots (pa_post_dig, pa_shot) | **298:** post alert vs quarters, then dig vs stop either/or off the hook. **154:** seam alerts, then stop → dig → back. **042:** take the out off the play-fake plant if free. | Alert on the deep route, then the pure order. | **Family agrees.** No sheet matches pa_shot exactly. |

**Verdict.** On smash (3x1), corner_flat, flood, fade_flat (cloud), levels and sail_corner, the sheets and the
compiler agree on the **order**: top-down, the high route if the key squats, the low if he sinks. On four of them
they also agree on the **defender**; sail_corner's role is misnamed. So the grammar is right and the style prior
is what keeps these plans from being chosen. Three repairs come first:

1. **Name the role from the low route's direction.** Out-breaking → curl-flat or flat defender; in-breaking → hook.
2. **Add a clear-and-void motif** for dagger.
3. **Fix the corner route** (route item 1), so the smash pair exists in 2x2.

**A structural rule that selects a keyed plan.** No per-concept tag is involved. Choose the defender-key plan
when, on the side the read starts:

- there is a vertical high-low on one defender;
- the low route is ready within one beat of the QB being set (≤ set + 0.4 s);
- the high route is a breaking route (not a clear-out, not a straight vertical);
- the high route declares at least 0.5 s after the low;
- the two are live together for at least 0.4 s.

In words: by rhythm the QB would throw the low route before the high one had declared, so only a key on the
defender between them keeps the high route an option.

Applied to this audit (fires / 10 plays):

| Concept | Fires |
|---|---|
| levels | 10 |
| sail_corner | 10 |
| corner_flat | 8 |
| curl_flat | 8 |
| mesh | 8 |
| smash | 4 (the 2x2 misses, from the corner route) |
| pa_flood | 4 |
| flood, dagger, slant_flat, pa_post_dig | 2 each |
| every quick concept except slant_flat (stick, quick_outs, hitches, trips_stick, double_slants and the rest) | **0** |

A curl-flat key is the textbook curl-flat read, so curl_flat firing is right. Mesh firing (a corner over a shallow)
is questionable: the sheets read mesh as a triangle over the ball (205, 039).

**fade_flat is the open case.** Dropping the "not a clear-out" condition makes fade_flat fire (8/10), but it also
makes stick (6/10) and quick_outs (8/10) fire. The geometry alone cannot tell a fade that answers a squatting
cloud corner from a go that only clears. That depends on the coverage, so it belongs to Phase 2.

## Finding 2: the primary route in quick game

What the sheets teach:

- **slant_flat and double_slants (295):** an either/or off the apex. Slant-flat reads outside-in; double slants
  reads inside-out.
- **stick (224, 143):** outside-in off the strong apex, the out first, then the stick.
- **quick_outs (142, 191, 361):** "throw on time to leverage", starting on the flat route.

In every case the primary is **the route that breaks against the stretched defender**. A route that settles
(hitch, hook, sit, drag) is the reset after the either/or, not the start.

I tested three candidate rules against the hand-written first read on the 110 quick-game plays:

| Rule | First read agrees |
|---|---|
| The compiler as is | 62 / 110 |
| Primary = the route in the most motifs | 39 / 110 (worse) |
| Outside-in on the start side | 62 / 110 (no change) |
| **Within one beat on the start side, prefer a route that breaks over one that settles** | **82 / 110** |

The last rule raises agreement over all 320 plays from 110 to 124. In this test the "settles" flag was stood in
for by route family (hitch, hook, stick, curl, checkdown). `features.ts` already computes it from the
trajectory, as speed at the end below 1.5 yd/s, so the rule needs no names.

The remaining disagreements are mostly double_slants: the hand order starts on the inside slant and the sheet
reads inside-out, while we start on the outside slant.

## Finding 3: field-hopping in 2x2

Half the 2x2 plans (32 of 64; 76 of 320 overall) leave a side and come back.

What the sheets say about crossing the field:

- **A progression is numbered by side.** The front side is read through, and the backside is a separate set of
  numbers (036).
- **The backside comes after the front side, as the last fallback**, not as a mid-read hop. 035: "the final
  fallback is the backside concept, not the checkdown on the same side". 037: sail → flat → backside dig. 107:
  post/cross → shallow → back.
- **The QB starts on the backside only as an alert.** It is a yes/no on a pre-planned look, decided before the
  snap or at the top of the drop, and "taken only by look" (141, 340, 224, 298, 362 "vs shell go backside").
- **A half-field read picks the side before the snap** from the shell, the matchup or the count (110, 112).

**The rule as a hard structural constraint.** A plan reads its start side through in order, then the other side,
then the outlet. A read on the other side may come before the start side is finished only as the alert: a yes/no
check, timed no later than the QB's set.

Reordering the current plans this way leaves first-read agreement unchanged (110) and first-two agreement at
52 (was 54). The constraint fixes the shape of the read, not which route comes first; Finding 2 is what changes
the first read.

## Route-engine items

These are separate from the compiler, one line each:

1. **The corner rounds rather than cuts.** It is drawn at 40° (11 → 24 yd deep, 11 yd out; `routes.ts:48`), but
   in the 0.5 s after its break the slot corner gains 3.1 yd downfield and only 0.9 yd outward, about 15°. This is
   a real execution problem, and it is why the 2x2 smash pair is not found.
2. **The post is drawn as a 30° bend from 12 yd** (`routes.ts:47`: 16 yd across over 28 yd deep). It runs as
   drawn. The break detector's 30° threshold misses it, which doesn't change any plan here. Whether 30° is the
   right post is a drawing question to check against film.
3. **Swing outlet at 3.05 s: withdrawn.** That was this compiler's operator: the declared-route rule required a
   back to cross the line of scrimmage. Fixed in `features.ts`; the swing is now ready at 1.8 s (wheel 1.8, angle
   1.95). Not a route problem.
4. **Mirrored routes differ by a few hundredths of a second between flips.** That is enough to tip near-ties, so
   the compiler averages both flips. Small, but real.

The QB_RHYTHM comment (`qb.ts:80`) was corrected in ff6f954e, already on develop.
