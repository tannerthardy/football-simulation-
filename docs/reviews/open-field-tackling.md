# Open-field tackling and the long-run tail — 2026-10-16

Branch `claude/open-field-tackling`, stacked on `claude/zone-run-breakthrough`
(`50f6a08`, from accepted develop `c3264b0`). Not integrated.

## Question

Runs of 40+ yd were 2.1% of zone-lab plays before the run-game work and 3.5–4.1%
after it, with about two broken or missed tackles on each. Is that open-field
tackling, and what fixes it?

## Short answer

It is mostly not tackling execution. It is structure: the sim's secondary
collapses to linebacker depth before the runner reaches the line, so when the
first second-level contact fails there is nobody left. Up to now that collapse
has also been propping up a soft front seven.

- 46 of the 49 40+ runs are 70-yd touchdowns. Past 5 yd they have only about 0.6
  holds each. The "two broken or missed tackles" mostly happen near the line.
- One-on-one in space, the production chase and tackle work. The space drill
  tackles 83% (75% against the elite pair11 back), and holds break 6% of the time.
- The same operator on 2022 NFL tracking and on the sim shows the deep secondary
  is gone in the sim by 3 s. The runner's timing matches the NFL.
- Part 2 follows the cap into the box: the line loses the contest (no lateral
  zone race; single blocks decided by weight). `DL_ESCAPE=1` (default-off,
  recommended candidate) moves several first-contact measures onto the NFL's.
- Restoring a deep cap (`DEEP_CAP=1`, default-off) makes the conditional tail far
  more NFL-like. It also exposes a soft box: 10+ yd runs more than double, and
  the runner reaches the safety untouched. Promotion needs the box fixed first.

## Evidence

All runs: zone lab (ace 12; IZ/OZ/WZ both ways; 10 looks; pair11/pair31; 10 seeds;
1,200 plays). "Candidate" = `RUN_LANE=1 CLIMB_EXIT=1`. NFL = 2022 weeks 1–9 runs
(6,223) through the same Python operator (`scripts/diag/open-field/geometry.py`,
`timing.py`) on the common play format. A flag is a place to look, not a target.

### Runner timing matches, secondary depth does not

Medians, among plays where the runner is still short of 5 yd:

| | NFL | Candidate | Candidate + `DEEP_CAP` |
|---|---|---|---|
| Runner crosses line | 2.6 s | 2.7 s | 2.7 s |
| Runner reaches 5 yd | 3.8 s | 3.7 s | 3.7 s |
| Deepest defender at 2.0 s | 14.5 | 10.5 | 11.2 |
| Deepest defender at 3.0 s | 12.7 | 7.9 | 11.9 |
| Second deepest at 3.0 s | 9.0 | 6.1 | 7.9 |
| Defenders 8+ yd deep at 3.0 s | 2 | 0 | 1 |

By slot (`out/zone-lab/dbg/dbdepth.ts`), the Cover 3 post safety goes from 12.6
yd at 1.0 s to 9.9 at 2.0, 6.0 at 3.0 and 5.2 at 3.5. Two-high safeties go from
11.5 to about 6. The cause is the alley fit:
- `run-fits.ts` sends every non-box DB to a landmark at `clamp(home·0.65, 5, 8)`,
  so the post safety targets 8 yd.
- It then switches to a full chase once the runner is 2.5 yd behind the line.

### What happens after the runner reaches the open field

| | NFL | Develop | Candidate | Candidate + `DEEP_CAP` |
|---|---|---|---|---|
| Runs reaching 5 yd | 37.1% | 17.7% | 28.7% | 39.7% |
| Defenders downfield at 5 yd (median) | 5 | 3 | 3 | 4 |
| Deepest ahead at 5 yd (median) | 8.0 | 4.1 | 4.1 | 5.8 |
| 40+ after reaching 10 yd | 4.9% | 38.5% | 44.1% | 15.1% |
| P(40+ \| 20+) | 0.25 | 0.78 | 0.88 | 0.63 |
| 10+ / 20+ / 40+ of all runs | 11.7 / 2.7 / 0.67% | 5.7 / 2.7 / 2.1% | 9.9 / 4.7 / 4.1% | 24.8 / 5.8 / 3.7% |
| Mean / median gain | 4.48 / 3 | 4.03 / 1.87 | 6.37 / 3.31 | 7.71 / 3.77 |

