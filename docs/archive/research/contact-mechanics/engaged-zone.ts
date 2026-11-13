/** Observe attained hand slip/forces and ground yaw on a pinned controller tree.
 * node --import tsx docs/archive/research/contact-mechanics/engaged-zone.ts ROOT OUT [center|patch]
 * ROOT may be an ignored git archive with controllers plus declared physics.
 * This changes no requests/capacities; a plain first-play replay checks parity.
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdirSync,readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {dirname,join,relative,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {gzipSync} from 'node:zlib';
const root=resolve(process.argv[2]??'.'),output=process.argv[3]??'out/engaged-zone/summary.json';
const mode=(process.argv[4]??'center') as 'center'|'patch';
assert(mode==='center'||mode==='patch');
const moduleAt=async(path:string)=>import(pathToFileURL(join(root,path+'.ts')).href);
const [{Rng},{generateTeam,pickOffense,pickDefense},{RUN_BY_ID},{COVERAGE_BY_ID,FRONT_BY_ID},{FORMATION_BY_ID},
 {PlaySim},{playSideSign},{supportParams,baseRadiusAt},{effectiveVmax},{CENTER_Y}]=await Promise.all([
 'src/core/rng','src/league/team','src/playbook/concepts','src/playbook/defense','src/playbook/formations',
 'src/sim/playsim','src/sim/behaviors/blocking','src/physics/support','src/physics/kinematics','src/core/field'].map(moduleAt));
const hash=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
function source(){const paths=(dir:string):string[]=>readdirSync(dir,{withFileTypes:true}).flatMap(e=>
 e.isDirectory()?paths(join(dir,e.name)):[join(dir,e.name)]);const h=createHash('sha256');
 for(const p of paths(join(root,'src')).sort())h.update(relative(root,p)).update('\0').update(readFileSync(p)).update('\0');return h.digest('hex');}
const sourceBefore=source(),inputs={rosterSeeds:[[31,32],[41,42]],fronts:['over','under'],flips:[false,true],seed:3,run:'wz_strong',limit:1.8};
const plays:any[]=[];
function make(o:number,d:number,front:string,flip:boolean){return new PlaySim({
 offense:pickOffense(generateTeam(new Rng(o),'O','O',{strength:.55}),FORMATION_BY_ID.ace_11.personnel),
 defense:pickDefense(generateTeam(new Rng(d),'D','D',{strength:.55}),'base43'),
 offCall:{formation:FORMATION_BY_ID.ace_11,flip,kind:'run',run:RUN_BY_ID.wz_strong,label:'wz_strong'},
 defCall:{personnel:'base43',front:FRONT_BY_ID[front],coverage:COVERAGE_BY_ID.cover3,pressure:null,label:front},
 los:40,ballY:CENTER_Y,firstDownX:50,seed:3,handContact:mode});}
const signature=(sim:any)=>hash({t:sim.t,phase:sim.phase,events:sim.events,bodies:sim.agents.map((a:any)=>a.body),
 intents:sim.intents,minds:sim.agents.map((a:any)=>a.mind),rng:sim.rng,engagements:sim.engagements.map((e:any)=>({
 blocker:e.blocker.idx,defender:e.defender.idx,helpers:e.helpers.map((a:any)=>a.idx),control:e.control,phi:e.phi,
 drive:e.drive,surfaceAxis:e.surfaceAxis,hands:e.hands}))});
const mean=(v:number[])=>v.length?v.reduce((s,x)=>s+x,0)/v.length:0;
for(const [o,d]of inputs.rosterSeeds)for(const front of inputs.fronts)for(const flip of inputs.flips){
 const sim=make(o,d,front,flip),side=playSideSign(sim,RUN_BY_ID.wz_strong),world=sim.world as any;
 const initial=hash({bodies:sim.agents.map((a:any)=>a.body),off:sim.offCall,def:sim.defCall});
 const ticks:any[]=[],originalStep=world.step.bind(world),originalRows=world.jointRows.bind(world),originalFeet=world.feet.bind(world);
 let rows:any[]=[],feet:any[]=[],commands:any[]=[];
 world.jointRows=(h:number)=>{const result=originalRows(h);for(const r of result){if(r.joint.kind!=='hands')continue;
  const a=world.bodies[r.i],b=world.bodies[r.j],tx=-r.ny,ty=r.nx;
  const slip=(b.vel.x-a.vel.x)*tx+(b.vel.y-a.vel.y)*ty;
  rows.push({row:r,h,normal:[r.nx,r.ny],comSlip:slip,spinSlip:(r.ri??0)*(a.spin??0)+(r.rj??0)*(b.spin??0),
   pointSlip:slip-(r.ri??0)*(a.spin??0)-(r.rj??0)*(b.spin??0),slotA:sim.agents[r.i].slot,slotB:sim.agents[r.j].slot});}return result;};
 world.feet=(i:number,intent:any,plan:any,h:number,remaining:number,report:any)=>{
  const a=world.bodies[i],sp=supportParams(a.profile),p={...report.groundImpulse[i]},yaw=report.groundYawImpulse[i],spin=a.spin??0;
  originalFeet(i,intent,plan,h,remaining,report);
  const force={x:(report.groundImpulse[i].x-p.x)/h,y:(report.groundImpulse[i].y-p.y)/h};
  const torque=(report.groundYawImpulse[i]-yaw)/h,available=world.alpha[i],radius=baseRadiusAt(sp,a.support.posture);
  feet.push({i,h,force,torque,available,translationUse:Math.hypot(force.x,force.y)/sp.traction,
   availableTranslationUse:available>0?Math.hypot(force.x,force.y)/(sp.traction*available):null,
   combinedMeanUse:available>0?Math.hypot(force.x,force.y,torque/radius)/(sp.traction*available):null,
   spinBefore:spin,spinAfter:a.spin??0,plannedFacing:plan.facing,actualFacing:a.facing});};
 world.step=(intents:any[],dt:number)=>{
  rows=[];feet=[];commands=intents.map(c=>structuredClone(c));
  const before=sim.agents.map((a:any)=>({vel:{...a.vel},facing:a.facing,spin:a.body.spin??0,cap:effectiveVmax(a.body,Math.atan2(intents[a.idx].vel.y,intents[a.idx].vel.x))}));
  const report=originalStep(intents,dt),pairs=sim.engagements.filter((e:any)=>e.type==='run'&&['LT','LG','C','RG','RT'].includes(e.blocker.slot));
  const records=pairs.map((e:any)=>{const a=e.blocker,b=e.defender,own=rows.filter(s=>s.row.joint===e.hands||(s.row.handMembers??[]).includes(e.hands));
   const fy=own.reduce((s,r)=>s+r.row.ny*r.row.ln+r.row.nx*r.row.lt,0)/dt;
   return {blocker:a.slot,defender:b.slot,helpers:e.helpers.map((h:any)=>h.slot),surfaceAxis:e.surfaceAxis,drive:e.drive,
    beforeA:before[a.idx],beforeB:before[b.idx],requestA:commands[a.idx],requestB:commands[b.idx],
    afterA:{vel:{...a.vel},facing:a.facing,spin:a.body.spin??0},afterB:{vel:{...b.vel},facing:b.facing,spin:b.body.spin??0},
    actualYawA:a.facing-before[a.idx].facing,profileYawCredit:a.profile.turnRate*dt,
    forceYOnBlocker:-fy*side,normalMean:e.hands?.normalForce,tangentMean:e.hands?.tangentForce,
    substeps:own.map(r=>({h:r.h,comSlip:r.comSlip,spinSlip:r.spinSlip,pointSlip:r.pointSlip,
     normal:r.normal,normalImpulse:r.row.ln,tangentImpulse:r.row.lt,tangentCap:r.row.steerLim})),
    groundA:feet.filter(f=>f.i===a.idx),groundB:feet.filter(f=>f.i===b.idx)};});
  assert(Math.abs(report.work.residual)<1e-6);ticks.push({t:sim.t+dt,pairs:records});return report;};
 while(sim.phase==='live'&&sim.t<inputs.limit)sim.tick();
 const final=signature(sim);
 if(o===31&&front==='over'&&!flip){const plain=make(o,d,front,flip);while(plain.phase==='live'&&plain.t<inputs.limit)plain.tick();assert.equal(signature(plain),final);}
 plays.push({o,d,front,flip,side,initial,final,endTime:sim.t,ticks});
}
const pairs=plays.flatMap(p=>p.ticks.flatMap((t:any)=>t.pairs.map((r:any)=>({...r,t:t.t}))));
const late=pairs.filter(p=>p.t>=.9&&p.t<=1.6),sub=late.flatMap(p=>p.substeps),ground=late.flatMap(p=>p.groundA);
const summary={plays:plays.length,pairTicks:pairs.length,latePairTicks:late.length,meanAbsTangent:mean(late.map(p=>Math.abs(p.tangentMean??0))),
 meanAbsNormal:mean(late.map(p=>Math.abs(p.normalMean??0))),meanPlaySideSpeedA:mean(plays.flatMap(p=>p.ticks.filter((t:any)=>t.t>=.9&&t.t<=1.6).flatMap((t:any)=>t.pairs.map((r:any)=>r.afterA.vel.y*p.side)))),
 meanAbsComSlip:mean(sub.map(r=>Math.abs(r.comSlip))),meanAbsPointSlip:mean(sub.map(r=>Math.abs(r.pointSlip))),
 capFraction:mean(sub.map(r=>r.tangentCap>0?Math.abs(r.tangentImpulse)/r.tangentCap:0)),
 meanNetTraction:mean(ground.map(g=>g.translationUse)),meanAvailableTranslation:mean(ground.filter(g=>g.availableTranslationUse!==null).map(g=>g.availableTranslationUse)),
 meanCombinedGround:mean(ground.filter(g=>g.combinedMeanUse!==null).map(g=>g.combinedMeanUse)),
 optimisticYawTicks:late.filter(p=>Math.abs(p.actualYawA)+1e-6<p.profileYawCredit).length};
const sourceAfter=source();assert.equal(sourceBefore,sourceAfter);mkdirSync(dirname(output),{recursive:true});
writeFileSync(output+'.traces.gz',gzipSync(JSON.stringify({sourceBefore,mode,inputs,plays})));
writeFileSync(output,JSON.stringify({sourceBefore,sourceAfter,mode,node:process.version,operatorSha256:createHash('sha256').update(readFileSync(import.meta.filename)).digest('hex'),
 inputSha256:hash(inputs),summary,scope:'Designed8plays, snapshot controllers+declared physics; not merged source or NFL sample. Slip before hand solve, ground ratios per interval; combined yaw uses MEAN torque, not certified peak. Forces retain signs; plain firstplay parity per mode.'},null,2));
console.log(JSON.stringify({output,sourceBefore,mode,summary}));
