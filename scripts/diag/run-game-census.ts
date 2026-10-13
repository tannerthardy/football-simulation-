/** Ordinary native-game run census. Independent film selection occurs at
 * play entry, before the result. Every run's complete serialized native
 * history and every game's result is checked against plain observation. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { Rng } from '../../src/core/rng.js';
import { simulateGame } from '../../src/game/game.js';
import { generateTeam } from '../../src/league/team.js';
import { Agent } from '../../src/sim/agent.js';
import { PlaySim } from '../../src/sim/playsim.js';
import { runContactObservers } from '../../src/sim/run-contact-observer.js';
import { sourceVersion } from '../source-version.js';

const manifestPath = 'docs/reviews/run-game-census-inputs.json';
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const out = process.argv[2] ?? 'out/run-hand-coherence/ordinary-census.json';
const encode = (value: unknown) => JSON.stringify(value, (_key, v) => v instanceof Agent ? { agent: v.idx }
  : v instanceof PlaySim ? { sim: true } : v instanceof Map ? [...v] : v instanceof Set ? [...v]
    : v instanceof Float64Array ? [...v] : v);
const hash = (v: unknown) => createHash('sha256').update(encode(v)).digest('hex');
type Row = Record<string, any>;

function collect(observe: boolean) {
  const roster = new Rng(manifest.rosterSeed), sample = new Rng(manifest.selectionSeed);
  const home = generateTeam(roster, 'Census home', 'CH', { strength: manifest.strength });
  const away = generateTeam(roster, 'Census away', 'CA', { strength: manifest.strength });
  const runs: Row[] = [], games: Row[] = [];
  for (const gameSeed of manifest.gameSeeds) {
    const gameRows: Row[] = [];
    const result = simulateGame(home, away, { seed: gameSeed, hooks: { playResult(sim, kind) {
      if (kind !== 'scrimmage' || sim.offCall.kind !== 'run') return undefined;
      const selected = sample.chance(manifest.sampleProbability);
      const r: Row = { gameSeed, runOrdinal: gameRows.length + 1, selected, concept: sim.offCall.run!.id,
        front: sim.defCall.front.id, formation: sim.offCall.formation.id, flip: sim.offCall.flip,
        playSeed: sim.rng.key, context: { ...sim.snapContext }, initial: sim.agents.map(a => ({ slot: a.slot,
          pos: { ...a.pos }, profile: a.profile, energy: a.body.energy })), frames: [],
        firstContact: null, crossingBoundary: null, handoffTime: null, falls: [],
        limits: { armImpulseExcess: 0, armWorkExcess: 0, supportWorkExcess: 0, workResidual: 0 } };
      const history = createHash('sha256');
      const assigned = new Set<number>(), engaged = new Set<number>(), loaded = new Set<number>();
      const blockMovements: Row[] = [];
      const consumed: Row[] = [];
      if (observe && selected) {
        const see = sim.see.bind(sim);
        sim.see = (a,b,scale) => {
          const seen=see(a,b,scale);
          if (a.team !== b.team) consumed.push({t:sim.t,consumer:a.slot,opponent:b.slot,seen:structuredClone(seen)});
          return seen;
        };
      }
      if (observe) runContactObservers.set(sim, (e, phase, data) => {
        if (phase === 'movement') blockMovements.push({ t: sim.t, blocker: e.blocker.slot, defender: e.defender.slot,
          ...structuredClone(data) });
      });
      const original = sim.tick.bind(sim);
      sim.tick = () => {
        const start = sim.t, eventStart = sim.events.length;
        if (observe) for (const a of sim.offense) {
          const plan = Reflect.get(a.behavior, 'plan');
          if (plan?.target) assigned.add(plan.target.idx);
          if (plan?.combination?.backer) assigned.add(plan.combination.backer.idx);
        }
        original();
        history.update(encode({ t: sim.t, rng: sim.rng, events: sim.events, perception: sim.perception,
          agents: sim.agents.map(a => ({ body: a.body, mind: a.mind, recog: a.recog, behavior: a.behavior, tags: a.tags })),
          engagements: sim.engagements, joints: sim.world.joints, intents: sim.intents, cmds: Reflect.get(sim, 'cmds') }));
        if (!observe) return;
        for (const e of sim.engagements) engaged.add(e.defender.idx);
        for (const j of sim.world.joints) if (j.kind === 'hands' && (j.normalForce || j.tangentForce)) {
          const a = sim.agents[sim.world.indexOf(j.a)], b = sim.agents[sim.world.indexOf(j.b)];
          if (a.team === 'D') loaded.add(a.idx); if (b.team === 'D') loaded.add(b.idx);
        }
        const rb = sim.slot('RB'), newEvents = sim.events.slice(eventStart);
        r.handoffTime ??= newEvents.find(e => e.type === 'handoff')?.t ?? null;
        const contact = rb && newEvents.find(e => e.type === 'carrier_contact' && (e.a === rb.idx || e.b === rb.idx));
        if (contact && !r.firstContact && rb) {
          const index = contact.a === rb.idx ? contact.b! : contact.a!, defender = sim.agents[index];
          r.firstContact = { t: contact.t, sampledAt: sim.t, opponent: defender.slot,
            depthAtTickEnd: rb.pos.x - sim.los, assignedPreviously: assigned.has(index),
            engagedPreviously: engaged.has(index), loadedPreviously: loaded.has(index),
            engagedInContactTick: sim.engagements.some(e => e.defender === defender) };
        }
        if (rb && sim.carrier === rb && r.crossingBoundary === null && rb.pos.x >= sim.los) r.crossingBoundary = sim.t;
        const report = sim.lastStep;
        if (report) {
          for (const a of sim.agents) {
            const i = a.idx;
            r.limits.armImpulseExcess = Math.max(r.limits.armImpulseExcess, report.armImpulse[i] - report.armImpulseLimit[i]);
            r.limits.armWorkExcess = Math.max(r.limits.armWorkExcess, report.armWork[i] - report.armWorkLimit[i]);
            r.limits.supportWorkExcess = Math.max(r.limits.supportWorkExcess, report.supportMotorWork[i] - report.supportMotorWorkLimit[i]);
          }
          r.limits.workResidual = Math.max(r.limits.workResidual, Math.abs(report.work.residual));
        }
        for (const e of newEvents) if (e.type === 'fall') r.falls.push({ t: e.t, slot: e.a === undefined ? null : sim.agents[e.a].slot, note: e.note });
        if (selected && Math.round(sim.t * 20) % 2 === 0) r.frames.push({ t: start, after: sim.t,
          carrier: sim.carrier?.slot, agents: sim.agents.map(a => ({ slot: a.slot, team: a.team,
            pos: { ...a.pos }, vel: { ...a.vel }, facing: a.facing, support: a.body.support?.state,
            requested: Reflect.get(sim,'cmds')[a.idx],applied:sim.intents[a.idx],
            plan: Reflect.get(a.behavior,'plan') ? {kind:Reflect.get(a.behavior,'plan').kind,
              target:Reflect.get(a.behavior,'plan').target?.slot,climbTo:Reflect.get(a.behavior,'plan').climbTo?.slot,
              drive:Reflect.get(a.behavior,'plan').drive}:null})),
          blocks: blockMovements.splice(0), cues:consumed.splice(0), contacts: sim.lastStep?.contacts });
        else blockMovements.length = 0;
      };
      const play = sim.run();
      runContactObservers.delete(sim);
      r.historySha256 = history.digest('hex'); r.endTime = sim.t; r.censored = sim.phase === 'live';
      r.outcome = play.outcome; r.gain = play.yards; r.statsReference = play.stats;
      gameRows.push(r); return play;
    } } });
    for (const r of gameRows) {
      const p = result.log.find(p => p.stats === r.statsReference);
      assert(p, `Missing native log link for run ${r.runOrdinal}`);
      r.nativePlayIndex = p.index; r.nullified = !!p.nullified; delete r.statsReference;
      runs.push(r);
    }
    games.push({ gameSeed, score: result.score, runs: gameRows.length, resultSha256: hash(result) });
    console.log(`${observe ? 'observed' : 'plain'} game ${gameSeed}: ${gameRows.length} native runs`);
  }
  return { runs, games };
}
const observed = collect(true), plain = collect(false);
assert.deepEqual(observed.games, plain.games);
assert.equal(observed.runs.length, plain.runs.length);
for (let i = 0; i < observed.runs.length; i++) {
  const a = observed.runs[i], b = plain.runs[i];
  for (const key of ['historySha256', 'selected', 'nativePlayIndex', 'nullified', 'outcome', 'gain', 'endTime', 'censored'])
    assert.deepEqual(a[key], b[key], `${key}: game ${a.gameSeed}, run ${a.runOrdinal}`);
}
const raw = { protocol: 'ordinary-native-run-census-v1', sourceSha256: sourceVersion(), manifest,
  observerNeutral: true, measurement: 'Contact positions are end-of-contact-tick samples; crossing/contact within one tick is uncertain. Assignment labels are diagnostic, not automatic busts.',
  ...observed };
mkdirSync(dirname(out), { recursive: true }); writeFileSync(out, encode(raw) + '\n');
console.log(`Saved ${observed.runs.length} neutral native run histories; ${observed.runs.filter(r => r.selected).length} sampled clips`);
