# Make NFL evidence part of ordinary agent diagnosis

2026-10-19 America/Phoenix. Proposal and source review, not a new benchmark or
runtime acceptance. Accepted source checked:
`f4146275ce7539816bf57b4ed55a0d2be10e48c7`; canonical queue `9a6bb795`.
Claude's latest research inspected:
`65db81d710bc0ff75fcd6a81cc4fa8b5f1b89e5f` on `claude/run-game-v3`.
[Source inventory and access checks](../../data/reviews/current/nfl-agent-evidence-plan.json).
No new NFL queries, engine runs, data downloads or controller reviews were run.

**Recommendation:** when investigating football movement, geometry or timing,
bring an appropriate NFL comparison into the diagnosis before choosing a long
implementation. Reuse it when testing the candidate. Small correctness/credit
repairs can proceed on their direct contracts; an NFL comparison is useful when
it could change a football judgment. This extends the existing
[behavior review](../BEHAVIOR_REVIEW.md) and [cost policy](../TESTING_COSTS.md),
without adding a separate approval checklist or forcing every patch through games.

## What Claude does well, and what to adopt

The useful sequence in [the latest run-game report][claude-report] is:

1. **Locate a football discrepancy in matched phases.** Examples include back
   alignment/velocity at handoff, blocker interposition at runner arrival,
   second-level proximity persistence, and which layer first approaches a runner.
   Concept and phase tables are more diagnostic than pooled yards per carry.
2. **Connect the discrepancy to native sim evidence.** The Part5 drive-block
   investigation combines the NFL proximity-duration contrast with simulated
   engagement endings and a blocker request carrying him past his defender.
   Witness `w8` makes the proposed mechanism inspectable. NFL alone does not
   identify that request defect; the native trace does.
3. **Change one mechanism and retain the costs.** It preserves an adverse
   counter witness, an increased explosive tail and a gun-mesh change that
   worsens OZ. Faster departure in `w9` still follows the wrong side of a
   down lineman: the native sequence limits the claimed benefit.
4. **Put real tracking beside sim film.** The [new film builder][film] selects
   15 NFL tracking examples across six families using seed20261019, within its
   eligible pool. The sim list separates six selected witnesses/adverse cases
   from 19 rows marked random ordinary. Freeze such lists before a new outcome
   comparison and retain unhelpful-looking plays too. Comments state the
   selection order; this review did not independently observe that history.
5. **Bind new results to their source.** [arm.mjs][arm] applies the baseline
   environment plus recorded overrides and writes source/settings/operator/shard
   manifests. [paired.py][paired] reports paired threshold transitions and
   unmatched IDs. These improve on the original ambient raw launchers and
   unsupported “within noise” wording.

