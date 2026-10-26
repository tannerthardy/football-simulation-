# What turns a slow pursuer when his aim holds (TKL-2, Stage 4)

2026-10-26, develop `03ebfebe` with the speed-trend fix (this PR). Diagnosis
only. It follows [the aim-jump review](pursuit-aim-jump.md). Question: in the
re-steers where the command turns while the aim holds, what is the first
pipeline stage that turns him?

## Operators

- [`scan.ts`](../../scripts/diag/aim-jump/scan.ts) now records, every step:
  - each stage's requested velocity, in pipeline order (the chase's intercept
    sprint, approach-and-gather and around-bodies; the controller's raw
    command; each post-decision rewrite; the final command);
  - the nearest other offensive body.

  The sets are the aim-jump review's: 2 league games and the seed 7 and 8
  audit games, 4,026 defender restages. All matched their untraced plays.
- [`stages.py`](../../scripts/diag/aim-jump/stages.py) applies
  `pursuit_aim.py`'s sample filter and event:
  - **Filter:** no other offensive body within 1.0 yd, and not in the cone
    more than 135° behind the runner.
  - **Event:** a heading change over 15° in 0.2 s.

  It counts slow pursuers (under 0.8 of the runner's speed) at 6–15 yd. Commands
  lead the body, so it reads the last 0.45 s of steps. A stage is the command as
  it stands after that stage, so a rewrite that applies on and off counts as a
  turn.
- [`resteer_time.py`](../../scripts/diag/aim-jump/resteer_time.py) uses the same
  samples and event, split by time since the carrier got the ball. It ran on
  BDB2025 runs and on the matched restage (282 snaps × 4 RNG shifts).

## Result

867 slow-pursuer re-steers:

| Class | Count | Share |
| --- | --- | --- |
| Entering the chase: switched from coverage or rush within the last 0.45 s | 431 | 50% |
| The aim moved more than 15° | 318 | 37% |
| His body still turning toward a steady command | 83 | 10% |
| A layer after the aim turned him | 35 | 4% |

- **Entering the chase (431).** 307 switched within the last 0.2 s. The other
  124 switched 0.25–0.45 s ago: there the first stage to turn is the
  controller's raw command, because the chase had only just begun. All 124
  are that case.
- **Layers after the aim (35):**
  - around-bodies 13, mostly the detour switching on and off;
  - spacing 11;
  - engagement 7;
  - approach 4.

So the "command turns while the aim holds" class is almost entirely the entry
into the chase. Without the operator's filter it looked like
`PURSUE_AROUND`'s detour (216 of 540). Those samples are next to a blocker or
behind the runner, and the NFL operator excludes them. The detour does chatter
on and off, a step change of 30–60°, but that isn't part of the measured
excess.

**When it happens.** Runs only, same operator:

| Slow pursuers, runs, 6–15 yd | 0–0.5 s after the carrier crosses the line | 0.5–1 s | 1–2 s |
| --- | --- | --- | --- |
| NFL (38,926 samples) | 11.2% | 10.1% | 6.2% |
| develop | 18.0% | 18.6% | 15.1% |
| with the speed trend | 17.6% | 18.4% | 8.9% |

- The speed trend brings the settled chase close to NFL.
- What remains is the first second, when 27% of slow sim pursuers make a turn
  against NFL's 17%. Almost none turn twice: 1% at most in either.
- On catches the sim figure is 36%, but there's no NFL catch reference in
  this file.

## Named stage

**The switch into the chase.** The first stage that turns a slow pursuer whose
aim holds is the controller handing his command from coverage or rush to
`chase` in the first second after the ball. Too many slow pursuers are pointed
somewhere else when that happens: 27% vs 17% on runs.

## Next (not built)

The question is when and from where he enters, not how he chases:

- **Catches:** is the turn late because he reacts to the catch rather than the
  throw (COV-1, Coverage's Stage 5)?
- **Runs:** is the trigger in `run-fits.ts` (chase once the seen runner is 2
  yd past the line) late compared with when NFL pursuers start flowing?
- **NFL catch reference:** export BDB2025 passes in the common format, so
  catches can be compared too.

Separately, the `PURSUE_AROUND` detour switches its full tangent on and off.
That's a cleanup candidate, but it isn't part of the excess.

## Caveats

- Seed 7–8 snaps only. The time split has 1,724–1,797 sim samples per arm on
  runs.
- The restage predates the random-streams change, so these numbers move when
  it lands.
- Stage attribution is "first stage whose output turned". A later stage can
  add to the same turn.

## Chase entry on runs: is the run-fit trigger late?

**No.** The trigger (`run-fits.ts`: chase once the seen runner is 2 yd past
the line, or at the line when keyed) doesn't start pursuers late.
[`flow_onset.py`](../../scripts/diag/aim-jump/flow_onset.py) uses the same
code on NFL and sim designed runs (5,462 NFL; 401 sim, which is 101 snaps × 4
shifts). It measures where the runner is when each defender starts flowing at
him: moving faster than 2 yd/s within 45° of the bearing to the carrier, held
0.3 s.

| Carrier yards past the line, median (p25 / p75) | NFL | Sim (speed trend) |
| --- | --- | --- |
| LB flow onset | −2.9 (−4.7 / 1.1) | −3.0 (−4.4 / −0.2) |
| DB flow onset | −1.9 (−4.0 / 0.4) | −1.7 (−4.0 / 0.1) |
| LB first turn | −2.6 | −3.5 |
| DB first turn | −1.2 | −1.8 |

The excess is in how often slow pursuers turn, and it's largest while the
runner is still behind the line, before any chase:

| Slow 6–15 yd re-steer >15°, runs | Runner behind −2 | −2..0 | 0..2 | 2..4 | 4..6 |
| --- | --- | --- | --- | --- | --- |
| NFL | 7.0% | 11.2% | 12.0% | 10.5% | 9.6% |
| Sim, speed trend | 28.0% | 21.5% | 16.7% | 19.8% | 18.9% |

## What turns him before the chase: the coverage objective moves

[`fitstage.py`](../../scripts/diag/aim-jump/fitstage.py) applies the
operator's filter to designed runs only (`scan.ts … runs`; 1,892 defender
restages). It splits by phase:

- **Before the chase:** 728 re-steers in 2,209 windows, 30–42% depending on
  the runner's position.
- **In the chase:** 22–29%.

Before the chase, 85% of re-steers follow a command turn. The first change:

| What changed first | Count |
| --- | --- |
| The command's moving objective point moved more than 15° in bearing | 510 (70%) |
| Command steady, body still turning | 67 |
| The objective started, stopped or changed kind | 51 |
| Controller or job changed | 47 |
| Raw command turned with the objective steady | 46 |
| A rewrite (engagement, spacing) | 7 |

- **Whose objective it is.** Coverage controllers:
  - CoverageDefender zone 222, ZoneCoverage 106, ManCoverage 99;
  - CoverageDefender man 28;
  - PassRusher 43.

  By slot: LB 173, NB 111, CB 76. These defenders are still in their pass
  coverage controllers on a designed run.
- **How it moves.** The objective is a median 2.0 yd from him (p25 1.2, p75
  3.0) and updates almost every tick: by 0.21 yd at the median and 0.94 yd at
  p75, which swings its bearing by 21° per tick at p75. In about 60% of these
  windows, one step moves it more than 1 yd. A near target re-picked every
  tick turns small moves into large heading changes.

**Reproducer (Coverage's code):**
`cover_repro.ts s7-P110 LB_W 1.0 1.8`. The frozen setup is in `frozen.bin.gz`
and replays identically. Singleback Trips Toss vs 4-3 Over Cover 2 Match.
LB_W (`zone:hook_w`) with the runner 5–6 yd behind the line:

- His objective's y-coordinate goes 22.6 → 26.4 → 22.0 → none → 19.8 at about
  0.2 s intervals.
- His command reverses with it: −158° → 114° → −116°.
- His body ends up 170° from where it started.

## Dispositions

- **The run-fit chase trigger is not late.** No change to `run-fits.ts`.
- **Hand to Coverage:** on designed runs, zone and man coverage objectives near
  the defender flip-flop or jitter before the run read takes them out of
  coverage. That's the largest source of the slow re-steer excess on runs. It
  could also be the run read itself coming late for second-level zone players.
  That's Coverage's question to split.
- **Two body events, not commands:** `cover_repro.ts s8-P037 LB_M 1.8 2.5` and
  `s7-P063 SS 1.8 2.6`. The body heading jumps 70–83° in one tick with the
  command steady. It's rare (1% of pre-chase re-steers) and noted for Main
  Engine.
