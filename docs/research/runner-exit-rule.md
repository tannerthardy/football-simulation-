# Runner exit rule: predeclared hypotheses (Task 3)

Written on 2026-10-26, before any treatment outcome was examined, on top of
the passive split (#302) and the visible-block reads (#306). This note records
what will be tested and how it will be judged. It is research, not a mechanism
on by default.

## Fixed in every arm

**Arrival model A.** Each threat's reach time is `timeToReach(seen) + extra`.
`extra` is the explicit scenario parking or the observed recovery from his
delayed pose (both unchanged). The 0.25 s / 0.7 s held-up credit for a
perceived blocker within touching distance is removed (`blockerBonus = 0`).
Observed slowing stays in the seen velocity. Bodies in the way stay in the
route forecast's obstruction test.

**Route evidence.** Per candidate heading h, the evaluator's existing forecast:
- samples at `SAMPLES = 0.25, 0.5, 0.75, 1.0, 1.3, 1.6, 2.0 s`, so the
  horizon is 2.0 s;
- a sprint from `s0 = speed · max(0.25, cos(turn))`;
- a stop at the first obstructing perceived teammate or the first threat
  margin below 0.

`blocked(h) = !clean(h) && safeGain(h) < 1.5 yd`, with the candidate fan
`base ± 0.9 rad` plus the current heading and the aim. The rule is evaluated
on the same finite decision beat as today (`decisionInterval`).

## Hypothesis (i): blocked plus alternative

Leave the designed track at a decision beat iff
`blocked(aim) && ∃ h ∈ cands, h ≠ aim : !blocked(h)`.

No score enters. The alternative is "reachable under his current motion"
because the forecast starts from his current speed component along h.

## Hypothesis (ii): the same, plus commitment cost

Leaving costs the time to take his current velocity `v` (speed `s`, heading
`cur`) into the new heading, within the World's own envelope: braking
`p.brake`, and normal acceleration `An = p.lateral · cutSkill · (1 − 0.2 · s/vmax)`,
with `cutSkill = 0.85 + 0.35 · elusiveness` (the carrier's command value). For a
turn θ = |cur − h|:

    vn = s · |sin θ|                  transverse speed to cancel
    vb = s · max(0, −cos θ)           backward speed to brake (θ > 90°)
    Δt(h) = sqrt((vb / p.brake)² + (vn / An)²)

This is the shortest time to cancel those components at a constant
acceleration direction inside the ellipse `(at/At)² + (an/An)² ≤ 1`. The
commitment cost of h relative to staying on the design is
`c(h) = max(0, Δt(h) − Δt(aim))`. The alternative must stay unblocked when
every arrival along it is `c(h)` later:

    blocked_c(h): the same forecast with arrival(t) + c(h) in every threat margin
    leave iff blocked(aim) && ∃ h ≠ aim : !blocked_c(h)

There is no fitted duration, case ID, timestamp or yardage term.

## Arms (native, matched constructors)

1. develop: held-up credit on, the score gate `best > aim + 0.5 + 0.5·patience`;
2. A alone: no credit, the score gate;
3. rule alone: develop's arrival (credit on) for the route evidence and the
   rule. The rule then inherits the disputed forecast; this is recorded, not
   hidden;
4. A + rule: no credit, the rule.

Rule (i) is tried first. Rule (ii) is tried only if (i) fails a witness for a
reason the commitment cost addresses.

## Witnesses and how they are judged

| Witness | Required |
| --- | --- |
| S12-P011 Duo @1.55 | exits as accepted, for a reason the runner can see |
| S14-P054 Counter @1.30 | should exit |
| S11-P029 Duo @1.20–1.25 | must not be forced out early |
| S11-P022 Counter, S14-P023 Trap, S14-P043 Draw | opposing cases, kept |

I will also pick one S12-like case (A stays on a blocked design and loses) and
one S11-like case (an early exit loses) from seeds 11–14 matched captures,
from the develop-vs-A exit disagreements, before running a rule arm.

Each is judged on the trace, not yards:
- did the exit come from something the runner could see?
- was a valid commitment kept?
- where does the first heading or speed request diverge?

**Stop:** a rule that wins only through a score offset or hold duration,
always exits early, or needs true future motion stops. Two failed rules: stop
and write down the missing piece.

**Fresh panel** (after freezing): seeds 15 and 16, the first 12 designated
runs of each game in order, no filtering, every arm, once. If it fails, the
rule goes back to development and the seeds are spent.
