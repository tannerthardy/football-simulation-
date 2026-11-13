/** Read-only native first-wait witness: no added reads, decisions or RNG. */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { CENTER_Y } from '../../src/core/field.js';
import { clamp } from '../../src/core/vec.js';
import { Rng } from '../../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../../src/league/team.js';
import { RUN_BY_ID } from '../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../src/playbook/formations.js';
import { PlaySim } from '../../src/sim/playsim.js';
import { contactQuality } from '../../src/sim/tackle-window.js';
import { sourceVersion } from '../source-version.js';

const sourceBefore=sourceVersion();
const hash=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const collectorSha256=createHash('sha256').update(readFileSync(import.meta.filename)).digest('hex');
const input={id:'TA-R1-iz_strong-over-R-S3',roster:[31,32],strength:.55,formation:'ace_11',concept:'iz_strong',front:'over',coverage:'cover3',flip:false,seed:3};
const offense=generateTeam(new Rng(31),'Approach offense 1','O1',{strength:.55});
const defense=generateTeam(new Rng(32),'Approach defense 1','D1',{strength:.55});
function make(record:boolean){
  const formation=FORMATION_BY_ID.ace_11,front=FRONT_BY_ID.over,personnel=front.personnel[0];
  return new PlaySim({offense:pickOffense(offense,formation.personnel),defense:pickDefense(defense,personnel),
    offCall:{formation,flip:false,kind:'run',run:RUN_BY_ID.iz_strong,label:input.id},
    defCall:{personnel,front,coverage:COVERAGE_BY_ID.cover3,pressure:null,zoneStyle:'match',label:input.id},
    los:40,ballY:CENTER_Y,firstDownX:50,seed:3,audibles:false,record,recordLevel:'full',recordEvery:1});
}
const sim=make(true),d=sim.slot('DT_S')!,runner=sim.slot('RB')!;
const initialSha256=hash(sim.agents.map(a=>({profile:a.profile,body:a.body,ratings:a.player.ratings,slot:a.slot})));
let phase='controller';
const snapshots:unknown[]=[],reads:unknown[]=[],events:unknown[]=[],decisions:unknown[]=[],holdSamples:unknown[]=[];
const active=()=>sim.t>=2.4&&sim.t<=3.65;
const agent=(a:any)=>({idx:a.idx,slot:a.slot,pos:a.pos,vel:a.vel,speed:a.speed,facing:a.facing,body:a.body,
  engaged:!!a.engagement,engagement:a.engagement?{type:a.engagement.type,win:a.engagement.win,blocker:a.engagement.blocker?.slot,defender:a.engagement.defender?.slot}:null,
  intent:sim.intents[a.idx],nextTackleAt:a.nextTackleAt,focus:a.mind.focus,read:a.recog?.read});
