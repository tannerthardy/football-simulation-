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

## Three items converge on the engaged push contest (Flex, 2026-11-08)

Defense's rally measures (`rally.py`) show that blocked defenders do not close on
a carrier who goes past them. With the blocker between them and the ball:
- DL ask 2.11 yd/s and get 0.32.
- LB ask 1.95 and get 0.39.
- NFL engaged men close at about 1.2 yd/s.

**Trace on Run Game's branch + `ONE_ARM_HOLD`.** Zone runs, engaged DL/LB with
the carrier 1–6 yd away and the blocker between, ticks where the defender is
working off:

| | Around the blocker req → ach | Toward the blocker req → ach | Blocker driving into him req → ach |
|---|---|---|---|
| LB (n ≈ 2.7k) | 3.83 → 0.83 | 0.59 → −0.86 | 1.67 → 0.87 |
| LB, work-off press raised to 2.4 (scratch) | 3.92 → 0.80 | 2.26 → −0.78 | 1.79 → 0.81 |
| DL (n ≈ 15k) | 1.24 → 0.29 | 1.78 → 0.29 | 0.73 → −0.28 |

**Ruled out for the LB stall** (all scratch, none committed):
- #415's flags with `SHED_PAST_GATE`: no change.
- Bounding the hands' tangent force by μ·normal + grip: LB −0.25 → −0.15.
- Following by sight once the hands unload (`MIRROR_UNLOAD`): −0.28 → −0.36.
- A harder work-off press: the LB is still driven back at about 0.8 yd/s.

The DL row is a routing problem: half of the DL work-off requests aim into the
blocker. That is Defense's.

**What remains is the engaged push contest itself.** It is the same mechanism
as:
- item 4: the engaged DE driven back on s9-39;
- item 3: matched pairs never move while lopsided pairs drive back steadily.

Leg power (`m·(0.55 + 0.75·strength)`) and traction (`1.1·m·g`) both scale
linearly with mass. So in a mutual press the heavier man wins at any rating,
and equals never move.

**Candidate for Primary and Tanner (not built):** allometric leg force. Muscle
force scales closer to mass^(2/3), or with fat-free mass, than linearly with
total mass. Among near-equals, leverage, pad level and hand placement then
decide. This is a World physics law and needs Primary's and Tanner's decision
before any implementation.

### Updates and the proposal's controls (2026-11-08, later)

**Routing is closed too.** Defense's `SHED_ROUTE` (a307348b on
`defense/G2-stance-tell`) builds the work-off frame from the man actually on
him, not the blocker's original drive line.
- DL requests into the blocker's body: 38% → 19%.
- DL achieved speed toward the carrier: −0.08 → −0.08 yd/s.
- Paired yards: −0.04 (SE 0.37).

**The carrier's lean is not the fall-forward lever.** Run Game's
`CARRIER_BRACE` v2 (65fa5306) times the sink and a last-stride lunge to the
tackler's arms. On 232 front-on contacts at −1..+3:
- posture at contact 0.23 → 0.63;
- lunging 0 → 57%;
- capture point along travel +0.01 → +0.18 yd.

Forward falls stay at 17 → 18%. Its extra front-on gain (to 2.29 / 1.50 / 1.51)
comes from momentum carried into contact. The fall direction is set by the
front-on load's height relative to his COM: World's `tip` term and the
tackler's contact height.

#### Controls an allometric leg-force law must pass

1. **Push bench.**
   - Matched pairs should no longer be a permanent stalemate; leverage and pad
     level should decide them.
   - The lopsided s9-39 pair should still favor the heavier, stronger man.
2. **Pass protection:** a bull rush against a set tackle, with and without the
   tackle anchoring. Bench cases already exist.
3. **The three converging traces:**
   - s9-39 DE drive-back;
   - matched-pair push-back share (NFL 13% of DL driven back 0.5 yd by 2.0 s;
     ours 1–2%);
   - the engaged rally stall (engaged DL/LB closing on a passing carrier, NFL
     about 1.2 yd/s).
