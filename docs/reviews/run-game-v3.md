# Run game v3: where it is weakest, and flagged repairs — 2026-10-18

Branch `claude/run-game-v3` from accepted develop `f414627`. Not integrated.
Every change is a default-off flag; flags off, the zone lab is identical on
1,200/1,200 plays (yards and every tracked position; rechecked after Part 3,
`report-id0.txt`). 1,913 TS tests and
typecheck pass on Node 22.23.3.

## Question

Where is the current run game furthest from real football, by frequency and
consequence, and which controller mechanisms repair it without touching the
World, capacities or tackling?

## Method

- **Zone lab:** ace 12 (under center), IZ/OZ/WZ both ways, 10 looks,
  pair11/pair31, 10 seeds. That is 1,200 plays per arm, starting 70 yd from
  the goal.
- **Transfer sets:** seeds 77/71001/1/2/3 throughout.
  - Gap schemes: power/counter/duo/trap from I-form 21 and ace 12 (1,600 plays).
  - Zone from gun doubles 11, pistol 12 and I-form 21 (1,800 plays).
- **Counts:** errors and plays still live at 20 s are counted in every
  receipt; both are zero for every arm.
- **NFL comparison:** the same Python operators run on 2022 NFL tracking
  (`out/mechanics/nfl-plays.jsonl.gz`) and on the sim's common play format.
  - Outcome rows use NFL runs with 60+ yd to the goal ("NFL60"), because lab
    plays start 70 yd out.
  - Concept rows use PFF's labels; sim OZ and WZ both compare with NFL outside
    zone, and sim duo compares with NFL PFF "MAN", a broader provider label
    than verified duo.
- **Receipts:** [per-arm reports](run-game-v3/) (`report-LABEL.txt`, labels
  below) and [mechanism comparisons](run-game-v3/mechanisms.txt).
- **Raw traces:** these stay in ignored `out/open-field/all/`. Regenerate an
  arm with `NODE_BIN=<node 22.23.3 bin> scripts/diag/open-field/run.sh LABEL FLAG=1 ... [-- --formations F --concepts C --seeds S]`,
  then `common.sh LABEL` and `report.py LABEL`.

## Ranking on develop

| Weakness | Evidence (sim vs NFL, same operator) | Consequence |
|---|---|---|
| 1. Inside-zone breakaways | IZ 20+ 7.0% vs 1.4%, 40+ 5.5% vs 0.18%; mean 8.45 vs 4.51 | About 4 yd a carry on the most common inside run |
| 2. The line does not slide on zone | At 2.0 s on OZ: OL 2.1 vs 4.9 yd lateral, DL 1.5 vs 4.5, backside DL 0.9 vs 4.9. At 1.0 s the OL has gone 0.6–0.8 yd lateral and 0.4 forward; NFL OL go 1.7–2.0 lateral and 0.1–0.6 forward. Engaged OL lateral speed 1.0 vs 3.0 yd/s | Gaps, fits and the runner's read all sit on a static line |
| 3. Stretch losses | OZ/WZ negatives 14–21% vs 9.5%; 4+ 30% vs 46% | Every outside run |
| 4. Secondary collapses | Deepest defender at 3.0 s is 8.0 yd vs 12.7 | Hides a soft box; a long-run tail when he misses |
| 5. Under-center mesh is late and shallow | Handoff OZ 1.55 s vs 1.4, IZ 1.5 vs 1.3; back 3.9 yd deep vs 5.1 | Timing of every under-center run |

**Stretch losses** (`scripts/diag/stretch/losses.ts`): in 74 of 95 losses the
first hold comes from a play-side end blocked by a tight end's reach. The end
walks into the backfield for two reasons:

- The tight end sprints straight at the end's shoulder (about 7.6 yd/s
  upfield, 4.3 sideways) instead of running the zone track.
- Once engaged, the reach request matches the end's attacking normal motion,
  so the blocker's feet retreat at up to 1 yd/s with no load
  (`scripts/diag/stretch/pairtrace.ts`).

At 2.5 s, 51% of play-side ends are more than 0.5 yd in the backfield
(NFL 33%).

## Changes (all default-off)

| Flag | Mechanism repaired | Where |
|---|---|---|
| `UC_MESH` | Under-center inside mesh at tracked depth (QB 4.4, back 5.0). Exchange timed to the QB's own snap reaction, pivot and sprint law. QB keeps moving through the spot; the back rides every inside mesh. Shotgun/pistol unchanged. | `meshFor` (`assign.ts`), `QBHandoff` pass-through parameter |
| `ZONE_TE` | An inline tight end on a zone call runs the same lateral-first track as the OL. When his man's play-side shoulder is inside him (a slant), he takes the man where he goes rather than holding the track tempo. | `RunBlocker.update` eligibility and `zoneFlow` (`blocking.ts`) |
| `STRETCH_FLAT` | A stretch reach blocker never asks his feet to retreat; felt load still takes ground, and the existing anchor answers it | `stepRunRep` blocker request |
| `LB_KEY` | A backer keys the back's first step: 0.3 yd from his public alignment, in the backer's own delayed picture. Previously he waited for a developed 1.5 yd/s lateral speed. | `run-fits.ts` flow read |
| `DEEP_CAP` | A deep-zone alley defender keeps installed depth until the runner he sees crosses the line, then ordinary chase (ported from `claude/open-field-tackling`) | `run-fits.ts` |
| `BACK_CHASE` | An engaged first-level defender the ball has gone away from pursues down the line, a yard behind the ball, instead of holding his shoulder on the blocker. Flow comes from his own picture of the runner. He keeps his held depth and never pursues against the flow; lag duties stay home. | `runContactRead` and the defender request in `stepRunRep` (`engagement.ts`) |
| `RUN_LATERAL` | Run-rep lateral requests are bounded by the body's square lateral speed (vmax × shuffle), not the pass-protection mirror trait | `stepRunRep` blocker mirror and defender flow bound |
| `MESH_TEMPO` | The back takes the handoff moving: he settles until his own full-effort time to the mesh uses up the time left, then runs through it. In shotgun the offset back meets the ball on his own side of the QB (0.4 yd up, 0.7 yd over, as tracked) instead of crossing his face to a far-side spot. Draw and toss unchanged. | `RunnerToMesh` and `meshFor` (`assign.ts`) |
| `SHED_PURSUE` | Once the runner a blocked defender sees is past the line, he works off the block toward the ball at any range, not only within 3.5 yd. When the rep ends because the runner has passed him, the same blocker cannot re-latch him for the shed window (0.6 s); bodies still collide. | Shed gate and rep end in `engagement.ts` |
| `DEF_GETOFF` (diagnostic scale, default 1) | Defensive snap latency is an unfitted assumption; NFL box defenders and OL first move at the same median time | `agent.ts`; shared perception, owner decides |

Contract tests: `test/stretch-flat.test.ts`, `test/run-game-flags.test.ts`,
`test/back-chase.test.ts`, `test/deep-cap.test.ts` and
`test/shed-pursue.test.ts`. They cover default-off behavior, both flips or
sides, and unaffected cases.

## Results

The candidate is `UC_MESH ZONE_TE STRETCH_FLAT LB_KEY`, with `DEEP_CAP` off
(label `rec2`).

| Ace zone lab (1,200) | Neg | 4+ | 10+ | 20+ | 40+ | Mean | P(40+\|20+) |
|---|---|---|---|---|---|---|---|
| Develop (`d0`) | 12.8 | 38.4 | 10.1 | 5.0 | 3.75 | 6.19 | 0.75 |
| Candidate (`rec2`) | 12.6 | 36.7 | 7.0 | 3.1 | 2.33 | 5.04 | 0.76 |
| NFL60 | 8.6 | 48.8 | 13.1 | 3.0 | 1.18 | 5.00 | 0.39 |

By concept, develop → candidate (NFL60):

| | Neg | 4+ | 20+ | 40+ | Mean |
|---|---|---|---|---|---|
| IZ | 3.2 → 3.5 (4.9) | 54.5 → 41.8 (49.5) | 7.0 → 1.2 (1.4) | 5.50 → 0.50 (0.18) | 8.45 → 4.73 (4.51) |
| OZ | 14.2 → 15.5 (9.5) | 29.8 → 34.5 (46.4) | 4.0 → 3.2 (2.8) | 2.50 → 2.50 (1.16) | 5.15 → 4.80 (4.68) |
| WZ | 20.8 → 18.8 (9.5) | 31.0 → 33.8 (46.4) | 4.0 → 4.8 (2.8) | 3.25 → 4.00 (1.16) | 4.99 → 5.61 (4.68) |

Transfer, develop → candidate:

| Set | Neg | 4+ | 20+ | 40+ | Mean |
|---|---|---|---|---|---|
| Gap schemes, I-form and ace (1,600; `d0gap` → `rec2gap`) | 11.0 → 9.1 | 48.6 → 40.8 | 5.1 → 5.1 | 4.00 → 3.75 | 6.67 → 6.17 |
| Zone, gun/pistol/I-form (1,800; `d0tf` → `rec2tf`) | 11.2 → 13.0 | 40.6 → 38.1 | 5.8 → 4.4 | 4.44 → 3.56 | 6.72 → 5.86 |

Transfer cells that move most (200 plays each; mean, negative %, 4+ %):

| Formation and concept | Develop | Candidate |
|---|---|---|
| I-form IZ | 8.6, 5, 54 | 7.1, 5, 54 |
| Gun doubles IZ | 5.0, 6, 40 | 5.2, 11, 32 |
| Gun doubles OZ | 8.3, 9, 40 | 6.0, 14, 38 |
| Gun doubles WZ | 8.5, 10, 42 | 8.3, 20, 36 |
| Pistol WZ | 7.1, 16, 43 | 6.5, 12, 40 |
| Ace power | 7.7, 10, 50 | 7.2, 6, 39 |
| Ace counter | 6.3, 16, 40 | 5.3, 13, 26 |
| I-form duo | 6.9, 6, 58 | 5.5, 3, 42 |

Mechanisms, moving toward NFL:

- Play-side ends more than 0.5 yd in the backfield at 2.5 s: 51% → 38%
  (NFL 33%) with the two stretch flags.
- Inside-zone backside LB flow at 2.0 s: 0.4 → 1.3 yd (NFL 2.3) with `LB_KEY`.
- Deepest defender at 3.0 s: 8.0 → 12.1 yd (NFL 12.7) with `DEEP_CAP`.
- Mesh: OZ handoff 1.55 → 1.45 s (NFL singleback 1.4), IZ 1.5 → 1.3 (1.3).
  Back depth at the handoff 3.9 → 4.7 yd (5.1).

Each flag alone, ace OZ/WZ and gun/pistol OZ/WZ (800 plays each), negative %:

| Flag | Ace OZ / WZ | Gun OZ / WZ | Pistol OZ / WZ |
|---|---|---|---|
| Develop | 14 / 21 | 9 / 10 | 8 / 16 |
| `ZONE_TE` | 14 / 15 | 15 / 12 | 10 / 11 |
| `STRETCH_FLAT` | 14 / 19 | 10 / 10 | 10 / 10 |
| `LB_KEY` | — | 9 / 11 | 9 / 13 |

`UC_MESH` alone (`m1`) raises ace OZ/WZ negatives to 21/28%. A later, deeper
back meets an end who has already penetrated.

## What it means

- Under-center inside zone is the big win. Its breakaway tail and mean move
  onto NFL (mean 8.45 → 4.73, 20+ 7.0 → 1.2%), and the ace lab's overall mean
  and 20+ now match NFL60. 4+ overshoots low (41.8 vs 49.5).
- The mesh repair is right, and it exposes stretch losses. The tight-end track
  recovers them in two-TE and pistol sets. Outside-zone negatives stay about
  6–9 points high, because the line still does not slide.
- **Known adverse: gun doubles.** In 11-personnel shotgun, `ZONE_TE` delays the
  lone end's fit; he first engages at about 1.3 s while running his track
  (`scripts/diag/stretch/losses.ts --formation gun_doubles_11`). `LB_KEY`
  reads the offset back's mesh path as his first step. Gun stretch and IZ
  negatives rise 4–10 points, from a cell that was already NFL-like.
- **Gap schemes:** fewer negatives everywhere except trap, but 4+ drops on
  counter and power, which were already below NFL.
- **`ZONE_TE` is not a clean mechanism win.** With it alone on ace stretch:
  - Play-side ends sit at NFL depth at 2.5 s (more than 0.5 yd in the
    backfield 51% → 36%, NFL 33%).
  - They flow less sideways (3.1 → 2.5 yd, NFL 5.2).
  - With the candidate on, the tight end first engages later (about 0.70 s
    vs 0.40), and his block ends by separation twice as often (29 vs 15 of 81
    losses).
  - In gun doubles inside zone alone, it raises negatives 6.0 → 10.5% and
    lowers 4+ 40.5 → 33.5%.

  Part of its ace inside-zone gain may come from a weaker tight-end block
  rather than better football. Ace stretch losses in total are unchanged with
  the candidate (17.5 → 17.2%; `losses.ts` 82 → 81 of 400). Review it before
  relying on it.
- `DEEP_CAP` puts the last level at NFL depth and confirms the earlier finding:
  without the collapsed safety, the box leaks 10–19 yd runs (10+ 23.8% with
  the cap alone, `report-cap.txt`; 20.7% on the first package, NFL60 13.1%). Inside-zone 10+ runs mostly get
  their first hold 6+ yd downfield, from a safety or corner. The leak is not
  linebacker placement:
  - At the line crossing, the nearest free second-level defender is closer
    than NFL's (2.9 vs 3.6 yd).
  - Second-level block episodes match NFL's.
  - Engaged linemen convert a runner within 1.6 yd into first contact about as
    often as NFL linemen (49% vs 54%). There are simply fewer of them there
    (35% vs 42% of crossings), because the line does not slide.
