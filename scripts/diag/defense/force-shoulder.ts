/** Accepted native force-width witnesses; observer only, not a policy trial.
 * Every recorded picture/aim is returned by an existing call. No new see(),
 * behavior invocation or random draw is made. Two short natural constructors;
 * the first is also run without instrumentation to verify physical/RNG parity.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { Rng } from '../../../src/core/rng.js';
import type { Vec2 } from '../../../src/core/vec.js';
import { generateTeam, pickDefense, pickOffense } from '../../../src/league/team.js';
import { RUN_BY_ID } from '../../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../../src/playbook/formations.js';
import type { MoveCommand } from '../../../src/physics/kinematics.js';
import type { GraspJoint } from '../../../src/physics/world.js';
import { movementObjective } from '../../../src/sim/movement-objective.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import { sourceVersion } from '../../source-version.js';

const out = process.argv[2] ?? 'out/force-shoulder/accepted-native.json';
assert.ok(process.argv.length <= 5, 'Usage: force-shoulder.ts [OUTPUT.json] [MAX_TIME] [CASE]');
const inputs = [
  { id:'AFTER-04', look:'under3', personnel:'base43' as const, front:'under', roster:11, seed:7 },
  { id:'AFTER-14', look:'wide9', personnel:'nickel' as const, front:'wide9', roster:31, seed:8 },
].filter(input => !process.argv[4] || input.id === process.argv[4]);
assert.ok(inputs.length,'Unknown case');
const hash = (v: unknown) => createHash('sha256').update(JSON.stringify(v)).digest('hex');
const clone = <T>(v:T):T => structuredClone(v);
const cmd = (value: MoveCommand | null | undefined) => value ? { request:clone(value), objective:clone(movementObjective(value)) } : null;
const maxTime=process.argv[3] ? Number(process.argv[3]) : 3.5;
assert.ok(maxTime>0 && maxTime<=4.25,'Keep continuation short (at most 4.25s)');
function make(input:typeof inputs[number]) {
  const formation=clone(FORMATION_BY_ID.ace_12), run=clone(RUN_BY_ID.oz_strong);
  run.direction='strong';
  return new PlaySim({
    offense:pickOffense(generateTeam(new Rng(input.roster),`pair${input.roster} O`,`pair${input.roster}O`,{strength:.55}),'12'),
    defense:pickDefense(generateTeam(new Rng(input.roster+1),`pair${input.roster} D`,`pair${input.roster}D`,{strength:.55}),input.personnel),
    offCall:{formation,flip:false,kind:'run',run,label:'oz'},
    defCall:{personnel:input.personnel,front:FRONT_BY_ID[input.front],coverage:COVERAGE_BY_ID.cover3,
      pressure:null,zoneStyle:'match',runPolicy:{edge:'spill',linebacker:'stack'},label:input.look},
    los:40,ballY:26.67,firstDownX:50,down:1,seed:input.seed,audibles:false,hurry:false,record:false,
  });
}
function signature(sim:PlaySim) {
  return hash({ bodies:sim.agents.map(a=>a.body),intents:sim.intents.map(cmd),events:sim.events,
    phase:sim.phase,outcome:sim.outcome,t:sim.t,rng:JSON.parse(JSON.stringify(sim.rng)),
    minds:sim.agents.map(a=>({ ...a.mind, aims:[...Reflect.get(a.mind,'aims')] })),
    perception:structuredClone(sim.perception) });
}
function trial(input:typeof inputs[number],observe:boolean) {
  const wall=performance.now(), cpu=process.cpuUsage(), sim=make(input), rb=sim.slot('RB')!;
  const side=sim.offAlign.strongSign;
  const force=sim.defense.filter(a=>a.runFit?.kind==='force'&&a.runFit.side===side);
  assert.equal(force.length,1,'Expected one installed strong force owner');
  const a=force[0], installedJob=clone(a.runFit), initial={actor:clone(a.body),rb:clone(rb.body)};
  const states:any[]=[];
  let decision:any=null,inBehavior=false;
  if(observe) {
    const see=sim.see.bind(sim),aim=a.mind.aim.bind(a.mind),update=a.behavior.update,step=sim.world.step.bind(sim.world);
    sim.see=function(observer,target,delay) {
      const picture=see(observer,target,delay);
      if(inBehavior&&observer===a) decision.consumed.push({target:target.slot,idx:target.idx,delayMultiplier:delay??null,picture:clone(picture),
        publicRadius:target.profile.radius,inlineAtSnap:!!sim.offAlign.spots[target.slot]?.inline});
      return picture;
    };
    a.mind.aim=function(job,desired,t) {
      const before=Reflect.get(a.mind,'aims').get(job), adopted=aim(job,desired,t);
      if(inBehavior) decision.aims.push({job,desired:clone(desired),adopted:clone(adopted),
        held:!!before&&t<before.until,until:Reflect.get(a.mind,'aims').get(job)?.until??null});
      return adopted;
    };
    const placement=Object.getOwnPropertyDescriptor(Object.getPrototypeOf(a.mind),'placementError')!.get!;
    Object.defineProperty(a.mind,'placementError',{get(){
      const value=placement.call(this);
      if(inBehavior)decision.placementErrors.push(value);
      return value;
    }});
    a.behavior.update=function(actor,s) {
      decision={t:sim.t,behavior:a.behavior.kind,ownRecognition:a.recog?.read??null,
        body:clone(a.body),consumed:[],aims:[],placementErrors:[]};
      inBehavior=true;
      try { const raw=update.call(this,actor,s); decision.raw=cmd(raw); return raw; }
      finally { inBehavior=false; }
    };
    sim.world.step=function(intents,dt) {
      const before={actor:clone(a.body),rb:clone(rb.body)}, heldDecision=decision;
      const baseCommands=Reflect.get(sim,'cmds') as MoveCommand[];
      const contained=cmd(baseCommands[a.idx]),applied=cmd(intents[a.idx]);
      const incoming=sim.agents.map(agent=>({mass:agent.profile.massKg,vel:{...agent.vel}}));
      const report=step(intents,dt);
      const loadedGrasps=sim.world.joints.filter((j):j is GraspJoint=>j.kind==='grasp'&&j.b===rb.body).map(j=>({
        holder:sim.agents.find(a=>a.body===j.a)?.slot,force:j.force??0,
        broken:j.broken??false,slipping:j.slipping??false}));
      const ground=report.groundImpulse.reduce((p,q)=>({x:p.x+q.x,y:p.y+q.y}),{x:0,y:0});
      const totalChange=sim.agents.reduce((p,agent,i)=>({x:p.x+incoming[i].mass*(agent.vel.x-incoming[i].vel.x),
        y:p.y+incoming[i].mass*(agent.vel.y-incoming[i].vel.y)}),{x:0,y:0});
      const picture=heldDecision?.consumed.find((c:any)=>c.idx===rb.idx)?.picture;
      const edgeAim=heldDecision?.aims.find((m:any)=>m.job==='edge-fit'||m.job==='force-fit');
      states.push({t:sim.t,end:sim.t+dt,decision:heldDecision,contained,applied,before,
        achieved:{actor:clone(a.body),rb:clone(rb.body)},
        margins:{liveBefore:side*(before.actor.pos.y-before.rb.pos.y),liveAfter:side*(a.pos.y-rb.pos.y),
          acquiredBefore:picture?side*(before.actor.pos.y-picture.pos.y):null,
          desired:picture&&edgeAim?side*(edgeAim.desired.y-picture.pos.y):null,
          adopted:picture&&edgeAim?side*(edgeAim.adopted.y-picture.pos.y):null},
        diagnosticTruth:{ball:sim.ball.kind,carrierSlot:sim.carrier?.slot??null,engagedWith:a.engagement?.blocker.slot??null},
        groundImpulse:report.groundImpulse[a.idx],loadedGrasps,
        contacts:report.contacts.filter(c=>c.i===a.idx||c.j===a.idx||c.i===rb.idx||c.j===rb.idx),
        workResidual:report.work.residual,pairMomentumResidual:Math.hypot(totalChange.x-ground.x,totalChange.y-ground.y)});
      decision=null;
      return report;
    };
  }
  while(sim.phase==='live'&&sim.t<maxTime)sim.tick();
  const used=process.cpuUsage(cpu);
  const edgeRows=states.filter(s=>s.decision?.aims.some((m:any)=>m.job==='edge-fit'||m.job==='force-fit'));
  const carryingRows=edgeRows.filter(s=>s.decision.consumed.some((c:any)=>c.idx===rb.idx&&c.picture.carrying===true));
  const loss=carryingRows.find((s:any,i:number)=>s.margins.liveAfter<0&&(i===0||carryingRows[i-1].margins.liveAfter>=0));
  const crossing=states.find(s=>s.achieved.rb.pos.x>=sim.los);
  return {input:{...input,case:`oz/strong/ace_12/${input.look}/pair${input.roster}/${input.seed}`},
    actor:{slot:a.slot,idx:a.idx,side,installedJob,initial},
    result:{phase:sim.phase,outcome:sim.outcome,t:sim.t,gain:rb.pos.x-sim.los,
      physicalAdvance:rb.pos.x-sim.los,creditedEndSpot:sim.phase==='live'?null:sim.endSpot},
    signature:signature(sim),events:clone(sim.events),states,
    summary:{edgeFitTicks:edgeRows.length,acquiredCarryingEdgeFitTicks:carryingRows.length,
      minimumLiveMargin:carryingRows.length?Math.min(...carryingRows.map(s=>s.margins.liveAfter)):null,
      firstInsideDuringAcquiredEdgeFit:loss?.t??null,
      firstLostWidthState:loss??null,losCrossing:crossing?{t:crossing.end,margin:crossing.margins.liveAfter}:null,
      maximumAbsoluteWorkResidual:states.length?Math.max(...states.map(s=>Math.abs(s.workResidual))):null,
      maximumPairMomentumResidual:states.length?Math.max(...states.map(s=>s.pairMomentumResidual)):null},
    runtime:{wallSeconds:(performance.now()-wall)/1000,cpuSeconds:(used.user+used.system)/1e6},observe};
}
const source=sourceVersion(),rows=inputs.map(input=>trial(input,true)),plain=trial(inputs[0],false);
assert.equal(rows[0].signature,plain.signature,'Observer changes full body/RNG/events/minds/perception endpoint');
assert.equal(sourceVersion(),source,'Source changed during collection');
const receipt={source,commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),node:process.version,
  toolSha256:createHash('sha256').update(readFileSync(import.meta.filename)).digest('hex'),maxTime,
  definition:'AFTER04/14 are historical film constructor identifiers, not accepted outcome claims. All22 naturally react. Consumed pictures and aim calls observed only; truth/body fields are diagnostic, never fed into decisions. Behavior return, coverage-contained base and final World intent are separate. Modifier attribution between coverage and World remains grouped.',
  rows,observerControl:{input:inputs[0],signature:plain.signature,matched:true,runtime:plain.runtime}};
mkdirSync(dirname(out),{recursive:true});writeFileSync(out,JSON.stringify(receipt,null,2)+'\n');
console.log(JSON.stringify({out,source,rows:rows.map(r=>({input:r.input,actor:r.actor.slot,result:r.result,
  runtime:r.runtime,summary:{...r.summary,firstLostWidthState:r.summary.firstLostWidthState
    ?{t:r.summary.firstLostWidthState.t,margins:r.summary.firstLostWidthState.margins}:null}})),
  observerControl:receipt.observerControl},null,2));
