/** One saved, naturally reacting play; observer only. No additional see(),
 * behavior invocation, random draw or physics step. Run through baseline.mjs.
 * Usage: native-traffic.ts SETUP.json OUTPUT.json[.gz] [MAX_TIME=4.25]
 * Runs the same input plain and observed, requiring equal engine endpoints.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { gzipSync } from 'node:zlib';
import type { MoveCommand } from '../../../src/physics/kinematics.js';
import type { Behavior } from '../../../src/sim/agent.js';
import { movementObjective } from '../../../src/sim/movement-objective.js';
import { PlaySim, type PlaySetup } from '../../../src/sim/playsim.js';
import { sourceVersion } from '../../source-version.js';

const [input, output, seconds = '4.25'] = process.argv.slice(2);
assert.ok(input && output && process.argv.length <= 5,
  'Usage: native-traffic.ts SETUP.json OUTPUT.json[.gz] [MAX_TIME=4.25]');
assert.notEqual(input, output, 'Do not overwrite the saved input');
const maxTime = Number(seconds);
assert.ok(Number.isFinite(maxTime) && maxTime > 0 && maxTime <= 4.25
  && Math.abs(maxTime / .05 - Math.round(maxTime / .05)) < 1e-8,
  'Use a positive .05s multiple, at most 4.25s');
const sha = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
const clone = <T>(value: T): T => structuredClone(value);
const command = (value: MoveCommand | null | undefined) => value
  ? { request: clone(value), objective: clone(movementObjective(value)) ?? null } : null;
const rawInput = readFileSync(input), inputSha256 = sha(rawInput);
const saved = JSON.parse(rawInput.toString()) as { case?: string; inputSha256?: string; setup: PlaySetup };
assert.ok(saved.setup, 'Expected a saved {setup} wrapper');
if (saved.case === 'A042') assert.equal(inputSha256,
  '243da6adee0bad51af03e297dc12bb6687600997a2c13ccf11f29ab6f1fe71aa', 'A042 fixture bytes changed');
if (saved.inputSha256) assert.equal(sha(JSON.stringify(saved.setup)), saved.inputSha256, 'Saved setup digest differs');
const source = sourceVersion(), toolBytes = readFileSync(import.meta.filename);

/** Preserve maps, typed arrays, nonfinite numbers and graph references. Only
 * data are compared: observer function wrappers are intentionally excluded.
 * Own data on behaviors, all RNG streams and perception buffers are included.
 * Weak collections/closure internals are not inspectable by this observer.
 */
function data(value: unknown): unknown {
  const seen = new Map<object, number>();
  function visit(v: any): any {
    if (v === undefined) return { $undefined: true };
    if (typeof v === 'number' && !Number.isFinite(v)) return { $number: String(v) };
    if (typeof v === 'bigint') return { $bigint: String(v) };
    if (v === null || typeof v !== 'object') return v;
    const previous = seen.get(v);
    if (previous !== undefined) return { $ref: previous };
    const id = seen.size; seen.set(v, id);
    if (ArrayBuffer.isView(v)) return { $id: id, type: v.constructor.name,
      bytes: Buffer.from(v.buffer, v.byteOffset, v.byteLength).toString('hex') };
    if (v instanceof ArrayBuffer) return { $id: id, type: 'ArrayBuffer', bytes: Buffer.from(v).toString('hex') };
    if (v instanceof Map) return { $id: id, type: 'Map', entries: [...v].map(([k, x]) => [visit(k), visit(x)]) };
    if (v instanceof Set) return { $id: id, type: 'Set', entries: [...v].map(visit) };
    if (Array.isArray(v)) return { $id: id, type: 'Array', entries: v.map(visit) };
    return { $id: id, type: v.constructor?.name ?? 'Object', fields: Object.fromEntries(
      Object.keys(v).sort().filter(k => typeof v[k] !== 'function').map(k => [k, visit(v[k])])) };
  }
  return visit(value);
}
const digest = (value: unknown) => sha(JSON.stringify(data(value)));
function signature(sim: PlaySim) {
  const cmds = Reflect.get(sim, 'cmds') as MoveCommand[];
  return { engine: digest({ sim, commandObjectives: cmds.map(command), intentObjectives: sim.intents.map(command) }),
    bodies: digest(sim.agents.map(a => a.body)), minds: digest(sim.agents.map(a => a.mind)),
    behaviors: digest(sim.agents.map(a => a.behavior)), rng: digest(sim.rng),
    perception: digest(sim.perception), events: digest(sim.events) };
}