- 40+ falls (3.75 → 2.33% on ace) but stays twice NFL's. Once past the last
  defender the runner is not caught; that is open-field pursuit.

## Tried and stopped

- **`ZONE_RACE`** (the reach blocker keeps the track tempo through contact):
  - Alone: negatives 21.7%.
  - With the stretch flags: negatives 15.1 → 19.2%, DL lateral 1.45 → 1.50 yd.

  That is two attempts and no lateral race, so it was removed. Requests alone
  do not make the race: an earlier counterfactual with both sides requesting
  3.4 yd/s reached about 70% of NFL flow. Engaged lateral motion is limited in
  contact, not by any single request.
- **`ZONE_TE`** has had two attempts: the track, then following a slant. Its
  gun-doubles regression is documented above, not tuned further.

## Part 2 — backside pursuit, the tail and contact (2026-10-19)

Receipts: [part2.txt](run-game-v3/part2.txt), [holds.txt](run-game-v3/holds.txt)
and the per-arm `report-LABEL.txt` files for `bc`, `rl`, `rlc`, `r3`, `r3c`
and `r3cr`.

### Backside defensive line does not pursue (`BACK_CHASE`)

Box defenders aligned backside of the ball; lateral flow at 2.5 s, + toward
the runner's side (`dldepth.py`):

| Scheme | NFL | Sim develop |
|---|---|---|
| Outside zone | +6.6 yd | +1.5 |
| Inside zone | +3.1 | +0.5 |
| Power/counter/trap | +2.4 | −1.3 |
| Duo | +0.8 | −1.5 |

An engaged lineman aims at a fixed shoulder offset on his blocker. A cutoff
blocker matches the lineman's speed, so neither side leads.

`BACK_CHASE` changes the lineman's choice. Once the ball has visibly gone
away from him (lateral speed, or the back's first step from his alignment),
he pursues down the line, a yard behind the ball. He holds his depth and
never pursues against the flow; lag duties stay home.

| Backside flow at 2.0 / 2.5 s | NFL | Develop | `BACK_CHASE` |
|---|---|---|---|
| Outside zone | 4.9 / 6.6 yd | 0.9 / 1.5 | 2.1 / 3.3 |
| Inside zone | 2.5 / 3.1 | 0.2 / 0.5 | 1.1 / 1.9 |

Outcomes (`bc`, ace lab):

| | Develop | `BACK_CHASE` | NFL60 |
|---|---|---|---|
| IZ mean | 8.45 | 7.49 | 4.51 |
| OZ negatives | 14.2% | 17.8% | 9.5% |
| WZ negatives | 20.8% | 17.8% | 9.5% |
| 40+ overall | 3.75% | 4.50% | 1.18% |

On film (`iz/strong/ace_12/over3/pair11/7`), the backside tackle crosses the
center by 2.0 s, as NFL backside linemen do. The back keeps his designed
B-gap track into him rather than cutting back behind the overflow.

`RUN_READ=1` re-tested on top of this package is much worse (negatives 19.2%,
4+ 26.0%), so the existing press-and-read is not the answer to the cutback.

### Run-rep lateral bound (`RUN_LATERAL`)

Engaged lateral requests were capped by the pass-protection mirror trait:
square shuffle speed discounted by agility, about 2.6 yd/s for OL and 3.0
for DL. NFL engaged OL lateral speed is 3.0 yd/s at the median.

Lifting the cap to the body's own square lateral speed barely moves flow:

- DL lateral at 2.0 s: 1.45 → 1.55 yd.
- Engaged OL lateral speed: 1.0 → 1.25 yd/s.
- Wide-zone negatives: 20.8 → 14.5%.

The first second is unchanged: OL lateral at 1.0 s stays 0.74 yd vs NFL 1.86.

### Combined arms

| Arm | Neg | 4+ | 10+ | 20+ | 40+ | Mean |
|---|---|---|---|---|---|---|
| `rec2` + `BACK_CHASE RUN_LATERAL` (`r3`) | 14.8 | 30.2 | 7.0 | 3.9 | 2.92 | 5.00 |
| `r3` + `DEEP_CAP` (`r3c`) | 13.8 | 37.2 | 18.2 | 3.7 | 2.75 | 5.89 |
| NFL60 | 8.6 | 48.8 | 13.1 | 3.0 | 1.18 | 5.00 |

P(40+ \| 10+) is 0.42 for `r3` and 0.15 for `r3c` (NFL60 0.09).

**Whole-distribution check** (`shape.py`: total variation distance over gain
bins, NFL60; 0 = identical shape):

| Arm | Distance |
|---|---|
| Develop | 0.161 |
| `DEF_GETOFF=0.5` | 0.154 |
| `rec2` | 0.173 |
| `bc` | 0.197 |
| `r3` | 0.235 |
| `r3c` | 0.248 |

No controller package beats develop on the whole distribution. Each flag
moves its own mechanism toward NFL; a more realistic defense mostly exposes
the two physical limits below.

### Where ordinary runs go wrong: stuffs and the missing middle

Share of runs by gain:

| Gain | NFL60 | Develop | `r3c` |
|---|---|---|---|
| −2 or worse | 3.2% | 0.1% | 0.1% |
| −2 to 0 | 5.4% | 12.7% | 13.8% |
| 0 to 1 | 6.6% | 9.3% | 14.4% |
| 6 to 10 | 16.6% | 12.8% | 6.1% |
| 10 to 20 | 10.1% | 5.1% | 14.5% |

The medians of yards before and after first contact match NFL (0.5 vs 0.6,
2.2 vs 2.4). The difference is in what happens after a contact near the
line. Median final gain by first-contact location (`aftercontact.py`):

| First contact at | NFL60 | Develop |
|---|---|---|
| −2 to −1 yd | +1.0 (44% under 1) | −0.6 (84%) |
| −1 to 0 | +2.0 (16%) | +1.1 (43%) |
| 0 to 1 | +3.0 | +2.7 |
| 1 yd or more | about equal | |

| Contact measure | Sim | NFL |
|---|---|---|
| First contact to selected ending (median) | 0.8 s | 1.4 s |
| Yards after contact, slow contact-centred speed | 0.4 | 1.1 |
| Yards after contact, mid | 1.4 | 2.3 |
| Yards after contact, fast | 3.0 | 3.6 |

The interval runs from the first-contact event to the selected ending. NFL
keeps the provider's first-contact label and the earliest ending label, or
the last tracked frame when none exists. Sim first contact includes body
collisions and grasps. Neither is a measured grip duration, and the two event
systems are not certified equivalent. Speeds are contact-centred estimates
over ±0.2 s of 0.1 yd positions, not clean entry speed.
| Defenders within 2 yd at the end (median) | 2 | 3 |

**Held carriers are seen off their feet about 0.3 s after the first hold**
(`bondend.ts`). The helper emits one row per play with a sampled
post-handoff bond (357 rows). 95–98% of them show the carrier not up while
bonded; the median from the first bond to that sample is 0.30/0.30/0.35 s
across the three depth bands. Rows are plays, not independent holds: the
start never resets after a release, and a later bond can supply the sample.
There is no measured NFL fall time to compare with.

- **The carrier's request does not matter.** Counterfactual requests while
  held were tried: no lean, keep current velocity, current speed north, and
  vmax north. Hold to fall stays 0.3–0.35 s, and yards after the hold move by
  0.1–0.3. A held-runner "get north" flag was tried and removed for that
  reason.
- **The parked tackle flags do not change it.** `WRAP_BIND`, `TACKLE_ROLL`
  and `TACKLE_TOUCH` all leave it at 0.3–0.45 s.
- **One traced hold** (`holdtrace.ts`) is a legitimate side tackle. A
  linebacker crossing at about 5 yd/s tightens a grip to 0.5 yd. The
  runner's aggregate felt force reaches −2.29 body weights laterally at
  0.25 s (felt force from every source, not an isolated grip tension; the
  helper sums joint capacity, not tension), and he falls at 0.4 s. Whether nearly every hold should end that fast is a
  tackle/support question.

### The 40+ tail: structure first, then execution

Pursuit feasibility when the runner reaches 10 yd (`pursuit.py`): a straight
intercept test of every defender against the runner's actual later path at
his own whole-play peak speed, with 0.3 s to react. A retrospective
geometric proxy: it ignores blockers, acceleration, facing and contact, and an
early tackle truncates the path; it is not proof of attainable support.

| At 10 yd | NFL60 | Develop | `DEEP_CAP` |
|---|---|---|---|
| Defenders still ahead (median) | 3 | 1 | 2 |
| No defender intersects the path by 40 yd past this point (+50 from the line) | 20% | 41% | 26% |
| Share of 10+ runs that went 40+ | 9% | 39% | 17% |

With `DEEP_CAP` the structure is close to NFL. Of its 48 runs of 40+:

- 29 had an open-field hold (18 where every hold broke).
- 7 were missed attempts.

The breaks are the earlier finding: flat-footed DBs (1–2.5 yd/s) taking arm
holds (grip 0.1–0.4) on a runner at 8+ yd/s. Approach and chase finishing have
already had their two attempts (`claude/open-field-tackling`). What remains is
tackle physics at speed.

## Part 3 — the mesh, the secondary and getting off blocks (2026-10-19)

Receipts: [part3.txt](run-game-v3/part3.txt) and
[part3-gap.txt](run-game-v3/part3-gap.txt) (every operator below, NFL and
sim, with flags). Also `report-LABEL.txt` for `mt`, `mt2tf`, `sp`, `spc`,
`sp0`, `sptf`, `spgap`, `spcgap`, the pull arms and `id0`. Labels:

- `mtr`: `rec2` + `MESH_TEMPO`.
- `sp`: `mtr` + `SHED_PURSUE`.
- `c` suffix: + `DEEP_CAP`.
- `tf`: zone transfer; `gap`: gap schemes.
- `mtrtf`: before the shotgun spot change; `mt2tf`: after it.

Flags off, the ace lab (`id0`) reproduces develop's report byte for byte
with 0 of 1,200 per-play gains changed.

### Backs take the handoff standing still (`MESH_TEMPO`)

Speed at the handoff (`rbspeed.py`, yd/s):

| | NFL | Develop | `MESH_TEMPO` |
|---|---|---|---|
| Under center IZ | 4.43 | 2.24 | 4.37 |
| Under center OZ | 5.48 | 4.37 | 4.95 |
| Gap (power/counter/trap) | 4.61 | 2.14 | 4.04 |
| Duo | 4.26 | 2.14 | 3.69 |
| Shotgun IZ | 3.82 | 1.25 | 2.30 |
| Shotgun OZ | 4.67 | 1.95 | 2.50 |

Develop's back arrives early and brakes onto the spot. With the flag he
settles, then runs through it on his own reach law.

In shotgun the first version only reached 1.95 yd/s. The spacing layer
correctly cut his 9.4 yd/s request to about 3, because his straight track to
a far-side spot ran through the QB's body. Tracking puts the exchange on the
back's own side on 93% of shotgun IZ (`meshgeo.py`: 0.4 yd in front of the
QB and 0.7 yd over). The flag now uses that spot.

The remaining shotgun shortfall is runway: sim backs align 1.6 yd beside the
QB and 0.2 deep, NFL backs 2.3 and 0.5. That is a formation question, not
changed here.

Handing off only when the back reaches the spot, rather than at first arm's
reach, was tried. It raised shotgun handoff speed only to 2.66, and shotgun
IZ negatives rose from 4 to 8%. It was reverted
(`superseded/report-mt3*-handoffgate.txt`).

| Arm (neg / 4+ / 40+ / TVD) | Before `MESH_TEMPO` (`rec2*`) | With it (`mtr`, `mt2tf`, `mtrgap`) |
|---|---|---|
| Ace zone | 12.6 / 36.7 / 2.33 / 0.173 | 9.6 / 43.8 / 2.58 / 0.160 |
| Zone transfer | 13.0 / 38.1 / 3.56 / 0.166 | 9.7 / 39.0 / 2.67 / 0.142 |
| Gap schemes | 9.1 / 40.8 / 3.75 / 0.144 | 6.1 / 47.2 / 5.38 / 0.120 |

NFL60 for reference: neg 8.6, 4+ 48.8, 40+ 1.18.

Negatives and 4+ move toward NFL in all three sets. The adverse result is the
gap-scheme tail: power 40+ is 10% (`report-mtrgap.txt`).

`MESH_TEMPO` does not cover the stretch exposure that `UC_MESH` opens.
With `UC_MESH` alone (`m1`), ace negatives are 17.5%; adding only
`MESH_TEMPO` (`mt`) gives 18.0% (OZ 22%, WZ 30%). The stretch flags stay
part of the package.

### The secondary: `DEEP_CAP` fixes the deep man; the rest already matches

Depth past the line by snap alignment group, and depth given up by the
crossing (`dbgroups.py`):

| Group | NFL60 | Develop | `DEEP_CAP` |
|---|---|---|---|
| Deep (10+ yd at the snap) | 13.2 → 13.0, gives 0.5 | 12 → 7.3, gives 5.3 | 12 → 11.9, gives 0.5 |
| Off-wide (5–10 yd, > 8 yd out) | 7.2 → 8.3 | 6 → 6.4 | 6 → 7.0 |
| Mid-inside (5–10 yd, inside) | 5.7 → 3.8 | 5 → 2.7 | 5 → 3.1 |

The NFL deep man first gains depth (14.7 yd at handoff + 0.5 s).

### What makes the 40+ tail: nobody arrives

For runs reaching 10 yd (`carrierpace.py`), carrier speed is close to NFL
(about 7.0–7.5 vs 6.8–7.1 yd/s). What differs is the crowd: NFL keeps 2
defenders within 3 yd from +2 through +12, the sim drops to 1 by +8.

At +8 yd (`crowd` rows in `part3.txt`), per run:

| Within 6 yd of the carrier, or ahead of him | NFL | Sim (`mtrc`) |
|---|---|---|
| DL | 1.22 | 0.35 |
| LB | 1.92 | 0.95 |

