/** Candidate alone vs an immutable 4ded6b6 source archive. Raw acquired
 * packets (V8 preserves graph identities) and traces stay in ignored out/.
 * --baseline writes original native results and acquired packets; the current
 * branch reads those SAME packets for before/after frozen comparisons.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { serialize, deserialize } from 'node:v8';
import { createHash } from 'node:crypto';
import { sourceVersion } from '../../source-version.js';
import { World, type StepReport } from '../../../src/physics/world.js';
import { rep, type Cell } from '../tackle/panel.js';
import { captureFirstGrip, frozenInterval } from './contact-foundations.js';

const BASE = '4ded6b600fd3785e65034aa5623d7a9f8f3c5db1';
const SOURCE = '8433e88d7deb31e5c1c031e2f0cb83d1cf0e805609820c0559f6b8f25747340c';
const definitions: Array<{ name: string; cell: Cell; seed: number; mode: 'center' | 'patch' }> = [
  { name: 'front center', cell: { angle: 0, speed: 3, cut: false, difficulty: 'ordinary' }, seed: 3001, mode: 'center' },
  { name: 'front patch', cell: { angle: 0, speed: 3, cut: false, difficulty: 'ordinary' }, seed: 3001, mode: 'patch' },
  { name: 'angled acquired', cell: { angle: 45, speed: 8, cut: false, difficulty: 'difficult' }, seed: 3001, mode: 'patch' },
  { name: 'rear center adverse', cell: { angle: 180, speed: 6, cut: false, difficulty: 'difficult' }, seed: 3001, mode: 'center' },
  { name: 'rear patch', cell: { angle: 135, speed: 6, cut: false, difficulty: 'difficult' }, seed: 3001, mode: 'patch' },
  { name: 'side-cut adverse', cell: { angle: 90, speed: 3, cut: true, difficulty: 'difficult' }, seed: 3001, mode: 'patch' },
  { name: 'fresh angled', cell: { angle: 45, speed: 8, cut: false, difficulty: 'difficult' }, seed: 4001, mode: 'patch' },
];
const inputs = definitions.flatMap(d => ([1, -1] as const).map(side => ({ ...d, side,
  id: `${d.mode}-${d.cell.angle}-${d.cell.speed}-${Number(d.cell.cut)}-${d.seed}-${side}` })));
const sha = (v: unknown) => createHash('sha256').update(JSON.stringify(v)).digest('hex');
const profile = JSON.parse(readFileSync('config/baseline.json', 'utf8'));
const flags = Object.fromEntries(Object.keys(profile.flags).map(k => [k, process.env[k] ?? null]));
const root = process.argv[2] ?? 'out/grip-timing', baseline = process.argv.includes('--baseline');
const frozenOnly = process.argv.includes('--frozen-only');
mkdirSync(root, { recursive: true });
const source = sourceVersion(), native: any[] = [], frozen: any[] = [], checkpoints: any[] = [];
const step = World.prototype.step;
function run(input: typeof inputs[number], n: number, timing: 'midpoint' | 'resolved') {
  const stats = { trials: 0, intervals: 0, limited: 0, maxAcceptedError: 0, workError: 0, passiveWork: 0,
    armExcess: 0, supportExcess: 0 };
  World.prototype.step = function (intents, dt) {
    const r: StepReport = step.call(this, intents, dt), g = r.gripTiming;
    if (g) { stats.trials += g.trials; stats.intervals += g.intervals; stats.limited += g.limited;
      stats.maxAcceptedError = Math.max(stats.maxAcceptedError, g.maxAcceptedError); }
    stats.workError = Math.max(stats.workError, Math.abs(r.work.residual));
    stats.passiveWork = Math.max(stats.passiveWork, r.passiveGraspWork);
    for (let i = 0; i < this.bodies.length; i++) {
      stats.armExcess = Math.max(stats.armExcess, r.armImpulse[i] - r.armImpulseLimit[i], r.armWork[i] - r.armWorkLimit[i]);
      stats.supportExcess = Math.max(stats.supportExcess, r.supportMotorWork[i] - r.supportMotorWorkLimit[i]);
    }
    return r;
  };
  const start = performance.now(); let result;
  try { result = rep(input.cell, input.side, input.seed, { handContact: input.mode, substeps: n, gripTiming: timing }); }
  finally { World.prototype.step = step; }
  const row = { id: input.id, n, timing, seconds: (performance.now() - start) / 1000, result, stats };
  console.log(JSON.stringify({ id: row.id, n, timing, seconds: row.seconds, ending: result.ending, limited: stats.limited }));
  return row;
}
if (baseline) {
  if (source !== SOURCE) throw Error('Baseline archive runtime does not match 4ded6b6');
  for (const input of inputs) {
    const c = captureFirstGrip(input.cell, input.mode, input.side, input.seed);
    const bytes = serialize(c.saved);
    writeFileSync(join(root, `${input.id}.bin`), bytes);
    checkpoints.push({ id: input.id, checksum: createHash('sha256').update(bytes).digest('hex'), checkpoint: c.checkpoint,
      observed: c.observed, endpoint: c.endpoint, observerParity: c.observerParity });
    for (const n of [12, 96]) native.push(run(input, n, 'midpoint'));
  }
  writeFileSync(join(root, 'baseline.json'), JSON.stringify({ baseline: BASE, source, node: process.version, flags,
    inputs, inputManifest: sha(inputs), native, checkpoints }, null, 2) + '\n');
} else {
  const b = JSON.parse(readFileSync(join(root, 'baseline.json'), 'utf8'));
  if (b.baseline !== BASE || b.source !== SOURCE || b.inputManifest !== sha(inputs) || sha(b.flags) !== sha(flags))
    throw Error('Baseline/input/flag manifest mismatch');
  if (frozenOnly) {
    const existing = JSON.parse(readFileSync(join(root, 'candidate.json'), 'utf8'));
    if (existing.source !== source || existing.inputManifest !== sha(inputs)) throw Error('Native candidate version changed');
    native.push(...existing.native);
  }
  for (const input of inputs) {
    const bytes = readFileSync(join(root, `${input.id}.bin`)), expected = b.checkpoints.find((c: any) => c.id === input.id);
    if (createHash('sha256').update(bytes).digest('hex') !== expected.checksum) throw Error('Acquired packet changed');
    const saved = deserialize(bytes);
    // Verify candidate-off execution against the original baseline at 12.
    if (!frozenOnly) {
      const off = run(input, 12, 'midpoint'), old = b.native.find((r: any) => r.id === input.id && r.n === 12);
      if (sha(off.result) !== sha(old.result)) throw Error(`Default drift on ${input.id}`);
      native.push(off);
    }
    if (input.name === 'angled acquired' || input.name === 'fresh angled') for (const variant of ['full', 'grip-only'] as const) {
      frozen.push({ id: input.id, variant, before: frozenInterval(saved, 1, variant, .05 / 12),
        candidate: frozenInterval(saved, 1, variant, .05 / 12, 'resolved'),
        reference: frozenInterval(saved, 4096, variant, .05 / 12) });
    }
    if (!frozenOnly) for (const n of [12, 96]) native.push(run(input, n, 'resolved'));
  }
  writeFileSync(join(root, 'candidate.json'), JSON.stringify({ baseline: BASE, source, node: process.version, flags,
    inputs, inputManifest: sha(inputs), frozenReferencePartitions: 4096,
    candidate: { handContact: 'per input; patch remains experimental', gripTiming: 'resolved',
      capacities: 'unchanged', recovery: 'unchanged', supportAndTackleExperiments: 'off' }, native, frozen }, null, 2) + '\n');
}
if (sourceVersion() !== source) throw Error('Source changed during collection');
