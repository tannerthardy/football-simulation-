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

**Grasp onset: the weld, and friction on tension (`GRASP_SLIDE`, `GRASP_CLOSURE`; both off; 2026-11-10).** All arms are on
the package (`HOLD_FINISH` + `HIP_BRACE` + `GRASP_PATCH`), develop 0baa3320.

**First 0.15 s of a front-on grasp** (`slip-split.mts`, 218 fixed zone holds):
- **The grasp forms at arm's length.** It forms in the same tick as first proximity: centres 0.98 yd apart, against radii
  0.57. The pads have not met in 93% of holds; they meet about 0.05 s later.
- **The grasp row does most of the early braking of the pair's tangential slip:**

  | Source | Change of slip over the first 0.15 s (yd/s) |
  |---|---|
  | Grasp row | −0.46, all of the first tick |
  | Torso contacts | −0.23 |
  | Block hands | −0.10 |
  | Ground | +0.18 |

- **The grasp row acts as a weld.** Its tangential force is 0.13–0.18 g, only 12–17% of capacity, and 78–82% of holds
  are not slipping. The row holds the grip point at zero slip under any force below capacity.

**The laws:**
- **(A) `GRASP_SLIDE`** limits that row to CONTACT_FRICTION (0.35) × the hold's own tension.
- **(B) adds `GRASP_CLOSURE`:** the wrap's closed share stays rigid, 2.5 l² / (0.3 + 2.5 l²) for the joint's lock l.

**Bench** (`slide-bench.mts`):
- (A) raises arrival slip at +0.1 s from 1.95 to 2.60 yd/s at 0.3 yd offset, and from 1.23 to 1.36 at 0.2.
- A settled wrap still holds a runner cutting across: 0.29 → 0.46 yd by +0.5 s, not broken.
- Momentum stays exact, and a no-grasp world is bit-identical.
- (B) at an arriving lock of 0.5 is the package.

**Fixed runs:**

| | NFL | Package | (A) | (B) |
|---|---|---|---|---|
| Tangential slip at +0.1 / +0.3 s (yd/s) | 2.69 / 1.25 | 1.24 / 1.15 | 1.34 / 1.10 | 1.33 / 1.11 |
| Turn by +0.3 s (deg) | 80 | 36 | 37 | 38 |
| Gain after contact; contact to end | 2.84; 1.5 s | 1.85; 1.0 s | 1.97; 1.1 s | 1.88; 1.0 s |
| Hitter's own rotation by +0.5 / +1.0 s (deg) | 41 / 74 | 51 / 83 | 51 / 96 | 52 / 90 |
| Zone stuff rate | 16.8% | 15.1% | 12.3% | 13.2% |
| Stuffed after a backfield hit | 36.4% | 31.3% | 25.2% | 27.4% |
| Broken holds: front / side / behind | | 29 / 130 / 29 | 42 / 144 / 31 | 34 / 141 / 30 |

**Holds break no more often from behind:** 29, 31 and 30 of about 320 in the three arms. The lock at formation is a
median 0.39 everywhere (rigid share 0.56 under (B)).

**Neither law repairs the mechanism.**
- The weld is real, but releasing it barely moves the early slip: 1.24 → 1.34 yd/s against the NFL's 2.69.
- The rows that move, move away from the NFL: backfield stops, the stuff rate, the hitter's late rotation and front-hold
  breaks.
- So the grasp row's early braking is not what keeps our pair from sliding past in the first 0.1 s.

Both flags stay off as tested alternatives. The early-slip gap needs re-diagnosis before a second attempt. Open
questions:
- whether the runner arrives with less tangential velocity than the NFL's in the first place (slip at the grasp is
  1.41 yd/s);
- whether the NFL's pad-tracking proximity and our centre proximity are the same stage of contact.

