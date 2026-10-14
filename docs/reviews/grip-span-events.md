# Mixed-span reversal engineering checkpoint

2026-10-14 (America/Phoenix). Tested code/harness **`7b3d5e3db4da1bb907fe570bced216faa8e5027e`**, from preserved [PR #40](https://github.com/tannerthardy/football-simulation-/pull/40) `9a9d1b9`. Comparison baseline stays **`4ded6b6`**. Runtime source `f0879d09…` is unchanged from PR #40; this does not designate a new engine baseline. The [receipt](../../data/reviews/current/grip-span-events.json) pins code, exact flags, the unchanged [six-input manifest](../../config/grip-mixed-span-inputs.json), reference settings, checks, clocks and profiles.

**Decision: preserve this precise diagnostic, and reject World integration at this checkpoint.** All six ordinary 4.166667ms cases now pass the original accuracy gates and independent reference refinement, including the previously failing tangent reversal. Cost improves roughly fourfold, but mixed medians remain **2.16–2.62ms against 2ms**, and one run exceeds the 5ms p95 target. No native support, recovery, fatigue application or football benefit is claimed.

## Cause and numerical change

The retained [PR #40 investigation](grip-mixed-span.md) identified a kink in the absolute tangent-force dose when force reverses near .806ms. Uniform refinement missed the dose tolerance even though motion, work and signed impulses agreed. Its curved-return reference was also unconverged. No football or support law needed to change to resolve this particular failure.

The new diagnostic keeps the same passive, below-slip normal spring/damper and sticking tangent field. It changes only numerical integration:

- Local DOP853 steps use its published embedded 5/3 estimate. Every component, including normal/tangent doses, is checked rather than averaged across dimensions. Local estimates share a summed **1/32** budget; final comparison allowance remains **1/16** with unchanged physical tolerances.
- A safeguarded zero search splits the **whole state** at the tangent reversal. Body travel/yaw, material/foot motion, impulse and temporal moment, work, spring energy, damping and dose advance on the same clock. It does not repair just the dose counter after the fact.
- Accepted endpoint derivatives and constant coefficients/error scales are reused. The prepared force provider uses the original elimination arithmetic; unchanged model checks retain target/power validation, and the original early cap guard prevents rejected stages from entering capacity diagnostics.
- Logical work is bounded by 4096 field evaluations, 256 pieces, 24 retries per piece, four events and twelve root trials. Invalid brackets, unsupported phases and exhausted budgets refuse. This is not a proven wall-clock fallback bound.

The independent reference uses the existing SPD force provider, RK4 and bisection on the full state. It shares the physical coordinates/ODE, but not the candidate's force arithmetic, stepper or root routine. The original uniform candidate/reference are preserved. The only edit to their shared RK table module is an export; original coefficients and step arithmetic are checked byte-for-byte against PR #40.

Scope remains **one passive lower grip**, zero desired motor/reel, retained fixed hold/share, below .98 of the unchanged shared vector capacity. Active reeling, slip/saturation, multiple contacts, changing support/recovery, collision/release and native fatigue are unsupported. No runtime code, capacity, recovery law, production flag, awareness feature or existing test expectation changed.

## Matched evidence, including adverse results

All six 200µs cases still pass 128/256 independent refinement. All six **4.166667ms** cases pass 2048/4096 refinement and candidate/reference comparison:

| Ordinary case | New normalized error | Reference refinement | Field evaluations, old → new |
| --- | ---: | ---: | ---: |
| Loaded mixed | .042649 | .043569 | 3000 → 690 |
| Curved loading | .041768 | .026427 | 2999 → 821 |
| Curved return | .005858 | .010649 | old refusal → 740 |
| Radial control | .005374 | .001039 | 185 → 39 |
| Zero-span control | 0 | 0 | 39 → 15 |
| Fresh curved | .008950 | .004548 | 3000 → 774 |

The limit is **.0625** for both comparison and refinement. Candidate and reference independently find one return-case event at **.806284947ms** and **.806284944ms**. Its absolute tangent-dose discrepancy is **1.62e-12**, below the unchanged **6.25e-11** allowance. Normal force remains tensile. Maximum total-energy residual is **5.18e-13** and angular-momentum residual **2.56e-13** in the declared cases; common-motor composition, potential transport and impulse/moment representation also retain their gates.

Some numerical agreement becomes less precise while staying inside the original acceptance limit: loaded mixed .023893 → .042649, curved loading .030734 → .041768, radial .002187 → .005374. The method has not been claimed uniformly more accurate. No native football endings were compared, so improved mechanical agreement is not an outcome gain.

**27 focused checks and typecheck pass** on the tested revision. Eleven new checks cover six ordinary references, original force algebra/guards, reflection/proper rotation through reversal, unequal intervals across reversal, zero/tiny loads and scope refusals. Twelve preserved PR #40 checks and four equal-effort/fatigue-path checks pass unchanged. Physical dose is integrated once here; application through a new World fatigue interface remains untested.

The old ordinary curved-return candidate still refuses with `Mixed span accuracy budget`; its original uniform 2048/4096 reference discrepancy **.085203** still fails. These failures remain in the receipt, alongside the passing new reference. The nine unrelated experimental patch failures remain **43/52**, reused as separate evidence rather than rerun or reattributed. Keeper angular-law, support-history drift and awareness comparisons remain independent.

During development, reference evaluation counting and duplicate detection at an approximate zero were corrected. Focused checks then caught a capacity-reporting error after introducing the prepared provider: rejected overshoots entered a maximum diagnostic; the original early guard was restored. Two new test assumptions were corrected: material coordinates remain local under global rotation, and zero force can be valid with tiny capacity. Raw failed logs are retained; no physical acceptance or old expectation was loosened.

## Repeated actual cost and dominant work

Two serial processes on the same EPYC9V74 / Node22.23.3. Each case uses five warmups and 21 repetitions with rotating method order. Preparation is outside the clock; no test, observer or profiler runs alongside timings. Original uniform, new event/local and refined event-reference methods use identical ordinary inputs.

| Ordinary operator | New median ms, two runs | New p95 ms, two runs | Old median ms, two runs |
| --- | ---: | ---: | ---: |
| Loaded mixed | 2.321 / 2.160 | 5.359 / 2.484 | 9.910 / 9.028 |
| Curved loading | 2.542 / 2.618 | 4.444 / 2.909 | 9.611 / 9.351 |
| Curved return | 2.338 / 2.398 | 3.326 / 2.994 | 9.520 / 9.187, refusal |
| Radial control | .134 / .140 | .304 / .235 | .570 / .594 |
| Zero-span control | .077 / .082 | .185 / .273 | .157 / .142 |
| Fresh curved | 2.386 / 2.377 | 5.804 / 3.148 | 9.678 / 8.754 |

All four mixed medians fail **2ms** in both processes; loading/fresh p95 also fail **5ms** in the first. Worst new observed time is **17.692ms** (curved loading, first run), versus **3.341ms** for the worst new second-run sample. These tails are retained, not discounted as noise. The old uniform has a 123.073ms sample; relative speed is not acceptance. The refined RK4 oracle costs roughly 66–78ms median. No candidate refusal occurs on the six inputs, and unsupported-scope refusal/fallback cost through World is not established.

A separate 500-operator ordinary curved-loading profile (5087 samples, 100µs period) assigns about **35%** self samples to RK stage/state arithmetic, **6%** to its embedded estimate, **25%** to frame accounting/guards, **10%** to geometry, **5%** to the bounded material map, **4%** to force elimination and **6%** to GC. The force provider is no longer the main cost. Repeated full-World solving has already been removed; the remaining expense is inside the reduced integration kernel.

## Recommendation and single next step

Keep the event/local candidate as a reviewed diagnostic alongside the corrected slow and uniform references. **Do not add mechanics, insert it into World, run a football campaign, combine awareness or promote the full patch.** The engineering checkpoint failed cost despite passing accuracy.

The single best next numerical feasibility question is whether RK stages can advance only the dynamical coordinates and accumulate the ledger quadratures from the same force stages. Those ledger states do not feed back into this declared ODE, yet the current stepper repeatedly forms them at every stage. Test that representation against this reversal and the radial opposing control with every motion/attachment/work/dose gate unchanged. Require the same per-input **2ms median / 5ms p95**, retain the observed tail/refusal question, and stop if it cannot meet them. This is a bounded representation change, not a request for another contact law. Broaden to the six inputs only after that first comparison earns it.

Only after accuracy and cost pass should a minimal experimental World interface be coordinated with the support owner and tested on matched successful/failed native contacts plus a fresh input. An integration owner must then claim the preserved full suite on the exact combined candidate.

## Reproduction

The focused tests use the committed input manifest. Evidence collection additionally reconstructs the immutable acquired packet from ignored `out/grip-timing/`; missing or mismatched packets fail before measurement. No new snaps or favorable fixture regeneration occurs.

```sh
node scripts/baseline.mjs --candidate -- npx vitest run --project core test/grip-span-events.test.ts test/grip-mixed-span.test.ts test/grip-effort.test.ts --maxWorkers=1
node scripts/baseline.mjs --candidate -- npm run typecheck
node scripts/baseline.mjs --candidate -- node --import tsx scripts/diag/physics/grip-span-event-evidence.ts
# Serial, no competing tests/profiler:
node scripts/baseline.mjs --candidate -- node --import tsx scripts/diag/physics/grip-span-event-evidence.ts --benchmark --output=out/grip-span-events/benchmark-repeat.json
node scripts/baseline.mjs --candidate -- node --import tsx scripts/diag/physics/grip-span-event-evidence.ts --profile --output=out/grip-span-events/profile-repeat.json
```

Raw states, failed development logs, samples and profiles remain in ignored `out/grip-span-events/`; the compact receipt hashes them. No broad game/full-suite run was needed for this isolated diagnostic decision.
