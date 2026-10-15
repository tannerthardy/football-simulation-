/** Own achievable motion versus a consumed picture. Native peer futures are
 * scored separately for analysis; they never choose either request. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {CONTACT_SCALE} from '../../src/physics/world.js';
import {previewFreeMovement} from '../../src/physics/movement-preview.js';
import {sourceVersion} from '../source-version.js';

const start=performance.now();
const rows=JSON.parse(readFileSync('docs/reviews/run-tempo-climb/clearance-fixtures.json','utf8'));
let steps=0;
const cases=rows.map((row:any)=>{
 const body=structuredClone(row.body);body.support.since=-Infinity;
 assert.equal(body.support.state,'up');assert(Math.hypot(body.support.load.x,body.support.load.y)<1e-8);
 const before=structuredClone(body);
 const sweep=(samples:any[],at:(t:number)=>{x:number;y:number})=>{
  const start=at(0);let px=body.pos.x-start.x,py=body.pos.y-start.y;
  let min=Math.hypot(px,py);
  for(const s of samples) {
   const peer=at(s.t),rx=s.pos.x-peer.x,ry=s.pos.y-peer.y,dx=rx-px,dy=ry-py;
   const u=Math.max(0,Math.min(1,-(px*dx+py*dy)/Math.max(1e-12,dx*dx+dy*dy)));
   min=Math.min(min,Math.hypot(px+u*dx,py+u*dy));px=rx;py=ry;
  }
  return min-CONTACT_SCALE*(body.profile.radius+row.publicPeerRadius);
 };
 const commands=[{kind:'saved request',intent:row.request},{kind:'gather from identical body',intent:{...row.request,vel:{x:0,y:0}}}];
 const forecasts=commands.map(({kind,intent})=>{
  const path=previewFreeMovement(body,intent,row.t,12,'center');steps+=12;
  const cv=(t:number)=>({x:row.picture.pos.x+row.picture.vel.x*t,y:row.picture.pos.y+row.picture.vel.y*t});
  const recorded=(t:number)=>{
   const sample=row.actualPeerPathForAnalysisOnly.find((s:any)=>Math.abs(s.t-t)<1e-8);
   assert(sample);return sample.pos;
  };
  return {kind,intent,acquiredCVMinimumGap:sweep(path,cv),analysisRecordedPeerMinimumGap:sweep(path,recorded),
   upright:path.every(s=>s.support==='up')};
 });
 assert.deepEqual(body,before);
 return {id:row.id,slot:row.slot,peer:row.peer,t:row.t,capturedSource:row.source,
  cue:row.cue,forecasts};
});
const result={kind:'same-own-body free-World diagnostic; recorded peer path is analysis only, not a reacting counterfactual',
 sourceSha256:sourceVersion(),ordinaryOwnWorldSteps:steps,nativePlays:0,elapsedSeconds:(performance.now()-start)/1000,cases};
writeFileSync('out/tempo-climb/clearance-result.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result));
