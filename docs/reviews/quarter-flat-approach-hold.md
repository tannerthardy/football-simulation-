# Quarters approach investigation — HOLD

2026-10-17 UTC. **Do not integrate the cushion/objective changes in this
research branch.** Latest research code `2ba3871c6cfe8fb114b614167a5b3452914e89a6`,
source `ff9504ed96ddd4f8fadeb336e8eb15185c096bbc6529dec5243fa14bceb548a5`, on
accepted `70b4db6a3ef53acc1a0e90cd055f1087205daa30` / source
`9513511efacc10721f8ed2cc8553ef96d7b95a5b51217b8f4c6339533b504941`.
The separate force-continuity extraction must carry none of these movement,
option, type or directive-key changes.

## Football finding

Retaining #2's flat/wheel responsibility, accepted through #124/#125, exposes
a real technique conflict. Ordinary over-top man tracking compresses its
prethrow cushion toward the flat's low hip. Preserving more depth improves
wheel leverage but can make the defender late to a short catch, arriving with
a marginal reach instead of a successful wrap. More cushion is not a general
YAC repair.

The source teaching HNFL-078/196/312 says widen from above, alert the wheel,
and avoid early overcommitment/late overcompensation. It does not prescribe a
permanent field-x plane. Originals and provenance remain pinned in the
[teaching audit](https://github.com/tannerthardy/football-simulation-/blob/9f2206a3fd22aab83b19a0431346c7569ed19f7b/docs/reviews/honest-nfl-coverage-teaching.md).

Two approaches were tested without changing physics, capacities, speed,
braking, grip laws or helper policy:

- **Fixed entry plane:** preserve own entry depth while widening. Inspection
  found an inconsistent receiver x feed-forward on the fixed plane; zeroing
  that component made the request coherent but surrendered some useful wheel
  momentum. The ordinary swing worsened from0.59 to about6.6 YAC.
- **Existing moving release cushion:** retain the already computed acquired
  entry cushion and its observed-depth compression, with consistent target
  velocity. No new coefficients, timer or future-route branch. Wheel leverage
  improves; the same swing worsens to12.99 YAC. This remains HOLD.

Examples at2.95 controller time /3.00 achieved time for the final moving arm:

| Witness | Accepted → research depth above receiver (yd) | Gap (yd) | Forward velocity (yd/s) |
| --- | ---: | ---: | ---: |
| Mirrored wheel | −1.61 → +1.63 | 1.63 →1.76 | 4.50 →3.17 |
| Fresh players/seed | −1.26 →+2.03 | 1.40 →2.21 | 3.90 →3.10 |
| Fresh routes/other hash | −1.97 →+1.17 | 2.17 →1.52 | 4.03 →3.71 |

The receiver bodies are identical at these sampled times. Greater gap and
lower forward speed remain visible; depth alone is not a coverage verdict.
Original QW changes QB choice and later receiver motion, so its later geometry
is not treated as matched. Six controls retain exact physical signatures:
Palms, original seam, shallow tackle, inside zone, outside zone and play action.
The early-flat5.3068-YAC sideline win also remains. These controls do not erase
the adverse swing.

## Same-defender successful wrap versus failed entry

SLOT-SWING is a laboratory slot swing using existing routes and native QB
choices, not a new installed screen scheme. Both arms throw at1.60 and catch
at2.45, x39.55 behind the LOS40, with the same actual receiver and initial
defender. Built-in full recording reproduces the saved endpoints and every
common sampled actor pose exactly; no new observation/RNG was consumed.

| Stage | Accepted | Final moving-cushion arm |
| --- | --- | --- |
| First grasp | 2.80, form+behind, grip0.879 | 3.05, reach, grip0.329 |
| First recorded loaded sample | 2.85, force313.8, not slipping | 3.10, force421.6, slipping |
| First-hold continuation | Receiver falls3.35; same defender finishes3.75 | Hold breaks3.20; receiver remains upright |
| Subsequent help | Not needed for finish | FS hold4.15 breaks4.50; LB_W wraps4.90 and finishes5.50 |
| Completed YAC | **0.5862** | **12.9918** |

Force scalars are reported in engine units, not authenticated NFL measurements.
Different geometry, runner responses and post-divergence execution mean these
are not identical leg holds with isolated force laws. The successful rear wrap
is an opposing control, not evidence to strengthen every rear grip. Physics
ownership and the parked prolonged/ground-hold experiments remain separate.

The fixed-plane tape shows the initiating cost clearly: at the catch the
marker is5.22yd away versus2.85yd, despite the same catch. By first contact he
has converging/downhill momentum while the runner cuts back; he reaches at
1.94yd separation, compared with the earlier1.04yd wrap. Later support contains
that arm to6.61 YAC, while the moving-cushion arm loses another hold and yields
12.99. This identifies the approach/containment chain; it does not establish
that either physics response is universally defective.

## Information and the smallest next experiment

The existing consumed pictures already distinguish these witnesses before
the swing throw, without consulting a route or future cut:

| Cue time | Wheel: age / depth / vx / facing | Swing: age / depth / vx / facing |
| --- | --- | --- |
| .75 | .20s /−.90yd /+.64yd/s /1.17rad | .25s /−1.29yd /−.18yd/s /1.83rad |
| 1.50 | .20s /−.07yd /+1.21yd/s /1.33rad | .25s /−1.55yd /−.38yd/s /1.65rad |

These are fallible delayed cues, not proof of the future route. **Stop adding
cushion variants.** Replay the saved cue history through the existing own-body
movement preview to establish the feasible frontier at the first acquired
hip/velocity distinction: can a legitimately informed alternative keep an
attainable wheel relationship without sacrificing the ordinary wrap? If not,
state the real high/low tradeoff and investigate support separately. Do not
choose a threshold from the desired tackle or final YAC.

The earlier eleven-prefix handoff pilot also found the actual installed
midpoint already carrying the shallow in several Drive controls; LB_M was an
apex, not the midpoint. Blanket shallow retention was not justified. New helper
availability decisions must not extend current `see()`'s global .05s teammate
picture. Installed expectations, acquired information and actual role actors
need to stay distinct.

## Exact evidence and cost

[All arms, failures, consumed cues, contacts and source pins](../../data/reviews/current/quarter-flat-depth-current/review.json),
[raw checksums](../../data/reviews/current/quarter-flat-depth-current/SHA256.json),
[held patch](../../data/reviews/current/quarter-flat-depth-current/candidate.patch).
The raw native files retain completed versus live outcomes and actual actor IDs.
Five prefixes remain live in each fourteen-case final comparison. Interception
returns and no-pass endings are not zero-YAC catches.

The final research arm passes79 focused checks and its compatible typecheck;
that is correctness evidence, **not football acceptance**. The first typecheck,
behind-line possession and fixed/moving mismatch failures, plus superseded
native outputs, remain preserved. A carrying cue releases the extra cushion
without hidden confirmation; ordinary play-wide pursuit may already supersede
the match after a native catch. No new post-catch delay is imposed.

The environment's original fetch did not refresh tracking refs. Explicit
refspecs exposed accepted #125; the five-file research extraction and all
fourteen references were then tested on its actual execution. Earlier source
26d8882 measurements stay historical at research branch
`codex/quarter-flat-depth-support` / publication9905f07. They are not relabeled
as current develop.

Total newly executed native work here: **102 plays**, including30 earlier-source
pilot/refinement plays, repeated bounded current-source arms and three passive
recording replays. No games,3198-case pass campaign or shared full suite.
Recorded current command cost89.669s plus46.011s earlier; exact per-command costs,
settings and failed/not-run distinctions are in the manifest. Node22.23.3,
linux/x64, unchanged44 flags/components1, CF_FLOW unset, identical frozen inputs
and operator for each declared comparison. Physical accounting/finite-body
checks hold on every main diagnostic tick. No source promotion is requested.
