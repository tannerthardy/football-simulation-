# Route shapes from the timing chart: measured flags (2026-11-24)

Rules + Coaching, for Integration (to be carded with the QB lane's clock). This works through the chart's differences
(`docs/reviews/2026-11-24-route-timing-chart.md`) in Integration's order. Each flag is separable and off. Each was
measured with the chart's own operator (`scripts/diag/routes/route_chart.py`) against the same NFL rows.

**Runs:** 24 games per arm on develop engine-92 (`7b36c6e55`) via `npm run ref`, Tools' `sim_plays.mts --full --all`.
- Arm 1: CROSS_OVER, GO_STEM, FLAT_SHAPE and SLANT_LEAN together.
- Arm 2: HITCH_OPEN and SLANT_ANGLE together.

Each flag touches its own route family, so its rows are read from the arm it was in. Tables:
`docs/reviews/data/2026-11-24-route-timing/chart-shape-arm.md` and `chart-hitch-slant-arm.md`. No game outcomes are
claimed: these are route-shape measurements. The completion cost of HITCH_OPEN is from yesterday's HITCH_DEPTH arm.

## Results (default -> flag, NFL)

| item | flag | measure | default | flag | NFL | verdict |
|---|---|---|---|---|---|---|
| 1 hitch | HITCH_OPEN (new) | exit vs LOS after the plant (3-7.5 yd) | -2° | +31° | +33° | matches |
| | | drift +0.5..1.5 s | -0.8 | +0.1 | -0.1 yd | matches |
| | | turn at the plant | 96° | 61° | 43° | closer |
| | | time under 0.8 of entry speed | 1.7 | 1.4 | 1.0 s | closer |
| | | speed at the catch | 0.6 | 0.8 | 1.5 yd/s | closer |
| 2 cross | CROSS_OVER (existing, off) | width across at 1.5 / 2.0 / 3.0 s | 1.3 / 2.5 / 6.4 | 1.8 / 3.5 / 8.1 | 2.2 / 4.4 / 9.8 yd | closer |
| | | catch speed | 4.5 | 4.8 | 7.2 yd/s | gap remains (body) |
| 3 go | GO_STEM (new) | width outside at 2.0 / 2.5 / 3.0 s | 0.4 / 0.5 / 0.5 | 1.2 / 1.8 / 3.1 | 1.8 / 2.8 / 3.9 yd | close |
| 5 slant | SLANT_ANGLE (new) | exit vs LOS (<3 / 3-7.5 yd bands) | 49 / 48° | 40 / 38° | 36 / 34° | closer |
| | | speed +0.3 / +0.6 s (3-7.5) | 6.0 / 6.4 | 5.8 / 6.3 | 5.1 / 5.4 yd/s | unchanged |
| 5 slant | SLANT_LEAN (#858) | exit (3-7.5 band) | 48° | 9° | 34° | overshoots, superseded |
| 6 flat | FLAT_SHAPE (#870) | back flat width at 3.0 s | 10.3 | 13.5 | 7.2 yd | worse |
| | | WR/TE flat depth / width at 3.0 s | 3.1 / 10.4 | 3.3 / 11.2 | 1.0 / 7.8 | worse |
| | | bend | 52-59° | 59-66° | 31-32° | worse |

## Reading

1. **HITCH_OPEN** (the hitch plants at its stem depth and opens 1.4 yd inside, a little upfield): the exit and the drift
   are now the NFL's, against man as against zone. The NFL hitch doesn't come back against either: 530 man rows turn
   45° and exit +30°; ours turned 82-99° and came back 0.8 yd. Its after-plant speed is now above the NFL's (1.9 / 2.0 vs
   1.2 / 1.0 yd/s at +0.3 / +0.6 s), which is the settle's job.
   **It stays off until the QB clock lands:** without the come-back leg, hitch completion fell 70% -> 56%
   (HITCH_DEPTH, `docs/reviews/2026-11-23-stop-route-settle.md`). Our ball leaves 0.3 s after the plant against the NFL's
   0.1 s before. Curl and hook depths are left alone: the "curls 2 yd shallow" row is a band mix of our 8 yd hooks and
   11 yd curls under PFF's single HITCH label.
2. **CROSS_OVER** (built 2026-11-14, never carded) takes the cross most of the way across. What is left is speed after
   the bend. The crosser asks for 7.7-8.1 yd/s and accelerates toward it slowly (a staged y_cross TE: 5.3 -> 6.6 over
   2.5-3.5 s); TE crossers lag most (NFL TE 6.8 at 3.0 s, ours 5.9). That is body acceleration, Tools/physics.
3. **GO_STEM:**
   - the go releases outside and stems on to the outside, up to 4 yd from his split;
   - it keeps 5 yd of room to the sideline, or the room he started with;
   - it needed a new per-point field, `side`, read in `routePath`. The QB's forecast uses the same path.

   What's left: at 3.0 s ours is 0.8 yd short of the NFL's width. Our wide receivers also mostly align 10-14 yd from the
   sideline, where the NFL's mostly align 6-10; that is an alignment item, not this flag.
4. **Out and dig, no flag.** The stem pace matches: 6.2-6.5 yd/s 0.9 s before the break, both sides. Ours then brake
   from -0.6 s and stay slow: 5.0 vs 5.9 yd/s at the break and at +0.6 s, WR outs and digs at 7.5-12 yd. The exit angle
   already matches (21° vs 22°), so it is the corner law's through speed (ROUTE_FILLET's lateral authority and legs),
   Tools' area. The "deep digs shallow" row is our lack of a 14 yd dig variant; our 12 yd dig breaks at 10.3 yd against
   the NFL's 10.0.
5. **SLANT_ANGLE** (the same stem and break, then a 34° leg to 5.5 yd, easing to 24°) moves the exit two-thirds of the
   way. Our speed after the break stays 0.7-0.9 yd/s above the NFL's. SLANT_LEAN's flat-at-6-yd shape exited at 9° and
   stopped climbing (drift 0.4 vs 2.4 yd). It is reverted on this branch, and #858 is superseded by this measurement.
   The break-depth spread (ours 2.9-3.3, NFL 2.1-4.5) is ROUTE_VARY's (#863), which depends on the release-plan stack.
6. **FLAT_SHAPE (#870) should not be carded.** It was set against Tools' route_shape class (flats 6+ yd wide at 2.0 s),
   the fast tail. Across all flats it widens our already too-wide flats.
   - Back flats are 3.8 yd wide at 2.0 s and 7.2 at 3.0 s in the NFL; ours are 5.3 / 10.3 by default, and FLAT_SHAPE
     makes it 6.7 / 13.5.
   - The NFL back starts slower: 0.6 yd wide at 1.0 s against our 1.3-1.6. That is the protection scan, proposed in
     `docs/reviews/2026-11-23-release-pace.md`; the protection lane has no owner.
   - The bend is too sharp in every arm (52-66° vs 31°).
   - Kept for the flat's rebuild (#870 closed): its finish at the sideline margin (he stops in bounds, facing the
     quarterback, instead of climbing) is still taught and is worth keeping. The full-pace lateral run is what fails.

## The flat, second attempt (FLAT_LOOK, not kept)

Taught: the flat gets his width looking for the ball over the inside shoulder, and stops in bounds at the sideline.
FLAT_LOOK ran him turned to the QB from his release point on (flat, arrow, back_flat), so that the body's facing
caps would price the look, and finished the flat at the margin.

24 games, engine-92, WR/TE flats:

| measure | default | FLAT_LOOK | NFL |
|---|---|---|---|
| speed at 2.0 / 2.5 / 3.0 s (yd/s) | 5.5 / 6.1 / 6.0 | 5.7 / 6.1 / 5.7 | 4.8 / 5.2 / 5.3 |
| depth at 3.0 s (yd) | 3.2 | 3.3 | 1.0 |
| width at 3.0 s (yd) | 10.4 | 10.7 | 7.8 |

Only the finish changed: speed at 4.0 s fell 4.4 -> 2.6, so he stopped. Flat completion rose 73% -> 79% and the catch
speed fell 3.2 -> 2.3. The facing request does not reach the speed, either because a later stage of the route
command (the craft or the stem work) re-sets the facing, or because the caps do not bite on a lateral run. With
FLAT_SHAPE, this is the second attempt at the flat, so it is stopped and reverted.

**Traced (2026-11-24):** staged slant_flat vs Cover 3, gun trips, seeds 1-2, the H on the flat, engine-92.
`out/dbg/flat-trace.mts` reads each stage's command.

- The route command sets no facing. `RouteRunner.update`'s last stage, BALL_EST's `preLook` (out of the break he
  gets his head round to the QB and his shoulders as far as his head cannot reach), already turns his hips toward the
  QB from 1.0 s on:
  - hips -3 to -15° against a travel heading of -71°, so 55-70° off his run;
  - head (`look`) at +50 to +59°.

  So FLAT_LOOK's request was already being met in the default.
- **The speed does not pay for it.** With his hips 55-70° off his travel he accelerates to 6.2-6.4 yd/s (2.25-2.5 s),
  against the NFL's 5.2-5.3. The body's facing speed caps do not bite at that angle. That is the facing-as-state
  physics (Tools, QB lane), not a route rule.
- **A glitch.** On some ticks the final commanded facing flips to the other side: -121° / -126° with the look at
  -176° / 179°, against -3° to +4° on the ticks around them. A turn-side choice near ±180° alternates between
  sides. It is in the look stage (`preLook` / `lookJoints` / `turnSide`), and it is worth fixing before the facing
  work leans on it.
- **Where the flat's speed and width gap sits:** the body letting a man run his full lateral speed with his hips 60°
  off his run. A flat-specific rule would have to throttle him; per the project's rules that is the wrong fix.

## Flags

| flag | default | status |
|---|---|---|
| GO_STEM | off | ready to card |
| HITCH_OPEN | off | card with the QB clock and the anticipation price |
| SLANT_ANGLE | off | ready to card; partial |
| CROSS_OVER | off | existing; ready to card |
| FLAT_SHAPE | off | cherry-picked from #870 for measurement; do not card |

Tests: `test/go-stem.test.ts`, `test/hitch-open.test.ts`, `test/slant-angle.test.ts`, `test/flat-shape.test.ts`.
