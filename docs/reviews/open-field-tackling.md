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
```

`run.sh` sets a scratch Node path for this environment; elsewhere put Node 22
on `PATH`. NFL plays come from
`scripts/mechanics/nfl_bdb2025.py --plays-out out/mechanics/nfl-plays.jsonl.gz`.
No games were run. Total lab compute was about 12 trace runs of 80–90 s each.
