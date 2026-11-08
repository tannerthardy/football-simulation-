# Engaged push contest: what drives an engaged DE back

Flex, 2026-11-08, for Tanner and the Physics lane. This continues Main Engine's
queue item 4 (the engaged play-side edge loses his charge), with Run Game. It
proposes no law change. It records what was traced and tried, and what needs a
decision.

## The rep

- **Play:** restage `s9-39`, IZ weak.
- **Fixture:** `run/G3-oz-backfield` @ 86f044d9,
  `scripts/diag/run-operators/fixtures/s9-39.json` (sha256 `b5a61343…158c`).
- **Branch and flags:** Run Game's branch alone, with its flags (`LIVE_AIM=0
  REACH_FLAT ZONE_MUG` and its run-game set). It stalls there without the
  Defense layers.
- **Players:** DE_W (111 kg, strength 0.74) is engaged by the LT (143 kg,
  strength 0.71) at 0.80 s.

Depth past the LOS:

| t (s) | 0.25 | 0.50 | 0.75 | 1.00 | 1.25 | 1.50 |
|---|---|---|---|---|---|---|
| DE depth (yd) | 0.89 | 0.53 | 0.17 | 0.23 | 0.50 | 0.75 |
| State | free | free | free | LT | LT | LT |

He is driven back about 1.1 yd/s for 0.7 s.

## Tick trace (stages)

| t | DE request upfield | DE achieved | LT request | DE lift (share of body weight) | LT lift | DE posture | LT posture |
|---|---|---|---|---|---|---|---|
| 0.85 | 0.00 | −0.68 | 2.90 | **+0.69** | −0.53 | **0.42** | 0.81 |
| 0.95 | 0.04 | −1.15 | 3.69 | +0.09 | −0.07 | 0.67 | 0.81 |
| 1.05 | 0.38 | −1.14 | 3.86 | −0.09 | +0.07 | 0.92 | 0.81 |
| 1.25 | 1.04 | −1.00 | 3.22 | −0.16 | +0.12 | 0.97 | 0.81 |
| 1.45 | 1.50 | −1.35 | 2.49 | −0.29 | +0.22 | 0.81 | 0.81 |

- Lift is `World.liftFelt / (m·g)` under `PAD_LEVERAGE`. Positive means the man
  is lifted and loses traction.
- Posture is support posture; higher is lower pads.

Reading:

1. **He arrives with his pads high.** At contact the DE's posture is 0.42, from
   his free run upfield; the LT's is 0.81.
   - Pad leverage lifts 69% of the DE's weight, leaving him about a third of his
     traction.
   - The LT is pressed into the ground and has about 1.5 times his.
   - The DE is knocked back to −1.1 yd/s within 0.1 s. The low man wins, as he
     should.
   - The defect is the attacking DE coming into contact upright. That is his
     pre-contact controller (Defense), not World.
2. **His request then builds slowly.** `DL_FLATTEN` turns an attacking lineman
   who sees a zone step into a hold-your-contact-depth target, so his upfield
   request is about 0 at contact and reaches 1.5 only at 1.45 s.
   - With `DL_FLATTEN=0`, his depth at 1.6 s is 0.72 instead of 0.87.
   - Defense's `TOUCH_READ` (205c6add) moves this rep by about 0.02 yd.
3. **Recovering from −1.1 yd/s takes most of a second.** On the push bench, the
   same two bodies starting at rest (LT driving at 3.8, DE pressing at 1.5)
   move the pair only 0.32 yd toward the DE in 1.0 s, against about 1.1 yd/s in
   the game.
   - Most of the game's loss is the momentum lost at the contact instant.
   - The steady push contest accounts for less.

## Defense's follow-up: pads at contact are not the general lever

Defense built `SINK_LEAD` (experimental, off), b49aebe3 on
`defense/G2-stance-tell`.
- **Rule:** an unengaged front lineman starts sinking when gap ÷ closing speed
  falls below his slew time to engaged pad level, or when any blocker is within
  1 yd.
- **s9-39:** posture at contact goes 0.42 → 0.79, and depth at 1.65 s goes
  0.93 → 0.74 yd. The one-tick knock-back at contact is unchanged.
- **Defense's matched restage, 878 runs:** posture at contact goes 0.30 → 0.63.
  - Engaged DL depth at 1.5 s is unchanged (median −0.38 both ways).
  - Driven back more than 0.5 yd: 41% → 40%.
  - Paired yards −0.34 (SE 0.31).
- **Their conclusion:** posture reaches its target within about 0.15 s anyway,
  so the general drive-back is the post-contact push contest. That is item 3
  (matched pairs stalemate while lopsided pairs drive back), and candidate (b)
  below is still the open lead there.

## Candidate (a), static friction for yielding feet: dropped

The proposal was that a planted, yielding man gets a static coefficient μs
above the sustained one. That fails on the evidence, before any NFL output was
looked at.
- In cleat-turf traction testing (Sabick, Pfeiffer and colleagues, Boise
  State; ASTM F2333 rig, normal loads 222–1780 N), the static coefficient on
  infilled turf was lower than the dynamic one at all but the lightest load.
- Cleats dig into the infill and shear it, which is not Coulomb friction.
- Sources (abstracts only were reachable from the session):
  - <https://works.bepress.com/rpfeiffer/15>
  - <https://works.bepress.com/rpfeiffer/6>
  - <https://core.ac.uk/works/34018443>

## `TURF_MU = 1.1` is unsourced, but it is not the lever here

- `src/physics/support.ts` `TURF_MU = 1.1` has been marked "model assumption"
  since 6ec7a813, the commit that first put every player through one physics
  world. Nothing in docs or data sources it.
- Leg power is `m·(0.55 + 0.75·strength)` kg-force (`src/players/physical.ts`),
  so above strength ≈ 0.73 traction, not strength, caps a player's drive. The
  eccentric credit (`ECCENTRIC_GAIN = 1.2`) cannot lift a yielding man past that
  cap.
- **Diagnostic.** `TURF_MU_SCALE` (identity by default; diagnostic only, never a
  promotion candidate) scales the traction cap, and the traction-capped drive,
  of bodies in a hands joint.

| `TURF_MU_SCALE` | 1 | 1.25 | 1.5 |
|---|---|---|---|
| s9-39 DE depth at 1.5 s | 0.75 | 0.73 | 0.72 |
| Bench, lopsided s9-39 pair: pair moves toward DE (yd/s), DE pressing 1.5 | 0.32 | 0.41 | 0.41 |
| Bench, matched pair head-up, both 1 yd/s | 0.00 | 0.00 | 0.00 |
| Bench, bull rush 2.0 vs set tackle anchoring: tackle loses (yd/s) | 0.09 | 0.25 | 0.25 |

- More grip helps the heavier, stronger man at least as much: power also scales
  with mass.
- Above ×1.25 nothing is traction-limited.
- Matched pairs still never move: the stalemate in item 3 is not a μ effect.
- The bench is Main Engine's push bench (ec1628e3) with these cases added: the
  s9-39 LT and DE bodies, and a pass engagement with a 2.0 yd/s bull rush.

**Open sourcing question, unchanged:** the peak translational traction
coefficient of football cleats on turf at lineman loads (about 1,000–1,800 N
per foot). It needs the full papers (Sabick/Pfeiffer; Livesay et al.), which
this session could not reach. It decides whether `TURF_MU` should change, but
this rep does not depend on it.

## Candidate (b), ARM_PRESS bound on hand force: not built

- The force a blocker can put through his hands is bounded by arm and press
  strength (`ARM_PRESS`, bench-press units) as well as by his legs.
- On this rep the hand normal force is about 0.75–0.8 body weights for the LT,
  roughly what the bench shows for matched pairs. It is not the mechanism of
  the drive-back here.
- It stays a candidate for the matched-pair stalemate (item 3), where neither
  man's legs bind. Untested.

## Decisions needed

1. **Defense:** an attacking DL arriving at a block upright is the first-order
   cause on this rep. Should he sink his pads as contact approaches, using his
   own acquired picture of the blocker? This is his controller.
2. **Tanner / Physics:** obtain the cleat-traction numbers before any `TURF_MU`
   change. No World law change is proposed.
3. `TURF_MU_SCALE` stays diagnostic. It expires at review 2.
