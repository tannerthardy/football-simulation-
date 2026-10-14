/** One isolated contact candidate on the three frozen Ace inputs. Saved
 * center/full-patch evidence is reused. Observed/plain pairing checks neutrality. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { gzipSync } from 'node:zlib';
import { CENTER_Y } from '../../../src/core/field.js';
import { Rng } from '../../../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../../../src/league/team.js';
import { RUN_BY_ID } from '../../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../../src/playbook/formations.js';
import { Agent } from '../../../src/sim/agent.js';
import { PlaySim } from '../../../src/sim/playsim.js';

const manifestPath = 'config/keeper-contact-law.json';
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const copy = <T>(v: T): T => structuredClone(v);
const serialize = (v: unknown) => JSON.stringify(v, (_k, x: unknown) => x instanceof Agent ? { agent: x.idx }
  : x instanceof PlaySim ? { sim: true } : x instanceof Map ? [...x] : x instanceof Set ? [...x] : x instanceof Float64Array ? [...x] : x);
const sha = (s: string | Buffer) => createHash('sha256').update(s).digest('hex');
function execute(input: typeof manifest.inputs[number], observe: boolean) {
  const formation = FORMATION_BY_ID[input.formation];
  const sim = new PlaySim({ offense: pickOffense(generateTeam(new Rng(input.o), 'O', 'O', { strength: manifest.strength }), formation.personnel),
    defense: pickDefense(generateTeam(new Rng(input.d), 'D', 'D', { strength: manifest.strength }), 'base43'),
    offCall: { formation, flip: input.flip, kind: 'run', run: RUN_BY_ID[input.concept], label: input.id },
    defCall: { personnel: 'base43', front: FRONT_BY_ID[input.front], coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'Over Cover 3' },
    los: manifest.los, ballY: CENTER_Y, firstDownX: 50, seed: input.seed,
    handContact: 'patch', groundMovement: 'legacy' });
  const initial = copy(sim.agents.map(a => a.pos)), profiles = copy(sim.agents.map(a => a.profile));
  const hashes: string[] = [], frames: unknown[] = [], cues: unknown[] = [];
  let worldInput: unknown, crossing: number | null = null;
  const limits = { armImpulseExcess: 0, armWorkExcess: 0, supportWorkExcess: 0, workResidual: 0 };
  if (observe) {
    const see = sim.see.bind(sim);
    sim.see = (a, b, scale) => {
      const seen = see(a, b, scale);
      cues.push({ t: sim.t, actor: a.idx, target: b.idx, actorSlot: a.slot, targetSlot: b.slot, seen: copy(seen) });
      return seen;
    };
    const step = sim.world.step.bind(sim.world);
    sim.world.step = (intents, dt) => {
      worldInput = { beforeBodies: copy(sim.agents.map(a => a.body)), intents: copy(intents),
        jointInputs: sim.world.joints.map(j => {
          const { a, b, ...rest } = j;
          const flat: Record<string, unknown> = { ...rest, a: sim.world.indexOf(a), b: sim.world.indexOf(b) };
          for (const key of ['actor', 'holder']) if (key in flat) flat[key] = sim.world.indexOf(Reflect.get(j, key));
          return copy(flat);
        }) };
      return step(intents, dt);
    };
  }
  while (sim.phase === 'live' && sim.t < manifest.stopSeconds) {
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
    if (observe) frames.push({ t, after: sim.t, carrier: sim.carrier?.idx, worldInput, cues: cues.slice(start), report: copy(report),
      agents: sim.agents.map(a => ({ id: a.idx, slot: a.slot, team: a.team, body: copy(a.body),
        requested: copy(Reflect.get(sim, 'cmds')[a.idx]), delivered: copy(sim.intents[a.idx]),
        zone: copy(Reflect.get(a.behavior, 'zoneRead')), tags: [...a.tags] })),
      jointOutputs: sim.world.joints.map(j => ({ kind: j.kind, a: sim.world.indexOf(j.a), b: sim.world.indexOf(j.b),
        normalForce: j.kind === 'hands' ? j.normalForce : undefined,
        tangentForce: j.kind === 'hands' ? j.tangentForce : undefined,
        forceOnB: j.kind === 'hands' ? j.forceOnB : undefined,
        momentOnA: j.kind === 'hands' ? j.momentOnA : undefined,
        momentOnB: j.kind === 'hands' ? j.momentOnB : undefined,
        force: j.kind !== 'hands' ? j.force : undefined })) });
  }
  assert(Object.values(limits).every(v => v < 1e-8), JSON.stringify({ input, limits }));
  const first = sim.events.find(e => e.type === 'carrier_contact');
  return { input, initial, profiles, hashes, frames, endTime: sim.t, outcome: sim.outcome,
    censored: sim.phase === 'live', crossing, gain: (sim.endSpot ?? sim.carrier?.pos ?? { x: sim.los }).x - sim.los,
    firstContact: first ? { t: first.t, opponent: sim.agents[first.b!].slot, note: first.note,
      depth: sim.firstContactX === null ? null : sim.firstContactX - sim.los } : null, limits, events: sim.events };
}
const started = performance.now();
const panel = manifest.inputs.map((input: typeof manifest.inputs[number]) => {
  const observed = execute(input, true), plain = execute(input, false);
  assert.deepEqual(observed.hashes, plain.hashes, `Observer neutrality: ${input.id}`);
  console.log(JSON.stringify({ id: input.id, ending: observed.endTime, firstContact: observed.firstContact,
    crossing: observed.crossing, gain: observed.gain, limits: observed.limits }));
  return { ...observed, observerNeutral: true };
});
const result = { protocol: 'contact-isolation-native-v1', comparisonCommit: manifest.comparisonCommit,
  commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), node: process.version,
  worldSelection: { handContact: 'patch', groundMovement: 'legacy', controllerMovementPreview: 'center' },
  manifestSha256: sha(readFileSync(manifestPath)), worldSha256: sha(readFileSync('src/physics/world.ts')),
  collectorSha256: sha(readFileSync('scripts/diag/physics/contact-isolation-native.ts')),
  elapsedSeconds: (performance.now() - started) / 1000, panel };
const destination = process.argv[2] ?? 'out/contact-isolation/native.json.gz';
mkdirSync(dirname(destination), { recursive: true });
writeFileSync(destination, gzipSync(serialize(result)));
