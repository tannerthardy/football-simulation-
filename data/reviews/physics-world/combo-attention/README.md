# Joined OL combination attention evidence

Read the [implementation review](../../../../docs/reviews/joined-combination-attention.md)
and [common OL controller](../../../../docs/reviews/universal-ol-controller.md).
Watch [12 fixed paired clips](../../../../viewer/combo-attention.html) or the
[standalone ZIP](../../../../viewer/combo-attention.zip). Saved film exports
do not simulate; short videos are available where MediaRecorder is supported.

## Provenance and populations

Baseline commit `4e2abaf` has source
`d6dfa190412da52725780c71db02f73305b3e3f5541b4c8e9d755a3296ee568f`.
Reuse `../zone-helper-check/candidate.json.gz` by reference. Final source is
`246931590ef723662a4e6178755660185b13487efe2a7d7e8dce503710b08469`.
Only blocking.ts and playsim.ts change; World remains
`4944084ea63112a5bf9caa7e39867b2024fe9ba0a726c89ad80f8fdde2f8134f`.
No profiles, traction, hand/grip/work capacities or resolution change.

- Ordinary panel: 160 matched inputs, one .55 roster pair31/32; eight concepts,
  five fronts, two directions, seeds3/11. Two earlier roster41/42 inputs remain
  separate. All162 recorded initial projections/hashes match, all324 observed/
  plain controls match, all finishes are natural.
- Fixed six: common B/C instrumentation on IZ/Over R/L S3, Duo/Odd R/L S11 and
  Power/Under R/L S3. Selection precedes candidate outcomes. The new tap records
  actual observer/phase/picture consumption, personal states, release boundaries,
  native bodies and keeper hand loads, including TE contacts.
- Post-hoc adverse four: selected after seeing losses, under a separately pinned
  runner. They retain exact cached panel calls/players/results, eight neutral
  controls and natural finishes. They never augment the fixed-six or160 counts.

These are mechanism diagnostics, not NFL concept frequencies or population
estimates. Installed call knowledge is assumed; position familiarity is not
per-call mastery.

## Files and findings

`candidate.json.gz` and `candidate-film.json.gz` are the unchanged old collector's
native panel and generic films. Whole-play events are reliable; its command-local
wrapper omits the candidate prepass and reports only5 of116 ordinary climbs.
Do not infer that111 disappeared, or claim event-boundary continuity for all116.

`witness-before.json.gz` / `witness-after.json.gz` are the complete neutral six.
Candidate's five actual climbs are current self-proposals, with own keeper/DL/
backer/RB pictures and valid cues. All five preserve bodies at decision and the
same genuinely loaded keeper hands through the following solve. Baseline has
two remote departures. Later assigned-backer loaded contact changes five→four;
the missing Duo/Odd/left contact remains explicit.

Candidate records69 attention attempts,15 keeper/DL visual reads and8 backer/RB
reads. Actual physical eligibility vetoes54 attempts before visual consumption.
Seven pairs schedule both members, five have some visual reading, none have
both visually read in these six natural inputs. Controlled native good-fit tests
demonstrate both-member reads and order-independent conflicting proposals.

`comparison.json` retains all162 pairs, all42 ordinary negative yard pairs,
six≥2yd losses, seven≥2yd gains, concept/front summaries, native limits and
references to detailed raw evidence. Mean gain1.402625→1.386 yd; stuffs37→37;
OLfalls14→17; total climbs119→116. 69/160 complete public results and18/160
complete signatures are exact. Private state/tags can change signatures without
changing bodies. Supplemental OZ/Over/left28.49→2.44 yd stays separate.

`adverse-before.json.gz` / `adverse-after.json.gz` and
[adverse-review.md](adverse-review.md) investigate changed-release causes.
Four B remote departures become six C current self-departures, all with actual
own cues and continuous loaded keeper joints. OZ Odd and Split Bear audits find
no hidden clock inheritance or stale stand, while preserving their worse yards.
Own-cue coherence does not establish the optimal blocker or eventual useful seal.

