# Corrective-foot force and work inside World

**The bounded World candidate is ready for experimental review; better tackling is unproved.** It integrates an actual issued recovery-foot command with moving grip geometry and closes the force/work accounting. It does not repair the saved support-history amplification. Keep production defaults, capacities, recovery laws and baseline `4ded6b6` unchanged.

Tested runtime/diagnostics: `3f71feae59f17cb7e91ad86e512e1d90a966c6f3`, source `c03b45d5b285e0cd364ad1bdd4f8b5cbe859508fdb8977ce6ea25cd20d96d6cd`, from PR51 `337be32`. [Receipt](../../data/reviews/current/grip-recovery-work.json) records exact flags, settings, input/file hashes, checks and adverse evidence. Saved input-only [support packets](../../config/grip-native-support-packets.json) are reused; no new fitted expected answers or relaxed tolerances.

## What the reference establishes

The native work limiter clips no impulses on the four selected states. Native force approaches the independent force target as the interval shrinks. At the actual .520833ms interval, one transition-state tangent impulse is .100089 versus .113418 in the converged continuous reference (about11.75% lower). The native work ledger nevertheless closes. This demonstrates a finite-step difference, not a new capacity or energy-budget defect.

The independent reference includes the actual allocated unloaded foot velocity `u0`. Its velocity at the material attachment is transformed by the attachment Jacobian. The held-foot response is `u = u0 + mobility * force`; work is split into `-force·u0` and viscous `-mobility*|force|²`. Positive net motor work is independently bounded by `duration*|u0|²/(4*mobility)`. Both candidate and independent SPD/RK4 reference carry body travel, yaw, attachments, raw foot offset, impulse, temporal moment and work together.

The saved point is .15–.17yd from the holder, inside the native .522yd reel stop. Reel must be zero. Seven mechanical/control inputs converge; the eighth, a zero-command transition control, crosses the existing cap and remains unsupported. Worst accepted normalized candidate/reference error is .001315 and reference refinement .000060, both below the unchanged .0625 allowance. Energy residuals are approximately1.1e-12 or smaller.

## Small, separate implementation

An absent-by-default `correctiveGrip` callback is independent of the older active/tangent callback. It supports one below-slip, zero-normal-tension, zero-reel grip with one held foot and an already allocated corrective command, inside the reel stop. Ground force/yaw allocation, support, release, recovery and tick fatigue retain their native owners. The option requires owned material transport, bounded patch contact, midpoint timing and per-solve accounting. It cannot be combined with the other callbacks yet.

World validates the motion/impulse/work result and the positive motor-work budget, then reconstructs contact foot impulse from `(offsetChange - u0*duration)/mobility`. Unloaded corrective travel is not counted as contact force. Native support, work and effort are applied once. Unsupported normal tension, cap/slip, reel-stop exit, material chart events, multiple contacts or invalid results fall back atomically to native execution. No mechanism, force capacity or recovery law was added.

Across each saved50ms tick, the previous history accepts96/96 intervals. The transition history accepts95/96, with one prompt native material-chart fallback at4.140104s. Independent1024/2048 references converge across both continuations, including support and whole-tick work. Worst interval error .006524 and refinement .015426 remain below .0625. An earlier exploratory chart-budget exhaustion and insufficient work-reference convergence were retained in scratch evidence; the final candidate refuses the unsupported chart promptly and the final reference is refined, without loosening gates.

The resulting between-history capture-point gap is **.073068yd versus native .073086yd**. Both histories were already different at4.10s, and their first >.01yd gap occurs at4.1125s. Improving this contact integration barely changes that amplification. The remaining question belongs to the earlier support request/load history; this result does not justify tuning recovery.

## Cost and native contacts

Two serial processes measured11 warmups and101 rotating samples per case on Node22.23.3, AMD EPYC9V74. Clocks cover an uninstrumented .520833ms interval in the portable **two-body World**; preparation is outside the clock. They are not comparable to the earlier22-body benchmark and do not establish whole-game cost.

