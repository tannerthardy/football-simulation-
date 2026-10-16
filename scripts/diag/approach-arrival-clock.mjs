/** Saved incoming-body reachability estimates versus achieved World arrival.
 * RAW_DIRECTORY OUTPUT.json. Empty-space forecasts, no native tick or contact.
 */
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {gaitLag} from '../../src/physics/kinematics.ts';
import {interceptPoint,timeToReach} from '../../src/physics/reach.ts';
import {previewFreeMovement} from '../../src/physics/movement-preview.ts';
import {requestToCover} from '../../src/sim/motion-plan.ts';
import {sourceVersion} from '../source-version.ts';
const [dir,out]=process.argv.slice(2),start=performance.now(),rows=[];
for(const [name,t]of [['A020',3.75],['A042',2.65],['A008',2.5]]){
 const raw=JSON.parse(readFileSync(`${dir}/${name}.json`)),
  capture=JSON.parse(gunzipSync(readFileSync(`${dir}/${name}-capture.json.gz`))),
  r=capture.rows.find(r=>r.t===t),seen=r.cues.find(c=>c.caller.includes('at chase ')).picture,
  body=r.body,contact=body.profile.radius+raw.initialBodies[capture.target].body.profile.radius+body.profile.reach*.65,
  mover={pos:body.pos,vel:body.vel,profile:body.profile,speedScale:r.speedScale},
  path=t=>({x:seen.pos.x+seen.vel.x*t,y:seen.pos.y+seen.vel.y*t}),
  intercept=interceptPoint(mover,path,{horizon:3,step:.05,radius:contact}),samples=[];
 for(let k=2;k<=30;k++){
  const time=k*.05,point=path(time),
   vel={x:requestToCover(gaitLag(body.profile),point.x-body.pos.x,time,body.vel.x),
    y:requestToCover(gaitLag(body.profile),point.y-body.pos.y,time,body.vel.y)},
   speed=Math.hypot(vel.x,vel.y),cap=body.profile.vmax*r.speedScale;
  if(speed>cap){vel.x*=cap/speed;vel.y*=cap/speed;}
  const command={...r.command,vel,facing:Math.atan2(vel.y,vel.x)},
   achieved=previewFreeMovement(body,command,r.t,k).at(-1);
  samples.push({time,point,estimated:timeToReach(mover,point,contact),
   achievedGap:Math.hypot(achieved.pos.x-point.x,achieved.pos.y-point.y),achieved,command});
 }
 rows.push({case:name,t,body,seen,contact,intercept,samples});
}
const r={source:sourceVersion(),operator:createHash('sha256').update(readFileSync(import.meta.filename)).digest('hex'),
 nativeExecutions:0,seconds:(performance.now()-start)/1000,rows};
writeFileSync(out,JSON.stringify(r));
console.log(JSON.stringify({out,seconds:r.seconds,rows:rows.map(r=>({case:r.case,contact:r.contact,estimatedIntercept:r.intercept,
  atEstimated:r.samples.find(s=>Math.abs(s.time-r.intercept.t)<1e-8),firstForecastReach:r.samples.find(s=>s.achievedGap<=r.contact)}))}));
