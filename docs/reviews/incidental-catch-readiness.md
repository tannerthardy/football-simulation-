# Incidental catches require acquired flight information

## Decision and change

**Eligibility and free hands do not establish that a player has acquired the
ball.** Accepted `develop` awards a routine receiving chance to a protection-only
back in the saved P024 window with no acquisition check. The new failing test
reproduces that behavior. The candidate requires a recent visual acquisition
before an incidental offensive catch attempt. A permanent protector can still
catch an emergency ball if he sees it in time. There is no route-only ban.

Branch `codex/eligible-catch-acquisition`, tested code
`28018cf018a51c4212c034f90393ece7865bcc47`, starts at accepted develop
`a1b16e666a9ee7d1bc1d2aecba141fc535863b24`. Runtime SHA256:
`35e05b815dc7aa5e7db7ba07e5acfab169c145fc9cde958a50cca3f96f5f7dad`.
PR [#58](https://github.com/tannerthardy/football-simulation-/pull/58) remains
separate; its receiver-blocking recognition repair is not imported here.

The small production scope is `catch-readiness.ts`, one sensing hook in
`PlaySim.tick`, and one filter in `resolveCatchOpportunities`. No edits to
blocking/QB/assignment controllers, route or protection release policy,
movement requests, hands ratings, World, grips or speed/braking capacities.
`PlaySim.tick` overlaps the shared run-game file: retain this sensing hook
alongside that owner's independent work, without importing either whole branch.

## P024 versus P034

The original film is experimental spread/air, final **26–38**, roster seeds
27101/27102, game seed 702. It is not the accepted 38–21 game.

| Case | Installed/current job and actual actor | Flight/readiness evidence | Result of the bounded comparison |
| --- | --- | --- | --- |
| P024 Slant-Flat | H2-RB1, slot RB; permanent pass-pro, `passOption=false`, no release installed; no engagement at the catch window | QB targets X at 1.55; RB has no `onBall` tracking. At tick starts 1.60/1.65 the ball is behind his field of regard. The 1.70 opportunity arrives before a new sighting can mature. He is eligible and in reach, but has no acquired flight. | Baseline resolver accepts a forced successful draw at this exact window. Candidate rejects the opportunity before drawing. Saved geometry/history also leaves readiness unavailable. This is not a new completed-play ending. |
| P034 Y-Cross | Same H2-RB1; installed check, transitions to route at 1.30; targeted at 2.20, current behavior `track` | Release precedes the throw. Existing `TrackBall` owns the receiving/tracking transition, rather than the initial protection label. | Existing targeted window remains available. Original first chance .667732985 fails; the eligibility control deliberately supplies a successful draw and still catches. It does not relabel the recorded incompletion as a completion. |
| Emergency opposing control | Same P024 player, still permanent protection; same reach/height geometry, longer visible flight | Faces the flight, acquires it and finishes its existing tracking-scale latency; no engagement | Candidate permits the catch and changes to BallCarrier through ordinary `possess`. It does not require a route assignment or `passOption=true`. |
| Occupied opposing control | Same visible-flight control with a real engagement | Has an acquired picture, but hands/body are engaged | Existing catch exclusion still applies. |

P004 is a second supported example: H2-TE1, slot Y, permanent protection, no
release/tracking/engagement, catches a pass intended for Z only .10 seconds
after release, with a .868173481 chance. The saved first-window fixture has no
mature acquired picture either. Actor IDs, original slots and actual catchers
are retained; the QB did not choose an outlet in either P004 or P024.

## Information contract and physical limits

Sensing runs once before controller decisions at each tick boundary, using the
then-visible ball position and the observer's own facing. It never uses intended
target, private route/protection state, future ball path or catch geometry to
grant a sighting. It queues that sample with a quantized processing latency:
existing TrackBall scale `.08 + .25*(1-ballTracking)`, plus the mind's existing
attention adjustment. Repeated queries and recording do not sense or draw RNG.

`query(agent, now)` returns only a delivered sample with timestamps and sampled
position/velocity, or null. There is no fallback to live truth. The resolver
uses its availability, not its coordinates, to permit an incidental attempt;
ordinary physical reach/height, down/engagement and contest rules still decide
what can actually happen. Acquiring a picture does not promise a completion.
The internal readiness transition changes no movement request or release job.

The coarse field of regard reuses the existing catch-facing cosine threshold
(-.35, approximately 110 degrees per side). Memory expires .5 seconds after
sampling. These are declared approximations, not calibrated NFL gaze or reaction
measurements. No detailed head turns, occlusion or audible cues are simulated.
A plausible incidental shoulder look that body facing fails to represent remains
a risk. No new attention controller is claimed.

**Existing targeted acquisition remains separate debt:** `onThrow` installs
TrackBall and `onBall` from the intended target. This change preserves that
existing contract, including attainable target catches; it does not repair its
privileged target shortcut. Defender ball-playing rules are unchanged. Ball/body
collision for an unready player is also not supplied by this filter; skipping an
attempt does not claim the ball physically passed through a torso correctly.

## P023 and P043: distinct failures

P023's actual incidental actor is A2-RB1, already released into a route. The QB
targets X at 1.85. RB fails .439751390 at 2.05; `diff >= .35` prevents a drop
label, yet `deflect(..., 'drop')` changes the ball to deflected. DT_W (listed EDGE)
intercepts at 2.10 using the .182653061 deflected-ball branch. That is not a
recorded line bat. The saved first-window acquisition control is unavailable,
so this candidate would exclude that blind attempt at that frozen window. The
subsequent interception/outcome has **not** been resimulated or declared repaired.
In raw `catchDraws`, the `receiver` field at defenderPlay is the previous receiver
actor; after-tick holder/ratings identify the actual interceptor.

P043's actual target A2-WR2, slot Z, fails .575419163 at 3.45. Reconstruction of
the swept segment gives s=1, horizontal extension .870603 yd, height **2.960140
yd**, squared extension fraction .473339 and high fraction .705250 above chest
toward full catch height. Ball speed is 20.65233 yd/s. The resulting difficulty
is .518770, above the .35 explicit-drop cutoff. This is a high extension rather
than established evidence of an easy drop or bad hands. Candidate preserves the
exact first-window chance and failure in the resolver fixture. A per-window
chance is not a calibrated play-level completion probability.

The missing failed-opportunity label is an observability gap. Smallest follow-up:
record an attempted/failed catch window in full diagnostic telemetry, including
actual actor and geometry, independently of the official drop statistic. No
event, RNG or diagnostics change is bundled into this candidate.

## Evidence and reproduction

[Compact receipt](../../data/reviews/current/incidental-catch-readiness-evidence.json)
records all flags, source/input/operator hashes, original geometry and focused
receipts, including failures. [Saved fixtures](../../test/fixtures/incidental-catch-windows.json)
are extracted offline; they are not World restart states.

The evidence branch was refreshed read-only and pinned at
`4ae667e29b3ce085f43c5cb911b294349cda2b8f`. Original runtime:
`f62511a513f2187884d74ae3b94435835e43309c`, SHA256
`dd173a3ef44f22b5ee74f3cc17ef15b2137203cea58dd2fa12fbaad12c4784ba`.
The catch resolver and perception files are byte-identical on accepted develop;
the source comparison identifies other run/Stick differences. Therefore exact
saved-window geometry is reusable here; original full-game trajectories are not
presented as current develop measurements. The existing 35-scrimmage prefix,
which matches all 45 native log entries, is reused without replaying it.

Node22.23.3, all44 recorded flags with RUN_CONTACT_COMPONENTS=1; center hands,
centered integration, legacy support, per-solve work, speculative impacts, mean
support, bounded attachments and adaptive substeps. Flags are explicit through
`baseline:run`; no inherited experimental values or defaults are adopted.

```sh
export PATH=/workspace/.football-tools/node-v22.23.3-linux-x64/bin:$PATH
npm run baseline:run -- --candidate -- npx vitest run --project core test/incidental-catch-readiness.test.ts test/pass-installation.test.ts test/catch-reach.test.ts test/catch-phase-control.test.ts test/protection.test.ts
# Offline extraction: prefix and manifest from pinned evidence publication.
python3 scripts/diag/incidental-catch-evidence.py PREFIX.json.gz MANIFEST.json OUTPUT.json
```

**29 focused checks pass**: 13 readiness/neutrality checks, six installation,
two contested-reach, seven moving catch and one protection. Typecheck passes on
the identical runtime source. P006's targeted success and P043's targeted failure
retain their exact chances. Defender reach/interception controls remain. Recording
and repeated queries preserve actual tick bodies, events, stats, acquired picture
and RNG. Hidden reality advances through nine sensing boundaries without granting
a hidden sighting; a legitimate new visible opportunity does grant one after its
latency. Expired information never refreshes from hidden reality.

The initial red test establishes the accepted-source failure. Two subsequent
test-harness errors (attempted engagement with a distant defender, cloning an
instrumented RNG function) were corrected without changing production logic.
All validation commands together cost **25.09 seconds**, including those failures
and 10.70 seconds of typecheck. Final 29-check command costs 4.08 seconds. New full
games, prefix replays and shared-suite runs: **zero**. Short staged ticks and
catch windows are not completed native play comparisons.

## Next decision and integration handoff

This is an isolated candidate for focused owner/integration review, not a merged
or adopted runtime, a league calibration or a certified YAC fix. Integration owns
the one preserved full-suite pass on its eventual exact combined candidate.
Do not import the PR54 diagnostic stack or unsuccessful pursuit pilots.

Next coverage question remains P045's achieved approach/top leverage, under
**Quarters MOD match**, with P006/P010 retained as plausible football controls.
The saved P045 witness has early pass declarations by all defenders, CB_W on X
2.51 yd away at catch with transverse velocity, and FS also assigned X 7.21 yd
away; neither records a carrier attempt/contact before 49.52 YAC. This does not
match the slow-receiver false-run-read mechanism repaired in #58. It is historical
evidence, not a remeasurement on #58. P003 likewise has no recorded run declaration;
NB reads pass at 1.10 and SS at .85. Preserve the plausible PA win. P002 alignment
and green-dog rules await the separate coaching contract; no blitz rule is added.
