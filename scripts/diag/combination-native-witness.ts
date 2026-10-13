/** Bounded replay of the saved G73-I48 witness. The game prefix reconstructs
 * scouting, fatigue, audibles and native entry; only the named play is traced.
 * Observers never ask for another picture or consume random numbers. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { Rng } from '../../src/core/rng.js';
import { simulateGame } from '../../src/game/game.js';
import { generateTeam } from '../../src/league/team.js';
import { fatigueFactor } from '../../src/physics/kinematics.js';
import { availability, supportParams } from '../../src/physics/support.js';
import { Agent } from '../../src/sim/agent.js';
import { RunBlocker, type Combination } from '../../src/sim/behaviors/blocking.js';
import { contactControl, helperSupport } from '../../src/sim/engagement.js';
import { PlaySim } from '../../src/sim/playsim.js';
import { sourceVersion } from '../source-version.js';

const output = process.argv[2] ?? 'out/combination-collection/native.json';
const input = { rosterSeed: 71, strength: .55, gameSeed: 73, nativePlayIndex: 48,
  playSeed: 2986046475, concept: 'oz_weak', formation: 'offset_i_21', flip: true };
const encode = (v: unknown) => JSON.stringify(v, (_k, x) => x instanceof Agent ? { agent: x.idx }
  : x instanceof PlaySim ? { sim: true } : x instanceof Map ? [...x] : x instanceof Set ? [...x]
    : x instanceof Float64Array ? [...x] : x);
const copy = (v: unknown) => JSON.parse(encode(v));
const hash = (v: unknown) => createHash('sha256').update(encode(v)).digest('hex');
const source = sourceVersion();

function collect(observe: boolean) {
  const rng = new Rng(input.rosterSeed);
  const home = generateTeam(rng, 'Census home', 'CH', { strength: input.strength });
  const away = generateTeam(rng, 'Census away', 'CA', { strength: input.strength });
  let witness: any = null, stats: unknown;
  const game = simulateGame(home, away, { seed: input.gameSeed, hooks: { playResult(sim, kind) {
    if (kind !== 'scrimmage' || sim.rng.key !== input.playSeed) return undefined;
    assert.equal(sim.offCall.run?.id, input.concept);
    const combinations = new Set<Combination>();
    for (const a of sim.offense) if (a.behavior instanceof RunBlocker && a.behavior.plan.combination)
      combinations.add(a.behavior.plan.combination);
    const history = createHash('sha256'), frames: any[] = [], cues: any[] = [], updates: any[] = [];
    const capacity = (a: Agent) => a.body.support
      ? availability(a.body.support, supportParams(a.profile), fatigueFactor(a.body.energy)) : 1;
    const slot = (b: unknown) => sim.agents.find(a => a.body === b)?.slot ?? null;
    const joint = (j: any) => j ? { live: sim.world.joints.includes(j), a: slot(j.a), b: slot(j.b),
      actor: slot(j.actor), kind: j.kind, extension: j.extension, push: j.push, hold: j.hold,
      steer: j.steer, normalForce: j.normalForce ?? 0, tangentForce: j.tangentForce ?? 0 } : null;
    const keeper = (a: Agent, c: Combination) => {
      const e = c.defender.engagement, hands = e && (a === e.blocker ? e.hands : e.helperHands?.get(a));
      const angle = Math.atan2(c.defender.pos.y-a.pos.y, c.defender.pos.x-a.pos.x)-a.facing;
      return { slot: a.slot, capacity: capacity(a), down: a.isDown(sim.t),
        chestOff: Math.abs(Math.atan2(Math.sin(angle),Math.cos(angle))) / (Math.PI/2),
        distance: Math.hypot(a.pos.x-c.defender.pos.x,a.pos.y-c.defender.pos.y),
        control: e ? contactControl(e,a) : null,
        helperSupport: e?.helpers.includes(a) ? helperSupport(sim,e,a) : null, hands: joint(hands) };
    };
    const plan = (a: Agent) => a.behavior instanceof RunBlocker ? {
      kind: a.behavior.plan.kind, target: a.behavior.plan.target?.slot,
      drive: a.behavior.plan.drive, climbTo: a.behavior.plan.climbTo?.slot,
      departure: a.behavior.plan.departure ? { defender: a.behavior.plan.departure.defender.slot,
        keeper: a.behavior.plan.departure.keeper.slot, backer: a.behavior.plan.departure.backer.slot } : null,
      departureRead: Reflect.get(a.behavior,'departureRead'), climbRead: Reflect.get(a.behavior,'climbRead'),
      zoneRead: Reflect.get(a.behavior,'zoneRead') } : null;
    const snapshot = () => copy({ t: sim.t, carrier: sim.carrier?.slot,
      agents: sim.agents.map(a => ({ slot: a.slot, team: a.team, body: a.body,
        capacity: capacity(a), plan: plan(a), tags: [...a.tags], requested: Reflect.get(sim,'cmds')[a.idx],
        applied: sim.intents[a.idx], engagement: a.engagement ? {
          blocker: a.engagement.blocker.slot, defender: a.engagement.defender.slot,
          helpers: a.engagement.helpers.map(b=>b.slot), control: a.engagement.control,
          phi: a.engagement.phi, hands: joint(a.engagement.hands),
          helperHands: [...(a.engagement.helperHands ?? [])].map(([b,j])=>({ slot:b.slot,hands:joint(j) })) } : null })),
      combinations: [...combinations].map(c => ({ members: c.members.map(a=>a.slot),
        defender:c.defender.slot, backer:c.backer?.slot, released:c.released,
        soloKind:c.soloKind, reads:c.reads, keepers:c.members.map(a=>keeper(a,c)) })) });
    const initial = snapshot();
    let beforeWorld: unknown;
    if (observe) {
      const see = sim.see.bind(sim);
      sim.see = (a,b,scale) => {
        const seen = see(a,b,scale);
        cues.push(copy({t:sim.t,consumer:a.slot,opponent:b.slot,seen})); return seen;
      };
      for (const a of sim.offense) if (a.behavior instanceof RunBlocker) {
        const update = a.behavior.update.bind(a.behavior);
        a.behavior.update = (aa,s) => {
          const before=copy({body:aa.body,plan:plan(aa)}), cueStart=cues.length;
          const requested=update(aa,s);
          updates.push(copy({t:s.t,slot:aa.slot,before,after:plan(aa),requested,cues:cues.slice(cueStart)}));
          return requested;
        };
      }
      const step=sim.world.step.bind(sim.world);
      sim.world.step=(intents,dt)=>{beforeWorld=snapshot(); return step(intents,dt);};
    }
    const tick = sim.tick.bind(sim);
    sim.tick = () => {
      const before=observe?snapshot():null, eventStart=sim.events.length;
      tick();
      history.update(encode({ t:sim.t,rng:sim.rng,events:sim.events,perception:sim.perception,
        agents:sim.agents.map(a=>({body:a.body,mind:a.mind,recog:a.recog,behavior:a.behavior,tags:a.tags})),
        engagements:sim.engagements,joints:sim.world.joints,intents:sim.intents,cmds:Reflect.get(sim,'cmds') }));
      if(observe) frames.push(copy({before,beforeWorld,after:snapshot(),cues:cues.splice(0),
        updates:updates.splice(0),events:sim.events.slice(eventStart),report:sim.lastStep}));
    };
    const result=sim.run(); stats=result.stats;
    witness={ initial, frames, historySha256:history.digest('hex'),endTime:sim.t,
      censored:sim.phase==='live',gain:result.yards,outcome:result.outcome,
      events:sim.events,offCall:sim.offCall,defCall:sim.defCall,context:sim.snapContext,
      players:sim.agents.map(a=>({slot:a.slot,player:a.player,profile:a.profile,
        snapReadyAt:a.snapReadyAt,decisionInterval:a.mind.decisionInterval,snapDelay:a.mind.snapDelay})) };
    return result;
  } } });
  assert(witness,'Native witness not found');
  assert.equal(game.log.find(p=>p.stats===stats)?.index,input.nativePlayIndex);
  return {witness,gameSha256:hash(game)};
}
const observed=collect(true),plain=collect(false);
assert.equal(observed.gameSha256,plain.gameSha256);
assert.equal(observed.witness.historySha256,plain.witness.historySha256);
assert.equal(sourceVersion(),source);
mkdirSync(dirname(output),{recursive:true});
writeFileSync(output,encode({protocol:'combination-native-witness-v1',input,sourceSha256:source,
  observerNeutral:true,gameSha256:observed.gameSha256,...observed.witness})+'\n');
console.log(JSON.stringify({output,observerNeutral:true,history:observed.witness.historySha256,
  gain:observed.witness.gain,endTime:observed.witness.endTime}));
