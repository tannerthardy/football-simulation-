/** Bounded native contact-frame investigation; no controller/state overrides. */
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {dirname} from 'node:path';
import {createHash} from 'node:crypto';
import {gunzipSync,gzipSync} from 'node:zlib';
import {PlaySim} from '../../../src/sim/playsim.js';
import {runContactObservers} from '../../../src/sim/run-contact-observer.js';
import {sourceVersion} from '../../source-version.js';
import {makeSim,rosters} from './inputs.js';
const output=process.argv[2];if(!output)throw new Error('Explicit output required');
const opening=process.argv.includes('--opening'),transfer=process.argv.includes('--transfer');
const only=process.argv.find(x=>x.startsWith('--only='))?.slice(7);
const R=rosters(),fixture=JSON.parse(gunzipSync(readFileSync('test/fixtures/planned-climb-fit.json.gz')).toString());
const lab=(concept:string,dir:'strong'|'weak',look='over3')=>()=>makeSim({concept,dir,look,roster:'pair11',seed:77,formation:'ace_12'},R);
const specs=transfer?[{id:'oz-strong-under3',make:lab('oz','strong','under3'),until:20}]:[
 {id:'oz-strong-over3',make:lab('oz','strong'),until:20},
 {id:'wz-strong-over3',make:lab('wz','strong'),until:opening?2:20},
 {id:'wz-weak-over3',make:lab('wz','weak'),until:opening?2:20},
 {id:'useful-climb-opponent',make:()=>new PlaySim(structuredClone(fixture.setup)),until:opening?2:3.5},
];
const hash=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const rows=[],start=performance.now();
for(const spec of specs.filter(s=>!only||s.id===only)){
 const sim=spec.make(),initial=structuredClone(sim.agents.map(a=>({slot:a.slot,body:a.body,profile:a.profile}))),frames:any[]=[],samples:any[]=[];
 const maxima={workResidual:0,armImpulseExcess:0,armWorkExcess:0,supportWorkExcess:0};
 let tickSamples:any[]=[];
 runContactObservers.set(sim,(e,stage,data)=>{
  if(stage!=='movement')return;
  tickSamples.push(structuredClone({t:sim.t,blocker:e.blocker.slot,defender:e.defender.slot,
   normalForce:e.hands?.normalForce??0,tangentForce:e.hands?.tangentForce??0,
   defenderSupport:e.defender.body.support,drive:e.drive,axis:e.surfaceAxis,data}));
 });
 let error:string|null=null;
 while(sim.phase==='live'&&sim.t<spec.until-.00001){
  if(performance.now()-start>20000){error='wall-budget';break;}
  tickSamples=[];
  try{sim.tick();}catch(e){error=String(e);break;}
  const report=sim.lastStep!;
  maxima.workResidual=Math.max(maxima.workResidual,Math.abs(report.work.residual));
  const bodies=sim.agents.map(a=>{
   maxima.armImpulseExcess=Math.max(maxima.armImpulseExcess,report.armImpulse[a.idx]-report.armImpulseLimit[a.idx]);
   maxima.armWorkExcess=Math.max(maxima.armWorkExcess,report.armWork[a.idx]-report.armWorkLimit[a.idx]);
   maxima.supportWorkExcess=Math.max(maxima.supportWorkExcess,report.supportMotorWork[a.idx]-report.supportMotorWorkLimit[a.idx]);
   return {slot:a.slot,pos:{...a.pos},vel:{...a.vel},facing:a.facing,request:structuredClone(sim.intents[a.idx]),
    support:structuredClone(a.body.support),groundImpulse:report.groundImpulse[a.idx]};
  });
  const loads=[];
  for(const e of sim.engagements)for(const [a,h]of[[e.blocker,e.hands]as const,...(e.helperHands?.entries()??[])]){
   const force=Math.hypot(h?.normalForce??0,h?.tangentForce??0);
   if(force>1e-6)loads.push({blocker:a.slot,defender:e.defender.slot,force,normal:h?.normalForce,tangent:h?.tangentForce});
  }
  samples.push(...tickSamples);
  frames.push({t:sim.t,bodies,loads,impacts:report.contacts.filter(p=>p.impulse>0&&sim.agents[p.i].team==='O'&&sim.agents[p.j].team==='O')
   .map(p=>({a:sim.agents[p.i].slot,b:sim.agents[p.j].slot,impulse:p.impulse}))});
 }
 const terminal=sim.phase!=='live',r=sim.buildResult();
 rows.push({id:spec.id,initial,initialSha256:hash(initial),terminal,error,t:sim.t,gain:terminal?r.offenseYards:null,
  ending:terminal?r.outcome:'explicit-prefix-censor',maxima,actors:sim.agents.map(a=>({slot:a.slot,idx:a.idx})),events:sim.events,frames,samples});
}
mkdirSync(dirname(output),{recursive:true});
writeFileSync(output,gzipSync(JSON.stringify({source:sourceVersion(),elapsedSeconds:(performance.now()-start)/1000,
 settings:'44 accepted flags; RUN_CONTACT_COMPONENTS=1; CF_FLOW unset; no experimental activation',rows})));
console.log(JSON.stringify(rows.map(({initial,frames,samples,events,actors,...r})=>r)));
if(rows.some(r=>r.error))process.exitCode=1;
