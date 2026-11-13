# Position-technique repair verification

This review separates a verified local mechanism from an improvement in overall
football results. The selected production change is the narrow cutoff contact
frame. Both QB body-direction candidates and the RB corridor prototype are
withheld. None establishes better aggregate offense, better league passing
statistics, or final physics readiness.

## Source and proof boundaries

- Audited promoted C: commit `80e815102709a19026eb5398a7e5daaa844d7bb4`,
  source `246931590ef723662a4e6178755660185b13487efe2a7d7e8dce503710b08469`.
- Unpromoted broad QB-body-ray candidate:
  `f641f128241746ab1b0b6a90f13affb05a0c8505e35792195ce19497ea5bccdd`.
- Unpromoted narrowed cue plus cutoff candidate:
  `d73aaed8c8095e2b7050ae1fd07fe257ff44c8b7805811369b955750856b1121`.
- Selected cutoff-only production source:
  `dd4cbb75c981e82e8a33d8e5d1c30d72d922d824de99fd9cba77403d0c7f9843`.

The published [coarse patch](../../../data/reviews/physics-world/position-technique/coarse-engine.patch)
and [narrowed combined patch](../../../data/reviews/physics-world/position-technique/combined-engine.patch)
were independently applied to fresh ephemeral `git archive` copies of C. The
actual `scripts/source-version.ts` reported the exact expected candidate source
after each application, and exact C after each reverse application. The narrowed
patched whole `src` tree byte-matched the then-frozen d73 experiment. This is a
historical experimental-source proof, not evidence that cutoff-only production
includes the QB change. Its original receipt is retained as
[d73-proof](../../../data/reviews/physics-world/position-technique/patch-proof/d73-proof.json);
the recorded original patch names describe that earlier publication. The
[production patch](../../../data/reviews/physics-world/position-technique/engine.patch)
is now C to cutoff-only dd4. An independent rerun of the updated checker applied
all three patches to separate fresh C archives, recovered each exact canonical
source and reversed each back to C. The dd4 whole tree byte-matched frozen
production. The [current proof](../../../data/reviews/physics-world/position-technique/patch-proof/proof.json)
distinguishes that production match from the two experimental boundaries. No
baseline or production source was changed by the independent patch checks.

Canonical hashing matters: the discarded `cdab988d…` identifier used Python
`Path` ordering, which differs from sorting complete path strings. It is not an
alternative engine boundary. The comparisons above use the actual project tool.

World, kinematics, support, body shape, free-movement preview, physical profiles,
teammate spacing, pursuit, tackling and production RB behavior remain byte-exact
C. In particular, World SHA256 remains
`4944084ea63112a5bf9caa7e39867b2024fe9ba0a726c89ad80f8fdde2f8134f`;
carrier SHA256 remains
`4ba684552d96b4eb4dd0e8d0954b395d6b4eb4754c0665507e59c5b5e5861d66`.
Technique requests and their achieved loads can change even when physical
capabilities and solver code do not. Production `defense.ts` is restored exactly
to C; the QB helper and its exploratory tests are absent from production.

## Cutoff: a desired shoulder is separate from displacement

The narrow installation applies to an OL's clearly outside, solo backside down
threat. It is chosen from the installed plan **before contact**, bound to that
specific target, and never redefined from the actual arrival to call a bad fit
square. Head-up/inside collection, doubles, reserved pull jobs and Draw retain
their existing installation. The `.3/.6` shoulder geometry is an initial
technique heuristic, not an NFL-calibrated universal cutoff angle.

The same target-bound axis drives the approach's observed-leverage check and
the fresh engagement's reference frame. The original diagonal displacement
request remains unchanged. Actual positions determine subsequent leverage;
actual World hands, arm work, traction and support determine force delivery.

[Seventeen controlled tests](../../../test/cutoff-surface.test.ts) cover:

- Exact reflection using the same generated RT/DE bodies, execution error and
  RNG, including finite approach movement and genuinely loaded hands.
- Positive native hand/arm loads and independent world-space ordering between
  the outside defender and inside lane; good reported `phi` alone is insufficient.
- A freshly observed wrong-side strike being declined. A stale favorable
  picture can still produce a mistake, but actual crossed geometry then loses
  leverage or produces the ordinary hold/penalty outcome.
