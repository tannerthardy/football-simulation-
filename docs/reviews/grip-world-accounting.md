# Complete World grip accounting and stored-span release

2026-10-14 (America/Phoenix). Tested code/harness `0e6b95a5cf6370e1a75464ab20eb7def91edcddc`, from preserved [PR #33](https://github.com/tannerthardy/football-simulation-/pull/33) `abf0e1c`. Comparison baseline remains **`4ded6b6`**. [Compact receipt](../../data/reviews/current/grip-world-accounting.json) pins source, all flags, World options, inputs, hashes, checks and raw evidence. No runtime source, capacity, recovery law, flag/default, awareness code or existing expectation changed.

The complete-interval check found a specific missing energy source. World already combines normal and tangent corrective-foot work correctly in these witnesses. But a loaded passive grip cannot return its stored span energy at rest: its restoring target is rejected as positive passive work. Timing refinement cannot restore a force that is always rejected.

## What the complete operator does correctly

Reuse the acquired angled packet and frontal opposing control, retaining their issued ground plans and active pull request. Advance one **4.166667ms** World interval in 12 physical pieces, with no new football decisions. Both actually attain zero reel; the angled grip transmits tangent force, and the frontal control transmits none. Their observed/unobserved body, joint, report and clock endpoints are identical.

The third control reuses the declared `.3/16` mixed input, curved material point and existing prescribed corrective mobility from [the mixed-budget study](grip-mixed-budget.md). It transmits both normal and tangent loads through the complete World operator. An independent observer reconstructs the material load Jacobian and aggregate foot impulse. It checks body impulse work, one common motor's work, passive work and physical force dose against World's reports. It does not use World's work limiter as the accounting oracle.

| Interval | Normal impulse dose | Tangent impulse dose | Common-motor cross work | Body energy residual |
| --- | ---: | ---: | ---: | ---: |
| Native acquired angled | 0 | 5.545526 | 0 | 1.90e-12 |
| Native frontal opposing control | 0 | 0 | 0 | 2.51e-13 |
| Declared mixed control | 7.028368 | 5.210055 | +0.03755345 | −3.50e-12 |

Motor/channel ledger discrepancies are below 7e-16 in these inputs. Force dose is counted once per actual row interval, and the existing normal/tangent circle capacity holds to rounding. Summing isolated normal and tangent motor work would miss the mixed cross term. The current complete operator includes it. These are accounting checks; they do **not** prove that its force allocation or football decisions are right. Earlier independent force/timing references remain unchanged.

## First failed restoring event

Use the same acquired angled grip and its mirror, preserving its `.170625` lower share, 2267.004731 capacity, actual material point, masses and inertia. Isolate ground, prescribe its existing support slope with desired velocity zero, and turn pull off. Load it radially at `.1 yd/s` for 2ms / 128 physical pieces. No slipping or release occurs. Then an explicitly external stopping operation removes body translation and yaw without resetting the rest span or attachment. This is a mechanical transform, **not** a native football ending.

The retained extension is **0.000148395740 yd**, storing **0.000832196944** in the reduced energy units (kg·yd²/s²). The existing 6Hz / .8 normal softness implies:

```
B = 1/ma + 1/mb
k = (2π·6)²/B
d = 2·.8·2π·6/B
U = k·max(distance − hold, 0)²/2
```

At rest, `solveGrasp()` requests restoring tension. `supportImpulse()` finds positive body-minus-motor work and a zero passive-channel allowance, so it rejects the entire impulse. Original World remains exactly motionless at every tested refinement. Its kinetic work ledger still closes. That ledger alone cannot certify the physical spring response.

The independent radial reference uses the existing moving bounded material map, `r=L*tanh(z/L)`, and its derivative. With `J=share*r'` and `M=mobility*J²`, it solves:

```
F = −(d·v + k·extension)/(1 + d·M)
separation' = v; v' = B·F
material' = share·mobility·J·F
body power = F·v
motor power = −M·F²
damping loss = d·(v + M·F)²
```

It integrates impulse, temporal moment, dose, attachment and raw foot travel with independent RK4, refined 64/128. Body kinetic change + spring-energy change − motor work + damping loss closes below 1e-11. No force/World work solver is called by this reference.

## Narrow diagnostic correction

`withSpanReserve()` funds the existing normal target from the **actual current stored span energy**, once per physical interval. It retains the original force solver, softness, circle cap and material/support transport. The reserve is explicitly separate from dissipative credit and active arm work. A completed interval must pass its actual total-energy budget. Mixed/active/multiple/phase-changing release, non-rest initial motion and long physical pieces are refused. A refused diagnostic state is not an accepted candidate.

On the **1µs** release, eight World pieces match the independent reference at the unchanged strict mechanical tolerances and `1/16` refinement allowance:

- Both loaded mirrors: original normalized error **17,541.97**, candidate **.05735**, independent reference refinement **1.49e-8**.
- Restoring impulse/dose: reference **8.77098423e-6**, candidate **8.77095555e-6**. Actual attachment and foot motion, body work, motor work and temporal moment agree as well.
- The normal release returns stored energy; positive reported passive transfer is now physically funded. Actual total energy after motor work decreases, as required by damping. It charges no active arm work and never refills a reserve within the eight numerical row passes.
- Both zero-extension controls remain unchanged. A plastic rest reset deliberately removes stored energy before those controls; it is not credited as grip work.

Six focused contracts plus the four preserved fatigue partition checks pass; typecheck passes on the exact code revision. The actual World step contract also verifies aggregate force dose and motor/passive work. Reused ordinary/local-sweep/resolved/fast fatigue tests cover equal physical effort over equal time. This does not claim a new fatigue comparison across native altered contacts.

**Retained adverse result:** at **200µs**, 128 funded World pieces still differ from the same refined reference by **142.48 normalized units**, chiefly impulse/dose. Relative velocity already looks close (about 1.34e-9 yd/s difference); that does not make the strict impulse/dose failure pass. No tolerance was relaxed. The reserve demonstrates the missing energy source, but repeated original normal solves are not an accepted practical integrator for that longer interval.

## Measured cost and next decision

Two serial processes on Node22.23.3 / EPYC9V74; five warmups, 21 repetitions per method, rotating order. Preparation, ledger observers and profiling are outside the clocks. Each clocked operator uses identical prepared inputs within its comparison.

| 1µs stored-span operator | Median ms, two runs | p95 ms, two runs | Largest observed ms |
| --- | ---: | ---: | ---: |
| Original World, 8 pieces (wrong restoring force) | .201–.275 | .395–.500 | .682 |
| Funded World, 8 pieces | .383–.466 | 1.071–1.581 | 2.259 |
| Independent radial RK4, 128 pieces | .233–.269 | .745–.965 | 1.423 |

Funded zero-span medians `.207–.251ms` are slower than unchanged World's `.129–.198ms`; this guard/reserve overhead is retained. The narrow release meets the stated **2ms median / 5ms p95** screen, at roughly 19–23% / 21–32% of those limits. It covers only 1µs. There is no affordable accepted 200µs or ordinary 4.166667ms funded interval, and no measured fallback worst-case claim against the 10ms bound. These costs cannot establish a practical football solver.

A separate profile excludes preparation and observes 400 funded operators / 331 samples at 500µs sampling. World interval/contact/support work accounts for over half the reported self samples; the diagnostic interval guard is 17.5%, GC 7.9%. This is a profile of this correction, not a new profile or cost claim for PR #33's different two-grip candidate. Repeated World advances are still the costly route to finer normal impulse timing. Removing acceptance guards would not repair their accuracy failure.

**Recommendation:** preserve this candidate as diagnostic evidence; do not integrate it or run a football campaign. The single best next step is one bounded **passive mixed normal/tangent interval with stored span energy**, accounting for that energy once alongside the common motor and shared capacity. Start with this loaded checkpoint, zero-span control and existing mixed input. Resolve that physical accounting boundary before optimizing its within-interval force/time integration. Then use the same references to replace unnecessary whole-World subdivisions. Active/multiple contact energy and normal-cap transitions remain unproved.

The nine patch failures remain **43/52**. Keeper angular-law and support-history issues remain separate. No awareness comparison or football benefit is asserted, and no baseline/default is promoted.

## Reproduction

Requires the immutable packets and manifest in `out/grip-timing/`; the receipt pins their SHA256 checksums. The collector refuses replaced inputs or mismatched settings. Raw packets, profiles, timing samples and development failures stay under ignored `out/grip-world-accounting/`. The ordinary CI contracts do not require those saved files.

```sh
node scripts/baseline.mjs --candidate -- node --import tsx scripts/diag/physics/grip-world-accounting-evidence.ts
node scripts/baseline.mjs --candidate -- npx vitest run --project core test/grip-span-accounting.test.ts test/grip-effort.test.ts --maxWorkers=1
node scripts/baseline.mjs --candidate -- npm run typecheck
# Run these serially, without other tests/profilers on the machine:
node scripts/baseline.mjs --candidate -- node --import tsx scripts/diag/physics/grip-world-accounting-evidence.ts --benchmark --output=out/grip-world-accounting/benchmark-repeat.json
node scripts/baseline.mjs --candidate -- node --import tsx scripts/diag/physics/grip-world-accounting-evidence.ts --profile --output=out/grip-world-accounting/profile-repeat.json
```

An initial test-only observer nesting error bypassed its interval initialization; it was corrected without changing physics or expected outcomes. Type declaration failures were also corrected before the pinned checks. Development outputs retain that history. No broad suite or games were necessary for this diagnostic branch; the integration owner retains responsibility for the preserved full suite on an exact combined candidate.
