# Running-back decisions, mesh and achieved movement

Read-only audit of `d087104`, whole engine source
`11b97574138bdd4a99b373e4089261519bd4484f2e5ae5c87f90276a07215f85`.
No carrier, physics, tests or exporters changed during the initial audit. An additional
scratch forecast inspection used the separately pinned **intermediate OL**
source `01a504731ec27ee4d1767c9203ff71d91e597f0d0e67ad54084ea52664da3036`;
its football outcomes are the OL-only stage, not a running-back treatment.
After that isolation, the bounded carrier candidate was implemented at source
`09dd62c7d7cc5002312e93821ea0bf6f7dea3bb764ff75f509c59ff720e72d62`.
The final broad comparison belongs to the parent review; do not substitute the
nine selected diagnostic calls below for that comparison.

The smallest worthwhile carrier repair is an **off-feet threat forecast that
uses the consumed visible pose and never adds negative recovery time**. It is
a real source-law error, although the baseline's crowded running surface often
masks its effect on the selected heading. The OL's demonstrated hands/feet
problem was therefore isolated first, followed by this carrier cue independently.
Reopening the much larger, withheld entry
prototype is unnecessary for that repair.

## What the body already handles

All native movement still passes through shared World. The runner's command
can be changed by teammate spacing, acquired hands/grips and the tackle bond
before the solve. Traction, turning, body squeeze, contact, support and force
budgets determine his achieved path. A 9 yd/s request while moving at 2 yd/s
does not establish that acceleration or turf friction is wrong.

The earlier [traffic-turning repair](traffic-turning-and-football-handbook.md)
already gathers a free, upright, unsqueezed player when his achievable curved
path conflicts with a teammate. It deliberately excludes loaded, gripped,
recently contacting and squeezed bodies. The native IZ/Under/right/seed 3
adverse witness avoids a genuine RB/RG collision and loses yards. Preserve that
distinction: fewer collisions can produce worse football outcomes.

The [boundary repair](carrier-boundary-control.md) also already preserves
downfield movement while recovering from outward momentum. Its remaining
outside-zone exit was an explicit costly-hit decision followed by a late
abort. It does not justify banning all sideline exits.

## 1. Physical falls become negative recovery delays

**Source-confirmed and reproduced in native football.**

[`Agent.isDown`](../../../src/sim/agent.ts) includes both artificial scenario
parking (`downUntil`) and physical Support `falling`, `down` or `rising`.
Physical falls do not set the initially `-1` scenario deadline. However,
[`BallCarrier.evaluate`](../../../src/sim/behaviors/carrier.ts) adds
`d.downUntil - sim.t + 0.2` whenever `isDown` is true. This can subtract several
seconds from defender reach time. An off-feet defender consequently appears
able to reach future running lanes sooner than an upright one.

The same consumed `sim.see` image already contains delayed `pose` and `age`.
The current carrier ignores them and reads the opponent's true current
off-feet state instead. Thus a just-falling defender can trigger the negative
delay while the runner still sees him upright. Replacing the deadline with
live `timeUntilUp()` would repair the sign but add a recovery-state oracle.

Nine predeclared native calls used generated roster seeds 31/32, strength .55,
Ace 11, IZ/OZ, Over/Under, both formation flips and play seed 3, plus the
previously identified roster 41/42 OZ/Over/left/seed 11 boundary context. They
ran to native whistle; none timed out. Wrappers recorded only actually invoked
carrier evaluations and their consumed observations. Every observed run
matched an unobserved plain full execution, including the next RNG draw.

| Source | Native calls with negative cues | Negative cues | Delayed poses for those cues |
| --- | ---: | ---: | --- |
| Audited baseline `11b975…` | 5/9 | 22 | 6 up, 16 down |
| Intermediate OL `01a504…` | 4/9 | 31 | 8 up, 21 down, 2 rising |

These are diagnostic generated-player calls, not NFL frequencies. Their
populations and source pins remain separate.

The scratch counterfactual replays the existing evaluator at the same decision
state, supplying exactly the pictures it had already consumed. Scratch agents
and tags isolate the call; it requests no extra live observation and changes
no native command. It compares clamping negative delay to zero with a delayed
pose-based allowance.

