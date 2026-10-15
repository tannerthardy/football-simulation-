# First saved slip-change interval: local force/work proof, no World adoption

The first saved C/NT slip change now has a passive two-phase force history
that agrees with an independent closed-form reference for motion, impulse,
temporal moment, work and absolute force amount. This closes one **frozen-frame
local question**. It does not fix the full World interval or establish a
football benefit. PR68's adverse work-convergence result remains a hold.

Chosen implementation and final checks: `a4c0333691bbbcade05915e91fa1f61759ac123b`,
source `89cda7c5847606b961aee7f1babd4e9397ddad2f3ff4b3c215b7282291f187eb`.
The simpler kernel was first committed at `e06ec62`; a measured refactor at
`e0f502d` was rejected and restored without rewriting history.
Base: PR68 `41f06673ec0c4575ecde125114abaa85ba1b000f`.
[Compact evidence, exact settings and cost receipts](../../data/reviews/current/local-slip-work.json).

## What caused the local discrepancy

Replay the original .35–.40 s packet with its original remaining-tick deadlines,
not a restarted World at the selected timestamp. The extractor verifies complete
body/report identity against an unobserved replay. Its first positive
constant-concurrent-force hand-work estimate is the inner field at **.3625 s**,
lasting **4.166667 ms**. Both ground yaw motors remain saturated in this field.

A single mean tangent force brings the final slip to zero and gives the right
net impulse, but initially acts **with** the positive slip. The physically
passive force must first oppose slip at the existing cap, reach zero after
**55.4954 microseconds**, then hold zero slip with the smaller opposite force.
The change is a force-selection event, not a capacity increase, recovery retune
or post-hoc work relabeling.

| Quantity, selected local field | Constant mean force | Event-aware history |
| --- | ---: | ---: |
| Net tangent impulse, kg yd/s | +.165463890 | +.165463890 |
| Initial force, kg yd/s² | +39.711334 | -398.834200 |
| Force after zero slip, kg yd/s² | +39.711334 | +45.631123 |
| Hand work, kg yd²/s² | +.000351711 | -.000047047 |
| Absolute force amount, kg yd/s | .165463890 | .209730836 |

The old **ordered** ground-then-hand ledger instead reports **-.002359357**
for this field. That is a third quantity, not the constant-concurrent estimate
in the table. A negative ordered ledger alone does not validate the within-step
force history. The event-aware temporal moment is **.000294013790 kg yd**;
it differs from applying the same net impulse uniformly over the interval.
Future effort accounting must use the absolute force amount, not absolute net
impulse; this module does not apply World fatigue or effort.

## Small supported implementation

[`integrateLocalSlip`](../../src/physics/local-slip-work.ts) is an isolated
two-body tangent kernel, **not imported by World**. It uses the saved tangent,
moment arms, constant leg forces, existing tangent cap and saturated ground
yaw torques. It finds the zero-slip event analytically and integrates at most
two constant-force phases. The same phases produce body travel, yaw, impulse,
temporal moment, hand/ground work and absolute force amount. No velocity
projection or work clipping is used.

The existing motor target and remaining tick time are retained. The kernel
checks the saturated motor regime throughout each phase; a motor transition
or controller deadline returns an explicit unsupported result without changing
the input. The **next actual saved field, at .366666667 s, returns
`ground-motor-transition`**. It is not approximated by holding the old torque.

This is conditional evidence for a frozen force frame. Moving geometry,
material attachment motion, normal/tangent shared-budget recomputation,
multiple contacts, support allocation and exactly-once World fatigue remain
outside this kernel. No new flag, default, World path, controller policy,
player capacity or recovery law was added. A future adapter must deliver the
phase motion and accounting together; replacing only the reported work would
not be this correction.

## Correctness and opposing evidence

The saved input and an independent **70-digit Python Decimal** closed-form
reference were committed at `d90993d` before the JavaScript implementation.
The reference imports no engine code. A separate **100-digit** evaluation
rounds to the same doubles. This is a reference for the stated constant-field
law, not an oracle for the complete moving World.

- Selected field: maximum motion/reference discrepancy **3.56e-15**;
  work/energy closure residual **7.84e-15**.
- Opposing saved sliding field at **.35 s**: stays at the existing force cap
  for the entire interval, retaining net impulse **-1.661809165** and
  concurrent hand work **-.947109979**. Maximum motion discrepancy **7.11e-15**;
  work/energy residual **2.43e-14**.
- Three unequal partitions for both fields agree in motion, work, impulse,
  temporal moment and absolute force amount within **7.11e-15**. Each phase
  is passive and remains within the supplied cap; total absolute impulse
  remains within cap times elapsed time.
