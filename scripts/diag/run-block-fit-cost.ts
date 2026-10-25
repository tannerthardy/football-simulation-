/** Warmed end-to-end cost guard on fixed ordinary 11v11 run inspections.
 * node --expose-gc --import tsx scripts/diag/run-block-fit-cost.ts [output.json]
 * Run each version sequentially without concurrent simulation/benchmark work.
 * Imports the existing trial API so archived baseline sources use identical
 * driver bytes without importing a candidate-only helper.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { cpus } from 'node:os';
import { dirname } from 'node:path';
import { performance } from 'node:perf_hooks';
import { olBaseConcepts, olBaseTrial, type OLBaseInput } from './ol-base-review.js';
import { sourceVersion } from '../source-version.js';

if (process.argv.length > 3) throw new Error('Usage: run-block-fit-cost.ts [output.json]');
const output = process.argv[2] ?? 'out/run-block-fit/cost.json';
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const fileHash = (path: string) => createHash('sha256').update(readFileSync(path)).digest('hex');
const sourceBefore = sourceVersion();
const toolPaths = ['scripts/diag/run-block-fit-cost.ts', 'scripts/diag/ol-base-review.ts', 'scripts/source-version.ts'];
const toolHashes = Object.fromEntries(toolPaths.map(path => [path, fileHash(path)]));
const startedAt = new Date().toISOString();
const inputs: OLBaseInput[] = [];
for (const [roster, offenseSeed, defenseSeed] of [[1, 31, 32], [2, 41, 42]])
  for (const concept of olBaseConcepts) for (const flip of [false, true])
    inputs.push({ roster, offenseSeed, defenseSeed, concept, flip, playSeed: 3 });
const warmInputs = inputs.filter(input => input.roster === 1 && !input.flip);
const options = { observe: false, recording: false };
const collectGarbage = (globalThis as unknown as { gc?: () => void }).gc;
const repeats = 2;
const physical = (row: ReturnType<typeof olBaseTrial>) => ({ id: row.id,
  input: row.input, initialSignature: row.initialSignature,
  signature: row.signature, profileSha256: row.profileSha256, end: row.end,
  physics: row.physics, fixture: row.fixture, resolvedOffCall: row.resolvedOffCall });

// Exercise every concept before measurement. These six trials and their
// startup/JIT work are excluded from all reported measured totals.
const warm = warmInputs.map(input => physical(olBaseTrial(input, options)));
const rows: Array<{ repeat: number; wallMs: number; cpuMs: number;
  cpuUserMs: number; cpuSystemMs: number; trial: ReturnType<typeof physical> }> = [];
for (let repeat = 0; repeat < repeats; repeat++) for (const input of inputs) {
  collectGarbage?.();
  const cpuStart = process.cpuUsage(), wallStart = performance.now();
  const trial = olBaseTrial(input, options);
  const wallMs = performance.now() - wallStart, cpu = process.cpuUsage(cpuStart);
  // Extract retained metadata outside the timed call. Trial construction,
  // simulation and its ordinary endpoint snapshots/hashes are inside timing.
  rows.push({ repeat, wallMs, cpuMs: (cpu.user + cpu.system) / 1000,
    cpuUserMs: cpu.user / 1000, cpuSystemMs: cpu.system / 1000, trial: physical(trial) });
}
const repeatChecks = inputs.map(input => {
  const matched = rows.filter(row => hash(row.trial.input) === hash(input));
  const passed = matched.length === repeats && matched.every(row => hash(row.trial) === hash(matched[0].trial));
  if (!passed) throw new Error(`Timed repeats changed physical state, RNG or profile: ${JSON.stringify(input)}`);
  return { id: matched[0].trial.id, passed, signature: matched[0].trial.signature };
});
const sourceAfter = sourceVersion();
if (sourceAfter !== sourceBefore || toolPaths.some(path => fileHash(path) !== toolHashes[path]))
  throw new Error('Engine or measurement tools changed during the cost guard');
if (!rows.every(row => Number.isFinite(row.wallMs) && Number.isFinite(row.cpuMs)))
  throw new Error('Nonfinite cost measurement');
const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b), middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : .5 * (sorted[middle - 1] + sorted[middle]);
};
const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
const report = {
  schema: 'run-block-fit-cost-v1', sourceBefore, sourceAfter, toolHashes,
  startedAt, invocation: [process.execPath, ...process.execArgv, ...process.argv.slice(1)],
  runtime: { node: process.version, execPath: process.execPath, versions: process.versions,
    platform: process.platform, arch: process.arch, logicalCpus: cpus().length,
    cpuModel: cpus()[0]?.model ?? null },
  inputs, inputSha256: hash(inputs),
  profileSha256: hash(rows.filter(row => row.repeat === 0).map(row => ({
    id: row.trial.id, profileSha256: row.trial.profileSha256 }))),
  warmInputs, warmInputSha256: hash(warmInputs), warmTrialsExcluded: warm.length,
  measuredRepeatsPerInput: repeats, measuredTrials: rows.length,
  gcBeforeMeasuredTrial: !!collectGarbage, observe: false, recording: false,
  scope: 'Same fixed 24-input Ace/4-3 Over/Cover3 cohort. Six first-roster unflipped concepts warm the process and are excluded; two complete measured repeats retain natural finishes or live3s inspection censors. Timing includes fresh roster/trial construction, production simulation and existing diagnostic endpoint snapshots/hashes. Optional per-tick observers and replay recording are disabled. Forced GC, when available, precedes timing.',
  limits: 'A small end-to-end guard, not an isolated helper benchmark, full-game overhead, portable speed estimate, NFL sample or confidence interval. Only compare paired versions with identical tool/input/profile bytes and runtime while other CPU-heavy work is idle. Reused inputs/rosters are not independent observations; natural finishes can change workload.',
  summary: { totalWallMs: sum(rows.map(row => row.wallMs)), totalCpuMs: sum(rows.map(row => row.cpuMs)),
    medianWallMsPerTrial: median(rows.map(row => row.wallMs)), medianCpuMsPerTrial: median(rows.map(row => row.cpuMs)),
    naturalFinishes: rows.filter(row => !row.trial.end.censored).length,
    censored: rows.filter(row => row.trial.end.censored).length,
    inspectedSimulationSeconds: sum(rows.map(row => row.trial.end.t)) },
  warm, repeatChecks, rows,
};
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ output, sourceSha256: sourceBefore, inputSha256: report.inputSha256,
  measuredTrials: rows.length, ...report.summary }));