| Corrective case | Median across two runs, ms | Largest p95, ms | Largest sample, ms |
| --- | --- | --- | --- |
| Previous, phase0 | .094–.095 | .207 | .392 |
| Previous, phase23 | .087–.087 | .195 | .698 |
| Transition, phase0 | .090–.091 | .260 | .720 |
| Transition, phase23 | .088–.090 | .204 | .755 |
| Material-chart fallback | .145–.160 | .312 | .603 |

Every case passes the declared2ms median/5ms p95 budget and10ms fallback screen. The worst observed sample is .755ms; this is not a universal runtime bound. Native no-callback medians are .024–.052ms and remain in the receipt.

Use the five already declared contacts, with ownership plus **corrective callback alone**, at96 native substeps. Reuse the prior ownership-only and solver evidence. Advance starts at the acquired grip, not NFL YAC. All three completed tackles remain completed and both mirrors remain censored/live.

| Contact | Ownership only: yd / s | Corrective only: yd / s | Interpretation |
| --- | --- | --- | --- |
| 45°,8,seed3001 | 24.199731 /4.40 | 24.199731 /4.40 | Censored; no accepted corrective intervals |
| Mirror3001 | 24.199731 /4.40 | 24.199731 /4.40 | Same censored control |
| Front,3,3001 | .449062 /.85 | .449062 /.85 | Exact successful control; fallback |
| 45°,8,4001 | 14.405497 /2.90 | 14.405071 /2.90 | −.000426yd;1197 accepted intervals |
| Previously declared fresh45°,8,5001 | 11.668849 /3.15 | 11.675659 /3.15 | +.006809yd;861 accepted intervals |

The2058 accepted intervals demonstrate supported native invocation. The small changes in both directions establish neither football improvement nor a failure of the numerical accuracy contract. No broad game campaign was run.

## Separate omission found in the older helper

Auditing retained PR51 histories finds positive reel inside the native stop in seed4001:359 previous-helper calls and361 transition-helper calls. First violations are4.326042s and4.286458s, respectively, after the earlier4.1125s support amplification. The older helper and its reel reference both omitted the native stop. The new corrective path explicitly preserves zero reel inside that stop and is independent of this defect.

A narrow scope/fallback guard is isolated in [draft PR #56](https://github.com/tannerthardy/football-simulation-/pull/56), from PR51, with input-only counterexamples. Review it separately before any active/corrective combination. It does not explain seed5001's inherited+.95s delay: that history has no audited below-stop positive-reel calls. Preserve the original evidence rather than relabeling all changes as recovery or timing failures.

## Validation and next decision

The16 new tests cover moving references, mirrors, unequal partitions, zero load, positive/dissipative work, atomic fallback, multiple contacts, foot-force reconstruction and exactly-once tick fatigue. The full preserved suite on `3f71fea` has **1935 pass/1 retained failure** (1936 total,265.68s);145 Python checks, typecheck and build pass. The sole failure remains the older fast dry-cap phase certificate, expected limited0/actual1. Its16384-piece uncertainty is5.01379e-6 versus1e-6. No test expectation or numerical budget changed. Earlier nine43/52 patch failures, keeper angular-law witness, old .24yd history and wider prototype adverse outcomes remain unpromoted.

Reproduce under Node22 with `node scripts/baseline.mjs --candidate -- node --import tsx scripts/diag/physics/grip-recovery-evidence.ts`; add `--benchmark` for one clock process or `--football` for the declared native contacts. Run the focused `test/grip-recovery-work.test.ts` through the same baseline wrapper. Raw traces/samples stay in ignored `out/grip-recovery-work/`.

**Recommendation:** retain this useful, measured experimental World boundary and review it independently. Do not promote the full patch. The single best next step is for the support owner to trace the earlier issued-command/load amplification using the saved histories with this validated contact path held fixed. Repair the older reel-stop scope before combining solver components.