function snapshot(){
  const c=sim.carrier;if(!c)return null;
  const dx=c.pos.x-d.pos.x,dy=c.pos.y-d.pos.y,dd=Math.hypot(dx,dy),vx=c.vel.x-d.vel.x,vy=c.vel.y-d.vel.y;
  const body=c.profile.radius+d.profile.radius,arms=body+d.profile.reach*(d.engagement?.win!==undefined?.4:1);
  const q=contactQuality(dd,body,arms),form=.85-.15*d.r('tackling');
  const closestAt=clamp(-(dx*vx+dy*vy)/Math.max(.01,vx*vx+vy*vy),0,.3),closest=Math.hypot(dx+vx*closestAt,dy+vy*closestAt);
  const futureQuality=contactQuality(closest,body,arms),s=d.body.support!,cmd=sim.intents[d.idx];
  const joints=sim.world.joints.filter(j=>(j.a===d.body||j.b===d.body)&&(j.kind!=='grasp'||!j.broken)).map(j=>({
    kind:j.kind,a:sim.agents.find(a=>a.body===j.a)?.slot,b:sim.agents.find(a=>a.body===j.b)?.slot,...Object.fromEntries(Object.entries(j).filter(([k])=>k!=='a'&&k!=='b'&&k!=='actor'&&k!=='holder'))}));
  const contacts=(sim.lastStep?.contacts??[]).filter(hit=>hit.i===d.idx||hit.j===d.idx).map(hit=>({...hit,iSlot:sim.agents[hit.i].slot,jSlot:sim.agents[hit.j].slot}));
  const previewExclusions={noCommand:!cmd,free:!!cmd?.free,dive:!!cmd?.dive,lunge:!!cmd?.lunge,down:d.isDown(sim.world.time),engagement:!!d.engagement,
    supportState:s.state,foot:!!s.foot,strike:!!s.strike,leanMagnitude:Math.hypot(s.lean.x,s.lean.y),loadMagnitude:Math.hypot(s.load.x,s.load.y)};
  return structuredClone({t:sim.t,worldTime:sim.world.time,ball:sim.ball.kind,carrier:c.slot,bond:!!sim.bond,
    defender:agent(d),runner:agent(c),geometry:{distance:dd,body,arms,q,form,closing:-(vx*dx+vy*dy)/(dd||1),relativeVelocity:{x:vx,y:vy}},
    oldIdeal:{closestAt,closest,futureQuality,wouldWait:!sim.bond&&q<form&&futureQuality>q+.1},
    freePreviewOuterGate:!sim.bond&&q<form&&!!cmd&&joints.length===0&&contacts.length===0,joints,contacts,previewExclusions});
}
const originalSee=sim.see;
sim.see=function(observer,target,delayScale){const result=originalSee.call(this,observer,target,delayScale);
  if(active()&&observer===d&&target===runner)reads.push(structuredClone({t:sim.t,phase,delayScale:delayScale??1,result}));return result;};
const worldStep=sim.world.step;
sim.world.step=function(intents,dt){phase='World';const result=worldStep.call(this,intents,dt);phase='afterWorld';return result;};
const privateSim=sim as any,updateBall=privateSim.updateBall;
privateSim.updateBall=function(){const result=updateBall.call(this);phase='selector';if(active())snapshots.push(snapshot());return result;};
const event=sim.event;
sim.event=function(type,a,b,note){if(active()&&a===d)events.push(structuredClone({t:sim.t,type,note,a:a?.slot,b:b?.slot,phase,state:snapshot(),
  hold:sim.bond?.holds?.get(d)?Object.fromEntries(Object.entries(sim.bond.holds.get(d)!).filter(([k])=>k!=='a'&&k!=='b')):null,
  grip:sim.bond?.grip?.get(d),execution:sim.bond?.execution?.get(d)}));return event.call(this,type,a,b,note);};
const decide=sim.trace.decide;
sim.trace.decide=function(choice){if(active()&&choice.a===d.idx)decisions.push(structuredClone(choice));return decide.call(this,choice);};
const tick=sim.tick;
sim.tick=function(){phase='controller';const result=tick.call(this);const h=sim.bond?.holds?.get(d);if(active()&&h)holdSamples.push(structuredClone({t:sim.t,grip:sim.bond?.grip?.get(d),
  hold:Object.fromEntries(Object.entries(h).filter(([k])=>k!=='a'&&k!=='b')),defender:agent(d),runner:agent(sim.bond!.carrier)}));return result;};
const result=sim.run(),plain=make(false),control=plain.run();
const signature=(s:PlaySim,r:typeof result)=>hash({result:{...r,frames:undefined,telemetry:undefined},bodies:s.agents.map(a=>a.body),intents:s.intents,nextRng:s.rng.next()});
const observerVerified=signature(sim,result)===signature(plain,control);if(!observerVerified)throw new Error('Observer effect');
const sourceAfter=sourceVersion();if(sourceAfter!==sourceBefore)throw new Error('Source changed');
const output={schema:'first-tackle-wait-witness-v1',sourceBefore,sourceAfter,collectorSha256,input,inputSha256:hash(input),initialSha256,observerVerified,
  outcome:result.outcome,offenseYards:result.offenseYards,snapshots,reads,events,decisions,holdSamples};
writeFileSync(process.argv[2],JSON.stringify(output));
process.stdout.write(JSON.stringify({sourceBefore,sourceAfter,collectorSha256,observerVerified,outcome:result.outcome,offenseYards:result.offenseYards,snapshots:snapshots.length,reads:reads.length,events:events.length})+'\n');
