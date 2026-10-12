/** Source-pinned loaded-grip diagnosis. No production imports install hooks.
 * The command installs/restores read-only observers, records native 20 Hz
 * decisions, then replays one tape at four local resolutions. Traces stay out/.
 * node --import tsx scripts/diag/tackle/grip-refinement.ts [--out out/grip-refinement]
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { gunzipSync, gzipSync } from 'node:zlib';
import { followAccel, type Body } from '../../../src/physics/kinematics.js';
import { advanceRecovery, baseRadiusAt, omega0, supportParams } from '../../../src/physics/support.js';
import { integrateFilteredFollow } from '../../../src/physics/filtered-follow.js';
import { World, type GraspJoint, type Intent } from '../../../src/physics/world.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import { sourceVersion } from '../../source-version.js';
import { rep, type Cell } from './panel.js';
import { advanceRecoveryPhase } from './recovery-phase.js';
import {coupledRecoveryInterval,prepareContinuedRecovery,updateContinuedRecovery} from './continued-recovery-world.js';

export const PIN = 'f14d849a51e031087a1971e5cc83db6146c4c5cebc17d4df2b6feb549e5106cb';
export const STEPS = [12,24,48,96];
export const CASES = [{ angle:180, speed:6, mode:'center' as const }, { angle:45, speed:8, mode:'patch' as const }];
type Private = any; // Inspection of existing private scratch; never a production API.
const clone = <T>(v:T):T => structuredClone(v);
export const digest = (v:unknown) => createHash('sha256').update(JSON.stringify(v,(_k,x)=>
  typeof x==='number'&&!Number.isFinite(x)?{nonfinite:String(x)}:x instanceof Map?[...x]:x instanceof Set?[...x]:x)).digest('hex');
const pose=(b:Body)=>({pos:clone(b.pos),vel:clone(b.vel),spin:b.spin??0,facing:b.facing,energy:b.energy,
  support:clone(b.support),inertia:supportParams(b.profile).yawInertia});
function spec(j:GraspJoint,ids:number[],w:World){const {a,b,...p}=j;return {...clone(p),a:ids.indexOf(w.indexOf(a)),b:ids.indexOf(w.indexOf(b))};}
interface Frame { t:number; dt:number; intents:Intent[]; bodies:Body[]; grips:Array<Record<string,any>>; rng:unknown; pending:Array<Record<string,any>> }
export interface Capture { result:unknown; endpoint:string; frames:Frame[]; trace:any[]; decisions:string; profiles:string; }
interface Scope { world:World|null; ids:number[]; trace:any[]; tick:number; bucket:any; rows:any[]; variant?:string; forced?:number; correcting?:boolean; deferred?:any[][]; solving?:boolean; }
let scope:Scope|null=null;

/** Snapshot at achieved substep boundaries; callbacks do not draw RNG or ask
 * any controller for another decision. Intermediate row values are copied. */
