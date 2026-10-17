/** Passive check of the first reserve estimate against production free motion.
 * Uses saved native bodies/cues only. No full snap, new sensing or RNG.
 */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';

// Dynamic paths keep opt-in evidence dependencies out of the production build.
const pinned='out/vertical-roof/hosts/recovery-v1/src';
const {previewFreeMovement}=await import(pathToFileURL(resolve(pinned,'physics/movement-preview.ts')).href);
const {verticalLeverage}=await import(pathToFileURL(resolve(pinned,'sim/coverage-leverage.ts')).href);

const rows=[];
for(const [id,i,target,times] of [
 ['G1-P027',17,9,[.5,.85,1.5]],['G1-P192',21,9,[1,2,2.5]],
] as const){
 const d=JSON.parse(gunzipSync(readFileSync(`out/vertical-roof/hosts/recovery-v1/out/catch-opportunity-physics/${id}.json.gz`)).toString());
 for(const t of times){
  const tick=d.ticks.find((q:any)=>q.t===t),seen=d.reads.find((q:any)=>q.t===t&&q.a===i&&q.target===target).seen;
  const body={...d.agents[i].start,...tick.before[i]},before=structuredClone(body);
  const speed=Math.hypot(seen.vel.x,seen.vel.y),command={vel:{x:body.profile.vmax*seen.vel.x/speed,y:body.profile.vmax*seen.vel.y/speed}};
  const samples=previewFreeMovement(body,command,t,30);
  const loss=Math.max(0,...samples.map((p:any)=>seen.vel.x*p.t-p.pos.x+body.pos.x));
  const base=.8+.15*seen.vel.x,reserve=verticalLeverage(body,seen,base).x-seen.pos.x;
  assert.deepEqual(body,before);
  rows.push({id,a:i,target,t,base,reserve,freeMotionLoss:loss,freeMotionReserve:base+loss,
   endVelocity:samples.at(-1)!.vel,observedVelocity:seen.vel,samples});
 }
}
writeFileSync('out/vertical-roof/reserve-preview.json',JSON.stringify(rows,null,2)+'\n');
console.log(JSON.stringify(rows.map(({samples,...q})=>q),null,2));
