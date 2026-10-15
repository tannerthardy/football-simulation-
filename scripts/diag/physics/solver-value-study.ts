/** Value of accuracy before more solver work. Existing World, one refined tick;
 * no state injection, new law, controller, future information or projection. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {Rng} from '../../../src/core/rng.js';
import {CENTER_Y} from '../../../src/core/field.js';
import {generateTeam,pickOffense,pickDefense} from '../../../src/league/team.js';
import {FORMATION_BY_ID} from '../../../src/playbook/formations.js';
import {RUN_BY_ID} from '../../../src/playbook/concepts.js';
import {FRONT_BY_ID,COVERAGE_BY_ID} from '../../../src/playbook/defense.js';
import {PlaySim} from '../../../src/sim/playsim.js';
import {sourceVersion} from '../../source-version.js';
const path='config/solver-value-study.json',cfg=JSON.parse(readFileSync(path,'utf8')),root='out/solver-value';mkdirSync(root,{recursive:true});
const sha=(p:string)=>createHash('sha256').update(readFileSync(p)).digest('hex'),hash=(x:any)=>createHash('sha256').update(JSON.stringify(x,(_,v)=>v instanceof Map?[...v]:v instanceof Set?[...v]:v)).digest('hex');
const source=sourceVersion(),started=performance.now();
type Intervention={id:string;at:number|null;substeps:number|null};
function run(c:any,arm:Intervention,observe=true){
 const began=performance.now(),formation=FORMATION_BY_ID[cfg.formation],sim=new PlaySim({
  offense:pickOffense(generateTeam(new Rng(cfg.offenseSeed),'Panel offense 1','O1',{strength:cfg.strength}),formation.personnel),
  defense:pickDefense(generateTeam(new Rng(cfg.defenseSeed),'Panel defense 1','D1',{strength:cfg.strength}),c.personnel),
  offCall:{formation,flip:false,kind:'run',run:RUN_BY_ID[cfg.concept],label:'Split Zone'},
  defCall:{personnel:c.personnel,front:FRONT_BY_ID[c.front],coverage:COVERAGE_BY_ID[cfg.coverage],pressure:null,label:c.front},
  los:40,ballY:CENTER_Y,firstDownX:50,seed:cfg.playSeed,handContact:cfg.handContact,groundMovement:cfg.groundMovement}),
  owner=sim.slot(c.owner)!,helper=sim.slot(c.helper)!,defender=sim.slot(c.defender)!,world:any=sim.world,
  combo=(helper.behavior as any).plan.combination,steps:any[]=[],frames:any[]=[],scope:any[]=[];
 const rng=()=>hash([sim.rng,...sim.agents.map(a=>(a.mind as any).rng)]),
  flatJoints=()=>world.joints.map((j:any)=>{const {a,b,actor,holder,...rest}=j;return {...rest,a:world.indexOf(a),b:world.indexOf(b),...(actor?{actor:world.indexOf(actor)}:{}),...(holder?{holder:world.indexOf(holder)}:{})};}),
  fingerprint=()=>hash({bodies:world.bodies,cmds:Reflect.get(sim,'cmds'),intents:sim.intents,minds:sim.agents.map(a=>a.mind),rng:sim.rng,events:sim.events,phase:sim.phase,t:sim.t,joints:flatJoints(),lastStep:sim.lastStep});
 let switched=0,ledger:any=null;
 if(observe){const step=world.step,couple=world.coupleGroundHandYaw;
  const rb=sim.slot('RB')!,mass=rb.profile.massKg;
  // Instrument delivered carrier momentum/translation energy only in native
  // baselines. Source methods remain unchanged; the plain fingerprint checks
  // detect observation side effects. This is attribution, not a law oracle.
  if(arm.id==='native')for(const method of ['feet','pairImpulse','supportImpulse','solveContact']){
   const original=world[method];world[method]=function(...args:any[]){
    const involved=method==='feet'?args[0]===rb.idx:method==='supportImpulse'?[args[0].a,args[0].b].includes(rb.body):method==='solveContact'?[args[0].i,args[0].j].includes(rb.idx):[args[0],args[1]].includes(rb.idx);
    if(!ledger||!involved)return original.apply(this,args);
    const before={...rb.vel},kind=method==='feet'?'feet':method==='supportImpulse'?'supported-grasp-'+(args[4]?'active':'passive'):method==='solveContact'?'body-contact':args[5]+(args[5]==='grasps'?(args[6]===false?'-passive':'-active'):''),
     value=original.apply(this,args),part=ledger.parts[kind]??={x:0,y:0,translationEnergy:0};
    part.x+=mass*(rb.vel.x-before.x);part.y+=mass*(rb.vel.y-before.y);
    part.translationEnergy+=.5*mass*(rb.vel.x**2+rb.vel.y**2-before.x**2-before.y**2);
    return value;
   };
  }
  world.coupleGroundHandYaw=function(rows:any[],contacts:any[],h:number){
   let reason='eligible';const r=rows[0];
   if(contacts.length||this.pending.length)reason='impact-or-strike';
   else if(rows.length!==1)reason=rows.length?'multiple-rows':'no-row';
   else if(r.joint.kind!=='hands'||r.joint.contact||r.drive||r.shove||!(r.steerLim>0)||r.handMembers?.length!==1)reason='unsupported-row';
   else if((r.mode>0&&r.pushLim>0)||(r.mode<0&&r.holdLim>0))reason='normal-load';
   else if(this.bodies[r.i].support.foot||this.bodies[r.j].support.foot)reason='acquired-foot';
   else if(!(r.ri>0&&r.rj>0))reason='nonpositive-arms';
   scope.push({t:sim.t,h,reason,slots:r?[sim.agents[r.i].slot,sim.agents[r.j].slot]:[]});
   return couple.call(this,rows,contacts,h);
  };
  world.step=function(intents:any[],dt:number){
   const input=hash({bodies:this.bodies,intents,joints:flatJoints()}),rngBefore=rng(),intentHash=hash(intents),saved=this.substeps;
   if(arm.at!==null&&Math.abs(sim.t-arm.at)<1e-9){this.substeps=arm.substeps;switched++;}
   if(arm.id==='native')ledger={before:{...rb.vel},parts:{}};
   let report:any;const begin=performance.now();
   try{report=step.call(this,intents,dt);}finally{this.substeps=saved;}
   if(ledger){ledger.after={...rb.vel};const sum=Object.values(ledger.parts) as any[];
    ledger.momentumResidual=Math.hypot(mass*(rb.vel.x-ledger.before.x)-sum.reduce((s,p)=>s+p.x,0),mass*(rb.vel.y-ledger.before.y)-sum.reduce((s,p)=>s+p.y,0));
    ledger.translationEnergyResidual=.5*mass*(rb.vel.x**2+rb.vel.y**2-ledger.before.x**2-ledger.before.y**2)-sum.reduce((s,p)=>s+p.translationEnergy,0);
    assert(ledger.momentumResidual<1e-8&&Math.abs(ledger.translationEnergyResidual)<1e-8,JSON.stringify({case:c.id,t:sim.t,ledger,groundImpulse:report.groundImpulse[rb.idx]}));
   }
   const elapsedMs=performance.now()-begin,engagement=defender.engagement;
   steps.push({t:sim.t,input,rngBefore,rngAfter:rng(),intentHash,afterHash:hash(this.bodies),reportHash:hash(report),substeps:report.substeps,elapsedMs,carrierLedger:ledger,
    bodies:this.bodies.map((b:any,i:number)=>({slot:sim.agents[i].slot,pos:{...b.pos},vel:{...b.vel},facing:b.facing,spin:b.spin??0,energy:b.energy,support:b.support.state})),
    selectedPair:sim.t===.35?structuredClone([sim.slot('C')!.body,sim.slot('NT')?.body??defender.body]):undefined,
    contacts:report.contacts,falls:report.falls,strikes:report.strikes,workResidual:report.work.residual,
    blocker:engagement?.blocker.slot??null,normal:engagement?.hands?.normalForce??null,tangent:engagement?.hands?.tangentForce??null,
    handActive:!!engagement?.hands&&this.joints.includes(engagement.hands),released:combo.released,
    ownerFacing:owner.facing,ownerSupport:owner.body.support!.state,helperChecked:helper.tags.has('combo-check-climb')});
   ledger=null;return report;
  };
 }
 while(sim.t<cfg.windowSeconds&&sim.phase!=='dead'){
  sim.tick();if(observe)frames.push({t:sim.t,rng:rng(),carrier:sim.carrier?.slot??null,
   rb:{pos:{...sim.slot('RB')!.pos},vel:{...sim.slot('RB')!.vel}},
   firstContactAt:sim.events.find(e=>e.type==='carrier_contact')?.t??null,firstContactX:sim.firstContactX,
   released:combo.released,climbs:sim.events.filter(e=>e.type==='block_climb'&&e.a===helper.idx),
   events:sim.events.filter(e=>['carrier_contact','tackle','block_shed','block_climb'].includes(e.type))});
 }
 if(observe)assert.equal(switched,arm.at===null?0:1);
 return {case:c.id,arm,fingerprint:fingerprint(),steps,frames,scope,phase:sim.phase,t:sim.t,censored:sim.phase!=='dead',
  outcome:sim.outcome,firstContactAt:sim.events.find(e=>e.type==='carrier_contact')?.t??null,firstContactX:sim.firstContactX,
  endSpot:sim.endSpot,creditedYards:sim.phase==='dead'?sim.buildResult().yards:null,
  rbMass:sim.slot('RB')!.profile.massKg,
  released:combo.released,helperChecked:helper.tags.has('combo-check-climb'),helperClimbs:sim.events.filter(e=>e.type==='block_climb'&&e.a===helper.idx),
  finalRb:{pos:{...sim.slot('RB')!.pos},vel:{...sim.slot('RB')!.vel}},elapsedSeconds:(performance.now()-began)/1000};
}
function difference(a:any,b:any,slots?:string[]){const result={position:0,velocity:0,facing:0,spin:0};
 for(let i=0;i<a.bodies.length;i++){const x=a.bodies[i],y=b.bodies[i];if(slots&&!slots.includes(x.slot))continue;
  result.position=Math.max(result.position,Math.hypot(x.pos.x-y.pos.x,x.pos.y-y.pos.y));result.velocity=Math.max(result.velocity,Math.hypot(x.vel.x-y.vel.x,x.vel.y-y.vel.y));
  result.facing=Math.max(result.facing,Math.abs(Math.atan2(Math.sin(x.facing-y.facing),Math.cos(x.facing-y.facing))));result.spin=Math.max(result.spin,Math.abs(x.spin-y.spin));}
 return result;
}
const results=[],plainChecks=[];
for(const c of cfg.cases){
 const baseline=run(c,cfg.interventions[0]),plain=run(c,cfg.interventions[0],false);assert.equal(baseline.fingerprint,plain.fingerprint);plainChecks.push({case:c.id,exact:true,seconds:plain.elapsedSeconds});
 const arms:Intervention[]=[...cfg.interventions.slice(1)];if(c.id===cfg.opposingIntervention.case)arms.push(cfg.opposingIntervention);
 const runs=[baseline,...arms.map(arm=>run(c,arm))],comparisons=[];
 for(const candidate of runs.slice(1)){
  const at=candidate.arm.at!,index=baseline.steps.findIndex(s=>s.t===at);assert(index>=0);
  for(let i=0;i<=index;i++){assert.equal(candidate.steps[i].input,baseline.steps[i].input);assert.equal(candidate.steps[i].rngBefore,baseline.steps[i].rngBefore);if(i<index)assert.equal(candidate.steps[i].afterHash,baseline.steps[i].afterHash);}
  if(candidate.arm.id==='null12')assert.equal(candidate.fingerprint,baseline.fingerprint);
  const common=Math.min(candidate.steps.length,baseline.steps.length)-1;
  assert.equal(candidate.steps[common].t,baseline.steps[common].t);
  const immediate=difference(candidate.steps[index],baseline.steps[index]),last=difference(candidate.steps[common],baseline.steps[common]),
   first=(key:string)=>candidate.steps.slice(0,common+1).find((s,i)=>s[key]!==baseline.steps[i][key])?.t??null,
   at2=candidate.frames[common],base2=baseline.frames[common];
  const checkpoint=Math.min(common,baseline.frames.findIndex(s=>s.t===cfg.checkpointSeconds));
  assert(checkpoint>=0);
  comparisons.push({arm:candidate.arm,matchedPrefix:true,firstChangedBodyTick:first('afterHash'),firstChangedCommandTick:first('intentHash'),firstChangedRngTick:first('rngBefore'),
   comparisonStop:at2.t,
   checkpoint:{t:baseline.frames[checkpoint].t,motion:difference(candidate.steps[checkpoint],baseline.steps[checkpoint]),rbDistance:Math.hypot(candidate.frames[checkpoint].rb.pos.x-baseline.frames[checkpoint].rb.pos.x,candidate.frames[checkpoint].rb.pos.y-baseline.frames[checkpoint].rb.pos.y)},
   immediate,immediateC_NT:difference(candidate.steps[index],baseline.steps[index],['C','NT']),final:last,
   rbDistanceAtStop:Math.hypot(at2.rb.pos.x-base2.rb.pos.x,at2.rb.pos.y-base2.rb.pos.y),
   helperClimbs:candidate.helperClimbs,released:candidate.released,firstContactAt:candidate.firstContactAt,firstContactX:candidate.firstContactX,censored:candidate.censored,creditedYards:candidate.creditedYards,endSpot:candidate.endSpot});
 }
 const fineComparisons=[['fine192','fine768'],['fine768','fine3072']].map(([a,b])=>{const x=runs.find(r=>r.arm.id===a)!,y=runs.find(r=>r.arm.id===b)!,common=Math.min(x.steps.length,y.steps.length)-1;assert.equal(x.steps[common].t,y.steps[common].t);return {a,b,comparisonStop:x.frames[common].t,immediate:difference(x.steps[7],y.steps[7]),final:difference(x.steps[common],y.steps[common]),rbDistanceAtStop:Math.hypot(x.frames[common].rb.pos.x-y.frames[common].rb.pos.x,x.frames[common].rb.pos.y-y.frames[common].rb.pos.y),helperClimbs:[x.helperClimbs,y.helperClimbs]};});
 const counts:Record<string,number>={};for(const s of baseline.scope)counts[s.reason]=(counts[s.reason]??0)+1;
 results.push({case:c,baselineFingerprint:baseline.fingerprint,comparisons,fineComparisons,scope:{calls:baseline.scope.length,counts,eligibleTicks:[...new Set(baseline.scope.filter(s=>s.reason==='eligible').map(s=>s.t))]},runs});
}
const contactAudits=results.map(c=>{const run=c.runs[0],event=run.frames.at(-1)!.events.find((e:any)=>e.type==='carrier_contact');assert(event);
 // A new grasp is acquired after this tick's physics. Its first loaded World
 // interval starts on the next controller tick; don't count acquisition as a
 // delivered impulse or use proximity as contact.
 const start=Math.round((event.t+(event.note==='grasp'?.05:0))*100)/100,end=start+.2,
  steps=run.steps.filter(s=>s.t>=start-1e-9&&s.t<end-1e-9);assert.equal(steps.length,4);
 const before=steps[0].carrierLedger.before,after=steps.at(-1)!.carrierLedger.after,speed=Math.hypot(before.x,before.y),direction={x:before.x/speed,y:before.y/speed},parts:Record<string,any>={};
 for(const s of steps)for(const [kind,p] of Object.entries(s.carrierLedger.parts) as [string,any][]){const q=parts[kind]??={x:0,y:0,translationEnergy:0};for(const k of ['x','y','translationEnergy'])q[k]+=p[k];}
 for(const p of Object.values(parts))p.forwardVelocityChange=(p.x*direction.x+p.y*direction.y)/run.rbMass;
 return {case:c.case.id,firstContact:event,loadedWindow:{start,end},mass:run.rbMass,before,after,speedBefore:speed,speedAfter:Math.hypot(after.x,after.y),parts,
  maximumMomentumResidual:Math.max(...steps.map(s=>s.carrierLedger.momentumResidual)),maximumTranslationEnergyResidual:Math.max(...steps.map(s=>Math.abs(s.carrierLedger.translationEnergyResidual))),
  scope:'Actual native World velocity/translation-energy changes by source method. Not pair dissipation or an independent physical force reference.',initialDirection:direction};
});
assert.equal(sourceVersion(),source);
const result={protocol:'solver-value-study-v1',source,input:{path,sha256:sha(path)},toolSha256:sha('scripts/diag/physics/solver-value-study.ts'),plainChecks,results,contactAudits,
 interpretation:'Self-refinement and continuation sensitivity, not independent physical truth or proof of football benefit. The whole near-contact World tick is refined, including other bodies. No state injection. No solver default changes.',
 elapsedSeconds:(performance.now()-started)/1000,adoptionReady:false};
writeFileSync(`${root}/result.json`,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({...result,results:results.map(({runs,...r})=>({...r,stops:runs.map(x=>({arm:x.arm.id,t:x.t,phase:x.phase,censored:x.censored,helperClimbs:x.helperClimbs,released:x.released,firstContactAt:x.firstContactAt,firstContactX:x.firstContactX,elapsedSeconds:x.elapsedSeconds}))}))}));
