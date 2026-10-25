# Moving catch windows and rejected contact — 2026-10-12

This is a bounded production controller repair following the
[full engine review](full-engine-review-2026-10-11.md). It repairs one demonstrated
native escape and a separate downfield contact-rejection bug. It does **not**
solve the broad YAC tail, the other nominated escape, or the hand-law defect.
The [receipt](../../data/reviews/current/catch-contact-repair.json) pins inputs,
sources, adverse trials, checks and local artifacts.

Baseline commit: `36c294c` (engine identical to `b922353`). Engine source:
`4c56c12876883fbe0e84bdc3172d284fbc099c3a035a73852255cb4a44255302`.
Catch/contact-only source:
`8eee2fb390e62f4a0552ecea372dfa7b44b8490c9a714b55d403535c235ef972`.

## Demonstrated mechanisms

Original games reproduce both nominated failures and four ordinary controls
exactly. Rich traces show a nearby running defender requesting progressively
less forward motion toward a fixed ball point while the receiver continues
running. In `S108-P143`, CB_S falls from about 8.4 to 6.1 yd/s before the catch;
he misses, later establishes a grasp, falls and slips. In `S107-P233`, FS also
loses phase, misses an extended reach and falls. These are distinct post-catch
sequences, not evidence that all grips are too weak.

The catch-window estimate could disappear despite a receiver's observed path
carrying his hands through the flight. It treated catching as arrival at a
point, charged for braking/redirecting, and used only 80% of nominal reach.
Actual tracking catches use nominal reach plus the existing 0.3-yd extension.
One probe at 4.00 s estimates a receiver arrival time of 0.161 s for a ball
sample 0.100 s away, even though projected moving-hand separation is only
0.442 yd. The point-arrival estimate rejects a physically available passing
opportunity.

Separately, `DownfieldBlocker` unconditionally returned `stand()` after calling
`engage()`. The real engagement guard can reject a recently shed blocker, so
proximity could stop his motion without giving contact ownership to anyone.

## Production changes

- The observed receiver window accepts a ball point within projected moving
  hand reach, and uses the existing tracking-hand envelope consistently.
  Its fallback still estimates attainable redirection. This is a possibility
  estimate from delayed position/velocity and visible flight, not knowledge
  of the intended target, called route or eventual catch.
- A defender already within the observed receiver's standing hand corridor
  carries that moving receiver with the existing tracking controller unless
  he has an earlier reachable ball opportunity. Stationary and remote catches
  retain their arrival policy. The shared World executes the request.
- A downfield blocker stands only after accepted engagement; rejection retains
  movement toward the carrier-side fit. Accepted-contact ownership is preserved.
- A trace records the actual running-catcher choice. The new diagnostic captures
  complete native snap inputs and verifies recorded versus unrecorded execution.

Shared physics, profiles, ratings, capacities, grip forces, tackle/catch
probabilities and physical handoff policies are unchanged. Extracting the
existing tracking extension into a shared constant does not enlarge the actual
catch envelope. Catch jumping/landing and downfield private-state reads remain
model/information gaps.

## Identical native contexts, not paired later games

Original coordinator calls, defender shadow preferences, fatigue, snap seeds
and both learned scouting histories were saved before game observation mutated
them. Restoring each context reproduces its original complete result, all
bodies, RNG and perception exactly. The same inputs then run the candidate.
Both baseline and final full recordings pass all six unrecorded witnesses.

| Native context | Baseline YAC / end | Final YAC / end |
| --- | --- | --- |
| S108-P143, nominated escape | 37.54 yd / TD | 10.88 yd / tackle |
| S107-P233, nominated escape | 69.28 yd / TD | 69.28 yd / TD |
| S107-P214, immediate wrap and assist | 2.79 yd / tackle | 2.43 yd / tackle |
| S204-P60, ordinary wrap | 1.52 yd / tackle | 2.43 yd / tackle |
| S204-P41, assisted pursuit | 6.80 yd / tackle | 6.83 yd / tackle |
| S207-P161, useful gathering | 1.28 yd / tackle | 1.28 yd / tackle |

In repaired `S108-P143`, the initial miss at 4.50 s remains. CB_S establishes
his grasp at 5.00 s, retains support, brings the receiver down at 5.35 s and
finishes at 5.75 s. The baseline grasp instead loses the defender's support
and slips. There is no forced tackle or removed execution roll.

This selected panel is diagnostic, not a native frequency estimate. All four
ordinary controls still end in tackles; their trajectories/YAC are not claimed
unchanged. `S107-P233` is retained as an unresolved witness.

