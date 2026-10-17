# Body weight, strength and run-block response

**Keep real mass in momentum and support. Investigate the force-capacity mapping
and the requested block before changing how weight influences football.** The
current engine can produce a strong weight advantage in a sustained square shove,
but the new controls do not demonstrate a bad mass/impulse solver. They identify
the source of the advantage: heavier profiles also receive more muscular force
and available traction, while sufficiently strong players share the same
per-pound drive ceiling. No runtime correction is proposed from this evidence.

## Reference, question and cost

Accepted #112 merge `d682b1f474cb6ba260a7b8b1119a62919c5a2159`, engine source
`bed3c36cf08407762fed67abdf0a1651fe6ed7fc8c09b43ab3d9b33f1dfd4616`.
Historical4ded6b6 and production defaults stay unchanged. Panel revision
`2ea0fdc5d70a8cd83dbff9ffa1e2707b5025af42`; independent no-block control
`43da7cea` and typecheck `adeb545`. Node22.23.3, baseline44 flags/components1,
CF_FLOW unset, ordinary center-contact World. Exact settings, inputs, profiles,
raw hashes and costs are in the [evidence](../../data/reviews/current/block-mass-response.json)
and [input manifest](../../config/block-mass-response.json).

The supplied report is Claude's
[943f1d3 research](https://github.com/tannerthardy/football-simulation-/blob/943f1d33c181325d9ba839da4a7b195d60c658b7/docs/reviews/open-field-tackling.md).
Reuse [#113's independent qualifications](https://github.com/tannerthardy/football-simulation-/pull/113):
its weight table is observational, the fresh per-pair operator/raw data were not
published, and the source/flags include historical experimental controllers.
Little NFL correlation between weight and an outcome does not establish that
mass has little causal effect. Assignment, direction, strength, initial leverage,
double teams, duration and selection can all change the observed relationship.

Measurement's subsequent
[claim-by-claim audit atf8dbdcb](https://github.com/tannerthardy/football-simulation-/blob/f8dbdcb03ee2c79c6ae10251103560c04710dada/docs/reviews/open-field-nfl-claims-review.md)
confirms that causal limit and the missing weight scripts/joins/cell counts.
It also reproduces post-whistle admission in some secondary/LB operators and
shows that centered "entry speed" includes post-contact movement. The quoted
LB shedding, sensory latency and role-share interpretations are not independent
physical constraints. Verified .6yd median before contact and4.447/3.0yd gain
aggregates remain descriptive references, not force-fitting targets. Our panel
uses actual World loads and no NFL-derived coefficients. A later football
comparison must use live windows, stable identities and explicitly named
pre-contact velocity rather than those contaminated/proxy definitions.

Twenty short mechanical reps plus one unblocked control answer specific questions;
there is no new football panel/game. The existing fixture contains22 bodies,
with only the selected two near contact. Controlled analogues share geometry,
mobility, posture and hand control; generated TE/DT controls retain their actual
profiles. Prescribed commands are experimental inputs, not new controller policy.
Actual production engagement separation/down/geometry lifetime remains active.
The fixed hand-control intervention is explicit; no claim about hand skill or
controller execution randomness follows from it.

Final20-rep collector takes.727s internally/1.195s including launcher. Across the
16-rep preliminary collection,20-rep final collection, two executions of the one
free control, and two typechecks, launcher command cost is28.888s. The second free
execution corrects the sign of its reported delay; physical motion is unchanged.
There are21 unique mechanical conditions and38 executed conditions, not38 unique
cases. Typecheck passes. No full suite or game campaign; source/tests/defaults
are unchanged. Offline reduction executes no new simulations.

## Where weight enters

The same mass affects several separate quantities:

- Inertia: a delivered impulse changes velocity by impulse/mass.
- Traction: the assumed level-ground ceiling is `1.1 * mass * g`.
- Strength mapping: `power = mass * strengthCoefficient`, derived from the
  strength rating and225lb bench repetitions; arm force scales with power too.
- Base size/inertia and, in complete roster derivation, radius and recovery speed.

The ordinary ground driver clips push force at the traction ceiling. With bench30,
strength75/85/95 produces raw coefficients1.109/1.163/1.217, but all three have
the same maximum push:1.1 times body weight. Upper-body arm capacity still varies.
This is a traction-limited model assumption, not proof that the strength ratings
are entirely ignored or that traction may be exceeded to make them matter.

## Controlled line-size results

All rows below request3yd/s toward the opponent, with identical starting support
and common body geometry. Use **pair center-of-mass displacement** to measure a
sustained drive: each body also moves while the initial working gap compresses.
For example, the equal pair's defender moves−.105yd and blocker+.105yd, while
the pair COM stays still. Calling that an equal-weight defensive win is wrong.

| Controlled square rep,2 seconds | Pair COM toward offense's drive, yd |
| --- | ---: |
| 300lb versus300lb, normal strength mapping | .000 |
| 315lb versus300lb, same strength/bench | +.412 |
| 345lb versus300lb, same strength/bench | +1.153 |
| 345lb versus300lb, fixed raw absolute power | +.515 |
| 345lb versus300lb, equal actual leg/arm capacities | +.070 |
| 285lb strength95 versus300lb strength60 | +.077 |
| 315lb strength60 versus300lb strength95 | −.097 |

The equal-capacity experiment changes diagnostic profile inputs only. Both
actual leg capacities are1605.329kg yd/s²; the heavier body's unused traction
ceiling remains higher. The comparison removes the continued force advantage
without changing mass or the solver. It is an isolation experiment, **not a
replacement player-strength mapping**. The smaller residual includes the
different initial gait/inertial transient. Fixing raw power alone does not fully
equalize the clipped actual force; that is why both controls are retained.

First physical differences appear in the first50ms's force/momentum response,
before any football decision. By.5s,315/300 supply opposing ground forces
1685.596/1605.329kg yd/s². Their net80.266 accelerates the pair. There is no
unexplained extra contact impulse: internal reactions and external ground impulse
reconcile with both bodies' momentum each interval. Maximum residual across the
panel is1.11e−12kg yd/s; whole-World planar work residual is1.97e−12kg yd²/s².
Arm impulse/work remain within existing budgets. Units are not Newtons/joules.

The equal-pair longitudinal mirror matches exactly. Refining the345/300 square
rep to48 subdivisions changes defender displacement.002075yd and COM.002621yd.
This supports the local attribution; it is not an independent continuous-law
reference or clearance of known angular/solver failures.

## Requests and smaller blockers matter

A defender asked to stand still against the345lb body gives up1.563yd, compared
with1.041yd while requesting a square counter-drive. A zero-speed command does
not automatically create stronger anchoring. A lateral crossing request moves
the contest out of the square shove and the real engagement ends at1.10s.
This is **not** proof of improved run fits or a successful block: no runner or
protected lane exists in these drills, and later unopposed travel is not useful
blocking displacement. It demonstrates why a weight table needs request context.

The250/330lb size analogue loses1.883yd of blocker position under square work;
the190/330 and130/350 extremes lose3.460/3.553yd. Those extremes are diagnostic
size comparisons with common geometry, not complete positional players or
estimated failure rates. They preserve a meaningful large-body mismatch.

Actual generated profiles are249lb TE versus308lb DT. The TE loses2.577yd of
position in2s. He also has less mapped strength, so this is not a mass-only
comparison. Lower TE pads/higher DT pads produce the same displacement here:
posture affects support/contact height, but does not provide a free horizontal
force multiplier while both bodies remain upright. This does not show that
leverage is irrelevant in angled contacts or near loss of balance.

The same DT/profile/request with the blocker removed supplies the opposing
control:

| Elapsed | Unblocked DT advance | Blocked DT advance | Difference |
| --- | ---: | ---: | ---: |
| .5s | .287yd | .143yd | .144yd |
| 1s | .954yd | .641yd | .313yd |
| 2s | 2.982yd | 2.781yd | .200yd |

At.5s the DT is moving1.010yd/s free versus.440 while blocked. By2s the loaded
DT is moving faster than the free control (2.519 versus2.343yd/s); felt-load
drive is additional to free gait. Retain that limit, not only the early delay.
These are completed2s drills, **censored as football interactions**: they do not
establish a tackle, a block-win percentage or protection of a runner's approach.
Giving ground and providing no useful delay are different claims.

## How to adjust this properly

1. **Preserve mass, momentum and a genuine size mismatch.** Do not assign a
   smaller effective mass to heavy linemen or a role-specific block-win roll.
   A small receiver's square drive and an angled chip are different tasks.
2. **Calibrate absolute force separately from body weight.** The present
   profile already supports an absolute `power` independent of mass; the control
   proves no solver rewrite is needed to investigate that mapping. Use bench
   only as an upper-body proxy, not measured leg-drive force. A supported
   push/anchor task is needed to choose how strongly leg/arm capacity scales
   with size. Stronger players hitting the same traction ceiling is a separate
   question; changing power alone cannot exceed that ceiling.
3. **Grade useful position and time, not just who moves whom.** For the next
   football witness, hold the initial geometry/requests fixed and ask whether
   a TE delays, seals or redirects the DT until the runner reaches the entry.
   Run owns the requested technique. Use a successful ordinary line block and
   an honest TE/DT loss as controls; movement trials remain separate.
4. **Promote only a supported candidate.** A new strength/traction/leverage
   mapping needs independent calibration or a physical-response contradiction,
   followed by focused moving/oblique contacts and independent review. Preserve
   successful/adverse football cases before Integration's combined verification.
   The old NFL weight correlation alone cannot pick a coefficient.

**Continuation:** [strength calibration and runner-arrival evidence](block-strength-calibration.md)
adds independently sourced bounds, a default-preserving absolute-capacity
interface and three accepted football controls. Numerical roster calibration
remains held; the recommendation below records the original diagnosis checkpoint.

**Single best next step at that checkpoint:** obtain one source-pinned push/anchor capability bound
or feasible-request contact witness from Measurement/Run, then test the smallest
absolute-force mapping or demonstrated response correction against this panel.
No production weight nerf is justified yet. The solver remains parked; existing
mechanical holds, failed budgets and independent references are not cleared.

Reproduction (Node22.23.3):

```sh
node scripts/baseline.mjs --candidate --receipt out/block-mass-response/panel.receipt.json -- node --import tsx scripts/diag/physics/block-mass-response.ts
node scripts/baseline.mjs --candidate --receipt out/block-mass-response/delay.receipt.json -- node --import tsx scripts/diag/physics/block-mass-delay-control.ts
node scripts/baseline.mjs --candidate --receipt out/block-mass-response/typecheck-final.receipt.json -- npm run typecheck
python3 scripts/diag/physics/block-mass-summary.py
```

Old preliminary receipts are optional on a clean rerun; retain original costs in
the committed evidence and record the new execution separately. Raw substep
forces stay in ignored `out/`; no new measurement pipeline was opened.
