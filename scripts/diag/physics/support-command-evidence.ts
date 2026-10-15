/** Frozen, small causal audit. No games or engine/controller changes. */
import assert from 'node:assert/strict';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {sourceVersion} from '../../source-version.js';
import {sha} from './grip-bounded-fixtures.js';
import {supportReplay,replayDifference,checkReplay,facingWitness,smallFacingControl,checkIntervalReference,type History,type Intervention} from './support-command-audit.js';
const root='out/support-command-audit';mkdirSync(root,{recursive:true});
const commit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),source=sourceVersion(),
  profile=JSON.parse(readFileSync('config/baseline.json','utf8')),flags=Object.fromEntries(Object.keys(profile.flags).map(k=>[k,process.env[k]??null])),
  files=['scripts/diag/physics/support-command-audit.ts','scripts/diag/physics/support-command-evidence.ts','test/support-command-audit.test.ts',
    'config/grip-native-support-packets.json','data/reviews/current/grip-recovery-work.json'],hashes=Object.fromEntries(files.map(p=>[p,sha(readFileSync(p))]));
assert.deepEqual(flags,profile.flags);
assert.equal(source,JSON.parse(readFileSync('data/reviews/current/grip-recovery-work.json','utf8')).runtimeSource);
for(const p of ['src/physics/world.ts','src/physics/support.ts','src/physics/virtual-foot.ts','scripts/diag/physics/grip-recovery-span.ts','config/baseline.json'])
  assert.equal(sha(readFileSync(p)),sha(execFileSync('git',['show',`1986d92:${p}`])));
const start=performance.now(),histories:History[]=['previous','transition'],base=histories.map(h=>supportReplay(h)),raw:any[]=[...base],interventions=[],perturbations=[],references=[],observer=[],witness=histories.map(facingWitness);
for(const [i,h]of histories.entries()){
  const a=base[i],b=base[1-i],plain=supportReplay(h,'none',0,false);
  assert.deepEqual(a.bodies,plain.bodies);assert.deepEqual(a.report,plain.report);assert.deepEqual(a.attachment,plain.attachment);observer.push({history:h,exact:true});
  for(const action of ['xi','held-yaw','holder-yaw','material','filters','body-pose','body-velocity'] as Intervention[]){
    const r=supportReplay(h,action);raw.push(r);const accounting=checkReplay(r);
    assert(accounting.energy<1e-8&&accounting.support<1e-12&&accounting.filter<1e-12&&accounting.reserve<1e-8&&accounting.strengthExcess<1e-7&&accounting.tractionExcess<1e-7&&accounting.commandExcess<1e-12);
    interventions.push({history:h,action,fromBase:replayDifference(a,r),toOtherOriginal:replayDifference(b,r),audit:r.report.correctiveGrip,accounting});
    if(action==='held-yaw')for(const phase of [0,23]){const comparison=checkIntervalReference(r.trace[phase].input);assert(!comparison.refused&&comparison.error!<=1/16&&comparison.refinement!<=1/16);references.push({history:h,phase,...comparison});}
  }
  for(const epsilon of [1e-3,1e-4,1e-5,1e-6,-1e-6]){
    const r=supportReplay(h,'none',epsilon),d=replayDifference(a,r),gain=d.xi/Math.abs(epsilon);assert(gain<1.2);raw.push(r);perturbations.push({history:h,epsilon,...d,gain});
  }
  assert(Math.abs(smallFacingControl(h,1e-6)-smallFacingControl(h,-1e-6))<1e-14);
}
const norm=(p:{x:number;y:number},q:{x:number;y:number})=>Math.hypot(p.x-q.x,p.y-q.y),
  changes=base[0].trace.map((a,i)=>{const b=base[1].trace[i],x=a.balance[0].after,y=b.balance[0].after;return {phase:i,time:a.time+base[0].trace[0].input.duration,
    xi:norm(x.xi,y.xi),command:norm(x.foot.desired,y.foot.desired),force:norm(x.foot.force,y.foot.force),achieved:norm(x.foot.achieved,y.foot.achieved),
    commandScale:Math.min(norm(x.foot.desired,{x:0,y:0}),norm(y.foot.desired,{x:0,y:0})),forceScale:Math.min(x.foot.capacity,y.foot.capacity)};}),
  summary={originalGap:replayDifference(base[0],base[1]),witness,observer,
    forceFirstFivePercent:changes.find(r=>r.force>.05*r.forceScale),commandFirstFivePercent:changes.find(r=>r.command>.05*r.commandScale),xiFirstCentiyard:changes.find(r=>r.xi>.01),
    snapshots:[0,1,3,5,10,23,48,95].map(i=>({...changes[i],histories:base.map(r=>{const t=r.trace[i],before=t.ground[0].before,after=t.ground[0].after;return {
      history:r.history,xi:t.balance[0].after.xi,turnTarget:r.plans[0].facing,spinBefore:before.spin,spinAfterGround:after.spin,
      ground:t.ground[0].force,reserve:t.commands[0].capacity,command:t.commands[0].after.foot.desired,footForce:t.balance[0].after.foot.force,achieved:t.balance[0].after.foot.achieved};})})),
    interventions,perturbations,references,accounting:base.map(r=>({history:r.history,audit:r.report.correctiveGrip,...checkReplay(r)})),
    conclusion:'Dominant gap follows opposite shortest-turn plans across the antipode, not xi-only recovery amplification. No unjustified recovery/force-accounting difference found in this supported phase; no runtime correction or strength change justified. Both turn choices are permitted by the current policy. Physical/behavioral preference remains unvalidated.'};
for(const a of summary.accounting)assert(a.energy<1e-8&&a.support<1e-12&&a.reserve<1e-8&&a.tractionExcess<1e-7&&a.strengthExcess<1e-7);
const rawPath=`${root}/causal.raw.json`;writeFileSync(rawPath,JSON.stringify(raw));
assert.equal(sourceVersion(),source);assert.equal(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),commit);for(const p of files)assert.equal(sha(readFileSync(p)),hashes[p]);
const result={meta:{commit,source,node:process.version,flags,hashes,timestamp:new Date().toISOString(),baseline:'4ded6b600fd3785e65034aa5623d7a9f8f3c5db1',parent:'1986d92a1abd1c9218b6e8bd69193a4038687c93',
  settings:{handContact:'patch',materialTransport:'owned',gripTiming:'midpoint',constraintWork:'per-solve',correctiveGrip:'same validated recoverySpanInterval',interval:1/1920,intervals:96,elapsed:.05},
  note:'Explicit diagnostic state/target swaps, not candidate controller rules. World/capacities/recovery/defaults unchanged. Prior mechanical/cost/native receipts reused; no new game or runtime-speed claim.',instrumentedSeconds:(performance.now()-start)/1000},
  ...summary,raw:{path:rawPath,sha256:sha(readFileSync(rawPath))}};
writeFileSync(`${root}/causal.json`,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({meta:result.meta,gap:result.originalGap,interventions:result.interventions,accounting:result.accounting,references:result.references}));
