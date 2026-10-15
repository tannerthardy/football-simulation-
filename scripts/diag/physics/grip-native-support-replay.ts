/** Same-checkpoint callback identity and complete issued-tick continuation.
 * Existing support/contact laws only; no new recovery/controller decisions. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {deserialize} from 'node:v8';
import {World} from '../../../src/physics/world.js';
import {nativeSpanInterval} from './grip-native-span-interval.js';
import {nativeTransitionInterval} from './grip-native-slip.js';
import {sha} from './grip-bounded-fixtures.js';
const path='config/grip-native-support-packets.json',manifest=JSON.parse(readFileSync(path,'utf8')),root='out/grip-native-football',rows:any[]=[],verify=process.argv.includes('--verify-original');
function restore(bytes:Uint8Array){const p=deserialize(bytes),w:any=Object.assign(Object.create(World.prototype),p.fields);w.attachments=new WeakMap(p.attachments);return {p,w};}
const pose=(w:any)=>({time:w.time,bodies:structuredClone(w.bodies),report:structuredClone(w.report),grip:{...w.joints[0],a:undefined,b:undefined}});
for(const c of manifest.cases){
  const bytes=Buffer.from(c.input,'base64');assert.equal(sha(bytes),c.inputSha256);const states=[];
  for(const [mode,solver]of [['previous',nativeSpanInterval],['transition',nativeTransitionInterval]] as const){
    const {p,w}=restore(bytes),initial=pose(w),trace=[];w.activeGrip=solver;
    const original=verify?restore(readFileSync(`${root}/support-${c.history}-4.1.bin`)):undefined;
    if(original)original.w.activeGrip=solver;
    for(let k=0;k<96;k++){
      const a=[...p.args];a[4]-=k*a[3];w.integrateSubstep(...a);
      if(original){const a=[...original.p.args];a[4]-=k*a[3];original.w.integrateSubstep(...a);
        original.p.args[0].forEach((i:number,j:number)=>assert.deepEqual(original.w.bodies[i],w.bodies[j]));}
      trace.push(pose(w));
    }
    assert.equal(w.report.activeGrip.accepted,0);assert.equal(w.report.activeGrip.reasons['scope:recovery-command'],96);
    states.push({mode,initial,trace});
  }
  assert.deepEqual(states[0].trace,states[1].trace);
  rows.push({history:c.history,sameCheckpointIdentical:true,intervals:96,elapsed:96*c.physicalInterval,states});
}
const a=rows[0].states[0],b=rows[1].states[0],norm=(x:any,y:any)=>Math.hypot(x.x-y.x,x.y-y.y),changes=a.trace.map((x:any,i:number)=>{
  const y=b.trace[i];return {time:x.time,position:norm(x.bodies[0].pos,y.bodies[0].pos),xi:norm(x.bodies[0].support.xi,y.bodies[0].support.xi),
    load:norm(x.bodies[0].support.load,y.bodies[0].support.load),desired:norm(x.bodies[0].support.foot.desired,y.bodies[0].support.foot.desired),
    bodies:[x.bodies[0],y.bodies[0]],grips:[x.grip,y.grip]};}),first=changes.find((v:any)=>v.xi>.01),last=changes.at(-1);
if(verify){
  for(const row of rows){const raw=JSON.parse(readFileSync(`${root}/${manifest.input.id}-${row.history}.json`,'utf8')),
    tick=raw.ticks.find((v:any)=>Math.abs(v.initial.time-manifest.time)<1e-12),end=row.states[0].trace.at(-1);
    for(let i=0;i<2;i++){assert.deepEqual(end.bodies[i].pos,tick.bodies[i].pos);
      // The panel is JSON: an upright body's since=-Infinity encodes null.
      // Original/portable and callback comparisons above remain strict on V8 values.
      assert.deepEqual(JSON.parse(JSON.stringify(end.bodies[i].support)),tick.bodies[i].support);}
  }
}
const rawPath=`${root}/support-replay.raw.json`;writeFileSync(rawPath,JSON.stringify({rows,changes}));
const summary={input:{path,sha256:sha(readFileSync(path))},originalEquivalenceVerified:verify,sameCheckpointIdentical:rows.every(v=>v.sameCheckpointIdentical),
  issuedTick:96*manifest.cases[0].physicalInterval,initial:{position:norm(a.initial.bodies[0].pos,b.initial.bodies[0].pos),xi:norm(a.initial.bodies[0].support.xi,b.initial.bodies[0].support.xi)},
  firstSupportCentiyard:first,final:last,raw:{path:rawPath,sha256:sha(readFileSync(rawPath))},
  verdict:'Both callback identities give identical96-interval native fallback from each checkpoint. Different prior histories amplify during active recovery; this does not establish an erroneous support rule or one cause for older history witnesses.'};
writeFileSync(`${root}/support-replay.json`,JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify({...summary,firstSupportCentiyard:first?{time:first.time,xi:first.xi,position:first.position,load:first.load,desired:first.desired}:null,final:last?{time:last.time,xi:last.xi,position:last.position,load:last.load}:null}));
