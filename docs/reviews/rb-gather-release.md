# RB low-speed gather release: local defect established, coupled Y still collides

The 2 yd/s preview gate prematurely releases RB's gather in the saved Y state.
Removing that gate improves the identical-state decision using only RB's own
motion and acquired teammate pictures. The fully interacting Y play still
collides, later and harder; H is entirely unchanged. This is a bounded movement
candidate, with whole-football promotion held. No yardage target was used.

## Pins and ownership

- Reference: experimental PR #36 candidate
  `68284671d062dfd4e7e879bcd037bc21dad3e3ac`, reviewed at
  `a6bf3cf47af738298c67ec45301d17c1d06b4cd3`. It has not become the accepted
  shared baseline. Reference runtime SHA256 is
  `60120551f0ad09415b47150f5edd9cdbd179955010a33d557af817fec31a01f1`.
- Movement implementation: `3965abf` on `codex/rb-gather-release`. Exact
  support-clock capture/checks: `0a35c5f92b9760cb7e0ab241aea225dbe8e69bd5`.
  Final runtime SHA256 is
  `0306594882fcb5913173e8d7b7c219a1031d4e9abc1948123d0ad69dc251883d`.
  Coupled evidence was collected at `bc1c4e19cac23e030a54337a28a9906da6c91de7`,
  which has the identical final runtime.
- [Compact receipt](../../data/reviews/current/rb-gather-release.json) records
  full pins, scripts, all 44 profile flags, center/centered hands, legacy/mean
  support, saved and new state/RNG hashes, packet digests and launcher history.
  Detailed packets remain in `out/rb-gather-release/`; reproduction is below.
- Movement ownership was claimed before edits. Awareness retains
  `teammate-information.ts` / `teammate-calls.ts`; those files are untouched.
  Run Game reviewed the football consequences without duplicating this search.
  Physics, capacities, vision, memory and nominal post-mesh expectations are
  unchanged. The failed post-mesh trial is neither installed nor executed.

## Identical-state comparison first

The [committed fixture](../../data/reviews/current/rb-gather-release-state.json)
comes from the native Y run from snap: all **47 preceding saved state/RNG
hashes match**, and decoded body/support exactly equals the live native body.
JSON represents non-finite numbers separately; `support.since = -Infinity` is
restored explicitly. Correcting this encoding leaves the forecasts unchanged.

At entry 2.35 RB's velocity is `(1.309367,-1.268101)` yd/s, speed 1.822778.
He is upright, free and unconstrained, with no active/requested squeeze, push,
foot, strike, lean or load. His material-turn metric is 7.947895. Thus every
other free-preview guard passes. RT's acquired sample is 2.05, delivered 2.35,
age .30: estimated position `(39.307510,21.605176)`, velocity
`(-.611237,-.390605)`. No live teammate motion or hidden intention enters the
decision.

The primary experiment changes **only the request**, preserving body, support,
facing, cut skill, information and clock. The following are swept surface gaps
against RB's acquired constant-velocity RT picture, through the unchanged
20 Hz free-movement law:

| Held request, yd/s | Minimum gap over .30 s | Minimum gap over .60 s |
| --- | ---: | ---: |
| Release `(9.283028,2.073853)` | −.290228 yd | −.309710 yd |
| Half speed `(4.641514,1.036927)` | −.177218 yd | −.179163 yd |
| Keep gathering `(0,0)` | +.105995 yd | +.044280 yd |

All three previews remain upright. Gathering leaves **all ten acquired
teammate pictures clear** over .60 s. This establishes a decision defect:
the straight requested lane clears the estimate while the achievable released
path does not. The positive gather gap is conditional on that estimate; it
does not guarantee avoidance of the real, reacting RT.

The secondary transition control varies speed to 1.95/2.00/2.05 from the same
heading. Original decisions are release/gather/gather; the candidate gathers
at all three. This checks continuity only: changing speed also changes braking,
so it does not replace the identical-state experiment. An ordinary open-path
control preserves the fast request, skips previews, stays upright/contact-free
and accelerates from 1.823 to 4.360 yd/s over .60 s. Acceleration from numerical
rest is also preserved.

## Smallest controller correction and opposing contracts