On the audited baseline, neither policy changes any of the 22 affected
headings. The pose policy changes two scores. Nearby live threats and occupied
approaches still dominate: fixing a forecast sign does not manufacture a lane.

On intermediate OL source, clamping the delay changes two headings in the
same fixed IZ/Under/right/seed 3 call; the pose policy changes those and one
OZ/Under/left/seed 3 heading. For example, at 3.45 s the IZ runner is at
`(43.3463, 24.0463)`. Two linebackers are physically falling while his 0.20 s
old pictures still show them upright. Current recovery extras are `-4.25 s`.
Clamping them changes the forecast heading from `-0.51196` to `-0.96875` rad
and its early-contact classification from blocked to unblocked. This is a
causal forecast witness, **not executed candidate yardage or proof that the
new route will remain clear**.

**Precise small proposal.** Keep the same defender reach law, threat set,
engagement policy and physical interactions. Replace only this recovery extra:

- Consumed pose `up`, absent or unknown: zero recovery allowance.
- Consumed pose `down`: the public physical-profile `getUp` duration.
- Consumed pose `rising`: half that public duration, representing unknown
  progress through a visible recovery rather than the true progress.
- Subtract nonnegative picture age and bound the allowance between one native
  decision tick and the public get-up duration. Unknown phase and old pictures
  must not generate an infinite exclusion or negative arrival.

The scratch probe bounds malformed public get-up values to .2–2 s, with a
.9 s fallback; generated profiles currently use .6–1.4 s. That validation is
not an NFL-calibrated recovery distribution. The half-duration rising estimate
and positive tick floor are explicitly coarse controller assumptions. Existing
holds remain real constraints in World. The proposal does not disable tackles,
release a grip or promise that a prone defender cannot affect nearby traffic.

**Minimum checks before promotion.** Identical consumed upright pictures must
produce identical forecasts when the hidden body has just fallen. Known down
and rising pictures should produce finite, bounded, nonnegative allowances;
older pictures should not increase them. Unknown pose and artificial parking
must not imply a visible fall. Vary the hidden support phase/deadline with the
same picture and require the same allowance. Retain ordinary all-upright
decisions exactly, mirror a controlled threat witness, and check the now-open
native IZ/OZ witnesses without demanding improved yards. Run the final native
panel separately from the isolated OL treatment.

### Implemented bounded candidate and mechanism checks

The candidate adds `observedRecoveryAllowance` and replaces only the recovery
extra in `evaluate`. The positive explicit scenario deadline still contributes
its previous `remaining + .2 s`; it is deliberately distinct from a visible
physical fall. No entry, other down-query, profile, force or solver law changed.
The carrier file SHA is
`9d0ee42f3592a24a2a7fe4d6aeb29c4e0d3b07365cb3dfed5495c86994d5ea5f`.

The new focused file has nine tests: three helper/bounds checks, four controller
checks for hidden-state/visible-picture independence, one positive parking
compatibility check and the retained native OL-context decision. Helper API
tests cannot run unchanged on the baseline because that API is new; an absent
import is not evidence of the forecast defect.

An additional helper-independent executable probe calls the **existing**
evaluator on both sources with held pictures and identical body kinematics.
It checks stale up/hidden fall, stale down/hidden rise and unknown pose/hidden
fall, plus positive parking, on both lateral sides. Original `d087104` passes
2/8 checks (the parking controls); final `09dd62…` passes 8/8. The six baseline
failures are changed forecast scores under identical consumed observations,
not import errors. For example, a held upright picture yields a score of
1.12414 while the hidden body is upright and 0 when it falls in the original;
the repaired score remains 1.12414. These are staged decision invariants,
not native 11v11 trajectories or six independently sampled football errors.

The source-pinned nine-call native collector passes every actual/plain endpoint,
body, tags, minds, joints, perception and next-RNG guard. All nine end naturally.
It retains 25 positive observed recovery allowances and separately labels 31
opportunities where the **old** expression would have been negative; the latter
are not negative production allowances. Maximum momentum residual is
`1.89e-12 kg·yd/s`, work residual `8.82e-12 kg·yd²/s²`, and budget excess
`2.85e-14` native units. Its fixed `1e-6` numerical guard is a consistency check,
not strength calibration. The 33 carrier, boundary, contact-choice and mesh
tests pass, and typecheck passes. Full native/game/pass regression assessment
remains separate in the parent review.

