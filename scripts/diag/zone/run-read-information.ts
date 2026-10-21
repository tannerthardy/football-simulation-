/** Measurement only. Run in separate processes because RUN_READ/CF_FLOW are
 * module-load switches. Detailed traces stay in out/. See review protocol. */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { CENTER_Y } from '../../../src/core/field.js';
import { Rng } from '../../../src/core/rng.js';
import type { Vec2 } from '../../../src/core/vec.js';
import { generateTeam, pickDefense, pickOffense } from '../../../src/league/team.js';
import { RUN_BY_ID } from '../../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../../src/playbook/formations.js';
import { Agent } from '../../../src/sim/agent.js';
import { handoffReach } from '../../../src/sim/ball-transfer.js';
import { BallCarrier } from '../../../src/sim/behaviors/carrier.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import { RUN_READ, RUN_READ_TURN, runReads, type Answer } from '../../../src/sim/run-read.js';
import { runReadObservers, type RunReadObservation } from '../../../src/sim/run-read-observer.js';
import type { MoveCommand } from '../../../src/physics/kinematics.js';
import { previewFreeMovement } from '../../../src/physics/movement-preview.js';
import { timeToReach } from '../../../src/physics/reach.js';

type Input = { id: string; run: string; seed: number; o: number; d: number; front: string; flip: boolean };
type Picture = RunReadObservation & { entries: Record<Answer, Vec2>; answer: Answer | null; entry: Vec2 | null;
  key: number; blocker: number | null; candidateKey: number | null; side: number; horizon: number; leverage: number;
  committedAt: number | null; canCommit: boolean; why: string; risks: Partial<Record<Answer, number>> };
type Branch = { entry: Vec2; at: number; prefix: string; limit?: number };
type Decision = Picture & { prefix: string; pos: Vec2; vel: Vec2; initialBond: number[]; lastOpposingContacts: unknown[] };
const prescribedBranches = process.env.READ_INFO_TARGETS
  ? JSON.parse(readFileSync(process.env.READ_INFO_TARGETS, 'utf8')) as Record<string, Array<Branch & { name: string }>> : null;
const distance = (a: Vec2, b: Vec2) => Math.hypot(a.x - b.x, a.y - b.y);
const inputs: Input[] = [];
for (const run of ['oz_strong', 'wz_strong', 'oz_weak', 'wz_weak']) for (const seed of [3, 7])
  for (const [o, d] of [[31, 32], [41, 42], [51, 52]]) for (const front of ['over', 'under']) for (const flip of [false, true])
    inputs.push({ id: `${run} s${seed} ${o}/${d} ${front}${flip ? ' flip' : ''}`, run, seed, o, d, front, flip });
if (process.env.READ_INFO_INPUTS) {
  const supplied = JSON.parse(readFileSync(process.env.READ_INFO_INPUTS, 'utf8')) as Input[];
  inputs.splice(0, inputs.length, ...supplied);
}
if (process.env.READ_INFO_CASES) {
  const selected = new Set(process.env.READ_INFO_CASES.split('|'));
  const filtered = inputs.filter(i => selected.has(i.id));
  if (filtered.length !== selected.size) throw new Error('Unknown diagnostic case');
  inputs.splice(0, inputs.length, ...filtered);
}

function make(i: Input): PlaySim {
  return new PlaySim({
    offense: pickOffense(generateTeam(new Rng(i.o), 'O', 'O', { strength: .55 }), FORMATION_BY_ID.ace_11.personnel),
    defense: pickDefense(generateTeam(new Rng(i.d), 'D', 'D', { strength: .55 }), 'base43'),
    offCall: { formation: FORMATION_BY_ID.ace_11, flip: i.flip, kind: 'run', run: RUN_BY_ID[i.run], label: i.run },
    defCall: { personnel: 'base43', front: FRONT_BY_ID[i.front], coverage: COVERAGE_BY_ID.cover3, pressure: null, label: i.front },
    los: 40, ballY: CENTER_Y, firstDownX: 50, seed: i.seed,
  });
}

