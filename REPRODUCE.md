# #131 live catch caller: bounded evidence

Code pin is manifest.codeCommit, a normal continuation of original PR131 `2f9085f1e3dc8e5a19c07fc8f561dc1689413a5e` and current accepted `f4146275ce7539816bf57b4ed55a0d2be10e48c7`. This data-only branch must never be merged into production history.

Verify `sha256sum -c SHA256SUMS`, then extract native.tar.gz and common.tar.gz into separate data/tools folders. Every member hash is in manifest.json. native.tar.gz contains only nine already-completed native snaps and three receipts: accepted baseline, current candidate and historical candidate. Prefer inspecting these records to recollecting them. common includes tools, source patches, comparison JSON, focused/typecheck/launcher receipts, original failed test version and logs.

## Restore original inputs once

Fetch immutable input/evidence commit `b5b4fba9eefa5e59e8db192e77a6502341d81989`. Its evidence.tar.gz SHA256 must be `7fc78954d2240c86c5bc9092c6a9d1345d9a3acbe3af061cbd33d006bb93f97b`. Validate its41 declared member hashes plus its bundled manifest; safely extract at the chosen code worktree root. This restores ignored out/catch-opportunity-physics paths. Do not merge that data history. The copied reconstruct.ts rebuilds scouting Maps from saved prior calls and validates original RNG, installed call, IDs and energies before simulating. A rounded film is not used as a restore checkpoint. Never import reconstruct.ts via a source symlink to another checkout: its PlaySim import must resolve to the tested worktree.

## Smallest native reproduction when necessary

Create a new detached worktree at manifest.codeCommit; preserve other workers' checkouts. Use Node22.23.3 and the unchanged lockfile; reuse compatible dependencies or run npm ci once. Copy common/capture.ts into out/catch-opportunity-caller/capture.ts. Also copy src/physics/catch-opportunity.ts into out/catch-opportunity-caller/geometry/catch-opportunity.ts and src/core/vec.ts into out/catch-opportunity-caller/core/vec.ts. These copies are analyst-only geometry, not replacement production source.

Default `node --import tsx out/catch-opportunity-caller/capture.ts` prints a plan and runs zero snaps. The explicit run is the three frozen G1-P020/G2-P107/G2-P143 inputs, with30s batch/five wall seconds per case and25s simulation ceiling; no games:

```
node scripts/baseline.mjs --candidate --receipt out/catch-opportunity-caller/reproduce-launch.json -- node --import tsx out/catch-opportunity-caller/capture.ts run out/catch-opportunity-caller/reproduce
```

The collector forwards all updateBall arguments. Dropping that argument in an old diagnostic wrapper would silently remove the caller correction. It asserts supplied live body-start positions equal World-step entry. It adds no sensing/randomness/World ticks. All nine collected snaps ended natively; censored future prefixes must retain null outcomes/gain.

The existing baseline receipts already cover accepted f414 source7d23555a…; do not resimulate baseline merely to publish or review it. To inspect the original invalid interception, reuse the cached original Physics capture and historical candidate. historical.patch restores the same three-file change on70b4 source9513511…; candidate.patch restores it onf414. Both were independently applied outside the parent checkout and their entire canonical src digests matched. Original Physics helper source/tests/fixture are unchanged. Archived hosts inherit an outer HEAD; their exact source digest and patch, not that HEAD, identify execution.

## Read the first divergence

- Current accepted→candidate: full frames/events/telemetry/stats match for all three. P020's4.30s probability changes because simultaneous distance changes; its same draw still misses. No achieved movement divergence. The original70b4 endings must not be relabeled current outcomes.
- Historical P020: full recorded frames before4.55s match the original. The4.30s failed Y retry has changed distance/probability but still fails on the same draw. At4.55s, NB's frozen-final-body distance1.292149 admitted the old INT at reach1.317361; simultaneous legal-time minimum1.508345 rejects it. No chance/draw/retry is granted for that window; the ball becomes incomplete under existing ground rules. Source Physics's achieved-substep distance1.508492 independently supports the same rejection.
- Historical P107/P143: every original recorded frame/event/telemetry/stat matches. The valid tipped INT and moving completion remain. Focused caller controls also retain a high catch, actual PBU/changed flight, untouched miss, retry deadline, increasing closest-fraction order, missing-endpoint rejection, static/direct-call semantics and real same-tick/new-release endpoint capture.

38 distinct focused checks pass by compatible receipts:25 unchanged checks in caller-first,13 final caller checks in caller-final; typecheck passes. Initial test failure tried to structuredClone Agent callbacks; the test now snapshots the flight and retains actor identity. The final new-release test requires a real query after the existing0.1s exclusion and throws once. Engine source is unchanged across these checks. prepare-launch's command succeeded with zero World ticks but its outer guard correctly failed because fixture generation changed validation input files; it is not a passing test receipt.

Scope is forward-pass physical opportunity validity only. Existing eligibility, acquired readiness, capability mapping, retries, contests/facing/inbounds, increasing closest-fraction order and difficulty formulas remain. The query is linear between actual endpoints; no substep event solver or detailed hand/gaze model is introduced. Pitch/loose-ball queries and the separate lower-wrap ledger remain outside this change. Independent controller/caller review and Integration's one combined verification are still required before adoption.
