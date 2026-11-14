# `facing` consumer map for a gait/shoulder split (read-only)

Prepared for the open-run cap proposal (`2026-11-14-open-run-cap.md`, candidate (a): `facing` stays the gait/hips heading, a bounded `trunk` twist carries the shoulders). Develop `57325109`. Method: `grep` of `.facing` readers (173 outside `src/lab`) and `facing:` producers by file, classified by the surrounding code by meaning; the classes are by the line's use, from the grep context and file headers, and are not a line-by-line read of every site. Counts are sites, not behaviours.

## Who reads it, by meaning

| Class | What the reader wants | Sites (about) | Where | Under (a) |
|---|---|---|---|---|
| H, hips / gait | direction of the gait: turn motor, traction, directional cap, support | 60 | `physics/world.ts` 30, `kinematics.ts` 10, `actuation.ts` 4, `bodyshape.ts`, `coverage/orientation.ts` 9 (names itself "how a coverage defender's hips follow his technique"), `open-to-ball.ts` 3 (rotation path), `defense.ts` 802/826/866 (his own `directionalSpeedFactor`), `called-motion.ts` (`locomotionAccel` prediction) | unchanged: keeps `body.facing` |
| S, chest / shoulders | where his front points: contact, a legal hit, a wrap, a catch | 40 | `engagement.ts` 12 (blocker's chest, `beta`, `off`), `blocking.ts` (`chestOff`), `contact-legality.ts` 10 (victim facing, wraps), `pass-interference.ts` 3, `tackle.ts` 3, `catching.ts` 2, `catch-readiness.ts`, `receiver.ts` `facingReceiver`, `run-fits.ts`, `climb-access.ts` | reads shoulders = `facing + trunk` (accessor), only where a body can carry a trunk offset |
| G, eyes / gaze | what he can see: view cone, "facing the QB", seen cues | 50 | `playsim.ts` 11 (`GAZE_NECK` clamps gaze around `observer.facing`, `viewCone`), `perception.ts`, `throw-sight.ts`, `behaviors/defense.ts` about 16 (QB seen, ball seen, `eyesHeldOnQB`, lookingBack), `behaviors/qb.ts` 8, `qbmind.ts` 8 (what a QB recorded of a defender's facing), `coverage-cues.ts`, `coverage-read.ts`, `coverage/judgment.ts`, `collection-approach.ts`, `carrier.ts` | gaze centres on shoulders, neck on top (as HEAD already does) |
| other | telemetry, round-off, staging | 20 | `playsim.ts` frames, `command-trace.ts`, `telemetry.ts` | record both |

So the single `facing` is read as hips by about 60 sites, and as chest or eyes by about 90. A split touches both classes, and no consumer is wrong today; each is reading the one number as the thing it needs.

## Who asks for it (`facing:` producers)

| Producer | Request is | Note |
|---|---|---|
| `behaviors/defense.ts` 26, `coverage/techniques.ts` 3, `coverage/orientation.ts` 2 | hips (open / square / turn-and-run; the header says so) | unchanged under (a) |
| `behaviors/blocking.ts` 15, `engagement.ts` 11, `run-fits.ts` 5, `climb-access.ts` 3, `tackle.ts` 2 | chest / pads direction | S class; no twist requested |
| `qbmind.ts` 10, `behaviors/qb.ts` 7 | the QB's body toward a throw or a read (his shoulders) | a candidate trunk user, later |
| `behaviors/receiver.ts` 3, `open-to-ball.ts`, `route-motion.ts`, `receiver-forecast.ts` | receiver: only drill facing (`:386`, `:420`) and ball-tracking (`:626-628`, within 3 yd of the flight) | **receivers never request an off-path facing while stemming**; `facing` is `undefined`, so `commandFacing` gives travel, hips leading by up to 60 deg |

The last row is the whole receiver side: a route runner turns toward the QB or the ball only when the ball is within 3 yd. That is the 30–90 deg gap (1.7% of WR frames in the sim, about 18% in the NFL) from the open-run rows. The cap fix (a) lets such a request exist without turning the hips; the request itself (look back on a deep route, eyes on the QB through a crosser) is new receiver behaviour that Coverage's `nfl_deep_look` rows can speak to.

## Staging this implies

Stage 1, the cap only. `trunk = 0` for every body (byte-identical output), the type and accessor exist. Receivers' ball-tracking request (`receiver.ts:626-628`) becomes a `trunk` request up to T, so a receiver who looks back at 6–8 yd/s keeps his speed. Readers changed: only the S/G sites a receiver's shoulders reach: `catching.ts`, `catch-readiness.ts`, `receiver.ts` `facingReceiver`, `pass-interference.ts` and `contact-legality.ts` (receiver's facing), `playsim.ts` view cone and gaze for the receiver as observer, `tackle.ts` `sees` for a carrier. About 6 files, not 173 sites.

Stage 2, only after Stage 1 reads: receivers look while stemming (a behaviour change, with Coverage's `nfl_deep_look` as witness), QB shoulders, any DB look-back that is currently a hips request.

Not done: the per-site read of each of the 173 sites; the choice of T from film.
