# PR180 runtime localization: names/closures before more force solving

Scope: read-only profiling of held PR180 `ddee165fecb8fc88925b4561d4b1837fc1964716`, runtime candidate `aadac6d8b78bd452ff3bb92b337e027bec4a0d25` (full source8ea7dadd), against accepted2c98bed9 (source4273994f). Both engines import immutable archives. The baseline archive also contains one unused diagnostic `world-yaw-response.ts`; all102accepted source files match2c98 byte-for-byte, their accepted-file digest is4273994f, and the benchmark imports ordinaryworld.ts, which never imports that diagnostic. Full archive-directory digest251386a1 is recorded separately rather than mislabeled. No production or archived src edits were made. Node22.23.3, Linux x64, same44baseline settings via baseline launcher, existing Toss/Pass inputs and60ticks each.

This is a CPU/GC diagnosis, **not** acceptance timing: two warmups/six balancedAB/BArounds (reduced from preserved20-round acceptance script), sampled at500us with V8GC tracing. Do not replace the earlier clean paired-p95 failure1.26731 versus1.25 with instrumented results. Native physical histories/capacities/limits are unchanged by this diagnostic.

The first loader-only attempt omitted tsx, failed before any native physics, and is retained as profile-loader-failure.*. The corrected successful profile is yaw-native.cpuprofile; profile-launch.json records exit0. Actual imported archives, not the launcher's mutable root source, define the compared engines.

## Actual hot path

Sampled profile duration7,736.174ms (includes module load, warmup and six rounds):

- Accepted-engine inclusive stacks3,262.342ms; held-candidate3,148.564ms. Different native geometry/controller work means these totals are not an equal-work speedup proof.
- Candidate yaw-response inclusive stacks242.927ms, about7.7% of its engine stacks.
- Repeated generated `__name` frames inside yaw-response consume approximately84ms self. Largest such node48.245ms self/115.025ms inclusive. These are not additional mechanics.
- exit/root-finding frames have only2.701ms self in this sample; more numerical subdivisions/root tuning is not the supported first optimization.
- GC trace389events,401ms total pause,16.88ms maximum. The profile does not attribute all this allocation or GC cost to yaw. It establishes a real source of paired-wall-time variability, not a waiver of the tail gate.

`tsx` uses esbuild keepNames. Representative emitted source (`held-yaw.keepNames.js`) visibly creates and names aOf on every integrateYaw call via Object.defineProperty, names mode/exit on fallback, and allocates/names flow per free segment. Closures also capture the mutable solver context. The certified fast return still pays the initial aOf closure/name operation. Moving pure helpers to module scope and isolating a closure-free hot certified path attacks demonstrated overhead while keeping the same model.

## Smallest supported change

1. Inline the initial acceleration arithmetic or use a module-scope pure helper; avoid named local callback construction before the fast return.
2. Keep pure reusable slow helpers at module scope where practical. Separating fallback can prevent the hot function carrying its mutable closure context.
3. Preserve exact existing free-flow arithmetic, extrema, torque peak, event order, limits and fallback. No new force law or fixed tolerances. Preserve external overspeed, zero allowance and saturation boundaries.

Do not change TSX/runtime just to make the benchmark favorable. A source-level allocation reduction benefits this measured development runtime and does not assume compiled-production costs are identical. Do not pool mutable result/event arrays across calls unless ownership is proved; callers may retain them.

After a concrete optimization, repeat existing direct numerical/loaded controls and one native parity replay, then run the unchanged declared uninstrumented budget on an idle machine. No new physical cases, football campaign or full suite is needed for this diagnosis. Parent owns code, source review and adoption.

Artifacts: profile-summary.json, summarize-profile.py, profile-native.ts, profile-native.log, yaw-native.cpuprofile, held-yaw.keepNames.js, profile-launch.json. The old failed benchmark/evidence remains untouched.
