# #180 Physics handoff to Integration

**READY for isolated Integration review/adoption. The old cost hold is resolved.**
This handoff answers the [owner request](https://github.com/tannerthardy/football-simulation-/pull/180#issuecomment-6301770519)
and #187's Physics instructions at `57e009b39a299434227f1340346248ca7a4f535e`.
No runtime, test, setting, capacity or dependency changes accompany it.

## Deliverable and evidence

- Reviewed publication: **`2c6d53ecce9f5eb54e7a086c7723dd21aa68320a`**.
- Tested runtime: **`f96a85fdd818b6fd860554e7a9881083ae0dd60c`**.
- Runtime SHA256: `03233b05ba0cbdfc1fe4fe6787caec2dc41fe4b09ef07726917c3edf0f9ebee1`.
- Re-fetched accepted develop: `2c98bed94adad8087c65f381d4090444ad283985`;
  canonical queue: `6575988fe9e72bd0aaf9e3573787f0dcb81ebf52`. They agree.

The publication's complete source/tests/config/tooling match the tested runtime.
The only protected changes from accepted develop are three runtime files
(`world.ts`, `kinematics.ts`, `yaw-response.ts`) and two tests
(`movement-yaw-continuity.test.ts`, `yaw-response.test.ts`). Include this
coherent boundary once; do not deliver the World change without its preview
counterpart. [Exact file hashes and checked consumer pins](../../data/reviews/current/loaded-movement-handoff.json).

Reuse the [immutable readiness receipt](../../data/reviews/current/loaded-movement-readiness.json)
and [independent READY disposition](../archive/research/movement-yaw/numeric-review.md):

| Existing evidence | Result |
| --- | --- |
| Final focused checks / typecheck | 48 pass / pass, 2.96 s / 16.23 s |
| Compatible earlier mechanics and preview checks | 114 pass; includes movement-preview and gait-facing contracts |
| Deterministic old/new numerical parity | 1,024 exact, including events and exceptions |
| Complete native Toss replay | All 94 ticks exact, excluding only source/elapsed metadata |
| Final Toss paired wall median / p95 / maximum | .9083 / 1.0169 / 1.1212 times accepted |
| Final Pass paired wall median / p95 / maximum | .9253 / 1.0254 / 1.0313 times accepted |

Both inputs pass the unchanged median <=1.10 and paired p95 <=1.25 gates.
The old 1.2673 p95 failure remains failed at its old source. Removing profiled
repeated function setup resolves that hold without changing numerical behavior.
The final cost run used Node 22.23.3/tsx, four warmup pairs and 20 balanced
AB/BA rounds per saved 60-tick prefix. These are prefix batch-average wall
costs, not individual-tick bounds or compiled-production speed guarantees.
Supplemental Toss CPU tails worsen and remain visible in the receipt.

This handoff verifies the source digest, all 11 published artifact hashes and
the exact protected-file boundary. It executes **zero new tests, simulations
or benchmarks**; unchanged component evidence is reused.

## Preview compatibility and limits

`World.plan` retains the existing prospective gait estimate but gives ordinary
center-hand yaw the actual requested angle. `World` and `stepBody` both call
`turnBodyResponse`; neither feeds the yaw motor a new intermediate stopping
angle every tick. `stepBody` remains a free-body estimate, not a loaded World
replacement or a promise of numerically identical support/contact evolution.

`previewFreeMovement` advances the ordinary `World` with the held command,
cloned own body/support/spin and reset time. Its default center model matches
the intended production settings. It therefore inherits #180 directly;
there is no separate old yaw solver to reconcile in the preview. Existing
explicit experimental-model selection remains separate.

Source checks pin #181 at `8239e8d`, #184 at `0d13a208`, #186 at `7b70c343`
and #170 at `4a5aadcb`. None changes #180's runtime/test files; their shared
`movement-preview.ts` and `actuation.ts` blobs equal accepted develop and #180.

- #181 scores the complete composed approach through the same World preview.
  Integration still owns its command-composer reconciliation with #182.
- #186's 0.6-second route checks also use that World. Preserve acquired-peer,
  load/unknown-state exclusions and first-touch closing guard. Its existing
  native recordings do not establish choices, football outcomes or runtime
  after combination with #180/#182/#184. Do not credit #180's cost margin
  against #186's separate residual cost concern.
- #184 estimates an acquired teammate using a **fresh free body** and a
  bounded acceleration estimate. It does not acquire the teammate's current
  spin, support or load. #180 adds none of that information.
- If #170 is selected, preserve its recoverable glance, square fall and
  genuine miss assertions verbatim. Their combined result belongs to the
  Integration owner's exact verification, not this source-only handoff.

Thus the preview **interface and motor selection are compatible**. No composed
runtime has been frozen or claimed passing here.

## Explicit adoption boundary and recommendation

Recommend **ACCEPT this bounded motor/controller and shared-budget correction**.
Integration must explicitly record adoption of ordinary center-hand requested-
angle yaw response and reservation of **peak absolute yaw torque** before
recovery uses the remaining traction. Opposing torque can cancel in net impulse
while still consuming the shared ground allowance. This changes ordinary motor
behavior and recovery's available reserve even though flags, physical limits
and recovery/contact laws remain unchanged; it is not merely a runtime patch.
The actual default-motor adoption remains with Integration/primary under the
existing authority. This handoff neither merges nor activates it.

Keep #165's attained-facing gait, GAIT_STEP activation, propulsion/capacity
tuning and experimental contact solvers outside the candidate. Preserve later
Toss contact, the censored passing control, loaded-slip adverse continuation
and the existing angular/accounting/support-history holds. The 84.4% finding
is alternating body-facing correction amplitude in the saved windows, not
fewer full spins or solved travel-heading jitter.

**Next decision:** select this exact five-file runtime/test boundary for the
intended composition and perform Integration's required combined verification
once. There is no remaining component cost blocker and no new user decision
needed to deliver the reviewed candidate. Physical/default adoption is the
explicit decision above, not permission to promote the held experiments.
