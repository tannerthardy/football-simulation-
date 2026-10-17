# Exact puller reproductions

Use Node22.23.3. Accepted base0000e560e0dbe31905151465152d412ba838803d;
candidate code89efb949ddeacd220acaf00a4749b160457d6bdf. The source hash in the
manifest and receipts identifies the actual tested engine, including worktree deltas.
Do not import this research history wholesale for production: promotion.patch
applies only the four protected files to accepted develop. Installation/research
patches below are diagnostic and must stay separate.

Final information correction; two accepted Counter inputs, not games:

~~~sh
env -u PULL_PLAN -u PULL_CUE -u CF_FLOW -u CLIMB_EXIT npm run baseline:run -- --candidate -- \
  node --import tsx scripts/diag/puller-access.mjs run out/puller-information K01,K02 5
npm run baseline:run -- --candidate -- npx vitest run --project core \
  test/puller-route-progress.test.ts test/puller-target-read.test.ts \
  test/snap-mesh-and-pull.test.ts test/pull-fit-plan.test.ts
npm run baseline:run -- --candidate -- npm run typecheck
~~~

Default runner invocation plans zero snaps and does not rewrite inputs. All
eight actual setup objects live in test/fixtures/puller-access-inputs.json.gz;
their individual JSON hashes and full flag/World settings are in the manifest.
The runner refuses a missing concept installation before starting any snap.
The old and new collectors differ in input decompression, preflight/plan/output
metadata only; passive see/controller/World hooks remain the same. The source-
qualified Counter identity comparisons verify their physical measurements agree.

In a disposable task checkout, reproduce the held concept baseline:

~~~sh
git apply docs/reviews/puller-access/research/perimeter-installation.patch
env -u PULL_PLAN -u PULL_CUE -u CF_FLOW -u CLIMB_EXIT npm run baseline:run -- --candidate -- \
  node --import tsx scripts/diag/puller-access.mjs run out/puller-prototypes B01,P01,C01,P02,C02 5
~~~

That deliberately restores source af87f432…: current accepted engine plus the
original held #99 installation. It removes the production information correction
for an exact comparison. Apply only one arm from that state:

| Arm | Additional patch | Expected source | Cases |
| --- | --- | --- | --- |
| Achieved force-corner progress | research/corner.patch |7531dbf94927ceb141a4629729462b314b24449d23afa4a664c485d934a243e4 |C01,C02,P02 |
| Withdrawn earlier wrapper collection | research/early-collection.patch |4514ac567d2a40345d3246d2148c79c64da6b80068f3baca8e0057eb33e5fcd0 |B01,K01,K02 |
| Rejected shallower Buck wrapper | research/shallower-track.patch |8ba067125804bfac4be1c73a5e33d96be46e19eace01bd8f103164b3b406705a |B01,B02 |

The early arm's K02 result contains its identified initially-null-job bug; it
is adverse evidence, not a valid clean estimate of earlier collection alone.
Archived test text preserves original staged probes and withdrawn expectations;
it is not a production acceptance suite. The corner-only tests can be restored
to test/ temporarily, expanding the fixture to the JSON path used in that archive,
and selected with the completed-perimeter-corner test-name filter.

For the rejected Counter allocation-order trial, start from the **final production
candidate**, apply research/allocation.patch, then run K01,K02. Expected source
6d8fac67b82baf21a005675a5019e52b731962199f8790aff1263e9ffdd2baeb.
It changes only the ledger order relative to the information candidate. The
promotion, prototype baseline and all four arm patches have been independently
reconstructed locally without simulation and checked against their saved source
hashes; see portable-check.json. No patch changes capacities, spacing or physics.

The report script consumes only saved tapes from the named subdirectories under
out/puller-access and runs zero simulations:

~~~sh
python3 scripts/diag/puller-access-report.py out/puller-access out/puller-access/summary.json
~~~

It retains requested-versus-achieved states, existing consumed pictures, actual
loaded contact, teammate impacts, censors and failed command receipts. Published
summary.json is a compact selection; it contains the exact input/source/receipt
identifiers and relevant decisions, rather than all repeated observer pictures.