Past +8 yd (`openfield.py`), sim runs get 1.0–1.25 first approaches within
a yard per defender per run, against NFL's 1.9. After an NFL approach the
play ends within 1 s 71% of the time; 20% fall in the residual category
(neither ended nor a motion-based escape, which requires no measured
slowing). After a sim approach it ends within 1 s 91–97% of the time.
Several defenders can count against the same ending.

### Engaged defenders were re-latched every tick (`SHED_PURSUE`)

After the ball crosses, 81% of sim DL stay within 1.2 yd of an offensive
player for the next second; NFL's fall from 76 to 57% (`release.py`, a
proximity proxy, not an engagement; corrected admission, see Part 4).

The engagement log shows why (`relatch.ts`, ace IZ/OZ, 160 plays, `mtr`
flags):

- 644 DL reps ended "runner passed defender" after the crossing.
- 492 were followed within two native ticks (< 0.105 s), counted per rep
  event, by a new rep from the same blocker within 60° of the defender's
  facing; two more from the side. Linebackers: 79.
- A defender also never tried to work off a block unless the runner was
  within 3.5 yd.

`SHED_PURSUE` gives the shed window to that rep end and lets him work off
toward a runner past the line at any range. Results (`frontstate.ts`):

- Same-blocker repeats within two ticks fall to 0 (DL and LB). Seven
  other-blocker DL repeats remain.
- DL still in a rep 1 s after the crossing: 70 → 37%.

Outcome changes are small-count differences; the paired tests in Part 4
find none detectable (40+ counts below are per 1,200, 1,800 or 1,600):

| | Without | With `SHED_PURSUE` |
|---|---|---|
| Ace package 40+ | 2.58 | 2.17 |
| Ace with cap 40+ | 3.25 | 2.75 |
| Zone transfer 40+ / TVD | 2.67 / 0.142 | 2.50 / 0.135 |
| Gap schemes 40+ / TVD | 5.38 / 0.120 | 4.88 / 0.118 |
| Alone on develop 40+ / TVD | 3.75 / 0.161 | 4.25 / 0.166 |

Proximity tie-up does not change (DL 80%): the lineman is now free but still
next to the blocker. Free DL request about 8 yd/s and move at 2.3–3.0 with
full balance capacity:

- Their tau is 1.2–1.5 s.
- 22% are still turning more than 90° from their request.
- 16% are touching a blocker's body.

That start-up is the World's gait, not a request. It is the same start-up
acceleration already handed off for the OL.

### Inside zone never bends back (`lanes.py`, `lineholes.py`)

Under center, NFL IZ runners cross:

| Lane | NFL | Develop | `sp` |
|---|---|---|---|
| Cutback | 4% | 0% | 0% |
| Middle (within 1 yd of the ball) | 26% | 1% | 11% |
| Playside | 48% | 74% | 73% |
| Outside | 21% | 26% | 16% |

As the runner reaches −2 yd, a middle opening of at least 1 yd exists about
as often in the sim (32–38%) as in NFL (33%). When the playside is closed
and the middle open:

- NFL backs bend to the middle 38% of the time and bounce 12%.
- Sim backs bend 11% and bounce 38%.

His read is not missing it (`bendread.ts`). In 67 of 123 reads, the first
defender his threat model expects at the best middle entry is the
double-teamed 1- or 3-technique. That defender is still engaged, 1.5 yd deep
in the A gap, and is there 0.8 s before the back. Engaged DL depth at 3 s is
+0.2 yd in the sim against +1.0 for NFL. The bend waits on the double team
moving its man, which is the contact handoff below. The read model was left
alone: it deliberately does not credit blocks.

Second-level block episodes otherwise match NFL (`lbblocks.py`: 74% vs 74%
blocked on IZ, similar timing). Second-level motion before the crossing
matches too (`lbmotion.py`).

The second level differs after the crossing (`lbpass2.py`):

| 10+ runs, per run | NFL | Sim |
|---|---|---|
| Second-level approaches within 1 yd | 0.52 | 0.07 |
| Defenders with an OL/TE within 1.5 yd at closest approach | 0.80 | 1.47–1.66 |

These are closest approaches per outcome-selected 10+ run (NFL n 56, sim 95
or 45), not labelled contacts or broken tackles. They are consistent with,
but do not show, NFL backers being carried through where sim holds stop the
runner.

### Gap schemes: the pull is late, and so is the read (`part3-gap.txt`)

`MESH_TEMPO` gives power NFL-like backfield timing:

- Handoff speed 4.04 vs 4.61 yd/s; handoff to the line 1.4 vs 1.5 s.
- Power's body moves onto NFL: negatives 14.5 → 10.5% (NFL 8.0), 4+ 38 →
  51% (57), 10+ 8.8 → 15.5% (14.3).

Its tail does not: 40+ is 8–10% (NFL 1.3).

`DEEP_CAP` is not the answer here. With it (`spcgap`), gap-scheme 10+ runs
reach 31% (NFL60 13.1) and TVD 0.226: the box cannot hold power without the
collapsed safety.

The pull itself (`pullers.py`):

| | NFL | Sim |
|---|---|---|
| Puller reaches 1.5 yd/s laterally | 0.4 s | 0.7–0.8 s |
| Puller lateral yd at 0.6 / 1.0 / 1.4 s | 0.8 / 2.0 / 3.4 | 0.2 / 0.9 / 1.9 |
| Second level toward the pull at 1.0 / 1.4 s | 1.5 / 2.0 yd/s | about 0 |

Before the crossing, backers' lateral speed toward the play is 1.75–2.0 yd/s
in the NFL and 0.5–1.5 in the sim (`lbmotion.py`). In sim 10+ runs,
second-level defenders end up blocked (1.5 per run, NFL 1.0) or free but far
(1.4, NFL 0.8).

**The puller.** He drops straight back to a corner, so his request is capped
at about 2.65 yd/s. When he turns, spacing trims him while he passes behind
the center. Under the gait's lag, low requests also accelerate slowly. Two
controller attempts did not repair it:

- The existing `PULL_STEP` (open step), and `DL_FIGHT` with it. Puller
  lateral is 0.3/0.9/1.9 yd; TVD 0.129/0.142 against 0.118.
- `PULL_TEMPO`, new: run the first step through at full effort. Puller
  lateral is 0.3/1.0/2.1 yd and power 4+ falls. It was reverted.

`GAIT_STEP=0.3` (the World gait flag) with `PULL_STEP` puts the puller on
tracked timing: 1.5 yd/s at 0.4 s and 0.6/1.6/3.1 yd. It also moves every
other body: power negatives reach 25%, TVD 0.188. It is evidence for the
physics owner, not a candidate.

**The backers' read.** Backers read pulls from line departure (0.5 yd deep
and 1 yd over) at 1.5 yd/s:

- On the package, none have read the pull at 1.0 s; 32% have at 1.2 s
  (`lbflow.ts`).
- With the pull on tracked timing (`GAIT_STEP`), all have read it at 1.0 s,
  and their median request is still only 1.5 yd/s toward it.
- `PULL_KEY`, new: key the guard's pull step (a quarter yard deeper than his
  stance, moving flat at 1 yd/s). It moves the read about 0.2 s earlier but
  not the achieved flow (still about 0 at 1.4 s). Outcomes are mixed: power
  and counter shapes better, trap worse, gap TVD 0.118 → 0.126. It was
  reverted.

The existing `PULL_CUE`/`PULL_PLAN` arms are neutral (TVD 0.113–0.119). That
is the second attempt on this read after `PULL_PLAN`'s earlier rejection. A
backer cannot key a pull that has not started; the read waits on the
puller's start-up.

## Handoffs (no edits made)

- **Defensive snap latency** (`agent.ts`, perception): NFL box defenders and OL
  both first move at a median 0.3 s; the sim's first move at 0.5 and 0.4 s.
  Halving the defensive scale (`DEF_GETOFF=0.5`) makes them equal (0.4/0.4).
  Inside zone then moves onto NFL (4+ 54.5 → 49.0, mean 8.45 → 6.82); the
  tail is unchanged.
- **Engaged pairs do not move, and bodies start slowly** (World contact and
  gait):
  - Engaged OL lateral speed is 1.0 vs 3.0 yd/s. The OL's lateral
    acceleration from the stance is about 3.5 yd/s², and contact then halts
    it. This is the root of weaknesses 2 and 3.
  - The double team does not move its man back either: engaged DL depth at
    3 s is +0.2 vs +1.0 yd. That keeps the inside-zone bend closed (Part 3).
  - A lineman freed after the crossing requests about 8 yd/s and reaches
    2.3–3.0 half a second later (tau 1.2–1.5 s, full balance capacity).
  - A pulling guard reaches 1.5 yd/s laterally at 0.7–0.8 s against tracked
    0.4 s. `GAIT_STEP=0.3` fixes his timing but moves every body
    (`part3-gap.txt`).
- **Shotgun back alignment** (formation owner): sim backs align 1.6 yd beside
  the QB and 0.2 deep; tracked backs are 2.3 and 0.5. The short runway caps
  the shotgun handoff speed even with `MESH_TEMPO` (2.3 vs 3.8 yd/s).
- **Held carriers go down too fast** (tackle/support physics): falls come
  the carrier is seen off his feet about 0.3 s after the first bond in
  95–98% of 357 bonded plays. First contact to the selected ending is 0.8 vs
  1.4 s, and yards after contact are 0.6–0.9 lower in every contact-centred
  speed band. A causal hypothesis for the stuffs at the line and the missing
  2–6 yd runs, not a ranked cause. The carrier's own request does not change
  it, and neither do the parked tackle flags (receipts in `holds.txt`).
- **Open-field holds at speed break** (tackle physics; withdrawn as a ranked
  cause in Part 4: per encounter near the line, sim DBs at 7+ yd/s are within
  NFL's range): with the secondary at
  NFL depth (`DEEP_CAP`), 29 of 48 runs of 40+ had an open-field hold, and in
  18 every hold broke. The structure is otherwise close to NFL.

## Next decision

Superseded by Part 4: after the independent review, no package is proposed
and each scope is considered separately.


1. Review `sp` (`UC_MESH MESH_TEMPO ZONE_TE STRETCH_FLAT LB_KEY
   SHED_PURSUE`) as the candidate. It replaces `rec2`.
   - It is the first package closer to NFL60 than develop on all three play
     sets by TVD: ace 0.159 vs 0.161, zone transfer 0.135 vs 0.145, gap
     schemes 0.118 vs 0.125.
   - Ace negatives 12.8 → 9.6% (NFL 8.6) and 40+ 3.75 → 2.17% (NFL 1.18).
   - Weigh against: ace 10+ falls further below NFL (10.1 → 6.2%, NFL 13.1);
     the gap-scheme tail rises (40+ 4.00 → 4.88%, power 8.25%); and the
     `ZONE_TE` caveat.
   - `SHED_PURSUE` is in the package as a repair to an engine artifact (the
     re-latch loop). Paired tests find no detectable outcome effect.
2. Keep `DEEP_CAP` parked:
   - With `sp` it gives the best ace shape (`spc` TVD 0.141).
   - It overshoots 10+ (19.9%, NFL 13.1), mostly inside zone (23.8%).
   - That box leak waits on the engaged-pair handoff below.

   Keep `BACK_CHASE` and `RUN_LATERAL` as mechanism candidates (flow toward
   NFL); they are not outcome improvements on their own.
3. Physics owner, in order of consequence:
   - held-carrier fall timing. Part 3 adds that sim long runs see 0.07
     second-level contacts per run against NFL's 0.52.
   - engaged pairs that neither slide nor give ground, and start-up
     acceleration;
   - open-field holds at speed.

   Perception owner: the defensive snap latency (`DEF_GETOFF=0.5` is the only
   arm that beats develop on the whole distribution).
4. Controller, after those:
   - the inside-zone bend, once double teams move their man. It is closed by
     the engaged 1/3-technique, not by the read.
   - the runner's cutback read against a pursuing backside (the shelved
     `RUN_READ` is not it).
   - the gap-scheme tail under `MESH_TEMPO` (power). The backers' pull read
     has had two attempts (`PULL_PLAN`, `PULL_KEY`); re-diagnose once
     pullers start on time.

## Part 4 — review response (2026-10-19)

The full response to the run/controller and measurement reviews of
`1c578afb` is [here](run-game-v3-pr153-response.md). Selected witnesses
(27, each with its candidate receipt) are
[here](../../data/reviews/current/run-game-v3-witnesses.json). Reproduced
arm reports and manifests are under [`run-game-v3/v5/`](run-game-v3/v5/).
What changed in this report:

- **Rejected defects repaired.** `UC_MESH` draw keeps its accepted QB
  arrival. `LB_KEY` pairs the acquired actor with his own alignment. The
  reviewer's contract checks are ported and pass.
- **Under center, `MESH_TEMPO` engages only with `UC_MESH`.** At the
  reviewed pin, tempo alone lost every under-center OZ/WZ exchange (800 of
  800) and 11 of 400 power exchanges: the installed call precedes the QB's
  achievable arrival.
- **Shotgun spot split into `GUN_MESH_SIDE`.** In the 2×2 it is adverse on
  outside zone (negatives 18 → 34 of 200, p=0.007). HOLD.
- **Power tail.** The front seven are first to the back near the line in
  38–53% of sim gap runs, against 75–77% in the NFL (`dbhits.py --first`).
  Fast backs meet a DB first two to three times as often. Per encounter, sim
  DBs at 7+ yd/s are within NFL's range. Not the mesh; do not cap the
  runner.
- **`ZONE_TE`.** An end level with his man no longer runs the track
  (`76252fa9`); the old meeting time flipped his request at full speed. Gun
  inside zone is still adverse: the rep's fixed drive line carries a reached
  end away from his man. That is the next re-diagnosis target.
