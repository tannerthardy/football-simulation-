# Run game v3: where it is weakest, and flagged repairs — 2026-10-18

Branch `claude/run-game-v3` from accepted develop `f414627`. Not integrated.
Every change is a default-off flag; flags off, the zone lab is identical on
1,200/1,200 plays (yards and every tracked position). 1,906 TS tests and
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
    zone, and duo compares with "MAN".
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
| `DEF_GETOFF` (diagnostic scale, default 1) | Defensive snap latency is an unfitted assumption; NFL box defenders and OL first move at the same median time | `agent.ts`; shared perception, owner decides |

Contract tests: `test/stretch-flat.test.ts`, `test/run-game-flags.test.ts`,
`test/back-chase.test.ts` and `test/deep-cap.test.ts`. They cover default-off behavior, both flips or
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
| Contact to whistle (median) | 0.8 s | 1.4 s |
| Yards after contact, slow entry | 0.4 | 1.1 |
| Yards after contact, mid entry | 1.4 | 2.3 |
| Yards after contact, fast entry | 3.0 | 3.6 |
| Defenders within 2 yd at the end (median) | 2 | 3 |

**Held carriers fall 0.3 s after the first hold** in 95–99% of holds at every
depth (`bondend.ts`).

- **The carrier's request does not matter.** Counterfactual requests while
  held were tried: no lean, keep current velocity, current speed north, and
  vmax north. Hold to fall stays 0.3–0.35 s, and yards after the hold move by
  0.1–0.3. A held-runner "get north" flag was tried and removed for that
  reason.
- **The parked tackle flags do not change it.** `WRAP_BIND`, `TACKLE_ROLL`
  and `TACKLE_TOUCH` all leave it at 0.3–0.45 s.
- **One traced hold** (`holdtrace.ts`) is a legitimate side tackle. A
  linebacker crossing at about 5 yd/s tightens a grip to 0.5 yd. The pull
  (over 2 body weights sideways) moves the runner's capture point out, and he
  falls at 0.4 s. Whether nearly every hold should end that fast is a
  tackle/support question.

### The 40+ tail: structure first, then execution

Pursuit feasibility when the runner reaches 10 yd (`pursuit.py`): a straight
intercept test of every defender against the runner's actual later path at
his own peak speed, with 0.3 s to react.

| At 10 yd | NFL60 | Develop | `DEEP_CAP` |
|---|---|---|---|
| Defenders still ahead (median) | 3 | 1 | 2 |
| No defender could intercept before +40 | 20% | 41% | 26% |
| Share of 10+ runs that went 40+ | 9% | 39% | 17% |

With `DEEP_CAP` the structure is close to NFL. Of its 48 runs of 40+:

- 29 had an open-field hold (18 where every hold broke).
- 7 were missed attempts.

The breaks are the earlier finding: flat-footed DBs (1–2.5 yd/s) taking arm
holds (grip 0.1–0.4) on a runner at 8+ yd/s. Approach and chase finishing have
already had their two attempts (`claude/open-field-tackling`). What remains is
tackle physics at speed.

## Handoffs (no edits made)

- **Defensive snap latency** (`agent.ts`, perception): NFL box defenders and OL
  both first move at a median 0.3 s; the sim's first move at 0.5 and 0.4 s.
  Halving the defensive scale (`DEF_GETOFF=0.5`) makes them equal (0.4/0.4).
  Inside zone then moves onto NFL (4+ 54.5 → 49.0, mean 8.45 → 6.82); the
  tail is unchanged.
- **Engaged lateral race** (World contact and gait): engaged OL lateral speed
  is 1.0 vs 3.0 yd/s. The OL's lateral acceleration from the stance is about
  3.5 yd/s², and contact then halts it. This is the root of weaknesses 2 and 3.
- **Held carriers go down too fast** (tackle/support physics): falls come
  0.3 s after the first hold in 95–99% of holds at every depth. Contact to
  whistle is 0.8 vs 1.4 s, and yards after contact are 0.6–0.9 lower in every
  entry-speed band. This is the largest single cause of the stuffs at the
  line and the missing 2–6 yd runs. The carrier's own request does not change
  it, and neither do the parked tackle flags (receipts in `holds.txt`).
- **Open-field holds at speed break** (tackle physics): with the secondary at
  NFL depth (`DEEP_CAP`), 29 of 48 runs of 40+ had an open-field hold, and in
  18 every hold broke. The structure is otherwise close to NFL.

## Next decision

1. Review `rec2` (`UC_MESH ZONE_TE STRETCH_FLAT LB_KEY`) as the candidate,
   weighing the under-center IZ and tail repair against the gun-doubles and
   gap-scheme 4+ adverses above and the `ZONE_TE` caveat. Without `ZONE_TE`
   (`rec`), the mesh exposure is uncovered: ace WZ negatives reach 26%.
   `UC_MESH`, `STRETCH_FLAT` and `LB_KEY` each move their own mechanism toward
   NFL. Their combined outcomes stay mixed until the line slides.
2. Keep `DEEP_CAP` parked until the box holds without the collapsed safety.
   Keep `BACK_CHASE` and `RUN_LATERAL` as mechanism candidates (flow toward
   NFL); they are not outcome improvements on their own.
3. Physics owner, in order of consequence:
   - held-carrier fall timing;
   - the engaged lateral race and OL start-up acceleration;
   - open-field holds at speed.

   Perception owner: the defensive snap latency (`DEF_GETOFF=0.5` is the only
   arm that beats develop on the whole distribution).
4. Controller, after those: the runner's cutback read against a pursuing
   backside (the shelved `RUN_READ` is not it).
