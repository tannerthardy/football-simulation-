# After first contact: why run carries end 0.6 s early

Main Engine, Stage 1, 2026-10-27, develop `1ec115c7`. Question: after a run
carrier's first contact, NFL carries last 1.30 s (median) and gain 2.42 yd.
Ours last 0.70 s and gain 1.51. The first half second is similar (gain 1.32 vs
1.44). What ends them sooner: the carrier's drive, or how he goes down?

**Answer:**
- **How he goes down.** 74% of run carries end in a support fall that World
  attributes to his legs, 0.4 s after contact. Most come under one tackler,
  whose hold started at the waist or thigh.
- **Two physics terms make it quick:**
  - A hold whose grip is at its limit slides down the body on a fixed
    0.3 s clock (`LEG_SLIDE`). It slides even when the arms are not moving
    along the body.
  - A thigh hold's pitch moment trips him in full: the hip brace
    (`LEG_BRACE`) is off.
- **Repairing both moves every after-contact quantile toward NFL in games,
  with the existing default-off package.** But the 1v1 tackle panel shows
  what is still missing: **a hold on his legs does not limit his stride.**
  - A lone tackler from behind cannot finish a slow runner. He either jogs
    beside him at arm's length or plants and is dragged.
  - Two attempts at the finish did not repair it, so I stopped (stop rule).
    The missing law is written up below as the next physics question.
- No engine change here; docs and diagnostics only.

## 1. How carries end (develop, run-only, seeds 7/9/11/13)

`scripts/diag/carry-end-probe.ts` logs, for every run play:
- the first carrier contact;
- the first fall after it: cause, direction, and the grasp joints on him;
- how the carry ended.

`scripts/diag/carry_end_summary.py` summarizes the rows.

| | n | live 0.8 s after contact | live 1.0 s | yards after contact p25 / p50 / p75 / p90 | share ≥ 10 yd |
|---|---|---|---|---|---|
| NFL (`scripts/diag/after_contact.py`, film operator) | 1,310 | 0.76 | 0.65 | 1.26 / 2.42 / 3.97 / 6.98 | 5.0% |
| develop, same film operator | 786 | 0.30 | 0.15 | 0.79 / 1.53 / 2.54 / 4.06 | 3.8% |
| develop, this probe | 439 | 0.39 | 0.18 | 0.58 / 1.34 / 2.56 / 4.28 | 5.0% |

The probe times contact from the `carrier_contact` event and the end from
`finishCarry`, so its numbers differ a little from the film operator's. Arms
below are compared with the probe; NFL with the film operator.

How develop's 439 carries end:

| Ending | n | contact → fall | contact → end | fall direction |
|---|---|---|---|---|
| Fall, cause "legs" | 323 (74%) | 0.40 s | 0.80 s | forward (downfield component 0.61) |
| Fall, cause "contact" | 102 | 0.20 s | 0.55 s | backward (−0.88: driven back) |
| Stopped progress (whistle) | 3 | | | |
| Other (score, sideline) | 11 | | | |

- **One tackler (or none) held him at 234 of the 323 legs falls.**
- **The holds**, 205 grasps on fallen carriers:
  - Legs share at the grasp, median 0.32 (waist or thigh); 0.62 at the fall.
  - Arm span at the grasp 1.01 yd; 0.60 at the fall. The arms have closed in.
  - Age 0.35 s.
  - The holder is still up in 167 of the 205.
  - 118 of 153 falls had a hold that slid down the body before he fell.

## 2. Why the legs go so soon

`world.ts`:
- **Slide on a clock.** A grasp marked `slipping` (grip force at its limit this
  step) moves toward the ankles with time constant 0.3 s:

      if (j.slipping) j.legs += (1 - j.legs) * (1 - Math.exp(-h / LEG_SLIDE));

  - 183 of the 205 holds above did not slide out along the body at all (arm
    span change ≤ 0.02 yd; median −0.32, closing).
  - Their legs share still rose by 0.25, after 0.10 s of slipping.
  - `slipping` means the grip was at capacity, not that the hands moved. A
    closing wrap at capacity slides to the shins anyway.
  - Hold height is `com·(1 − 0.55·legs)`, so 0.32 → 0.62 halves the height
    above the ground of where the pull acts.
