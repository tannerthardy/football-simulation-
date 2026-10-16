# Independent #101 tooling review

**Tooling-only HOLD** on `4d224096739953406bcd25da9e3e8e5ddb0929d9`.
One failure-retention/accounting blocker affects the reusable collector, not
the completed study's reported successful execution. No engine or football
policy change is requested. Reviewed 2026-10-16 in response to
[Integration's request](https://github.com/tannerthardy/football-simulation-/pull/101#issuecomment-6220460164).

## Required correction

In `scripts/diag/run-action-suite.ts:284–297`, a new wall-censored row is saved
and `executed` incremented, then an exception is thrown **before** `index.push`.
The final report consequently says `censored: 0`, omits that row and includes
the attempted case in `skipped`. An exception inside `measure` is worse:
`executed` remains zero and the local accumulated observations never reach
disk. The error string and case ID survive, but not the partial trace promised
by PLAN's failure-retention contract. Invariant assertions/nonfinite checks can
take this path after multiple ticks. Early install failures naturally need
their input/error, not an invented trace.

An offline check extracted the **unchanged frozen `main()`**, transpiled it and
replaced measurement/IO with in-memory stubs. No engine was imported:

| Stub scenario, three planned cases | Attempts | Executed | Index rows | Censored | Skipped | Partial cache |
| --- | ---: | ---: | ---: | ---: | --- | --- |
| First case wall-censored | 1 | 1 | 0 | 0 | first, second, third | yes |
| First case throws numerical error | 1 | 0 | 0 | 0 | first, second, third | no |

Both correctly exit nonzero and stop the batch. Wall-censored cache reuse also
correctly refuses a silent retry. Those safeguards do not repair the missing
row/count or distinguish a failed attempt from an untouched tail.

**Minimal return condition:** persist the attempted case's outcome and available
partial observations before stopping; keep attempted/failed/censored cases
distinct from genuinely unrun cases in the index. Preserve the original error,
budget, source/key and no-retry behavior. A small orchestration/exception test
with stubs can establish accounting, and a bounded injected failure can verify
partial retention if necessary. Do not rerun the 1,848 cases or a shared suite.
Run owns the collector correction; Integration owns its minimal tooling
extraction. This review makes no code changes to their files.

## Checks supporting reuse of the saved study

| Check | Evidence and bounded conclusion |
| --- | --- |
| Zero-snap default | `mode='plan'`; planning builds/validates/writes the manifest and returns before measurement. Import guard prevents the review's pure input/key reconstruction from invoking CLI `main`. No simulations constructed in this review. |
| Explicit execution and budgets | Broad `run` requires positional `--checkpoint REASON`; each host has an exact engine-source guard. Frozen limits are 20 simulation seconds, 5 wall seconds/case, 30 accepted / 8 prototype minutes. These are cooperative tick/loop checks, not an OS hard deadline, and case timing starts after construction. Saved runs stayed inside their limits. |
| Cache keys | Recomputed all 1,848 full input hashes and keys. Provenance contains all engine `src` bytes, complete manifest (including budgets), collector, source-hash helper, dependency lock, Node/platform/arch, all 44 runtime environment flags and World-default profile, plus operator version. Source flag inventory exactly matches the profile. Cache checks key/input/result digest and refuses wall-censored reuse. No whole-manifest-key collisions or missing joins in the saved arms. |
| Observer neutrality | Reused the passing focused check: observed + recorded WZ opening versus plain through 1.1s, with actual loaded hands and equal result/body/RNG signature. Read-only `pPass()` and observer wrapper inspected. This supports that tested loaded opening; it is not an every-tick/every-family neutrality proof. No extra recognition update, sensing or RNG call is introduced by the observer. |
| Completed censor accounting | All 1,608 accepted + 240 prototype ordered IDs/keys/metrics join between manifest, index and compact rows. Accepted: 1,606 native endings + 2 live-20s censors; prototype: 240 native endings. Zero cached/skipped/failures in these saved invocations. Both censors have null outcome/gain/fieldGain/success and no exchange/contact. Terminal descriptive gains exclude them. The unexercised exceptional paths above remain a tooling blocker. |
| Accepted/prototype separation | Independently hashed both historical engine trees and matched recorded digests; each manifest/index has its own source and keys. Accepted source equals historical `bb6d4c7`, not current develop. Prototype 240 cases are separate in tables/film/compact host metadata. PR101 changes no `src`, settings, package/lock, baseline launcher or source helper relative to bb6. No #99 production ancestry is required. |
| Evidence and film | Recomputed family mean/median/terminal counts, checked 216 PA pair deltas, joined 40 witness keys/source/metrics. Self-contained film has 20 views, 1,024 frames and 22,528 player states; all 22 slots, finite stored velocities, frame clocks, source labels and ending bounds check. JS syntax passes; no external requests. No browser visual-render check claimed. |
| Existing checks and costs | All seven original receipt entries reconcile, including two failed development receipts and later passes. Passing eight-test and typecheck validation digest matches exact freeze `579a20e`; test and collector blobs remain unchanged at reviewed head. Launch/check cost 350.612062173 seconds, retained rather than reset. No repeat tests/typecheck/native collection/games/shared suite. |

The PA correction is preserved: native fake supplies a generic .35s OL show
and .7s QB/RB action, not the named run's zone/pull/slice/fake-pitch/boot
technique. PA/plain changes the represented generic OL and backfield action.
Changing a fake string does not create a new physical install. Neither this
review nor those descriptive distributions promotes #99, calibrates NFL rates
or establishes realistic football across current develop.

Only the compact data, indices and selected film/packet are portable in #101.
The full ~130MB compressed per-case caches remain on the Run host in ignored
`out/`. We did **not** verify their raw `rowSha256` digests: keys and compact
metrics are independently reproducible, but compact/film extracts cannot
reconstruct discarded raw fields. Any later need for those traces should use
a small checksum-verified transfer from that host, not recollection.
Stored velocity is used as provided; no differentiation of rounded positions.
The collector's `raw` means post-coverage `cmds`, before later contact/spacing
refinement, not every discarded producer stage. Film samples are 5Hz with a
50ms before/after World pair; ball/possession is explicitly pre-World and the
terminal event may follow the final sampled body pose by up to .15s. Loaded
hands are useful contact evidence, not proof of protection or grip strength.

## Pins and smallest reusable scope

- Review host / current accepted develop:
  `3723204bd0743713bca3e87f10ca01bfebf00a15`, canonical queue
  `db0d512666823c49f7d5afed84138b32ffcf449f`. PR head rechecked unchanged.
- Reviewed publication: `4d224096739953406bcd25da9e3e8e5ddb0929d9`.
- Historical accepted input/collector freeze:
  `579a20e2062d0a159c3a4e88b10e21819f88b7c1`; engine
  `bb6d4c73948d53ba841dd9338dd240146c739f8c`, source
  `668acb1784799c93d4704aaaa41233a11627ee0a862b41dc279cd11a0a22eeac`.
- Separate prototype freeze:
  `9163ef542af3c1ced10657043b3c803073ed8ca9`, source
  `ca40378fb18a3285c02031228e0e87190b2b0cb4aeeb70c48b51926816c19a0b`.

Tooling extraction can consist of the four `scripts/diag/run-action-*` scripts,
`test/run-action-suite.test.ts`, both frozen manifests/indices, compact
rows/summary/witness/selection/receipt data under
`data/reviews/current/run-action-suite/`, and the scoped plan/report/film/plots.
Do not cherry-pick WORKBOARD wholesale or import experimental parents. Dependencies
are existing native PlaySim/RunBlocker/scouting/audit helpers, Node22.23.3 and
the existing lock; Python analysis/film use the standard library, plots use
Matplotlib. Full regeneration from raw caches requires their original host or
a separate data transfer. The accepted engine needs no #99 concepts to read
the saved prototype evidence. A new current-engine campaign would be a separate
decision; the hardcoded source guards intentionally reject current `3723204`.

## Saved-only reproduction

In an isolated checkout of reviewed publication, install/reuse its existing
locked dependencies and Node22.23.3. Fetch prototype freeze objects (no runtime
checkout/import) for the saved validator's independent source hashing. From
this review branch, with `SOURCE` naming that checkout:

```sh
node --import "$SOURCE/node_modules/tsx/dist/loader.mjs" \
  docs/reviews/pr101-tooling-review/verify-saved.mjs "$SOURCE"
node docs/reviews/pr101-tooling-review/failure-accounting.cjs "$SOURCE"
node --check "$SOURCE/out/pr101-review/film-script.js"
```

These scripts perform byte/hash/JSON checks and stubbed orchestration only.
They create no PlaySim and call no tick. [Machine-readable review](../../data/reviews/current/pr101-measurement-tooling-review.json)
records the results, artifact hashes and limits. This HOLD can clear with the
failure-path repair and compatible focused evidence; completed successful-case
evidence need not be thrown away or rerun.