The native IZ/Under/right/seed 3 decision at 3.35 s now selects `-.58125` rad
and no longer classifies every option as blocked using negative fall time.
The same nine-case diagnostic cohort contains an adverse final-yard change
from 5.02 to 4.80 in that call. Grade the corrected inference and achieved
football separately; no parameters were chosen to improve its yardage.

## 2. The crease endpoint still bypasses approach feasibility

**Source-confirmed; broad repair remains withheld.**

`runReadAim` sorts delayed OL/inline-TE observations by lateral position. Its
gap width uses lateral center/radius separation; its entry depth uses the
pair's average depth. It scores a defender's ability to reach the endpoint,
not whether the runner can approach that point through a staggered surface.
Runner arrival is straight distance divided by current speed, with a 2 yd/s
floor. The selected near-line entry then bypasses generic own-blocker lane
evaluation and requests full top speed.

`evaluate` has a separate own-blocker segment test, but its straight sprint
forecast does not execute momentum-limited cuts. It assumes a .70-radius
runner footprint along every tested corridor, while execution uses achieved
elliptical squeeze, heading, a rating-dependent demand and finite posture
response. A narrow endpoint alone does not prove that the requested approach
or predicted shoulder width can be achieved.

The [withheld entry prototype](../../../data/reviews/physics-world/position-technique/rb-entry-unpromoted/README.md)
already investigated a near-face mouth and pacing. Do not repeat its rejected
blanket straight-corridor veto: a bent path to the far crease can be valid.
Before reopening it, align predicted and executed squeeze, exclude loaded or
gripped bodies from free previews, retain a legitimately passable skinny
crease and prove a closing-penetrator escape. Its two zero-contact mirror
tests remained red; changing traction or hiding contact to make them green
would not establish a better decision.

Useful current native contexts are `CA-R1-iz_strong-over-L-S3` and the retained
IZ/Under/right/seed 3 traffic adverse witness. Both use roster 31/32 at .55,
Ace 11, Cover 3, LOS 40, centered ball and first-down marker 50. Their historical
frames are selection aids; reproduce the current first instruction before
claiming an entry collision. Capture raw carrier request, final spaced intent,
chosen pair and observed endpoint, actual squeeze, contact impulses and support.

## 3. Read/tempo depth and mesh are different problems

**Source-confirmed simplifications; not a new physical solver failure.**

`onHandoff` assigns a fixed post-transfer press window based on patience and
lead/puller availability. A clearly closed aim can end it early, but that
update still returns one final aim command; the next tick changes phase. A
temporal motor/tempo law is legitimate, but expiration is not evidence that
the block or opening resolved. Most run families then use the same all-surface
entry search. Duo has a backer read and kick/trap has an offset; IZ/OZ/WZ do
not yet have distinct controlling-block/defender read contracts.

The current mesh is materially safer than the old distant transfer. QB and RB
approach real landmarks, the back brakes after the cadence deadline until
possession actually changes, and `PlaySim.handoff` enforces actual reach and
upright bodies. A toss uses a ball flight rather than a distant handoff.
Native [mesh tests](../../../test/snap-mesh-and-pull.test.ts) retain both directions
and under-center/pistol/gun formations. No new teleport regression was found.

Mesh landmarks and transfer timing remain authored effective assumptions.
Handoff reach is a torso/arm proxy, not an articulated exchange; body facing
is not gaze or a modeled near-arm pocket. Before expanding that detail, measure
mesh position/separation, possession timing, RB velocity at transfer, desired
versus achieved arrival and the blocker-development context. A delayed mesh
caused by a fullback is a real collision witness, not automatically a defect.

The supplied [RB textbook](../../references/Running_Back_Mechanics_Textbook.md),
especially sections 1, 4, 6 and 8–12, supports distinguishing initial track,
read landmark, tempo, entry and final path. Its coaching examples are aids;
they do not make one aiming point or one press duration universal. A small
installation contract is a later controller increment, after the bounded
forecast repair and demonstrated OL behavior.

## Current concept results do not reproduce the old explosive concern

Root's source-pinned `out/run-current-dive/baseline.json.gz` contains 160 natural
finishes, balanced over eight calls, five fronts, both flips and seeds 3/11
on pooled generated roster 31/32. Supplemental roster 41/42 witnesses are
outside that pool. These are explicit controlled Cover 3 calls, not natural
playcalling or NFL concept-rate estimates.

