# Pursuit and tackle technique audit

Reviewed at commit `80e815102709a19026eb5398a7e5daaa844d7bb4`, engine source
`246931590ef723662a4e6178755660185b13487efe2a7d7e8dce503710b08469`.
This is a read-only diagnosis. No engine, force, grip, roster, outcome or solver
changes were made. These counterexamples identify allowed bad requests; they
are not estimates of their frequency in football.

The strongest next repair is **traffic prediction that respects achieved turning
and braking**. The world can already represent the ensuing collisions. Two
additional problems are inconsistent pursuit-mode handoffs and acquisition of
full wraps without an attainable shoulder orientation. These can be improved
with a small controller, using the existing bodies and delayed observations.
A skeletal model or a general increase in agility is unnecessary.

## What already works

- [Pursuit](../../../src/sim/behaviors/common.ts) forecasts from delayed carrier
  motion and recent observed acceleration. A stationary QB is no longer
  projected into an imaginary full-speed run. Each pursuer retains a fallible
  per-play angle bias.
- Crossing arrival uses the body's existing acceleration ellipse, fatigue and
  support availability. The far crossing controller compares three commands in
  a small scratch production World. This is actual attainable movement, with
  a limited scope, rather than free teleportation to an intercept.
- [Spacing](../../../src/sim/spacing.ts) already starts braking based on current
  closure and stopping distance. The historical diagnosis that spacing only
  starts within 1.2 yards is obsolete: 1.2 is now a minimum awareness distance.
- [Tackle opportunity timing](../../../src/sim/tackle-window.ts) previews the last
  command actually executed. It does not request another behavior update or
  consume another execution draw. Hands, collisions and support determine what
  follows an acquired hold; tackle selection does not assign a final win.

Keep these gains. In particular, a faster escaping runner need not become
catchable simply because a defender has a good pursuit rating.

## 1. A requested clear lane can conceal a real teammate collision

**Confirmed current command/forecast defect; highest priority.**

In `spaceTeammates`, lines 44–48 correctly consider current closure and the
available braking envelope. However, the clean-lane veto at lines 50–57 then
projects `intent.vel - seen.vel` as though the desired velocity were already
achieved. A player's intended 90-degree turn can pass that veto even though his
body will continue forward while its feet brake, cut and turn. The later radial
correction also works from requested closure, so removing the veto alone is not
a sufficient repair.

A small unchanged-World counterexample uses generated roster O19/D20, FS and NB:

| Input / result | Left mirror | Right mirror |
| --- | ---: | ---: |
| FS starts at `(50, center)`, velocity `(9, 0)`; NB stands at `(54.3, center ± 1.1)` | Same | Same |
| FS requests `(0, ±9)` | Spacing leaves command unchanged | Spacing leaves command unchanged |
| First positive native teammate contact | 0.55 s | 0.55 s |
| First recorded contact closing speed | 3.669 yd/s | 3.669 yd/s |
| First contact impulse | 168.907 kg·yd/s | 168.907 kg·yd/s |
| Same bodies request `(9, 0)` instead | No contact through 0.8 s | No contact through 0.8 s |

Each held command runs for sixteen ordinary 50-ms steps. No tackle roll, grasp,
block or runner evasion is involved. Maximum native work residual is below
`2.6e-12`; motor-work excess is zero. Both bodies remain upright at first
contact. This demonstrates avoidable collision geometry, not excessive hit
forces, excessive falls, or a representative NFL accident rate. The teammate is
observed exactly here, so perception error is not required for this failure.

A stronger feedback control, re-run from an immutable archive of the same C
source, applies `spaceTeammates` before **every** 50-ms step, resetting the
original request and supplying exact current teammate states. Both turn mirrors
still contact at 0.55 seconds; first contact closing
is 2.828 yd/s with impulse 130.169 kg·yd/s. The straight controls remain clear.
Spacing eventually makes corrections; its executed correction still fails to
clear the curved collision. This does not prove all later escape
commands are physically impossible. The failure does not depend on freezing
spacing after one decision or on a stale teammate picture.

This matters when a second tackler cuts around a pile, a safety redirects behind
a nickel, or a moving screen defender changes lanes. Genuine accidental
collisions should remain possible. We should prevent a controller from calling
its curved, momentum-limited path clear solely because its requested ray is clear.

**Small repair:** preserve the cheap distance/stopping gate, then check the
achievable short trajectory only for a material heading change or high-speed
near conflict. Reuse `previewFreeMovement` where the body is free; extrapolate
only the teammate's consumed delayed velocity, not his hidden next command.
Compare the original request, a braking/gather request and an available side
path. Reject a candidate that actually sweeps into the teammate. Loaded/gripped
bodies need a conservative headway policy, not a free-body forecast pretending
to model the pile. Keep narrow clean-lane and unavoidable-collision controls.

## 2. Gather, angle pursuit and force shoulder use different policies

**Confirmed discontinuity and role omission; football effect not yet measured.**