- **Measurement corrections.**
  - `release.py`/`lbblocks.py` admitted short recordings. Corrected:
    second-level block durations 0.8/1.4/2.0 s vs NFL 0.9/1.5/2.2, censored
    39% vs 36%. DL within 1.2 yd at +0/+0.5/+1.0 s: 81/81/81% vs NFL
    76/66/57.
  - The exporter labelled the RB as carrier on every play.
- **Provenance.** Lab arms launch through `arm.mjs`, which binds commit,
  patch, flags and checksums. `d0`, `mtr`, `sp`, `d0gap`, `rec2gap` and
  `mtrgap` reproduce play for play at `92c1d0c1`.


## Part 5 — second-level blocking, counter and toss (2026-10-19)

The question: how well do blockers get to the second level, win leverage and
seal defenders off from the back, and how do counter and toss (sweep) run?

Arms are under [`run-game-v3/v7/`](run-game-v3/v7/), with reports and
bound manifests. The sim-side diagnostics and their receipts are in
`part5.txt`. Witnesses (4, with candidate receipts) are
[here](../../data/reviews/current/run-game-v3-part5-witnesses.json).

The NFL side is 2022 tracking measured with the same code. Proximity
operators are not engagement labels: "walled" means a blocker within 1.2 yd
of the defender stands between him and the carrier.

### What is weakest

**Leverage at the crossing** (`seal.py`, defenders within 4 yd of the
carrier as he crosses the line). Sim columns are develop:

| | IZ NFL | IZ sim | OZ NFL | OZ sim | Power NFL | Power sim | Counter NFL | Counter sim |
|---|---|---|---|---|---|---|---|---|
| LBs walled | 48% | 41% | 39% | 34% | 51% | 35% | 48% | 39% |
| LBs free, per run | 0.52 | 0.62 | 0.63 | 0.95 | 0.50 | 0.67 | 0.57 | 0.65 |
| DL near, per run | 2.34 | 1.72 | 2.14 | 1.82 | 2.01 | 1.36 | 2.06 | 0.95 |
| DL walled | 61% | 59% | 47% | 51% | 63% | 50% | 61% | 37% |

**Second-level blocks do not last** (`lbblocks.py`: an OL/TE within 1 yd of
a defender 2–8 yd deep, the same player within 1.5 yd). They start on time,
at a median 2.0 s:

| | Gap NFL | Gap sim | IZ NFL | IZ sim | OZ NFL | OZ sim |
|---|---|---|---|---|---|---|
| Median length | 1.4 s | 1.0 s | 1.5 s | 1.2 s | 1.5 s | 1.1 s |
| On at the crossing | 63% | 47% | 67% | 64% | 67% | 67% |
| On 1 s later | 55% | 32% | 63% | 45% | 52% | 45% |

**Why they come apart** (`lbreps.ts`, sim reps). 23–30% of linebacker
reps end in separation:

- At the end, the blocker is 1.5 yd downfield of the backer (quartiles
  1.2–1.6).
- At the start, the blocker was 0.4–0.8 yd short of the backer. The backer
  was coming downhill at about 1.25 yd/s, and the drive line was at least
  0.89 upfield.
- The rep requests 2.4 yd/s along that line whether or not the man is still
  in front of the blocker. So the blocker runs past the backer.
- This is the same mechanism as the `ZONE_TE` gun loss in Part 4.

**Who was meant to block the free backers** (`climb.ts`, sim). A climber
still stuck on a down lineman is almost never the cause (≤0.02 per run).
Assigned climbers more than 2 yd from a free backer at the crossing, per
run:

| Concept | Late climbers | ...not yet up to the backer's depth | Mostly |
|---|---|---|---|
| OZ | 0.87 | 0.50 | climbers chasing a backer who flowed playside of them |
| Counter | 0.60 | 0.40 | the wrapping puller (0.28) |
| Power | 0.37 | 0.18 | |
| IZ | 0.31 | 0.05 | |

**Departures off double teams crawl** (`departure.ts`). The median takes
0.75–1.1 s, at about 1 yd/s mean speed and 0.3–0.8 upfield. Each read's
exit is only the next point of a short arc around the old down man, and it
was tracked as a place to stop.

**Counter and power are the worst concepts.**

- Counter: negatives 16.5% (NFL60 8.1), 4+ 40% (55).
- Power: negatives 17.8% (NFL60 8.0), 4+ 43% (57).

The gap-set back crosses the line at 3.2 s against NFL's 2.5–2.8. Counter
fails against wide 9 (20 of 40 runs negative) and tite (12 of 40). The
filmed wide-9 loss: the backside guard reaches the crashing end only at
1.9 s, 0.4 yd behind the line, and logs him; the end tackles 2.2 yd deep.
That is puller start-up, already handed off.

**Toss is close to NFL tosses.** NFL tosses are identified by the carrier
being more than 2.5 yd from the QB at the exchange; 509 runs, mostly
"PULL LEAD" and "OUTSIDE ZONE".

| | Negative | 4+ | 10+ | 20+ |
|---|---|---|---|---|
| NFL tosses | 17.1% | 48.5% | 14.7% | 3.7% |
| Sim toss (400) | 17.0% | 57.0% | 11.2% | 7.2% |

The sim back crosses earlier (3.0 vs 3.4 s), with fewer defenders around
him (LB 1.06 vs 1.45, DB 0.22 vs 0.82 within 4 yd). That is defensive
arrival, not a toss blocking defect. Toss OL plan reach blocks but use
neither the zone track nor the stretch-reach contact technique (both
cover OZ/WZ only). Nothing here shows that this hurts, and it was left
alone.

### Repairs (default-off)

| Flag | What changes | Where |
|---|---|---|
| `DRIVE_CONNECT` | A drive block drives fully while his man is in front of him on the drive line. Once level or past, he keeps connected: the man's motion along the line plus the closing gap, as a stretch reach does. | `stepRunRep` (`engagement.ts`) |
| `DEPART_TEMPO` | A climber leaving a double team carries the climb's tempo along the arc around the old man's hip, instead of stopping on each exit. Same route, clearance and reads. | `leaveCombination` (`blocking.ts`) |

**`DRIVE_CONNECT`** (develop `v5` → `v7dc`/`v7dcgap`, paired on the same
cases).

Mechanism:

- Linebacker separations fall from 23–30% to 3–7%. Most reps now last until
  the runner passes.
- Second-level blocks come onto NFL:

  | | Gap | IZ | OZ |
  |---|---|---|---|
  | Median length (NFL) | 1.0 → 1.3 s (1.4) | 1.2 → 1.6 (1.5) | 1.1 → 1.4 (1.5) |
  | On at the crossing (NFL) | 47 → 60% (63) | | |
  | On 1 s later (NFL) | 32 → 46% (55) | 45 → 61 (63) | 45 → 59 (52) |

- Walled backers rise a little: power 35 → 39%, counter 39 → 41%.
- Line mechanics are otherwise unchanged. Engaged DL depth at 3 s on gap
  plays is 0.70 → 0.43 yd (NFL 1.00).

Outcomes:

- Gap set: negatives 11.0 → 7.9% (NFL60 8.6), 4+ 48.6 → 57.3%, 10+
  7.8 → 12.1% (13.1).
- Power: negatives 71 → 56 of 400 (p=0.058); 4+ 172 → 205 (p=0.002).
- Counter: negatives 66 → 48 (p=0.027). Against wide 9, negatives
  20 → 6 of 40; against tite, 12 → 4.
- Trap: 4+ 193 → 249 (p<0.001).
- Duo: 4+ 252 → 291 (p<0.001). Duo was already above the NFL's broad MAN
  family (45%).
- Ace zone, shotgun zone (`v7gdc`) and the ace package (`v7mtrdc`): no
  detectable change, except outside-zone 40+ 10 → 22 of 400 (p=0.004).
- The gap-set 40+ rises 4.00 → 5.38%. Counter's is 22 → 28 (p=0.31).

Witness `w8`: power, ace, under front. Without the flag, the pulling guard
meets the strong backer at 2.25 s. His request then carries him upfield and
outside past the backer (intent 3.06, −1.59), the backer comes free and
tackles for −0.38. With it, the guard stays on the backer and drives him
1.6 yd back: +5.42.

**`DEPART_TEMPO`** (`v7dt`/`v7dtgap` against `DRIVE_CONNECT` alone):

- Departures take 0.5–0.75 s at 1.6–1.8 yd/s (upfield 0.75–1.4). Start-up
  from near standstill is the remaining limit, which is the World gait.
- Outside-zone backers in a rep at the crossing go 0.59 → 0.77 per run.
  Late climbers short of the backer's depth go 0.51 → 0.41.
- No outcome change is detectable in any concept (all p > 0.05).

Witness `w9` shows why: the guard now leaves the 3-technique at tempo, but
around its inside. The backer stacked behind it flows outside, so the
route's geometry, not its speed, decides that play.

### Duo and the rest of the gap

Duo is too effective. At the crossing, against the NFL MAN family:

- DL near the back: 1.20 vs 2.12 per run;
- linebackers: 1.38 vs 1.79;
- DBs: 0.13 vs 0.89.

The box and the safeties do not converge. That is the same defensive-arrival
gap as the tails (Part 4: the front seven reach the back first in 38–53% of
sim gap runs, 75–77% in the NFL), not a duo blocking defect. MAN is a
provider family, not verified Duo.

### Next decision

1. Review `DRIVE_CONNECT` independently as a run-rep request repair. It is
   the largest change here. The gap-scheme tail it exposes is defensive
   arrival, not a reason to keep the blocker running past his man.
2. Keep `DEPART_TEMPO` as a coherence repair with no outcome claim.
3. Owners, in order of consequence:
   - **Defensive arrival at the back** (perception latency, owner decides):
     the front seven first, the duo crease, toss edge force. `DEF_GETOFF`
     is the only arm that has moved the whole distribution.
   - **Physics:**
     - engaged pairs' lateral motion (outside zone);
     - start-up acceleration (pullers and departures);
     - held-carrier fall timing.

## Part 6 — the mesh, the back's first second, and the line (2026-10-19)

The film review raised three points. The under-center mesh looked janky,
with the QB and back running into each other. The back looked jittery and
slow after the handoff, though he ran well through big gaps. And NFL lines
stand staggered behind the center with wider splits.

Arms are under [`run-game-v3/v11/`](run-game-v3/v11/), with reports and
bound manifests. Develop is `v5` (`v5d0`, `v5d0gap`). The v11 arms ran on
`26a6b6d0` plus the Part 6 patch (manifest `patchSha256 23c11132…`). The
committed source differs from it only by extracting `leadPace` (the same
arithmetic), and by diagnostics and tests. Receipts are in `part6.txt`:
`meshflow.py`, `qbcarry.py`, `behind.py`, `pullers.py` and `olalign.py` on
NFL tracking and sim common files; `layers.ts` and `deblock.ts` on sim
internals; and `paired.py`.

### What was wrong

Our back is not limited by speed. His request after the handoff is 6–9
yd/s. `layers.ts` splits it into four layers: the behavior's request, after
contact, after teammate spacing, and achieved. Contact never cuts it.
Spacing and his own pace do.

**The QB and the back yield to each other** (develop, first 0.5 s after the
handoff):

- Spacing cuts the back's request in 20–37% of ticks, with the QB the
  nearest teammate in front of him.
- It cuts the QB's request in 25–50% of ticks, with the back the nearest.

The QB did three things that tracked QBs do not:

- He stepped toward the back's lead point to ride him.
- He stood still on the handoff tick.
- He then restarted toward a spot 1.6 yd deeper at 0.4 × top speed.

Tracked under-center QBs move straight back at about 4 yd/s just before the
handoff, and are still moving straight back at about 4 yd/s 0.25 and 0.5 s
after it (`qbcarry.py`; turning 3–18°; gap, duo, inside and outside zone).
Develop QBs move at about 1 yd/s.

**The back paced the puller at a fixed speed.** While a lead blocker was
entering the hole ahead of him, the designed press asked for a fixed 28–40%
of top speed, about 2.6–3.7 yd/s. That fired in 18–42% of power ticks in the
first second. The puller there is crossing the back's track: his speed
along it is about 1–2 yd/s. Tracked backs stay at about 5 yd/s, 2–3 yd
behind the puller (`behind.py`, `pullers.py`).

The path shape was already close to NFL: heading change in the first 1.5 s
is 44–54° against 44–47°, with a median of 0 lateral reversals. The jitter
is the speed pulsing from these two sources.

### Repairs (default-off)

| Flag | What changes | Where |
|---|---|---|
| `QB_CARRYOUT` (revised) | With UC_MESH's moving exchange, the QB rides to a pocket 0.8 yd beside the back's track. That is the tracked offset at the handoff, measured across the back's own motion: lateral on an inside run, upfield of a stretch track. He no longer rides into the back's lead point. He does not stop on the handoff tick. He carries out straight back at the exchange speed, bending away from the play. The side-only carry-out of Part 5 is unchanged elsewhere (shotgun, or without UC_MESH). | `QBHandoff` (`qb.ts`) |
| `PACE_LEAD` | The pace behind a lead blocker comes from the lead's observed motion. A lead who will be out of the back's track by the time he gets there costs nothing. One the back is actually following is closed on no faster than the back could still brake to the lead's speed at body contact, the same arrival law as `track()`. | `leadPace`, designed press (`carrier.ts`) |
| `OL_ALIGN` | The line stands as tracked: C 0.29 yd behind the ball, guards 0.83, tackles 0.98, an inline end 1.19, with splits of 1.54, 1.56 and 1.52 yd. Techniques and gap landmarks are placed from those splits. Legacy landmarks (the pullers' hole, the C-gap and edge aims) map onto the actual line through `lineOffset`. With the flag off, everything is literally unchanged, verified by matching trajectory hashes over 60 plays. | `alignment.ts`, `assign.ts`, `blocking.ts` |

Tried and stopped (`QB_CARRYOUT`), each counted in the arms or a 5-seed
check before any outcome was read:

- **Continuing the stance-to-spot line through the exchange.** The QB left
  the back's reach. QB keeps were 220/400 on OZ and WZ and 57/400 on power,
  and those runs became QB runs.
- **A straight drop with only lateral pocket tracking.** Stretch handoffs
  failed.
- **A lateral-only pocket.** Stretch failed 100/400.

With the final version, QB keeps match develop: 0–2 of 400 per concept.

### Results (package `UC_MESH MESH_TEMPO QB_CARRYOUT PACE_LEAD`)

The exchange and the back's first second (`meshflow.py`, medians; NFL60
gap/MAN runs):

