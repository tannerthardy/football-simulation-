/** Independent #353 hook-drop diagnosis, not a football policy. Node22.23.3.
 * Reproduce the existing legacy-alignment coverage-panel constructor and a
 * receiver/side opposing control; the QB holds exactly as in the panel.
 * Usage: node --import tsx scripts/diag/defense/hook-drop-panel.ts
 *   [seed=4] [match|spot] [actor=LB_M] [concept=four_verts] [none|hold-stem]
 * hold-stem is an isolated actor-local counterfactual: retain depth in the
 * already-computed lane objective while its consumed key advances. It has a
 * known hitch cost; it is NOT proposed for production. It does not cap speed,
 * replace facing or alter contact. Passive recording adds no perception,
 * decision evaluations, random draws or World steps.
 * Output is ignored out/353-coverage. Every arm checks observer-off/on complete
 * result/replay, endpoint bodies/RNG and see/World/tick count equality. Clocks
 * in World snapshots are interval starts, with explicit endpoints. Body facing
 * is not gaze, a cap is not achieved speed, and proximity is not contact.
 */
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
process.env.WR_ALIGN='0'; process.env.OL_SPLITS='0';
const {HASH_LEFT_Y}=await import('../../../src/core/field.js');
const {Rng}=await import('../../../src/core/rng.js');
const {generateTeam,pickDefense,pickOffense}=await import('../../../src/league/team.js');
const {PASS_BY_ID}=await import('../../../src/playbook/concepts.js');
const {COVERAGE_BY_ID,FRONT_BY_ID}=await import('../../../src/playbook/defense.js');
const {FORMATION_BY_ID}=await import('../../../src/playbook/formations.js');
const {movementObjective}=await import('../../../src/sim/movement-objective.js');
const {withFacingTechnique,facingTechnique}=await import('../../../src/sim/coverage/orientation.js');
const {unsureFactor}=await import('../../../src/sim/behaviors/defense.js');
const {goTo,track}=await import('../../../src/sim/behaviors/common.js');
const {ZoneCoverage}=await import('../../../src/sim/behaviors/defense.js');
const {PlaySim}=await import('../../../src/sim/playsim.js');
const {effectiveVmax,commandFacing}=await import('../../../src/physics/kinematics.js');
const {engineSettings,provenance}=await import('../../scorecard/provenance.js');
const {commandSnapshot,identity}=await import('../../../src/sim/command-trace.js');
const j=(x:any)=>JSON.parse(JSON.stringify(x));
const digest=(x:any)=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const seed=Number(process.argv[2]??4),style=process.argv[3]??'match',slot=process.argv[4]??'LB_M',concept=process.argv[5]??'four_verts',treatment=process.argv[6]??'none';
if(!Number.isInteger(seed)||!['match','spot'].includes(style)||!PASS_BY_ID[concept]||!['none','hold-stem'].includes(treatment))throw new Error('Invalid seed/style/concept/treatment');
const started=performance.now();
fs.mkdirSync('out/353-coverage',{recursive:true});
const home=generateTeam(new Rng(21),'Home','HOM',{strength:.6}),away=generateTeam(new Rng(22),'Away','AWY',{strength:.6});
const formation=FORMATION_BY_ID.gun_doubles_11,offense=pickOffense(home,formation.personnel),defense=pickDefense(away,'nickel');
const setup:any={offense,defense,offCall:{formation,flip:false,kind:'pass',pass:PASS_BY_ID[concept],label:concept},
 defCall:{personnel:'nickel',front:FRONT_BY_ID.over,coverage:COVERAGE_BY_ID.cover3,pressure:null,zoneStyle:style,label:'cover3'},
 los:35,ballY:HASH_LEFT_Y,firstDownX:45,seed,record:true};
const state=(a:any)=>({id:identity(a),pos:j(a.pos),vel:j(a.vel),facing:a.facing,spin:a.body.spin,support:j(a.body.support),energy:a.body.energy,
 behavior:{kind:a.behavior.kind,zone:a.behavior.zone,target:a.behavior.target?identity(a.behavior.target):null},
 engagement:a.engagement?{type:a.engagement.type,blocker:identity(a.engagement.blocker),defender:identity(a.engagement.defender)}:null,
 recog:a.recog?{read:a.recog.read,logOdds:a.recog.logOdds}:null});
