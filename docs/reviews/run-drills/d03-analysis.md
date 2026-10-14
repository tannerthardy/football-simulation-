# D03: runner picture, movement and arrival after the parked TE base action

**The first changed RB request is defensible from the acquired front geometry.**
At the1.60 handoff, the runner is still pressing the ordinary live D-gap aim;
there is no newly selected inside cut. The edge reference moves only
−.0317183yd and changes the requested heading by−.338293°. The larger immediate
movement difference comes from an existing RT teammate-spacing constraint:
the saved accepted RT picture alone exactly reproduces the entire RB command
reduction, while the candidate's complete recorded teammate picture produces
no reduction. The candidate then reaches the second level substantially sooner.

This establishes a coupled **blocking surface → information → spacing → arrival**
mechanism. It does not establish a bad RB decision, an unsafe spacing rule, or
that a different runner route was achievable. Later lane scores, selected entry
points and carrier/mind state were not saved; a complete assessment of those
reads is blocked by missing observations, not answered by final rushing gain.
The TE proposal stays parked. No controller or physics change is proposed here.

## Pins, responsibility and source

Both saved packets run unchanged accepted source
`e5c318a1082c3738b9782107fa9faec67ada38b02245d1a529af4adaf6825c54`
from`develop a1b16e666a9ee7d1bc1d2aecba141fc535863b24`, with all44 accepted flags,
components1, center/centered hands and legacy/mean support. The exact resolved
flags are copied into the overlay. Historical`4ded6b6` is a separate comparison,
not either of these recorded histories. The production angular-law caveat
remains; D03 does not certify that solver.

- Reference packet: `data/reviews/current/ace-production-observations.json.gz`,
  SHA256`ad462904b23c6864d902107f6a0aa3a876b4e35d3247db8dfaebb835276ae10b`,
  original collector`ac6f663f958f4d59cb0f3e0e9d25c84e1c06dd79`.
- Parked base-action packet: `out/te-base-production/native.json.gz` from PR #28,
  SHA256`57a4245ec6ebf2392398fe3d5a5ebc5429ebef835d8269c29a77037174e151d7`,
  producer`bea6d6299e682487e2b0a6ea8158d99f5bdabcf9`, manifest
  SHA256`208591ab3410c8d565a84d5b50199fe4b2b5610a8be8dc6425e5031766a73588`.
- Both use seed3, offense roster seed31, defense32, strength.55, Over/Cover3,
  LOS40, ballY26.6666667, `ace_12`, strong wide zone, flipfalse. The named RB
  is Bryce Lockett; his capabilities and installed responsibilities are unchanged.

RB owns the live D-gap press and subsequent personally perceived crease/lane
selection. Y/RT own DE_S until the earned Y→LB_S departure; C/LG initially own
DT_W with conditional C→LB_M work. LB_M is assigned, not deliberately free.
An assigned or loaded defender can still gain runner access. D01 and D02 own
the separate block placement/contact decompositions.

