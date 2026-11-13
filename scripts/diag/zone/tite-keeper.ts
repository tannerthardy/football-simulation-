/** Inspect the historical split-zone Tite input without extra perceptions or
 * RNG draws. Also runs the flipped call as a control; its combinations differ,
 * so it is not a geometric reflection of the Y/RT pair.
 * node --import tsx scripts/diag/zone/tite-keeper.ts output.json [seed=3] [O=31] [D=32]
 * LEVER_FACING=0 repeats the identical input with the historical release frame.
 * Full histories stay in ignored out/. Each observed run is compared with a
 * plain run's complete bodies, commands, minds, events and RNG at 2 seconds.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { CENTER_Y } from '../../../src/core/field.js';
import { Rng } from '../../../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../../../src/league/team.js';
import { RUN_BY_ID } from '../../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../../src/playbook/formations.js';
import { RunBlocker } from '../../../src/sim/behaviors/blocking.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import { runContactObservers } from '../../../src/sim/run-contact-observer.js';
import { sourceVersion } from '../../source-version.js';

const output = process.argv[2] ?? 'out/tite-failure/trace.json';
const seed = Number(process.argv[3] ?? 3), rosterO = Number(process.argv[4] ?? 31), rosterD = Number(process.argv[5] ?? 32);
function run(observe: boolean, flip: boolean) {
  const formation = FORMATION_BY_ID.gun_wing_12;
  const sim = new PlaySim({
    offense: pickOffense(generateTeam(new Rng(rosterO), 'Panel offense 1', 'O1', { strength: .55 }), formation.personnel),
    defense: pickDefense(generateTeam(new Rng(rosterD), 'Panel defense 1', 'D1', { strength: .55 }), 'base34'),
    offCall: { formation, flip, kind: 'run', run: RUN_BY_ID.split_zone, label: 'Split Zone' },
    defCall: { personnel: 'base34', front: FRONT_BY_ID.tite, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'Tite Cover 3' },
    los: 40, ballY: CENTER_Y, firstDownX: 50, seed,
  });
  const installed = sim.slot(flip ? 'LT' : 'RT')!.behavior as RunBlocker;
  const combo = installed.plan.combination!;
  const [owner, helper] = combo.members;
  const behavior = helper.behavior as RunBlocker;
  const reads: unknown[] = [], geometry: unknown[] = [], contact: unknown[] = [], steps: unknown[] = [];
  if (observe) {
    let reading = false;
    let pictures: Record<string, unknown> = {};
    const originalSee = sim.see, original = behavior.update;
    sim.see = function(a,b,scale=1) {
      const seen = originalSee.call(this,a,b,scale);
      if(reading && a===helper && [owner,combo.defender,combo.backer,this.slot('RB')].includes(b))
        pictures[b.slot] = structuredClone(seen);
      return seen;
    };
    behavior.update = function(a,s) {
      const e=combo.defender.engagement;
      const due=!combo.released && !a.engagement && s.t>=(combo.checkNextRead??0);
      const state=e?{owner:e.blocker.slot,phi:e.phi,baseB:e.baseB,control:e.control,
        hands:!!e.hands&&s.world.joints.includes(e.hands),normal:e.hands?.normalForce??0,
        facing:owner.facing,pose:owner.body.support?.state,checkSince:combo.checkSince}:null;
      pictures={};reading=true;
      let command;
      try {command=original.call(this,a,s);} finally {reading=false;}
      if(due) reads.push({t:s.t,before:state,pictures,after:{released:combo.released,checkSince:combo.checkSince,
        engagement:a.engagement?.blocker.slot??null,kind:this.plan.kind},command});
      return command;
    };
    runContactObservers.set(sim,(e,stage,data)=>{
      if(e.defender!==combo.defender)return;
      if(stage==='geometry') geometry.push({t:sim.t,blocker:e.blocker.slot,defender:e.defender.slot,
        phi:e.phi,off:data.off,behind:data.behind,facing:data.facing,toD:data.toD,
        normal:e.hands?.normalForce??0,baseB:e.baseB,turnCredit:e.blocker.profile.turnRate*sim.dt});
      if(stage==='end') contact.push({t:sim.t,blocker:e.blocker.slot,...data});
    });
  }
  while(sim.t<2&&sim.phase!=='dead'){
    const t=sim.t, before=owner.facing;
    sim.tick();
    if(observe)steps.push({t,requestedFacing:sim.intents[owner.idx]?.facing,achievedFacing:owner.facing,delta:owner.facing-before,
      owner:{pos:{...owner.pos},vel:{...owner.vel},support:structuredClone(owner.body.support),engaged:owner.engagement?.defender.slot??null},
      helper:{pos:{...helper.pos},engaged:helper.engagement?.defender.slot??null},
      defender:{pos:{...combo.defender.pos},engaged:combo.defender.engagement?.blocker.slot??null},
      normal:combo.defender.engagement?.hands?.normalForce??0});
  }
  const fingerprint = JSON.stringify({bodies:sim.world.bodies,cmds:Reflect.get(sim, 'cmds'),intents:sim.intents,
    minds:sim.agents.map(a=>a.mind),rng:sim.rng,events:sim.events,phase:sim.phase,t:sim.t});
  return {fingerprint,reads,geometry,contact,steps,events:sim.events,
    tags:[...helper.tags],released:combo.released,owner:owner.slot,helper:helper.slot,defender:combo.defender.slot,kind:behavior.plan.kind};
}
const runs = [false,true].map(flip=>{
  const plain=run(false,flip),recorded=run(true,flip);
  if(plain.fingerprint!==recorded.fingerprint)throw new Error('Observer changed native state');
  const {fingerprint,...details}=recorded;
  return {flip,observerNeutral:true,...details};
});
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output,JSON.stringify({source:sourceVersion(),input:{seed,rosterO,rosterD},flags:{LEVER_FACING:process.env.LEVER_FACING??'default'},runs},null,2)+'\n');
for (const r of runs) console.log(JSON.stringify({ flip: r.flip, helper: r.helper, defender: r.defender,
  observerNeutral: r.observerNeutral, ends: r.contact, released: r.released, tags: r.tags }));