// Serializes private state for a diagnostic receipt, never writes it back.
function json(value: unknown): string {
  return JSON.stringify(value, (_key, v: unknown) => {
    if (v instanceof Agent) return { agent: v.idx };
    if (v instanceof Map) return [...v.entries()];
    if (v instanceof Set) return [...v];
    if (v instanceof Float64Array) return [...v];
    return v;
  });
}
function fingerprint(sim: PlaySim): string {
  const state = {
    t: sim.t, phase: sim.phase, rng: sim.rng, events: sim.events, ball: sim.ball, perception: sim.perception,
    carrier: sim.carrier?.idx, endSpot: sim.endSpot, handoffAt: sim.handoffAt,
    agents: sim.agents.map(a => ({ body: a.body, mind: a.mind, behavior: a.behavior, eyes: a.eyes,
      recog: a.recog, tags: a.tags, read: runReads.get(a), snapReadyAt: a.snapReadyAt })),
    engagements: sim.engagements, joints: sim.world.joints,
    intents: Reflect.get(sim, 'intents'), cmds: Reflect.get(sim, 'cmds'), bond: sim.bond,
  };
  return createHash('sha256').update(json(state)).digest('hex');
}

function execute(input: Input, observe: boolean, branch?: Branch) {
  const sim = make(input), rb = sim.slot('RB')!;
  const mesh = { nominalTime: Reflect.get(rb.behavior, 'meshTime') as number,
    point: Reflect.get(rb.behavior, 'mesh') as Vec2, reach: handoffReach(sim.qb, rb) };
  const observations: RunReadObservation[] = [], path: unknown[] = [], hashes: string[] = [];
  const checkpoints: Record<string, string> = {};
  const state = { decision: null as Decision | null };
  let firstPhysicalKey: number | null = null, currentPhysicalKey: number | null = null;
  let firstReachableMesh: number | null = null, firstContact: { t: number; defender: number; pos: Vec2; blocked: boolean } | null = null;
  let reached: number | null = null, minDistance = Infinity, intervened = false;
  let branchHeading = 0, nextBranchEval = -Infinity;
  const limit = branch?.limit ?? 2.5;
  if (observe) runReadObservers.set(sim, event => {
    const copied = JSON.parse(json(event)) as RunReadObservation;
    if (event.phase === 'entry-risk') {
      const entry = event.entry as Vec2, D = distance(rb.pos, entry) || 1e-6;
      copied.turnAwareSamples = (event.samples as Array<{ point: Vec2 }>).map(q => timeToReach(rb, q.point));
      copied.unloadedMovement = previewFreeMovement(rb.body, { vel: { x: (entry.x - rb.pos.x) / D * rb.profile.vmax,
        y: (entry.y - rb.pos.y) / D * rb.profile.vmax }, cutSkill: .85 + .35 * rb.r('elusiveness') }, sim.t, 30, sim.world.handContact);
      copied.initiallyConstrained = !!sim.bond || !!rb.engagement;
    }
    if (event.phase === 'read') {
      const p = event as Picture;
      const key = sim.agents[p.key], blocker = p.blocker === null ? null : sim.agents[p.blocker];
      const ol = sim.offense.filter(a => ['LT', 'LG', 'C', 'RG', 'RT'].includes(a.slot));
      const floor = Math.max(...ol.map(a => (a.pos.y - sim.ballY) * p.side)) - .6;
      currentPhysicalKey = sim.defense.filter(a => !a.isDown(sim.t) && a.pos.x - sim.los < 2 && (a.pos.y - sim.ballY) * p.side >= floor)
        .sort((a, b) => (a.pos.y - b.pos.y) * p.side)[0]?.idx ?? null;
      if (firstPhysicalKey === null) firstPhysicalKey = currentPhysicalKey;
      copied.physicalKey = currentPhysicalKey;
      copied.keyBody = { pos: key.pos, vel: key.vel, slot: key.slot };
      copied.blockerBody = blocker ? { pos: blocker.pos, vel: blocker.vel, slot: blocker.slot } : null;
      copied.actualLeverage = blocker ? (blocker.pos.y - key.pos.y) * p.side : null;
      copied.actualProjectedLeverage = blocker ? (blocker.pos.y + blocker.vel.y * p.horizon - key.pos.y - key.vel.y * p.horizon) * p.side : null;
      copied.actualBlock = sim.engagements.filter(e => e.defender === key).map(e => ({ blocker: e.blocker.idx,
        contactReported: !!e.contactReported, control: e.control,
        hands: e.hands ? { kind: e.hands.kind, push: e.hands.push, hold: e.hands.hold,
          normalForce: e.hands.normalForce, tangentForce: e.hands.tangentForce, forceOnB: e.hands.forceOnB,
          momentOnA: e.hands.momentOnA, momentOnB: e.hands.momentOnB } : null }));
      copied.rb = { pos: rb.pos, vel: rb.vel, support: rb.body.support };
    }
    observations.push(JSON.parse(json(copied)) as RunReadObservation);
  });
  const wrapped = new WeakSet<object>();
  while (sim.phase === 'live' && sim.t < 8) {
    if (sim.carrier !== rb && distance(sim.qb.pos, rb.pos) <= mesh.reach && firstReachableMesh === null) firstReachableMesh = sim.t;
    // The QB can replace the RB's behavior during its update. Wrap both the
    // installed and newly installed controller immediately via the property.
    const wrap = () => {
      const behavior = rb.behavior;
      if (wrapped.has(behavior)) return;
      wrapped.add(behavior);
      const update = behavior.update.bind(behavior);
      behavior.update = (a, s) => {
        const cmd = update(a, s);
        if (observe && process.env.READ_INFO_CHECKPOINTS === '1' && sim.carrier === rb) checkpoints[String(sim.t)] = fingerprint(sim);
        const st = runReads.get(rb);
        if (st?.answer && state.decision === null) {
          const p = [...observations].reverse().find(e => e.phase === 'read' && e.committedAt === st.committedAt) as Picture | undefined;
          if (p) state.decision = { ...p, prefix: fingerprint(sim), pos: { ...rb.pos }, vel: { ...rb.vel },
            initialBond: sim.bond?.carrier === rb ? sim.bond.tacklers.map(a => a.idx) : [],
            lastOpposingContacts: (sim.lastStep?.contacts ?? []).filter(c =>
              c.i === rb.idx && sim.agents[c.j].team === 'D' || c.j === rb.idx && sim.agents[c.i].team === 'D') };
        }
        if (branch && sim.t === branch.at && !intervened) {
          if (fingerprint(sim) !== branch.prefix) throw new Error(`Prefix mismatch: ${input.id}`);
          intervened = true;
          if (sim.bond?.carrier === rb) {
            const defender = sim.bond.tacklers[0];
            firstContact = { t: sim.t, defender: defender.idx, pos: { ...rb.pos }, blocked: !!defender.engagement };
          }
        }
        if (branch && intervened && reached === null && sim.t <= branch.at + limit && sim.carrier === rb && behavior instanceof BallCarrier) {
          // Native command preserves squeeze, cut capability, and boundary
          // constraints. All other players and the World run normally.
          const command = Reflect.get(behavior, 'command') as (a: Agent, s: PlaySim, h: number, speed: number, skill: number) => MoveCommand;
          if (sim.t >= nextBranchEval) {
            branchHeading = Math.atan2(branch.entry.y - a.pos.y, branch.entry.x - a.pos.x);
            nextBranchEval = sim.t + a.mind.decisionInterval;
          }
          return command.call(behavior, a, s, branchHeading,
            a.profile.vmax, .85 + .35 * a.r('elusiveness'));
        }
        return cmd;
      };
    };
    wrap();
    // onHandoff may replace behavior inside this tick, before the RB updates.
    const descriptor = Object.getOwnPropertyDescriptor(rb, 'behavior');
    let installed = rb.behavior;
    Object.defineProperty(rb, 'behavior', { configurable: true, enumerable: true,
      get: () => installed, set: value => { installed = value; wrap(); } });
    const before = sim.t;
    sim.tick();
    installed = rb.behavior;
    Object.defineProperty(rb, 'behavior', { ...descriptor, value: installed });
    const gate = branch?.at ?? state.decision?.t;
    if (gate !== undefined && before >= gate && !firstContact) {
      const events = sim.events.filter(e => e.t === before && ['carrier_contact', 'hit', 'tackle_wrap'].includes(e.type));
      for (const e of events) {
        const other = e.type === 'carrier_contact' ? e.b : e.a;
        if (other !== undefined && sim.agents[other].team === 'D') {
          firstContact = { t: before, defender: other, pos: { ...rb.pos }, blocked: !!sim.agents[other].engagement }; break;
        }
      }
    }
    if (branch && intervened && before <= branch.at + limit) {
      minDistance = Math.min(minDistance, distance(rb.pos, branch.entry));
      if (reached === null && distance(rb.pos, branch.entry) <= .65 && sim.carrier === rb) reached = sim.t;
    }
    hashes.push(fingerprint(sim));
    if (observe) path.push({ t: sim.t, pos: { ...rb.pos }, vel: { ...rb.vel }, facing: rb.facing,
      carrier: sim.carrier?.idx, command: Reflect.get(sim, 'cmds')[rb.idx], intent: Reflect.get(sim, 'intents')[rb.idx],
      support: JSON.parse(json(rb.body.support)), surface: sim.offense.filter(a => ['LT', 'LG', 'C', 'RG', 'RT'].includes(a.slot) || sim.offAlign.spots[a.slot]?.inline)
        .map(a => ({ id: a.idx, pos: { ...a.pos }, vel: { ...a.vel } })), opponents: sim.defense.map(d => ({ id: d.idx, pos: { ...d.pos }, vel: { ...d.vel },
        blocker: d.engagement?.blocker.idx ?? null, contactReported: !!d.engagement?.contactReported })) });
  }
  if (branch && !intervened) throw new Error(`Branch never executed: ${input.id}`);
  const end = sim.endSpot ?? sim.carrier?.pos ?? { x: sim.los, y: 0 };
  const decision = state.decision;
  const selected = decision ? observations.find(e => e.phase === 'aim' && e.t >= decision.t) : undefined;
  return { input, gain: end.x - sim.los, censored: sim.phase === 'live', phase: sim.phase,
    events: sim.events, outcome: sim.outcome, checkpoints,
    players: sim.agents.map(a => ({ id: a.idx, slot: a.slot, team: a.team, player: a.player.id, radius: a.profile.radius })),
    handoffAt: sim.handoffAt, mesh, firstReachableMesh, decision, firstPhysicalKey, selected,
    firstContact, observations, path, hashes, branch: branch ? { ...branch, reached,
      clean: reached !== null && (!firstContact || reached <= firstContact.t), minDistance: Number.isFinite(minDistance) ? minDistance : null,
      testedHorizon: limit, prefixVerified: intervened } : null };
}

