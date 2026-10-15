// Assert and reduce already collected evidence; zero new simulation.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
const root='docs/reviews/run-entry-relevance',raw=readFileSync(root+'/native.json.gz'),trace=JSON.parse(gunzipSync(raw));
const control=trace.rows.filter(r=>r.play===19),target=trace.rows.filter(r=>r.play===32);
assert.equal(control.length,2);assert.equal(target.length,2);
for(const rows of [control,target]){
  assert.equal(rows[0].initialHash,rows[1].initialHash);
  for(const row of rows){assert(row.savedInitialBodiesEqual);assert(row.savedPostConstructorRngEqual);}
}
assert.deepEqual(control[0].frames,control[1].frames);
assert.deepEqual(control[0].events,control[1].events);
assert.deepEqual(control[0].finalState,control[1].finalState);
assert.equal(control[0].frames.length,60);
const first=trace.comparisons.find(r=>r.play===32).firstChangedRequest;
assert(first.sameBodiesBefore);assert.deepEqual(first.actors,[6]);
const targetSummary=trace.comparisons.find(r=>r.play===32).summaries;
assert(targetSummary.every(r=>r.impacts.length===0));
const result={schema:'run-entry-relevance-measurement-v1',sourceSha256:trace.sourceSha256,
  rawTraceSha256:createHash('sha256').update(raw).digest('hex'),
  control:{all60FramesEqual:true,eventsEqual:true,finalBodiesBallRngEqual:true},
  target:{firstExecutedRequestChange:first,
    noTeammateImpactsEitherArm:true,rgNormalImpulseRatio:targetSummary[1].loads[5].normalImpulse/targetSummary[0].loads[5].normalImpulse,
    finalRgPositions:target.map(r=>({arm:r.arm,pos:r.frames.at(-1).after[5].pos})),
    summaries:targetSummary},newNativeTicks:0};
writeFileSync(root+'/measurements.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({control:result.control,target:{first:result.target.firstExecutedRequestChange,
  rgLoadRatio:result.target.rgNormalImpulseRatio},newNativeTicks:0}));