| | NFL | Develop | Package |
|---|---|---|---|
| Power back speed at handoff / +0.5 s / +1.0 s | 4.07 / 4.98 / 4.93 | 2.02 / 2.50 / 3.04 | 4.47 / 5.00 / 5.34 |
| Counter | 3.72 / 4.80 / 5.10 | 2.14 / 2.83 / 3.61 | 4.04 / 4.00 / 4.03 |
| Duo (NFL MAN) | 4.12 / 4.78 / 4.67 | 2.14 / 3.88 / 5.39 | 3.82 / 4.85 / 5.71 |
| Trap | 4.28 / 4.93 / 4.74 | 2.14 / 3.89 / 5.15 | 3.61 / 4.37 / 5.20 |
| Power upfield in 1 s | 3.6 yd | 1.9 | 3.9 |
| QB from the back at +0.5 s (power / duo) | 3.3 / 3.7 yd | 0.95 / 0.86 | 2.97 / 2.69 |
| QB speed 0.25 s after the handoff | 2.6–4.0 yd/s | 0.8–0.9 | 2.3–2.5 |

In the package, spacing no longer cuts the QB at all. In the first 0.5 s
after the handoff, spacing cuts the power back in 19–23% of ticks, by the
puller ahead rather than the QB.

Outcomes, paired on the same 400 cases each:

- Power: negatives 71 → 34 (p<0.001); 4+ 172 → 208 (p=0.014).
- Counter: negatives 66 → 29 (p<0.001).
- Duo: negatives 16 → 7 (p=0.035); 4+ 252 → 216 (p=0.002). Duo was above
  the NFL's MAN family.
- Trap: no detectable change.
- `PACE_LEAD`'s own share (package with and without it):
  - power 40+ 36 → 26 (p=0.08);
  - trap 4+ 159 → 176 (p=0.04);
  - trap negatives 29 → 19 (p=0.05);
  - duo identical (no lead).
- Ace zone (`v11co`) matches the earlier `UC_MESH MESH_TEMPO` arms (neg
  18.0 vs 18.1%). This is the stretch exposure the stretch flags already
  cover (Part 1).

### The line's alignment (`OL_ALIGN`)

`olalign.py` measures the line at the snap (body centres, yd):

| | NFL | Develop | `OL_ALIGN` |
|---|---|---|---|
| Center / guard / tackle / inline end depth | 0.29 / 0.83 / 0.98 / 1.19 | 0.55 / 0.55 / 0.55 / 0.60 | as NFL |
| Splits C–G / G–T / T–TE | 1.54 / 1.56 / 1.52 | 1.30 each | as NFL |
| DL depth | 0.92 | 0.90 | 0.90 |

The deeper guard pulls without first dropping straight back (`pullers.py`):

- 0.6 yd over at 0.9 → 0.7 s (NFL 0.6);
- lateral 0.9 / 1.9 → 1.5 / 2.8 yd at 1.0 / 1.4 s (NFL 2.0 / 3.4).

Outcomes, alone against develop (`v11olgap`, `v11ol`):

- Better: duo 10+ 34 → 58 (p=0.004); wide-zone negatives 83 → 49
  (p=0.001).
- Worse, material: counter negatives 66 → 125 (p<0.001); trap 4+ 193 → 154
  (p=0.004).

Diagnostic:

- The extra counter losses are almost all the play-side end, the kick-out
  target: first tackler 53 → 101.
- On the eight largest flips (`deblock.ts`), the kick engages a little
  earlier (about 2.1 vs 2.2 s). The end then sheds it after about 0.6 s,
  where develop's kick holds 1 s or more.
- Mapping the legacy hole landmark onto the actual line (`lineOffset`) did
  not change it (116 → 125, p=0.28).

This is kick-out contact under realistic geometry, not a landmark constant.
It belongs to the blocking/contact owners. `OL_ALIGN` stays off. Pass
protection under it is not measured.

### Remaining

- **Counter's back is still slow** (+0.5 s: 4.0 vs NFL 4.8). Tracked backs
  run 1.4–1.9 yd inside the puller's hip. Ours run 0.5–0.7 yd off it, or
  outside it on power. The pullers start late (above) and the back's track
  follows them closely.
- **Before the handoff, spacing still cuts the duo and trap back** in
  32–39% of the last 0.4 s, with the QB nearest. He still takes the ball at
  3.8–4.0 yd/s (NFL 4.1). QB speed after the handoff is 2.3–2.5 against
  NFL 2.6–4.0.
- **Linebackers do not flow with the pull:** about 0 yd/s toward it at
  1.0–1.4 s, against NFL 1.5–2.0. This is the second-level read that
  #159/#160 address.
- **The gap-scheme 40+ tail stays high** (power 6.75%). That is defensive
  arrival (Parts 4–5).

### Next decision

1. Review `UC_MESH MESH_TEMPO QB_CARRYOUT PACE_LEAD` as one mesh package.
   It fixes the exchange and the back's first second on power and duo
   without new failure modes, and the QB-keep count is unchanged.
2. Hand `OL_ALIGN`'s counter adverse to the blocking/contact owner. The
   question is the kick-out shed under the tracked alignment. Re-run
   `v11olgap` after their change.
3. Next here: the counter back's track relative to the pullers, and the
   #159/#160 linebacker flow with these flags.

## Part 7 — why the film looks jittery, the fullback, and #159/#160 (2026-10-19)

The film review asked whether our film looks jittery because the viewer
shows more than the NFL clips. It also flagged the QB still running into
the fullback (ARM2-08), and asked for improvements to #159/#160. Receipts
are in `part7.txt`. Arms are in [`v12/`](run-game-v3/v12/) and
[`m3/`](run-game-v3/m3/).

### It is mostly not the viewer

`smooth.py` measures NFL tracking and sim plays the same way: 10 Hz
positions at 0.01 yd, counted with one operator.

- **Pulses** are speed swings of at least 0.5 yd/s, per second.
- **Wobble** is left/right turn reversals per second (turns of at least 5°
  per 0.1 s, above 2 yd/s).

Gap runs, NFL60 against the package:

| | Pulses NFL | Pulses sim | Wobble NFL | Wobble sim | Speed p90 NFL | Speed p90 sim |
|---|---|---|---|---|---|---|
| DL | 0.07 | 0.54 | 0.01 | 0.04 | 3.1 | 2.4 |
| LB | 0.14 | 0.33 | 0.02 | 0.21 | 3.8 | 3.2 |
| DB | 0.10 | 0.24 | 0.02 | 0.17 | 4.8 | 5.7 |
| OL | 0.05 | 0.15 | 0.01 | 0.10 | 3.0 | 2.7 |
| TE | 0.16 | 0.98 | 0.02 | 0.15 | 3.9 | 2.9 |
| FB (non-carrier back) | 0.26 | 0.57 | 0.03 | 0.39 | 5.9 | 3.9 |
| Carrier after the handoff | 0.05 | 0.12 | 0.07 | 0.24 | 6.2 | 6.9 |

On zone runs, NFL linemen and linebackers move much faster than ours. DL
p90 is 4.3 yd/s against 2.7, OL 4.1 against 2.9, and LB 4.9 against 3.9.

The viewer does add one thing: NFL clip facing is derived from motion,
while sim facing is the body's own yaw. The trajectories themselves still
pulse and wobble several times more.

**Where it comes from** (`jitter.ts`, the same counting at each layer of
the velocity):

| | Request | After contact | After spacing | Achieved |
|---|---|---|---|---|
| DL pulses / wobble | 0.78 / 0.16 | 2.53 / 0.86 | 2.63 / 0.87 | 0.83 / 0.07 |
| TE | 0.80 / 0.12 | 1.49 / 1.06 | 1.68 / 1.12 | 1.10 / 0.28 |
| LB | 1.48 / 1.32 | 1.60 / 1.38 | 2.00 / 1.39 | 0.41 / 0.38 |
| DB | 1.15 / 0.95 | 1.16 / 0.93 | 1.33 / 0.94 | 0.40 / 0.35 |

The bodies filter much of it. The requests are what jitter.

- **For engaged players**, the contact controllers triple it. The run-rep
  lateral law (`requestToCover`) asks the body, whose speed lag is about
  1.3 s, to close the error exactly within two decision beats (about 0.4 s).
  That is roughly 18 × the position error minus 6 × the velocity, so it
  saturates and flips sign.
- **For free defenders**, the behaviors' own requests reverse direction
  1–1.5 times a second.

**Tried and stopped: `AIM_GLIDE`.** It advanced the decision layer's held
point with the trend of the last two decisions, instead of holding it
still for a beat. No group's pulsing or wobble changed (DL 0.54 → 0.55, LB
free wobble 0.24 → 0.26), and outcomes did not change. The code was
removed.

### The fullback and the QB (`FB_TRACK`, off)

`qbfb.py`, I-formation runs. NFL fullbacks line up 4.6 yd deep, 3.2 behind
the QB.

| | NFL | Develop / package | `FB_TRACK` |
|---|---|---|---|
| Fullback lateral toward the run at 0.6 / 0.9 s | 0.8 / 1.7 yd | 0.1 / 0.1 | 0.8 / 1.6 |
| Closest QB–fullback distance | 1.50 yd at 1.0 s | 0.85–0.89 at 1.0 s | 1.52 at 0.9 s |
| Handoff to first contact (power / counter / trap) | 1.4 / 1.4–1.7 / 1.1 s | 1.55 / 1.80 / 1.40 (package) | 1.30 / 1.40 / 1.20 |

Ours ran straight up the QB's drop line at his man's intercept point. The
QB and fullback met head-on and both stalled in the spacing layer for up to
a second. With the flag, the fullback flows flat to his lane first, then
turns up.

Outcomes on I-formation gap runs get worse: negatives rise on power 34 →
57, counter 29 → 67 and trap 23 → 54 (all p<0.005).

- The new tackles for loss are the play-side end's (26–35 of each set).
- The back now meets the defense at NFL timing. The pullers and kick-outs
  are about 0.3 s late at the start (Part 6), so the end is not yet blocked.
- The old jam had been holding the back until the kick-out arrived.

The flag stays off, and it should come with the puller start-up fix
(physics: start-up acceleration; or `OL_ALIGN`'s deeper guard, once its
kick-out shed is fixed).

### #159 and #160 with these flags

They were merged locally only, into `c19a12e8`, and never pushed
(`m3/combination-src.patch`). One conflict in `runContactRead` was
resolved by keeping both changes: #160's flow is used when `BACK_CHASE` is
not chasing.

Outcomes on the same cases (develop flags; and with the package):

- Gap, inside zone and duo: no detectable change. Most plays are identical.
- Toss 40+: 21 → 9 of 400 (p=0.008), matching their toss claim.
- Wide zone 10+: 27 → 40 (p=0.03).

The second-level medians do not move (`lbmotion.py`). On gap runs, NFL
linebackers move laterally toward the carrier's side at 1.75–2.0 yd/s at
the handoff and +0.5 s. Ours move at −0.25 to +0.25 with or without these
PRs, and "toward the pull" stays about 0 yd/s (NFL 1.5–2.0). Both PRs act
after a flow decision has been made, and on gap runs it is not made.

The improvement they need is the read itself: linebackers keying the pull
and the back's first steps, and committing to flow. `LB_KEY` (Part 1) is
this branch's off-by-default cue for that.

### Next decision

1. **Jitter** (owners: contact and controller):
   - Replace the deadbeat `requestToCover` in the run-rep lateral law with
     an arrival law that cannot saturate and flip on a 1.3 s lag.
   - Find why free defenders' requests reverse 1–1.5 times a second.
   - Use `smooth.py`/`jitter.ts` as the shared check: NFL achieved values
     are under 0.15 pulses and 0.03 wobble per second for every group.
2. **Puller start-up** before `FB_TRACK` (and `OL_ALIGN`).
3. **Linebacker flow on gap runs:** a read of the pull, then #159/#160's
   execution.

## Part 8 — why our movement is not smooth: the body's speed-up law, then transitions (2026-10-20)

The film review asked why NFL clips look smooth, with players going where
they need to go, while ours look jittery. The user accepted outcome
regressions where movement realism improves. Receipts are in
[`part8/`](run-game-v3/part8/). Arms on this branch, same cases, package
flags `UC_MESH MESH_TEMPO QB_CARRYOUT PACE_LEAD`:

- `k0co` and `k1co`: zone, 1,200 plays each.
- `k0gap` and `k1gap`: gap, 1,600 plays each.
- `k1` differs only by `GAIT_STEP=0.3`, an existing physics flag.

### First cause: the speed-up law

`locomotionAccel` brakes and cuts almost immediately. Speeding up toward
a wanted speed, though, follows the sprint time constant (τ ≈ 1.3–1.45 s)
for every speed.

- A lineman who asks for 3 yd/s needs more than a second to get there.
- Each dip in his request costs a long climb back.
- Bodies sag below what they ask for, and engaged pairs barely move.

`GAIT_STEP` (already in kinematics) pushes on the force-velocity curve
and levels off over about two steps.

**Reproducer:** `oz/strong/ace_12/over3/pair11/77`, the RG's reach on
DT_S.

- With coherent lateral requests of about 2 yd/s, both bodies slide at
  0.4–0.8 yd/s until 1.6 s.
- Cutting the lean willingness to 5% did not change that. Lean is not the
  limiter: locomotion already has priority in the traction budget.