The [author's response][response] explicitly adopts event/proxy qualifications,
fixes short-window admission and carrier-export errors, and preserves remaining
sample limitations. Do not describe these new manifests as missing merely
because the earlier review found gaps. A newly reproduced arm remains distinct
from an unrecovered original producing run. This source inspection does not
certify every artifact, p-value, controller change or causal claim in #153.

Our agents already do strong native debugging. The main missing habit is asking
early **“What does the corresponding NFL sequence look like, and can it test
our explanation?”** Existing guidance says to use NFL tracking, but its prominent
commands are archive construction and eight-game collection. Useful small
operators and their data locations are scattered across branches and hosts.

## The practical investigation loop

| Step | Agent action | Small useful output |
| --- | --- | --- |
| State the decision | Name the suspect phase and two plausible explanations. Specify what evidence would change the proposed fix. | “Is the LB late because his target/request is late, or because achieved lateral motion trails an adequate request?” |
| Find the reference first | Reuse a pinned NFL result/operator, its cohort and selected clips. Measurement checks definitions/access; the domain owner retains football judgment. | One NFL-versus-sim phase table and a few identity-stable examples, including useful offense and defense where available. No fixed clip quota. |
| Inspect the native cause | Trace installed responsibility, acquired cue/age, available request stages, achieved velocity, access/contact and ending separately. | Earliest wrong action, a demonstrated execution limit, or an explicitly unresolved explanation. |
| Test the smallest correction | Keep source, calls, bodies, seed and observer fixed except the intended change. Reuse the same NFL reference and saved baseline. | Mechanism change plus an opposing control; adverse cases and RNG differences retained. No automatic lab matrix. |
| Make the decision | Explain whether the repaired mechanism is more credible, whether another unit legitimately wins, and what remains unknown. | Evidence for/against and next action. NFL resemblance supports the decision; it does not substitute for native causal evidence or independent review. |

Use comparable geometry/time definitions across sources; use native stored sim
velocity to diagnose movement. Do not differentiate rounded sim positions when
stored velocity exists. If an older shared comparison uses differentiated
positions, retain its name/version and report native velocity separately rather
than silently replacing the operator. NFL provider speed/direction needs its
own validity and clock checks; a trailing pre-event estimate is a declared
alternative when those channels are unavailable.
Final intents cannot reconstruct discarded requests. If an earlier stage would
change the decision, coordinate that one missing capture with Flex; do not turn
this into a general coverage-motion packet or instrumentation rewrite.

## Reuse the existing tools and sources

| Question / owner | Existing reference and operator | What it can establish |
| --- | --- | --- |
| Run blocking / Run Game | Accepted `scripts/diag/trench/timeline.py`, common metrics; research `seal.py`, corrected `lbblocks.py`, native `lbreps.ts` and saved Part5 witnesses | Lateral displacement, interposition, proximity persistence through runner arrival; native actual rep/request evidence can distinguish losing access from running past a defender. NFL proximity is not a force/engagement label. |
| Defensive approach / Catching And Defensive Pursuit | Research `dbhits.py`, `release.py`, film references; saved #158–#160 native evidence | Who approaches at what phase, lateral translation, depth and available support. It does not reveal the NFL player's private assignment, cue acquisition or reaction latency. |
| Formations / Measurement | Saved `meshgeo.py`/`rbspeed.py` results and [#156][formation] | Representative alignment and exchange geometry. #156 is the worked example: geometry changes, reachable exchanges, stored native speeds and a later exchange preserved. Do not rerun it for this plan. |
| Catching / Catching And Defensive Pursuit | Existing `p045-nfl-approach.py` result and same-defender methodology | Release→flight→catch separation and pre-contact approach for fixed IDs. The completed weeks1–9 query has six narrow qualifiers, not a league explosive-YAC rate. Do not broaden or rerun it under this plan. A new question needs its own named owner/comparison. |
| Pass protection / Run and Flex | PFF dropback blocker-pair reference; existing AMF one-game access study | Pair geometry, annotated pressure and selected contact evidence. The AMF sample did **not** establish first dynamically usable QB access or causal seconds saved. Keep it isolated under its terms. |
| Contact/support / Physics | Valid NFL first-contact→ending/YAC observations plus native joint/load/support tapes | Timing and geometry questions to investigate. No NFL gaze, grip force, continuous hold duration or measured support law. Law/unit reproductions remain primary for numerical defects. |

The named research operators exist at the pinned #153 source, not necessarily on
accepted develop. The completed P045/AMF scripts are on the preserved Measurement
branch, linked in the source inventory. Read/reuse saved outputs first. Any needed operator-only
extraction gets a small definition/censor/identity review; do not import an
experimental runtime or silently replace an existing operator. Current
`scripts/mechanics/metrics.py`, `measure.py`, `compare.py`, `source-version.ts`,
baseline receipts and the replay viewer already supply the common components.
No new general pipeline, dashboard or collector is needed.

## Make data access cheap and explicit

Measurement maintains **one reference index in the existing NFL guide**, pointing
to original receipts/results, operator pins, applicable cohorts and known limits.
Keep a data-host/access entry with the archive/derived-file hashes, readable
locations, source terms and an execution command. A host-local path is not a
shared artifact. Converted NFL rows and their ytg/formation sidecars must be
versioned together; a matching ZIP hash does not certify a derived table.

At this review, accepted NFL aggregate summaries are readable here. The checked
local locations do not contain the full2022 converted cache/sidecars or Catching's
restored CSV directory. The earlier verified restoration and execution are on
Catching's host; its current paths need confirmation. **First handoff: verify
that existing host/cache, then execute the selected existing query there and
return the small result/receipt.** This has already worked for P045; do not
start another multi-GB download or raw mirror. A small read-only cache transfer
is an alternative only if allowed by source terms and cheaper than repeated
remote queries. Record its size/cost before transferring.

Keep raw data outside the simulation repository; use existing ignored adapters
or explicit data paths as supported by the selected script. Return permitted
summaries and selected identity/timing records. Do not publicly upload restricted
tracking to solve an access problem. The source index should distinguish:

- **BDB2025 / season2022 weeks1–9:** primary all-player run/catch context,
  provider labels,10Hz. Use its current source terms, sampling and concept limits.
- **Other existing BDB aggregates:** useful only for their documented phase and
  player coverage. They do not automatically provide an all22 alternative season.
- **AMF/StatsBomb:** the already-inspected TB–DAL game plus existing label files
  remain isolated research. Selected TB12 collection, nominal30Hz player tracks,
  imperfect joins/coverage and restrictive terms; no bulk acquisition or
  commercial-derived-analysis/production use or redistribution under this plan.

For a reusable result, attach only the metadata needed to interpret/reproduce it:
source/version and consuming host, query/operator hash and event definitions,
cohort/exclusion counts, stable player IDs and sample validity, exact sim
source/patch/settings/input/call/seed, failures/censors/unrun tail, runtime and
fetchable artifact hashes. Reuse existing manifests instead of creating another
format. A material missing field limits the affected claim, not unrelated work.

## Current access update — 2026-10-19 America/Phoenix

After the inspection above, the existing data holder
[confirmed access and checksum reuse on #161](https://github.com/tannerthardy/football-simulation-/pull/161#issuecomment-6278732246).
The small query/operator, selected IDs/exposure and receipt are published at
[#162 evidence `ed6ebd2`](https://github.com/tannerthardy/football-simulation-/tree/ed6ebd21911a28f07a085094c393ea2613abeb69/data/reviews/movement-continuity)
in `common.tar.gz`. The holder reports the existing players/plays/player-play/
week1 hashes matching the prior restoration; week1 SHA256 is
`dc47c829ef917cb6533c6baedd01964823939a4e9cba807090d2784aa1fd149c`.
Use the published result or that verified execution host before arranging another
query. The earlier `accessChecked` entries remain this review environment's
historical presence observations, not a current shared-access blocker.
This update records the holder's published receipt; it does not independently
re-query raw tracking or approve #162's controller/Physics changes. The20-play
subset and provider-orientation limits remain. No new archive is required.

## First rollout: existing work, not another campaign

1. **Measurement + current data holder:** confirm one execution location and
   cache/sidecar hashes; add direct reference links and the smallest query handoff.
   No new scan is necessary to establish this access entry.
2. **First application: lateral flow in [#159](https://github.com/tannerthardy/football-simulation-/pull/159)/[#160](https://github.com/tannerthardy/football-simulation-/pull/160).** Reuse accepted baseline
   and candidate tapes. The named NFL question is: *in comparable run families,
   how do the same initially interior DL and second-level defenders translate
   laterally while retaining depth from handoff to runner arrival?* Select by
   alignment/family/formation before looking at gain. Compare handoff-relative
   and runner-crossing-relative geometry with explicit live/censored exposure,
   rather than assuming every run survives+1s. Separate free/near-blocker
   geometry from native engaged/free state. NFL has no installed-duty ledger:
   the owner must judge assignment correctness from sim inputs and native cues.
   This is a proposed small cached-data query, not launched by this document.
3. **Second application: Run's existing [#153](https://github.com/tannerthardy/football-simulation-/pull/153) DRIVE_CONNECT review.** Reuse
   Part5's NFL/operator result and selected witness/adverse control. Check useful
   same-player interposition through runner arrival and native separation/rep
   endings. Do not reward indefinite blocking once the runner has passed or
   eliminate legitimate sheds just to increase duration. No new NFL cohort or
   broad sim arm is required for the first review.
4. **Worked example already delivered: #156.** Keep its observed+.15s exchange
   cost and uncompleted prefixes. This demonstrates the loop without adopting a
   mesh package or changing capacity to meet an NFL speed number.
5. **Integration:** after the next meaningful accepted batch, reuse one existing
   small varied panel for the named cross-unit transfer question. Owners supply
   their focused checks. Do not automatically launch the48-case panel, full
   games or an eight-game mechanism export. Keep selected-panel exposure and
   overlaps; no simulator-wide defect-rate claim.

Success means the first two active investigations can show an accessible NFL
reference, a native mechanism explanation, an opposing/adverse case and a
decision changed or bounded by the evidence. It does not mean more scripts,
more charts, more queries or improved pooled TVD. Use the existing testing
budgets; declare I/O/time/attempt limits only when a new query is actually needed.
Bring meaningful additional acquisition or execution cost to the user first.

## Interpretation rules that prevent false confidence

- Keep **observation → proxy interpretation → causal hypothesis** distinct.
  Nearness is not engagement/contact; event contact-to-ending is not continuous
  hold; clip facing from motion is not measured body orientation or gaze.
- The new NFL viewer synthesizes ball possession, group body sizes, display
  identities and facing, and hardcodes a displayed tackle outcome. Use it for
  player paths with its labels visible, not ball-flight, contact-pose, anatomical
  or ending truth. Preserve original NFL IDs when measurement needs them.
- NFL MAN is not verified Duo; inferred toss-by-distance is not a provider toss
  label; coverage family is not the full installed call/responsibility.
- Count eligible plays, invalid/excluded samples, crossing survivors and actor/
  frame/episode exposures separately. Follow the same defender; never subtract
  two nearest-defender endpoints as if identity were fixed. Retain missingness
  and known versus fallback endings; do not silently forward-fill a valid sample.
- Report rates with counts and meaningful tails. Zero qualifiers may mean a
  narrow query; do not tune filters to manufacture an explosive or desired win.
  Same-seed sim arms may diverge in RNG consumption. Paired p-values neither
  establish causality nor prove equivalence when nonsignificant; many searched
  cells and repeated roster/seed contexts need restrained interpretation.
- Compare relevant strata before pooled distributions. An equal-weight lab
  concept mix is not the NFL mix; better aggregate TVD can hide adverse concepts.
  Evaluate both teams independently of gain; upstream geometry can make a
  later failure unavoidable. NFL can expose a missing behavior without proving
  whether a controller, information path or physical execution caused it.

## Copyable instruction for a football owner

> For your current named mechanism, start with the relevant saved NFL reference
> and one comparable native sequence. State the geometry/timing question, source
> and operator pin, cohort/exposure and event/proxy limits. Follow stable actors;
> use stored native velocity and separate installed job, cue age, available
> requests, achieved motion and actual contact. Reuse existing data where it
> lives and your prior controls. Make the smallest justified change, retain an
> offensive win, a defensive win and any material adverse case when available,
> then explain what NFL evidence changed in your diagnosis or decision. If the
> source cannot answer the question, say exactly why and use the appropriate
> native/football control. No automatic download, benchmark, game campaign,
> parameter fitting or experimental promotion.

[claude-report]: https://github.com/tannerthardy/football-simulation-/blob/65db81d710bc0ff75fcd6a81cc4fa8b5f1b89e5f/docs/reviews/run-game-v3.md#part-5--second-level-blocking-counter-and-toss-2026-10-19
[film]: https://github.com/tannerthardy/football-simulation-/blob/65db81d710bc0ff75fcd6a81cc4fa8b5f1b89e5f/scripts/diag/stretch/film-page.ts
[arm]: https://github.com/tannerthardy/football-simulation-/blob/65db81d710bc0ff75fcd6a81cc4fa8b5f1b89e5f/scripts/diag/open-field/arm.mjs
[paired]: https://github.com/tannerthardy/football-simulation-/blob/65db81d710bc0ff75fcd6a81cc4fa8b5f1b89e5f/scripts/diag/stretch/paired.py
[response]: https://github.com/tannerthardy/football-simulation-/blob/65db81d710bc0ff75fcd6a81cc4fa8b5f1b89e5f/docs/reviews/run-game-v3-pr153-response.md#6-measurement-review-corrections-adopted
[formation]: https://github.com/tannerthardy/football-simulation-/pull/156
