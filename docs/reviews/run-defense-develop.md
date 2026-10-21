# Run defense and after-catch execution on accepted develop (2026-10-21)

Branch `claude/run-defense-develop` from accepted develop
`d91c9014fe5e088f3f43e38236e967d68bd388b0`. Default-off flags with contract
tests; nothing changes with the flags off. The research behind these changes
was done on `claude/zen-feynman-7712y8` (hosted on `claude/run-game-v3@9932066`,
with that branch's contact model on); that host is preserved unchanged and its
numbers do not certify develop. Every result below was re-measured on develop.

## Questions

1. **Interceptions.** On the research host half of all interceptions followed
   a touched ball, and most were the same defender catching his own breakup.
   Does `catching.ts` give a defender who has just broken up a pass a second,
   independent interception chance on its deflection?
2. **Held runners.** In the 1v1 tackle panel a runner held from the side or
   behind kept asking for his full stride and carried the holder several yards.
   Does a hold on his legs change what the carrier requests?

## Changes

| Flag | Where | Law |
|---|---|---|
| `TIP_AWAY` | `catching.ts`, breakup and bat branches | A defender who breaks up or bats a pass has sent it away from his own hands; he cannot catch that deflection (`noCatchUntil` for the flight instead of 0.25 / 0.3 s). Teammates and the receiver still can. |
| `LEG_BIND` | `tackle.ts` `updateBond`, the carrier's request | A hold beside or behind the runner, at thigh height (legs share 0.5, a form tackler's wrap in `attempt()`) or lower, times its grip, limits the speed his gait can hold; a higher hold binds proportionally less. A tackler in front is left to the existing drive-through. |

No World law, capacity, grip, traction, rating or tackle probability changes.
`LEG_BIND` changes a request, not physics: a man's weight hanging on the
runner's legs is the support model's, handed to the contact owner.

## Evidence on develop

**1v1 tackle panel** (`scripts/diag/tackle/panel.ts --seeds 6`, 288 reps;
the same bodies, starts and seeds; yards after first contact, median):

| Approach, runner speed | Off | `LEG_BIND` |
|---|---|---|
| Head-on, 3 / 6 / 8 yd/s | 0.5 / 1.8 / 2.0 | 0.5 / 1.8 / 2.0 |
| 90°, 3 / 6 yd/s | 2.5 / 4.2 (tackled 50%) | 1.7 / 3.6 (tackled 67%) |
| 135°, 3 / 6 yd/s | 3.7 / 6.9 | 2.2 / 4.5 |
| 180°, 3 / 6 / 8 yd/s | 3.8 / 5.8 (unfinished 17%) / 6.3 | 2.2 / 4.3 (0%) / 5.1 |

Finish: physical fall 234 → 224, stopped progress 0 → 14 (a bound runner
held up), escaped 52 → 50, unfinished 2 → 0. Rolled misses are unchanged.

**Interceptions** (`depth/ints.ts`, 8 games each, seeds 101–108): 41 / 614 →
33 / 633 attempts (6.7 → 5.2%; NFL total 2.2%). Touched balls intercepted
19 → 6%, by the defender who touched it 12 → 0; interceptions after a touch
54 → 21%. The rate difference alone is not significant at this sample
(p ≈ 0.25); the mechanism count is unambiguous. On the research host, 16
games each: 7.4 → 5.0% (p ≈ 0.02).

**Mechanism report** (`sim-export.ts --seed 101 --games 8`, off vs both flags,
`measure.py` + `compare.py` against the committed 2022 NFL reference; games
diverge after the first changed play): off-flagged metrics 46 → 33; 26 change
status for the better and 16 for the worse.

| | NFL 2022 | develop | + `LEG_BIND` `TIP_AWAY` |
|---|---|---|---|
| `contact.catch.broke_contact` | 12.5% | 29.7% | 19.6% |
| `contact.catch.yards_after_contact` p50 / p90 | 1.6 / 6.1 | 2.19 / 17.9 | 1.92 / 7.8 |
| `catch.yards_after_catch` p50 / p90 | 3.0 / 12.5 | 4.55 / 34.7 | 3.37 / 20.4 |
| `run.yards` p50 / p90 | 3.0 / 10.0 | 2.98 / 27.0 | 2.97 / 12.1 |
| `contact.run.broke_contact` | 12.5% | 16.0% | 10.1% |
| `contact.run.yards_after_contact` p50 / p90 | 2.4 / 6.2 | 1.95 / 8.1 | 1.62 / 5.0 |

## Evidence against and unresolved risk

- **Run yards after contact get shorter.** p50 1.95 → 1.62 (NFL 2.4);
  outside zone 2.10 → 1.53 (2.6) and gap 1.76 → 1.67 (2.5) become off. A side
  hold now binds the stride; NFL runners still fall forward through those
  tackles. Mid-speed run contacts were already short on develop (1.22, NFL
  2.3) and contact to whistle is off in both arms (0.70–0.75 s, NFL 1.4): the
  run tackle ends too fast before and after this change.
- **Stopped progress, not a fall, ends 14 panel reps.** A bound runner can be
  held up and whistled; the falling-forward share that NFL runners keep is the
  support model's (the holder's weight on his legs), not this request.
- **Catches remain long.** Broken contact 19.6% (NFL 12.5) and YAC p90 20.4
  (12.5): defensive backs reaching or lunging at fast receivers from behind
  still lose holds, and zone receivers run free before contact (research host
  `depth/yacsplit.py`, `infront.py`). Waist holds and the holder's weight are
  untouched here.
- **Noise.** Status changes such as pass pressure (20.0 → 17.7%) cannot come
  from these flags; they are the divergent games. Treat single rows, not the
  direction of the catch and run-tail rows, as unconfirmed.
- Not run: `test:integration`, `test:all`, `test:data`. Core suite 2,782 / 2,782
  and typecheck pass on this branch with the flags off.

## Reproduce

```sh
npx vitest run test/tip-away.test.ts test/leg-bind.test.ts
for a in "" "--flag LEG_BIND=1"; do node scripts/baseline.mjs --candidate $a -- node --import tsx scripts/diag/tackle/panel.ts --seeds 6; done
node scripts/baseline.mjs --candidate --flag LEG_BIND=1 -- node --import tsx scripts/diag/depth/holdtrace.ts --angle 135 --speed 6
for a in "" "--flag TIP_AWAY=1"; do node scripts/baseline.mjs --candidate $a -- node --import tsx scripts/diag/depth/ints.ts --games 8; done
node scripts/baseline.mjs --candidate -- node --import tsx scripts/mechanics/sim-export.ts --seed 101 --games 8 --out out/mechanics/sim-dev-off.jsonl.gz
node scripts/baseline.mjs --candidate --flag LEG_BIND=1 --flag TIP_AWAY=1 -- node --import tsx scripts/mechanics/sim-export.ts --seed 101 --games 8 --out out/mechanics/sim-dev-on.jsonl.gz
for s in off on; do python3 -I scripts/mechanics/measure.py out/mechanics/sim-dev-$s.jsonl.gz out/mechanics/sim-dev-$s.json; python3 -I scripts/mechanics/compare.py --sim out/mechanics/sim-dev-$s.json --out out/depth/report-$s.md; done
```
