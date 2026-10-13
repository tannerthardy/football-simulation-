# Deciding whether changed behavior is better

This is the shared judgment procedure for controllers, ratings, movement and
contact changes. Use it alongside [testing costs](TESTING_COSTS.md) and the
[validation layers](VALIDATION.md). A completed test batch establishes execution
and its asserted contracts. It does not adjudicate every changed football result.

## Shared definitions

**Improvement** is a demonstrated repair to an identified mechanism: the player
uses available information and a coherent responsibility to request an achievable
action, and shared physical capabilities produce a lawful response. The repair
must satisfy its declared behavioral contract and preserve relevant opposing
contracts. State the scope: a local law repair, a decision repair, transfer over
a small panel, and whole-engine football readiness are different claims.

**Regression** is a newly violated supported contract or a demonstrated loss of
valid behavior: leaked information, an unearned block/tackle, impossible motion,
broken accounting, abandoned responsibility, or loss of an achievable action
without a coherent cause. A worse yardage result alone establishes none of these.
Neither does a changed trajectory. A cheaper test that stops or skips work has
not improved runtime for the same completed workload.

**Valid outcome change** is a changed winner, path or gain explained by lawful,
plausible behavior under the repaired mechanism. It may support an improvement
claim, but it is not itself proof that the target defect was repaired. A defender
can execute correctly and still lose to a faster receiver or a supported blocker.

**Tradeoff** means a demonstrated benefit and a separate demonstrated cost to
valid behavior. Show both. Do not net a lost ordinary contract against several
rescued spectacular plays. **Inconclusive** means the evidence cannot distinguish
a valid change from a defect. Calling a result “more football” needs positive
evidence; it cannot be the default explanation for an adverse result.

Use the same standard for changes that help either offense or defense. Reduced
YAC, more tackles, fewer explosives, a closer NFL mean and an unchanged baseline
are observations, not definitions of improvement.

## Declare the contract before inspecting candidate results

Keep a short note in the candidate review/PR, using the template below. Choose
observable conditions independent of final yardage. Declare acceptable ranges
or tolerances from the model, analytic reference or matched measurement; do not
choose them after seeing the candidate. Label exploratory criteria and confirm
them on an existing unused control or one small new witness when needed.

| Change | Example contract and falsifier |
| --- | --- |
| Pursuit decision | With an acquired, delayed picture of the carrier, request an intercept/gather action reachable with current speed and braking. Falsified by using private future state or demanding unattainable deceleration. Catching the runner is not the contract. |
| Grip/contact | Actual impulse, moment and work explain motion within declared accounting tolerance; reach/support and arm capacity are respected. Falsified by a tackle earned through missing angular reaction or extra strength. A stronger hit can lawfully help the carrier continue forward. |
| Blocker exchange | Preserve useful loaded work until a supported exchange/climb cue exists; then request feasible movement and real subsequent contact. Falsified by abandoning the owner or by permanently denying an earned climb. A climb event alone is insufficient. |
| Ratings/selection | Explain trait semantics and their capability mapping; preserve eligibility, unique players, familiarity and feasible unit composition. Falsified by a hidden outcome bonus or unintended position/fallback treatment. Frozen bodies cannot validate a generator change. |

Name the failing witness, a successful opposing control and any distinct edge
case. State which trajectories should be exactly unchanged and which mechanisms
must hold despite changed trajectories. Preserve a legitimate offensive win and
a legitimate defensive win where relevant; they need not appear in every call.
Do not require every defender to finish or every block to sustain.

## Review in this order

1. **Establish a valid comparison.** Record exact source, flags, selected
   players/assigned slots, initial state/fatigue, call, seed and measurement
   version. Use compatible saved evidence. A changed physical mapping may be
   the intended intervention even with identical player inputs; disclose it.
   An unplanned roster, observer/RNG or measurement change makes attribution
   invalid. Partial runs retain evidence but do not pass their planned coverage.
2. **Check hard requirements first.** Nonfinite states, violated law/legality,
   leaked information and failed supported contracts block promotion within
   affected scope. Existing known defects remain tracked limitations; preserving
   them is not physics readiness. A local law improvement can be true while
   the football candidate still fails integration.
3. **Find the first relevant divergence.** Compare the acquired information,
   interpreted job, requested action, achieved movement/contact, applied loads,
   support/recovery and finally the outcome. Record actor/slot, timestamp and
   baseline/candidate values around the divergence. Separate the first difference
   from the first wrong action. Verify that the proposed correction precedes
   the downstream change; later plausible-looking motion is insufficient.
4. **Explain the football response.** Check actual call/responsibility, geometry,
   available cues and their delay, speed/mass/braking, fatigue, reachable contact,
   useful transmitted load, and the opponent's counterplay as relevant. Identify
   what the player could reasonably have done. Do not supply omniscient cues,
   forbid a successful technique, or tune capacities to make a desired winner.
5. **Try to disprove the explanation cheaply.** Start with the saved short replay
   and opposing control. Use a same-state ablation of one suspected capability,
   an input mirror, an independent analytic case or relevant timestep refinement
   only when it distinguishes competing causes. Change no extra variable merely
   to recover an outcome. If useful counterfactual state cannot be preserved,
   limit the causal claim accordingly.
6. **Assign a verdict and next action.** Use the table below. Include every
   adverse case, ordinary controls and successful cases in the report. For a
   shared change, cover each distinct affected mechanism; group repeated cases
   only with an explicit common cause and evidence IDs. Retain the full case
   list. No favorable-prefix stopping or seed replacement.