function snapshots(w:Private){return scope!.ids.map(i=>pose(w.bodies[i]));}
function gripSnapshot(w:Private,j:GraspJoint){
  const point=w.graspPoint(j),rv=w.graspVelocity(j),at=w.attachments.get(j);
  return {point:clone(point),linearMotorRelativeVelocity:clone(rv),material:clone(at?.material),
    jacobian:clone(w.graspJacobian(j)),legs:j.legs,hold:j.hold,reach:j.reach,pull:j.pull,capacity:j.capacity,
    slipping:!!j.slipping,broken:!!j.broken};
}
function applicable(w:World){return scope?.world===w;}
function recoveryInput(w:Private,i:number,h:number,unheld=false){
  const b=w.bodies[i],sup=b.support,sp=w.sp[i],foot=sup.foot;if(!foot&&!unheld)return null;
  const rate=omega0(sp,sup.posture),kg=1-Math.exp(-h/.04),mean=.04/h*kg,acc=sup.accel??{x:0,y:0};
  const ux=(b.vel.x-w.v0x[i])/h,uy=(b.vel.y-w.v0y[i])/h;
  const mx=ux+(acc.x-ux)*mean,my=uy+(acc.y-uy)*mean;
  let f=followAccel(b,{x:mx,y:my},w.cut[i],Math.max(w.alpha[i],.1)*1.1);
  if(w.supportIntegration==='integrated'){const z=integrateFilteredFollow(b,acc,{x:ux,y:uy},.04,h,w.cut[i],Math.max(w.alpha[i],.1)*1.1);f={x:z.integral.x/h,y:z.integral.y/h};}
  const tip=sup.tipAccel??{x:0,y:0};let dx=(mx-f.x)*h/rate,dy=(my-f.y)*h/rate;
  dx+=(w.tipX[i]/h+(tip.x-w.tipX[i]/h)*mean)*h/rate+w.tripX[i]/rate;
  dy+=(w.tipY[i]/h+(tip.y-w.tipY[i]/h)*mean)*h/rate+w.tripY[i]/rate;
  const speed=Math.hypot(b.vel.x,b.vel.y),cap=b.profile.vmax*w.fat[i]*1.05;
  if(speed>cap){dx+=b.vel.x/speed*(speed-cap)*h;dy+=b.vel.y/speed*(speed-cap)*h;}
  const x=sup.xi.x+.5*dx,y=sup.xi.y+.5*dy,e=Math.hypot(x,y),nx=e>1e-12?x/e:1,ny=e>1e-12?y/e:0;
  const vx=foot?foot.achieved.x-foot.desired.x:0,vy=foot?foot.achieved.y-foot.desired.y:0;
  const input={e,rb:baseRadiusAt(sp,sup.posture),w:rate,speed:w.recovery[i],outsideFor:sup.out,latency:.12,h,loadVelocity:vx*nx+vy*ny};
  const result=advanceRecovery(input.e,input.rb,input.w,input.speed,input.outsideFor,input.latency,h,input.loadVelocity);
  let xx=e>1e-12?x*result.next/e:nx*result.next,yy=e>1e-12?y*result.next/e:ny*result.next;
  xx-=(vx-input.loadVelocity*nx)*result.weight;yy-=(vy-input.loadVelocity*ny)*result.weight;
  return {input,result,predicted:{x:xx+.5*dx,y:yy+.5*dy},normal:{x:nx,y:ny},deficit:{x:vx,y:vy},
    achieved:foot?clone(foot.achieved):null,requested:foot?clone(foot.desired):null,delta:{x:dx,y:dy}};
}
function install(){
  const p=World.prototype as Private, saved=new Map<string,any>();
  const hook=(name:string,fn:(w:Private,original:any,args:any[])=>any)=>{const original=p[name];saved.set(name,original);p[name]=function(...args:any[]){return applicable(this)?fn(this,original,args):original.apply(this,args)};};
  hook('integrateSubstep',(w,f,args)=>{
    if(scope!.variant==='continued-recovery'&&!scope!.solving){
      const original=scope!.world;let finalBucket:any;
      scope!.solving=true;
      try{
        const coupling=coupledRecoveryInterval(w,args,(trial,ta)=>{
          scope!.world=trial;
          const count=scope!.trace.length;
          p.integrateSubstep.apply(trial,ta);
          finalBucket=scope!.trace.length>count?scope!.trace.pop():undefined;
        });
        if(finalBucket){finalBucket.coupling=coupling;scope!.trace.push(finalBucket);}
      }finally{scope!.world=original;scope!.solving=false;}
      return;
    }
    const [ids,,,h]=args;if(!ids.some((i:number)=>scope!.ids.includes(i)))return f.apply(w,args);
    const report=args[5],before=scope!.ids.map(i=>report.groundYawImpulse[i]);
    const bucket={t:w.time,h,tick:scope!.tick,start:snapshots(w),gripsStart:w.joints.filter((j:any)=>j.kind==='grasp').map((j:GraspJoint)=>gripSnapshot(w,j)),
      reel:{x:0,y:0,angularA:0,angularB:0,work:0,armWork:0},passive:{x:0,y:0,angularA:0,angularB:0,work:0},torso:{normal:0,tangent:0,angularA:0,angularB:0},rows:[] as any[],supportUpdates:[] as any[],events:[] as any[]};
    scope!.bucket=bucket;scope!.rows=[];scope!.deferred=[];
    const r=f.apply(w,args);
    for(const deferred of scope!.deferred){
      if(scope!.variant==='continued-recovery'&&deferred[0].state!=='up')continue;
      // The last launch interval has now physically completed. Use the
      // achieved boundary, not its start, for both state and timestamp.
      bucket.events.push({kind:'fall',t:w.time,i:deferred[4],cause:'dive',suppressed:false});
      saved.get('startFall').apply(w,deferred);
    }
    bucket.rows=scope!.rows.map(({row,atRow})=>({normal:row.ln,tangent:row.lt,reel:row.reel,limit:row.limit,nx:row.nx,ny:row.ny,
      normalMomentA:row.ni??0,normalMomentB:row.nj??0,tangentArmA:row.ri??0,tangentArmB:row.rj??0,
      deliveredAngularA:(row.ni??0)*(row.ln-row.reel)-(row.ri??0)*row.lt,
      deliveredAngularB:(row.nj??0)*(row.ln-row.reel)-(row.rj??0)*row.lt,atRow}));
    Object.assign(bucket,{end:snapshots(w),gripsEnd:w.joints.filter((j:any)=>j.kind==='grasp').map((j:GraspJoint)=>gripSnapshot(w,j)),groundYaw:scope!.ids.map((i,k)=>report.groundYawImpulse[i]-before[k])});
    scope!.trace.push(bucket);scope!.bucket=null;return r;
  });
  hook('jointRows',(w,f,args)=>{const rs=f.apply(w,args);if(scope!.bucket)for(const row of rs){if(row.joint.kind!=='grasp')continue;
    const rv=w.graspVelocity(row.joint),a=row.joint.a,b=row.joint.b;
    // Rows already include angular arms in their actual solver velocity.
    const solverRelativeVelocity={normal:rv.x*row.nx+rv.y*row.ny+(row.ni??0)*(a.spin??0)+(row.nj??0)*(b.spin??0),
      tangent:rv.x*-row.ny+rv.y*row.nx-(row.ri??0)*(a.spin??0)-(row.rj??0)*(b.spin??0)};
    const atRow={grip:gripSnapshot(w,row.joint),bodies:snapshots(w),solverRelativeVelocity};scope!.rows.push({row,atRow});
  }return rs;});
  hook('supportImpulse',(w,f,args)=>{const [j,x,y,,active]=args, report=w.report;
    const before=report.work.grasps,arm=report.armWork[w.indexOf(j.a)],fraction=f.apply(w,args);
    if(scope!.bucket){const v=scope!.bucket[active?'reel':'passive'];v.x+=x*fraction;v.y+=y*fraction;
      v.angularA+=(args[6]??0)*fraction;v.angularB+=(args[7]??0)*fraction;v.work+=report.work.grasps-before;
      if(active)v.armWork+=report.armWork[w.indexOf(j.a)]-arm;}
    return fraction;});
  hook('pairImpulse',(w,f,args)=>{const [i,,,y,,kind,active]=args,report=w.report;
    const before=report.work.grasps,arm=report.armWork[i],fraction=f.apply(w,args);
    if(scope!.bucket&&kind==='grasps'){const v=scope!.bucket[active?'reel':'passive'];v.x+=args[2]*fraction;v.y+=y*fraction;
      v.angularA+=(args[8]??0)*fraction;v.angularB+=(args[9]??0)*fraction;v.work+=report.work.grasps-before;
      if(active)v.armWork+=report.armWork[i]-arm;}
    return fraction;});
  hook('solveContact',(w,f,args)=>{const c=args[0],ln=c.ln,lt=c.lt,r=f.apply(w,args);
    if(scope!.bucket){const v=scope!.bucket.torso,dn=c.ln-ln,dt=c.lt-lt;v.normal+=dn;v.tangent+=dt;
      v.angularA+=(c.ni??0)*dn-c.ri*dt;v.angularB+=(c.nj??0)*dn-c.rj*dt;}return r;});
  hook('prepareRecovery',(w,f,args)=>{
    const speed=f.apply(w,args);
    if(scope!.variant==='continued-recovery')prepareContinuedRecovery(w,args[0],args[1],speed,args[2]);
    return speed;
  });
  hook('updateSupport',(w,f,args)=>{const [i,h]=args,b=w.bodies[i],before=pose(b),phase=recoveryInput(w,i,h,scope!.variant?.includes('phase')||scope!.variant==='continued-recovery');
    if(scope!.variant==='no-balance')return; // Explicit diagnostic ablation only.
    const peak=b.support.peak;
    scope!.correcting=(scope!.variant==='achieved-support'||scope!.variant?.includes('phase')||scope!.variant==='continued-recovery')&&!!phase;
    const r=f.apply(w,args);
    scope!.correcting=false;
    if(phase&&Math.hypot(b.support.xi.x-phase.predicted.x,b.support.xi.y-phase.predicted.y)>1e-11)throw Error('Recovery input reconstruction mismatch');
    if(phase&&scope!.variant==='achieved-support'){
      // Diagnostic-only proposal. Balance uses the same physically achieved
      // corrective velocity as the held material point, rather than an
      // independent free recovery plus only the grip-induced difference.
      const a=phase.input,n=phase.normal,u=phase.achieved,radial=u.x*n.x+u.y*n.y;
      const next=advanceRecovery(a.e,a.rb,a.w,0,a.outsideFor,a.latency,h,radial);
      const actualX=u.x-radial*n.x,actualY=u.y-radial*n.y;
      const oldX=phase.deficit.x-a.loadVelocity*n.x,oldY=phase.deficit.y-a.loadVelocity*n.y;
      b.support.xi={x:phase.predicted.x+n.x*(next.next-phase.result.next)-actualX*next.weight+oldX*phase.result.weight,
        y:phase.predicted.y+n.y*(next.next-phase.result.next)-actualY*next.weight+oldY*phase.result.weight};
      const e=Math.hypot(b.support.xi.x,b.support.xi.y),crit=a.rb+w.sp[i].stepSpeed*w.fat[i]/a.w;
      b.support.out=e>a.rb?a.outsideFor+h:0;b.support.peak=Math.max(peak,e/crit);
      if(e>crit&&e>a.rb+1e-6){const causes=b.support.causes;const cause=causes.legs>=causes.contact&&causes.legs>=causes.overspeed?'legs':causes.overspeed>causes.contact?'overspeed':'contact';
        w.startFall(b.support,{x:b.support.xi.x/e,y:b.support.xi.y/e},cause,w.report,i);}
    }
    if(phase&&scope!.variant==='continued-recovery'){
      const flow=updateContinuedRecovery(w,i,h,before,phase);
      (phase as any).continued=flow;
      const e=Math.hypot(b.support.xi.x,b.support.xi.y),a=phase.input,crit=a.rb+w.sp[i].stepSpeed*w.fat[i]/a.w;
      b.support.peak=Math.max(peak,e/crit);
      if(e>crit&&e>a.rb+1e-6){const causes=b.support.causes;const cause=causes.legs>=causes.contact&&causes.legs>=causes.overspeed?'legs':causes.overspeed>causes.contact?'overspeed':'contact';
        w.startFall(b.support,{x:b.support.xi.x/e,y:b.support.xi.y/e},cause,w.report,i);}
    }
    if(phase&&scope!.variant?.includes('phase')){
      const a=phase.input;
      let n=phase.normal,load=a.loadVelocity,initial=a.e;
      let vx=phase.deficit.x,vy=phase.deficit.y;
      const continuous=scope!.variant==='phase-source';
      if(continuous){
        // Frozen continuous source, rather than two half-interval kicks.
        // This removes a crossing introduced before the event solver starts.
        // It retains free recovery plus force-induced deficit at zero load.
        const xi=before.support!.xi;initial=Math.hypot(xi.x,xi.y);
        n=initial>1e-12?{x:xi.x/initial,y:xi.y/initial}:phase.normal;
        vx-=phase.delta.x/h;vy-=phase.delta.y/h;load=vx*n.x+vy*n.y;
      }
      const candidateInput={...a,e:initial,loadVelocity:load};
      let next;
      try{next=advanceRecoveryPhase(candidateInput);}catch(error){
        throw new Error(JSON.stringify({time:w.time,body:i,variant:scope!.variant,candidateInput,
          before:before.support,phase,message:String(error)}));
      }
      const tx=vx-load*n.x,ty=vy-load*n.y;
      if(continuous)b.support.xi={x:n.x*next.next-tx*next.weight,y:n.y*next.next-ty*next.weight};
      else if(next.events.some(event=>event.kind==='exit-base'))b.support.xi=
        {x:phase.predicted.x+n.x*(next.next-phase.result.next)-tx*(next.weight-phase.result.weight),
          y:phase.predicted.y+n.y*(next.next-phase.result.next)-ty*(next.weight-phase.result.weight)};
      // Existing inward/ramp integration is already correct. Preserve its
      // exact arithmetic whenever no new outward crossing needs correction.
      const e=Math.hypot(b.support.xi.x,b.support.xi.y),crit=a.rb+w.sp[i].stepSpeed*w.fat[i]/a.w;
      b.support.out=Math.hypot(next.next*n.x-tx*next.weight,next.next*n.y-ty*next.weight)>a.rb?next.outsideFor:0;
      b.support.peak=Math.max(peak,e/crit);
      (phase as any).candidate={...next,initial,loadVelocity:load,normal:n,continuous};
      if(e>crit&&e>a.rb+1e-6){const causes=b.support.causes;const cause=causes.legs>=causes.contact&&causes.legs>=causes.overspeed?'legs':causes.overspeed>causes.contact?'overspeed':'contact';
        w.startFall(b.support,{x:b.support.xi.x/e,y:b.support.xi.y/e},cause,w.report,i);}
    }
    if(scope!.bucket&&scope!.ids.includes(i))scope!.bucket.supportUpdates.push({i,h,before,after:pose(b),recovery:w.recovery[i],phase,alpha:w.alpha[i],cut:w.cut[i],tip:{x:w.tipX[i]/h,y:w.tipY[i]/h},trip:{x:w.tripX[i],y:w.tripY[i]}});
    return r;});
  hook('startFall',(w,f,args)=>{
    if(args[2]==='dive'&&(scope!.variant==='phase-timing'||scope!.variant==='phase-source'||scope!.variant==='continued-recovery')){
      scope!.deferred!.push([...args]);
      scope!.bucket?.events.push({kind:'dive-request',t:w.time,i:args[4],cause:'dive',suppressed:true});return;
    }
    scope!.bucket?.events.push({kind:'fall',t:w.time,i:args[4],cause:args[2],suppressed:(scope!.variant==='support-no-fall'||scope!.correcting)&&args[2]!=='dive'});
    if((scope!.variant==='support-no-fall'||scope!.correcting)&&args[2]!=='dive')return;
    return f.apply(w,args);
  });
  hook('solveGrasp',(w,f,args)=>{const result=f.apply(w,args);if(scope!.variant==='extra-iterations')for(let k=0;k<3;k++)f.apply(w,args);return result;});
  // No-grip control keeps the same partition for otherwise alone bodies,
  // reusing one 20 Hz gait plan. It is explicitly a diagnostic adapter.
  hook('substep',(w,f,args)=>{if(scope!.forced&&args[7]===false&&Math.abs(args[3]-.05)<1e-9){
    const n=scope!.forced,h=args[3]/n;for(let k=0;k<n;k++){const a=[...args];a[3]=h;a[4]=args[4]-k*h;f.apply(w,a);}return;
  }return f.apply(w,args);});
  return ()=>{for(const [name,f]of saved)p[name]=f;scope=null;};
}

