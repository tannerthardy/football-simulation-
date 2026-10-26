# Runner exit rule: predeclared hypotheses (Task 3)

The hypotheses below were written on 2026-10-26, before any treatment outcome was examined, on top of
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

## Results (2026-10-26) and decision: stop, no candidate

The arms ran as predeclared, as scratch switches on #302's head (develop
behavior). Inputs:
- Phase I `runner-set.bin` (S11/S12, SHA-256 `102b3236…`);
- Phase II `heldout-set.bin` (S13/S14, `7f2c4462…`);
- matched-restage captures of seeds 11–14 (173 designated runs; they contain
  the archive plays, e.g. M12-7 = S12-P011, M14-39 = S14-P054).

The develop arm reproduces Phase II's accepted results on all 48 archive
plays, with the shadow evaluations on. That shows the shadows install nothing.

**Cases picked before any rule arm ran**, from develop-vs-A exit
disagreements and those two arms' outcomes:
- S12-like: M12-125. Under A at 1.40 s the aim is blocked and he stays; he
  is hit at 2.05 s for −1.60 yd. Develop exits there and gains 28.09.
- S11-like: M13-28. Develop exits at 1.50 s, is hit at 2.40 s and makes
  −0.67; A stays and makes +3.82.

The decision logs also carried the rules' shadow verdicts, and I saw those
before picking.

| Witness | develop | A | A + (i) | A + (ii) |
| --- | --- | --- | --- | --- |
| S12-P011 Duo | 5.34, exit 1.55 | −1.29, stays | **5.34, exit 1.55** | **5.34, exit 1.55** |
| S14-P054 Counter | 44.83, exit 1.30 | −2.70, stays | **31.83, exit 1.30** | **31.83, exit 1.30** |
| S11-P029 Duo | 12.05, exit 1.20 | 2.89, stays | ✗ −1.00, exit 1.20 | ✗ −1.00, exit 1.20 |
| S14-P043 Draw | 29.85, stays | 12.01, exit 1.90 | ✗ −2.96, exit 1.30 | ✗ −2.96, exit 1.30 |
| S11-P022 Counter | −0.63, exit 2.20 | 5.32, stays | 5.32, stays | 5.32, stays |
| S14-P023 Trap | 6.33, exit 2.10 | −1.11, stays | −1.11, stays | −1.11, stays |
| M12-125 (S12-like) | 28.09, exit 1.40 | −1.60, stays | 28.09, exit 1.40 | ✗ −1.60, stays |
| M13-28 (S11-like) | −0.67, exit 1.50 | 3.82, stays | ✗ −0.93, exit 1.50 | 4.45, exit 2.10 |

Across all 221 runs (210 reach a designed decision):

| | develop | A | rule (i) on develop's arrival | A + (i) | A + (ii) |
| --- | --- | --- | --- | --- | --- |
| Runs that leave the design | 38% | 20% | 65% | 77% | 72% |
| Leave on the first decision beat | 35 | 16 | 68 | 90 | 82 |
| Total yards (description only) | 1493 | 1494 | 1246 | 1158 | 1134 |

**Why (i) fails.** In the evaluator's own 2.0 s straight-line forecast,
without a restraint forecast, the designed aim is "blocked" on most runs at
the line. Some heading in the ±0.9 rad fan is almost always unblocked, so
"blocked plus an alternative" is nearly always true. That makes it close to
an always-exit rule, which the stop rule forbids.
- S11-P029 is forced out at 1.20 s.
- So is S14-P043, at 1.30 s; on develop it stays and gains 29.85.
- So is M13-28.

**Why (ii) fails.** At decision depth the runner is slow (1.2–2.5 yd/s), so
a turn costs a few hundredths of a second and rarely removes an alternative.
- S11-P029 and S14-P043 are still forced out.
- Where the cost does bind, it blocks a needed exit: M12-125 stays and loses
  like A.

## The missing pieces (written down per the stop rule)

1. **The exit and the post-exit lane are decided by different consumers.**
   The rule justifies leaving with one alternative. The next open-field
   evaluation (spread ±1.55 rad, no aim term) then picks its own lane by the
   score.
   - S14-P043 at 1.30 s: the rule saw straight-ahead alternatives (−0.11 to
     0.11 rad), but the runner then cut to −1.29 rad and lost 2.96.
   - M13-28: the rule's only alternative was −0.90; he ran −0.58.

   A coherent exit commits to the alternative that justified it, or the gate
   and the lane choice are one decision.
2. **S11-P029's loss is not the exit's.** Develop and A + (i) leave at the
   same beat (1.20 s) from the same state. The first divergence is the
   1.25 s open-field request:
   - develop picks heading 0.73 (vel 3.14, 2.83) and gains 12.05;
   - under A it picks 0.40 (8.68, 3.67) and loses 1.00.

   So the held-up credit is doing real work in open-field lane selection,
   which is a downstream consumer of the same arrival model. Model A alone
   ("observed slowing and bodies in the way") misses protection the runner
   can actually see developing there. This is the case Brief B named for a
   new research task: an acquired-evidence restraint forecast (for example
   contact persistence or the defender's observed progress against the block
   over the last beats), with positive and deceptive controls, not a duration.
3. **"Blocked" needs a trend, not a snapshot.** At the mesh a designed track
   is normally blocked in a static 2 s forecast; that is why it has a
   design. Evidence that the design is failing is the picture getting worse
   across beats: penetration toward the track, the crease closing, the lead
   blocker losing ground. A rule built on the single-beat blocked flag cannot
   tell that from a block that is about to open.

No candidate is frozen, so seeds 15–16 are not spent. Model A is not ready
alone (piece 2), and neither rule is ready on top of it.