function run(observe: boolean) {
  const wall = performance.now(), cpu = process.cpuUsage();
  const sim = new PlaySim(clone(saved.setup)), rows: any[] = [];
  let decisions: any[] = [], pictures: any[] = [], calledMotion: any[] = [];
  let preSpacing: ReturnType<typeof command>[] | null = null;
  let active: { idx: number; behavior: string } | null = null;
  // This callback occurs before the spacing loop's first intents[i] write.
  // Its source stage is explicit; contact and coverage modifiers stay grouped.
  const stage = () => active ? 'behavior' : /\bspaceTeammates\b/.test(new Error().stack ?? '') ? 'spacing' : 'other';
  if (observe) {
    const wrapped = new WeakSet<Behavior>();
    function attach(behavior: Behavior) {
      if (wrapped.has(behavior)) return;
      wrapped.add(behavior);
      const update = behavior.update;
      behavior.update = function(actor, play) {
        const previous = active;
        active = { idx: actor.idx, behavior: this.kind };
        const decision: any = { t: sim.t, idx: actor.idx, behavior: this.kind,
          ownIncoming: { pos: { ...actor.pos }, vel: { ...actor.vel }, facing: actor.facing,
            energy: actor.body.energy, support: actor.body.support?.state ?? null } };
        decisions.push(decision);
        try {
          const result = update.call(this, actor, play);
          decision.raw = command(result);
          return result;
        } finally { active = previous; }
      };
      if (behavior.calledMotion) {
        const called = behavior.calledMotion;
        behavior.calledMotion = function() {
          const result = called.call(this);
          calledMotion.push({ t: sim.t, stage: stage(),
            owners: sim.agents.filter(a => a.behavior === this).map(a => a.idx), value: clone(result) });
          return result;
        };
      }
    }
    // A replacement assigned during another actor's update is wrapped before
    // the engine invokes it. Existing behavior instances are never cloned.
    for (const agent of sim.agents) {
      let current = agent.behavior; attach(current);
      Object.defineProperty(agent, 'behavior', { enumerable: true, configurable: true,
        get: () => current, set: (next: Behavior) => { attach(next); current = next; } });
    }
    const see = sim.see;
    sim.see = function(observer, target, delay) {
      const consumer = stage();
      if (consumer === 'spacing' && preSpacing === null) preSpacing = this.intents.map(command);
      const result = see.call(this, observer, target, delay);
      pictures.push({ t: sim.t, stage: consumer, producer: active && { ...active },
        observer: observer.idx, target: target.idx, delayScale: delay ?? 1,
        sourceAge: result.age ?? null, sampledAt: result.age === undefined ? null : sim.t - result.age,
        picture: clone(result) });
      return result;
    };
    const step = sim.world.step;
    sim.world.step = function(intents, dt) {
      const before = sim.agents.map(a => clone(a.body)); // Full Body exactly once per step.
      const baseCommands = (Reflect.get(sim, 'cmds') as MoveCommand[]).map(command);
      const applied = intents.map(command);
      const heldDecisions = decisions, heldPictures = pictures, heldCalledMotion = calledMotion;
      const report = step.call(this, intents, dt);
      rows.push({ t: sim.t, end: sim.t + dt, before, decisions: heldDecisions,
        consumed: heldPictures, calledMotion: heldCalledMotion, baseCommands,
        preSpacing, applied,
        achieved: sim.agents.map((a, i) => ({ idx: a.idx, pos: { ...a.pos }, vel: { ...a.vel },
          facing: a.facing, spin: a.body.spin ?? 0, support: clone(a.body.support), energy: a.body.energy,
          displacement: { x: a.pos.x - before[i].pos.x, y: a.pos.y - before[i].pos.y },
          deltaVelocity: { x: a.vel.x - before[i].vel.x, y: a.vel.y - before[i].vel.y } })),
        contacts: clone(report.contacts), groundImpulse: clone(report.groundImpulse),
        groundYawImpulse: clone(report.groundYawImpulse), falls: clone(report.falls),
        downs: clone(report.downs), rises: clone(report.rises), substeps: report.substeps, work: clone(report.work),
        grasps: this.joints.filter(j => j.kind === 'grasp').map(j => {
          const { a, b, ...state } = j;
          return { a: sim.agents.find(x => x.body === a)?.idx, b: sim.agents.find(x => x.body === b)?.idx,
            ...clone(state) };
        }),
        blocks: sim.engagements.map(e => ({ blocker: e.blocker.idx, defender: e.defender.idx,
          helpers: e.helpers.map(a => a.idx), type: e.type,
          normalForce: e.hands?.normalForce ?? null, tangentForce: e.hands?.tangentForce ?? null })) });
      return report;
    };
  }
  // Same native snap marker and tick loop in both arms; no PlaySim.run() tail.
  sim.event('snap', sim.slot('C') ?? sim.qb);
  while (sim.phase === 'live' && sim.t < maxTime - 1e-9) {
    decisions = []; pictures = []; calledMotion = []; preSpacing = null;
    const eventStart = sim.events.length, count = rows.length;
    sim.tick();
    if (observe && rows.length > count) rows.at(-1).events = clone(sim.events.slice(eventStart));
  }
  const used = process.cpuUsage(cpu);
  return { observe, actors: sim.agents.map(a => ({ idx: a.idx, slot: a.slot, team: a.team,
      id: a.player.id, profile: clone(a.profile) })), signature: signature(sim),
    result: { phase: sim.phase, outcome: sim.outcome, t: sim.t, carrier: sim.carrier?.idx ?? null,
      endSpot: clone(sim.endSpot), rbPos: sim.slot('RB') ? { ...sim.slot('RB')!.pos } : null },
    events: clone(sim.events), rows,
    runtime: { wallSeconds: (performance.now() - wall) / 1000, cpuSeconds: (used.user + used.system) / 1e6 } };
}

