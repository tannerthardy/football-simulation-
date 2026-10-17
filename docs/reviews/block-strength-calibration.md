# Real mass, usable strength and protection at runner arrival

## Decision

**Accept the bounded calibration interface for review; hold a new roster force
mapping.** Keep real mass, inertia, size and traction. The sources below support
separate strength/stance measurements, but do not identify a replacement mass
exponent or an NFL blocking-force coefficient. No player receives the new inputs
from `derivePhysical`; football defaults and outcomes are preserved.

This develops [the mass diagnosis](block-mass-response.md), rather than reopening
the parked solver. It adds a way to test independent absolute capacities, focused
execution contracts, and a runner-arrival observer. It does not establish that
the current force calibration is correct, or that these additions improve NFL
outcomes. Known angular/contact-law holds remain holds.

Accepted base: #112 `d682b1f474cb6ba260a7b8b1119a62919c5a2159`;
queue `bf493d881f423540962c6b1ad3b889fe2662e8c8` agrees with fetched develop.
Tested candidate: `0faa291f9ddd8d7e258d95689c0525ecb7f86b19`, source
`0a5e365a07640d77a03eec95361de93bb98f917c65a5b161874ca5e4938b5c4c`.
[Pinned inputs](../../config/block-protection.json),
[checks, settings, costs and measured results](../../data/reviews/current/block-strength-calibration.json).

## What is now separate

`PhysicalProfile.power` was misleadingly described as a bodyweight ratio. Its
actual units are an **absolute force scale divided by G, in kg**. There was no
demonstrated arithmetic unit error. That comment is corrected.

Two optional, absolute inputs now enter `supportParams`:

| Input | Units and existing consequences |
| --- | --- |
| `loadedDriveForce` | kg·yd/s²; loaded leg drive and corrective support, still traction-capped. It also sets existing corrective-foot compliance and fatigue normalization. |
| `armForce` | kg·yd/s²; common active arm impulse/work budgets and existing structural grasp limits across blocks and tackles. |

Omission preserves the exact old operations: `min(power*G, traction)` and
`.75*power*G`. No position multiplier, effective mass, win probability, grip
weakening, recovery retune, new traction or solver mode is introduced. These
are shared body capabilities; a blocking calibration would also need to survive
its support/tackle consequences. Lab `power` multipliers continue to affect the
legacy fallback, not an explicitly supplied independent measurement.

Loaded drive is **not a universal leg-force ceiling**: existing free gait may
request more, using its separate measured movement envelope. The interface
preserves that contract. It also does not turn a zero-velocity command into a
maximal brace. Actual intent and facing must be recorded in an anchor trial.

Explicit inputs reject nonpositive or numerically unusable values; they are
never silently clipped to a plausible athlete. The square/reciprocal and
cube-root numeric headroom checks prevent underflow/overflow in existing force,
work and grip arithmetic. Explicit drive also requires finite corrective-foot
mobility after traction capping. These are representability checks, not physical
calibration. Zero drive needs a separately defined recovery/compliance boundary;
this patch does not change the legacy zero-power behavior.

## Independent bounds: useful evidence and its limits

Small public full texts/abstracts were checked; no NFL scan or dataset download
was started. These tasks must stay distinct.

