/** Saved acquired-picture geometry replay only: no PlaySim, controller or World. */
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {alignOffense} from '../../src/playbook/alignment.ts';
import {linePicture,gapSurfaceIn} from '../../src/sim/live-gaps.ts';
import {requestToCover} from '../../src/sim/motion-plan.ts';
const base='/workspace/football-db-stalk-workoff/out/db-stalk-workoff';
const files=['baseline/OZ4','baseline/WZ7','baseline/WZORD','transfer-baseline/F_OZ','transfer-baseline/F_COUNTER'];
const H=x=>createHash('sha256').update(x).digest('hex');const results=[];
for(const file of files){
 const path=base+'/'+file+'.json.gz',bytes=readFileSync(path),a=JSON.parse(gunzipSync(bytes));
 const off=alignOffense(a.setup.offCall.formation,a.setup.offCall.flip,a.setup.los,a.setup.ballY);
 const agents=a.initial.map(x=>({...x,team:x.idx<11?'O':'D',engagement:null})), bySlot=Object.fromEntries(agents.map(x=>[x.slot,x]));
 const ticks=new Map(a.ticks.map(x=>[x.t,x]));const cueMap=new Map();
 for(const c of a.cues){const key=[c.t,c.a,c.b].join(':');const arr=cueMap.get(key)??[];arr.push(c);cueMap.set(key,arr)}
 const seen=(t,d,b)=>{const arr=cueMap.get([t,d,b].join(':'))??[];const own=arr.filter(c=>c.consumer===d),chosen=own.length?own:arr;return chosen.length?chosen.at(-1).picture:null};
 const states=new Map(),rows=[],exclusions={};
 for(const q of a.aims){
  if(q.job!=='run-fit')continue;const d=agents[q.a];if(!d.slot.startsWith('LB'))continue;
  const tick=ticks.get(q.t);if(!tick)continue;const before=tick.before[d.idx];
  if(tick.repBefore.some(e=>e.d===d.idx||e.b===d.idx)){exclusions.engaged=(exclusions.engaged??0)+1;continue}
  let job=d.runFit;if(!job)continue;if(job.kind==='force'&&job.inside)job={...job,...job.inside,kind:job.inside.kind??'insert'};
  if(job.kind!=='insert'||job.pace!=='stack'||job.technique==='lag')continue;
  const core=agents.filter(o=>o.team==='O'&&(['LT','LG','C','RG','RT'].includes(o.slot)||off.spots[o.slot]?.inline));
  if(core.some(o=>!seen(q.t,d.idx,o.idx))){exclusions.missingPicture=(exclusions.missingPicture??0)+1;continue}
  // Current source's shallow backwards/departure exception depends on private
  // engagement. Exclude those rows instead of manufacturing that hidden state.
  if(core.some(o=>{const s=seen(q.t,d.idx,o.idx),home=off.spots[o.slot].pos,depth=s.pos.x-home.x;return depth>=-1.5&&depth<-.5&&Math.abs(s.pos.y-home.y)>1})){exclusions.privateDeparture=(exclusions.privateDeparture??0)+1;continue}
  const sim={offAlign:off,offense:agents.filter(x=>x.team==='O'),t:q.t,los:a.setup.los,ballY:a.setup.ballY,attackDir:()=>1,see:(_observer,target)=>{const p=seen(q.t,d.idx,target.idx);if(!p)throw Error('missing '+target.slot);return p}};
  const picture=linePicture(sim,d),gap=gapSurfaceIn(picture,job.gap,job.side),rb=seen(q.t,d.idx,bySlot.RB.idx),DI=tick.minds[d.idx].decisionInterval,horizon=2*DI;
  // Conservative exact !flowing proof: deep RB and sub-threshold lateral cue.
  const noFlow=rb&&rb.pos.x<=a.setup.los-1.6&&Math.abs(rb.vel.y)<=1.5;
  let gy=gap.y,pullSide=0;
  for(const b of picture.departed){const p=b.seen;if(!(sim.los-p.pos.x>.3&&Math.abs(p.vel.y)>1.5))continue;const sign=Math.sign(p.vel.y),target=p.pos.y+p.vel.y*.4+sign*(job.edge==='spill'?-.6:.6);if((target-gy)*sign>0&&(target-gy)*sign<6){gy=target;pullSide=sign}}
  const eligible=noFlow&&!pullSide&&Math.abs(gap.vel)>1&&Math.abs(gap.vel*horizon)<2;
  let state=states.get(d.idx),adoption=!state||state.aim.x!==q.selected.x||state.aim.y!==q.selected.y;
  if(adoption){state={aim:q.selected,t:q.t,DI,deadline:q.t+horizon,eligible,originGap:gap,noFlow,pullSide};states.set(d.idx,state)}
  if(!state.eligible)continue;
  const distance=state.aim.y-before.pos.y,old=requestToCover(d.profile.tau,distance,2*DI,before.vel.y),remaining=state.deadline-q.t,next=requestToCover(d.profile.tau,distance,remaining,before.vel.y),cap=x=>Math.max(-d.profile.vmax,Math.min(d.profile.vmax,x));
  rows.push({t:q.t,player:d.player.id,slot:d.slot,job,adoption:state.t,point:state.aim,deadline:state.deadline,heldUntil:q.heldUntil,originDI:state.DI,currentDI:DI,originGap:state.originGap,currentGap:gap,originNoFlow:state.noFlow,currentNoFlow:noFlow,originPullSide:state.pullSide,currentPullSide:pullSide,ownPosition:before.pos,ownVelocity:before.vel,rawRequest:tick.requests[d.idx],oldFormula:old,remainingFormula:next,oldCapped:cap(old),remainingCapped:cap(next),cappedDifference:cap(next)-cap(old),RB:rb,actualRequestedY:tick.requests[d.idx].vel.y,selectedStillHeld:q.t<q.heldUntil,body:before});
 }
 results.push({file,path,tapeSha256:H(bytes),source:a.source,inputSha256:a.inputSha256,exclusions,eligibleAdoptions:rows.filter(r=>r.adoption===r.t).length,eligibleHeldRows:rows.length,rows});
}
const receipt={scope:'Pure geometry replay of already consumed acquired pictures, preserving input/tape/source identities. No new engine/controllers/World/sensing. Conservative noFlow proof excludes high lateral RB and shallow runner pictures. Private departed-body exception rows excluded.',scriptSha256:H(readFileSync(import.meta.filename)),simulatorCalls:0,results};
writeFileSync('out/moving-fit/waypoint-exposure.json',JSON.stringify(receipt,null,2));
for(const r of results){console.log(JSON.stringify({file:r.file,adoptions:r.eligibleAdoptions,rows:r.eligibleHeldRows,exclusions:r.exclusions,examples:r.rows.filter(x=>x.t>x.adoption&&Math.abs(x.cappedDifference)>.3).slice(0,4).map(({t,slot,adoption,originGap,point,oldCapped,remainingCapped,actualRequestedY,currentNoFlow})=>({t,slot,adoption,originGap,point,oldCapped,remainingCapped,actualRequestedY,currentNoFlow}))}))}
