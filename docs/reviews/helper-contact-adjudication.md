# PR #66: five helper assertions, four situations

**Two failures expose a feasible collection action that the controller misses.
The other three prescribe opportunities/contact signatures that do not survive
the law change. None of the five demonstrates a new physical-response defect.**
Keep default promotion on hold for the collection dependency; do not relabel
all five as obsolete or restore center torque to recover their old outcomes.

Reviewed [PR #66](https://github.com/tannerthardy/football-simulation-/pull/66)
at `2c2410b7d5b7b27e8c92acf79b1c68d1d3c4d98c`, runtime
`1332ddb19468741bba70ed2b0354b7f2e0babff2`, source
`8e0226116bb611cb4ccaf446b6672caca208a34b441b7336b59c0c0ef6e755b3`.
Final observation tool: `4304910a2f02c0c311c0823e3d3d679879577d96`.
No runtime code or test expectation changes in this review. Pass protection
was separately checkpointed/pushed at `e33ac76` on `codex/pass-loaded-objective`
before this work; its #57/#64/#67 evidence and rejected alternatives remain intact.

## Decisions for Physics and Integration

| Assertion in `test/zone-helper-check.test.ts` | Decision | Demonstrated reason / disposition |
| --- | --- | --- |
| Recovery recheck, eventual `checked(f) === true` (line 175) | **Invalid old compulsory-climb expectation** | The real safety invariant passes: down clears confirmation, recovery starts a new confirmation and never releases immediately. At the next 1.70 read the changed C/DT_W fit has phi .5602, versus .0218 under center. Confirmation resets, and the helper instead joins the first level. A changed fit cannot inherit an obligatory old climb. Preserve recheck/reset assertions; make any climb requirement conditional on an actually retained opportunity. |
| Lost loaded contact, side -1 (line 198) | **Genuine missed feasible collection: controller routing** | Owner release succeeds; helper retains the DL job and correctly declines to climb. The helper's direct half-man approach runs into C. An ordinary, observed-teammate waypoint from the same post-shed state reaches new loaded hands without a C/LG collision. This is a routing dependency for the run/climb owner, not evidence for changing force response. |
| Lost loaded contact, side +1 (line 198) | **Same demonstrated collection error on the other side** | The same single diagnostic construction succeeds with the other controlled geometry. Preserve both adverse originals and both successful diagnostic continuations; no forced contact, capacity change or removed body. |
| Native Under, one RG check/climb by the old deadline (line 384) | **Invalid old guaranteed opportunity/deadline** | At 1.00 neither acquired LB nor RB supplies arriving work. At 1.25 LB does, but RT's read-time phi has changed .3724→.8300; DE_S is already backfield of RT. RG stays and physically joins DE_S at 1.60. Useful first-level need has changed; no demonstrated simultaneously safe and achievable missed climb. Keep supported-opportunity behavior tests, rather than this input's former transition count/time. |
| Native Tite, compression >0 and one climb (line 471, plus later endpoint) | **Invalid compression and compulsory-climb expectations** | The completed 1.30–1.35 step has active, upright Y hands carrying lateral -196.516 with zero compression. This is accounted force, not automatic loss of contact. At .75 RT's consumed surface phi is .55125, already outside the existing .55 confirmation criterion; at 1.00 actual read-time phi is .8881. No supported confirmation survives to arriving work. RT stays and joins at 1.35. Don't replace this with a mandatory compression, release or defensive/offensive ending. |

The two center-history hashes are **Integration compatibility questions**, outside
these five decisions. The original five failures remain reproduced and visible;
this report is not a green 52/52 claim or permission to rewrite hashes.

## Why collection is an action error, rather than failed physical execution

Reuse the original fixture verbatim: O31/D32, strength .55, play seed11,
Ace11 inside zone/Over, sides -1/+1, loaded C/DT_W, uncovered LG/LB_W.
These are **controlled loss geometries**, not native 22-player play outcomes:
the fixture intentionally parks the other players and idles their controllers.
Only C's torso is turned away to trigger the original shed. Bodies remain in
World, including the obstructing C. This scope cannot establish protection
through a naturally arriving runner; its RB stays parked at x34.

Under the isolated law, C's preceding loaded response leaves him directly
between helper and defender. LG retains his assigned target, sees DT_W with
.25-s delay, and requests roughly `(5.4, ±5.3)`yd/s. `updateEngagements` does not
cancel that request. World executes finite acceleration and then real C/LG
and C/DT_W contacts: the two linked bodies obstruct the route. At 2.25 the
helper is only .65yd from C and still about1.27yd from DT_W. By the 3.40 censor
he still lacks acquired hands. This is not proof that World should deliver
the unobstructed requested velocity through C.

One diagnostic uses an ordinary `goTo`, then resumes the unchanged helper
controller. At1.35 it acquires C's normal .05-s teammate observation and DT_W's
.25-s opponent observation. Its single waypoint is behind the seen C by
`helper.radius + C.radius + .15`, at the seen defender's y:
`(40.400855, 27.122012)` on side -1 and `(40.400855, 26.211321)` on side +1.
The normal World supplies turning, acceleration, support and all collisions;
the helper, owner and defender remain free to react physically. This action
requires an additional legitimate teammate observation, not hidden current C
coordinates or foreknowledge of his path. It demonstrates an available action,
not that the existing controller already consumed that cue.

| Through the identical 3.40 censor | Existing collection | Diagnostic route |
| --- | --- | --- |
| New helper engagement | None, either side | Requested3.15; first physically loaded step completes3.20, both sides |
| Helper–DT_W distance | 1.260 /1.263yd | .821 /.828yd |
| Final delivered normal/lateral force, side -1 | No helper hands | 255.888 /195.104 |
| Final delivered normal/lateral force, side +1 | No helper hands | 213.240 /235.184 |
| C/LG contacts | 25 each, summed1171.981 /1172.142N·s | Zero each |
| Climb | None | None; first-level responsibility preserved |

Initial loaded state and post-shed fork state match exactly in each paired
comparison. Existing fixture assertions continue checking arm impulse/work,
support work, traction and represented-work budgets on every step; observed
maximum work residual stays below7e-13. No engagement is awarded at the waypoint:
the unchanged attack must reach, acquire and physically load its new hands.

This proves **feasible collection**, not a reviewed production navigation
policy. It does not establish the earliest possible collection, native runner
protection, or transfer to moving fronts. Do-It-All retains run/climb/traffic
ownership. A minimal correction there must preserve useful combinations and
real obstruction; do not copy a special waypoint into shared physics.

## What the native traces say about protection

Both original Under/Tite inputs keep all22 players, normal observer history,
ordinary runner reactions and identical seeds/rosters between laws. Each
instrumented native endpoint matches an unobserved endpoint's complete
bodies/commands/intents/minds/RNG/events fingerprint. No cues or RNG draws are
added by observation. Physical frames and final requests are retained separately
from the helper's consumed read and raw request.

Under's acquired LB is still4.47yd away at1.00 and RB is x35.36 (the existing
arrival threshold is x37.2). When the LB becomes nearby at1.25, DE_S is
`(39.839,22.538)`, RT `(40.109,23.128)`: the defender has crossed backfield
of the keeper while the helper is approaching from `(40.117,24.061)`.
By2.00 RT has run to `(40.339,20.684)` while DE_S is `(38.943,21.723)`;
RG, now joined, is `(39.096,22.852)`, toward the RB at `(38.286,25.269)`.
Thus counted RT load does not certify that RT alone continues screening access.
The helper's continued first-level work has a defensible purpose. This is not
a proof that no alternative earlier climb could ever work.

