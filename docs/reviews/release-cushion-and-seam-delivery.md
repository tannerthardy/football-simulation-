# Preserve release cushion, then deliver an attainable seam

2026-10-16 UTC. **Supported controller candidate for independent review.**
Accepted/fetched/canonical reference:
`bb6d4c73948d53ba841dd9338dd240146c739f8c`, source SHA256
`668acb1784799c93d4704aaaa41233a11627ee0a862b41dc279cd11a0a22eeac`.
Candidate runtime commit `19d520f00dd3b521078d6f24be9d645e90a78ebc`, source
`cb16a2fe23816fe4b0bf4650f4f32871aae6e6f2f0fbaae39c527c9d2973694a`.
No integration or league-wide YAC claim.

[Exact settings, comparison inputs, cue/request/body witnesses, staged arms,
loads, failures and cost](../../data/reviews/current/release-delivery.json).
The [prior audit](https://github.com/tannerthardy/football-simulation-/blob/31b81a6915d052ce3b5e2d2d8f908a303dd09495/docs/reviews/coverage-principles-audit.md)
identified both decisions before these experiments.

## The breakthrough is two successive coverage decisions

An underneath defender reads his installed #2, but generic zone movement can
send him downhill toward a short throwing lane while that receiver climbs.
When the formal match activates, the defender has to reverse momentum. Later,
a twelve-yard carry boundary can discard the same vertical and send him back
toward a short lane without establishing usable replacement help. Improving
only the first decision leaves the second discontinuity intact.

R2-C02 is a clean witness: Four Verticals versus Cover3 Match, actual catcher
H10 `PO2-WR3`, installed nickel19 `PD2-S2`. At the first changed request both
arms have the same installed key, body and acquired picture, still `none`.
The candidate holds release cushion rather than inferring a private vertical.
At 1.00 the nickel achieves vx **+1.68 instead of -2.61 yd/s**. By 1.40 he is
about 3.5 yards farther upfield. When the acquired vertical crosses twelve
yards, the candidate retains it because the existing observed roof estimate
does not support delivery. He requests continued upfield movement rather than
a short-lane reversal before recognizing the throw.

Same throw time, catch time and actual catcher survive in this witness.
First contact moves **8.00->4.30 s**, or **4.25->0.55 s after catch**.
The nickel makes a form rear wrap instead of waiting for corner18's distant
lunge. Its first solved mean force is **263.53** at4.35, with capacity1653.66;
the hold survives and the runner falls at4.70. YAC is **43.93->8.19**.
This connects legitimate responsibility, requested motion, achieved approach,
entry geometry and transmitted load. The baseline's late hold also survives;
the improvement is not proof of a broken grip law.

## Two small controller components, tested separately

**A: provisional release read**, branch `codex/match-release-cushion`, initial
publication `f8d71313d84f1d52c7776359d3671db3db4882db`:

- `c3_curl_flat`, `c3_seam` and `q_apex` use `ReadRelease` on their installed
  #2 while his declaration is unknown or confirmed vertical below the existing
  direct-match threshold. Genuine block/under/flat/in/out/stop retain the
  installed branches. No threshold, timer or perfect route prediction added.
- `ReadRelease` retains zone support/throw priority and zone-eye metadata,
  using existing man cushion/hip movement only after those priorities. The
  same inner movement state continues into an inside man match; cushion,
  hip turn and observed stem confidence do not restart at the boundary.
- Entry cushion uses the acquired picture. The optional `initialPosition`
  interface and existing man producer overlap #97's independently tested
  information correction. That overlap is explicit, not an experimental-parent
  dependency. New entry data is not part of directive identity.
- `c2_hook` and `invert_safety` do not acquire this provisional read; their
  shallow cut/deep-help contracts remain unchanged. Direct ManCoverage callers
  without acquired entry retain their existing initialization limitation.

**B: supported seam delivery**, independently based on accepted develop at
`a1e204b219343b516d2c63309957d1485b94c35d`, branch
`codex/seam-delivery-contract`, source
`a3a412bf08efc9e52a95ef121cc4a3e0a1a2848b8512cab6d4486646d65eec37`:

- Only `c3_curl_flat`: twelve yards permits delivery; the unchanged
  `hasVisibleCap` estimate must establish a nearby sustainable roof. Otherwise
  keep the acquired vertical relationship. No private helper assignment,
  hidden throw check, new estimator or acknowledgment system.
- A valid cap retains the existing terminal zone exit. If help later leaves,
  this patch does not invent a reacquisition rule. Real short-route exchanges
  remain. Q-apex and other wall delivery policies are not extended.

A alone improves early geometry but exposes an adverse seam ending. B alone
changes the boundary request but cannot rescue geometry already lost earlier;
its three native endings remain unchanged. Only then were the minimal B rule
and test composed with A in `19d520f`. Physics, speeds, braking, capabilities,
hands, collection, shared spacing/movement and helper pursuit are unchanged.

## Outcomes and opposing evidence

Seventeen retained existing-input pairs and four untouched transfer pairs were
compared with accepted source. This is a selected stress panel, not NFL mix.
All21 retained pairs finish. Interceptions and return tackles are recorded as
such; no-pass QB finishes are not zero-YAC catches.

| Witness | Result and football interpretation |
| --- | --- |
| R2-C02, Cover3 seam | Same H catch;43.93->8.19 YAC, earlier assigned-marker form wrap with surviving load. Strongest mechanism witness. |
| R1-C02, opposing Cover3 roster | **Adverse versus accepted:** short Y catch4.21 YAC becomes H seam25.31 YAC. Cushion-only continuity produced the same H throw/catch with44.54 YAC and no contact TD. Final delivery retains that throw/catch while improving nickel velocity/trail and producing a surviving rear reach/tackle. This does not establish that the accepted short completion was wrong. |
| R1/R2-C06, Drive/Quarters | Shallow catches remain;3.15->3.12 and1.57->-0.81 YAC, both tackles. The hook's legitimate back obligation is not removed. No universal shallow latch. |
| R1-C04, Cover3 Mesh | Interception retained; return endpoint differs. |
| R2-C03, Cover1 Mesh | Exact ordinary wrap/finish/endpoint retained;0.39 YAC. |
| R1/R2-C07, Slant/Flat Cover3 | Exact endpoints retained. |
| R1/R2-C08, Slant/Flat Cover2 |63.34-TD and20.30-YAC broken-hold gains remain. R1 endpoint exact; R2 tiny endpoint differences do not constitute a repair. |
| R2-C11, Smash/Cover2 | Exact21.93-YAC gain; late first contact remains. Body proximity alone does not prove a valid missed reach. |
| F4, previously explosive PA | Changes51.85-YAC catch to completed QB run/tackle without a throw. Do not call this a preserved offensive win or a zero-YAC catch. #97 remains a separate coverage correction. |

The four T cases were fixed before either arm ran: cohorts1301/1302 and
1601/1602; Four Verticals/Cover3, Drive/Quarters, Dagger/Cover3, PA/Quarters,
both field orientations. At1.00 all four nickels are **1.5–1.8 yards farther
upfield**, achieving +1.54..+1.82 vx instead of -1.31..-2.70. The visible stem
and installed duty support the change; a hidden future cut does not.
T1's ordinary catch becomes nickel interception; T3's sack becomes corner
interception. Their later tackle endpoints are returns. T2 retains a shallow
catch/tackle1.41->0.88 YAC. T4 changes X's6.01-YAC catch to H's2.54-YAC
catch/tackle. Target selection changes; conditional catch averages are not a
controlled population treatment effect.

## Correctness and information limits

**159 focused contracts and typecheck pass.**87 ran on exact composed source;
72 compatible unchanged mechanics/man/support checks are reused. The two new
files contain39 actual-controller contracts: unknown release, acquired stem,
shallow/fake response, mirrored hidden body/private-route changes while reality
snapshots advance, acquired/aging/departing/down help, stable movement history,
run belief withdrawal, terminal delivery, excluded rules and reachable ball
contest priority. Querying/recording does not create sightings or consume RNG.

The first support run had118 passes/two failures: existing tests asserted the
initial job string was `zone:*`. They now explicitly assert the new `read:*`
job, zone kind **and the same first run-fit command**. All prior replacement,
physical movement and expiry assertions remain. The first typecheck caught
an impossible `none` comparison after an early return; removing that redundant
comparison changes no executed branch. Failed receipts remain in the data.
This is a justified technique-label contract change, not waived support.

The cap is a fallible geometric estimate, not confirmation that a teammate has
accepted the receiver. The accepted information layer supplies delayed teammate
pictures on demand; this candidate does not repair global acquisition/gaze or
the unrelated QB-eyes shortcut. Hidden helper changes with the consumed picture
held fixed do not alter requests. Memory availability beyond that supported
contract is still a separate awareness project.

## Independent #97 interaction and integration boundary

#97's provisional-block policy is **not included** in this candidate. An
isolated interaction host `0b346b6` on `codex/release-delivery-pr97-interaction`,
source `b461fda19b1fec89d7511a0e345a3caeb91a6c518e18e6442b24ae9512a27c26`,
passes64 focused contracts and three native controls. Quarters verticals become
a contained no-pass QB finish, Drive becomes incomplete, ordinary Cover1 wrap
remains exact. These are bounded interaction checks, not combined acceptance.

Integration must reconcile the overlapping acquired-entry interface/producer
and `seamCurlFlat`/`wallTwo` block conditions explicitly. Apply the proven
provisional-block exclusions after the new early read return; preserve the
new delivery condition. Do not import a diagnostic branch wholesale. Integration
owns the preserved full suite on the exact accepted combined candidate. No full
suite, games or NFL collection were run here.

## Reproduction, cost and next question

The collector saves exact generated inputs, flags, World defaults, source,
operator/lock/platform pins and actual catcher/defender identities. New helper
fields copy existing queries; no sensing calls are added by recording. A
non-string off-ball protection job exposed a cyclic recording reference on F4;
the recorder now stores a job label. Sixteen completed packets were preserved,
only F4 was recollected, and observed/plain F4 endpoints and query counts are
exact. The failed batch and diagnostic failure remain visible. This recording
failure does not censor or invalidate the other completed packets.

```sh
node scripts/baseline.mjs --candidate --receipt out/release-repro.json -- node --import tsx scripts/diag/pass-defense-panel.mjs out/release-repro R1-C02,R2-C02,R2-C03
node scripts/baseline.mjs --candidate --receipt out/transfer-repro.json -- node --import tsx scripts/diag/pass-defense-panel.mjs out/transfer-repro T1,T2,T3,T4
python scripts/diag/release-delivery-review.py out/release-review-repro.json
```

The saved-only reducer fails on absent/mismatched tapes and never recollects.
Old baseline packets reuse the unchanged numeric/event measurement; append-only
T fixtures and passive label/helper capture changes are documented separately.
Raw films remain ignored/local; compact witnesses and hashes are published.
No new upload/download pipeline. Fresh accepted-source controls ran in a local
detached control clone; its receipt was copied from the launcher's nested path
after an absolute receipt argument was joined to its root. No baseline rerun.

**85.13 launcher seconds;40 native executions**, including staged components,
four new accepted controls, two observer/plain repeats, three #97 interactions
and two F4 recording failures. Seventeen accepted tapes are reused. Tests/body
steps are accounted in contract cost, not counted again as native panel plays.
All21 scored pairs finish; the first failed F4 tape is not an extra scored
outcome. Saved reductions add seconds but zero World ticks.

The remaining repeated approach lead is counterflow contact in Cover2
Slant/Flat: marginal rear entries have different relative velocities from the
successful ordinary rear wrap. Remaining helpers are not automatically useful
containment merely because they are nearby. Keep that as the next separate
approach/containment question, coordinated with Flex for shared movement.
No new grip, global speed, braking or helper variant is justified by this work.
