# Independent review of #118, #120 and #121

**ACCEPT each minimal correction for Integration preparation.** Exact combined
verification and adoption remain Integration's responsibility. No additional
physical-law, capacity or default approval is required for the reviewed deltas:
they repair existing direction, motion and accounting contracts. This conclusion
does not authorize a different support/fatigue model or experimental activation.

Review base/fetched `develop`: `d682b1f474cb6ba260a7b8b1119a62919c5a2159`,
source `bed3c36cf08407762fed67abdf0a1651fe6ed7fc8c09b43ab3d9b33f1dfd4616`;
queue `bf493d881f423540962c6b1ad3b889fe2662e8c8`. The reviewer is independent
of the Physics author. All three mutable PR heads were independently checked
through GitHub and match these pins; all remained open drafts.

| PR | Reviewed head | Classification and decision |
| --- | --- | --- |
| [#118](https://github.com/tannerthardy/football-simulation-/pull/118) | `3b426fb1b82639d99bb6384276cc315a3e266c42` | **ACCEPT:** repair existing vector support accounting; no new force or budget. |
| [#120](https://github.com/tannerthardy/football-simulation-/pull/120) | `35f87c90c5e39bf2fa9c9c513aae7ae5e82c8e41` | **ACCEPT:** existing spin transport, completed effort and diagnostic memory repair. |
| [#121](https://github.com/tannerthardy/football-simulation-/pull/121) | `1dc41611d82a7cb5e81db259e0e6f185ac2abcb5` | **ACCEPT:** existing all-participant energy persistence, independent of Physics. |

## Directional bracing: #118

The pre-existing World describes established lean and a bounded ankle/hip
response, stores tipping as a vector, and uses the actual clipped ground brace.
Replacing that brace with one scalar allowed a forward counterlean to erase an
independent transverse couple. The patch changes no force, force point, inertia,
traction, strength or recovery coefficient. For stored moment vector `T`, brace
`b`, ankle fraction `a` and existing lean fraction `l`, its subtraction is
`a*T + max(l-a,0)*projection_b(T)`. The ankle contribution has norm at most the
one aggregate ankle allowance. The extra lean contribution is along the attained
brace plane. It is applied after all contacts, once per body, rather than granting
a new allowance per hand.

The cross-product restoration has the correct sign and agrees with the independent
dot-projection expression. Exact represented collinearity takes the old arithmetic
path, including opposing signs. This preserves the inherited aligned-lean sign
and magnitude assumption; it does not newly validate that assumption. Zero brace,
zero moment and ankle-dominated cases retain their previous path.

Reused evidence at source
`19f0ce52abb734528929375f9fd3aee219e619d267c5656151dab57badc6f830`:
[author report](https://github.com/tannerthardy/football-simulation-/blob/3b426fb1b82639d99bb6384276cc315a3e266c42/docs/reviews/directional-load-bracing.md)
and [receipts](https://github.com/tannerthardy/football-simulation-/blob/3b426fb1b82639d99bb6384276cc315a3e266c42/data/reviews/current/directional-load-bracing.json).
The independent force-height oracle gives a 400 moment: former cancellation
389.825 exceeds the 236.667 ankle allowance; corrected transverse cancellation is
236.667. Complete aligned execution is exact. Rotation/reflection and 12/48 real
subdivisions support the local correction. Thirty-seven focused contracts and
final diagnostic typecheck pass; the red mechanical/JSON-sentinel run and the
rejected changing-validation-tree receipt remain failed evidence.

The three instrumented native corrections first affect tacklers after first runner
contact (3.59583s CB_S, 3.05417s LB_M, 3.48750s SS). Their blocker hand histories
are exact. Fresh seed78 has a retained late C/LB_M tangent-force change of
-0.013220040464 kg yd/s² at 4.15–4.20s; its support fork follows first contact,
with unchanged approach classifications and ending. There is no demonstrated
run-blocking benefit or adverse approach-protection change. Native observer
actual-minus-former response at identical states proves invocation, not ending
causation or retained RNG draws. The six mass-response controls are completely
unchanged, including the TE/DT mismatch and crossing release: this repair does
not explain or calibrate mass/strength response.

The cached three-native reference genuinely uses source `0a5e365a`, not the
accepted source. Its only runtime differences are optional force fields and
undefined-input fallback; the candidate does not import them. Literal accepted
mechanical/fresh/mass controls and identical native initial profiles bound reuse.
No #115 force interface, coefficient or calibration is included.

## Action/state accounting: #120

The dive branch already preserves acquired spin and applies no launch torque;
transporting facing by that spin repairs its missing drift interval. Positive and
zero launch controls with both spin signs and rotations pass at 1/12/48 actual
subdivisions. It creates no angular impulse or yaw work, and zero-force launch
matches free motion. Existing launch/fall timing stays intact.

The old terminal-state guard dropped a completed active interval when the body
fell or the dive changed `plan.free`. The replacement records active exposure,
last active velocity and delivered positive lunge/dive work; energy is still
charged once after World completes the tick. The common ground cap clips the
recorded action force together with the executed force. Action power is integrated
through its sign crossing, excluding negative, received-contact and passive-fall
work. The existing ordinary `plan.ax + lean/m` endpoint proxy stays intact: this
is not a redesign into a closed metabolic ledger. The new action channel uses
its existing work coefficient/normalization, closing an omission in the same
mechanical-work cost contract rather than granting or tuning a capability.

Active counts and duration reset per controller tick. Ordinary fully active
speculative/local-sweep paths preserve their original divisor and exact `dt`;
real unequal impact pieces use duration weighting. Later passive pieces cannot
duplicate or erase completed work or determine active sprint exposure. Tiny
lunge equal-work and traction-capped 3-vs-30 requests, reversals, active-then-fall,
passive-only and ordinary gait controls support these boundaries. The yaw and
effort patches cannot modify the same-tick frozen fatigue factor; corrected
energy can properly affect later ticks under the existing fatigue mapping.

Off-feet decay applies the pre-existing 0.3s diagnostic memory in the branch
where upright `updateSupport` is not called. It changes labels, not mechanics.
The naturally recovered stale/clean pair has identical physical histories after
removing diagnostic fields and labels the next torso fall `contact`; the longer
inconclusive approach remains in the evidence. Falling/rising/getup metabolic
costs remain an incomplete existing proxy, not newly modelled work.

Reused source `c9478f188928a8c724c3584d298bdee9008f192969eee6e06132c7727a114cf4`:
[report](https://github.com/tannerthardy/football-simulation-/blob/35f87c90c5e39bf2fa9c9c513aae7ae5e82c8e41/docs/reviews/physics-action-state-audit.md),
[receipts](https://github.com/tannerthardy/football-simulation-/blob/35f87c90c5e39bf2fa9c9c513aae7ae5e82c8e41/data/reviews/current/physics-action-state-audit.json).
Ninety-four unique compatible focused contracts, 133 executions, 14 new contracts
and final typecheck pass. Earlier source stages are retained as earlier receipts;
telemetry-only decay does not invalidate their force/gait contracts. These checks
do not establish game-wide fatigue or football benefit, nor clear parked solver,
center-hand angular/accounting or dive-timing questions.

## Persistent try energy: #121

The one added loop is identical to existing scrimmage writeback and follows the
completed try before outcome handling. It writes each agent's actual body energy
using player identity for both teams; bench players are untouched. Successful and
failed OT tries expose the public touchdown→try path, 22 participants, official
score/ending, existing recovery interval and bench exclusion. The ordinary
scrimmage control is preserved. The two expected red failures and three passing
hook-only contracts use unchanged inputs; no live snap/game was executed.

Reused source `a0bdc872ca8d4812251603c233ce553abeea249955c365a55a360efa2445c354`:
[report](https://github.com/tannerthardy/football-simulation-/blob/1dc41611d82a7cb5e81db259e0e6f185ac2abcb5/docs/reviews/two-point-energy.md),
[red/green receipts](https://github.com/tannerthardy/football-simulation-/blob/1dc41611d82a7cb5e81db259e0e6f185ac2abcb5/data/reviews/current/two-point-energy.json).
This is complete independently of #118/#120 and should not wait on a Physics
hold. It preserves recovery scheduling and does not claim game-wide fatigue
calibration.

## Portability, cost and next decision

[Machine receipt](../../data/reviews/current/pr118-120-121-independent-review/portability.json)
pins every base/result blob, author evidence blob/SHA256 and patch digest. The
portable patches include runtime deltas and their new focused contracts only.
#118 additionally needs its direct test helper and saved accepted fixture;
unrelated diagnostics, calibration config and author workboard edits are excluded.
All three apply independently to accepted develop. #118 and #120 share World but
their changed statements are disjoint; both orders apply cleanly and produce the
same tree/source. There is no semantic dependency between them. #121 shares no
runtime file with either.

- [#118 standalone](../../data/reviews/current/pr118-120-121-independent-review/pr118.patch)
- [#120 standalone](../../data/reviews/current/pr118-120-121-independent-review/pr120.patch)
- [#121 standalone](../../data/reviews/current/pr118-120-121-independent-review/pr121.patch)
- [#118 + #120](../../data/reviews/current/pr118-120-121-independent-review/combined-118-120.patch), source `0f8d1f02eaa7fc69e3e8273651a9a1bda64d2a7139fc0c04850eccd981b464e5`
- [All three](../../data/reviews/current/pr118-120-121-independent-review/combined-118-120-121.patch), source `25d088d5dbfeb5d1552b736107e62910c0610a522ad0771de5b252113a6fc882`

New reviewer execution is only patch/blob/source checks and a
[zero-simulation algebra probe](../../data/reviews/current/pr118-120-121-independent-review/algebra-check.mjs)
with [its result](../../data/reviews/current/pr118-120-121-independent-review/algebra-result.json):
510 direction/budget combinations, 246 exact-collinear comparisons, opposite
signs/rotations and unequal fixed-state duration sums on pinned Node22.23.3.
The initial Node24 arithmetic-only diagnostic is preserved separately and ran zero
engine steps. The probe settles local cancellation
algebra, not unequal-step World trajectory convergence. No engine test, new native
snap, full suite, simulation campaign or game was run by this reviewer. Existing
command costs remain #118 51.347s, #120 42.398s and #121 5.024s including failures;
these are validation bills, not speed benchmarks or combined-source verification.

Integration can compose these independently accepted repairs with its other
reviewed work and run the one required exact combined verification. Preserve all
adverse evidence, native limits, historical solver holds, real mass and existing
44 settings. Changing aligned support physics, expanding off-feet/getup metabolic
laws, calibrating coefficients/capacities or promoting experiments still requires
the separate user approval required by the standing queue. No merge, closure,
baseline designation, default promotion or branch deletion is performed here.
