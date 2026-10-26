# Experiment identity and computational composition

Source: `c4a03f6463eacb23ce63d01bd32b4f8b547b9bc0`. These are new read-only diagnostic experiments, not changes to the production API. All TypeScript lives under ignored `out/forensic-root` in the audit checkout.

## 1. A meaningful input can have several execution identities

**Question.** Does rearranging the property order of an otherwise identical selected lineup change the simulation? A `Partial<Record<OffSlot, Player>>` names players by their football slots; property insertion order is not ordinarily a football variable.

**Competing explanations.** (1) Slot identity determines the same seeded execution regardless of serialization order. (2) The same random stream is reassigned to different consumers and/or physical ordering changes. (3) An observed difference is just a recorder comparing different numerical indices for the same players.

**Experiment.** Generate the same teams from roster seeds 31 and 32, select the same 12-personnel offense and base43 defense, and call Ace Inside Zone or Ace Hitches against Over/Cover 3. For each play seed 7, 8 and 19, compare the ordinary insertion order with offense reversed, defense reversed, and both reversed. Run each for at most three live seconds. Compare positions and initial state by *slot*, not array index. That is 24 executions and 18 paired comparisons. Two additional executions normalize both differently ordered inputs to one canonical order before construction.

**Result.** All 18 reordered comparisons develop different physical trajectories, first visible at 0.10–0.60 seconds. At their final common sample, maximum player displacement differences range from 0.146 to 7.235 yards. These magnitudes describe these exact short experiments; they are not estimates of game-level bias or realism loss. The two canonicalized executions are exactly equal after comparing the same state, requests and events by slot.

The first-cause trace is more informative than those later distances. With only offense order reversed in seed-7 Hitches, the right guard's first update at t=0.05 draws an `oversetBias` of 0.223374645 instead of 0.800272193. His raw requested lateral velocity becomes 2.616335 instead of 2.495157 yd/s, while the facing request is unchanged. Defense order is unchanged in this comparison. With only defense order reversed, pre-action attributes differ instead: the strong end's snap readiness is 0.179786 instead of 0.120838 seconds, and the strong defensive tackle's sampled rush plan becomes finesse instead of power.

**Code path.** `PlaySim` constructs agents from `Object.entries(setup.offense/defense)` (`src/sim/playsim.ts:275`); `planSnap` iterates those agents on a shared snap stream (`src/sim/snap-count.ts:78`); assignment and rusher initialization consume the shared play stream (`src/sim/assign.ts:31`, `src/sim/behaviors/defense.ts:81`); each protector lazily samples its overset on its first update (`src/sim/behaviors/blocking.ts:266`). Pursuit's named error stream also uses the numerical actor index (`src/sim/behaviors/common.ts:116`). Some other mechanisms already use stable slot-based forks. This is mixed identity discipline, not absence of deterministic RNG support.

**What follows—and what does not.** Exact replay of an identical serialized input remains deterministic. A different random assignment is not by itself evidence of a biased distribution or unrealistic individual play. The demonstrated risk concerns meaningful experiments and restorers: reordering serialization or selected personnel can change unrelated latent errors, complicating a supposedly isolated comparison. Physical pair order may add another effect; this experiment does not isolate that contribution.

Normalize lineup order at the experiment/API boundary using a declared stable slot order, preserving the ordinary caller's current ordering where possible. Key persistent per-rep errors by stable actor/purpose identity when repairing their consumer. This smaller correction should precede any proposal to rewrite all RNG use. It does not solve causal divergence once two plays genuinely differ.

**Artifacts.** `input-order.ts`, `input-order.json`, `input-order-full.json`, `input-order-first-request.ts`, and `input-order-first-request.json`. The first script includes the canonical-order opposing control; the second trace isolates the first differing request. The saved files omit no failing reordered arms.

## 2. “Add a small preview” has a cumulative cost

**Question.** How many actual physics prediction steps already compose inside an ordinary play? This is a workload census, not a throughput benchmark or an argument against prediction.

**Experiment.** Restore the exact native setups for current G1-P002, P017 and P029 from the neutral game collector. Run each normally, then with a passive wrapper counting `World.step` calls and separating one-body prediction worlds from the native 22-body world. Compare the complete `PlayResult` hashes. An additional P017 execution warms the runtime before these pairs.

| Current play | One-body prediction steps | Native World steps, including pre-snap | Complete result identical |
|---|---:|---:|---|
| G1-P002 | 9,014 | 192 | Yes |
| G1-P017 | 13,154 | 193 | Yes |
| G1-P029 | 12,210 | 182 | Yes |

These are *steps*, not candidate decisions. A candidate usually performs several steps, and the counts span the movement-planning consumers, not just pursuit. One prediction step is much cheaper than resolving 22 bodies and contacts. The native steps include pre-snap motion; the reported live duration does not. Wall times varied substantially under JIT warming and concurrent audit work and must not be treated as benchmark improvements.

The existing `previewFreeMovement` reuses scratch worlds, copies the current body/support state, and deliberately excludes future contacts. This is a useful abstraction worth preserving. The finding is that controller-side predictive simulation is already material work. New generic decision evaluation must name its candidate budget, reuse available estimates, and demonstrate value relative to the existing bounded planners. Neither a huge universal rollout nor a cheap-but-overconfident reach estimate should silently become the default.

**Artifacts.** `workload.ts` and `workload.json`; exact setup restorers and the three setup files reside with the architecture evidence. All three instrumented result hashes equal their respective baseline hashes.
