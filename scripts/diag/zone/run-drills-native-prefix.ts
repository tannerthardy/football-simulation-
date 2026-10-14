/** The one allowed restored native continuation: complete H-strong context.
 * Captures missing information/World inputs; no counterfactual actions. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { gzipSync, gunzipSync } from 'node:zlib';
import { CENTER_Y } from '../../../src/core/field.js';
import { Rng } from '../../../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../../../src/league/team.js';
import { RUN_BY_ID } from '../../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../../src/playbook/formations.js';
import { Agent, type Engagement } from '../../../src/sim/agent.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import { runContactObservers } from '../../../src/sim/run-contact-observer.js';
import { runReadObservers } from '../../../src/sim/run-read-observer.js';
import { sourceVersion } from '../../source-version.js';

const manifest = JSON.parse(readFileSync('docs/reviews/run-drills/input-manifest.json', 'utf8'));
const serialize = (v: unknown) => JSON.stringify(v, (_k, x: unknown) => x instanceof Agent ? { agent: x.idx }
  : x instanceof PlaySim ? { sim: true } : x instanceof Map ? [...x] : x instanceof Set ? [...x] : x instanceof Float64Array ? [...x] : x);
const snap = (v: unknown): any => v === undefined ? null : JSON.parse(serialize(v));
const sha = (b: string | Buffer) => createHash('sha256').update(b).digest('hex');
const bytes = readFileSync(manifest.reference.packetPath);
assert.equal(sha(bytes), manifest.reference.sha256);
const reference = JSON.parse(gunzipSync(bytes).toString());
const row = reference.panel.find((r: any) => r.input.id === 'uc12-wz-s3-mirror');
assert(row);
assert.equal(process.version, manifest.node);
assert.equal(sourceVersion(), manifest.sourceSha256);
assert.deepEqual(Object.fromEntries(Object.keys(manifest.flags).map(k => [k, process.env[k] ?? null])), manifest.flags);
const input = row.input, recipe = reference.manifest, formation = FORMATION_BY_ID[input.formation];
assert.equal(recipe.ballY, CENTER_Y);
const started = performance.now();
const sim = new PlaySim({ offense: pickOffense(generateTeam(new Rng(input.o), 'O', 'O', { strength: recipe.strength }), formation.personnel),
  defense: pickDefense(generateTeam(new Rng(input.d), 'D', 'D', { strength: recipe.strength }), 'base43'),
  offCall: { formation, flip: input.flip, kind: 'run', run: RUN_BY_ID[input.concept], label: input.id },
  defCall: { personnel: 'base43', front: FRONT_BY_ID[input.front], coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'Over Cover 3' },
  los: recipe.los, ballY: CENTER_Y, firstDownX: recipe.firstDownX, seed: input.seed });
const hashes: string[] = [], frames: any[] = [], pictures: any[] = [], phases: any[] = [], writes: any[] = [], reads: any[] = [];
const firstCapture = 2.20, stop = 2.70;
const rep = (e: Engagement) => snap(e);
const flatten = (j: any) => {
  const { a, b, actor, holder, ...rest } = j;
  return snap({ ...rest, a: sim.world.indexOf(a), b: sim.world.indexOf(b),
    ...(actor === undefined ? {} : { actor: sim.world.indexOf(actor) }),
    ...(holder === undefined ? {} : { holder: sim.world.indexOf(holder) }) });
};
sim.intents = new Proxy(sim.intents, {
  set(target, key, value) {
    if (sim.t >= firstCapture && [2, 5, 6, 12, 13].includes(Number(key))) {
      writes.push({ t: sim.t, actor: Number(key), intent: snap(value), caller: new Error().stack?.split('\n')[2]?.trim() });
    }
    return Reflect.set(target, key, value);
  },
});
const see = sim.see.bind(sim);
sim.see = (a, b, scale) => {
  const seen = see(a, b, scale);
  if (sim.t >= firstCapture) pictures.push({ t: sim.t, actor: a.idx, target: b.idx, scale: scale ?? 1,
    seen: snap(seen), caller: new Error().stack?.split('\n').slice(2, 5).map(s => s.trim()),
    calledMotion: snap(b.behavior.calledMotion?.()) });
  return seen;
};
// calledMotion is a pure stored call-track accessor; no new perception or
// free-movement preview is invoked by these passive snapshots.
runContactObservers.set(sim, (e, phase, data) => {
  if (sim.t >= firstCapture && e.defender.idx === 12) phases.push({ t: sim.t, phase, rep: rep(e), data: snap(data) });
});
runReadObservers.set(sim, e => { if (sim.t >= firstCapture) reads.push(snap(e)); });
const step = sim.world.step.bind(sim.world);
sim.world.step = (intents, dt) => {
  const capture = sim.t >= firstCapture;
  const frame = capture ? { t: sim.t, after: sim.t + dt, dt,
    beforeBodies: snap(sim.agents.map(a => a.body)), intents: snap(intents),
    requested: snap(Reflect.get(sim, 'cmds')), engagements: sim.engagements.map(rep),
    jointInputs: sim.world.joints.map(flatten), pending: (Reflect.get(sim.world, 'pending') as any[]).map(flatten),
    tags: sim.agents.map(a => [...a.tags]), behavior: sim.agents.map(a => snap(a.behavior)) } : null;
  const report = step(intents, dt);
  if (frame) frames.push({ ...frame, afterBodies: snap(sim.agents.map(a => a.body)),
    jointOutputs: sim.world.joints.map(flatten), report: snap(report) });
  return report;
};
while (sim.phase === 'live' && sim.t < stop - 1e-9) {
  sim.tick();
  const state = { t: sim.t, rng: sim.rng, events: sim.events, perception: sim.perception,
    agents: sim.agents.map(a => ({ body: a.body, mind: a.mind, recog: a.recog, behavior: a.behavior, tags: a.tags })),
    engagements: sim.engagements, joints: sim.world.joints, intents: sim.intents, cmds: Reflect.get(sim, 'cmds') };
  hashes.push(sha(serialize(state)));
}
assert.deepEqual(hashes, row.hashes.slice(0, hashes.length), 'The restored full-context capture changed state/RNG history');
assert.equal(hashes.length, 54);
assert.equal(frames.length, 10);
assert(frames.every(f => f.beforeBodies.length === 22 && f.afterBodies.length === 22));
assert.equal(sourceVersion(), manifest.sourceSha256);
const result = { protocol: 'run-drills-native-prefix-v1',
  commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  sourceSha256: sourceVersion(), node: process.version, input, flags: manifest.flags,
  referenceSha256: manifest.reference.sha256, captureFrom: firstCapture, endTime: sim.t,
  restoredPrefixTicks: hashes.length, prefixExact: true, nativeContinuations: 1,
  controllersChanged: false, physicalCounterfactuals: 0, reducedFixtures: 0,
  censored: sim.phase === 'live', censoring: 'Declared2.70 diagnostic boundary; original natural ending reused from shared reference.',
  hashes, frames, pictures, phases, writes, reads, events: snap(sim.events),
  elapsedSeconds: (performance.now() - started) / 1000 };
mkdirSync('out/run-drills', { recursive: true });
writeFileSync('out/run-drills/native-prefix.json.gz', gzipSync(serialize(result)));
console.log(JSON.stringify({ prefixExact: true, ticks: hashes.length, capturedWorldIntervals: frames.length,
  nativeContinuations: 1, counterfactuals: 0, elapsedSeconds: result.elapsedSeconds }));