`RUN_READ=0` disables the experimental keyed zone-read branch
([carrier.ts](../../../src/sim/behaviors/carrier.ts#L140)); it does not disable
`liveAim()` or ordinary perceived-crease selection. The designed press updates
its aim every tick at lines154–194. Early assessment is beat-limited at
lines160–163. Post-design selection is at lines207–218 and uses
`runReadAim()` at lines66–111. It is inaccurate to label this executed history
as the experimental bend/bang/bounce keyed read.

## First decisive interval:1.60–1.65

Handoff is declared at controller entry1.60. The pre-World RB is identical in
both cases: (36.1170287622,23.2662189840). Both return the same designed press
speed6.24676854yd/s, with unchanged cutSkill1.0892857143. The observed offensive
picture is.05s old; opponent pictures used by the ordinary designed assessment
have longer age. Body facing is recorded orientation, not proven gaze.

| Acquired edge information / command | Accepted Y | Parked Y-base |
| --- | ---: | ---: |
| .05s picture Y lateral position | 21.9856754999 | 22.2311303010 |
| .05s picture RT lateral position | 22.3855254632 | 21.9539572022 |
| Relevant outside bound | Y | RT |
| Source-reconstructed D-edge aim y | 21.2856754999 | 21.2539572022 |
| Raw requested heading | −23.8354865° | −24.1737800° |
| Raw requested velocity | (5.71397887,−2.52439354) | (5.69897449,−2.55808658) |
| Final World movement target | (3.96642185,−2.10792642) | (5.69897449,−2.55808658) |
| Achieved post-World velocity | (4.02435539,−1.80141484) | (4.09543242,−1.80268611) |

`PlaySim.see()` gives all teammates the same.05s channel
([playsim.ts](../../../src/sim/playsim.ts#L323)); `PerceptionBuffer` applies
the stored old velocity to that old picture. The accepted published reducer
omits RB's actual picture values but retains the identical channel pictures
consumed by other offensive observers and RB's original call counts. The
overlay labels the accepted aim as **edge-only source reconstruction**:
the complete RB surface/read is unavailable. It does not claim to recover all
seven accepted surface bodies. The relevant Y/RT pictures are retained actual
values, not positions guessed from RB velocity. Their edge reconstruction
independently reproduces the recorded heading to <1e−12°.

The candidate saves all seven actual RB surface pictures. Reapplying the
existing surface/departure rule to those saved values gives three negative-y
surface bodies; RT is now outermost. The installed snap D offset is zero, and
`gapIn()` puts D.7yd outside the third body
([live-gaps.ts](../../../src/sim/live-gaps.ts#L109)). Candidate full-picture
reconstruction independently reproduces its recorded heading to <1e−12°.
Neither arm requests extra perception or changes the information delivered
in the actual histories.

## The large first movement change is a spacing threshold

The existing spacing rule gates nearby peers using current closing momentum
and braking distance, then limits planned closing relative to the observed
peer ([spacing.ts](../../../src/sim/spacing.ts#L125)). At1.60 the unchanged
rule sees these different RT pictures:

| RB→RT spacing arithmetic | Accepted Y | Parked Y-base |
| --- | ---: | ---: |
| Headway after body touch radius | 3.2221925016yd | 3.1120476227yd |
| Current relative closing speed | 4.8872310893yd/s | 4.2829178010yd/s |
| Existing stopping budget | 3.2412873232yd | 2.6481427130yd |
| Peer inside current stopping gate | Yes | No |
| Requested relative closing speed | 6.6650995415yd/s | 6.1274260257yd/s |
| Radial allowed closing if evaluated | 4.8686028406yd/s | 4.7601497112yd/s |
| Applied radial reduction | 1.7964967008yd/s | 0 |

The accepted headway falls just.0190948yd inside the current stopping gate;
the candidate lies outside its gate. The candidate's unchecked planned closing
also exceeds the radial allowance, but the rule intentionally checks the
current-momentum gate first. This identifies the implemented threshold
mechanism; it does not prove that the following real20Hz spacing action or
body motion is unsafe. Investigating that separate shared movement contract
would need its own acquired-picture/current-momentum opposing control.

The diagnostic calls only the existing pure `followAccel()` and support
availability functions, then reproduces the existing radial arithmetic.
The saved accepted RT picture alone yields the exact final World target;
all candidate teammate pictures yield its exact unchanged target. Maximum
error is **zero**. The curved gather gate does not execute here because the
post-radial cross-heading request is below its1yd/s trigger in both arms
(.644395/.482932). Neither speed cap alters the reconstructed result.

The accepted reducer omits some other-peer picture values. Exact reproduction
shows RT is sufficient to explain the entire amendment; it does not certify
every omitted peer was inactive in the original fold. This is a pure arithmetic
witness, not a replay, a contact-free physical forecast or permission to bypass
teammate traffic. No handover or active-hand controller is implicated.

## Later reads and momentum: timing changes at least as much as lateral path

The original assessment call counts retain designed evaluation beats1.60,
1.80,2.00,2.20. Both runners still request the same press speed through2.25
and switch to max-speed requests at2.30. That agrees with the installed
nominal deadline2.297959s derived from the unchanged handoff and patience
([assign.ts](../../../src/sim/assign.ts#L295)). There is no earlier executed
abandonment visible in either movement history. The exact internal
`aimUntil`, abandonment score and `decisionInterval` snapshots were not saved.

| Entry → completed boundary | Accepted raw heading | Candidate raw heading | Candidate minus accepted achieved position (x,y) |
| --- | ---: | ---: | ---: |
| 1.60→1.65 | −23.835° | −24.174° | (+.00178,−.00003)yd |
| 1.80→1.85 | −24.873° | −27.002° | (+.13524,−.01382)yd |
| 2.00→2.05 | −26.501° | −29.868° | (+.28120,−.08822)yd |
| 2.25→2.30 | −31.095° | −37.089° | (+.34931,−.14474)yd |
| 2.30→2.35 | −.250° | +.998° | (+.35597,−.15667)yd |
| 2.50→2.55 | +28.001° | +4.511° | (+.52045,−.12843)yd |
| 2.75→2.80 | −3.126° | −54.015° | (+.72645,−.20020)yd |
| 3.00→3.05 | −47.921° | −69.341° | (+1.02009,−.10540)yd |

A requested heading is not an achieved lane. At2.50, the accepted positive-y
request (8.3984,+4.4656) becomes final(.7330,+.6843) and achieves velocity
(1.3475,−1.4755); it does not instantly execute the suggested bounce. The
candidate's request is nearly downfield (9.4824,+.7480), its final target is
(4.7740,−4.3101), and actual velocity is(2.5842,−1.6528). These material
command/execution differences remain visible in the overlay.

At3.00 the candidate has momentum heading−29.043°, speed2.7110yd/s. It asks
for−69.341°, but the completed step achieves only−33.931°, while LB_M acquires
runner grasp in the same3.00–3.05 interval. The actually consumed LB picture
is.30s old: position(40.5378,21.6714), velocity(−1.0841,−1.8997), upright.
Its actual pre-World position is(40.6599,21.5507), so the predictor is.1221yd
backfield and.1207yd toward the interior relative to truth. The runner's
negative-y request is consistent with trying to evade that threat, but an
attainable earlier escape cannot be inferred from this one requested angle.
The profile's existing finite acceleration, cut and turn limits still apply.

The candidate arrives **1.0201yd farther downfield** at this interval while
its lateral separation from the reference is only.1054yd. C acquires LB_M
earlier, yet the runner also arrives earlier and on a different timetable.
Do not reduce the ending to "he chose the wrong inside lane" or "the center
needed stronger hands." The loaded-but-open path belongs to D02.

For timestamp correctness: accepted C→LB_M `block_contact` is labeled2.75
(World interval2.70–2.75); candidate is labeled2.60 (2.55–2.60). Carrier-contact
labels use controller entry instead. Accepted first contact is CB_S at3.65,
after crossing3.60; candidate first contact is LB_M at3.00, before crossing3.10.
Both reach natural endings. The earlier C collection does not prove earlier
protection, and preserving original yardage is not the test target.

## Verdict and next owner question

The initial live-aim response follows available offensive geometry. Its
larger effect on arrival is reproducibly coupled to a different RT spacing
picture. No new inside-read decision, information violation or RB capability
change is demonstrated at that first interval. Later finite-beat reads do
change; their exact scoring and selected entries cannot be judged from the
published snapshot subset. A coherent defensive win is possible, while
contact-law validity and blocker leverage remain separate owner questions.

**Do not patch the runner from this evidence.** The minimal future read-only
capture, if a later decision truly changes the next choice, would preserve
the original source, capabilities and requests while recording existing
`runReadObservers` outputs, `BallCarrier.opts/heading/nextEval`, runner Mind
and exact consumed pictures at the2.30/2.50/2.75/3.00 beats. Existing passive
observer hooks cover carrier start, entry candidates and returned command;
abandonment scoring is not currently emitted. Do not substitute a hypothetical
picture or force the old runner path and call it an actual football control.
No extra native snap is requested for this completed drill checkpoint.

The overlay retains unmodified accepted Y/H-strong/weak and both parked Y/weak
candidate outcomes. The old unsafe early-release control remains withdrawn
and untouched; no release timer is introduced. Historical RT joining mismatch
and parked lateral tracking remain separate issues.

## Reproduce and cost

```sh
python3 scripts/diag/zone/d03-drill-analysis.py \
  --reference data/reviews/current/ace-production-observations.json.gz \
  --candidate /path/to/PR28/native.json.gz \
  --output out/run-drills/d03-overlay.json
```

The script checks packet compatibility, exact flags, observed surface ages,
independent first-heading reproduction, and exact saved World-target agreement.
It imports no simulation or World module. Analysis script SHA256 is
`20cb41f1588fd9420a49ac272b5301e7686f5e2da1b51e2ada8e4d39d6f931be`;
it was executed atop drill branch`e21bbfee29b11950b72235079faf285decb85e06`
against the immutable input/source pins above. Final offline analysis took**.870s**,
including**.155s** for the pure support/braking helpers. **Zero new World steps,
snaps or games.** The initial reducer development encountered an omitted final
dead-ball `carrier` field; it now preserves null instead of assuming a holder.
That was an analysis-schema error, not a failed native physical continuation.
No `src`, roster, contact capacity, movement policy or input history changed.

The root owner will package the overlay in a user-accessible visual download;
the ignored local output path alone is not the delivery artifact.
