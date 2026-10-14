/** Frozen option inputs and observation-only full-play collector.
 * prepare INPUTS; run INPUTS OUT initial|fresh.
 * Baseline/candidate use the same launcher, players, calls and random seeds.
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {gzipSync} from 'node:zlib';
import {Rng} from '../../src/core/rng.ts';
import {generateTeam,pickOffense,pickDefense} from '../../src/league/team.ts';
import {PASS_BY_ID} from '../../src/playbook/concepts.ts';
import {COVERAGE_BY_ID,FRONT_BY_ID} from '../../src/playbook/defense.ts';
import {FORMATION_BY_ID} from '../../src/playbook/formations.ts';
import {PlaySim} from '../../src/sim/playsim.ts';
import {RouteRunner} from '../../src/sim/behaviors/receiver.ts';
import {QBPass} from '../../src/sim/behaviors/qb.ts';
import {sourceVersion} from '../source-version.ts';

const copy=x=>structuredClone(x),hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const fileHash=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
const [mode,input,out,group]=process.argv.slice(2),profile=JSON.parse(readFileSync('config/baseline.json','utf8'));
const flags=Object.fromEntries(Object.keys(profile.flags).map(k=>[k,process.env[k]??null]));
assert.deepEqual(flags,profile.flags);
const provenance={commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),
 sourceSha256:sourceVersion(),collectorSha256:fileHash(import.meta.filename),flags,
 worldDefaults:profile.worldDefaults,node:process.version,startedAt:new Date().toISOString()};

if(mode==='prepare'){
 assert.equal(provenance.sourceSha256,profile.sourceSha256);
 const players=(o,d)=>({offense:pickOffense(generateTeam(new Rng(o),'Option offense',`OO${o}`,.55),'11'),
  defense:pickDefense(generateTeam(new Rng(d),'Option defense',`OD${d}`,.55),'nickel')});
 const initial=players(7,19),fresh1=players(15071,15072),fresh2=players(16081,16082);
 const rows=[];
 const add=(id,cohort,p,seed,coverage,formation='gun_trips_11',flip=false,shown,concept='stick',zoneStyle='match')=>rows.push({id,cohort,
  setup:{...copy(p),seed,audibles:false,record:false,los:40,ballY:26.65,firstDownX:50,
   offCall:{formation:FORMATION_BY_ID[formation],flip,kind:'pass',pass:PASS_BY_ID[concept],label:`${formation}/${concept}`},
   defCall:{personnel:'nickel',front:FRONT_BY_ID.over,coverage:COVERAGE_BY_ID[coverage],pressure:null,
    zoneStyle,shown:shown?COVERAGE_BY_ID[shown]:undefined,label:`${coverage}${shown?` shows ${shown}`:''}`}}});
 add('initial-zone','initial',initial,62001,'cover3','gun_trips_11',false,undefined,'stick','spot');
 add('initial-man','initial',initial,62002,'cover1');
 add('initial-disguise','initial',initial,62003,'cover3','gun_trips_11',false,'cover1');
 add('unaffected-verts','initial',initial,62004,'cover3','gun_trips_11',false,undefined,'four_verts');
 add('fresh15071-boundary','fresh',fresh1,63001,'cover1_off','gun_doubles_11',true);
 add('fresh15071-rotation','fresh',fresh1,63002,'cover9','gun_trips_11',true);
 add('fresh16081-boundary','fresh',fresh2,63003,'cover1_off','gun_doubles_11',true);
 add('fresh16081-rotation','fresh',fresh2,63004,'cover9','gun_trips_11',true);
 mkdirSync(dirname(input),{recursive:true});writeFileSync(input,JSON.stringify({schema:'option-agreement-inputs-v1',provenance,
  question:'Can the shared Stick install yield independent observed receiver/QB choices, anticipation and coherent natural football?',
  initialBudget:{cases:4,neutralPairs:1,maxBatchMs:30000,maxCaseMs:5000},
  freshBudget:{cases:4,trigger:'Run only after initial mechanism/controls support a candidate; side, personnel capability and rotation transfer remain unresolved.'},
  preparedBeforeOutcomes:true,rosterSeeds:[7,19,15071,15072,16081,16082],strength:.55,rows},null,2)+'\n');
 console.log(JSON.stringify({input,cases:rows.length,newSimulations:0}));
}else if(mode==='run'){
 assert.ok(out&&['initial','fresh'].includes(group));
 const packet=JSON.parse(readFileSync(input,'utf8')),rows=packet.rows.filter(r=>r.cohort===group);
 assert.equal(packet.provenance.sourceSha256,profile.sourceSha256);
 mkdirSync(out,{recursive:true});const collected=[],start=performance.now();
 function signature(sim,result){return hash({result:{...result,frames:undefined,telemetry:undefined},
  bodies:sim.agents.map(a=>a.body),intents:sim.intents,rng:sim.rng,perception:sim.perception});}
 function routeState(sim){return sim.offense.filter(a=>a.behavior instanceof RouteRunner).map(a=>{
  const r=a.behavior;return {i:a.idx,id:a.player.id,slot:a.slot,route:r.route.id,idx:r.idx,settled:r.settled,
   converted:r.converted,path:copy(r.path),decision:copy(r.optionDecision??null)};});}
 function qbState(sim){const b=sim.qb.behavior;return b instanceof QBPass?{...b.recordedState(),
  options:b.optionMemories?[...b.optionMemories].map(([a,m])=>({i:a.idx,...copy(m)})):[]}:null;}
 function run(row,observed){
  const sim=new PlaySim(copy(row.setup)),steps=[],restore=[];let step;
  const tick=sim.tick,see=sim.see;
  if(observed){
   sim.see=function(a,b,...rest){const seen=see.call(this,a,b,...rest);
    step?.observations.push({observer:a.idx,target:b.idx,scale:rest[0]??1,picture:copy(seen)});return seen;};
   restore.push(()=>sim.see=see);
   const qb=sim.qb.behavior;
   if(qb instanceof QBPass){
    for(const name of ['evaluate','receiverPrediction'])if(typeof qb[name]==='function'){
     const fn=qb[name];qb[name]=function(...args){const ret=fn.apply(this,args);
      if(step){if(name==='evaluate')step.evaluations.push({target:args[2].idx,urgency:args[3],result:ret?{
       target:ret.target.idx,point:copy(ret.point),T:ret.T,P:ret.P,intRisk:ret.intRisk,value:ret.value}:null});
       else step.predictions.push({target:args[2].idx,ahead:args[3],point:copy(ret)});}return ret;};
     restore.push(()=>qb[name]=fn);
    }
   }
   sim.tick=function(){step=this.throwAt<0?{t:this.t,before:copy(this.agents.map(a=>a.body)),
    routes:routeState(this),qb:qbState(this),observations:[],evaluations:[],predictions:[],rng:copy(this.rng)}:null;
    const ret=tick.call(this);if(step){step.after=copy(this.agents.map(a=>a.body));step.intents=copy(this.intents);
     step.routesAfter=routeState(this);step.qbAfter=qbState(this);step.rngAfter=copy(this.rng);
     step.loads=this.world.joints.filter(j=>j.kind==='grasp'||j.kind==='hands').map(j=>({kind:j.kind,
      a:this.agents.find(a=>a.body===j.a)?.idx??null,b:this.agents.find(a=>a.body===j.b)?.idx??null,
      normalForce:j.normalForce??null,tangentForce:j.tangentForce??null,capacity:j.capacity??null}));steps.push(step);}
    step=null;return ret;};restore.push(()=>sim.tick=tick);
  }
  const began=performance.now(),boundedTick=sim.tick;let result;
  sim.tick=function(){if(performance.now()-began>5000)throw Error(`${row.id}: case budget exhausted`);
   return boundedTick.call(this);};
  try{result=sim.run();}finally{sim.tick=boundedTick;for(const fn of restore.reverse())fn();}
  return {result,signature:signature(sim,result),players:sim.agents.map(a=>({i:a.idx,id:a.player.id,slot:a.slot,
   team:a.team,profile:a.profile})),steps,elapsedMs:performance.now()-began};
 }
 for(const row of rows){
  if(performance.now()-start>30000)throw Error('Batch budget exhausted');
  const film=run(row,true);assert.notEqual(film.result.outcome,'timeout','A censored outcome cannot be cached complete');
  let neutral=null;if(row.id==='initial-man'){const plain=run(row,false);assert.equal(film.signature,plain.signature);
   neutral={signature:plain.signature,elapsedMs:plain.elapsedMs};}
  const path=join(out,`${row.id}.json.gz`);writeFileSync(path,gzipSync(JSON.stringify(film)));
  collected.push({id:row.id,setupSha256:hash(row.setup),result:film.result,signature:film.signature,
   players:film.players,film:{path,sha256:fileHash(path)},neutral,elapsedMs:film.elapsedMs});
  console.log(JSON.stringify({id:row.id,outcome:film.result.outcome,yards:film.result.yards,
   release:film.result.events.find(e=>e.type==='throw'||e.type==='throwaway')?.t??null,neutral:neutral!==null}));
 }
 assert.equal(sourceVersion(),provenance.sourceSha256,'Runtime changed during collection');
 writeFileSync(join(out,'summary.json'),JSON.stringify({schema:'option-agreement-panel-v1',provenance,
  inputs:{path:input,sha256:fileHash(input)},cohort:group,rows:collected,wallMs:performance.now()-start,
  newSimulations:rows.length+collected.filter(r=>r.neutral).length,newGames:0},null,2)+'\n');
}else throw Error('prepare INPUTS or run INPUTS OUT initial|fresh');
