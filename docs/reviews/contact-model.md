# Contact model: tackles that slow and hold up the runner (2026-10-21)

Branch `claude/run-game-v3`, from accepted develop `d91c9014` (#189), merged at
`e9d41e27`. User priority: "a contact model where a tackle can slow or hold up
a runner and let a second defender arrive". The user made this branch the
author's own to change, physics included.

## Question and answer

**Question.** Why does a sim tackle either stop the runner almost at once or
let him leave at full speed, with fewer defenders arriving than in the NFL?

**Answer.** Four defects, two in the World's laws, one in the solver and one in
the holder's controller, plus a coherent finishing set from earlier research
that could not be used until those were fixed:

1. **Two leg budgets.** A runner leaning into a hold pushed with a full lean
   *on top of* his full gait drive. At 7 yd/s he drove about 520 forward
   (kg·yd/s²) against a force-velocity line of about 315, which cancels a
   300–600 grip. Held runners kept 95–99% of their speed.
2. **Instant trips.** 86% of tackled carriers fell from the leg hold's trip
   moment, median 0.35 s after first contact, usually with one tackler on him
   (300 zone plays). The earlier hip-brace set (`LEG_BRACE TACKLE_ROLL
   WRAP_BIND`, [physics ideas](physics-ideas.md) 7–9) keeps him up, but left a
   lone tackler no finish: the runner dragged him 8–30 yd.
3. **Why the lone tackler could not finish** (traced in the 1v1 panel's rear
   wrap, 180°, 3 yd/s):
   - the holder judged his wrap by the runner's center (1.0 yd away), not the
     leg his arms held (0.5 yd), so he never planted;
   - planting, his sit-back used his *backpedal* share (0.6) of leg strength;
     a lean against a pull you face is the strongest posture there is (tug of
     war), not a backpedal;
   - **solver:** the leg hold's spring request overshot the passive work
     budget through the runner's yielding foot. Its first impulse spent the
     whole budget, every later iteration in that step was refused (zeroed on
     about half the updates), and the hold stalled near 770 of a 2,267 grip
     while the runner stepped the held leg forward under the holder.

## Changes (all on in this branch's pinned profile)

| Flag | Where | Law |
|---|---|---|
| `LEG_FV` | `world.ts` `feet()` | The forward share of a lean spends what the gait's planned drive leaves of one force-velocity budget, `pushForce·dir·(1 − v/vmax)`, at the body's actual speed. Braking and cornering shares are bounded as before. |
| `LEAN_AXIS` | `world.ts` `feet()` | A lean's leg strength depends on how he faces the load's *line*: sitting back against a pull he faces is as strong as driving into a load. Side-on loads keep the side-on share. |
| `TETHER` | `world.ts` `solveGrasp` | A passive leg hold is an inelastic tether at the point it holds: it stops that point separating from the holder, within the grip and the unchanged passive work budget, and never pulls the two together (no spring restoring an earlier stretch). |
| `HOLD_POINT` | `tackle.ts` `updateBond` | The holder judges his wrap (grip growth, plant, roll) by how far his arms reach to the point they hold (`World.graspDistance`), not by the runner's center. |
| `LEG_BRACE` `TACKLE_ROLL` `WRAP_BIND` | existing | Hip bracing of thigh holds, the tight-wrap roll and secure-wrap coupling, unchanged, now promoted with the above. |

Also: `syncHeldSupport` releases a lower hold only beyond its bound plus 1e-9 yd,
so a point exactly at the bound is not released by rounding. `PLANT_TRAVEL`
(side holder plants against the runner's travel) was measured and stays **off**
(games slightly better, but four slow cutting 1v1 reps go unfinished).

No capacity, grip, traction, rating or tackle probability changed. The work
ledger, its passive contract and the support model are unchanged; the tether
only changes what the leg hold asks the solver for.

## Results

Lab arms, same cases and seeds (zone `ace_12` iz/oz/wz 1,200 plays; gap
`i_pro_21`/`ace_12` power/counter/duo/trap 1,600; shotgun zone 600). Develop
`r189*` vs this package `cmF*`. Shared operator (`scripts/mechanics/metrics.py`)
against the committed NFL 2022 tracking reference.

| | zone | gap | shotgun | NFL |
|---|---|---|---|---|
| Distance from NFL run distribution (TVD) | 18.1 → **13.6** | 12.1 → 14.0 | 16.9 → **10.2** | |
| 40+ yd runs | 9.2 → 6.6% | 10.1 → 7.8% | 6.3 → 5.0% | 0.8 / 2.0 / 0.8% |
| 20–39 yd runs | 0.5 → 1.5% | 0.4 → 1.1% | 1.8 → 1.7% | 1.5 / 3.3 / 1.5% |
| Contact to whistle p50 / p90, s | 0.8 / 1.9 → 1.1 / 2.4 | 0.8 / 1.8 → 1.0 / 2.35 | 0.8 / 1.9 → 1.1 / 2.45 | 1.4 / 2.9 |
| Yards after contact p50 | 2.15 → 2.57 | 2.30 → 2.92 | 1.93 → 2.36 | 2.4 |
| YAC p90, fast entry (≥ 5.5 yd/s) | 65.0 → 19.3 | 63.8 → **10.5** | 20.2 → 12.9 | 10.6 |
| YAC p50 slow / mid entry | 0.35 / 1.36 → 0.51 / 1.68 | 0.45 / 1.63 → 0.67 / 2.16 | | 1.1 / 2.3 |
| Defenders within 2 yd at the end, mean | 2.2 → 2.7 | 2.0 → 2.4 | 2.2 → 2.7 | 3.2 |
| Broken contact (operator proxy) | 15.5 → 18.0% | 14.5 → 18.5% | 15.2 → 15.3% | 12.5% |

**1v1 tackle panel** (`scripts/diag/tackle/panel.ts --seeds 6`, 288 reps):

| | tackled | escaped | unfinished | tackled: YAC p50 / p90 | contact → end p50 | grip held, mean |
|---|---|---|---|---|---|---|
| develop | 234 | 52 | 2 | 2.53 / 5.34 | 0.85 s | 0.95 s |
| brace set alone | 196 | 54 | **38** | 2.73 / 6.64 | 1.00 s | 1.61 s |
| this package | 226 | 54 | 8 | 2.44 / 7.63 | 1.15 s | 1.37 s |

Read together: the runner now stays up and is slowed by a hold instead of
being tripped at once or leaving untouched, more defenders arrive, and a
lone tackler can finish. The after-contact long tail is cut in every family;
by entry speed, yards after contact are now close to NFL.

## Evidence against and unresolved risk

- **Gap TVD worsens** (12.1 → 14.0): 0–3 yd runs 36.6 → 31.5% (NFL 36.8),
  4–9 yd 43.1 → 47.4% (NFL 39.2). By entry-speed bin the after-contact yards
  are near NFL; the shift comes from where contact happens. Sim carriers meet
  the first tackler at 5.4–5.7 yd/s (NFL 4.5) and tacklers arrive slower (2.1–2.5
  vs 2.85). That is run-defense structure (penetration, fits, pursuit), the next
  priority, not the contact law.
- **Broken contact is higher** (zone/gap 18%). Most added cases are runners still
  held at +0.5 s yet moving ≥ 4 yd/s: arm-length side/rear holds (grip ~550–600,
  leg share ~0.3) that the runner carries at speed. `PLANT_TRAVEL` addresses
  the side holder who jogs alongside; it is mixed (above).
- **A held runner can be pulled backward by his own recovery stepping** (up to
  2 yd/s in an isolated World fixture with a planted 400 kg holder, both with
  and without `TETHER`): the virtual foot's desired forward step, pinned by
  the hold, moves the center backward. Physics owner's support model; noted,
  not changed.
- Fast runners caught from behind (1v1 180°, 8 yd/s) still drag a lone holder;
  3 of 6 reps are unfinished.
- Not run: 8-game `mech:sim`, `test:integration`. The integration owner checks
  the exact combined candidate.

## For other sessions: what generalizes

- **One leg budget.** Any second force request on the legs (lean, strike, brace)
  must spend what the gait leaves of the force-velocity budget along the
  body's travel, not stack a second full budget. Stacking hides at low speed
  and dominates at speed.
- **Directional factors are locomotion factors.** `directionalSpeedFactor`
  describes how fast a body can *move* relative to his facing. Applied to a
  static force it made anchoring against a pull as weak as backpedaling.
- **A compliant coordinate inside a passive joint changes what "passive"
  allows.** With the yielding virtual foot, an impulse's own work grows fast
  (mobility/h ≫ 1/mass), so a spring/bias request that overshoots spends the
  passive budget in one iteration and every later correction is refused. Ask
  the solver for an inelastic stop at the held point; the ledger then admits it.
- **Judge a technique by the point the hands hold**, not the other body's
  center. A leg hold sits half a yard behind the runner's center.

## Reproduce

```sh
# lab arms (pinned profile; develop arms used the old profile)
node scripts/diag/open-field/arm.mjs cmFco
node scripts/diag/open-field/arm.mjs cmFgap -- --formations i_pro_21,ace_12 --concepts power,counter,duo,trap --seeds 77,71001,1,2,3
node scripts/diag/open-field/arm.mjs cmFgun -- --formations gun_doubles_11 --concepts iz,oz,wz --seeds 77,71001,1,2,3
for l in cmFco cmFgap cmFgun; do bash scripts/diag/open-field/common.sh $l; done
python3 scripts/diag/stretch/bands.py zone r189co cmFco
python3 scripts/diag/open-field/mech.py out/open-field/all/cmFco.jsonl.gz contact.run.contact_to_whistle_s
node scripts/baseline.mjs --candidate -- node --import tsx scripts/diag/tackle/panel.ts --seeds 6
# mechanism tools (scripts/diag/contact/)
node scripts/baseline.mjs --candidate -- node --import tsx scripts/diag/contact/fallcause.ts r189co 300
node scripts/baseline.mjs --candidate -- node --import tsx scripts/diag/contact/carforce.ts iz/strong/ace_12/under3/pair11/77 3 4
python3 scripts/diag/contact/holdgeo.py cmFco; python3 scripts/diag/contact/broke.py r189co cmFco
python3 scripts/diag/stretch/tailcontact.py r189co cmFco
```

Arms `cmF*` ran on `e9d41e27` plus the working patch (manifest patch
`c1173a52…`, tracked files `config/baseline.json`, `src/physics/world.ts`,
`src/sim/tackle.ts`), the same source as the commit that adds this document.
Contracts: `test/contact-model.test.ts` (force-velocity line, anchoring, the
panel's rear wrap finished with the tether and dragged without it); all 2,860
core tests pass with the package on and with it off; typecheck passes.

## Next

Run-defense depth and pursuit (user's next priority): first contact happens
too late and too fast, and defenders near the end are 2.4–2.7 vs NFL 3.2.
