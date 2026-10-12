/** Independent shared-body hand/torso law audit; run from the repository root:
 * node --import tsx docs/archive/research/contact-mechanics/material-hand-law.ts [out.json]
 * Free bodies exclude ground. This proves accounting, not football technique.
 */
import assert from 'node:assert/strict';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {dirname} from 'node:path';
import type {Body} from '../../../../src/physics/kinematics.js';
import {supportParams} from '../../../../src/physics/support.js';
import {World,type HandJoint} from '../../../../src/physics/world.js';
import {sourceVersion} from '../../../../scripts/source-version.js';
const sourceBefore=sourceVersion();
const output=process.argv[2]??'out/angular-contact-next/graph-law.json';
function body(mass:number,x:number,y:number,radius:number):Body{return {pos:{x,y},vel:{x:0,y:0},facing:0,spin:0,energy:1,
 profile:{massKg:mass,radius,reach:1,heightYd:2.05,vmax:9,tau:1.3,brake:6,lateral:6,turnRate:8,backpedal:.6,shuffle:.55,
 maxCatchHeight:3,reactReach:2.6,reactionTime:.25,power:mass,balance:.5,stepSpeed:3.4,getUp:.9}};}
const angular=(bs:Body[])=>bs.reduce((s,b)=>s+b.profile.massKg*(b.pos.x*b.vel.y-b.pos.y*b.vel.x)+supportParams(b.profile).yawInertia*(b.spin??0),0);
const momentum=(bs:Body[])=>bs.reduce((s,b)=>({x:s.x+b.profile.massKg*b.vel.x,y:s.y+b.profile.massKg*b.vel.y}),{x:0,y:0});
const rows=[];
for(const arrangement of ['original','reverse','split'])for(const side of [-1,1])for(const subdivisions of [1,12,48])for(const angle of [0,.8]) {
 const a=body(100,0,0,.25),b=body(80,.5,.1*side,.35),c=body(120,-.5,-.1*side,.3);
 a.vel={x:.2,y:.3*side};b.vel={x:-.5,y:-side};c.vel={x:1.2,y:.7*side};a.spin=.2*side;b.spin=-.4*side;c.spin=.6*side;
 const rotate=(v:{x:number;y:number})=>({x:v.x*Math.cos(angle)-v.y*Math.sin(angle),y:v.x*Math.sin(angle)+v.y*Math.cos(angle)});
 for(const q of [a,b,c]){q.pos=rotate(q.pos);q.pos.x+=17;q.pos.y-=9;q.vel=rotate(q.vel);q.facing=angle;}
 const bs=arrangement==='reverse'?[c,b,a]:[a,b,c],world=new World(bs,{substeps:subdivisions,handContact:'patch'});
 const contactB={on:'b' as const,local:{x:-.1,y:.18*side}},contactA={on:'a' as const,local:{x:.1,y:.15*side}};
 const ab:HandJoint={kind:'hands',a,b,extension:.9,push:20,hold:20,steer:20,contact:contactB};
 const ac:HandJoint={kind:'hands',a,b:c,extension:.9,push:20,hold:20,steer:20,contact:contactA};
 if(arrangement==='split')world.joints.push({...ab,push:10,hold:10,steer:10},{...ab,push:10,hold:10,steer:10},ac);
 else world.joints.push(...(arrangement==='reverse'?[ac,ab]:[ab,ac]));
 const before=angular(bs),pBefore=momentum(bs),initial=structuredClone(bs);
 const report=world.step(bs.map(()=>({vel:{x:0,y:0},free:true})),.05),after=angular(bs),pAfter=momentum(bs);
 const angularChange=after-before,linearChange=Math.hypot(pAfter.x-pBefore.x,pAfter.y-pBefore.y);
 assert(report.contacts.length>0);assert(report.groundImpulse.every(x=>x.x===0&&x.y===0));assert(report.groundYawImpulse.every(x=>x===0));
 assert(Math.abs(angularChange)<1e-8);assert(linearChange<1e-8);assert(Math.abs(report.work.residual)<1e-8);
 for(let i=0;i<bs.length;i++){assert(report.armImpulse[i]<=report.armImpulseLimit[i]+1e-8);assert(report.armWork[i]<=report.armWorkLimit[i]+1e-8);}
 rows.push({arrangement,side,subdivisions,angle,initial,final:bs,angularChange,linearChange,report});
}
const sourceAfter=sourceVersion();assert.equal(sourceBefore,sourceAfter);
mkdirSync(dirname(output),{recursive:true});
writeFileSync(output,JSON.stringify({sourceBefore,sourceAfter,toolSha256:createHash('sha256').update(readFileSync(import.meta.filename)).digest('hex'),rows}));
console.log(JSON.stringify({sourceBefore,sourceAfter,cases:rows.length,maxAngularChange:Math.max(...rows.map(r=>Math.abs(r.angularChange))),maxMomentumError:Math.max(...rows.map(r=>r.linearChange)),maxWorkResidual:Math.max(...rows.map(r=>Math.abs(r.report.work.residual))),falls:rows.filter(r=>r.report.falls.length).length}));