- With `GAIT_STEP=0.3`, the pair slides at 2.0–2.7 yd/s by 1.2 s.

Movement against NFL60 (`hooks.py`: path length and net lateral
displacement from the snap to 3.5 s, medians):

| Zone runs | NFL | Current body | `GAIT_STEP=0.3` |
|---|---|---|---|
| OL path / lateral (yd) | 7.8 / 6.1 | 5.4 / 4.1 | 7.0 / 5.8 |
| DL | 7.8 / 5.8 | 4.8 / 3.4 | 6.1 / 4.8 |
| LB | 8.7 / 5.9 | 6.8 / 4.8 | 8.0 / 5.7 |
| TE | 9.2 / 6.9 | 6.0 / 2.9 | 7.1 / 4.1 |
| DB | 9.0 / 5.0 | 9.2 / 6.9 | 10.6 / 7.3 |

| Gap runs | NFL | Current body | `GAIT_STEP=0.3` |
|---|---|---|---|
| OL path / lateral (yd) | 5.1 / 2.0 | 5.2 / 2.7 | 6.2 / 3.4 |
| DL | 5.3 / 2.4 | 4.2 / 1.4 | 5.0 / 1.9 |
| LB | 6.9 / 3.1 | 5.7 / 2.4 | 6.5 / 2.5 |

Cruising speeds (`rise.py`, zone): episodes where a player rises from
below 0.8 yd/s and holds a plateau for 0.5 s, per play.

- **DL at 2.5–3.5 yd/s:** NFL 0.68, current 0.19, `GAIT_STEP` 0.41.
- **DL at 3.5–4.5 yd/s:** NFL 0.38, current 0.03, `GAIT_STEP` 0.08.
- **OL at 2.5–3.5 yd/s:** NFL 0.79, current 0.49, `GAIT_STEP` 0.80.
- When a plateau is reached, the rise time is NFL-like in both arms
  (0.5–0.6 s to 2.5–3.5 yd/s). Our players simply rarely asked for, or
  held, those speeds long enough to get there.

At a 0.3 s scale (`smooth.py` with `SMOOTH_STRIDE=3 SMOOTH_SWING=1
SMOOTH_TURN=15`), the current body is smoother than tracking in the
trenches but slow:

| | DL pulses | OL pulses | LB pulses | DB pulses | DL speed p50/p90 (yd/s) |
|---|---|---|---|---|---|
| NFL | 0.05 | 0.05 | 0.13 | 0.08 | 1.88 / 4.01 |
| Current body | 0.01 | 0.01 | 0.14 | 0.08 | 1.25 / 2.57 |
| `GAIT_STEP` | 0.05 | 0.04 | 0.25 | 0.17 | 1.65 / 3.06 |

### Second cause: the slow body hid chattering requests

With a responsive body, players follow their requests faithfully. At
10 Hz, pulses rise: DB 0.19 → 0.60, LB 0.31 → 0.63, OL 0.07 → 0.26 per
second. Pulses are speed swings of at least 0.5 yd/s.

**Census.** `branches.ts` runs in an instrumented copy from
`instrument.sh`. Every behavior return is tagged `file.function@line`, and
each pulse, reversal and scribble is attributed to the branch path that
produced the request. About half of free defenders' events coincide with
a switch of branch.

**Non-causes, each tested by a toggle** (achieved pulses within ±0.05/s):
- updating aim points every tick instead of holding them for a decision
  beat;
- replacing the station-keeping law `track` with the planned
  `movingArrivalVelocity`;
- dropping explicit facing.

**The body itself is smooth** (`lone.ts`): a constant request gives a
constant speed.

**Scribbles are 1 s windows whose net displacement is under 60% of the
path travelled** (`hooks.py`):

| | NFL zone | Sim zone | NFL gap | Sim gap |
|---|---|---|---|---|
| DL | 2% | 8–9% | 4% | 14–15% |
| TE | 1% | 6% | 3% | 7% |
| LB | 3% | 5% | 4% | 8–9% |

They sit at transitions, not in steady steering:
- **DL:** get-off, contact, then driven back or turned. Inside-zone DL end
  2.6 yd deep at 3 s against 1.4 for the NFL. Doubles last 1.9–2.1 s
  against 1.1–1.5.
- **TE/FB:** latch, release, then a full-speed reversal to re-latch. Case
  `iz/weak/ace_12/over3/pair31/1`, Y on DE_S.
- **Man defenders:** they switch between run fit and the receiver each
  tick (`coverMan`: `believesRun && showsBlock`).
- **Alley fits:** `track` ↔ `chase` at the `los−2.5` threshold.

### Tried and removed (flags off, patch in `part8/experiments-off.patch`)

| Experiment | Result |
|---|---|
| `COMMIT_AIM`, `AIM_REACH` (held aims need two reads to flip side; bounded movement) | No effect |
| `PERCEIVE_FLOW` (seen velocity over 0.2 s) | No effect |
| `MOTOR_HZ` (two-stage velocity filter) | Modest. A filter, not a mechanism |
| `LB_GLIDE` (fit lateral as a moving landmark, replacing the gated `requestToCover`) | LB pulses 0.96 → 0.94 |
| `STALK_MIRROR` | Worse. It mirrors the noisy perceived velocity: WR request pulses 0.11 → 0.82 |
| QB carry-out ease | No change |
| `ANCHOR_BLEND` (scratch tree with #162/#164/#165) | Coherent reach-pair requests, no aggregate change |

### Outcomes (`paired.py`) and open risk

**Zone runs:**
- 4+ yards: 411 → 473 (p 0.003).
- 20+: 28 → 63 (p<0.001).
- 40+: 22 → 48.
- Negatives: 216 → 191.

**Gap runs:**
- 4+ yards: 780 → 810 (p 0.27).
- 20+: 105 → 122 (p 0.26).
- Negatives: 93 → 138 (p 0.002).

**Long runs.** Converting 20+ yards into 40+ was already far above
tracking: P(40+ | 20+) 0.79 current, 0.39 NFL. With the responsive body,
breaks double on zone. The diagnostic (approach records,
`wz/strong/ace_12/over4/pair11/7`, `oz/strong/ace_12/tite4/pair31/4`):
the carrier reaches 8.6–9 yd/s while the deep DBs trail 2–3 yd behind and
never come in range. Deep pursuit and support are unresolved.

### Film and viewer

`film-movement-cases.txt` holds 10 random ordinary cases, drawn before
outcomes were seen. Each runs with both bodies, beside 12 NFL clips.

Replay frames are now packed at 0.01 yd/rad (`frames.scale = 100`). At
0.1, a lineman moving 0.5 yd/s advanced 0.1 yd every other frame, and the
viewer showed that as stutter. Older pages decode with scale 10.

The user's review: "the biggest gain I've seen in the project". It also
noted that wide zone still lacks flow and lateral movement, and that
combo blocks drive defenders too far, leaving linebackers stuck behind
them. Both are measured above.

### Handoffs and next

- **Physics.** Evidence for promoting `GAIT_STEP` (or an equivalent
  speed-up law), with the reproducer above. The world is not changed here.
- **Coverage/Catching.** Man defenders' per-tick run/receiver switch in
  `coverMan`. Cue acceptance should continue the duty until new contrary
  evidence.
- **Run (this branch).**
  - Wide/outside-zone flow (OL lateral at 2 s: 3.1 against 4.9 yd).
  - Doubles that drive too far and too long.
  - TE/FB re-latch reversals.
  - Gap-run DL scribbles.
  - The deep pursuit tail.

## Part 9 — after #168: a stalk regression, and getting the line to flow (2026-10-20)

This branch merged accepted develop `2c98bed` (#168) as `ece674aa`. Receipts
are in [`part9/`](run-game-v3/part9/). Zone arms are 1,200 lab plays, gap
arms 1,600; outcomes are in `outcomes.txt`.

### #168 raised the long-run tail; the stalk change accounts for nearly all of it

Lab arms with no flags, before (`6184040f`, develop `f414627` plus inert
flags) and after the merge, then with one merged change reverted at a time
on a scratch copy:

| Arm | Zone 40+ | Zone mean | Gap 40+ |
|---|---|---|---|
| Pre-merge | 3.75% | 6.19 | 4.00% |
| Post-merge | 9.42% | 9.65 | 9.00% |
| Revert #148/#149 (stalk) | **4.08%** | 6.25 | **4.31%** |
| Revert #159 | 7.83% | 8.76 | |
| Revert #159 + disable #160's interior flow | 7.58% | 8.49 | |
| Revert #141 | 8.25% | 9.01 | |
| Disable #160 / revert #152 / revert #150 | 9.33 / 9.42 / 10.00% | | |

For reference, NFL60 40+ is 1.18%. Once a zone run passed 20 yards, it
went 40+ 94% of the time after the merge (75% before, NFL 39%).

`stalkreps.ts`:
- **Pre-merge**, a perimeter stalk stopped 1.2 yd short of the DB and
  rarely touched him: 0.19 receiver-on-DB run reps per play.
- **After #148**, receivers engage DBs 2.11 times per play (236 of 240
  plays).
- **Stalked DBs reach the carrier** on 42 of 432 reps. All 16 runs of 20+
  yards had a stalked DB.
- **First contact** moves from mid-depth DBs (13.9% → 6.4% of runs) to deep
  DBs (10.0% → 18.0%).

The stalk correction is real football: receivers should reach and block
DBs. What is missing is the DB's answer to the stalk. He should keep
leverage on it and get off it toward the ball. Recommendation: hold the
perimeter-stalk scope until that answer exists, or pair the two. Either
belongs to the DB/run-support owner.

### Lateral flow on outside zone

`timeline.py` (trench timeline), `firststeps.py`, `flowpair.ts` and
`readtime.ts` locate the remaining gap.

**Defenders recognize run on time** (median 0.35–0.6 s, all correctly),
but early on they move straight downhill, not sideways. NFL linebackers
also come downhill 0.8 yd by 1.0 s; the difference is entirely lateral:

| At 1.0 s, toward the play | NFL | Develop + package |
|---|---|---|
| DL | 1.33 yd | 0.36 yd |
| LB | 1.17 yd | 0.32 yd |

**The engaged lateral law is circular.**
- The blocker asks for the defender's lateral speed plus a correction to
  the seal offset, capped by the pass-set mirror trait (about 2.6 yd/s
  for OL).
- The defender asks for the blocker's lateral speed, sampled at his
  decision read (up to 0.3 s old), plus a shoulder correction.
- Neither leads. With a responsive body, the cap binds 31–77% of the time;
  NFL engaged OL flow at 3.0 yd/s (median).

Candidates, all flags (default off):

| Flag | Change |
|---|---|
| `GAIT_STEP=0.3` (physics; Part 8) | Responsive speed-up |
| `RUN_LATERAL` (existing) | Engaged lateral bound = the body's square lateral speed (vmax × shuffle) |
| `DL_FEEL` (new) | While touching, the defender's flow cue is the blocker's motion felt through the hands each tick (`test/dl-feel.test.ts`) |
| `LB_GLIDE` (restored) | A free fit's lateral work follows its landmark's own velocity: the gap's bounding bodies, the back's declared track, or an adopted pull |
| `ZONE_TE` (existing) | The inline tight end runs the zone track |
| `COMBO_LEAVE` (new) | A double's climber judges his partner from observable keeper checks, not the hand fight's hidden control value |

Outside zone, lateral yards toward the play side (median):

| | NFL | Develop + package | + `GAIT_STEP` | + `RUN_LATERAL` + `DL_FEEL` | Full stack |
|---|---|---|---|---|---|
| OL at 2.0 s / 3.0 s | 4.94 / 7.52 | 2.06 / — | 3.16 / 5.62 | 3.58 / 6.68 | 3.76 / 6.78 |
| DL at 2.0 / 3.0 | 4.45 / 7.23 | 1.47 / — | 2.10 / 4.45 | 2.72 / 5.60 | 2.83 / 5.88 |
| LB at 2.0 / 3.0 | 4.83 / 7.60 | 2.70 / — | 3.00 / 6.00 | 3.20 / 6.60 | 3.67 / 7.00 |
| Engaged OL lateral speed (yd/s) | 3.00 | 1.00 | 1.75 | 2.00 | 2.25 |
| Double duration (s) | 1.10 | 1.70 | 1.90 | 2.10 | 2.00 |

The full stack is `GAIT_STEP RUN_LATERAL DL_FEEL LB_GLIDE ZONE_TE
COMBO_LEAVE` (`m12co`).

**What changes for engaged pairs** (`flowpair.ts`, singles 1.6–2.4 s):
the pair moves at 3.3 / 3.2 yd/s with `DL_FEEL`, against 2.6 / 2.5
without it.

**What did not help:**
- The first 0.5 s did not move under any change: DL and LB lateral stay
  near 0 against NFL 0.3.
- `LB_KEY`, `DEF_GETOFF=0.5`, `RUN_CONTACT_TRACK` and a live-gap rush lane
  (tried and removed) left the first second unchanged.
- `COMBO_LEAVE` shortens doubles only slightly. Combo reads are held by
  hidden control in 34–48% of reads, by an unhelpful helper in 15–28%, and
  by the keeper not yet touching early.

**Outcomes and the open question.** With the defense flowing, zone gains
fall below tracking:
- 4+ yards: 34.9% → 24.6%, against NFL 46–50%.
- Linebacker first contacts: 41.9% → 49.0%, at the line.
- Gap runs: negatives 8.6 → 8.1% and 4+ yards 50.3 → 45.6%. `DL_FEEL`
  alone leaves gap runs unchanged (negatives 8.4%, 4+ 52.1%), so feeling
  a down block does not wash the defender out.

The offense has not caught up with the flow. In tracking, the climb
reaches the flowing backer at about 1.8 s (doubles start at 0.7 s and last
1.1 s); ours are still on the double at 2.5 s. Next questions:
- the combo's helper and touching gates;
- the back's cutback read against an over-flowing front.

The lateral-flow film (`flow-review.html`) is the same 10 random ordinary
cases, develop + package against the full stack, beside 12 NFL clips.

## Part 10 — PR #169, and why players spin (2026-10-20)

Receipts are in [`part10/`](run-game-v3/part10/).

### PR #169 (support work-off without a new contact wait): correct, but not the tail

#169 was merged locally on a scratch copy of this branch with no flags
(develop behavior), using the same arms as Part 9:

| Arm | Zone 40+ / mean | Gap 40+ / mean |
|---|---|---|
| Post-merge develop | 9.42% / 9.65 | 9.00% / 10.18 |
| + #169 | 9.67% / 9.93 | 8.94% / 10.04 |

`stalkreps.ts` with #169:
- **Reps ending with the runner passing the DB fall 41 → 8**: the DB gets
  off earlier, as claimed.
- **Stalked DBs reaching the carrier stay at 40/433** (42/432 before).
- **Runs of 20+ yards stay at 15 of 240** (16 before).

The escape works; the approach after it does not, as the PR itself notes.

### Spins

Film review: "is the center spinning?" Yes.

`spins.ts` counts players whose body turns at least 270° within 1 s, per
100 lab plays. On develop + package:

| Group | Spins per 100 plays |
|---|---|
| DB | 96 |
| OL | 22 |
| DL | 17 |
| LB | 17 |

`yawtrace.ts` finds four causes:

1. **The zone track's hip opening** (`zoneFlow`) faces halfway between the
   travel direction and the bearing to the man. With the man nearly behind
   the track, "halfway" has two answers half a turn apart, and the choice
   flips as he crosses that line. The center in AFTER-04 (`oz/weak/ace_12/
   under3/pair31/1`) turned more than 700° between 0.9 and 3.5 s.
   **`TRACK_FACING`** keeps the side he already looks over; the center then
   holds 7–23° for the whole play.
2. **Pullers' first leg goes straight back with no facing.** Facing backward
   has no preferred side, so the turn chooses one and often ends up 270° off.
   The existing **`PULL_STEP`** (hips open to the play side) takes OL spins
   from 21 to 2 per 100 plays. On gap runs (paired, 1,600 plays), negatives
   fall 10.8 → 8.0% (p 0.001) and 4+ gains rise 46.2 → 49.8% (p 0.006).
3. **Blocks in the back.** Run engagement was admitted by distance only. A
   stalking receiver who caught a DB from behind started a rep, and the DB
   turned to face him. **`BLOCK_FRONT`** admits a run block only within 110°
   of the defender's chest; bodies still collide.
4. **The man-coverage block cue lapses.** `showsBlock` is false once the
   receiver is 2 yd downfield, so a stalked corner switched between man
   coverage (sprinting with his receiver, facing travel) and run support
   (facing the line) on successive reads. Each switch is a half-turn, and
   the shortest-turn rule can chain them into a full spin.
   **`MAN_RUN_COMMIT`** keeps an accepted run read with the man blocking as
   a continuing duty. New evidence (the receiver past his depth running
   downfield, or a throw) returns him to coverage. This is a bounded claim
   on `coverMan`; the coverage owner decides.

With all four fixes, spins per 100 plays:

| Group | Develop + package | With fixes | Flow candidate | Flow candidate with fixes |
|---|---|---|---|---|
| OL | 22 | 2 | 23 | 6.5 |
| DB | 96 | 39 | 74 | 14 |
| LB | 17 | 12 | 25 | 17 |
| DL | 17 | 17 | 32 | 30 |

What remains:
- **DL (and engaged LB) spins** are requested: an engaged defender always
  faces his blocker, who slides around him in a flowing double.
- **Yaw-motor wobble.** The body oscillates ±30° at 300–500°/s around a
  steady requested facing. That is physics; #162 is held.

`MAN_RUN_COMMIT` also trims the stalk tail on develop defaults:
- Zone 40+: 9.42 → 8.42% (alone), 8.50% with `TRACK_FACING` and
  `BLOCK_FRONT`.
- Gap 40+: 9.00 → 6.25% (with both).

The pre-merge level (about 4%) still needs the DB's approach to the carrier
after he escapes.

The spin film is `spin-review.html`: the flow candidate against the flow
candidate with the four fixes.

## Part 11 — the long-run tail: why runners who get past the box are never caught (2026-10-20)

Receipts are in [`part11/`](run-game-v3/part11/):
- `structure.txt`: NFL vs sim, same operators.
- `sim-internals.txt`: sim observers.
- `outcomes.txt`: every arm.
- `LABEL.manifest.json`: flags and provenance per arm.

NFL here means 2022 tracking, runs with 60+ yd to go. Develop is `d0co` (zone)
and `d0gap` (gap) from Part 9.

### Where the tail is

Survival of gains: the chance a run reaching one mark goes on to the next.

| | 5→10 | 10→15 | 15→20 | 20→30 | 30→40 |
|---|---|---|---|---|---|
| NFL | 0.34 | 0.48 | 0.48 | 0.53 | 0.74 |
| Develop | 0.38 | 0.83 | 0.92 | 0.95 | 0.99 |
| `DEEP_CAP` | 0.69 | 0.52 | 0.72 | 0.83 | 0.95 |

Develop's distribution is bimodal:
- Zone 10–39 yd runs are 3.7% of plays (NFL 10.1%).
- 40+ runs are 9.4% (NFL 0.8% on zone concepts).

The NFL runner who escapes the box is caught downfield. The sim runner is
not. With the deep safety held back (`DEEP_CAP`), 10→15 matches the NFL,
but 5→10 leaks instead, and past 15 the runner still mostly goes.

### Why nobody catches him

**1. Nobody is there.**

| | NFL | Develop | `DEEP_CAP` |
|---|---|---|---|
| Defenders who could cut off the runner's actual path within 30 yd, from his position at +10 (`angles.py`, straight-line test at each one's own peak speed), per run | 2.16 | 0.80 | 0.91 |
| Defenders within a yard after +8 (`openfield.py`), per run | 1.88 | 0.58 | 1.00 |

