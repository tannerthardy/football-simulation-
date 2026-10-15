/** Pure saved-cue reconstruction: not a World restart or a native outcome.
 * Verify large request/geometry differences before buying a new native trace.
 */
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {PlaySim} from '../../src/sim/playsim.ts';
import {playBall} from '../../src/sim/behaviors/defense.ts';
import {catchSpot} from '../../src/sim/behaviors/receiver.ts';
import {timeToReach} from '../../src/physics/reach.ts';
import {sourceVersion} from '../source-version.ts';
const [prefixPath,manifestPath,gamePath,out]=process.argv.slice(2);
const read=p=>JSON.parse(p.endsWith('.gz')?gunzipSync(readFileSync(p)):readFileSync(p,'utf8'));
const hash=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
const packet=read(prefixPath),game=read(gamePath),fixture=read(manifestPath).fixtures.find(f=>f.id==='spread-air'),
 players=new Map(Object.values(fixture.teams).flatMap(t=>t.roster).map(p=>[p.id,p]));
const trace=packet.traces.find(t=>t.play===45),nativeIndex=game.log.filter(p=>p.replay).findIndex(p=>p.index===44),
 observation=game.observations.filter(o=>o.kind==='scrimmage')[nativeIndex],rows=[];
for(const tick of trace.ticks.filter(t=>t.before.kind==='air'&&t.tickStart>=2.7&&t.tickStart<=3.7)){
 const prior=trace.ticks.find(t=>Math.abs(t.tickStart+.05-tick.tickStart)<1e-8);if(!prior)continue;
 const tf=trace.fullReplay.telemetry.frames.find(f=>Math.abs(f.t-tick.tickStart)<1e-8);if(!tf)continue;
 for(const actor of [18,20]){
  const roster=prior.actors,offense=Object.fromEntries(roster.slice(0,11).map(a=>[a.slot,players.get(a.id)])),
   defense=Object.fromEntries(roster.slice(11).map(a=>[a.slot,players.get(a.id)]));
  const sim=new PlaySim({offense,defense,offCall:observation.call,defCall:observation.defense,
   los:trace.fullReplay.los,ballY:26.667,firstDownX:trace.fullReplay.firstDownX,seed:1,audibles:false});
  sim.t=tick.tickStart;sim.throwAt=tick.before.releaseT;
  for(const s of roster){const a=sim.agents[s.idx];a.body.pos={...s.pos};a.body.vel={...s.vel};a.body.facing=s.facing;
   a.body.energy=tf.agents[s.idx].body.energy;a.tags=new Set(s.tags);a.behavior={kind:s.kind,update:()=>({vel:{x:0,y:0}})};}
  sim.ball={kind:'air',thrower:sim.qb,target:sim.agents[tick.before.target],releaseT:tick.before.releaseT,
   releaseX:sim.qb.pos.x,intended:{x:0,y:0,z:0},arrivalT:4,deflected:false,throwaway:false,
   flight:{pos:{...tick.before.pos},vel:{...tick.before.vel},drag:.005}};
  // Use the actual ordinary spiral drag; regenerate from the saved current
  // flight, not from hidden target/route data.
  const {DRAG_SPIRAL}=await import('../../src/physics/ball.ts');sim.ball.flight.drag=DRAG_SPIRAL;
  sim.computeBallPath();sim.ballPath.unshift({t:sim.t,...sim.ball.flight.pos});
  const consumed=new Map(tf.perception.filter(p=>p.a===actor).map(p=>[p.b,p]));
  sim.see=(a,b)=>{const p=consumed.get(b.idx);if(!p)throw Error(`Missing consumed picture ${actor}/${b.idx}`);
   return {pos:{x:p.position[0],y:p.position[1]},vel:{x:p.velocity[0],y:p.velocity[1]},
    facing:0,stance:null,pose:p.pose,carrying:p.carrying,age:p.age};};
  const a=sim.agents[actor],spot=catchSpot(a,sim),tt=spot?timeToReach({pos:a.pos,vel:a.vel,profile:a.profile,speedScale:a.speedScale},spot.p,a.profile.reach):null;
  const windows=[];
  for(const p of sim.ballPath){const remaining=p.t-sim.t;if(remaining<0||p.z<.25)continue;
   for(const b of sim.offense.filter(b=>b!==sim.qb&&!['LT','LG','C','RG','RT'].includes(b.slot))){
    const cue=consumed.get(b.idx);if(!cue)throw Error('Missing receiver');const seen={pos:{x:cue.position[0],y:cue.position[1]},vel:{x:cue.velocity[0],y:cue.velocity[1]}};
    if(p.z>b.profile.maxCatchHeight*.92)continue;
    const reach=b.profile.reach+.3;
    if(Math.hypot(p.x-seen.pos.x,p.y-seen.pos.y)>b.profile.vmax*remaining+reach)continue;
    if(Math.hypot(p.x-seen.pos.x-seen.vel.x*remaining,p.y-seen.pos.y-seen.vel.y*remaining)<=reach
     ||timeToReach({pos:seen.pos,vel:seen.vel,profile:b.profile},{x:p.x,y:p.y},reach)<=remaining)
     windows.push({receiver:b.idx,t:p.t,p:{x:p.x,y:p.y},seen});
   }if(windows.length)break;
  }
  const command=playBall(a,sim,sim.agents[8]),original=tf.agents[actor].intent.velocity;
  rows.push({t:sim.t,actor,pos:a.pos,vel:a.vel,facing:a.facing,spot,tt,window:windows[0]??null,
   command,recordedVelocity:original,requestDifference:Math.hypot(command.vel.x-original[0],command.vel.y-original[1])});
 }
}
writeFileSync(out,JSON.stringify({sourceSha256:sourceVersion(),prefixSha256:hash(prefixPath),collectorSha256:hash(import.meta.filename),
 limits:'Saved consumed cues and exact passive positions/velocities; rounded recorded energy and fresh unloaded support. Pure request reconstruction, not native World restoration or outcome.',rows},null,2));
for(const r of rows)console.log(JSON.stringify(r));