- True reflected geometry, zero time, zero/tiny force and rejection of the next
  motor regime are covered. No input mutation or hidden extra effort occurs.

**29 distinct focused checks passed in this pass**: 11 new local checks and
18 unchanged PR68 coupling controls. The final chosen source's 11 checks and
typecheck also passed. The three initial test failures were a parameter-table
invocation error (`parts is not iterable`), corrected without changing physics
or tolerances. All failed/rejected receipts remain indexed. No full suite,
native tackle panel or games were run: World behavior is unchanged here.

## Measured cost and rejected optimization

Same machine, Node **22.23.3**, no competing collectors. Each benchmark has
1,000 warmups per case/kernel and two interleaved passes of 101 samples per
case. Timings exclude diagnostics/profiling; a call includes validation,
state copying and result construction. The local engineering target remains
**median <=10 microseconds, p95 <=25 microseconds**. This is a per-kernel
feasibility target, not a whole-World runtime certificate.

| Chosen kernel, compiled ES2022; four passes | Median µs | p95 µs | Observed maximum µs |
| --- | ---: | ---: | ---: |
| Selected slip event | 3.876–4.156 | 4.487–5.118 | 56.675 |
| Sliding control | 3.685–3.876 | 4.287–5.068 | 131.548 |
| No-hand control | 3.536–3.755 | 4.087–4.476 | 19.629 |

Both independent compiled comparisons meet the median/p95 target across all
three cases. Tail maxima are retained; the **132-microsecond** observed worst
call is not concealed by favorable medians. These are small-sample observations,
not a worst-case bound or budget for the full pair/World pipeline.

The original TSX runner instead measures **11.10–11.30 microseconds median**
on the selected field and misses the median target. Profiling identified
transpiler function-name bookkeeping for per-call closures. Lifting helpers
improved TSX medians to **2.68–5.47 microseconds**, with one selected-case
**33.2-microsecond p95 / 3.381-ms maximum**; a later pass had a 336-microsecond
selected maximum. These adverse tails remain in the receipt.

An actual compiled-JavaScript comparison gives **no speed benefit** from that
refactor: its selected medians are **4.00–4.26 microseconds**, and its observed
maximum is **381.654 microseconds**. Every compared physical output is bit
identical. Retain the simpler original implementation; do not claim a
production speedup from a TSX-specific effect. The tooling-dependent cost
difference and unexplained tail variation remain explicit.

Indexed launcher commands total **41.743 s**, including failures, profiling,
both implementations, repeated checks and typechecks. Independent Python
reference generation and report preparation are outside that subtotal.

## Handoff and next decision

Preserve this as a narrow experimental proof. **Do not adopt it into World
yet, and do not declare PR68's full-interval work hold resolved.** The next
bounded question is the saved **.366666667 s ground-motor regime transition**:
can the existing motor law be integrated through that event with the same
force/work/motion agreement and practical cost? Reuse this sliding control
and independent references. No new mechanics or football campaign is needed
to answer it.

Run's [4f90b64 helper adjudication](https://github.com/tannerthardy/football-simulation-/blob/4f90b6428b98224774bbd63a4adad6bb3e354b53/docs/reviews/helper-contact-adjudication.md)
remains independent. Its feasible collection-route errors, compatibility
hashes and disputed helper expectations were not changed. The seven original
affected assertions and historical nine patch-gate failures remain retained;
this result neither groups their causes nor claims to repair them.

Production defaults, all44 baseline flags/components=1 and historical
`4ded6b6` stay unchanged. Fetched develop `8c891f4` has unchanged physics
relative to approved `a1b16e6`; this deliberate saved-input experiment is not
a combined verification of newer controllers.

Reproduce with pinned Node and baseline flags:

```sh
python scripts/diag/physics/local-slip-reference.py out/slip-work/reference100.json 100
node scripts/baseline.mjs --candidate --receipt out/slip-work/replay.receipt.json -- node --import tsx scripts/diag/physics/local-slip-work.ts
node scripts/baseline.mjs --candidate --receipt out/slip-work/compiled-replay.receipt.json -- node scripts/diag/physics/compiled-slip-cost.mjs
```

The recorded reference is already tracked; the 100-digit output is ignored.
The compiled comparator pins both preserved implementation commits, asserts
identical outputs and excludes TSX instrumentation. The extractor in
[`save-slip-field.ts`](../../scripts/diag/physics/save-slip-field.ts) reuses
the original saved packet and simulates no new plays.
