# PA post/dig: saved-trace roof audit

Read-only audit at parent `7a25bc9`, published engine
`601b66e8e30123b20e1c5cfe9c5c883f41219180a5eaf26be8a477dff89b2a5b`.
Input: `data/reviews/helper-fit-and-coverage/coverage/final.json.gz`, the
declared `DA-R2-pa_post_dig-cover3-R` and `-L` rows. No simulations, engine/test
edits, force tuning or changed observations. Native steps are pre-World state
after the controller; a result event at t therefore appears in the next native
step. Rounded telemetry is used for installed jobs/beliefs, exact native steps
for movement, and raw pictures for consumed receiver cues.

## Finding: no proven invalid roof request

The saved middle-safety requests obey the installed cap and deep-middle band.
Neither play establishes a pre-catch abandonment of an acquired middle vertical
or a failed coverage-rule exchange. The single-high FS starts 13 yd deep with
`deep_mid` and an `alley` fit, gap A, side +1, attack/box/stack. All four
secondary players are ordinary ZoneCoverage here; their recorded rule is null.
The FS has no selected coverage target anywhere in the retained steps.

| Stage | Right witness | Left ordinary mirror |
| --- | --- | --- |
| First run belief | .40 s; pPass .30 | .40 s; pPass .30 |
| Initial cap request | FS position (53.066,26.470), velocity (.637,.065), command (-6.181,+1.747) yd/s | Exact same |
| Pass belief returns | 2.20 s; pPass .82 | 2.15 s; pPass .81 |
| First pass-return command | At 2.20: (+7.600,-2.214), position (49.087,28.389), velocity (-2.494,+1.808) | At 2.15: (+7.620,-2.145), position (49.219,28.294), velocity (-2.766,+2.005) |
| Achieved minimum FS depth | 8.564 yd at 2.65 s | 8.578 yd at 2.65 s |
| Throw | 3.20 s to X/dig | 3.20 s to Z/dig |
| Catch | 4.45 s at (56.049,37.460), separation 1.8 yd | 4.60 s, separation 1.4 yd |
| Result | 70-yard TD; 53.951 YAC; one missed and one broken tackle | 41.96-yard tackle; 24.069 YAC; zero missed and one broken tackle |

`ZoneCoverage.update` returns into runFit when the individual believes run
(`src/sim/behaviors/defense.ts:369`). `executeRunFit` selects the back picture
during its premesh state and, for alley work, requests
`clamp(homeDepth*.65,5,8)` (`src/sim/run-fits.ts:110,116`). For this 13-yard
home depth, the cap target is eight yards, not linebacker depth or a command to
chase the deep back. The current eight-yard installation can still be questioned
as a football assumption, but the saved trajectory does not violate it. The
remaining downhill velocity after pass belief returns is actual finite braking;
the requested x direction already reverses. Recognition hysteresis explains why
a rising pass probability is not immediate certainty. A mistaken PA run read
is a permitted result rather than, by itself, an invalid controller request.

The pass loop's deep-middle lateral band is [14.778,38.556]. At 2.20 right,
consumed X is (48.292,44.667), velocity (6.719,0), age .20 s; Z is
(49.216,8.667), velocity (7.288,0), age .20 s. Both outside #1s remain outside
the band. Both inline #2s are retained blockers (`teBlock=true`); the back also
blocks. This is not four verticals or a seam crossing the cap while the safety
ignores an owned key.

At 3.15 right, X/dig's consumed picture is (53.035,44.224), velocity
(3.530,-1.480), age .20 s; Z/post is (56.128,9.522), velocity
(7.275,+1.961), age .20 s. Raw constant-velocity .7-s future y positions are
43.188 and 10.895, still outside the band. RouteObservation's bounded hip/plant
correction does not move either into the middle. Native FS target remains null,
consistent with the no-vertical branch. At 3.15 its request is (+7.702,+.687).
At 3.35 its request remains (+7.415,+.585); at 3.40 it switches to ball play
(+5.461,+7.663), with no requested facing. The QB's recorded eyes move from the
post to the dig. The no-vertical branch still uses authoritative `qbEyes` and
the current receiver position, an inherited information shortcut, not proof of
a newly busted installed roof. Body orientation is not an adequate replacement
for eye tracking.

## Useful pursuit/contact handoff for the shared late-air audit

The corner, not the FS, is the closest defender at the catch. Right CB_W owns X.
At 3.35 it still requests facing toward the QB; at 3.40 ball play removes that
facing request. At 4.20, X is (55.276,39.225), velocity (+2.453,-5.602),
CB_W is (56.619,40.786), velocity (+.063,-5.144), and CB_W requests
(-2.802,-7.235). At 4.45 pre-World, their distance is 1.817 yd, while corner
velocity is (-.394,-5.117) against receiver (+2.641,-6.032). The last late-air
command is (+3.635,-4.878). At 4.50, after the saved 4.45 catch event, chase
requests (+1.557,-9.506), facing -1.829. At 5.00 a separating dive misses;
the corner falls at 5.05. Thus a meaningful shared ball-to-carrier approach
experiment has an actual proximity/velocity witness, not a claimed 54-yard
coverage bust or proof of insufficient grip strength.

Left CB_W owns Z and supplies the ordinary opposing control: at 4.45 it is
(56.769,40.445), velocity (+.288,-5.208), receiver distance 1.061 yd, command
(+3.415,-5.555). At 4.60 it requests (+5.155,-3.640) in the last air step;
at 4.65 after the catch, chase requests (+5.604,-6.466), facing -.838.
It acquires a real wrap at 4.60; the eventual slip and later second tackle are
retained outcomes. The mirror changes which generated receiver runs the dig,
so it is an ordinary opposing fixture rather than an exact mirrored body/profile
experiment. Do not require its gain or initial wrap to improve as a condition of
accepting a sensible controller.

The right FS closes after the catch but never reaches a successful wrap. Its
minimum retained separation is about 3.176 yd at 5.05; that cannot establish
grip failure. The other corner's later 6.40 grasp/6.45 dive-fall/6.65 slip is a
separate achieved-contact episode. Raising tackling force to fix the touchdown
would bypass both earlier approach problems.

## Bounded follow-up, not a promoted repair

Prioritize the parent's shared late-air movement/arrival study. Preserve both
PA rows, a retained successful immediate catch/wrap, a reachable interception
and a genuinely unreachable deep ball. Change only the request and compare
first changed consumed target/command, achieved velocity, actual catch contest
and grip acquisition. Do not use the intended receiver or catch outcome to
decide the defender's target; preserve ordinary delayed pictures and the real
ball-to-carrier transition.

If a later cap-priority study is warranted, first retain an actual conflicting
middle seam/post picture during run belief, plus a real-run alley-fit control.
A minimal candidate could retain an installed, personally observed uncapped
middle vertical when its current closing rate consumes the existing turn/cushion
budget, without changing the run belief or physical capacities. This is an
unimplemented hypothesis. It must exclude outside #1s that have not declared
into middle responsibility, blocking #2s, shallow crossers, and an actual runner
declaring through the fit. The present PA examples do not supply that positive
conflict witness; increasing forecast range or safety depth solely to prevent
their touchdowns is unsupported. The handbook's vertical-priority teaching
supports that narrow study but does not validate a new numerical depth.
