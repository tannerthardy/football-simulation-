# run-defense-develop: what is in it, what it does, what is open

One page for integration. Branch `claude/run-defense-develop`
([#190](https://github.com/tannerthardy/football-simulation-/pull/190)) on
accepted develop `d91c9014`, written at `cd4a602` (2026-10-22). Every flag
this branch adds is **off** in `config/baseline.json`. A shared build opts
in. Evidence is in [the alignment review](pre-snap-alignment.md) and the
full working review, kept out of Git at
[`03c64339`](https://github.com/tannerthardy/football-simulation-/blob/03c64339/docs/reviews/run-defense-develop.md)
(1,458 lines; its arms reproduce from the scripts below).

Reproduce: `node scripts/baseline.mjs --candidate --flag X=1 ... -- <command>`.
- **Games:** `scripts/mechanics/sim-export.ts --games 8`, then `measure.py` and
  `compare.py`.
- **Operators:** `scripts/diag/depth/*.py` and `scripts/diag/runblock/*.py`
  read NFL tracking and sim exports with one code path.
- **Paired lab:** `scripts/diag/depth/forcelab.ts` uses the same seeds,
  bodies and calls per arm.
- **Reading results:** same-seed games diverge at the first play a change
  affects. Use paired lab cases for play-level mechanisms and games for
  interactions.

## First shared build

`claude/run-game-v3@83b2fe2e` (the run-offense profile) turns on `DL_SQUEEZE`
(with the held-decision fix `5dab06be`) and `DEEP_NO_FORCE`. `PULL_EARLY` is
in but off, pending a games read of backer flow on `pullers.py`.
- Run-offense paired lab: 40+ runs zone 54 → 29, gap 145 → 109, shotgun
  36 → 22.
- Two 8-game exports on that build at seed 301, defense flags off → on:
  - Zone runs reaching 10 / 20 / 40: 22.1 / 7.5 / 3.8% → 13.3 / 3.2 / 1.4%.
  - Crease gap / duo: 4.5 / 4.4 → 3.5 / 3.6 yd.
  - Deep support over the back on 20+ runs at 5 yd: −0.4 → +1.2 yd (NFL
    6.1).
- Run contacts broken stay 18–19% on that profile (develop + line set 13.2,
  NFL 12.6). That predates the build.

## Flags this branch adds

**Proposed: the line set.** The arms below were all measured with it on.

| Flag | Where | What it does |
| --- | --- | --- |
| `PAD_LEVERAGE` | `physics/world.ts` | Load added in a push adds to normal force, and the feet's traction is budgeted on it (user-requested physics; promotion stays with the primary physics owner). |
| `DL_ANCHOR` | `sim/engagement.ts` | An engaged run defender who is doubled, or driven back by a real load, sits into his stance. |
| `DL_FLATTEN` | `sim/engagement.ts` | A lineman who sees a zone step flattens down the line instead of attacking upfield. |
| `SNAP_REACT` | `sim/snap-count.ts` | The snap as perception and timing: defenders respond to the ball moving or time the cadence; a hard count can draw a timer early, and the body's act is what the rules classify (no rolled flag). The run-game branch since moved to one susceptibility for both lines. |

Result with #194's calling: run broke contact 18.8 → 12.7% (NFL 12.5);
median run 3.95 → 3.46 yd, p90 17.9 → 11.7 (NFL 3.0).

**Proposed: single mechanisms with controlled evidence.**

| Flag | Where | What it does | Evidence |
| --- | --- | --- | --- |
| `TIP_AWAY` | `sim/catching.ts` | The defender who just broke up a pass stays out of its tumbling flight. | INTs after a touch 54 → 21%; by the same defender 12 → 0 |
| `PULL_EARLY` | `sim/run-fits.ts` `pullers` | A backer keys the guard's first step (behind his stance, across, not upfield) as a pull. With `GAIT_STEP`: backers follow the pull (1.45 yd/s at 1.4 s, NFL 2.0); paired lab counter 20+ 14.2 → 9.2%, IZ unchanged | Proposed with `GAIT_STEP` |
| `DL_SQUEEZE` | `sim/engagement.ts` `stepRunRep` | An engaged first-level man whose blocker moves away from the ball flattens and fights back across toward it. | Gap-run DL flow −0.18/−0.38/−0.16 → −0.15/−0.07/+0.11 (NFL +0.24/+0.76/+1.35); crease 4.5 → 3.5; paired lab tails unchanged |
| `PASS_FEEL` | `sim/engagement.ts` `stepPassRep` | The pass blocker mirrors the rusher he has felt (0.06 s plus attention lapses) or, hands cleared, seen, not his current velocity. | Information rule; paired dropback lab inert (pressure 33.4 → 33.8%) |
| `DEEP_NO_FORCE` | `sim/run-fits.ts` `buildRunFits` | A deep-zone safety is never the fallback force player. | Paired lab: 20+ runs 15.9 → 7.2% on the plays it changes; others identical |

**Realistic tempo, kept off until its partner lands.**

| Flag | What it does | Partner |
| --- | --- | --- |
| `SAFETY_TEMPO` | Alley safeties ease down from alignment until the back declares (tempo matches tracking). | The open-field meeting (below); alone, more runs reach 10 |
| `LB_LANDMARK` | Stack backers fit at the tracked 2.25 yd landmark. | Second-level start |

**Pre-snap alignment (user-requested).** `DEF_ALIGN`, `WR_ALIGN`, `OL_SPLITS`
and `OL_STAGGER` (`playbook/alignment.ts`). `FRONT_ALIGN` and
`SHORT_PACKAGE` cover the front and short-yardage calls; their claim moved to
the def-alignment session (#194).
`OL_SPLITS` and `OL_STAGGER` are develop's line-alignment source; the
run-offense session's `OL_ALIGN` is archived with `claude/run-game-v3`.

**Not proposed (for the run-offense session's arms).** `BLOCKED_REACH`
(`tackle.ts`), `FORCE_BOUNCE` (`run-fits.ts`), `DL_CHASE`,
`DL_FLATTEN_WON` (`engagement.ts`). `DL_KEY` (a lineman mirroring the
first step in front) and `LB_TEMPO` (backers fitting at the back's tempo)
were removed at integration review: each missed tracking in two attempts and
goes back to diagnosis.

**Existing defaults, unchanged.** `ZONE_FLOW=1` is an A/B switch for the
installed zone track. `DEF_GETOFF=1` is a diagnostic latency scale.

## Where it stands (develop + line set, 8 games)

| | Sim | NFL | Source |
| --- | --- | --- | --- |
| Run broke contact | 13.2% | 12.6% | `depth/runbreak.py` |
| Runs reaching 10 / 20 / 40 (+ `SAFETY_TEMPO`) | 16.4 / 7.8 / 5.6% | 12.1 / 2.7 / 0.7% | `diag/long-run.py` |
| Deep support over the back on 20+ runs, back at 0 / 5 / 10 yd (+ `SAFETY_TEMPO`, `DEEP_NO_FORCE`) | 10.7 / 3.1 / −1.6 | 11.6 / 6.1 / 2.3 | `depth/alleypath.py` |
| Others within 3 yd at run first contact | 1.55 | 2.44 | `depth/runrally.py` |
| Interior pressure per 100 dropbacks | about 7.1 | 8.7 | `diag/pass-pressure.py` |

## Open problems and owners

| Problem | Diagnosis | Owner |
| --- | --- | --- |
| Pursuit arrival: fewer defenders reach the runner (2.10 vs 2.69 per run reaching 5 yd; DL 0.02 vs 0.30) | The meeting itself matches tracking (met 49 / 48%, broke 9 / 9%; run-game `open-field/meet.py`); DL stay latched after the back passes and never flowed with the play | DL re-latch and OZ pair flow: run-game (`SHED_PURSUE`, `BLOCK_FRONT`, W1); front-seven feet before the read: run-defense (re-diagnose; `DL_KEY` removed) |
| Edge rusher's path: deeper and wider than tracked (1.26 vs 0.69 yd at 1.0 s; edge:inside about 50% of pressures vs 23%) | The engaged `corner` aim follows the kicking tackle; the free rusher's ask is already right (cos 0.93–0.95). The user's rule: the tackle first (done: `PASS_KICK`, `PASS_RIDE`), then the rusher's decision, not a capped path | Def-alignment session (`claude/pass-pro`), default-off |
| Interior rush: pairs move as one body (engaged at the throw 97% vs 71%, with or without `GAIT_STEP`) | `GAIT_STEP=0.3` lifts interior pressure 5.9 → 7.5 per 100 (NFL 8.7) by push, not release; a pair comes apart only when a rule ends the rep (likely the same fact as run re-latch) | Physics (`GAIT_STEP` promotion); release mechanism shared with the run-offense re-latch work; the power rush (bull / long-arm as a push contest, no roll) claimed by the def-alignment session on `claude/pass-pro`; `HAND_CLEAR` (finesse clears) on hold |
| Engaged linemen cannot escape to pursue | Hand steer up to 0.7 arm force; the work-off presses into the blocker | contact/hands owner (handoff on the workboard) |
| Gap-run line flow at half the tracked size | `DL_SQUEEZE` fixes the sign; the remaining drift is the pair's legs (the down blocker's 45° drive, the run-offense session's `DOWN_SEAL`) | Shared build: `DL_SQUEEZE` + `DOWN_SEAL`, measured on `lineflow.py` |
| After-catch leverage | The front man comes back at the receiver; team leverage (the front man holds, the second arrives) | run-defense (queued, after the meeting question) |
