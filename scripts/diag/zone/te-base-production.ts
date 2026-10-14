/** Isolated TE approach posture intervention. No production source changes.
 * Reuses integration accepted-production controls; runs two native candidates. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { gzipSync, gunzipSync } from 'node:zlib';
import { CENTER_Y } from '../../../src/core/field.js';
import { Rng } from '../../../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../../../src/league/team.js';
import { RUN_BY_ID } from '../../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../../src/playbook/formations.js';
import { Agent } from '../../../src/sim/agent.js';
import { RunBlocker } from '../../../src/sim/behaviors/blocking.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import { availability, baseRadiusAt, comHeightAt, padHeightAt, supportParams } from '../../../src/physics/support.js';
import { fatigueFactor } from '../../../src/physics/kinematics.js';

const manifestPath = 'config/te-base-production.json';
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
assert.equal(manifest.protocol, 'te-base-production-v1');
assert.equal(manifest.cases.length, 2);
assert.equal(manifest.actionPosture, .7);
const copy = <T>(v: T): T => structuredClone(v);
const serialize = (v: unknown) => JSON.stringify(v, (_k, x: unknown) => x instanceof Agent ? { agent: x.idx }
  : x instanceof PlaySim ? { sim: true } : x instanceof Map ? [...x] : x instanceof Set ? [...x] : x instanceof Float64Array ? [...x] : x);
const sha = (s: string | Buffer) => createHash('sha256').update(s).digest('hex');
const savedBytes = readFileSync(process.argv[3] ?? manifest.savedSource.path);
assert.equal(sha(savedBytes), manifest.savedSource.sha256, 'Frozen shared control input changed');
const saved = JSON.parse(gunzipSync(savedBytes).toString());
assert.equal(saved.provenance.sourceSha256, manifest.runtimeSourceSha256);
assert.deepEqual(saved.provenance.flags, manifest.flags);
assert.deepEqual(Object.fromEntries(Object.keys(manifest.flags).map(k => [k, process.env[k] ?? null])), manifest.flags);
const runtimeBefore = ['src/physics/world.ts', 'src/sim/playsim.ts', 'src/sim/behaviors/blocking.ts', 'src/sim/engagement.ts']
  .map(path => ({ path, bytes: readFileSync(path) }));
for (const { path, bytes } of runtimeBefore) assert.deepEqual(bytes,
  execFileSync('git', ['show', manifest.sourceBase + ':' + path]), 'Source differs from shared production input: ' + path);

function supportState(a: Agent) {
  const sup = a.body.support!, params = supportParams(a.profile);
  return { state: sup.state, posture: sup.posture, xi: copy(sup.xi), peak: sup.peak, out: sup.out,
    availability: availability(sup, params, fatigueFactor(a.body.energy)),
    baseRadius: baseRadiusAt(params, sup.posture), comHeight: comHeightAt(params, sup.posture),
    padHeight: padHeightAt(params, sup.posture) };
}
function execute(row: typeof manifest.cases[number], withBase: boolean, stop: number) {
  const input = row.input, formation = FORMATION_BY_ID[input.formation];
  const sim = new PlaySim({ offense: pickOffense(generateTeam(new Rng(input.o), 'O', 'O', { strength: manifest.strength }), formation.personnel),
    defense: pickDefense(generateTeam(new Rng(input.d), 'D', 'D', { strength: manifest.strength }), 'base43'),
    offCall: { formation, flip: input.flip, kind: 'run', run: RUN_BY_ID[input.concept], label: input.id },
    defCall: { personnel: 'base43', front: FRONT_BY_ID[input.front], coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'Over Cover 3' },
    los: manifest.los, ballY: CENTER_Y, firstDownX: 50, seed: input.seed,
    handContact: 'center' });
  assert.equal(sim.world.handContact, 'center');
  assert.equal(sim.world.supportModel, 'legacy');
  const actor = sim.slot(row.actorSlot)!;
  assert(actor && ['Y', 'H'].includes(actor.slot));
  const behavior = actor.behavior;
  assert(behavior instanceof RunBlocker);
  assert(['reach', 'cutoff'].includes(behavior.plan.kind));
  const initialProfiles = serialize(sim.agents.map(a => a.profile));
  const initial = copy(sim.agents.map(a => a.pos));
  const interventions: unknown[] = [], hashes: string[] = [], frames: unknown[] = [], cues: unknown[] = [];
  const update = behavior.update.bind(behavior);
  // Existing assignment and ordinary command, before contact refinement and
  // spaceTeammates. No new target reads, cadence, track, strength or timing.
  behavior.update = (a, play) => {
    const command = update(a, play);
    if (withBase && !a.engagement && !a.isDown(play.t)
      && ['reach', 'cutoff'].includes(behavior.plan.kind) && command.posture === undefined) {
      const changed = { ...command, posture: manifest.actionPosture };
      const { posture: _posture, ...rest } = changed;
      assert.deepEqual(rest, command);
      interventions.push({ t: play.t, actor: a.idx, slot: a.slot, job: behavior.plan.kind,
        target: behavior.plan.target?.idx, original: copy(command), changed: copy(changed) });
      return changed;
    }
    return command;
  };
  const see = sim.see.bind(sim);
  sim.see = (a, b, scale) => {
    const seen = see(a, b, scale);
    cues.push({ t: sim.t, actor: a.idx, target: b.idx, actorSlot: a.slot, targetSlot: b.slot, seen: copy(seen) });
    return seen;
  };
  const step = sim.world.step.bind(sim.world);
  let worldInput: unknown, crossing: number | null = null;
  const limits = { armImpulseExcess: 0, armWorkExcess: 0, supportWorkExcess: 0, workResidual: 0 };
  sim.world.step = (intents, dt) => {
    worldInput = { beforeBodies: copy(sim.agents.map(a => a.body)), intents: copy(intents),
      jointInputs: sim.world.joints.map(j => {
        const { a, b, ...rest } = j;
        const flat: Record<string, unknown> = { ...rest, a: sim.world.indexOf(a), b: sim.world.indexOf(b) };
        for (const key of ['actor', 'holder']) if (key in flat) flat[key] = sim.world.indexOf(Reflect.get(j, key));
        return copy(flat);
      }) };
    const report = step(intents, dt);
    Object.assign(worldInput!, { jointOutputsAtWorldEnd: sim.world.joints.map(j => ({ kind: j.kind,
      a: sim.world.indexOf(j.a), b: sim.world.indexOf(j.b),
      normalForce: j.kind === 'hands' ? j.normalForce : undefined,
      tangentForce: j.kind === 'hands' ? j.tangentForce : undefined,
      forceOnB: j.kind === 'hands' ? j.forceOnB : undefined,
      momentOnA: j.kind === 'hands' ? j.momentOnA : undefined,
      momentOnB: j.kind === 'hands' ? j.momentOnB : undefined })) });
    return report;
  };
  while (sim.phase === 'live' && sim.t < stop) {
    const t = sim.t, start = cues.length;
    sim.tick();
    const state = { t: sim.t, rng: sim.rng, events: sim.events, perception: sim.perception,
      agents: sim.agents.map(a => ({ body: a.body, mind: a.mind, recog: a.recog, behavior: a.behavior, tags: a.tags })),
      engagements: sim.engagements, joints: sim.world.joints, intents: sim.intents, cmds: Reflect.get(sim, 'cmds') };
    hashes.push(sha(serialize(state)));
    const rb = sim.slot('RB')!, report = sim.lastStep!;
    if (crossing === null && sim.carrier === rb && rb.pos.x >= sim.los) crossing = sim.t;
    for (let i = 0; i < sim.agents.length; i++) {
      limits.armImpulseExcess = Math.max(limits.armImpulseExcess, report.armImpulse[i] - report.armImpulseLimit[i]);
      limits.armWorkExcess = Math.max(limits.armWorkExcess, report.armWork[i] - report.armWorkLimit[i]);
      limits.supportWorkExcess = Math.max(limits.supportWorkExcess, report.supportMotorWork[i] - report.supportMotorWorkLimit[i]);
    }
    limits.workResidual = Math.max(limits.workResidual, Math.abs(report.work.residual));
    frames.push({ t, after: sim.t, carrier: sim.carrier?.idx, worldInput, cues: cues.slice(start), report: copy(report),
      rngAfter: serialize(sim.rng), actorJob: behavior.plan.kind,
      agents: sim.agents.map(a => ({ id: a.idx, slot: a.slot, team: a.team, body: copy(a.body),
        supportMetrics: supportState(a), requested: copy(Reflect.get(sim, 'cmds')[a.idx]), delivered: copy(sim.intents[a.idx]), tags: [...a.tags] })) });
  }
  assert.equal(serialize(sim.agents.map(a => a.profile)), initialProfiles, 'Physical profiles changed');
  assert(Object.values(limits).every(v => v < 1e-8), serialize({ input, limits }));
  const first = sim.events.find(e => e.type === 'carrier_contact');
  return { input, actor: actor.idx, actorSlot: actor.slot, withBase, initial, hashes, frames, interventions,
    endTime: sim.t, outcome: sim.outcome, censored: sim.phase === 'live', crossing,
    gain: (sim.endSpot ?? sim.carrier?.pos ?? { x: sim.los }).x - sim.los,
    firstContact: first ? { t: first.t, opponent: sim.agents[first.b!].slot, note: first.note,
      depth: sim.firstContactX === null ? null : sim.firstContactX - sim.los } : null, limits, events: sim.events };
}
const started = performance.now();
const panel = manifest.cases.map((row: typeof manifest.cases[number]) => {
  const reference = saved.panel.find((r: { input: { id: string } }) => r.input.id === row.input.id);
  assert(reference && row.referenceSharedCollector);
  assert.equal(saved.protocol, 'ace-production-observations-v1');
  assert.deepEqual(reference.input, row.input);
  assert.deepEqual(reference.hashes, row.referenceHashes);
  const prefix = execute(row, false, manifest.referencePrefixSeconds);
  assert.deepEqual(prefix.hashes, reference.hashes.slice(0, prefix.hashes.length), 'Collector/wrapper changed reference');
  const candidate = execute(row, true, manifest.stopSeconds);
  assert(candidate.interventions.length > 0);
  let firstChangedTick = candidate.hashes.findIndex((hash, i) => hash !== reference.hashes[i]);
  assert(firstChangedTick >= 0);
  const firstChangedInterval = candidate.frames[firstChangedTick] as { t: number; after: number };
  console.log(serialize({ id: row.input.id, referencePrefixTicks: prefix.hashes.length,
    firstChangedInterval: { t: firstChangedInterval.t, after: firstChangedInterval.after },
    ending: candidate.endTime, firstContact: candidate.firstContact, crossing: candidate.crossing,
    gain: candidate.gain, limits: candidate.limits }));
  return { referencePrefixTicks: prefix.hashes.length, referenceReused: true, firstChangedTick, candidate };
});
for (const { path, bytes } of runtimeBefore) assert.deepEqual(readFileSync(path), bytes, 'Runtime changed during test');
const result = { protocol: 'te-base-production-result-v1',
  commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), node: process.version,
  comparisonBaseline: manifest.comparisonBaseline, runtimeSourceSha256: manifest.runtimeSourceSha256,
  manifestSha256: sha(readFileSync(manifestPath)), scriptSha256: sha(readFileSync(import.meta.filename)),
  savedSource: manifest.savedSource, worldSelection: manifest.worldSelection, panel,
  newFullNativePlays: panel.length, shortReferencePrefixes: panel.length, newGames: 0,
  productionSourceChanged: false, productionNativeReplayed: true,
  elapsedSeconds: (performance.now() - started) / 1000 };
const destination = process.argv[2] ?? 'out/te-base-production/native.json.gz';
mkdirSync(dirname(destination), { recursive: true });
writeFileSync(destination, gzipSync(serialize(result)));
