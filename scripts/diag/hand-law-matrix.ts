/** Existing center/patch laws at frozen native bodies, no solver edits.
 * Free pairs are explicitly separate from native football outcomes. */
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { World } from '../../src/physics/world.js';
import { supportParams } from '../../src/physics/support.js';
const out=process.argv[2]??'out/run-hand-coherence/hand-law-matrix.json';
const rows:any[]=[];
for(const name of ['wz7','oz19','new23']) {
 const file=`docs/reviews/hand-action-witness-${name}.json`,saved=JSON.parse(readFileSync(file,'utf8'));
 const ids=saved.lawPair.map((s:string)=>saved.slots.indexOf(s));
 for(const handContact of ['center','patch'] as const)for(const substeps of [12,24,48,96])for(const active of [false,true]){
  const bodies=ids.map((i:number)=>structuredClone(saved.beforeBodies[i]));
  const w=new World(bodies,{handContact,substeps});w.time=saved.t;
  w.joints=saved.jointInputs.filter((j:any)=>ids.includes(j.a)&&ids.includes(j.b)).map((j:any)=>{
   const q=structuredClone(j);for(const key of ['a','b','actor','holder'])if(typeof q[key]==='number')q[key]=bodies[ids.indexOf(q[key])];
   if(!active&&q.kind==='hands')q.drive=0;return q;
  });
  const totals=()=>({x:bodies.reduce((s:number,b:any)=>s+b.profile.massKg*b.vel.x,0),y:bodies.reduce((s:number,b:any)=>s+b.profile.massKg*b.vel.y,0),
   angular:bodies.reduce((s:number,b:any)=>s+b.profile.massKg*(b.pos.x*b.vel.y-b.pos.y*b.vel.x)+supportParams(b.profile).yawInertia*(b.spin??0),0)});
  const before=totals(),report=w.step(bodies.map(()=>({vel:{x:0,y:0},free:true})),saved.dt),after=totals();
  const clean=!report.contacts.length&&!report.strikes.length&&report.groundImpulse.every(p=>Math.hypot(p.x,p.y)<1e-10)&&report.groundYawImpulse.every(x=>Math.abs(x)<1e-10);
  rows.push({name,handContact,substeps,active,clean,linearResidual:Math.hypot(after.x-before.x,after.y-before.y),angularResidual:after.angular-before.angular,
   workResidual:report.work.residual,armImpulseExcess:Math.max(0,...report.armImpulse.map((a,i)=>a-report.armImpulseLimit[i])),
   armWorkExcess:Math.max(0,...report.armWork.map((a,i)=>a-report.armWorkLimit[i])),
   pose:bodies.map((b:any)=>({pos:b.pos,vel:b.vel,facing:b.facing,spin:b.spin})),
   delivered:w.joints.map(j=>j.kind==='hands'?{normal:j.normalForce,tangent:j.tangentForce,
    forceOnB:j.forceOnB,momentOnA:j.momentOnA,momentOnB:j.momentOnB}:null)});
 }
}
writeFileSync(out,JSON.stringify({protocol:'native-derived-free-hand-laws-v1',worldSha256:createHash('sha256').update(readFileSync('src/physics/world.ts')).digest('hex'),
 source:'Frozen center-law witness bodies and requests; fresh patch acquisition, not an original patch-contact prefix or football replay',
 expected:'Clean free pairs conserve both linear and angular momentum; timestep refinement cannot cure a missing force-point torque',rows},null,2)+'\n');
for(const handContact of ['center','patch'])console.log(JSON.stringify({handContact,rows:rows.filter(r=>r.handContact===handContact).length,
 clean:rows.filter(r=>r.handContact===handContact&&r.clean).length,
 maxAngular:Math.max(...rows.filter(r=>r.handContact===handContact&&r.clean).map(r=>Math.abs(r.angularResidual)))}));
