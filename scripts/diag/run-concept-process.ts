/** Observational run-install process panel. No extra reads, decisions or RNG.
 * node --import tsx scripts/diag/run-concept-process.ts out/run-process.json
 * [--runs iz_strong,oz_strong,duo,trap] [--fronts over,under,tite]
 * [--seeds 3,11] [--seconds 4] [--verify]
 * True state is diagnostic evidence, not what a player necessarily perceived.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { CENTER_Y } from '../../src/core/field.js';
import { Rng } from '../../src/core/rng.js';
import type { Vec2 } from '../../src/core/vec.js';
import { generateTeam, pickDefense, pickOffense } from '../../src/league/team.js';
import { RUN_BY_ID } from '../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../src/playbook/formations.js';
import type { Agent } from '../../src/sim/agent.js';
import { RunnerToMesh } from '../../src/sim/assign.js';
import { RunBlocker, type Combination } from '../../src/sim/behaviors/blocking.js';
import { BallCarrier, type CarrierOptions } from '../../src/sim/behaviors/carrier.js';
import { PlaySim, type PlaySetup } from '../../src/sim/playsim.js';
import { sourceVersion } from '../source-version.js';

const args = process.argv.slice(2);
const option = (name: string, fallback: string): string => {
  const at = args.indexOf(name); return at < 0 ? fallback : args[at + 1];
};
const out = args[0] && !args[0].startsWith('--') ? args[0] : 'out/run-process.json';
const runs = option('--runs', 'iz_strong,oz_strong,wz_strong,duo,power,counter,trap').split(',');
const fronts = option('--fronts', 'over,under,tite').split(',');
const seeds = option('--seeds', '3,11').split(',').map(Number);
const horizon = Number(option('--seconds', '4'));
const verify = args.includes('--verify');
if (!Number.isFinite(horizon) || horizon <= 0 || !seeds.every(Number.isFinite)) throw new Error('Invalid sample horizon or seeds');
const off = generateTeam(new Rng(7), 'Process offense', 'OFF');
const def = generateTeam(new Rng(8), 'Process defense', 'DEF');
const q = (n: number) => Math.round(n * 10000) / 10000;
const pos = (v: Vec2) => ({ x: q(v.x), y: q(v.y) });
const body = (a: Agent) => ({ slot: a.slot, pos: pos(a.pos), vel: pos(a.vel), speed: q(a.speed),
  support: a.body.support?.state ?? null });
const separation = (a: Agent, b: Agent) => q(Math.hypot(a.pos.x - b.pos.x, a.pos.y - b.pos.y));

function sample(combo: Combination, sim: PlaySim) {
  const e = combo.defender.engagement;
  const paired = !!e && combo.members.every(a => a.engagement === e);
  const force = e?.hands ? Math.hypot(e.hands.normalForce ?? 0, e.hands.tangentForce ?? 0) : 0;
  const helpers = combo.members.map(a => {
    const hands = e?.helperHands?.get(a);
    return { slot: a.slot, force: hands ? q(Math.hypot(hands.normalForce ?? 0, hands.tangentForce ?? 0)) : 0 };
  });
  const actualDouble = paired && force > 1e-6 && helpers.some(h => h.force > 1e-6);
  return { paired, actualDouble, control: e ? q(e.control) : null, phi: e ? q(e.phi) : null,
    blockerBase: e ? q(e.baseB) : null, primary: e?.blocker.slot ?? null, primaryForce: q(force), helpers,
    secureSince: combo.secureSince < 0 ? null : q(combo.secureSince),
    secureDwell: combo.secureSince < 0 ? null : q(sim.t - combo.secureSince),
    runnerDepth: sim.slot('RB') ? q(sim.slot('RB')!.pos.x - sim.los) : null,
    backerDistanceByMember: combo.backer ? combo.members.map(a => ({ slot: a.slot, distance: separation(a, combo.backer!) })) : null,
    defender: body(combo.defender), backer: combo.backer ? body(combo.backer) : null,
    members: combo.members.map(body) };
}

function setup(run: string, front: string, seed: number, flip: boolean): PlaySetup {
  if (!RUN_BY_ID[run] || !FRONT_BY_ID[front]) throw new Error(`Unknown run/front ${run}/${front}`);
  const formation = FORMATION_BY_ID.ace_11;
  const personnel = FRONT_BY_ID[front].personnel[0];
  return { offense: pickOffense(off, formation.personnel), defense: pickDefense(def, personnel),
    offCall: { formation, flip, kind: 'run', run: RUN_BY_ID[run], label: 'run-process fixture' },
    defCall: { personnel, front: FRONT_BY_ID[front], coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'run-process fixture' },
    los: 40, ballY: CENTER_Y, firstDownX: 50, seed, record: false };
}

function trace(input: PlaySetup) {
  const sim = new PlaySim(input);
  const rb = sim.slot('RB')!;
  const aim = rb.behavior instanceof RunnerToMesh ? { ...rb.behavior.aim } : null;
  const initial = sim.offense.filter(a => a.behavior instanceof RunBlocker).map(a => {
    const p = (a.behavior as RunBlocker).plan;
    return { slot: a.slot, kind: p.kind, target: p.target?.slot ?? null, climbTo: p.climbTo?.slot ?? null,
      drive: pos(p.drive), pullRole: p.pullRole ?? null, pullPath: p.pullPath?.map(pos) ?? null };
  });
  const combos = [...new Set(sim.offense.map(a => a.behavior instanceof RunBlocker ? a.behavior.plan.combination : undefined).filter((c): c is Combination => !!c))];
  const combination = combos.map(c => ({ defender: c.defender.slot, members: c.members.map(a => a.slot),
    backer: c.backer?.slot ?? null, firstConcurrentLoad: null as number | null,
    concurrentLoadTicks: 0, released: null as null | { kind: 'climb' | 'collect' | 'other'; tickStart: number; tickEnd: number; before: ReturnType<typeof sample>; after: ReturnType<typeof sample> },
    final: null as ReturnType<typeof sample> | null }));
  const pullers = sim.offense.filter(a => a.behavior instanceof RunBlocker && a.behavior.plan.kind === 'pull');
  const pullContact = new Map<string, unknown>();
  const carrier: unknown[] = [];
  const events: unknown[] = [];
  let mesh: unknown = null;
  let firstLineCross: unknown = null;
  let maxAimLateralDeparture = 0;
  while (sim.phase === 'live' && sim.t < horizon) {
    const t = sim.t, beforeCombos = combos.map(c => sample(c, sim)), oldReleased = combos.map(c => c.released);
    const before = sim.agents.map(body), eventStart = sim.events.length;
    // Inspect an existing field only. Never invoke the carrier's evaluator.
    const opts = rb.behavior instanceof BallCarrier ? (rb.behavior as unknown as { opts: CarrierOptions }).opts : null;
    const designedGate = !!opts?.aim && opts.aimUntil !== undefined && t < opts.aimUntil && rb.pos.x < sim.los - .8;
    const gateExpiry = opts?.aimUntil ?? null;
    sim.tick();
    const newEvents = sim.events.slice(eventStart);
    for (let i = 0; i < combos.length; i++) {
      const after = sample(combos[i], sim), row = combination[i];
      if (after.actualDouble) { row.firstConcurrentLoad ??= q(sim.t); row.concurrentLoadTicks++; }
      if (!oldReleased[i] && combos[i].released) {
        const involved = newEvents.filter(e => e.a !== undefined && combos[i].members.includes(sim.agents[e.a]));
        const kind = involved.some(e => e.type === 'block_climb') ? 'climb' : involved.some(e => e.type === 'block_collect') ? 'collect' : 'other';
        row.released = { kind, tickStart: q(t), tickEnd: q(sim.t), before: beforeCombos[i], after };
      }
      row.final = after;
    }
    for (const event of newEvents) {
      if (!['handoff', 'block_contact', 'block_climb', 'block_exchange', 'block_collect', 'block_log', 'shed'].includes(event.type)) continue;
      events.push({ t: q(event.t), type: event.type, a: event.a === undefined ? null : sim.agents[event.a].slot,
        b: event.b === undefined ? null : sim.agents[event.b].slot, note: event.note ?? null });
      if (event.type === 'handoff') mesh = { tickStart: q(t), tickEnd: q(sim.t), beforeDistance: q(Math.hypot(before[rb.idx].pos.x - before[sim.qb.idx].pos.x,
        before[rb.idx].pos.y - before[sim.qb.idx].pos.y)), afterDistance: separation(rb, sim.qb), qb: body(sim.qb), rb: body(rb) };
      if (event.type === 'block_contact' && event.a !== undefined && event.b !== undefined) {
        const p = sim.agents[event.a], d = sim.agents[event.b];
        if (pullers.includes(p) && !pullContact.has(p.slot)) {
          const plan = (p.behavior as RunBlocker).plan, e = p.engagement;
          pullContact.set(p.slot, { slot: p.slot, role: plan.pullRole, target: d.slot, tickStart: q(t), tickEnd: q(sim.t),
            relativeVelocityBefore: pos({ x: before[p.idx].vel.x - before[d.idx].vel.x, y: before[p.idx].vel.y - before[d.idx].vel.y }),
            before: before[p.idx], after: body(p), defender: body(d), log: p.tags.has('block-log'),
            phi: e ? q(e.phi) : null, blockerBase: e ? q(e.baseB) : null });
        }
      }
    }
    if (sim.carrier === rb && aim) {
      if (rb.pos.x < sim.los) maxAimLateralDeparture = Math.max(maxAimLateralDeparture, Math.abs(rb.pos.y - aim.y));
      if (!firstLineCross && rb.pos.x >= sim.los) firstLineCross = { t: q(sim.t), position: pos(rb.pos), aimLateralDeparture: q(rb.pos.y - aim.y), speed: q(rb.speed) };
      carrier.push({ t: q(t), tickEnd: q(sim.t), before: before[rb.idx], after: body(rb),
        aim: pos(aim), designedGateEligibleBefore: designedGate, absoluteAimExpiryBefore: gateExpiry === null ? null : q(gateExpiry),
        intent: sim.intents[rb.idx] ? pos(sim.intents[rb.idx].vel) : null,
        pacedLeadEver: rb.tags.has('paced-lead'), creaseReadEver: rb.tags.has('run-crease-read') });
    }
  }
  const signature = () => JSON.stringify({ t: sim.t, events: sim.events, bodies: sim.agents.map(a => a.body),
    intents: sim.intents, stats: sim.stats, outcome: sim.outcome, endSpot: sim.endSpot });
  let observerPreserved = null as boolean | null;
  if (verify) {
    const plain = new PlaySim(input);
    while (plain.phase === 'live' && plain.t < horizon) plain.tick();
    observerPreserved = signature() === JSON.stringify({ t: plain.t, events: plain.events, bodies: plain.agents.map(a => a.body),
      intents: plain.intents, stats: plain.stats, outcome: plain.outcome, endSpot: plain.endSpot }) && sim.rng.nextU32() === plain.rng.nextU32();
    if (!observerPreserved) throw new Error('Observer changed simulation state or RNG');
  }
  return { run: input.offCall.run!.id, scheme: input.offCall.run!.scheme, front: input.defCall.front.id, flip: input.offCall.flip,
    seed: input.seed, horizon, initialAim: aim, initial, combination, pullContact: [...pullContact.values()], mesh,
    firstLineCross, maxAimLateralDepartureBeforeLOS: q(maxAimLateralDeparture), carrier, events,
    result: { duration: q(sim.t), completed: sim.phase === 'dead', outcome: sim.outcome, endSpot: sim.endSpot ? pos(sim.endSpot) : null },
    observerPreserved };
}

const sourceSha256 = sourceVersion();
const trials: ReturnType<typeof trace>[] = [];
for (const run of runs) for (const front of fronts) for (const seed of seeds) for (const flip of [false, true]) trials.push(trace(setup(run, front, seed, flip)));
const cells = runs.flatMap(run => fronts.map(front => {
  const group = trials.filter(t => t.run === run && t.front === front);
  const combos = group.flatMap(t => t.combination);
  return { run, front, snaps: group.length, plannedCombinations: combos.length,
    reachedConcurrentPhysicalLoad: combos.filter(c => c.firstConcurrentLoad !== null).length,
    combinationsClimbed: combos.filter(c => c.released?.kind === 'climb').length,
    combinationsDissolvedForPenetration: combos.filter(c => c.released?.kind === 'collect').length,
    climbedWithoutObservedConcurrentLoad: combos.filter(c => c.released?.kind === 'climb' && c.firstConcurrentLoad === null).length,
    plannedPullers: group.flatMap(t => t.initial).filter(p => p.kind === 'pull').length,
    pullersWithContactEvent: group.flatMap(t => t.pullContact).length,
    handoffs: group.filter(t => t.mesh).length, reachedLOS: group.filter(t => t.firstLineCross).length };
}));
mkdirSync(dirname(out), { recursive: true });
if (sourceVersion() !== sourceSha256) throw new Error('Source changed during panel; rerun after source freeze');
writeFileSync(out, JSON.stringify({ version: 1, sourceSha256, cohort: { rosterSeeds: [7, 8], formation: 'ace_11', coverage: 'cover3',
  playSeeds: seeds, runs, fronts, flips: [false, true], horizon, fixedGeneratedTeams: true,
  defensivePersonnelByFront: Object.fromEntries(fronts.map(f => [f, FRONT_BY_ID[f].personnel[0]])) },
  limits: ['True boundary state is diagnostic evidence, not a causal reconstruction of player perception.',
    'Physical load is sampled at 20 Hz; briefer load can be missed. Double release is only an event boundary.',
    'Absolute aiming-point gates and secure dwell are existing controller rules, not validated teaching timings.',
    'Aim departure is descriptive, not a wrong-read label; keys and candidate lane scores are not exposed.',
    'Incomplete four-second reps and generated rosters are not NFL rates or scheme success estimates.'],
  observerVerified: verify ? trials.every(t => t.observerPreserved) : null, cells, trials }, null, 2) + '\n');
console.log(JSON.stringify({ out, sourceSha256, trials: trials.length, observerVerified: verify ? true : null, cells }, null, 2));
