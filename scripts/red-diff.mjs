#!/usr/bin/env node
/** red-diff: the landing check. Runs the core suite (both core projects), compares the failing set to the committed ledger test/red-ledger.json and prints
 *   new red: N, fixed: M
 * with the names, and exits non-zero on any new red. A landing shows its own effect on the red set instead of a wall of failures.
 *
 *   node scripts/red-diff.mjs                       run `vitest run --project core --project core-defaults` and diff (about 40 min on four cores, quiet machine)
 *   node scripts/red-diff.mjs --from out/red.json   diff a vitest JSON result you already have (vitest run ... --reporter=json --outputFile=out/red.json)
 *   node scripts/red-diff.mjs --files test/a.test.ts,test/b.test.ts   run only those files (a quick check; the "fixed" list then covers only them)
 *   node scripts/red-diff.mjs --update              rewrite the ledger from this run, keeping owner / flag / class of tests already in it (new reds get owner "?")
 *
 * Ledger entry: { file, test (the full test name; "*" when the file fails to load), owner (the lane that owes the re-record), flag (the promoted flag that, pinned alone,
 * makes it pass, from scripts/diag/pin-bisect.ts, or ""), class }, class one of: fixture (a recorded fixture not re-recorded after a promotion), legacy-path (tests the off
 * path of a promoted flag), landing (red since a named landing and owed by its owner), env (the Node pin or the machine), regression (the test's contract still holds).
 *
 * DO NOT run it alongside a scorecard or another suite on the same machine: the tests are timed (a 69 s test timed out at 146 s under load) and the failing set then
 * contains timeouts that are not in the ledger. A test that fails here and not alone is an order or load effect: run it alone before ledgering it. */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';

const root = resolve(dirname(new URL(import.meta.url).pathname), '..');
const arg = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const ledgerPath = resolve(root, arg('--ledger', 'test/red-ledger.json'));
const files = arg('--files', '');
let resultPath = arg('--from', '');
if (!resultPath) {
  resultPath = resolve(root, 'out/red-diff-result.json'); mkdirSync(dirname(resultPath), { recursive: true });
  const cmd = ['vitest', 'run', '--project', 'core', '--project', 'core-defaults', '--reporter=json', `--outputFile=${resultPath}`, ...(files ? files.split(',') : [])];
  console.error(`running: npx ${cmd.join(' ')}`);
  spawnSync('npx', cmd, { cwd: root, stdio: ['ignore', 'ignore', 'inherit'] });
}
if (!existsSync(resultPath)) { console.error(`no result at ${resultPath}`); process.exit(2); }
const res = JSON.parse(readFileSync(resultPath, 'utf8'));
const failing = new Map(); // key -> { file, test }
let total = 0;
for (const f of res.testResults ?? []) {
  const file = relative(root, f.name);
  if (!(f.assertionResults?.length)) { if (f.status === 'failed') failing.set(`${file}::*`, { file, test: '*' }); continue; }
  for (const a of f.assertionResults) { total++; if (a.status === 'failed') failing.set(`${file}::${a.fullName}`, { file, test: a.fullName }); }
}
const ledger = existsSync(ledgerPath) ? JSON.parse(readFileSync(ledgerPath, 'utf8')) : { entries: [] };
const known = new Map(ledger.entries.map((e) => [`${e.file}::${e.test}`, e]));
const ran = files ? new Set(files.split(',')) : null;
const isNew = [...failing.keys()].filter((k) => !known.has(k));
const fixed = [...known.keys()].filter((k) => !failing.has(k) && (!ran || ran.has(known.get(k).file)));
const still = [...failing.keys()].filter((k) => known.has(k));
console.log(`tests run: ${total}; failing: ${failing.size}; on the ledger: ${still.length}`);
console.log(`new red: ${isNew.length}, fixed: ${fixed.length}`);
for (const k of isNew) console.log(`  NEW   ${k}`);
for (const k of fixed) console.log(`  FIXED ${k}  (owner ${known.get(k).owner})`);
if (process.argv.includes('--update')) {
  const entries = [...failing.entries()].map(([k, v]) => known.get(k) ?? { file: v.file, test: v.test, owner: '?', flag: '', class: '?' });
  entries.sort((a, b) => (a.file + a.test).localeCompare(b.file + b.test));
  writeFileSync(ledgerPath, JSON.stringify({ ...ledger, entries }, null, 1) + '\n');
  console.log(`ledger rewritten: ${entries.length} entries`);
}
process.exit(isNew.length ? 1 : 0);
