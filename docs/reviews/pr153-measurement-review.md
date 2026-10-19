# PR #153: measurement meaning and provenance review

Reviewed 2026-10-19 UTC, existing evidence only. **Qualified descriptive findings
are usable. NFL event equivalence, dominant-cause rankings and complete arm
reproducibility are not established.** This is not approval or rejection of
controller behavior, contact law, flag activation or the package.

Research head: `1c578afb38f2eb6fc4886639e63fccc4e79c4354`; latest runtime checkpoint
`c8d638086e69961de2ff45d41df0a9871947ca83`. Accepted develop:
`f4146275ce7539816bf57b4ed55a0d2be10e48c7`; intake queue:
`9a6bb795179a4b2e61ed59d25bcf23ca5e40f423`. These are distinct references.
The [review packet][packet] already limits the branch to research.

[Check receipt](../../data/reviews/current/pr153-measurement-review.json): all
140 packet file sizes/hashes and five static source fingerprints verified;
52 saved report headers and their printed conditional-tail arithmetic inspected.
Every header reports zero errors and zero live-at-20s cases. Those are reported
counts, not a new case census. No engine import, tick, test suite, raw-data
conversion, lab rerun, game or acquisition was performed.

## Supported observations and their limits

- The saved reports contain short simulated first-contact-to-ending intervals,
  limited line displacement/flow, repeated block-rep transitions, altered mesh
  speeds and substantial adverse power tails. These justify specific owner
  investigations; they do not rank causes across ordinary accepted football.
- The committed NFL aggregate records median **1.4 s** first-contact-to-ending,
  **n=5,262** contacted RB/FB-handoff runs. The report's simulated **0.8 s** is
  a comparison of endpoint intervals under different event systems. It is not
  an NFL-versus-sim continuous-grip measurement.
- The printed package TVD changes are ace **.161→.159**, zone transfer
  **.145→.135**, gap **.125→.118**. These are descriptive distances on selected
  grids against a pooled NFL reference, not proof of better football.
- Saved handoff motion estimates are under-center IZ **2.24→4.37 yd/s**
  (NFL 4.43), and shotgun IZ **1.25→2.30** (NFL 3.82). These are named package
  comparisons, not isolated effects of each mesh hunk. The NFL shotgun
  cross-face proxy is 7% of 779 IZ rows versus 28% of 232 OZ rows: it supports
  a common own-side geometry in those samples, not a universal mesh rule.
- `d0` and `id0` report text matches after normalizing only the first header's
  arm label. The files are not byte-identical. Identical per-play gains and
  positions remain author-reported because those rows are unavailable here.

## Required event and proxy wording corrections