| Call | Snaps | Mean yards | Zero/negative | 10+ yd |
| --- | ---: | ---: | ---: | ---: |
| Inside Zone | 20 | 1.097 | 5 | 0 |
| Outside Zone | 20 | 1.550 | 3 | 0 |
| Wide Zone | 20 | 1.027 | 7 | 0 |
| Power | 20 | .751 | 8 | 0 |
| Counter | 20 | .750 | 6 | 0 |
| Trap | 20 | 1.904 | 5 | 0 |
| Duo | 20 | 1.875 | 2 | 1 |
| Split Zone | 20 | 1.286 | 3 | 0 |

There are no 20-yard runs in this population. Earlier visual concerns about
outside-zone explosives remain valuable contexts, but do not describe this
current fixed panel. Neither this panel nor a few selected touchdown clips
establishes the NFL relationship between outside-zone success and explosions.
Match formation, front, box, count, generated-roster traits, down/distance and
first-contact definitions before comparing tracking/scouting distributions.
Separate successful requests, achieved contact/lanes and final outcome. Do not
tune movement or force to lift the panel's mean yardage.

## Evidence locations and reproducibility

Exploratory output remains ignored under `out/run-carrier-audit/`:

- `pose-cues.ts`, `pose-cues.json`, `pose-cues.log`: baseline native consumed
  cue count; packet SHA `66ee40914ebd4a4fc88c9ffdf679286bc40d9b411606dead3b53a11f58b9f663`.
- `immutable-baseline/`: `git archive d087104` of src, source-version tool and
  package metadata. It prevents the baseline counterfactual from inheriting
  concurrent OL changes. Its packet is
  `out/run-carrier-audit/pose-counterfactual.json` relative to that archive,
  SHA `6e8ccc01a0fdfcea34c373ab0dd938b64f51c434dfbc1e672afacda817535fd4`.
- `pose-counterfactual.ts`, `pose-counterfactual.json`,
  `pose-counterfactual.log`: separately pinned intermediate OL inspection;
  packet SHA `19478ad15a86f096482144fe550eadb4286ecf70fd8362076b0b8d2cf7a2b7ac`.
- `summary.json`: machine-readable counts and pins for those three packets.
- `recovery-mechanism-controls.ts`, `mechanism-baseline.json/.log` and
  `mechanism-current.json/.log`: the helper-independent held-picture checks.
  With `--require-fixed`, the baseline deliberately exits 1 after saving its
  six actual invariant failures; the candidate exits 0. Tool SHA
  `2dfdc33229d1d974f3fddbda1bb8f1b1ffe1aa24f3f6d88514aa77c9f7218524`.
- `carrier-recovery-native.json.gz/.log`: actual candidate nine-call recording
  and receipt, packet SHA
  `5064f13ebeb595b99d6329ff0f09e2dc983c5e70b648ca55863d7134b0dbce49`.
  `carrier-focused-tests.log` retains the 33-test receipt.

The counterfactual tool SHA is
`5f9bc0df063f827628ad6cee2067b1ade1f67b3b61301906a1ada1c58b3d38a7`.
From the selected source root, with pinned Node 22:

```sh
node --import tsx out/run-carrier-audit/pose-cues.ts
node --import tsx out/run-carrier-audit/pose-counterfactual.ts
```

Run only on a frozen source, or from the preserved archive. These scripts
overwrite their exploratory output paths; preserve a reviewed packet before
any further run. They are not published validation commands or production
features. No scratch forecast is an executed football candidate, and no
recording above claims eye tracking or recovery-force calibration.

The reusable production diagnostic requires an explicit source pin and output:

```sh
node --import tsx scripts/diag/carrier-recovery-cue.ts out/NEW-CUE-PACKET.json.gz \
  --expected-source=09dd62c7d7cc5002312e93821ea0bf6f7dea3bb764ff75f509c59ff720e72d62
```

Its collector SHA is
`ccd70466fb2c767b0bf1ceccc4fd0b17215257fb498262373166460f5297a272`.
It records actual native decisions, raw carrier commands, final intents,
achieved movement/support, contact impulses and shared physics budget fields.
It creates no scratch counterfactual or new play selection.
