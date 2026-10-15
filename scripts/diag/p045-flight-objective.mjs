/** Audit playBall's objective from saved consumed cues; no new native play.
 * FLIGHT.json.gz ACCEPTED.json.gz INPUTS.json OUTPUT.json
 * Mirrors the pinned private window selector for diagnosis, never a policy.
 */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {dirname} from 'node:path';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {timeToReach} from '../../src/physics/reach.ts';
import {previewFreeMovement} from '../../src/physics/movement-preview.ts';
import {goTo,track} from '../../src/sim/behaviors/common.ts';
import {TRACKING_REACH_BONUS} from '../../src/sim/catching.ts';
import {sourceVersion} from '../source-version.ts';

const [flightPath,acceptedPath,inputPath,out]=process.argv.slice(2),began=performance.now(),
 read=p=>JSON.parse(p.endsWith('.gz')?gunzipSync(readFileSync(p)):readFileSync(p,'utf8')),
 sha=p=>createHash('sha256').update(readFileSync(p)).digest('hex'),
 tape=read(flightPath),accepted=read(acceptedPath),inputs=read(inputPath),clips=[];
let previewWorldSteps=0;
assert.equal(sourceVersion(),tape.provenance.sourceSha256);
assert.equal(tape.provenance.sourceSha256,accepted.provenance.sourceSha256);
assert.equal(tape.inputSha256,sha(inputPath));
assert.ok(!existsSync(out),'Preserve evidence');
for(const clip of tape.clips){
 const old=accepted.clips.find(c=>c.id===clip.id),setup=inputs.clips.find(c=>c.id===clip.id).setup;
 assert.equal(clip.signature,old.signature,'Flight recording altered saved native state/RNG');
 const actor=clip.id.endsWith('/P6')?19:18,player=clip.players[actor],rows=[];
 for(const row of clip.rows){
  const raw=row.raw.find(q=>q.actor===actor),flight=raw?.flight;
  if(!flight)continue;
  const consumed=row.cues.slice(raw.cueStart,raw.cueEnd),body=row.world.before[actor],
   a={body,pos:body.pos,vel:body.vel,profile:body.profile,speedScale:flight.speedScale},
   receivers=clip.players.filter(p=>p.idx<11&&!['QB','LT','LG','C','RG','RT'].includes(p.slot))
    .map(p=>({p,seen:consumed.filter(q=>q.target===p.idx).at(-1)?.picture}));
  // Missing consumed pictures mean playBall did not enter its window query.
  if(receivers.some(r=>!r.seen)){rows.push({t:row.t,kind:'window-query-not-consumed',request:raw.request});continue;}
  let window=null;
  for(const s of flight.path){
   const left=s.t-row.t;if(left<0||s.z<.25)continue;
   for(const {p:r,seen} of receivers){
    if(s.z>r.profile.maxCatchHeight*.92)continue;
    const p={x:s.x,y:s.y},reach=r.profile.reach+TRACKING_REACH_BONUS;
    if(Math.hypot(p.x-seen.pos.x,p.y-seen.pos.y)>r.profile.vmax*left+reach)continue;
    const passing=Math.hypot(p.x-seen.pos.x-seen.vel.x*left,p.y-seen.pos.y-seen.vel.y*left)<=reach,
     tt=timeToReach({pos:seen.pos,vel:seen.vel,profile:r.profile},p,reach);
    if(passing||tt<=left){window={p,t:s.t,receiver:r,seen,passing,receiverReachEstimateS:tt};break;}
   }
   if(window)break;
  }
  const spot=flight.spot,tt=spot?timeToReach(a,spot.p,a.profile.reach):Infinity,
   earlier=!!(spot&&window&&spot.t<window.t&&tt<=spot.t-row.t+.05),
   carry=!!(window&&!earlier&&Math.hypot(window.seen.vel.x,window.seen.vel.y)>.5
    &&Math.hypot(window.seen.pos.x-a.pos.x,window.seen.pos.y-a.pos.y)
      <=a.profile.radius+window.receiver.profile.radius+a.profile.reach),
   reachable=!!(spot&&tt<=spot.t-row.t+.05&&(!window||spot.t<=window.t+.05));
  let fallback=null;
  for(const s of flight.path){if(s.t<row.t)continue;fallback={p:{x:s.x,y:s.y},t:s.t};if(s.z<1.4&&s.t>row.t+.1)break;}
  const goal=window?{p:window.p,t:window.t}:fallback,
   kind=carry?'carry-observed-receiver':reachable?'reachable-ball-arrival':window?'drive-observed-window':'drive-fallback',
   tackling=(setup.defense[player.slot].ratings.tackling-1)/98;
  let expected=null;
  if(carry)expected=track(a,window.seen.pos,window.seen.vel);
  else if(reachable)expected=goTo(a,spot.p);
  else if(goal){
   const dx=goal.p.x-a.pos.x,dy=goal.p.y-a.pos.y,d=Math.hypot(dx,dy)||1,
    control=2.2+2.5*(1-tackling),speed=Math.min(a.profile.vmax,Math.sqrt(control**2+1.4*a.profile.brake*Math.max(0,d-.3)));
   expected={vel:{x:dx/d*speed,y:dy/d*speed}};
  }
  const residual=expected?Math.hypot(expected.vel.x-raw.request.vel.x,expected.vel.y-raw.request.vel.y):null,
   fallbackDistance=fallback?Math.hypot(fallback.p.x-a.pos.x,fallback.p.y-a.pos.y):null,
   necessaryDistance=fallback?a.profile.vmax*Math.max(0,fallback.t-row.t)+a.profile.reach:null;
  // The original point law is exact when there is no receiver window.
  // A window can engage movingCatchApproach, so do not assert that arm away.
  if(!window&&expected)assert.ok(residual<1e-9,'Fallback request reconstruction drift');
  const assigned=receivers.find(r=>r.p.idx===raw.target),assignedHypothesis=[];
  if(assigned)for(const s of flight.path){
   const left=s.t-row.t,{p:r,seen}=assigned;if(left<0||s.z<.25||s.z>r.profile.maxCatchHeight*.92)continue;
   const reach=r.profile.reach+TRACKING_REACH_BONUS;
   assignedHypothesis.push({t:s.t,
    straightPathHandMissYd:Math.hypot(s.x-seen.pos.x-seen.vel.x*left,s.y-seen.pos.y-seen.vel.y*left)-reach,
    pointArrivalSlackS:timeToReach({pos:seen.pos,vel:seen.vel,profile:r.profile},{x:s.x,y:s.y},reach)-left});
  }
  let previews;
  if(clip.id.endsWith('/P45')&&[2.75,3.05,3.35].includes(row.t)&&!window&&!reachable&&assigned){
   const source=structuredClone(body);
   // JSON encoded the inactive native clock as null; restore its original
   // sentinel before using the complete saved up-state in the actual World.
   assert.equal(source.support.state,'up');assert.equal(source.support.since,null);source.support.since=-Infinity;
   const saved=structuredClone(source),seen=assigned.seen,
    commands=[['original',raw.request],['retain-acquired-man',track(a,seen.pos,seen.vel)]];
   previews=commands.map(([name,command])=>{
    const samples=previewFreeMovement(source,command,row.t,12);previewWorldSteps+=12;
    assert.deepEqual(source,saved,'Preview mutated source');
    const end=samples.at(-1),goal={x:seen.pos.x+seen.vel.x*end.t,y:seen.pos.y+seen.vel.y*end.t},
     dx=goal.x-end.pos.x,dy=goal.y-end.pos.y,gap=Math.hypot(dx,dy);
    return{name,command,samples,assumedGoal:goal,gapYd:gap,
     closingYdS:((end.vel.x-seen.vel.x)*dx+(end.vel.y-seen.vel.y)*dy)/gap,
     velocityErrorYdS:Math.hypot(end.vel.x-seen.vel.x,end.vel.y-seen.vel.y),
     headingErrorDeg:Math.abs(Math.atan2(Math.sin(Math.atan2(end.vel.y,end.vel.x)-Math.atan2(seen.vel.y,seen.vel.x)),
       Math.cos(Math.atan2(end.vel.y,end.vel.x)-Math.atan2(seen.vel.y,seen.vel.x))))*180/Math.PI};
   });
  }
  rows.push({t:row.t,kind,actor:player,body,request:raw.request,consumed,
   flight,window,goal,spotReachEstimateS:Number.isFinite(tt)?tt:null,earlierBall:earlier,
   originalBranchCommand:expected,commandResidualYdS:residual,
   fallbackNecessaryBound:{distanceYd:fallbackDistance,instantVmaxPlusReachYd:necessaryDistance,
    possible:necessaryDistance!==null&&fallbackDistance<=necessaryDistance},
   assignedTarget:assigned?.p??null,assignedHypothesis,previews,alreadyDeadReckoned:true});
 }
 clips.push({id:clip.id,actor,signature:clip.signature,nativeUnchanged:true,rows});
}
const result={schema:'p045-consumed-flight-objective-v1',provenance:tape.provenance,
 collectorSha256:sha(import.meta.filename),flightCollectorSha256:sha('scripts/diag/p045-native.mjs'),
 flightTapeSha256:sha(flightPath),acceptedTapeSha256:sha(acceptedPath),inputSha256:sha(inputPath),
 clips,seconds:(performance.now()-began)/1000,newNativePlays:0,newWorldSteps:previewWorldSteps,
 limits:'Private window-selection formula mirrored from the pinned source and checked against recorded requests; only consumed receiver pictures are used. Perceived.pos is already dead-reckoned: do not add age again. Three causal previews hold commands and the already acquired man velocity for .6 s in empty World, restoring the inactive native support clock; they do not predict contact, cuts, future evidence or native endings. Public existing receiver capabilities/flight forecast remain the engine contract, not a global gaze repair. Reach bounds are necessary only, not supported contact forecasts. No source/physics/policy change or current-develop native transfer claim.'};
mkdirSync(dirname(out),{recursive:true});writeFileSync(out,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({out,seconds:result.seconds,clips:clips.map(c=>({id:c.id,rows:c.rows.length,
 kinds:c.rows.reduce((a,r)=>(a[r.kind]=(a[r.kind]??0)+1,a),{})}))}));