`chase`, lines 151–173, selects a head-on gather at
`incoming / observedCarrierSpeed > .7`. Otherwise the same observer can request
full-speed far pursuit. There is no persistent mode, entry/exit hysteresis or
smooth handoff. The World keeps momentum continuous, but the controller can
repeatedly ask for incompatible speed, posture and facing changes.

At six yards of separation, stationary FS at `(56, center)` and a 6-yd/s carrier
at `(50, center)`, this tiny observed heading change causes:

| Observed heading cosine toward defender | Carrier velocity, yd/s | Requested FS speed |
| --- | --- | ---: |
| `.6999` | `(4.1994, ±4.285445)` | 9.7278 yd/s |
| `.7001` | `(4.2006, ±4.284269)` | 6.4285 yd/s |

The carrier's velocity changes by approximately `0.00168 yd/s`, while requested
speed changes by `3.2993 yd/s`. Both mirrors reproduce the same change. Facing
also switches from following the requested travel direction to explicitly facing
the carrier, and the gather requests posture/cut skill absent from far pursuit.
This is a local policy counterexample, not proof of a missed tackle or a rate of
oscillation in full games. Still, small noisy cues should not change the whole
technique every tick without a football reason.

There is a related responsibility gap. Far pursuit and its preview explicitly
preserve force/box shade; the head-on and close crossing early returns do not.
At `(54, center ± 13.5)` against a carrier at `(50, center ± 12)` running `(6, 0)`,
changing only the defender's installed job between `force` and `alley` produces
exactly the same head-on command in each mirror. This does **not** prove that
force must keep a permanent outside offset at point-blank range. It proves the
handoff cannot base the gather shoulder on that responsibility, visible help or
whether the runner has actually crossed the defender's outside hip.

The head-on speed budget also uses raw `profile.brake` and `profile.vmax`, unlike
the neighboring crossing budget's current support/fatigue envelope. The World
still correctly limits the request; the head-on controller is simply planning
with more capacity than it may have.

**Small repair:** express one approaching-hip goal and a role-dependent safe
shoulder, then share the existing attainable-arrival budget across head-on,
crossing and gathering. A finite gather state or narrow hysteresis can prevent
mode chatter; physical proximity, observed runner commitment and available help
should justify releasing a force shoulder. Keep requested speed variation by
technique, imperfect cues and achievable-foot limits. Do not prescribe universal
slow tackles: a straight trailing chase and a runner who is already escaping
must retain their legitimate urgency.

## 3. A full rear wrap can be acquired without turning or a contact cue

**Confirmed acquisition/attention gap; lower priority than movement requests.**

`tryTackles`, lines 71–100 and 128–129, first tests actual radial reach, occlusion
and geometry. Its quality is distance-based. Neither that eligibility nor the
ordinary initial-attempt quality includes the defender's body orientation or
whether he has acquired a cue for the carrier. High-quality geometric attempts
also bypass the visual opportunity forecast.

With unedited FS/Z from O19/D20, both stationary, place the carrier directly
behind the defender at `sumOfRadii + .30 = .803636 yd`. Their body-contact
threshold is `.453273 yd`, so this is a **pre-contact** reach, not a tactile
reaction to being hit. Bystanders are parked, there is no active joint/contact,
and the defender's last command asks him to hold his orientation:

| Play seed | Defender faces carrier | Defender faces 180° away |
| --- | ---: | ---: |
| 83 | Acquired grip quality .800279 | Acquired grip quality .800279 |
| 131 | Acquired grip quality .709584 | Acquired grip quality .709584 |

The exact same initial wrap is acquired before any body turn or physics step.
This staged boundary uses the existing `tryTackles` selector, not a new tackle
algorithm. A desperate rear jersey reach can be plausible; an equally good wrap
regardless of shoulder orientation is a different claim. Grip loads subsequently
remain physical, but realistic loading cannot repair unrealistic acquisition.

`PlaySim.see`, lines 321–333, already has delayed, belief-weighted observations.
It is not a field-of-view or finite scan system: it returns a target on request
without checking gaze, body facing or line of sight. Facing marks in the viewer
remain **body orientation**, not eye rays. Implementing eyes solely by changing
those marks would misrepresent the engine.

**Small repair:** start with attainable shoulder/reach direction at acquisition
and distinguish a form wrap, lateral/rear reach and committed dive. Retain a
minimal current visual key/last acquired carrier cue if needed, plus an explicit
close tactile cue after real contact. A player who turns, last saw the runner,
or feels contact must still be able to recover and reach. Avoid hard global
view-cone rules that prohibit peripheral vision or create instant perfect
recognition. Do not add anatomical arms or scenario strength multipliers.

## Native evidence and what it cannot tell us