4. **Carry and tackle contacts:** the same leg force drives a carrier through a
   pile and a tackler's plant. The checks are Run Game's `stuffbin` and
   `hitterback` (contact → end, gain, flat share) and `pile.py` (speed by pile
   size, already NFL-like and not to regress).
5. **Unchanged where traction binds:** sprint acceleration and cut capacity.
   The law changes leg force, not traction.

#### Sourcing the exponent

- **Literature:** strength normalization for body size reports exponents near
  2/3 for whole-body and multi-joint strength, with fat-free mass a better
  linear predictor than total mass (e.g. Jaric 2002, *Sports Medicine*, on
  normalizing strength for body size; to verify against the full text). That
  supports either model:
  - `force ∝ m^b` with b about 0.67;
  - `force ∝ FFM`, which needs a body-composition estimate per position.
- **Football-specific check from data we hold:** Big Data Bowl 2027 combine
  rows (about 510 prospects with weight; 192 with bench reps; vertical and
  broad jumps). Estimate b by regressing log 1RM against log mass:
  - 1RM from 225 lb bench reps via Epley, which `ARM_PRESS` already uses;
  - leg power from vertical jump and mass (Sayers);
  - within position groups, to separate mass from training selection.
  - This is a raw-data job (Kaggle `KAGGLE_API_TOKEN` is set in this
    environment), output to ignored `out/`, with only the fitted exponent and
    its interval committed.
- **No NFL output tuning:** the exponent comes from strength data, then the
  controls above are read.

**Decision:** Tanner and Primary. Nothing is built.

#### Exponent fit (2026-11-09)

Tanner approved the combine fit. Kaggle authentication was unavailable in this
session, so it uses nflverse's public combine table instead:
- 8,968 rows, 2000 onward; sha256 `5648886b…235bb`;
- raw file ignored under `data/raw/nflverse-combine/`;
- script `scripts/mechanics/leg_force_allometry.py`;
- aggregate `data/reviews/mechanics/leg-force-allometry.json`.

Fit: OLS of log(estimate) on log(mass), with bootstrap 95% intervals.
"Within groups" pools the slope inside position groups, which separates body
size from position selection; neither removes training selection.

| Estimate of force ∝ mass^b | n | b, pooled | b, within position groups |
|---|---|---|---|
| Leg push-off force, m·g·(1 + h/d), d = 0.25·height | 6,745 | 0.63 (0.62–0.64) | 0.69 (0.67–0.71) |
| Bench 1RM, Epley from 225 lb reps | 5,333 | 0.46 (0.44–0.47) | 0.44 (0.40–0.48) |
| Sayers peak power (reference only) | 6,745 | 0.36 (0.36–0.37) | 0.43 (0.40–0.45) |

**Reading.**
- Leg push-off force scales close to mass^(2/3) among NFL prospects, consistent
  with the strength-normalization literature. The engine's
  `power = m·(0.55 + 0.75·strength)` assumes b = 1 at a fixed rating.
- At b ≈ 0.69, a 143 kg lineman against a 111 kg one has a leg-force ratio of
  about 1.19, not 1.29.
- The bench index scales even more weakly. Reps at a fixed 225 lb mix strength
  with endurance, so it is a lower bound for press strength, not a value to
  adopt.

**Limits.**
- The push-off depth d is an assumption (0.25 × height).
- Jump height already reflects each athlete's actual force-to-mass ratio, so
  the estimate inherits whatever selection makes heavy prospects jump less.
- Combine athletes are not a random sample of body sizes.

**Proposal.** Leg force ∝ m^0.69 at a fixed strength rating, normalised so a
reference-mass player keeps today's force. Traction stays ∝ m. Before any
promotion, run the controls listed above. Decision: Tanner and Primary.

