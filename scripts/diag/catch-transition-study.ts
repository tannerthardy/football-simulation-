/** P4 causal diagnostic: two native approach histories x their two actual
 * execution values. No change to movement gates, capabilities or World laws.
 * node --import tsx scripts/diag/catch-transition-study.ts OUTDIR
 */
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {gzipSync} from 'node:zlib';
import {clamp} from '../../src/core/vec.js';
import type {Agent} from '../../src/sim/agent.js';
import {PlaySim,type PlaySetup} from '../../src/sim/playsim.js';
import {ScoutingReport} from '../../src/sim/recognition.js';
import {CoverageScouting} from '../../src/sim/qbmind.js';
import {gripForce} from '../../src/sim/tackle.js';
import {contactQuality} from '../../src/sim/tackle-window.js';
import {previewFreeMovement} from '../../src/physics/movement-preview.js';
import {interceptPoint} from '../../src/physics/reach.js';
import {FIELD_WIDTH} from '../../src/core/field.js';
import {gatheringApproach,leverage} from '../../src/sim/behaviors/common.js';
import {arrivalChoice,type Consumed} from './catch-arrival-model.js';
import {hipAnchor} from './catch-hip-anchor-model.js';
import {sourceVersion} from '../source-version.js';

const copy=<T>(x:T):T=>structuredClone(x);
const hash=(x:unknown)=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const fileHash=(p:string)=>createHash('sha256').update(readFileSync(p)).digest('hex');
const profile=JSON.parse(readFileSync('config/baseline.json','utf8'));
const provenance={commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sourceSha256:sourceVersion(),
 collectorSha256:fileHash(import.meta.filename),modelSha256:fileHash('scripts/diag/catch-arrival-model.ts'),
 hipModelSha256:fileHash('scripts/diag/catch-hip-anchor-model.ts'),
 flags:Object.fromEntries(Object.keys(profile.flags).map(k=>[k,process.env[k]??null])),worldDefaults:profile.worldDefaults,
 startedAt:new Date().toISOString()};
function restore(f:any,record=false){const s=copy(f.setup),scouting=s.scouting?new ScoutingReport(s.scouting.strength):undefined;
 if(scouting)Reflect.set(scouting,'cells',new Map(s.scouting.cells));
 const coverageScouting=s.coverageScouting?Object.assign(new CoverageScouting(),copy(s.coverageScouting)):undefined;
 return new PlaySim({...s,energy:s.energy?new Map(s.energy):undefined,scouting,coverageScouting,
  record,recordEvery:1,recordLevel:'full'} as PlaySetup);}
function signature(sim:PlaySim,result:any){return hash({result:{...result,frames:undefined,telemetry:undefined},
 bodies:sim.agents.map(a=>a.body),intents:sim.intents,rng:sim.rng,perception:sim.perception});}
function lean(a:Agent){return {idx:a.idx,pos:copy(a.pos),vel:copy(a.vel),facing:a.facing,energy:a.body.energy,
 support:copy(a.body.support),downUntil:a.downUntil};}
function pair(c:Agent,d:Agent){const dx=c.pos.x-d.pos.x,dy=c.pos.y-d.pos.y,dist=Math.hypot(dx,dy),vx=c.vel.x-d.vel.x,vy=c.vel.y-d.vel.y;
 return {carrier:c.idx,defenderIdx:d.idx,distance:dist,closing:-(vx*dx+vy*dy)/Math.max(1e-9,dist),
 transverseSpeed:Math.abs(vx*dy-vy*dx)/Math.max(1e-9,dist),rearCos:-(c.vel.x*dx+c.vel.y*dy)/Math.max(1e-9,c.speed*dist),
 headingDifference:Math.atan2(Math.sin(Math.atan2(d.vel.y,d.vel.x)-Math.atan2(c.vel.y,c.vel.x)),Math.cos(Math.atan2(d.vel.y,d.vel.x)-Math.atan2(c.vel.y,c.vel.x))),
 defenderSpeed:d.speed,runnerSpeed:c.speed,defender:lean(d),runner:lean(c)};}
