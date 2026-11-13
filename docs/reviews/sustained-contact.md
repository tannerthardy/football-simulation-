# Sustained contact and ground turning

Two repairs have different status. Finishing a rise now preserves attained
spin in production. The bounded turning response is opt-in with the existing
`handContact: 'patch'` model. Default promotion is still blocked by football
controls; neither repair was selected to improve a game average.

## Getting up cannot erase angular momentum

The old rise transition set spin to zero before friction was applied. Work
accounting still closed, but the reported yaw impulse exceeded the passive
ground budget. For an ordinary 100 kg body entering the rise completion with
1 rad/s, the first 12-step interval used 3.36 times the allowance; at 48 steps
it used 13.43 times. This is a confirmed law defect, not its frequency in games.

Production retains spin and lets ordinary ground friction and foot torque
remove it. Eight mirrored tests audit the first actual interval, including
simultaneous sliding. A legal rise still completes. All 1,306 tests passed at
the isolated repair stage `ec3eba1d`; four native games retained all 12 existing
mechanism guards. Those games precede the concurrent anchor integration.

## Turning should respond to a body cue, not a tick deadline

At source `97612098`, the first sustained-jam divergence preceded torso contact.
The old motor divided angle error by the time remaining in the controller tick.
An identical body with a small angle error and incoming spin could brake early
in a tick but accelerate the same spin near its end. The held cue and available
traction were identical. A fixed denominator alone gave mixed refinement and
did not resolve the sustained interaction, so that experiment was rejected.

The opt-in motor instead uses angle error, actual spin and the existing 0.05 s
response time. Its unsaturated response is critically damped:
`angular acceleration = (error - 2 × response × spin) / response²`.
The existing inertia, traction allowance, availability and turn-rate limits
bound it. Exact response segments continue until an acceleration/rate boundary;
finding that boundary does not increase physics resolution globally. An external
hit can still spin a body faster than its motor limit; braking remains finite.

Recovery uses the **peak attained torque**, not the net angular impulse. Opposite
torques can partly cancel over an interval without making their traction free.
This response is a reduced control assumption, not measured NFL motor physiology.
The response time and force capacities were not tuned to the jam outcomes.

## What passes, what still fails

At source `f2eb1e3a`, all **1,337 TypeScript tests in 115 files**, typecheck and
build pass. The combined default stage also passes all **141 Python checks**.
The response has 25 mathematical tests and five grounded motor tests; 1,000
seeded composition probes agree within `3.56e-14`. The 144-case hand oracle and
36-case shared-body law audit still pass. Both default legacy hashes pass.

Thirty sustained native jam captures retain ordinary, heavy and strong bodies,
mirrors and 6/12/24/48/96 substeps. Relative to the 96-step numerical reference:

| Jammer's final position error | Earlier response, 12 / 48 steps | Bounded response, 12 / 48 steps |
| --- | --- | --- |
| Ordinary | 0.0080 / 0.0013 yd | 0.0418 / 0.0041 yd |
| Heavy | 0.1968 / 0.0522 yd | 0.0085 / 0.0004 yd |
| Strong | 0.0551 / 0.0180 yd | 0.0430 / 0.0107 yd |

The strong bounded-response captures agree on no fall; the old captures
disagree. Explicit opponent-facing cues also remove the old falls, so these
selected outcomes involve control as well as physics. Ordinary refinement
worsens; strong refinement remains nonmonotonic. The numerical reference is
not ground truth. All adverse cases remain in the receipt.

With the concurrent anchor present, unchanged patch promotion is **42/50**:
six football failures and two preserved historical hash differences. The
wrong-side helper now fails in both mirrors, joined-double transfer fails,
and Under/Tite/Bear checks still fail. Do not flip the default, weaken those
assertions or add force to recover the old outcome. The controller owner is
investigating load interpretation and maintained seal geometry.

Separate free-body probes confirm missing grasp yaw moments and an additional
mixed hand/grasp timing debt. They are not repaired here. In six selected native
catch contexts all six acquired grips carry load, none breaks, and two assists
work. The remaining 69-YAC escape has no grip or body impact. These are selected
contexts, not a new random frequency estimate; stronger tackles are unsupported.

## Reproduce

Use Node 22 from the repository root. Large traces stay in ignored `out/`.

```sh
npm test -- test/rise-yaw-budget.test.ts test/yaw-response.test.ts test/yaw-motor.test.ts
node --import tsx docs/archive/research/contact-mechanics/sustained-jam.ts out/sustained-jam
node --import tsx scripts/diag/hand-convergence.ts out/sustained-jam/redirect.json --common-patch
node node_modules/vitest/vitest.mjs run --config scripts/diag/common-patch-vitest.config.ts --maxWorkers=1
```

The promotion command deliberately fails. The [compact receipt](../../data/reviews/current/sustained-contact.json)
pins the sources, operators, failures and results. Next: preserve the laws while
repairing controller use of contact, then investigate grasp angular/timing
coherence without expanding anatomical feet. Keep the original failed controls.
