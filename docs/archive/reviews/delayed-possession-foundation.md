# Delayed possession as a bounded decision input

The simulation can now supply the possession state from the same historical
sample as a player's position and body pose. This lets a controller recognize
its marked back as a runner without consulting the current carrier or the
private handoff timestamp. It does not add a gaze or occlusion model.

## Contract

`Perceived.carrying` is optional and has three meanings:

| Value | Meaning |
| --- | --- |
| `true` | This target held the ball in the consumed historical sample. |
| `false` | This target did not hold it in that sample. |
| missing or `null` | That sample does not supply possession information. |

`PerceptionBuffer.record(states, holder)` keeps the existing API valid:
omitting `holder` records unknown possession; `null` records a known unheld
ball; a player index records that holder and known non-possession for others.
All five native `PlaySim` snapshot sites supply the held index or `null`.
Direct fixture and external callers that use the original one-argument API
remain unknown. Do not silently fill their missing field from live state.

Position, velocity, stance, body facing, pose, history length, delay rounding
and dead reckoning are unchanged. Possession is discrete historical evidence;
it is not extrapolated with velocity. A native handoff performed inside an
update first enters the following ordinary snapshot, then waits for the
observer's normal latency. Changing current `carrier`, `handoffAt`, or the
hidden run/pass flag cannot change an already consumed picture.

The existing 24-sample, 22-player buffer adds one float per body per sample,
or 4,224 bytes per play. No extra history, random draw, controller invocation
or physics step is introduced.

## Limits for consumers and diagnostics

Use an affirmative `carrying === true` where possession is the required cue.
False and unknown are not evidence of a blocking assignment, route identity,
run concept, ball destination, or a teammate's knowledge. A run belief can be
wrong; a player may still hold the old QB possession image after a transfer.
Pass and pitch flight have no held carrier, so native samples record false
for every body. This field alone cannot distinguish flight from a loose ball.

This is a delayed-possession approximation, not proof that a player's eyes
could see the ball through traffic. The current `see` abstraction has no
gaze acquisition or occlusion gate. That limitation stays explicit rather
than claiming a physiological visibility model.

Full replay observations copy the carrying value from the actual returned
`Perceived` object. Boolean false survives recording; missing normalizes to
null. Existing gzip telemetry packing retains it without a version bump,
because it is an optional additive version-1 field. Legacy replays remain
valid. QB memory estimates do not retain possession and therefore remain
unknown; the recorder does not fill them with the live holder.

The existing replay observation map retains the last call for each
observer/target/source pair in a tick. It is not a complete history of every
different delay requested for that pair. Controllers that expose a decision
must record its actual consumed cue separately if that attribution matters.

## Isolated evidence

The foundation-only source is
`dc9590708bf18de096e5e4ae62ff43b2a7fbdbc95113bb1470ef407011482f2d`.
Its parent source is
`8bc3eec8d0b842021d000585bb71331be17d6a644c763b2e510303cb4372d942`
from published commit `9c3c809`. Only `perception.ts`, `playsim.ts`,
`telemetry.ts`, and `types.ts` differ in that phase. Later controller and
whistle repairs are excluded from this isolation.

The 14 new channel tests have 13 failures and one numerical-preservation
control pass on the parent. All 14 pass with the foundation, together with
29 existing pose, mind, observer, and packing controls: 43/43 focused tests.
Typecheck passes. Tests cover history wrap, delay rounding, unknown versus
false, handoff staleness, real pitch and pass releases, pre-snap movement,
unchanged kinematics, copied trace input, and lossless telemetry packing.

Four native controls were declared before running the isolated collector:

| Case | Finish | Offensive yards | Transfers actually exercised |
| --- | --- | ---: | --- |
| Inside Zone, Ace, Over/Cover 3 | tackle | 2.91 | handoff |
| PA Post-Dig, Gun Doubles, Over/Quarters | tackle | 6.66 | throw, catch |
| Four Verticals, Gun Doubles, Over/Cover 3 | incomplete | 0.00 | throw |
| Toss, I Pro, Over/Cover 3 | tackle | 3.43 | pitch, pitch catch |

Each foundation run exactly matches the parent in initial profiles/bodies,
complete result and positional frames, every tick's complete body, intent,
`SnapMind` and RNG digest, final body/mind/intent hashes, and the next random
draw. Full telemetry also matches after removing only the added `carrying`
property. The carrying records differ as intended. The collector adds no
extra visual reads, decisions, or random draws.

This proves metadata-only neutrality for these four controls. It does not
prove better football behavior, population calibration, or a benefit from a
later possession consumer. Those need their own first-decision witnesses,
ordinary controls, and adverse outcomes.

The exact collector, raw controls, test logs and byte receipt are retained
under `out/possession-cue/` for assembly into the combined reviewed packet.
`foundation-receipt.json` pins both complete source trees, tool, cohort, test
file, logs, raw controls, and each changed foundation file. Published packet
paths and combined-source validation belong to the main increment review.