/** Scoped lab adapter for independent controls. Always restore World hooks;
 * nesting is unsupported because observers must never leak into production. */
export function withRecoveryExperiment<T>(world:World,variant:string,action:()=>T){
  if(scope)throw Error('Recovery experiments cannot nest');
  const trace:any[]=[],restore=install();
  scope={world,ids:world.bodies.map((_b,i)=>i),trace,tick:0,bucket:null,rows:[],variant};
  try{return {result:action(),trace};}finally{restore();}
}

export function native(cell:Cell,mode:'center'|'patch',side:1|-1,n:number,observe=true,variant='full'):Capture{
  const restore=install(),tick=(PlaySim.prototype as Private).tick,step=World.prototype.step;
  const frames:Frame[]=[],trace:any[]=[];let sim:Private;
  (PlaySim.prototype as Private).tick=function(){sim=this;return tick.call(this)};
  World.prototype.step=function(intents,dt){if(this===sim?.world){
    const c=sim.slot('RB'),d=sim.defense.find((a:Private)=>a.slot==='MLB'||a.slot.startsWith('LB')),ids=[d.idx,c.idx];
    scope={world:observe?this:null,ids,trace,tick:frames.length,bucket:null,rows:[],variant};
    frames.push({t:this.time,dt,intents:clone(ids.map(i=>intents[i]!)),bodies:clone(ids.map(i=>this.bodies[i])),
      grips:this.joints.filter(j=>j.kind==='grasp').map(j=>spec(j as GraspJoint,ids,this)),rng:clone(sim.rng),
      pending:(this as Private).pending.map((p:Private)=>({a:ids.indexOf(this.indexOf(p.a)),b:ids.indexOf(this.indexOf(p.b)),x:p.x,y:p.y,height:p.height}))});
  }return step.call(this,intents,dt)};
  try{const result=rep(cell,side,3001,{handContact:mode,substeps:n});
    return {result,trace,frames,decisions:digest(frames.map(({bodies,...f})=>f)),profiles:digest(frames[0].bodies.map(b=>b.profile)),
      endpoint:digest({result,bodies:sim.agents.map((a:Private)=>a.body),intents:sim.intents,minds:sim.agents.map((a:Private)=>a.mind),rng:sim.rng,events:sim.events})};
  }finally{World.prototype.step=step;(PlaySim.prototype as Private).tick=tick;restore();}
}