| Reference | Verified measurement | What it permits |
| --- | --- | --- |
| [Reichert et al., 2023](https://pmc.ncbi.nlm.nih.gov/articles/PMC10312092/), DOI10.3389/fspor.2023.1213957 | 119 professional game-sport athletes,69 men,only2 American football players. Fixed horizontal rope,standing,elbows locked;3s ramp then6s maximal push. Maximum .5s moving mean after3s. Male even-weight stance: upright3.23±.83N/kg,slight lean4.61±1.01,clear lean6.05±1.32. | Actual stance/support changes usable horizontal force. These are not NFL lineman norms; the sim's pad-level scalar is not measured forward body lean. |
| [Martin & Beckham, 2020](https://pmc.ncbi.nlm.nih.gov/articles/PMC7249338/), DOI10.1186/s13102-020-00174-z | Review of26 rugby scrum studies. Individual sustained machine-scrum group means generally1000–2000N; most protocols5–10s. Surface,footwear,mass,shoulder height and posture differ. | Current300lb traction ceiling≈1468N is not contradicted by this broad range. Being inside it does not validate the mapping. Pack forces cannot be assigned to one athlete; optimal mass scaling is unresolved. |
| [Mann et al., 2012](https://pubmed.ncbi.nlm.nih.gov/22797002/), DOI10.1519/JSC.0b013e31826791ef | 289 DivisionI football players;225lb repetitions vs bench1RM within a week. Estimate `1RM kg=103.5+3.08*reps`,r=.95,SEE6.4kg; individual cross-validation limits about−15.0/+13.2kg. | Uncertain bench-strength information, not a conversion to standing leg drive, horizontal blocking force or grip. |
| [Mann et al., 2015](https://pubmed.ncbi.nlm.nih.gov/25574610/), DOI10.1519/JSC.0000000000000829 | 203 DivisionI-A players;6-week change in reps correlates−.22 with change in bench1RM. | Maximal strength and endurance/progression cannot be treated as one exact individual law. |
| [Gatt et al., 1997](https://pubmed.ncbi.nlm.nih.gov/9167810/) | Five college linemen; sled impact3013±598N. | An impact reference, not a2s sustained shove target. |

Use Newtons only after conversion: **N = engine force × .9144**. Compare force
over the declared window, not an instantaneous impact peak to a sustained mean.
The current .7strength+.3bench mapping, its traction plateau and the shared
arm/leg scale remain assumptions. The old unverified NFL weight correlation
cannot identify them. Nor can two sources with different tasks identify two
independent raw capacities merely because both report Newtons.

## Required calibration experiment

### Subsequent concrete mechanical witness

At diagnostic commit `074097822c7dc3029bd55f755a3a3c0adf5fee7e`, the same
unchanged runtime reproduces a directional support inconsistency. Three bounded
World strike contacts supply a forward net load plus equal/opposite transverse
forces at two heights. The latter have zero net transverse impulse and an
independent400kg·yd²/s² couple. An achieved forward lean causes the scalar
bracing code to cancel389.825 of that sideways moment, although the stated
ankle allowance is236.667. Without forward load/lean, cancellation respects that
same236.667 allowance. Rotation/reflection reproduce it; planar momentum/work
close. The checkpoint intentionally supplies established felt load/moment to
isolate the first response; it is not a newly acquired NFL contact.

This is a specific reason to correct **directional moment cancellation**, not
mass or strength coefficients. A separately reviewable minimal correction will
preserve aligned bracing and apply the existing bounded ankle response to the
transverse component. The script is
`scripts/diag/physics/directional-brace.ts`; its source, prepared bodies,
requests and actual incoming/canceled moment are reproducible without the
optional force interface. Capacity calibration and generic missing COP/lean
geometry remain separate.

The next numerical proposal needs one task-matched external force/anchor record,
not more game averages. Save body mass, stance/actual lean, shoulder/hand height,
foot support and traction, ramp/duration, direction and apparatus compliance.
Keep geometry/commands fixed while comparing delivered force, travel and support.
For a source-comparable isometric push, reproduce its ramp and reporting window;
do not pretend a freely translating two-player shove is the same apparatus.

Use four independent axes: real mass at fixed absolute force; leg capacity at
fixed mass/arms; arm capacity at fixed mass/legs; stance/support at fixed body
capacities. A traction-limited result identifies a **lower bound on muscular
capacity**, not its exact value. A load transmitted through an arm and supported
by the legs cannot independently identify both capacities without a second task.
Retain unsupported/off-axis and modest lighter-stronger controls. Do not infer
leg drive from bench reps or create a new allometric exponent by assumption.

A candidate is useful only if one fixed body/capacity set transfers across push,
anchor, oblique contact, held support and ordinary tackle controls without
retuning. Momentum/work/budgets, response to load removal, actual force direction
and finite support must hold. Known numerical holds stay visible. Integration
owns the final combined checks after independent capability review.

## Football evidence: engagement survival is not protection

Three existing accepted-default controls were executed once with no supplied
force overrides, request/controller intervention or experimental activation.
These are the exact pair11 WZ inputs and useful-climb fixture from independent
#113 `f2cedaef5443ca02bb727e8c1bf9bc9167d19e92`. No changed football ending is
expected from adding an unused optional input; the saved endings reproduced.

| Control | Observed LOS-arrival bracket | First canonical contact | Ending |
| --- | --- | --- | --- |
| WZ strong Over3,pair11,seed77 |3.05–3.10s|CB_S3.30s|2.53yd,tackle4.15s|
| WZ weak,same roster/seed |2.55–2.60s|LB_M2.80s|5.34yd,tackle4.00s|
| Useful-climb Duo fixture |2.50–2.55s|SS3.25s|live prefix censored3.50s; no terminal gain asserted|

The observer records LOS crossing and, separately, crossing of a pair's moving
longitudinal midpoint. The latter is local passage, **not a fixed lane entry**:
pair motion can cause it. All times are .05s brackets, no substep precision is
invented, and post-whistle positions are excluded. Missing local arrivals and
the explicit prefix censor are retained.

For each pair we record actual position, velocity, request, facing, support,
nominal geometric gap/reach and a signed direct-centerline interposition margin.
Positive means the blocker intersects the defender-to-current-runner centerline;
it does not prove a safe approach or prevent a reachable alternate tackle path.
Negative interposition is not a block failure if that defender is irrelevant to
the runner. The runner's executed path is endogenous, not a fixed counterfactual.

Three examples explain why a displacement or mass-based win label is inadequate:

- Strong WZ:264lb Y vs235lb DE_S stays loaded at local passage2.85–2.90s;
  centerline margin+.292yd. Runner contact later comes from CB_S. This is useful
  positional evidence, not proof that weight caused the protection.
- Weak WZ:315lb LT vs270lb DE_W remains engaged and loaded at2.65–2.70s, yet
  the blocker is outside the interior of the defender→runner segment. Defender's
  nominal torso surface gap to the runner is only.052yd. First contact still
  comes from LB_M,not DE_W. Proximity does not prove a feasible tackle: current
  `tryTackles` also gates an engaged defender on `win>=.6`; the observer does not
  record that value. This is a request/eligibility confound to hand to Run,
  **not a demonstrated mass or physical-response defect**.
- Duo:257lb Y vs324lb DE_S remains loaded at2.55–2.60s; margin−.292yd,defender
  nominal runner gap1.991yd. First contact is SS at3.25s. This real size mismatch
  does not by itself establish failed protection or require the TE to drive the
  larger defender backward. The earlier controlled249/308lb TE/DT square loss
  and finite-delay evidence remain unchanged and separate.

`carrier_contact` is the engine's canonical event. Acquiring a grasp does not
prove sustained force. Separately retained hand loads are **tick means**, and
torso records are **positive reported/net impulses**, not an independent trace
of every solver impulse or first touch. A zero mean/net value can hide a load
that later relaxes or reverses. These observations distinguish reported load
from proximity, but do not certify absence of physical contact. Force accounting
tests and the earlier independently reconciled mechanical drills carry the
accounting claims; this native observer is not an angular-law clearance.

## Validation, cost and recommendation

- 34 unique focused checks:8 new capacity contracts,9 existing actuation and17
 held-recovery checks.42 test executions including the focused correction.
- Initial run:33pass,one new multi-arm fixture failed because its exact rest
 length requested no force. The fixture now compresses both working gaps;
 its nonzero-force and shared-budget assertions pass. No tolerance was loosened.
- Final8 capacity checks and typecheck pass. Exactly identical legacy-capacity
 execution includes reports,body/support motion and fatigue through load/turning.
 The26 existing checks ran on the initial seam; their omitted-input operations
 are unchanged by the final stricter explicit-input rejection guard.
- Independent review initially held the numeric domain,then accepted0faa291 after
 its representability correction. No independent athlete-calibration approval.
 A second read-only review accepted the focused evidence and final observer
 scope; it explicitly held any inference that interposition certifies protection.
- Three native controls reproduce endings/contact events; largest reported planar
 work residual1.01e−11kg·yd²/s². No full suite,game campaign or NFL collection.
- All new launcher-command cost **22.075s**,including failed run and13.545s
 typecheck. Three native runs2.322s including launch; internal1.763s total.
 This is collection cost,not an uninstrumented engine-speed benchmark.

**Adoption:** keep PR115 draft. The interface and observer are a bounded useful
candidate; no default force change is supported yet. Do not promise pristine
physics or NFL-like block rates from these references. The strongest immediate
football handoff is the near-runner weak-WZ defender's request/eligibility case;
changing mass or grip strength cannot diagnose that controller question.

**Single next physics decision:** a task-matched supported push/anchor reproduction
must tell us whether current usable drive is implausible,or only unmeasured.
If the observable force is limited by stance/traction,identify that limit before
touching muscular strength. A demonstrated physical mismatch earns one correction;
an uncertain coefficient earns no production retune.

Reproduce with Node22.23.3 and the baseline launcher (44 settings,components1,
CF_FLOW unset,RUN_READ0,accepted World defaults):

```sh
node scripts/baseline.mjs --candidate --receipt out/block-strength/force-checks-final.receipt.json -- npx vitest run --project core test/force-capacity.test.ts
node scripts/baseline.mjs --candidate --receipt out/block-strength/typecheck.receipt.json -- npm run typecheck
node scripts/baseline.mjs --candidate --receipt out/block-strength/protection.receipt.json -- node --import tsx scripts/diag/physics/block-protection.ts out/block-strength/protection.json.gz
```

`block-strength-summary.py` summarizes the saved original receipts without
simulation and verifies their tested tool/input pins. A clean new run has its
own revision/cost; preserve the initial failed receipt rather than inventing or
silently replacing it. Historical mass-panel results retain their original
source/tool pins and costs.