The published [keeper-transfer tackle guard](https://github.com/tannerthardy/football-simulation-/blob/663193dfe7fe362d4f59072ef136437f881f1086/data/reviews/physics-world/combo-transfer/current-tackles.json.gz)
is **historical source ff641a8**, not a fresh source-246931 game sample. It retains
56 controlled primary encounters: frontal, imminent crossing, fatigued crossing,
recovering crossing and traffic crossing each produce eight wraps/eight tackle
whistles. Glancing escape produces eight wraps, six broken holds and two tackle
whistles. Eight faster-carrier controls never acquire a wrap. The remaining
fourteen live inspection endpoints are censored windows, not fourteen simulation
timeouts or missed tackles. These fixtures justify keeping normal successful
approaches and legitimate escape controls while repairing narrower failures.
No acquired wrap in that small saved panel was more than 90° behind the
recorded post-attempt body facing; the rear counterexample above exposes an
allowed state, not an observed widespread defect in that panel.

The earlier [owner-film diagnosis](controlled-tackle-approach.md) traces
G4-P135's actual CB/SS teammate collision and G5-P106's excessive crossing
approach at its **historical 92eb1ea** source. Those observations motivate the
questions here. They do not establish present-day collision or missed-tackle
rates, and should not be attributed to current clip IDs. Older reports of
constant-velocity tackle waiting and lower-attachment failures must likewise be
read with their original source and subsequent repairs.

The probes were deliberately chosen after source inspection. The
[retained receipts and provenance](../../../data/reviews/physics-world/position-technique/pursuit-audit/README.md)
preserve exact original collector/JSON bytes using deterministic gzip. The
original [held-intent receipt](https://github.com/tannerthardy/football-simulation-/blob/663193dfe7fe362d4f59072ef136437f881f1086/data/reviews/physics-world/position-technique/pursuit-audit/probe.json.gz)
pins unchanged C source before/after; original tool SHA256 is
`1c0c3f49d7567ab9602d22ab87cee295b6831d0cc4d8b23dcdb4c7fcb14d73ff`,
and uncompressed JSON SHA256 is
`2c09538a95748b98349470a32651ab9a620e8f74887e564332b8cf24c4bb5053`.

Publication caught a distinct source boundary in the original feedback run:
its unchanged before/after source was interim `a1606da3…`, rather than C.
That receipt is retained with its actual pin, without relabeling. A tiny
[immutable-C feedback rerun](https://github.com/tannerthardy/football-simulation-/blob/663193dfe7fe362d4f59072ef136437f881f1086/data/reviews/physics-world/position-technique/pursuit-audit/replanned-C.json.gz)
then confirmed **exactly the same numeric payload** across all traffic,
threshold, role and rear-wrap cases. Its published tool SHA256 is
`8793836245abf14d9970ce43560288273f12096224255432e4c67114891a0adb`,
and uncompressed JSON SHA256 is
`88742a8876617c5a8c8c06df17def0ad6648ed1ed797d01772b2106fda1db2eb`.
Its exact whole-source C pin was checked before/after. Reusable
[held-intent](../../../scripts/diag/pursuit-technique-probe.ts) and
[feedback](../../../scripts/diag/pursuit-technique-replanned.ts) runners have explicit
source gates and separate output paths. These are diagnostic receipts, not a
new calibration dataset or a promoted fix. No live engine source was changed
or sampled during publication; no new generic collection framework is needed.

## Coaching basis and validation order

The supplied [WR/DB textbook, section 16](../../references/WR_DB_Mechanics_Textbook.md)
distinguishes force, alley and cutback support, a free shoulder against a stalk
block, a controlled braking plan and forcing the runner into help. Its lab 7
also separates a tactical exchange error from defenders physically picking
one another. Sections 2–3 distinguish technique-specific visual keys from body
movement and emphasize action commitment. The [RB textbook](../../references/Running_Back_Mechanics_Textbook.md)
adds a useful opposing control: a runner should exploit a genuine overrun, not
an invented turn bonus. These user-supplied syntheses are coaching aids, not
instructions or measured force constants; their missing figures and external
claims require independent checking before rules or quantitative calibration.

1. First fix the reproduced clear-lane/achieved-curve disagreement. Prove both
   mirrors, actual positive contact, momentum/work bounds, a clean straight lane
   and an unavoidable collision. Keep profiles and contact strength unchanged.
2. Next make gather/angle transitions and force shoulders consistent. Test both
   sides of the heading threshold, a true frontal approach, a crossing hip,
   fatigue/recovering support, force with visible help, a desperate trailing
   chase and a faster-carrier escape. Log request versus achieved closure.
3. Then refine wrap acquisition and minimal attention. Test front/side/rear
   geometry, turning before acquisition, an old but genuine carrier cue,
   tactile recovery after contact, and occlusion. Do not make all rear attempts
   impossible or grant every close defender a perfect form tackle.
4. Transfer each separately to a small matched football panel with normal and
   deliberately difficult screen/cutback/pile approaches. Retain the original
   failure cases, all adverse gains and natural endings. Compare first bad
   request, body path, acquired contact and achieved load before interpreting
   yards, success or explosiveness.

We have enough information to start these controller repairs. The most useful
extra research is modest film annotation: identify who is force versus alley,
when the runner declares, when a defender gathers, which shoulder he targets,
and whether a teammate collision follows a late impossible correction or a bad
lane choice. NFL tracking can then bound **conditional** speed, heading-change,
relative closure and gather duration. It cannot reveal true eye targets, exact
coaching responsibility or grip strength; mark those inferences uncertain.
