# Carrier reads through his own picture (2026-11-17)

Integration item (base develop 6f1136ae): the ball carrier's decisions read other
players' true state in `src/sim/behaviors/carrier.ts`. Information cheating is removed
on sight (standing rule), so this is a repair, on by default, with no flag.

## What changed

| Read | Before | After |
|---|---|---|
| QB slide threat | every opponent's true pos, vel, profile, fatigue; true `isDown` | `sim.see(a, d)`; down when his picture shows `pose: 'down'`; judged profile; no fatigue |
| Bodies for the squeeze gap | true `isDown` filter | the pose he sees |
| Run-read threat time, lane planner, blocker cut-off | defender's hidden profile (vmax, tau, reach, getUp) and fatigue (`speedScale`) | judged from what he sees: speed and burst from body size, raised to the top speed he has seen the man reach this play; reach from height; get-up from weight; `speedScale` 1 |
| Recovery allowance | scenario parking from `downUntil` | only `observedRecoveryAllowance` from the delayed pose he sees |

Allowlist (`test/information-guard-allowlist.ts`): carrier rows `downUntil` 2, `speedScale` 3+1,
`isDown` 2, `pos` 1, `vel` 1 deleted. `sim.bond` 3 (his own bond) remains, not in scope.

## The size judgement (a stated choice, not fitted)

He sees a man's body (mass, height), never his ratings, measurables or position.

- **40 time from weight:** it follows the NFL combine's position averages, about 4.48 s at 193 lb (corners) to 5.28 s at 314 lb (tackles). Fitted line: 40 = 3.35 + 0.0058 x lb.
- **10-yd split:** 0.342 of the 40, the ratio in those averages at every size.
- **Into pads:** both go through the engine's own in-pads mapping (`inPadsSprint`, factored out of `derivePhysical` unchanged).
- **Reach:** from height, taking an average arm as 0.446 of height.
- **Get-up:** from weight at average agility.
- **Seen top speed:** once he has watched a man run, his speed estimate rises to the fastest the carrier's own picture showed him moving this play.

Per position, the judgement lands within 0.1-0.3 yd/s of the true mean vmax (QB, K and P excepted). Defensive backs are judged about 0.09 s slower to rise. Edges are judged with slower bursts than they have (tau 1.33 against a true 1.21).

## What moved (staged zone/man set, 32 concepts x cover1/2/3/4/6 x 2 formations x 3 seeds x flip)

| arm | man YAC | zone YAC | zone 20+ | zone never reached |
|---|---|---|---|---|
| develop (hidden profile) | 3.07 | 5.92 | 5.2% | 7.2% |
| his own capacities as yardstick (first cut) | 3.07 | 6.35 | 6.3% | 7.3% |
| size judgement + seen speed (landed) | 3.02 | 6.16 | 5.7% | 7.6% |

**Run set** (12 runs x under/cover3 and over/cover1 x 6 seeds x flip, ace_12):

| measure | develop | first cut | landed |
|---|---|---|---|
| yards per carry | 3.70 | 3.93 | 3.88 |
| missed tackles per carry | 0.144 | 0.179 | 0.148 |
| broken tackles per carry | 0.091 | 0.091 | 0.099 |

**Head-on two-way-go control:** missed tackles stay at 0.0%. The carrier gains 5+ in the next second in 1.4% of approaches on develop and 2.8% landed.

**Carrier movement:** unchanged; heading rate p50 24 deg/s, cuts 0.16/s.

**Dither:** passes.

**Why zone YAC still rises 0.24.** The speed/burst part carries it. With judged speed and true reach/get-up the zone row is 6.13; with true speed and judged reach/get-up it is 6.03. A size average rates men who are quick for their size, edges first, slower than they are until he has seen them run, and he cuts in front of them. So this is not timid avoidance on the true numbers: with the hidden numbers he simply knew exactly who was fast. Fatigue, the slide, the seen pose and dropping `downUntil` move nothing on their own.

**Pins re-recorded (old -> new):**
- `responsibility-ledger` M7-P051: DE_S alone at 2.55 -> DT_S alone at 1.85.
- `loose-ball-recovery`, O scoop (both mirrors): the recoverer ends `down` -> `falling` at the whistle.
- `carrier-recovery-cue`: scheduled parking (`downUntil`) is no longer read.
- `cov7-abandonment`, `responsibility-ledger` R9-P020 and `loose-own` moved under the first cut and pass again unchanged.

## CARRIER_RECOG (attempt 1, miss, branch only)

In this build, positions came from the fast picture (0.7 x reaction time). Motion came from the
recognition picture (1 + (1 - vision) x reaction time). Results:

- Lag after the nearest defender's turn stayed at 0.15 s; the NFL is 0.40 s.
- Heading rate p50 was 25 deg/s (NFL 32); cuts 0.18/s (NFL 0.26).
- The carrier's reversed re-aims rose 0.296 -> 0.381/s, over the 0.378 budget.

So the velocity read is not what times his reaction, and mixing a stale velocity with a fresh
position makes him re-aim and take it back. Held on `defense/C19-carrier-recog`, no PR.

**The lag operator does not measure reaction** (`lag-film.py`, the same series over -1..+1 s, on zone completions):

| | plays | peak: carrier turns after the defender | peak: defender turns after the carrier |
|---|---|---|---|
| NFL | 461 | 45% | 53% |
| sim | 155 | 26% | 71% |

On a dozen plays from each source, most windows have no defender turn of 15 deg or more at all. The 0-1 s peaks are pinned at the window edges (0 and 1 s), and the defender is following the carrier. The 0.15 vs 0.40 s comparison is co-motion and is void.