`engine.patch` reconstructs this increment from the pinned baseline; do not apply
it over later source. `controlled-tests.ts`, `test-migrations.patch`,
`test-migration-review.md`, logs and `checks.json` retain actual tests and check
outcomes:20 new pass, B19 feature failures/1 control pass;18 prior helper controls
still pass B, one new recovery regression fails B. Full812 TS/22 Python,
typecheck/build pass. Physical and holding assertions remain in migrated tests.

`film/` contains exact-native integrity, browser checks, desktop/mobile captures
and two source-stamped WebM exports. The verifier/manifest independently bind
source, tools, files and limitations. Default verification checks saved history;
`--engine` additionally requires current source and exact reverse-patch baseline.

The [cutoff diagnosis](cutoff-next-witness.md) identifies the next concrete repair:
a requested backside shoulder conflicts with the acquired contact frame.
It is pinned-baseline diagnosis, not an implemented improvement or a failure-rate
estimate. Preserve successful inside-shade controls before altering installation.
The [next experiment design](cutoff-implementation-design.md) confirms the same
defect in C's existing native records and proposes a target-bound installed
surface. It is **not implemented**. The displacement is nearly tangent to that
surface; lower measured phi alone is insufficient. Require achieved containment
and real loads, preserve acquired frames and truthful bad-fit controls, and
reuse the four already saved C native witnesses before broadening validation.

## Measurement limits

`readAt` means scheduled attention attempt; only actual `sim.see` consumption
proves a picture was used. Historical B personal states do not exist and are
not synthesized. Private confirmation/costs are checked against native state
and controlled tests. The old panel has partial command-local contact records
and omits TE-only body impulse rows; absent metrics are not zero force.

Replay positions are post-physics with tick-start timestamps. Native details
require completedAt≤visual time, can trail the shown bodies by .05s and exclude
the final solve from seeking. Neither phase was silently retimed. Facing is
body orientation, not eye direction. Real contact/load does not certify a
completed block, compression, a running lane or increased efficiency.

Native force kg·yd/s², impulse kg·yd/s, work kg·yd²/s². SI factors are .9144
and .9144². Joint mean forces and shared player arm budgets differ. Accounting
does not calibrate NFL strength. No game-rate, runtime-speed or universal
physics-readiness claim follows from this narrow controller panel.

## Rerun

Use Node22.23.3 and lockfile dependencies. Freeze source during collection;
write new results to ignored `out/`. Saved published evidence remains immutable.
The six-witness and adverse runners also run historical B from its pinned
archive when new native observations are required; do not label current source
output as a historical baseline.

```sh
node --import tsx scripts/diag/combo-transfer-review.ts out/attention/new.json.gz
node --import tsx scripts/diag/combo-attention-witness.ts out/attention/witness-new.json.gz
python3 scripts/diag/combo-attention-compare.py data/reviews/physics-world/zone-helper-check/candidate.json.gz out/attention/new.json.gz data/reviews/physics-world/combo-attention/witness-before.json.gz out/attention/witness-new.json.gz out/attention/comparison.json
node --import tsx scripts/export-combo-attention.ts data/reviews/physics-world/combo-attention/witness-before.json.gz out/attention/witness-new.json.gz out/attention/film.html
node node_modules/vitest/vitest.mjs run --maxWorkers=1
npm run typecheck
npm run build
python3 -m unittest discover -s test -p 'test_*.py'
python3 data/reviews/physics-world/combo-attention/verify-evidence.py --engine
```

Optional separate inspection:
`node --import tsx scripts/diag/combo-attention-adverse-witness.ts out/attention/adverse-new.json.gz`.
The comparator accepts `--adverse-before` and `--adverse-after` together and
keeps their population separate. The runner pins the common tap and declares
its fixture/provenance substitutions and read-only body/intent/job hashes.

Follow the [practical validation policy](../../../../docs/reviews/practical-validation-and-stable-physics.md):
focused iteration, native controls, immutable baseline reuse, and one final
frozen full suite. Reopen physical probes when their laws or witnesses change.
