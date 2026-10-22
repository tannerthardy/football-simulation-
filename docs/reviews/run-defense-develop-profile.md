# run-defense-develop: what is in it, what it does, what is open

One page for integration. Branch `claude/run-defense-develop`
([#190](https://github.com/tannerthardy/football-simulation-/pull/190)) on
accepted develop `d91c9014`, written at `cd4a602` (2026-10-22). Every flag
this branch adds is **off** in `config/baseline.json`. A shared build opts
in. Evidence is in [the review](run-defense-develop.md) and
[the alignment review](pre-snap-alignment.md).

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
| `PASS_FEEL` | `sim/engagement.ts` `stepPassRep` | The pass blocker mirrors the rusher he has felt (0.06 s plus attention lapses) or, hands cleared, seen, not his current velocity. | Information rule; paired dropback lab inert (pressure 33.4 → 33.8%) |
| `DEEP_NO_FORCE` | `sim/run-fits.ts` `buildRunFits` | A deep-zone safety is never the fallback force player. | Paired lab: 20+ runs 15.9 → 7.2% on the plays it changes; others identical |

**Realistic tempo, kept off until its partner lands.**

| Flag | What it does | Partner |
| --- | --- | --- |
| `SAFETY_TEMPO` | Alley safeties ease down from alignment until the back declares (tempo matches tracking). | The open-field meeting (below); alone, more runs reach 10 |
| `LB_TEMPO`, `LB_LANDMARK` | Stack backers fit at the back's tempo, at the tracked 2.25 yd landmark. | Second-level start |

**Pre-snap alignment (user-requested).** `DEF_ALIGN`, `WR_ALIGN`, `OL_SPLITS`
and `OL_STAGGER` (`playbook/alignment.ts`). `FRONT_ALIGN` and
`SHORT_PACKAGE` cover the front and short-yardage calls; their claim moved to
the def-alignment session (#194).

**Not proposed (for the run-offense session's arms).** `BLOCKED_REACH`
(`tackle.ts`), `PULL_EARLY`, `FORCE_BOUNCE` (`run-fits.ts`), `DL_CHASE`,
`DL_FLATTEN_WON` (`engagement.ts`) and `DL_KEY` (`defense.ts`).

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
| Open-field meeting: last-level and after-catch tacklers lose 1-on-1 | Coming early and holding late both lose. In 20+ runs the deep man is passed 2–3 yd wide (about half) or his tackle breaks (about a third); `TACKLE_HOLD` after the catch agrees | Shared: near approach (`gatheringApproach`) and tackle; not the fit's aim |
| Interior rush: pairs move as one body (engaged at the throw 96.9% vs 70.9%) | Hands come off only through `resolveMove`'s rated roll (4.5% of windows); with `PASS_FEEL` a landed move does gain | run-defense: physical hand clear, design under review |
| Engaged linemen cannot escape to pursue | Hand steer up to 0.7 arm force; the work-off presses into the blocker | contact/hands owner (handoff on the workboard) |
| Crease and down-block wash | `DL_SQUEEZE` v2 narrows the crease but exposes the cutback; needs the scrape backer's fill | run-defense (queued) |
| After-catch leverage | The front man comes back at the receiver; team leverage (the front man holds, the second arrives) | run-defense (queued, after the meeting question) |
