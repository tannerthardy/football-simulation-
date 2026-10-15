# First native tangent cap/slip transition

**Recommendation: review this as a bounded default-off extension of [PR #48](https://github.com/tannerthardy/football-simulation-/pull/48), not production or full-patch promotion.** The saved angle now crosses its first cap/slip transition inside World with a converged independent reference, correct accounting and passing median/p95 costs. Football benefit remains unproved.

Tested code: `ec88e85988ec4b540074f97f70d0e428c62c46be`, runtime source `de1b4a43a98f547950357c0a5699023e4a878969790724b387f70d899831868b`. Parent `d19656d`; comparison baseline remains `4ded6b6`. [Compact receipt](../../data/reviews/current/grip-native-slip.json) records all flags, input hashes, file hashes, costs and retained failures. No capacities, traction, recovery laws, defaults or old test expectations changed.

## Cause and bounded change

The acquired angle initially has tangent force at capacity, zero reel delivery and zero stored tension. Two different events follow: the tangent force leaves its cap, then total force drops below the existing 98% sliding cutoff. They are about **2.765 microseconds apart**.

The old callback refuses the first five intervals. Native fallback uses an endpoint slipping flag to charge either a complete interval of sliding or none. The fifth interval ends below the cutoff, so it loses the partial sliding time before that exit. It ends with grip share `.1763647294`; the converged continuation gives `.1769553128`. This is a timing/accounting difference, not evidence that the resulting tackle is better.

The separate tangent transition integrates the existing clipped tangent row and `legs'=(1-legs)/.3`. It splits the entire state at both events, including body/material/foot motion, impulse and temporal moment, work, dose and share. RK intermediate stages now advance share in this optional mode. The new World contract carries sliding time and share-weighted impulse, preventing a second native slide update and integrating the force-height moment delivered to support. Native support/release/fatigue still execute once. The original below-slip numerical path is unchanged.

The new branch refuses normal tension/reel onset during its tangent phase, active recovery, impact, multiple contacts, off-feet cases, reentry and unsupported geometry. Existing below-slip reel/ground integration resumes after sliding. `LEG_BRACE` combinations and a height-clamp boundary explicitly fall back. Numerical work is bounded; there is no wall-clock deadline guarantee. Ownership remains the same separately opt-in correction described in [PR #49](https://github.com/tannerthardy/football-simulation-/pull/49).

## Accuracy and continuation

The reference uses independent clipped-force arithmetic, RK4 and bisection, centered for numerical precision. Candidate integration uses RK8 and safeguarded root searches. Neither reference copies candidate answers. Existing coordinate/ledger gates remain; changing share, event time and force-height impulse are checked additionally.

- One 4.166667ms mechanical interval: independent 2048/4096 convergence **.031253**, candidate/reference **.002441**, allowance **.0625**. Cap exit **2.295739ms**, slide exit **2.298504ms**. Capacity ratio ≤1; work/energy residuals <8e-13. Coarser references were insufficient and were refined, not accepted by weakening gates.
- Actual World continuation, 16 × .520833ms = **8.333333ms**: saved acquired angle, frontal opposing control and retained fresh angle all accept **16/16**, with no fallback. Worst candidate/reference interval **.002502**, worst reference refinement **.003638**, both below .0625.
- Saved angle: cap/slide exit **2.295759 / 2.298524ms** after acquisition; later reel onset **5.120717ms**. Final body position error 1.01e-13yd, support error 2.49e-15yd, material error 1.69e-16yd, body-work error 4.22e-12, arm-work error 3.47e-12. Refinement errors are smaller. Small differences from the single frozen-ground mechanical interval are expected: World recomputes issued ground/support each native interval.
- Frontal and fresh-angle controls reproduce the previous callback's states/ledgers exactly in the candidate comparison. Angle displacement versus the previous callback is about 1e-6yd; its body-work difference is about -.01459. Neither is a football outcome judgment. No new complete or censored football plays were collected.

The later reel onset exposed a **reference** kink: on the same saved interval, preserved centered RK4 1024/2048 differs by **.423745**, above .0625. A separate reference splitting at existing reel-demand zero converges to **.00000711**; candidate/reference error becomes **.000359**. Candidate reel physics is unchanged. The original reference and its adverse result remain available. This repair does not establish convergence of every earlier long-hold reference.

## Actual runtime tails

Node22.23.3, AMD EPYC9V74, two serial uninstrumented processes. Each uses 11 warm and 101 rotating measured runs per case/mode; preparation is outside the clock. Original saved **22-body World, two-body contact group**, one .520833ms interval. Native ownership-only and previous callback were measured on identical pre-interval states. No tests/profiling ran concurrently with clocks.

| Candidate case | Median A / B (ms) | p95 A / B (ms) | Worst across both (ms) |
| --- | --- | --- | --- |
| Acquired cap | .127 / .122 | .311 / .272 | .660 |
| Cap/slip transition | .678 / .620 | 1.470 / 1.470 | **6.573** |
| Below slip | .313 / .286 | .994 / .936 | 1.920 |
| Frontal control | .109 / .117 | .281 / .217 | 1.196 |
| Fresh angle | .699 / .632 | 2.090 / 1.744 | 5.585 |
| Reel onset | 1.062 / .904 | 2.391 / 1.444 | 4.083 |

All cases pass the existing **2ms median / 5ms p95** budgets in both processes. The transition's previous native fallback costs .126–.136ms median; integrating it accurately is more expensive. Keep the actual 6.573ms worst sample, fresh 5.585ms sample and previous PR48 tail miss visible. This is neither game-wide cost nor a hard fallback bound; the 4.166667ms mechanical interval's new runtime is not certified by these .520833ms clocks.

## Retained failures and validation

The old `test/grip-fast.test.ts` dry-cap stop still expects `limited=0` and gets1. It uses the old fast/resolved path, starts at zero share with a dry topology change, and later exits slip near4.306ms. Its 16384-piece phase uncertainty is **5.01379e-6**, above the existing1e-6 bound; even65536 gives1.25345e-6. Endpoint-share agreement alone is insufficient. Classification: **unresolved numerical phase certificate/search bound**, not force exceeding capacity and not fixed by this new nonzero-share tangent scope. Reuse the unchanged [PR48 evidence](grip-native-forces.md); no re-pin or increased production bound.

52 distinct focused contracts pass: the compatible 51-check active/passive/bounded panel plus the final14-check transition rerun, including one added analytic support-moment check. Typecheck/build pass. Checks cover converged references, moving geometry/share, mirrors, unequal partitions, exactly-once dose/effort, atomic refusal and unchanged below-slip outputs. **No new full suite:** parent1905pass/1dry-cap failure is inherited evidence, not a new candidate full-suite result. The earlier43/52 patch gate's nine failures, keeper angular-law witness and .24yd support-history divergence remain separate and unpromoted.

Reproduce portable correctness with Node22 and `node scripts/baseline.mjs --candidate -- node --import tsx scripts/diag/physics/grip-native-slip-evidence.ts --output=out/grip-native-slip/accuracy.json`. Add `--benchmark --full-host` for the original-host clocks (requires the checksum-pinned native archive); omit `--full-host` for portable two-body clocks, which are a different cost measurement. Raw states/samples stay under ignored `out/grip-native-slip/`.

**Best next step:** review the narrow transition contract, then run the existing small matched successful/failed native-contact continuations with fixed settings and a fresh input. Retain adverse endings and censored cases. Those checks decide football applicability; they do not require a broad game campaign or full-patch promotion.