export function replay(tape:Frame[],mode:'center'|'patch',n:number,variant='full',fromGrip=false){
  const first=fromGrip?tape.findIndex(f=>f.grips.length>0):0,frames=tape.slice(first);
  const bodies=clone(frames[0].bodies),w=new World(bodies,{handContact:mode,substeps:n,
    supportIntegration:variant==='integrated-follow'?'integrated':'mean'});w.time=frames[0].t;
  // Constructor deliberately discards experimental feet; acquisition inputs
  // here have no prior held foot. Refuse silent loss in later checkpoint reuse.
  if(frames[0].bodies.some(b=>b.support?.foot))throw Error('Replay checkpoint has an existing foot; capture its attachment first');
  const trace:any[]=[],restore=install();scope={world:w,ids:[0,1],trace,tick:0,bucket:null,rows:[],variant,forced:n};
  let live:GraspJoint|null=null,wasPresent=false;const reports:any[]=[];
  try{for(let k=0;k<frames.length;k++){
    const frame=frames[k];scope!.tick=k;
    const g=frame.grips[0];
    if(g&&(!wasPresent)){const {a,b,...p}=g;live={...clone(p),a:bodies[a],b:bodies[b]} as GraspJoint;
    if(variant==='passive'||variant==='passive-no-balance')live.pull=0;
      if(variant!=='no-grip')w.joints.push(live);
    }
    if(!g&&wasPresent){w.joints=[];live=null;}
    wasPresent=!!g;
    if(g&&live)live.capacity=g.capacity; // Recorded controller update; hold/legs remain achieved physics.
    for(const p of frame.pending)if(p.a>=0&&p.b>=0)w.strike(bodies[p.a],bodies[p.b],{x:p.x,y:p.y},p.height);
    let intents=clone(frame.intents);
    if(variant==='free'||variant==='passive-no-balance'||variant==='active-no-balance')intents=intents.map(()=>({vel:{x:0,y:0},free:true}));
    if(variant==='fixed-movement') {
      intents=clone(frames[0].intents);
      // A dive/strike is a one-shot request, not another launch every tick.
      if(k>0)for(const intent of intents){delete intent.dive;delete intent.lunge;}
    }
    if(variant==='no-launch')for(const intent of intents){delete intent.dive;delete intent.lunge;}
    if(variant==='no-balance'||variant==='passive-no-balance'||variant==='active-no-balance')scope!.variant='no-balance';
    const r=w.step(intents,frame.dt);reports.push({t:w.time,poses:bodies.map(pose),work:clone(r.work),armWork:clone(r.armWork),armLimit:clone(r.armWorkLimit),supportWork:clone(r.supportMotorWork),supportLimit:clone(r.supportMotorWorkLimit),passive:r.passiveGraspWork,falls:clone(r.falls),downs:clone(r.downs)});
  }
  return {trace,reports,initial:digest(frames[0].bodies),decisions:digest(frames.map(({bodies,...f})=>f)),profiles:digest(bodies.map(b=>b.profile)),start:frames[0].t,variant,n};
  }catch(error){
    Object.assign(error as object,{diagnostic:{trace,reports,initial:digest(frames[0].bodies),
      decisions:digest(frames.map(({bodies,...f})=>f)),profiles:digest(bodies.map(b=>b.profile)),start:frames[0].t,variant,n}});
    throw error;
  }finally{restore();}
}