- Repeated acquisition, a joining helper and changed displacement preserving
  already acquired hands/frame/control. A supplied run surface does not change
  pass-protection's actual native result.
- New target, climb, adjacent exchange and penetration collection clearing the
  old wall; the new job subsequently acquires real loaded contact.

The cutoff candidate passes all 17. Exact C executes 13 feature failures and two
passing controls; two cached ordinary Split/Tite native controls were not
re-simulated in that baseline test run. These counts are distinct from final
whole-suite validation.

The [combined d73 four native witnesses](https://github.com/tannerthardy/football-simulation-/blob/663193dfe7fe362d4f59072ef136437f881f1086/data/reviews/physics-world/position-technique/run-four.json.gz)
record actual installation metadata, decisions, bodies and loads in ordinary
Power/Under R/L and inside-shade Split/Tite R/L. The Power walls have 50/42
genuinely loaded samples and positive delivered OL arm impulse with world-space
inside ordering. Power R has separate native joint episodes `[5,13]`, while
Power L records joint `[5]`. These support same-joint continuity within the
recorded episodes and subsequent reacquisition, not one uninterrupted hand joint
through each whole play. Split/Tite controls
remain in their previous collection frame; their signed outside-wall ordering
is not the criterion for an inside-shade collection block.

Those four and the combined run panel include the experimental QB policy. The
selected cutoff-only source has its own
[four-witness packet](https://github.com/tannerthardy/football-simulation-/blob/663193dfe7fe362d4f59072ef136437f881f1086/data/reviews/physics-world/position-technique/installed-cutoff/four.json.gz)
and [comparison](https://github.com/tannerthardy/football-simulation-/blob/663193dfe7fe362d4f59072ef136437f881f1086/data/reviews/physics-world/position-technique/installed-cutoff/comparison.json).
Independent raw checks confirm all 162 full common initial inputs, 324 neutral
observer/plain natural-end controls and four dedicated controls. Recomputing the
published comparator from those files produces exactly the saved comparison.
Do not transfer combined experiment outcomes to that production panel.

The actual dd4 Power witnesses also contain 50/42 newly loaded samples with
joint episodes `[5,13]`/`[5]`, positive delivered arm impulse, full recorded
support and minimum inside separations 0.524/0.707 yards. Power R excludes seven
live-hand rows without positive delivered owner arm impulse. The other side
excludes none; all four exclude zero stale no-solve rows. Loaded samples are
physical observations, not an uninterrupted whole-play block guarantee. Power
R produces 4.13 yards against C's 4.70; Power L produces −1.14 against C's 2.00.
Both Split/Tite controls preserve their entire emitted event sequence and yards
exactly against cached C. Better backside containment does not guarantee a
better result elsewhere in the play.

A verifier review tightened the counter: a live joint's stored nonzero force
does not count as a new loaded tick without an actual current solve, delivered
owner load and positive owner arm impulse. No stale no-solve rows occurred in
these four, but retaining this distinction prevents overstated future evidence.

## Selected cutoff-only validation

The [dd4 comparison](https://github.com/tannerthardy/football-simulation-/blob/663193dfe7fe362d4f59072ef136437f881f1086/data/reviews/physics-world/position-technique/installed-cutoff/comparison.json)
retains every pair and the two separately labelled supplemental roster inputs.
Native arm, work and traction limits pass; the same physical World is unchanged.
The ordinary balanced panel remains mixed:

| Ordinary 160 fixed snaps | C | Selected dd4 |
| --- | ---: | ---: |
| Mean yards | 1.386 | 1.3421875 |
| Runs of zero or negative yards | 37 | 41 |
| Runs of 10+ yards | 0 | 0 |
| Whole-play climbs | 116 | 114 |
| OL falls | 17 | 19 |

Six ordinary losses of at least two yards and five gains of at least two yards
remain in the comparison. This is a narrow contact/technique repair, not a
demonstrated rushing-efficiency or NFL-average improvement. The final
[validation receipt](../../../data/reviews/physics-world/position-technique/checks.json)
records 829 TypeScript tests across 73 files, typecheck and build. The unchanged
Python checks retain their separately labelled 22-test receipt. The combined
d73 experiment's 845 tests across 74 files are historical experimental evidence,
not the production test count.

## QB cue: information repair demonstrated, both policies withheld

The first candidate replaced `qbEyes` identity/current target positions with a
delayed body-direction cue. Its 12 initial tests checked information invariants,
ambiguity and owned vertical priority. Native football nevertheless exposed a
bad instruction: neutral torso facing could pull a defender toward empty grass
or bias selection among stationary unreleased receivers.

In roster-1 FourVerts/Cover4, the first paired SS command difference occurs at
`.20 s`, before a released route cue: lateral request changes from 4.163 to
5.223 yd/s while both targets are null. The result changes from a 3.11-yard QB
slide to a 47.42-yard completion to H/WR. This does not attribute every later
yard to that one command; it identifies an invalid initial evidence policy.
The [coarse packet](https://github.com/tannerthardy/football-simulation-/blob/663193dfe7fe362d4f59072ef136437f881f1086/data/reviews/physics-world/position-technique/qb-cue/coarse-comparison.json)
and exact coarse patch are retained as **unpromoted** evidence.

The narrowed d73 cue is more constrained. Affinity can bias only a route whose **own consumed
RouteObservation** has moved beyond the LOS or exceeds 1 yd/s. That is a
fallible visible release/movement inference, not hidden knowledge that a route
really released. Empty-grass body-ray fallbacks are removed. A no-threat
underneath defender retains his called landmark; a deep no-vertical lean uses
only observed routes within his band. Existing owned quarters/third verticals
still take precedence.

[Sixteen archived QB tests](../../../data/reviews/physics-world/position-technique/qb-cue/unpromoted-source-test/test/coverage-qb-cue.test.ts)
pass at d73 source. Exact
C gives 11 expected feature failures and five passing controls. All four added
empty/unreleased/delayed-release controls fail at the exact coarse source and
pass at C and d73 source. This proves the specific regression is repaired
without reinstating private read identity.

The 135-degree acquisition sector and 35-degree bearing cone remain unvalidated
body-orientation proxies. Body-facing marks are not eye rays, and this is not a
finite scan/attention model. There is one new explicit QB sample reused by this
zone decision; total QB samples can be two because existing pursuit already
samples him. `ZoneCoverage` is the experimental scope, not every
private-information shortcut elsewhere in the engine. It is not shipped.

The [24-input native comparison](https://github.com/tannerthardy/football-simulation-/blob/663193dfe7fe362d4f59072ef136437f881f1086/data/reviews/physics-world/position-technique/qb-cue/comparison.json)
uses identical generated players, physical inputs and calls, with 48 neutral
observer/plain controls across C/d73. Each phase has 23 natural finishes and
one separately labeled live 8-second endpoint; the censored identities differ.
The original empty-grass FourVerts/Cover4 case now ends in a 3.05-yard slide,
versus C's 3.11. Material adverse defensive outcomes remain:

- Roster-1 FourVerts/Cover3Match: 22.11 → 43.19 yards.
- Roster-1 Dagger/Cover3Match: incomplete/0 → completion/29.68 yards.
- Roster-1 FourVerts/Cover1: final endpoint is still live at eight seconds. It is
  not a fabricated final gain, missed tackle or simulation timeout.

All ordinary recorded native zone styles in this panel are match. Spot behavior
has controlled-test coverage, not a native spot-panel improvement claim. The
packet records consumed pictures, returned/delivered commands and subsequent
bodies; unrecorded private affinity intermediates are not reconstructed as
actual recorded decisions. No passing-realism improvement is claimed.

The independent recommendation is to withhold the whole QB proxy and ship the
cutoff repair alone. Removing privileged read identity is necessary research,
but it does not validate the replacement. `inferQBDirection` assigns confidence
one to any visible finite upright body facing. `QBPass` uses fixed facing zero
for ordinary shotgun drops and evasion; the receiver movement/depth gate does
not show that this torso direction expresses a read. That uncertain cue can
earn up to three yards of threat-selection preference or substantial spot-lane
weight. Information purity and realistic inference are distinct requirements.

The adverse native pass panel and worsened small matched game smoke warrant a
first-instruction diagnosis, not aggregate tuning or automatic acceptance of
awareness debt. They do not prove that every extra yard came from this policy.
Preserve both source packets and their controls. The next QB experiment should
separate removal of privileged information from body-direction weighting, hold
zone-owned priorities constant, and prove one ordinary/adverse route's request
before introducing another directional confidence rule. Production restores C's
coverage, including its documented private-information debt; this is a deliberate
withholding decision rather than a claim that the oracle is realistic.

## Combined experimental run results remain mixed

The [run comparison](https://github.com/tannerthardy/football-simulation-/blob/663193dfe7fe362d4f59072ef136437f881f1086/data/reviews/physics-world/position-technique/run-comparison.json)
reuses cached C's 162 inputs; only the candidate was collected again. All 162
common initial projections/player-profile hashes match, with 324 neutral
observer/plain signatures and natural endings. The unchanged generic collector
omits new `contactFit` metadata and joined prepass details. Therefore common
input equality does not assert equality of the intentionally new installation;
actual installations are recorded in the four sidecars. Whole-play climbs come
from emitted events, rather than the five update-local climbs the older
collector happens to capture.

| Ordinary 160 fixed snaps | C | Unpromoted d73 |
| --- | ---: | ---: |
| Mean yards | 1.386 | 1.334875 |
| Runs of zero or negative yards | 37 | 41 |
| Runs of 10+ yards | 0 | 0 |
| Whole-play climbs | 116 | 114 |
| OL falls | 17 | 20 |

Six adverse ordinary pairs of at least two yards remain in the saved comparison,
including Power/Under L 2.00 → −1.14 and WideZone/Under L 6.15 → 1.80. The two
supplemental roster snaps are reported separately. This balanced eight-concept,
five-front, both-side, two-seed panel is a mechanism sample, not NFL playcalling
frequencies or a roster-population estimate. Cutoff and QB-cue changes coexist
in d73; their whole-play effects are not independently attributed. These saved
counts are not results from selected cutoff-only dd4 production.

Recorded native work/momentum residuals remain small, and saved arm, traction
and motor-work limits pass. That checks coherence within recorded native rows;
it does not supply NFL-calibrated force constants or evidence for unrecorded
loads. Better local containment can coexist with a worse run if another player
makes a different request or fails his assignment.

## RB experiment and persistent priorities

The [RB prototype](../../../data/reviews/physics-world/position-technique/rb-entry-unpromoted/README.md)
remains unpromoted. It found that a crease's far midpoint can have a blocked
straight approach while a bent approach through the same pair's near-face mouth
is legitimate. Simply rejecting every direct corridor would remove valid
football movement.

Using production free-movement preview and contact scale was a useful step, but
the prototype still previewed a different squeeze demand/footprint from the
executed command, lacked a loaded/gripped-body exclusion, and did not prove a
safe closing-penetrator escape policy. A free-body preview is not a pile or
grip solve. These are forecast/request consistency gaps, not permission to
override actual contact. Isolated existing 55 controls pass at C/prototype;
exploratory entry tests improve from 5/11 to 9/11, with both zero-contact mirror
assertions still red. Tiny contact under already committed momentum is not by
itself evidence that force constants are wrong. Production carrier code and
tests were restored exactly; there is no shipped RB improvement here.

The [pursuit audit](pursuit-and-tackle-technique-audit.md) retains three narrower
failures: requested-ray spacing misses an achieved curved collision, gather
mode changes abruptly at an angular threshold, and a rear pre-contact wrap can
ignore attainable shoulder orientation. Its primary receipts pin C; the
feedback variant was re-run from immutable C after correcting an interim-source
label. Historical tackle panels and old viewer clips remain explicitly
historical. None is a current NFL occurrence-rate estimate.

The [offensive](offensive-skill-technique-audit.md),
[defensive](defensive-awareness-technique-audit.md), and
[movement/data](movement-and-nfl-validation-audit.md) audits distinguish source
facts, current native evidence, historical evidence and coaching hypotheses.
User-generated textbooks are useful design aids, not verified league playbooks
or sources of physical force constants.

The best next repairs remain small: make traffic forecasts respect achieved
turning, make the RB's waypoint/shape/request preview consistent for free bodies,
and diagnose the remaining released-route coverage/pursuit instructions before
tuning NFL outcome averages. Preserve legitimate escapes, ordinary successful
contacts, all adverse cases and the same physical capabilities. This increment
does not justify expanding the foot solver or declaring the physics finished.
