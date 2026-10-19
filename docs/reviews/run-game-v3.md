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