On runs reaching 10 (`carrierpace.py`):
- At +12 the NFL runner has slowed to 6.6 yd/s with 2 defenders within 3 yd.
- The sim runner has sped up to 8.4 yd/s with none within 3 yd (nearest
  3.6 yd).

**2. The secondary comes down from the snap** (`dbdepth.py --shell`). Deepest
defender at the snap, then when the runner crosses the line:

| Shell | NFL | Develop |
|---|---|---|
| Cover 3 | 14.2 → 14.2 yd | 13 → 7.1 yd |
| Cover 1 | 14.1 → 13.3 yd | 13 → 6.8 yd |
| Two-high | 13.2 → 12.9 yd | 12 → 7.6 yd |

- The NFL deep man first gains depth (15.9 yd at handoff + 0.5 s in Cover 3).
- The cause in the sim: an alley defender chases as soon as the back is
  within 2.5 yd of the line.
- Per DB at +8 (`dbwhere.py`): deep-aligned DBs are ahead of the runner 61%
  in the NFL, 9% in develop, 42% with `DEEP_CAP`.
- The Cover 3/1 force safety (5–10 yd, inside) is near or ahead of the
  runner 68% in the NFL vs 7% in the sim. His force fit squeezes to the
  line before the back gets there.

**3. The front seven never follows the runner.** Nearest defender when a
5–9 yd run ends (`stopper.py`):

| | LB | DL | DB |
|---|---|---|---|
| NFL | 38% | 20% | 41% |
| Develop | 12% | 2% | 86% |

Pile timing can bias this measure, so it is not used on its own. Supporting
evidence:
- **Free defensive linemen are slow.** Half a second after the crossing they
  move at 1.9 yd/s (NFL 3.6) while asking for 7.7 (`dlpursuit.ts`).
- **Edge fits face the line.** At +0.3 s, 74% of free linemen are edge fits
  told to face the line while the runner is inside them. That fit holds
  until the runner is 2 yd past the line.
- **They don't accelerate.** At +1.0 s, facing within 33° of the runner, they
  still reach only 2.7 yd/s. That is the body's speed-up law (physics).
- **The re-block loop.** After the crossing, a lineman is re-blocked 4.15
  times a play, by the same blocker (95%), after one tick free
  (`relatch2.ts`). This is the Part 3 loop. `SHED_PURSUE` breaks it for
  0.6 s.
- **Near the hole, linemen don't get a hand on the runner.** Of DL within
  3 yd of the runner at the crossing, NFL ones get within 1.2 yd of him in
  the next second 53–68% of the time; sim ones 21–33% (`nearreach.py`).

