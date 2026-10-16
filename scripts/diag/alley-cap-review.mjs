/** Saved-only alley-motion review. INPUT_DIRECTORY OUTPUT.json. Zero ticks. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
const [dir,out]=process.argv.slice(2),began=performance.now(),
 hash=b=>createHash('sha256').update(b).digest('hex'),
 read=n=>{const b=readFileSync(`${dir}/${n}`);return JSON.parse(n.endsWith('.gz')?gunzipSync(b):b);};
assert.ok(!existsSync(out));
const result={schema:'alley-cap-review-v1',operator:hash(readFileSync(import.meta.filename)),
 accepted:'86250bb4f0c6f421878c204161864d523c3e30b6',
 candidateSource:'c284f5e9bb2144fd7fa55c6df374d22ecbc9cfeb0d9ad3c0208f44bf7a319aae',
 nativeExecutions:0,rows:[]};
for(const n of ['A042','A006','A003','A008','A020']){
 const c=read(`moving-cap-${n}.json.gz`),raw=read(`${n}.json`),
  ref=n==='A042'?read('A042-reference-extended.json.gz'):n==='A006'?read('moving-cap-reference-A006.json.gz'):null,
  baseline=ref?.native??{frames:raw.result.frames,states:raw.result.telemetry.frames},
  events=ref?.events??raw.result.events;
 assert.equal(c.sourceSha256,result.candidateSource);assert.ok(c.observerNeutral);
 assert.equal(c.inputNativeSha256,hash(readFileSync(`${dir}/${n}.json`)));
 const relevant=e=>['carrier_contact','tackle_wrap','broken_tackle','tackle','fall'].includes(e.type),
  row={case:n,inputSha256:c.inputNativeSha256,actors:c.actors,
   referenceKind:ref?'fresh accepted86250bb replay':'compatible accepted7eb2554 saved non-Duo case',
   candidateEnd:{t:c.end,censored:c.censored},referenceEnd:ref?{t:ref.end,censored:ref.censored}:{t:raw.result.frames.at(-1).t,censored:false},arms:[]};
 for(const [arm,native,es]of [['reference',baseline,events],['candidate',c.native,c.events]]){
  const contact=es.find(e=>e.type==='carrier_contact'),wrap=es.find(e=>e.type==='tackle_wrap'&&e.note==='initial'),
   tackler=contact.b,runner=contact.a,firstBreak=es.find(e=>e.type==='broken_tackle'&&e.b===tackler),
   finish=es.find(e=>e.type==='tackle'),state=native.states.find(s=>s.t===contact.t),
   v=state.agents[runner].body.velocity,speed=Math.hypot(...v),ux=v[0]/speed,uy=v[1]/speed,
   dx=wrap.pos.x-contact.pos.x,dy=wrap.pos.y-contact.pos.y;
  row.arms.push({arm,runner,tackler,firstGrasp:contact.t,eventSeparation:Math.hypot(dx,dy),
   entryForeAft:dx*ux+dy*uy,entryCrossTrack:ux*dy-uy*dx,
   defenderVelocity:state.agents[tackler].body.velocity,runnerVelocity:v,
   firstGripBreak:firstBreak?.t??null,
   firstGripSurvival:firstBreak?firstBreak.t-contact.t:finish?finish.t-contact.t:null,
   completedTackle:finish?.t??null,events:es.filter(relevant)});
 }
 row.firstChangedAgents=c.native.states.find((s,j)=>JSON.stringify(s.agents)!==JSON.stringify(baseline.states[j].agents))?.t??null;
 row.firstRunnerChange=c.native.states.find((s,j)=>JSON.stringify(s.agents[c.target])!==JSON.stringify(baseline.states[j].agents[c.target]))?.t??null;
 row.firstSelectedDefenderChange=c.native.states.find((s,j)=>JSON.stringify(s.agents[c.actor])!==JSON.stringify(baseline.states[j].agents[c.actor]))?.t??null;
 if(n==='A008'||n==='A020'){
  assert.deepEqual(c.native.frames,baseline.frames.filter(f=>f.t<=c.native.frames.at(-1).t));
  assert.deepEqual(c.native.states.map(s=>s.agents),baseline.states.filter(s=>s.t<=c.native.states.at(-1).t).map(s=>s.agents));
  assert.deepEqual(c.events,events.filter(e=>e.t<=c.events.at(-1).t));
  row.exactRecordedFramesStatesEvents=true;
 }
 result.rows.push(row);
}
const early=read('moving-cap-early-A042.json.gz'),first=early.rows.find(r=>r.t===.5);
result.firstSSCapCue={t:first.t,job:first.job,runFit:first.runFit,cues:first.cues,command:first.command};
assert.equal(first.cues.find(c=>c.caller.includes('at executeRunFit')).picture.carrying,false);
result.seconds=(performance.now()-began)/1000;
writeFileSync(out,JSON.stringify(result));
console.log(JSON.stringify({out,seconds:result.seconds,nativeExecutions:0,rows:result.rows.map(r=>({case:r.case,
 entry:r.arms.map(a=>a.eventSeparation),survival:r.arms.map(a=>a.firstGripSurvival),tackles:r.arms.map(a=>a.completedTackle),
 exact:r.exactRecordedFramesStatesEvents??false}))}));