- **Thigh moment in full.** `addLoad` turns a leg hold's pitch moment into a
  trip. Without `LEG_BRACE`, the hips brace none of it. The Oct 12 isolation
  (WORKBOARD, "controller session -> physics session") found this. With the
  brace, hips take the above-knee moment up to 3.5 N·m/kg (`HIP_TORQUE_PER_KG`);
  holds below the knee still trip in full.

## 3. Arms: what each term does in games (same probe, same seeds)

Scratch arms, not on this branch (the code is in the appendix):
- **Slide by slip** (`SLIDE_SLIP`): the hold moves down the body by the
  distance the arms actually slipped, `Δlegs = slid / (0.55·com)`, not on a
  clock.
- **Arm span** (`ARM_SPAN`): the tackle controller judges the hold by the
  arms' span, not body centers (§4).

| Arm (seeds) | live 0.8 / 1.0 s | contact → end | after p25 / p50 / p75 / p90 | mean | ≥ 10 yd |
|---|---|---|---|---|---|
| develop (4) | 0.39 / 0.18 | 0.75 | 0.58 / 1.34 / 2.56 / 4.28 | 3.44 | 5.0% |
| slide by slip (2) | 0.55 / 0.40 | 0.85 | 0.72 / 1.49 / 3.09 / 6.08 | 2.88 | 2.9% |
| `LEG_BRACE` (2) | 0.66 / 0.43 | 0.95 | 0.72 / 1.52 / 3.14 / 6.80 | 2.71 | 3.9% |
| brace + slide by slip (2) | 0.71 / 0.58 | 1.20 | 0.84 / 1.88 / 4.29 / **10.42** | 4.87 | **12.4%** |
| package: brace + `WRAP_BIND` + `TACKLE_ROLL` (4) | 0.66 / 0.42 | 0.95 | 0.78 / 1.73 / 2.91 / 5.69 | 3.10 | 4.7% |
| package + slide by slip (4) | 0.73 / 0.53 | 1.05 | 0.97 / 1.95 / 3.51 / 5.80 | 3.77 | 5.7% |
| package + slide + arm span (2) | 0.69 / 0.55 | 1.10 | 0.95 / 2.18 / 4.17 / 6.62 | 4.26 | 6.6% |
| NFL (film operator) | 0.76 / 0.65 | 1.30 | 1.26 / 2.42 / 3.97 / 6.98 | 3.40 | 5.0% |

- **Brace with slide-by-slip but no finish:** carriers drag tacklers. The
  10+ yd share rises to 12%.
- **The package supplies a finish:**
  - Wrap binding couples a tight wrap to his recovery step.
  - The roll sits the holder down across his travel.
- With the package, every quantile moves toward NFL and the tail holds.
- The football numbers are not the claim. They show which ending each term
  controls.

## 4. The 1v1 panel: lone tacklers cannot finish

`scripts/diag/tackle/panel.ts`: one carrier, one tackler, 24 mirrored cells
× 12 seeds, production chase and tackle controller.

| Arm | ordinary tackled | difficult tackled | censored (held, unfinished) |
|---|---|---|---|
| develop | 0.82 | 0.82 | 0 |
| package | 0.81 | 0.55 | 103 |
| package + slide by slip | 0.79 | 0.48 | 123 |
| package + slide + arm span | 0.78 | 0.48 | 137 |

Yards after contact rise mostly from the side and behind:
- 135° at 3 and 6 yd/s: 3.3 / 6.4 → 12.4 / 12.6.
- 180° at 3 yd/s: 3.2 → 11.6.

This is the blocker the Oct 13 package review named: 42 of 288 unfinished.

### The stand-off (`scripts/diag/depth/holdtrace.ts --angle 135 --speed 3`, package + slide)

