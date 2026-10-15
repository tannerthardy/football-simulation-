# Teammate motion contract decision

October 15, 2026 (America/Phoenix).

**Final minimum: approve Do-It-All's existing-schema consumer correction and
observation-only staging.** No `sampledVel` addition is required for this
extraction. The [owner response to its actual scope claim](https://github.com/tannerthardy/football-simulation-/pull/36#issuecomment-6201016808)
settles that choice. The [initial owner review](https://github.com/tannerthardy/football-simulation-/pull/36#issuecomment-6200878215)
also approves an additive historical sample vector if a later consumer needs
it; that option is not a new dependency or reason to delay the smaller repair.

Reviewed #36 core `68284671d062dfd4e7e879bcd037bc21dad3e3ac`, module SHA256
`dac6f5bcf21a14b6022c5a233e499057758fcc44f001511cfb74e941a204d367`,
and Do-It-All's extraction/probe at `94eb22aa396a8a0d5db7338add13437ce1007bf3`.
The .35-s picture with `source=observed`, age=.35, predictedFor=.30 and vel=(0,0)
is **unknown current motion, not observed stopping**. Recent delivery cannot
renew the .30-s sample-based prediction clock.

## Contract for the current implementation

- For visual pictures, `age > predictedFor + 1e-9` means unknown motion;
  equivalently sample age exceeds the .30-s cap. Check clocks, not only the
  source label or whether the vector is zero.
- Keep that peer explicit through the consumer's unknown/unsupported result.
  Do not collapse it to a stationary path, silently discard it or certify clear
  admission. Unknown is neither a proved collision nor an automatic stop.
  It must not manufacture an allegedly safer alternative.
- A recently acquired stationary sample remains real zero under the existing
  bounded projection assumptions. Fresh moving and reacquired samples must
  still change the response normally.
- With unchanged schema, stale sample origin/velocity is not reconstructible
  from capped `vel`. Do not attempt to undo extrapolation with sentinel zero.
  No hidden target body, new history lookup or dead-reckoning extension.
- Preserve source priority, .30-s position projection, 1.00-s memory expiry from
  sample age, acquisition/delivery clocks, unavailable shape, copied vectors,
  once-per-boundary sensing and query/recording/RNG purity.

The existing .35/.40-s adverse probe remains visible. Core extraction and
consumer correction stay separately reviewable. Reuse compatible evidence and
add only directly affected boundary, known-stop, stale/unknown, reacquisition,
hidden-divergence and purity checks. This owner review itself launches zero
World steps, tests or simulations; no suite or game campaign is requested.

## Staging and optional later field

An empty installed-call map and no tactile writer are acceptable for this
observation-only admission pilot. Admission excludes called/tactile. Spacing,
its old consumers and broader installed coordination are unchanged; this is not
the full #36 feature or a whole-engine awareness repair. Reconcile on accepted
`8c891f4cf887b54297efbbc4c7993ba5e2f318b5`, preserving incidental catch readiness's
import and once-per-tick hook. Integration owns PlaySim overlap and exact combined
verification; no full #36/research-branch merge.

If a later approved model needs historical velocity, expose a copied
`sampledVel` only on observed/remembered pictures, from that observer's existing
delivered sighting. It is historical evidence, not current motion or permission
to extend the query horizon. Then sample origin is `pos - sampledVel * predictedFor`,
while uncertainty hypotheses use full sample age. Called nominal tempo and
tactile own-velocity proxies must not masquerade as visual sample velocity.
No such field is implemented in this review.
