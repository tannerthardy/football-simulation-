/** PR66: observe the exact existing fixtures, not a replacement football panel.
 * Extract their setup/step helpers verbatim; adapt assertion plumbing only.
 * Native observers consume no additional cues or randomness. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {gzipSync} from 'node:zlib';
import ts from 'typescript';
import {Rng} from '../../../src/core/rng.js';
import {CENTER_Y} from '../../../src/core/field.js';
import {generateTeam,pickOffense,pickDefense} from '../../../src/league/team.js';
import {FORMATION_BY_ID} from '../../../src/playbook/formations.js';
import {RUN_BY_ID} from '../../../src/playbook/concepts.js';
import {FRONT_BY_ID,COVERAGE_BY_ID} from '../../../src/playbook/defense.js';
import {PlaySim} from '../../../src/sim/playsim.js';
import {goTo} from '../../../src/sim/behaviors/common.js';
import {readCombination} from '../../../src/sim/behaviors/blocking.js';
import {availability,supportParams} from '../../../src/physics/support.js';
import {fatigueFactor} from '../../../src/physics/kinematics.js';
import {sourceVersion} from '../../source-version.js';

const output=process.argv[2]??'out/helper-review/trace.json.gz',start=performance.now(),source=sourceVersion();
const hash=(x:unknown)=>createHash('sha256').update(typeof x==='string'?x:JSON.stringify(x)).digest('hex');
const original=readFileSync('test/zone-helper-check.test.ts','utf8');
const plumbing=`import assert from 'node:assert/strict';
const expect=(a:any)=>({toBe:(b:any)=>assert.equal(a,b),toEqual:(b:any)=>assert.deepEqual(a,b),
toBeNull:()=>assert.equal(a,null),toBeGreaterThan:(b:number)=>assert(a>b),
toBeGreaterThanOrEqual:(b:number)=>assert(a>=b),toBeLessThan:(b:number)=>assert(a<b),
toBeLessThanOrEqual:(b:number)=>assert(a<=b),not:{toBeNull:()=>assert.notEqual(a,null)}});`;
const fixtureSource=original.slice(0,original.indexOf("describe('the original inside-zone"))
 .replace("import { describe, expect, it, vi } from 'vitest';",plumbing)
 .replace(/from '(\.\.[^']+)'/g,(_,p)=>`from '${pathToFileURL(resolve('test',p)).href}'`)
 +'\nexport {fixture,step,loaded,prime,checked,readUntil};\n';
const fixtureModule=ts.transpileModule(fixtureSource,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
const fixtures=await import('data:text/javascript;base64,'+Buffer.from(fixtureModule).toString('base64'));
const runs:any[]=[],routeDiagnostic=process.argv.includes('--collection-route');
function frame(sim:any,combo:any,owner:any,helper:any){
 const e=combo.defender.engagement,h=e?.hands,blocker=e?.blocker??owner;
 return {t:sim.t,phase:sim.phase,released:combo.released,checkSince:combo.checkSince,checkNextRead:combo.checkNextRead,nextRead:combo.nextRead,
  kind:helper.behavior.plan?.kind,target:helper.behavior.plan?.target?.slot,tags:[...helper.tags],
  bodies:structuredClone(sim.world.bodies),slots:sim.agents.map((a:any)=>a.slot),carrier:sim.carrier?.slot??null,
  state:e?{owner:e.blocker.slot,helpers:e.helpers.map((a:any)=>a.slot),control:e.control,phi:e.phi,baseB:e.baseB,
   drive:e.drive,surfaceAxis:e.surfaceAxis,hands:h?{active:sim.world.joints.includes(h),normal:h.normalForce,tangent:h.tangentForce,
    extension:h.extension,distance:Math.hypot(blocker.pos.x-combo.defender.pos.x,blocker.pos.y-combo.defender.pos.y),
    off:Math.atan2(Math.sin(Math.atan2(combo.defender.pos.y-blocker.pos.y,combo.defender.pos.x-blocker.pos.x)-blocker.facing),
     Math.cos(Math.atan2(combo.defender.pos.y-blocker.pos.y,combo.defender.pos.x-blocker.pos.x)-blocker.facing))}:null}:null,
  ownerBase:owner.body.support?availability(owner.body.support,supportParams(owner.profile),fatigueFactor(owner.body.energy)):1,
  helperEngagement:helper.engagement?.defender.slot??null,
  joints:sim.world.joints.map((j:any)=>({kind:j.kind,a:sim.agents.find((a:any)=>a.body===j.a)?.slot,b:sim.agents.find((a:any)=>a.body===j.b)?.slot,
   normal:j.normalForce,tangent:j.tangentForce,extension:j.extension,rest:j.rest})),
  commands:structuredClone(Reflect.get(sim,'cmds')),intents:structuredClone(sim.intents)};
}
function observe(sim:any,combo:any,owner:any,helper:any){
 const reads:any[]=[],steps:any[]=[],seen=sim.see,update=helper.behavior.update,worldStep=sim.world.step;
 let reading=false,pictures:any[]=[];
 sim.see=function(a:any,b:any,scale=1){const p=seen.call(this,a,b,scale);if(reading&&a===helper)pictures.push({target:b.slot,picture:structuredClone(p)});return p;};
 helper.behavior.update=function(a:any,s:any){const before=frame(s,combo,owner,helper);pictures=[];reading=true;
  let command;try{command=update.call(this,a,s);}finally{reading=false;}
  reads.push({t:s.t,before,pictures,command:structuredClone(command),after:frame(s,combo,owner,helper)});return command;};
 sim.world.step=function(intents:any,dt:number){const before=frame(sim,combo,owner,helper),requested=structuredClone(intents),r=worldStep.call(this,intents,dt);
  steps.push({before,requested,after:frame(sim,combo,owner,helper),report:{contacts:r.contacts,strikes:r.strikes,groundImpulse:r.groundImpulse,
   armImpulse:r.armImpulse,armImpulseLimit:r.armImpulseLimit,armWork:r.armWork,armWorkLimit:r.armWorkLimit,
   supportMotorWork:r.supportMotorWork,supportMotorWorkLimit:r.supportMotorWorkLimit,work:r.work}});return r;};
 return {reads,steps};
}
function fingerprint(sim:any){return hash({bodies:sim.world.bodies,cmds:Reflect.get(sim,'cmds'),intents:sim.intents,
 minds:sim.agents.map((a:any)=>a.mind),rng:sim.rng,events:sim.events,phase:sim.phase,t:sim.t});}
for(const mode of (routeDiagnostic?['patch']:['center','patch']) as Array<'center'|'patch'>){
 // The exact helper fixture constructors omit the selector; scope its default
 // only for fixture creation, then set the explicit law before the first step.
 const worldModule=await import('../../../src/physics/world.js'),step=worldModule.World.prototype.step;
 worldModule.World.prototype.step=function(...args:any[]){Reflect.set(this,'handContact',mode);Reflect.set(this,'groundMovementSetting','legacy');return step.apply(this,args as any);};
 for(const scenario of (routeDiagnostic?['loss-minus','loss-plus']:['recovery','loss-minus','loss-plus'])){
  const side=scenario==='loss-minus'?-1:1,f=fixtures.loaded(side),{sim,owner,helper,combination:combo}=f;
  const trace=observe(sim,combo,owner,helper),initial=frame(sim,combo,owner,helper),markers:any[]=[];
  if(scenario==='recovery'){
   fixtures.prime(f);markers.push({name:'primed',frame:frame(sim,combo,owner,helper)});
   helper.body.support.state='down';readCombination(helper,sim,combo);markers.push({name:'down-read',frame:frame(sim,combo,owner,helper)});
   helper.body.support.state='up';readCombination(helper,sim,combo);markers.push({name:'recovered-read',frame:frame(sim,combo,owner,helper)});
   fixtures.readUntil(f);
  }else{
   owner.body.facing=Math.atan2(f.defender.pos.y-owner.pos.y,f.defender.pos.x-owner.pos.x)+Math.PI;
   fixtures.step(f);markers.push({name:'released-owner',frame:frame(sim,combo,owner,helper)});
   if(routeDiagnostic){
    // One diagnostic route around the observed teammate, not a production
    // policy. Same full fixture state, acquired delayed cues and physical law.
    // Return to ordinary collection after reaching the inside waypoint.
    const originalUpdate=f.uncovered.update,covered=sim.see(helper,owner),down=sim.see(helper,f.defender),
     clearance=helper.profile.radius+owner.profile.radius+.15,
     goal={x:covered.pos.x-clearance,y:down.pos.y};
    markers.push({name:'diagnostic-cues-and-waypoint',t:sim.t,covered:structuredClone(covered),down:structuredClone(down),goal});
    let clearing=true;
    f.uncovered.update=function(a:any,s:any){
     const command=originalUpdate.call(this,a,s);
     if(a.engagement||!clearing)return command;
     if(Math.hypot(a.pos.x-goal.x,a.pos.y-goal.y)<.2){clearing=false;markers.push({name:'resume-native-collection',t:s.t,pos:{...a.pos}});return command;}
     return {...goTo(a,goal,{speed:1,facing:Math.atan2(down.pos.y-a.pos.y,down.pos.x-a.pos.x)}),posture:.7};
    };
   }
   fixtures.step(f,true);
   for(let k=0;k<40&&!helper.engagement;k++)fixtures.step(f,true);
   if(helper.engagement)for(let k=0;k<4;k++)fixtures.step(f,true);
  }
  runs.push({mode,scenario,side,scope:'Exact controlled test fixture; other players intentionally idle/parked as in original, no native outcome claim',
   slots:{owner:owner.slot,helper:helper.slot,defender:combo.defender.slot,backer:combo.backer.slot},initial,markers,...trace,
   final:frame(sim,combo,owner,helper),events:sim.events});
 }
 worldModule.World.prototype.step=step;
 for(const front of (routeDiagnostic?[]:['under','tite'])){
  const run=(observed:boolean)=>{
   const formation=FORMATION_BY_ID.gun_wing_12,sim=new PlaySim({
    offense:pickOffense(generateTeam(new Rng(31),'Panel offense 1','O1',{strength:.55}),formation.personnel),
    defense:pickDefense(generateTeam(new Rng(32),'Panel defense 1','D1',{strength:.55}),front==='under'?'base43':'base34'),
    offCall:{formation,flip:false,kind:'run',run:RUN_BY_ID.split_zone,label:'Split Zone'},
    defCall:{personnel:front==='under'?'base43':'base34',front:FRONT_BY_ID[front],coverage:COVERAGE_BY_ID.cover3,pressure:null,label:front==='under'?'Under Cover 3':'Tite Cover 3'},
    los:40,ballY:CENTER_Y,firstDownX:50,seed:3,handContact:mode,groundMovement:'legacy'}),
    helper=sim.slot(front==='under'?'RG':'RT')!,combo=(helper.behavior as any).plan.combination,owner=combo.members[0],
    trace=observed?observe(sim,combo,owner,helper):{},initial=observed?frame(sim,combo,owner,helper):null;
   while(sim.t<2&&sim.phase!=='dead')sim.tick();
   return {fingerprint:fingerprint(sim),mode,scenario:front,scope:'Native all22 with normal initialization and reactions, live2s censor',
    slots:{owner:owner.slot,helper:helper.slot,defender:combo.defender.slot,backer:combo.backer.slot},initial,...trace,final:observed?frame(sim,combo,owner,helper):null,events:sim.events};
  };
  const plain=run(false),recorded=run(true);assert.equal(recorded.fingerprint,plain.fingerprint);runs.push({...recorded,observerNeutral:true});
 }
}
assert.equal(sourceVersion(),source);mkdirSync(dirname(output),{recursive:true});
const result={source,fixtureFile:'test/zone-helper-check.test.ts',fixtureSha256:hash(original),toolSha256:hash(readFileSync('scripts/diag/zone/helper-contract-review.ts','utf8')),
 settings:{handContact:routeDiagnostic?['patch']:['center','patch'],groundMovement:'legacy',normalObserverInitialization:true,flags:'baseline launcher receipt',
 diagnostic:routeDiagnostic?'One observed-teammate waypoint before resuming ordinary collection; not a production fix':null,modifiedControllers:[],historicalComparison:'4ded6b6'},runs,elapsedSeconds:(performance.now()-start)/1000};
writeFileSync(output,gzipSync(JSON.stringify(result)));
console.log(JSON.stringify({source,elapsedSeconds:result.elapsedSeconds,runs:runs.map(r=>({mode:r.mode,scenario:r.scenario,t:r.final.t,released:r.final.released,engagement:r.final.helperEngagement,events:r.events.filter((e:any)=>e.type==='block_climb'||e.type==='shed')}))}));
