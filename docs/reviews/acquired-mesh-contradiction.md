# Retire an acquired contradiction of the expected mesh

Independent branch `codex/acquired-mesh-contradiction` on accepted/fetched
`70b4db6a3ef53acc1a0e90cd055f1087205daa30`; starting queue `9a70bb5`,
handoff queue `4b3bac4` retains that accepted pin. Code
`e98a5d2b8e302b7a9bf7398cda7cd2fb60dc4a70`; runtime source
`2e399e0d8797be8ad83fba089e866c02951ad96b7927645119e8aa9e75a9395d`.
[Exact evidence and costs](../../data/reviews/current/acquired-mesh-contradiction/review.json),
[three-file patch](../../data/reviews/current/acquired-mesh-contradiction/candidate.patch).

## Contract

An unkeyed fitter can keep following an expected RB exchange after that back
has visibly left empty-handed while the QB still holds the ball. Retire that
observer's mesh expectation when his acquired QB picture has carrying=true and
either (a) the acquired empty-handed back is beyond the LOS and longitudinally
out of existing handoff reach, or (b) the carrying QB is beyond the existing
LOS+2 commitment surface. Use the existing `handoffReach` capacity without
changing it. Initial snap possession, a normal pretransfer RB departure,
unknown carrying or elapsed time is insufficient.

Keep one remembered contradiction per Agent/play in a WeakSet. It is local to
the observer, not a shared phase. A back subsequently returning empty-handed
does not reinstall the expected exchange. On the retired path, use the current
queried QB picture, including its uncertainty, and the existing installed fit.
Do not substitute live QB motion. A single passive `run-fit-mesh` decision
records the actual acquired cause without extra sensing or RNG. Keyed fits
retain their existing cue/geometry contract and do not consult this memory.

**Bounded information scope:** the new retirement writes no private scramble,
handoff or timer state and reads none to establish its contradiction. Existing
unkeyed caller/target eligibility still uses authoritative carrier and legacy
phase guards; those lines are unchanged. This does not claim a complete honest
possession model or whole-fit hidden-state invariance. Removing those guards
would change ordinary uncommitted-QB behavior and needs its own acquired-cue
contract; it is not smuggled into this repair. The existing run-fit allocation,
gap/shoulder, flow, declaration, braking, gathering and execution are unchanged.

## Saved witnesses, preservation and adverse evidence

The source remains accepted70b4, with original saved evidence
`b9b9c17597970ddc87aa4a4e271fc4cfeef71909`. All four archives and the deep-audit
bundle were restored and hash-checked for the separate #132 investigation; no
collection is duplicated. The frozen five scenes select actual zone fitters
who already believe run, with the exact players and consumed QB/back channels:

| Failed exchange | Selected first cue | Actor / installed zone |
| --- | ---: | --- |
| G3-P003 | 4.00s | CB_S / flat_s, force |
| G3-P087 | 2.90s | LB_M / hook_s, insertion |
| G3-P141 | 2.60s | LB_S / hook_s, insertion |
| G4-P142 | 2.40s | LB_S / hook_s, insertion |

These are first selected fitter cues under the conservative spatial rule, not
claims that no other observer could recognize the failure earlier. The actual
QB remains about4yd behind the line. **G3-P140**, the successful Ace exchange,
is the opposing control: its1.10s FS picture still supports an expected mesh.
RB aiming-track departure at1.10s is not itself declared wrong.

**Material limitation:** at these four first-cue scenes, old and corrected
requests and one-step achieved movement are equal. The installed gap/force
landmark can coincide despite the target-picture change. The tests therefore
verify the real producer's retirement decision, rather than treating downstream
command equality as proof of correction. An additional acquired returning-back
case with the actual G3-P087 insertion role proves local memory prevents the
empty back from pulling the fitter back into the mesh. That changed cue is an
explicit synthetic continuation, not the receiver's future path or a native
counterfactual. The initial unsuitable force-role memory test and its failure
remain visible.

Unknown/negative QB possession, unknown/conflicting back possession, hidden
QB/back motion while reality snapshots advance, a normal mesh at multiple
elapsed times, separate observers, keyed-back support and an acquired committed
QB provide opposing contracts. Installed jobs remain unchanged; World step work
residuals stay below1e-8. The existing back-man/support checks retain PA and
throw-recognition priority; this code changes neither consumer.

The revised unchanged-source check fails6/10 contracts and passes4; the final
candidate passes **66/66 focused checks**, including10 new contracts, plus
typecheck. Earlier red/candidate results are retained. Node22.23.3,44 controlled
settings, components1, CF_FLOW unset, World defaults fixed. Exact runtime,
input and command provenance is in the linked receipts. No full suite/build,
new full snap or game was run. Counts are not additive with #132's overlapping
existing checks, and neither branch is a combined-candidate verification.

The four recorded25s caps remain **unknown terminal endings**. This repair does
not establish a new tackle or solved failed-exchange continuation. In particular,
a stationary carrying QB still behind the line does not automatically satisfy
the unchanged fit's declaration rule. Offensive recovery belongs to Run;
combined native football value should be evaluated once those independent
responsibilities are ready, not inferred from this local target correction.

## Review and independent boundaries

[Run handoff](https://github.com/tannerthardy/football-simulation-/pull/126#issuecomment-6229713842)
records the acquired-cue decision and requests a specific conflicting contract.
Independent contract review remains required. Integration owns combined
verification/adoption. No Run offensive recovery, #126 contact surface, #128
force wrapper, #132 man gate, cushion, fast #3, catch policy or physics ancestry
is imported here. #128's independent acceptance remains separate from the
unresolved #126 existing-contract finding.

Reproduce the direct contracts using repository Node/dependencies:

```sh
node scripts/baseline.mjs --candidate --receipt out/mesh-contract.json -- npx vitest run test/acquired-mesh-contradiction.test.ts
```

The fixture contains frozen input/player selections and source-record hashes.
Its producing-stage replay uses rounded saved state; unexported historical
mind/support states and native endings are not invented. The retained extraction
script operates only on already restored records; it does not generate plays.
