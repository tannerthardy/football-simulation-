# RB tempo and second-level misses

**Inside-zone tempo is slow in these openings. Reject both tested shortcuts.**
The comparison films previously supplied in this chat ran at half speed; these
[mesh](tempo-replay.gif) and [climb](climb-replay.gif) replays run at **1×**.
There are also genuine controller problems. A stopping mesh unnecessarily loses
RB momentum, and the climb forecast ignores intervening first-level bodies.
Faster exchanges expose another missing part: the runner's forecast of a
neighboring loaded block can be clear while that block subsequently crosses him.

Both experimental runtime changes are reverted. Final `src/` is identical to
PR52 publication `42edf82e38099a95768ad619cb4071a14ff0fd4c`, SHA256
`66e59745bc3db3d20797951f1ee8bb4b75df4bb019eaef5a2eb24e32873e3c08`.
PR50/52 blocking progress is preserved; this does not promote that experimental
stack to the shared baseline. No physics, capacities, vision, memory, contacts,
ratings or runtime flags change.

## What NFL tracking actually says

The committed Big Data Bowl 2025 aggregate measures 2022 weeks1–9, all22
players, using the common position/event operator in
[`metrics.py`](../../../scripts/mechanics/metrics.py). NFL tracking records
location, speed and acceleration at10Hz
([NFL Football Operations](https://operations.nfl.com/gameday/technology/nfl-next-gen-stats)).
These are our measurements of the supplied tracking, not claimed official NFL
league-average tables. Source archive SHA256 is
`743794b44b5ef49da7cb7d3f488a9418ac16c5ef269199a4044eecb8258550d3`.
The [summary](summary.json) records aggregate/operator digests and provenance.
No raw NFL download, new NFL extraction or full-game collector ran.

| 2022 tracking measurement | Handoffs, n | Median snap→handoff | Middle50% | Crossing sample, n | Median snap→LOS | Middle50% |
|---|---:|---:|---|---:|---:|---|
| Inside zone family |1230|1.20s|1.10–1.30|829|2.30s|2.10–2.50|
| Outside zone family |1593|1.30s|1.20–1.40|885|2.60s|2.40–2.90|
| Gap/pull family |1417|1.30s|1.20–1.40|843|2.60s|2.30–3.10|

**The crossing sample is conditional:** it includes only plays crossing before
first recorded defender contact. Failed/stuffed runs are not silently assigned
a crossing time. Handoff and crossing medians therefore describe different
samples; subtracting those medians does not yield a measured handoff→LOS median.
NFL contact annotations, sim event admission, formation/front mixes and generated
rosters also differ. These are leads for diagnosis, not numbers to tune toward.
The older2017 aggregate's all-run median snap→LOS is2.40s versus2022's2.50s,
with median handoff1.30s in both; it has no matching concept labels.

NGS's published TLOS definition describes average time behind the line over
rushing plays ([NGS dictionary](https://nflreadr.nflverse.com/articles/dictionary_nextgen_stats.html)).
We do not equate that aggregate with this before-contact crossing subset or
silently assume an identical start clock. Snap/handoff event timestamps make
the current comparison explicit. None of these metrics measures a gap decision
or proves an open hole exists; LOS crossing is the reproducible landmark.

## Current saved timings, before any runtime change

| Saved opening | Snap→handoff | RB speed at handoff, yd/s | Native50ms LOS crossing | Handoff→cross |
|---|---:|---:|---:|---:|
| Inside strong |1.50|1.64|2.75|1.25|
| Inside weak |1.50|1.64|2.65|1.15|
| Gun Wing split |1.05|1.58|2.75|1.70|
| Wide zone Y |1.45|4.25|2.85, after contact|1.40|
| Wide zone H |1.45|4.25|No crossing before2.85 whistle|—|
| Wide zone weak |1.45|4.25|2.60|1.15|
| Known Tite wide zone |1.45|4.25|2.70, after contact|1.25|
| Counter |1.50|1.64|No crossing by3.00 censor|—|

These are selected saved openings, not sim percentiles. The shared10Hz,
0.1yd-quantized operator is also applied and saved beside the native timings.
For example, strong inside crosses at2.80 on that grid; weak inside's crossing
is not admitted before its contact cutoff. We do not compare the native table
as if its50ms resolution and contact conditioning matched the NFL table.

The useful distinction is within the sim: under-center inside zone spends
.25–.30s longer reaching its mesh than typical handoffs in the reference, and
does so after braking the back down. Existing outside/wide-zone timings are
closer to the reference; contact, traffic and individual misses explain much
of their remaining delay. A global speed/acceleration boost is not supported.

## Moving mesh: local improvement, new coupled collision

The ordinary non-riding `RunnerToMesh` requests zero through-speed at the
landmark. The experiment reuses its existing rolling approach for inside/split
zone, retaining the original QB pivot, mesh clock, physical transfer reach and
all actual World limits. Counter/trap/duo/draw retain their original approach.
No timer, strength or body speed is directly altered.

In a same-snap QB/RB-only World, the stopping and rolling versions start with
identical bodies. Handoff changes1.40→1.25s and RB speed2.20→3.90yd/s. A QB
delayed by1s exchanges later, at1.60s, within existing1.243yd reach; a QB held
through the entire4s check cannot transfer. These are isolated movement checks,
not natural football continuations.

Only then did naturally reacting all22 runs execute. The combined trial gives
inside strong1.25s handoff/2.30s crossing, but introduces RG–RB impulses123.14
and83.13kg·yd/s at2.55/2.60. The parent has no offensive teammate impacts.
The follow-up **removes the climb change**, preserving only the moving mesh:

| Isolated runtime change | Reference | Mesh-only |
|---|---:|---:|
| Inside strong handoff |1.50|1.25|
| Inside strong speed at handoff |1.64|3.90|
| Inside strong crossing |2.75|2.30|
| Inside strong RG–RB impacts |0|2 /201.66kg·yd/s|
| Inside weak crossing |2.65|2.20|
| Split crossing |2.75|2.65|

The faster mesh alone therefore reproduces the new collision. It is rejected,
including for the favorable weak result; this is not selectively enabled for
a direction/front that happens to pass. Earlier crossing is not an acceptance
criterion when it creates an unsafe interacting path.

The [saved strong collision trace](mesh-collision.json) shows RB genuinely has
an observed RG picture, age.30s. At2.30 its velocity is(1.426,−1.025)yd/s;
actual loaded RG velocity is(1.201,−2.021), reaching(.925,−2.802) by2.55.
The real blocking load/feet change that route beyond the acquired coast.
This is not an RB sighting that expired, a 2yd/s preview cutoff, or hidden
knowledge we can simply restore: RB is already moving5.68yd/s at2.30.

The [same-own-body diagnostic](clearance-result.json) uses the saved RB state
and consumed RG picture, with unchanged radius/World laws. Against acquired
constant velocity, the saved request has **+.517yd** minimum surface clearance
over.60s. Scoring that own-body free forecast against RG's subsequently
recorded path gives**−.043yd**. The actual peer future is analysis only; it
never chooses a request. Gathering from the identical2.30 body gives+.095yd
against that recorded path; at2.40 it gives−.197yd. Thus earlier gathering is
not proof of an informed or coupled solution, and waiting another beat can
already be too late. Other players must react naturally before claiming that
an alternate request prevents the impact.

## Climbers: the intervening body is the first demonstrated defect

Weak inside LG is assigned LB_M from the snap. At.45 he has personally consumed
DT_W's delayed picture at(40.900,27.281), velocity(0,0), age.25. His request is
(7.311,−1.939)yd/s toward the linebacker. The exact own-body free World forecast
crosses that acquired DT's contact surface: minimum gap**−.360yd** over.60s.
Gathering from that **same** physical state leaves+.321yd. Scoring both against
the recorded DT route gives−.258/+.178yd respectively. First native LG–DT_W
impact is.65s,219.46kg·yd/s, followed by repeated opposing contacts. This is
measurable lost motion, not just an animation or a nominal engagement label.

The long climb planner searches meeting points on the backer's path in empty
space. `readRules` notices the down man but collects only a penetrating threat
behind LOS−.25. The occupied down man in this ordinary climbing corridor is
neither collected nor included in the climb route. Increasing the climber's
speed, improving only the backer aim or extending information lifetime cannot
repair that omitted constraint. The existing picture already exposes it.

The tested shortcut addressed a separate genuine omission: `plannedClimb`
returned before `secondLevelBlockApproach`, skipping its bounded shoulder
collection and near-strike base. The trial used that operator in both candidate
preview and execution, with the already acquired backer picture and unchanged
movement physics. It passed111 focused checks, including near-base execution,
long-distance behavior, picture/RNG purity and retained ownership controls.

The coupled result **does not support adoption**:

- Weak inside LG still has no assigned backer load in the combined trial; its
  closest center distance worsens1.682→1.910yd. The DT obstruction remains.
- Known Tite C still earns no LB_S load through3s, closest distance1.299→1.400yd.
  The [earlier saved-cue review](../wide-zone-flow/climb-read-review.json) already
  isolates a different limit here: initial acquired-CV fits are attainable,
  but the backer subsequently accelerates; later reads become unattainable.
  There is no demonstrated intervening-DL impact on C to blame in this case.
- Weak WZ RT finally carries some LB_S load at2.80s (23.83normal/65.75tangent
  impulse), while its first departure/contact problem remains. That late work
  alone does not establish a useful block for the runner.
- Counter's offensive teammate impulses increase**7→11**,317.63→580.25kg·yd/s.
  The first changed request is H at.95; LT changes at1.40, followed by changed
  LT/H and new LT/LG traffic. H loses its former632.16normal/175.22tangent
  LB_M work; LT gains work on LB_W. These are actual interacting tradeoffs,
  not permission to call the trial successful from its improved LT contact.
- All four WZ controls retain zero offensive teammate impacts, with real
  first-level and LB forces retained in the [per-pair summary](summary.json).
  That preserves useful work but does not resolve the two misses above.

The concrete next correction is **first-level clearance in the climb choice**:
compare candidate achievable prefixes against acquired down-man and neighboring
routes together, starting with LG's saved.45s state and a genuinely clear climb.
If clearance is absent, distinguish a reachable ordinary help fit from waiting;
do not certify a backer interception through a down man or force an early
release. The faster RB then needs a bounded account of observed loaded-block
motion/uncertainty before reintroducing the rolling mesh. Neither a full-speed
request nor an empty-space fit forecast certifies those interactions. The old
post-mesh nominal-track trial and the rejected joined-release search stay out.

## Pins, runtime and retained evidence

| Role | Code pin | Engine SHA256 |
|---|---|---|
| PR52 reference publication |42edf82e38099a95768ad619cb4071a14ff0fd4c|66e59745bc3db3d20797951f1ee8bb4b75df4bb019eaef5a2eb24e32873e3c08|
| PR50 WZ/counter reference, tested |0336414fd8170610f17d7db4a8ccba94b8712b02|afb8a307e7607c26d87e1d5f52b51a43deda2ea4712126ee3826077a994102d2|
| Rejected combined mesh/collection |d65ee5cde89ac3d690271610a0328a8be6dd7349|67b64f2e0f15bed7816547345df952ef44231bff9cb06681c4260b9de32f5feb|
| Rejected mesh-only attribution |e12e4e15748beb68c9568bc215ba9804a27898a5|325a7156e55531c25e506ce1f8d6aaef634666b84e4d3306e924f9eb51a97a3f|
| Runtime restored |3a73ccaf27c9153228b3f77f7041bc7b73104467|same66e59745 engine as PR52|

The frozen [panel](../../../config/run-tempo-collection.json) names eight
interaction questions before native candidate results: the three original WZ
openings, known Tite miss, inside strong/weak, real Gun Wing split and counter
transfer. Two bounded output batches use the same candidate pin; a third,
three-case batch isolates the new inside collision. **11 short native openings,
656 outer World ticks,31.036s of collector runtime, zero full games.** All three
native receipts have unchanged source/tests/scripts/config/HEAD. Eight reference
openings are reused; they are not counted as new simulations.

Initial isolated mesh work adds127 two-body World steps; the final clearance
probe adds72 own-body World steps. Framework fixtures have separate check cost.
The rejected combined engine passes111 focused checks/typecheck; final restored
runtime checks reuse PR52's compatible engine receipt and verify the retained
diagnostic/mesh fixtures separately. Full code pins, flags and launcher times
are in [receipts](receipts/) and [runtime](runtime.json). One early typecheck
process passed but its receipt was invalidated when HEAD changed during the
check; the next frozen receipt passes. The initial near/far fixture was inside
the existing collection envelope and was corrected to an explicit long-distance
control. An initial witness import failed before any World step. All failed
receipts remain visible.

The [9.1MB portable bundle](evidence.jsonrefs.gz) retains all11 newly captured
openings: all22 bodies/requests, behavior, acquired cues, joints, physical
reports and state/information hashes. Original pin/digests and omitted repeated
fields are in [its manifest](evidence-manifest.json). Reference packets remain
in the existing [PR50](../wide-zone-flow/README.md) and
[PR52](../joined-release-transfer/README.md) evidence, without duplicating them.
The reducer rejects exploratory reference source hashes; similarly named local
`final.json.gz` files from the rejected graph trial are not accepted references.

```sh
python3 scripts/diag/wz-flow-evidence.py decode docs/reviews/run-tempo-climb/evidence.jsonrefs.gz --out out/tempo-climb/decoded.json
```

Decoded captures[label].data can be written as JSON/gzip for the unchanged
collector/review operators. This is offline evidence, not a native restart.
Packing and rendering execute zero World steps. Both replays contain61 poses
at50ms/frame; a whistled play holds its last pose without loads/impacts added.
Gold denotes actual transmitted hand load, not a declared block win. The
recommendation is to retain PR52, reject both runtime shortcuts, and repair the
demonstrated route/contact forecast before speeding up the interacting play.
