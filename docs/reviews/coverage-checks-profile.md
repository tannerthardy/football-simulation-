# Coverage rules, checks and motion (#193): one-page state

Integration summary for `claude/friendly-bardeen-56kqo2` (PR #193), based on
accepted `develop` `d91c9014`; head at the time of writing `93584284`. The design,
sources and per-rule status table are in
[coverage-checks/README.md](../references/coverage-checks/README.md). This page says
what is live, what is behind a flag, where it touches shared code, and what is open.

## Live without a flag (changes default games)

- **Match rules** (`src/sim/coverage/rules.ts`). Corner vs #1:
  - man unless he declares shallow;
  - In/Under is final after 0.35 s;
  - short out/stop stays reversible.

  Plus Quarter Flat, Trix/Poach, Stubbie/Book, Cover 3 Push/Smash, squat corner, vertical curl, Box, Banjo, Clue, Strap hooks, Area/Topper.
- **Pre-snap structure** (`src/playbook/structure.ts`) and **structure checks** (`installCoverage` in `src/playbook/coverages.ts`). The secondary checks against the aligned (or motioned) formation; the play log records `checkedOn`.
- **Coordinator** (`src/game/playcaller.ts`):
  - check preference: Trix vs Book by down/tree/results;
  - two-high tree weighted to Cover 9, Lurk and sims;
  - one quarters home shell for disguise.
- **Catalog:**
  - Cover 9 Strap/Clue/Grab; Cover 8 Trix; Cover 6 Book/Area;
  - Cover 1 Lurk/Banjo; Pounder/Finger/Rolex and their Mini banjos;
  - simulated pressures Whip/Slug/Sting with dropper match rules and promised rush counts.

## Behind a flag (registered off in `config/baseline.json`)

| Flag | What it does | Pair with |
|---|---|---|
| `MOTION` | Offense motions (across, jet, empty, return) on about 40% of snaps. Plans are legal by construction, timed by integrating the mover's sprint law, and the offense is renumbered at the snap. Geometry is from tracked 2025 motion. | #194 `MOTION_CHECK` (replaces the provisional bump response) |
| `DEUCE` | Five-man zone pressure from two-high that installs its own 2-deep/4-under coverage (`Pressure.coverage`), with a DOT check vs trips. | #194 `PRESSURE_CALL` (blitz chance by shell; without it Deuce fills silent four-man two-high blitz rolls) |

## Where it touches shared code

| File | Change | Owner |
|---|---|---|
| `src/sim/playsim.ts` | `installCoverage` at setup; motion plan/finish; `this.motion?.step(...)` in `stageDefense`, which also counts the motion's seconds in the pre-snap ticks | alignment/snap timeline. `SNAP_REACT` (run-game) meets this loop. |
| `src/playbook/alignment.ts` | droppers install through `seatRole` (1 line) | alignment |
| `src/playbook/call-integrity.ts` | droppers, promised rush count, `needs`, `Pressure.coverage`/flag | shared |
| `src/game/playcaller.ts` | check preference, variants, pressure weighting, home shell, `chooseMotion` | caller (#194 adds `PRESSURE_CALL`) |

## Results (focused; no outcome claims)

| | Sim | Tracked / source |
|---|---|---|
| Snaps with a structure check (seeds 3, 7, motion off) | 41/262 | — |
| Two-high presented pre-snap, two-high tree | > 80% | 2025 Eagles 87% |
| Motion snaps, `MOTION=1` (seeds 3, 7) | 56/144, 65/142; no motion or snap fouls | — |
| Jet: lateral at the snap / moved | median 4.7 yd / 4.4 yd | 5.0 / 6.5 (BDB 2025, #194 operator) |
| Across: set point from the ball | median 5.5 yd | 5.4 |
| Two-high calls with pressure, `DEUCE=1` without `PRESSURE_CALL` | 16/85, 19/78 | — (was 7/83, 6/75) |
| One-high / two-high 5+ rushers, `DEUCE` + `PRESSURE_CALL` | 36% / 8% (#194) | 38% / 11% |

## Profile interactions

Under `FRONT_ALIGN` and `SNAP_REACT`, the rush ends long reps or holds the
end/wing at the line before a route declares. The lab reps in
`corner-one-release` and `cover6-half-side` therefore:
- pin both flags to 0;
- assert that the rep ran with the ball held and that each route released as written.

On #194's combined branch (`claude/motion-checks`, which merges this branch
through `93584284`), every test of this PR passes with all candidate flags on.

## Tests

- `corner-one-release`
- `quarters-trips-rules`
- `cover3-cover2-rules`
- `presnap-coverage-checks`
- `formation-structure`
- `defensive-check-menu`
- `fangio-tree`
- `sim-pressures`
- `offensive-motion`
- `cover6-half-side`
- `hands-bunch`
- `deuce`
- `defensive-call-integrity` (installed calls)

`npm test` passes except `baseline-runner` in containers older than `.nvmrc`'s Node.

## Open, with owners

| Problem | Diagnosis | Owner |
|---|---|---|
| Man defenders travel with a jet 5% vs 47% tracked | Sim jets move ~4 yd; the defender near him at the snap was often already close. Acceleration and the 0.3 s reaction bound the rest. | #194 (left as is) |
| Rotation timing is "at the snap" | E3: real late rotation and the rotating safety's fit | #194 |
| Box vs three bunch verticals | the middle one goes to the deep zone (Box Trix not installed) | this PR, later |
| Not installed | stack/quads/red-zone calls (no such formations or package); Tampa variants; half-side Smack/Read/Patty (fixed splits) | this PR, later |
| Integration suite runtime | `game-record` games near the 60 s budget on slower containers, identical games with or without these changes | integration |
