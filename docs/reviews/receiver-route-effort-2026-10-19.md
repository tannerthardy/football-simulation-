# Receiver route continuation during flight

Receivers on the accepted engine reduce effort immediately when private throw attribution names somebody else. This is an unsupported responsibility change. The correction retains the installed route controller until the existing assignment transfer replaces it. It does not add a commitment timer, speed, acceleration, a new ball observation or a catch rule.

## Exact candidate and question

- Accepted base: `f4146275ce7539816bf57b4ed55a0d2be10e48c7`.
- Accepted runtime: `7d23555ad67094fbe2e79726d9b761dd5f068c06fb90ff0796ec61c953750197`.
- Code: `279d26ececa443504aec7ad760aad9b9ece9ee85`, branch `codex/receiver-route-effort`.
- Candidate runtime: `62e740cda23aef7f178754ccd045017deee9b8e77b90aaeb5b0d45aff820237c`.
- Settings: the same 44 recorded baseline flags, including `RUN_CONTACT_COMPONENTS=1`, `GAIT_STEP=0`, `RUN_READ=0`, `CF_FLOW` unset; existing World defaults. Node `v22.23.3`.

Question: with the installation, body and acquired information fixed, should another private `ball.target` value change a receiver's route request or progress? It should not. A completed route can still gather, and an existing assignment transition can still change his job.

`RouteRunner.update` previously returned early for `ball.kind === 'air' && ball.target !== a`. It imposed effort `.55`, replaced the ordinary route-running-derived cut skill with `1`, and steered a temporary `{idx:this.idx}` without saving waypoint progress. The correction removes this early return. The normal route, waypoint, sideline, option and settling logic resumes. This is consequently more than deleting an effort field; it restores the installed controller's normal execution. Physical profiles and laws remain fixed.

## Controller evidence and independent review

Four direct actual-controller contracts use identical bodies and perception histories with an unreachable synthetic flight. They compare self/other/null private attribution, numeric downfield requests, persisted waypoint progress through an installed break, completed-route gathering and the existing caught-ball assignment transfer. These are controller fixtures, not restorable native checkpoints. No catch eligibility is inferred from that far flight.

On accepted runtime, target-invariant requests and persisted waypoint progress fail; the completed-route gather and caught-ball transfer controls pass. On the candidate all four pass. The same commands remain independent of repeated reads without extra sensing, perception-buffer updates or RNG changes. The focused run also passes 26 existing press and QB forecast/consumer checks: **30 total**. Typecheck passes. No full suite or game campaign was run.

A nonauthor reviewer independently rehashed the candidate and approved this scoped controller correction with no source blocker. A separate review of the PA13 adverse also approves the narrow information contract: the saved geometry supports actual contact, with no false-geometry or changed-execution-draw defect established. It retains the collision and two falls as adverse evidence and holds broader football-improvement claims. These are not integration approval or whole-awareness certification; Integration makes the final acceptance decision.

## Native transfer: actual movement, not just the ending

Two exact frozen inputs reuse accepted native tapes and run only the candidate through six seconds or its native finish. Both finish; neither is an unfinished play presented as an outcome. The passive recorder makes no extra observations or RNG draws. Input hashes and source/file hashes remain in `native-comparison.json`.

| Input | Frozen setup SHA256 | First changed request | Native ending, accepted → candidate |
| --- | --- | --- | --- |
| PASS13, Four Verticals / Over Cover 3 | `7778b1e4ff586b043b8fe5085f0df77dc2ed60dd0718a0215f2199f7e2e7e336` | 2.80 s, RB/X/Z/H | Y completion, 22.74 yd tackle → same |
| PA13, PA Flood / Over Cover 3 | `46810a9f4229295bc129ed3eb6350fdb00d7002505ebc2402301584d8cb943b5` | 2.40 s throwaway, RB/Y/X/Z/H | Incomplete → same |

Both arms match before those first requests. The first achieved-body difference occurs during that same `.05 s` World step, at completion 2.85 / 2.45 respectively. RNG states match for **every recorded tick through both finishes**. Neither ending is evidence of complete trajectory identity.

In PASS13, the ordinary off-ball receivers retain their installed vertical pace instead of simultaneously braking while Y's pass is airborne:

| Receiver | Speed at 3.50 s, accepted → candidate (yd/s) | Downfield progress from 2.80–3.80 s, accepted → candidate (yd) |
| --- | --- | --- |
| X / SO-WR4 | 5.262 → 8.550 | 5.896 → 8.446 |
| Z / SO-WR3 | 5.505 → 8.980 | 6.163 → 8.865 |
| H / SO-WR1 | 5.378 → 8.813 | 6.114 → 8.704 |

This is measured downfield displacement on the installed vertical concept, not a reconstructed private waypoint index. The native recorder does not retain RouteRunner waypoint state; the direct controller contract establishes that part separately. RB also changes because his released checkdown uses the same controller.

Target Y is physically identical through the 3.80 catch. The throw/catch times and ball channels stay exact. After later contact the trajectories differ: Y's largest recorded position difference, over before/after samples, is `.0543 yd`; FS also changes. Both acquire the same FS wrap at 5.05, fall at 5.25 and finish the tackle at 5.65, but their contact/event positions differ. The unchanged 22.74 result therefore establishes an ordinary retained finish, not full-play invariance or improved tackling/YAC.

