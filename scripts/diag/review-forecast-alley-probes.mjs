/** Independent unit probes on exact archived candidates. No PlaySim.tick(),
 * collection trial, information transport change or production source edit. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';

const started=performance.now(),root=new URL('../../out/run-forecast-alley-review/',import.meta.url);
const at=(host,path)=>import(new URL(`hosts/${host}/${path}`,root).href);
async function api(host){
 const [rng,team,sim,concepts,defense,formations,world,support,behavior,spacing]=await Promise.all([
  at(host,'src/core/rng.ts'),at(host,'src/league/team.ts'),at(host,'src/sim/playsim.ts'),
  at(host,'src/playbook/concepts.ts'),at(host,'src/playbook/defense.ts'),at(host,'src/playbook/formations.ts'),
  at(host,'src/physics/world.ts'),at(host,'src/physics/support.ts'),at(host,'src/sim/behaviors/defense.ts'),
  at(host,'src/sim/spacing.ts')]);
 return {...rng,...team,...sim,...concepts,...defense,...formations,...world,...support,...behavior,...spacing};
}
const cost=await api('cost'),alley=await api('alley'),reference=await api('reference');
function setup(m,traffic=false){
 return new m.PlaySim({offense:m.pickOffense(m.generateTeam(new m.Rng(traffic?19:31),'O',traffic?'OFF':'OBS'),'11'),
  defense:m.pickDefense(m.generateTeam(new m.Rng(traffic?20:32),'D','DEF'),'nickel'),
  offCall:{formation:m.FORMATION_BY_ID.gun_doubles_11,flip:false,kind:'pass',
   pass:traffic?m.PASS_BY_ID.four_verts:m.PASS_BY_ID.pa_post_dig,label:'independent unit control'},
  defCall:{personnel:'nickel',front:m.FRONT_BY_ID.over,coverage:traffic?m.COVERAGE_BY_ID.cover3:m.COVERAGE_BY_ID.cover4,
   pressure:null,label:'independent unit control'},los:40,ballY:26,firstDownX:50,seed:traffic?83:3});
}

const travel=[];
for(const heading of [0,Math.PI/4])for(const kind of ['coast','facing-effort-cap','fatigued-cap']){
 const sim=setup(cost,true),a=sim.slot('FS'),b=sim.slot('NB'),ux=Math.cos(heading),uy=Math.sin(heading);
 a.body.pos={x:50,y:26};a.body.vel={x:9*ux,y:9*uy};a.body.facing=heading+(kind==='coast'?0:Math.PI/2);
 a.body.energy=kind==='fatigued-cap'?.5:1;a.body.spin=kind==='coast'?0:.8;a.body.support=cost.newSupport();
 b.body.pos={x:50+4.3*ux-1.1*uy,y:26+4.3*uy+1.1*ux};b.body.vel={x:0,y:0};b.body.support=cost.newSupport();
 const command={vel:{...a.vel},...(kind==='coast'?{}:{facing:heading+Math.PI,effort:.35})};
 const intents=[structuredClone(command),{vel:{x:0,y:0},free:true}],bodyBefore=structuredClone(a.body);
 cost.spaceTeammates([a,b],intents,(_observer,other)=>({pos:{...other.pos},vel:{...other.vel}}),{now:2});
 assert.deepEqual(intents[0],command);assert.deepEqual(a.body,bodyBefore);
 const world=new cost.World([a.body]);world.time=2;
 let transverse=0,residual=0;
 for(let k=0;k<12;k++){
  const result=world.step([command],.05);
  transverse=Math.max(transverse,Math.abs(-(a.pos.x-50)*uy+(a.pos.y-26)*ux));
  residual=Math.max(residual,Math.abs(result.work.residual));
 }
 assert(transverse<1e-9);assert(residual<1e-8);
 travel.push({heading,kind,unchangedProductionRequest:true,maxTransverseYd:transverse,maxWorkResidual:residual,
  endPos:{...a.pos},endVel:{...a.vel},support:a.body.support.state});
}

function stage(m,side=1,read='run',backVelocity={x:1.2,y:side*1.85}){
 const sim=setup(m),a=sim.slot('FS'),rb=sim.slot('RB');sim.t=1.6;
 a.body.pos={x:50,y:26+side*2};a.body.vel={x:2,y:side*.2};a.body.facing=Math.PI;
 a.runFit={gap:'B',side,kind:'alley',technique:'attack',edge:'box',pace:'stack'};a.recog.read=read;
 a.mind.observationDelay=()=>.1;a.eyes={keys:[rb],peripheral:.15};
 rb.body.pos={x:36.8,y:26+side};rb.body.vel={...backVelocity};
 // Controlled delayed sensor fixture: actual production queries are retained.
 // These are not claimed as a naturally executed multi-player history.
 for(let k=0;k<24;k++)sim.perception.record(sim.agents,sim.qb.idx);
 const behavior=new m.ZoneCoverage(a,sim,'quarter_s_in','B',side,'spot');a.behavior=behavior;
 return {sim,a,rb,behavior,update:()=>behavior.update(a,sim)};
}
const zone=[];
for(const side of [-1,1]){
 const one=stage(alley,side),old=stage(reference,side),reverse=stage(alley,side,'run',{x:1.2,y:-side*1.85});
 const seen=one.sim.see(one.a,one.rb);assert.equal(seen.carrying,false);
 const actual=one.update(),was=old.update(),opposite=reverse.update();
 assert.notDeepEqual(actual,was);assert(actual.vel.y*side>0);assert(opposite.vel.y*side<0);
 const fast=stage(alley,side,'run',{x:9,y:side*1.85});assert.deepEqual(fast.update(),actual);
 const before=structuredClone(one.a.runFit),world=new alley.World([one.a.body]);world.time=one.sim.t;
 let minimumDepth=Infinity,maxResidual=0;
 for(let k=0;k<12;k++){
  const report=world.step([one.update()],.05);one.sim.t+=.05;
  minimumDepth=Math.min(minimumDepth,one.a.pos.x-one.sim.los);
  maxResidual=Math.max(maxResidual,Math.abs(report.work.residual));
 }
 assert(minimumDepth>=5);assert.equal(one.a.body.support.state,'up');assert.deepEqual(one.a.runFit,before);assert(maxResidual<1e-8);
 zone.push({side,read:'run',actualPassCall:'pa_post_dig',acquired:seen,request:actual,referenceRequest:was,
  observedOppositeRequest:opposite,forwardVelocityCannotCollapseCap:true,minimumDepth,maxResidual});
}

const hiddenA=stage(alley),hiddenB=stage(alley);
hiddenB.rb.body.pos={x:85,y:5};hiddenB.rb.body.vel={x:-8,y:9};
// One newly recorded private reality cannot defeat the existing sensor delay.
for(const f of [hiddenA,hiddenB])f.sim.perception.record(f.sim.agents,f.sim.qb.idx);
assert.deepEqual(hiddenA.sim.see(hiddenA.a,hiddenA.rb),hiddenB.sim.see(hiddenB.a,hiddenB.rb));
const perceptionBefore=structuredClone(hiddenB.sim.perception),ha=hiddenA.update(),hb=hiddenB.update();
assert.deepEqual(ha,hb);assert.deepEqual(hiddenB.sim.perception,perceptionBefore);
assert.deepEqual(hiddenA.sim.rng,hiddenB.sim.rng);

const pa=[];
for(const read of ['pass','unsure'])for(const side of [-1,1]){
 const one=stage(alley,side,read),old=stage(reference,side,read);
 const actual=one.update(),was=old.update();assert.deepEqual(actual,was);
 pa.push({read,side,requestsExact:true,request:actual});
}
const thrown=[];
for(const read of ['run','pass']){
 const one=stage(alley,1,read),old=stage(reference,1,read);
 for(const f of [one,old]){
  f.sim.throwAt=.1;f.a.tags.add('looking');
  f.sim.ball={kind:'air',flight:{pos:{x:43,y:26,z:2},vel:{x:20,y:0,z:-1},drag:0},thrower:f.sim.qb,
   target:f.rb,releaseT:.1,releaseX:35,intended:{x:46,y:26,z:1.2},arrivalT:1.9,deflected:false,throwaway:false};
  f.sim.ballPath=[{t:f.sim.t+.1,x:f.a.pos.x-.2,y:f.a.pos.y,z:1.2}];
  assert.equal((f===one?alley:reference).sawThrow(f.a,f.sim,null),true);
 }
 const actual=one.update(),was=old.update();assert.deepEqual(actual,was);assert(one.a.tags.has('onBall'));
 thrown.push({read,recognizedThrowWins:true,requestsExact:true});
}
const result={schema:'run-independent-forecast-alley-probes-v1',
 qualification:'Synthetic unit poses/history using existing unit-test players; exact archived production hooks and World. No PlaySim.tick/native football continuation or candidate source edit.',
 node:process.version,operatorSha256:createHash('sha256').update(readFileSync(import.meta.filename)).digest('hex'),
 travel,zone,hiddenBack:{unchangedAcquiredPicture:true,unchangedRequest:true,perceptionQueryReadOnly:true,rngEqual:true},
 playActionPassUnsure:pa,recognizedFlight:thrown,worldSteps:96,nativeFootballExecutions:0,
 sourcePins:JSON.parse(readFileSync(new URL('plan.json',root))).pins,seconds:(performance.now()-started)/1000};
writeFileSync(new URL('probes.json',root),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({travelCases:travel.length,zoneMirrors:zone.length,hiddenControl:true,playActionCases:pa.length,
 recognizedFlightCases:thrown.length,maxTransverse:Math.max(...travel.map(r=>r.maxTransverseYd)),seconds:result.seconds}));
