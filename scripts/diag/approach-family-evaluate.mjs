/** Same-state, acquired-picture evaluation only. No native play or intervention.
 * RAW.json CAPTURE.json.gz OUTPUT.json. Compare existing arrival/brake options
 * to the actual full-gather request through the unchanged movement preview.
 */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {FIELD_WIDTH} from '../../src/core/field.ts';
import {clamp} from '../../src/core/vec.ts';
import {fatigueFactor,movingArrivalVelocity} from '../../src/physics/kinematics.ts';
import {availability,supportParams} from '../../src/physics/support.ts';
import {previewFreeMovement} from '../../src/physics/movement-preview.ts';
import {gatheringApproach,leverage} from '../../src/sim/behaviors/common.ts';
import {contactQuality} from '../../src/sim/tackle-window.ts';
import {sourceVersion} from '../source-version.ts';

const [rawPath,path,out]=process.argv.slice(2),began=performance.now(),
 hash=v=>createHash('sha256').update(v).digest('hex'),
 raw=JSON.parse(readFileSync(rawPath)),c=JSON.parse(gunzipSync(readFileSync(path)));
assert.ok(!existsSync(out));assert.equal(c.sourceSha256,sourceVersion());
assert.equal(hash(readFileSync(rawPath)),c.inputNativeSha256);
const targetProfile=raw.initialBodies[c.target].body.profile,rows=[];
for(const r of c.rows){
 const cue=r.cues.find(s=>s.caller.includes('at chase '));if(!cue)continue;
 const body=structuredClone(r.body),a={body,pos:body.pos,vel:body.vel,profile:body.profile,
  speedScale:r.speedScale,runFit:r.runFit,r:k=>r.ratings[k],isDown:()=>r.down,engagement:r.engaged?{}:null},
  seen=cue.picture,dist=Math.hypot(seen.pos.x-a.pos.x,seen.pos.y-a.pos.y),
  contact=a.profile.radius+targetProfile.radius+a.profile.reach*.65,
  force=a.runFit?.kind==='force'||a.runFit?.kind==='edge'&&a.runFit.edge==='box',
  offset=(force?Math.abs(leverage(a,seen.pos.y))*a.runFit.side:leverage(a,seen.pos.y))*clamp((dist-contact)/6,0,1),
  {near,gather}=gatheringApproach(a,seen,contact,offset);
 if(gather<1||r.bonded||r.hasJoint||r.engaged||r.down||body.support?.state!=='up')continue;
 assert.deepEqual(r.command,JSON.parse(JSON.stringify(near)),'Full-gather branch not established');
 const s=body.support,cutSkill=.85+.35*r.ratings.tackling,
  capacity=s?availability(s,supportParams(a.profile),fatigueFactor(body.energy)):1,
  goal={x:seen.pos.x,y:clamp(seen.pos.y+offset,.3,FIELD_WIDTH-.3)},
  arrival={...near,vel:movingArrivalVelocity(body,goal,seen.vel,a.profile.vmax*a.speedScale,
   contact,2.5+2*(1-r.ratings.tackling),cutSkill,capacity)},
  match={...near,vel:{...seen.vel}},bodyRadius=a.profile.radius+targetProfile.radius,
  arms=bodyRadius+a.profile.reach;
 function forecast(command){
  const samples=previewFreeMovement(body,command,r.t,12),initial=Math.hypot(seen.pos.x-body.pos.x,seen.pos.y-body.pos.y);
  let best={distance:initial,t:0,quality:contactQuality(initial,bodyRadius,arms),pos:body.pos,vel:body.vel};
  for(const p of samples){if(p.support!=='up')break;
   const target={x:seen.pos.x+seen.vel.x*p.t,y:clamp(seen.pos.y+seen.vel.y*p.t,0,FIELD_WIDTH)},
    distance=Math.hypot(p.pos.x-target.x,p.pos.y-target.y);
   if(distance<best.distance)best={distance,t:p.t,quality:contactQuality(distance,bodyRadius,arms),pos:p.pos,vel:p.vel};
  }
  return{command,best,first:samples[0],upright:samples.every(s=>s.support==='up')};
 }
 const options=Object.fromEntries([['actualGather',r.command],['existingArrival',arrival],['matchObservedVelocity',match]]
  .map(([name,command])=>[name,forecast(command)]));
 const current=options.actualGather,better=Object.entries(options).filter(([name,v])=>name!=='actualGather'
  &&v.upright&&v.best.distance+.1<current.best.distance).map(([name])=>name),
  actual=r.worldAfter,first=current.first;
 rows.push({t:r.t,body,seen,gather,contact,bodyRadius,arms,offset,
  sameWorldIncoming:JSON.stringify(r.body)===JSON.stringify(r.worldBefore),
  sameApplied:JSON.stringify(r.command)===JSON.stringify(r.applied),contacts:r.contacts,
  firstPredictionError:{position:Math.hypot(first.pos.x-actual.pos.x,first.pos.y-actual.pos.y),
   velocity:Math.hypot(first.vel.x-actual.vel.x,first.vel.y-actual.vel.y)},options,better});
}
const result={schema:'approach-family-same-picture-v1',sourceSha256:c.sourceSha256,
 captureSha256:hash(readFileSync(path)),operatorSha256:hash(readFileSync(import.meta.filename)),
 inputNativeSha256:c.inputNativeSha256,actor:c.actors[c.actor],target:c.actors[c.target],
 nativeExecutions:0,forecastWorldSteps:rows.length*3*12,rows,seconds:(performance.now()-began)/1000,
 limits:['Held-command empty-space forecast, not future cut/grip/contact knowledge.',
  'Best separation sampled only at ordinary decision boundaries.',
  'Improved forecast alone is not evidence of a useful coupled continuation.']};
writeFileSync(out,JSON.stringify(result));
console.log(JSON.stringify({out,rows:rows.length,better:rows.filter(r=>r.better.length).map(r=>({t:r.t,better:r.better,
 distances:Object.fromEntries(Object.entries(r.options).map(([k,v])=>[k,v.best.distance]))})),seconds:result.seconds}));