## Adverse PA traffic remains visible

The throwaway at 2.40 ends at 3.70 in both arms, but the receiver continuation adds a real encounter. At the 3.00 tick H/SO-WR1 runs the installed shallow at **7.249 versus 5.382 yd/s**. His path reaches LB_S/SD-LB5 earlier. The candidate has a new H–LB_S body collision with **302.674 kg·yd/s impulse and 6.027 yd/s recorded closing**, followed by H's contact fall at 3.05 and LB_S's at 3.10. Accepted has neither contact/fall. Before that contact, the defender's 3.00 body and request match to roundoff; changed receiver continuation supplies the changed encounter geometry. Shared RNG remains exact, so this is not an execution-draw explanation.

This is adverse traffic evidence, not erased by the identical incomplete result. The fixed installed route controller does not select an opponent-avoidance path here. The existing contact law supplies the consequences; this correction changes neither avoidance nor physics. The independent review also identifies a pre-existing defensive objective: by 2.75 LB_S follows the fixed ball landmark `(44.310,-4.002)`, beyond the sideline. That unattainable flight objective is unchanged by this correction. The recorder contains no offensive consumed pictures, so it cannot establish what H acquired in time to avoid the encounter. The saved data establish why the encounter appears. They do not establish that the resulting collision is good football, that the fall response is calibrated, or that unchanged traffic policy is sufficient. A separate traffic/coverage review should own those questions. Restoring a private-target throttle would not be a valid information repair.

## Limits and next action

This is a supported isolated responsibility/information correction for independent review, with the native traffic adverse retained. It does not certify broad commitment, global passing realism, path smoothness or reduced YAC. Integration owns combined verification and its decision on the scoped candidate.

Remaining information debt is explicit:

- `onThrow` globally selects `TrackBall` from private target identity; its fallback can still use RouteRunner. That engine-level selector is unchanged.
- TrackBall uses global live flight/path after its existing reaction delay. No personally acquired ball-sensing correction is claimed.
- `onBallCaught` globally installs carrier/blocking/pursuit controllers. The preserved transfer test proves this existing transition remains, not that everyone personally recognized the catch.
- Legacy `sitVsZone` conversion reads private coverage with a random misread. Removing the early return restores reachability of that normal logic during flight; another input could change shared RNG consumption. No such divergence occurs in the two native inputs. Broader option information remains separate work.
- Existing global ball-kind, scramble, settle and release consumers remain outside this hunk. A genuinely acquired visible flight elsewhere could justify a later coast or blocking transition, but that needs its own evidence-based duty contract.

Blocker hesitation remains separate: saved Z13/Z19 retain their backers while short departure arcs fail to produce useful access; C01 preserves successful slow departure. The offense audit does not justify faster climbs, a universal action latch, or patience tuning. Run retains that route-progress/clearance question.

## Receipts and reproduction

The [immutable evidence packet](https://github.com/tannerthardy/football-simulation-/tree/c6336f8a78c38ee85b99c53d66e2a4c6c34ee7f5/data/reviews/decision-commitment-2026-10-19) is pinned at `c6336f8a78c38ee85b99c53d66e2a4c6c34ee7f5`, branch `codex/football-commitment-evidence-2026-10-19`. Fetch `receiver.tar.gz` for this candidate's native traces/operator, `audits.tar.gz` for independent source/adverse reviews, and `common.tar.gz` for source patches, focused/typecheck receipts, exact frozen inputs and baseline reuse map. `manifest.json`/`SHA256SUMS` verify archives and members; source restoration independently reproduces the complete candidate runtime digest. Map original `/workspace` paths to those members as described in the packet README. No baseline simulation was repeated. Local working packet: `out/receiver-route-effort/`.

Publication checkpoint fetched accepted `origin/develop@f4146275ce7539816bf57b4ed55a0d2be10e48c7` and integration queue `9a6bb795179a4b2e61ed59d25bcf23ca5e40f423`; the accepted record and fetched source agree. The receiver branch is independent of the own-objective/traffic candidates in the common packet. Across every arm that packet preserves eleven completed native prefixes / five unique inputs, with `7.138 s` original aggregate collector wall time; only two receiver prefixes belong to this candidate.

```sh
node scripts/baseline.mjs --candidate --receipt out/receiver-route-effort/candidate-contracts-receipt.json -- node node_modules/vitest/vitest.mjs run --project core test/receiver-route-effort.test.ts test/press-contact.test.ts test/qb-receiver-forecast.test.ts test/qb-receiver-consumer.test.ts --maxWorkers=1
node scripts/baseline.mjs --candidate --receipt out/receiver-route-effort/typecheck-receipt.json -- npm run typecheck
python out/receiver-route-effort/compare.py
```

Costs already incurred: accepted failure contracts `1.392 s`; candidate focused checks `4.288 s`; typecheck `10.649 s`. Parent's two candidate native inputs take `1.755 s` total collector wall time (`1.221 s` summed case time). This review only inspects saved data; zero additional simulations, NFL queries, roster sweeps or checks.
