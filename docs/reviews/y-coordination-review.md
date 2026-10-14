# PR #36: Y collision, shared information and bounded coordination trial

The Y collision is real, but **no useful RB sighting expired from RT's memory**.
RT had never acquired one. RB had delayed RT pictures and was already yielding.
The call omits post-mesh coordination, yet the one nominal continuation tested
here fails: Y still collides and H gains a new rear collision. Keep this trial
diagnostic-only and keep #36's football promotion hold. Do not widen vision,
extend memory, tune contact or require the old yardage on this evidence.

## Exact Run Game handoff

- Reviewed [PR #36](https://github.com/tannerthardy/football-simulation-/pull/36)
  head `68284671d062dfd4e7e879bcd037bc21dad3e3ac`, engine/test `98411ef`,
  original harness `b331bc5`, accepted develop `a1b16e6`.
- Runtime SHA256 remains
  `60120551f0ad09415b47150f5edd9cdbd179955010a33d557af817fec31a01f1`.
  No `src/` changes. This branch contains review, diagnostic code and controls.
- Review harness/control pin: `9fa005a` on `codex/y-coordination-review`.
  The [compact receipt](../../data/reviews/current/y-coordination-review.json)
  includes full hashes, exact script digests, all 44 flags, center/centered
  hands, legacy/mean support, launcher costs/failures and **every native RT→RB
  and RB→RT information query after sensing, from snap to the completed ending**.
  It also records pending acquisition/delivery times, angles, consumed legacy
  pictures, the collision window and same-state request changes.
- Saved candidate-outcomes packet SHA256:
  `c8b55083a18a08daf990f233e6fd891e8ceb538dd04401102e8b8aec3f2ddbbf`.
  New full diagnostic packet SHA256:
  `94461967f2c53dc0257ddb4d89e787ca078211eb7b1289b589150920f872b73c`;
  local ignored path `out/y-coordination/review.json.gz`. The compact receipt
  and reproduction commands are portable; the large raw output stays in `out/`.
- Same O31/D32 teams, strength .55, seed 3, `ace_12`/`wz_strong`, Over/Cover 3,
  base43, LOS 40, ball Y 26.666666666666668, first down X 50. H is flip=true,
  Y flip=false; these are **not geometric mirrors**. RT is index 2 `O-OT2`,
  RB index 6 `O-RB1`, DE_S index 12 `D-DT1`, DT_S index 13 `D-EDGE1`.
  “Y” here names the saved control; its impact is RT–RB, not TE Y–RB.

The from-snap inspection reproduces **all 64 H and 83 Y saved native state/RNG
hashes**, including their completed endings. Both original candidate histories
had already diverged from accepted develop by .15 s. Neither the old outcome
delta nor this trial's later ending isolates the 2.45-s impact.

## What each knew

| Native time | RT's RB information | RB's RT information |
| --- | --- | --- |
| 0–.25 | Called approximate mesh track | Called zone track until first visual delivery |
| .30–1.20 | Called mesh track; no RB sighting | Newly delivered visual pictures, starting with sample 0 / delivery .30 |
| 1.25–2.45 | Unavailable; no delivered or pending pre-impact RB sighting | Continuing visual deliveries at .30-s sample age |
| 2.45 entry | Still unavailable; RB bearing 95.1° while RT engaged | Sample 2.15, available 2.45, predicted RT `(39.1443,21.6170)`, velocity `(-.8912,-.2737)` |
| 2.50–2.65, Y | Tactile cue, renewed by positive impact at entry 2.50 | Same tactile priority over delivered visual pictures |
| 2.70 onward, Y | Unavailable again; first later visual sample is 3.90, pending beyond the play's 4.15 ending | Visual/remembered estimates continue; full transitions in receipt |

H also has no pre-impact-window RT sighting of RB. Its first RB sample is 2.75,
delivered 3.05. It has no native RT–RB impact. Both native handoffs occur at
1.60, later than the installed 1.20 mesh clock; that clock does not certify
possession or achieved arrival.

The **75° engaged torso rule excludes a plausible side/head-look cue** at 95°.
Body facing is not eye gaze, so the rule is a coarse acquisition proxy, not
proof that a real RT could not notice RB. The saved evidence contains no head
turn, received communication or earlier RB touch establishing that cue. RT has
no explicit eyes/key object here. Applying the existing free 100° cone to the
same recorded geometry would first admit RB at 2.30, still requiring normal
delivery latency. This geometry comparison is not a new sensing experiment
and does not justify widening the cone or eliminating latency.

There is **no demonstrated premature memory timeout** in this encounter. RT's
seen store is empty before impact; RB receives successive RT samples and does
not reach the one-second memory expiry. At decisive entries the RB pictures
are .30 s old and retain sampled velocity at the prediction cap. The .60-s
alignment/zone priors have already been superseded or expired. Extending those
old landmarks or the pre-mesh vector would assert the wrong phase.

There is a genuine installation omission: the only RB prior ends at the mesh
deadline, with no representation of the ordinary press toward the called aim.
That supports testing a new phase expectation. It does not establish that this
omission caused Y's collision or that a fixed COM track represents it well.
The handbook's [installation/observation/request/achievement distinction](../football-handbook/offensive-skill-and-playcalling.md)
supports knowing the called lane while revising it from acquired evidence.

## Requests and physical options

RT is sustaining loaded work with DE_S. A free-body turn preview would omit
his actual constraint. At Y entry 2.45 his position is `(39.100,21.572)`, velocity
`(-1.162,-.838)`; raw and final request are both `(-2.446,-1.240)` yd/s.
He receives no RB estimate with which to change that spacing request. Impact
produces 132.366 kg·yd/s and his next achieved velocity is `(-.502,-1.046)`.
The tactile cue at 2.50 changes his request to `(-1.361,-2.125)` without changing
physics or releasing his block. This is a lawful response after contact, not
advance anticipation or proof he could have moved out of the way while loaded.

RB is approaching a visible loaded blocker with residual lateral momentum:

| Entry | Actual surface gap, yd | RB raw request, yd/s | RB final request | RB achieved velocity before step |
| --- | ---: | --- | --- | --- |
| 2.30 | .488 | `(9.283,2.074)` | `(0,0)` | `(1.551,-1.502)` |
| 2.35 | .356 | `(9.283,2.074)` | `(9.283,2.074)` | `(1.309,-1.268)` |
| 2.40 | .226 | `(9.283,2.074)` | `(1.824,4.915)` | `(1.625,-1.129)` |
| 2.45 | .097 | `(9.283,2.074)` | `(2.227,5.443)` | `(1.633,-.780)` |

At 2.35 the straight requested relative ray misses the perceived RT by .63252 yd,
outside the .57682-yd touch distance. Radial spacing therefore permits it.
RB's actual speed is only 1.82278 yd/s, below `gatherForTurn`'s 2-yd/s threshold,
so the curved movement preview is skipped. At 2.30, before slowing below that
threshold, he requested a gather. Information was present; the low-speed
request/achieved-path mismatch is a narrower unresolved controller question.

RB cannot instantly achieve his positive-y escape request. After the 2.45 step,
his x velocity falls from 1.633 to .326 yd/s. Unloaded six-tick RB forecasts
against the **recorded** RT path give a .095-yd minimum gap for sustained braking
from 2.20, versus −.104 yd for holding that tick's final command. From 2.45,
even the brake forecast enters overlap on its first step (−.008 yd).
These are conditional feasibility clues, not a coupled counterfactual: changing
RB's earlier action could change RT, the defender and subsequent decisions.
They support investigating earlier RB gathering, not a guarantee of avoidance
or an RT recovery/strength change. The other legacy carrier/gap consumers still
read .05-s teammate pictures; the receipt separates those from spacing's .30-s
owned information. This review does not migrate them.

## One tested coordination change, retained as failed evidence

Declared question: can a copied, call-derived mesh-to-aim expectation change
advance spacing requests usefully, while hidden execution remains irrelevant
and an acquired cutback wins? A repair would need evidence beyond a different
ending: no truth refresh, the observed opposing response, reduced collision
mechanism in Y and preservation of H's ordinary traffic behavior.

The diagnostic [trial](../../scripts/diag/post-mesh-trial.ts) installs only a
wide-zone riding back's nominal mesh-to-aim segment. Its start is the called
mesh time, speed is the existing `RunnerToMesh` .55·vmax riding tempo, and its
end is nominal arrival at the called aim. It is used only when the existing
query is unavailable. Tactile, observed, remembered and existing call priority
remain unchanged. Installation copies mesh, aim and capability once, and never
reads live position, engagement, possession or behavior availability.

For both inputs the segment starts `(35,23.8667)` at 1.20 with velocity
`(4.98056,-1.60089)`, ending at 2.324371697 s. This deadline comes from the
play geometry and nominal tempo; it is not extended to cover the collision.

On the identical Y state at entry 1.80, only RT's spacing request changes:
`(.268,-.630)` → `(.374,-1.279)`. The trial expects RB at `(37.988,22.906)`;
actual RB is `(36.877,22.908)`, already 1.111 yd behind that point. The trial
changes requests through 1.95, then supplies no useful late correction. Its
first native state divergence is boundary 1.85. H first changes at entry 1.65
(RT and H), boundary 1.70. Thus the adverse endings are downstream consequences
of an early nominal-track intervention, not isolated late RT actions.

| Completed play | Native #36 candidate | Trial | Mechanism verdict |
| --- | --- | --- | --- |
| Y | +.62 yd, 4.15 s; RT–RB impact 132.366 at 2.45 | +.03 yd, 4.00 s; impact 134.024 at 2.45 | Collision not repaired |
| H | +1.14 yd, 3.20 s; no RT–RB contact | +.44 yd, 3.30 s; new impact 114.469 at 2.65, followed by repeated contacts | Ordinary traffic control not preserved |

All four endings are tackles. Yardage does not determine the verdict. The
retained mechanism failures block promotion of this particular track.

The three trial controls pass: independently advancing hidden RB histories
produce identical installed information and actual spacing requests; a visible
moving cutback remains unavailable until acquisition latency, then overrides
the nominal track and changes spacing; copied installation, touch priority,
query neutrality and nominal expiry hold. These establish an information
boundary, not the football adequacy of the continuation.

40 focused cases in six files pass, including #36's 37 checks; the strengthened
moving-cutback fixture was then rerun (3/3). Typecheck passes. Final native
capture takes 7.912 internal / 9.163 launcher seconds while checks run alongside
it; focused checks take 5.016 launcher seconds and typecheck 12.829. The receipt
also retains an earlier type error (nullable diagnostic intent), a failed
same-time-control fixture (it compared different clocks), and their corrections.
Two four-play captures were collected because the shadow diagnostic initially
omitted the existing snap-ready suppression; both reproduce the same native
histories and trial outcomes. Eight new native play executions total, no games,
no full-suite rerun. Integration retains its one combined verification.

## Shared interface decision and next bounded question

Continue using `sim.teammateInformation(observer,target)` as a pure query:
`unavailable` has no vectors, and no consumer may replace it with live truth or
poll a private controller. Preserve sampled/delivery times and once-per-tick
acquisition. A future phase expectation must be a copied install, separately
identified from sightings and invalidated/revised by legitimately acquired
evidence. No memory-limit or field-of-regard change is supported here.

Run Game's next discriminating question is whether **RB's low-speed gather
release** prematurely resumes an unachievable lane change despite his available
RT picture. Use these exact Y/H histories and own momentum first. This pass
stops after the one failed coordination trial; it does not restart RT recovery,
add a second policy or designate a new baseline.

```sh
export PATH=/workspace/.football-tools/node-v22.23.3-linux-x64/bin:$PATH
mkdir -p out/y-coordination
unzip -q docs/reviews/teammate-information/assets/evidence.zip -d out/y-coordination/saved
npm run baseline:run -- --candidate -- node --import tsx scripts/diag/y-coordination-review.ts
npm run baseline:run -- --candidate -- npx vitest run test/post-mesh-trial.test.ts test/teammate-information.test.ts test/teammate-information-loop.test.ts test/traffic-control.test.ts test/traffic-turning.test.ts test/spacing-yield.test.ts
npm run baseline:run -- --candidate -- npm run typecheck
python3 scripts/diag/summarize-y-coordination.py
```