function main(){
  const i=process.argv.indexOf('--out'),out=i>=0?process.argv[i+1]:'out/grip-refinement';mkdirSync(out,{recursive:true});
  const source=sourceVersion();if(source!==PIN)throw Error(`Source mismatch: ${source}`);
  const manifest:any={source,collector:createHash('sha256').update(readFileSync(import.meta.filename)).digest('hex'),native:[],replays:[]};
  const save=(name:string,data:any)=>{const path=join(out,name+'.gz'),json=JSON.stringify(data,(_k,x)=>typeof x==='number'&&!Number.isFinite(x)?{nonfinite:String(x)}:x);
    const bytes=gzipSync(json,{level:1});writeFileSync(path,bytes);return {path,sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length};};
  const proposal=process.argv.indexOf('--proposal-from');
  if(proposal>=0){
    const root=process.argv[proposal+1];
    const read=(path:string)=>JSON.parse(gunzipSync(readFileSync(path)).toString(),(_k,v)=>v?.nonfinite?Number(v.nonfinite):v);
    if(read(join(root,'manifest.json.gz')).source!==source)throw Error('Proposal input source mismatch');
    for(const c of CASES)for(const side of [1,-1] as const){
      const capture=read(join(root,`native-${c.mode}-${side}-96.json.gz`));
      for(const n of STEPS){const result=replay(capture.frames,c.mode,n,'achieved-support',true);
        const file=save(`proposal-${c.mode}-${side}-${n}.json`,result);
        manifest.replays.push({...c,side,n,variant:'achieved-support',file,initial:result.initial,decisions:result.decisions});}
    }
    if(sourceVersion()!==source)throw Error('Source changed');save('manifest.json',manifest);
    console.log(JSON.stringify({source,replays:manifest.replays.length,out,diagnosticOnly:true}));return;
  }
  for(const c of CASES)for(const side of [1,-1] as const){
    const cell={angle:c.angle,speed:c.speed,cut:false,difficulty:'difficult' as const};const captures=new Map<number,Capture>();
    for(const n of STEPS){const observed=native(cell,c.mode,side,n),control=native(cell,c.mode,side,n,false);
      if(observed.endpoint!==control.endpoint||observed.decisions!==control.decisions)throw Error('Observer changed native execution');captures.set(n,observed);
      const file=save(`native-${c.mode}-${side}-${n}.json`,observed);manifest.native.push({...c,side,n,file,endpoint:observed.endpoint,decisions:observed.decisions,result:observed.result});
    }
    const tape=captures.get(96)!.frames;
    for(const variant of ['full','no-grip','passive','no-balance','passive-no-balance','active-no-balance','support-no-fall','fixed-movement','free','integrated-follow','no-launch','extra-iterations'])for(const n of STEPS){
      const result=replay(tape,c.mode,n,variant,true),file=save(`replay-${c.mode}-${side}-${variant}-${n}.json`,result);manifest.replays.push({...c,side,n,variant,file,initial:result.initial,decisions:result.decisions});
    }
  }
  if(sourceVersion()!==source)throw Error('Source changed');save('manifest.json',manifest);console.log(JSON.stringify({source,native:manifest.native.length,replays:manifest.replays.length,out}));
}
if(import.meta.url===`file://${process.argv[1]}`)main();