function run(observe:boolean){
 const sim=new PlaySim(setup), spot={x:28,y:HASH_LEFT_Y};
 sim.qb.behavior={kind:'qb-hold',update:(a:any)=>goTo(a,spot,{facing:0,speed:.5})};
 const selected=sim.slot(slot)!;if(!selected)throw new Error('No actor in slot '+slot);const ids=[selected,...['LB_M','LB_W','Y','H'].map(s=>sim.slot(s)!)].filter((a,i,all)=>all.indexOf(a)===i);
 const snapshots:any[]=[],cues:any[]=[],interventions:any[]=[];
 if(treatment==='hold-stem'){
  const behavior=selected.behavior as any, update=behavior.update.bind(behavior);
  behavior.update=(a:any,s:any)=>{
   const command=update(a,s), technique=facingTechnique(command),goal=movementObjective(command),key=technique?.key;
   if(technique?.label!=='lane'||!behavior.zone?.startsWith('hook')||goal?.kind!=='moving'||!goal.velocity||!key||key.x<=0||key.x<=Math.abs(key.y)||goal.point.x>=a.pos.x)return command;
   const point={...goal.point,x:a.pos.x};
   const corrected=withFacingTechnique(track(a,point,goal.velocity,{facing:command.facing,speed:(.65+.2*a.r('zoneCoverage'))*unsureFactor(a)*1.05,gain:1.6}),technique!);
   if(observe)interventions.push({t:s.t,key:j(key),original:commandSnapshot(command),corrected:commandSnapshot(corrected)});
   return corrected;
  };
 }let seeCalls=0,worldSteps=0,ticks=0;
 let trace:any;
 if(observe){
  trace=sim.recordCommands({actor:{team:'D',slot},from:0,to:3.5});
  const see=sim.see.bind(sim);sim.see=((a:any,b:any,...args:any[])=>{seeCalls++;const p=(see as any)(a,b,...args);if(a===selected&&sim.t<3.5)cues.push({t:sim.t,target:identity(b),p:j(p),args});return p;}) as any;
  const step=sim.world.step.bind(sim.world);sim.world.step=((commands:any,dt:number)=>{
   worldSteps++;const before=sim.t<3.5?ids.map(state):[];
   const actual=sim.t<3.5?ids.map(a=>({id:identity(a),request:commandSnapshot(commands[a.idx]),directionalCap:Math.hypot(commands[a.idx].vel.x,commands[a.idx].vel.y)>0?effectiveVmax(a.body,Math.atan2(commands[a.idx].vel.y,commands[a.idx].vel.x),commands[a.idx].effort??1):0,wantedFacing:commandFacing(a.body,commands[a.idx])})):[];
   const r=step(commands,dt);
   if(sim.t<3.5)snapshots.push({t:sim.t,end:sim.t+dt,before,commands:actual,after:ids.map(state),
    contacts:j(r.contacts.filter(c=>ids.some(a=>a.idx===c.i||a.idx===c.j))),falls:r.falls,downs:r.downs,rises:r.rises,
    ground:ids.map(a=>({id:identity(a),impulse:r.groundImpulse[a.idx],yawImpulse:r.groundYawImpulse[a.idx],yawWork:r.groundYawWork[a.idx]}))});return r;
  }) as any;
 }else{
  const see=sim.see.bind(sim);sim.see=((...args:any[])=>{seeCalls++;return (see as any)(...args);})as any;
  const step=sim.world.step.bind(sim.world);sim.world.step=((...args:any[])=>{worldSteps++;return (step as any)(...args);})as any;
 }
 const tick=sim.tick.bind(sim);sim.tick=()=>{ticks++;tick();};
 const result=sim.run();
 const hooks=sim.defense.filter(a=>a.behavior instanceof ZoneCoverage&&a.behavior.zone.startsWith('hook')&&!a.tags.has('matchBust'));
 const frames=result.frames!.filter(f=>f.t<=3),x=(f:any,i:number)=>f.agents[i*3],y=(f:any,i:number)=>f.agents[i*3+1];
 const metric=['Y','H'].map(s=>{const r=sim.slot(s)!,f=frames.find(f=>x(f,r.idx)-35>=14);return {slot:s,actor:identity(r),time:f?.t,gap:f?Math.min(...hooks.map(h=>Math.hypot(x(f,r.idx)-x(f,h.idx),y(f,r.idx)-y(f,h.idx)))):null};});
 return {interventions,execution:{result,bodies:sim.agents.map(a=>structuredClone(a.body)),rng:structuredClone(sim.rng),seeCalls,worldSteps,ticks},trace:trace?.steps,snapshots,cues,metric,
  actors:sim.agents.map(a=>({id:identity(a),position:a.player.position,profile:a.profile,ratings:a.player.ratings}))};
}
const a=run(false),b=run(true);assert.deepStrictEqual(a.execution,b.execution);
const output={operatorSha256:createHash('sha256').update(fs.readFileSync(new URL(import.meta.url))).digest('hex'),elapsedSeconds:(performance.now()-started)/1000,source:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),runtime:process.version,settings:engineSettings(process.env),provenance:provenance(),setupDigest:digest(setup),seed,style,slot,concept,treatment,observerEquality:true,
 executionDigest:digest(b.execution),counts:{seeCalls:b.execution.seeCalls,worldSteps:b.execution.worldSteps,ticks:b.execution.ticks},...b};
const name=`out/353-coverage/${concept}-${style}-${seed}-${slot}-${treatment}`;fs.writeFileSync(name+'.json',JSON.stringify(output));
console.log(JSON.stringify({name,source:output.source,observerEquality:true,counts:output.counts,elapsedSeconds:output.elapsedSeconds,metric:b.metric,result:{yards:b.execution.result.yards,outcome:b.execution.result.outcome,duration:b.execution.result.duration},falls:b.snapshots.filter(x=>x.falls.length).map(x=>({t:x.t,falls:x.falls}))},null,2));