| Report claim/location | What the saved operator actually measures; required wording |
| --- | --- |
| “Contact to whistle” and “held carriers,” [lines 295–350 and 610–616][report] | Say **first-contact-to-selected-ending elapsed time**. NFL conversion retains the provider `first_contact` label at 10 Hz; its ending is the earliest listed tackle/OOB/TD/sack/etc. event, or the last tracking frame if no ending label exists. A fallback is not a known whistle. Sim first contact includes opposing body collision **and** successful grasp, with wrap/hit/tackle fallbacks in the common exporter. It is not wrap-only. This source fact does not validate agreement with NFL annotation, contact identity or event timing. |
| “Falls come 0.3 s after the first hold in 95–99% of holds at every depth” | `bondend.ts` emits **one row per selected play with a sampled post-handoff bond**. Its start never resets after a release; its `held` interval runs to the ending or 20s cap. A later bond can supply the first non-up sample. The baseline receipt has **357 play rows**, with 95–98% observing non-up while bonded and conditional median first-bond-to-non-up .30/.30/.35s across its three bands. These are not independent holds, uninterrupted hold durations or a measured NFL fall-time comparison. The helper does not publish terminal/censor counts. |
| “Grip tension” or a grip causes the displayed body-weight load | The hold helper sums **joint capacity**, not actual joint tension. The single trace's `felt/bw` is aggregate felt force, not isolated grip force. A .25s lateral felt component −2.29 body weights precedes falling at .40s in that witness; it does not attribute that force to one grasp or establish a population cause. NFL tracking measures neither grip force nor gaze. |
| “Entry speed,” first tackler and approach angle | Common metrics differentiate positions quantized to **0.1 yd**, using a centered **±.2s** window. At contact, the estimate includes post-contact samples and may include post-ending tracking. Call it a **contact-centered motion estimate**, not clean incoming speed/momentum. The nearest defender is a first-tackler stand-in, not a labeled identity. Angle is between estimated velocity vectors, not facing or anatomical contact angle. Speed-conditioned YAC can be affected by the contact already slowing the runner. Stored native velocity is available to some other diagnostics, but cannot be substituted retrospectively without changing this operator. |
| “Engaged/tied up,” “blocks match NFL,” [lines 441–455, 505–527][report] | `release.py` means any noncarrier offensive player within **1.2 yd**. `lbblocks.py` begins at OL/TE distance ≤1.0 and continues with the **same player** while ≤1.5. Older `lbblock.py` permits changing OL identity and reports ended episodes separately with censoring. None establishes NFL engagement, force, successful assignment or a legal hold. `timeline.py` also uses proximity; its OL speed is pooled over .5–2.0s, not instantaneous speed at 2s. Sim `frontstate.ts` uses actual reps and stored velocity; keep that evidence separate. |
| “Instant re-latches fall to zero,” [line 462][report] | The saved lifecycle diagnostic counts **rep events**, not plays. Its threshold is `<2.1×dt` = **.105s** at dt=.05, allowing up to two native ticks, despite the printed “within a tick” label. Baseline DL: 644 runner-passed endings, 492 same-blocker front-cone repeats plus two side repeats; LB front repeats 79. The flagged receipt removes those same-blocker categories; **seven other-blocker DL repeats remain**. Front means within 60° of body facing, not proof a reachable re-grab is illegitimate. |
| “DL still in a rep 70→37%” versus “roughly 80% tied up” | Both can be reported with their own operator/population. Actual-rep state is not the proximity proxy. The +1s native rows condition on plays reaching that time; baseline **83 surviving plays / 359 DL actor rows**, not the entire attempted lab. Equal aggregate counts do not prove identical paired membership. |
| “NFL encounters only slow the runner 20%” and “contacts .52 versus .07” | `openfield.py` counts each defender's first ≤1yd encounter beyond +8, and classifies ending within 1s, a motion-based escape, or residual **other**. The residual named `slowed` requires no measured slowing. Several defenders can count the same play ending. `lbpass2.py`'s .52/.07 are **≤1yd closest approaches per 10+ run** within crossing-to-+2s/end, not labeled contacts or broken tackles. The saved rows have NFL n=56 versus sim n=95 or 45, conditioned on the outcome. They do not show that NFL backers are carried through while equivalent simulated holds stop runners. |

Definitions checked in [NFL converter][converter], [common metrics][metrics],
[sim collision emission][collision], [grasp emission][grasp], [common exporter][exporter],
[hold helper][bond], [release][release], [same-player episodes][episodes],
[re-latch helper][relatch], [open-field encounters][encounters] and [second-level approaches][lbpass].
“Broke contact” in the common metrics is also a survivor-conditioned speed/YAC
proxy, not an NFL broken-grasp label. Yards after contact subtracts physical
contact depth from **credited gain**; it is not necessarily physical displacement
to the last frame, particularly at a scoring boundary.
The converter's PFF blocker-pair metadata is a dropback assignment reference;
it does not supply timed run-contact or continuous-engagement labels for these
run comparisons.

Two additional operator limitations require explicit qualification of existing
results, not new runs during this review:

1. `release.py:20` and `lbblocks.py:24` test crossing+1s using `Play.k`, which
   first clamps to the recording. A short recording can therefore be admitted
   and reuse its final frame instead of supplying a live +1s sample. Affected
   counts are unknown without existing raw rows. Same-player episodes reaching
   the recording/end are duration lower bounds, without a censor marker in
   `lbblocks.py`; do not describe them as observed physical releases.
2. [Pursuit][pursuit] uses `cx < REF+40`: at REF=10 the horizon is **+50 yd
   from the LOS**, not +40 (at REF=20 it is +60). Its straight-line test uses
   whole-play observed peak speed with a 5yd/s floor, reaction/reach allowances,
   and the runner's actual remaining path. It ignores acceleration, facing,
   blockers and contact and stops at the observed ending. Early successful NFL
   tackles truncate that future path. Say **intersection under this retrospective
   geometric proxy**, not proof of attainable support or adequate structure.

Additional validity limits: the NFL converter forward-fills later missing
player samples without preserving a validity mask. It retains stable per-play
array indices but drops NFL player IDs; selected identity joins need the
original ID/index map. Sim common frames are .1s apart and may end .05s before
the native endpoint. Sim collision time is attached to the native interval;
NFL labels are frame annotations. Position groups also differ (NFL OLB→LB,
sim EDGE→DL). No event-alignment, missing-frame or nearest-tackler agreement
audit is available in these artifacts. Shared Python code does not remove
these source differences.

## Concepts, populations, weighting and tails

NFL means **2022 regular-season weeks 1–9**, not all NFL football. Outcome rows
use 6,223 converted run/carrier rows; **NFL60 is 2,633** with sidecar distance
to goal ≥60. The committed shared mechanism aggregate instead selects
**5,462 RB/FB-handoff runs**; its contacted subset is 5,262. Many mechanism
tables use the full-field sample, plus their own crossing/live/contact filters.
Do not give them all the NFL60 denominator. Missing sidecar IDs default to zero
and are excluded from NFL60; sidecar join coverage was not supplied.

The lab uses fixed calls, ten equally weighted looks, two generated roster
pairs (generation seeds 11/12 and 31/32), repeated case seeds, first-and-10,
LOS40, ballY26.67 and no audibles/hurry. Ace gives equal weight to IZ/OZ/WZ;
OZ and WZ share the NFL OUTSIDE ZONE reference. Gap gives four concepts equal
weight. These are controlled selected experiments, not an NFL-weighted sample
or independent draws of 1,200/1,600/1,800 teams or games. Actor/frame and episode
tables have further exposure weighting and repeated observations within plays.

NFL60 printed concept counts: IZ **552**, OUTSIDE ZONE **776**, COUNTER **172**,
MAN **413**, POWER **237**, TRAP **50**. MAN is a broad provider label, not
verified Duo: write **sim Duo versus NFL PFF MAN family**. Do not turn its .97%
40+ rate into an exact NFL Duo target. The six labels cover 2,200 of 2,633 rows;
overall TVD always compares against **all 2,633**, including for the gap-only
lab. It does not match concepts/looks/formation/field position distributions.
NFL credited integral yards versus fractional sim gains also matter near bins.

The [TVD operator][shape] uses half-L1 over gain bins
`[-99,-2,0,1,2,3,4,6,10,20,40,999]`. Mixtures can cancel discrepancies.
Preserve per-concept adverse changes: ace IZ **.119→.171**, WZ **.216→.252**,
OZ **.223→.170**; gap power **.178→.190**, trap **.137→.197**. The overall
improvement is correctly printed but cannot certify a package or a mechanism.

| Saved comparison | 40+ counts / arm exposure |
| --- | --- |
| ace develop `d0` → package `sp` | 45/1,200 → 26/1,200 |
| pre-shed `mtr` → `sp` | 31/1,200 → 26/1,200 |
| standalone shed `d0` → `sp0` | 45/1,200 → 51/1,200 (adverse) |
| zone transfer `mt2tf` → `sptf` | 48/1,800 → 45/1,800 |
| gap `mtrgap` → `spgap` | 86/1,600 → 78/1,600 |