#### `LEG_ALLOMETRY` built, off (2026-11-09)

**The law.** With `LEG_ALLOMETRY=1`, `supportParams.pushForce` becomes
`min(power·g·(m / 110 kg)^(0.69 − 1), traction)`.
- A 110 kg player keeps today's leg drive.
- A 143 kg lineman loses 8%; an 88 kg back gains 7%.
- Traction, arm force and press are unchanged.
- The grip-scale diagnostic (`TURF_MU_SCALE`) path uses the same leg drive.

Built on Tanner's "do what you think is best". Promotion is still his and
Primary's.

**Controls, flag off → on.**

| Control | Off | `LEG_ALLOMETRY` |
|---|---|---|
| Bench: lopsided s9-39 pair, DE pressing 1.5 / requesting 0 (pair moves toward DE, yd/s) | 0.32 / 0.51 | 0.25 / 0.41 |
| Bench: blocker strength 40 vs 97 (pair moves toward D) | −0.20 | −0.32 |
| Bench: matched pair, matched lower pads, pass bull rush (equal-mass bodies) | 0.00 / 0.22 / −0.09 | unchanged (by construction) |
| s9-39 DE depth at 1.5 s (yd) | 0.75 | 0.67 |
| Engaged LB between + shedding: driven back (yd/s) | 0.86 | 0.81 |
| Engaged DL between: toward-carrier achieved (yd/s) | 0.03 | 0.04 |

**Reading.**
- The direction is right everywhere: the heavier man still wins, by less, and
  strength ratings matter more relative to mass.
- The size is modest. At the measured exponent, the law corrects the mass bias
  but does not by itself close the engaged drive-back or the rally stall.
- Matched-mass stalemates are untouched by construction. Pad level already
  decides those on the bench (0.22 yd/s for the lower man), so the item 3
  matched-pair gap is a pad-level and leverage question in play.
- Paired restage tables (Run Game) and whole-game measures are still to come.

#### Integration readiness: `LEG_ALLOMETRY` (2026-11-09)

Tanner, via Run Game: "someone should run all of the tests and make it fully
ready for integration".

