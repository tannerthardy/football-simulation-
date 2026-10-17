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
