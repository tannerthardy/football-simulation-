/** Zero native continuations: reduce the exact saved reference and trial. */
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {previewFreeMovement} from '../../src/physics/movement-preview.js';
const root='data/reviews/current/mesh-lateral-approach',reference='data/reviews/current/mesh-motion-admission/current-candidate';
const read=(p:string)=>JSON.parse(gunzipSync(readFileSync(p)).toString());
const digest=(x:unknown)=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const required=(x:unknown,message:string)=>{if(!x)throw Error(message);};
const inputs:string[]=[];
function capture(p:string){inputs.push(p);return read(p);}
const a=capture(`${reference}/A044.json.gz`),b=capture(`${root}/v1/A044.json.gz`);
const c=capture(`${reference}/A008.json.gz`),d=capture(`${root}/v1/A008.json.gz`);
const allTicksEqual=c.ticks.length===d.ticks.length&&d.ticks.every((t:any,i:number)=>{
  const o=c.ticks[i];return t.t===o.t&&t.after===o.after&&digest(t.agents)===digest(o.agents)
    &&digest(t.commands)===digest(o.commands)&&digest(t.contacts)===digest(o.contacts);});
required(allTicksEqual&&digest(c.events)===digest(d.events)&&digest(c.rng)===digest(d.rng),'A008 control mismatch');
required(b.firstDifference.t===2.35&&digest(b.firstDifference.actors)===digest([21]),'Unexpected first divergence');
required(digest(a.events)===digest(b.events),'A044 event sequence changed');
const impacts=(data:any)=>data.ticks.flatMap((t:any)=>(t.contacts??[]).filter((p:any)=>p.i===15&&p.j===21||p.i===21&&p.j===15)
  .map((p:any)=>({t:t.t,...p})));
const before=impacts(a),after=impacts(b);required(before.length===1&&after.length===1,'Unexpected impact count');
const actors=new Set(b.ticks.flatMap((t:any,i:number)=>t.agents.filter((p:any,j:number)=>digest(p)!==digest(a.ticks[i].agents[j])).map((p:any)=>p.idx)));
required([...actors].every(i=>i===15||i===21),'Unexplained other actor motion');
const changes=b.decisions.filter((x:any)=>x.reason==='lateral');
let maxFirstStepPositionError=0,maxFirstStepVelocityError=0;
for(const change of changes){
  const before=b.stages.find((e:any)=>e.t===change.t&&e.actor===21&&e.stage==='world-input');
  const own=structuredClone(before.body),old=digest(own),sample=previewFreeMovement(own,change.detail.alternative,change.t,1)[0];
  const actual=b.ticks.find((t:any)=>t.t===change.t).agents[21];
  required(old===digest(own),'Preview mutated captured own body');
  maxFirstStepPositionError=Math.max(maxFirstStepPositionError,Math.hypot(actual.pos.x-sample.pos.x,actual.pos.y-sample.pos.y));
  maxFirstStepVelocityError=Math.max(maxFirstStepVelocityError,Math.hypot(actual.vel.x-sample.vel.x,actual.vel.y-sample.vel.y));
}
required(maxFirstStepPositionError<1e-12&&maxFirstStepVelocityError<1e-12,'Alternative did not achieve predicted first step');
const metrics=(data:any,t:number)=>{
  const p=data.ticks.find((x:any)=>x.t===t).agents;
  const gap=(i:number)=>Math.hypot(p[i].pos.x-p[10].pos.x,p[i].pos.y-p[10].pos.y);
  const speed=(i:number)=>Math.hypot(p[i].vel.x,p[i].vel.y);
  return {SSReceiverGap:gap(21),robberReceiverGap:gap(15),SSSpeed:speed(21),robberSpeed:speed(15),SS:p[21],robber:p[15]};
};
const comparison=[2.35,2.5,2.75,2.8,2.85].map(t=>({commandTick:t,movementEndsAt:+(t+.05).toFixed(2),reference:metrics(a,t),lateral:metrics(b,t)}));
const early=JSON.parse(readFileSync(`${root}/earlier-offline/summary.json`,'utf8'));
const earlyRows=early.rows.filter((r:any)=>r.t<=2.2&&r.result.detail).map((r:any)=>({t:r.t,reason:r.result.reason,...r.result.detail}));
required(earlyRows.every((r:any)=>r.reason==='not-better'),'Earlier useful motion would require coupled test');
const bills=['offline-launcher.json','v1-launcher.json','earlier-offline-launcher.json','typecheck-launcher.json','typecheck-corrected-launcher.json']
  .map(p=>({file:p,receipt:JSON.parse(readFileSync(`${root}/${p}`,'utf8'))}));
const summary={schema:'mesh-lateral-review-v1',recommendation:'Keep narrow admission fix in independent review. Hold lateral research from production.',
  executedCandidate:'7f1776066786a0a6a093a306ccfc3ac4eabf653e',earlierOfflineCandidate:'8e7bee92d9739bf42479fc9a28ba9984db455bdf',
  engineHost:'6e19ad2d4aac73e71ae57c1893a9b389074eeaa5',accepted:'7eb2554f5dbb497cff169f386704a5b0f4cf43fe',
  sourceSha256:a.provenance.sourceSha256,productionEdits:0,newNativeExecutions:2,
  baselineReuse:'Exact current-candidate A044/A008 from6e19ad2; old bend and historical block remain separate.',
  firstDifference:b.firstDifference,changedMotionActors:[...actors].sort((a,b)=>Number(a)-Number(b)),
  impacts:{reference:before,lateral:after,impulseReductionFraction:1-after[0].impulse/before[0].impulse},
  achievableFirstStep:{alternatives:changes.length,maxPositionError:maxFirstStepPositionError,maxVelocityError:maxFirstStepVelocityError},
  comparison,earlierSameTarget:earlyRows,
  usefulControl:{all22BodiesCommandsContactsExact:allTicksEqual,eventsExact:digest(c.events)===digest(d.events),rngExact:digest(c.rng)===digest(d.rng),
    catchAndWrap:c.events.filter((e:any)=>['catch','tackle_wrap'].includes(e.type)),stoppedAt:d.stoppedAt},
  limitation:'Both A044 arms drop H at2.90 and die at3.55. No postcatch pursuit, touchdown causality or live late Z/CB blocking claim.',
  runtime:{commands:bills.map(({file,receipt:r})=>({file,exitCode:r.exitCode,seconds:r.commands.reduce((v:number,c:any)=>v+c.elapsedSeconds,0)})),
    totalLauncherSeconds:bills.reduce((v,{receipt:r})=>v+r.commands.reduce((s:number,c:any)=>s+c.elapsedSeconds,0),0),
    nativeLauncherSeconds:bills.find(b=>b.file==='v1-launcher.json')!.receipt.commands[0].elapsedSeconds,
    nativeInsideScriptMs:JSON.parse(readFileSync(`${root}/v1/summary.json`,'utf8')).elapsedMs},
  inputs:inputs.map(path=>({path,sha256:createHash('sha256').update(readFileSync(path)).digest('hex')}))};
writeFileSync(`${root}/review.json`,JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify({newNativeExecutions:2,impacts:summary.impacts,firstStep:summary.achievableFirstStep,control:summary.usefulControl,runtime:summary.runtime}));
