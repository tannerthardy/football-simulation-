# Effective mass at first contact: design note

Flex, 2026-11-10. Phase 1 of `docs/reviews/2026-11-10-effective-mass-plan.md`. This note starts with Gate 0, the NFL
course that decides the law's shape. The derivation and bench follow in later sections; no engine change yet.

## Gate 0: the front-on contact course (Phase 0)

Operator `scripts/diag/run-operators/frontcourse.py`, the same code on both sources. It runs on front-on first contacts
at −1..3 yd on zone runs.
- **NFL:** 2022 tracking (Run Game's run; stored in `frontcourse-nfl.json` and `nfl-2022.txt`). 556 contacts, 86% of
  them torso collisions.
- **Sim:** the pinned 1,321-run set at run-ref-4. 169 contacts, 96% torso collisions.
- **Masses:** the NFL file carries no weights, so the momentum column is omitted.

Approach speed 3–5 yd/s (NFL n 312, sim n 123). Speed along the approach axis, yd/s, and separation, yd:

| | −0.1 | 0 | +0.1 | +0.2 | +0.3 | +0.5 | +1.0 s |
|---|---|---|---|---|---|---|---|
| NFL runner | 4.26 | 4.00 | 3.74 | 3.42 | 3.12 | 2.48 | 1.31 |
| Sim runner | 4.64 | 4.52 | 3.21 | 1.82 | 1.76 | 1.27 | 1.22 |
| NFL hitter | 0.23 | 0.29 | 0.33 | 0.52 | 0.62 | 0.92 | 0.89 |
| Sim hitter | 0.08 | −0.14 | 0.47 | 1.30 | 1.04 | 0.77 | 0.51 |
| NFL separation | 1.20 | 0.86 | 0.58 | 0.49 | 0.52 | 0.72 | 0.92 |
| Sim separation | 1.26 | 0.80 | 0.52 | 0.52 | 0.51 | 0.52 | 0.55 |

- Gain: NFL +2.67 = hitter +0.87 + relative +1.34, contact to end 1.5 s. Sim +1.30 = hitter +0.73 + relative +0.38,
  contact to end 0.9 s.
- At +0.2 s, a blocker is still on the hitter on 55% of NFL contacts against 39% in the sim. A second tackler is
  there on 37% against 17%.

**The three answers:**
1. **Speed kept at +0.1 s.** The NFL runner keeps 94% of his pad speed (86% at +0.2 s). The sim runner keeps 71%,
   then 40%. At 5+ yd/s the NFL keeps 96% at +0.1 s (5.61 → 5.40).
2. **When the courses separate.** In the first exchange, so the plan's point 5 alternative is ruled out. The sim
   loses 1.3 yd/s in the first 0.1 s and 2.7 by 0.2 s; the NFL loses 0.26 and 0.58, and its decay is gradual
   through +1.0 s.
3. **The hitter's displacement** is about a third of the NFL gain (0.87 of 2.67). The NFL hitter is carried back
   steadily, from 0.3 to 0.9 yd/s over 0.5 s. The sim hitter is knocked to 1.30 yd/s by +0.2 s, then slows. The sim
   exchange is one impulse; the NFL's is a sustained push.

**A fourth reading the plan did not ask for: the bodies do not stay glued.**
- NFL centres reach torso distance (0.49 yd at +0.2 s) and then open again (0.92 yd at +1.0 s). Meanwhile the runner
  still out-runs the hitter by about 3 yd/s at +0.2 s.
- Closing along the line of centres falls much faster than the runners' relative speed along the approach. So the
  NFL contact turns tangential: the runner slides off a shoulder, or goes through it.
- Sim centres sit at 0.52 yd for the whole second: a central, sticking contact.

**What this means for the law:**
- The first exchange must transfer far less momentum per tenth of a second than a whole-body inelastic row does.
  Gate 0 asks for about 0.3 yd/s lost in 0.1 s at 4 yd/s, against today's 1.3.
- The contact must be able to go tangential.

Mechanism 1 (a pitching upper body with a lower effective mass at the contact point) addresses the first. The second
is contact geometry: the offset between the line of centres and the runner's path, and friction at the pads. Neither
is a separate knob to tune, but both are inputs the bench must sweep. The bench (next section) checks whether the
two-part body, with sourced parameters, gives a 0.3 yd/s first-tenth loss for a central hit. If it cannot, the
tangential share is the leading candidate, and that would be the re-diagnosis.

### Contact geometry is a minor part (Gate 0, second run)

`frontcourse.py` also reports the hitter's lateral offset from the runner's path. Median offset at closest approach,
and share central (< 0.15 yd), for all 3–5 yd/s contacts:

| | Offset at closest approach | Central |
|---|---|---|
| NFL | 0.31 yd | 21% |
| Sim (run-ref-4) | 0.24 yd | 27% |

On today's World (`scripts/diag/effective-mass/bench.mts`), a hit offset by about 0.2–0.3 yd keeps about half the
runner's speed at +0.1 s. The NFL keeps 94% at that offset. So the difference in geometry is worth perhaps 0.05–0.1
of speed kept; the exchange law is the gap.

The bench's today's-law baseline (seed 3: runner 91 kg, hitter 111 kg; speed kept at +0.1 s):

| Approach | Central | 0.2 yd | 0.4 yd |
|---|---|---|---|
| 4–7 yd/s | 40–43% | 49–54% | 72–100% |

- A central hit glues the bodies (separation 0.49–0.52 yd at +1.0 s).
- A 0.4 yd offset lets the runner slide past.
- Pair momentum with no ground force is exact (error 1.7e-13).

## Gate 1 on paper: the two-part body cannot reach the NFL course

**Model** (`scripts/diag/effective-mass/chain.py`, stand-alone). Each player is a planar chain:
- an upper body (head, arms, upper and middle trunk: 49.1% of mass, de Leva 1996) pitching about the hip on a trunk
  spring;
- a lower link (pelvis and legs: 50.9%).

The pads meet through the engine's contact (9 Hz, critically damped). There is no ground force, which isolates the
exchange. The runner is 96 kg at 4 yd/s; the hitter is 117 kg.

**Sourced inputs** (research summary; primary sources are named, de Leva to be checked against the paper before any
value is hard-coded):
- trunk stiffness: 1,000–2,200 N·m/rad with reflexes, damping small (Cholewicki et al. 2000); about 110 N·m/rad
  without reflexes (Brown & McGill 2009);
- hip-extension torque: 2.03 ± 0.45 N·m/kg in university rugby players (Harrison et al. 2013);
- tackle peak force: 1.66–2.0 kN (Usman 2011) and 2.44–3.40 kN (Seminati; rugby).

No study gives torso effective mass in a tackle, or a carrier's speed kept after contact. Gate 0 is the only target.

**Result.** Runner pad speed kept at +0.1 s:

| Body | Kept at +0.1 s | Note |
|---|---|---|
| Rigid (identity) | 38–39% | matches today's point mass |
| Two-part, any sourced trunk stiffness, pads at 0.60–0.67 of stature | 41–46% | |
| Two-part with the contact softened from 9 Hz to 1.5 Hz | 44% (38% at +0.2 s) | |
| NFL (Gate 0) | 94% (86% at +0.2 s) | |

Articulation changes where momentum goes inside the body, not how much the pads exchange. With no ground force, the
pair reaches its common velocity (about 1.8 yd/s) within 0.1–0.2 s whatever the body's structure, as the plan's
point 1 says.

**What the NFL course actually implies.**
- At 3–5 yd/s over the first 0.3 s, the NFL runner slows from 4.00 to 3.12 yd/s: an average of about 255 N on 96 kg.
  The hitter speeds up from 0.29 to 0.62 yd/s, about 120 N.
- Through that time the centres stay about 0.5 yd apart, with 2.5–3 yd/s of relative speed along the runner's path.
  So the bodies are passing shoulder to shoulder, with arm-level forces, not colliding chest to chest.
- In the sim the same window needs about 800 N on average on the runner. The two-body model's peak contact force is
  about 22 kN at 9 Hz, against measured tackle peaks of 1.7–3.4 kN.

**Re-diagnosis.** This is attempt one of two under the plan's stop rule, and it points at contact geometry, which my
earlier "geometry is minor" reading got wrong:
- Every sim body is an isotropic disc of radius about 0.3 yd for torso contact.
- A real torso is about 0.27 yd half-wide at the shoulders but only about 0.15 yd half-deep.
- So the same 0.3 yd lateral offset (NFL and sim offsets match: 0.31 vs 0.24 yd) is a glancing shoulder contact for a
  real body and a central disc collision for a sim body.
- The offset distributions match; the shape that turns an offset into a glancing contact does not.

**Proposed second attempt (for Tanner and Integration to decide before code):** a torso contact shape that is wider
than it is deep, oriented by each body's facing.
- Its half-width and half-depth come from anthropometry (shoulder breadth and chest depth with pads), not from yards.
- It is judged on the same Gate 0 course (speed kept, separation reopening), the contact's peak force against the
  1.7–3.4 kN tackle measurements, and the plan's controls.
- The two-part pitch can be layered on afterwards if the fall direction still needs it.

## Attempt two, checks before deciding (Integration's doubt about shape)

**Check 2, shape bench** (`scripts/diag/effective-mass/shape.py`, stand-alone). Rigid planar bodies with yaw, at the
engine's 9 Hz contact, with pad friction μ 0.4 and no ground force. The runner is 96 kg at 4 yd/s; the hitter is
117 kg. Two contact shapes:
- **disc**, at the engine's radius law (0.267 + 0.311 = 0.578 yd);
- **capsule**, 0.27 yd half-wide and 0.15 yd half-deep (anthropometric estimate with pads).

Runner speed kept from first touch:

| Offset | Disc | Capsule, square, yaw fixed | Capsule, square, yaw free | Capsule, side-on, yaw fixed | Capsule, side-on, yaw free |
|---|---|---|---|---|---|
| 0.20 yd | 39% | 38% | 51% | 38% | 58% |
| 0.31 yd (NFL median) | 46% | 38% | 62% | 56% | 68% |
| 0.40 yd | 58% | 47% | 72% | 91% | 92% |

- **Integration was right: shape alone does not help.** A square flat front exchanges more along the path than a
  disc does.
- **What helps** is the hit turning the bodies (yaw free), and a hitter who is already side-on.
- **No variant reaches the NFL's ~92% at its median offset.** Only a side-on hitter at 0.4 yd does, which is
  effectively bodies passing.
- **Peak force is 18–22 kN in every case**, against measured tackle peaks of 1.7–3.4 kN. The spike is the contact's
  damping term at first touch (2 × reduced mass × 2π·9 Hz × closing speed ≈ 21 kN), independent of shape. It is a
  sourced defect of the torso contact law that has nothing to do with yards.
- **On sensitivity:** speed kept depends on offset ÷ (sum of radii). For the disc sum of 0.578 yd, 0.2 yd is a 20°
  contact normal and 0.4 yd is 44°. That is a steep curve but not a cliff; radius matters, though it is not the
  whole story.

**Check 1, facing at contact** (`frontcourse.py`, aligned course; NFL export now carries orientation 'o'; sim dump
carries facings). Sim, pinned set, run-ref-4, at torso distance:

| | Hitter angle to square (median) | Hitters side-on (≥ 45°) | Runner angle to his path |
|---|---|---|---|
| All | 37° | 42% | 4–5° (16° by +0.3 s) |
| Blocked, closing 3–5 | 53° | 63% | |
| Free, closing 3–5 | 29° | 17% | |

The NFL side needs the export rebuilt with 'o' (Run Game).

### Ground force is the missing term; the contact law sets the force, not the yards

**Leg drive** (`shape.py`, second table). Each body pushes at a share of its ground-force limit (1.25 × weight, the
engine's in-game limit): the runner forward while under his 4 yd/s request, the hitter toward the runner. Today's
contact law, offset 0.31 yd, hitter drive 28%. Speed kept at +0.1 / +0.2 / +0.3 s from first touch:

| Runner drive | Disc | Capsule square, yaw free | Capsule side-on, yaw free |
|---|---|---|---|
| none | 46 / 46 / 46% | 62 / 62 / 62% | 68 / 68 / 68% |
| in-game shares (runner 14%, hitter 28%) | 42 / 46 / 51% | 62 / 66 / 71% | 68 / 73 / 78% |
| runner at full limit | 63 / 93 / 100% | 88 / 100 / 100% | 95 / 100 / 100% |
| NFL from torso distance | ~92 / ~85 / ~78% | | |

- At the drive the game's runners actually deliver, every variant stays where the game is.
- With the runner's feet near their limit during contact, even today's disc recovers, and the yawing shapes reach the
  NFL course (they overshoot it, so the NFL runner is driving at less than his full limit).
- **So the first question for attempt two is why the sim runner's feet deliver only about 14% of their limit during
  contact.**
- The leading suspect is the tackle bond's stride hold. A hold on the legs removes "the share his held legs would
  deliver" from his drive along his travel (`world.ts`, bound stride), and a hold forms at contact on 67% of front-on
  hits.
- Next suspects: support availability once the tip term puts his capture point behind his base, and the lean law's
  cap at the felt load.
- This is measurable without code: decompose his ground force per tick into these causes.

**Contact law options against the measured 1.7–3.4 kN** (offset 0.31 yd, all drive levels):

| Law | Peak force | Speed kept, no drive | Blocks (same torso row) |
|---|---|---|---|
| today: 9 Hz, critically damped | 18–25 kN | 46–68% | — |
| ramped damper (Hunt–Crossley, damping ∝ compression, α 0.3 s/m) | 7.6–12.5 kN | 31–62% | no change at steady state; damping acts only while compressing |
| compliant layer: 0.12 m (pads, tissue, arms) before the stiff core, ramped damping | 3.8–6.9 kN (side-on 3.8–4.6) | 35–67% | a steady 1,500 N push compresses the layer about 3 cm more than today |

- **A lower frequency alone is ruled out for blocks.** A 3.4 kN peak at 4 yd/s needs about 1.4 Hz, and a steady
  1,500 N push would then sink the bodies about 0.3 yd into each other.
- **The compliant layer is the only law near the measured range.** Its stiffness (about 48 kN/m for the pair) is
  calibrated to the collision energy over the layer depth. That is a sourced force target, not yards; it must be
  checked at other closing speeds.
- **Softer contact slightly lowers speed kept**, because the momentum is the same and coupling lasts longer. Step 1
  is therefore justified by the force, not by yards, and is expected to need step 2 (yaw) and the leg-drive repair to
  move the course.

### Why the runner's feet do so little in contact (decomposition)

`scripts/diag/effective-mass/drive-decomp.mts` covers every tick of the 0.3 s after a front-on first proximity (966
ticks on the pinned set, run-ref-4). It reports the runner's downfield ground impulse as a share of its limit (the
limit is 1.25 × weight of traction):

| Runner's state | Share of ticks | Ground share (median) |
|---|---|---|
| Off his feet | 14% | −0.18 |
| Up, availability ≥ 0.5 | 68% | 0.25 |
| Up, availability < 0.5 | 18% | 0.22 |
| Up, a holder hanging on his legs (stride hold) | 4% | 0.32 |
| Up, available, not held, request ≥ 1 yd/s above his speed | 7% | 0.32 |

- **The stride hold is rare and support is usually fine.** The cap is the leg-strength budget: `pushForce` ×
  force-velocity × facing × availability. That is about 1.0 body weight × 0.82 at 1.6 yd/s, roughly 0.55 of the
  traction limit, and an offset contact points part of the push sideways.
- **His lean sits at about half the felt load** (382 against 740 kg·yd/s²). In game he delivers 0.25–0.32 of the
  limit, about half his cap.
- **So "full limit" in the table above asked for more force than his legs have.** At the strength cap (0.55), offset
  0.31 yd:

| Body, law | Kept at +0.1 / +0.2 / +0.3 s | Peak force |
|---|---|---|
| Disc, today | 50–53 / 66–70 / 84–89% | 22.3 kN |
| Capsule square, yaw free, today | 73–74 / 92–93 / 100% | 24.6 kN |
| Capsule side-on, yaw free, today | 81 / 99–100 / 100% | 20.5 kN |
| Capsule side-on, yaw free, compliant layer | 83 / 100 / 100% | 4.4–4.5 kN |
| NFL | ~92 / 85 / 78% | 1.7–3.4 kN measured |

**Reading:**
- The strength the runner already has is enough if he uses it during contact.
- The compliant layer and yaw then give the right force and close to the right course.
- The course shape still differs: the sim dips deeper first and recovers fully, because the runner re-accelerates to
  his request, while the NFL decays steadily. That needs looking at once the pieces are in.
- **The open question is why the in-game drive is half the cap.** The next look is inside World's ground-force
  allocation: lean target against capacity per tick, the bond's `push` value, and the angle of the felt load.

### Inside the allocation: the push into the load is starved (step 3's cause)

`scripts/diag/effective-mass/drive-alloc.mts` covers the same 0.3 s window, every tick, for runner and hitter. Values
are shares of each player's own traction limit; directions are relative to the runner's path. The strength cap is
`pushForce` × force-velocity × facing × availability.

| On his feet | Cap | Delivered | Along path | Lean into the load | Felt load | Request / velocity change / ground-force direction |
|---|---|---|---|---|---|---|
| Runner, free running before contact (control) | 0.51 | 0.48 | 0.02 | 0.00 | 0.00 | 0° / 40° / 80° (speed 5.0 of a 5.1 request) |
| Runner, no grasp on him | 0.49 | 0.48 | 0.03 | 0.00 | 0.03 | 9° / 40° / 76° |
| Runner, two-arm grasp | 0.52 | 0.49 | 0.22 | 0.05 | 0.97 | 10° / 25° / 47° |
| Runner, one-arm grasp | 0.51 | 0.49 | 0.16 | 0.10 | 0.48 | 9° / 28° / 61° |
| Hitter, all | 0.67 | 0.60 | −0.43 | 0.24 | 0.64 | (pushes back along the axis) |

- **The runner already delivers his whole strength cap, but most of it is sideways.**
  - The gait spends its envelope on steering: the share left over after forward drive goes to the cut, free running
    included.
  - Forward drive in contact is capped by the tempo law. At 2.6 of a wanted 4.9 yd/s that is (4.9 − 2.6)/1.3 × 9/4.9
    ≈ 3.2 yd/s², about 0.27 of his limit, matching the 0.16–0.22 delivered.
  - The lean is the law for pushing into a felt load. It gets only what the locomotion leaves inside the strength
    budget: 0.02–0.10.
- **The hitter's force is mostly along the axis.** He pushes back on the runner at 0.43 of his limit with a lean of
  0.24, so he out-pushes the runner.
- **Integration's two questions:**
  1. A hand at reach does not cost him his legs: the stride hold is 0 in every group, because it needs a holder
     hanging off his feet.
  2. The target for the repair is a direction, not more force. He has the force and spends it steering; the NFL
     course needs about 0.4–0.5 of his limit along the path during the first tenth (bench, strength cap).
- **Step 3's mechanism.** When a felt load opposes his request, the push into it should take priority within the
  strength budget over steering. Equivalently, forward drive against a load should come from the force-velocity
  envelope, not from the tempo law, which is built to level off a free runner at his wanted speed.
  - Today the allocation gives locomotion priority and the lean the remainder.
  - It is a World allocation rule, judged on the first tenth and peak force on the bench, and in the game on the
    aligned course where the hold exists.

### Correction: there is no allocation-priority defect; the line rows and a tick-level split

The section above inferred "his strength goes to steering, the lean is starved by priority" from medians of separate,
unsigned angles. Signed, per-tick measures do not support it. Integration's three checks, all no-code:

**1. The line (`scripts/diag/effective-mass/drive-alloc-line.mts`, 4 live games, seeds 7–13, engaged OL-DL 0.1–0.6 s
after engagement).** "Into him" is the axis to his opponent. "Force off the asked change" is the per-tick angle between
his ground force and the velocity change his request asks for.

| On his feet | Ticks | Cap | Delivered | Into him | Lean | Felt | Request to "into him" | Force off the asked change |
|---|---|---|---|---|---|---|---|---|
| Run block, OL | 8,110 | 0.77 | 0.65 | 0.56 | 0.35 | 0.61 | 39° | 17° |
| Run block, DL | 8,091 | 0.70 | 0.64 | 0.44 | 0.28 | 0.61 | 77° | 16° |
| Pass block, OL | 16,727 | 0.98 | 0.65 | 0.56 | 0.32 | 0.59 | 92° (sliding) | 9° |
| Pass rush, DL | 16,817 | 0.59 | 0.52 | 0.38 | 0.19 | 0.60 | 37° | 18° |
| Runner, 0.3 s after front-on contact | 834 | 0.51 | 0.49 | — | 0.02 | 0.66 | 9° to his path | 14° |

- On the line the lean is not starved: 0.19–0.41 of each man's limit.
- **Everyone's force lands near the change he asks for, the runner included** (9–18°).
- The rule I proposed (lean takes priority over steering) is **withdrawn**:
  - It would turn a pass rusher's force onto the blocker's axis (load 16° off, his request 37–39° off) and away from
    his rush angle. That is a change of technique, not a repair.
  - It would also do little for run blockers, whose request already points within 25° of their man when the load
    opposes it.

**2. Allocation or request.** Neither turns him.
- His request is 9–10° off his path; his travel is 11–15° off.
- Split by whether he is at his strength cap (`drive-alloc.mts`, AT OR BELOW block):

| On his feet | At cap (≥ 0.95) | At cap: force across / felt load across / along | Below cap: delivered of cap; push 0 |
|---|---|---|---|
| Runner, free running (control) | 37% | 0.51 / 0.00 / −0.15 (cornering) | 0.19 of 0.48; push 0 on 97% (no load) |
| Runner, 0.3 s after contact | 63% | **0.31 / 0.29** / 0.17 | 0.36 of 0.56; push 0 on 35% |
| Hitter, 0.3 s after contact | 56% | 0.30 / 0.25 / −0.43 | 0.55 of 0.79; push 0 on 0% |

  - **At his cap, his sideways force equals the sideways part of the load on him.** He spends about 60% of his capped
    force holding his line against the off-centre push of the hit; 0.17 is left for forward drive.
  - The hitter resists the same lateral load (0.30 against 0.25) but has the larger budget. He is being driven
    backward, so force-velocity gives him eccentric credit, up to 1.2× isometric. The runner pushes concentrically at
    2.6 yd/s.
  - Both are the laws working as written:
    - the lateral force is the reaction to a real lateral load;
    - the force-velocity asymmetry is physiology.
  - The ground force is persistent, not chatter: 0.82 window persistence in contact, 12% of ticks reverse.
- **One controller item (Run Game's):** on 35% of the runner's below-cap contact ticks the intent's push is 0. That is
  about 13% of his contact ticks; on 25% of below-cap ticks a felt load gets no lean, 65% of those with push 0.

**3. The choice to cut stays his.** No allocation rule is proposed, so nothing constrains it. Any later change keeps the
request deciding the direction.

**What step 3 becomes.** The in-contact drive is about half his strength cap because the off-centre hit loads him
sideways and he holds his line. That points back to steps 1 and 2:
- **The contact law:** a 9 Hz stiff row delivers the lateral load as an 18–25 kN spike, against measured 1.7–3.4 kN
  tackle peaks.
- **Yaw.** Run Game's re-export (below) has NFL hitters at 43° from square at torso distance, against the sim's 37°.
  That is close. By +0.3 s the NFL hitters have turned to 64–80°, so the contact turns tangential. Whether the sim's
  hitters turn after contact is the next check (the sim's +0.3 s facing). A tangential contact carries less of the
  lateral load the runner has to fight.

### NFL torso angles (Run Game's re-export with orientation, weeks 1–9)

`frontcourse-nfl.json` is replaced by the re-export: speed and offset blocks identical, aligned groups now carry torso
angles. The pretty file's sha256 starts f0ac9a3f with the writer's trailing newline. The `=== frontcourse` block in
`nfl-2022.txt` is regenerated from it.

Blocked hitters are more side-on than free ones (47°, 52% side-on at closing 3–5, against 28°, 27%), as an engaged DL
should be: the hitter angle is not mirrored.

Sim side: the reference engine (run-ref-7 @ 3145cb06), zone runs from the fixed run set. The dump was regenerated
because it carries facing, then run through the same `frontcourse.py`. Median hitter vs square / runner vs his path,
hitter side-on share:

| Group (aligned on torso distance) | NFL at torso | NFL at +0.3 s | Sim at torso | Sim at +0.3 s |
|---|---|---|---|---|
| All (NFL n 556, sim 159) | 43° / 23°, 49% | **64° / 35°, 62%** | 37° / 5°, 42% | **41° / 16°, 45%** |
| Closing 3–5 (260, 79) | 42° / 23°, 48% | 69° / 33°, 63% | 43° / 4°, 49% | 41° / 16°, 46% |
| Blocked, closing 3–5 (179, 54) | 47° / 21°, 52% | 75° / 31°, 67% | 53° / 7°, 63% | 57° / 17°, 57% |
| Free, closing 3–5 (37, 18) | 28° / 31°, 27% | 36° / 66°, 43% | 29° / 2°, 17% | 30° / 11°, 22% |
| Closing 5+ (103, 54) | 46° / 18°, 51% | 74° / 26°, 67% | 30° / 8°, 28% | 44° / 16°, 46% |

- **The hitters' facing at contact matches. What doesn't match is what happens after:**
  - NFL hitters turn 20–30° in the first 0.3 s;
  - sim hitters turn about 0–5° (closing 3–5: 43° → 41°; blocked: 53° → 57°).
- **The runner differs from the start.**
  - NFL runners meet the hit 18–31° turned off their path (a shoulder presented) and are 26–66° off by +0.3 s.
  - Sim runners are square to their path (2–8°) at contact and 11–17° by +0.3 s.
  - That is partly a controller question (the facing he asks for into contact) and partly physics (whether an
    off-centre load turns a body at all).
- **Separation in the sim stays at the touching distance** (0.50–0.57 yd at +1.0 s). In the NFL it reopens to
  0.6–1.15 yd.
- These support step 2. A contact that turns the bodies goes tangential: the lateral load the runner fights is shed
  as rotation and slide, not held by his legs. This is the yaw-free capsule result on the shape bench:
  - 62–68% kept at no drive;
  - 73–83% at his strength cap.

**Contact yaw in the code today.** Production World runs `handContact: 'center'` (`src/sim/playsim.ts:107`, the
setup's default), so torso contacts apply no moment at all.

The experimental `'patch'` mode does apply one (`contactPatch` and `solveContact`, `src/physics/world.ts` around
2210–2245): normal and friction impulses act at a radius-weighted contact point and update `spin`. On discs the
normal passes nearly through both centres, so in that mode the turn comes mostly from contact friction.

Step 2's first trial should be that existing law with the capsule shape, before anything new.

**Run Game's test of the push-0 item.** The carrier never asked for push outside a bond: `tackle.ts` sets push 1
there; elsewhere push was undefined, which World reads as 0.

Run Game's trial, CARRIER_DRIVE (not committed), sends push 1 on every carrier command. On run-ref-8 @ 8e1ad2c5 over
570 matched zone runs it did not help:

| Measure | Result |
|---|---|
| Outside zone, paired | −0.25 yd (SE 0.17); runs gaining ≤ 0 yd 18 → 20% |
| Inside zone, paired | +0.10 yd (SE 0.17) |
| Front-on first-contact gain, closing 3–5 yd/s | +0.80 → +0.66 |
| Front-on first-contact gain, closing 5+ yd/s | +0.94 → +1.42 (n 28) |

It was reverted. The missing push is a real gap, but not what costs him the exchange. To re-test it on top of a
compliant contact law (step 1): `push: 1` on both returns of `BallCarrier.command`.

## Step 2, attempt two: the engaged pair (2026-11-10)

The trench gate for `CONTACT_PATCH` exposed a defect on develop: solo OL-DL pairs turn a median 60° from 0.5 to 1.5 s,
against the NFL's 43° (`trench2`).
- Run Game's ablations show the excess isn't in the OL's requests. With REACH_CARRY=0 and hands steer = 0 nothing
  changes; with the engaged lateral request zeroed the pair turns 80°.
- `pair-spin.mts` puts it in the hands row: a pushing pair offset 0.2 yd twists 21° a second in centre mode, because
  the row acts along the line between centres.

**`HANDS_CHEST`, merged and on (run-ref-9).** The row acts between the closest points of the two shoulder lines
(half-span 0.12 yd, anthropometric).

| | NFL | Before | `HANDS_CHEST` |
|---|---|---|---|
| Bench: offset pair, turn in 1 s | | 21° | 5° |
| Zone solo rotation | 43° | 60° | 56° |
| DL depth at 2.0 s | +0.70 | +0.76 | +0.69 |
| Solo DL driven back from 0.5 s | 16% | 8% | 12% |

- Its adverse scorecard row, "blocker on a man out of the play" (108 → 123), comes from release, not the grip.
  - `run-block-ends.mts`: separation ends are unchanged (56.5 → 55.0 per 100 runs). The DL's "runner passed" release
    falls (165 → 156) because the pair no longer turns.
  - The OL has no release rule for a man leaving the play (RUN-12, Run Game).

**`HANDS_FRICTION` (off, research).** What's left of the rotation is the DL slipping across while the hands'
tangential load sits at its steer limit (67% of engaged run ticks; slip p75 1.12 yd/s there, 0 below; `pair-lateral.mts`).
- The row had no friction from its own pressing load. With friction at the torso coefficient (0.35):

| | NFL | `HANDS_CHEST` | + friction |
|---|---|---|---|
| Zone solo rotation, median / p75 | 43° / 86° | 56° / 83° | 27° / 72° |
| DL depth at 2.0 s | +0.70 | +0.69 | +0.47 |
| Driven back from the snap | 14% | 6% | 11% |

- It overshoots. The coefficient isn't tuned to land on 43°. The missing mechanism is likely the grip being broken
  (the DL's hand strike), parked as `GRIP_BREAK` in `docs/PARKED.md`.

**The runner's grasp: (b), first result, `GRASP_ARMS` (off).** An upper grasp in centre mode had no lever arms. The
flag places them at the radius-weighted surface point, as the patch law does. Aligned on torso distance, all front-on
contacts:

| | NFL | Default | `GRASP_ARMS` | + `CONTACT_LAYER` | Patch (run-ref-8) |
|---|---|---|---|---|---|
| Tangential slip at +0.1 s | 2.69 | 0.49 | 0.52 | 0.73 | 1.43 |
| Line of centres turned by +0.3 s | 80° | 8° | 12° | 16° | 45° |
| Hitter from square at +0.3 s | 64° | 40° | 41° | 47° | 69° |

- Lever arms alone barely release the pair. In centre mode each body's yaw motor (`turnBodyResponse`, torque up to
  traction × support radius) holds it near its requested facing, so a grip at the surface still brakes the centres.
- Patch mode released the pair through more than the grasp's arms: torso-contact moments, and contact spin written
  into facing within the solve.
- Which part of the patch law does the releasing is the next diagnostic, before another law.

## The finish: unfinished holds and HIP_BRACE (2026-11-10)

**Holds that never finish** (`unfinished-holds.mts`): 364 grasps last at least 0.3 s with the carrier averaging at
least 4 yd/s. They split by what the holder asks for:

| | Running along (253, 70%) | Towed (111, 30%) |
|---|---|---|
| Holder asks / moves along the carrier's path | 4.52 / 4.61 | 2.15 / 4.66 |
| Holder's ground force (share of his limit) | −0.07 | −0.43 |
| Pull on the carrier | −0.32 g | −0.43 g |

- **Running along is a tackler decision** (`tackle.ts` plant); Defense owns it.
- **Towed holds are physics, and the tow accounts exactly** (`tow-forces.mts`):
  - The runner keeps driving at 0.31–0.37 of his traction while hauling a man.
  - The grasp's tension (0.55 g) sits below the downed holder's friction (0.74 g): the arms pay out.
- **`UPPER_HANG`** (the holder's weight hung on an upper grip) had no effect and was reverted.
- **`hang-bench.mts`:** no runner goes down under any single pull; the balance peak is at most 0.22 of the fall
  threshold.

**`HIP_BRACE` (off).** Upper grasps are hip-braced like thigh holds, and the share of hip torque spent bracing comes
off leg drive. Until `tackle.ts` sets `GraspJoint.height`, a hold with leg share below 0.35 acts at chest height
(0.70 of stature).
- **Bench** (`brace-bench.mts`), firm shoulder hold from a downed 111 kg holder:
  - drive falls from 0.49 to 0.24 of traction;
  - speed at +1.0 s falls from 3.07 to 1.91;
  - heavier runners last longer, and one-arm grabs alongside are unaffected;
  - no runner falls: the hips brace about 240 of about 320 N·m.
- **Game:**

| | Ref-9 | `HIP_BRACE` | + `GRASP_PATCH` | NFL |
|---|---|---|---|---|
| Paired yards per run | | −0.67 (SE 0.04) | −0.17 (SE 0.05) | |
| Stuffs | 13.9% | 17.6% | 13.1% | 15.9–23.5% band |
| Broken a run | 0.167 | 0.115 | 0.136 | |
| Gain after contact; contact to end | 1.44; 0.9 s | 1.14; 0.7 s | 1.64; 0.9 s | 2.84; 1.5 s |

- **Front holds** end with the runner down 92% of the time, against 78%, in 0.35–0.50 s against 0.65 s.
- **Alone it over-finishes.** The temporary chest-height default puts waist holds (leg share 0.2–0.34) at chest
  height. The package result depends on where Defense sets real grip heights.

**Paired stuffs with the three flags (`stuff-dump.mts`, `square-hold.mts`; ref-10, 1,321 fixed runs).** Stuff = a
run of 0 yards or less. "Matched" plays have the same first contact in both arms (within 0.3 yd, same approach).

| | Stuff → gain | Gain → stuff | Stuffs | Mean change (yards capped at 20) |
|---|---|---|---|---|
| `GRASP_PATCH` alone | 78 | 15 | 191 → 128 | +0.57 (SE 0.05) |
| All three, matched contact (567 plays) | — | — | 93 → 73 | +0.01 (SE 0.12) |
| All three, all plays | 111 | 74 | 191 → 154 | +0.01 |

- **Of the 111 stuffs that gain with all three flags:**
  - 67 diverge before contact: line contact changes the play upstream (50 flips go the other way the same way);
  - 30 are the pair turning out of a front hold: the line of centres turns 0–40° → 30–108° by +0.3 s, then the
    runner falls forward; 26 of 30 gain under 2 yd;
  - 5 keep speed through the first hit; 3 have the first hitter slide off with no second man; 6 other.
- **NFL supports the turn.** The aligned NFL contact course turns the line of centres by a median 80° in 0.3 s (40°
  below 3 yd/s closing, 96° at 3–5). Ref-10 front holds turn 4–18°; with the flags, 42–87°.
- **Square hits still stop him.** On the bench (`square-hold.mts`), a driving runner held head-on at offset 0–0.05 yd
  turns at most 6° and is stopped. Turn grows with offset: 13–24° at 0.10 yd, 37–96° at 0.20 yd.
  - In games, nine matched front, unblocked hits at offset under 0.1 yd turn a median 59° and still stop him (gain
    after contact 1.48 → 1.27 yd, stuffs 2 → 3).
  - The turn there comes from the play (cuts, second bodies), not from the hold.
- **A hole to watch, not a fix:** at 0.2 yd offset the bench tackler spins at up to 5 rad/s. A wrapped grip holds
  around the back, not at one point, so it resists the bodies' relative yaw. The patch grasp acts at one point and
  cannot. The NFL turn rate does not yet show this is too much.

**What still separates the first-hit force from the measurements (`layer-bench.mts`).** `CONTACT_LAYER` peaks:
5.4 / 7.1 / 9.0 / 11.0 kN square at 3 / 4 / 5 / 6 yd/s. Measured peaks are 1.7–3.4 kN, over about 50–100 ms of
contact.
- **The layer is a spring.** It stops a closing speed v with peak F = v·√(kμ), in a half-period of π·√(μ/k).
  - Series k is 50 kN/m with 0.12 m total depth. The reduced mass μ of the 91 + 111 kg bench pair is 50 kg.
  - At 4 yd/s (3.66 m/s), F = 5.8 kN after 0.12 m of compression in a half-period of 100 ms.
  - The compression uses up the whole layer, so the 9 Hz core adds the rest (7.1 kN). At 6 yd/s the core carries
    more.
- **No sourced layer value closes it.** Reaching 3 kN at 3.66 m/s with μ = 50 kg needs k ≈ 13 kN/m. That means 0.23 m
  of compression and a 200 ms half-period, against the measured 50–100 ms. Pads and tissue are not that deep.
- **Effective mass closes it.** In the first 50–100 ms only the upper body takes part (49% of mass, de Leva 1996). That
  gives μ ≈ 25 kg, which with the same layer gives:
  - F = 4.1 kN at 3.66 m/s and 3.1 kN at 2.7 m/s;
  - a 70 ms half-period;
  - 8 cm of compression, inside the layer and short of the core.
- **The remaining factor of about √2 is the single rigid torso:** the full body mass meets the hit. That is mechanism
  1 (an upper body pitching about the hip), not a layer parameter. The layer values stay as they are.

**Why whole games seemed to lose twice the stuffs under `GRASP_PATCH` (2026-11-10).** All arms at Defense's
`HOLD_FINISH` head (9165275f) with `HOLD_FINISH` + `HIP_BRACE`, ± `GRASP_PATCH`. Stuff = 0 yards or less, as on the
scorecard (`metrics.ts`). The two samples were compared with different arms and different noise; the stuffs are not
missing.

| Sample | Finish | Package (+ `GRASP_PATCH`) | Change |
|---|---|---|---|
| Fixed 1,321 runs (`stuff-dump.mts`) | 17.4% | 12.7% | −4.7 |
| Whole games, 16 (`game-runs.mts`, seeds 11–41) | 17.3% (706 runs) | 12.2% (756) | −5.1 |
| Scorecard, 16 games, seed 11 | 16.9% (691) | 8.9% (682) | −8.0 (CI −10.9 to −5.2) |
| Earlier card (Integration) | 15.1% | 9.6% | −5.5 |

- **Definition:** both use yards ≤ 0, so the definition is not it. The fixed-set "3 points" (14.5 → 11.7) came from
  different arms: ref-10 against all three flags, including `CONTACT_LAYER`, and without Defense's heights. With the
  package's own arms the fixed set gives −4.7.
- **Composition:**
  - Backfield contact happens equally often: 43–44% of runs in every sample and arm.
  - Box counts and second men by +0.5 s match: median 5; two or more within 1.5 yd on 40% of backfield hits.
  - The scorecard's situational splits all move: ordinary downs 15.6 → 9.6%, short yardage 26 → 5%, goal line
    25 → 19%. The drop is spread across every situation, not concentrated in one.
- **Mechanism, the same everywhere:** a backfield hit stops the runner less often.

| Stuffs after a backfield hit | Finish | Package |
|---|---|---|
| Fixed set | 37.6% | 26.9% |
| Whole games | 37.9% | 25.2% |
| Contact deeper than 1 yd | 56% | 43% |
| Contact 0–1 yd behind | 24% | 12–15% |

  This is the turn-and-fall-forward of the paired classification above: the runner turns out of the front hold and
  falls past the line.
- **The 8.0-point card is a high draw.** A binomial SE is about 1.8 points, and two other 16-game samples give 5.1 and
  5.5.
- **Runs of 20+ that reach 40 are noise:**

| Sample | Finish | Package |
|---|---|---|
| Fixed set (same 9 plays reach 40 in both arms) | 9 of 21 | 10 of 27 |
| Whole games | 8 of 13 | 6 of 18 |
| Scorecard | 8 of 18 | 7 of 9 |

  The direction flips between samples.

**What the NFL does after a backfield hit, and the package's contact course (2026-11-10).** Zone runs. The NFL side is
2022 tracking (bdb2025, 2,984 runs). The sim side is the fixed set's 570 zone runs on develop 0baa3320 (Defense's grip
heights), via `dump-zone.mts`. Both sides go through the same code: `backfield.py`, with first contact as frontcourse's
proximity rule but no depth filter, and `frontcourse.py`.

| Zone runs | NFL | ref-10 | Finish (`HOLD_FINISH` + `HIP_BRACE`) | Package (+ `GRASP_PATCH`) |
|---|---|---|---|---|
| Stuff rate | 16.8% | 17.2% | 21.6% | 15.1% |
| First contact behind the line | 42.5% | 47.5% | 47.9% | 46.5% |
| …deeper than 1 yd | 23.4% | 19.6% | 19.8% | 19.1% |
| …0–1 yd | 19.1% | 27.9% | 28.1% | 27.4% |
| Stuffed after a backfield hit | 36.4% | 35.8% | 45.1% | 31.3% |
| …contact deeper than 1 yd | 52.7% | 50.9% | 64.6% | 46.8% |
| …contact 0–1 yd behind | 16.3% | 25.2% | 31.2% | 20.5% |
| Front-on contacts at −1..3 yd (frontcourse) | 556 | 173 | 174 | 166 |
| Gain after contact (yd) | 2.84 | 1.28 | 1.13 | 1.85 |
| Contact to end (s) | 1.50 | 0.80 | 0.70 | 1.00 |
| Tangential slip at +0.1 / +0.3 s (yd/s) | 2.69 / 1.25 | 0.43 / 0.15 | 0.42 / 0.09 | 1.24 / 1.15 |
| Line of centres' turn by +0.3 s (deg) | 80 | 7 | 6 | 36 |
| Runner speed at +0.5 / +1.0 s (yd/s) | 2.38 / 1.22 | 1.36 / 1.34 | 1.15 / 1.36 | 1.66 / 1.20 |

- **Backfield contact is somewhat too common:** 46–48% against 42.5%.
  - The excess is all 0–1 yd behind the line (27–28% against 19%).
  - Deep hits are slightly short (19–20% against 23%). That is a blocking and penetration question, the same in every
    arm.
- **Ref-10 matches the NFL's backfield stop rate (35.8% against 36.4%), not by depth.** It under-stops deep hits a
  little and over-stops shallow ones (25.2% against 16.3%).
- **The finish over-stops at both depths:** 64.6% and 31.2%.
- **The package is the closest by depth.**
  - 0–1 yd: 20.5% against 16.3%, about 1.3 SE high (n 156).
  - Deeper: 46.8% against 52.7%, about 1.2 SE low (n 109).
  - Overall: 31.3% against 36.4%. The difference is within about 2 SE.
- **The package's lower stuff rate comes from the depth mix, not from under-finishing.** Its overall 15.1% (NFL 16.8%)
  is partly the excess of shallow backfield hits, where both the NFL and the package stop the runner less often.
- **On the front-on contact course the package moves every row toward the NFL:**
  - gain after contact 1.28 → 1.85 (NFL 2.84);
  - contact to end 0.8 → 1.0 s (1.5);
  - slip at +0.3 s 0.15 → 1.15 (1.25);
  - turn 7 → 36° (80).
  
  The finish alone moves every row away from it.
