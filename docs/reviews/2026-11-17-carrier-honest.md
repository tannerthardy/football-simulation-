# Carrier reads through his own picture (2026-11-17)

Integration item (base develop 6f1136ae): the ball carrier's decisions read other
players' true state in `src/sim/behaviors/carrier.ts`. Information cheating is removed
on sight (standing rule), so this is a repair, on by default, with no flag.

## What changed

| Read | Before | After |
|---|---|---|
| QB slide threat | every opponent's true pos, vel, profile, fatigue; true `isDown` | `sim.see(a, d)`; down when his picture shows `pose: 'down'`; judged profile; no fatigue |
| Bodies for the squeeze gap | true `isDown` filter | the pose he sees |
| Run-read threat time, lane planner, blocker cut-off | defender's hidden profile (vmax, tau, reach, getUp) and fatigue (`speedScale`) | judged profile: the carrier's own capacities with the man's visible body size; `speedScale` 1 for everyone |
| Recovery allowance | scenario parking from `downUntil` | only `observedRecoveryAllowance` from the delayed pose he sees |

Allowlist (`test/information-guard-allowlist.ts`): carrier rows `downUntil` 2, `speedScale` 3+1,
`isDown` 2, `pos` 1, `vel` 1 deleted. `sim.bond` 3 (his own bond) remains, not in scope.

## What moved (staged zone/man set, 32 concepts x cover1/2/3/4/6 x 2 formations x 3 seeds x flip)

| arm | man YAC | zone YAC | zone 20+ | zone never reached |
|---|---|---|---|---|
| develop | 3.07 | 5.92 | 5.2% | 7.2% |
| repair | 3.07 | 6.35 | 6.3% | 7.3% |

Split by part, the entire move is the judged profile. Fatigue, the slide, the seen pose and
dropping `downUntil` together leave every staged row identical to develop. The judged profile
gives every defender the runner's own speed, acceleration and get-up. A receiver
(vmax 9.7, getUp 0.84) therefore sees a linebacker (about 9.0) as faster and quicker to recover
than he is. He reads pursuit as more dangerous, picks lanes away from it, and gains more.

Run set (12 runs x under/cover3 and over/cover1 x 6 seeds x flip, ace_12): yards per carry
3.70 -> 3.93, missed tackles per carry 0.144 -> 0.179, broken 0.091 -> 0.091.

The judged profile is a first honest model, not a finished one. A runner does judge
a lineman as slower than a corner; a size- or position-scaled judgement is still observable
and would be the next step if Integration wants the overrating removed.

## CARRIER_RECOG (attempt 1, miss, branch only)

In this build, positions came from the fast picture (0.7 x reaction time). Motion came from the
recognition picture (1 + (1 - vision) x reaction time). Results:

- Lag after the nearest defender's turn stayed at 0.15 s; the NFL is 0.40 s.
- Heading rate p50 was 25 deg/s (NFL 32); cuts 0.18/s (NFL 0.26).
- The carrier's reversed re-aims rose 0.296 -> 0.381/s, over the 0.378 budget.

So the velocity read is not what times his reaction, and mixing a stale velocity with a fresh
position makes him re-aim and take it back. Held on `defense/C19-carrier-recog`, no PR.
