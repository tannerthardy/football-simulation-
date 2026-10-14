/** Observe the actual post-World ball segment, without stepping physics,
 * querying perception, evaluating another catch or consuming randomness.
 * INPUTS ORIGINAL-BASELINE TARGET-SUMMARY ID OUT [--legacy-draw]
 * Dynamic local imports allow identical bytes on the unchanged checkout.
 */
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {gunzipSync} from 'node:zlib';
const root=process.cwd(),local=p=>import(pathToFileURL(join(root,p)).href);
const [{PlaySim},{RouteRunner},{sourceVersion}]=await Promise.all([
 local('src/sim/playsim.ts'),local('src/sim/behaviors/receiver.ts'),local('scripts/source-version.ts')]);
const [input,baseline,target,id,out,legacy]=process.argv.slice(2),copy=x=>structuredClone(x);
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const digest=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
const packet=JSON.parse(readFileSync(input,'utf8')),row=packet.rows.find(r=>r.id===id);
const expected=JSON.parse(readFileSync(target,'utf8')),reference=expected.rows.find(r=>r.id===id);
const profile=JSON.parse(readFileSync('config/baseline.json','utf8'));
assert.equal(expected.provenance.sourceSha256,sourceVersion());assert.equal(reference.setupSha256,hash(row.setup));
assert.deepEqual(Object.fromEntries(Object.keys(profile.flags).map(k=>[k,process.env[k]??null])),profile.flags);
const sim=new PlaySim(copy(row.setup)),schedule=[],injected=[],samples=[];
if(legacy==='--legacy-draw'){
 const old=JSON.parse(readFileSync(baseline,'utf8')),r=old.rows.find(r=>r.id===id);
 assert.equal(old.provenance.sourceSha256,profile.sourceSha256);assert.equal(digest(r.film.path),r.film.sha256);
 const f=JSON.parse(gunzipSync(readFileSync(r.film.path)));
 for(const step of f.steps)for(const r of step.routesAfter)
  if(r.route==='stick'&&r.converted&&!step.routes.find(a=>a.i===r.i).converted)schedule.push({t:step.t,i:r.i});
}
const update=RouteRunner.prototype.update,ballUpdate=sim.updateBall;
if(schedule.length)RouteRunner.prototype.update=function(a,s){
 if(schedule.some(p=>p.i===a.idx&&Math.abs(p.t-s.t)<1e-9)){
  const unused=s.rng.chance(.15*(1-a.r('awareness')));injected.push({t:s.t,i:a.idx,unused});
 }
 return update.call(this,a,s);
};
sim.updateBall=function(){
 const b=this.ball;
 if(b.kind!=='air'||this.t<2.3||this.t>3.15)return ballUpdate.call(this);
 const snapshot={t:this.t,previous:copy(b.flight.pos),target:b.target?.idx??null,
  deflected:b.deflected,release:b.releaseT,velocity:copy(b.flight.vel),rng:copy(this.rng),
  agents:this.agents.map(a=>({i:a.idx,id:a.player.id,slot:a.slot,team:a.team,pos:copy(a.pos),vel:copy(a.vel),
   down:a.isDown(this.t),busy:!!a.engagement,noCatchUntil:a.noCatchUntil,tracking:a===b.target||a.tags.has('onBall'),
   reach:a.profile.reach,top:a===b.target||a.tags.has('onBall')?
    a.team==='O'?a.profile.maxCatchHeight:a.profile.reactReach+.5*(a.profile.maxCatchHeight-a.profile.reactReach):
    a.profile.reactReach}))};
 const eventCount=this.events.length;ballUpdate.call(this);
 const current=copy(b.flight.pos),dx=current.x-snapshot.previous.x,dy=current.y-snapshot.previous.y,L=dx*dx+dy*dy;
 snapshot.current=current;snapshot.events=copy(this.events.slice(eventCount));snapshot.afterKind=this.ball.kind;
 snapshot.opportunities=snapshot.agents.filter(a=>!a.down&&!a.busy&&this.t>=a.noCatchUntil&&a.i!==b.thrower.idx
  &&!(a.team==='O'&&['LT','LG','C','RG','RT'].includes(a.slot))).flatMap(a=>{
   const fraction=L>1e-9?Math.max(0,Math.min(1,((a.pos.x-snapshot.previous.x)*dx+(a.pos.y-snapshot.previous.y)*dy)/L)):0;
   const horizontal=Math.hypot(a.pos.x-snapshot.previous.x-fraction*dx,a.pos.y-snapshot.previous.y-fraction*dy);
   const z=snapshot.previous.z+(current.z-snapshot.previous.z)*fraction,reach=a.reach+(a.tracking?.3:0);
   return horizontal<=reach&&z>=.1&&z<=a.top?[{i:a.i,id:a.id,slot:a.slot,fraction,horizontal,z,reach,margin:reach-horizontal}]:[];
  }).sort((a,b)=>a.fraction-b.fraction);
 samples.push(snapshot);
};
const start=performance.now();let result;
try{result=sim.run();}finally{sim.updateBall=ballUpdate;RouteRunner.prototype.update=update;}
const signature=hash({result:{...result,frames:undefined,telemetry:undefined},bodies:sim.agents.map(a=>a.body),
 intents:sim.intents,rng:sim.rng,perception:sim.perception});
assert.equal(signature,reference.signature,'Ball-segment observer must reproduce the saved full final signature');
assert.equal(injected.length,schedule.length);
const output={schema:'option-observed-native-ball-contest-v1',id,sourceSha256:sourceVersion(),
 commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),collectorSha256:digest(import.meta.filename),
 flags:profile.flags,worldDefaults:profile.worldDefaults,inputs:{path:input,sha256:digest(input)},
 target:{path:target,sha256:digest(target)},signature,result,injected,samples,elapsedMs:performance.now()-start,
 newSimulations:1,newObservationQueries:0,newRandomDraws:injected.length,
 limits:'All candidate admission data are posterior measurement, not QB information. Only ordinary downfield unengaged opportunities are reconstructed; this is not a replacement catch solver. The actual events and unchanged full signature verify recording neutrality.'};
mkdirSync(dirname(out),{recursive:true});writeFileSync(out,JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify({id,out,outcome:result.outcome,signatureMatch:true,
 contacts:samples.filter(s=>s.opportunities.length||s.events.length).map(s=>({t:s.t,opportunities:s.opportunities,events:s.events}))}));