type Geometry='baseline'|'arrival'|'hip'|'hip-unshaded';
export function trial(f:any,geometry:Geometry,execution:number|null,observe:boolean,destination:string,label:string,audit=false){
 const sim=restore(f,observe),a=sim.agents[f.defender],ci=sim.offense.find(a=>a.player.id===(f.nativeResult.stats.receiver??f.nativeResult.stats.target))?.idx??sim.slot('X')!.idx;
 const wrapped=new WeakSet<object>(),rows:any[]=[],holds:any[]=[],ids=new WeakMap<object,number>();
 const seen=sim.see.bind(sim),step=sim.world.step.bind(sim.world),tick=sim.tick.bind(sim),event=sim.event.bind(sim);
 let inside=false,cues:Consumed[]=[],decision:any=null,raw:any=null,world:any=null,acquisition:any=null,changedCalls=0,forecast:any=null;
 const randomCalls:any[]=[];
 if(audit&&observe){for(const name of ['nextU32','normal'] as const){const native=sim.rng[name].bind(sim.rng);
  Reflect.set(sim.rng,name,(...args:any[])=>{const value=Reflect.apply(native,sim.rng,args);
   const caller=new Error().stack?.split('\n').filter(line=>line.includes('/src/')&&!line.includes('/core/rng.ts')).slice(0,2);
   randomCalls.push({t:sim.t,name,args,value,caller});return value;});}}
 sim.see=(d,c,delay)=>{const picture=seen(d,c,delay);if(inside&&d===a)cues.push({target:c.idx,delay,seen:copy(picture)});return picture;};
 // Both original RNG calls (execution and placement) have already occurred.
 // At this event acquisition is complete, but no grasp load has been solved.
 // Only the selected first hold's execution-dependent quantities are changed,
 // through the existing quality/capacity formulas; no RNG calls are added.
 sim.event=(type,d,c,note)=>{
  if(type==='tackle_wrap'&&d===a&&c?.idx===ci&&acquisition===null){
   const bond=sim.bond!,j=bond.holds!.get(d)!,native=bond.execution!.get(d)!,distance=Math.hypot(d.pos.x-c.pos.x,d.pos.y-c.pos.y),
    body=d.profile.radius+c.profile.radius,q=contactQuality(distance,body,body+d.profile.reach),base=clamp(.25+.85*q,.1,1),
    nativeQuality=bond.grip!.get(d)!,expected=clamp(base*native,.08,1);
   if(d.engagement||j.origin?.startsWith('block')||j.origin==='dive'||Math.abs(expected-nativeQuality)>1e-12)
    throw Error('Selected acquisition is not the verified ordinary quality formula');
   const applied=execution??native,quality=clamp(base*applied,.08,1),before=copy({...j,a:d.idx,b:c.idx});
   if(execution!==null){bond.execution!.set(d,applied);bond.grip!.set(d,quality);j.capacity=gripForce(d,quality);}
   acquisition={t:sim.t,geometry:pair(c,d),q,base,nativeExecution:native,appliedExecution:applied,
    nativeQuality,appliedQuality:quality,before,after:copy({...j,a:d.idx,b:c.idx}),rngSha256:hash(sim.rng),
    command:copy(sim.intents[d.idx]),allBodiesSha256:hash(sim.agents.map(a=>a.body))};
  }
  return event(type,d,c,note);
 };
 if(observe)sim.world.step=(intents,dt)=>{
  const before=sim.agents.map(lean),applied=copy(intents),entry=new Map(sim.world.joints.filter(j=>j.kind==='grasp')
   .map(j=>[j,pair(sim.agents[sim.world.indexOf(j.b)],sim.agents[sim.world.indexOf(j.a)])]));
  const report=step(intents,dt);
  const grasps=sim.world.joints.filter(j=>j.kind==='grasp').map(j=>{let id=ids.get(j);if(id===undefined){id=holds.length;ids.set(j,id);
   const d=sim.agents[sim.world.indexOf(j.a)],c=sim.agents[sim.world.indexOf(j.b)];holds.push({id,defender:d.idx,carrier:c.idx,origin:j.origin,
    firstSeen:sim.t,firstLoaded:null,brokenAt:null,initialCapacity:j.capacity,legs:j.legs,
    acquisitionQuality:sim.bond?.grip?.get(d)??null,execution:sim.bond?.execution?.get(d)??null});}
   const h=holds[id];if((j.force??0)>1e-8&&h.firstLoaded===null){h.firstLoaded=sim.t+dt;h.entryGeometry=entry.get(j);}
   if(j.broken&&h.brokenAt===null)h.brokenAt=sim.t+dt;
   return {...copy({...j,a:undefined,b:undefined}),a:sim.world.indexOf(j.a),b:sim.world.indexOf(j.b),id};});
  world={before,applied,after:sim.agents.map(lean),grasps,report:copy(report)};return report;
 };
 sim.tick=()=>{
  const t=sim.t,rngBefore=audit?hash(sim.rng):null;cues=[];raw=null;decision=null;world=null;forecast=null;
  const b=a.behavior;if(!wrapped.has(b)){wrapped.add(b);const update=b.update.bind(b);
   b.update=(actor,s)=>{inside=true;let original;try{original=update(actor,s);}finally{inside=false;}
    const windowChoice=arrivalChoice(actor,s,original,cues),choice=geometry.startsWith('hip')?hipAnchor(actor,s,windowChoice,geometry==='hip'):windowChoice;
    raw=copy(original);decision=copy(choice);
    const command=geometry==='baseline'?original:choice.command;if(hash(command)!==hash(original))changedCalls++;
    if(geometry.startsWith('hip')&&windowChoice.reason!=='moving-window-arrival'&&hash(choice.command)!==hash(windowChoice.command))
     throw Error('Hip anchor changes a protected or ineligible branch');
    if(audit&&observe){
     const cue=choice.window?{target:choice.window.receiver,seen:choice.window.seen}:cues.find(c=>c.target===ci),sup=a.body.support;
     if(cue&&sup?.state==='up'&&!a.engagement&&!sup.foot&&!sup.strike&&Math.hypot(sup.lean.x,sup.lean.y)<1e-6
      &&Math.hypot(sup.load.x,sup.load.y)<1e-6&&!sim.world.joints.some(j=>j.a===a.body||j.b===a.body)){
      const target=sim.agents[cue.target],picture=cue.seen,contact=a.profile.radius+target.profile.radius+a.profile.reach*.65,
       distance=Math.hypot(picture.pos.x-a.pos.x,picture.pos.y-a.pos.y),force=a.runFit?.kind==='force'||(a.runFit?.kind==='edge'&&a.runFit.edge==='box'),
       offset=(force?Math.abs(leverage(a,picture.pos.y))*a.runFit!.side:leverage(a,picture.pos.y))*clamp((distance-contact)/6,0,1),
       gather=gatheringApproach(a,picture,contact,offset),path=(t:number)=>({x:picture.pos.x+picture.vel.x*t,y:clamp(picture.pos.y+picture.vel.y*t,0,FIELD_WIDTH)}),
       intercept=interceptPoint({pos:a.pos,vel:a.vel,profile:a.profile,speedScale:a.speedScale},path,{horizon:3,step:.1,radius:contact}),
       samples=previewFreeMovement(a.body,command,s.t,12),scored=samples.map(p=>{const target=path(p.t),dx=target.x-p.pos.x,dy=target.y-p.pos.y,dist=Math.hypot(dx,dy),
        vx=p.vel.x-picture.vel.x,vy=p.vel.y-picture.vel.y;
        return {...p,distance:dist,closing:(vx*dx+vy*dy)/Math.max(1e-9,dist),transverse:Math.abs(vx*dy-vy*dx)/Math.max(1e-9,dist)};}),
       closest=scored.reduce((best,p)=>p.distance<best.distance?p:best,scored[0]);
      forecast={target:cue.target,picture:copy(picture),contact,offset,gather:copy(gather),intercept,closest,
       samples:scored,assumption:'Held actual controller command, free World and constant observed runner velocity; no future cut, contact, throw tip or loaded recovery prediction.'};
     }
    }
    return command;};}
  const phaseBefore=sim.ball.kind;tick();if(observe)rows.push({t,phaseBefore,ball:sim.ball.kind,carrier:sim.carrier?.idx??null,cues:copy(cues),raw,decision,forecast,world,rngBefore,rngAfter:audit?hash(sim.rng):null});
 };
 const result=sim.run(),sig=signature(sim,result),file=join(destination,`${label}.json.gz`);
 const record={id:f.id,geometry,execution,setupSha256:hash(f.setup),signature:sig,acquisition,
  selectedDefender:{idx:a.idx,id:a.player.id,slot:a.slot,profile:a.profile},actualReceiverId:result.stats.receiver??null,
  result:{...result,frames:undefined,telemetry:undefined},censored:result.outcome==='timeout',changedCalls,holds,rows,
  randomCalls,frames:observe?result.frames:undefined,telemetry:observe?result.telemetry:undefined};
 if(observe)writeFileSync(file,gzipSync(JSON.stringify(record)));
 return {...record,rows:undefined,randomCalls:undefined,frames:undefined,telemetry:undefined,artifact:observe?{path:file,sha256:fileHash(file)}:null};
}
if(process.argv[1]===import.meta.filename){
const destination=process.argv[2];if(!destination)throw Error('OUTDIR required');mkdirSync(destination,{recursive:true});
const packetPath=process.argv[3]??'data/reviews/current/catch-transition-inputs.json',packet=JSON.parse(readFileSync(packetPath,'utf8')),
 f=packet.clips.find((f:any)=>f.id==='R6103-S3001-P4');
const witnesses=(['baseline','arrival'] as const).map(geometry=>{const w=f.executionWitnesses.find((w:any)=>w.geometry===geometry);
 if(!w||!Number.isFinite(w.execution))throw Error('Actual execution witness missing');return w;});
const cases=[];
for(const geometry of ['baseline','arrival'] as const)for(const draw of [null,...witnesses]){
 const execution=draw?.execution??null,label=`${geometry}-${draw?.geometry??'natural'}-execution`,
  observed=trial(f,geometry,execution,true,destination,label),plain=trial(f,geometry,execution,false,destination,label);
 if(observed.signature!==plain.signature)throw Error('Observer alters native state/RNG');
 if((draw===null||draw.geometry===geometry)&&observed.signature!==witnesses.find(w=>w.geometry===geometry)!.signature)
  throw Error('Native diagonal no longer matches the original witness');
 if(!observed.acquisition)throw Error('Selected first acquisition missing');
 cases.push({...observed,label,drawSource:draw?.geometry??'natural',observerVerified:true});
 console.log(JSON.stringify({label,outcome:observed.result.outcome,yac:observed.result.stats.yac,
  firstLoaded:observed.holds[0]?.firstLoaded,brokenAt:observed.holds[0]?.brokenAt}));
}
for(const geometry of ['baseline','arrival']){const same=cases.filter(c=>c.geometry===geometry);
 if(new Set(same.map(c=>hash({geometry:c.acquisition.geometry,before:c.acquisition.before,rng:c.acquisition.rngSha256,
  bodies:c.acquisition.allBodiesSha256,command:c.acquisition.command}))).size!==1)throw Error('Execution swap altered acquired geometry or RNG');}
if(sourceVersion()!==provenance.sourceSha256)throw Error('Runtime changed');
writeFileSync(join(destination,'summary.json'),JSON.stringify({schema:'p4-geometry-execution-v1',provenance:{...provenance,finishedAt:new Date().toISOString()},
 input:{path:packetPath,sha256:fileHash(packetPath),id:f.id,setupSha256:hash(f.setup)},witnesses,cases,
 interpretation:'Full 22-body native plays. Each geometry retains its actual command history, native acquisition/placement draws, queued strike and RNG consumption. Only execution for the first selected hold is crossed through existing quality/capacity laws before its first load; later decisions and physical feedback run normally. This is a diagnostic intervention, not a capability or physics fix. Geometry rows include their own native leg placement; outcomes are not a population estimate.'})+'\n');
}
