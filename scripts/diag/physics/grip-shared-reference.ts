/** Independent unchanged-World reference for the existing shared-foot graph.
 * Imports neither the coupled force kernel nor its numerical integrator. */
import {World} from '../../../src/physics/world.js';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {serialize} from 'node:v8';
import {sourceVersion} from '../../source-version.js';
import {prepareSharedCase,prescribeSharedSupport} from './grip-shared-fixtures.js';
const root='out/grip-shared';mkdirSync(root,{recursive:true});
const sha=(x:Uint8Array|string)=>createHash('sha256').update(x).digest('hex'),source=sourceVersion(),
  commit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),
  flags=Object.fromEntries(Object.keys(JSON.parse(readFileSync('config/baseline.json','utf8')).flags).map(k=>[k,process.env[k]??null])),
  baseline=JSON.parse(readFileSync('config/grip-mixed-reference.json','utf8')).baseline,
  coarseCount=Number(process.argv.find(a=>a.startsWith('--coarse='))?.split('=')[1]??16384),fineCount=2*coarseCount;
if(!Number.isInteger(coarseCount)||coarseCount<1||fineCount>131072)throw Error('Invalid reference budget');
function run(side:number,single:boolean,n:number,variant:'base'|'distinct'|'unequal'='base'){
  const v=prepareSharedCase(side,single,variant),{w,args,input}=v,bytes=serialize(v.packet),h=input.duration/n,
    before={body:args[5].work.grasps,motor:args[5].supportMotorWork[1],passive:args[5].passiveGraspWork,
      energy:w.kineticEnergy(),angular:w.bodies.reduce((s:number,b:any,i:number)=>s+w.mass[i]*(b.pos.x*b.vel.y-b.pos.y*b.vel.x)+w.inertia[i]*(b.spin??0),0)},
    sums=input.grips.map(()=>({x:0,y:0,qx:0,qy:0,ja:0,jb:0,qa:0,qb:0,normal:0,tangent:0,dose:0})),
    original=w.jointRows,trace:any[]=[];let rows:any[]=[];let maxCapacityExcess=0;
  w.jointRows=function(h:number){rows=original.call(this,h);if(rows.length!==input.grips.length)throw Error('Graph/row change');return rows;};
  for(let k=0;k<n;k++){
    const next=[...args];next[3]=h;next[4]=args[4]-k*h;w.integrateInterval(...next);
    for(let j=0;j<rows.length;j++){
      const r=rows[j],s=sums[j],x=r.nx*r.ln-r.ny*r.lt,y=r.ny*r.ln+r.nx*r.lt,
        ja=r.ni*r.ln-r.ri*r.lt,jb=r.nj*r.ln-r.rj*r.lt,q=input.duration-(k+.5)*h;
      s.x+=x;s.y+=y;s.qx+=q*x;s.qy+=q*y;s.ja+=ja;s.jb+=jb;s.qa+=q*ja;s.qb+=q*jb;s.normal+=r.ln;s.tangent+=r.lt;s.dose+=Math.hypot(r.ln,r.lt);
      maxCapacityExcess=Math.max(maxCapacityExcess,Math.hypot(r.ln,r.lt)-r.limit);
    }
    const foot=w.bodies[1].support.foot;
    if(k%Math.max(1,Math.floor(n/1024))===0||k===n-1)trace.push({t:(k+1)*h,force:rows.map(r=>({normal:r.ln/h,tangent:r.lt/h})),
      phases:w.joints.map((j:any)=>j.slipping),foot:{...foot.offset},material:w.joints.map((j:any)=>({...w.attachments.get(j).material}))});
  }
  const result={bodies:w.bodies.map((b:any,i:number)=>({mass:w.mass[i],inertia:w.inertia[i],pos:{...b.pos},vel:{...b.vel},facing:b.facing,spin:b.spin??0})),
    grips:w.joints.map((g:any,k:number)=>{const a=w.attachments.get(g),s=sums[k];return {material:{...a.material},legs:g.legs,hold:g.hold,slipping:g.slipping,
      point:w.graspPoint(g),impulse:{x:s.x,y:s.y},moment:{x:s.qx,y:s.qy},angularImpulse:[s.ja,s.jb],angularMoment:[s.qa,s.qb],
      dose:s.dose,normalImpulse:s.normal,tangentImpulse:s.tangent};}),footOffset:{...w.bodies[1].support.foot.offset},
    bodyWork:args[5].work.grasps-before.body,motorWork:args[5].supportMotorWork[1]-before.motor,passiveWork:args[5].passiveGraspWork-before.passive},
    accounting={workResidual:w.kineticEnergy()-before.energy-result.bodyWork,
      angularResidual:w.bodies.reduce((s:number,b:any,i:number)=>s+w.mass[i]*(b.pos.x*b.vel.y-b.pos.y*b.vel.x)+w.inertia[i]*(b.spin??0),0)-before.angular,
      maxCapacityExcess,groundImpulse:args[5].groundImpulse,groundYawImpulse:args[5].groundYawImpulse,contactWork:args[5].work.contacts,
      state:w.bodies.map((b:any)=>b.support.state),phases:[...new Set(trace.map(t=>JSON.stringify(t.phases)))],
      sharedFootIdentity:w.joints.every((j:any)=>w.attachments.get(j).foot===w.bodies[1].support.foot)};
  return {id:v.id,input,result,accounting,trace,packetSha256:sha(bytes)};
}
const norm=(x:any,y:any)=>Math.hypot(x.x-y.x,x.y-y.y);
function difference(x:any,y:any){return Math.max(...x.bodies.flatMap((b:any,i:number)=>[norm(b.pos,y.bodies[i].pos)/5e-7,norm(b.vel,y.bodies[i].vel)/2.5e-5,
  Math.abs(b.facing-y.bodies[i].facing)/2.5e-6,Math.abs(b.spin-y.bodies[i].spin)/2.5e-4]),
  ...x.grips.flatMap((g:any,i:number)=>[norm(g.material,y.grips[i].material)/5e-7,norm(g.point,y.grips[i].point)/5e-7,Math.abs(g.legs-y.grips[i].legs)/1e-6,
    Math.abs(g.hold-y.grips[i].hold)/5e-7,norm(g.impulse,y.grips[i].impulse)/.002,norm(g.moment,y.grips[i].moment)/.00005,
    ...g.angularImpulse.map((v:number,k:number)=>Math.abs(v-y.grips[i].angularImpulse[k])/.0005),
    ...g.angularMoment.map((v:number,k:number)=>Math.abs(v-y.grips[i].angularMoment[k])/.000005)]),
  norm(x.footOffset,y.footOffset)/5e-7,...['bodyWork','motorWork','passiveWork'].map(k=>Math.abs(x[k]-y[k])/.01));}