Only the low-speed early return changes. Numerical rest uses
`speed <= Number.EPSILON` to avoid normalizing a direction without meaningful
momentum. Existing achievable-path previews, nearby-traffic tube, material-turn
test, all loaded/squeeze guards, moving gather preference and no-new-conflict
checks remain intact. There is no newly fitted football speed cutoff.

The focused suite preserves loaded actors, squeeze scope, ordinary straight,
parallel and passable lanes, mirrors, posture/facing, delayed-picture purity
and genuine too-late collisions. Hidden teammate motion changes leave the
saved-state decision identical. The two squeeze controls still require exact
identity of every coupled command, body and report.

The initial squeeze assertion prohibited previews for either participant.
The unsqueezed partner legitimately performs three low-speed forecasts at
2.55, actual speed .200961 yd/s, returning the same request. The assertion now
prohibits previews for squeezed bodies/requests; full trajectory identity stays
required. Initial spy output held live body references, and its later
`-4e-51` velocity was mistakenly read as call-time state. A frozen-call probe
corrected that diagnosis. Failed launcher receipts and the probe are retained.
The first clear-path forecast also incorrectly scored witness pictures; final
measurement uses the same empty picture set as its control decision.

## Native Y/H continuation and the adverse result

Only after the identical-state mechanism and controls worked, both native
plays were run from snap with complete native observation queues, behavior,
RNG and naturally reacting players. No body-only state restore certifies an
ending. Teams, seed, calls and World settings match the saved H/Y inputs.

| Complete play | Saved #36 candidate | Movement candidate |
| --- | --- | --- |
| H, flip=true | +1.14 yd, 3.20 s; no RT–RB contact | All **64** native state/RNG hashes identical |
| Y, flip=false | +.62 yd, 4.15 s; first RT–RB impulse 132.366 kg·yd/s at 2.45 | +.75 yd, 4.25 s; first RT–RB impulse **154.164** at 2.50 |

Both endings remain tackles. Y's later, stronger collision is an adverse
interaction. Its first request difference is earlier than the saved RB
witness: **RT gathers at entry 1.10**, with first state difference at boundary
1.15. He is free/unconstrained at speed 1.861005 and uses TE Y's observed
sample .80, delivered 1.10. Its predicted position is `(40.342975,22.211914)`,
velocity `(.271864,-.505807)`. The old radial-spaced request
`(2.578930,.508625)` has forecast gaps −.058135/.30 s and −.134948/.60 s.
Gathering gives +.114216 yd over both horizons, upright, with every other
acquired picture clear. This supports his new local traffic decision.

That earlier supported gather changes the coupled geometry; the candidate
never reaches the original 2.35-s native state. The stronger impact therefore
does not isolate the saved RB release intervention. It also prevents claiming
that this correction repairs Y or improves whole-play collision behavior.
No further speed, track, memory or vision tuning was attempted.

## Validation and cost

**26 focused checks in three files and typecheck pass** on `0a35c5f`, final
runtime `03065948…`. Final Y/H capture costs **1.437 internal / 1.821 launcher
seconds**, with no competing collector. Final mechanism costs .401 launcher
seconds; focused checks 2.910 and typecheck 10.509 seconds, run alongside each
other. No isolated controller-overhead claim is made. The receipt retains
earlier measurements and failures rather than replacing them with this pass.

Total new work: four complete native plays (initial candidate, then final
numerical-rest guard), three short reference captures to preserve/verify exact
serialization, one 1.10-s diagnostic prefix, zero games and zero roster screens.
Final fixture-only encoding changes reuse the source-matched coupled receipt.
Integration retains the single combined full verification.

To reproduce the final mechanism and native pair, activate Node 22.23.3, then:

```sh
mkdir -p out/y-coordination/saved out/rb-gather-release
unzip -q docs/reviews/teammate-information/assets/evidence.zip -d out/y-coordination/saved
npm run baseline:run -- --candidate -- node --import tsx scripts/diag/rb-gather-release.ts mechanism
npm run baseline:run -- --candidate -- node --import tsx scripts/diag/rb-gather-release.ts coupled
npm run baseline:run -- --candidate -- npx vitest run --project core test/gather-release.test.ts test/traffic-turning.test.ts test/spacing-yield.test.ts
npm run baseline:run -- --candidate -- npm run typecheck
```

The mechanism uses the committed native-state fixture. `capture` is a separate
reference-source diagnostic and intentionally rejects changed runtime source.
Whole-football promotion and accepted-baseline designation remain held.
