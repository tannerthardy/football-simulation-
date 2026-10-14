/** Native contact-action traces through endings or an explicit 25-s cap.
 * No extra perception/RNG. Optional HAND_REMOVE/HAND_KEEP are diagnostic
 * request ablations, applied identically in observed and plain executions. */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { gzipSync } from 'node:zlib';
import { CENTER_Y } from '../../../src/core/field.js';
import { Rng } from '../../../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../../../src/league/team.js';
import { RUN_BY_ID, PASS_BY_ID } from '../../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../../src/playbook/formations.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import { playSideSign } from '../../../src/sim/behaviors/blocking.js';
import { Agent } from '../../../src/sim/agent.js';
import { runContactObservers } from '../../../src/sim/run-contact-observer.js';
import { runReadObservers } from '../../../src/sim/run-read-observer.js';

type Input = { id: string; concept: string; kind: 'run' | 'pass'; seed: number; flip: boolean;
  exchange?: boolean; o: number; d: number; front: string; formation: string };
const defaults: Input[] = [];
for (const seed of [3, 7]) for (const concept of ['oz_strong', 'iz_strong', 'power', 'counter']) for (const flip of [false, true])
  defaults.push({ id: `${concept}-s${seed}${flip ? '-mirror' : ''}`, concept, kind: 'run', seed, flip, o: 31, d: 32, front: 'over', formation: 'ace_11' });
for (const concept of ['draw', 'pa_flood', 'pa_post_dig', 'oz_strong']) for (const flip of [false, true])
  defaults.push({ id: `control-${concept}${flip ? '-mirror' : ''}`, concept, kind: concept.startsWith('pa_') ? 'pass' : 'run',
    seed: 3, flip, o: 31, d: 32, front: 'over', formation: 'ace_11', exchange: concept === 'oz_strong' });
const inputs: Input[] = process.env.FLOW_INPUTS ? JSON.parse(readFileSync(process.env.FLOW_INPUTS, 'utf8')).inputs : defaults;
const output = process.argv[2] ?? 'out/defensive-flow/baseline.json';
const allCues = process.env.FLOW_TRACE !== '0';
const peerCues = process.env.FLOW_PEERS === '1';
const contactTrace = process.env.CONTACT_TRACE === '1';
const carrierTrace = process.env.FLOW_CARRIER === '1';
const stop = Number(process.env.FLOW_STOP ?? 25);
const remove = process.env.HAND_REMOVE ?? '', keep = process.env.HAND_KEEP ?? '';
if (remove && keep) throw Error('Choose removal or isolation, not both');
if (!Number.isFinite(stop) || stop <= 0 || stop > 25) throw Error('Use an explicit window in (0,25] seconds');
if (process.env.RUN_READ === '1' || process.env.RUN_READ_TURN === '1') throw new Error('Shared flow panel requires RB experiments off');
function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? sourceFiles(join(dir, e.name))
    : e.name.endsWith('.ts') ? [join(dir, e.name)] : []).sort();
}
const sourceHash = createHash('sha256');
for (const file of sourceFiles('src')) sourceHash.update(file).update('\0').update(readFileSync(file)).update('\0');
const provenance = { commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  sourceSha256: sourceHash.digest('hex'), probeSha256: createHash('sha256').update(readFileSync('scripts/diag/defense/hand-action-panel.ts')).digest('hex'),
  intervention: { remove, keep },
  flags: Object.fromEntries(Object.keys(JSON.parse(readFileSync('config/baseline.json', 'utf8')).flags).map(k => [k, process.env[k] ?? null])) };
const copy = <T>(v: T): T => structuredClone(v);
const serialize = (v: unknown) => JSON.stringify(v, (_k, x: unknown) => x instanceof Agent ? { agent: x.idx }
  : x instanceof PlaySim ? { sim: true } : x instanceof Map ? [...x] : x instanceof Set ? [...x] : x instanceof Float64Array ? [...x] : x);

