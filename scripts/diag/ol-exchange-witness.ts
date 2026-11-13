/** Four fixed ordinary 11v11 films; no outcome-based selection or extra reads.
 * node --import tsx scripts/diag/ol-exchange-witness.ts OUTPUT.json.gz
 * Record only actual block_exchange decisions and their completed physics tick.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { gzipSync } from 'node:zlib';
import { CENTER_Y } from '../../src/core/field.js';
import { Rng } from '../../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../../src/league/team.js';
import { RUN_BY_ID } from '../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../src/playbook/formations.js';
import type { Agent } from '../../src/sim/agent.js';
import { RunBlocker } from '../../src/sim/behaviors/blocking.js';
import { PlaySim, type PlaySetup } from '../../src/sim/playsim.js';
import type { PlayResult } from '../../src/sim/types.js';
import type { Joint } from '../../src/physics/world.js';
import { sourceVersion } from '../source-version.js';

const output = process.argv[2];
if (process.argv.length !== 3 || !output?.endsWith('.json.gz')) throw new Error('Usage: ol-exchange-witness.ts OUTPUT.json.gz');
const sourceBefore = sourceVersion(), startedAt = new Date().toISOString();
const hash = (v: unknown) => createHash('sha256').update(JSON.stringify(v)).digest('hex');
const vec = (v: {x: number; y: number}) => ({x: v.x, y: v.y});
const offense = generateTeam(new Rng(31), 'Panel offense 1', 'O1', {strength: .55});
const defense = generateTeam(new Rng(32), 'Panel defense 1', 'D1', {strength: .55});
const fixed = [{run: 'duo', front: 'odd', seed: 3}, {run: 'power', front: 'under', seed: 3}];
const cohort = {rosterSeeds: [31, 32], rosterSha256: hash({offense, defense}), strength: .55,
  formation: 'ace_11', coverage: 'cover3', pressure: null, los: 40, ballY: CENTER_Y, firstDownX: 50,
  fixtures: fixed.flatMap(c => [false, true].map(flip => ({...c, flip}))),
  selection: 'Four ordinary inputs fixed before candidate outcomes: Duo Odd R/L seed3 and Power Under R/L seed3. This small film set is not an NFL sample.'};
function collect(input: PlaySetup, run: string, front: string, flip: boolean, seed: number) {
  const sim = new PlaySim(input), id = `WX-R1-${run}-${front}-${flip ? 'L' : 'R'}-S${seed}`;
  const jointIds = new WeakMap<Joint, number>(); let nextJointId = 1;
  const joint = (j: Joint) => {
    if (!jointIds.has(j)) jointIds.set(j, nextJointId++);
    return {id: jointIds.get(j)!, kind: j.kind, live: sim.world.joints.includes(j),
      a: sim.agents.find(a => a.body === j.a)!.slot, b: sim.agents.find(a => a.body === j.b)!.slot,
      state: Object.fromEntries(Object.entries(j).filter(([k]) => !['a', 'b', 'actor'].includes(k))),
      actor: j.kind === 'hands' && j.actor ? sim.agents.find(a => a.body === j.actor)!.slot : null};
  };
  const state = (a: Agent) => {
    const p = a.behavior instanceof RunBlocker ? a.behavior.plan : null, e = a.engagement;
    return {slot: a.slot, idx: a.idx,
      physical: {pos: vec(a.pos), vel: vec(a.vel), facing: a.facing, stance: a.stance,
        support: structuredClone(a.body.support), energy: a.body.energy},
      plan: p ? {kind: p.kind, target: p.target?.slot ?? null, drive: vec(p.drive), climbTo: p.climbTo?.slot ?? null,
        pullRole: p.pullRole ?? null, combination: p.combination ? {members: p.combination.members.map(a => a.slot),
          defender: p.combination.defender.slot, backer: p.combination.backer?.slot ?? null, released: p.combination.released} : null} : null,
      engagement: e ? {blocker: e.blocker.slot, defender: e.defender.slot, helpers: e.helpers.map(a => a.slot),
        control: e.control, phi: e.phi, drive: e.drive && vec(e.drive), surfaceAxis: e.surfaceAxis && vec(e.surfaceAxis)} : null,
      joints: sim.world.joints.filter(j => j.a === a.body || j.b === a.body).map(joint)};
  };
  const initialPlayers = sim.agents.map(a => ({slot: a.slot, profile: a.profile, ratings: a.player.ratings,
    body: structuredClone(a.body), snapReadyAt: a.snapReadyAt, decisionInterval: a.mind.decisionInterval, snapDelay: a.mind.snapDelay}));
  const initialSha256 = hash(initialPlayers), profileSha256 = hash(initialPlayers.map(a => ({slot: a.slot, profile: a.profile, ratings: a.ratings})));
  const exchanges: any[] = [];
  let active: {observer: Agent; before: Map<Agent, ReturnType<typeof state>>; consumed: any[]; rows: any[]} | null = null;
  let tickRows: any[] = [];
  const see = sim.see;
  sim.see = function (observer, target, ...rest) {
    const seen = see.call(this, observer, target, ...rest);
    // classifyWork may read for recipient B during initiator A's update.
    if (active) active.consumed.push({observer: observer.slot, target: target.slot, image: structuredClone(seen)});
    return seen;
  };
  const event = sim.event;
  sim.event = function (type, a, b, note) {
    event.call(this, type, a, b, note);
    if (type !== 'block_exchange' || !active || !a || !b) return;
    const before = [active.before.get(a)!, active.before.get(b)!], afterDecision = [state(a), state(b)];
    const row = {t: this.t, observer: active.observer.slot, participants: [a.slot, b.slot],
      event: structuredClone(this.events.at(-1)), before, afterDecision,
      consumedImages: structuredClone(active.consumed),
      physicalStateUnchangedAtDecision: hash(before.map(s => s.physical)) === hash(afterDecision.map(s => s.physical)),
      physicalJointsUnchangedAtDecision: hash(before.map(s => s.joints)) === hash(afterDecision.map(s => s.joints))};
    active.rows.push(row); tickRows.push(row); exchanges.push(row);
  };
  for (const a of sim.offense) if (a.behavior instanceof RunBlocker) {
    const behavior = a.behavior, update = behavior.update;
    behavior.update = function (actor, s) {
      active = {observer: actor, before: new Map(s.offense.map(a => [a, state(a)])), consumed: [], rows: []};
      const requested = update.call(this, actor, s), rows = active.rows;
      active = null;
      for (const row of rows) {
        row.requestedByInitiator = structuredClone(requested);
        row.afterUpdate = row.participants.map((slot: string) => state(s.slot(slot)!));
      }
      return requested;
    };
  }
  const tick = sim.tick;
  sim.tick = function () {
    const t = this.t, previousReport = this.lastStep; tickRows = [];
    tick.call(this);
    const report = this.lastStep !== previousReport ? this.lastStep : null;
    for (const row of tickRows) {
      row.completedAt = this.t; row.physicsStepRecorded = !!report;
      row.afterPhysics = row.participants.map((slot: string) => state(this.slot(slot)!));
      row.loads = report ? row.participants.map((slot: string) => {
        const a = this.slot(slot)!;
        return {slot, appliedIntent: structuredClone(this.intents[a.idx]), achievedPos: vec(a.pos), achievedVel: vec(a.vel),
          groundImpulse: vec(report.groundImpulse[a.idx]), armImpulse: report.armImpulse[a.idx], armImpulseLimit: report.armImpulseLimit[a.idx],
          armWork: report.armWork[a.idx], armWorkLimit: report.armWorkLimit[a.idx],
          supportMotorWork: report.supportMotorWork[a.idx], supportMotorWorkLimit: report.supportMotorWorkLimit[a.idx],
          physicalContacts: report.contacts.filter(c => c.i === a.idx || c.j === a.idx).map(c => ({
            other: this.agents[c.i === a.idx ? c.j : c.i].slot, impulse: c.impulse, closing: c.closing})),
          liveHandsAfterPhysics: this.world.joints.filter(j => j.kind === 'hands' && (j.a === a.body || j.b === a.body)).map(joint),
          fall: report.falls.includes(a.idx), down: report.downs.includes(a.idx)};
      }) : [];
      if (report && Math.abs(this.t - t - this.dt) > 1e-8) throw new Error('Unexpected native exchange step timing');
    }
  };
  const result = sim.run();
  const signature = (s: PlaySim, r: PlayResult) => hash({result: {...r, frames: undefined, telemetry: undefined},
    bodies: s.agents.map(a => a.body), intents: s.intents, events: s.events,
    ownership: s.offense.filter(a => a.behavior instanceof RunBlocker).map(a => ({slot: a.slot,
      target: a.behavior instanceof RunBlocker ? a.behavior.target?.slot ?? null : null,
      kind: a.behavior instanceof RunBlocker ? a.behavior.plan.kind : null,
      engagement: a.engagement ? {blocker: a.engagement.blocker.slot, defender: a.engagement.defender.slot,
        helpers: a.engagement.helpers.map(b => b.slot)} : null, tags: [...a.tags]})), rngNext: s.rng.nextU32(),
    physicalJoints: s.world.joints.map(j => ({kind: j.kind, a: s.agents.find(a => a.body === j.a)!.slot,
      b: s.agents.find(a => a.body === j.b)!.slot, ...Object.fromEntries(Object.entries(j).filter(([k]) => !['a','b','actor'].includes(k))),
      actor: j.kind === 'hands' && j.actor ? s.agents.find(a => a.body === j.actor)!.slot : null}))});
  const observedSignature = signature(sim, result), plainSim = new PlaySim({...input, record: false}), plain = plainSim.run();
  const plainSignature = signature(plainSim, plain);
  if (observedSignature !== plainSignature) throw new Error(`Exchange observer changed ${id}`);
  return {id, run, front, flip, seed, formation: input.offCall.formation.id, selection: 'fixed-before-outcomes',
    offCall: input.offCall.label, defCall: input.defCall.label, los: sim.los, firstDownX: sim.firstDownX,
    initialSha256, profileSha256, observerVerified: true, observedSignature, plainSignature,
    naturalEnd: result.outcome !== 'timeout', result, exchanges,
    players: sim.agents.map(a => ({team: a.team, slot: a.slot, name: a.name, jersey: a.player.jersey,
      position: a.player.position, weightLb: a.player.measurables.weightLb, heightIn: a.player.measurables.heightIn,
      ratings: a.player.ratings, profile: a.profile}))};
}
const plays = fixed.flatMap(c => [false, true].map(flip => {
  const formation = FORMATION_BY_ID.ace_11, personnel = FRONT_BY_ID[c.front].personnel[0];
  return collect({offense: pickOffense(offense, formation.personnel), defense: pickDefense(defense, personnel),
    offCall: {formation, flip, kind: 'run', run: RUN_BY_ID[c.run], label: `${formation.name} · ${RUN_BY_ID[c.run].name}`},
    defCall: {personnel, front: FRONT_BY_ID[c.front], coverage: COVERAGE_BY_ID.cover3, pressure: null,
      label: `${FRONT_BY_ID[c.front].name} · Cover 3`}, los: 40, ballY: CENTER_Y, firstDownX: 50,
    seed: c.seed, record: true, recordLevel: 'full'}, c.run, c.front, flip, c.seed);
}));
const sourceAfter = sourceVersion();
if (sourceBefore !== sourceAfter) throw new Error('Engine changed during witness collection');
const report = {schema: 'ol-work-exchange-film-v1', sourceBefore, sourceAfter, startedAt, finishedAt: new Date().toISOString(),
  collectorSha256: createHash('sha256').update(readFileSync('scripts/diag/ol-exchange-witness.ts')).digest('hex'),
  moduleSha256: Object.fromEntries(['src/sim/behaviors/blocking.ts', 'src/sim/engagement.ts', 'src/physics/world.ts'].map(p => [p,
    createHash('sha256').update(readFileSync(p)).digest('hex')])), cohort, plays,
  definitions: {observers: 'Every existing sim.see call made during an existing RunBlocker.update is captured with its actual observer. No see calls are added.',
    decisionBoundary: 'before is the initiator update start; afterDecision is the actual block_exchange event emission, before the remainder of that update. afterUpdate retains any subsequent approach/contact acquisition.',
    physics: 'afterPhysics and loads come from the real completed tick containing the exchange. No native tick or whistle is added.',
    units: 'Positions yd, time s, impulses kg·yd/s, force kg·yd/s², work kg·yd²/s². Joint IDs are local to each play/source.'}};
mkdirSync(dirname(output), {recursive: true}); writeFileSync(output, gzipSync(JSON.stringify(report), {level: 9}));
console.log(JSON.stringify({output, sourceBefore, sourceAfter, clips: plays.length,
  observerControls: plays.filter(p => p.observerVerified).length, naturalEnds: plays.filter(p => p.naturalEnd).length,
  exchanges: plays.reduce((n, p) => n + p.exchanges.length, 0)}, null, 2));