`sp`'s conditional 40+|20+ is **26/30**; NFL60's is **31/79**. NFL concept
tail percentages imply only **one IZ**, **three POWER**, **two TRAP** and
**four MAN** 40+ events (inferred from rounded printed rates, not raw recounts).
Conversely, “10–30 events per arm” is not true for every lab arm above.
No paired transition/uncertainty analysis supports “within noise.” Say
**small-count differences with uncertainty not estimated**, and retain the
power-package 40+ adverse result (8–10% of 400, versus NFL POWER 3/237).
Uncertainty concerns do not erase observed adverse rows.

## Existing arm provenance and smallest missing handoff

Static source hashes independently match the packet (full values in receipt):
accepted f414627→`7d23555a…`, ee7fb77→`74547446…`, afdd134→`17908c0c…`,
c8d638/1c578→`013858af…`. Final configured flag-profile hash is `bb2ef1a0…`.
These identify accessible trees/configuration, **not the trees or resolved
environments that produced every saved arm**. Historical metadata inside
`config/baseline.json` is not a producing-run receipt either.

| Arm family | What is accessible / specifically missing |
| --- | --- |
| `d0`, flags-off `id0` | Named 1,200-row aggregate reports and equal normalized text. Missing producing source/dirty patch, full resolved flags and per-case identity/position hashes. |
| `rec2`, `mtr`, `sp`, caps/standalone shed, gap/transfer variants | Named recipes and aggregate outcomes are accessible. No report binds its arm to an exact source snapshot, full runtime settings, ordered case/input hashes or measurement hashes. Final source alone cannot fill that gap. |
| `mtrtf` versus `mt2tf` | Same nominal flags, explicitly before/after the shotgun-spot code revision. Must retain distinct producing source receipts. Do not combine as one flags-only comparison or relabel both final-head runs. |
| Superseded ZONE_TE, `mt3*`, `ptgap`, `pkgap` | README says earlier ZONE_TE and reverted handoff-gate/PULL_TEMPO/PULL_KEY producing code is absent from final branch. Need the original commit or retained patch snapshot; otherwise historical, incompletely reproducible evidence. |
| `DEF_GETOFF=.5`, gait/pull/hold diagnostics | Source accepts the research values; raw launchers and diagnostic hooks can add settings. Need their actual commands/environment and helper version. The unchanged baseline launcher's override parser accepts DEF_GETOFF only as 0/1, so it cannot reproduce the .5 command as written. |
| NFL rows/sidecars | Committed aggregate is accessible, with archive SHA256 `743794b44b5ef49da7cb7d3f488a9418ac16c5ef269199a4044eecb8258550d3`. Missing converted-row/sidecar hashes, their producing extractor/measurement pins, sidecar generation and join/exclusion counts. An archive hash alone does not certify a derived table. |

`open-field/run.sh` launches `env <listed overrides> node …` and inherits the
remaining ambient flags. It does **not** apply the sanitizing baseline profile;
`common.sh` concatenates shards without binding source/settings/case identities.
Therefore named enabled flags plus current defaults do not establish actual
resolved values. Need only recorded relevant settings, not a dump of unrelated
environment variables or secrets.

No raw NFL common rows, formation/ytg sidecars or representative d0/sp/mt2tf/
spgap traces were present in the three inspected checkouts. Ignored `out/`
paths are not shared artifact access. The author may have them elsewhere;
absence here is a provenance/access gap, not evidence the runs failed.

The smallest handoff is an **existing** manifest linking each reused arm to:
(1) producing commit plus dirty patch if any; (2) resolved engine/diagnostic
flags, native dt/World options and runtime; (3) exact case IDs, call/roster input
hashes, seed lists, shards and attempted/error/censor accounting; (4) exporter,
sidecar and measurement hashes/commands; (5) fetchable artifact URLs, sizes and
checksums. Recipe defaults are useful preparation, not proof of execution.
Supply the already-saved selected mesh and re-latch witness/control plus adverse
power/gun examples, retaining actor identities, stored velocity, event reasons
and terminal/censor status. No indiscriminate raw-data upload or new run is
needed for this review. If an old patch/receipt is unrecoverable, mark it missing
instead of describing a later reconstruction as its original run.

