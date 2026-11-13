# Tite keeper/helper contract repair

The retained Tite failure required a useful tight-end block to fail. On the
unchanged input, Y keeps loaded hands and turns with DE_S; RT waits for work
and then earns a check/climb. The historical assertion still required lost
keeper leverage, RT collection, and no climb. The repair changes tests and an
observation tool; runtime code and experimental defaults are unchanged.

## Matched diagnosis

Baseline: `512ad90862141d9401b40319fcef315a18b63136`, runtime SHA-256
`888b3fb78f6bbe33026121110a895b7f07c9009e19fd755f7d4d1563e601987c`.
Input: roster seeds 31/32, strength .55, team IDs O1/D1, play seed 3,
gun-wing 12 Split Zone, unflipped, base34 Tite Cover 3, LOS 40,
ball at field center, first down 50. All experimental flags unset. Inspect
the fixed two-second controller/contact window, not a final rushing result.

Changing only `LEVER_FACING=0` restores the historical fixed-frame release.
Both arms have identical observed achieved-state histories until tick 1.75 s.
RT has already earned his climb at 1.25 s in both arms. This ablation isolates
Y's false release; it does not restore the entire older controller sequence
or make RT collect him. The helper's current decision is assessed against
its consumed pictures and keeper eligibility below.
Y's engagement object appears at .5 s; nonzero hand load is first sampled at
the completed .6-s World step. Contact claims below require that actual load,
not the engagement object alone.

| At tick 1.75 s | Recorded value |
| --- | --- |
| Fixed drive-frame leverage, phi | 1.100529, just over the old 1.1 release boundary |
| Angle from Y's achieved torso to DE_S | .172205 rad, 9.87 degrees |
| Normal hand load from preceding World step | 367.103 |
| Y base availability | 1.0, support up |
| Historical release arm | Sheds Y for leverage |
| Current release arm | Retains the useful loaded block |

The achieved torso is already sufficient without subtracting any future turn.
Raw `turnRate * dt` credit is .439 rad on this tick; the subsequently achieved
turn is .172205 rad and is recorded separately. That optimistic credit in the release
rule is a separate issue and is not needed to explain this witness.

RT's stable check begins at .75 s. At 1.0 s his consumed backer and runner
pictures do not identify arriving work, and he stays. At 1.25 s his acquired
LB_M picture is .25 s old and the backer is within the existing 4.2-yard
fill criterion. He climbs with Y's real hands still loaded (391.100), support
up, phi .418974, and no helper joined to the pair. The read changes jobs;
it does not move bodies or manufacture hands. No exact release time is pinned
by the repaired test.

The flipped call is an unaffected control with a different combination,
not a geometric reflection of the Y/RT pair. Each observed run is checked
against an uninstrumented run's full bodies, commands, intents, minds, events
and RNG. The collector makes no extra perception calls or random draws.

## Contracts preserved and strengthened

- The native Tite helper must wait when his consumed pictures show no
  arriving work. An earned climb retains the keeper's live loaded hands,
  responsibility, support and existing bodies.
- The same native input must retain a loaded first-level block when the old
  fixed-frame angle passes 1.1 but the achieved torso still faces the defender.
- Two controlled mirrored loss cases begin with actual loaded hands. Only
  the owner's torso is placed facing away; ordinary release removes his
  hands, and native helper movement produces a new loaded contact without
  a climb. Positions, capacities and shared physics are unchanged. These
  are controlled loss-geometry cases, not claims of naturally occurring falls.
- Existing delayed-cue, unsupported-keeper, Under climb, Bear earned transfer,
  genuine-double and sustained-help assertions remain.

## Reproduction

```sh
node --import tsx scripts/diag/zone/tite-keeper.ts out/tite-failure/current.json
LEVER_FACING=0 node --import tsx scripts/diag/zone/tite-keeper.ts out/tite-failure/historical.json
npx vitest run test/zone-helper-check.test.ts test/zone-reach.test.ts test/run-combo-retarget.test.ts test/run-execution.test.ts test/run-technique.test.ts --maxWorkers=1
```

The 93 focused assertions, typecheck and build pass. The full TypeScript run
passes 1,645 of 1,647 assertions, including all 22 helper tests; both unchanged
`test/integration/game-record.test.ts` tests exceed their existing 60-second
budgets, with an additional Vitest `onTaskUpdate` worker timeout. An isolated
rerun of that file reproduces both timeouts and the worker error. No behavior
assertion failure is reported there, but the overall suite is **not green**.
Neither the game tests nor their budgets were edited. Logs and raw histories
stay in ignored `out/tite-failure/` (`all-tests.log`, `game-record-isolated.log`).
This is evidence for replacing the obsolete mandatory-loss endpoint with
responsibility and actual-contact checks; it changes no football outcomes.
