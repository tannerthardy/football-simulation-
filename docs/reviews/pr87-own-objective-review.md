# Independent #87 own-objective review

2026-10-15, America/Phoenix. **APPROVE the own-objective producer/consumer
contract at `9760de031cae3bda7c926735f8edeb97fa4574e5`. No blocking finding.**
This is Catching's requested review, not the independent cost decision or the
Integration owner's combined verification/adoption decision.

## Pins and boundary

- Accepted develop freshly fetched: `86250bb4f0c6f421878c204161864d523c3e30b6`.
  The checked-in queue is an older snapshot; merged #85's merge commit and the
  explicit fetched develop agree. `origin/develop` is a stale local tracking
  ref in this executor; it was not used as the accepted reference.
- Review branch starts that accepted commit. Reviewed #87 source was extracted
  unchanged into a temporary directory; no checkout or retuning of #87.
- Reviewed head: `9760de031cae3bda7c926735f8edeb97fa4574e5`.
  Existing executed candidate: `52518bebea74e8668f6b3c0628f3a3a1e5253008`.
  Their `src` trees are identical. Runtime SHA256 is
  `8ec3ac755d1ff2ca64eb3482244c25a96c1247dee0c4aa971d950601b6baf2b3`.
- #89 stays frozen at `78a00645e4f821d45604a1ed68c35592de1f5926`.
  This branch changes no production, tests, capacities, flags or physics.

## Contract decision

**Fixed versus moving.** `playBall` explicitly labels its chosen catch-drive
landmark fixed. A predicted location selected for this command does not claim
that an unknown receiver is stationary. When `movingCatchApproach` actually
selects its existing moving arrival, it replaces that metadata with the
back-projected current anchor and the consumed receiver velocity. It does not
lead the already-future catch point a second time. Earlier attainable ball
contests, attainable receiver windows and the existing carry branches keep
their priority; the metadata additions do not change their eligibility.

`track` copies its supplied point/velocity. A caller-supplied zero is a known
station-keeping plan component; it does not create a new observation of a
stationary player. The separate alley moving-picture decision remains #89's
job. This interface alone does not correct every producer's football plan.

**Unknown velocity.** The optional moving velocity remains absent when absent.
The new spacing option declines missing/nonfinite moving velocity and never
substitutes zero. Fixed points are explicitly discriminated. Existing contracts
also preserve copied vectors and metadata through ordinary command spreads.

**Age and observations.** This is a newly produced own plan, not a new sighting,
so it has no observation timestamp to refresh. Spacing obtains each peer picture
once through the existing callback, retaining its age, position and velocity.
Missing/nonfinite/negative peer age declines the new option. A finite older age
is not relabeled fresh: the short forecast remains conditional on that picture.
`PerceptionBuffer` already projects the delayed sample to the current decision
time; spacing must not advance it by its age again. The new option projects only
the following bounded .6 seconds. The passing frame retains an own maneuver
side/frame, not peer position/velocity; every evaluation needs a current query
result and the current own goal. It does not acquire extra pictures or draw RNG.

No new age expiry, vision gate or uncertainty model is introduced. This review
does not certify the broader inherited teammate `see`/`calledMotion` feed as a
complete awareness model. That remains a separate information boundary.

**Football responsibility.** Spacing never calls a behavior again, selects a
receiver, edits recognition or replaces the assignment. It scores the current
command's own goal, preserving any installed cushion/leverage offset already
in that goal. The selected request retains facing/posture/other command fields,
obeys field containment and the original requested speed cap, and must have an
upright achievable path with forward progress and no newly predicted overlap
with a previously clear peer. Contact techniques that replace commands do not
inherit a stale coverage symbol; engaged/loaded/gripped/contact-constrained
actors also decline the free alternative.

When native movement overlaps, the acceptance benchmark is useful goal progress
versus standing plus clearance relief, rather than beating a fictitious sprint
through a body. Consequently this is a local feasible-movement improvement,
not a guarantee that every .6-second endpoint preserves globally optimal
coverage. Peer turns, later contact and competing responsibilities remain real.

## Evidence reused and remaining adverse evidence

Reused #87's published report, code diff, focused-v2/v3 receipts and saved native
A044/A008 comparisons. No repeated suite or native collection was needed:

- 39 distinct focused checks/typecheck are already published, including unknown
  own motion, unknown peer motion/age, constrained actors, actual obstruction,
  clear-route zero previews, metadata copying and World-step/work agreement.
- A044 avoids the SS/robber collision while preserving H's complete pre-catch
  body/commands and the offense's approximately 2.85-yard separation. The later
  catch versus drop is an existing head-turn RNG scheduling difference at the
  identical catch probability; it is not proof of a better catch or less YAC.
- A008 keeps actual catcher Y7 and defender NB19 body/commands, catch, wrap,
  events and root RNG exact. Other support motion changes; SS's .01137-yard
  cost relative to H10 remains visible. A044's candidate is unfinished at the
  short recording cap; no completed-outcome benefit is inferred.

## Bounded sideline check: non-blocking normalization note

Static review found that `track` clamps the steering point's y to
`[.3, FIELD_WIDTH-.3]` but stores the supplied point in metadata. Some eligible
support/carry callers can supply a point outside that interval. Thus identical
raw movement requests can carry different scoring anchors near a sideline.

One paired local probe used #87's existing fixture own state/peer19 picture,
translated so own y=3.5 and acquired peer y=.37355864, with a supplied support
point y=-.1 versus the effective clamped point y=.3. It retained the same body,
picture, raw request, facing/containment and supplied zero flow. An interior
producer case opposed it. Hidden peer position/velocity getters throw; each
spacing call obtained exactly one picture. The request was identical in both
arms, before and after spacing: selected velocity
`(-2.107367681628172, .6006205593174583)` yd/s. This demonstrates no adverse
selection in that bounded case, and is not a new football outcome experiment.

Canonicalizing metadata to the effective point would make the representation
clearer, but this review found no consequential request change to block the
candidate or reopen behavior tuning. Keep the discrepancy explicit; if a later
case establishes a selection error, normalize the producer without changing
steering, physics or its information. No further variants were started here.

The [probe and exact output/receipt](../../data/reviews/current/pr87-own-objective-review/)
preserve the input fixture pin/hash, script hash, all 44 settings and Node
22.23.3. Launcher time **.276 seconds**, zero new PlaySim runs, no build/full
suite/game. An initial receipt used component-wise path ordering for its source
hash; the corrected full-relative-path ordering matches the published runtime.
Source/probe bytes did not change and were not rerun to correct the receipt.

To reproduce, extract `src`, `package.json` and
`test/fixtures/traffic-step.json.gz` from the reviewed #87 pin into a temporary
directory; copy the preserved `objective-review.ts` into its root and provide
the existing compatible `node_modules`. Set every flag to the receipt value
(remove null entries), then run the receipt's Node command. The diagnostic is
an artifact for the pinned review source, not an executable on this docs-only
accepted-source branch, which intentionally lacks #87's new runtime module.

## Handoff

Catching's metadata review is **APPROVE at the exact reviewed head**. Run retains
the independent #81/cost dependency decision. Integration checks mutable heads,
the portable extraction and its exact combined candidate once. Preserve #87's
adverse/outcome limits and the separate #89 freeze. No new approach change is
authorized by this review, and no merge was performed.
