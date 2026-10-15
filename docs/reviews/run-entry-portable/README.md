# Portable run-entry consumer: unknown motion stays unknown

**The extraction is reviewable on current accepted development. Hold promotion
as a complete navigation improvement:** correcting the consumer exposes stale
peers in the original saved scenes, so the earlier entry-reranking benefit is
not established for this candidate. No new coupled P032/P019 run is claimed.

Branch: `codex/run-entry-admission-portable`. Accepted parent:
`8c891f4cf887b54297efbbc4c7993ba5e2f318b5` (#63 merge). Exact tested candidate:
`f93840e428e8f8795020f400faf75e1792f5751b`, source SHA256
`bf044ce72a98a9aa6dcbebf31d61b5f8754b56dc8b5e848283b27f4aa60887f8`.

## What changed

The consumer now distinguishes `clear`, `blocked` and `unknown`. The unchanged
Awareness contract identifies a stale motion estimate through sample age
exceeding the position prediction clock. This applies even to a recently
delivered `source=observed` picture. Its zero velocity is not an observed stop.
Every stale/unavailable peer remains in the assessment with a null gap and an
explicit ID; the aggregate minimum is null. Known conflicts still report
`blocked`. Only `clear` moving approaches can change destination ranking.

Unknown evidence alone supplies no basis to force gathering or rerouting. When
known evidence supports the original request, the controller keeps that request
and reports its unknown assessment. A known conflict still selects a slower or
gather request where justified. No unknown gap is filled from a teammate's body,
`see()`, behavior, fatigue or intentions. An unsupported own-body preview likewise
does not certify a new entry. This is limited motion reasoning, not proof that a
clear forecast cannot later encounter a reacting player.

The extraction contains the original, **byte-identical** 144-line Awareness core
from `68284671d062dfd4e7e879bcd037bc21dad3e3ac` (SHA256
`dac6f5bcf21a14b6022c5a233e499057758fcc44f001511cfb74e941a204d367`),
plus PlaySim import/storage, observation-only construction, one sensing hook and
guarded pure query. It preserves accepted incidental catch readiness. No new
shared fields, installed-call builder, tactile writer, global spacing migration,
vision/memory change or physics dependency is introduced.

Carrier includes the separately justified risk correction: remove private
engagement's .25-second allowance and private down/fatigue checks; retain
acquired pose/recovery and public physical profiles. Its independent diff remains
in the [earlier extraction plan](https://github.com/tannerthardy/football-simulation-/blob/ac3822da1a403aec1eb10f69c0c4fc26a5176e8e/docs/reviews/run-entry-awareness-extraction/patches/02-information-risk.patch).
The accepted four-argument `evaluate` signature is retained. Broader legacy
destination/squeeze/evaluate information callers are not migrated or certified
by this patch.

## Same-body evidence

The [executed before/after probe](validation/probe.json) loads the exact prior
helper at `cfcb7db0ba17c978fd02fb179c61f4e8b1d66752` and the new helper against
unchanged fixtures. **Every fast/slower/gather physical preview path matches.**
Only the information interpretation and resulting admission classification
change in this comparison.

| Case | Prior assessment | Corrected assessment / request |
| --- | --- | --- |
| Known stationary peer, .020 yd outside actual contact radius | +.020 yd | `clear`, +.020 yd, exact fast request |
| Same own body, command, peer position and zero velocity; age .35, prediction .30; recently delivered `observed` | +.020 yd, implicitly clear | `unknown`, null gap; fast request retained without clearance claim |
| Same stale case, `remembered` | +.020 yd, implicitly clear | `unknown`, null gap |
| Unavailable picture without position/velocity | Peer excluded; infinity minimum | Peer retained explicitly; `unknown`, null gap |
| Saved P032 obstruction | Gather, +.49885 yd | Same gather against known obstruction; `unknown` for stale QB 0 and receiver 8 |
| Saved P019 contrasting route | Fast, +.29389 yd | Exact fast request; `unknown` for stale QB 0 |

The first focused run exposed a material limitation: the original fixture already
contained .60-second QB/receiver memories with only .30 seconds of prediction.
The old test called them stationary and required a certified alternate entry.
That requirement is invalid under the owner's documented contract. The revised
tests preserve these original cues and require no reranking when no approach
can be certified. No stale peer was removed or its age refreshed to retain the
old ending. This means the previous P032 reranking improvement is **not portable
evidence of this corrected policy's benefit**. Known obstruction pacing remains;
loss of useful reranking and possible gathering/stalling remain behavior risks.

The other initial failure came from a test matcher traversing deliberately
poisoned private getters. Argument identity checks fix that observer without
weakening the prohibition; the actual consumer passes with private teammate
body/position/velocity and `see()` set to throw.

## Verification and cost

- [Final focused receipt](validation/final-focused-launcher.json): **12/12**
  consumer/transport checks, 1.811 s. Includes known stationary versus both stale
  sources, unavailable, mixed known conflict/unknown, original saved-scene
  ranking limitation, opponent private-state invariance, advancing hidden
  divergence through expiry, query purity/vector copies, poison live-state
  fallback control, and both once-per-tick PlaySim sensing hooks.
- [Typecheck](validation/typecheck-launcher.json): pass, **8.822 s**.
- [Same-body probe](validation/probe-launcher.json): pass, **.321 s** launcher
  (.046 s internal). No native football ticks in this probe.
- [Initial run](validation/initial-focused-launcher.json): 30 pass / five fail,
  **3.384 s**, retained with [complete failures](validation/initial-focused-results.json).
  Four failures concerned unsupported old clearance assertions; one was the
  poison-getter matcher. Runtime source is identical to the final candidate.
  Its unchanged incidental-catch 13 checks and carrier-recovery ten checks pass;
  their unchanged file hashes and runtime make these compatible focused evidence.

Total new launcher time: **14.338 s**, including the failed run. Node22.23.3,
platform/architecture, dependency/testing fingerprints, all 44 resolved flags
and World defaults are in the receipts. Every run freezes source, validation
inputs and HEAD. Final consumer tests/typecheck/probe share validation SHA256
`1fb2f726f47272c8302d30f996710f1e8cc48be7a847fc90abe3c956f94f1a37`.

Zero full games or roster screens. The initial existing carrier-recovery test
executes four native plays (two fixed calls, instrumented/plain each); these test
observer equivalence, not a before/after football improvement. The transport
check advances one PlaySim outer tick in each focused attempt. Other motion
execution consists of own-body empty-World previews. No new coupled P032/P019
continuation, prefix replay or full-suite run. Integration owns combined checks.

## Integration and ownership

The branch is directly based on accepted #63, with no experimental parent or
earlier zone/Duo ancestry. Gap identity is already accepted and has no new delta.
The [aggregate patch](candidate.patch) contains only the four runtime files, two
focused tests, original saved fixture and probe script, so Integration can apply
one patch rather than importing any historical stack. The branch's three commits
are one candidate; later publication changes only docs/evidence.

```sh
git fetch origin codex/run-entry-admission-portable
# From a clean branch at accepted 8c891f4:
git apply --index docs/reviews/run-entry-portable/candidate.patch
# Or use the candidate branch / cherry-pick its three-commit range.
```

The patch file must first be read from the published evidence tree; it is not
already present on accepted development. To reproduce focused checks on this
branch, with Node22.23.3 and dependencies installed:

```sh
node scripts/baseline.mjs --candidate --receipt out/run-entry-portable/recheck.json -- npx vitest run --project core test/run-entry-approach.test.ts test/run-entry-information.test.ts
node scripts/baseline.mjs --candidate --receipt out/run-entry-portable/typecheck-recheck.json -- npm run typecheck
# Probe additionally needs cfcb7db's Git object, without adopting its history:
git fetch origin codex/run-entry-admission
node scripts/baseline.mjs --candidate --receipt out/run-entry-portable/probe-recheck.json -- node --import tsx scripts/diag/run-entry-portable-probe.mjs
```

Awareness retains shared policy/schema ownership. [Original contract request](https://github.com/tannerthardy/football-simulation-/pull/36#issuecomment-6200674433)
and [consumer scope/unchanged-schema coordination](https://github.com/tannerthardy/football-simulation-/pull/36#issuecomment-6200885111)
are durable. **Approval reconciled:** Catching approved the existing-schema consumer and
observation-only staging in [6201016808](https://github.com/tannerthardy/football-simulation-/pull/36#issuecomment-6201016808),
following [owner review6200878215](https://github.com/tannerthardy/football-simulation-/pull/36#issuecomment-6200878215).
The prior publication's outstanding-acknowledgment wording is superseded. No
coordination blocker or extra Integration gate remains. Football benefit stays
unproved. Run Game's pass scopes remain untouched.

**Next decision:** review this portable contract repair, then agree how a
route-relevant unknown teammate can be handled using legitimate evidence before
more behavior tuning. Do not erase the unknown peer, add a universal clearance
bubble, extend memory or restore private state to recover the prior P032 result.
The earlier [native evidence](https://github.com/tannerthardy/football-simulation-/tree/75dbf46b12a4d186a7da6ebc463b9fba228f0b50/docs/reviews/run-entry-admission)
remains immutable and limited to its original experimental source.