Tite diverges similarly: at1.25 Y is upfield/outside of DE_S, while RT remains
on the runner-facing approach. The .75 consumed surface rejection is visible
before the later compression-zero sample. At2.00 Y is nearly1.49yd from DE_S;
live force alone must not certify reachable, useful protection. Preserve the
Physics owner's reach/retention/accounting questions rather than blessing all
later load merely because the ledger closes.

The native observations stop **live at2.00**. They explain why the test's old
climb opportunity is not invariant; they do not certify a completed defensive
win, a realistic final result, or sufficient first-level protection through
runner arrival. No runner is frozen to a recorded future path. No straight-line
distance/speed estimate is used to declare an achievable interception. The
collection conclusion instead rests on actual World execution.

PR66 already isolates the first C/NT response before changed commands and
supplies torque/work/mixed-contact/no-contact controls. Reuse those mechanical
receipts. **None of these five failures supplies a demonstrated additional
solver defect.** Physics retains the saved within-step yaw/refinement question;
this controller review cannot certify every loaded contact as realistic.

## Reproduction, cost and next decision

[Saved inputs/traces, receipts and measurements](../../data/reviews/current/helper-contact-review/summary.json).
Node22.23.3; exact44 flags in every launcher receipt, components1, active hands
off; only `handContact:center→patch`, `groundMovement:legacy`. Full World defaults
are retained in receipts. No capacities, solver, grip, runner, release timing,
spacing or production defaults changed. Historical `4ded6b6` remains the
comparison baseline; no experimental pass-protection patch is in this branch.

```sh
# Exact fixture/native observation: four existing situations, no fresh panel.
node scripts/baseline.mjs --candidate --receipt out/helper-review/trace.receipt.json -- node --import tsx scripts/diag/zone/helper-contract-review.ts
# One diagnostic route, both existing collection sides.
node scripts/baseline.mjs --candidate --receipt out/helper-review/route.receipt.json -- node --import tsx scripts/diag/zone/helper-contract-review.ts out/helper-review/route.json.gz --collection-route
# Recompute saved measurements/parity: zero simulations.
python3 scripts/diag/zone/helper-contract-review-report.py
```

Five original assertions fail exactly as reported; new diagnostic evidence
doesn't suppress them. The observation tool typechecks. Measured launchers sum
**21.99s**, including the failure reproduction, diagnostic typecheck and one
measurement-only observer correction/repeat. The repeated records retain exact
physical/request/event parity; no extra football input was introduced. Original
and final receipts remain visible. Zero games, fresh rosters or broad suites.
The existing52-case/182-mechanical receipts are reused, not rerun.

**Recommendation:** Physics keeps the isolated law intact while the run/climb
owner resolves the now-demonstrated collection route dependency. Integration
may review conditional recovery/Under/Tite contracts, preserving the genuine
missed collections and both center-history compatibility failures. Do not
promote by simply deleting failures or substituting “nonzero force = protection.”
One exact combined verification remains Integration's responsibility after
the controller/contract disposition is accepted. Resume the separate #67
pass-protection review from its clean checkpoint, without importing this law.
