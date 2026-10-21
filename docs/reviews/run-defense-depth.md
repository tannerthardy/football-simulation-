# Run defense depth and pursuit on the contact build (2026-10-21)

Branch `claude/zen-feynman-7712y8`, from `claude/run-game-v3@9932066`: accepted
develop `d91c9014` plus the [contact model](contact-model.md), which is on in
the pinned profile. The user's priority was "run defense depth and pursuit",
the first item of the realism review that followed #189.

Ownership split, agreed with the `claude/run-game-v3` session:
- This branch owns the defense side of the run game: `run-fits.ts`,
  `defense.ts`, pursuit, and the defender side of run reps.
- That session owns blocking, pullers, the mesh and the carrier.

Every change here is a default-off flag. With every flag off the engine is
the pinned profile. The lab baselines reproduce the contact review's `cmF*`
arms exactly: TVD zone 13.6, gap 14.0, shotgun 10.2.

## Question and answer

**Question.** Long runs are 5–8% of lab runs (NFL 0.8–2.0%). On the plays that
break the first level, nobody is behind the play and nobody arrives. Does
holding the deep defender deep (`DEEP_CAP`) fix this on the contact build?
What else must change for it to help?

**Answer.**

1. **`DEEP_CAP` alone makes every set worse.** TVD goes zone 13.6 → 22.4,
   gap 14.0 → 26.2, shotgun 10.2 → 17.4.
   - It keeps the safety deep, but the 5–9 yd runs he used to stop become
     10–19 yd runs, and 40+ runs do not fall.
   - In the sim the deep man is the nearest defender at the end of 61% of
     5–9 yd zone runs. In the NFL he is nearest at 15%, and linebackers and
     linemen at 58%.
   - The box has to make those stops before the cap can stay deep.
2. **`DEEP_CAP` had a hole at the mesh.** Before the cap saw the handoff, his
   fit fell through to the alley landmark (5–8 yd), so he walked down. Once he
   saw the handoff, he back-pedalled to his alignment depth.
   - Two-high safeties went 12 → 10.7 → 11.4 yd.
   - At the crossing they were moving −1.8 yd/s downhill; the NFL playside
     safety moves +2.8.
   - The new flag `CAP_MESH` holds the cap's depth through the mesh.
3. **With the front-seven pursuit flags, the cap works on ace zone.** Package:
   `DEEP_CAP CAP_MESH LB_DEPTH EDGE_SQUEEZE SHED_PURSUE BLOCK_FRONT`.
   - 40+ runs 6.6 → 2.1% (79 → 25 of 1,200, p < 0.001; NFL 0.8%).
   - Negatives 15.3 → 9.8% (NFL 7.6). TVD 13.6 → 9.7.
   - Past +10, survival is now NFL-like (10→15 0.45, 15→20 0.56, 20→30 0.56;
     NFL 0.48 / 0.48 / 0.53).
   - The cost is 10–19 yd runs at 13.8% (NFL 8.6): 5→10 survival is 0.44
     (NFL 0.34).
4. **Gap and shotgun are limited by the front, not by depth.** (Section
   `SHED_HANDS` below changes this.) The package
   cuts the gap tail (40+ 7.8 → 5.7%, p = 0.01) but piles runs into 10–19
   (25.6%, NFL 11.3). Shotgun gets worse (TVD 10.2 → 12.4). The missing
   tacklers are the front:
   - **Linemen near the hole do not get to the runner.** A free DL within 3 yd
     at the crossing reaches him 23–28% of the time (NFL 65%). He asks for
     8.1 yd/s and moves at 1.9, facing 60° away. That is the body's start-up
     and turn law. Handed to physics.
   - **Gap linebackers flow late or the wrong way** (−0.8 to +0.2 yd at 2.5 s;
     NFL +2.5 playside, +4.6 backside). They read the pull, but the puller
     leaves 0.4–0.5 s later than an NFL puller (1 yd lateral at 1.1 s vs 0.7).
     Handed to the offense session.