**Where the early slip is lost: approach or collision (`approach.py`; 2026-11-10).** Front-on zone contacts, same code on
the NFL and the sim (frontcourse's contacts).

| | NFL | ref-10 | Package | Package + `CONTACT_LAYER` |
|---|---|---|---|---|
| Contacts | 556 | 173 | 166 | 169 |
| At proximity: slip, median (mean) (yd/s) | 1.77 (1.94) | 1.26 (1.66) | 1.45 (1.86) | 1.48 (1.94) |
| …brought by the runner / the hitter (means) | +1.25 / +0.69 | +0.89 / +0.77 | +0.99 / +0.87 | +0.98 / +0.96 |
| At proximity: closing speed (yd/s) | 3.38 | 4.51 | 4.46 | 4.40 |
| Runner speed; his angle to the line to the hitter | 4.21; 25° | 4.66; 21° | 4.67; 21° | 4.65; 21° |
| Hitter speed; his velocity's angle to the line to the runner | 1.80; 108° | 2.06; 79° | 2.10; 80° | 2.10; 80° |
| Centre distance at proximity / the frame before (yd) | 0.87 / 1.20 | 0.78 / 1.22 | 0.79 / 1.22 | 0.79 / 1.21 |
| Aligned on torso distance: closing at +0 (yd/s) | 1.94 | 2.96 | 2.75 | 3.26 |
| Slip at +0 / +0.1 / +0.2 / +0.3 s (yd/s) | 2.24 / 2.69 / 1.88 / 1.25 | 1.18 / 0.43 / 0.21 / 0.15 | 1.80 / 1.24 / 1.15 / 1.15 | 2.10 / 1.62 / 1.41 / 1.25 |
| Turn by +0.3 s (deg) | 80 | 7 | 36 | 49 |

- **The proximity event is the same stage in both sources:** the frame before is at 1.20–1.22 yd, and torso distance
  follows 0.10 s later in both. The 2.24 is frontcourse's slip at torso distance, not at proximity.
- **The pair arrives sliding as fast as the NFL's.** The means are 1.86–1.94 against 1.94. The runner brings a little
  less of the slip and the hitter a little more. So the missing slip is not an approach decision on either side.
- **The gap opens in the collision.**
  - In the NFL the slip grows after the pads meet (2.24 → 2.69 at +0.1 s): the runner's closing velocity turns into
    sliding past the man.
  - In ours it falls (1.80 → 1.24): the torso hit absorbs it.
  - `CONTACT_LAYER` (a compliant hit, not a plastic one) recovers about half of it: 2.10 / 1.62, turn 49°. Slip at
    +0.3 s then matches.
- **The one approach difference is closing speed:** 4.4–4.5 against 3.4 yd/s at proximity.
  - The NFL runner is slower: 4.21 against 4.66 yd/s.
  - The NFL hitter is moving with him rather than across: 108° against 80°.
  - A faster closing hit sheds more velocity in a plastic collision, so this compounds the collision law.
  - It is a carrier and tackler approach question, separate from the slip.

**The deep backfield hit (`deephit3.py`; zone runs; NFL 2022 against the package at run-ref-11, 2026-11-10).** Integration
asked why "stuffed after first contact deeper than 1 yd" is short of the NFL in every arm: NFL 52.7%, ref-10 50.9%,
package 46.8%, + `CONTACT_LAYER` 42.4%.

Split by depth, the package stops the runner as often as the NFL, or more:

| First contact depth | NFL: runs (share), stuffed | Package: runs (share), stuffed |
|---|---|---|
| −1 to −1.5 yd | 196 (6.6%), 34.2% | 68 (11.9%), 41.2% |
| −1.5 to −2 yd | 154 (5.2%), 50.6% | 28 (4.9%), 57.1% |
| Deeper than −2 yd | 348 (11.7%), 64.1% | 13 (2.3%), 53.8% |
| …by an unblocked defender | 180 (6.0%), 73.3% | 6 (1.1%), 50% |

**The bin is short because of its depth mix.**
- Half of the NFL's deep hits are more than 2 yd behind the line (median −2.00); ours sit just past −1 (median −1.32).
- Inside 2 yd we over-stop by about 7 points.
- Deep penetration, the hits that nearly always lose the play, is five times rarer in ours. Unblocked, it is 6.0% of
  NFL runs against 1.1%.
- This is the other side of the excess shallow contact (0–1 yd: 27% against 19%). Our first contact is squeezed toward the
  line, with less deep penetration and more hits just behind it.
- That is a blocking, penetration and line-timing question (Run Game's OL first step, Defense's penetration), not a
  contact law.

**The runner's state does not explain it.**
- NFL backs at deep hits are not flat-footed: 4.34 yd/s at 42° from north. Ours run 4.88 at 45°.
- Only 6% of NFL deep hits find the back under 2 yd/s; there he is stuffed 91% of the time.

**The second defender is rarer at every depth inside 2 yd.** Share with a second defender within 1.0 yd by +0.5 s:

| Depth | NFL | Package |
|---|---|---|
| −2 to −1 yd | 49% | 16% |
| −1 to 0 yd | 57% | 38% |
| 0 to 2 yd | 64% | 37% |
| Deeper than 2 yd / past 2 yd | about even | about even |

This is a crowding or pursuit difference near the line. The NFL proximity is measured on shoulder-pad tracking and ours on
body centres, which may account for part of it.

**OZ engaged lateral carry, timed from each lineman's own start (`ozflow.py`; 2026-11-10).** Run Game's report: OZ interior DL
flow toward the play 1.03 / 2.45 / 4.00 yd at 1.0 / 1.5 / 2.0 s, against the NFL's 1.62 / 3.16 / 4.83. Same code on NFL
2022 OZ and the fixed set's OZ runs at run-ref-11, with Defense's onset rule (first 0.1 s step over 0.3 yd/s, frame 0
the tagged snap). Interior DL here means within 1.6 yd of the line and between the tackles at the snap.

| OZ interior DL | NFL (3,254) | run-ref-11 (778) |
|---|---|---|
| Flow from the snap at 1.0 / 1.5 / 2.0 s (yd) | 1.35 / 2.82 / 4.47 | 1.04 / 2.46 / 3.99 |
| Flow at his own onset + 0.5 / 1.0 / 1.5 s (yd) | 0.59 / 1.76 / 3.33 | 0.65 / 1.81 / 3.38 |
| …engaged pairs only | 0.58 / 1.76 / 3.32 | 0.62 / 1.76 / 3.32 |
| Rate from 1.0 to 1.5 s (yd/s) | 2.98 | 2.82 |
| DL onset; OL onset (s) | 0.1; 0.1 | 0.3; 0.2 |
| Engaged with an OL at 1.0 s | 94% | 71% |

- **Timed from each man's own start, the engaged pair carries sideways exactly as the NFL's does.** The whole
  absolute deficit is the DL's late get-off (0.3 against 0.1 s), which is Defense's item. There is no lateral-carry gap
  in the physics, so the steer-budget split is not needed.
- **What remains:**
  - 6% lower rate between 1.0 and 1.5 s.
  - Fewer interior DL engaged at 1.0 s: 71% against 94%, Run Game's blocked-at-1.0 s. That is when and whether
    contact happens, not how the pair moves once it does.

**Correction: the OZ carry, with displacement from the snap spot (no onset threshold).** The 0.3 yd/s onset fires at
0.1 s on every NFL play, because that is the tracking's jitter floor. So "from his own onset" above compared the NFL's
noise floor with our real start, and its equality does not stand. Measured instead with no threshold (`ozflow.py`):

| OZ | NFL | run-ref-11 |
|---|---|---|
| OL lateral toward the play at 0.2 / 0.3 / 0.5 / 1.0 s (yd) | 0.14 / 0.25 / 0.59 / 1.87 | 0.06 / 0.15 / 0.46 / 1.67 |
| Interior DL lateral at 0.2 / 0.3 / 0.5 s (yd) | 0.06 / 0.13 / 0.34 | 0.00 / 0.03 / 0.20 |
| DL reaches 0.25 / 0.5 / 1.0 yd at (s) | 0.5 / 0.7 / 0.9 | 0.6 / 0.8 / 1.0 |
| Engaged DL: first OL contact (s) | 0.6 | 0.8 |
| …flow before that contact (yd) | 0.44 | 0.61 |
| …rate over the 0.5 s after it (yd/s) | 2.12 | 2.34 |

- **(b) The engaged pair after contact carries faster than the NFL's**, not slower. There is no steer-budget gap.
- **(a) The whole deficit is the first half-second, on both lines.** Both start later and contact comes 0.2 s later, which is
  Run Game's 71% against 93% blocked at 1.0 s.
- **OL first step on OZ** (`ol-first-step.mts`, fixed OZ runs):
  - On the snap tick (0 → 0.05 s), 93% of OL request zero velocity. From the next tick they ask for 3.5–3.7 yd/s toward the
    play.
  - The body then follows the start law: the start force of the body's own sprint curve, falling to zero at the wanted
    speed. A typical OL has vmax 7.59 yd/s and τ 1.36 s, fitted to 40- and 10-yard times, giving 5.6 yd/s² from rest.
  - Achieved: 0.27 → 1.83 yd/s over 0.10–0.50 s, which the law predicts.
  - Ground force is only 0.36–0.46 of traction and about 0.45 of the push budget. The kinematic start curve, not force,
    sets the pace.
- **How the OL's 0.13 yd at 0.5 s divides:**
  - The dead snap tick: about 0.09 yd. That is the request, Run Game's.
  - The start curve: about 0.04 yd. The NFL's early lateral acceleration is about 6–7 yd/s² against our 5.6, from a
    sprint fit. A lateral first step from the stance may not follow the 40-yard start, but this part is small.
- **The DL is still at zero request on 84% and 63% of the next two ticks** (Defense's late get-off).

**The second man (`secondman.py` on NFL and sim; `second-man.mts` on the sim; zone runs, run-ref-11; 2026-11-10).** At
the runner's first contact, every other defender nearby is checked for whether he gets within 1.0 yd of the runner by
+0.5 s. "Blocked" means an offensive non-carrier within 1.2 yd of him.

| Zone runs | NFL (2,919) | run-ref-11 (559) |
|---|---|---|
| Second man by +0.5 s | 57% | 39% |
| Other defenders within 2 / 3 / 5 yd at contact (per run) | 1.04 / 2.24 / 4.34 | 0.80 / 1.97 / 4.26 |
| Within 2 yd: blocked share | 77% | 73% |
| Within 2 yd: arrive, if free | 65% | 70% |
| Within 2 yd: arrive, if blocked | 46% | 26% |
| At 2–3 yd: arrive, if free / if blocked | 28% / 13% | 21% / 7% |
| DL within 5 yd who arrive | 16% | 6% |

- **Free men arrive as often as the NFL's.** Our pursuit and rally are not the gap. There are slightly fewer bodies
  within 2 yd at contact (0.80 against 1.04).
- **The gap is blocked men next to the runner.** Within 2 yd the NFL's arrive 46% of the time and ours 26%.
- **What ours are doing** (sim, 313 blocked within 2 yd; requested and achieved velocity toward the runner, mean over the
  0.5 s):

| Blocked defender within 2 yd | Share | Arrive | Requested (yd/s) | Achieved (yd/s) |
|---|---|---|---|---|
| Engaged through +0.5 s | 51% | 22% | +1.67 | +0.32 |
| Engagement ended (median 0.30 s) | 13% | 10% | +3.01 | +0.54 |
| Next to an offensive body with no engagement | 36% | 34% | +1.23 | +0.23 |

  At 2–3 yd, blocked men request +1.7 to +3.3 and achieve −0.4 to +0.3. Their nearest offensive body is 0.72–0.89 yd
  away throughout.
- **It is execution, not decision.** Blocked men near the runner ask to go to him and their bodies do not get there: they
  are held by the blocker's hands, or by bodies they are in contact with.
- **Open: which force cancels the request,** for engaged men and for body-only contact. The candidates are the blocker's
  hands (normal and steer), the torso contacts, and the defender's own ground drive while engaged.

**What holds the blocked men beside the runner (`held-split.mts`; run-ref-11 against + `CONTACT_LAYER`).** These are the
blocked defenders within 2 yd of the runner at his first contact (310 / 316 men). Over the next 0.5 s, their change of
velocity toward the runner is split by source (yd/s, mean). Tackle eligibility follows `tryTackles`: free, or on his free
side, or win ≥ 0.6, and in range.

| Group (share) | Arrive | Attempt | Request | Δv = ground + hands + grasp + torso/rest | Eligible / in range / both (share of ticks) |
|---|---|---|---|---|---|
| Engaged throughout (51%) | 23% | 14% | +1.69 | +0.27 = +1.64 − 0.97 + 0.08 − 0.47 | 64% / 17% / 13% |
| Engagement ended at 0.30 s (13%) | 10% | 10% | +2.78 | +0.77 = +1.34 − 0.30 + 0.11 − 0.38 | 81% / 34% / 33% |
| No engagement, beside an offensive body (36%) | 34% | 41% | +1.52 | +0.21 = +0.72 + 0.00 + 0.53 − 1.04 | 99% / 87% / 87% |
| …with `CONTACT_LAYER`: engaged throughout | 28% | 17% | +1.73 | +0.32 = +1.61 − 0.92 + 0.12 − 0.49 | 63% / 23% / 16% |
| …with `CONTACT_LAYER`: no engagement | 47% | 45% | +1.74 | −0.02 = +0.87 − 0.10 + 0.46 − 1.24 | 98% / 85% / 85% |

**Engaged men are held by the blocker's hands.**
- Their legs drive +1.64 yd/s toward the runner over the 0.5 s. The hands row takes −0.97 and the torso contact −0.47.
- Nothing ends the engagement because the runner is beside him. Engagements end on a body down, separation, a shed
  (`beat`) or "runner passed defender" (2.5 yd past). At contact the median win is 0.51 and control +0.51 (the blocker's
  hands inside).
- The reach rule keeps them out of range on 83% of ticks. An engaged man without a free side reaches only 0.4 of his
  arm, so 14% attempt.
- This is the parked grip-break question: decision and mechanism. It needs Tanner's go-ahead before code.

**Men with no engagement are stuck on bodies.**
- Their legs drive +0.72 (less than the engaged men's), and torso contacts take −1.04.
- The nearest offensive body is engaged with someone else 35% of the time. It requests toward him above 0.5 yd/s, an
  active wall, 52% of the time: the median is +0.93 yd/s, so half are walled actively and half are stuck on bodies that
  are not working on them.
- `CONTACT_LAYER` lets more of them through: arrivals 34% → 47%.
- They are eligible and in range on 87% of ticks, yet only 41% attempt. That is a tackle decision (`tryTackles`:
  occlusion, waiting for a better shot or `nextTackleAt`), which belongs to Defense.

**The carry after the first hit (`carry.py`, frontcourse's front-on contacts; NFL 2022 against the fixed zone runs; 2026-11-10).**

| | NFL | ref-10 | `GRASP_PATCH` | + `HIP_BRACE` | Package (run-ref-11) | Package + `CONTACT_LAYER` |
|---|---|---|---|---|---|---|
| Runner speed at −0.1 / 0 / +0.1 / +0.2 s (yd/s) | 4.39 / 4.21 / 3.94 / 3.61 | 4.74 / 4.66 / 3.26 / 1.94 | 4.75 / 4.67 / 3.43 / 2.32 | 4.74 / 4.67 / 3.42 / 2.25 | 4.74 / 4.67 / 3.43 / 2.25 | 4.71 / 4.65 / 3.78 / 2.42 |
| Speed kept at +0.2 s (median of each play's ratio) | 82% | 41% | 51% | 50% | 49% | 53% |
| Hitter along the runner's axis at −0.1 / +0.2 s | +0.46 / +0.72 | +0.22 / +1.41 | +0.23 / +1.10 | +0.22 / +1.10 | +0.22 / +1.11 | +0.22 / +1.14 |
| Runner's deceleration from +0.2 to +0.5 s | 0.92 | 0.60 | 0.18 | 0.39 | 0.36 | 0.47 |
| Play over by +0.5 / +1.0 s | 4% / 26% | 19% / 60% | 12% / 36% | 12% / 49% | 12% / 56% | 8% / 44% |
| …first hitter blocked | 2% / 21% | 11% / 47% | 7% / 27% | 8% / 37% | 8% / 46% | 6% / 39% |
| …first hitter free | 11% / 42% | 38% / 91% | 17% / 57% | 17% / 80% | 17% / 80% | 8% / 49% |
| Gain after contact (yd); contact to end (s) | 2.84; 1.5 | 1.28; 0.8 | 2.29; 1.4 | 1.86; 1.1 | 1.85; 1.0 | 1.97; 1.1 |

**The shortfall is the first 0.2 s of the hit.**
- The NFL runner keeps 82% of his speed through it. Ours keeps half: 49% in the package, 53% with the layer.
- Our hitter picks up about 1.1 yd/s along the runner's line; the NFL's, about 0.3.
- Our first collision exchanges most of the momentum at once. The NFL's passes most of it on over the following half
  second (deceleration 0.92 yd/s between +0.2 and +0.5 s against our 0.36).

**`HIP_BRACE` is not over-braking.**
- With it, the deceleration over +0.2 to +0.5 s is 0.36–0.39 against the NFL's 0.92. The brace slows the runner less than
  NFL runners slow down in that window.
- It ends more plays by +1.0 s (36% → 49%), because it acts on a runner who has already lost half his speed at the hit.
- With `GRASP_PATCH` alone, the blocked-hitter row matches the NFL: 27% over by 1.0 s against 21%, gain 2.69 against
  2.93.

**Where the term lives.** The first hit's momentum exchange. The candidates are:
- the effective mass of a single rigid torso: the remaining √2 of the first-hit force, an upper body pitching about the
  hip;
- the plastic torso stop, which `CONTACT_LAYER` softens (49% → 53% kept);
- the grasp weld, which `GRASP_SLIDE` showed is small;
- our faster closing (4.46 against 3.38 yd/s at proximity).

**The first 0.2 s of a front-on hit, by source (`first-hit-split.mts`; run-ref-11, 240 hits; 2026-11-10).**

The runner's velocity change along his approach axis over 0.2 s (yd/s):

| Offset | Runner Δv | Ground | Torso normal | Grasp | Rest (friction, others) | Hitter Δv |
|---|---|---|---|---|---|---|
| All | −2.06 | +0.13 | −2.11 | +0.08 | −0.16 | +1.27 |
| < 0.15 yd | −2.60 | +0.05 | −2.79 | +0.25 | −0.11 | +1.37 |
| 0.15–0.3 yd | −2.30 | +0.14 | −2.52 | +0.23 | −0.15 | +1.32 |
| ≥ 0.3 yd | −1.72 | +0.15 | −1.62 | −0.07 | −0.18 | +1.20 |

With `CONTACT_LAYER` the torso-normal term overall is −1.75 instead of −2.11, and runner Δv is −1.81.

**The torso normal impulse is the whole loss.** Most of it falls in the second tick (−1.16 of −2.11). Grasp, hands and
friction are small; mechanism 1's articulation would not change it (Gate 1: the pads still reach a common velocity).

**The runner's legs do not drive through the hit.**
- His ground force runs at 0.40 of its traction limit, but nets only +0.13 yd/s along his axis over the 0.2 s.
- The lean law requests 4.0–5.8 yd/s² into the load, capped by leg strength (a temporary, uncommitted probe).
- What survives the allocation is 0.5–0.9 yd/s². `allocateGroundForce` gives the gait the budget first and the lean what
  is left.
- At impact the load on him is 34.5 yd/s² (felt 11–22).

**At the NFL's closing speeds the law still loses.**

| Closing speed (yd/s) | NFL speed kept | Ours speed kept |
|---|---|---|
| under 3 | 78% | 70% |
| 3–4 | 83% | 57% |
| 4–5 | 87% | 44% |
| 5+ | 86% | 41% |

- The NFL's speed kept does not depend on closing speed. Ours falls with it.
- Reweighted to the NFL's closing mix, ours is about 56%: the approach explains about a fifth of the 82% − 49% gap.

**Geometry at torso contact, NFL against ours.**
- Closing is 50–78% of the relative velocity in the NFL, by offset, against 82–89% in ours.
- After the pads meet, the NFL's tangential slip grows (0.15–0.3 yd offset: 2.73 → 3.15) and ours shrinks
  (1.46 → 1.10).
- Even central hits keep 78% in the NFL against our 42%. The NFL's collision turns closing into sliding past; ours stops
  it with the normal impulse.

**(a) The lean allocation at impact: closed, negative** (temporary probes, uncommitted; `first-hit-split.mts`; 2026-11-10).

Per tick over the first 0.2 s (208–241 front-on hits, run-ref-11; yd/s² along each man's axis):

| | Runner | Hitter |
|---|---|---|
| Gait asks | −0.79 / +0.04 / +2.18 / +1.87 | +3.59 / +0.39 / +1.24 / +1.12 |
| Lean asks (after its rise and release, before allocation) | +0.61 / +2.12 / +2.80 / +2.59 | +2.71 / +3.74 / +4.59 / +4.56 |
| Cap (strength × force-velocity × availability) | 4.4–5.8 | 7.4–8.7 |

- **The hitter drives through the hit and the runner does not.**
- **Not his speed cap.** The runner's gait speed cap is 9.2–9.4 yd/s against his request of 5.2–5.4 yd/s.
- **Not cutting.** The request is within 3° of his velocity at the median on the contact tick.
- **The runner's `push` intent is 0 on 68% of contact ticks** (31% the next tick). The lean law is gated by it, and he
  braces only after he feels the hit.
- **Intervention:** `push` = 1 whenever a defender is within 1.2 yd ahead of the runner. Speed at +0.2 s goes 2.53 → 2.54
  and ground along the axis +0.13 → +0.14: no change.
- **Physics bounds it.**
  - At impact the load on the runner is about 34 yd/s² (about 3 g), against traction of about 11 yd/s² (about 1 g).
  - Feet at the strength cap can add at most about 1 yd/s over 0.2 s, against a torso normal impulse of −2.1 yd/s.
  - Leg drive through the hit cannot reach 82%. The ceiling with it is near 70%.
- **The term is the normal impulse that stops the closing along the line of centres.** In ours that impulse takes −2.11
  yd/s off the runner in 0.2 s. In the NFL the runner loses 0.78 in total, and the hitter gains only 0.26: the pair never
  exchanges momentum like a stopping collision.

The two candidates left both act on that impulse:
- **(b) compliance, `CONTACT_LAYER`:** −2.11 → −1.75.
- **(c) contact geometry:** at torso contact, closing is 82–89% of the relative velocity in ours against 50–78% in the
  NFL; the NFL's slip grows after contact and ours shrinks. That is the evidence for unparking the torso shape.

## Blocked pass rushers win too soon (`pass-pocket.mts`, `pocket.py`; run-ref-12, 8 live games, 811 dropbacks; NFL 2022, 9,566 dropbacks; 2026-11-10)

**The pocket does not collapse.** Depth behind the line (yd, median), among plays not yet thrown:

| | NFL tackles / guards / centre / QB | Ours |
|---|---|---|
| 1.0 s | 2.17 / 1.43 / 1.25 / 5.17 | 2.31 / 1.58 / 1.46 / 5.13 |
| 1.5 s | 3.42 / 2.34 / 2.23 / 6.25 | 3.50 / 2.23 / 1.74 / 6.53 |
| 2.0 s | 4.70 / 3.30 / 3.11 / 7.39 | 5.07 / 3.00 / 2.20 / 7.78 |
| 2.5 s | 5.65 / 4.07 / 3.72 / 8.06 | 6.43 / 3.73 / 2.90 / 7.89 |
| 3.0 s | 6.21 / 4.52 / 4.06 / 8.11 | 7.27 / 4.21 / 3.64 / 7.92 |

- The interior holds slightly *shallower* than the NFL's.
- Tackles end up 0.4–1.0 yd deeper by 2.0–3.0 s: the edge sets wide and deep, or is pushed.
- The QB sits at NFL depth, with the same gap to the guards. This is not the bull rush or the anchor.

**First pressure** (first defender within 2 yd of the QB before the throw):

| | NFL | Ours |
|---|---|---|
| Pressured before the throw | 28% of dropbacks | 52% |
| Time to pressure (median) | 2.7 s | 2.7 s |
| Blocker still on him at pressure | 63% of pressures (an offensive player within 1.2 yd) | 23% still engaged, plus some of those who came apart |
| Blocked earlier and got off | 21% of pressures; 6% of dropbacks; last contact about 0.5 s before | 62% of pressures (261 of 424); 32% of dropbacks |
| Never blocked | 15% | 15% |

Our 261 who got off:
- 139 came apart without the shed rule (separation), about 0.95 s before the pressure.
- 122 were shed by `beat`, about 0.6 s before the pressure.
- Almost all are linemen (238).

**Reading.**
- The excess pressure is rushers getting off their blocks five times as often as the NFL's: 32% of dropbacks against 6%.
- The NFL's pressure mostly comes with the blocker still on the rusher. That is the pocket being squeezed, at 63%.
- Ours mostly comes from a rusher who got free.
- **Two routes:**
  - The rule-based shed (`beat`). This is the parked grip-break question from the rusher's side.
  - The hands simply coming apart. This is physics: the hands' steer was at its limit on 67% of engaged ticks in the run
    game, and a rusher whose hands row saturates slides off.
- **The next diagnosis** is the separation route: for those 139, the blocker's hands row (normal and steer against their
  limits), the rusher's move, and the relative tangential slip in the 0.5 s before the engagement ends.

**How pass rushers get off (`pass-apart.mts`; run-ref-12, 8 live games; and a `disengage` call-site count, 4 games).**
OL–DL pass engagements that end while the QB still has the ball.

**What ends them** (4 games, from `sim.disengage`'s caller):

| Ending | Count | What it is |
|---|---|---|
| The blocker on the ground | 463 | `updateEngagements` body-down end |
| "Turned the corner" | 172 | the pass rep's `beat`: \|phi\| ≥ 1, the rusher hip to hip past him toward the QB |
| The rusher on the ground | 25 | |
| Loose ball / interception | 11 | |
| The separation rule | 1 | |

The "came apart without a shed" route in the first cut is almost entirely pass blockers being knocked off their feet.

**The last 0.5 s before the end** (8 games, medians):

| | Corner (342; 112 then pressure) | Blocker down and other (1,049; 142 then pressure) |
|---|---|---|
| \|phi\| | 0.46 → 0.98 | about 0.1, flat |
| Hands steer against its limit | 1.00 (at limit 77–85%) | 0.33–0.61 |
| Hands normal against its limit | 0.89–1.00 | at 1.00 until the last tick |
| Blocker's lateral request → achieved | +2.6 → +2.1 yd/s | +2.2 → +1.1–1.5 |
| Rusher's lateral velocity | +1.6 to +2.1 | +1.0 to +1.5 |
| Relative slip | −0.3 to −0.8 | 0 |
| Blocker's facing against the rusher | 10–15° | 1–4° |

- **Corner.** The rusher works around a blocker who keeps facing him with the hands at their steer limit.
- **Blocker down.** The blocker goes down while sliding laterally, square to the rusher, with the hands pushing at their
  normal limit. He asks for more lateral speed than he gets.

**`HANDS_FRICTION` arm:**

| | Off | On |
|---|---|---|
| Corner endings | 342 | 217 |
| Other endings | 1,049 | 972 |
| Pressures after these endings | 254 | 183 |

- Friction on the hands' own load keeps a pass blocker attached around the corner (steer at limit 61–64% against 77–85%).
- It barely touches the falls.

**Reading.** The leading cause of our rushers getting free is pass blockers falling: a balance and support question
(mine). The corner route is the hands' sideways hold, which `HANDS_FRICTION` addresses (it overshoots the run trench).
The next diagnosis is why a sliding pass blocker under a frontal push falls: capture point against his base, availability,
the push's direction and size, and his lateral request.

## Why a sliding pass blocker falls (`pass-fall.mts`, `pass-frames.mts`, `olfall.py`, `run-fall.mts`; run-ref-12, 4 live games, seeds 11–17; NFL 2022, 9,713 dropbacks; 2026-11-10)

- **Sample.** Every OL–DL pass rep that ends because the blocker's support leaves 'up' while the QB still holds the ball:
  467 in four games.
- **Trace.** The 0.5 s before the fall, read after each tick from his support state and the world's step report.
- **Classes.** Fall direction is his capture-point deviation against the load he felt:
  - *into the rusher*: opposite the load, a lean the load stopped balancing;
  - *with the push*: along the load, knocked over;
  - *across*.

**The fall is the lean, not the push.**

| | Into the rusher | With the push | Across |
|---|---|---|---|
| Falls | **412 (88%)** | 27 | 28 |
| Felt load, ×mg (−0.5 s → −0.15 s → last tick) | 0.53 → 1.04 → 0.37 | 0.27 → 0.94 → 1.02 | 0.66 → 0.61 → 0.30 |

Median profile of all falls, by tick before the fall:

| Tick | −10 | −8 | −6 | −4 | −3 | −2 | −1 |
|---|---|---|---|---|---|---|---|
| Felt load, ×mg | 0.56 | 0.88 | 1.02 | 1.02 | 1.03 | 0.89 | 0.37 |
| Committed lean as COM offset, yd | 0.45 | 1.00 | 1.20 | 1.26 | 1.27 | 1.21 | 0.51 |
| Capture-point deviation, yd | 0.03 | 0.05 | 0.08 | 0.09 | 0.08 | 0.12 | 0.80 |
| Ground force against traction | 0.55 | 0.98 | 1.00 | 1.00 | 1.00 | 1.00 | 0.73 |
| Speed, yd/s | 2.2 | 2.4 | 2.7 | 2.9 | 2.9 | 3.0 | 2.9 |

What the trace shows:

- **How fast it happens.** The deviation goes from inside the base to past it in one tick (186 of 467) or two (72).
- **In the crossing tick (385 crossings):**
  - The felt load falls to 0.47 of the previous tick (quartiles 0.37–0.61).
  - His lean was 1.13× the load (0.95–1.26).
  - The lean release (`world.ts:1936–1950`) accounts for 98% of the deviation's jump.
  - The hands joint is still attached in all 385.
- **Lean against his own thresholds.** The lean is 1.26 yd of COM offset, about a 48° lean, where offset = lean/(m·w0²) = lean·h/(mg). His fall threshold is 1.02 yd (rb + step speed/w0) and his base radius 0.18 yd. A lean already beyond the fall threshold means any loss of more than about a fifth of the load puts him past his base. Half the load puts him most of the way to falling.
- **What he is doing.** He is kicking back at 2.2 → 2.9 yd/s with the ground force at the traction limit. The load (0.5 → 1.0 mg over 0.35 s) drives him the way he is going (load against velocity 38°).

**Why he leans that far:**

1. **The controller.** The pass set always asks `push: 1` (`engagement.ts:1040`). The lean targets 1.25× the felt load (`PUSH_GROWTH`, `world.ts:1925`) whenever his request along the load exceeds his velocity. He is set up to drive the rusher back, not to anchor.
2. **The base.** The support model gives a kick-sliding lineman the same isotropic base as any stance: radius (0.11 + 0.05·balance + 0.04·mass) × (0.75 + 0.5·posture) = 0.18 yd at the pass set's posture 0.6. Nothing in it knows he is set to take a push. A staggered set's fore–aft support is wider than a running stride's, and the model has no such term.
3. **The physics (candidate incoherence).** The lean rises with a 0.04 s constant (`LEAN_RISE`) toward a target read from a 40 ms felt load, and its geometry is imputed only when released.
   - The offset grows at a median 2.9 yd/s to its peak, 7.8 yd/s in the fastest tick.
   - 0.45 → 1.13 yd took 0.15 s.
   - For a real COM to get that far ahead of the feet that fast, the feet would have to slide back 5–8 yd/s faster than the COM.
   - The body never had this geometry; the release hands it over in one tick.
   - A COM can get ahead of planted feet only as fast as it moves relative to them. Beyond the ankle's share (the CoP inside the base: rb·m·w0², about 0.17 mg), a lean has to be built by that motion.

**Who falls:**

- **Position:** guards 248, tackles 196, centre 23.
- **Rusher's move at the crossing:**

  | Bull | Long-arm | Swim | Rip | Club | Speed | Spin | Snatch | Dip |
  |---|---|---|---|---|---|---|---|---|
  | 81 | 59 | 56 | 56 | 43 | 30 | 21 | 20 | 19 |

  Power moves release the load too: the bull rusher's push varies tick to tick.
- **Mismatch?** No. The faller is the heavier man (blocker/rusher mass, median 1.21) and the stronger one (strength 80 against 74; balance 58).
- **When:** 0.75 s into the rep (median; quartiles 0.65–0.90 s), right after the first collision.

**NFL check (`olfall.py`).** Tracking has no 'down' flag. The operator looks for an OL in a block (the record's `blocks`) who goes still before the throw, with the same code on the NFL and on the sim's `pass-frames.mts` records:

- *strict*: under 0.5 yd/s for 1.0 s, his rusher within 2 yd at the start and ≥ 2.5 yd at the end;
- *bound*: under 0.3 yd/s for 0.8 s, no departure condition (also counts anchored stalemates, so it can only overstate NFL falls).

| | Strict | Bound |
|---|---|---|
| NFL dropbacks flagged | 0.9% (92 of 9,713) | 1.2% |
| Sim dropbacks flagged (390) | 14.6% | 22.1% |
| Precision on the sim's true falls | 91% | 88% |
| Recall on the sim's true falls | 12% | 18% |

- **Recall is low on purpose.** A sim fall slides ~0.6 s, then lies still for the get-up. Most come too close to the throw to fit the window. That cuts the same way on both sides.
- **The truth behind the sim side:** 75% of the sim's dropbacks have at least one OL fall before the throw (531 falls in 390 dropbacks).
- **Result:** with identical code, the sim's rate is 12–18× the NFL's.


**Run blocks (`run-fall.mts`, the fixed run set, 1,321 runs).**

- 1,441 of the 6,680 run-engagement endings are 'body down' (22%).
- The defender goes down in 906, the blocker in 580 (45 both).
- Direction class of the faller's deviation against his felt load the tick before:

  | Faller | With the push | Into the man | Across |
  |---|---|---|---|
  | Blocker (580) | 236 (41%) | 188 (32%) | 156 (27%) |
  | Defender (906) | 554 (61%) | 193 (21%) | 159 (18%) |

  - In run blocks the dominant fall is the one driven over: the defender, along the push.
  - Blocker falls are mixed.
  - Pass pro's signature (88% into the man, a lean left unbalanced) is specific to the pass set.

**Reading.**

- The excess pass pressure is mostly pass blockers falling forward off a lean of about a body-height's COM offset, built in a fraction of a second, the moment the rusher's load sags.
- Three candidate causes, each a separate question for Integration. No change was attempted.
  - **Controller (pass set).** `push: 1` with the lean at 1.25× the load is a drive-him-back request; an anchor would ask for less. This is not a ban: a blocker who chooses to drive still can.
  - **Base.** A set pass blocker's fore–aft support is not a running stride's 0.18 yd.
  - **Physics.** Bound the lean geometry's growth by how fast his COM can get ahead of his feet. Beyond the ankle share, a lean has to be built by real relative motion; until it is, the push drives him back rather than being balanced by imputed geometry.
- The physics item is the one I would bench first: a pushed-body bench with a load that sags by half, identity and momentum exact, and a no-contact world bit-identical.

## `LEAN_PITCH` (off): the lean can only grow as fast as the COM can pitch (`lean-bench.mts`; first game read, 2026-11-10)

**The law** (`world.ts`, the lean's blend in `feet`):

- A committed lean is a COM offset of lean/(m·w0²).
- The ankles move the pressure centre across the base at once, so a lean up to the base radius is immediate (about 0.17 mg).
- Past it, the COM must pitch over planted feet, no faster than an unopposed fall: offset' ≤ w0·offset.
- The release is unchanged: a load that sags still releases the lean he really had.

**Bench** (generated OG/DT/RB/LB, the World only):

| Case | Fastest offset growth, off → on (yd/s) | Peak lean, off → on |
|---|---|---|
| Standing | 7.0–7.8 → 2.8–3.1 | 1.1 mg either way, later |
| Kicking back at 2.5 yd/s, sag / hold | 8.2 / 5.2 → 3.1 | 1.21 / 0.95 → 0.83 / 0.88 mg |
| Kicking back, hands removed | 11.6 → 3.1 | 1.17 → 0.54 mg |
| Drive blocker | 6.8 → 2.6 | unchanged |
| Braced tackler | 7.5 → 3.2 | unchanged |

- **Sustained push:** still held (1.11 mg either way).
- **Invariants:** momentum with free intents 3.6e-13; the no-contact digest is identical off and on (296c2f3c8eac).
- **What the bench cannot do:** it falls in neither arm. In games the gait already plans ~4.7 yd/s² toward the rusher (envelope 5.0), so nothing of a release is absorbed. In the bench his legs are free and absorb it.

**Game read, gate 1** (flag on against run-ref-12; same four games, seeds 11–17; truth from `pass-frames.mts`):

| | Off | On | NFL |
|---|---|---|---|
| Dropbacks with an OL fall before the throw | **74.9%** (531 falls / 390) | **19.0%** (83 / 357) | — |
| `olfall.py` strict / bound | 14.6% / 22.1% | 3.9% / 6.7% | 0.9% / 1.2% |

- **Gate 1 (≤ 15%) is not met.**

**Gate 2, the falls that remain** (`pass-fall.mts`, 65 traced):

- 58 (89%) still go *into the rusher*. Gate 2 (the share should collapse) is not met; the count fell from 412 to 58.
- They are not the imputed lean any more:
  - They come 1.3 s into the rep (median; 0.75 s off).
  - The lean builds 0.59 → 1.04 yd over the 0.35 s before the sag, not in 0.15 s.
  - Before the crossing the lean is 1.18× a felt load of about 1 mg (1.17 yd of offset). The load halves in one tick (0.48), and the release is the whole jump (median share 1.00).
- These are blockers who really leaned 48° into a sustained 1-mg push and lost it. That is the legitimate stumble the law keeps.
- What is left is the request: the pass set asks `push: 1` with a lean of 1.25× the load. That is a drive, where a pass blocker anchors and does not chase the push. It is parked with Coverage (protection).

**Not run** (gate 1 stopped the read): first pressure, pocket depth, run trench, run-block falls, the paired card.

**Anchor probe (Integration, 2026-11-10; temporary, not committed).**

- **The change:** `LEAN_PITCH` on, plus the pass set asking for a lean of at most 1.0× the felt load instead of 1.25×. That is the lean target's growth term set to 0 for the pass set, read from an intent field.
- **Unchanged:** kick, mirror, posture, `push: 1` and the release law.
- **Sample:** the same four games.

| | Off | `LEAN_PITCH` | + anchor | NFL |
|---|---|---|---|---|
| Dropbacks with an OL fall before the throw (truth) | 74.9% | 19.0% | **10.9%** (41 falls / 366) | — |
| `olfall.py` strict / bound | 14.6 / 22.1% | 3.9 / 6.7% | 1.4 / 2.7% | 0.9 / 1.2% |
| Pressure (first defender within 2 yd before the throw) | 57.2% | 47.3% | 43.2% | 28% |
| Sacks a dropback | 8.2% | 6.7% | 4.4% | — |
| How pressure arrives: blocker still on him / never blocked / shed / got apart | 20 / 15 / 25 / 40% | 41 / 29 / 24 / 6% | 42 / 21 / 32 / 5% | 63% blocker still on |
| Guards' depth at 2.0 s / 3.0 s, yd | 2.99 / 4.18 | 3.13 / 4.94 | 3.11 / 4.76 | — |
| Tackles' depth at 2.0 s / 3.0 s, yd | 5.06 / 7.29 | 5.06 / 7.76 | 5.06 / 7.61 | — |
| QB − guards at 3.0 s, yd | 3.88 | 2.95 | 3.15 | — |

- **Pocket at 2.0 s:** unchanged.
- **Pocket at 3.0 s:** the guards are 0.6–0.8 yd deeper. Blockers who used to fall now stay up and are driven back instead; the plays still alive then are different samples.
- **The anchor's other failure is not seen:** the pocket does not collapse.
- **Pressure:** falls and "got apart" endings nearly vanish. The rusher's remaining routes are the shed (32%) and riding a blocker who is still on him (42%).

**Run blocks with `LEAN_PITCH` on** (`run-fall.mts`, the fixed run set):

| | Off | On |
|---|---|---|
| Run-engagement endings | 6,680 | 6,302 |
| Body-down endings | 1,441 | 1,029 |
| Blocker falls | 580 | 361 |
| Defender falls | 906 | 709 |
| Defenders down along the push | 554 | 495 |

- Defenders driven over along the push barely move: they are knocked over, not leaning, so this law does not reach them. That needs its own look.

## Run-block defenders on the ground (`run-dfall.mts`, `run-frames.mts`, `rdfall.py`; the fixed run set, 1,321 runs; NFL 2022, 6,172 runs; 2026-11-10)

**How often.**

- **Truth:** 906 defender falls in run blocks; half the runs (656) have one.
- **Operator (`rdfall.py`):**
  - NFL run records carry no block pairs, so a DL or LB is "blocked" while an OL or TE is within 1.2 yd of him for 0.3 s.
  - Flagged: he then goes still (under 0.3 yd/s for 0.8 s), more than 2 yd from the carrier, before first contact.
  - This also counts anchors, so it is an upper bound on the NFL.

  | | Flagged share of blocked DL/LB reps | Flags a run |
  |---|---|---|
  | NFL | 0.2% (81) | 0.01 |
  | Sim | 1.7% (107) | 0.08 |

  - The sim's rate is about 8× the NFL's on identical code.
  - Precision against the sim's true falls is 69%. Recall is 16%: most falls come too close to first contact for the window.

**Who.**

- **Defender's slot:** LB_M 157, DT_W 136, LB_W 120, DT_S 117, DE_S 90, DE_W 71, NB 57, SS 53.
- **Blocker's slot:** C 166, the tackles and guards 120–144 each, Y 101, H 54.
- **Doubles:** 22 of 906. These are solo blocks, not doubles burying a tackle.
- **The blocker is the heavier and stronger man:** mass 1.21×, strength 1.12× (medians).
- **When:** 810 come after the handoff, at a median of 3.75 yd from the runner.

**Direction** (capture-point deviation against the felt load at the fall):

| | Along the push (driven over) | Toward the man | Across |
|---|---|---|---|
| Defenders | 549 | 191 | 164 |
| Blockers | 234 | 185 | 159 |

**Two different falls among the 551 driven over:**

1. **Early impact (416; within 0.4 s of contact): LB 178, DB 141, DL 97.**
   - Over the 4–5 ticks from contact, the felt load builds 0.7 → 1.8 mg.
   - The contact-height tip grows 1.3 → 4.5 yd/s²: a low blocker (posture ~0.8) under an upright defender (0.43, sinking to 0.32).
   - The defender is moving into the blocker at ~1.2 yd/s.
   - His request along the push is **0**: he is pursuing across it, not taking the block on.
   - He uses only ~55% of his traction and builds almost no lean (median 0.12 mg before the crossing). The lean law braces only when his request along the load exceeds his velocity, which a pursuit request never does.
   - His capture point crosses 0.07 → 0.23 → 0.55 → 0.86 → 1.0 of the fall threshold in four ticks.
2. **Sustained drive (135; after 0.4 s): mostly DL (71).**
   - Driven back at 1.0–1.4 yd/s, a load ~0.8 mg, asking to hold ground (request −0.8 to −1.1 yd/s along the push).
   - His capture point creeps from 0.2 to 1.0 of the threshold over 0.35 s while availability falls (0.99 → 0.33).
   - A man driven backward who asks to hold ground is not stepping back with the drive. His recovery steps cannot keep up.

**What it does to the play.**

| Runs | Any defender fall | A fallen defender within 2 yd of the runner's later path (while down) |
|---|---|---|
| Under 4 yd | 47% | 23% |
| 4–9 yd | 54% | 21% |
| 10+ yd | 51% | 18% |

- Falls are not what makes the long gains.
- They take a man out of the pursuit about once every two runs, which may thin the crowd at the runner. Blocked defenders within 2 yd of the runner: 0.58 a run against the NFL's 0.80.

**With `LEAN_PITCH` on:**

- Defender falls 906 → 709: toward the man 191 → 108, along the push 549 → 493.
- Blocker falls 580 → 361. A note for Run Game: when the flag goes on, fewer of its blockers end on the ground.
- The driven-over falls are not a lean, and this law does not reach them.

**Proposal** (nothing built):

- **(a) Controller, Defense.** An engaged defender does not take the block on. His request stays pursuit (0 along the push) with upright pads, so his legs never brace. Taking on a blocker he sees closing (pads down, a request against the block's push), or defeating it, is technique on observable evidence. So is giving ground with the drive instead of asking to hold it when he is being driven.
- **(b) Physics, mine.** Bench the early impact: a 1.2× heavier blocker at posture 0.8 into an upright pursuer, braced against unbraced.
  - Is the 1.8 mg felt load over ~0.2 s, about 3–4 yd/s of velocity change, coherent with the closing speeds and masses?
  - Is the contact-height tip right for that pad mismatch?
  - Only if the bench shows an incoherence does it become a physics change.

**Impact bench (`impact-bench.mts`).**

- **Setup:** a 140 kg OG at posture 0.8 driving at 3 yd/s; torso contact, then a hands row at the blocker's arm force. The World only.
- **Bound:** a coherent contact may give the defender at most the inelastic share m_b/(m_b+m_d) × closing speed, plus the blocker's own ground impulse over the defender's mass.

| Arm (109 kg LB defender) | Closing, yd/s | z vs c, yd | Peak felt, mg | Peak tip, yd/s² | Defender Δv in 0.3 s vs bound, yd/s | Energy: KE change − ground − arm work | Outcome |
|---|---|---|---|---|---|---|---|
| Pursuing across the block and into it (the trace: −1.2 + 3 yd/s across), upright | 4.20 | 1.10 vs 1.00 | 4.81 | 10.9 | 3.76 vs 4.64 | −634 (dissipated) | fell at +0.20 s, along the push |
| Pursuing across only, upright | 3.00 | 1.10 vs 1.00 | 3.50 | 8.5 | 1.90 vs 4.07 | −365 | stayed up |
| Square and braced (posture 0.8, push 1) | 3.00 | 1.00 vs 0.92 | 2.42 | 3.3 | 1.69 vs 3.88 | −215 | stayed up |
| Square, upright, not pushing | 3.00 | 1.10 vs 1.00 | 2.41 | 5.6 | 2.12 vs 3.79 | −213 | stayed up |
| Mirrored (first arm, y → −y) | identical | | | | | | |
| Equal mass (a 111 kg LB as the blocker), first arm | 4.20 | 1.03 vs 1.00 | 4.68 | 3.0 | 2.80 vs 3.88 | −570 | stayed up |

**Reading.** The impact is coherent.

- Every arm's velocity change is inside its bound. The contacts dissipate energy and never create it, and the mirror is exact.
- The tip's sign is right: the contact is at the lower man's pads (1.10 yd), above an upright defender's COM (1.00), so a chest-high hit pitches him back. A defender at posture 0.8 lowers both.
- The tip's size follows the lever (z − c). Against an equal-mass, equal-height blocker it is small (3.0).
- What puts him down is running into a heavier, lower blocker at 4.2 yd/s closing, upright and not braced. That is real football: a blindside pancake.
- **No physics change.** The frequency is the controller's: he keeps pursuing into a blocker he could see, without squaring, lowering or setting his legs. That is (a), Defense's item.

**The sustained-drive falls (`drive-bench.mts`, `run-dfall.mts` with a temporary per-term capture-point split, reverted).**

- **Bench:** a 150 kg DT driven by a 147 kg OG through a hands row, for 2 s. Four requests:
  - hold ground (push 1, posture 0.6): holds at 0.04 yd/s with a lean of 0.87 mg balancing a 0.95-mg load;
  - retreat with the drive at 1.2 yd/s: gives ground at 1.24 yd/s under 0.8 mg, lean 0.74;
  - anchor low (posture 1): holds;
  - no push: carried back at 2 yd/s.
- **In none of them** does the capture point leave 0.02 of the fall threshold, and nobody falls. A steady drive in isolation topples no one.
- **In games** (the 551 driven over along the push), each event's capture-point change is summed by term along its fall:

| | Falls after a load spike (≥ 1.3 mg) | Steady drive (no spike) |
|---|---|---|
| Count | 465 (84%): LB 202, DB 149, DL 114 | 86: DL 54, LB 23, DB 9 |
| Peak felt load | 3.1 mg | 0.98 mg |
| Unfollowed contact acceleration | **0.76 yd** | 0.01 |
| Contact-height tip | 0.22 | 0.00 |
| Lean release | 0 | **0.48 yd** |
| Recovery step at the last tick (share of step speed) | 0.88 | 0.85 |
| His request along the push / velocity, yd/s | 0 / +0.6 | −1.0 (into the blocker) / +0.9 |

**Reading.**

- **No missing recovery step.** It fires at 85–88% of step speed in both groups; nothing drains it under a sustained load. The earlier split by rep age was misleading.
- **84% of these falls are impacts**, including repeat hits later in a rep. They are coherent by the impact bench, so they belong to Defense's item (a).
- **The steady-drive remainder (86) is the pass blocker's lean release:**
  - the defender asks to attack into the blocker at 1 yd/s;
  - he commits a lean into the load;
  - the load sags and the lean drops into his capture point.
- `LEAN_PITCH` and an anchor-style request (lean no more than the load) are its remedies, as on the OL side.
- Nothing new for the World. Coverage's `PASS_ANCHOR` works around the same lean on the OL side, not a missing step.

## `LEAN_PITCH` promotion read, run side (pre-registered 2026-11-10, before running)

- **Arms:** `npm run ref:report -- --flag LEAN_PITCH=1` on the fixed 1,321 runs. Off, run-ref-12, and run-ref-12 + `LEAN_PITCH`.
- **Gates** (the candidate against run-ref-12):
  1. No regression caused by a bug in the mechanism. Any yardage change must have a named mechanism: fewer fallen blockers means blocks held longer; fewer fallen defenders means more pursuit.
  2. Tackle counts (made, missed, broken) within noise.
  3. Falls down on both sides with `run-fall.mts`: defenders below 906 and blockers below 580.
- **Reported, not gated:** yards by concept, stuffs, first-contact depth, crowd at the tackle, the trench operators.

**Result** (`ref:report`, run-ref-12 @ 849ee8f7, candidate = + `LEAN_PITCH=1`; full output in `out/ref/report.md`).

| Concept | n | run-ref-12 | + `LEAN_PITCH` | Paired (SE) |
|---|---|---|---|---|
| OZ | 395 | 3.15 | 3.50 | +0.35 (0.23) |
| IZ | 215 | 3.88 | 4.51 | +0.63 (0.31) |
| gap | 445 | 4.17 | 4.20 | +0.04 (0.16) |
| duo | 126 | 3.49 | 3.50 | +0.01 (0.31) |
| toss | 55 | 3.93 | 4.97 | +1.04 (1.01) |
| draw | 85 | 4.04 | 3.77 | −0.27 (0.58) |
| **all** | 1,321 | **3.73** | **3.98** | **+0.24 (0.12)** |

- **Other yardage numbers:** stuffs (≤ 0 yd) 11.4% → 11.6%; 10+ runs 6.7% → 8.0%; 20+ runs 1.8% → 2.7%.
- **Gate 2, tackles:** missed 0.241 → 0.240, broken 0.142 → 0.147 (engaged-grab breaks 0.073 → 0.070). **Met.**
- **Gate 3, falls** (`run-fall.mts`): defenders 906 → 709, blockers 580 → 361. **Met.**
- **Gate 1, mechanism:** the yardage rise has two named mechanisms, both moving toward the NFL. No regression traces to a bug. **Met.**
  1. *Blocks held.*
     - Zone DL driven back ≥ 0.5 yd from 0.5 s: 8% → 12% (NFL 17%).
     - DL depth at 2.0 s: +0.69 → +0.57 (NFL +0.70); solo +0.87 → +0.69 (NFL +0.82).
     - Solo-pair rotation 58° → 46° (NFL 43°).
     - Pile frames with no defender within 1 yd: 408 → 566.
  2. *Pursuit.* A second defender arrives at 75% of contacts, against 69% (NFL 80%). The third: 37% → 41% (NFL 43%).

**The falls that remain with the flag on** (`run-dfall.mts` with the temporary per-term split, reverted):

| | Lean release | Impact | Other |
|---|---|---|---|
| Blockers (361) | 149: interior OL (C 35, RG 33, LG 26); request **−1.74 yd/s** into the man; lean 1.18× the load; release 0.85 yd | 165: TEs (Y 73, H 36); felt 3.3 mg; unfollowed accel 0.77 + tip 0.19 yd | 47: neither term (lean ≈ load, release below threshold; the capture point is within base until the last ticks) |
| Defenders (709) | 193: DT 111, LB 33; request −1.47; lean 1.1×; release 0.79 yd | 451: LB 166, DB 90; felt 3.2 mg; request 0 along the push | 65 |

- **Pass side** (`pass-fall.mts`, flag on): 58 of 65 traced go toward the rusher. The release is the whole jump. These are leans built over ~0.35 s at 1.18× a ~1-mg load, so lean release with the drive request.
- **Remaining lean releases (blockers 149, defenders 193, pass blockers ~19% of dropbacks):** real leans the law now permits, made frequent by requests that drive into the man at 1.25× the load. That is technique: Coverage's anchor for pass sets; for run blockers and defenders, Run Game and Defense.
- **Remaining impacts:** unbraced bodies hit by heavier or lower ones, coherent by the impact bench. For defenders this is Defense's take-on item. For blockers, TEs are hit while blocking down.

## What "pressure by a blocked man" is (`pressure-shape.py`; NFL 2022, 9,654 dropbacks; sim `LEAN_PITCH` + `PASS_ANCHOR`, 4 live games, 366 dropbacks; 2026-11-10)

**The rule.**

- **First pressure:** the first defender within 2 yd of the QB, from 0.3 s, before the throw.
- **Blocked:** an offensive player other than the QB within 1.2 yd of him then. This is proximity, not the engine's engagement flag.
- **Shape:**
  - *in front*: the nearest blocker is between him and the QB (nearer the QB by > 0.3 yd, within 45° of his line to the QB);
  - *edge*: otherwise, level with or past the blocker's shoulder.
- **Who closed the last 0.5 s:** the QB's displacement toward him against his toward the QB.

| Share of dropbacks | NFL | Sim | Excess |
|---|---|---|---|
| Pressured at all | 27.8% | 39.9% | +12.1 |
| Free rusher | 10.3% | 16.8% | +6.5 |
| Blocked, edge | 13.4% | 11.1% | −2.3 |
| Blocked, blocker **in front** | 6.4% | 13.1% | **+6.7** |
| ... of which the QB closed | 0.7% | 0.8% | 0 |

At the moment of pressure (medians):

| | Blocker depth | Blocker retreat, last 0.5 s | QB depth | QB then holds the ball | Closest the rusher gets |
|---|---|---|---|---|---|
| NFL, in front | 6.15 yd | 1.77 yd/s | 6.75 yd | 1.8 s | 1.71 yd |
| Sim, in front | 7.23 yd | 2.60 yd/s | 8.12 yd | 0.7 s | 1.58 yd |
| NFL, edge | 6.63 | 2.78 | 7.59 | 1.0 | 1.41 |
| Sim, edge | 6.45 | 2.55 | 7.91 | 0.4 | 1.30 |

**Reading, ranked by excess:**

1. **A blocker still in front, retreating into the QB (+6.7 points).**
   - He is 1.1 yd deeper and retreating 0.8 yd/s faster than the NFL's in-front blockers, and the QB is 1.4 yd deeper.
   - The rusher comes within 2 yd of the QB *through* the blocker's position, which is the pocket compressing at that spot. Pocket medians across all plays hide it.
   - Next to establish: is the blocker *pushed* (felt load, driven back against his request) or is he *kicking* by request to a set depth near the QB's (`PASS_KICK` set depth, the QB's drop)? The sim knows both.
   - Pushed means mine (anchor physics); kicking or a deep drop means Coverage (protection set and drop).
2. **Free rushers (+6.5 points).** Unblocked men: protection assignment and pickups, Coverage's lane. `first-pressure.ts` already splits these by the back.
3. **Edge rush (−2.3 points).** Below the NFL; not an excess.
4. **The definition is not the cause.**
   - QB drift is rare in both (2–4% of blocked pressures).
   - The NFL QB lives with a rusher at 2 yd for 1.0–1.8 s; ours ends the play in 0.4–0.7 s.
   - That is a QB response to proximity (sack or a hurried throw), Coverage's lane. It does not inflate the pressure count.
- Coverage's 85% blocked counts the engine's engagement flags. By proximity at the moment it is 58% (NFL 63%), so many of their "blocked" pressures are men whose block is nominally on but who are more than 1.2 yd from any blocker.

**The blocker in front: pushed or kicking?** (`pass-press.mts`; `LEAN_PITCH` + `PASS_ANCHOR`; 4 live games, 366 dropbacks, 158 first pressures, 56 with a blocker in front, 48 of them by OL)

| In-front pressures by OL | n | Requested retreat | Achieved | Felt load against him | Depth | His set target | QB depth | Pushed (achieved > request + 0.5, felt > 0.3 mg) | Kicking by request |
|---|---|---|---|---|---|---|---|---|---|
| Tackles | 38 | 3.34 yd/s | 3.39 | 0.15 mg | 7.16 yd | 5.37 | 8.20 | 10 | 21 |
| Interior | 10 | −0.11 | 1.06 | 0.79 | 4.79 | 2.12 | 5.85 | 7 | 3 |

**QB depth by time is not the cause** (`pocket.py`, same operator):

| | 2.0 s | 2.5 s | 3.0 s |
|---|---|---|---|
| NFL, QB depth | 7.39 | 8.06 | 8.11 |
| Sim, QB depth | 7.77 | 7.89 | 7.91 |
| NFL, tackles' depth | 4.70 | 5.65 | 6.21 |
| Sim, tackles' depth | 5.06 | 6.45 | **7.61** |

- The 8.12 yd QB depth at in-front pressures earlier was the pressured subset. Our QB is not deeper than the NFL's.
- Our tackles are 1.4 yd deeper by 3.0 s.

**By drop** (in-front OL pressures over dropbacks): seven 6/34, gun5 23/163, five 8/58, PA 6/50, quick 4/33, gun3 1/28. The deeper and longer drops lead.

**Reading.**

- **Tackles (38 of 48): a controller request, Coverage's lane.**
  - They are not pushed: the felt load is 0.15 mg and the achieved retreat equals the request.
  - They kick back at 3.3 yd/s by request, 1.8 yd past their own `passSetDepth` target, toward the QB.
  - This is `PASS_KICK`: it keeps an outside blocker level with or deeper than his rusher, up to 0.5 yd short of the QB. A tackle who kicks with the rusher to the QB's depth carries the rusher into the QB's 2-yd radius while staying "in front".
  - NFL tackles stop deeper retreat at about 6.2 yd by 3.0 s.
- **Interior (10): pushed.** Driven back at 1.06 yd/s under 0.79 mg while asking to hold, within 2 yd of a QB 5.85 yd deep. Anchor physics, mine, but 10 of 366 dropbacks (2.7%). Not a priority.
- **"Blocked in name only": none at the moment of pressure.**
  - Engagement flag on and a blocker within 1.2 yd: 67. Flag off and nobody near: 63. Flag off but someone near: 28.
  - Coverage's 85% counts rushers who were ever engaged, not the state at the pressure.

## Standing starts by position (`start.py`, `sprint-bench.mts`; NFL 2022 pass plays; sim `LEAN_PITCH` + `PASS_ANCHOR`, 4 live games, `WR_SNAP` off; 2026-11-10)

**One operator on both.**

- Displacement from the snap spot.
- Each player's start = the first 0.1 s frame displaced 0.25 yd.
- Displacement after his own start (reaction removed).
- Upper percentiles as a proxy for maximum effort.

| After his own start, +0.3 / +0.5 / +0.8 s (yd) | Sim in games | NFL p50 | NFL p75 | NFL p90 | World alone, max effort from rest (same 0.1 s alignment) |
|---|---|---|---|---|---|
| WR | 0.92 / 1.77 / 3.30 | 0.79 / 1.58 / 3.08 | 0.88 / 1.74 / 3.38 | 0.96 / 1.88 / 3.61 | 0.88 / 1.72 / 3.24 |
| TE | 0.81 / 1.53 / 2.88 | 0.69 / 1.36 / 2.61 | 0.81 / 1.60 / 3.04 | 0.90 / 1.75 / 3.33 | 0.82 / 1.58 / 2.96 |
| DL | 0.79 / 1.46 / 2.23 | 0.62 / 1.16 / 2.07 | 0.71 / 1.35 / 2.44 | 0.79 / 1.51 / 2.80 | 0.79 / 1.50 / 2.81 (DT) |
| LB | 0.70 / 1.26 / 2.16 | 0.58 / 1.13 / 2.08 | 0.73 / 1.42 / 2.66 | 0.85 / 1.64 / 3.06 | 0.86 / 1.66 / 3.14 |

| Start (p50) and displacement from the snap at 0.3 / 0.5 s | Sim | NFL |
|---|---|---|
| WR | 0.3 s; 0.35 / 0.91 | 0.5 s; 0.08 / 0.31 |
| TE | 0.3 s; 0.28 / 0.75 | 0.5 s; 0.10 / 0.31 |
| RB | 0.3 s; 0.29 / 0.72 | 0.6 s; 0.04 / 0.16 |
| DL | 0.4 s; **0.12** / 0.47 | 0.4 s; **0.21** / 0.52 |

**Reading: not one law, three separate causes.**

1. **The shared acceleration capacity is not too high.**
   - The World's own maximum-effort start sits at the NFL's p75 (WR, TE) to p90 (DL) of starts, below the NFL's best.
   - In games our WRs, TEs and DL start at that maximum, and NFL medians are below it.
   - So "too fast" is effort, not capacity. Leave the shared law alone. Changing it would make DL slower still.
2. **WR and TE: every route starts at full effort, and TEs and RBs leave early.**
   - They start at 0.3 s against 0.5–0.6. `WR_SNAP` fixes the WRs only.
   - After starting they run at the World's maximum on every route, where NFL medians run below their own maximum (Coverage: NFL go routes start like hitches).
   - These are route-stem tempo and snap reaction for TEs and backs: Coverage's lane.
3. **DL: the get-off's early tail.**
   - Median start is equal (0.4 s), but the NFL is ahead at 0.3 s (0.21 against 0.12 yd).
   - After starting, our DL are at NFL p90.
   - This is snap anticipation and the get-off distribution, the `DL_SNAP_TIME` question: Defense and Run Game.

**The deciding bench** was this one: the World alone, a standing start at full request, read through the same 0.1 s alignment as the tracking. Nothing to build.

## The zone backside tackle running flat (`flat-bench.mts`, `ol-flat.py`; NFL 2022 outside zone, 1,588 runs; 2026-11-10)

Both sides are aligned to his own start (the first 0.1 s frame displaced 0.25 yd).

| At +0.5 / +1.0 / +1.5 s after his start | Displacement (yd) | Speed (yd/s) |
|---|---|---|
| NFL backside T, p50 | 1.30 / 3.10 / 4.98 | 3.28 / 3.78 / 3.71 |
| NFL backside T, p75 | 1.43 / 3.43 / 5.55 | 3.62 / 4.31 / 4.38 |
| NFL backside T, p90 | 1.55 / 3.70 / 6.03 | 3.91 / 4.74 / 4.90 |
| World, OT, facing the travel ("turn") | 1.31 / 3.30 / 5.75 | 3.38 / **4.49** / 5.28 |
| World, OT, facing upfield ("square") | 1.16 / 2.79 / 4.62 | 2.88 / **3.50** / 3.83 |
| World, OG, turn / square at +1.0 s | 3.58 / 2.65 | 4.85 / 3.28 |

- **Setup:** generated OT/OG bodies at rest, posture 0.8, full lateral request; 10 bodies × 4 frame phases.
- **The body can do it.** Turned to run, a tackle passes the NFL's p75 by +1.0 s and its p90 by +1.5 s.
- **Square, he cannot.** He keeps facing upfield, so his drive is the directional (sideways) share. He tops out at 3.5–3.8 yd/s, below the NFL median, where the sim's backside tackle runs (3.1–3.3 with a man on him).
- **The limiter is the facing-against-travel penalty**, not the turn from stance, traction or mass.
- Whether he opens his hips and runs, or shuffles square, is the zone footwork request: Run Game's lane, with `_btdouble.mts`'s requested facing and velocity as the check.
- NFL backside tackles at 3.8–4.7 yd/s are at least partly turned.

## What ends a pressured dropback (`pressure-life.py`; NFL 2022, 9,654 dropbacks; sim `LEAN_PITCH` + `PASS_ANCHOR`, 4 live games, 366; 2026-11-10)

- **First pressure:** as in `pressure-shape.py`.
- **Resolution:** the throw; else a scramble if the QB crosses the line; else a sack or the play ending in his hands.
- **Measured over the window** from pressure to resolution: the QB's movement, the rusher's closing, and whether a blocker is still within 1.2 yd of the rusher.

| Per dropback | Sim | NFL | Window (sim / NFL) | QB moved (sim / NFL) | Blocker on the rusher (sim / NFL) |
|---|---|---|---|---|---|
| Throw under pressure | **30.6%** | 17.2% | 0.4 / 0.4 s | 0.25 yd at 0.81 yd/s / 0.72 yd at 2.09 | 100% / 76% of the window |
| Sack / end in his hands | 5.7% | 6.3% | **0.5 / 1.5 s** | **0.67 yd at 1.29** / 3.26 yd at 2.36 | 0% / 33% |
| Scramble | 3.3% | 4.1% | 2.0 / 3.0 s | 8.8 yd at 3.97 / 13.9 yd at 6.04 | 0% / 9% |

- **Sacks:** 2 yd → 1 yd takes 0.3 s on both sides. 1 yd → the record's end: sim 0.3 s, NFL 1.1 s.
- The NFL end marker may lag the tackle; a stopped QB is not visible in sim frames, which end at the dead ball.

**Reading, ranked by count:**

1. **Throws under pressure (+13.4 points of dropbacks).**
   - Mostly the excess pressure itself: the QB releases within 0.4 s of a man at 2 yd on both sides.
   - Our QB does not move in that window (0.25 yd at 0.8 yd/s against 0.7 yd at 2.1). The NFL QB steps up or slides as he throws. That is a decision (pocket movement), Coverage's lane.
   - All our throw-pressures have a blocker on the rusher, which matches the in-front pressures found earlier.
2. **Sacks: the same rate, but over in a third of the time.**
   - Before contact the NFL QB moves 3.3 yd at 2.4 yd/s (escape, climb, spin out); ours moves 0.7 yd. The QB's evasion decision is Coverage's lane.
   - **Physics question, mine:** contact to down is 0.3 s against up to 1.1 s. Is a grasp on a QB who is moving and fighting becoming a tackle too quickly?
   - **Smallest bench:** a rusher's arriving grasp on a QB stepping away at 2 yd/s. Compare the time to down with a runner of the same mass at the same speed, then against the NFL's sack contact-to-down once the end-marker lag is known. That needs the tackle event time in the NFL source (BDB `qb_sack` / `tackle` frames).
3. **Scrambles:** close to the NFL in count. Ours are shorter and slower (8.8 yd at 4.0 against 13.9 at 6.0). A decision plus open-field running; not a priority.

**Not physics:** the rusher's closing speed with a blocker attached (throws: 2.6 against 2.2 yd/s; sacks: 1.9 against 2.9). Ours close no faster at a sack. The short sim windows are the QB's decisions (throw at once, no movement), not rushers arriving faster.

**Sacks: contact to down** (`nfl_sack_time.py`, BDB weeks 1–3, 180 sacks; `sack-trace.mts`, sim `LEAN_PITCH` + `PASS_ANCHOR`, 4 games, 16 sacks)

**NFL** (first defender within 1 yd → the `qb_sack` frame):

- Median 1.1 s (p25 0.7, p75 1.6). From 2 yd it is 1.6 s.
- The QB travels 2.5 yd at 2.4 yd/s in that time. NFL sacks are fights, then takedowns.
- So the record's end marker was not lagging: the NFL contact-to-sack really is ~1 s.

**Sim:** 14 of 16 sacks are the **in-the-grasp rule** (`tackle.ts:683–689`). A pocket QB held 0.25 s with any tackler's control or grip ≥ 0.6 is ruled down at once.

| Sim sacks | n | Bond held at the whistle | Grip reached 0.6 after | Max grip | QB travel during the hold |
|---|---|---|---|---|---|
| Whistled in the grasp (QB still up) | 14 | 0.25 s (p75 0.40) | 0.25 s (p25 0.05) | 0.71 | 0.23 yd |
| Physical fall | 2 | 0.6–0.9 s | — | — | 0.6–1.0 yd |

**Reading.**

- The short sim sack is a rule ruling, not a body going down: whistled 0.25 s after the first hold with the QB upright and nearly stationary.
- NFL officials rule "in the grasp" when control is clear and the QB's safety is in jeopardy. Most NFL sacks run about a second of struggle to a takedown.
- **Rules interpretation (Integration):** a held time of 0.25 s and grip ≥ 0.6 as the whole test.
- **Physics, mine, only if the rule stays:** grip reaching 0.6 within 0.05–0.25 s of the first hold on a QB.
- **QB, Coverage:** he barely moves while held (0.23 yd), against the NFL QB's 2.5 yd of fighting and escaping.
- **The rule comes first.** With a takedown required, the grasp, fall and escape physics would decide sacks, and the bench (a grasp on a QB stepping away at 2 yd/s, time to a physical fall) becomes the measure.

## Where a holder's turn comes from (`yaw-ledger.mts` with a temporary per-source spin ledger, reverted; fixed run set, run-ref-12; 2026-11-10)

**Method.** Every write to a body's spin in `world.ts` was logged by source and partner. Sources:

- the gait's turn (`feet`);
- grasp rows through the support-impulse path (`support`);
- hands and strikes;
- torso-contact normal and friction lever arms (`contactN`, `contactT`);
- passive off-feet friction;
- the two-point wrap.

Each tackler's first 0.5 s in the tackle bond is attributed by integrating each source's spin change over the rest of the window. The spin brought in plus the sources closes on the measured turn.

| Holder (all are leg holds, leg share > 0) | Turn (median) | Grasp rows, `support:runner` | Gait (feet) | Runner contact friction | Third bodies | Off-feet friction | Spin brought in |
|---|---|---|---|---|---|---|---|
| Side (968) | 89° | **+164°** | −106° | +8° | 0° | −2° | +28° |
| Behind (313) | 51° | **+71°** | −52° | +7° | 0° | −3° | +35° |
| Front (1,323) | 66° | **+125°** | −73° | +24° | −4° | −1° | +11° |

(Signed means along each holder's own net turn.)

**Reading.**

- **The turn is the grasp rows' moment on the holder**, applied through `supportImpulse` with the patch lever arms (`world.ts` ~2764 normal, ~2779 tangential).
- **Not the others:** third-body contacts in piles are about 0. Off-feet friction is about 0 (a small brake). The torso contact with the runner adds a little.
- **The gait fights it.** Its yaw spends −52 to −106° resisting, and a held facing request cannot stop it.
- **The lever.** For a held man's legs (the lower patch, which is every hold here) the holder's arm is the full vector from his centre to the grip point on the runner (`rax = dx`, about 0.6–0.8 yd).
  - A tangential grip load as the runner moves across him acts on a rigid arm of that length, and turns his torso.
  - An upper wrap uses the chest radius instead (about 0.27 yd).
- **Why the frontal bench gave 0–3°:** it was a square hold, with little tangential load.

**Proposal** (not built; for Integration):

- **The candidate incoherence.** The holder's arms are treated as rigid in yaw. A real holder's hands are on the runner's legs at the end of his arms. The shoulders and trunk can pass only a bounded moment to the torso; beyond it the arms swing.
- **A flag, `GRASP_ARM_MOMENT` (off):** the yaw moment a grasp row passes into the holder's torso is bounded by his shoulder torque, as `HIP_BRACE` bounds a thigh hold's moment. The excess is the arm swinging, not the torso turning. The linear transfer is unchanged.
- **Bench first:**
  - a side and a behind leg hold on a runner crossing at 4 yd/s, with the holder's facing request held;
  - identity, linear momentum exact, a no-grasp world bit-identical;
  - the angular ledger stated (the swung arm's angular momentum is not represented in the reduced model).
- **Gates to pre-register:** side and behind rotation at +0.5 / +1.0 s toward the NFL's 34/76 and 27/64. Defense re-reads `HOLD_FACING` on it.

## `GRASP_ARM_MOMENT` (off): bench and first game read (2026-11-10)

**The law.**

- The yaw moment a grasp row passes into the holder's torso is bounded per substep by his shoulders: arm force (`supportParams.armForce` = 0.75 × power × g, strength-derived, × fatigue) across `CHEST_HALF`. The capacity is set by ratings; no outcome is prescribed.
- The unpassed remainder is his arms swinging. The reduced model does not represent that, so it is not applied to anyone and is reported as `StepReport.armSwingYaw`.
- Linear transfer and the runner's side of the row are unchanged.

**Bench (`arm-bench.mts`, the World only).**

- Linear momentum with free intents: 3.1e-13. The no-grasp digest is identical off and on (024bfc743088).
- **Adverse case passes:** a strong holder (power × 1.3) in a tight, square two-arm wrap on a slow runner who spins is still turned, by 57° at +0.5 s and 44° at +1.0 s, the same either way.
- **The bench does not reproduce the game's turn:** side and behind leg holds turn 0–1° in both arms. In isolation the holder's gait has yaw to spare; in games it is spent (the ledger: −52 to −106°).

**Game read** (`yaw-ledger.mts`, fixed run set, run-ref-12; holder turn in the first 0.5 s of each hold, p50):

| Holder | Off | On |
|---|---|---|
| Side | 89° | 68° |
| Behind | 51° | 43° |
| Front | 66° | 56° |

**Pre-registered gates** (attempt 1, on run-ref-13 once on develop):

1. **Rotation** (hitter rotation at +0.5 / +1.0 s, `frontcourse.py`): side toward the NFL's 34/76, behind toward 27/64, front staying near 44/89.
2. **Paired 1,321 runs:** missed and broken tackles, unfinished holds, and yards after contact. Each explained by the mechanism; no regression caused by a bug.
3. **Then** Defense re-reads `HOLD_FACING` on it, and I re-read `TORSO_CAPSULE` + `CONTACT_LAYER`.

**Gate read on run-ref-13** (attempt 1).

Holder turn in the first 0.5 s of each hold (p50, `yaw-ledger.mts`, fixed runs, paired):

| Holder | run-ref-13 | + `GRASP_ARM_MOMENT` | NFL (Defense's hitter-rotation operator, +0.5 s) |
|---|---|---|---|
| Side | 79° | **57°** | 34° |
| Behind | 46° | **41°** | 27° |
| Front | 64° | **53°** | 44° |

**What still turns them, with the flag on** (the per-source ledger, signed along the turn):

| Holder | Grasp moment (capped) | Spin brought in from the approach | Runner contact friction | Gait |
|---|---|---|---|---|
| Side | +47° (was +164°) | +28° | +9° | −17° |
| Behind | +27° (was +71°) | +28° | +3° | −5° |
| Front | +38° | +15° | +17° | 0° |

- About half of what is left is spin the holder brought into the hold from his approach. That is his facing request before the hold (controller), the part Defense's `HOLD_FACING` addresses.

**Paired 1,321 runs** (`ref:report --flag GRASP_ARM_MOMENT=1`, ref = run-ref-13):

- Yards: 3.97 → 3.85 (paired −0.12, SE 0.03). IZ −0.23, gap −0.12, duo −0.14, OZ −0.07.
- Broken tackles 0.147 → 0.127 (engaged-grab breaks 0.070 → 0.067). Missed 0.239 → 0.238. Missed + broken open 0.316 → 0.299 a run.
- `frontcourse` hitter rotation on front-on contacts: essentially unchanged.

**Gates.**

1. **Met as worded:** side and behind moved toward the NFL; front stayed near it. Side is still 23° above.
2. **No bug-caused regression.** The yardage drop has a named mechanism: holders who are not spun off keep the runner (broken −0.020 a run). A worse statistic is not a veto.
3. **Next:** Defense re-reads `HOLD_FACING` attempt 2 on this flag (the approach spin), then the `TORSO_CAPSULE` + `CONTACT_LAYER` re-read.

## `TORSO_CAPSULE` + `CONTACT_LAYER` re-read on `GRASP_ARM_MOMENT` (run-ref-13, paired, fixed 1,321 runs; 2026-11-10)

| Arm | Holder turn in 0.5 s, side / behind / front (p50) | Front-on runner speed kept at +0.1 / +0.2 s | Yards, paired against run-ref-13 | Missed / broken a run |
|---|---|---|---|---|
| run-ref-13 | 79 / 46 / 64° | 75 / 51% | — | 0.239 / 0.147 |
| + `GRASP_ARM_MOMENT` | 57 / 41 / 53° | 73 / 50% | −0.12 (SE 0.03) | 0.238 / 0.127 |
| + `GRASP_ARM_MOMENT` + `TORSO_CAPSULE` + `CONTACT_LAYER` | 61 / 40 / 57° | **86 / 60%** | +0.34 (SE 0.11) | 0.256 / 0.151 |
| NFL | 34 / 27 / 44° (Defense's operator) | 90 / 82% | | |

- Speeds kept are from `frontcourse`: runner speed at +0.1 / +0.2 s over his speed at −0.1 s.
- **The holder turn:** the capsule and layer keep nearly all of `GRASP_ARM_MOMENT`'s reduction (side +4°, front +4°, behind −1°).
- **Front-on retention:** they move it toward the NFL (+0.2 s: 50 → 60%; +0.1 s: 73 → 86%). `GRASP_ARM_MOMENT` alone does not touch it.
- **Cost:** missed tackles +0.017 a run, broken +0.024. Yards +0.34 against run-ref-13, +0.46 against `GRASP_ARM_MOMENT` alone.
- That direction is NFL-ward on the shared tackle index: head-on yards after contact are 1.1 in the sim against the NFL's 2.3.
- **Stays off.** Defense's `HOLD_FACING` read on `GRASP_ARM_MOMENT` comes next, then a combined read.