**Candidate.**
- Branch `claude/quirky-franklin-9lbwbp` @ 3af0a53d (PR #417, stacked on
  #415).
- Flag list for this candidate: `LEG_ALLOMETRY=1`. Every other setting is at
  its default, and every other new flag on this branch (`SHED_PAST_GATE`,
  `WRAP_FOOT`, `TURF_MU_SCALE`) is at its default.
- Code: `src/physics/support.ts` `legDrive()` feeds `supportParams.pushForce`,
  plus one call site in `src/physics/world.ts` (the `TURF_MU_SCALE` path).

**Suites.** Node v22.23.3 (`.nvmrc`), installed from nodejs.org and checked
against its published SHA-256.

| Suite | Flag off | `LEG_ALLOMETRY=1` |
|---|---|---|
| `npm run typecheck` | clean | clean (no runtime dependence) |
| `npm run build` | exit 0 | exit 0 |
| `npm test` | 3741 / 3741 | 3731 / 3741 (10 classified below) |
| `npm run test:integration` | 42 / 42 | 42 / 42 |
| `baseline:run --candidate` (`sim-play oz_strong cover3 1 7`) | exit 0, receipt mode `candidate`, `LEG_ALLOMETRY "0"` | exit 0, receipt mode `candidate`, `LEG_ALLOMETRY "1"` |

Receipts are in ignored `out/baseline/run-1794191952067-24813.json` (off) and
`run-1794191953239-24865.json` (on), both at commit 3af0a53d.

**Flag-on failures, classified.** No tests were skipped or loosened.

| Test | n | Class | Why |
|---|---|---|---|
| `responsibility-ledger` (M25-P032, M7-P051, R7-P083, S8-P005 ×2) | 5 | stale pin | Named-replay cases that pin exact trajectories from a saved zone set. Any leg-force change moves them. Re-pin on promotion. |
| `run-hand-control` (pass and run traces) | 2 | stale pin | SHA-256 of a reviewed motor-specific physical trace. |
| `directional-brace` "preserves the saved accepted collinear execution exactly" | 1 | stale pin | Exact saved execution. |
| `line-read` "play-side edge replaces … on counter" | 1 | stale pin (sample) | The failing assertion is the non-vacuity guard: the staged counter set must still include a late backside box. Its football contracts above it hold. |
| `combo-climb-coupled` "collects the backer … side 1" | 1 | law consequence | On side 1 the scraping LB_W (lighter, now relatively stronger) wraps the RB at 2.75 s, 0.08 yd short of the LOS, before the climber collects him. The mirrored side −1 passes. The scene's earned outcome sits near a threshold. It needs the run owner's review on promotion (restage or re-earn), not a code change. |

None is a break in the new mechanism. The mechanism is one multiplicative
factor on leg drive, so no other behavior can change by construction.

**Controls.**

| Control | Off | On | Source |
|---|---|---|---|
| Bench: lopsided s9-39 pair (pair moves toward DE, yd/s), DE pressing / passive | 0.32 / 0.51 | 0.25 / 0.41 | `out/flex/pushbench.mts` |
| Bench: matched, matched lower pads, bull rush anchored / giving | 0.00 / 0.22 / −0.09 / −0.51 | unchanged | same (equal-mass bodies) |
| s9-39 DE depth at 1.5 s | 0.75 | 0.67 | `replay-defender.mts` |
| Engaged LB between + shedding: driven back | 0.86 | 0.81 | `engaged-chase` probe |
| Eight games, seed 101 (unpaired): YAC mean / p50 | 9.44 / 4.55 | 9.99 / 4.95 | `sim-export` + `measure.py` |
| Same: pressure ≤ 2 yd before the throw | 0.32 | 0.29 | same |
| Same: sack-like dropbacks | 4.4% | 4.3% | same |
| Same: run mean (capped 20) | 4.72 | 4.50 | same |

**Still with Run Game** (its operators and 546-play set):
- the matched push-back share by 2.0 s against NFL 13%;
- `stuffbin`, `hitterback`, `pile`, `hitblk`, `deephit`;
- paired yards, alone and with #415 plus the gate.

**Not yet done:** the full scorecard tier. It is the integration owner's
verification of the exact combined candidate.

#### Paired tables and scope (2026-11-09)

Run Game's paired run.
- **Set:** 546 zone plays.
- **Stack:** `run/G3` @ 2f30be74, Defense 205c6add, `ONE_ARM_HOLD`, #416,
  3af0a53d, `END_CHASE=1`.
- **Operators:** `run-operators/`, the same code on NFL.

| | Off | LEG | LEG + #415 + gate | NFL |
|---|---|---|---|---|
| hitblk blocked, OZ / IZ | 3.07 / 3.97 | 2.80 / 4.20 | 2.57 / 3.29 | 3.41 / 3.68 |
| Deep contacts: blocked hitter ends ≤ 0 | 25% | 31% | 45% | 43% |
| Deep contacts: shed share | 11% | 11% | 16% | 24% |
| DL driven back ≥ 0.5 yd by 2.0 s, OZ / IZ | 1 / 7% | 1 / 8% | 1 / 8% | 13 / 15% |
| Play-side edge depth at 1.5 s, IZ / OZ | −0.01 / −0.07 | −0.02 / −0.07 | −0.02 / −0.07 | −0.92 / −1.11 |
| 3rd defender arrives | 28%, 1.1 s | 27%, 0.9 s | 26%, 0.9 s | 43%, 0.7 s |
| Contact → end at 0..1 | 1.0 s | 0.9 | 0.8 | 1.5 |
| Runs < 20, OZ / IZ | 3.49 / 4.50 | 3.37 / 4.15 | 3.17 / 3.82 | 3.50 / 3.73 |
| ≤ 0, OZ / IZ | 8 / 7% | 9 / 8% | 13 / 11% | 19 / 14% |
| 10+, OZ / IZ | 11 / 13% | 9 / 14% | 9 / 11% | 11 / 9% |
| Paired vs off (SE), OZ / IZ | — | −0.26 (0.19) / +0.04 (0.28) | −0.36 (0.22) / −0.51 (0.31) | |

**Scope of the claim.** `LEG_ALLOMETRY` is a sourced correction that removes the
linear mass bias in leg drive. Alone, it is neutral on the run game within
noise. It does **not** close:
- the push-back share (1–8% against NFL 13–15% in every arm);
- the play-side edge depth;
- the rally.

Those need their own diagnosis. Combined with #415 and the gate, deep-contact
stops (45% vs 43%) and IZ runs < 20 (3.82 vs 3.73) reach NFL. OZ stays too
costly, and contact → end shortens further (0.8 s vs NFL 1.5).

It is carried as a default-off candidate. Promotion: Tanner and Primary.

**Owner review of the law-consequence failure.** Run Game reviewed
`combo-climb-coupled` side 1 as the scene's owner.
- **Seed sweep:** seeds 1–30 × both sides on its stack with this diff. Passes:
  off 34/60, on 28/60. Every flip fails at the same assertion, a
  `tackle_wrap` before the runner crosses the LOS.
- **Trace, seed 16 side 1:** the block is unchanged by the law. The climber
  loads the backer at 1.6 s with the same force, and the backer stays within
  0.02 yd of the off run through 2.6 s.
- **What differs:** the scripted runner's fixed line runs through the engaged
  backer's spot. Brushing past him, the runner covers 0.88 yd instead of 1.04
  yd from 2.4 to 2.6 s and is wrapped at −0.08.
- **Verdict:** reviewed by owner: scene geometry, law-neutral for the block. It
  does not block promotion. Repair: script the runner on a line outside the
  backer's scrape, not a seed re-pick. Run Game will make that change if the
  law is promoted.

**hitterback** (first hitter driven back / carrier gain, medians):

| Contact bin, class | Off | LEG | LEG + #415 + gate | NFL |
|---|---|---|---|---|
| −1..0 front | 0.50 / 0.95 | 0.60 / 1.19 | 0.43 / 0.81 | 0.57 / 2.16 |
| 0..1 front | 0.63 / 1.12 | 0.51 / 1.03 | 0.52 / 0.96 | 0.73 / 2.51 |
| 1..3 front | 0.80 / 1.08 | 0.80 / 1.28 | 0.77 / 1.21 | 0.94 / 2.59 |
| 0..1 side/rear | 1.08 / 1.88 | 0.98 / 2.01 | 1.17 / 1.85 | 1.17 / 2.67 |

The front-on gain gap is untouched by the law, consistent with the load-height
finding.

#### Item 3 re-cut: the engaged contest is not short; engagement is late (2026-11-09)

**Run Game's `trench2`** (zone, the same code on NFL; solo = exactly one OL
within 1.2 yd at 0.5 s):
- DL depth at 0.5 s: solo +0.38 yd, against NFL +0.21.
- Driven back ≥ 0.5 yd from the 0.5 s spot by 2.0 s: 10–11%, against NFL 16%.
- From 1.0 to 2.0 s, the drift is NFL-like.

