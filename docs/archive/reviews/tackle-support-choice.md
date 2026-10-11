# Secured tackle support: keep the feet working

The retained post-catch carry is primarily a controller problem. A secured side/rear hold used to order its defender to dive whenever grip quality reached 0.55 and the runner exceeded 2 yd/s. That gives away the player's cleat support precisely when his arms have finally secured. The existing shared physics can finish the same hold earlier when the defender continues working his feet into the hip. No grip-force, balance, strength, or traction increase is needed.

## What was measured

The fixed native witness is `DA-R1-four_verts-cover6-R`: Gun Trips Four Verticals versus Over Cover 6, seed 3, roster seeds 31/32, LOS 40, no audibles. It was already selected in the previous six-film passing packet. The receiver is a 112.94 kg tight end, initially pursued by an 83.91 kg safety.

Whole-source phases:

- Published baseline: `178751b67048eeaa91741090a4a19e43c108add8c5f1c5e0a586c09d57b3402c`.
- Arrival plus constrained-wait candidate before this repair: `030e0f3fb252f4c63ecbb81c8c7544728a6c54b2fa91c5827689ea1fb6e7cdeb`.

An observer recorded existing controller commands, grasp state, achieved ground impulses/work, support state, and the World ledger at native tick boundaries. It requested no extra visual picture, command, behavior execution, or random number. Observed versus plain complete outcomes, bodies, held intents, minds and RNG matched for both source phases and each counterfactual.

| Phase or declared counterfactual | YAC | Carrier starts falling | Down and play end | First holder starts falling |
| --- | ---: | ---: | ---: | ---: |
| Published baseline | 20.321 yd | 7.35 s | 7.75 s | 5.55 s |
| Arrival/wait before support repair | 20.421 yd | 7.35 s | 7.75 s | 5.55 s |
| Keep the secured holder's feet | 9.660 yd | 5.80 s | 6.20 s | No fall |
| Keep feet plus grip/traction-bounded braking request | 9.638 yd | 5.80 s | 6.20 s | No fall |

The ball is caught at 5.00 s; the safety acquires the same reach from behind at 5.15 s. The keep-feet execution and original are identical through the completed step beginning at 5.45 s. The first changed command is the automatic dive at 5.50 s. Its removal retains the original run-with-and-close command. Physical support fails on the carrier; there is no artificial completion, yardage override or required assist.

These ends are actual down-by-contact after support loss. The original bond lasts 2.60 s and the keep-feet bond 1.05 s, below the existing four-second bond cap. Neither finish is the cap, a pocket-QB grasp, or a forward-progress whistle. The cap remains a separate officiating-model debt; future collectors must distinguish it from a physical finish.

Additional braking adds only 0.022 yd improvement to this witness. It also introduces another control rule and no demonstrated broad benefit. The production repair therefore removes only the forced dive.

## Is the long carry itself violating physics?

No planar force/work violation was found in this witness. During contact on the published source, the safety dissipates about 8,327 kg yd²/s² through actual ground drag while the tight end receives about 2,450 kg yd²/s² from his actual ground drive. Passive grasp work remains nonpositive. Maximum World planar work-ledger residual is below 2.8e-11 kg yd²/s². The runner does slow once the defender is grounded. A long carry cannot be declared impossible from the wrap event alone.

The model is reduced: no simulated vertical weight transfer from a hanging defender, no anatomical cleat placement or measured prone-athlete contact patch. Falling uses a gravity-derived planar tipping proxy; grounded drag uses an assumed coefficient. Work closure proves consistency of the represented channels, not complete biomechanics or realistic NFL finishing rates.

The first unjustified instruction is nevertheless identifiable: **secure arms automatically abandon standing support**. That is a technique choice, not a universal physical law. A genuine dive, a failed support recovery, or being pulled off one's feet still belongs to the physics and existing approach controller.

## Transfer controls and adverse results

The same ignored counterfactual was run on the predeclared 32-input tackle panel with unchanged input hash `46a1d3b8cbed9b54c62400e3a7f44c323863677eb57cbf97f5ae1d90b61f28c3`. It excluded explicit dives, lunge-origin/extended holds, low-quality holds, and already grounded holders. All 32 recording controls match.

