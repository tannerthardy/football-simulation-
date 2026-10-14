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