**4. Receivers take two DBs out of every play** (`dbstalk.py`, proximity
proxy).
- Stalked DBs per run: 2.04 (NFL 1.36; 0.43 before #148/#149).
- Per encounter, a stalked DB reaches the runner about as often as an NFL
  one (runner within 2 yd: 75% vs 87%).
- The stalks happen where the run isn't: 76% with the runner never within
  6 yd (NFL 48%).
- Inside a rep, the run-rep law overrides a pursuing DB's request with
  "work across the face." The backside corner in `oz/weak/ace_12/over3/
  pair11/3` asks for 9.9 yd/s for 1.2 s and moves at 0.5.

**5. Contact that doesn't end the play doesn't slow the runner**
(`contactloss.py`, `openholds.py`).
- At NFL encounters past +5 the runner is going 5.3–6.1 yd/s; in the sim
  6.7–7.7.
- A broken open-field hold costs the sim runner 0.5 yd/s (8.0 → 7.4) over
  0.25 s.
- Sim encounters end the play or do nothing (ended 90%, slowed 0–4%; NFL
  71% / 20%).

### Candidates (default-off)

| Flag | What it does | Where |
|---|---|---|
| `EDGE_SQUEEZE` | An edge/force fit whose carrying runner is inside him at the line pursues instead of holding his landmark square to the line | `run-fits.ts` |
| `FORCE_DEPTH` | A force defender aligned 5+ yd off the ball keeps his installed depth while the runner he sees is behind the line (Cover 3 SS at the crossing: 3.8 → 7.5 yd; NFL second-deepest 7.1) | `run-fits.ts` |
| `SHED_AWAY` | A blocked defender whose runner is past the line on the far side from his blocker asks for his own pursuit instead of the rep's work-off; contact and hands still decide | `engagement.ts` `stepRunRep` |

`test/long-run-tail.test.ts` holds each flag's on/off contract.

Tried and removed:
- **`SHED_FACE`**: the rep's facing follows the rip. Free linemen's facing
  did not move.

### Results

Total variation distance (TVD) is measured against NFL zone-concept runs
(zone arms) or NFL power/counter/duo/trap runs (gap arms) (`bands.py`).

| Arm (zone unless noted) | 40+ | 10–19 | TVD |
|---|---|---|---|
| Develop | 9.4% | 3.1% | 15.2 |
| `EDGE_SQUEEZE SHED_PURSUE MAN_RUN_COMMIT BLOCK_FRONT` (`v2`) | 7.2% | 3.2% | **13.8** |
| `v2` + `FORCE_DEPTH SHED_AWAY` (`y1`) | 8.4% | 3.5% | 14.5 |
| `y1` + `DEEP_CAP` (`x3`) | 4.9% | 16.2% | 19.6 |
| `GAIT_STEP=0.3` alone (physics flag, context) | 6.3% | 2.7% | 18.0 |
| `v2` + `GAIT_STEP=0.3` | 3.8% | 2.7% | 15.2 |
| Gap: develop | 9.0% | 4.2% | 11.2 |
| Gap: `v2` | 5.4% | 3.1% | 13.4 |
| Gap: `y1` | 5.9% | 3.1% | 11.9 |
| Gap: `x3` | 4.7% | 25.1% | 20.0 |

Every candidate moves the 40+ mass somewhere, but not into the 10–39 band:
- **Without `DEEP_CAP`:** it lands in stops at 0–3 yd (gap 0–3: 37.7 →
  43.4%).
- **With `DEEP_CAP`:** it lands in 10–19, because the box then stops fewer
  4–9 yd runs.
- **With `GAIT_STEP`:** negatives rise to 19–20%.

`v2` is the only zone arm closer to NFL than develop, and only slightly.
Nothing here fixes the tail. The pieces are measured, and none is proposed
as a package.

### What the tail needs, by owner

1. **Physics** (in order of consequence):
   - **Pursuer start-up.** Free defenders reach a third of the speed they
     ask for in the first second. `GAIT_STEP=0.3` alone takes zone 40+ from
     9.4 to 6.3% but raises negatives to 20%.
   - **Contact that slows without ending.** Broken holds barely slow the
     runner; NFL contact does.
   - **The engaged-tackle gate** in `tackle.ts` (`win < 0.6`, arms × 0.4).
     Engaged linemen the runner passes within arm's reach get a hold 33% of
     the time.
2. **Coverage / DB run support:**
   - The receiver's stalk of a corner 7 yd off, before the run declares.
   - The DB's technique against it (Part 9 handoff, now quantified).
3. **Controller (this branch), next:**
   - Make the box stop 4–9 yd runs so the deep safety can stay deep. The
     limiting step is the front seven's arrival, which waits on the physics
     items above.
   - Re-test `DEEP_CAP` + `v2` once pursuer start-up changes.

## Part 12 — fixing the tail: pursuit that arrives, a deep safety that stays deep, backers that read (2026-10-20)

The user took on the physics items from Part 11 ("you'll handle it"). Receipts
are in [`part12/`](run-game-v3/part12/):
- `outcomes.txt`: every arm, bands, survival and paired tests.
- `mechanisms-zone.txt`: NFL vs develop vs candidate, same operators.
- `LABEL.manifest.json`: flags and provenance per arm.

### Candidate

All flags stay default-off. The candidate is:

`EDGE_SQUEEZE SHED_PURSUE MAN_RUN_COMMIT BLOCK_FRONT DEEP_CAP LB_DEPTH ZONE_TE UC_MESH MESH_TEMPO QB_CARRYOUT PACE_LEAD GAIT_STEP=0.5`

Total variation distance (TVD) from NFL60, by gain band (`bands.py`):

| Set | NFL 40+ | Develop 40+ / TVD | Candidate 40+ / TVD | Without `GAIT_STEP` 40+ / TVD |
|---|---|---|---|---|
| Ace zone (1,200) | 0.8% | 9.4% / 15.2 | **1.8% / 7.2** | 2.1% / 10.6 |
| Gap schemes (1,600) | 2.0% | 9.0% / 11.2 | **4.4% / 4.0** | 5.4% / 10.9 |
| Shotgun doubles zone (600) | 0.8% | 6.8% / 15.1 | 2.0% / 16.9 | 4.2% / **11.1** |

Paired against develop on the same cases (`paired.py`):

| Set | 40+ | 20+ | Negatives | 4+ |
|---|---|---|---|---|
| Ace zone | 113 → 22 | 120 → 31 | 170 → 117 | 516 → 623 |
| Gap | 144 → 70 | 158 → 98 | 171 → 129 | 826 → 892 |
| Shotgun | 41 → 12 | 53 → 19 | **49 → 103** | **235 → 192** |

Every change in this table has p ≤ 0.013. The ace zone candidate is close to
NFL in every band:

| Ace zone | <0 | 0–3 | 4–9 | 10–19 | 20–39 | 40+ |
|---|---|---|---|---|---|---|
| NFL | 7.6 | 44.7 | 36.8 | 8.6 | 1.5 | 0.8 |
| Develop | 14.2 | 42.8 | 29.9 | 3.1 | 0.6 | 9.4 |
| Candidate | 9.8 | 38.3 | 40.3 | 9.0 | 0.8 | 1.8 |

### Why it works (`mechanisms-zone.txt`)

The Part 11 mechanisms moved toward NFL:

| | NFL | Develop | Candidate |
|---|---|---|---|
| Defenders who can cut off the runner from +10, per run | 2.16 | 0.80 | 1.31 |
| Encounters within a yard past +8, per run | 1.88 | 0.58 | 1.31 |
| Runner at +12 on runs reaching 10: speed / nearest defender | 6.6 yd/s / 1.3 yd | 8.4 / 3.6 | 7.1 / 1.2 |
| Deepest defender when the runner crosses | 13.8 yd | 7.1 | 12.2 |
| Free DL speed 0.5 s after the crossing | 3.64 yd/s | 1.9 | 3.51 |
| Free LB closing on the runner then | +0.83 yd/s | −1.30 | +0.84 |
| Gap backers' depth at the handoff / at the crossing | 3.5 / 2.5 yd | 2.9 / 1.8 | 3.9 / 3.0 |

Each piece:
- **`DEEP_CAP`** keeps the last level deep. NFL deep defenders hold or gain
  depth until the run is confirmed, in every coverage shell.
- **`GAIT_STEP=0.5`** (the existing physics flag) lets a freed defender reach
  the speed he asks for. Pursuit after the crossing becomes NFL-like.
  - It is not a better fit of the body: the acceleration envelope fit
    (`gaitfit.py`) gets worse, 0.42 → 0.53. Linemen improve; DBs and
    linebackers speed up faster than NFL ones at low speed.
  - Without it, `DEEP_CAP` leaks 5–9 yd runs into 10–19.
- **`LB_DEPTH`** (new) is the largest single gain on gap runs:
  - A stack backer used to sprint at a landmark on the line before the back
    showed his gap.
  - NFL backers read at about 3.5 yd and flow with the pull at 1.75–2.0 yd/s
    from the handoff. Ours flowed at 0.
  - Now he holds his alignment depth less one step until the back threatens
    his gap.
- **`ZONE_TE`** lets an inline tight end take a slanting end inside instead
  of running his track past him. Ace zone TVD 15.6 → 12.1 on top of the
  stack.
- **The mesh package** (Part 6) times the exchange like the NFL. On gap runs,
  TVD 11.1 → 4.0.
- **`EDGE_SQUEEZE SHED_PURSUE MAN_RUN_COMMIT BLOCK_FRONT`** (Parts 10–11) remove
  pursuit stalls: edge fits holding the line, the re-block loop, the man cue
  lapsing, blocks in the back.

Film: `out/film/tail-review.html` (not committed). It shows the same 20 cases
for develop and the candidate, plus 10 NFL clips:
- 8 develop 40+ witnesses and 12 random ordinary plays, drawn with
  `random.Random(20261020)` before any candidate outcome was seen
  (`scripts/diag/stretch/film-tail-cases.txt`).
- The 8 witnesses end at −0.5 to 11.2 yd under the candidate. The mesh
  package changes each play from the snap, so these are not the same play
  caught later.

### What is still wrong

1. **Shotgun stretch stuffs** (negatives 8.2 → 17.2%; outside and wide zone
   21–28%), and strong-side stretch on ace (outside zone 13%, wide zone 23%;
   the weak side is 8–10%, NFL-like).
   - The gait drives it: without it, shotgun negatives are 12.8%.
   - Engaged linemen out-quick the reach and go into the backfield under it.
     A strong-side end ends 1.6 yd deep by 1.8 s. NFL engaged linemen are
     driven back about 1 yd by 3 s on outside zone; ours stay at 0.
   - Outside-zone DL lateral at 1 s: 0.37 yd vs NFL 1.32.
   - This is the engaged-pair trench law (Part 9 lateral flow), next in line.
2. **Contact still ends plays or does nothing** (97% / 0% slowed past +8; NFL
   71% / 20%). A broken hold costs the runner 0.5 yd/s.
   - That is the grip law. Not changed here: raising grip strength to rescue
     a statistic is out of bounds.
3. **Linemen finish 2% of 5–9 yd runs** (NFL 20%).
4. **Gap 10–19 yd runs** are 12.2% (NFL 11.3%) and 20–39 yd runs 1.8% (3.3%).

### Tried and removed

- **`ENGAGED_REACH`**: a blocked defender's free arm reaches a runner with no
  blocker between them. Zone 40+ fell to 7.6%, but block-origin holds doubled,
  mostly in the backfield, and negatives rose to 17.7%.
- **`SHED_CLEAR`**: `SHED_AWAY` for any clear path. Blocked backers' reach
  rate was unchanged at 36–40%; the hands hold them.
- **`RUN_READ`** (existing): the back's press-and-read.
  - TVD 20.8 alone and 21.2 on the stack.
  - It does not spread the back's widths. The stretch width problem is the
    edge, not the read.
- **Other flags tried:**
  - `LB_GLIDE` and the Part 9 flow stack: more stuffs.
  - `RUN_LATERAL`, `COMBO_LEAVE`, `STRETCH_FLAT`, `PULL_CUE`: no gain.
  - `FORCE_DEPTH` and `SHED_AWAY`: neutral on zone, worse on gap.
- **`GAIT_STEP` 0.3 and 0.7**: worse than 0.5 on outcomes. No value fits the
  NFL acceleration envelope better than the current body.

### Next decision

Choose between the candidate (best on ace zone and gap, adverse in shotgun)
and the same flags without `GAIT_STEP` (better than develop on all three
sets, weaker tail). Then repair the engaged reach on stretch plays: linemen
driven back and flowing as in NFL. That is what the gait exposes, and what
keeps shotgun from improving.

## Part 13 — film notes: force width, pullers, trap, teammate spacing (2026-10-20, WIP checkpoint)

All new flags are default-off; defaults reproduce develop (30/30 zone and
40/40 gap lab plays). Commit `3cfad552`. Arms are paired on identical cases;
manifests in [part13/](run-game-v3/part13/). "Candidate" is the Part 12
candidate.

**Force safety width (user film AFTER-04/14).** On stretch runs the force
defender aimed 0.7 yd outside the runner's *current* spot with no lead.
`edgewho.py` (same operator for NFL and sim): 0.8 s before the crossing the
nearest outside DB is 5.0 yd outside the runner at 4.1 deep in NFL, 2.2 yd at
5.3 deep in the candidate; the edge was lost (nobody outside) on 10% of
stretch runs (NFL 4%). **`FORCE_LEAD`** (`run-fits.ts` force fit): leverage
on the runner's acquired lateral track (`interceptPoint` at fit depth,
lateral feed-forward, hips open to run). Edge lost 10 → 1%, outside DB 2.2 →
3.4 yd. Ace zone TVD 7.2 → 4.4 (40+ 1.8 → 0.8%, NFL 0.8; paired 40+ 22 → 10,
p 0.017); shotgun 16.9 → 15.4; gap 4.0 → 4.4 (10+ falls, 0-3 rises).
Remaining: 10-19 yd zone runs now under NFL (5.9 vs 8.6%); the front still
does not flow outside the runner (DL/LB outside him at the crossing 0.07/0.30
per run, NFL 1.00/1.24).

**Pullers (AFTER-15/05/19).** `pullprobe.ts` (320 candidate pullers): lateral
0.2/1.1/2.4 yd at 0.6/1.0/1.4 s (NFL 0.8/2.0/3.4); 69-91% of kick/trap
pullers turn more than 270° in 1.2 s; lead pullers engage anyone 4% of plays.
Causes: (1) the first waypoint goes straight back with no facing, so the turn
picks the wrong side; (2) teammate spacing cuts the request (5 → 1.4 yd/s)
and points it backward behind the down blockers; (3) lead pullers keep the
backer named at the snap.
- Existing `PULL_STEP`: spins >270° 69-91% → 0%; kick lateral 0.5/1.5/3.0.
- **`LEAD_READ`** (`blocking.ts` `holeThreat`): lead puller takes the
  uncovered second-level defender nearest the hole from his own picture,
  committed within 2.5 yd. Lead engagement 8 → 13%; still late.
- Gap outcomes with both: no significant change (paired p ≥ 0.09).
- AFTER-19 with all pieces: the kick-out lands inside-out at 1.85 s; +2.7
  instead of −0.4 (end tackle).

**Trap tackle stands (AFTER-15).** **`TRAP_READ`** (`run-fits.ts`): an
interior defender meets an arriving trapper (a lineman crossing behind the
line who aligned 1.5+ yd inside him) like an edge meets a kick-out. The
tackle now meets him 0.05-0.2 yd in the backfield instead of waiting at +0.27.
Outcome arm `tr1gap` was queued but not scored.

**Teammate spacing (user request: a general fix).** `spaceprobe.ts`
(200 plays, 3 s): the carrier loses ≥30% of requested progress on 22.6% of
moving ticks, FB leads 35%, lead/trap pullers 30%, combos 23%, man-coverage
backers 29%. The law's only answers to a teammate in the way are to slow,
halve or stop; 34-71% of throttles are head-on. **`SPACE_STEER`**
(`spacing.ts`): when spacing costs >30% of forecast progress, try the request
rotated 15-75° each side with the same free-movement forecast and peer
pictures; take the clear one with most progress; hold the side 0.3 s
(`=2`: diagnostic, carrier excluded). Throttles: carrier 22.6 → 8.4%, kick
puller 19 → 5%, trap puller 30 → 8%, man backers 30 → 19%. Outcomes:
- Shotgun zone: negatives 101 → 77 of 600 (p 0.016), TVD 15.4 → 12.9.
- Ace zone: 4+ 520 → 480 (p 0.041), all from inside zone (4+ 52 → 42%);
  TVD 4.4 → 7.7. Handoff 0.05 s earlier, QB 0.5 yd deeper.
- Gap (vs `fl4gap`, same flags without it): 4+ 842 → 764 (p 0.002),
  TVD 4.9 → 9.7.
- Hypothesis, untested: the carrier should not be steered by the spacing
  layer (it sees only teammates and can bend him into defenders; his runner
  controller owns lane choice). `st2co`/`st2gap` (carrier excluded) were
  queued but not scored.

**Next decision.** Score `SPACE_STEER=2` and `TRAP_READ` (`scripts/diag/stretch/part13-arms.sh`
reruns them: `st2co`, `st2gap`, `tr1gap` against `fl4gap`/`fl1co`). Keep
`FORCE_LEAD`; keep `PULL_STEP`/`LEAD_READ` as mechanism repairs with neutral
outcomes. Lead pullers are still late through the corner (waypoint path makes
a near-stop square turn, ~1.6 yd/s): a rounded arrival path is the next
puller repair.

### Part 13 integration handoff (2026-10-20)

Exact patches, dependencies, successor map, ready/experimental status, the
AFTER-04/14 attribution (the possession gate, not the interception lead,
turns AFTER-04 on #176), the completed TRAP_READ arm (trap negatives
25 → 40 of 200, p 0.001) and the unrun `SPACE_STEER=2` arms are in
[run-game-v3/handoff](run-game-v3/handoff/README.md).

## Part 14 — contact model: tackles that slow and hold up the runner (2026-10-21)

Moved to its own document: [contact model](contact-model.md). One leg
force-velocity budget (`LEG_FV`), anchoring against a pull (`LEAN_AXIS`), an
inelastic leg-hold request in the solver (`TETHER`) and the holder judging his
wrap by the point he holds (`HOLD_POINT`) make the earlier hip-brace/roll/
binding set usable; all seven are on in this branch's pinned profile.


## Part 15 — run offense: the blocks and reads the offense should make (2026-10-21)

Moved to its own document: [run offense](run-offense.md). Zone doubles help
the man in the gap beside the uncovered player (`COMBO_GAP`), the back reads
a defender's arms (`RUN_REACH`), the free member of a stretch double climbs
when his partner holds the man alone (`COMBO_SOLO`), outside/wide-zone backs
press the snap landmark (`STRETCH_AIM`) and the power fullback kicks the end
out from his inside shoulder (`FB_KICK`); all on in this branch's pinned
profile. Ace zone losses 15.3 → 6.4%, shotgun 9.2 → 5.5%, power 12.2 → 7.5%.
