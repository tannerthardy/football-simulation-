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