On develop alone, `DEEP_CAP` gives 10+ 12.7%, 20+ 2.8% and 40+ 2.4%. That is
25→29 plays of 40+, which is noise-level, and P(40+ | reached 10) is 19.7%
(from 38.5%).

### First contact at the second level

In 40+ runs the first free encounter is usually a DB about 2 yd past the line.
He is nearly stationary (median 2.3 yd/s) and wraps a runner arriving at 6.5–7
yd/s. The runner passes about 1.3 yd to his side, so the wrap is taken at arm's
length.

All lone DB holds past the line, broken vs held:

| | Broken holds | Holds that stuck |
|---|---|---|
| Number | 148 | 360 |
| Initial grip (median) | 0.43 | 0.90 |
| Hold distance (median) | 1.31 yd | 0.88 yd |
| Contact angle (median `cosA`) | −0.28 (side or behind) | +0.45 |

Break rate by initial grip:

| Initial grip | < 0.3 | 0.3–0.5 | 0.5–0.7 | > 0.7 |
|---|---|---|---|---|
| Broken | 79% | 64% | 39% | 7% |

The geometry is a real football miss: a flat-footed fit and an arm tackle.
Whether a 0.4 grip on a runner at 7 yd/s should break this often is a physics
question (see handoffs). First contact as a whole is not soft:

| At first contact | Sim (candidate) | NFL |
|---|---|---|
| Runner speed p50 / p90 (yd/s) | 5.9 / 7.4 | 4.5 / 6.8 |
| Tackler speed p50 / p90 (yd/s) | 2.35 / 4.1 | 2.85 / 5.8 |
| Broke contact | about 11% | 12.5% |

### The chase

Pursuers who reach 0.5–2 yd behind a runner at matched speed never finish:
1. Inside standing reach, the 0.3 s window forecast always shows a slightly
   better wrap at its own horizon, so the tackler waits. One traced safety waited
   about 1.5 s (about 14 yd) within reach.
2. In the lunge band, `needsLastReach` requires `closestAt === 0`, which never
   happens while closing slowly.
3. The dive needs the runner separating at more than 1.6 yd/s.

From their state when the runner reaches 5 yd, an engine `timeToReach` oracle
finds that in 40 of 49 touchdowns no defender could have reached the runner's
actual path. A DB passed flat-footed by a runner at full speed cannot catch him.

## What was tried

| Change | Rationale | Result | Status |
|---|---|---|---|
| `CHASE_REACH` | A tackler within reach takes his hold when the runner heads away (>60°) instead of waiting for the forecast's closer one | 40+ 4.1→4.2%, 10+/20+ unchanged | Removed; real decision defect with small consequence (below) |
| `CHASE_EFFORT` | A pursuer downfield of the runner gets no "away from the ball" effort cut (`chase`: dist > 12 → 75–95%) | 40+ 4.3% | Removed |
| `CHASE_DIVE` | A trailing pursuer who is not gaining lays out for the legs | Dives 13→42, contacts 2→8, dive holds break 31/39; 40+ 4.3% | Removed; physics note |
| `DEEP_CAP` v1 | Hold installed depth and mirror; gather only when the runner arrives | 40+ 10.7%. The runner picks his angle against a set, waiting safety (closest pass 2–3.5 yd lateral) | Replaced |
| `DEEP_CAP` v2 | Hold installed depth until the runner seen crosses the line, then ordinary pursuit | Tables above | Kept, default-off, parked |

Two attempts each on chase finishing and on the cap; stopped there per the
stopping rule.

The space drill (`scripts/diag/open-field/space.ts`) is why v1 failed. The
production runner meets one production pursuer at a 5/8/12 yd cushion, with
lateral offsets of 0/1.5/3 and speeds of 6/8. Closing the cushion with the
ordinary chase tackles 83–100% from 8–12 yd. Escapes are mainly a 5-yd cushion
with a 3-yd offset (pure geometry). Waiting at depth hands the runner the angle.

