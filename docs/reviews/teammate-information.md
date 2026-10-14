# Bounded teammate information: Run Game / Integration handoff

[Draft PR #36](https://github.com/tannerthardy/football-simulation-/pull/36).

Spacing now consumes observer-owned information instead of every teammate's
refreshed recorded reality. The information contracts pass. This is a
reviewable bounded candidate; **automatic football promotion remains held**
for Run Game review of the Y control's rear teammate collision and the coarse
installed expectations. This repairs spacing's information boundary, not the
whole engine or the run game's remaining decision policy.

## Exact candidate and boundary

- Branch: `codex/teammate-information`, based only on pinned accepted `develop`
  `a1b16e666a9ee7d1bc1d2aecba141fc535863b24`.
- Engine/test revision: `98411ef025dcaa3d024e430e1215eec81b13af1e`;
  evidence harness revision: `b331bc557ed7321463e77b6ee680a98f70dc707e`.
  The intervening harness commit changes no engine or tests. Publication
  adds this note, workboard handoff and evidence only.
- Candidate runtime SHA256:
  `60120551f0ad09415b47150f5edd9cdbd179955010a33d557af817fec31a01f1`.
  Accepted runtime SHA256:
  `e5c318a1082c3738b9782107fa9faec67ada38b02245d1a529af4adaf6825c54`.
- PR #30 evidence comes from
  `1fbc013008faaa8ab0f677328d81c183c0b8c032`; only its portable input/reference
  is reused. No diagnostic-branch or parked physics ancestry is merged.
- All 44 accepted flags are retained, including `RUN_CONTACT_COMPONENTS=1`.
  Center/centered hands, legacy/mean support, adaptive substeps and ordinary
  capacities remain fixed. Historical `4ded6b6` is not this measurement.

Production edits are two new information/installation modules plus PlaySim's
sensing/query/contact-cue wiring and spacing's nullable input adapter.
**Every yielding/gather calculation and constant is unchanged.** Behavior
controllers, physics, capacities, hands, contact acquisition and release
rules are unchanged. The existing `calledMotion()` hook is retained in the
controller but spacing never reads it.

The machine-readable [receipt](../../data/reviews/current/teammate-information-repair.json)
pins settings, sources, inputs, identities, costs, failures and packet hashes.
The [portable evidence archive](teammate-information/assets/evidence.zip)
contains the raw packets and launcher receipts, including adverse prototypes.

## Interface and acquisition

Use `sim.teammateInformation(observer, target)` for a **pure query**. It returns
one of `observed`, `remembered`, `called`, `tactile`, or `unavailable`.
Available pictures supply `pos`, `vel`, `sampledAt`, `availableAt`, `age` and
`predictedFor`; called pictures also identify the installed expectation.
Unavailable pictures have **no position/velocity**. Never substitute `target.pos`
or `sim.see()` when this query is unavailable.

```ts
const picture = sim.teammateInformation(observer, teammate);
if (picture.source === 'unavailable') {
  // No current teammate estimate to use in this decision.
} else {
  // An estimate with provenance/timestamps, not guaranteed live truth.
  const { pos, vel, sampledAt, availableAt } = picture;
}
```

`TeammateInformation` keeps a separate store for each observer. PlaySim updates
it once at the tick's legitimate sensing opportunity, after own mind/workload
updates and before decisions. Repeated sensing at the same timestamp is inert.
Queries and replay recording neither acquire nor deliver sightings and consume
no randomness. Samples acquired before sight is lost can arrive afterward;
they retain their original sample timestamp and never fetch unseen history.

The initial model deliberately uses coarse declared assumptions:

| Source/operation | Bounded behavior |
| --- | --- |
| Visual opportunity | Within 25 yd and a torso-oriented field of regard: half-angle 100°, or 75° during own block engagement (`a.engagement`). Tackle bonds do not narrow this field. Own down state and existing attention/peripheral delay apply. This is not measured eye gaze. |
| Visual delivery | Existing own reaction/focus/stress delay, rounded upward to a tick. No per-query RNG. `observed` means recently delivered, not proof of current visibility. |
| Aging memory | At most 0.30 s constant-velocity extrapolation; afterward position freezes and estimated velocity is zero. Memory expires at 1.00 s **sample age**. |
| Installed expectation | Copied nominal O/D alignment landmarks for 0.60 s; eligible zone-line nominal tempo for 0.60 s; approximate RB mesh track through the installed mesh deadline (1.20 s here). No live position, scatter, engagement, job update or getter availability refreshes it. |
| Tactile cue | Only a positive resolved teammate impact. Approximate contact-distance bearing plus **own achieved velocity**, available at the next boundary for 0.10 s. No remote target velocity or intention. |
| Unavailable | Skip that peer in spacing; real bodies still collide in the unchanged World. |

Priority is tactile, then delivered sighting/memory, then a still-valid installed
expectation, then unavailable. Returned vectors and installed descriptors are
copies. Initial installed alignment is a call expectation, never a fabricated
pre-snap sighting. The installed zone tempo uses fixed nominal capability,
not live fatigue, engagement or achieved motion.

The `calledMotion` audit found a nominal vector but an invalid availability
channel: `RunBlocker.update()` clears `track`, and only a private eligible free
zone-flow branch restores it. Engagement, retargeting, target geometry and
combination state therefore leaked through null/non-null. Installation now
copies the original call/job contract once after assignment; no live getter
is polled, and no current body position supplies the expectation's origin.

## Focused evidence and football consequences

The first question was whether hidden motion can refresh spacing's information
while recorded reality continues advancing. Eight information checks and two
native-loop checks passed **before** spacing migration. They included delayed
visible/fresh opposing controls, bounded memory, installed value/availability,
unavailability and a real rear teammate impulse. A floating-point delivery
boundary defect was found and corrected before proceeding.

Final focused coverage is **37 passing test cases in five files**, including
all directly affected existing traffic/turning/yielding controls, plus typecheck.
The two old standalone traffic-control tests now explicitly provide their declared
pictures because an omitted callback no longer supplies truth. Native recording
and extra queries match bodies, events, requests, information state, own minds
and RNG over an 18-tick comparison. Inputs/source stayed unchanged in receipts.

The first prototype omitted the installed alignment prior. At entry 0.05,
the same RT body and raw request `(1.823, -7.584)` yielded to adjacent TE traffic
under the baseline, becoming about `(2.049, -1.69)`, but remained unmodified
under the prototype because the initial TE sighting had not arrived. That was
a missing installed coordination input. The alignment correction restores a
bounded known landmark; the adverse prototype and first-divergence packets
remain available. No yielding, speed or physics rule was tuned to its outcome.

D01 H and the successful Y control retain exact O31/D32 rosters at strength
0.55, play seed 3, `ace_12`/`wz_strong`, Over/Cover 3, base43, LOS 40,
ball Y 26.666666666666668, first down X 50. H has placement flip true; Y false.
These placements are not geometric mirrors. Identities remain RT `O-OT2`,
RB `O-RB1`, DE_S `D-DT1`, DT_S `D-EDGE1`, LB_S `D-LB5`; slot and actual player
are recorded separately. No roster/capability correction is included.

Each unchanged baseline prefix reproduces all **54 saved state/RNG hashes**
through 2.70 s. An observational acquisition sidecar repeats those same hashes
while sensing the actual original trajectory from snap. Under the declared
field-of-regard model, RT has acquired no RB sighting at the original 2.35
rear-traffic moment. The new query is unavailable; the old feed still supplies
the refreshed age-0.05 picture which changed RT's raw request
`(-0.896, -1.469)` into `(+0.811, -1.878)`. This establishes the repaired
information boundary on the original encounter. The sidecar keeps native
spacing unchanged, omits installed priors already expired before capture,
and **does not demonstrate execution of a candidate request**.

Both final native candidate trajectories diverge by boundary 0.15, so their
later results are not isolated late RT interventions. Two 2.70-s candidate
prefixes are explicitly unfinished. A targeted continuation comparison then
completes only those same two plays and reproduces their earlier 54 candidate
state hashes exactly:

| Play | Accepted complete ending | Candidate complete ending | Relevant mechanism evidence |
| --- | --- | --- | --- |
| H, D01 | Tackle −0.21 yd at 3.25 s | Tackle +1.14 yd at 3.20 s | Loaded RT contact remains in the late window; unseen RB information is unavailable. First opponent contact changes from DE_S body contact at entry 2.65 to DT_S grasp at 2.35. |
| Y control | Tackle +1.49 yd at 4.30 s | Tackle +0.62 yd at 4.15 s | RT remains loaded before a rear teammate collision at entry 2.45. New tactile input then changes his request. First opponent contact changes from CB_S grasp at 3.65 to DT_S grasp at 3.35. |

The Y collision is retained adverse evidence: immediately before impact the
back is about 95° from RT's torso while RT is engaged, outside the declared
75° opportunity. There is no delivered RB estimate. The positive teammate
impulse is 132.37 kg·yd/s; RB achieved x velocity changes from 1.63 to 0.33 yd/s
over that interval. At the next boundary RT receives a tactile cue and the
unchanged yielding algorithm changes his request. This behavior follows the
specified information/physical model, but does not prove its coarse attention
or installed coordination is sufficient football coaching. Earlier trajectories
and later contact/execution also differ; the −0.87-yard outcome change is not
attributed solely to this collision or labeled an improvement.

Final tests took 5.48 launcher seconds; the two completed candidate plays 3.99 s;
the unchanged-history sidecar 3.14 s. Exact timings, all earlier failures and
typecheck costs are retained in the receipt. No full games, roster campaign or
full suite were run. Known production center-hand angular-law limitations remain.

## Remaining consumers and limits

These are **unmigrated**, at the accepted source pin; the new service does not
silently change their supported behavior:

| Consumer | Existing information debt / pointers |
| --- | --- |
| `PlaySim.see()` same-team branch | Still refreshes legacy consumers from reality history. |
| Carrier | `carrier.ts`: surface/kick reads 69–82; lead selection 165–170 uses live down/engagement/distance; squeeze/all bodies 244; blocker reads 287. |
| Run reads / gaps | `run-read.ts` 84–99, 187–190, 255–257; `live-gaps.ts` 61, 70–73 use teammate surfaces and/or live engagement classification. |
| Blocking / combinations | `blocking.ts` 818–820, 852, 949, 1019, 1050–1054, 1228–1235, 1322, 1469, 1504, 1637: wall/partner/keeper/helper/runner inputs, private jobs or live membership alongside legacy pictures. |
| Engagement helper fit | `engagement.ts` 1224 reads teammate owner. |
| Defensive coordination | `coverage-cues.ts` 14–15; `coverage/judgment.ts` 93–95 consume teammate block/cap cues. |
| Receiver block claims | `receiver.ts` 482–500 uses live carrier position; 512–516 accesses private teammate targets. |
| QB | `qb.ts` 635 mesh picture; 364–374 and 490 route/private prediction access on this pin. Separate pass-game candidates are not imported. |

The new service currently exposes position/velocity estimates only. It omits
occlusion, deliberate glances, communication/hearing, detailed head motion,
contact identity uncertainty, and pose/engagement/possession channels. A newly
delivered picture can already exceed the prediction cap and report zero estimated
velocity; that is not proof the teammate stopped. Stationary alignment priors
can create early ghost traffic. The mesh expectation does not announce every
post-handoff cut or live carrier path. No online learning is introduced.

Late diagnostic body restores also need observation queues/memory/calls, or a
native replay from snap. Old body-only snapshots cannot certify this candidate.

## Next owner decisions and reproduction

Run Game should review the Y collision with these exact identities and source
before changing policy. The smallest follow-up is a **request-only** comparison
at the retained Y interval: can an installed post-mesh lane/timing expectation
supply useful bounded anticipation without live RB coordinates? Compare its
value and availability against hidden diverging motion, an actual observed
cutback and the D01 H control. Do not infer a need to remove spacing, suppress
engaged yielding, improve braking or strengthen contact.

Integration owns the shared PlaySim overlap and the final combined check.
Review this bounded branch independently of PR #30 and separate pass-game
branches. The user's Integration agent runs the preserved full suite once on
the exact accepted combined candidate; this worker supplied focused evidence.
No merge or new baseline designation has occurred.

```sh
export PATH=/workspace/.football-tools/node-v22.23.3-linux-x64/bin:$PATH
npm run baseline:run -- --candidate -- npx vitest run test/teammate-information.test.ts test/teammate-information-loop.test.ts test/traffic-control.test.ts test/traffic-turning.test.ts test/spacing-yield.test.ts
npm run baseline:run -- --candidate -- npm run typecheck
mkdir -p out/teammate-information
git fetch origin codex/run-diagnostic-drills
git show 1fbc013008faaa8ab0f677328d81c183c0b8c032:data/reviews/current/ace-production-observations.json.gz > out/teammate-information/accepted-observations.json.gz
npm run baseline:run -- --candidate -- node --import tsx scripts/diag/teammate-information-prefix.ts --out out/teammate-information/native-prefix.json.gz
```

Use `--end-time 10` only to reproduce the declared two completed outcomes.
For the unchanged-history comparison, copy this diagnostic harness into a clean
accepted `a1b16e6` checkout and pass `--information-sidecar` with the absolute
path to this candidate's `src/sim/teammate-information.ts`. The script checks
accepted source, input hash, all 44 flags, native state hashes, late-window
expiry, imported module hash and query neutrality. Use the portable archive
for inspection without any new simulations.