## Decision informed

Retain these reports as selected descriptive evidence with the corrections
above. Mesh timing, repeated reps, limited achieved flow and short post-contact
intervals are concrete investigation targets. “The line is static because of
World gait,” “the read is not missing,” “structure already matches,” and
“held-carrier physics is the largest single cause” remain **causal hypotheses**.
Package perturbations, survivor-conditioned proxies, final requests and
whole-body gait changes do not isolate them or exhaust competing controller,
assignment, contact or sample-selection explanations. Final intents cannot
reconstruct discarded requests.

Run/controller and Contact/Physics owners should use their independently scoped
reviews and existing witnesses for behavior decisions. This measurement review
does not impose a new experiment or hold unrelated work. Completed NFL queries
and isolated AMF research remain unchanged.

[packet]: https://github.com/tannerthardy/football-simulation-/blob/9a6bb795179a4b2e61ed59d25bcf23ca5e40f423/docs/reviews/run-game-v3-review-intake.md
[report]: https://github.com/tannerthardy/football-simulation-/blob/1c578afb38f2eb6fc4886639e63fccc4e79c4354/docs/reviews/run-game-v3.md
[converter]: https://github.com/tannerthardy/football-simulation-/blob/1c578afb38f2eb6fc4886639e63fccc4e79c4354/scripts/mechanics/nfl_bdb2025.py#L73
[metrics]: https://github.com/tannerthardy/football-simulation-/blob/1c578afb38f2eb6fc4886639e63fccc4e79c4354/scripts/mechanics/metrics.py#L58
[collision]: https://github.com/tannerthardy/football-simulation-/blob/1c578afb38f2eb6fc4886639e63fccc4e79c4354/src/sim/playsim.ts#L619
[grasp]: https://github.com/tannerthardy/football-simulation-/blob/1c578afb38f2eb6fc4886639e63fccc4e79c4354/src/sim/tackle.ts#L290
[exporter]: https://github.com/tannerthardy/football-simulation-/blob/1c578afb38f2eb6fc4886639e63fccc4e79c4354/scripts/diag/open-field/trace.ts#L135
[bond]: https://github.com/tannerthardy/football-simulation-/blob/1c578afb38f2eb6fc4886639e63fccc4e79c4354/scripts/diag/stretch/bondend.ts#L32
[release]: https://github.com/tannerthardy/football-simulation-/blob/1c578afb38f2eb6fc4886639e63fccc4e79c4354/scripts/diag/stretch/release.py#L18
[episodes]: https://github.com/tannerthardy/football-simulation-/blob/1c578afb38f2eb6fc4886639e63fccc4e79c4354/scripts/diag/stretch/lbblocks.py#L21
[relatch]: https://github.com/tannerthardy/football-simulation-/blob/1c578afb38f2eb6fc4886639e63fccc4e79c4354/scripts/diag/stretch/relatch.ts#L19
[encounters]: https://github.com/tannerthardy/football-simulation-/blob/1c578afb38f2eb6fc4886639e63fccc4e79c4354/scripts/diag/stretch/openfield.py#L23
[lbpass]: https://github.com/tannerthardy/football-simulation-/blob/1c578afb38f2eb6fc4886639e63fccc4e79c4354/scripts/diag/stretch/lbpass2.py#L21
[pursuit]: https://github.com/tannerthardy/football-simulation-/blob/1c578afb38f2eb6fc4886639e63fccc4e79c4354/scripts/diag/stretch/pursuit.py#L26
[shape]: https://github.com/tannerthardy/football-simulation-/blob/1c578afb38f2eb6fc4886639e63fccc4e79c4354/scripts/diag/stretch/shape.py#L6
