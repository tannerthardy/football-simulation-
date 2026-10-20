/** Fixed staged reacting pursuit; no NFL-rate or ordinary-play transfer claim.
 * Three predeclared geometries. All active actors use production post-catch
 * behaviors, then ordinary tick refinements, spacing, tackle selection and World.
 * Observation only wraps existing returns; it performs no extra see()/RNG reads.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { CENTER_Y } from '../../../src/core/field.js';
import { Rng } from '../../../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../../../src/league/team.js';
import { PASS_BY_ID } from '../../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../../src/playbook/formations.js';
import { newSupport } from '../../../src/physics/support.js';
import type { GraspJoint } from '../../../src/physics/world.js';
import type { Agent, Behavior } from '../../../src/sim/agent.js';
import { movementObjective } from '../../../src/sim/movement-objective.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import { sourceVersion } from '../../source-version.js';

const START = 2, DURATION = 2.5;
const CASES = [
  { id: 'inside-support', helperAvailable: true, runnerSpeed: 6, forceX: 56 },
  { id: 'helper-unavailable', helperAvailable: false, runnerSpeed: 6, forceX: 56 },
  { id: 'escaping-runner', helperAvailable: false, runnerSpeed: 8, forceX: 49 },
] as const;
type Case = typeof CASES[number];
const serial = (_key: string, value: unknown) => value instanceof Map ? [...value.entries()]
  : value instanceof Set ? [...value.values()] : value;
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value,serial)).digest('hex');
const snapshot = (a: Agent) => ({ idx:a.idx,slot:a.slot,pos:{...a.pos},vel:{...a.vel},facing:a.facing,
  speed:a.speed,energy:a.body.energy,spin:a.body.spin??0,support:structuredClone(a.body.support) });

function run(input: Case, observe: boolean) {
  const wall=performance.now(),cpu=process.cpuUsage();
  const sim=new PlaySim({offense:pickOffense(generateTeam(new Rng(19),'O','OFF'),'11'),
    defense:pickDefense(generateTeam(new Rng(20),'D','DEF'),'nickel'),
    offCall:{formation:FORMATION_BY_ID.gun_doubles_11,flip:false,kind:'pass',pass:PASS_BY_ID.four_verts,label:'staged pursuit'},
    defCall:{personnel:'nickel',front:FRONT_BY_ID.over,coverage:COVERAGE_BY_ID.cover3,pressure:null,label:'staged pursuit'},
    los:40,ballY:CENTER_Y,firstDownX:50,seed:83,record:false});
  const runner=sim.slot('Z')!,force=sim.slot('FS')!,inside=sim.slot('SS')!;
  const actors=[runner,force,inside],active=new Set(actors);
  sim.t=sim.world.time=START;
  for(const a of sim.agents) {
    a.body.pos={x:5+a.idx*.1,y:1+a.idx*2};a.body.vel={x:0,y:0};
    a.body.support=newSupport();a.downUntil=99;
  }
  runner.body.pos={x:50,y:CENTER_Y};runner.body.vel={x:input.runnerSpeed,y:0};runner.body.facing=0;runner.downUntil=-1;
  force.body.pos={x:input.forceX,y:CENTER_Y+2};force.body.vel={x:0,y:0};force.body.facing=Math.PI;force.downUntil=-1;
  force.runFit={kind:'force',side:1,gap:'D',technique:'attack',edge:'box',pace:'stack'};
  inside.runFit={kind:'alley',side:-1,gap:'D',technique:'attack',edge:'box',pace:'stack'};
  if(input.helperAvailable){inside.body.pos={x:55,y:CENTER_Y-2};inside.body.facing=Math.PI;inside.downUntil=-1;}
  sim.possess(runner,'catch'); // Existing post-catch BallCarrier/Pursuit assignment.
  for(const a of sim.agents)if(!active.has(a))a.behavior={kind:'parked',update:()=>({vel:{x:0,y:0}})};
  if(!input.helperAvailable)inside.behavior={kind:'parked',update:()=>({vel:{x:0,y:0}})};
  // Incoming straight histories end at the staged present; target possession
  // is acquired throughout. Parked bodies remain physically distant.
  for(let k=0;k<24;k++){
    const lag=(23-k)*sim.dt;
    sim.perception.record(sim.agents.map(a=>({pos:{x:a.pos.x-a.vel.x*lag,y:a.pos.y-a.vel.y*lag},
      vel:a.vel,facing:a.facing,stance:a.stance,pose:a.pose})),runner.idx);
  }
  const initial=actors.map(a=>({slot:a.slot,id:a.player.id,profile:a.profile,body:structuredClone(a.body),
    downUntil:a.downUntil,behavior:a.behavior.kind,installedJob:a.runFit}));
  const frames: any[]=[];
  let raw: Record<string,unknown>={},reads: unknown[]=[],frame:any=null,stage='pre-physics';
  const wrapped=new WeakSet<Behavior>();
  const wrapBehavior=(a:Agent)=>{
    const b=a.behavior;if(!observe||wrapped.has(b))return;wrapped.add(b);
    const update=b.update.bind(b);
    b.update=(actor,context)=>{
      const previous=stage;stage=`behavior:${actor.slot}`;
      const command=update(actor,context);
      raw[actor.slot]={behavior:b.kind,command:structuredClone(command),objective:structuredClone(movementObjective(command)??null)};
      stage=previous;
      return command;
    };
  };
  if(observe){
    const see=sim.see.bind(sim);
    sim.see=(observer,target,delayScale=1)=>{
      const seen=see(observer,target,delayScale);
      if(active.has(observer)&&active.has(target))reads.push({stage,observer:observer.slot,target:target.slot,delayScale,seen:structuredClone(seen)});
      return seen;
    };
    const step=sim.world.step.bind(sim.world);
    sim.world.step=(intents,dt)=>{
      stage='physics';
      const before=actors.map(snapshot),report=step(intents,dt);
      frame={start:sim.t,end:sim.t+dt,raw,reads,applied:actors.map(a=>({slot:a.slot,command:structuredClone(intents[a.idx]),
        objective:intents[a.idx]?structuredClone(movementObjective(intents[a.idx]!)??null):null})),before,after:actors.map(snapshot),
        contacts:report.contacts.filter(c=>active.has(sim.agents[c.i])&&active.has(sim.agents[c.j])),
        ground:actors.map(a=>({slot:a.slot,impulse:report.groundImpulse[a.idx],yawImpulse:report.groundYawImpulse[a.idx]})),
        carrierInternalImpulse:{x:runner.profile.massKg*(runner.vel.x-before[0].vel.x)-report.groundImpulse[runner.idx].x,
          y:runner.profile.massKg*(runner.vel.y-before[0].vel.y)-report.groundImpulse[runner.idx].y},
        loadedGrasps:sim.world.joints.filter((j):j is GraspJoint=>j.kind==='grasp'&&j.b===runner.body).map(j=>({
          holder:sim.agents.find(a=>a.body===j.a)?.slot,force:j.force??0,capacity:j.capacity,legs:j.legs,hold:j.hold,reach:j.reach,
          slipping:j.slipping??false,broken:j.broken??false})),
        substeps:report.substeps,workResidual:report.work.residual};
      stage='post-physics';
      return report;
    };
  }
  let eventIndex=sim.events.length;
  while(sim.phase==='live'&&sim.t<START+DURATION){
    raw={};reads=[];frame=null;stage='pre-physics';for(const a of actors)wrapBehavior(a);
    sim.tick();
    if(observe&&frame){frame.events=sim.events.slice(eventIndex);frames.push(frame);}
    eventIndex=sim.events.length;
  }
  const endpoint={t:sim.t,phase:sim.phase,outcome:sim.outcome,endSpot:sim.endSpot,actors:actors.map(snapshot),
    events:sim.events,stats:sim.stats,intents:sim.intents,
    bodies:sim.agents.map(a=>a.body),minds:sim.agents.map(a=>a.mind),behaviors:sim.agents.map(a=>a.behavior),rng:sim.rng,perception:sim.perception};
  const firstBody=frames.find(f=>f.contacts.some((c:any)=>c.impulse>1e-9&&(c.i===runner.idx||c.j===runner.idx)));
  const firstLoaded=frames.find(f=>f.loadedGrasps.some((g:any)=>g.force>1e-9));
  const firstWrap=sim.events.find(e=>e.type==='tackle_wrap');
  const firstFall=sim.events.find(e=>e.type==='fall'&&e.a===runner.idx);
  const loadedIntervals: Array<{start:number;end:number}>=[];
  for(const f of frames)if(f.loadedGrasps.some((g:any)=>g.force>1e-9)){
    const last=loadedIntervals.at(-1);
    if(last&&Math.abs(last.end-f.start)<1e-8)last.end=f.end;
    else loadedIntervals.push({start:f.start,end:f.end});
  }
  const used=process.cpuUsage(cpu);
  return {input,initial,inputSha256:hash({input,initial}),endpointSha256:hash(endpoint),
    result:{t:sim.t,phase:sim.phase,outcome:sim.outcome,endSpot:sim.endSpot,runner:snapshot(runner),
      physicalAdvance:runner.pos.x-50,physicalYChange:runner.pos.y-CENTER_Y,
      firstTorsoContactInterval:firstBody?{start:firstBody.start,end:firstBody.end}:null,
      firstLoadedGripInterval:firstLoaded?{start:firstLoaded.start,end:firstLoaded.end}:null,
      firstAcquiredHoldAt:firstWrap?.t??null,runnerFirstFallAt:firstFall?.t??null,
      loadedIntervals,loadedSeconds:loadedIntervals.reduce((s,x)=>s+x.end-x.start,0),
      firstAcquiredHoldToEnding:sim.phase!=='live'&&firstWrap?sim.t-sim.dt-firstWrap.t:null,
      forceInsideTeammateContactTicks:frames.filter(f=>f.contacts.some((c:any)=>c.impulse>1e-9
        &&((c.i===force.idx&&c.j===inside.idx)||(c.i===inside.idx&&c.j===force.idx)))).length,
      maximumAbsoluteWorkResidual:frames.length?Math.max(...frames.map(f=>Math.abs(f.workResidual))):null},
    events:sim.events,frames,runtime:{wallSeconds:(performance.now()-wall)/1000,cpuSeconds:(used.user+used.system)/1e6}};
}

const output=process.argv[2];
assert.equal(process.argv.length,3,'Usage: pursuit-pair.ts OUTPUT.json');
assert.ok(output?.endsWith('.json'));
const source=sourceVersion(),wall=performance.now(),cpu=process.cpuUsage();
const rows=CASES.map(input=>run(input,true));
const plain=run(CASES[0],false);
assert.equal(rows[0].endpointSha256,plain.endpointSha256,'Observer changed body/mind/RNG/event endpoint');
assert.equal(source,sourceVersion(),'Engine changed during collection');
const used=process.cpuUsage(cpu);
const result={question:'Does retaining the installed outside shoulder at midfield produce useful achievable movement while both pursuers and the carrier react?',
  sourceSha256:source,engineCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),
  toolSha256:createHash('sha256').update(readFileSync(import.meta.filename)).digest('hex'),node:process.version,
  definition:{start:START,horizon:DURATION,rosterSeeds:[19,20],playSeed:83,cases:CASES,
    responsibilities:'Explicit staged FS force side+1; SS alley side−1. Production post-catch behaviors; no dynamic peer-availability inference is added.'},
  observerNeutrality:{case:CASES[0].id,observed:rows[0].endpointSha256,plain:plain.endpointSha256,pass:true,plainRuntime:plain.runtime},
  limitations:['Staged mechanism test, not ordinary-play transfer or a frequency estimate.',
    'The target identity/possession are staged as acquired; caller-level hidden carrier-selection debt is outside this contract.',
    'Unavailable helpers are parked far away; no effort/capability/grip/collision law is altered.',
    'First acquired hold, actual loaded interval, torso impulse and terminal/censored status are separate.',
    'The carrier uses the existing BallCarrier controller, including its recorded legacy information debt; no additional defensive information is granted.'],
  rows,runtime:{wallSeconds:(performance.now()-wall)/1000,cpuSeconds:(used.user+used.system)/1e6}};
mkdirSync(dirname(output),{recursive:true});writeFileSync(output,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({output,source,rows:rows.map(r=>({id:r.input.id,result:r.result,runtime:r.runtime})),
  observerNeutrality:result.observerNeutrality,runtime:result.runtime},null,2));
