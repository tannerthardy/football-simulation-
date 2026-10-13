/** Frozen acquired-cue forecast; never substitutes an opponent's true path
 * into a controller. Truth samples only grade the saved forecast offline. */
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { previewFreeMovement } from '../../src/physics/movement-preview.js';
import type { Body } from '../../src/physics/kinematics.js';
import type { Intent } from '../../src/physics/world.js';
const input=JSON.parse(readFileSync(process.argv[2]??'docs/reviews/combination-interception-witness.json','utf8'));
const rows=[];
for(const [profile,physical] of Object.entries(input.profiles))for(const mirror of [false,true]){
  const body:Body=structuredClone(input.body);body.profile=physical as Body['profile'];
  const intent:Intent=structuredClone(input.requested),seen=structuredClone(input.seen);
  if(mirror){
    body.pos.y=-body.pos.y;body.vel.y=-body.vel.y;body.facing=-body.facing;body.spin=-(body.spin??0);
    if(body.squeezeHeading!==undefined)body.squeezeHeading=-body.squeezeHeading;
    const sup=body.support as any;
    for(const key of ['xi','lean','load','felt','feetVel','fall','feltTip','accel','tipAccel'])if(sup?.[key])sup[key].y=-sup[key].y;
    intent.vel.y=-intent.vel.y;if(intent.facing!==undefined)intent.facing=-intent.facing;
    seen.pos.y=-seen.pos.y;seen.vel.y=-seen.vel.y;
  }
  const before=JSON.stringify(body),path=previewFreeMovement(body,intent,input.t,26,'center');
  assert.equal(JSON.stringify(body),before,'Observer must not move the native body');
  const strike=input.strike+body.profile.radius-input.body.profile.radius;
  const margins=path.map(s=>({dt:s.t,margin:Math.hypot(s.pos.x-seen.pos.x-seen.vel.x*s.t,s.pos.y-seen.pos.y-seen.vel.y*s.t)-strike}));
  const truth=input.truthBacker.map((b:any)=>{
    const s=path.find(s=>Math.abs(s.t-b.dt)<1e-8)!;
    return {dt:b.dt,margin:Math.hypot(s.pos.x-b.pos.x,s.pos.y-(mirror?-b.pos.y:b.pos.y))-strike};
  });
  rows.push({profile,mirror,strike,predictedFirstReach:margins.find(s=>s.margin<=0)?.dt??null,
    predictedMarginAtRunner:margins.find(s=>Math.abs(s.dt-input.runnerContactAfter)<1e-8)?.margin,
    truthMarginAtRunner:truth.find((s:any)=>Math.abs(s.dt-input.runnerContactAfter)<1e-8)?.margin,
    truthFirstReach:truth.find((s:any)=>s.margin<=0)?.dt??null});
}
const report={protocol:'combination-interception-capability-controls-v1',input:process.argv[2],label:input.label,rows};
if(process.argv[3])writeFileSync(process.argv[3],JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(rows));
