# Run-entry admission: accepted-development extraction plan and contract blocker

**Hold the current admission patch for the information contract, not for more
football tuning.** A minimal observation-only Awareness slice is mechanically
extractable onto accepted development and onto the reviewed #63 tree. The current
client also misreads a documented value: after the prediction cap, zero returned
velocity means unknown current speed, while admission treats it as a stationary
teammate. Compilation alone does not resolve that mismatch. Awareness owns the
shared representation; no production runtime is edited in this planning branch.

The independently ready departed-center gap fix is already included in
[#63](https://github.com/tannerthardy/football-simulation-/pull/63). This plan
adds no second gap patch and requests no #63 delay, retest or scope change.

## Exact references

| Role | Pin |
| --- | --- |
| Accepted `develop`, fetched for this review | `a1b16e666a9ee7d1bc1d2aecba141fc535863b24` |
| #63 review head, still separate from accepted | `0f70bb2a4205497d7df8ed1ed59391d87084c603` |
| Original Awareness owner candidate / #36 | `68284671d062dfd4e7e879bcd037bc21dad3e3ac`, `codex/teammate-information` |
| Original core implementation ancestry | `063a2ddbc8078a604165979df6e1b62b910dc53f`; final owner core bytes above include later contract fixes |
| Recorded experimental engine, evidence reference only | `f62511a513f2187884d74ae3b94435835e43309c` |
| Independently useful information-risk delta | `f8ce858adf7a3859b10307520000f4eb3172d344`, same risk change as `cfc2fc9bdc1bc293d9686e85bf23631a581a5367` |
| Approach-only candidate under review | `cfcb7db0ba17c978fd02fb179c61f4e8b1d66752` |
| Existing approach evidence | `75dbf46b12a4d186a7da6ebc463b9fba228f0b50` |

Do not merge the recorded engine, #36 branch, `4d0a3ac` checkpoint or the earlier
`6122fb0` zone/Duo stack. They contain independent consumers, installation and
controller experiments. Only the enumerated file/hunk slices below are proposed.

## Smallest required contract

Admission only consumes `sim.teammateInformation(observer, teammate)` and the
`TeammatePicture` type. Its approach helper filters to observed/remembered
pictures. Public teammate radius/braking capability and the runner's own full
body are separate inputs. The query must remain pure, copying returned vectors,
with no sensing, history refresh, delivery, controller inspection or RNG on read.

| Field | Owner's actual meaning / required preservation |
| --- | --- |
| `source` | observed/remembered/called/tactile/unavailable; `observed` means recently delivered, not current visibility or a still-valid velocity forecast |
| `pos` | last acquired sample advanced by at most0.30s; then frozen |
| `vel` | sample velocity while within the prediction limit; zero afterward denotes no current-speed estimate, not an observed stop |
| `sampledAt`, `availableAt` | separate acquisition/delivery clocks; a pending old sample can arrive after visibility is lost |
| `age`, `predictedFor` | sample age and how much its position was advanced; age can exceed predictedFor |
| `unavailable` | has no position/velocity; never fill from target body, `see()`, live behavior or a new history lookup |

Owner documentation is explicit about these semantics:
[PR36 interface and acquisition](https://github.com/tannerthardy/football-simulation-/blob/68284671d062dfd4e7e879bcd037bc21dad3e3ac/docs/reviews/teammate-information.md#interface-and-acquisition).
Preserve range25yd, half-angle100°/75° during own engagement, existing own
reaction/attention delay, upward tick delivery, prediction0.30s and memory1.00s
from **sample** age. This task proposes no gaze, vision, expiry or physics change.

### Demonstrated blocker in the current consumer

The [zero-World sensing/query probe](contract-probe.json) acquires a sample with
velocity `(0,1)` at0.00s, delivers it at0.30s, and keeps hidden reality moving
elsewhere. At0.35s the returned source is still `observed`, position `(5,.30)`,
velocity `(0,0)`, age0.35 and predictedFor0.30. At0.40 it is `remembered` with the
same frozen position and zero velocity. At1.05 it is unavailable. Repeated query
remains inert; no private live state was used to produce the example.

In `cfcb7db`'s `run-approach.ts::positions`, `picture.vel` is used both to undo
past extrapolation and to hypothesize continued/braking motion. Zero collapses
that strip to a point. Thus the current client can turn **unknown motion into
certain stationary occupancy**, even when the source label is `observed`.
The saved P032/P019 fresh-picture improvement is not invalidated by this finding;
it does not certify this stale-picture contract either.

**Required owner/consumer decision before implementation:** retain all existing
query meanings and choose an explicit representation the client can consume.
A minimal proposed addition is copied `sampledVel` for observed/remembered
pictures, from the sighting already owned by that observer. Existing `pos` and
`predictedFor` then identify the sample origin without querying reality. An
explicit unknown-motion status or equivalent client treatment is also required;
`observed` alone cannot certify current velocity. The client must use sample age
when constructing an uncertainty hypothesis rather than assuming the projection
clock is the whole elapsed time.

This is a proposal for contract review, not approval to extend dead reckoning,
keep expired memory, expose raw live velocity or change the acquisition model.
If the owner prefers no schema addition, admission must represent unsupported
stale motion explicitly and stop certifying that case as a clear stationary
path. Do not silently drop an available stale peer or invent a universal bubble.
No implementation of either option is included here.

## Explicit extraction order

1. **Owner-approved observation/query core, separate commit.** Copy only
   `src/sim/teammate-information.ts` from owner pin6828467 (144lines, SHA256
   `dac6f5bcf21a14b6022c5a233e499057758fcc44f001511cfb74e941a204d367`).
   Its imports are type-only `Vec2` and `Agent`. Existing accepted Agent already
   has the required own position/facing/down/engagement/eyes, public profile,
   and `mind.observationDelay`. No new Agent/Behavior, blocking, mesh or World
   implementation is required.
2. **Minimal PlaySim transport, owned by Integration.** Import/store the class;
   initialize after behavior assignment with an empty installed-call map;
   expose the same guarded pure query; call `sense()` once after own mind
   updates and before decisions. The proposed slice has five local edit areas.
   It does not change spacing's input, add touch writers or install calls.
3. **Information-risk correction, independent commit.** Take only the existing
   carrier risk-loop delta. It removes private engagement/down/fatigue reads and
   reuses acquired opponent pose/recovery. It has no dependency on this new
   teammate interface and need not wait for approach semantics.
4. **Approach admission, after contract reconciliation.** Apply the approach-only
   source/tests, with the agreed stale-motion handling added as a separately
   reviewable consumer correction. Preserve accepted carrier `evaluate`'s
   four-argument contract: its nearby patch context differs from the recorded
   engine's unrelated `assessmentAim` change. That context adaptation is not a
   runtime dependency on the old assessment change.
5. **Focused seam checks, then Integration's combined verification.** Reuse the
   existing fresh P032/P019 and private-state invariance evidence at their own
   source pins; add the one stale-motion contract control and query/acquisition
   purity checks. Existing recording/pending-delivery and hidden-divergence
   contracts remain relevant. New accepted-base execution is needed before
   claiming the recorded-engine native behavior transfers. Integration owns the
   exact combined code suite; no automatic roster or full-game campaign.

The empty install map is an **observation-only staging proposal** for this
consumer, requiring owner confirmation. It is not the full #36 feature and it
does not remove knowledge from current spacing: that existing consumer is left
unchanged. In the new query, called/tactile sources are not produced by this
stage. Admission currently excludes both, so their builders/writers are not
required to run this narrow predictor. If that staging is not acceptable to the
owner, specify that as a scope decision rather than importing the complete stack.

### Dependencies excluded from the slice

| Excluded module/change | Why admission does not require it |
| --- | --- |
| `teammate-calls.ts` | Supplies called alignment/zone/mesh expectations; the new predictor excludes called pictures. Its later achieved-track builder imports blocking/RunnerToMesh/World preview helpers unnecessarily for this slice. |
| PlaySim after-physics tactile writer | Source tactile is excluded and own contact/constraint already bypasses free preview. Keep this independent unless the owner requires the complete channel. |
| Global spacing nullable adapter and installed-route previews | Independent consumer migration with known opening/football consequences; not needed merely to populate the new query for carrier admission. |
| `Behavior.runSurfaceMotion`, stretch footwork/help, QB mesh, joined release, defensive-front changes | Separate controllers with no implementation dependency from the observation/query store or approach helper. |
| Recorded carrier `assessmentAim` change | Context-only difference; preserve accepted implementation. |
| Older zone/Duo navigation and post-mesh trial | Separate experimental work; neither is needed or included. |
| Gap identity correction | Already included in #63; not part of this proposal. |

## Concrete review artifacts and checks

The [patch directory](patches) provides proposed slices, **not approved runtime**:

- `01-observation-core-proposal.patch` applies to accepted `a1b16e6`.
- `01b-observation-core-after63-proposal.patch` is the same core/shim with #63
  import context; it preserves `IncidentalCatchReadiness`. The first accepted-base
  import context did not apply there, and this explicit variant resolves only
  that overlap.
- `02-information-risk.patch` is the standalone existing risk correction.
- `03-admission-context-only-proposal.patch` preserves accepted `evaluate` context.
  It deliberately retains the **currently blocked** consumer semantics so the
  review does not disguise a new behavior fix inside dependency extraction.

[Temporary-index application checks](application-check.json) apply the appropriate
01 variant,02 and03 in order onto **both** exact base trees. Only six files differ:
PlaySim, information core, carrier, approach helper, approach test and fixture.
No production source, branch reference or PR head is changed. The materialized
accepted-base proposal **passes typecheck in11.106s**, source
`96b825d4c6168c8a6126a816f3407d1022764d8c95b49de009f382204049ab5e`.
That establishes implementation dependency closure, not semantic approval or
football transfer. The [compiler target/receipt](validation/proposed-source.json)
distinguishes this virtual proposal from the unchanged accepted host runtime.

The probe/check scripts are under `scripts/diag/run-entry-awareness-contract.mjs`
and `scripts/diag/run-entry-awareness-extraction.py`. All new verification is
query/static/compiler work: zero World steps, scrimmages or games. The accepted
and #63 base pins, patch SHA256s and virtual tree IDs are in the check record.

## Ownership and next action

Awareness retains ownership of sensing/query policy and new shared fields.
Do-It-All owns admission's consumption and this plan. Integration owns the
PlaySim overlap and combined review. The original owner's durable coordination
surface is PR36; no active separate Awareness chat appears in the available task
catalog, and no send-to-thread tool is exposed. The scoped review request is
posted there; delivery is not an owner acknowledgment. The final handoff records
its exact comment URL and whether a reply arrived.

**Next decision:** owner confirms observation-only staging and the smallest
explicit stale-motion representation; then implement that agreed contract and
consumer adaptation in separate commits. Until then, keep admission held at this
precise semantic seam. Keep #63 progressing independently.
