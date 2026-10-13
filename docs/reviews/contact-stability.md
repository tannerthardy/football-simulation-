# Contact stability: three bounded investigations

Baseline `codex/run-game-integration` at `4ded6b6` (runtime
`8433e88d…`), branch `claude/contact-stability`. New flags `HOLD_BALANCE`
and `TACKLE_DROP` are registered in `config/baseline.json`, both off.

| # | Question | Endpoint | Status |
|---|---|---|---|
| C1 | Why do held falls depend on the timestep? | Name the injecting operation and show it | **done** |
| C2 | Validate the selected correction | Panel agreement with 96 substeps on the reps it targets; name what remains | **done**: valid, narrow, stays off |
| C3 | Why do slow holds drag? | Test the hanging-weight hypothesis with a traced ledger; a flagged mechanism or a refutation | **done**: refuted; `TACKLE_DROP` flagged, off |

## C1: the timestep-dependent fall is two different things

Witnesses: the physics session's seed-3001 rear (180 deg, 6 yd/s, center
hands) and angled (45 deg, 8 yd/s, patch) holds.

**Hybrid isolation** (`scripts/diag/physics/loaded-subcycle.ts`): at 12
substeps, re-integrate only the balance (capture-point) update in 16 pieces
with the substep's inputs fixed. The angled witness then matches the fine
outcome (escape -> hold); the rear does not (still never falls). So the two
have different sources.

**Rear: a physical threshold.** Every channel that moves the runner's
capture point was summed per tick: all of the change passes through the
balance update (lean release and other channels are zero). Within it, the
leg-hold trip input converges (0.640 / 0.644 / 0.642 yd over 2.05-2.45 s at 12
/ 48 / 192 substeps). The coarse run's recovery is short by 0.011 yd over that
first 0.4 s, and the gap grows to about 0.06 yd by 2.95 s, which is what
gravity's growth rate outside the base predicts (e^(3.3 x 0.5) = 5.2). The
outcome itself is knife-edge (`scripts/diag/physics/hold-sensitivity.ts`): at
192 substeps, nudging the tackler's start sideways by 20 mm flips the fall
(14.7 yd) into a drag to the time limit (22.8 yd); 10 mm does not. Production's
integration error is equivalent to that 2 cm. No law change makes a
threshold case converge at 4 ms steps.

**Angled: an integration error.** At 192 substeps the angled hold survives
every nudge from -20 to +20 mm, so the coarse escape is numerical. Its
failure is "tackler on the ground": the holder's balance, not the runner's.
Sub-cycling the balance of both grasp participants removes it.

## C2: `HOLD_BALANCE` is correct but narrow

`HOLD_BALANCE=m` (off) sub-cycles the balance update m times for both bodies
in a live grasp, with that substep's loads split evenly; nothing else in the
island changes. Tackle panel, 288 reps, rep-by-rep ending against the same
panel at 96 substeps (`hold-refinement-compare.py`):

| panel | production (12-16) | `HOLD_BALANCE=16` |
|---|---|---|
| center hands (game default) | 286/288 | 286/288, same reps |
| center + `LEG_BRACE TACKLE_ROLL WRAP_BIND` | 282/288 | 282/288, same reps |
| `--common-patch` (research hand mode) | 280/288 | 282/288 |

It repairs the case it was built for (the angled 45/8 patch witness, both
mirrors) and nothing else. In the game's hand mode it changes no ending, so
it does not earn its cost and stays off. The original endpoint (>= 287/288
on every panel) assumed one operator; there are several. Each remaining
disagreement was swept across resolutions (`hold-substep-sweep.ts`),
nudged at 96 substeps (`hold-sensitivity.ts`) and traced coarse-against-fine
(`hold-trace.ts`):

| rep | what decides it | kind |
|---|---|---|
| 180/6 seed 3001 (rear witness) | gravity amplifies a 0.011 yd recovery shortfall; 2 cm nudges flip it at 192 | physical threshold |
| flags 90/3 seed 3000 | the 96 reference itself is the outlier: 7/9 nudges are censored like production | physical threshold |
| flags 180/6 seed 3005 | falls at 12-24 substeps, dragged at >= 32 (converged), 9/9 nudges agree | **grasp spring**: see below |
| flags 45/8 cut seed 3001 | runner deviation jumps 0.21 -> 0.42 in one tick at 3.25 s while the holder is upright and touching (fine: 0.23 -> 0.17); fine peaks 0.14 yd inside the fall limit and recovers. Converged at >= 32 | contact impulse near the balance limit |
| patch 0/3 cut, 45/8 cut seeds 3002/3004 | not traced | |

