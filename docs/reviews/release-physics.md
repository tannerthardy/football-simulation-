# Release physics: why freed players don't get going

Main Engine, 2026-11-05. Develop `9a19ced9`, matched-restage captures for
seeds 7–8 (`b5cf5276`, `87ebf3d8`), restage environment `54199f26`.

## Question

Defense measured blocked defenders who got free near the ball carrier and
never reached him: DL asked for about 7.5 yd/s and were at 1.5 yd/s when
free and 1.4 yd/s 0.3 s later. Is that the body (separation, turning, gait)
or the request?

## What the request did

The reproducers are under `scripts/diag/`. All columns are for the 0.5 s
after a block ends.

| Tool | Measures |
|---|---|
| `_shedtrace.mts` | Defense's shed operator |
| `_relthrash.mts` | Request-direction flips over 60° between ticks, and zero requests |
| `_olrelease.mts` | The same for offensive linemen |
| `_reltrace.mts` | One body, tick by tick |
| `_edgeflip.mts` | The edge-fit picture around a flip |

- **It is mostly the request.** 49 released DL were still under 2 yd/s at
  +0.5 s. Of those, 48 had a request that flipped direction or dropped to
  zero. One asked steadily. A request read at a single tick (+0.3 s) hides
  this.
- **Flip sources** (released DL):

  | Source | Flips |
  |---|---|
  | Edge-fit station-keeping (`run-fits.ts`, edge branch `return fit`) | 19 |
  | Engaged request → run fit | 18 |
  | `declared → chase(…, 2)` | 12 |
  | Chase gather switches | 7 |
  | Pursuit go-around side flip (`aroundBodies`) | 1 |

  - The go-around flip is the witness: seed 7, I-Form Pro Outside Zone, DE_S.
    He asked for 8.8 yd/s and slowed to 0.2.
- **Zero request on the release step.** `updateEngagements` runs after every
  player has decided. A block it ends leaves the player with the command he
  gave while engaged, usually a standstill, for the whole step. This hit 61%
  of DL releases and 50% of OL releases (13% for climbers, 71–93% for
  reach, down, cutoff and pull blocks).
- **The body is fine when the request is steady.** A climbing LT asking a
  steady 5.3 yd/s accelerates at 4.5–5 yd/s². His speed looks stuck at
  1.2–1.5 yd/s only because he left the combo moving backward at 1.4 yd/s
  and has to reverse first.
- **Contact after release.** 55% of OL releases stay in contact with a
  defender for more than half of the next 0.5 s. Not yet diagnosed.

## Changed here: `RELEASE_REDECIDE` (default on)

A player whose block ends in the engagement update decides again in that
step, through the same pipeline (`PlaySim.decide`).

**Lab**, release steps with a zero request:

| Group | Off | On |
|---|---|---|
| OL | 50% | 6% |
| DL | median 1 | median 0 |

OL speed at release goes from 1.5 to 1.7 yd/s.

**Matched restage**, k = 5, 283 snaps, 1415 replays, paired, snap-clustered
SE:

| | Off | On | Paired d |
|---|---|---|---|
| All | 7.94 | 8.21 | +0.27 ± 0.16 |
| Runs | 5.10 | 5.19 | +0.09 ± 0.08 |
| Passes | 9.59 | 9.97 | +0.38 ± 0.24 |

- Touchdowns 138 → 138.
- Pass outcomes are unchanged in count: incomplete 288 → 287, tackle 476 →
  470. The pass median goes 4.07 → 4.50, with four more 40+ yd plays.
- That fits receivers and blockers leaving press and blocks without losing a
  step. It is under 2 SE, so not material.
- Rows sha: off `100f3b7f559edb42`, on `c9efb2664c8f24ba`.

**Tests.** `npm test` 3741/3741 and typecheck clean. Two tests changed:
- The Cover 6 dig scene is observed through 3.3 s, because the rusher now
  gets home at 3.35 s. The coverage contract is unchanged.
- The S8-P005 ledger case re-records the SS wrap from 4.25 to 4.15 s.

## Parked and handed over

- **Run-fit flip sources go to Defense** (agreed 2026-11-05): edge
  station-keeping, the declared → chase handover and gather switches.
  - A contact-loaded edge should still play a runner within reach, but only
    once that runner is at or past his surface, which keeps the box/spill
    contract (`edge-fit-approach.test.ts`).
- **Two attempts here did not move shed outcomes** on seeds 7–8 (edge DL
  made the play 32% vs 32%). Both went to Defense as a patch:
  - a committed side round a body (`AROUND_COMMIT`), which fixes the witness;
  - an edge that plays a runner inside him or within reach (`EDGE_PLAY`),
    which breaks that contract.

## Next

- Post-release contact: is the player moving away while contact holds him,
  or asking to go through the man he left?
- Re-measure on more seeds once Defense's request work lands.