**Engagement timing.** Solo DL–OL engagements in existence at 0.35 / 0.5 /
0.75 / 1.0 s: 9 / 135 / 727 / 1191.
- DL posture when hands form is about 0.35 (still upright from his charge),
  while the OL's is 0.8. He sinks at `POSTURE_RATE` and is level by about 1.0 s.
- So "the DL is higher-padded at 0.5 s" (126 of 135) is a late-engagement
  effect, not a separate lever.

**Measured from engagement start + 0.3 s over the next 1.5 s** (the NFL
window's length):

| | n | Engagement starts (median) | Driven back ≥ 0.5 yd | Reps lasting the full 1.5 s: driven back |
|---|---|---|---|---|
| Solo | 1294 | 0.85 s | 20% | 29% (n 796) |
| With a helper | 576 | 0.60 s | 35% | 38% (n 512) |

`LEG_ALLOMETRY`: 20% / 36%, unchanged.

**Reading.**
- Once engaged, a DL is driven back at least as often as NFL's 16%. The engaged
  contest is not deficient.
- The from-snap and from-0.5 s gaps come from **when** engagements form. Most
  solo engagements form 0.6–0.85 s after the snap, so the DL gains free depth
  first.
- NFL contact timing on the same operator is still to be measured. That
  belongs to OL step timing, the seam between body contact and
  `createEngagement`, and DL get-off. It is not a push-contest law.
- This replaces this document's earlier item 3 statement that matched pairs
  never move. That came from the push bench and the from-snap operator, not
  from engaged reps.

#### Where the extra DL depth is won: before contact (2026-11-09)

**Run Game's NFL timing** (same operator):
- Median first time within 1.2 yd of the nearest OL centre: NFL 0.70 s, sim
  0.60 s.
- Centre distance at 0.5 s: NFL 1.42 yd, sim 1.30.

**Engagement creation.** The first-level run engage (`blocking.ts` `contact`)
and `inBlockReach` both use radii + 0.1 + arm × 0.45 (about 1.2 yd). It fires
about 0.05 s after the pair first comes within 1.2 yd, so there is no gap
between body proximity and hands.

**DL depth from the snap, zone** (Run Game's branch + `ONE_ARM_HOLD`;
`out/flex/dl-depth.mts`):

| | 0.3 s | 0.5 s | 1.0 s | 2.0 s | Driven back ≥ 0.5 yd from snap |
|---|---|---|---|---|---|
| Base: depth / centre-to-OL | 0.05 / 1.66 | 0.26 / 1.32 | 0.57 / 0.80 | 0.47 / 0.79 | 8% |
| Run strike reach at the pass factor (arm × 0.85), scratch | identical | identical | identical | identical | 8% |
| + lockout strength curve (push ×1.8 at full extension, scratch) | 0.05 / 1.66 | 0.26 / 1.32 | 0.56 / 0.82 | 0.41 / 0.85 | 9% |

NFL (`trench2`): depth +0.07 at 0.3 s, +0.17–0.19 at 0.5 s; driven back from
the snap 14%.

**Reading.**
- In the 0.3–0.5 s window where the DL gains his extra 0.1 yd, the centres are
  still 1.3–1.7 yd apart in both. That is beyond hand reach in both, so no
  engagement exists yet.
- The extra depth is won **before contact**: our DL moves 0.21 yd in that
  window against NFL's 0.11. NFL DL plausibly gather to strike; ours keep
  accelerating.
- That is the DL's pre-contact charge (Defense's controller), not engagement
  or the contact law.
