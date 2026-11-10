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