Evidence strength matters: analytic/load/state traces can establish physical
causes; acquired-perception/request traces can establish decision causes; light
film usually establishes visible geometry and timing only. Body facing is not
gaze, a bond is not useful force, and final paths do not prove intent. Cite the
football handbook, independent task/reference evidence or reviewer rationale
for plausibility, and mark uncertain intent/effort as proxies. Review result
direction only after evaluating the mechanism when practical.

## Verdicts and integration decisions

| Case verdict | Evidence needed | Action |
| --- | --- | --- |
| Improvement | Target contract repaired with causal evidence; relevant opposing contracts hold. | Continue within the tested scope; complete its required integration checks. Do not claim league realism from a witness. |
| Valid outcome change | A coherent, feasible response explains the delta; supported contracts hold, but this case alone does not demonstrate the target repair. | Retain it as explained transfer/control evidence, including adverse yardage. |
| Regression | A newly broken supported contract or demonstrated loss of valid behavior. | Stop promotion in affected scope; diagnose or revert the candidate. Preserve the witness. |
| Tradeoff | Both benefit and cost to valid behavior established. | Keep experimental; identify the unresolved contract and explicit scope decision. Hard requirements cannot be traded away. |
| Inconclusive / unreviewed | Missing cause, weak proxy, competing explanations or no review. | Hold the affected improvement claim; request the cheapest discriminating trace/check. This is not a pass. |
| Invalid comparison | Input, measurement, provenance or execution does not support the comparison. | Repair the evidence; do not use its deltas to judge the engine. |

A candidate is ready for integration when its target repair is supported,
relevant opposing contracts hold, material changed mechanisms have explained
verdicts, required checks pass and limitations are explicit. Zero known new
regressions is necessary but does not demonstrate improvement. Tiny panels
cannot exclude every future regression. Do not use a majority vote or a net
yardage score to override a failed contract or unresolved material tradeoff.

An existing assertion can itself encode the wrong football expectation. Keep
the failure visible. Show the original assertion, independent reason it is
wrong, matched trace/ablation and a replacement mechanism contract with an
opposing control. Review that contract repair explicitly; rerun its focused
checks and the required integration checks. Do not silently loosen thresholds,
erase a witness or treat the candidate's new endpoint as the new truth.
The [Tite contract repair](reviews/tite-helper-contract.md) is an example: useful
loaded work and an earned delayed-cue climb required different assertions from
the historical loss/collection endpoint.

## Examples where the scoreboard misleads

- A defender brakes to make reachable contact and an elusive runner escapes.
  More yards can be a valid change if the old tackle used impossible braking.
  Prove feasibility and preserve a control where support/technique earns the
  finish. “The runner is elusive” without the trace is inconclusive.
- A controller produces a tackle by reading the carrier's private future path.
  Less YAC masks a regression even if all pooled outcome guards look better.
- The [roster audit](reviews/roster-capability-audit.md) preserved a 52.30-YAC TD
  that became a .57-YAC tackle after a **pre-snap** balance intervention, yet
  stayed a 52.30-YAC TD when the same intervention began **after the catch**.
  The headline rescue cannot establish improved post-catch support. Trace the
  earlier divergence. Its ordinary 6.81-YAC tackle also became a 12.98-YAC TD
  pre-snap: that adverse case needs the same causal standard, not dismissal.
- A contact law repair preserves momentum but loses valid helper work. Report
  the law improvement and football regression separately; do not promote the
  combined candidate on the strength of either an improved mean or the law alone.

## Keep the review bill small

This procedure adds interpretation, not a test matrix. Read compatible receipts
first. Trace only representative first divergences, unexplained adverse cases
and distinct affected contracts; refer to existing evidence for repeated causes.
Review an exact unaffected signature as preserved execution, not evidence of
football correctness. Full histories diverge after calls/RNG change: their later
snaps are distribution evidence, not identical-state counterfactuals.

Do not compare mean progress across differently censored escapes/tackles, or
conditional YAC averages as if completion cohorts were unchanged. Report paired
cases, completion denominators, termination/censoring and roster-level spread
when relevant. Larger stats need the cost-policy checkpoint and independent
rosters; neither 32 snaps nor 20 similar rosters certify league realism.

The saved-result worksheet command performs **zero simulations** and leaves
collector/cache fingerprints unchanged:

```sh
node --import tsx scripts/roster-review.ts --baseline data/reviews/current/roster-screen-baseline.json --candidate out/roster-screen/candidate.json --out out/roster-screen/behavior-review.md
```

It verifies recorded input/measurement compatibility and entry hashes, lists
every compared case, starts each changed case as **unreviewed**, and retains
failed/skipped evidence as blocked coverage. Fill it in; it does not certify
football, check hidden law traces or automatically gate integration. It refuses
to overwrite a review. Copy the substantive review to the candidate's repository
review/PR and link exact receipts; raw traces stay in ignored `out/`.

## Minimal review note (also for changes without a roster screen)

```text
Hypothesis / target defect:
Contract, tolerance/reference and falsifier (declared before candidate results):
Failing witness / opposing control / legitimately allowed wins:
Input, code/flags, observer and measurement pins; intended differences:
Hard-check receipts and known baseline failures:
Case IDs; actors/slots; first relevant divergence time:
Observed cue -> choice/request -> achieved motion/load -> recovery -> outcome:
Cause and football rationale; evidence links; uncertainty/proxies:
Counterfactual/ablation and opposing-control result:
Verdict(s); all adverse cases and repeated-cause grouping:
Integration decision and claim scope; unresolved risk:
Next discriminating check, if needed, and marginal runtime budget:
```
