# Current accepted run-build review / runner-side free recovery

Accepted base: `f4146275ce7539816bf57b4ed55a0d2be10e48c7`; integration queue `df4ee4dfe58aed5bd357ce3d2e3b73074eae5356` (both re-fetched unchanged before publication).
Code: `codex/run-current-build-review`; the exact code commit is in manifest.json.
The final source is `1e56ab2a063d0ba2fbb542a7ca7a7227aec821f20a53339a569a6758e9ed87c0`; accepted source is `7d23555ad67094fbe2e79726d9b761dd5f068c06fb90ff0796ec61c953750197`.

This is saved native all22 evidence, not a collection request. Reuse it first.
Run `sha256sum -c SHA256SUMS`, then extract common.tar.gz to a tools directory and only the required raw archive. Every archive member/hash is also in manifest.json. No symlinks, absolute paths or parent escapes. The final candidate changes only blocking.ts. Contact-controller/API trials and all rejected variants remain evidence only; never apply them as one bundle.

## Smallest reproduction if a new execution is necessary

Use Node22.23.3, Linux x64, and the unchanged lockfile. Create a new detached worktree at manifest.codeCommit from the publishing repository. Do not move another worker's checkout. Reuse compatible dependencies or run npm ci once. Copy tools/free-path-collector.mjs to its scripts/diag/climb-approach.mjs. This is passive recording of existing calls; no additional sim.see or random draws. The original collector differs only by omitting the workPicture logging field, not behavior.

From that candidate worktree, with absolute TOOL_DIR pointing to the extracted common archive:

```
node scripts/baseline.mjs --candidate --receipt out/runner-side-recovery/R01-launch.json -- node --import tsx scripts/diag/climb-approach.mjs run out/runner-side-recovery/R01 R01 5 "$TOOL_DIR/fresh-inputs.json.gz" native
```

Use the same command for C01 with tools/inputs.json.gz as the opposing protected climb/keeper case. The stored accepted baseline is already complete; do not collect it again. Fresh R01/R02/GHC are in fresh-inputs.json.gz; Z06/Z13/Z14/Z16/Z19/Z26/C01/C02 in inputs.json.gz. All full setups, selected profiles, IDs, seeds and installations are frozen and asserted by hash before ticking. At most six cases per command; 30 seconds batch / five seconds per case; five simulation seconds. Z26 is live at the horizon on both final sources, with terminal gain=null.

The directly affected checks are recorded in focused-final-launch.json (94 pass) and typecheck-final-launch.json. The initial failed test receipt/log and original fixture code preserve the default-argument mistake: an explicit undefined invoked scene's true default. The fixture correction explicitly assigns the unknown carrying observation; engine/assertion contracts were not weakened.

To reproduce a rejected source, start a different worktree from accepted f4146275 and apply exactly one *-from-accepted.patch, then copy its corresponding collector. Never apply these source variants cumulatively. sources.json and manifest.json map every canonical runtime source digest. All eight nonempty source patches were independently applied outside the parent checkout and their complete src digests matched. Archived diagnostic hosts inherit the outer repository HEAD; their source digests and patch restoration, not that HEAD, identify their runtime.

## Reading the result

comparison.json.gz contains first raw-request, achieved-body and random-stream differences for all11 inputs; same-defender load windows; body/force samples. C02-execution.json preserves the earlier-safety-contact adverse case: the entire runner and SS bodies and held requests match at the 3.30s World boundary, nearby-opponent count remains two, and the old missed-tackle event becomes a wrap after the shared random stream changed at2.35s. The candidate's protected RG/Mike entry and RT/DT_S keeper load remain.

Runner-facing loaded time uses analyst-only actual geometry: the blocker's body projection toward the real runner is positive and its named defender receives >1N hand load. This is a screening proxy, not proof of a square block or full lane obstruction. R01's added window begins at3.10s with negative projection, becomes positive at3.20s, and is still a marginal contact. C01 acquires an earlier real loaded strike at2.55s. Loaded windows are consecutive force samples, not a promise that one grip survived throughout. Force/control remain governed by accepted contact rules.

Frame/load clocks mark World-step entry; the completed tick is entry+0.05s. Existing events preserve their own clock conventions. No terminal gain is assigned to live prefixes. Improved gain is not the acceptance criterion; adverse and unchanged outcomes remain visible. Physics/capacities, contact motor, hands, release/collection, target allocation, live doubles, pull/climb jobs and held #148/#149/#150 are outside the implementation.