const output = process.argv[2] ?? 'out/run-read-information/panel.json';
const count = Number(process.env.READ_INFO_LIMIT ?? inputs.length);
const panel = [];
for (const input of inputs.slice(0, count)) {
  const observed = execute(input, true);
  const plain = execute(input, false);
  // A no-sink run has no decision event; its state is still fingerprinted.
  if (json(observed.hashes) !== json(plain.hashes)) throw new Error(`Observer changed execution: ${input.id}`);
  const branches: Record<string, ReturnType<typeof execute>> = {};
  if (prescribedBranches?.[input.id]) {
    for (const { name, ...spec } of prescribedBranches[input.id]) branches[name] = execute(input, true, spec);
  }
  if (RUN_READ && observed.decision && process.env.READ_INFO_BRANCHES === '1') {
    const d = observed.decision;
    const points: Record<string, Vec2> = { ...d.entries };
    if (observed.selected?.selected) points.selected = observed.selected.selected as Vec2;
    for (const [name, entry] of Object.entries(points)) branches[name] = execute(input, true, { entry, at: d.t, prefix: d.prefix });
  }
  panel.push({ ...observed, observerNeutral: true, branches });
  console.log(`${panel.length}/${count} ${input.id} gain=${observed.gain.toFixed(2)} read=${observed.decision?.answer ?? '-'} branches=${Object.keys(branches).length}`);
}
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, json({ protocol: 'read-information-v1', read: RUN_READ, chargeRedirect: RUN_READ_TURN, flow: process.env.CF_FLOW ?? 'current',
  branchHorizon: 2.5, arrivalRadius: .65, originalStop: 8, inputs: inputs.slice(0, count), panel }));
console.log(`Saved ${output}`);
