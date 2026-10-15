/** Reuse the small panel histories; reference only newly exercised tangent
 * transitions. No new snaps, candidate changes, or broad tests. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {sourceVersion} from '../../source-version.js';
import {sha} from './grip-bounded-fixtures.js';
import {nativeSlipReference,nativeSlipDifference,type nativeSlipInterval} from './grip-native-slip.js';
import {activeGripResultValid} from '../../../src/physics/active-grip.js';
const root='out/grip-native-football',panel=JSON.parse(readFileSync(`${root}/panel.json`,'utf8')),comparisons:any[]=[],mechanical:any[]=[],raw:any[]=[];
assert.equal(sourceVersion(),panel.meta.source);
const norm=(a:any,b:any)=>Math.hypot((a?.x??0)-(b?.x??0),(a?.y??0)-(b?.y??0));
for(const input of panel.meta.inputs){
  const variants=['owned','previous','transition'].map(mode=>JSON.parse(readFileSync(`${root}/${input.id}-${mode}.json`,'utf8')));
  for(const v of variants){assert.deepEqual(v.ticks[0].initial,variants[0].ticks[0].initial);assert.deepEqual(v.result.firstGrip,variants[0].result.firstGrip);}
  const transition=variants[2];
  for(const [index,c] of transition.invocations.entries())if(c.result?.tangentSlip){
    const candidate=c.result as ReturnType<typeof nativeSlipInterval>,lo=nativeSlipReference(c.input,1024),hi=nativeSlipReference(c.input,2048),
      convergence=nativeSlipDifference(lo,hi),accuracy=nativeSlipDifference(candidate,hi);
    assert(convergence<=1/16&&accuracy<=1/16);assert(activeGripResultValid(c.input,candidate));assert(activeGripResultValid(c.input,hi));
    mechanical.push({id:input.id,index,time:c.time,convergence,accuracy,events:candidate.events,share:candidate.legs,
      workResidual:candidate.workResidual,energyResidual:candidate.energyResidual,angularResidual:candidate.angularResidual});
    raw.push({id:input.id,index,input:c.input,candidate,lo,hi});
  }
  for(const [i,j]of [[1,2],[0,1]]){
    const a=variants[i],b=variants[j],trace:any[]=[];
    for(let k=0;k<Math.min(a.ticks.length,b.ticks.length);k++){
      const x=a.ticks[k],y=b.ticks[k];trace.push({k,time:x.time,initialPosition:norm(x.initial.bodies[0].pos,y.initial.bodies[0].pos),
        position:norm(x.bodies[0].pos,y.bodies[0].pos),velocity:norm(x.bodies[0].vel,y.bodies[0].vel),xi:norm(x.bodies[0].support.xi,y.bodies[0].support.xi),
        state:[x.bodies[0].support.state,y.bodies[0].support.state],holderState:[x.bodies[1].support.state,y.bodies[1].support.state],
        request:norm(x.initial.requests[1].vel,y.initial.requests[1].vel),audit:[x.report.activeGrip??null,y.report.activeGrip??null]});
    }
    const first=(p:(v:any)=>boolean)=>trace.find(p)??null,contact=(v:any)=>v.ticks.flatMap((t:any)=>t.report.contacts.filter((c:any)=>c.impulse>0).map((c:any)=>({time:t.time,...c})))[0]??null,
      loss=(v:any,i:number)=>v.ticks.find((t:any)=>t.bodies[i].support.state!=='up')?.time??null;
    comparisons.push({id:input.id,comparison:`${a.mode} -> ${b.mode}`,ending:[a.result.ending,b.result.ending],advanceDifference:b.result.advanceAfterGrip-a.result.advanceAfterGrip,
      durationDifference:b.result.contactToEnd-a.result.contactToEnd,firstChange:first(t=>t.position>1e-12||t.xi>1e-12),
      firstMilliyard:first(t=>t.position>=.001),firstCentiyard:first(t=>t.position>=.01),firstSupportCentiyard:first(t=>t.xi>=.01),
      firstSupportState:first(t=>t.state[0]!==t.state[1]),firstHolderState:first(t=>t.holderState[0]!==t.holderState[1]),firstRequest:first(t=>t.request>1e-8),
      firstPhysicalContact:[contact(a),contact(b)],firstSupportLoss:[loss(a,0),loss(b,0)],firstHolderLoss:[loss(a,1),loss(b,1)],
      note:'Position/support thresholds describe history growth, not acceptance tolerances or causal verdicts.'});
    raw.push({id:input.id,comparison:`${a.mode} -> ${b.mode}`,trace});
  }
}
const output=`${root}/audit.json`,rawPath=`${root}/audit.raw.json`;writeFileSync(rawPath,JSON.stringify(raw));
writeFileSync(output,JSON.stringify({meta:{runtimeSource:panel.meta.source,panel:{path:`${root}/panel.json`,sha256:sha(readFileSync(`${root}/panel.json`))},
  script:{path:import.meta.filename,sha256:sha(readFileSync(import.meta.filename))},referenceSteps:[1024,2048],allowance:1/16},
  mechanical,comparisons,raw:{path:rawPath,sha256:sha(readFileSync(rawPath))}},null,2)+'\n');
console.log(JSON.stringify({output,transitionInputs:mechanical.length,worstAccuracy:Math.max(...mechanical.map(v=>v.accuracy)),worstConvergence:Math.max(...mechanical.map(v=>v.convergence))}));
