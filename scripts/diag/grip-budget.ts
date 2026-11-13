/** Instrument actual substep grasp impulses without changing the solver.
 * node --import tsx scripts/diag/grip-budget.ts out/grip-budget.json
 */
import {mkdirSync,writeFileSync} from 'node:fs';
import {dirname} from 'node:path';
import {World,type GraspJoint,type Intent,type Joint,type StepReport} from '../../src/physics/world.js';
import type {Body} from '../../src/physics/kinematics.js';
import {redirect} from '../../src/lab/scenarios.js';
import {sourceVersion} from '../source-version.js';

type Row={joint:Joint;i:number;j:number;nx:number;ny:number;ln:number;lt:number;limit:number};
interface Internal {
  bodies:Body[];joints:Joint[];
  substep(...args:unknown[]):void;
  jointRows(h:number):Row[];
  pairImpulse(i:number,j:number,x:number,y:number,actor:number,kind:string,active?:boolean):number;
}
const proto=World.prototype as unknown as Internal;
const originals={substep:proto.substep,rows:proto.jointRows,pair:proto.pairImpulse};
let context='';let rows:Row[]=[];
const active=new Map<string,{x:number;y:number}>();
const samples:unknown[]=[];
const totals:Record<string,{samples:number;overBudget:number;maxRatio:number;maxForce:number}>={};
proto.jointRows=function(h){rows=originals.rows.call(this,h);return rows;};
proto.pairImpulse=function(i,j,x,y,actor,kind,enabled=true){
  const fraction=originals.pair.call(this,i,j,x,y,actor,kind,enabled);
  if(kind==='grasps'&&enabled){const key=`${i}/${j}`,v=active.get(key)??{x:0,y:0};v.x+=x*fraction;v.y+=y*fraction;active.set(key,v);}
  return fraction;
};
proto.substep=function(...args){
  rows=[];active.clear();originals.substep.apply(this,args);
  const h=args[3] as number;
  for(const row of rows){
    if(row.joint.kind!=='grasp'||row.limit<=0)continue;
    const reel=active.get(`${row.i}/${row.j}`)??{x:0,y:0};
    const x=row.nx*row.ln-row.ny*row.lt+reel.x,y=row.ny*row.ln+row.nx*row.lt+reel.y;
    const force=Math.hypot(x,y)/h,capacity=row.limit/h,ratio=force/capacity;
    const t=totals[context]??={samples:0,overBudget:0,maxRatio:0,maxForce:0};
    t.samples++;t.maxRatio=Math.max(t.maxRatio,ratio);t.maxForce=Math.max(t.maxForce,force);
    if(ratio>1+1e-8){
      t.overBudget++;
      if(samples.length<32)samples.push({context,h,force,capacity,ratio,passive:{normal:row.ln/h,tangent:row.lt/h},
        activeForce:{x:reel.x/h,y:reel.y/h},hold:row.joint.hold,legs:row.joint.legs});
    }
  }
};

function body(x:number,vx:number):Body{return {pos:{x,y:0},vel:{x:vx,y:0},facing:0,energy:1,
  profile:{massKg:100,radius:.25,reach:1,heightYd:2,vmax:9,tau:1.3,brake:6,lateral:6,turnRate:8,
    backpedal:.6,shuffle:.55,maxCatchHeight:3,reactReach:2.6,reactionTime:.25,power:100,balance:.5,bend:.5,stepSpeed:3.4,getUp:.9}};}
const isolated=[];
for(const capacity of [50,300,900])for(const substeps of [12,48,192]){
  context=`isolated/${capacity}/${substeps}`;
  const a=body(0,0),b=body(1,5),world=new World([a,b],{substeps});
  const j:GraspJoint={kind:'grasp',a,b,reach:2,capacity,legs:0,pull:2,hold:1};world.joints.push(j);
  const free:Intent={vel:{x:0,y:0},free:true};
  let momentumError=0,workError=0;
  for(let k=0;k<3;k++){
    const px=100*(a.vel.x+b.vel.x);const report:StepReport=world.step([free,free],.05);
    momentumError=Math.max(momentumError,Math.abs(100*(a.vel.x+b.vel.x)-px-report.groundImpulse.reduce((s,g)=>s+g.x,0)));
    workError=Math.max(workError,Math.abs(report.work.residual));
  }
  isolated.push({capacity,substeps,momentumError,workError,...totals[context]});
}
const football=[];
for(const seed of [3,7,11])for(const power of [.7,1,1.4])for(const substeps of [12,48,192]){
  context=`redirect/${seed}/${power}/${substeps}`;
  const result=redirect({seed,rusherPower:power,substeps});
  football.push({seed,power,substeps,...totals[context],closest:result.closest,falls:result.falls});
}
proto.substep=originals.substep;proto.jointRows=originals.rows;proto.pairImpulse=originals.pair;
const out=process.argv[2]??'out/grip-budget.json';mkdirSync(dirname(out),{recursive:true});
writeFileSync(out,JSON.stringify({sourceSha256:sourceVersion(),note:'Instrumentation sums active reel and passive grip vectors at each solver substep. The existing per-holder structural/passive capacity is the budget reference; force magnitudes are not NFL-calibrated. Independent active muscle work remains bounded separately. Instrumentation does not change draws or control.',isolated,football,samples},null,2)+'\n');
console.table(isolated);console.table(football.filter(r=>r.overBudget));
