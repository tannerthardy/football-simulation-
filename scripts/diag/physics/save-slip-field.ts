/** Extract actual inner fields, not a restarted World tick. No state edits. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {World,type HandJoint} from '../../../src/physics/world.js';
import {turnRateOf} from '../../../src/physics/kinematics.js';
import {supportParams} from '../../../src/physics/support.js';
import {angleDiff} from '../../../src/core/vec.js';
import {replayKeeper,type KeeperWitness} from './keeper-contact-law.js';
import {sourceVersion} from '../../source-version.js';
const inputPath='config/current-contact-first-interval.json',packet=JSON.parse(readFileSync(inputPath,'utf8')),w:KeeperWitness=packet.witness,
 bs=structuredClone(w.beforeBodies),world=new World(bs,{handContact:'patch',groundMovement:'legacy',groundYawCoupling:'hands',substeps:12});world.time=w.t;
world.joints=w.jointInputs.map(({a,b,actor,holder,...rest})=>({...rest,a:bs[a],b:bs[b],drive:0,...(actor===undefined?{}:{actor:bs[actor]}),...(holder===undefined?{}:{holder:bs[holder]})} as HandJoint));
const host=world as any,integrate=host.integrateSubstep,rows=host.jointRows,couple=host.coupleGroundHandYaw;let current:any;const fields:any[]=[];
host.integrateSubstep=function(ids:any,intents:any,plans:any,h:number,remaining:number,...args:any[]){
 current={time:w.t+w.dt-remaining,elapsed:w.dt-remaining,h,remaining,before:structuredClone(bs),plans:structuredClone(plans),intents:structuredClone(intents)};
 const result=integrate.call(this,ids,intents,plans,h,remaining,...args);current.after=structuredClone(bs);fields.push(current);return result;
};
host.jointRows=function(h:number){const result=rows.call(this,h);assert.equal(result.length,1);const r=result[0];current.row=r;
 current.frame={nx:r.nx,ny:r.ny,ri:r.ri,rj:r.rj};current.groundAcceleration=bs.map((_,i)=>({x:this.amx[i],y:this.amy[i]}));return result;
};
host.coupleGroundHandYaw=function(...args:any[]){current.yaw=structuredClone(this.handYaw);const result=couple.apply(this,args);assert.equal(result,true);
 current.groundYawAcceleration=bs.map((b,i)=>((b.spin??0)-current.yaw[i].spin)/current.h);return result;};
const report=world.step(w.intents,w.dt),plain=replayKeeper(w,'patch',{groundMovement:'legacy',groundYawCoupling:'hands',substeps:12}),hash=(x:unknown)=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
assert.equal(hash(bs),hash(plain.bodies));assert.equal(hash(report),hash(plain.reports[0]));
const reduced=fields.map(f=>{
 const r=f.row,{ri,rj,nx,ny}=f.frame,t={x:-ny,y:nx},b=f.before,
  slips=(state:any[])=> (state[1].vel.x-state[0].vel.x)*t.x+(state[1].vel.y-state[0].vel.y)*t.y-ri*(state[0].spin??0)-rj*(state[1].spin??0),
  afterSlip=slips(f.after),beforeSlip=slips(b),finiteWork=.5*r.lt*(beforeSlip+afterSlip);
 return {time:f.time,elapsed:f.elapsed,h:f.h,remaining:f.remaining,frame:f.frame,
  bodies:b.map((q:any,i:number)=>({mass:q.profile.massKg,inertia:supportParams(q.profile).yawInertia,position:q.pos,velocity:q.vel,facing:q.facing,spin:q.spin??0,
   groundAcceleration:f.groundAcceleration[i],groundYawAcceleration:f.groundYawAcceleration[i],
   yawImpulseLimit:f.yaw[i].limit,groundDemand:f.yaw[i].demand,headingError:angleDiff(q.facing,f.plans[i].facing),turnRate:turnRateOf(q)})),
  tangentForceLimit:r.steerLim/f.h,beforeSlip,afterSlip,selectedImpulse:r.lt,orderedWork:r.tangentWork?.net??0,frozenFrameWork:finiteWork};
});
const first=reduced.find(f=>f.frozenFrameWork>1e-10);assert(first);
const result={protocol:'saved-local-slip-field-v1',source:sourceVersion(),parentInput:{path:inputPath,sha256:createHash('sha256').update(readFileSync(inputPath)).digest('hex')},
 observationNeutral:true,firstSlipChange:first,slidingControl:reduced[0],fields:reduced};mkdirSync('out/slip-work',{recursive:true});
writeFileSync('out/slip-work/fields.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({firstSlipChange:first,slidingControl:reduced[0]}));
