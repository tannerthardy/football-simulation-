// One same-state diagnostic of the first adverse P019 decision. No native rerun.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {chooseRunApproach} from '../../src/sim/run-approach.js';
const start=performance.now(),trace=JSON.parse(gunzipSync(readFileSync('out/run-entry-relevance/native.json.gz')));
const baseline=trace.rows.find(r=>r.play===19&&r.arm==='information-only');
const candidate=trace.rows.find(r=>r.play===19&&r.arm==='portable-admission');
const first=trace.comparisons.find(c=>c.play===19).firstChangedRequest;
assert(first,'Opposing opening must expose an adverse decision to diagnose');
const frame=baseline.frames.find(f=>f.t===first.t),other=candidate.frames.find(f=>f.t===first.t);
assert.deepEqual(frame.before,other.before);
const peers=candidate.cues.filter(c=>c.t===frame.t).map(c=>({id:c.target,picture:c.picture,
  radius:frame.before[c.target].profile.radius,brake:frame.before[c.target].profile.brake}));
const alternatives=[['raw requested',frame.raw[6]],['spacing issued',frame.final[6]]].map(([label,command])=>{
  const r=chooseRunApproach(frame.before[6],command,peers,frame.t,'center');
  return{label,command,choice:r.kind,status:r.status,knownMinimumGap:r.knownMinimumGap,
    choices:r.choices.map(c=>({kind:c.kind,status:c.status,knownMinimumGap:c.knownMinimumGap,
      worst:c.gaps.filter(g=>g.gap!==null).sort((a,b)=>a.gap-b.gap)[0],end:c.path.at(-1)}))};
});
const acquired=peers.find(p=>p.id===7),bodyAt=t=>baseline.frames.find(f=>Math.abs(f.t-t)<1e-9)?.before[7];
const report={schema:'run-entry-first-adverse-v1',question:'Does the prior raw approach preview contradict the request actually issued by existing teammate spacing?',
  t:frame.t,sameOwnAndPeerInformation:true,alternatives,acquiredTightEnd:acquired,
  actualTightEndPositions:[0,.20,.40,.60].map(dt=>{const t=frame.t+dt;return{t,pos:bodyAt(t)?.pos,vel:bodyAt(t)?.vel};}),
  warning:'Actual future state is diagnostic-only and is never supplied to a controller. The spacing-issued command is not claimed to be available before that stage executes.',
  newNativeTicks:0,elapsedSeconds:(performance.now()-start)/1000};
writeFileSync('out/run-entry-relevance/adverse.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));