## Adverse trials and limits

An initial phase-tracking trial with the old window estimator left both
nominated escapes intact. Correcting the window contract produced the bounded
candidate above. A separately diagnosed offset-preserving velocity-match trial
still failed `S107-P233` and changed `S204-P60` into an incompletion; it was
backed out. A window-only ablation preserved the two long escapes, so the
window estimate alone is not a demonstrated YAC repair.

No further approach adjustments were stacked to rescue the remaining selected
touchdown. Its first divergence and actual reachable support need fresh
diagnosis. The broader catch population, independent assists, airborne catch
support, run approaches and the experimental hand-patch regressions remain
priorities. Production hands still use center mode and retain the known angular
defect; patch mode has not been promoted.

## Integration with the pursuit repair

Remote commit `cd25757` was merged through `ef2179f` after the isolated checks.
The [pursuit repair](pursuit-coverage.md) removes systematic underlead; it keeps
capabilities and delayed cues fixed. Combined engine source:
`eda0633497f99277887112c93c7bd7c566dd39271cbc56acf1a3a2a26f88b7e1`.
The receipt's integration section pins validation of that combined source.

The combined source passes all 1,246 TS assertions in 108 files, 141 Python
checks, typecheck and build. Fresh 101–108 and 202–209 cohorts each retain 12/12
guards. Clean native mean YAC is 11.69 yd, p90 36.79 yd, completion gain 19.72 yd
and run success 28.8%. Mean YAC exceeds the pursuit-only report's 10.5 yd;
these downstream numbers do not establish broad improvement. Later calls and
RNG histories diverge. The targeted mechanism evidence and adverse cases
remain the basis for this bounded repair.

The same held native contexts were also executed on pursuit-only and combined
engines, each with six recorded/unrecorded witnesses. `S108-P143` remains a
37.54-YAC TD on pursuit-only and becomes a 10.88-YAC tackle with both repairs.
`S107-P233` remains a 69.28-YAC TD. Controls `S107-P214`, `S204-P41` and
`S204-P60` remain tackles. `S207-P161` is incomplete on both pursuit-only and
combined sources; that change already precedes the catch/contact addition.
The table above preserves the isolated stage rather than silently relabelling
it as combined evidence. Local `out/catch-contact/combined/paired-film.html`
compares pursuit-only against the final combined engine.

## Isolated validation and downstream guard

- 1,244 TypeScript assertions pass in 108 files; no preserved assertions removed.
- 141 Python checks, typecheck and build pass.
- Eight new contracts cover both movement mirrors, earlier ball opportunities,
  moving-hand catches, stationary catches, hidden target/unseen motion,
  physically rejected contact and accepted contact ownership.
- Fresh cohorts 101–108 and 202–209 each retain all 12 mechanism guards.
- Six baseline and six final native context recordings match their unrecorded
  result/body/RNG/perception witnesses exactly.

Fresh clean native outcomes include 2,103 plays, 1,394 throws and 871 completions.
Mean YAC is 11.92 yd, p90 37.26 yd, and 20+ YAC share 17.7%, versus the preceding
12.32/39.68/18.3%. Mean completion gain remains 19.92 yd and designed-run success
is 26.9%. These still have substantial gaps against the examined NFL reference.
Later game calls/RNG histories diverge, so these are downstream guards, not
paired causal effects or a statistically established broad improvement. No
physical parameters or thresholds were selected from these numbers. No reserved
final-exam data was read.

## Reproduce

From the repository root with Node 22:

```sh
npm test -- test/catch-phase-control.test.ts test/downfield-contact-rejection.test.ts
node --import tsx scripts/diag/catch-contact-review.ts --replay out/catch-contact/native-contexts.json out/catch-contact/recheck.json
npm run test:all
npm run test:data
npm run typecheck
npm run build
```

The saved baseline contexts and large traces are local ignored artifacts with
hashes in the receipt. To collect new native contexts, supply a selection JSON
array of `{ "cohort": 101, "seeds": [107], "ids": ["S107-P214"] }` panels:

```sh
node --import tsx scripts/diag/catch-contact-review.ts --collect out/contexts.json out/selection.json
```

Choose IDs from that source's native games before examining candidate results.
The collector's default IDs belong to the pinned historical baseline; they
are not guaranteed to exist after changed earlier game calls. Reproducing those
defaults requires that baseline source. Use replay mode for held-input candidate
comparisons. Local `out/catch-contact/paired-film.html` contains all twelve
before/after clips with full telemetry; the export is not a browser certification.
