/** Read-only observer and matched one-tick probes. Uses the frozen ebff controllers+root physics stage. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { gunzipSync, gzipSync } from 'node:zlib';
const root=resolve('out/engaged-zone/final'), output=resolve('out/zone-climb/physics-audit.json');
const mod=async(p:string)=>import(pathToFileURL(join(root,p+'.ts')).href);
const [{Rng},{generateTeam,pickOffense,pickDefense},{RUN_BY_ID},{COVERAGE_BY_ID,FRONT_BY_ID},{FORMATION_BY_ID},
 {PlaySim},{playSideSign},{World},{supportParams,baseRadiusAt,newSupport,availability},
 {effectiveVmax,fatigueFactor,turnRateOf,locomotionAccel},{integrateYaw},{angleDiff},{CENTER_Y}]=await Promise.all([
 'src/core/rng','src/league/team','src/playbook/concepts','src/playbook/defense','src/playbook/formations',
 'src/sim/playsim','src/sim/behaviors/blocking','src/physics/world','src/physics/support',
 'src/physics/kinematics','src/physics/yaw-response','src/core/vec','src/core/field'].map(mod));
const hash=(x:any)=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const files=(dir:string):string[]=>readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(join(dir,e.name)):[join(dir,e.name)]);
const source=()=>{const h=createHash('sha256');for(const p of files(join(root,'src')).sort())h.update(relative(root,p)).update('\0').update(readFileSync(p)).update('\0');return h.digest('hex');};
const sourceBefore=source();assert.equal(sourceBefore,'036b15a95676343740643f27f2e2f6dffee0882a557e19a34d941bb3a00ee38d');
const input={rosters:[[31,32],[41,42]],fronts:['over','under'],flips:[false,true],seed:3,limit:1.8,late:[.9,1.6],dt:.05};
const mean=(xs:number[])=>xs.length?xs.reduce((a,b)=>a+b,0)/xs.length:null;
const quant=(xs:number[],q:number)=>{const s=xs.slice().sort((a,b)=>a-b);return s.length?s[Math.floor(q*(s.length-1))]:null;};
const signature=(sim:any)=>hash({t:sim.t,phase:sim.phase,events:sim.events,bodies:sim.agents.map((a:any)=>a.body),
 intents:sim.intents,minds:sim.agents.map((a:any)=>a.mind),rng:sim.rng,engagements:sim.engagements.map((e:any)=>({
 blocker:e.blocker.idx,defender:e.defender.idx,helpers:e.helpers.map((a:any)=>a.idx),control:e.control,phi:e.phi,
 drive:e.drive,surfaceAxis:e.surfaceAxis,hands:e.hands}))});
function make(o:number,d:number,front:string,flip:boolean,mode:string){return new PlaySim({
 offense:pickOffense(generateTeam(new Rng(o),'O','O',{strength:.55}),FORMATION_BY_ID.ace_11.personnel),
 defense:pickDefense(generateTeam(new Rng(d),'D','D',{strength:.55}),'base43'),
 offCall:{formation:FORMATION_BY_ID.ace_11,flip,kind:'run',run:RUN_BY_ID.wz_strong,label:'wz_strong'},
 defCall:{personnel:'base43',front:FRONT_BY_ID[front],coverage:COVERAGE_BY_ID.cover3,pressure:null,label:front},
 los:40,ballY:CENTER_Y,firstDownX:50,seed:3,handContact:mode});}
const observed:any[]=[],plays:any[]=[],witnesses:any[]=[];let maxYawError=0;
function observeFeet(w:any,rows:any[]){const original=w.feet.bind(w);
 w.feet=(i:number,intent:any,plan:any,h:number,remaining:number,r:any)=>{
  const b=w.bodies[i],sp=supportParams(b.profile),gi={...r.groundImpulse[i]},gy=r.groundYawImpulse[i];
  const initial={facing:b.facing,spin:b.spin??0,vel:{...b.vel},support:structuredClone(b.support)}, rate=turnRateOf(b);
  original(i,intent,plan,h,remaining,r);
  const force={x:(r.groundImpulse[i].x-gi.x)/h,y:(r.groundImpulse[i].y-gi.y)/h},mag=Math.hypot(force.x,force.y),a=w.alpha[i];
  const radius=baseRadiusAt(sp,b.support.posture),torque=(r.groundYawImpulse[i]-gy)/h;
  let peakTorque=Math.abs(torque);
  if(w.handContact==='patch'&&initial.support.state==='up'&&!plan.free&&!plan.dive){
   const bound=Math.min(rate/.05*(.3+.7*a),Math.sqrt(Math.max(0,(sp.traction*a)**2-mag**2))*radius/sp.yawInertia);
   const yaw=integrateYaw(angleDiff(initial.facing,plan.facing),initial.spin,h,.05,bound,rate);
   maxYawError=Math.max(maxYawError,Math.abs(yaw.spin-(b.spin??0)),Math.abs(initial.facing+yaw.angleDelta-b.facing));
   peakTorque=sp.yawInertia*yaw.maxAcceleration;
  }
  rows.push({i,h,force,meanTorque:torque,peakTorque,available:a,leanBefore:initial.support.lean,leanAfter:{...b.support.lean},
   planned:{x:plan.ax,y:plan.ay},meanUse:a>0?Math.hypot(mag,torque/radius)/(sp.traction*a):null,
   peakUse:a>0?Math.hypot(mag,peakTorque/radius)/(sp.traction*a):null,recovery:w.recovery[i],xi:{...b.support.xi}});
 };
}
for(const mode of ['center','patch']){
 const frozen=JSON.parse(gunzipSync(readFileSync('out/engaged-zone/final-'+mode+'.json.traces.gz')).toString());
 for(const [o,d]of input.rosters)for(const front of input.fronts)for(const flip of input.flips){
  const sim=make(o,d,front,flip,mode),side=playSideSign(sim,RUN_BY_ID.wz_strong),w=sim.world;
  const rows:any[]=[],jointRows:any[]=[];observeFeet(w,rows);const step=w.step.bind(w),plans:any[]=[];const origPlan=w.plan.bind(w);
  const originalRows=w.jointRows.bind(w);w.jointRows=(h:number)=>{const rs=originalRows(h);for(const row of rs)jointRows.push({row,h});return rs;};
  w.plan=(b:any,i:number,c:any,dt:number)=>{const initial=structuredClone(b),result=origPlan(b,i,c,dt);plans.push({i,initial,plan:{...result}});return result;};
  w.step=(commands:any[],dt:number)=>{
   rows.length=0;plans.length=0;jointRows.length=0;const time=sim.t, pairs=sim.engagements.filter((e:any)=>e.type==='run'&&['LT','LG','C','RG','RT'].includes(e.blocker.slot));
   const snapshots=pairs.map((e:any)=>({e,a:structuredClone(e.blocker.body),b:structuredClone(e.defender.body),
    ca:structuredClone(commands[e.blocker.idx]),cb:structuredClone(commands[e.defender.idx]),
    hand:e.hands?Object.fromEntries(Object.entries(e.hands).filter(([k])=>!['a','b','actor','holder'].includes(k))):null,
    actor:e.hands?.actor===e.defender.body?'b':'a',holder:e.hands?.holder===e.defender.body?'b':'a'}));
   const r=step(commands,dt);assert(Math.abs(r.work.residual)<1e-6);
   for(const s of snapshots){const e=s.e;
    if(o===31&&e.blocker.slot==='RG'&&((!flip&&front==='over'&&[.95,1.15].some(t=>Math.abs(time-t)<1e-8))||(flip&&front==='under'&&[.85,.90].some(t=>Math.abs(time-t)<1e-8))))
     witnesses.push({mode,o,d,front,flip,side,t:time,a:s.a,b:s.b,ca:s.ca,cb:s.cb,hand:s.hand,actor:s.actor,holder:s.holder});
    for(const [who,agent,b,c]of [['OL',e.blocker,s.a,s.ca],['DL',e.defender,s.b,s.cb]] as any){
     const p=plans.find(q=>q.i===agent.idx),f=rows.filter(q=>q.i===agent.idx),sp=supportParams(b.profile),v0=b.vel.y*side;
     const low=1-.12*Math.max(0,b.support.posture-.3),cap=effectiveVmax(b,Math.atan2(c.vel.y,c.vel.x),(c.effort??1)*low);
     const groundY=r.groundImpulse[agent.idx].y/dt/b.profile.massKg*side,achieved=(agent.body.vel.y-b.vel.y)/dt*side;
     const handY=jointRows.filter(q=>q.row.joint.kind==='hands'&&(q.row.i===agent.idx||q.row.j===agent.idx)).reduce((sum,q)=>{
      const row=q.row;return sum+(row.i===agent.idx?-1:1)*(row.ny*row.ln+row.nx*row.lt);},0)/dt/b.profile.massKg*side;
     observed.push({mode,o,d,front,flip,side,t:time+dt,blocker:e.blocker.slot,defender:e.defender.slot,helpers:e.helpers.map((h:any)=>h.slot),who,
      request:c,vy:v0,achievedVy:agent.body.vel.y*side,requestedVy:c.vel.y*side,desiredCap:cap,
      requestMagnitude:Math.hypot(c.vel.x,c.vel.y),planAy:p.plan.ay*side,groundAy:groundY,achievedAy:achieved,
      externalAy:achieved-groundY,handAy:handY,otherAy:achieved-groundY-handY,available:availability(b.support,sp,fatigueFactor(b.energy)),xi:b.support.xi,
      lean:b.support.lean,felt:b.support.felt,facing:b.facing,spin:b.spin??0,profile:b.profile,
      minAvailable:Math.min(...f.map(q=>q.available)),meanUse:mean(f.map(q=>q.meanUse).filter(x=>x!==null)),
      peakUse:Math.max(...f.map(q=>q.peakUse??0)),meanPeakUse:mean(f.map(q=>q.peakUse).filter(x=>x!==null)),
      substeps:f.length,peakBinding:f.filter(q=>q.peakUse>=.999999).length,
      groundOpposesPlan:groundY*p.plan.ay*side<0,
      leanForceY:mean(f.map(q=>q.force.y-p.plan.ay*b.profile.massKg)),
      contacts:r.contacts.filter((q:any)=>q.i===agent.idx||q.j===agent.idx).length});
    }
   }return r;
  };
  while(sim.phase==='live'&&sim.t<input.limit)sim.tick();
  const final=signature(sim),ref=frozen.plays.find((p:any)=>p.o===o&&p.front===front&&p.flip===flip);assert.equal(final,ref.final);
  plays.push({mode,o,d,front,flip,final,knownTraceParity:true});
 }
}
assert(maxYawError<1e-8);
const summaries=['center','patch'].flatMap(mode=>['OL','DL'].map(who=>{
 const rs=observed.filter(r=>r.mode===mode&&r.who===who&&r.t>=input.late[0]-1e-9&&r.t<=input.late[1]+1e-9),count=(fn:any)=>rs.filter(fn).length;
 return {mode,who,n:rs.length,requestedVy:{p10:quant(rs.map(r=>r.requestedVy),.1),p50:quant(rs.map(r=>r.requestedVy),.5),p90:quant(rs.map(r=>r.requestedVy),.9)},
  achievedVy:mean(rs.map(r=>r.achievedVy)),requestWrongSide:count((r:any)=>r.requestedVy<0),
  requestAboveCurrentBy1:count((r:any)=>r.requestedVy-r.vy>=1),requestAtLeast3:count((r:any)=>r.requestedVy>=3),
  magnitudeAboveCap:count((r:any)=>r.requestMagnitude>r.desiredCap+1e-9),plannedAyAtLeastPoint5:count((r:any)=>r.planAy>=.5),
  requestedAyPoint5ButAchievedBelowHalf:count((r:any)=>r.planAy>=.5&&r.achievedAy<.5*r.planAy),
  supportLimitedTicks:count((r:any)=>r.minAvailable<.999),groundOpposesPlan:count((r:any)=>r.groundOpposesPlan),
  meanMeanUse:mean(rs.map(r=>r.meanUse)),meanPeakUse:mean(rs.map(r=>r.meanPeakUse)),peakBindingTicks:count((r:any)=>r.peakBinding>0)};
}));
const probes:any[]=[];
function oneTick(initial:any[],commands:any[],mode:string,hand:any|null,substeps=12,observer=true){
 const bs=structuredClone(initial),w=new World(bs,{handContact:mode,substeps}),rows:any[]=[];
 if(hand){const {actor,holder,...data}=hand;w.joints.push({...data,a:bs[0],b:bs[1],actor:bs[actor==='b'?1:0],holder:bs[holder==='b'?1:0]});}
 if(observer)observeFeet(w,rows);
 const before=structuredClone(bs),r=w.step(structuredClone(commands),.05),after=structuredClone(bs);
 assert(Math.abs(r.work.residual)<1e-8);
 const px=bs.reduce((s:any,b:any)=>s+b.profile.massKg*b.vel.x,0)-before.reduce((s:any,b:any)=>s+b.profile.massKg*b.vel.x,0);
 const py=bs.reduce((s:any,b:any)=>s+b.profile.massKg*b.vel.y,0)-before.reduce((s:any,b:any)=>s+b.profile.massKg*b.vel.y,0);
 assert(Math.abs(px-r.groundImpulse.reduce((s:any,q:any)=>s+q.x,0))<1e-7);assert(Math.abs(py-r.groundImpulse.reduce((s:any,q:any)=>s+q.y,0))<1e-7);
 return {before,after,commands,ground:r.groundImpulse,groundYaw:r.groundYawImpulse,hands:w.joints.map((j:any)=>({normal:j.normalForce,tangent:j.tangentForce,forceOnB:j.forceOnB})),
  contacts:r.contacts,rows,work:r.work,signature:hash({bs,joints:w.joints,r})};
}
const reference=witnesses.find(w=>w.mode==='center'&&w.front==='over'&&Math.abs(w.t-1.15)<1e-8);assert(reference);
for(const mode of ['center','patch'])for(const spin of [0,.4])for(const facing of [0,Math.PI/2])for(const request of [1.3,5])for(const held of [false,true]){
 const a=structuredClone(reference.a);a.pos={x:0,y:0};a.vel={x:0,y:1/0.9144};a.energy=1;a.spin=spin;a.facing=facing;a.support=newSupport(.2);delete a.sprintLoad;delete a.squeeze;
 const b=structuredClone(a);b.pos={x:.9,y:0};
 const command={vel:{x:0,y:request},facing,push:0,posture:.2};
 const hand=held?{kind:'hands',extension:.9,push:0,hold:0,steer:2000,actor:'a',holder:'a'}:null;
 const r=oneTick([a,b],[command,command],mode,hand),plain=oneTick([a,b],[command,command],mode,hand,12,false);assert.equal(r.signature,plain.signature);
 const cap=Math.min(request,a.profile.vmax*(facing===0?a.profile.shuffle:1)),expected=(cap-1/0.9144)/a.profile.tau;
 if(spin===0){for(let i=0;i<2;i++)assert(Math.abs(r.ground[i].y/a.profile.massKg/.05-expected)<1e-10);
  assert(Math.abs(r.after[0].vel.y-r.after[1].vel.y)<1e-10);if(held)assert(Math.abs(r.hands[0].tangent)<1e-9);}
 probes.push({kind:'clean-equal',mode,spin,facing,request,held,expectedGroundAy:expected,...r});
}
for(const w of witnesses.filter(w=>w.mode==='center'))for(const mode of ['center','patch'])for(const hands of [false,true])for(const requests of ['native','equal-native-A','equal-max-lateral'])for(const lean of ['native','zero']){
 const bs=[structuredClone(w.a),structuredClone(w.b)],cs=[structuredClone(w.ca),structuredClone(w.cb)];
 if(requests==='equal-native-A')cs[1]={...cs[1],vel:{...cs[0].vel}};
 if(requests==='equal-max-lateral')for(const c of cs){c.vel={x:0,y:5*w.side};c.push=0;}
 if(lean==='zero')for(const b of bs)b.support.lean={x:0,y:0};
 const hand=hands?{...structuredClone(w.hand),actor:w.actor,holder:w.holder}:null;
 const r=oneTick(bs,cs,mode,hand),plain=oneTick(bs,cs,mode,hand,12,false);assert.equal(r.signature,plain.signature);
 probes.push({kind:'matched-native-pair',capture:{front:w.front,flip:w.flip,t:w.t,mode:w.mode,side:w.side},mode,held:hands,requests,lean,...r});
}
for(const w of witnesses.filter(w=>w.mode==='center'&&w.front==='over'&&w.t>1))for(const mode of ['center','patch'])for(const requests of ['native','max-lateral'])for(const lean of ['native','zero'])for(const which of ['a','b']){
 const b=structuredClone(w[which]),c=structuredClone(w[which==='a'?'ca':'cb']);if(lean==='zero')b.support.lean={x:0,y:0};
 if(requests==='max-lateral'){c.vel={x:0,y:5*w.side};c.push=0;}
 const r=oneTick([b],[c],mode,null);assert.equal(r.contacts.length,0);
 probes.push({kind:'bare-native-body',mode,which,requests,lean,side:w.side,solverIntervals:r.rows.length,...r});
}
const discrepancy=observed.filter(r=>r.who==='OL'&&r.planAy>=.5&&r.achievedAy<.5*r.planAy).sort((a,b)=>a.t-b.t);
const compactDiscrepancies=discrepancy.slice(0,12).map(({profile,...r})=>r);
const outputData={sourceBefore,sourceAfter:source(),collector:hash(readFileSync(import.meta.filename).toString()),input,plays,maxYawError,summaries,
 scope:'16 short declared designed replays; same ebff controllers plus root physics as existing final stage. Observer endpoints exactly equal all known frozen endpoints. Summaries use .9-1.6s; detailed observed rows include earlier/later engaged ticks. Probes are one tick, no controllers, capacity/profile unchanged. Peak yaw recomputed from exact bounded motor flow; not independent calibration. Matched pairs omit other players, retain body contacts. Bare-native-body keeps incoming felt/lean but has no external load and one ordinary free solver interval; do not use that changed boundary for native endpoint claims.',
 discrepancies:compactDiscrepancies,observed,probes};assert.equal(outputData.sourceBefore,outputData.sourceAfter);
mkdirSync(resolve('out/zone-climb'),{recursive:true});writeFileSync(output+'.traces.gz',gzipSync(JSON.stringify(outputData)));
const compactProbe=(p:any)=>({kind:p.kind,mode:p.mode,capture:p.capture,held:p.held,spin:p.spin,facing:p.facing,request:p.request,requests:p.requests,lean:p.lean,which:p.which,side:p.side,
 expectedGroundAy:p.expectedGroundAy,before:p.before.map((b:any)=>({vel:b.vel,facing:b.facing,spin:b.spin,support:{xi:b.support.xi,lean:b.support.lean,felt:b.support.felt}})),
 after:p.after.map((b:any)=>({vel:b.vel,facing:b.facing,spin:b.spin,support:{xi:b.support.xi,lean:b.support.lean}})),ground:p.ground,groundYaw:p.groundYaw,hands:p.hands,contacts:p.contacts,
 solverIntervals:p.rows.length,maxPeakUse:Math.max(...p.rows.map((q:any)=>q.peakUse??0)),workResidual:p.work.residual});
const firstByPlay=plays.map(p=>{const ds=discrepancy.filter(r=>r.mode===p.mode&&r.o===p.o&&r.front===p.front&&r.flip===p.flip);return {...p,firstDiscrepancy:ds.length?(({profile,...r})=>r)(ds[0]):null,repeatedQualifyingTicks:ds.length};});
const byFront=['center','patch'].flatMap(mode=>['over','under'].map(front=>{const rs=observed.filter(r=>r.mode===mode&&r.front===front&&r.who==='OL'&&r.t>=.9-1e-9&&r.t<=1.6+1e-9);return {mode,front,n:rs.length,wrongSide:rs.filter(r=>r.requestedVy<0).length,atLeast3:rs.filter(r=>r.requestedVy>=3).length,meanVy:mean(rs.map(r=>r.achievedVy)),peakBinding:rs.filter(r=>r.peakBinding>0).length};}));
writeFileSync(output,JSON.stringify({...Object.fromEntries(Object.entries(outputData).filter(([k])=>!['observed','probes'].includes(k))),byFront,firstByPlay,profile:reference.a.profile,probes:probes.map(compactProbe)},null,2));
console.log(JSON.stringify({output,source:sourceBefore,plays:plays.length,probes:probes.length,maxYawError,summaries,firstDiscrepancy:compactDiscrepancies[0]}));
