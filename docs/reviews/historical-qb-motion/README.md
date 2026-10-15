# Historical QB velocity: no supported entry; navigation parked

**The historical evidence narrows uncertainty but does not resolve a useful
achievable entry. Navigation tuning is parked.** No production navigation change
or changed-policy coupled trial is justified. Independently useful information
fixes have their own tested current-accepted-base candidate for Integration.

## Exact scope and source

The [owner-approved historical field](https://github.com/tannerthardy/football-simulation-/pull/36#issuecomment-6200878215)
is implemented separately in `676808aa2fc411bd98b821dead87e5dbeff3d127`; the final tested research
tree is **`fa540a7a7583307504c04e972d72932fe49f2c44`** on
`codex/run-entry-admission-portable`. The initial metadata replay/contract freeze
is `e5332f56d56191951c58ddd462cf2a4105b17573`. Both have source SHA256
`83f575d55fe8aa03d65f90fb2c9b51e247a4e3f8dda5e1ef0f9a2367fb4fd39e`.
This remains an experimental host; no shared baseline or navigation adoption.

Only one engine file changed from the previous portable candidate: visual
`observed`/`remembered` pictures expose a copied `sampledVel` from that observer's
already delivered sighting. Called/tactile cannot masquerade as visual velocity.
The [additive source patch](historical-metadata.patch) is separate from navigation.
It is **not required by or included in the information-only Integration candidate**.

Acquisition, delivery, source priority, capped .30s position projection,
compatibility `vel`, unavailable shape, pure reads and1.00s sample-age memory
expiry are unchanged. No target/body/history lookup occurs on query. The field
is past evidence; it is never installed as current velocity. Four focused
contracts cover cap/expiry/clocks, origin reconstruction, copy isolation/private
read poison, delayed real reacquisition and nonvisual exclusion.

Current accepted `7d1451b2c31786e075550183a6a93bbda23da29b` is documentation-only
relative to the previously tested runtime8c891f4. Exact source/test/settings
compatibility was checked rather than rebasing historical experiments.

## What would have changed the decision?

The hypothesis needed to exclude QB conflict for a **moving, physically achievable
entry**, while preserving known teammate conflicts and the changed-QB control.
A narrower region alone was insufficient. The diagnostic examines37 original
entry candidates over seven current saved-input decision times, each with fast,
slower and gather requests through the existing .60s own-body World preview.
It changes no destination scores, body capacities or movement law.

From the legitimately acquired picture:

```text
sample origin = capped pos - sampledVel * predictedFor
elapsed       = full sample age + preview time
region center = sample origin + sampledVel * elapsed
region radius = 0.5 * A * elapsed * (elapsed + .05)
```

The center is a mathematical center for a historical possibility set, **not** a
new query position or current-motion estimate. `A` is the maximum ordinary
locomotion-envelope axis: max(public initial sprint acceleration, braking,
1.3*lateral). The1.3 ceiling comes from existing ordinary command bounds in the
controller code, declared before results, without inspecting private QB intent.
The .05 term conservatively covers native semi-implicit integration ordering;
own swept-segment sampling also receives its physical acceleration allowance.
Full sample age is used throughout, with original clocks preserved. Future
hypotheses do not refresh the store or make expired observations available.

This is an intentionally conservative **ordinary unloaded-motion exclusion**
model. External contact/constraint forces and loaded passive recovery are not
certified by it. An overlapping region is not proof that the QB will collide or
that a route is physically impossible. It means the available evidence/model
cannot certify the proposed moving entry. Unknown remains explicit.

## Result: narrower does not mean useful

[Exact decision/uncertainty comparison](narrowing.json):

| Play / decision | QB sample / delivery | Sample age | Old speed-bound radius at preview end | Historical radius | Best moving-route gap |
| --- | --- | --- | --- | --- | --- |
| P032,1.70s |1.15 /1.45 |.55s |12.50yd |5.83yd |**−.87yd** |
| P032,1.95s |1.15 /1.45 |.80s |14.66yd |8.57yd |**−3.16yd** |
| P019,2.25s |1.60 /1.90 |.65s |13.36yd |6.86yd |**−.83yd** |
| P019,2.50s |1.60 /1.90 |.90s |15.52yd |9.82yd |**−1.98yd** |

No moving entry is supported at any of these decisions. At P0322.20,2.45 and2.70,
the QB picture is **unavailable** after ordinary memory expiry; historical data
is not retained or filled from a private source. All37 candidate-entry results
remain unsupported. No useful alternate action was established, so no navigation
candidate or additional coupled behavior intervention was run.

The two metadata-only saved-input replays reproduce **all120 physical frames,
events and final body/ball/RNG states exactly** against the previous cached
continuations. This verifies that the additive information field changes no
movement on its own. It is not evidence of better football. Original scouting,
pre-constructor mind and matchup limitations remain as documented in the
[prior coupled report](../run-entry-relevance/README.md).

## Control: the QB actually changes motion

The changed-motion control forks from the same acquired P032 sample, including
its true past position/velocity. Two ordinary two-body World runs retain active
collisions and the same runner request. One QB continues; the other requests a
turn toward the runner. Neither is presented as a full football outcome.

At the first delivery .30s after sampling, **both observer queries are identical**:
they report sampled velocity `(0.0561,0.0422)`yd/s and the same acquisition/delivery
clocks. Actual QB velocity is `(0.0561,0.0422)` in the continuation but
`(-0.1918,-1.5516)` in the changed branch. Using that old near-stationary velocity
as current would therefore be wrong. The original historical bound contains
both ordinary trajectories; the changed branch reaches56.5% of its radius.
No contacts occur and both bodies stay upright. Actual support state gates
subsequent acquisition; later reacquisitions deliver changed motion with latency.
No query consults the hidden new velocity.

The final controls preserve the original picture's timestamps and age, expressing
the mechanical time axis relative to them. Earlier observer variants are kept
in [initial evidence](initial-result.json.gz) and
[support-corrected evidence](support-control-result.json.gz). Final results are
in [result.json.gz](result.json.gz). These observer corrections repeat only the
two small mechanical branches, reusing the verified metadata replays rather than
re-running native snaps.

## Decision and independent Integration candidate

**Park navigation tuning.** The near QB's last legitimate observation leaves
enough ordinary changed motion to overlap every moving candidate; later the cue
expires. Stronger claims would require unsupported intent/current-motion
assumptions or a separately established observation/coordination mechanism.
Do not tighten acceleration/margins, shorten the preview, extend memory or
restore private state to recover the old P032 ending. No new automatic study is
scheduled. The earlier alternate-entry/collision benefit remains unproved.

The independent information fixes are now concrete and separately reviewable:

- Branch **`codex/run-entry-information-portable`**, directly on accepted
  `7d1451b2c31786e075550183a6a93bbda23da29b`.
- Code **`60223a863a8431e85d5027c879191f3527ed10b8`**.
- Evidence **`80c9fa4db36ebcd4b81edda110e9a451882d8291`**;
  [report and receipts](https://github.com/tannerthardy/football-simulation-/tree/80c9fa4db36ebcd4b81edda110e9a451882d8291/docs/reviews/run-entry-information-only).
- Only original approved observation/query core, PlaySim seams preserving catch
  readiness, and the acquired opponent-risk correction. Three production files;
  no navigation, sampledVel research, old experimental ancestry or gap delta.
- Four independent focused controls and typecheck pass,15.086s. Both pins were
  verified on GitHub and [delivered to Integration](https://github.com/tannerthardy/football-simulation-/pull/65#issuecomment-6201833662).

Recommendation: Integration reviews that information-only code independently;
it owns acceptance and exact combined verification. Historical-velocity research
and complete navigation promotion remain parked.

## Validation, cost and reproduction

The four new historical contracts pass; the existing12 consumer controls also
passed in the initial run. Its one new strict `.3` assertion encountered the
existing `.30000000000000004` clock representation, so only that comparison was
changed to12-decimal tolerance. No sensing clock or expiry threshold changed.
The [failed receipt](validation/initial-core-launcher.json) remains visible.
Typecheck passes. Later observer edits are .mjs only and do not change the tested
engine/TypeScript contracts.

Historical investigation: **16.326s new launcher time**, including the failed
assertion and observer corrections. Two3s metadata replays, six1s two-body
mechanical branches including repeats, one transport tick in the initial
consumer check. Zero changed-policy trials, full games, roster cases or shared
suite runs. Independent information extraction adds15.086s, for **31.412s** new
launcher time across both deliverables. Node22.23.3, source/test/input/collector
fingerprints, all44 flags and World defaults are in the receipts and
[machine-readable summary](summary.json). No speed-gain claim.

```sh
node scripts/baseline.mjs --candidate --receipt out/historical-qb/core-recheck.json -- npx vitest run --project core test/teammate-historical-motion.test.ts
node scripts/baseline.mjs --candidate --receipt out/historical-qb/probe-recheck.json -- node --import tsx scripts/diag/historical-qb-test.mjs
```

The collector verifies physical history compatibility before interpreting new
metadata. Re-run only when source/inputs change the bounded decision; this parked
result does not request another game or perception campaign.