- The lockout strength curve does reduce compression once engaged (inside
  lockout 40% → 26%, touching 24% → 18%). It is a plausible later law, but its
  1.8× gain and 0.15 yd bend are model assumptions, not sourced. Neither
  scratch change is committed.

#### With Defense's KEY_DEPTH + FLAT_PRESS: the engaged contest is two-sided (2026-11-09)

Defense's `KEY_DEPTH` (5d9a0420) removes the requested pre-contact burst.
`FLAT_PRESS` (34b75de3) makes a flattening DL keep a 0.5 yd/s press. The probes
below run on `defense/G2-stance-tell` @ 34b75de3 with its defaults, zone runs.

- **The stall was the controller.** Engaged DL into-backfield, request →
  achieved:
  - hold-depth branch, 51–53% of ticks: −0.09 → −0.27 under `KEY_DEPTH`, and
    0.51 → 0.09 with `FLAT_PRESS`;
  - all ticks: −0.01 → 0.24 yd/s achieved.
- **Strength spread is not too narrow.** Random combine OL/DL leg push-off
  force ratio (nflverse; 1,151 OL, 962 DL): 0.89 / 1.02 / 1.16 at
  p10 / p50 / p90. The sim's leg-drive ratio is 0.88 / 1.00 / 1.38, already
  wider.
