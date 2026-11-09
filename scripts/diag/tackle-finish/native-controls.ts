/** Saved constructor counterfactuals on the executing source. Original single-stream
 * convention is retained; this does not recreate the historical experimental546.
 * node --import tsx scripts/diag/tackle-finish/native-controls.ts [--impact-ablation]
 * The optional ablation removes post-acquisition grasp capacity or the carrier's
 * contact-height support moments and their filtered history. These are causal
 * probes, not proposed physics.
 * Raw output goes in ignored out/tackle-finish/native. All actors react normally.
 */
import {strict as assert} from 'node:assert';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {CONTACT_SCALE, GROUND_STRETCH} from '../../../src/physics/world.js';
import {PlaySim} from '../../../src/sim/playsim.js';
import {restoreSetup,bytesHash,executionIdentity} from '../saved-play.js';
const cases=JSON.parse(readFileSync('test/fixtures/responsibility-ledger-cases.json','utf8')).plays;
const impactAblation=process.argv.includes('--impact-ablation');
assert(process.argv.slice(2).every(a=>a==='--impact-ablation'),'unknown argument');
const ids=impactAblation?['S9-P062','R7-P075','M25-P021']:['S9-P062','R7-P075','M9-P000','S9-P027','R7-P083','M25-P021'];
const arms=impactAblation?['base','no-moment','no-grasp']:['base','height','wrap-foot','contact-drive'];
const output=impactAblation?'out/tackle-finish/impact':'out/tackle-finish/native';
const hash=(x:any)=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const clone=(x:any)=>structuredClone(x);
mkdirSync(output,{recursive:true});
const all:any[]=[];const begin=performance.now();
PlaySim.recordedSingleStream=true;
for(const id of ids) for(const arm of arms){
 const p=cases.find((p:any)=>p.id===id),sim=new PlaySim(restoreSetup(Buffer.from(p.setup,'base64')));
 const rows:any[]=[];let first:any=null,firstLoad:any=null,fall:any=null,intervention:any=null;const prefix=createHash('sha256');
 const starts:Record<string,number>={'S9-P062':2.75,'R7-P075':3.25,'M25-P021':2.05};
 let firstMoment:any=null;
 if(arm==='no-moment'){
  // Observe and intervene at the existing support stage; do not alter the
  // collision impulse, velocity solve, grip capacity or decision inputs.
  const w:any=sim.world,updateSupport=w.updateSupport.bind(w);
  w.updateSupport=(i:number,h:number,report:any)=>{
   const c=sim.carrier;
   if(c&&c!==sim.qb&&i===c.idx&&sim.t>=starts[id]){
    const moment=[w.tipX[i],w.tipY[i],w.tripX[i],w.tripY[i],w.thighX[i],w.thighY[i]];
    const filtered=clone(c.body.support!.tipAccel??{x:0,y:0});
    if(!firstMoment&&Math.hypot(...moment,filtered.x,filtered.y)>0)firstMoment={stepStart:sim.t,physicalTime:w.time,h,moment,filtered,support:clone(c.body.support)};
    w.tipX[i]=w.tipY[i]=w.tripX[i]=w.tripY[i]=w.thighX[i]=w.thighY[i]=0;
    c.body.support!.tipAccel={x:0,y:0};
   }
   return updateSupport(i,h,report);
  };
 }
 const original=sim.world.step.bind(sim.world);
 sim.world.step=(intents,dt)=>{
  const c=sim.carrier;
  const pre={t:sim.t,bodies:sim.agents.map(a=>a.body),rng:sim.rng,streams:[...(sim as any).streams],mindRng:sim.agents.map(a=>(a.mind as any).rng),intents,joints:sim.world.joints.map(({a,b,...j}:any)=>({...j,a:sim.agents.find(x=>x.body===a)?.idx,b:sim.agents.find(x=>x.body===b)?.idx}))};
  const preHash=hash(pre);if(!intervention)prefix.update(preHash);
  const originalRequests=clone(intents), changes:any[]=[];
  if(arm==='no-moment'&&c&&c!==sim.qb&&sim.t>=starts[id])changes.push({kind:'remove-support-moments'});
  if(c&&sim.bond&&c===sim.bond.carrier){
   for(const d of sim.bond.tacklers){
    const j=sim.bond.holds?.get(d);if(!j||j.broken)continue;
    if(arm==='no-grasp'){changes.push({slot:d.slot,kind:'remove-grasp-capacity',prev:j.capacity,next:0});j.capacity=0;}
    if(j.legs>0&&['height','wrap-foot'].includes(arm)){
     const prev=j.recoveryCoupling??j.legs;
     const torso=c.profile.radius+d.profile.radius; const dd=Math.hypot(c.pos.x-d.pos.x,c.pos.y-d.pos.y);
     const near=Math.min(dd,(j.hold??dd)+(1-CONTACT_SCALE)*torso);
     const stretched=d.body.support?.state!=='up'?GROUND_STRETCH:0;
     const quality=Math.max(0,Math.min(1,1-(near-stretched-torso-.25)/Math.max(.2,d.profile.reach-.25)));
     const secure=Math.max(0,Math.min(1,sim.bond.grip?.get(d)??0))*quality;
     const next=arm==='height'?j.legs:j.legs*secure;
     if(prev!==next)changes.push({slot:d.slot,kind:'coupling',prev,next,legs:j.legs});
     j.recoveryCoupling=next;
    }
    if(arm==='contact-drive'&&c.body.support?.state==='up'){
     const dx=c.pos.x-d.pos.x,dy=c.pos.y-d.pos.y,dd=Math.hypot(dx,dy)||1;
     const tx=dx/dd,ty=dy/dd,sp=c.speed,torso=c.profile.radius+d.profile.radius;
     const near=Math.min(dd,(j.hold??dd)+(1-CONTACT_SCALE)*torso);
     const close=Math.min(1.5,Math.max(0,near-torso)*3);
     const into=sp>.5?-(c.vel.x*tx+c.vel.y*ty)/sp:1;
     const own=intents[d.idx];
     // Change only a final request that still equals the existing frontal branch.
     // A subsequent secured-roll override is retained.
     if(into>.3&&own&&Math.abs(own.vel.x-(-sim.attackDir(c.team)*2.5+tx*close))<1e-9&&Math.abs(own.vel.y-ty*close)<1e-9){
      const next={x:tx*(2.5+close),y:ty*(2.5+close)};
      if(Math.hypot(next.x-own.vel.x,next.y-own.vel.y)>1e-9){changes.push({slot:d.slot,kind:'drive',prev:clone(own.vel),next});(intents as any)[d.idx]={...own,vel:next};}
     }
    }
   }
  }
  if(changes.length&&!intervention)intervention={t:sim.t,preHash,prefix:prefix.copy().digest('hex'),changes};
  const before=c?{pos:clone(c.pos),vel:clone(c.vel),support:clone(c.body.support)}:null;
  const report=original(intents,dt);
  const holds=c?sim.world.joints.filter((j:any)=>j.kind==='grasp'&&j.b===c.body).map(({a,b,...j}:any)=>({...j,slot:sim.agents.find(d=>d.body===a)?.slot,pos:clone(a.pos),vel:clone(a.vel),support:clone(a.support)})):[];
  const row={t:sim.t,endpoint:sim.world.time,preHash,changes,before,pos:c?clone(c.pos):null,vel:c?clone(c.vel):null,support:c?clone(c.body.support):null,holds,request:c?clone(intents[c.idx]):null,originalRequests,report:{ground:c?report.groundImpulse[c.idx]:null,contacts:c?report.contacts.filter(x=>x.i===c.idx||x.j===c.idx):[],falls:report.falls,downs:report.downs,residual:report.work.residual,passive:report.passiveGraspWork}};
  rows.push(row);
  if(!firstLoad&&holds.some(j=>Math.abs(j.force??0)>1e-9)) firstLoad={stepStart:sim.t,endpoint:sim.world.time,holders:holds.filter(j=>Math.abs(j.force??0)>1e-9).map(j=>({slot:j.slot,force:j.force,firstApplied:j.firstApplied?.time}))};
  // A post-World joint sample is not acquisition; it can include a just-broken grip.
  if(!first&&holds.length)first={t:sim.t,x:before!.pos.x-sim.los,holds:holds.map(j=>({slot:j.slot,legs:j.legs,coupling:j.recoveryCoupling,origin:j.origin}))};
  if(!fall&&c&&c!==sim.qb&&before?.support?.state==='up'&&c.body.support?.state!=='up')fall={t:sim.world.time,x:c.pos.x-sim.los,cause:c.body.support?.cause};
  return report;
 };
 const result=sim.run();assert(rows.every(r=>Number.isFinite(r.report.residual)&&Math.abs(r.report.residual)<1e-8),'physical work residual');const summary={id,arm,constructorSha256:bytesHash(Buffer.from(p.setup,'base64')),firstHoldSample:first,firstLoad,acquisitionEvents:result.events.filter(e=>e.type==='tackle_wrap'||e.type==='carrier_contact'),fall,intervention,firstMoment,result:{yards:result.yards,outcome:result.outcome,duration:result.duration},maxResidual:Math.max(...rows.map(r=>Math.abs(r.report.residual)))};
 writeFileSync(`${output}/arm-${id}-${arm}.json`,JSON.stringify({summary,result,rows}));all.push(summary);console.log(JSON.stringify(summary));
}
writeFileSync(`${output}/arms.json`,JSON.stringify({identity:executionIdentity(),operatorSha256:bytesHash(readFileSync(import.meta.filename)),fixtureSha256:bytesHash(readFileSync('test/fixtures/responsibility-ledger-cases.json')),recordedSingleStream:PlaySim.recordedSingleStream,elapsedMs:performance.now()-begin,all},null,2));

// Same bodies, held requests and random state through the first intervention.
for (const id of ids) {
 const base=JSON.parse(readFileSync(`${output}/arm-${id}-base.json`,'utf8'));
 for (const arm of arms.slice(1)) {
  const run=JSON.parse(readFileSync(`${output}/arm-${id}-${arm}.json`,'utf8'));
  const intervention=run.summary.intervention;
  if (!intervention) assert.deepEqual(run.result,base.result);
  else assert.deepEqual(run.rows.filter((r:any)=>r.t<=intervention.t).map((r:any)=>r.preHash),
   base.rows.filter((r:any)=>r.t<=intervention.t).map((r:any)=>r.preHash));
 }
}
