/** Isolate private QB read removal before proposing a replacement cue.
 * fixtures|native OUTDIR; unchanged baseline runtime only.
 */
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {gzipSync} from 'node:zlib';
import {performance} from 'node:perf_hooks';
import {CENTER_Y,FIELD_WIDTH} from '../../src/core/field.js';
import {clamp,lerp,sub,type Vec2} from '../../src/core/vec.js';
import {Rng} from '../../src/core/rng.js';
import {generateTeam,pickOffense,pickDefense} from '../../src/league/team.js';
import {PASS_BY_ID} from '../../src/playbook/concepts.js';
import {COVERAGE_BY_ID,FRONT_BY_ID} from '../../src/playbook/defense.js';
import {FORMATION_BY_ID} from '../../src/playbook/formations.js';
import type {Agent} from '../../src/sim/agent.js';
import {ZoneCoverage} from '../../src/sim/behaviors/defense.js';
import {angleTo,goTo} from '../../src/sim/behaviors/common.js';
import type {MoveCommand} from '../../src/physics/kinematics.js';
import type {Perceived} from '../../src/sim/perception.js';
import {PlaySim,type PlaySetup} from '../../src/sim/playsim.js';
import {ScoutingReport} from '../../src/sim/recognition.js';
import {CoverageScouting} from '../../src/sim/qbmind.js';
import {sourceVersion} from '../source-version.js';
const copy=<T>(x:T):T=>structuredClone(x),hash=(x:unknown)=>createHash('sha256').update(JSON.stringify(x)).digest('hex'),
 fileHash=(p:string)=>createHash('sha256').update(readFileSync(p)).digest('hex'),mode=process.argv[2],destination=process.argv[3];
if(!destination||!['fixtures','native','spot-fixtures','fresh'].includes(mode))throw Error('fixtures|native|spot-fixtures|fresh OUTDIR');mkdirSync(destination,{recursive:true});
const profile=JSON.parse(readFileSync('config/baseline.json','utf8')),provenance={
 commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sourceSha256:sourceVersion(),collectorSha256:fileHash(import.meta.filename),
 flags:Object.fromEntries(Object.keys(profile.flags).map(k=>[k,process.env[k]??null])),worldDefaults:profile.worldDefaults,
 node:process.version,platform:process.platform,arch:process.arch,lockSha256:fileHash('package-lock.json'),startedAt:new Date().toISOString()};
if(provenance.sourceSha256!==profile.sourceSha256)throw Error('Requires unchanged baseline source');
const of=generateTeam(new Rng(71),'O','O',{strength:.6}),df=generateTeam(new Rng(91),'D','D',{strength:.6});
function setup(formation='gun_doubles_11',concept='four_verts',coverage='cover4',o=of,d=df):PlaySetup{
 const f=FORMATION_BY_ID[formation];return {offense:pickOffense(o,f.personnel),defense:pickDefense(d,'nickel'),seed:3,
  offCall:{formation:f,flip:false,kind:'pass',pass:PASS_BY_ID[concept],label:`${formation}/${concept}`},
  defCall:{personnel:'nickel',front:FRONT_BY_ID.over,coverage:COVERAGE_BY_ID[coverage],pressure:null,zoneStyle:'match',label:coverage},
  los:40,ballY:CENTER_Y,firstDownX:50,audibles:false,record:false};}
