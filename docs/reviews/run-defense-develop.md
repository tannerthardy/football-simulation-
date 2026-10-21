# After-catch execution on accepted develop (2026-10-21)

Branch `claude/run-defense-develop` from accepted develop
`d91c9014fe5e088f3f43e38236e967d68bd388b0`. The research behind it was done on
`claude/zen-feynman-7712y8` (hosted on unaccepted `claude/run-game-v3@9932066`,
with that branch's contact model on); that host is preserved unchanged and its
numbers do not certify develop. Everything below was measured on develop.

## Integrated: `TIP_AWAY` (default off)

**Question.** On the research host, half of all interceptions followed a
touched ball, most of them the same defender catching his own breakup. Does
`catching.ts` give a defender who has just broken up a pass a second,
independent interception chance on its deflection?

**Answer: yes.** After a breakup or bat, the defender may play the tumbling
ball again 0.25 / 0.3 s later with up to a 40% catch roll, although the
contest had just decided he could not catch it cleanly. A breakup swats the
ball away from his hands. With `TIP_AWAY` he stays out of that flight (the
`noCatchUntil` lockout covers it); teammates and the receiver can still play
the tip. No other law changes.

**Evidence** (`depth/ints.ts`, 8 games each, seeds 101–108, develop profile
vs `TIP_AWAY=1`): interceptions 41 / 614 → 33 / 633 attempts (6.7 → 5.2%; NFL
total 2.2%); touched balls intercepted 19 → 6%; by the defender who touched it
12 → 0; interceptions after a touch 54 → 21%. The rate difference alone is
not significant at this sample (p ≈ 0.25); the mechanism count is. On the
research host, 16 games each: 7.4 → 5.0% (p ≈ 0.02).

**Tests.** `test/tip-away.test.ts` (breakup, then the tumbling ball through the
same defender's hands: off intercepts, on does not). The existing witness
`catch-caller-interval.test.ts` "preserves a genuine defensive PBU" asserted
the old 0.25 s lockout, which is exactly the law the flag changes; its
assertion now states both (0.25 s off, the rest of the flight on), otherwise
unchanged. Core suite 2,777 / 2,777 with the flag off and with it on;
typecheck passes.

**Risk.** Clean interceptions remain about 3–4% of attempts (NFL total
2.2%): about half are undercuts away from the receiver. That is QB decisions
and the in-flight interception roll, not this lockout.

## Withdrawn: `LEG_BIND`

`LEG_BIND` (a hold beside or behind the runner, at the thighs or lower, times
its grip, capped the speed the carrier's gait could hold) was ported and
measured here, then withdrawn from this branch (normal revert `cb53813`).

- It helped: 1v1 panel 135° / 6 yd/s yards after contact 6.9 → 4.5, 180° /
  6 yd/s 5.8 → 4.3 with no unfinished reps, head-on unchanged; with
  `TIP_AWAY`, 8-game mechanism report off-flagged metrics 46 → 33, catch
  broke contact 29.7 → 19.6% (NFL 12.5), YAC p90 34.7 → 20.4 (12.5),
  `run.yards` p90 27.0 → 12.1 (10.0). Run yards after contact got shorter
  (1.95 → 1.62, NFL 2.4).
- It breaks a sound contract when on: `tackle-support-choice.test.ts` "a rear
  finish transmits braking load through center/patch physics" (a planted rear
  holder 3775 vs co-moving 4043 load). The bound runner brakes himself, so the
  tackle's braking no longer goes through the hold. A held runner who keeps
  asking to drive is a sound decision; that his legs still achieve a full
  stride is a physics gap (bound legs and the holder's weight in the support
  model). Under the model rules the repair belongs in physics; the evidence
  (panel cells, `depth/holdtrace.ts`, `depth/holds.ts`, this contract) is
  handed to the contact/physics owner. The flag stays on the research host.

## Diagnostics (observation only)

`scripts/diag/depth/`: `drives.ts` (drives, results, points by scoring play),
`games.ts` (rolled whiffs and broken holds per run and completion), `ints.ts`
(interceptions by source), `holds.ts` (holds by origin and outcome, full
telemetry), `holdtrace.ts` (one 1v1 panel rep every 0.1 s), `aftercatch.ts`,
and one-operator NFL/sim scripts `yacsplit`, `longpass`, `infront`,
`frontman`, `rally`, `zonebreak`. `scripts/mechanics/nfl_ytg.py` writes the
yards-to-goal filter their `--ytg60` option reads.

## Reproduce

```sh
npx vitest run test/tip-away.test.ts test/catch-caller-interval.test.ts
node scripts/baseline.mjs --candidate --flag TIP_AWAY=1 -- npx vitest run --project core
for a in "" "--flag TIP_AWAY=1"; do node scripts/baseline.mjs --candidate $a -- node --import tsx scripts/diag/depth/ints.ts --games 8; done
```
