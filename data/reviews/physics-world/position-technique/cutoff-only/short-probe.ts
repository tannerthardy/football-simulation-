import { mkdirSync, writeFileSync } from 'node:fs';
import { CENTER_Y } from '../../src/core/field.js';
import { Rng } from '../../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../../src/league/team.js';
import { RUN_BY_ID } from '../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../src/playbook/formations.js';
import { availability, supportParams } from '../../src/physics/support.js';
import { fatigueFactor } from '../../src/physics/kinematics.js';
import { RunBlocker, playSideSign } from '../../src/sim/behaviors/blocking.js';
import { axisOf } from '../../src/sim/engagement.js';
import { PlaySim } from '../../src/sim/playsim.js';
import { sourceVersion } from '../../scripts/source-version.js';

const sourceBefore = sourceVersion();
const offense = generateTeam(new Rng(31), 'Panel offense 1', 'O1', { strength: .55 });
const defense = generateTeam(new Rng(32), 'Panel defense 1', 'D1', { strength: .55 });
const plays = [];
for (const input of [{run:'power',front:'under',formation:'ace_11'}, {run:'split_zone',front:'tite',formation:'gun_wing_12'}]) for (const flip of [false,true]) {
  const formation=FORMATION_BY_ID[input.formation], front=FRONT_BY_ID[input.front], personnel=front.personnel[0];
  const setup={offense:pickOffense(offense,formation.personnel),defense:pickDefense(defense,personnel),
    offCall:{formation,flip,kind:'run' as const,run:RUN_BY_ID[input.run],label:`${formation.name} · ${RUN_BY_ID[input.run].name}`},
    defCall:{personnel,front,coverage:COVERAGE_BY_ID.cover3,pressure:null,label:`${front.name} · Cover 3`},
    los:40,ballY:CENTER_Y,firstDownX:50,seed:3,record:true,recordLevel:'full' as const};
  const sim=new PlaySim(setup), slot=flip?'RT':'LT', b=sim.slot(slot)!, behavior=b.behavior as RunBlocker, d=behavior.plan.target!, side=playSideSign(sim,setup.offCall.run);
  const installed= {slot,target:d.slot,kind:behavior.plan.kind,drive:{...behavior.plan.drive},
    contactFit:behavior.plan.contactFit?{target:behavior.plan.contactFit.target.slot,axis:{...behavior.plan.contactFit.axis},sealTarget:behavior.plan.contactFit.sealTarget}:null,
    blockerPos:{...b.pos},defenderPos:{...d.pos},bodyContact:b.profile.radius+d.profile.radius};
  const initial=sim.agents.map(a=>({slot:a.slot,profile:a.profile,ratings:a.player.ratings,body:structuredClone(a.body)}));
  const rows:any[]=[], requested:any[]=[];
  const update=behavior.update;
  behavior.update=function(a,s){const command=update.call(this,a,s);requested.push({t:s.t,command:structuredClone(command)});return command};
  const tick=sim.tick;
  sim.tick=function(){
    tick.call(this); const s=this;
    const e=b.engagement?.defender===d?b.engagement:null,j=e?.hands;
    const axis=e?axisOf(s,e):null,dx=b.pos.x-d.pos.x,dy=b.pos.y-d.pos.y;
    rows.push({completedAt:s.t,blockerPos:{...b.pos},defenderPos:{...d.pos},blockerVel:{...b.vel},defenderVel:{...d.vel},
      insideSeparation:dy*side,relativeDistance:Math.hypot(dx,dy),
      support:b.body.support?availability(b.body.support,supportParams(b.profile),fatigueFactor(b.body.energy)):1,
      engaged:!!e,axis:axis&&{...axis},drive:e?.drive&&{...e.drive},phi:e?.phi??null,control:e?.control??null,
      hands:j?{live:s.world.joints.includes(j),normalForce:j.normalForce,tangentForce:j.tangentForce}:null,
      armImpulse:s.lastStep?.armImpulse[b.idx],armLimit:s.lastStep?.armImpulseLimit[b.idx],armWork:s.lastStep?.armWork[b.idx],armWorkLimit:s.lastStep?.armWorkLimit[b.idx],
      supportWork:s.lastStep?.supportMotorWork[b.idx],supportWorkLimit:s.lastStep?.supportMotorWorkLimit[b.idx],
      groundImpulse:s.lastStep?.groundImpulse[b.idx],events:s.events.filter(e=>e.t>=s.t-s.dt-1e-8)});
  };
  const result=sim.run();
  const plain=new PlaySim({...setup,record:false});const plainResult=plain.run();
  const signature=(s:PlaySim,r:any)=>JSON.stringify({result:{...r,frames:undefined,telemetry:undefined},bodies:s.agents.map(a=>a.body),intents:s.intents,rngNext:s.rng.nextU32(),joints:s.world.joints.map(j=>({...j,a:s.agents.find(a=>a.body===j.a)?.slot,b:s.agents.find(a=>a.body===j.b)?.slot,actor:('actor'in j)?s.agents.find(a=>a.body===j.actor)?.slot:undefined}))});
  const neutral=signature(sim,result)===signature(plain,plainResult);
  if(!neutral) throw new Error(`Non-neutral probe ${input.run}/${flip}`);
  plays.push({input,flip,installed,initial,result,rows,requested,neutral});
}
const sourceAfter=sourceVersion();if(sourceBefore!==sourceAfter)throw new Error('Source changed');
mkdirSync('out/cutoff-surface',{recursive:true});writeFileSync('out/cutoff-surface/short-probe.json',JSON.stringify({sourceBefore,sourceAfter,plays}));
for(const p of plays){const loaded=p.rows.filter(r=>r.hands?.live&&Math.hypot(r.hands.normalForce??0,r.hands.tangentForce??0)>1e-6);
 console.log(JSON.stringify({run:p.input.run,flip:p.flip,installed:p.installed,neutral:p.neutral,yards:p.result.yards,duration:p.result.duration,
 first:loaded[0],last:loaded.at(-1),loadedTicks:loaded.length,events:p.result.events.filter(e=>e.a===p.initial.findIndex(a=>a.slot===p.installed.slot)||e.b===p.initial.findIndex(a=>a.slot===p.installed.slot))}));}
