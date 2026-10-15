/** Saved-picture/controller probes. No native play or contact is simulated.
 * PREFIX.json.gz MANIFEST.json GAME.json.gz OUT.json
 */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {dirname} from 'node:path';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {PlaySim} from '../../src/sim/playsim.ts';
import {ManCoverage} from '../../src/sim/behaviors/defense.ts';
import {timeToReach,interceptPoint} from '../../src/physics/reach.ts';
import {sourceVersion} from '../source-version.ts';

const [prefixPath,manifestPath,gamePath,out]=process.argv.slice(2),began=performance.now();
const read=p=>JSON.parse(p.endsWith('.gz')?gunzipSync(readFileSync(p)):readFileSync(p,'utf8')),
 hash=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
const prefix=read(prefixPath),game=read(gamePath),fixture=read(manifestPath).fixtures.find(f=>f.id==='spread-air'),
 players=new Map(Object.values(fixture.teams).flatMap(t=>t.roster).map(p=>[p.id,p]));
const trace=prefix.traces.find(t=>t.play===45),replay=trace.fullReplay,
 physical=game.log.filter(p=>p.replay),ordinal=physical.findIndex(p=>p.index===44),
 observation=game.observations.filter(o=>o.kind==='scrimmage')[ordinal];
function stage(frame,actor=18){
 const setup={offense:{},defense:{},offCall:observation.call,defCall:observation.defense,
  los:replay.los,ballY:replay.frames[0].ball[1],firstDownX:replay.firstDownX,
  seed:observation.seedState.key,energy:new Map(observation.initialPlayers.map(a=>[a.id,a.energy])),audibles:false};
 for(const a of observation.initialPlayers)setup[a.team==='O'?'offense':'defense'][a.slot]=players.get(a.id);
 const sim=new PlaySim(setup),positions=replay.frames.find(f=>f.t===frame.t);
 sim.t=frame.t;
 for(const a of sim.agents){const row=frame.agents[a.idx],v=row.body.velocity;
  // Recorder frames are after the step, with positions rounded to .1 yd.
  // Approximate the preceding controller boundary for request reconstruction.
  a.body.pos={x:positions.agents[3*a.idx]-v[0]*.05,y:positions.agents[3*a.idx+1]-v[1]*.05};
  a.body.vel={x:v[0],y:v[1]};a.body.facing=positions.agents[3*a.idx+2];a.body.energy=row.body.energy;
  a.recog=null;
 }
 const pictures=new Map(frame.perception.filter(p=>p.a===actor).map(p=>[p.b,p]));
 sim.see=(a,b)=>{const p=pictures.get(b.idx);assert.ok(p,`No acquired picture ${actor}/${b.idx} at ${frame.t}`);
  // X is straight through these pre-release probes. Recorded torso evidence
  // is absent from this packet; no claim of exact route-reader reconstruction.
  return {pos:{x:p.position[0],y:p.position[1]},vel:{x:p.velocity[0],y:p.velocity[1]},
   facing:0,stance:null,pose:p.pose,carrying:p.carrying,age:p.age};};
 return sim;
}
function request(frame,mutate){
 const sim=stage(frame),a=sim.agents[18],r=sim.agents[8],record=frame.agents[18].man,
  behavior=new ManCoverage(a,sim,r,record.press,'D',1,{lev:record.leverage,overTop:record.overTop,trail:record.trail});
 Object.assign(behavior,{initialCushion:record.initialCushion,hipsOpen:record.hipsOpen,releaseObserved:true});
 if(mutate)mutate(sim,a,r);
 const cue=sim.see(a,r),command=behavior.update(a,sim);
 return {t:frame.t,picture:cue,body:{pos:a.pos,vel:a.vel},recorded:frame.agents[18].intent.velocity,
  command,requestDifference:Math.hypot(command.vel.x-frame.agents[18].intent.velocity[0],command.vel.y-frame.agents[18].intent.velocity[1])};
}
const reconstructed=[1.0,1.1,1.2,1.3].map(t=>request(replay.telemetry.frames.find(f=>f.t===t)));
const reference=replay.telemetry.frames.find(f=>f.t===1.2),threshold=[];
for(const depth of [3-1e-5,3+1e-5])threshold.push({depth,...request(reference,sim=>{
 const see=sim.see;sim.see=(a,b)=>{const p=see(a,b);return b.idx===8?{...p,pos:{...p.pos,x:sim.los+depth}}:p;};
})});
const helpFrame=replay.telemetry.frames.find(f=>f.t===2.1),sim=stage(helpFrame,20),a=sim.agents[20],r=sim.agents[8],seen=sim.see(a,r),
 radius=a.profile.radius+r.profile.radius+a.profile.reach*.65,
 path=t=>({x:seen.pos.x+seen.vel.x*t,y:seen.pos.y+seen.vel.y*t}),
 ip=interceptPoint({pos:a.pos,vel:a.vel,profile:a.profile,speedScale:a.speedScale},path,{horizon:3,step:.05,radius}),
 hindsight=trace.ticks.find(t=>t.after.kind==='held'&&t.after.carrier===8),catcher=hindsight?.actors[8];
const result={sourceSha256:sourceVersion(),prefixSha256:hash(prefixPath),manifestSha256:hash(manifestPath),
 gameSha256:hash(gamePath),collectorSha256:hash(import.meta.filename),reconstructed,threshold,
 thresholdRequestJump:Math.hypot(threshold[1].command.vel.x-threshold[0].command.vel.x,threshold[1].command.vel.y-threshold[0].command.vel.y),
 firstHelp:{t:2.1,actualDefender:observation.initialPlayers[20].id,actualReceiver:observation.initialPlayers[8].id,
  ownPos:a.pos,ownVel:a.vel,picture:seen,contactRadius:radius,constantObservedPathIntercept:ip,
  interceptTimeEstimate:timeToReach({pos:a.pos,vel:a.vel,profile:a.profile,speedScale:a.speedScale},ip.point,radius),
  hindsightCatch:catcher?{t:hindsight.tickStart,pos:catcher.pos,
   timeToReachEstimate:timeToReach({pos:a.pos,vel:a.vel,profile:a.profile,speedScale:a.speedScale},catcher.pos,radius)}:null},
 limits:'Controller request reconstruction only. Approximate pre-step positions from .1-yd rounded post-step film; rounded velocity/energy and fresh unloaded support. X facing is zero for straight-stem probes; original consumed facing is not recorded. Threshold counterfactual changes only acquired depth, keeps body/state fixed, and invokes actual ManCoverage.update. Reach estimates are not supported World feasibility; actual eventual catch is hindsight and never a runtime input. No native outcomes or NFL approach query computed.',
 seconds:(performance.now()-began)/1000};
mkdirSync(dirname(out),{recursive:true});writeFileSync(out,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({out,jump:result.thresholdRequestJump,reconstructed:reconstructed.map(r=>({t:r.t,error:r.requestDifference,command:r.command.vel})),firstHelp:result.firstHelp,seconds:result.seconds}));
