# Catch-query caller interface — author support, not acceptance

2026-10-19 America/Phoenix. Physics authored the pure helper in
[draft #131](https://github.com/tannerthardy/football-simulation-/pull/131),
head `2f9085f1e3dc8e5a19c07fc8f561dc1689413a5e`. This handoff explains its
interface; **it is not an independent review or approval of that code**.
Accepted/fetched develop remains `f4146275ce7539816bf57b4ed55a0d2be10e48c7`,
queue `9a6bb795179a4b2e61ed59d25bcf23ca5e40f423`.

Catching has [claimed the caller hookup](https://github.com/tannerthardy/football-simulation-/pull/131#issuecomment-6272753843)
on `codex/catch-opportunity-caller` from accepted develop, preserving the helper
by normal merge. At this checkpoint that caller branch is not remotely
published; the existing PR head is unchanged. No caller code is graded here,
and Physics will not move that head while Catching owns the handoff.

## Interface available now

The [unchanged helper](https://github.com/tannerthardy/football-simulation-/blob/2f9085f1e3dc8e5a19c07fc8f561dc1689413a5e/src/physics/catch-opportunity.ts)
is side-effect-free and has no World, agent, RNG or eligibility dependency:

```ts
closestCatchOpportunity(body0, body1, ball0, ball1, { reach, low, top })
// => { s, dh, z } | null
```

| Value | Caller responsibility |
| --- | --- |
| `body0`, `body1` | Actual achieved horizontal body endpoints for the same interval as the ball; copy coordinates rather than retaining a mutable `a.pos` reference. Do not substitute requested velocity or a delayed perceived opponent state. |
| `ball0`, `ball1` | The actual flight chord endpoints already supplied to catching. Both body and ball use the same normalized fraction `s` in `[0,1]`. |
| `{reach, low, top}` | Existing capability mapping, tracking bonus and height gates. Production catch low remains0.1yd; retain current tracking/partial-leap/bat top selection. |
| `{s, dh, z}` | Closest simultaneous horizontal opportunity on the common legal height interval, followed by the existing reach check. Pass its geometry to the existing resolver and difficulty formulas. |
| `null` | No simultaneous point within the supplied legal height/reach envelope under the linear endpoint approximation. It says nothing about eligibility, readiness or the success of a catch roll. |

Height and horizontal reach must be valid at **one common fraction**. The
helper intersects the height interval before minimizing distance; do not
pre-reject at an unconstrained closest point or reintroduce final-body geometry
after the query. Equal-distance ties choose the legal interval's start.
This selects closest opportunity, **not earliest envelope entry**.

## Accepted caller timing to preserve

In [accepted PlaySim](https://github.com/tannerthardy/football-simulation-/blob/f4146275ce7539816bf57b4ed55a0d2be10e48c7/src/sim/playsim.ts#L545-L616),
behavior/contact commands precede World, then `afterPhysics`, then
`updateBall()`. `updateBall()` saves the ball's previous position and steps it
by the same `dt` before calling catching. Thus the ordinary caller needs a
copied body start from before that physical advance and the achieved endpoint
paired with that chord. `sim.t` increments only after resolution. A cache from
the prior tick or the final body paired with an earlier ball is insufficient.
New-play/reset, release/tip/retry and deliberate direct/static calls must not
reuse a stale interval. An intentional static query uses identical body
endpoints; it is not a silent fallback for missing native motion.

Leave the existing [catch resolver](https://github.com/tannerthardy/football-simulation-/blob/f4146275ce7539816bf57b4ed55a0d2be10e48c7/src/sim/catching.ts#L40-L105)
in charge of acquired-flight readiness, legal eligibility, thrower/down/
engagement exclusions, retry deadlines, target/tracking capability mapping,
increasing-fraction order, contests and difficulty. Preserve stable agent order
for equal fractions. Geometry can change valid opportunity membership, the
selected fraction and difficulty inputs; unchanged formulas do not imply
unchanged rolls or football endings. Trace material adverse changes rather
than preserving an invalid interception.

This handoff concerns airborne catch opportunities. Pitch/recovery querying,
earliest-entry policy, curved substep-path generalization, capacities and World
integration are outside it.

## Reusable evidence and review ownership

- Pure analytic counterexample: ball X0→1 and body X−1.5→−1.25 over50ms,
  z1/reach1.3. Separation is1.5+.75s throughout. Final-body projection falsely
  grants reach at1.25; the simultaneous query rejects. Existing static/moving/
  height/zero-relative-motion controls are already in the component tests.
- Existing selected native captures are **G1-P020**, recorded tip **G2-P107**
  and ordinary moving completion **G2-P143**. The original evidence is pinned
  to70b4, not relabeled as current develop. P020's reconstructed same-time
  minimum1.508345yd exceeds reach1.317361yd; the other two named opportunities
  remain reachable in those captures. P124/P150 are untraced leads.
- [Original report, settings and limits](https://github.com/tannerthardy/football-simulation-/blob/2f9085f1e3dc8e5a19c07fc8f561dc1689413a5e/docs/reviews/same-time-catch-physics.md)
  links the [immutable source tools/input archive](https://github.com/tannerthardy/football-simulation-/tree/b5b4fba9eefa5e59e8db192e77a6502341d81989).
  Its archive SHA256 is `7fc78954d2240c86c5bc9092c6a9d1345d9a3acbe3af061cbd33d006bb93f97b`.
  Captures are observations, not arbitrary World restore checkpoints. Reuse
  the existing scouting reconstruction and source-qualified inputs.

Catching owns the minimal caller and its affected tests/native comparison.
Physics can clarify the interface or repair a demonstrated helper defect, but
does not independently approve its own implementation. A nonauthor must review
the helper; a nonauthor of the caller must review that scope. Integration owns
acceptance of the exact combined candidate and one required combined
verification. No integration-ready label, merge or activation is granted by
this handoff. Keep the original failed/adverse evidence visible.

No source/test/settings change or new test/simulation is needed merely to
publish this interface support. The lower-wrap, angular-law and support-history
holds remain separate; no solver or recovery expansion is involved.
