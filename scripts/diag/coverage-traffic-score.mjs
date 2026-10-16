/** Score only the existing raw/half/gather/applied choices at one saved state.
 * No controller decision, observation, RNG or complete play is executed.
 */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {previewFreeMovement} from '../../src/physics/movement-preview.ts';
import {sourceVersion} from '../source-version.ts';
const [input,capture,out]=process.argv.slice(2),start=performance.now();assert.ok(out&&!existsSync(out));
const sha=b=>createHash('sha256').update(b).digest('hex'),raw=JSON.parse(readFileSync(input)),c=JSON.parse(gunzipSync(readFileSync(capture)).toString());
const r=c.rows.find(r=>Math.abs(r.t-2.25)<1e-8),goal=r.objective;assert.ok(goal);
const peers=r.cues.filter(q=>q.phase==='modifier'&&q.observedTarget!==c.target);
assert.equal(peers.length,10);assert.equal(new Set(peers.map(p=>p.observedTarget)).size,10);
const samples=[],before=JSON.stringify(r.worldBefore),speed=Math.hypot(r.command.vel.x,r.command.vel.y);
for(const [name,command] of [['raw',r.command],['half',{...r.command,vel:{x:r.command.vel.x*.5,y:r.command.vel.y*.5}}],['gather',{...r.command,vel:{x:0,y:0}}],['applied',r.applied]]){
 const path=previewFreeMovement(r.worldBefore,command,r.t,12);let closest=Infinity,worst=null;
 for(const q of peers){
  const p=q.picture,profile=raw.initialBodies[q.observedTarget].body.profile,touch=.9*(profile.radius+r.body.profile.radius);
  let prev={x:r.body.pos.x-p.pos.x,y:r.body.pos.y-p.pos.y},gap=Math.hypot(prev.x,prev.y)-touch;
  for(const s of path){const next={x:s.pos.x-p.pos.x-p.vel.x*s.t,y:s.pos.y-p.pos.y-p.vel.y*s.t},d={x:next.x-prev.x,y:next.y-prev.y},u=Math.max(0,Math.min(1,-(prev.x*d.x+prev.y*d.y)/Math.max(1e-12,d.x*d.x+d.y*d.y)));gap=Math.min(gap,Math.hypot(prev.x+u*d.x,prev.y+u*d.y)-touch);prev=next;}
  if(gap<closest){closest=gap;worst=q.observedTarget;}
 }
 const end=path.at(-1),flow=goal.kind==='moving'?goal.velocity:{x:0,y:0};assert.ok(flow);
 samples.push({name,command,predictedTorsoClearance:closest,worstPeer:worst,allUpright:path.every(s=>s.support==='up'),
  achievedEndpoint:{pos:end.pos,vel:end.vel},goalError:Math.hypot(end.pos.x-goal.point.x-flow.x*end.t,end.pos.y-goal.point.y-flow.y*end.t),
  progressAlongRaw:((end.pos.x-r.body.pos.x)*r.command.vel.x+(end.pos.y-r.body.pos.y)*r.command.vel.y)/speed,
  firstStepError:name==='applied'?{position:Math.hypot(path[0].pos.x-r.worldAfter.pos.x,path[0].pos.y-r.worldAfter.pos.y),velocity:Math.hypot(path[0].vel.x-r.worldAfter.vel.x,path[0].vel.y-r.worldAfter.vel.y)}:null});
}
assert.equal(JSON.stringify(r.worldBefore),before);
const result={sourceSha256:sourceVersion(),operatorSha256:sha(readFileSync(import.meta.filename)),inputSha256:sha(readFileSync(input)),captureSha256:sha(readFileSync(capture)),t:r.t,actor:c.actor,target:c.target,goal,peers:peers.map(p=>({idx:p.observedTarget,picture:p.picture})),samples,freePreviewSteps:48,nativeExecutions:0,elapsedSeconds:(performance.now()-start)/1000,
 limits:['The .6s peer paths are conditional constant-velocity pictures, not their future decisions. Age is not advanced again.','These are the existing available movement choices; no new policy or outcome is selected.','Defensive behavior classes in this encounter have no calledMotion override. The recorded see pictures are therefore the spacing pictures.']};
writeFileSync(out,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({out,samples,seconds:result.elapsedSeconds},null,2));
