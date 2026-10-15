# A020/A044 mesh command attribution

**Decision: submit the passive diagnostic for review; reject the tested bend
behavior.** The stop producer is established. A successful coverage/spacing
correction is not. No production football behavior or physics changes in this
candidate. Broad RB-jam work and #76 remain parked and unchanged.

Implementation: **4fe2342a4053e39b018e6b304a5f7ed120357e65**, branch
`codex/mesh-command-attribution`, based on accepted
**90edc52530caa71efdebf257f17d954a8a629ea0**.
Diagnostic source SHA256:
`426135d5e19ea013f73b99244d33fbd64bfed6ba426d0704e5eb561234dc0d6b`.
The following evidence commit contains this report, research-only interventions,
and the full focused packet. Integration owns combined verification/adoption.

## Source and evidence compatibility

Reused Measurement's published selected windows at
[c98f10a](https://github.com/tannerthardy/football-simulation-/commit/c98f10a898bece24ed8e5d67c98c5abdb09c5657).
The retained `flex-windows.json.gz` bytes have SHA256
`11637c8ff81b32b06faa21f87995fc870e37ff089d4f03496717856b5eb05191`.
Their original runtime is8ca8dee, sourcef56a2156; the original raw case hashes,
complete setups/initial installation/identities and events remain attached.
These windows are a selected extract, not the complete original raw files or a
new48-play panel. The original archive's separate distribution issue does not
prevent this focused comparison.

Current accepted-source captures match **3,674 actor-frames /167 frames** across
all22 actors in all four saved windows: positions at stored0.1-yard precision,
achieved velocities and final velocity requests at stored0.01yd/s precision,
plus all interior original event objects. This establishes compatibility within
the checked windows, not bit-exact unrecorded state or universal #78 equivalence.
[Machine comparison and file hashes](../../data/reviews/current/mesh-command-attribution/review.json).

Native frame t labels the enclosing tick after its physics. The new stage event
clock is the decision tick; paired tick records separately give t and after=t+.05.
Use recorded body velocity, not derivatives of rounded positions. No cue age is
added a second time to an already dead-reckoned `see` result.

## Attribution

| Witness | Original objective and actual information | Producer and achieved movement |
| --- | --- | --- |
| A020 | SS21/S74D-CB4 owns H10/S74O-WR2 in man. At2.25, consumed processed H picture is(40.309,28.998), velocity(1.119,-6.217), age.25s; inside-shade target(40.309,28.298). `track` requests(-1.981,-9.337). LB_M15/S74D-LB1 owns match robber and squeezes H's throwing lane, not an accidental new run assignment. | Containment, engagement and bond leave SS's request unchanged. **Spacing chooses(0,0) at2.25,2.30,2.35,2.40** via its curved-motion gather. SS still moves: native post-tick vy declines-4.565→-3.606yd/s; no SS contact causes this slowdown. |
| A044 | SS21/S69D-S1 owns H10/S69O-WR3. At2.25 its unrecognized-throw carry requests(-1.414,-9.345); spacing halves it. SS subsequently drives the observed H catch window. LB_M15/S69D-LB1 keeps its acquired H robber lane through2.55 and recognizes flight at2.60. H cue ages are.20s for SS and.25s for robber; peer pictures are.05s. | At2.55 the existing moving-catch approach changes(-2.567,-6.702) to(-2.223,-9.179); containment/contact/bond retain that; spacing changes it to(-3.915,-2.800). Actual SS velocity remains(-.517,-5.822). The2.70 native tick has the actual15/21 collision: closing3.495yd/s, impulse173.922; SS vy-5.184 before→-3.064 after. |
| A008 | Actual catcher is Y7/S30O-TE2. Intended H10/S30O-WR1 remains a different identity. NB19/S30D-CB3 carries Y's acquired movement. | At2.40 track requests(-.108,5.468), unchanged through spacing. Y catches and NB wraps at2.45; tackle3.35. Useful in-phase defense is retained. |
| A032 | Y7/S88O-TE1 is both intended and actual catcher. NB19/S88D-S2 carries Y. | At2.40 track requests(1.306,1.791), unchanged through spacing. Catch/NB wrap2.80, LB_M assist3.60, tackle4.30. A nearby SS/robber interaction does not invalidate this useful catch defense. |

The robber's prethrow lane comes from the current underneath match branch:
processed observed H, QB-to-H lane, zone landmark/radius and scaled H velocity
(.5vx,.8vy). It does not simply inherit SS's target point. Installed responsibility,
recognized flight and physical arrival are distinct. Both defenders' requested
motion toward negative y can coexist with achieved motion still converging.

Existing zone code also uses live QB position/`qbEyes` for its lane/score. This
pass neither repairs nor certifies that existing information boundary. The local
alternative consumes only the existing command, actor's own physical state and
the already acquired teammate pictures; it adds no receiver/peer query, route
knowledge, target identity, recognition shortcut or private peer movement.

## Same-state achievable alternatives and short coupled trial

At A0202.25, reuse **the identical own body/support state** and all ten consumed
teammate pictures. The nearest risk is the acquired robber, not an unseen player:
position(42.871,27.397), velocity(-1.401,.651), age.05s, versus own
position(42.134,30.444), velocity(.018,-4.885). No called-motion override exists
for this peer. Over the existing.6s free-motion forecast:

| Request | Minimum predicted torso clearance | Progress along original request |
| --- | ---: | ---: |
| Original carry | -.276yd | 3.465yd |
| Half speed | -.075yd | 2.864yd |
| Zero/gather | +.390yd | 1.740yd |
|30-degree bend away from acquired peer | +.154yd | 3.332yd |

Thus the stop has a real predicted obstruction behind it; it is not proof that
man coverage forgot H. A small achievable bend exists under that peer forecast,
which justified a **research-only** coupled probe, not automatic promotion.
The robber's actual baseline location deviates about.390yd from the2.25
constant-velocity forecast only.3s later. This explains uncertainty in that
forecast; it does not establish that a runner/defender must await a guaranteed
clear full route, or that the forecast itself forced the final collision.

The probe rotates the existing request30 degrees away from the earliest/worst
predicted peer conflict, preserving skill/facing and the football objective. It
uses the unchanged World, ordinary collisions/radii and only the existing peer
pictures. It admits a candidate only when all ten predicted peer paths clear,
support stays up and its local progress comparison admits it. It excludes own
contact/loads/joints/down/dive and leaves all other players naturally reacting.
No coverage/spacing production policy contains this probe.

The first probe had a **research-selector error**: a clear bend lost to an unsafe
straight request's higher forecast progress. One2.75s A044 capture identified it;
its adverse result is preserved (`bend-v1`, `failed-transition`): A044 contact
moves to2.65 with impulse225.410/closing4.404. One corrected
comparison prefers a clear bend over an unsafe chosen request, keeping the same
angle, physics and inputs (`bend-v2`). Baseline arms and the unchanged A008 control
were reused. There was no angle, body-size, reaction or clearance-margin sweep.

| Case | Accepted current source | Corrected research bend / adverse result |
| --- | --- | --- |
| A020 | Zero requests2.25–2.40; H/SS gap4.608yd at native catch frame3.35. | Zero requests shift to2.35–2.45. Gap briefly improves at2.40(2.758→2.526yd) but worsens by catch(4.843yd) and3.70(4.918→5.346). H's throw/catch unchanged; no new15/21 collision. No durable coverage improvement. |
| A044 |15/21 contact at2.70, impulse173.922, closing3.495. Z9/CB_S17 physical `block_contact`5.05. | Contact remains2.70 and is **stronger**:191.556, closing3.835. H/SS gap at2.90 improves3.109→2.770yd but5.00 worsens5.314→6.855. Z/CB_S physical block event remains5.05. No receiver contact within5.60; touchdown attribution untested. |
| A008 | Y catch/wrap2.45, tackle3.35. | No probe changes; all recorded ticks/events/RNG identical. |
| A032 | Y catch/wrap2.80, assist3.60, tackle4.30. | Initial NB defense remains identical through catch. SS changes alter the coupled support: assist3.65/tackle4.20; first SS/robber impact3.70/109.360 versus3.80/89.464. Earlier tackle alone does not erase the extra contact cost. |

## First demonstrated remaining cause and next concrete correction

In the corrected A044 trial, **2.35 is the first skipped useful bend** after
changes2.20/2.25/2.30. Requested-turn measure
`abs(request x ownVelocity)/ownSpeed` falls to **.874966**, below the existing1
shortcut, so both the existing gather preview and the probe skip it. From that
**same2.35 state**, original/half/gather free previews have clearances
-.068/-.079/-.323yd; continuing the same30-degree bend gives+.150yd and3.732yd
progress versus original3.854. All candidate trajectories remain subject to
existing momentum and support. At2.40 turn measure.968844 still skips; by2.55
even the bend forecast overlaps(-.216yd). This is a request-geometry eligibility
limitation, not evidence that a new request instantly changes achieved direction.

A next bounded correction should replace the requested-turn shortcut with the
existing attainable-motion/near-peer tube admission, and evaluate a modest
local continuation before releasing it to an already forecast-conflicting
original. Preserve own contact exclusions and the football objective. **Do not
lower a threshold until A044 succeeds.** That correction has not been executed
in a coupled play here; the current failed results do not certify its benefit.
Do not promote the tested bend, demand zero teammate contact, or attribute the
original touchdown to the collision. No new route selection, receiver handoff,
recognition timing, jukes, stepping, body-width changes or stronger physics are
justified by these results.

## Portable observer, verification and ownership

`observeCommands(sim, selectedActors, sink)` captures detached existing values:
consumed `see` results, processed man picture, helper targets/feed-forward
velocity, direct catch-drive original/refined request, raw behavior,
containment, engagement, bond, spacing and world input/own body. The spacing
callback separately preserves observed versus installed-called-motion pictures.
No second behavior evaluation, new perception/recognition call, random draw or
counterfactual calculation occurs in the observer. The offline/probe scripts
are separate opt-in research, not recorder work or normal execution.

Three focused tests pass: no default payload inspection, detached nested payloads,
and actor/replacement-registration lifecycle. Four exact observer-off/on pairs
match complete recorded trajectory/events/minds/intents/bodies/main RNG digest,
all-stream random-draw counts and perception-call counts. The final typecheck
passes. One earlier research-script typecheck failed on readonly/optional World
inputs; its receipt is retained. The fix uses the actual mutable simulator
command array with an identity assertion and nullable-input guard; no calculation
or observed execution changed. No full suite/game/panel campaign was run.

Recorded launcher cost **45.103s total**, including initial and final typechecks,
the failed research typecheck, focused tests, all native runs and repeated
portable offline reductions. Native capture/continuation launchers total**7.617s**;
20 native executions, max5.60 simulation seconds each, zero full games/new
rosters/seeds. Offline forecast timing is separately retained; no runtime speed
claim is made. Git/file checks and evidence reduction are not simulation cost.

Coverage ownership coordination:
[Catching scope](https://github.com/tannerthardy/football-simulation-/pull/75#issuecomment-6203310880),
[attribution/probe boundary](https://github.com/tannerthardy/football-simulation-/pull/75#issuecomment-6203420541),
[Run helper notice](https://github.com/tannerthardy/football-simulation-/pull/69#issuecomment-6203428711).
Catching's `CoverageDefender.update`/keyed-fit work and #75 disposition remain
separate. The only defense.ts changes here are passive observation calls in man
picture/catch-drive, with unchanged return calculations. Spacing, assign,
recognition, run navigation, PassProtector, physics and flags are unchanged.

To inspect without simulations:

```sh
python3 scripts/diag/mesh-attribution-review.py data/reviews/current/mesh-command-attribution
```

For Run to reuse the observer, register its actors in the named diagnostic and
remove the registration afterward. Existing helper/pipeline stages are enough
to separate a run objective from spacing/contact refinements; do not evaluate a
behavior again or treat a final request as its original producer. This is a
focused instrumentation candidate, not a general coverage-motion framework.