- **The engaged contest is two-sided and NFL-like** (solo reps lasting 1.8 s,
  n 774, both flags on):
  - DL displacement over 1.5 s from engagement + 0.3 s: p10 / p50 / p90
    −1.52 / −0.48 / +0.79 yd;
  - driven back ≥ 0.5 yd: 14%, against NFL 14–16%.
  - It depends on the hand fight (driven back 36% when blocker control > 0.5,
    against 4–10% otherwise; correlation 0.28) and on leg ratio
    (correlation 0.36).

**Reading.** Once a DL is engaged solo, the contest's spread and tail match
NFL. The remaining from-snap gap (5% against 14%, Defense's `trench2`) comes from
the population outside that cut: doubles, free DL, and men who never hold a
solo block. It is not the contest law. No change to the contact law is
proposed.

#### Stays experimental: exponent sensitivity and tackle controls (2026-11-09)

Tanner's decision: `LEG_ALLOMETRY` stays experimental. His objections:
- The 0.69 comes from an estimated vertical push-off force with an assumed
  push-off depth. It is not a measured horizontal push at equal rating.
- Leg drive also sets recovery capacity, so tackle outcomes can change even
  when run yardage is neutral.
- Promotion needs sensitivity checks and matched tackle and recovery
  controls.

**Exponent sensitivity** (nflverse combine, within position groups; force ∝ m^b):

| Estimator | b |
|---|---|
| Vertical push-off, d = 0.20 / 0.25 / 0.30 / 0.35 / 0.40 × height | 0.67 / 0.69 / 0.71 / 0.73 / 0.75 |
| Vertical push-off, fixed d = 0.35 / 0.45 / 0.55 m | 0.77 / 0.79 / 0.80 |
| Jump work m·g·h | 0.66 |
| Broad-jump work proxy (m × distance) | 0.75 |
| 40-yd mean acceleration × mass | 0.58 |
| Bench 1RM (Epley; endurance-confounded) | 0.44 |

So b is not pinned. A defensible leg range is about 0.6–0.8. Every estimator
excludes the engine's b = 1, which supports the direction of the correction
but not the 0.69 value.

**Tackle and recovery controls.** Run Game's branch + flags + `ONE_ARM_HOLD`,
588 paired zone runs, `LEG_ALLOMETRY` off → on:
- 556 plays changed.
- Missed and broken tackle events per run: 0.466 → 0.514, paired **+0.048
  (SE 0.033)**.
- Yards: paired +0.07 (SE 0.14).
- Finish, at −1..0 / 0..1 / 1..3:
  - contact → end: 1.00 / 0.90 / 0.80 → 1.10 / 1.00 / 0.80 s;
  - gain: 1.20 / 1.44 / 1.83 → 1.33 / 1.68 / 1.74;
  - flat: 72 / 55 / 33% → 68 / 60 / 38%.
- Lighter carriers gain leg force relative to heavier tacklers, so broken
  tackles tend up (about 1.5 SE). That is exactly the risk Tanner named.

**Before promotion:**
1. A source for horizontal pushing force versus mass. Sled-push or
   force-plate studies would do it. The jump estimators bound b only within
   about 0.6–0.8.
2. Bracketing arms at b = 0.6 and 0.8 on the same controls.
3. Tackle-outcome controls on the same operator as NFL: broken-tackle rate
   by carrier mass and contact class, and after-catch contacts.