const prototype:any=World.prototype,feet=prototype.feet,cases:any[]=[];
try{
  prototype.feet=prescribeSharedSupport(feet);
  const selected=process.argv.includes('--fresh')?[[1,false,'distinct'],[1,false,'unequal']] as const:[[1,false,'base'],[-1,false,'base'],[1,true,'base']] as const;
  for(const [side,single,variant] of selected){
    const start=performance.now(),a=run(side,single,coarseCount,variant),b=run(side,single,fineCount,variant),error=difference(a.result,b.result),
      physical=[a,b].every(v=>Math.abs(v.accounting.workResidual)<1e-8&&Math.abs(v.accounting.angularResidual)<1e-7&&v.result.passiveWork<=1e-7
        &&v.accounting.maxCapacityExcess<1e-9&&v.accounting.groundImpulse.every((g:any)=>Math.hypot(g.x,g.y)===0)
        &&v.accounting.groundYawImpulse.every((g:number)=>g===0)&&v.accounting.contactWork===0&&v.accounting.state.every((s:string)=>s==='up')&&v.accounting.sharedFootIdentity),
      converged=error<=1/16;
    writeFileSync(`${root}/${b.id}-reference-${coarseCount}-${fineCount}.json`,JSON.stringify({coarse:a,fine:b,error,physical,converged}));
    cases.push({id:b.id,input:b.input,reference:b.result,accounting:b.accounting,packetSha256:b.packetSha256,physical,convergence:{coarse:coarseCount,fine:fineCount,error,converged}});
    console.log(JSON.stringify({id:b.id,physical,converged,error,seconds:(performance.now()-start)/1000,phases:b.accounting.phases}));
  }
}finally{prototype.feet=feet;}
const result={source,commit,baseline,flags,collectorSha256:sha(readFileSync(import.meta.filename)),helperSha256:sha(readFileSync(new URL('./grip-shared-fixtures.ts',import.meta.url))),
  scope:'Existing grip-fast mirrored three-body shared-foot graph; active hand row removed, prescribed existing support mobility with zero desired command, free ground, one tiny acquisition step followed by a frozen plan. Same player profiles and allocated structural capacities. Single-grip opposing control removes the second holder.',cases};
writeFileSync(`${root}/reference-${process.argv.includes('--fresh')?'fresh-':''}${coarseCount}-${fineCount}.json`,JSON.stringify(result,null,2)+'\n');
if(cases.some(c=>!c.physical||!c.convergence.converged))process.exitCode=2;
else if(process.argv.includes('--write-fixture'))writeFileSync(`config/grip-shared-${process.argv.includes('--fresh')?'fresh-':''}reference.json`,JSON.stringify(result,null,2)+'\n');
