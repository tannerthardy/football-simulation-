/** One retained adverse case, not another panel. Reuse the saved resolved
 * trace after a fast-only edit; reject incompatible force laws/settings first.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { World } from '../../../src/physics/world.js';
import { rep } from '../tackle/panel.js';
import { sourceVersion } from '../../source-version.js';

const root = 'out/grip-fast-followup';
mkdirSync(root, { recursive: true });
const hash = (v: unknown) => createHash('sha256').update(JSON.stringify(v)).digest('hex');
const fileHash = (p: string) => createHash('sha256').update(readFileSync(p)).digest('hex');
const stage = process.argv.includes('--after') ? 'after' : 'before';
const input = { angle: 0, speed: 3, cut: false, difficulty: 'ordinary' as const, side: 1 as const, seed: 6109 };
const profile = JSON.parse(readFileSync('config/baseline.json', 'utf8'));
const flags = Object.fromEntries(Object.keys(profile.flags).map(k => [k, process.env[k] ?? null]));
const source = sourceVersion();
const compatibility = { input, flags, node: process.version, platform: process.platform, arch: process.arch,
  lock: fileHash('package-lock.json'), operator: ['src/physics/world.ts', 'src/physics/grip-timing.ts',
    'src/physics/support.ts', 'src/physics/virtual-foot.ts', 'src/physics/actuation.ts',
    'scripts/diag/tackle/panel.ts', 'src/sim/tackle.ts'].map(p => ({ p, sha256: fileHash(p) })),
  collector: fileHash(import.meta.filename) };
const before: any = stage === 'after' ? JSON.parse(readFileSync(`${root}/before.json`, 'utf8')) : null;
if (before && hash(before.compatibility) !== hash(compatibility)) throw Error('Incompatible saved reference');
const pose = (w: any) => [6, 15].map(i => ({ i, pos: { ...w.bodies[i].pos }, vel: { ...w.bodies[i].vel },
  facing: w.bodies[i].facing, spin: w.bodies[i].spin ?? 0, energy: w.bodies[i].energy,
  xi: { ...w.bodies[i].support.xi }, outside: w.bodies[i].support.out,
  foot: structuredClone(w.bodies[i].support.foot) }));

function collect(mode: 'resolved' | 'fast') {
  const rows: any[] = [], original = World.prototype.step, started = performance.now();
  World.prototype.step = function (intents, dt) {
    if (this.bodies.length !== 22) return original.call(this, intents, dt);
    const w: any = this, incoming = pose(w), requests = structuredClone(intents);
    const report = original.call(this, intents, dt);
    rows.push({ time: w.time, incoming, requests, end: pose(w), integration: report.gripTiming });
    return report;
  };
  let result;
  try { result = rep(input, input.side, input.seed, { handContact: 'patch', gripTiming: mode, substeps: 96 }); }
  finally { World.prototype.step = original; }
  return { mode, result, rows, seconds: (performance.now() - started) / 1000 };
}

const runs = stage === 'before' ? [collect('resolved'), collect('fast')] : [before.runs[0], collect('fast')];
const cached = JSON.parse(readFileSync('out/grip-fast/fresh-slow.json', 'utf8'));
const reference = cached.rows.find((r: any) => r.id === 'fresh-0-6109-1' && r.n === 96);
if (hash(flags) !== hash(cached.flags) || hash(runs[0].result) !== hash(reference.result)) throw Error('Reference result/settings drift');
const [slow, fast] = runs;
const comparisons = slow.rows.map((a: any, i: number) => {
  const b = fast.rows[i];
  if (!b) return { time: a.time, missingFast: true };
  return { time: a.time, requestsEqual: hash(a.requests) === hash(b.requests),
    maxPosition: Math.max(...a.end.map((x: any, k: number) => Math.hypot(x.pos.x - b.end[k].pos.x, x.pos.y - b.end[k].pos.y))),
    maxVelocity: Math.max(...a.end.map((x: any, k: number) => Math.hypot(x.vel.x - b.end[k].vel.x, x.vel.y - b.end[k].vel.y))),
    maxEnergy: Math.max(...a.end.map((x: any, k: number) => Math.abs(x.energy - b.end[k].energy))),
    slowIntegration: a.integration, fastIntegration: b.integration };
});
if (sourceVersion() !== source || fileHash(import.meta.filename) !== compatibility.collector) throw Error('Inputs changed');
const result = { source, commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  compatibility, stage, sourceOfReusedTrace: before?.source ?? null, runs, comparisons };
writeFileSync(`${root}/${stage}.json`, JSON.stringify(result));
console.log(JSON.stringify({ source, stage, advance: runs.map(r => r.result.advanceAfterGrip),
  firstPositionOver1e9: comparisons.find((r: any) => r.maxPosition > 1e-9),
  firstRequestDifference: comparisons.find((r: any) => !r.requestsEqual),
  runSeconds: runs.map(r => r.seconds), maximumPositionDifference: Math.max(...comparisons.map((r: any) => r.maxPosition ?? 0)) }));
