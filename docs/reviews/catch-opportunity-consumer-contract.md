# Catching / Physics: same-time query boundary

Catching owns the consumer contract below; Physics supplies a pure geometry
query. This is a review handoff against accepted
`70b4db6a3ef53acc1a0e90cd055f1087205daa30` / source
`9513511efacc10721f8ed2cc8553ef96d7b95a5b51217b8f4c6339533b504941`,
not an implemented catch change. Coordination is on
[#114](https://github.com/tannerthardy/football-simulation-/pull/114#issuecomment-6229662000).
The analytical mixed-time counterexample is confirmed; native invalidity of
the selected interceptions remains unresolved. The defensive gates are separate.

## Proposed pure query

Inputs: copied body start/end planar positions, ball start/end3D positions for
the **same interval**, unchanged planar reach, minimum height0.1 and the existing
player-specific maximum height. No Agent, possession, eligibility, RNG or live
behavior lookup belongs in the query. Proposed result:

```ts
{ s: number; dh: number; z: number } | null
```

`s` is the normalized0..1 interval fraction. `dh` and `z` must both describe that
same fraction on the two linear paths. Find the horizontal minimum **within
the legal height interval**, and admit only if its separation is within the
unchanged reach. A horizontal minimum at an illegal height is not enough to
reject all other instants. If horizontal relative motion is zero, use the first
legal height fraction as the deterministic minimizer. Reject an empty legal
height interval. Preserve closest-opportunity selection; choosing the first
reach crossing instead is a separate policy decision.

This approximates paths linearly within one tick. It does not claim World
substep paths, anatomical hands or continuous catch execution. The consumer
needs real copied body endpoints, not the final body position twice. That
handoff must be checked before connecting the query; no World solver rewrite.

## Consumer contracts retained

| Boundary | Current behavior to preserve |
| --- | --- |
| Flight/attempt availability | Air ball only; release age>=.1s; exclude thrower, down player, noCatchUntil and offensive OL slots. |
| Engagement | Existing engaged-defender bat exception in first.4s; other engaged players excluded. |
| Acquired offensive flight | Targeted/onBall tracking remains distinct; other offense requires the existing incidental readiness query. Querying geometry cannot create acquisition. |
| Reach and height | Existing tracking+.3 reach; current offense/defense tracking and bat max-height formulas. No capacity/default change. |
| Opportunity order | Ascending closest-opportunity fraction; stable iteration order on ties. Existing offensive contestant substitution at absolute fraction difference<.35 remains. No new priority for a named target or defender. |
| RNG and attempts | Pure geometry consumes no RNG. Receiver contest ends this resolver call. Defender INT/alteration stops it; a miss continues under current rules. |
| Retry | Preserve existing noCatchUntil and deflection gates. Ordinary defensive miss reattempt behavior is not silently changed. PBU receiver/defender cooldowns, drops and deflected-ball cooldowns stay as implemented. |
| Difficulty | Feed same-time dh/z into existing stretch/high/low terms. Hands, tracking, shoulder, contest/facing, bounds, probabilities and draws remain unchanged. Changed physical geometry can legitimately change stretch/difficulty; that is distinct from retuning its formula. |

End-of-tick near-contest body distances/facing and other remaining physical
approximations are not repaired merely by this opportunity query. No claim of
whole-catch information/geometry correctness follows from one local correction.

Physics first supplies its pinned interface and pure controls: analytical
counterexample; valid stationary and moving relative paths; zero relative motion;
height clipping and no legal height interval; a wide-clearance miss. Catching
then reviews eligibility/order/retry/difficulty against that exact interface.
If native effect is still decision-relevant, capture only exact G1-P020,
recorded tip G2-P107 and ordinary moving completion G2-P143 inputs. Saved rounded
film does not prove any selected interception impossible. No new broad campaign
or catch implementation is authorized by this document alone.