- Sixteen ordinary native inputs: mean gain 6.0381 to 6.0419 yd, essentially unchanged and slightly worse. Fifteen initial wraps, one miss and one contact fumble stay unchanged. Four assists and one broken hold stay unchanged; slipping holds decline 17 to 16.
- Four retrospective Split Zone witnesses: mean 23.13 to 23.2125 yd, slightly worse. The surviving 70-yard touchdown remains. One assist disappears; initial misses and broken holds remain. This repair does not solve every explosive run.
- Twelve isolated encounters retain all four censored weak/glancing and faster-carrier escapes, ten acquired holds and two breaks. Crossing and fatigued-crossing finishes shorten by about 0.49 and 0.33 yd respectively; nearby-traffic crossing worsens by 0.27 yd. Censored and naturally finished distances must not be pooled.

The native Cover 6 improvement is useful causal evidence, not evidence that average football outcomes are calibrated. Root's source-frozen ordinary-run, passing, and multi-roster full-game checks decide broader promotion.

## Production change and regression evidence

`src/sim/tackle.ts`, `updateBond`: side/rear holders keep the existing finite run-with-and-close request and preserve any approach-owned dive/lunge. The controller no longer manufactures a 0.01-magnitude dive from the grip-quality threshold. Actual contact can still make either player fall, grip loads can still slip or break, and a grounded extended holder still dissipates energy through the same World law.

`test/tackle-support-choice.test.ts` adds 16 mirrored controller/World contracts: secured side and rear support, explicit committed dives, requested strikes, weak extended grasps, already grounded extended holders, falling carriers, and front-on drive. The exact same test bytes fail six cases and pass ten on **both** published baseline and the before-repair arrival/wait archive. The new implementation passes all 16; existing pursuit, grasp and constrained-wait checks also pass (61 focused tests). The four new standing-support cases execute the real World and check passive energy, ledger closure and no RNG change; they do not require a successful final tackle.

## Numerical limitation

The unchanged before-repair native witness yields 20.42, 17.21 and 16.92 YAC at fixed 12/24/48 World substeps. All retain the same catch and first acquisition; later coupled trajectories diverge. The carrier support-loss time changes from 7.35 to 6.85/6.80 s. This is genuine sustained-contact convergence debt for that original command. Increasing global resolution fails to remove the automatic-drop controller mistake and is not the proposed fix.

Keeping feet on the exact same frozen source gives 9.65989, 9.66591 and 9.66441 YAC at 12/24/48 substeps: a 0.0061 yd spread. All three retain catch 5.00 s, acquisition 5.15 s, carrier support loss 5.80 s, physical down/end 6.20 s and an upright holder without an assist. Thus this retained contact becomes substantially more stable under the simpler standing-support controller, without changing the solver. This is one local witness, not proof that every long hand fight or ground-held tackle converges.

Next, identify the first held-support or grip transition that diverges using a source-matched local trace. Preserve the same bodies, commands, and force/work budgets. Do not restore a guaranteed down timer or strengthen tackles to hide a numerical issue.

## Reproducing the independent audit

Ignored development evidence and exact tools are in `out/tackle-breakthrough/loadedcontact/`; `source-controls.json` pins source phases, the new test SHA, exact failed-control counts, collector bytes and outputs. The native tool is `loaded-contact.ts`; counterfactuals are `loaded-counterfactual.ts` and `loaded-counter-panel.ts`. These imports expect placement under a frozen archive's `scripts/diag/` alongside `source-version.ts`. Run with Node 22 and the existing dependencies:

```sh
node --import tsx scripts/diag/loaded-contact.ts /absolute/output/native.json.gz
node --import tsx scripts/diag/loaded-counterfactual.ts /absolute/output/keep-feet.json.gz keep-feet
node --import tsx scripts/diag/loaded-counterfactual.ts /absolute/output/brake.json.gz brake-with-grip
node --import tsx scripts/diag/loaded-counter-panel.ts /absolute/output/panel-feet.json.gz keep-feet
```

The independent audit ran on frozen archives and does not claim final full-source validation while other agents were still editing. The [final review](pursuit-and-tackle-transfer.md) preserves these phase identities and separately reports final source-pinned validation, mixed game results and the new rushing tails.