**The grasp-spring path** (180/6 seed 3005 with tackle flags). The holder dove
at 2.15 s and is dragged on the ground. The 6 Hz grasp spring and his ground
friction (about 900) oscillate: grip force swings 1,200 -> 20 -> 1,200 over
about 0.4 s. At each peak the coarse run stretches the pair about 0.02 yd
further (2.13 vs 2.11 at 3.20 s), and grip capacity, which depends on that
distance, falls to 1,177 instead of 1,244. The grasp saturates, and every
saturated substep slides the hold down the legs at a fixed rate
(`LEG_SLIDE` 0.3 s). Once capacity reaches the holder's drag (about 900) the
grasp stays saturated: from 3.60 s the coarse grip sits at capacity, `legs`
climbs from 0.65 to 0.87, and the leg trip fells the runner at 4.15 s. The
fine run's capacity stays near 1,400; `legs` holds at 0.61 and he is dragged
to the time limit. Two things combine: the spring's soft-step stretch error
(first order in h), and a slide law integrated over saturation *time*. Under
static friction at its limit, that law slides the hands even with no
relative motion. Only finer joint integration converges it (>= 32 substeps;
`HOLD_SUBSTEPS=48` gives 288/288 on the earlier source). Changing the slide
law is a candidate, not a validated fix.

Where this leaves the timestep question: production's center-hand panel
matches the 96-substep reference on every rep except one physical threshold.
The flagged tackle finishes add two integration-sensitive paths that only
appear in long held drags. They should be fixed with those flags, not
ahead of them.

## C3: slow dragging holds need a decision, not a new law

Trace (`tackle-ledger.ts 90 3`, with `LEG_BRACE`, `TACKLE_ROLL`, `WRAP_BIND`):
the runner drives with about 720 of force; the tackler stays on his feet,
asks to slow to 0.5 yd/s (the roll's "sit"), and resists with about 800 through
the grip (gait braking plus a backward lean). The forces balance, so the pair
keeps moving at about 3 yd/s while the runner stays balanced (deviation ~0.27,
inside his base). "Sitting" can only be requested as a slow walk; the holder
never actually goes down. A downed holder already has ground friction of
0.75 of body weight (about 820 for this tackler), more than the runner's drive.

`TACKLE_DROP=1` (off): a secure holder (grip quality >= 0.8) drops his weight by
going to the ground into the runner using the existing dive. Slow (3 yd/s)
holds at 45-180 deg, both sides, three seeds: tackled 18/24 -> 24/24; yards
after contact median 3.9 -> 3.8, p90 11.9 -> 4.5. The hanging-weight hypothesis
is not needed: existing ground friction plus the leg binding finish the hold
once the holder commits his weight. The cost is real: on the ground he is out
of the play if the hold breaks.

**Full panel** (288 reps, 6 seeds, center hands, production resolution;
"flags" = `LEG_BRACE TACKLE_ROLL WRAP_BIND`):

| group | production | flags | flags + `TACKLE_DROP` |
|---|---|---|---|
| ordinary (72): tackled / censored | 66 / 0 | 62 / 4 | 66 / 0 |
| ordinary after contact, median / p90 | 2.0 / 4.2 | 2.4 / 4.9 | 2.2 / 4.3 |
| difficult (216): tackled / escaped / censored | 168 / 46 / 2 | 130 / 48 / 38 | 156 / 48 / 12 |
| difficult after contact, median / p90 | 3.3 / 6.5 | 4.5 / 12.2 | 3.9 / 8.9 |
| 3 yd/s (96): tackled / censored | 96 / 0 | 64 / 32 | 90 / 6 |

Against flags alone, `TACKLE_DROP` changes exactly 30 endings, all
censored -> tackled. No tackle becomes an escape, and ordinary tackles
return to the production count. It also agrees with its own 96-substep panel
on 284/288 reps (flags alone: 282).

**What remains** (12 censored, 6 mirrored pairs). Traced 45/3 cut seed 3003:
the holder drops at 3.65 s and nearly stops the runner (0.6 yd/s by
5.65 s). Then, because he has stopped sliding, the passive support rule
(`world.ts` `passive`: down, slower than 0.3 yd/s for 0.3 s -> rising)
stands him up *while he still holds*. He is upright by 6.65 s and the runner
walks on. Getting up is automatic for every downed body; nothing lets a
holder choose to stay down on a runner. That is the next bounded question.
Endpoint: show whether a downed holder with a live grasp should keep the
"down" state (support owner: primary physics session), and repeat this panel.

## Commands

```sh
# C1 / C2
node --import tsx scripts/diag/physics/loaded-subcycle.ts
node --import tsx scripts/diag/physics/hold-sensitivity.ts 180 6 192 center [cut] [seed]
node --import tsx scripts/diag/physics/hold-substep-sweep.ts 180 6 0 3005
node --import tsx scripts/diag/physics/hold-trace.ts 180 6 0 3005 12 48   # flags via env
node --import tsx scripts/diag/tackle/panel.ts --seeds 6 [--substeps 96] [--common-patch] --out out/c2/X.json
python3 -I scripts/diag/physics/hold-refinement-compare.py REF.json OTHER.json
# C3
node --import tsx scripts/diag/physics/tackle-ledger.ts 90 3
```

Run through `npm run baseline:run -- --flag NAME=VALUE -- <command>` for a
recorded receipt; the panels above were run directly on the pinned source.

