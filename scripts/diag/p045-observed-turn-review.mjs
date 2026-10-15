/** Saved consumed-cue and native objective review. No plays or World steps.
 * BASELINE.json.gz PLAIN.json.gz BOUNDED.json.gz OUTPUT.json [--compact]
 */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {dirname} from 'node:path';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {track} from '../../src/sim/behaviors/common.ts';
const paths=process.argv.slice(2),[basePath,plainPath,turnPath,out]=paths,
 read=p=>JSON.parse(p.endsWith('.gz')?gunzipSync(readFileSync(p)):readFileSync(p,'utf8')),
 sha=p=>createHash('sha256').update(readFileSync(p)).digest('hex'),
 base=read(basePath),plain=read(plainPath),turn=read(turnPath),
 metric=(row,d=18,r=8)=>{
  const a=row.world.before[d],b=row.world.before[r],dx=a.pos.x-b.pos.x,dy=a.pos.y-b.pos.y,
   speed=Math.hypot(b.vel.x,b.vel.y),ux=b.vel.x/speed,uy=b.vel.y/speed,gap=Math.hypot(dx,dy),
   dh=Math.atan2(a.vel.y,a.vel.x)-Math.atan2(b.vel.y,b.vel.x);
  return{t:row.t,defenderBody:a,receiverBody:b,gapYd:gap,speedYdS:Math.hypot(a.vel.x,a.vel.y),
   headingErrorDeg:Math.abs(Math.atan2(Math.sin(dh),Math.cos(dh)))*180/Math.PI,
   downfieldLeadYd:dx,fieldLateralOffsetYd:dy,alongReceiverPathYd:dx*ux+dy*uy,
   acrossReceiverPathYd:ux*dy-uy*dx,
   closingYdS:-((a.vel.x-b.vel.x)*dx+(a.vel.y-b.vel.y)*dy)/gap};
 };
assert.ok(!existsSync(out),'Preserve evidence');
assert.equal(base.provenance.sourceSha256,'2402d98170109b92a3a862609e6fc2fadd5114d56524a332c024e77b898df9ad');
assert.equal(plain.provenance.sourceSha256,'78b6de605643c981158d617d0b5a7aa1606aa9a3f700d94385bf7bb1c60083b2');
assert.equal(turn.provenance.sourceSha256,'f0e1fafae495ba95c150f8cf13d1c204702d131bf1df318a3bd7dbd4af0fc17c');
for(const arm of [plain,turn]){
 assert.deepEqual(arm.provenance.flags,base.provenance.flags);
 assert.deepEqual(arm.provenance.worldDefaults,base.provenance.worldDefaults);
 assert.equal(arm.inputSha256,base.inputSha256);
}
// Audit already consumed pictures against past recorded sensing boundaries.
// Historical truth is used only to verify provenance, never as a controller input.
const timing={schema:'p045-observed-turn-cue-timing-v1',acceptedSourceSha256:base.provenance.sourceSha256,
 baselineTapeSha256:sha(basePath),actualDefender:'H2-CB2/CB_W/18',actualReceiver:'A2-WR1/X/8',rows:[],
 newNativePlays:0,limits:'Body facing is an acquired simulation cue, not measured gaze. Plant means observed deceleration; no anatomical foot or private route inference.'};
