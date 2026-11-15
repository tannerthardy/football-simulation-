/** Shared native defense/blocking witnesses. Observation only; all cues are
 * actual calls to see(), not additional perceptions. */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { execFileSync } from 'node:child_process';
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
const contactTrace = process.env.CONTACT_TRACE === '1';
const stop = Number(process.env.FLOW_STOP ?? 3.5);
if (process.env.RUN_READ === '1' || process.env.RUN_READ_TURN === '1') throw new Error('Shared flow panel requires RB experiments off');
function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? sourceFiles(join(dir, e.name))
    : e.name.endsWith('.ts') ? [join(dir, e.name)] : []).sort();
}
const sourceHash = createHash('sha256');
for (const file of sourceFiles('src')) sourceHash.update(file).update('\0').update(readFileSync(file)).update('\0');
const provenance = { commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  sourceSha256: sourceHash.digest('hex'), probeSha256: createHash('sha256').update(readFileSync('scripts/diag/defense/flow-panel.ts')).digest('hex'),
  flags: Object.fromEntries(['PULL_PLAN', 'PULL_CUE', 'LB_PLAN', 'PULL_READ', 'FLOW_READ', 'SCRAPE', 'LIVE_GAPS', 'CF_FLOW',
    'RUN_READ', 'RUN_READ_TURN', 'RUN_CONTACT_TRACK', 'GAIT_STEP', 'DL_FIGHT',
    'HAND_MOTOR', 'RUN_HANDS', 'DL_HANDS', 'HAND_FIGHT', 'LEG_BRACE', 'TACKLE_ROLL',
    'WRAP_BIND', 'TACKLE_TOUCH', 'REACH_CONTACT'].map(k => [k, process.env[k] ?? null])) };
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
  const contactEvents: unknown[] = [], ends: unknown[] = [];
  let physicsInput: unknown;
  const reps = new WeakMap<object, number>();
  let nextRep = 0;
  const repId = (e: object) => { if (!reps.has(e)) reps.set(e, nextRep++); return reps.get(e)!; };
  let stage = 'tick';
  if (trace) {
    const see = sim.see.bind(sim);
    // Pass every argument through (the fourth, e.g. `sight: 'recog'`, changes what he sees): an observed play must match the plain one.
    sim.see = ((a: Parameters<typeof see>[0], b: Parameters<typeof see>[1], ...rest: unknown[]) => {
      const seen = (see as (...q: unknown[]) => ReturnType<typeof see>)(a, b, ...rest);
      if ((a.team === 'D' && b.team === 'O') || (contactTrace && a.team === 'O' && b.team === 'D')) cues.push({ t: sim.t, stage, defender: a.idx, opponent: b.idx,
        slot: b.slot, seen: copy(seen), actual: { pos: copy(b.pos), vel: copy(b.vel), stance: b.stance } });
      return seen;
    }) as typeof sim.see;
    for (const a of sim.defense) if (a.recog) {
      const update = a.recog.update.bind(a.recog);
      a.recog.update = (actor, s) => { stage = 'recognition'; update(actor, s); stage = 'tick'; };
    }
    if (contactTrace) {
      runContactObservers.set(sim, (e, phase, data) => {
        contactEvents.push({ t: sim.t, rep: repId(e), phase, blocker: e.blocker.idx,
          defender: e.defender.idx, helpers: e.helpers.map(h => h.idx),
          hands: e.hands ? { normal: e.hands.normalForce, tangent: e.hands.tangentForce,
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
        physicsInput = sim.engagements.map(e => ({ rep: repId(e), blocker: e.blocker.idx, defender: e.defender.idx,
          helpers: e.helpers.map(h => ({ actor: h.idx, command: copy(intents[h.idx]),
            hands: e.helperHands?.get(h) ? copy({ normal: e.helperHands.get(h)!.normalForce,
              tangent: e.helperHands.get(h)!.tangentForce, extension: e.helperHands.get(h)!.extension }) : null })) }));
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
        if (snapshot) writeFileSync(`${output}.physics-input.json`, JSON.stringify({ ...snapshot,
          report, after: sim.agents.map(a => copy(a.body)) }));
        return report;
      };
    }
    for (const a of sim.defense) {
      const aim = a.mind.aim.bind(a.mind);
      a.mind.aim = (job, desired, t) => {
        const held = aim(job, desired, t);
        aims.push({ defender: a.idx, t, job, desired: copy(desired), held: copy(held),
          interval: a.mind.decisionInterval });
        return held;
      };
    }
  }
  const wrapped = new WeakSet<object>();
  while (sim.phase === 'live' && sim.t < stop) {
    for (const a of contactTrace ? sim.agents : sim.defense) if (trace && !wrapped.has(a.behavior)) {
      wrapped.add(a.behavior);
      const update = a.behavior.update.bind(a.behavior);
      a.behavior.update = (actor, s) => { stage = 'behavior'; const command = update(actor, s); stage = 'tick'; return command; };
    }
    const before = sim.t, cueStart = cues.length, aimStart = aims.length, contactStart = contactEvents.length, endStart = ends.length;
    sim.tick();
    hashes.push(createHash('sha256').update(serialize({ t: sim.t, rng: sim.rng, events: sim.events, perception: sim.perception,
      agents: sim.agents.map(a => ({ body: a.body, mind: a.mind, recog: a.recog, behavior: a.behavior, tags: a.tags })),
      engagements: sim.engagements, joints: sim.world.joints, intents: sim.intents, cmds: Reflect.get(sim, 'cmds') })).digest('hex'));
    if (trace) frames.push({ t: before, after: sim.t, cues: cues.slice(cueStart), aims: aims.slice(aimStart),
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
        control: e.control, phi: e.phi, hands: e.hands ? { normal: e.hands.normalForce, tangent: e.hands.tangentForce,
          push: e.hands.push, hold: e.hands.hold } : null })),
      contacts: copy(sim.lastStep?.contacts), ground: copy(sim.lastStep?.groundImpulse) });
  }
  return { input: i, side, initial, hashes, frames, events: sim.events, endTime: sim.t, live: sim.phase === 'live',
    players: sim.agents.map(a => ({ id: a.idx, slot: a.slot, team: a.team, player: a.player.id,
      ...(contactTrace ? { profile: copy(a.profile) } : {}) })),
    gain: (sim.endSpot ?? sim.carrier?.pos ?? { x: sim.los }).x - sim.los };
}

const panel = [];
for (const i of inputs) {
  const recorded = execute(i, allCues), plain = execute(i, false);
  if (JSON.stringify(recorded.hashes) !== JSON.stringify(plain.hashes)) throw new Error(`Observer altered native play ${i.id}`);
  panel.push({ ...recorded, observerNeutral: true });
  console.log(`${panel.length}/${inputs.length} ${i.id} observed through ${recorded.endTime}`);
}
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, serialize({ protocol: contactTrace ? 'run-contact-v1' : 'defensive-flow-v1', provenance, stop, inputs, panel }));
writeFileSync(`${output}.inputs.json`, JSON.stringify({ protocol: 'defensive-flow-v1', inputs,
  config: { strength: .55, los: 40, ballY: CENTER_Y, firstDownX: 50, coverage: 'cover3', personnel: 'base43',
    runRead: 'off', runReadTurn: 'off', handContact: 'default center', stop } }, null, 2));
console.log(`Saved ${output}`);
