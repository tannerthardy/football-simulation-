/** Explicit called-tag comparison, identical portable bodies and route install.
 * Baseline ignores the new read metadata and runs its fixed seam. Production
 * candidate reads it. Registry extension is a declared diagnostic input, not
 * an unchanged native-baseline playbook claim. prepare INPUT; run INPUT OUT initial|fresh.
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {gzipSync} from 'node:zlib';
const local=p=>import(pathToFileURL(join(process.cwd(),p)).href);
const [{PlaySim},{ROUTES},{PASS_BY_ID},{COVERAGE_BY_ID},{sourceVersion},{goTo}]=await Promise.all([
 local('src/sim/playsim.ts'),local('src/playbook/routes.ts'),local('src/playbook/concepts.ts'),
 local('src/playbook/defense.ts'),local('scripts/source-version.ts'),local('src/sim/behaviors/common.ts')]);
const [mode,input,out,group]=process.argv.slice(2),copy=x=>structuredClone(x);
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const digest=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
const profile=JSON.parse(readFileSync('config/baseline.json','utf8'));
const flags=Object.fromEntries(Object.keys(profile.flags).map(k=>[k,process.env[k]??null]));
assert.deepEqual(flags,profile.flags);
const provenance={commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sourceSha256:sourceVersion(),
 collectorSha256:digest(import.meta.filename),node:process.version,flags,worldDefaults:profile.worldDefaults,
 startedAt:new Date().toISOString()};
if(mode==='prepare'){
 const original='data/reviews/current/option-agreement-inputs.json',base=JSON.parse(readFileSync(original,'utf8'));
 const cases=[['middle-open','initial','initial-zone',64001,'cover2','spot',false],
  ['middle-closed','initial','initial-zone',64002,'cover3','spot',false],
  ['fresh-rotation','fresh','fresh15071-rotation',64003,'cover9','match',true],
  ['fresh-pole','fresh','fresh16081-rotation',64004,'tampa2','spot',true]];
 const rows=cases.map(([id,cohort,from,seed,cov,zoneStyle,flip])=>{
  const setup=copy(base.rows.find(r=>r.id===from).setup);
  setup.seed=seed;setup.offCall={...setup.offCall,flip,pass:copy(PASS_BY_ID.seam_read),label:'Called seam/post read'};
  setup.defCall={...setup.defCall,coverage:copy(COVERAGE_BY_ID[cov]),shown:undefined,zoneStyle,label:cov};
  return {id,cohort,derivedFrom:from,setup};
 });
 mkdirSync(dirname(input),{recursive:true});writeFileSync(input,JSON.stringify({schema:'seam-read-inputs-v1',preparedBy:provenance,
  preparedBeforeOutcomes:true,originalInputs:{path:original,sha256:digest(original)},integrationBaseline:profile,
  question:'Does an explicitly installed seam/post read use separate observed roof pictures and physically attainable anticipation, retaining defensive wins?',
  comparison:'Same new route installation on unchanged baseline controllers and candidate. Baseline controllers ignore middleRead metadata; this is not a previously native baseline call.',
  budget:{initialCases:2,initialNeutralPairs:1,freshCases:2,caseMaxMs:5000,batchMaxMs:30000,newGames:0},
  freshTrigger:'Only after initial contracts and football; named remaining risks are flipped roof rotation and a Tampa pole with fresh actual players.',
  routes:{seam_read:copy(ROUTES.seam_read)},rows},null,2)+'\n');
 console.log(JSON.stringify({input,cases:rows.length,newSimulations:0}));
}else if(mode==='prepare-rotation'){
 const original='data/reviews/current/seam-read-inputs.json',base=JSON.parse(readFileSync(original,'utf8'));
 const setup=base.rows.find(r=>r.id==='middle-open').setup;
 const rows=[['held-underneath',null,0],['late-pole-clear',.65,0],['late-pole-peripheral',.65,.2]]
  .map(([id,moveAt,peripheral])=>({id,cohort:'rotation',setup:copy(setup),
   intervention:{slot:'LB_M',moveAt,until:2.5,targetDepth:18,peripheral}}));
 mkdirSync(dirname(input),{recursive:true});writeFileSync(input,JSON.stringify({...base,
  preparedBy:provenance,preparedBeforeOutcomes:true,originalInputs:{path:original,sha256:digest(original)},
  question:'Can the actual QB release toward a post expectation rejected by the receiver after a prescribed pole carry and delayed key acquisition?',
  comparison:'Controlled encounter, not native disagreement frequency. Same actual generated bodies and physics; coached Mike movement and one declared attention intervention.',
  budget:{cases:3,caseMaxMs:5000,batchMaxMs:30000,newGames:0},freshTrigger:null,rows},null,2)+'\n');
 console.log(JSON.stringify({input,cases:3,newSimulations:0}));
}else if(mode==='run'){
 assert.ok(['initial','fresh','rotation'].includes(group));const packet=JSON.parse(readFileSync(input,'utf8'));
 assert.deepEqual(packet.integrationBaseline,profile);
 for(const [id,route]of Object.entries(packet.routes)){
  if(ROUTES[id])assert.deepEqual(ROUTES[id],route);else ROUTES[id]=copy(route);
 }
 mkdirSync(out,{recursive:true});const start=performance.now(),rows=[];
 function signature(s,result){return hash({result:{...result,frames:undefined,telemetry:undefined},
  bodies:s.agents.map(a=>a.body),intents:s.intents,rng:s.rng,perception:s.perception});}
 function collect(row,observed){
  const sim=new PlaySim(copy(row.setup)),qb=sim.qb.behavior,
   runners=sim.offense.filter(a=>a.behavior.kind==='route').map(a=>({a,r:a.behavior})),steps=[],balls=[];
  let step=null;const tick=sim.tick,see=sim.see,updateBall=sim.updateBall;
  if(row.intervention){
   const p=row.intervention,key=sim.slot(p.slot),hold=copy(key.pos),original=key.behavior.update;
   key.behavior.update=function(a,s){
    if(s.t>=p.until)return original.call(this,a,s);
    const target=p.moveAt!==null&&s.t>=p.moveAt?{x:s.los+p.targetDepth,y:26.65}:hold;
    return goTo(a,target,{facing:p.moveAt!==null&&s.t>=p.moveAt?0:Math.PI});
   };
   if(p.peripheral)sim.qb.eyes={keys:sim.defense.filter(d=>d!==key),peripheral:p.peripheral};
  }
  const routes=()=>runners.map(({a,r})=>({i:a.idx,id:a.player.id,slot:a.slot,route:r.route.id,
   idx:r.idx,converted:r.converted,decision:copy(r.optionDecision??null),path:copy(r.path)}));
  const qstate=()=>({...qb.recordedState(),options:qb.optionMemories?
   [...qb.optionMemories].map(([a,m])=>({i:a.idx,...copy(m)})):[]});
  if(observed){
   sim.see=function(a,b,...args){const p=see.call(this,a,b,...args);
    step?.observations.push({observer:a.idx,target:b.idx,scale:args[0]??1,picture:copy(p)});return p;};
   for(const name of ['evaluate','receiverPrediction']){
    const fn=qb[name];qb[name]=function(...args){const r=fn.apply(this,args);
     if(step)step[name].push({target:args[2].idx,ahead:name==='receiverPrediction'?args[3]:null,result:r?
      name==='evaluate'?{target:r.target.idx,point:copy(r.point),T:r.T,P:r.P,intRisk:r.intRisk}:copy(r):null});return r;};
   }
   sim.tick=function(){
    step=this.t<=5?{t:this.t,before:copy(this.agents.map(a=>a.body)),routes:routes(),qb:qstate(),
     observations:[],evaluate:[],receiverPrediction:[],rng:copy(this.rng)}:null;
    const r=tick.call(this);
    if(step){step.after=copy(this.agents.map(a=>a.body));step.intents=copy(this.intents);step.routesAfter=routes();
     step.qbAfter=qstate();step.rngAfter=copy(this.rng);steps.push(step);}step=null;return r;
   };
   sim.updateBall=function(){
    const b=this.ball;if(b.kind!=='air')return updateBall.call(this);
    const snap={t:this.t,previous:copy(b.flight.pos),velocity:copy(b.flight.vel),target:b.target?.idx??null,
     deflected:b.deflected,rng:copy(this.rng),actors:this.agents.map(a=>({i:a.idx,id:a.player.id,slot:a.slot,team:a.team,
      pos:copy(a.pos),vel:copy(a.vel),down:a.isDown(this.t),busy:!!a.engagement,noCatchUntil:a.noCatchUntil,
      tracking:a===b.target||a.tags.has('onBall'),reach:a.profile.reach,
      top:a===b.target||a.tags.has('onBall')?a.team==='O'?a.profile.maxCatchHeight:
       a.profile.reactReach+.5*(a.profile.maxCatchHeight-a.profile.reactReach):a.profile.reactReach}))};
    const ec=this.events.length;updateBall.call(this);snap.current=copy(b.flight.pos);snap.events=copy(this.events.slice(ec));
    snap.afterKind=this.ball.kind;const dx=snap.current.x-snap.previous.x,dy=snap.current.y-snap.previous.y,L=dx*dx+dy*dy;
    snap.opportunities=snap.actors.filter(a=>a.i!==b.thrower.idx&&!a.down&&!a.busy&&this.t>=a.noCatchUntil
     &&!(a.team==='O'&&['LT','LG','C','RG','RT'].includes(a.slot))).flatMap(a=>{
      const fraction=L>1e-9?Math.max(0,Math.min(1,((a.pos.x-snap.previous.x)*dx+(a.pos.y-snap.previous.y)*dy)/L)):0;
      const horizontal=Math.hypot(a.pos.x-snap.previous.x-fraction*dx,a.pos.y-snap.previous.y-fraction*dy),
       z=snap.previous.z+(snap.current.z-snap.previous.z)*fraction,reach=a.reach+(a.tracking?.3:0);
      return horizontal<=reach&&z>=.1&&z<=a.top?[{i:a.i,id:a.id,fraction,horizontal,z,reach,margin:reach-horizontal}]:[];
     }).sort((a,b)=>a.fraction-b.fraction);balls.push(snap);
   };
  }
  const began=performance.now(),wrapped=sim.tick;
  sim.tick=function(){if(performance.now()-began>packet.budget.caseMaxMs)throw Error(`${row.id}: runtime budget`);return wrapped.call(this);};
  const result=sim.run();assert.notEqual(result.outcome,'timeout','Censored plays remain unfinished');
  return {result,signature:signature(sim,result),steps,balls,elapsedMs:performance.now()-began,
   players:sim.agents.map(a=>({i:a.idx,id:a.player.id,slot:a.slot,team:a.team,profile:a.profile}))};
 }
 for(const row of packet.rows.filter(r=>r.cohort===group)){
  assert.ok(performance.now()-start<packet.budget.batchMaxMs);const f=collect(row,true);
  let neutral=null;if(row.id==='middle-open'){const n=collect(row,false);assert.equal(n.signature,f.signature);neutral={signature:n.signature,elapsedMs:n.elapsedMs};}
  const path=join(out,`${row.id}.json.gz`);writeFileSync(path,gzipSync(JSON.stringify(f)));
  rows.push({id:row.id,setupSha256:hash(row.setup),result:f.result,signature:f.signature,players:f.players,
   film:{path,sha256:digest(path)},neutral,elapsedMs:f.elapsedMs});
  console.log(JSON.stringify({id:row.id,outcome:f.result.outcome,yards:f.result.yards,
   release:f.result.events.find(e=>e.type==='throw')?.t??null,neutral:neutral!==null}));
 }
 assert.equal(sourceVersion(),provenance.sourceSha256);
 writeFileSync(join(out,'summary.json'),JSON.stringify({schema:'seam-read-panel-v1',provenance,
  inputs:{path:input,sha256:digest(input)},cohort:group,rows,wallMs:performance.now()-start,
  newSimulations:rows.length+rows.filter(r=>r.neutral).length,newGames:0,
  limits:'A controlled called-tag comparison, not natural option frequency. Actual ball events remain authoritative; admission measurements exclude engaged bat windows and do not evaluate a new catch.'},null,2)+'\n');
}else throw Error('prepare INPUT or run INPUT OUT initial|fresh');
