# Defensive snap response and edge arrival — 2026-10-19 America/Phoenix

The lateness hypothesis has support, but the quoted numbers do not establish
that snap recognition is the main defect. The current witnesses expose two
separate decisions: **a power edge can start inside his installed outside gap;
a blocked box edge can continue penetrating while a personally acquired runner
approaches outside.** Starting those decisions sooner is not a complete repair.

One minimal gap-entry candidate is preserved for independent Run/controller
review, **not integration-ready**. Its initial movement is more consistent with
the installed duty, but toss and play-action pressure costs remain. No latency,
physics, capacity, braking, roster, perception, contact or default change ships
with it. Do not compose the timing trials with this patch automatically.

## Reproduction and boundaries

- Accepted/fetched develop, rechecked before handoff:
  `f4146275ce7539816bf57b4ed55a0d2be10e48c7`, through #151.
- Canonical queue: `9a6bb795179a4b2e61ed59d25bcf23ca5e40f423`.
- Isolated code: `1b8fb0c143f64e51fb6dcfc7ef9b1f0f93885461`,
  `codex/defensive-snap-response`. Runtime edit is only initial power-edge
  entry in `PassRusher.update`, `src/sim/behaviors/defense.ts`.
- Evidence: [`55d672c90a68aa6d830fc0019d863b191bf39c80`](https://github.com/tannerthardy/football-simulation-/tree/55d672c90a68aa6d830fc0019d863b191bf39c80/data/reviews/defensive-snap-response),
  `codex/defensive-snap-response-evidence`. Full passive tapes, selected inputs,
  tools, patches, original launch receipts/logs, hashes and restoration steps.
  [Reduction](https://github.com/tannerthardy/football-simulation-/blob/55d672c90a68aa6d830fc0019d863b191bf39c80/data/reviews/defensive-snap-response/analysis.json).
- Baseline runtime SHA256:
  `7d23555ad67094fbe2e79726d9b761dd5f068c06fb90ff0796ec61c953750197`.
  Gap-entry runtime:
  `7c154e46a860b8fbc8152298865e10fbe57ae5605fa580485ba01529364d17ed`.
  Separate simple-response latency trial:
  `7e99e521a256e856b03e8fcfb0e18014f302a0443c4a18738941beaf7899d96d`.
- Node22.23.3, Linux/x64, accepted dependency lock, all44 accepted flag values,
  `RUN_CONTACT_COMPONENTS=1`, `CF_FLOW` unset, unchanged World defaults. Each
  launcher receipt contains every resolved setting. No #153 research package,
  #155/#156/#157 or held controller/Physics candidate is imported.
- Original NFL/sim operator inspection is pinned at run-v3
  `336e8fc940d08d119926276b7a4c7242eafb437a`. #153 is a mutable research PR;
  intake `1c578afb38f2eb6fc4886639e63fccc4e79c4354` remains separate. At handoff
  its latest head is `65db81d710bc0ff75fcd6a81cc4fa8b5f1b89e5f`.

Two source patches were independently restored outside the checkout and their
complete runtime digests verified. Every archive member was re-read and hashed.
This is a restorable native comparison, not a reconstruction from rounded film.
No NFL collection, data extraction, roster sweep, game or full suite ran.

## What the headline measurements actually measure

`getoff.py` finds first displacement of at least0.15yd from the snap sample,
usually on0.1s common tracking. Its box selection is defenders within
LOS[-0.5,2] and4.5yd laterally of the ball: principally DL, not all front seven.
Noncrossing players disappear from its output. That event includes sensory/motor
latency, acceleration, initial movement direction, contact and sample timing.
It is not the first decision or sensory reaction. Existing research reports
sim OL0.4s versus NFL0.3s too. DEF_GETOFF0.5 moved the reported defensive
median0.5→0.4s, not0.3s. Those are useful observations, not a calibrated response
law or proof that every0.2s of the defensive difference is cognitive delay.

In the four selected accepted-source cases here (16 box defenders), medians are:

| Event | Time after snap |
| --- | ---: |
| First raw movement request above0.1yd/s | 0.25s |
| First achieved speed above0.1yd/s, completed physics clock | 0.30s |
| First displacement at least0.15yd, completed physics clock | 0.50s |
| First run belief, including PA's initially fooled reads | 0.525s |

This tiny purpose-selected set is not a fresh league or NFL estimate. Actual
first DL requests span0.20–0.35s. Some LBs initially move backward for coverage,
then reverse when they read run; a late displacement threshold can hide that
sequence. The gap-entry candidate leaves these panel medians unchanged.

The quoted75–77% versus38–53% uses `dbhits.py --first`: earliest **within1yd
proximity while the runner is0–10yd beyond LOS**, allowing same-frame ties.
It excludes backfield finishes and runs with no eligible encounter. It does not
measure all-run first physical contact, actual tackling, or grasp success.
Its "broken" category is a motion-survival proxy; NFL MAN labels are not proof
of Duo. Preserve the mismatch as a hypothesis, with its conditional denominator;
do not call it the population share of first tacklers.

## Small controlled experiments

The original panel was fixed before outcomes: generated teams31/32, strength.55,
ace11, base43 Over Cover3, LOS40/center ball; DUO11, TOSS13, IZ3 and PA11.
Each arm runs at most six simulation seconds, five wall seconds per case.
Recorders wrap existing consumed cues/commands and World steps. They do not
request extra sightings, random draws or physics ticks. Entry and completed
physics clocks remain distinct. All22 bodies and actual player identities stay
in the tapes.

| Case | Accepted | Half-latency sensitivity | Separate simple-response trial | Gap entry, accepted latency |
| --- | --- | --- | --- | --- |
| Duo11 | tackle6.49yd | tackle3.50 | tackle5.29 | tackle6.49; full identity |
| Toss13 | tackle3.84 | tackle−1.62 | tackle4.29 | tackle6.86; adverse |
| IZ3 | tackle5.39 | tackle1.44 | tackle3.77 | tackle2.12 |
| PA11 | live at6s | live at6s | QB tackle−5.28 | live at6s; full identity |

The half arm explicitly subtracts half the existing defensive response component
**after construction**, retaining the actual selected jitter and then clamping
at0.02s. It is a sensitivity intervention, not exact DEF_GETOFF replay. Initial
`starts.ready` was captured before this intervention; effective gates are in
the first tick's `reads` and reduced `effectiveSnapGates`. Do not use that stale
initial field as its effective readiness.

The simple-response trial uses the existing pursuit simple visuomotor expression
`0.12 + 0.12*(1-awareness)` for snap response, keeping play recognition/profile
reaction capabilities unchanged. That is an isolated model proposal, not a
physiologically calibrated fix. `agent.ts` is restored to accepted bytes in the
retained code. The archive's directory named `candidate/` denotes this historical
latency trial; `edge/` denotes the retained code.

Earlier reaction can materially change the same runs; the toss adverse shows
that "earlier" does not guarantee better arrival. No timing coefficient is
promoted, and these selected gains do not reproduce or certify a distribution.

## Repeated first decision: power plan bypasses the installed edge lane

Accepted `PassRusher.update` returns QB pursuit for every power plan before the
existing initial edge-lane branch can run. Two native witnesses exhibit it:

- TOSS13 DE_S, actual `SD-DT1` Kevin Ellis, installed D-gap/side−1/box/attack.
  At0.30s the request's lateral component is **+6.123yd/s inward**.
- IZ3 DE_W, actual `SD-EDGE3` Damien Payne, installed C-gap/side+1/box/attack.
  At0.30s its lateral request is **−7.259yd/s inward**; first divergence is0.20s.

The candidate uses the already existing nonspeed edge lane before the existing
LOS−0.5 boundary, then retains original power pursuit. TOSS lateral request
becomes−4.297yd/s; IZ becomes+3.386. It uses own installed gap/side and own
position, with no future runner path, hidden call or new sighting. Acquired run,
ball-flight and engagement priorities, interior power, and speed/finesse plans
remain unchanged. This is an initial responsibility repair, not a new contain
policy or a promise that every power rusher must win.

The selected TOSS end is a generated DT playing an EDGE slot with0.55 familiarity;
the IZ witness is a listed EDGE. Fresh transfer also includes a different DT in
an edge slot. Their full profiles are frozen, not homogenized. This does not
repair or certify package selection; #155 remains independent.

## Adverse toss: first-step improvement does not survive as a useful finish

[Actual-coordinate plot](https://github.com/tannerthardy/football-simulation-/blob/55d672c90a68aa6d830fc0019d863b191bf39c80/data/reviews/defensive-snap-response/toss-geometry.png)
shows RB `SO-RB1`, blocker Y and DE_S, preserving their identities.

First raw/final request divergence is0.30s, first achieved-body divergence is
completed0.35s. Y engages in both (block event0.45s). Raw rush behavior then
stands because the existing engagement controller owns the feet. It requests
negative-x penetration, initially−1.5yd/s, plus lateral shoulder work in both.
That negative-x movement is penetration into the offensive backfield; do not
mistake it for the offense driving the defender backward.

At1.50s the defender has personally acquired **carrying=true**, with a0.30s-old
runner picture. Yet the contact policy's "declared" runner gate requires observed
x>LOS−1.6. The visible wide runner is still deeper than that threshold. This
points to a penetration/shoulder-to-runner transfer question; it does not establish
that every attack edge should anchor or that every acquired carrying cue should
trigger a chase.

| Tick entry | Accepted DE position | Candidate DE position | Consequence |
| --- | --- | --- | --- |
| 1.00s | (40.925,22.321) | (40.749,21.926) | Candidate initially gains outside width |
| 2.00s | (39.863,20.972) | (39.310,21.313) | Candidate penetrates0.553yd farther but is0.341yd less wide |
| 2.40s | (39.205,20.734) | (38.672,20.921) | Before tackle execution diverges, useful intersection already differs |

RNG states remain equal through2.35s and first differ at2.40s, when the changed
geometry admits an earlier tackle attempt. Both versions subsequently record a
missed reach (candidate2.45, baseline2.50). Only baseline makes a2.55s body
collision that slows the runner. Candidate has **no DE/RB physical contact**;
first recorded carrier contact is CB_S at3.65s. It cannot diagnose a weak rear
grip or justify more tackle strength. Baseline also finishes with CB_S,3.84yd;
candidate finishes6.86yd with later assistance. A tackle after an unblocked
secondary chase does not demonstrate a sound first-level edge.

Hand loads, positions and final requests are preserved. They do not show one
continuous grip episode, nor isolate every later hand-control draw. The initial
geometry difference precedes RNG divergence; the ending is not an execution-
matched counterfactual. Classification: supported initial assignment correction,
material adverse contact/finish, unresolved adequacy of subsequent box work.
Do not describe it as a successful toss fix or dismiss it as random luck.

## Named opposing and fresh controls

Four additional setups were frozen from constructor-selected power edges before
observing endings: four_verts13 and pa_flood13 on31/32 profiles, then toss13 in
both directions on fresh41/42 profiles. No outcome or roster search was used.
Each baseline runs once and is reused against the unchanged edge runtime.

| Case | Accepted → gap entry | Interpretation |
| --- | --- | --- |
| Four verts13 | tackle22.74→22.96yd; throw2.80/catch3.80 in both | No lost coverage assignment demonstrated; not proof pressure is unchanged |
| PA13 | pressure2.25/throwaway2.40/incomplete → throw4.30/catch5.15, still live at6s | Material pressure cost, censored candidate outcome |
| Fresh toss13 | tackle9.15→8.04yd | Small transfer; primary finish changes LB_S→CB_S |
| Fresh mirrored toss13 | tackle−0.54→−0.52yd | Defensive backfield finish preserved; no required reversal |

PA13 retains initial run belief in both at0.50s; the end later reads pass at
0.85→0.90s. Baseline turns the RT's corner at1.90s; candidate remains blocked
until4.40s. First RT contact changes0.55→0.65s and RNG states first diverge0.50s,
so the pressure cost is not isolated to movement geometry alone. Better outside
discipline can legitimately cost an inside rush opportunity; that tradeoff
requires an independent installed-duty judgment. A later catch/live prefix is
neither a completed gain nor evidence that the whole coverage failed.

Duo11 and PA11 retain complete tick tapes/results exactly, not merely the same
score. Both have unaffected selected speed/finesse edge plans. These controls
also show what the patch does **not** address: Duo's crease persists unchanged.

## Checks, cost and next decision

47 focused TypeScript contracts pass across power-edge entry7,
snap/mesh/pull12, mind8 and defensive-awareness/contact20. They include mirrored
entry, hidden-call/runner independence, run-fit priority, actual interior power,
original post-entry pursuit, accepted snap gate and loaded hands/RNG preservation.
Typecheck passes on the same retained runtime/test tree; no rerun after the
publication-only commit is needed. Vitest reports1.82s; typecheck command11.47s.

24 native prefixes total, **20 completed/4 censored**, receipt collection17.95s.
Budgets were six sim seconds/five wall seconds per case; no failures/unrun tail.
Saved-data reduction/plot/packaging are additional zero-tick work. All controls
and adverse results remain accessible. Integration owns combined verification,
not another contributor full suite.

Smallest next actions:

1. **Run + Catching:** adjudicate the existing box/attack duty from the saved TOSS
   contact trace. Given acquired outside runner motion and the touching blocker's
   shoulder, when should penetration yield to maintaining the outside surface?
   Use ordinary successful attack penetration and PA as opposing cases. Existing
   passive contact-read observer can expose the held aim/declaration/work-off at
   one necessary local continuation; no new game campaign or strength change.
2. Independently decide whether the initial gap-entry contract and its pressure
   cost are acceptable. Until then the one-line runtime candidate is held in a
   draft review, not promoted or combined with latency.
3. **Measurement, if timing calibration becomes the next decision:** align snap
   clocks, initial velocity, identical displacement/speed operators and censored
   denominators using existing captures. Distinguish response latency from motor
   execution/contact before adopting a new snap law. Do not rerun the NFL pipeline
   merely to recover the same headline numbers.

The supported explanation is a chain of response timing, initial assignment,
loaded continuation and attainable contact. This work isolates real controller
work without claiming one delay multiplier repairs the entire run distribution.