/** No added see/RNG: suppress only this zone update's private read access. */
function withoutRead(b:ZoneCoverage,a:Agent,s:PlaySim){const eyes=s.qbEyes;s.qbEyes=null;try{return b.update(a,s);}finally{s.qbEyes=eyes;}}
const originalSpot=Reflect.get(ZoneCoverage.prototype,'spotUnderneath');
/** Existing spot/drop/depth/radius budgets; only route-lane selection changes. */
function spotGeometry(this:ZoneCoverage,a:Agent,sim:PlaySim,threats:Array<{r:Agent;pos:Vec2;vel:Vec2;fut:Vec2}>):MoveCommand{
 const lm=this.recordedLandmark(),radius=Reflect.get(this,'radius'),distance=Math.hypot(lm.x-a.pos.x,lm.y-a.pos.y);
 if(distance>2.5&&!a.tags.has('settled'))return originalSpot.call(this,a,sim,threats);
 a.tags.add('settled');
 const read=.5*a.r('zoneCoverage')+.5*a.r('anticipation'),
  near=threats.filter(th=>Math.hypot(th.pos.x-lm.x,th.pos.y-lm.y)<radius&&th.pos.x-sim.los>1)
   .sort((p,q)=>Math.hypot(p.pos.x-lm.x,p.pos.y-lm.y)-Math.hypot(q.pos.x-lm.x,q.pos.y-lm.y))[0];
 let tgt=near?lerp(lm,lerp(sim.qb.pos,near.pos,.82),.45+.4*read):lm;
 tgt={x:Math.max(tgt.x,lm.x-2),y:tgt.y};const off=sub(tgt,lm),length=Math.hypot(off.x,off.y);
 if(length>radius)tgt={x:lm.x+off.x/length*radius,y:lm.y+off.y/length*radius};
 return goTo(a,{x:tgt.x,y:clamp(tgt.y,.5,FIELD_WIDTH-.5)},{facing:angleTo(a.pos,sim.qb.pos),speed:.7+.15*a.r('zoneCoverage')});
}
const names=['empty-half','two-verticals','two-underneath','single-underneath','owned-quarter','spot-single','spot-empty'] as const;
function fixture(name:typeof names[number],remove:boolean,eyesSide:-1|1,mutate=false,geometry=false){
 const sim=new PlaySim(setup()),zone=name==='empty-half'?'deep_half_s':name==='two-verticals'?'deep_mid':name==='owned-quarter'?'quarter_s_in':'hook_mid',
  style=name.startsWith('spot')?'spot':'match',a=sim.slot(zone.startsWith('deep')||zone.startsWith('quarter')?'FS':'LB_M')!,
  left=sim.slot('X')!,right=sim.slot('H')!,pictures=new Map<Agent,Perceived>(),consumed:any[]=[];
 for(const r of sim.agents)pictures.set(r,{pos:{x:35,y:1},vel:{x:0,y:0},facing:0,stance:null,pose:'up',age:.2,carrying:false});
 const set=(r:Agent,x:number,y:number,vx=0)=>{r.body.pos={x,y};r.body.vel={x:vx,y:0};pictures.set(r,{...pictures.get(r)!,pos:{x,y},vel:{x:vx,y:0}});};
 set(sim.qb,35,CENTER_Y);a.body.pos={x:55,y:CENTER_Y};a.body.vel={x:0,y:0};a.body.facing=Math.PI;a.recog!.read='pass';sim.t=1;
 const b=new ZoneCoverage(a,sim,zone,'B',1,style);
 if(name==='empty-half'||name.startsWith('spot'))a.body.pos=copy(b.recordedLandmark());
 if(['two-verticals','two-underneath','single-underneath','spot-single'].includes(name)){
  set(left,48,CENTER_Y-3,name==='two-verticals'?6:0);
  if(name.startsWith('two'))set(right,48,CENTER_Y+3,name==='two-verticals'?6:0);
 }
 let expected:number|null=null;
 if(name==='owned-quarter'){
  const one=sim.slot(sim.offAlign.numbering.S1!)!,two=sim.slot(sim.offAlign.numbering.S2!)!;
  set(one,49,CENTER_Y+sim.offAlign.strongSign*10,6);set(two,48,CENTER_Y+sim.offAlign.strongSign*4,6);expected=two.idx;
 }
 sim.qbEyes=eyesSide<0?left:right;
 const initial=hash({bodies:sim.agents.map(a=>a.body),rng:sim.rng,perception:sim.perception}),body=hash(sim.agents.map(a=>a.body));
 if(mutate){left.body.pos={x:95,y:4};right.body.pos={x:20,y:49};}
 sim.see=(_a,r,scale)=>{const p=copy(pictures.get(r)!);consumed.push({target:r.idx,scale,picture:p});return p;};
 const before=hash(sim.agents.map(a=>a.body));let command;
 try{if(geometry)Reflect.set(ZoneCoverage.prototype,'spotUnderneath',spotGeometry);command=remove?withoutRead(b,a,sim):b.update(a,sim);}
 finally{Reflect.set(ZoneCoverage.prototype,'spotUnderneath',originalSpot);}
 if(before!==hash(sim.agents.map(a=>a.body)))throw Error('Fixture update changes body');
 return {name,remove,geometry,eyesSide,mutate,initial,body,command,target:b.target?.idx??null,expected,landmark:b.recordedLandmark(),
  actor:{idx:a.idx,id:a.player.id,slot:a.slot,profile:a.profile},consumed,rng:hash(sim.rng),censored:true,outcome:null};
}
function restore(f:any,record:boolean){const s=copy(f.setup),scouting=s.scouting?new ScoutingReport(s.scouting.strength):undefined;
 if(scouting)Reflect.set(scouting,'cells',new Map(s.scouting.cells));
 const coverageScouting=s.coverageScouting?Object.assign(new CoverageScouting(),copy(s.coverageScouting)):undefined;
 return new PlaySim({...s,scouting,coverageScouting,energy:s.energy?new Map(s.energy):undefined,record,recordEvery:1,recordLevel:'full'} as PlaySetup);}
