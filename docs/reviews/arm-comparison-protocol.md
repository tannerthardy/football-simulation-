# Comparing game-level arms: how many games, and when pairing works

Measured 2026-10-22 with `scripts/diag/arm-power.py` on run-game-v3 exports
(candidate profile, seeds 301–316). The question: how many games does a
pressure or yardage difference between two arms need? Can paired designs
(same seed, compare play by play) do better?

```sh
python3 -I scripts/diag/arm-power.py noise SIM.jsonl.gz [...]     # game-to-game noise, games needed
python3 -I scripts/diag/arm-power.py pair ARM_A.jsonl.gz ARM_B.jsonl.gz   # where same-seed games diverge
```

## Game-to-game noise

Each row is per arm. Games needed assume two independent arms, two-sided
5%, 80% power, with the measured design effect: the game-to-game variance
over what independent plays would give.

| Measure (per game) | Plays per game | Design effect | 95% ± on a difference, 4 / 8 / 16 games per arm | Games per arm to detect |
|---|---:|---:|---|---|
| Pressure rate, dropbacks without PA (about 0.25–0.35) | 53–62 | 1.0–1.8 | ±8–11 / ±6–8 / ±4–6 points | 3 pts: 61–115; 5 pts: 22–42; 10 pts: 6–11 |
| Run yards per carry (about 7.9) | 55 | 1.4 | ±3.0 / ±2.1 / ±1.5 yd | 0.5 yd: about 300; 1.0 yd: about 76 |
| Runs reaching 20 yd (about 7%) | 55 | 1.2 | ±5 / ±4 / ±3 points | 2 pts: about 54; 4 pts: about 14 |

The design-effect range comes from two samples: 16 games at `e9eb6ac1`
(1.8) and 8 games at `c735a6dd` (1.0, too few games to estimate well).

**What this means.**
- **A 4-game arm cannot resolve pressure differences under about 10
  points.** The run-offense session's "32.8 → 26.2%" and its 24–34% spread
  across unrelated runs are within that noise.
- **Yards per carry is hopeless at game scale.** Each play's SD is about
  14 yd because of the long-run tail. Use band shares instead (losses,
  10+, 20+), or the lab.
- **Games should answer interaction questions with a budgeted sample** (per
  [testing costs](../TESTING_COSTS.md)), not decide a mechanism change by a
  rate.

## Pairing the same seeds across arms

The engine is deterministic. Two arms on the same seed record identical
plays, position for position, until the first play the change affects.
After that play the game state and the random stream differ, so every later
play is unpaired.

| Arms compared | Plays identical before the first difference |
|---|---|
| `547af69d` vs. `e9eb6ac1` (5 commits; the first difference is always a run) | median 39 per game (35% of plays) |
| `e9eb6ac1` vs. `c735a6dd` (pass-protection flags on) | 0–1 per game (the first or second play differs) |

**Consequences.**
- **A game gives exactly one informative matched pair:** the first play
  that differs. The identical prefix has zero difference and carries no
  information about the change. The rest is unpaired.
- **So same-seed games are not a variance-reduction design for rates.**
  They are a good mechanism witness: the first differing play of each seed
  is the change's first effect in an ordinary game, with the same bodies,
  situation and draws. That is the "first relevant divergence" the
  [behavior review](../BEHAVIOR_REVIEW.md) asks for. `pair` lists it for
  every seed.
- **Snap-level pairing already exists in the lab.**
  `scripts/diag/zone-lab/lab.ts` and `open-field/trace.ts` seed each case
  independently (concept × direction × look × roster × seed × formation;
  `caseId`). The same case is the same snap in both arms, whatever else
  changed.
  - Compare arms case by case: the share of cases whose outcome changes,
    and the paired difference over them.
  - Cases the change does not touch contribute an exact zero, so the noise
    comes only from the affected snaps.

## Suggested protocol for the shared-build phase

1. **Mechanism:** paired lab cases on the relevant looks and seeds. Report
   how many cases changed and the paired difference among them, and look
   at the first changed cases.
2. **Ordinary-game witness:** run `arm-power.py pair` on 4–8 same-seed
   games. Inspect each seed's first differing play: is it the intended
   mechanism?
3. **Game rates, only for an interaction question:** use independent arms
   sized from the table above. For example, about 40 games per arm for a
   5-point pressure difference. Or report the confidence interval for the
   games run, rather than a point change. Reuse the baseline arm across
   candidates when the profile is unchanged.
4. **NFL comparisons:** the operators in [the index](nfl-sim-operators.md).
   An 8-game sim export gives ±6–8 points on rates like pressure, so read
   only gaps larger than that as differences from the NFL.

## Limits

- The noise was measured on two commits of one profile with generated,
  equal-strength teams. Other rosters or stronger mismatches change the
  design effect.
- The pairing result depends on what the change touches. A change that
  touches only rare situations keeps long identical prefixes, but still
  yields one informative pair per game.
