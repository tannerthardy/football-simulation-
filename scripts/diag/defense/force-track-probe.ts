/** Same attained body, one timestamped acquired picture, 0.6s of ordinary
 * movement. Commands are held complete; this is not a reacting play.
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {dirname} from 'node:path';
import {fatigueFactor,enduranceFactor,type Body,type MoveCommand} from '../../../src/physics/kinematics.js';
import {World} from '../../../src/physics/world.js';
import type {Agent} from '../../../src/sim/agent.js';
import {track} from '../../../src/sim/behaviors/common.js';
import {forceTrack} from '../../../src/sim/force-track.js';
import {sourceVersion} from '../../source-version.js';

const [input,output]=process.argv.slice(2);
assert.equal(process.argv.length,4,'Usage: force-track-probe.ts INPUT.json OUTPUT.json');
const raw=readFileSync(input),native=JSON.parse(raw.toString());
const starts=[2,3],rows=[];
const wall=performance.now();
for(let i=0;i<native.rows.length;i++) {
  const row=native.rows[i],s=row.states.find((s:any)=>s.t===starts[i]);assert.ok(s);
  const cue=s.decision.consumed.find((p:any)=>p.target==='RB').picture;
  const side=row.actor.side,edgeAim=s.decision.aims.find((a:any)=>a.job==='edge-fit');assert.ok(edgeAim);
  const ownError=s.decision.placementErrors.at(-1);assert.ok(Number.isFinite(ownError));
  const seenCore=s.decision.consumed.filter((p:any)=>['LT','LG','C','RG','RT'].includes(p.target)||p.inlineAtSnap);
  const boundary=seenCore.reduce((a:any,b:any)=>side*(a.picture.pos.y+side*a.publicRadius)
    >=side*(b.picture.pos.y+side*b.publicRadius)?a:b);
  const surface=boundary.picture.pos.y+side*boundary.publicRadius;
  const initial:Body=structuredClone(s.before.actor);
  if(initial.support!.since===null)initial.support!.since=-Infinity;
  function actor(body:Body):Agent {
    return {body,profile:body.profile,get pos(){return body.pos;},get vel(){return body.vel;},
      get speedScale(){return fatigueFactor(body.energy)*enduranceFactor(body)*(1-.08*(body.squeeze??0));}} as Agent;
  }
  const predicted=forceTrack(actor(initial),cue,edgeAim.desired.x,surface,boundary.picture.vel.y,side);
  const currentY=side>0?Math.max(surface+.5,cue.pos.y+.7):Math.min(surface-.5,cue.pos.y-.7);
  assert.ok(Math.abs(currentY+ownError-edgeAim.desired.y)<1e-9,'Consumed surface/error does not reconstruct the actual desired point');
  const desired={...predicted.point,y:predicted.point.y+ownError};
  const alternative=track(actor(initial),desired,predicted.velocity,{speed:.9,gain:3,facing:Math.PI});
  if(predicted.velocity.y*side>0&&Math.abs(alternative.vel.y)>Math.abs(alternative.vel.x))
    alternative.facing=Math.atan2(alternative.vel.y,alternative.vel.x);
  const arms=[{name:'native-command',command:s.applied.request},{name:'moving-force-command',command:alternative}]
    .map(({name,command})=>{
      const body:Body=structuredClone(initial),w=new World([body]);w.time=s.t;const states=[];
      for(let k=0;k<12;k++) {
        const report=w.step([structuredClone(command) as MoveCommand],.05),t=(k+1)*.05;
        states.push({t,body:structuredClone(body),conditionalOutsideMargin:side*(body.pos.y-cue.pos.y-cue.vel.y*t),
          workResidual:report.work.residual,groundImpulse:report.groundImpulse[0]});
      }
      return{name,command,states,final:states.at(-1)};
    });
  rows.push({id:row.input.id,at:s.t,cue,acquiredAt:s.t-cue.age,initial,
    surface:{slot:boundary.target,position:surface,velocity:boundary.picture.vel.y},ownError,
    predicted,desired,arms});
}
const receipt={source:sourceVersion(),input,inputSha256:createHash('sha256').update(raw).digest('hex'),
  toolSha256:createHash('sha256').update(readFileSync(import.meta.filename)).digest('hex'),node:process.version,
  definition:'Same body and observed runner/surface inputs; one complete command held 0.6s. Conditional margin assumes the acquired runner velocity persists, with its original age/timestamp. No fresh acquisition, contact or future cut supplied. Reachability is an estimate, not certification.',
  rows,wallSeconds:(performance.now()-wall)/1000};
mkdirSync(dirname(output),{recursive:true});writeFileSync(output,JSON.stringify(receipt,null,2)+'\n');
console.log(JSON.stringify({output,rows:rows.map(r=>({id:r.id,at:r.at,predicted:r.predicted,
  outcomes:r.arms.map(a=>({name:a.name,command:a.command,position:a.final!.body.pos,velocity:a.final!.body.vel,
    margin:a.final!.conditionalOutsideMargin,state:a.final!.body.support!.state}))})),wallSeconds:receipt.wallSeconds},null,2));
