# Push contest: physics scoping note (no build)

Tools/Physics, 2026-11-24, for Integration and Defense. Reading of
`src/physics/world.ts`, `src/physics/support.ts`, `src/players/physical.ts`
and `docs/reviews/push-contest-traction.md` on develop `8f11146eb`. Nothing was
run for this note; the arithmetic below is on the staged pair's stated masses
and ratings and is a prediction, not a measurement. Flex's re-measure on
`d31271e42` is the only measurement quoted (both linemen at the traction limit,
about 1,550 N; rusher power x1.15 leaves the walk-back at 1.16 yd/s; blocker
mass x0.9 moves it 1.16 -> 1.57).

## 1. What a body can push with, and where strength enters

Per engaged body `i`, per tick (`World.feet()`):

- **Ground traction (the cap):** `traction = TURF_MU * m * g * clamp(1 - liftFelt / (m g), 0, 2)`.
  `TURF_MU = 1.1` (`support.ts`, unsourced). `liftFelt` is the smoothed vertical
  load the hands joints put on him (section 2).
- **Leg drive:** `legDrive = power * g * (m / 110 kg)^(0.69 - 1)` (`LEG_ALLOMETRY`
  on), `power = m * (0.55 + 0.75 * strength)` (`physical.ts`).
- **Pushing capacity:** `pushForce = min(legDrive, 1.1 m g)`, times the
  force-velocity factor (1 - v/vmax, up to 1.2 for yielding), directional
  factor, fatigue, availability, and `(1 - hipUsed)` (HIP_BRACE). The drive is
  finally clamped by `traction * a` (`capacity = min(max(|load|, strength), traction * a)`).
- **Through the hands:** the arm budget (`armForce = 0.75 power g`;
  `pressForce` = bench max when known) caps what the arms transmit
  (`allocateArms`). It does not add force; it bounds it.

Strength therefore enters in exactly three places: `power` in `legDrive`, the
bench `press` in the arm budget, and hip torque (`HIP_STRENGTH`). All three sit
**behind** the traction `min`. The `min` is the whole story for a pair at the
cap: the strength of a body whose `legDrive` exceeds `traction` is not used.
`legDrive / (m g)` is `(0.55 + 0.75 s)(m/110)^-0.31`, which exceeds 1.1 for a
110 kg man above s = 0.74 and for a 143 kg man only above s = 0.80. So a typical
line at s = 0.7-0.9 is at or near the cap, and what remains is
`traction = 1.1 m g`: **proportional to mass, independent of strength**. In the
staged pair the net push force between two cap-limited bodies is
`1.1 g (m_A - m_B)`, so weight decides, strength is inert, and equals never
move (Flex's matched pair: 0.00 at every `TURF_MU_SCALE`).

The force-velocity law does not relieve this: it raises the yielding man's
*strength* term to 1.2x, but the cap `traction * a` still bounds the result.
Once the yielding man is at the cap he cannot add resistance as the pair
speeds up, so a net traction difference accelerates the pair until the
controller or the support model ends it, rather than settling at a
force-velocity equilibrium.

## 2. Does the hand contact carry a vertical component?

Yes, and the normal-load transfer already exists (`PAD_LEVERAGE`, on).
`addLoad` takes the compressive horizontal load `press` along the line between
the two bodies and sets `rise = clamp((padHeight_j - padHeight_i) / d, +-0.6)`.
It adds `press * rise` to `liftImp[j]` and subtracts the same from `liftImp[i]`.
The higher man is lifted and the lower man is pressed down. That is:

- a **line-of-action** effect: the vertical component is the geometric result
  of where the two pads are, not an independently strong vertical force. A
  lineman cannot lift more than `press * 0.6`, and no vertical strength is
  spent;
- **conservative:** the two vertical loads are equal and opposite, so the
  pair's total normal load stays `(m_A + m_B) g`. No energy is credited, since
  nothing moves vertically;
- smoothed in `liftFelt` (kf) and applied to each body's traction as the
  factor `1 - liftFelt / (m g)`, clamped to [0, 2].

Pad height is `padHeightAt(posture)`: `comHeight * (0.67/0.55) * (1 - 0.4 *
posture * (0.4 + 0.6 bend))`. For two 6'3" linemen a posture gap of 0.4 moves
the pads by about 0.15 yd. Over a ~0.8 yd separation that is a rise of about
0.19, so about +-20% of body weight at a 1,400 N hand load. It is real and
Flex's trace shows it (69% of the DE's weight lifted at contact with pads
high), but it is a **modest, controller-set** transfer. It is zero for two
bodies at the same pad level, which is the staged pair.

## 3. Simplest law that lets the contest move load, and what is conserved

The load-transfer law you asked for is already the law above. What is missing
is not a transfer; it is that **strength is behind a cap proportional to mass.**
In increasing order of change:

1. **Nothing new in World.** Pad level is a controller choice (Defense's
   `SINK_LEAD`, Run Game's stance). The physics already rewards the low man
   (the traced DE at posture 0.42 loses 69% of his traction in 0.1 s). Fix
   the posture and the existing law moves load.
2. **Let strength bind: raise the cap relative to the leg force.** Flex's
   `TURF_MU_SCALE` is this experiment: above x1.25 nothing is traction-limited
   for the s9-39 pair and the drive becomes `legDrive`. That is one constant,
   `TURF_MU`, with no source in the docs (the cleat-turf literature Flex found
   gives peak traction coefficients we could not read in full). Changing it
   changes every ground interaction (section 5), so it needs the source first.
3. **A pair-level law for the vertical hands force** (a vertical force with its
   own strength bound that can exceed the pad geometry). I do not recommend
   it: it adds a vertical strength, and it breaks the rule that load comes
   from line of action. Conserved quantities would be the pair's total
   normal load, horizontal momentum off the ground contact (external only), and
   hand-force Newton pairs. The point is moot unless (2) fails.

I recommend (1) and (2) as the only items worth a decision; (2) is gated on a
source for the cap, not on code.

## 4. Predictions for the staged pair (arithmetic only)

Bodies from `contactFixture` pass pair (`anchor-staged.mts`; read from the
fixture, develop-era profiles), forces in N along the push axis:

| | Protector (C) | Rusher (DT_W) |
|---|---|---|
| Mass | 143.8 kg | 139.7 kg |
| `legDrive` | 1,650 | 1,528 |
| Traction `1.1 m g` | 1,551 | 1,507 |
| `pushForce = min` | **1,551 (cap)** | **1,507 (cap)** |

Both are at the cap, with `legDrive` only 6% and 1% above it. Net toward the QB
today is -44 N (the protector is ahead by a hair). Flex's three arms, and
the same arithmetic with the cap relaxed (`TURF_MU_SCALE` about x1.25, so that
`pushForce = legDrive`; leg force scales as mass^0.69 for the mass arm):

| Arm | Net toward QB, today (cap) | Net, cap relaxed | Flex measured |
|---|---|---|---|
| base | -44 | -122 | 1.16 yd/s |
| rusher power x1.15 | -44 (cap, no change) | +107 (1,757 vs 1,650) | 1.16 (no change) |
| blocker mass x0.9 | +111 (traction 1,396 vs 1,507) | -6 (1,534 vs 1,528) | 1.57 |

- **Today strength is inert and mass is everything.** Power x1.15 changes
  `legDrive` by 229 N and the pair by 0; a 10% mass cut changes the protector's
  push by 155 N, traction by traction.
- **With the cap relaxed strength becomes the largest term.** Power x1.15
  moves the pair by 229 N (from -122 to +107); the same 10% mass cut moves it
  by 116 N (from -122 to -6), against 155 N today. Mass falls to about three
  quarters of its present effect (leg force is mass^0.69, and the protector's
  `legDrive` sat 6% above the cap); strength goes from zero to twice the mass
  effect. The base net also moves, from -44 to -122 N, because the protector's
  6% strength surplus over the cap is now used.
- **Pad level** is untouched by relaxing the cap. With strength binding it
  should matter *more* for the pressed man (his cap rises, his `legDrive` does
  not, so pressing him adds nothing once he is leg-bound) and *less* for the
  lifted man (the loss comes off a traction he was already above). That is a
  prediction to test, not an assumption: it is where the cap-relaxed model
  could surprise.
- **Equal pairs** still never move unless pad level, hand placement or fatigue
  differ; (2) does not change the stalemate of matched bodies.
- **NFL's weight-flat walk-back (1.3-1.6 yd/s):** neither model reproduces it.
  Both keep the net force proportional to what separates the two men
  (mass today, mass^0.69 and strength after (2)); (2) shrinks the mass term and
  adds the strength one, and the NFL cell is flat in weight. A weight-flat
  contest needs a leg force close to mass-independent as well as an
  uncapped one; I do not see sourced physics for that. The walk-back category
  is also inferred from tracking (engaged, driven back), which CLAUDE.md rates
  weaker than a direct measurement: before building toward it, check on a few
  plays that the operator sees a driven-back lineman where the film shows one.

## 5. What else a change to the cap touches

`TURF_MU` is the shared traction coefficient. Any change reaches:

- **Tackles and run blocks:** the same `feet()` cap bounds a tackler's drive
  through a carrier and a blocker's drive through a defender.
- **Cuts and acceleration:** traction bounds locomotion and yaw; raising it
  frees hard cuts at speed (`traction * a`) and the cut-speed law
  (`2026-11-24-cut-speed`).
- **Recovery and falls:** `reserve` (the corrective effort after drive and yaw)
  scales with traction; so does the point at which a body falls.
- **Drive after a hold:** a held runner's drive goes through the same `feet()` cap, so a hold's cost to the runner moves too.
- **`TURF_MU_SCALE`** is the only place engaged bodies already get a separate
  coefficient. It is diagnostic and expires at review 2.

If the cap changes for engaged bodies only (what the diagnostic does), that is
an engaged-contact law, not a turf coefficient, and should be stated as such:
a lineman pushing from a low, planted stance digs his cleats into the infill
(shear, not Coulomb friction), so his effective coefficient differs from a
runner's cut. That would be the simplest coherent physics, but it needs the
cleat-shear source before it is more than a hypothesis.

## Asks

- **Integration:** go/no-go on a source search for the push coefficient
  (sources named in `push-contest-traction.md`).
- **Defense:** pad level at contact is the cheap lever. The physics already
  rewards the low man.
- **Flex:** a bench of the same pair at `TURF_MU_SCALE` 1.0 / 1.25 / 1.5 with
  equal and unequal strength, to test the predictions in section 4.