| | develop controller | arm span |
|---|---|---|
| What the holder does | wraps the trailing leg, then jogs at the carrier's speed | plants (asks 1.5 yd/s) |
| Grip force | about 0 | about 800 kg·yd/s² (730 N) |
| Carrier speed | 3.0 yd/s | 2.7 yd/s |
| Outcome | no finish: the panel censors it | hold breaks: arms stretched past reach |

- **World's view:** the arms are at full wrap. Arm span 0.52 yd equals
  `CONTACT_SCALE × radii`, and the reel stops.
- **The controller's view** (`updateBond`): it judges the hold by the
  distance between body centers, 1.15 yd, because the hold is on a trailing
  leg. So it rates the hold extended: quality 0.46.
  - Its request along the hold is `carrier speed + close − plant`.
  - At this distance `close` (1.5, saturated) and `plant` (3.0 × 0.46 × grip
    1.0 = 1.38) almost cancel.
  - So he asks to match the carrier, the hold carries no load, and the
    roll's "within torso + 0.15" test never passes.
- **With arm span, he plants.** The 730 N is about what a 102 kg man's planted
  feet can resist (friction × weight).
- **The carrier's stride is unaffected** by a secure hold around his leg. He
  keeps driving at 2.7 yd/s, the leg point stretches back 0.86 yd behind the
  arms' length, and the hold breaks.

That is the missing physics. In football, a wrap around the thighs stops the
stride. A man held there must drag the holder on bound legs, or fall. The
model lets the held leg keep producing full ground drive. It only restricts
the corrective (recovery) step (`WRAP_BIND`). This is also the open WORKBOARD
handoff "a held runner keeps his full stride". `LEG_BIND` was withdrawn there
because it capped the gait by grip and broke the rear-finish load contract.

## 5. Next physics question (proposed, not started)

**How much ground drive can a body produce through a leg that a hold restrains?**

The law should come from the same attachment that `WRAP_BIND` uses for the
recovery step:
- The held leg's propulsive stroke has to move the attachment point.
- So its drive is paid against the hold's resistance, through the grip and the
  holder's own ground force.
- It should not be a cap on the gait by grip. That was the withdrawn
  `LEG_BIND`.

Measure with the panel above:
- finishes from the side and behind at 3 and 6 yd/s;
- yards after contact by cell;
- the rear-finish load contract in `tackle-support-choice.test.ts`.

Then in games, with this probe and the film operator:
- the live fraction at 0.8 and 1.0 s;
- yards after contact quantiles.

Promotion of the package and the slide-by-slip law should wait for it. Each
of them alone lengthens carries by letting a held man run.

The arm-span correction to `updateBond` is a real controller defect. A wrap
on a trailing leg is judged by body centers. It changes nothing until the
finish exists, so it is held with the scratch arms.

## Tools

- `scripts/diag/carry-end-probe.ts` and `scripts/diag/carry_end_summary.py`
  (new, read-only).
- NFL comparison: `scripts/diag/after_contact.py` (new), on
  `scripts/mechanics/run_film_reference.py`, same operator for NFL and sim
  traces.
- Panel and stand-off trace: existing `scripts/diag/tackle/panel.ts` and
  `scripts/diag/depth/holdtrace.ts`.

## Appendix: the scratch arms (not committed)

`world.ts`, grasp update. Slide by the distance the arms actually slipped:

```ts
const before = j.hold ?? d;
// ... hold update unchanged ...
const slid = j.slipping ? Math.max(0, (j.hold ?? d) - before) : 0;
if (slid > 0) j.legs = Math.min(1, j.legs + slid / (0.55 * this.comHeight[this.indexOf(j.b)]));
// replaces: if (j.slipping) j.legs += (1 - j.legs) * (1 - Math.exp(-h / LEG_SLIDE));
```

`tackle.ts` `updateBond`, holder loop and `TACKLE_ROLL` loop. Judge the hold by
the arms' span; `hold` at `CONTACT_SCALE × radii` reads as a full wrap:

```ts
const near = Math.min(distance, (joint.hold ?? distance) + (1 - CONTACT_SCALE) * torso);
// quality and close use `near` instead of the body-center `distance`
```