function execute(i: Input, trace: boolean) {
  const formation = FORMATION_BY_ID[i.formation];
  const sim = new PlaySim({
    offense: pickOffense(generateTeam(new Rng(i.o), 'O', 'O', { strength: .55 }), formation.personnel),
    defense: pickDefense(generateTeam(new Rng(i.d), 'D', 'D', { strength: .55 }), 'base43'),
    offCall: i.kind === 'run' ? { formation, flip: i.flip, kind: 'run', run: RUN_BY_ID[i.concept], label: i.id }
      : { formation, flip: i.flip, kind: 'pass', pass: PASS_BY_ID[i.concept], label: i.id },
    defCall: { personnel: 'base43', front: FRONT_BY_ID[i.front], coverage: COVERAGE_BY_ID.cover3, pressure: null,
      label: 'Over Cover 3', ...(i.exchange ? { gapExchange: { edge: 'DE_W' as const, backer: 'LB_W' as const } } : {}) },
    los: 40, ballY: CENTER_Y, firstDownX: 50, seed: i.seed,
  });
  const side = i.kind === 'run' ? playSideSign(sim, RUN_BY_ID[i.concept]) : sim.offAlign.strongSign;
  const initial = sim.agents.map(a => copy(a.pos));
  const frames: unknown[] = [], hashes: string[] = [], cues: unknown[] = [], aims: unknown[] = [];
  const contactEvents: unknown[] = [], ends: unknown[] = [], shedDecisions: unknown[] = [];
  const carrierEvents: unknown[] = [];
  if (trace && carrierTrace) runReadObservers.set(sim, event => {
    const a = sim.agents[event.actor];
    carrierEvents.push(JSON.parse(serialize({ ...event, pos: a.pos, vel: a.vel, facing: a.facing,
      support: a.body.support, decisionInterval: a.mind.decisionInterval,
      controllerState: Object.fromEntries(['heading', 'nextEval', 'wasDesigned', 'opts']
        .map(k => [k, Reflect.get(a.behavior, k)])) })));
  });
  const physicalHashes: string[] = [];
  const weakSet = WeakMap.prototype.set;
  let physicsInput: unknown;
  const flatJoint = (j: PlaySim['world']['joints'][number]) => {
    const { a, b, ...rest } = j;
    const out: Record<string, unknown> = { ...rest, a: sim.world.indexOf(a), b: sim.world.indexOf(b) };
    for (const key of ['actor', 'holder']) if (key in out) out[key] = sim.world.indexOf(Reflect.get(j, key));
    return copy(out);
  };
  const reps = new WeakMap<object, number>();
  let nextRep = 0;
  const repId = (e: object) => { if (!reps.has(e)) reps.set(e, nextRep++); return reps.get(e)!; };
  let stage = 'tick';
  // Intervene on a joint request after controllers, before the World solve.
  // The information, ratings, ownership, capacities and other requests stay.
  const nativeStep = sim.world.step.bind(sim.world);
  sim.world.step = (intents, dt) => {
    for (const j of sim.world.joints) if (j.kind === 'hands') {
      const pair = `${sim.agents[sim.world.indexOf(j.a)].slot}:${sim.agents[sim.world.indexOf(j.b)].slot}`;
      if (remove === pair || keep && keep !== pair) j.drive = 0;
    }
    return nativeStep(intents, dt);
  };
  if (trace) {
    const see = sim.see.bind(sim);
    sim.see = (a, b, scale) => {
      const seen = see(a, b, scale);
      if ((a.team === 'D' && b.team === 'O') || (contactTrace && a.team === 'O' && b.team === 'D')
        || (peerCues && a.team === b.team)) cues.push({ t: sim.t, stage, defender: a.idx, opponent: b.idx,
        slot: b.slot, seen: copy(seen), actual: { pos: copy(b.pos), vel: copy(b.vel), stance: b.stance } });
      return seen;
    };
    for (const a of sim.defense) if (a.recog) {
      const update = a.recog.update.bind(a.recog);
      a.recog.update = (actor, s) => { stage = 'recognition'; update(actor, s); stage = 'tick'; };
    }
    if (contactTrace) {
      runContactObservers.set(sim, (e, phase, data) => {
        contactEvents.push({ t: sim.t, rep: repId(e), phase, blocker: e.blocker.idx,
          defender: e.defender.idx, helpers: e.helpers.map(h => h.idx),
          control: e.control, side: e.side, hands: e.hands ? { actor: sim.world.indexOf(e.hands.actor ?? e.hands.a), drive: e.hands.drive ?? 0, normal: e.hands.normalForce, tangent: e.hands.tangentForce,
            push: e.hands.push, hold: e.hands.hold, extension: e.hands.extension } : null, ...copy(data) });
      });
      const disengage = sim.disengage.bind(sim);
      sim.disengage = e => {
        ends.push({ t: sim.t, rep: repId(e), blocker: e.blocker.idx, defender: e.defender.idx,
          helpers: e.helpers.map(h => h.idx), blockerBody: copy(e.blocker.body), defenderBody: copy(e.defender.body) });
        disengage(e);
      };
      const step = sim.world.step.bind(sim.world);
      sim.world.step = (intents, dt) => {
        const beforeBodies = copy(sim.agents.map(a => a.body));
        const jointRequests = sim.world.joints.map(flatJoint);
        const pending = (Reflect.get(sim.world, 'pending') as Array<{ a: Agent['body']; b: Agent['body']; x: number; y: number; height?: number }>).map(p => ({
          a: sim.world.indexOf(p.a), b: sim.world.indexOf(p.b), x: p.x, y: p.y, height: p.height }));
        physicsInput = { beforeBodies, intents: copy(intents), jointRequests, pending,
          reps: sim.engagements.map(e => ({ rep: repId(e), blocker: e.blocker.idx, defender: e.defender.idx,
            helpers: e.helpers.map(h => h.idx), control: e.control, side: e.side, phi: e.phi,
            drive: copy(e.drive), surfaceAxis: copy(e.surfaceAxis), sealTarget: e.sealTarget })) };
        const [id, at] = (process.env.CONTACT_SNAPSHOT ?? '').split('|');
        const snapshot = id === i.id && Math.abs(sim.t - Number(at)) < 1e-8 ? {
          input: i, provenance, t: sim.t, dt, handContact: sim.world.handContact,
          players: sim.agents.map(a => ({ id: a.idx, slot: a.slot })), bodies: sim.agents.map(a => copy(a.body)),
          intents: copy(intents), pending: (Reflect.get(sim.world, 'pending') as Array<{ a: Agent['body']; b: Agent['body']; x: number; y: number; height?: number }>).map(p => ({
            a: sim.world.bodies.indexOf(p.a), b: sim.world.bodies.indexOf(p.b), x: p.x, y: p.y, height: p.height })),
          joints: sim.world.joints.map(j => {
            const { a, b, ...rest } = j;
            const flat: Record<string, unknown> = { ...rest, a: sim.world.bodies.indexOf(a), b: sim.world.bodies.indexOf(b) };
            for (const key of ['actor', 'holder']) if (key in flat) flat[key] = sim.world.bodies.indexOf(Reflect.get(j, key));
            return copy(flat);
          }) } : null;
        const report = step(intents, dt);
        const jointInputs = jointRequests.map(j => ({ ...j, drive: j.kind === 'hands' && (remove === `${sim.agents[j.a as number].slot}:${sim.agents[j.b as number].slot}` || keep && keep !== `${sim.agents[j.a as number].slot}:${sim.agents[j.b as number].slot}`) ? 0 : j.drive }));
        Object.assign(physicsInput as object, { jointInputs, report: copy(report), afterBodies: copy(sim.agents.map(a => a.body)),
          jointOutputs: sim.world.joints.map(flatJoint) });
        if (snapshot) writeFileSync(`${output}.physics-input.json`, JSON.stringify({ ...snapshot,
          report, after: sim.agents.map(a => copy(a.body)) }));
        return report;
      };
    }
    for (const a of sim.agents) {
      const aim = a.mind.aim.bind(a.mind);
      a.mind.aim = (job, desired, t) => {
        const held = aim(job, desired, t);
        aims.push({ defender: a.idx, t, job, desired: copy(desired), held: copy(held),
          interval: a.mind.decisionInterval });
        return held;
      };
    }
  }
  if (trace) WeakMap.prototype.set = function (key: object, value: unknown) {
    const e = key as { blocker?: Agent; defender?: Agent }, v = value as { until?: number; side?: number } | null;
    if (e.blocker && e.defender && v && typeof v.until === 'number' && typeof v.side === 'number' && Object.keys(v).length === 2) {
      const cue = [...cues].reverse().find(x => {
        const c = x as { t: number; defender: number; opponent: number };
        return c.t === sim.t && c.defender === e.defender!.idx && c.opponent === sim.carrier?.idx;
      });
      shedDecisions.push({ t: sim.t, blocker: e.blocker.idx, defender: e.defender.idx, ...copy(v),
        cue: copy(cue), carrier: sim.carrier?.idx, defenderPos: copy(e.defender.pos), blockerPos: copy(e.blocker.pos) });
    }
    return weakSet.call(this, key, value);
  };
  const wrapped = new WeakSet<object>();
  try { while (sim.phase === 'live' && sim.t < stop) {
    for (const a of contactTrace ? sim.agents : sim.defense) if (trace && !wrapped.has(a.behavior)) {
      wrapped.add(a.behavior);
      const update = a.behavior.update.bind(a.behavior);
      a.behavior.update = (actor, s) => { stage = 'behavior'; const command = update(actor, s); stage = 'tick'; return command; };
    }
    const before = sim.t, cueStart = cues.length, aimStart = aims.length, contactStart = contactEvents.length, endStart = ends.length, carrierStart = carrierEvents.length;
    sim.tick();
    const state = { t: sim.t, rng: sim.rng, events: sim.events, perception: sim.perception,
      agents: sim.agents.map(a => ({ body: a.body, mind: a.mind, recog: a.recog, behavior: a.behavior, tags: a.tags })),
      engagements: sim.engagements, joints: sim.world.joints, intents: sim.intents, cmds: Reflect.get(sim, 'cmds') };
    physicalHashes.push(createHash('sha256').update(JSON.stringify(state, function (key, x) {
      if (key === 'drive' && this?.kind === 'hands') return undefined;
      return x instanceof Agent ? { agent: x.idx } : x instanceof PlaySim ? { sim: true }
        : x instanceof Map ? [...x] : x instanceof Set ? [...x] : x instanceof Float64Array ? [...x] : x;
    })).digest('hex'));
    hashes.push(createHash('sha256').update(serialize({ t: sim.t, rng: sim.rng, events: sim.events, perception: sim.perception,
      agents: sim.agents.map(a => ({ body: a.body, mind: a.mind, recog: a.recog, behavior: a.behavior, tags: a.tags })),
      engagements: sim.engagements, joints: sim.world.joints, intents: sim.intents, cmds: Reflect.get(sim, 'cmds') })).digest('hex'));
    if (trace) frames.push({ t: before, after: sim.t, cues: cues.slice(cueStart), aims: aims.slice(aimStart),
      ...(carrierTrace ? { carrierEvents: carrierEvents.slice(carrierStart) } : {}),
      ...(contactTrace ? { contactEvents: contactEvents.slice(contactStart), ends: ends.slice(endStart), carrier: sim.carrier?.idx,
        physicsInput: copy(physicsInput) } : {}),
      agents: sim.agents.map(a => ({ id: a.idx, slot: a.slot, team: a.team, pos: copy(a.pos), vel: copy(a.vel),
        facing: a.facing, support: copy(a.body.support), fit: copy(a.runFit), read: a.recog?.read,
        readAt: a.recog?.readAt, logOdds: a.recog?.logOdds, evidence: a.recog ? Reflect.get(a.recog, 'evidence') : undefined,
        requested: copy(Reflect.get(sim, 'cmds')[a.idx]), applied: copy(sim.intents[a.idx]),
        blocker: a.engagement?.blocker.idx, tags: [...a.tags], snapReadyAt: a.snapReadyAt,
        ...(contactTrace ? { spin: a.body.spin, energy: a.body.energy,
          work: Reflect.get(a.behavior, 'plan') && a.team === 'O' ? JSON.parse(serialize(Reflect.get(a.behavior, 'plan'))) : undefined,
          zone: Reflect.get(a.behavior, 'zoneRead') ? copy(Reflect.get(a.behavior, 'zoneRead')) : undefined } : {}) })),
      blocks: sim.engagements.map(e => ({ blocker: e.blocker.idx, defender: e.defender.idx, type: e.type,
        ...(contactTrace ? { rep: repId(e), helpers: e.helpers.map(h => h.idx), drive: e.drive,
          surfaceAxis: e.surfaceAxis, sealTarget: e.sealTarget,
          helperHands: [...e.helperHands ?? []].map(([h, j]) => ({ actor: h.idx, normal: j.normalForce,
            tangent: j.tangentForce, extension: j.extension })) } : {}),
        control: e.control, phi: e.phi, hands: e.hands ? { actor: sim.world.indexOf(e.hands.actor ?? e.hands.a), drive: e.hands.drive ?? 0, normal: e.hands.normalForce, tangent: e.hands.tangentForce,
          push: e.hands.push, hold: e.hands.hold } : null })),
      contacts: copy(sim.lastStep?.contacts), ground: copy(sim.lastStep?.groundImpulse) });
  }
  } finally { if (trace) WeakMap.prototype.set = weakSet; }
  return { input: i, side, initial, hashes, physicalHashes, shedDecisions, frames, events: sim.events, endTime: sim.t, live: sim.phase === 'live',
    players: sim.agents.map(a => ({ id: a.idx, slot: a.slot, team: a.team, player: a.player.id,
      ...(contactTrace ? { profile: copy(a.profile) } : {}) })),
    outcome: sim.outcome, endSpot: copy(sim.endSpot), censoring: sim.phase === 'live' ? `Still live at explicit ${stop}-second cap` : null,
    gain: (sim.endSpot ?? sim.carrier?.pos ?? { x: sim.los }).x - sim.los };
}

const panel = [];
for (const i of inputs) {
  const recorded = execute(i, allCues), plain = execute(i, false);
  if (JSON.stringify(recorded.hashes) !== JSON.stringify(plain.hashes) || JSON.stringify(recorded.physicalHashes) !== JSON.stringify(plain.physicalHashes)) throw new Error(`Observer altered native play ${i.id}`);
  panel.push({ ...recorded, observerNeutral: true });
  console.log(`${panel.length}/${inputs.length} ${i.id} observed through ${recorded.endTime}`);
}
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, gzipSync(serialize({ protocol: 'hand-action-protection-v1', provenance, stop, inputs, panel })));
writeFileSync(`${output}.inputs.json`, JSON.stringify({ protocol: 'defensive-flow-v1', inputs,
  config: { strength: .55, los: 40, ballY: CENTER_Y, firstDownX: 50, coverage: 'cover3', personnel: 'base43',
    runRead: 'off', runReadTurn: 'off', handContact: 'default center', stop } }, null, 2));
console.log(`Saved ${output}`);
