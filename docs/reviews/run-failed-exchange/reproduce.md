# Reproduce without original game archives

Use Node22.23.3, committed lockfile and clean codex/run-failed-exchange checkout.
Do not overwrite another owner's work. The baseline launcher supplies all44
accepted flags/components1/CF_FLOW unset. Source/hash settings are in manifest.

Production extraction: qb.ts + failed-exchange-continuation.test.ts. Diagnostic
tooling and the two small frozen input files are evidence, not runtime imports.

~~~sh
node scripts/baseline.mjs --candidate --info
node scripts/baseline.mjs --candidate --receipt out/exchange/checks.json -- npx vitest run --project core test/failed-exchange-continuation.test.ts test/snap-mesh-and-pull.test.ts test/pass-installation.test.ts
node scripts/baseline.mjs --candidate --receipt out/exchange/types.json -- npm run typecheck
mkdir -p out/run-failed-exchange
node scripts/baseline.mjs --candidate --receipt out/exchange/cues.json -- node --import tsx scripts/diag/run-exchange/cues.ts out/run-failed-exchange/cues-native.json.gz
node scripts/baseline.mjs --candidate --receipt out/exchange/continue.json -- node --import tsx scripts/diag/run-exchange/continue.ts G3-P087 out/run-failed-exchange/native-ending.json.gz
node scripts/baseline.mjs --candidate --receipt out/exchange/climb.json -- node --import tsx scripts/diag/run-exchange/climb-path.ts
node scripts/baseline.mjs --candidate --receipt out/exchange/spacing.json -- node --import tsx scripts/diag/run-exchange/spacing-witness.ts
~~~

Cues stop3.50 or whistle. Only nominated P087 extends, with explicit12s censor/
8s wall guard; inspect terminal fields. Climb collection is two3.50s prefixes.
Frozen peer omissions never continue the play.

For baseline in a disposable checkout reverse only qb.ts hunk and verify the
declared source before identical inputs. New test should fail old controller.
Restore afterward. Original recorded-precision prefixes remain in fixtures.

saved.ts rebuilds fresh legitimate scouting/observation history from prior calls
and snap key. No body/controller checkpoint injection. P141's early C discrepancy
remains; P087 is preferred combined witness.

Commands are reproducibility instructions, not an automatic rerun requirement.
Reuse compatible receipts. Integration owns full combined verification.

## Coordinated defensive composition

The recorded composition is accepted0000e56 plus this candidate, PR132's exact
defense.ts and PR134's exact run-fits.ts; composed sourcea7fdbb3aa22a51c2a7c4ffe5d2703739ed34b2b3c71424032c8f21759d24d9ec.
Both defense patches stay separate from the offensive production extraction.
The collector runs only P087 and P140 to whistle or explicit12s censor, with8s
wall budget per case. It passively copies real see calls; observer-local memory
starts empty on the normally constructed fresh PlaySim.

The following guarded recipe restores both source files even if collection
fails. Use a clean assigned checkout with pinned Node on PATH and fetch the
two heads first if their objects are missing. Do not merge either research parent.
The original receipt's host was323d352; a later documentation commit may differ
without changing the declared engine source.

~~~sh
git fetch origin codex/acquired-qb-continuation codex/acquired-mesh-contradiction
python3 - <<'PY'
import pathlib, subprocess
changes = [
 ('1106866a1704c299e892a6e2ce6b5c7e11bd0ca0', 'src/sim/behaviors/defense.ts'),
 ('f012a8698d12e39daf755a0051f872d010abe3bf', 'src/sim/run-fits.ts'),
]
original = {p: pathlib.Path(p).read_bytes() for _, p in changes}
for p, content in original.items():
 if content != subprocess.check_output(['git', 'show', 'HEAD:' + p]):
  raise SystemExit('Preserve existing edits; refusing to overwrite ' + p)
try:
 for rev, p in changes:
  pathlib.Path(p).write_bytes(subprocess.check_output(['git', 'show', rev + ':' + p]))
 subprocess.run(['node', 'scripts/baseline.mjs', '--candidate', '--receipt',
  'out/run-failed-exchange/reproduced-composed-receipt.json', '--', 'node',
  '--import', 'tsx', 'scripts/diag/run-exchange/composed.ts',
  'out/run-failed-exchange/reproduced-composed.json.gz'], check=True)
finally:
 for p, content in original.items(): pathlib.Path(p).write_bytes(content)
PY
~~~

Frame startT is the command's tick; t labels the state after that step. Event
and producing-decision times use the command tick. The compact combined summary
preserves first changed requests, consumed pictures, actual execution, terminal
results, traffic cost and hashes; the detailed regenerated gzip stays in out/.