function native(f:any,remove:boolean,observe:boolean,geometry=false){
 const sim=restore(f,observe),rows:any[]=[],queries:any[]=[],changed:any[]=[],seen=sim.see.bind(sim),tick=sim.tick.bind(sim),step=sim.world.step.bind(sim.world),update=ZoneCoverage.prototype.update;
 let actor:Agent|null=null,decisions:any[]=[],world:any=null,recorded:any[]=[];
 if(observe)sim.see=(a,r,scale)=>{const p=seen(a,r,scale);if(actor===a)queries.push({actor:a.idx,target:r.idx,scale,picture:copy(p)});return p;};
 ZoneCoverage.prototype.update=function(a,s){actor=a;const q=queries.length,prior=s.qbEyes,
   before={target:this.target?.idx??null,zone:this.zone,style:this.style,read:prior?.idx??null,body:copy(a.body)};
  let result;try{if(remove)s.qbEyes=null;result=update.call(this,a,s);}finally{s.qbEyes=prior;actor=null;}
  if(observe)decisions.push({actor:a.idx,...before,command:copy(result),targetAfter:this.target?.idx??null,cues:queries.slice(q)});
  return result;
 };
 if(observe)sim.world.step=(intents,dt)=>{const before=sim.agents.map(a=>({pos:copy(a.pos),vel:copy(a.vel),support:copy(a.body.support)})),applied=copy(intents),report=step(intents,dt);
  world={before,applied,after:sim.agents.map(a=>({pos:copy(a.pos),vel:copy(a.vel),support:copy(a.body.support)})),report:copy(report)};return report;};
 sim.tick=()=>{const t=sim.t;decisions=[];world=null;tick();if(observe)rows.push({t,decisions,ball:sim.ball.kind,carrier:sim.carrier?.idx??null,world,
  jobs:sim.defense.map(a=>({idx:a.idx,kind:a.behavior.kind,target:Reflect.get(a.behavior,'target')?.idx??null,
   job:Reflect.get(a.behavior,'job')??null,rule:Reflect.get(a.behavior,'recordedRule')?.call(a.behavior,t)??null}))});};
 let result;try{if(geometry)Reflect.set(ZoneCoverage.prototype,'spotUnderneath',spotGeometry);result=sim.run();}
 finally{ZoneCoverage.prototype.update=update;Reflect.set(ZoneCoverage.prototype,'spotUnderneath',originalSpot);}
 const signature=hash({result:{...result,frames:undefined,telemetry:undefined},bodies:sim.agents.map(a=>a.body),intents:sim.intents,rng:sim.rng,perception:sim.perception}),
  label=`${f.id}-${geometry?'observed-lane':remove?'without-read':'baseline'}`,path=join(destination,`${label}.json.gz`),
  record={id:f.id,remove,geometry,signature,setupSha256:hash(f.setup),result:{...result,frames:undefined,telemetry:undefined},censored:result.outcome==='timeout',
   players:sim.agents.map(a=>({idx:a.idx,id:a.player.id,slot:a.slot,team:a.team,profile:a.profile})),rows,frames:result.frames,telemetry:result.telemetry};
 if(observe)writeFileSync(path,gzipSync(JSON.stringify(record)));
 return {...record,rows:undefined,frames:undefined,telemetry:undefined,artifact:observe?{path,sha256:fileHash(path)}:null};
}
const start=performance.now(),cases:any[]=[];
if(mode==='fixtures'||mode==='spot-fixtures')for(const name of names){
 const geometry=mode==='spot-fixtures',baseline=[fixture(name,false,-1),fixture(name,false,1)],removed=[fixture(name,true,-1,false,geometry),fixture(name,true,1,false,geometry)],hidden=fixture(name,true,1,true,geometry);
 if(hash({command:removed[0].command,target:removed[0].target})!==hash({command:removed[1].command,target:removed[1].target})
  ||hash({command:removed[1].command,target:removed[1].target})!==hash({command:hidden.command,target:hidden.target}))throw Error('Removal reacts to hidden read/body');
 if(name==='owned-quarter'&&removed.some(r=>r.target!==r.expected))throw Error('Owned vertical lost');
 if(geometry&&name==='spot-single'&&removed[0].command.vel.y>=0)throw Error('Visible spot lane ignored');
 if(geometry&&name==='spot-empty'&&Math.hypot(removed[0].command.vel.x,removed[0].command.vel.y)>1e-8)throw Error('Unobserved spot drift');
 cases.push({name,baseline,removed,hidden,baselineReadChanges:hash(baseline[0].command)!==hash(baseline[1].command)});
 console.log(JSON.stringify({name,baselineReadChanges:cases.at(-1).baselineReadChanges,withoutRead:removed[0].command,target:removed[0].target}));
}else if(mode==='native'){
 const ids=[['gun_doubles_11','four_verts','cover4'],['gun_doubles_11','four_verts','cover3_match'],['gun_doubles_11','dagger','cover3_match'],['gun_doubles_11','curl_flat','cover3']];
 const o=generateTeam(new Rng(7),'Help offense 1','O1',{strength:.55}),d=generateTeam(new Rng(19),'Help defense 1','D1',{strength:.55}),
  fs:any[]=ids.map(([formation,concept,coverage])=>({id:`CUE-R1-${concept}-${coverage}-S3`,setup:setup(formation,concept,coverage,o,d)})),
  packet=JSON.parse(readFileSync('data/reviews/current/catch-transition-inputs.json','utf8'));
 fs.push(...packet.clips.filter((f:any)=>['R7204-S4001-P16','R4202-S2001-P95'].includes(f.id)));
 writeFileSync(join(destination,'declared-inputs.json'),JSON.stringify({schema:'coverage-cue-inputs-v1',provenance,fixtures:fs})+'\n');
 for(const f of fs){if(performance.now()-start>30000)throw Error('Declared 30-second batch exhausted');const t=performance.now(),arms=[];
  for(const remove of [false,true]){
   if(!remove&&f.nativeSignature){arms.push({id:f.id,remove:false,signature:f.nativeSignature,result:f.nativeResult,reused:true});continue;}
   const recorded=native(f,remove,true),plain=native(f,remove,false);if(recorded.signature!==plain.signature)throw Error('Observer changes native result');
   arms.push({...recorded,observerVerified:true});
  }
  cases.push({id:f.id,setupSha256:hash(f.setup),arms,wallMs:performance.now()-t});console.log(JSON.stringify({id:f.id,arms:arms.map(a=>({remove:a.remove,outcome:a.result.outcome,yards:a.result.offenseYards,yac:a.result.stats.yac,receiver:a.result.stats.receiver,interceptor:a.result.stats.interceptedBy}))}));
 }
}else{
 const fixtures=[];
 for(const roster of [12953,13964]){
  const rng=new Rng(roster),o=generateTeam(rng,'Fresh offense',`CO${roster}`,{strength:.55}),d=generateTeam(rng,'Fresh defense',`CD${roster}`,{strength:.55});
  for(const [concept,coverage,style,seed] of [['curl_flat','cover3','spot',61001],['four_verts','cover3_match','match',61002]] as const){
   const s=setup('gun_doubles_11',concept,coverage,o,d);s.seed=seed;s.defCall.zoneStyle=style;
   fixtures.push({id:`FRESH-${roster}-${concept}-${style}-${seed}`,setup:s});
  }
 }
 writeFileSync(join(destination,'declared-inputs.json'),JSON.stringify({schema:'coverage-fresh-inputs-v1',provenance,fixtures})+'\n');
 for(const f of fixtures){if(performance.now()-start>30000)throw Error('Declared fresh batch exhausted');const t=performance.now(),arms=[];
  for(const [remove,geometry] of [[false,false],[true,false],[true,true]]){
   const recorded=native(f,remove,true,geometry),plain=native(f,remove,false,geometry);
   if(recorded.signature!==plain.signature)throw Error('Fresh observer alters native state');arms.push({...recorded,observerVerified:true});
  }
  if(f.setup.defCall.zoneStyle==='match'&&arms[1].signature!==arms[2].signature)throw Error('Spot change affects match');
  cases.push({id:f.id,setupSha256:hash(f.setup),arms,wallMs:performance.now()-t});
  console.log(JSON.stringify({id:f.id,arms:arms.map(a=>({remove:a.remove,geometry:a.geometry,outcome:a.result.outcome,yards:a.result.offenseYards,yac:a.result.stats.yac,receiver:a.result.stats.receiver,interceptor:a.result.stats.interceptedBy}))}));
 }
}
const wallMs=performance.now()-start;
writeFileSync(join(destination,'summary.json'),JSON.stringify({schema:'coverage-private-cue-removal-v1',mode,provenance,cases,wallMs,
 limits:'Temporary qbEyes=null only during ZoneCoverage update; global state restored immediately, all other controllers/ownership/physics/capabilities and RNG laws unchanged. No replacement direction, timer, selection gate or perceived information added. Fixture images are staged; native observed/plain runs finish normally or retain explicit timeout censoring. Four historical adverse/control setups regenerated at current source; two compatible original full baselines reused.'})+'\n');
if(wallMs>30000)throw Error('Declared 30-second batch exceeded at completed boundary');
if(sourceVersion()!==provenance.sourceSha256)throw Error('Runtime changed');
