# One-time run-game drills: D01–D03

[Download the interactive overlay and portable witnesses](https://github.com/tannerthardy/football-simulation-/blob/codex/run-diagnostic-drills/docs/reviews/assets/run-drills-d01-d03.zip?raw=true).
Extract the ZIP and open `index.html` in a browser. The viewer works offline,
with no server or repository checkout. JSON/Markdown evidence is included.

This completes the user's one-time drill request. It is an explanation of the
three saved encounters, not another controller trial or a replacement for
`docs/TESTING_COSTS.md`. The TE-base action remains parked. Accepted `develop`
was refreshed and remains `a1b16e666a9ee7d1bc1d2aecba141fc535863b24`, source
`e5c318a1082c3738b9782107fa9faec67ada38b02245d1a529af4adaf6825c54`, all44 flags
with components1, center/centered hands and legacy/mean support. Historical
`4ded6b6` and the withdrawn early-release control stay separate.

## Three explanations

| Drill / first decisive observation | Actual mechanism | What is established / still unknown |
| --- | --- | --- |
| D01 accepted H, 2.55–2.65 | RT requests backfield recovery, but real RB traffic changes its final movement request. RT keeps moving upfield while DE works around its shoulder and RB closes. The positional screen disappears before body contact2.65–2.70; hands are still loaded. | DE's side follows its .30-old acquired runner picture; RT does request recovery. Neither a wrong-side command nor missing effort is demonstrated. Whether a safe loaded recovery route existed remains unresolved. |
| D02 parked Y intervention, acquisition2.55–2.60 | C acquires LB_M from the far side of the runner corridor. At arrival LB is between C and RB despite mean normal946.56/lateral586.02. LB_M also collides with LB_S; this is a coupled encounter. | The exposed corridor is demonstrated in this intervention. It is not proof of a baseline C defect. Whether continuing the observed shoulder approach before acquisition was attainable and useful remains unresolved. |
| D03 first RB request1.60–1.65 | The acquired outermost edge switches Y→RT, shifting live aim by−.0317183yd. Both ask the same designed press speed. Different observed RT motion/headway makes the existing spacing rule slow accepted RB but leave the trial request intact; arrival then advances. | The initial response is defensible from available information. It is not a new inside-cut decision. Later exact lane scores/selected entries were not stored, so those decisions cannot yet be judged. |

### D01: traffic constrains a real recovery attempt

At2.35 RT's raw contact request is(−.896233,−1.468630)yd/s. Its .05-old RB
picture makes requested closure3.499732, above allowed1.744456. The full native
spacing fold produces(+.810634,−1.878018), matching to2.70e-15. DE's working-off
request(−2.624660,−.771769) follows its actually consumed .30-old RB picture and
is unchanged by spacing. RT is upright, facing the end and loaded; this is not
the historical helper-reach loss.

The successful accepted Y control also experiences RB spacing and an opened
nominal direct ray. DE even has a recorded missed tackle opportunity there.
Thus neither removing spacing nor declaring every open ray a blocking defect
would preserve the control's actual football logic. A nominal ray measures
geometry; it is not an earliest physically feasible intercept or a loaded
trajectory forecast. Captured H bodies have zero squeeze, validating its
circular footprint calculation, without certifying contact-law correctness.

[D01 explanation](d01-analysis.md) and [full-context portable input](d01-witness.json).
The input preserves all22 pre/post bodies, actual joint inputs/outputs, queued
strikes, requests, consumed cues and relevant phase/write provenance. It removes
no teammate and injects no future runner path. Known center-hand angular
accounting remains with Physics; no lawful-outcome certificate is claimed.

### D02: earlier, stronger contact can still expose the route

C/LG's down-defender work and C's1.20 departure remain installed. C's first
candidate hand interval is2.55–2.60, with a .25-old LB picture and .05-old RB
picture. When LB grasps the runner over3.00–3.05, C's geometric projection on
the LB→RB segment is negative: C is behind the tackler relative to the back.
The delivered hand impulse remains substantial47.3278 normal/29.3011 lateral.

The recorded LB_M/LB_S collision over2.85–2.90 delivers122.36kg·yd/s and reduces
LB_M's support availability. A three-body miniature would discard that cause.
The descriptive opposite-corridor contrast illustrates leverage, but it is
not an executable runner cut or a legitimate alternative football decision.

The reference C/LB `block_contact` event is **2.75**, from World interval
**2.70–2.75**. This corrects PR #28's prose that called2.70 the event time;
the underlying saved data and earlier-acquisition conclusion are unchanged.
The candidate event is2.60, from2.55–2.60. Carrier-contact event labels instead
use controller entry, so candidate label3.00 belongs to3.00–3.05.

[D02 explanation](d02-analysis.md) and [descriptive witness](d02-witness.json).
Acquisition before `plannedClimb` is a precise run-game question, not a proven
error or authorization for a new gate, planner, stronger hands or release timer.
Different timed hand acquisitions have different execution outcomes; their
capacities are not mislabeled as identical random draws.

### D03: geometry and spacing change the timetable

At handoff, reconstructed accepted relevant edge aim is y21.2856755; candidate
actual consumed surface gives y21.2539572. Requested heading shifts only−.3383°.
The accepted RT picture alone exactly reproduces RB's final(3.966422,−2.107926)
request; the candidate's complete teammate picture leaves(5.698974,−2.558087)
unchanged. This is the same rule acting on different relative motion and
stopping headway, not a new runner policy or a demonstrated spacing defect.

By3.00–3.05 the candidate is1.0201yd farther downfield but only.1054yd displaced
laterally from accepted RB. It encounters LB_M before crossing. The initial
read is a reasonable live-front response; later choice quality cannot be
inferred from requested angles, achieved trajectory or final gain alone.
Actual momentum limits the3.00 evasive request, and missing exact assessment
scores leave one specific later-read question open.

[D03 explanation](d03-analysis.md). The interactive overlay uses recorded
positions and requests. Omitted reference actors/cue values are marked missing;
it does not interpolate a fictional blocking surface or provide a forced path.

## Evidence and cost

The shared PR #26 reference and complete parked PR #28 packet were reused.
Saved H omitted opponent picture values and complete dynamic World input,
so the **one** targeted native continuation reconstructed its original source
through2.70 and captured2.20–2.70 with every player present. All54 full state/RNG
hashes match the shared history. It reaches a declared diagnostic boundary;
the original natural H ending is reused, not rerun. No physical counterfactual,
reduced simulation, new full game, roster panel or extra native case was run.

Native capture/internal calculation.817s; exact wrapped native/typecheck times
and offline reduction costs are in [the receipt](receipt.json). Focused numeric
reduction checks and typecheck pass. Work/budget and source compatibility do
not certify the existing center angular law. The visual gets syntax/data/archive
checks; browser rendering is reported separately.

An additional zero-simulation reduction checks the captured reports: maximum
work residual7.16e-12, no arm/support budget excess, finite posture adjustment,
and whole22-body linear impulse closure6.07e-13. Reproduce with
`python3 scripts/diag/zone/run-drills-checks.py`; it does not certify angular
accounting or an alternative interception route.

## Disposition and owners

No controller correction is demonstrated by this pass. Keep all successful,
adverse and inconclusive evidence. Physics receives the coupled current H input
and the contact-law limitation. Shared movement/Pursuit receives exact
information-bound spacing composition, with no request to bypass traffic.
Integration receives the pins/settings/artifacts and has no production candidate
to combine or full suite to repeat. The run-game owner retains the compatibility
questions between achievable blocker position and the runner's acquired route.

This closes D01–D03. It adds no further drill assignment, changes no solver,
movement, capacities, roster, defaults or baseline, and does not restart the
parked posture proposal. Future work follows the shared testing policy.
