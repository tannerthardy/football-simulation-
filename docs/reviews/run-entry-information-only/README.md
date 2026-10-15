# Run-entry information only: independent accepted-base extraction

**Ready for Integration review independently of parked navigation research.**
This candidate removes private opponent-state shortcuts from entry risk and
adds the already approved observation-only teammate query transport. It makes
no claim of improved yardage, alternate entries or collision avoidance.

- Base: accepted `7d1451b2c31786e075550183a6a93bbda23da29b` (#65 documentation
  merge; runtime/source/tests/settings match accepted8c891f4).
- Code: **`60223a863a8431e85d5027c879191f3527ed10b8`**, branch
  `codex/run-entry-information-portable`.
- Source SHA256: `650c03aa263ff7469b4f9ee015836ca735c21de82b8513d28d2710a8799cbb89`.
- [Owner approval](https://github.com/tannerthardy/football-simulation-/pull/36#issuecomment-6201016808),
  [Integration scope coordination](https://github.com/tannerthardy/football-simulation-/pull/65#issuecomment-6201744560).

Only three production files differ from the accepted base:

1. `teammate-information.ts`: byte-identical144-line owner core6828467,
   SHA256`dac6f5bcf21a14b6022c5a233e499057758fcc44f001511cfb74e941a204d367`.
   Sensing acquires delivered samples; queries are pure copied reads. Prediction
   remains .30s and memory1.00s from sample age. Expired velocity means unknown,
   including recently delivered `observed`; unavailable has no coordinates.
2. `playsim.ts`: storage/construction, one sensing hook and guarded pure query.
   Empty installed-call map and no tactile writer, as approved. Accepted catch
   readiness retains its import and once-per-tick hook. Existing spacing is
   unchanged and does not consume this new interface in this extraction.
3. `carrier.ts`: eight-line opponent-risk correction. An acquired block's
   slowdown is already represented in its observed movement; private engagement
   cannot award another .25s of delay. Remove private current down/fatigue reads
   and use acquired pose/recovery plus public physical profile instead.

The accepted four-argument carrier `evaluate` contract remains. No approach
helper/admission/ranking change, `sampledVel` research, installed route builder,
spacing migration, mesh/controller experiments, old zone/Duo ancestry, physics
change or new gap delta is imported. Gap identity is already accepted. Broader
legacy carrier-information callers are outside this correction and are not
certified by it.

Four focused independent controls pass: poison private opponent state while
keeping acquired cues fixed; retain the saved contrasting entry; preserve
latency/stale-motion/expiry/copy/query contracts; preserve query guards and both
sensing hooks. The30.3KB compressed fixture is an extraction of the existing
two saved scenes, without navigation code dependencies.

[Focused receipt](validation/focused-launcher.json): **1.978s**.
[Typecheck](validation/typecheck-launcher.json): **13.108s**. Total new launcher
**15.086s**, Node22.23.3; frozen source/validation/HEAD, all44 resolved flags and
World defaults in receipts. One transport outer tick; zero new football snaps,
games, roster sweeps or shared full-suite runs. Integration owns exact combined
verification and acceptance. No merge or baseline change is requested here.

The original information-only encounter's adverse collision remains immutable:
[source-specific evidence](https://github.com/tannerthardy/football-simulation-/tree/4ee0e2cdc8480f271fc3d8e9178f6abd949b3f9e/docs/reviews/run-entry-cues).
Removing a private-information shortcut is independently justified; that collision
does not prove a better approach or make the old information access legitimate.
Current native/navigation evidence remains scoped to its own source and setup.

Integration can cherry-pick the single code commit above onto its accepted-base
branch. Later evidence commits change docs only. The optional historical-velocity
test stays on `codex/run-entry-admission-portable`, separate from this candidate.

```sh
node scripts/baseline.mjs --candidate --receipt out/run-entry-information-only/recheck.json -- npx vitest run --project core test/run-entry-information-only.test.ts
node scripts/baseline.mjs --candidate --receipt out/run-entry-information-only/typecheck-recheck.json -- npm run typecheck
```

Recommendation: advance this information-only candidate for Integration review;
retain the separate navigation hold. No additional game campaign is needed merely
to publish or classify this extraction.
