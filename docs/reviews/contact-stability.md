# Contact stability: three bounded investigations

Baseline `codex/run-game-integration` at `4ded6b6` (runtime
`8433e88d…`), branch `claude/contact-stability`. New flags `HOLD_BALANCE`
and `TACKLE_DROP` are registered in `config/baseline.json`, both off.

| # | Question | Endpoint | Status |
|---|---|---|---|
| C1 | Why do held falls depend on the timestep? | Name the injecting operation and show it | **done** |
| C2 | Validate the selected correction | Panel agreement with 96 substeps, no change to unrelated blocks, cost, suites | in progress |
| C3 | Why do slow holds drag? | Test the hanging-weight hypothesis with a traced ledger; a flagged mechanism or a refutation | **answered**; ordinary-tackle check pending |

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