5. **Linemen could not get off run blocks; `SHED_HANDS` lets one who has won
   the hands do so.** In the lab no DL run rep ever ended in a shed, and
   linemen took 15–21% of run tackle credit (NFL 34%). With `SHED_HANDS` the
   package is closer to NFL than the contact build on all three sets (TVD
   zone 13.6 → 10.1, gap 14.0 → 13.3, shotgun 10.2 → 8.4; 40+ 6.6 / 7.8 / 5.0
   → 1.6 / 3.7 / 2.5%). It adds stretch losses, which trace to linemen
   getting under reach blocks (offense's reach law), not the shed or the
   back's path.

## Where the contact build stands (baseline, pinned profile)

Same operators on NFL60 and on the zone lab (`p0co`):

| | NFL | Sim |
|---|---|---|
| Deepest defender when the runner crosses (`dbdepth.py`) | 13.8 yd | 7.0 |
| Defenders ahead of the runner when he reaches +10, p50 | 3 | 0 |
| Defenders who can still cut him off from +10 on 40+ runs (`angles.py`) | 1.94 | 0.16 |
| 5–9 yd runs: deep DB nearest at the end (`stopper.py`) | 15% | 61% |
| 5–9 yd runs: linebacker / lineman nearest | 38% / 20% | 20% / 2% |
| DL tied up at the crossing → 1 s later (`release.py`) | 76 → 57% | 89 → 91% |
| Free linebackers closing on the runner 0.5 s after the crossing | +0.83 yd/s | −0.46 |

## `DEEP_CAP` alone

| Arm | <0 | 0–3 | 4–9 | 10–19 | 20–39 | 40+ | TVD |
|---|---|---|---|---|---|---|---|
| NFL60 zone | 7.6 | 44.7 | 36.8 | 8.6 | 1.5 | 0.8 | |
| Zone baseline `p0co` | 15.3 | 40.7 | 30.9 | 5.0 | 1.5 | 6.6 | 13.6 |
| Zone `DEEP_CAP` `dcco` | 14.9 | 36.4 | 22.8 | 16.5 | 2.6 | 6.8 | 22.4 |
| NFL60 gap | 7.4 | 36.8 | 39.2 | 11.3 | 3.3 | 2.0 | |
| Gap baseline `p0gap` | 5.9 | 31.5 | 47.4 | 6.3 | 1.1 | 7.8 | 14.0 |
| Gap `DEEP_CAP` `dcgap` | 6.1 | 24.8 | 26.8 | 28.2 | 2.9 | 11.2 | 26.2 |

The safety now holds depth (11.6 yd at the crossing). With nobody else
stopping runs at 5–9 yd, those runs continue to the safety at about 10 yd
(10+ runs 157 → 311 of 1,200, p < 0.001). 40+ runs do not move (79 → 82).

## The mesh hole (`CAP_MESH`)

`executeRunFit` skipped `capFit` while the fit was "premesh", meaning the
handoff was not yet seen. Premesh, the cap took the old alley branch, which
tracks to `clamp(0.65·depth, 5, 8)` yd at 65% speed. So under `DEEP_CAP`,
every deep defender walked down during the exchange and back up afterwards:

| Two-high safeties (`sides.py`) | Snap | Handoff + 0.5 s | Crossing | Downhill at crossing |
|---|---|---|---|---|
| NFL playside / backside | 11.9 / 11.9 | 12.6 / 13.2 | 10.4 / 12.2 | +2.8 / +1.2 yd/s |
| `DEEP_CAP` | 12 / 12 | 9.6 / 11.3 | 10.9 / 11.6 | −1.8 / 0.0 |
| `DEEP_CAP CAP_MESH` | 12 / 12 | 12 / 12 | 12.0 / 12.0 | +0.2 / +0.2 |

`CAP_MESH` runs `capFit` through the mesh too. There, the expected back is
the picture he mirrors, and a back past the line without the ball is never
chased (`test/deep-cap.test.ts`).

## Zone: the cap with front-seven pursuit

Pursuit flags from the run-game-v3 research, all default off. They are
unchanged here except for the new contract test for `BLOCK_FRONT`.
- `LB_DEPTH`: stack backers read at depth.
- `EDGE_SQUEEZE`: an edge fit with the runner inside him pursues.
- `SHED_PURSUE`: a blocked defender works off toward a runner past the line,
  and is not re-latched at once.
- `BLOCK_FRONT`: no run block taken on the back.

| Zone arm | <0 | 0–3 | 4–9 | 10–19 | 20–39 | 40+ | TVD |
|---|---|---|---|---|---|---|---|
| Pursuit flags, no cap (`npco`) | 10.0 | 41.5 | 39.0 | 3.7 | 0.8 | 5.1 | 8.9 |
| + `DEEP_CAP` (`dpco`) | 9.8 | 39.2 | 31.6 | 13.1 | 2.1 | 4.2 | 10.8 |
| + `DEEP_CAP CAP_MESH` (`dqco`) | 9.8 | 38.8 | 33.0 | 13.8 | 2.5 | **2.1** | 9.7 |

Paired, same 1,200 cases:

| | 40+ | 20+ | 10+ | <0 |
|---|---|---|---|---|
| Baseline → `dqco` | 79 → 25 (p < 0.001) | 97 → 55 | 157 → 220 (p < 0.001) | 184 → 118 (p < 0.001) |
| `npco` → `dqco` | 61 → 25 (p < 0.001) | 70 → 55 (p = 0.12) | 114 → 220 (p < 0.001) | 120 → 118 |
| `dpco` → `dqco` (`CAP_MESH` alone) | 51 → 25 (p < 0.001) | 76 → 55 (p = 0.024) | 233 → 220 (p = 0.22) | 118 → 118 |

What moved (`dqco` vs baseline; NFL in brackets):
- Deepest defender at the crossing 7.0 → 13 yd (13.8). On 40+ runs the
  defenders who can still cut the runner off go 0.16 → 0.80 per run (1.94).
- Free linebackers close at +0.60 yd/s (+0.83). The deep DB is nearest at the
  end of 10% of 5–9 yd runs (15%).
- Survival past +10 is NFL-like:

  | | 5→10 | 10→15 | 15→20 | 20→30 | 30→40 |
  |---|---|---|---|---|---|
  | NFL | 0.34 | 0.48 | 0.48 | 0.53 | 0.74 |
  | Baseline | 0.38 | 0.72 | 0.86 | 0.88 | 0.93 |
  | `dqco` | 0.44 | 0.45 | 0.56 | 0.56 | 0.81 |

The deep man is still more involved than the NFL's (`deepfit.py`):

| | NFL | `dqco` |
|---|---|---|
| Speed 0.5 / 1.0 / 1.5 s after the crossing | 4.7 / 4.7 / 4.1 yd/s | 4.8 / 6.0 / 6.3 |
| Meets the runner on 4–9 yd runs | 12% | 25% |
| Meets him on 10–19 yd runs, at | 52%, x 10.6 | 93%, x 9.1 |

## Gap and shotgun: the front limits the cap

| Arm | <0 | 0–3 | 4–9 | 10–19 | 20–39 | 40+ | TVD |
|---|---|---|---|---|---|---|---|
| Gap pursuit flags, no cap (`npgap`) | 5.1 | 31.6 | 51.3 | 4.8 | 1.2 | 6.1 | 16.2 |
| Gap `dqgap` | 4.9 | 24.8 | 36.9 | 25.6 | 2.1 | 5.7 | 18.0 |
| Gap `dqgap` + `PULL_FLOW` (`pfgap`) | 4.7 | 24.8 | 38.6 | 24.6 | 1.9 | 5.5 | 16.8 |
| NFL60 zone (for shotgun) | 7.6 | 44.7 | 36.8 | 8.6 | 1.5 | 0.8 | |
| Shotgun baseline `p0gun` | 9.2 | 49.0 | 29.3 | 5.8 | 1.7 | 5.0 | 10.2 |
| Shotgun `dqgun` | 7.8 | 36.3 | 32.8 | 15.0 | 3.5 | 4.5 | 12.4 |

- **Gap:** `CAP_MESH` again cuts the tail (vs `dpgap`: 40+ 114 → 91, p = 0.021;
  20+ 156 → 124, p = 0.007), but 10–19 runs are 25%.
- **Shotgun:** the tail does not move (40+ 30 → 27 of 600). On 40+ runs 1.59
  defenders per run can still cut the runner off (NFL 1.94), and 63% get
  within 1.5 yd (NFL 70%). The rest of that tail is the tackle at about
  8.5 yd/s, not depth.

### Who is missing: the front

At the crossing, every DL within 3 yd of the runner (`nearreach.py`). "Reach"
means he gets within 1.2 yd of the runner in the next second:

| | Free DL per run, reach | Blocked DL per run, reach |
|---|---|---|
| NFL | 0.24, 65% | 1.35, 53% |
| Zone `dqco` | 0.13, 28% | 1.07, 26% |
| Gap `dqgap` | 0.07, 23% | 0.65, 14% |

- NFL linemen make 42% of the stops on 0–3 yd runs and 20% on 5–9 yd runs
  (nearest defender at the end, `stopper.py`). Sim linemen make 17–21% (zone)
  and 10% (gap) of the short stops, and 2–5% of the 5–9 yd stops.
- Free DL half a second after the crossing ask for 8.1 yd/s, within 18° of
  the runner, and move at 1.9 yd/s, facing 62° away from him
  (`stretch/dlpursuit.ts`). That is the start-up and turn law, not the
  request.
- The physics flag `GAIT_STEP=0.5` (faster approach to the requested speed)
  is context only, not proposed. On top of the package (`gq*`):

  | | Zone | Gap | Shotgun |
  |---|---|---|---|
  | TVD: baseline → package → package + `GAIT_STEP` | 13.6 → 9.7 → 8.3 | 14.0 → 18.0 → 10.5 | 10.2 → 12.4 → 9.2 |
  | 10–19 yd runs (NFL 8.6 / 11.3 / 8.6) | 13.8 → 8.8% | 25.6 → 19.8% | 15.0 → 11.5% |
  | 40+ | 2.1 → 2.4% | 5.7 → 3.9% | 4.5 → 4.0% |
  | Negatives (NFL 7.6 / 7.4 / 7.6) | 9.8 → 14.1% | 4.9 → 6.8% | 7.8 → 9.8% |

  With a faster start-up the package beats baseline on all three sets, and
  free-DL reach on zone goes 28 → 40%. But zone negatives rise (the known
  stretch-penetration side effect), and the flag is not a better fit of the
  NFL acceleration envelope (run-game-v3 Part 12). The physics owner needs a
  start-up law, not this flag.

### Gap linebackers and the late pull

On gap runs the second level flows the wrong way (`lbdepth.py`, lateral yards
toward the play side):

| | 1.0 s | 1.5 s | 2.0 s | 2.5 s |
|---|---|---|---|---|
| NFL playside / backside | 0.3 / 0.7 | 1.0 / 1.9 | 1.8 / 3.3 | 2.5 / 4.6 |
| `dqgap` playside / backside | −0.2 / −0.1 | −0.5 / −0.3 | −0.3 / −0.7 | 0.2 / −0.8 |

Traced on power (`depth/lbtrace.ts`):
- The backer's landmark first drifts backside with the down-blocking gap.
- He reads the puller at 1.25–1.5 s, then flows at 1.5–2.2 yd/s (NFL backers
  flow with the pull at 1.75–2.0).
- The read is late because the pull is late (`depth/pulltime.py`):

  | Playside puller lateral | 1 yd | 2 yd | 3 yd |
  |---|---|---|---|
  | NFL | 0.7 s | 1.0 s | 1.3 s, at 4.0 yd/s |
  | Sim | 1.1 s | 1.5 s | 1.8 s, at 3.25 yd/s |

`PULL_FLOW` removes the scrape against a read pull (a small gain: 10+ runs
534 → 511, p = 0.022). The puller's timing belongs to the offense session and
was sent to it with the reproduction commands.

### Linebacker read depth (`LB_READ_STEP`)

Eager & Seth (JQAS 2023, [doi:10.1515/jqas-2022-0091](https://doi.org/10.1515/jqas-2022-0091);
bite distance introduced in their 2022 Sloan review) measure linebacker
"bite": how far off-ball backers move toward the line. They find it is a
stable trait that trades run aggressiveness against play-action. The same
measure on the 2022 tracking (`depth/bite.py`), median yards toward the line:

| | 1.0 s | 1.5 s | 2.0 s (IQR) |
|---|---|---|---|
| NFL runs | 0.6 | 1.4 | 1.9 (1.0–2.8) |
| NFL play-action | 0.5 | 0.9 | 0.8 (−0.4–2.2) |
| NFL other dropbacks | 0.0 | −0.3 | −0.7 |
| Sim, no `LB_DEPTH` | 0.7 | 1.7 | 2.4 (1.6–2.9) |
| Sim, `LB_DEPTH` | 0.4 | 0.9 | 1.2 (1.0–1.5) |
| Sim, `LB_DEPTH LB_READ_STEP` | 0.5 | 1.4 | 1.9 (1.6–2.2) |

`LB_READ_STEP` reads two steps inside the alignment instead of one. That
matches the NFL median, but zone outcomes get worse (`rsco`): 40+ 25 → 43
(p = 0.018), TVD 9.7 → 12.0.
- Backers that low meet climbing blockers as often as NFL ones (within 1.5 yd
  of an OL at 2.0 s: 56%, NFL 57%).
- They do not come off them: tied up 1 s after the crossing 57% (NFL 49%);
  free backers close at −0.02 yd/s (NFL +0.83).
- `LB_DEPTH`'s extra depth is compensating for the release and start-up gap.
  `LB_READ_STEP` stays off until that is fixed. The sim's bite is also far
  more uniform than the NFL's (IQR 0.5 vs 1.8 yd). Per-player variation is a
  candidate for later, with play-action in the game sim as its control.

### Which pursuit flags carry the result (leave-one-out from `dq`)

| Dropped | Zone TVD | Zone 40+ (paired vs `dqco`) | Zone negatives | Gap 10+ (vs `dqgap`) |
|---|---|---|---|---|
| none (`dq`) | 9.7 | 25 | 118 | 534 |
| `LB_DEPTH` | 17.6 | 49 (p = 0.004) | 168 (p < 0.001) | 607 (p = 0.001) |
| `EDGE_SQUEEZE` | 11.0 | 26 | 118 | |
| `BLOCK_FRONT` | 10.1 | 32 (p = 0.32) | 119 | |
| `SHED_PURSUE` | 8.4 | 25 | 118 | 536 |

- `LB_DEPTH` carries the package.
- `EDGE_SQUEEZE` and `BLOCK_FRONT` help a little.
- `SHED_PURSUE` is inert. It only changes when a blocked defender *tries*
  to get off, and no physical attempt ever succeeded (next section).

## Linemen who win the hands get off the block (`SHED_HANDS`)

**Finding.** In the zone lab no defensive lineman's run rep ended in a shed
(`depth/freedl.ts`, `depth/simtacklers.ts`).
- DL rep endings on the depth package, 240 plays: runner passed defender 875,
  separation 146, leverage 37, body down 24, shed 0.
- Under `SHED_PHYSICAL` the only physical exits are leverage (getting behind
  the blocker's shoulders) or separation past arm's length. The blocker's
  mirror and turn rate (7–10 rad/s) deny both, so a rep lasts until the
  runner is 2.5 yd past the lineman.
- Yet on DL shed attempts the defender held the hands (`control < 0`, his hands
  inside on the blocker) on 31% of ticks, in 41% of reps. On 29% of shed ticks
  the runner was within 2.5 yd.

**Who makes the tackle on runs**, by tackle credit (solo 1, assist ½, shared
on the play). NFL is BDB2025 `player_play.csv` on designed runs with 60+ yd
to go (`depth/tacklers.py`); the sim is the lab's whistle tackler and assists
(`depth/simtacklers.ts`):

| | DL | LB | DB |
|---|---|---|---|
| NFL | 34% | 36% | 30% |
| Pinned profile | 21% | 32% | 48% |
| Depth package `dq` | 15% | 37% | 47% |
| `dq` + `SHED_HANDS` | 26% | 35% | 38% |

**Change.** `SHED_HANDS` (default off): a defender in a run-shed attempt who
controls the hands sheds, through the existing `tryHold`/`beat(…, 'shed')`
path. The blocker is thrown aside and cannot re-grab for 0.6 s; the bodies
still collide in the World. A blocker who controls the hands keeps his man
(`test/shed-hands.test.ts`). The attempt gate is unchanged: the runner
threatens his area, or, with `SHED_PURSUE`, is past the line. Linebackers
use the same run-rep code.

| Set | Arm | <0 | 0–3 | 4–9 | 10–19 | 20–39 | 40+ | TVD |
|---|---|---|---|---|---|---|---|---|
| Zone | pinned + `SHED_HANDS` (`s0co`) | 15.9 | 44.7 | 28.2 | 4.9 | 1.3 | 5.0 | 12.6 |
| Zone | `dq` + `SHED_HANDS` (`shco`) | 12.7 | 40.0 | 31.8 | 12.8 | 1.2 | 1.6 | 10.1 |
| Gap | `pf` + `SHED_HANDS` (`shgap`) | 5.4 | 27.8 | 38.5 | 22.9 | 1.8 | 3.7 | 13.3 |
| Shotgun | `dq` + `SHED_HANDS` (`shgun`) | 10.0 | 38.3 | 34.8 | 10.8 | 3.5 | 2.5 | 8.4 |

Paired:
- **Zone `dqco → shco`:** 20+ 55 → 33 (p = 0.005), 10+ 220 → 187 (p =
  0.005), 40+ 25 → 19, negatives 118 → 152 (p < 0.001).
- **Gap `pfgap → shgap`:** 40+ 88 → 59 (p = 0.001), 20+ 118 → 87 (p = 0.003),
  10+ 511 → 454, negatives 75 → 86 (n.s.).
- **Shotgun `dqgun → shgun`:** 40+ 27 → 15 (p = 0.036), 10+ 138 → 101
  (p < 0.001), negatives 47 → 60 (p = 0.07).
- **Pinned profile, `SHED_HANDS` alone (`p0co → s0co`):** 40+ 79 → 60,
  20+ 97 → 76 (both p ≈ 0.05), negatives 184 → 191 (n.s.).

The package with `SHED_HANDS` is closer to NFL than the contact build on all
three sets: TVD zone 13.6 → 10.1, gap 14.0 → 13.3, shotgun 10.2 → 8.4.

Mechanisms on zone (`shco` vs `dqco`; NFL in brackets):
- Free DL near the hole reach the runner 28 → 54% (65%).
- Free DL speed 0.5 s after the crossing 2.1 → 3.25 yd/s (3.64).
- Free linebackers close at +0.84 yd/s (+0.83).
- DL nearest at the end of 0–3 yd runs 21 → 29% (42%).

**Where it is too strong: stretch losses.** The added zone negatives are all
outside and wide zone. Inside zone is unchanged:

| | Inside zone | Outside zone | Wide zone |
|---|---|---|---|
| NFL negatives (60+ yd to go) | 4.9% | 9.5% | (in OZ) |
| Pinned profile | 4.5% | 19.8% | 21.8% |
| `dq` | 3.8% | 10.8% | 15.0% |
| `dq` + `SHED_HANDS` | 3.5% | 14.5% | 20.0% |

The stretch back is shallow and slow (`depth/stretchpace.py`):
- At handoff + 0.5 s the NFL outside-zone back is 3.3 yd deep moving 4.5 yd/s
  toward the play side. The sim back is 2.2 yd deep at 2.75 yd/s, and crosses
  0.3 s sooner.
- On stretch losses the first defender is a DL 84% of the time (NFL 48%).

But the path is not the cause of the extra losses; the next subsection
tests that and finds the reach block instead.

### What did not fix the stretch losses

- **The offense session's mesh package** (`UC_MESH MESH_TEMPO QB_CARRYOUT
  PACE_LEAD`, existing default-off flags) moves the stretch back toward the
  NFL path (handoff + 0.5 s: 2.6 yd deep at 3.5 yd/s, NFL 3.3 / 4.5). But
  stretch losses rise further, with or without `SHED_HANDS`:

  | | OZ | WZ |
  |---|---|---|
  | `dq` | 10.8% | 15.0% |
  | + mesh (`mqco`) | 18.8% | 23.8% |
  | + `SHED_HANDS` (`shco`) | 14.5% | 20.0% |
  | + both (`mhco`) | 20.0% | 29.2% |

  So the back's path is not the cause; a deeper back only gives a lineman
  who got under the reach more time.
- **DL hand control is the same on stretch as on inside zone.** The defender
  controls the hands at some point in 47–53% of DL reps, 36–39% of rep time,
  on iz/oz/wz alike.
- So the stretch losses come from linemen getting into the backfield under the
  reach (NFL outside-zone DL are driven back about 1 yd by 3 s; ours
  penetrate). That is the reach-block law, the offense session's (correction
  sent).
- **`SHED_CLEAN`** (tried and removed): shed only once the blocker's hands
  are fully off (`control < -0.4`, the line `tryHold` uses for "no hands on
  him"). Sheds 402 → 132 per 240 plays; DL tackle credit 26 → 19% (NFL 34%).
  Too weak: the plain `SHED_HANDS` matches the NFL tackle split better.
- **`LB_READ_STEP` with `SHED_HANDS`** (`rhco`) is still worse than without
  it: 20+ runs 33 → 53 (p = 0.019), negatives 152 → 177, TVD 10.1 → 13.1.
  Backers at NFL depth are tied up at the NFL rate at the crossing (61% vs
  62%), but freed backers do not close (+0.11 yd/s vs +0.83). It stays off.

## Evidence against and unresolved risk

- **10–19 yd runs overshoot whenever the cap holds** (zone 13.8%, gap 25%,
  shotgun 15%; NFL 8.6 / 11.3 / 8.6). The cap is right and the box is short.
  The package trades a TD-producing tail for medium gains. That is closer to
  NFL scoring, but not closer in every band.
- **Shotgun is worse with the package** (TVD 10.2 → 12.4) and its tail does
  not move. Shotgun long runs come from Cover 1 outside/wide zone, where the
  runner bounces past the man defenders and the cap meets him from behind at
  about 8.5 yd/s.
- **The cap still tackles more than the NFL's** (meets 4–9 yd runs 25% vs 12%)
  and closes faster after the crossing (6 vs 4.7 yd/s). Making him approach
  under control would match the NFL motion and lengthen runs until the box
  improves. Not attempted.
- **Two-high playside safety.** NFL playside safeties come down to 10.4 yd
  by the crossing at 2.8 yd/s; the cap holds 12 at 0.2. Not modelled: both
  two-high safeties get the same cap.
- **Not run:** 8-game `mech:sim` and `test:integration`. The integration owner
  checks any combined candidate.
- **Provenance:** a few arms launched with a behaviour-neutral working
  patch; their manifests record it (`dirty`). Flag-off identity holds: the
  pinned-profile arms reproduce `cmF*` exactly, and every new flag is
  default-off.

## Handoffs

| To | What | Evidence |
|---|---|---|
| Physics (gait) | Free defenders near the hole: request 8.1 yd/s within 18° of the runner, achieve 1.8, facing 62° away. Free DL within 3 yd of the runner reach him 23–28% (NFL 65%). | `run-defense-depth/dlpursuit.txt`, `nearreach.py` rows in `mechanisms.txt`. `GAIT_STEP=0.5` context arms `gq*`. |
| Offense (`claude/run-game-v3`, sent) | Gap pullers leave 0.4–0.5 s late (1 yd lateral at 1.1 s vs 0.7; 3.25 vs 4.0 yd/s). Linebackers read the pull, so their flow inherits the delay. | `depth/pulltime.py`, `lbdepth.py gap_pull` |
| Offense (reach blocking, sent) | Stretch losses: OZ/WZ 10.8/15.0% on the depth package (NFL OZ 9.5%), 14.5/20.0% with `SHED_HANDS`, higher with the mesh package. DL hand control is the same as on inside zone; linemen get under the reach into the backfield (NFL OZ DL are driven back about 1 yd by 3 s). | `depth/stretchpace.py`, `mqco`/`mhco` arms |
| Contact (tackling) | The cap's first encounter on 20+ yd zone runs: side wraps on a 7.8 yd/s runner that break (37%) or drag; shotgun the same at 8.5 yd/s from behind. | `depth/capmeet.py` |
| Engaged release (defender side of run reps, this branch) | Defenders stay near blockers after the runner passes: DL 74–80% within 1.2 yd of an offensive player at +1 s (NFL 57%). But with `SHED_PURSUE`, DL still in a rep 0.5 s after the crossing are 79 → 56%, below the NFL's proximity rate (66%). The excess is freed linemen who cannot accelerate away, i.e. the start-up row above. | `release.py` rows in `mechanisms.txt`; `dlpursuit.txt` |

## Next

1. **Release after the runner passes** (this branch, defender side of run
   reps). The decision side is in place (`SHED_PURSUE`). What remains is
   mostly start-up (physics), so the next defense-side step waits on it,
   apart from the 56% still in a rep, which can be split by why the rep
   continues.
2. Re-measure the package once the puller timing (offense) or start-up
   (physics) changes. `LB_READ_STEP` (NFL bite) is the first thing to re-test
   then.
3. Per-player linebacker aggressiveness (bite as a trait, per Eager & Seth),
   validated against play-action in the game sim, not the run lab.

## Reproduce

```sh
# NFL reference (raw data per data/README.md; 1.2 GB archive)
python3 -I scripts/data/fetch_nfl_data.py bdb2025-2022
python3 -I scripts/mechanics/nfl_bdb2025.py --plays-out out/mechanics/nfl-plays.jsonl.gz --out out/mechanics/nfl-bdb2022.json
python3 -I scripts/mechanics/nfl_ytg.py
# arms (Node 22.23.3), e.g. the zone package and its gap/shotgun sets
P="DEEP_CAP=1 CAP_MESH=1 LB_DEPTH=1 EDGE_SQUEEZE=1 SHED_PURSUE=1 BLOCK_FRONT=1"
node scripts/diag/open-field/arm.mjs dqco $P
node scripts/diag/open-field/arm.mjs dqgap $P -- --formations i_pro_21,ace_12 --concepts power,counter,duo,trap --seeds 77,71001,1,2,3
node scripts/diag/open-field/arm.mjs dqgun $P -- --formations gun_doubles_11 --concepts iz,oz,wz --seeds 77,71001,1,2,3
for l in dqco dqgap dqgun; do bash scripts/diag/open-field/common.sh $l; done
# scoring
python3 scripts/diag/stretch/bands.py zone p0co dqco; python3 scripts/diag/stretch/paired.py p0co dqco
bash scripts/diag/depth/card.sh zone p0co dqco
python3 scripts/diag/depth/sides.py out/open-field/all/dqco.jsonl.gz --shell 2
python3 scripts/diag/depth/bite.py out/mechanics/nfl-plays.jsonl.gz --ytg60
python3 scripts/diag/depth/pulltime.py out/open-field/all/dqgap-common.jsonl.gz
node scripts/baseline.mjs --candidate --flag DEEP_CAP=1 -- node --import tsx scripts/diag/stretch/dlpursuit.ts
```

Receipts: [`run-defense-depth/`](run-defense-depth/): `outcomes.txt` (bands,
survival, paired tests), `mechanisms.txt` (NFL vs arms), `dlpursuit.txt`,
and every arm's manifest. Tests: `test/deep-cap.test.ts` (`CAP_MESH`),
`test/run-defense-depth.test.ts` (`PULL_FLOW`, `LB_READ_STEP`) and
`test/block-front.test.ts`. All 2,870 core tests pass on the pinned profile,
and typecheck passes.

## Method

- **Lab arms** run through `scripts/diag/open-field/arm.mjs`: the pinned
  profile plus the listed flags. Manifests are in
  [receipts](run-defense-depth/). Same cases and seeds in every arm.
  - Ace zone: `ace_12` iz/oz/wz, 10 looks, 2 rosters, 10 seeds (1,200 plays).
  - Gap: `i_pro_21`/`ace_12` power/counter/duo/trap, 5 seeds (1,600).
  - Shotgun zone: `gun_doubles_11`, 5 seeds (600).
  - Paired McNemar tests per threshold: `scripts/diag/stretch/paired.py`.
- **NFL reference:** 2022 Big Data Bowl tracking (5,462 runs), converted by
  `scripts/mechanics/nfl_bdb2025.py --plays-out`.
  - "NFL60" means runs with 60+ yd to the goal. The filter comes from the new
    `scripts/mechanics/nfl_ytg.py`: every tail operator reads its output, but
    nothing in the repo produced it.
  - The conversion reproduces the committed NFL60 bands exactly.
- **Operators:** the existing stretch/open-field tools, plus new tools in
  `scripts/diag/depth/`. Where both apply, NFL and sim go through the same
  operator.