for(const row of base.clips[2].rows.filter(r=>r.t>=2.2&&r.t<=3.75)){
 const raw=row.raw.find(r=>r.actor===18),cue=row.cues.slice(raw.cueStart,raw.cueEnd).find(q=>q.target===8).picture,
  sampledAt=Number((row.t-cue.age).toFixed(10)),sample=base.clips[2].rows.find(r=>r.t===sampledAt).world.before[8];
 assert.ok(sampledAt<=row.t);
 assert.deepEqual(cue.vel,sample.vel);assert.equal(cue.facing,sample.facing);
 for(const k of ['x','y'])assert.ok(Math.abs(cue.pos[k]-sample.pos[k]-sample.vel[k]*cue.age)<1e-9);
 const angle=cue.facing-Math.atan2(cue.vel.y,cue.vel.x);
 timing.rows.push({at:row.t,sampledAt,cue,sampleBody:{pos:sample.pos,vel:sample.vel,facing:sample.facing},
  speed:Math.hypot(cue.vel.x,cue.vel.y),hipTurnDeg:Math.atan2(Math.sin(angle),Math.cos(angle))*180/Math.PI,
  verifiedAcquiredSample:true});
}
assert.equal(timing.rows.length,32);
const cueAudit=[];
for(const row of turn.clips[2].rows){
 const raw=row.raw.find(q=>q.actor===18);if(!raw?.flight)continue;
 const body=raw.flight.body,a={body,pos:body.pos,vel:body.vel,profile:body.profile},
  candidates=row.observations.filter(q=>q.actor===18&&q.target===8),
  matches=candidates.filter(q=>{const command=track(a,q.result.pos,q.result.vel);return Math.hypot(command.vel.x-raw.request.vel.x,command.vel.y-raw.request.vel.y)<1e-9;});
 if(!matches.length)continue;
 assert.equal(matches.length,1,'Disambiguate the judgment forecast from the actual man request');
 const used=matches[0],sp=Math.hypot(used.cue.vel.x,used.cue.vel.y),
  h=Math.max(0,Math.min(.25,used.horizon))*Math.max(0,Math.min(1,used.confidence)),
  r=turn.clips[2].players[8],angle=Math.atan2(used.result.vel.y,used.result.vel.x)-Math.atan2(used.cue.vel.y,used.cue.vel.x),
  delta=Math.abs(Math.atan2(Math.sin(angle),Math.cos(angle)));
 assert.ok(delta<=r.profile.lateral*h/sp+1e-9);
 const consumed=turn.clips[2].rows.find(r=>r.t===row.t).cues.slice(raw.cueStart,raw.cueEnd);
 assert.ok(consumed.some(q=>q.target===8&&JSON.stringify(q.picture)===JSON.stringify(used.cue)),'Forecast must use an actually consumed picture');
 cueAudit.push({t:row.t,used,turnDeltaRad:delta,turnLimitRad:r.profile.lateral*h/sp,request:raw.request});
}
assert.equal(cueAudit.length,23);
const comparisons=[];
for(const [name,data,path] of [['baseline',base,basePath],['plain',plain,plainPath],['bounded',turn,turnPath]]){
 const clip=data.clips[2],rows=clip.rows,
  contacts=clip.result.events.filter(e=>e.t>=3.75&&e.type==='carrier_contact'&&e.a===8),
  holds=rows.filter(r=>r.world.grasps.some(g=>g.a===8||g.b===8)),
  geometry=rows.map(r=>metric(r));
 assert.equal(contacts.length,0);assert.equal(holds.length,0);
 comparisons.push({name,provenance:data.provenance,artifactSha256:sha(path),signature:clip.signature,
  result:clip.result,geometry,postCatchClosest:geometry.filter(r=>r.t>=3.75).reduce((a,b)=>a.gapYd<b.gapYd?a:b),
  receiverContactEvents:contacts,receiverGraspSteps:holds.length});
}
const controls=base.clips.slice(0,2).map((b,i)=>{
 const c=turn.clips[i];assert.equal(b.signature,c.signature);assert.equal(c.observerNeutral,true);
 for(let n=0;n<b.rows.length;n++){
  assert.deepEqual(b.rows[n].world,c.rows[n].world);
  assert.deepEqual(b.rows[n].cues,c.rows[n].cues);
  for(const raw of b.rows[n].raw){const changed=c.rows[n].raw.find(q=>q.actor===raw.actor);assert.deepEqual(raw.request,changed.request);}
 }
 return{id:b.id,signature:b.signature,allWorldRowsAndConsumedCuesExact:true,result:b.result};
});
const receiverThroughCatchExact=base.clips[2].rows.every((r,i)=>r.t>3.75||JSON.stringify(r.world.before[8])===JSON.stringify(turn.clips[2].rows[i].world.before[8]));
assert.ok(receiverThroughCatchExact);
const packet={schema:'p045-observed-turn-review-v1',collectorSha256:sha(import.meta.filename),
 decision:'Stop variants. Bounded acquired hip/plant interpretation improves plain tracking but still exchanges arrival alignment/lateral leverage for speed versus accepted; no earned contact improvement. Review the flight objective conflict before another controller rule.',
 inputSha256:base.inputSha256,timingSha256:createHash('sha256').update(JSON.stringify(timing)).digest('hex'),cueTiming:timing,actualManInterpretations:cueAudit,
 comparisons,controls,receiverThroughCatchExact,newNativePlays:0,newWorldSteps:0,
 limits:'Judgment and man observers both interpret cues for this actor; only the interpretation that exactly reconstructs the actual request is marked used. Bounds and information timing do not prove the optimal coaching choice. No receiver contact exists, so grip survival is unavailable. No future receiver path/private route is a controller input. Existing controls and accepted baseline are reused on an identical engine/settings tree.'};
if(paths[4]==='--compact'){
 const smallMetric=m=>Object.fromEntries(Object.entries(m).filter(([k])=>!k.endsWith('Body'))),
  smallResult=r=>({outcome:r.outcome,duration:r.duration,stats:r.stats,
   receiverEvents:r.events.filter(e=>e.type==='catch'||e.type==='carrier_contact'||e.type==='tackle_wrap'||e.type==='tackle'||e.type==='touchdown')});
 packet.cueTiming={...timing,rows:timing.rows.map(r=>({...r,
  sampleBody:{pos:r.sampleBody.pos,vel:r.sampleBody.vel,facing:r.sampleBody.facing}}))};
 packet.comparisons=comparisons.map(c=>({...c,result:smallResult(c.result),
  geometry:c.geometry.filter(r=>[2.5,2.6,2.65,2.75,3.05,3.35,3.75,3.8,4.5,5,5.3].includes(r.t)).map(smallMetric),
  postCatchClosest:smallMetric(c.postCatchClosest)}));
 packet.controls=controls.map(c=>({...c,result:smallResult(c.result)}));
 packet.storage='Compact published summary. Full bodies/steps stay in ignored native archives; shipped inputs and archived patch reproduce them without a game prefix.';
}
mkdirSync(dirname(out),{recursive:true});writeFileSync(out,JSON.stringify(packet,null,2)+'\n');
console.log(JSON.stringify({out,usedInterpretations:cueAudit.length,controls:controls.map(c=>c.id),
 catch:comparisons.map(c=>({arm:c.name,...Object.fromEntries(Object.entries(c.geometry.find(r=>r.t===3.75)).filter(([k])=>!k.endsWith('Body')))}))}));