## Contract change (`DEEP_CAP=1` only)

`isRunCap` = installed deep zone (`isDeepZone`) with an alley fit. Cap
defenders keep their installed depth, mirroring the seen runner inside-out
(the alley's 1.2 yd shade), until the runner they see crosses the line. Then
they pursue with the ordinary `chase`. Only the consumed picture of the runner
and the defender's own installed alignment are used.

Default behavior is unchanged: 1,666 default tests pass, including 3 new
`test/deep-cap.test.ts` contract tests:
- off by default;
- depth held while the runner is behind the line;
- identical to `chase` once he is past.

## Why `DEEP_CAP` is not recommended alone

Better football exposes a soft box. With the cap deep, runs of 10–19 yd get
their first hold at a median of 7.7 yd (4.2 without the cap). The runner gets
through the linebacker level untouched. 10+ rises on every look:

| Look | odd3 | under3 | over3 | tite4 |
|---|---|---|---|---|
| 10+ without → with cap | 7% → 39% | 8% → 30% | 4% → 20% | 26% → 44% |

This is the same soft inside-zone fit already recorded in
[the zone review](zone-run-breakthrough.md): sim yards before contact 1.6 vs
NFL 0.7. The safety at linebacker depth hides it.

The right order:
1. Make the front seven's fits hold without a ninth defender.
2. Enable the cap.
3. Judge the combination by the same operators.

## Physics handoffs (no World edits made)

- **Arm's-length holds at speed.** A lone DB hold with initial grip 0.3–0.5 on a
  runner passing at about 7 yd/s breaks 64% of the time, below 0.3 79%. It
  slips out at reach after about 0.3 s and costs the runner about 0.7 yd/s.
  These come from `contactQuality` at the attempt, with grip then evolving by
  distance. The open question is whether the World should let an arm tackle
  deliver more speed loss or rotation before it slips. This is not a request to
  strengthen grips: it ties to the existing `REACH_CONTACT` and `TACKLE_TOUCH`
  findings.
- **Ankle taps.** Under `CHASE_DIVE`, dive leg holds (quality 0.3, `legs` 1) on
  runners at full speed broke on 31 of 39 tries. A real ankle tap trips by
  displacing the stepping foot. The reduced body (no feet; anatomy paused)
  cannot represent that, so the dive decision is not where to fix it.

## Remaining decision defect (small)

`tryTackles` `waitForBetter` with a slowly closing trailing tackler is a Zeno
wait: the better hold is always at the forecast's 0.3 s horizon. It costs yards
on runs that end tackled. `CHASE_REACH` fixes it with acquired relative motion
only, but it does not move the tail, so it was not kept. The tested patch,
after `waitForBetter = …` in `tryTackles`:

```ts
if (CHASE_REACH && waitForBetter && window.currentQuality > 0) {
  // A runner heading away gains ground every beat spent waiting.
  const sx = observed.pos.x - d.pos.x, sy = observed.pos.y - d.pos.y;
  const sl = Math.hypot(sx, sy) || 1, sv = Math.hypot(observed.vel.x, observed.vel.y);
  const away = sv > .5 ? (observed.vel.x * sx + observed.vel.y * sy) / (sl * sv) : 0;
  if (away > .5) waitForBetter = false;
}
```

## Part 2: the box behind the cap

With full ownership granted, I followed the cap's exposed weakness into the
box. Same lab and operators. NFL figures are 2022 runs through the same code
on the common play format.

### Who should make the first contact

Nearest defender at first contact (a proxy for the first tackler), by group
and depth at the snap (`firsttackler.py`):

| | NFL | Candidate | Candidate + cap |
|---|---|---|---|
| Defensive line | 41.1% (ybc 0.2) | 33.6% (−0.3) | 32.7% |
| Linebackers | 35.5% | 39.4% | 39.3% |
| DB 10+ deep at the snap | 5.1% (ybc 6.7) | 10.1% (3.9) | 10.9% (8.8) |

The sim's deep safety makes contacts that NFL defensive linemen make. With
the cap on, nobody replaces them, and yards before contact p90 goes from 3.7
to 7.8 (NFL 4.7).

### The trench, measured the same way

- **Placement at the line crossing is fine.** When the runner crosses the
  line, the nearest free second-level defender is 3.2 yd away (NFL 3.6), and
  more sim defenders are free within 3 yd (`second.py`).
- **Get-off** (`getoff.py`, time to move 0.15 yd): NFL box defenders and OL
  both move at 0.3 s on runs and passes. Sim box defenders take 0.5 s, sim OL
  0.4 s. Sim defensive latency is `snapDelay + reactionTime·(1 − 0.4·anticipation)`
  (0.15–0.27 s), which the code itself calls an unfitted assumption. Halving
  it (diagnostic only, not kept) brings the early contest toward the NFL: a
  lineman's ground at 2 s goes from +0.1 to −0.2 (NFL −0.5), 40+ from 3.7% to
  3.0%. The driven-back tail does not change.
- **Single blocks are decided by weight**, as in `trench-deep-dive.md`.
  Defender's median ground at 3 s (+ = driven back) by blocker/defender mass
  ratio: < 0.95 → −1.42; 0.95–1.05 → −0.98; 1.05–1.15 → −0.60; > 1.15 → +1.16,
  with 29% driven 2.5+ yd. NFL outcomes do not track the ratio.
- **No lateral race** (`scripts/diag/trench/timeline.py`):

  | At 2.0 s | NFL | Sim |
  |---|---|---|
  | Outside zone OL / DL / LB lateral flow (yd) | 4.9 / 4.5 / 4.8 | 1.6 / 1.0 / 2.6 |
  | Outside zone engaged OL lateral speed (yd/s) | 3.0 | 0.75 |
  | Inside zone OL / DL lateral flow (yd) | 2.2 / 1.9 | 1.0 / 0.6 |
  | Inside zone engaged DL depth, 2 s / 3 s (yd) | 0.65 / 1.37 | 1.6 / 2.6 |

  A rep trace (`oz/strong/over3/pair11/77`) shows the mechanism. The
  play-side end requests 4.8 yd/s play side and achieves 1.4–2.0. The tight
  end blocking him requests 0.5–0.9 yd/s lateral plus 2.4 forward.
  1. On a stretch, the blocker's lateral request is the larger of his seal
     correction and the defender's achieved lateral speed.
  2. The hand joint (legal steer force) slows the defender.
  3. The blocker then matches that slower speed.

  Each side follows the other, so the pair settles at a slow equilibrium. NFL
  zone blockers lead: their footwork drives the race. Two attempts failed and
  were removed:
  - `DL_HOLD`: attacking fits defend their contact depth, as control fits do.
    Lateral flow was unchanged and linemen were driven further (inside zone
    3 s: 3.15 yd).
  - The existing `RUN_CONTACT_TRACK`: no change.

  Next owner: zone reach footwork has to lead the race (blockers'
  `mirror` cap 2.2–2.7 yd/s is also below the NFL's 3.0 engaged speed), and
  steering must not become a lateral hold.

### `DL_ESCAPE` (kept, default-off, recommended candidate)

This is the defender's counterpart of the blocker's lost-depth anchor. A
first-level fit who feels himself driven back stops shoving square and works
off the block to his installed shoulder with the ordinary physical shed. Two
conditions trigger it: felt load toward his backfield above 0.25 body weight,
and backward speed above 0.15 yd/s. It uses only his own body and the shed's
existing timer. It frees almost nobody (1 shed in 517 triggers) and leaves
the weight dependence unchanged. What it changes is when defenders come off
blocks, and several independent measures move to the NFL:

| | Candidate | + `DL_ESCAPE` | NFL |
|---|---|---|---|
| Line makes first contact | 33.6% | 40.7% | 41.1% |
| Yards before contact median (mean) | 0.8 (1.18) | 0.5 (0.90) | 0.6 (1.17) |
| First block length, IZ / OZ (s) | 2.9 / 2.6 | 2.5 / 2.5 | 2.6 / 2.4 |
| Mean / median gain | 6.37 / 3.3 | 5.92 / 2.8 | 4.45 / 3.0 |
| 10+ / 40+ | 9.9 / 4.1% | 9.0 / 3.9% | 11.7 / 0.67% |

Transfer:
- Gun/pistol/I zone (1,800 runs): mean 5.93 → 5.28, 20+ 4.3 → 2.8%, 40+
  3.3 → 2.5%, line first contact 32 → 36%.
- Power/counter/duo/trap (1,600 runs): neutral (7.52 → 7.48). Those linemen
  are washed sideways, not driven straight back.
- With the cap: 10+ 24.8 → 22.8%, 40+ 3.7 → 3.75%.

Contract tests: `test/dl-escape.test.ts`.

### `LB_SHED` (kept, default-off, parked)

A second-level defender who reads run works off a block toward the runner at
once, instead of waiting for the runner within 3.5 yd. Alone it is null
(10+ 9.3%, 40+ 4.2%). With escape and cap, 40+ goes from 3.75% to 2.92%, but
linebackers passed while blocked stay at 57%. NFL is 40% in 10+ runs; sim
free-near linebackers trail the runner's flow by 1.9 yd (NFL 0.5;
`lbpass.py`). Linebackers decide to get off blocks but physically do not:
the same weight-decided contact as the line.

### Where this leaves the run defense

The tail needs two things together: a real last level (`DEEP_CAP`), and a box
that holds without it. The box needs, in order:
1. A lateral zone race (controller: reach footwork leads and does not follow
   the defender's achieved speed).
2. Contact outcomes that do not follow body weight (physics: the deep dive's
   leverage and eccentric work, unimported).
3. Defensive get-off measured against tracking (perception latency).

`DL_ESCAPE` is the one controller piece that moves NFL measures now.

## Reproduce

```sh
scripts/diag/open-field/run.sh lane RUN_LANE=1 CLIMB_EXIT=1     # traces, 4 shards, about 80 s
scripts/diag/open-field/run.sh capf RUN_LANE=1 CLIMB_EXIT=1 DEEP_CAP=1
mkdir -p out/open-field/all; for l in lane capf; do zcat out/open-field/$l-[0-3].jsonl.gz | gzip > out/open-field/all/$l.jsonl.gz; done
python3 -I scripts/diag/open-field/geometry.py out/mechanics/nfl-plays.jsonl.gz      # NFL, same operator
python3 -I scripts/diag/open-field/geometry.py out/open-field/all/lane.jsonl.gz --sim-trace
python3 -I scripts/diag/open-field/timing.py out/open-field/all/lane.jsonl.gz --sim-trace
python3 -I scripts/diag/open-field/summary.py 'out/open-field/lane-[0-3].jsonl.gz'      # holds, events
python3 -I scripts/diag/open-field/encounters.py 'out/open-field/lane-[0-3].jsonl.gz'   # first encounters
node --import tsx scripts/diag/open-field/space.ts --seeds 3                            # one-on-one drill, about 8 s
# Part 2 (PY = a python3; common.sh also writes a concept-tagged file for the trench timeline)
scripts/diag/open-field/run.sh esc RUN_LANE=1 CLIMB_EXIT=1 DL_ESCAPE=1 && scripts/diag/open-field/common.sh esc
python3 -I scripts/diag/open-field/firsttackler.py out/open-field/all/esc.jsonl.gz --sim-trace   # also on NFL without the flag
python3 -I scripts/diag/open-field/mech.py out/open-field/all/esc.jsonl.gz                      # shared run metrics beside NFL
python3 -I scripts/diag/trench/timeline.py out/mechanics/nfl-plays.jsonl.gz out/open-field/all/esc-common.jsonl.gz
python3 -I scripts/diag/open-field/getoff.py FILE [--sim-trace]; second.py, lbpass.py, trench.py likewise
```

`run.sh` sets a scratch Node path for this environment; elsewhere put Node 22
on `PATH`. NFL plays come from
`scripts/mechanics/nfl_bdb2025.py --plays-out out/mechanics/nfl-plays.jsonl.gz`.
No games were run. Total lab compute was about 12 trace runs of 80–90 s each.