const plain = run(false), observed = run(true);
assert.deepEqual(observed.signature, plain.signature,
  'Observer changed full engine/body/mind/behavior/RNG/perception/event endpoint');
assert.equal(sourceVersion(), source, 'Engine source changed during collection');
assert.equal(sha(readFileSync(input)), inputSha256, 'Saved input changed during collection');
assert.equal(sha(readFileSync(import.meta.filename)), sha(toolBytes), 'Observer changed during collection');
const profile = JSON.parse(readFileSync('config/baseline.json', 'utf8'));
const receipt = { schema: 'native-traffic-v1', case: saved.case ?? null, source,
  commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  node: process.version, input, inputSha256, setupSha256: sha(JSON.stringify(saved.setup)), toolSha256: sha(toolBytes),
  maxTime, flags: Object.fromEntries(Object.keys(profile.flags).map(k => [k, process.env[k] ?? null])),
  definitions: {
    bodies: 'All 22 pre-World bodies are diagnostic truth, never supplied to a controller.',
    commands: 'Behavior return (raw), coverage-contained cmds before contact, first-spacing-callback intents, and final pre-World intents are distinct; symbol movement objectives are saved separately.',
    pictures: 'Only existing see() returns. Age is preserved; unknown age/sample time remains null. Spacing may subsequently apply the separately recorded installed calledMotion return.',
    stage: 'Behavior calls use their active producer. Spacing is identified by its existing callback stack; remaining producer attribution stays other.',
    identity: 'Canonical full enumerable engine data plus symbol objectives; includes body/mind/behavior data, RNG streams, typed perception storage and events. Functions, weak collections and closure internals cannot be compared.',
  },
  observed, observerControl: { matched: true, signature: plain.signature, result: plain.result, runtime: plain.runtime } };
mkdirSync(dirname(output), { recursive: true });
const bytes = Buffer.from(JSON.stringify(receipt) + '\n');
writeFileSync(output, output.endsWith('.gz') ? gzipSync(bytes) : bytes);
console.log(JSON.stringify({ output, source, inputSha256, matched: true, result: observed.result,
  steps: observed.rows.length, runtime: { plain: plain.runtime, observed: observed.runtime } }, null, 2));
