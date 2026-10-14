# Affordable passive grip in World — experimental

2026-10-14 (America/Phoenix). Numerical implementation/evidence: `cb26be6`; World implementation/evidence: `9d18495`; final test typing/checks: `df0db63`. Runtime source **`ac38c4b7…`**. Comparison baseline remains **`4ded6b6`**; no default or baseline promotion. [Numerical receipt](../../data/reviews/current/grip-span-kernel.json), [World receipt](../../data/reviews/current/grip-passive-world.json), [World inputs](../../config/grip-passive-world-inputs.json).

**Result: a measured World prototype for the supported passive scope. Broader integration is blocked.** Accuracy and cost now pass; native support, material travel and exactly-once work/dose/fatigue are checked. Live tackle inputs still require unsupported active channels. A separate default-off transport correction changes native trajectories and requires review. The preserved full suite also exposes eight inherited failures, reproduced on untouched PR #43.

## What changed and what passed

- RK intermediate stages advance only body/material/foot/time coordinates; every ledger still receives its original final quadrature/error estimate. Combining derivative scalars directly avoids large temporary frame objects. All six short/ordinary outputs, events and guard statistics match [PR #43](https://github.com/tannerthardy/football-simulation-/pull/43) exactly. Compatible independent references are reused by hash. The implementation additionally executes one preserved-model initial guard; actual clocks include that setup.
- The experimental callback receives copied physical inputs and returns a whole interval. World validates pose/impulse/moment, attachment, capacity, work/energy and angular identities before committing. Rejection leaves native execution intact. Ground drive/yaw, active reel/recovery, possible impacts and multiple joints refuse. Internal RK pieces do not become World/support/fatigue steps.
- World consumes integrated body/motor work and force dose once, keeps the native load/support/release/fatigue lifecycle, and skips duplicate free motion/material transport. Three supported controls (radial, actual reversal, zero) agree with independent 2048/4096 references through the same native support boundary. Worst normalized error **.005858**, allowance **.0625**; support-state discrepancy below **3.85e-15 yd**, fatigue identical. Mirror, actual cap refusal, invalid/unsupported results and a 200ms zero-load hold at12/96 steps pass. Loaded long histories remain unproved.

The World fixtures retain **PR43's declared passive loading/stopping transforms, including zero reel**, prepared poses/material/hold/offset, original profiles, energy and capacities, with fresh inside-base support history explicitly declared. Matching commands use the real native ground/support machinery; no mobility prescription or free-ground override is installed. They are mechanical interface evidence, not unmodified football plays. The four native plays below retain their actual reel/drive requests. Existing support/recovery/kinematic laws, capacities, awareness and all43 environment flags are unchanged.

## The ownership defect found at integration

The original patch material loop visits every grasp while stepping any island. A held foot's stale achieved velocity can advance its material point during an unrelated group's time, despite no held-body/foot displacement or grip work. The minimal receipt shows material displacement **8.57e-5 yd** with held pose/foot offset unchanged and zero grasp work.

`materialTransport: 'owned'` adds the missing held-body membership check. It is **separately opt-in**, and the prototype requires it. Production retains the existing behavior pending review. Test each correction alone: legacy host → ownership only → ownership plus kernel. The solver is an injected diagnostic implementation; it is not automatically loaded by the engine.

```ts
new World(bodies, {
  handContact: 'patch', materialTransport: 'owned',
  passiveGrip: spanKernelInterval, // scripts/diag/physics/grip-span-kernel-interval.ts
});
```

Only one global live lower grasp, zero active requests, below-slip geometry and intervals≤4.166667ms are supported. This does not finish tackling or validate active/sliding/multiple-contact forces, loaded recovery histories, the keeper law or the earlier .24-yard divergence.

## Actual cost and native evidence against promotion

Two serial processes, Node22.23.3 / same EPYC9V74; five warmups,21 repetitions, rotating methods, preparation outside clocks and no competing tests/profiler. All six numerical inputs pass **2ms median /5ms p95**: mixed medians **.760–1.070ms**, p95≤**1.458**, worst repeated **1.640**. An exploratory startup tail **9.840ms** remains recorded. Zero-span numeric overhead increases slightly (.05→.085ms); favorable mixed cases do not erase that control.

| Complete World operator | Median ms, two runs | p95 ms, two runs | Worst ms |
| --- | ---: | ---: | ---: |
| Supported radial | .669 / .648 | 1.398 / .901 | 2.105 |
| Supported force reversal | 1.280 / 1.187 | 2.676 / 2.802 | 4.009 |
| Supported zero | .305 / .255 | .502 / .477 | .645 |
| Fresh input, yaw scope refusal | .143 / .170 | .280 / .292 | 1.008 |

These meet the declared scope budget. A formal wall-clock fallback bound or game-wide cost is not established. The ownership-only host is cheaper (.22–.31ms on supported examples) but still uses the old stored-energy/work limiter; that speed is not equivalent accuracy.

Four full native contacts at96 substeps preserve matched inputs and saved legacy results: successful front, censored angle and mirror, fresh successful angle. **Kernel invocations: zero**; active reeling remains outside scope. Combined results equal ownership-only results exactly. Two tackles and two censored endings remain, with material trajectory changes: front advance .448973→.449062 yd; censored angles22.274864→24.199731 yd; fresh13.319271→14.405497 yd and contact-to-end2.05→2.90s. These are not new-solver football gains. The fresh containment change is retained as adverse evidence.

One targeted fresh replay finds the first fork at **2.7s**, with identical pre-step physical history and issued inputs. Legacy moves the held point about **.00223 yd** during the unrelated island; ownership-only leaves it unchanged. This establishes the source of the first change, not that every later ending is better or that another contact law is reliable. Keep both options off until reviewed.

## Validation blocker and recommendation

Focused numerical/reference checks pass20; World/effort checks pass16. The integration owner ran the preserved full suite once on9d18495: **1883 passed,8 failed**, plus **145 Python passes**. All eight failures reproduce on untouched PR43: seven synthetic reference fixtures lack attachment coordinates now read by the convergence gate; the older fast dry-cap control exhausts its limit. They are separate from the retained **nine43/52 patch failures**. No assertion was removed or repinned.

The first full run also caught one new test typing error on optional facing. The equivalent body-facing expression is corrected atdf0db63;12 World checks, typecheck and build then pass. Runtime source is unchanged, so costly simulations/full suite were reused rather than repeated. The original failed run remains in the receipt.

**Retain this as an experimental World candidate; do not merge/promote it or designate a baseline.** The immediate integration prerequisite is resolving the inherited validation failures without weakening the convergence gate. The next physical scope question is one saved native interval with its existing active reel and ground forces, using the frontal opposing control. Do not remove those requests to manufacture invocation, add new mechanics or resume passive micro-tuning: cost is sufficient, supported scope is now the constraint.

Reproduce with the baseline launcher: `npx vitest run --project core test/grip-passive-world.test.ts test/grip-effort.test.ts --maxWorkers=1`; World evidence uses `node --import tsx scripts/diag/physics/grip-passive-world-evidence.ts` and serial `--benchmark --output=out/grip-passive-world/repeat.json`. Tests use committed fixtures; native evidence additionally requires the immutable `out/grip-timing/baseline.json` manifest. Raw states, clocks, parent failures and targeted traces stay in ignored `out/`, hashed by the compact receipts. Full-validation wall time was approximately295s; no broad game campaign was run.
