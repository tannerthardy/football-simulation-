# Component-only extraction for final combined review

Integration owner: the Codex audit/integration session identified in #8.
Review/handoff: [#9 review](https://github.com/tannerthardy/football-simulation-/pull/9#issuecomment-6157979631)
and [#8 handoff](https://github.com/tannerthardy/football-simulation-/pull/8#issuecomment-6157982265).
The owner [acknowledged the scope and verification](https://github.com/tannerthardy/football-simulation-/pull/8#issuecomment-6158083998).

## Scope and dependencies

Start: approved shared-tree #8 commit
`c98c2fa0e8de760c980ad3852e0ec85abcfadc8f`.
Source contribution: reviewed #9 head
`7a04ad6c65d9268bb332147411baacc27ebe20e0`, tested there at
`176866ed47cacd56331b33b676c0509a350e95d7`.
Candidate branch: `codex/contact-components-extracted`.

Only these production changes are extracted, with exact bytes matching the
reviewed source:

- `src/sim/contact-motion.ts`: preserve normal drive and apply the whole acquired
  tangent request once.
- `src/sim/engagement.ts`: helper import, `RUN_CONTACT_COMPONENTS` switch/default
  and stretch-only hook.

The existing `test/contact-motion.test.ts` contribution is copied exactly.
The existing shared-tree contact fixture, contact-surface and zone-reach tests
already provide its dependencies. No #4/#9 ancestry is imported.
`run-fits.ts` and its existing tests, physics, players, capacities, dependency
lock and every other production source remain byte-identical to the approved
shared tree. Handover implementation/registration/tests, collection experiments,
active hands and other experiments are excluded.

Production simulation code therefore **changes in this candidate**: one request
construction correction. The previous #8-only pass's “production unchanged”
statement and receipt describe that earlier commit, not this extracted tree.

## Settings and historical evidence

The candidate registers **44** flags: the prior 43 values remain exact and
`RUN_CONTACT_COMPONENTS=1` is the sole addition. Its code default is enabled;
explicit `0` selects the old request construction. Final verification must use
`--candidate --flag RUN_CONTACT_COMPONENTS=1`. No handover flag is registered.

The profile's historical runtime/source pin and ID remain unchanged, so the
launcher requires `--candidate` for this new source. Registration/defaults in
the candidate are a proposal, not a merge or new baseline designation.
Historical comparison remains `4ded6b6`, with its original configuration and
receipts preserved in Git.

One tooling adaptation is necessary: the readonly roster worksheet previously
read today's flag registry as the historical 43-flag evidence pin. The extracted
tree freezes that pin in [`config/roster-screen-reference.json`](../../config/roster-screen-reference.json)
and uses it in the worksheet. Its existing corruption/input/measurement checks
remain; the test also verifies that current flags can differ without relabeling
the historical evidence. This adds no production dependency or simulation.

#8's tiny-loop policy, budget/cache controls, frozen roster fixtures and ownership
are retained. The recorded simulation screen remains historical; its strict
current-profile compatibility checks can reject a 43-flag baseline under the
new registry. Do not silently drop the new flag from cache provenance, relabel
the old receipt, auto-regenerate a baseline or launch a new screen here. A future
transfer question can choose a separately pinned comparison then. The readonly
worksheet remains usable for compatible saved reports.

## Evidence and verification boundary

The contribution's [focused/native receipt](https://github.com/tannerthardy/football-simulation-/blob/7a04ad6c65d9268bb332147411baacc27ebe20e0/docs/reviews/run-contact-components-receipt.json)
and [settings](https://github.com/tannerthardy/football-simulation-/blob/7a04ad6c65d9268bb332147411baacc27ebe20e0/docs/reviews/run-contact-components-settings.json)
remain on their immutable source pins. Reuse supports the exact extracted
request mechanism and unchanged physical/fixture dependencies. Their global
source hash also includes excluded handover code; they are not a pass for this
combined tree. Keep the preserved lower-gain WZ result, withdrawn early-release
control and known law failures visible. No new native panel, roster sweep or
game campaign is requested.

Run the directly affected existing correctness checks first, including the
historical-pin worksheet control, to fail cheaply. Then commit the entire
candidate and run the preserved combined verifier once:

```sh
node scripts/baseline.mjs --verify --candidate --flag RUN_CONTACT_COMPONENTS=1 --fail-fast --receipt out/contact-components/combined-verification.json
```

Publish that exact commit, actual 44 settings, source/harness fingerprints,
phase costs and failures/skips. Preserve supported contracts; do not relax an
assertion to recover an ending. The integration owner alone runs this suite;
contributors reuse their compatible focused receipts. Merge and baseline/reference
designation remain pending final review.


## Final combined handoff

- **What changed:** Component-only request correction extracted from #9 onto approved #8 `c98c2fa0e8de760c980ad3852e0ec85abcfadc8f`. Exact tested candidate: [`41bfb2c152e7ebdcda4cf1cd11eacefc2c186f6c`](https://github.com/tannerthardy/football-simulation-/commit/41bfb2c152e7ebdcda4cf1cd11eacefc2c186f6c). Production code changes only in the helper and engagement hook/default; handover/physics/other source is unchanged. The readonly worksheet now keeps the historical pin separately from current registration.
- **Evidence for/against:** 42 focused assertions in four actual files passed, then the single combined run passed 1,683 TypeScript tests in 140 files, 145 Python checks, typecheck and build. No skips, worker errors or changed inputs. [Exact combined receipt](../../data/reviews/current/contact-components-combined-verification.json), SHA256 `fd5fb89b20a987e3b0490440a3ba41495473ed6e80819a086346396269cc2b54`; [extraction/settings/evidence footprint](../../data/reviews/current/contact-components-extraction.json). Reviewed source/test bytes match; excluded dependency bytes match the approved base. Earlier #8/#9 global receipts are not relabeled as this pass.
- **Unresolved risk:** Preserved WZ gain tradeoff and existing contact-law/convergence/football limitations remain. The historical 43-flag simulation-screen baseline is not certified for the new registry. Final merge/reference approval remains pending.
- **Runtime:** Focused command 2.562 s; one combined verification 177.646 s wall (typecheck 9.627, build 11.046, TypeScript 156.094, Python 0.875). No added native/roster/game campaign; existing full-suite game assertions retained.
- **Next decision:** Final review of this clean extraction and its explicitly enabled combined receipt. The owner acknowledgment and verification conditions are fulfilled; no PR has been merged or baseline designated. Contributors need not repeat the shared suite.

The receipt records Node `v22.23.3`, 44 resolved flags with components `1`,
source `d6429131a16b1f79b2af05a458c647f105d4fabbad1af7c72816b5b4ed91640f`, harness `b9809014ce561f63c914619fe09c3d325288269133dbb59f52830c17e0ec7f9a`,
and UTC interval `2026-10-14T00:29:05.420Z` to `2026-10-14T00:32:03.066Z`.
Publication adds docs/evidence only; its source/harness/flags must match the tested
commit, and it is not claimed as a separately tested revision. Raw log remains
in `out/contact-components/combined-verification.log`.
