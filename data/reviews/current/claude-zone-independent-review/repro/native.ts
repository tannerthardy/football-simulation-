/** Independent bounded native controls for Claude50f6a08. No decision overrides. */
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { gunzipSync, gzipSync } from 'node:zlib';
import { dirname } from 'node:path';
import { PlaySim } from '../../src/sim/playsim.js';
import { makeSim, rosters } from './zone-lab/lab.js';
import { sourceVersion } from '../source-version.js';
const output=process.argv[2];if(!output)throw new Error('Explicit output required');
const R=rosters(),start=performance.now();
const fixture=JSON.parse(gunzipSync(readFileSync('test/fixtures/planned-climb-fit.json.gz')).toString());
const cases=[
 {id:'wz-strong-over3',make:()=>makeSim({concept:'wz',dir:'strong',look:'over3',roster:'pair11',seed:77,formation:'ace_12'},R),until:20},
 {id:'wz-weak-over3',make:()=>makeSim({concept:'wz',dir:'weak',look:'over3',roster:'pair11',seed:77,formation:'ace_12'},R),until:20},
 {id:'useful-climb-opponent',make:()=>new PlaySim(structuredClone(fixture.setup)),until:3.5},
];
const rows=[];
for(const c of cases){
 const sim=c.make(),before=performance.now(),frames:any[]=[],loads=new Map<string,any>();
 let error:string|null=null;const maxima={workResidual:0,armExcess:0};
 while(sim.phase==='live'&&sim.t<c.until){
  if(performance.now()-before>5000||performance.now()-start>20000){error='wall-budget';break;}
  try{sim.tick();}catch(e){error=String(e);break;}
  const report=sim.lastStep!;
  maxima.workResidual=Math.max(maxima.workResidual,Math.abs(report.work.residual));
  for(const a of sim.agents)maxima.armExcess=Math.max(maxima.armExcess,report.armImpulse[a.idx]-report.armImpulseLimit[a.idx]);
  const active=[];
  for(const e of sim.engagements)for(const [a,h]of[[e.blocker,e.hands]as const,...(e.helperHands?.entries()??[])]){
   const force=Math.hypot(h?.normalForce??0,h?.tangentForce??0);if(force<=1e-6)continue;
   const key=a.slot+'/'+e.defender.slot,p=loads.get(key)??{blocker:a.slot,defender:e.defender.slot,first:sim.t,last:sim.t,impulse:0};
   p.last=sim.t;p.impulse+=force*sim.dt;loads.set(key,p);active.push({blocker:a.slot,defender:e.defender.slot,force});
  }
  frames.push({t:sim.t,bodies:sim.agents.map(a=>({slot:a.slot,pos:{...a.pos},vel:{...a.vel},facing:a.facing})),loads:active,
   impacts:report.contacts.filter(p=>p.impulse>0&&sim.agents[p.i].team==='O'&&sim.agents[p.j].team==='O').map(p=>({a:sim.agents[p.i].slot,b:sim.agents[p.j].slot,impulse:p.impulse}))});
 }
 const terminal=sim.phase!=='live',result=sim.buildResult();
 const row={id:c.id,terminal,error,ending:terminal?result.outcome:'explicit-prefix-censor',gain:terminal?result.offenseYards:null,
  t:sim.t,elapsedSeconds:(performance.now()-before)/1000,maxima,firstContact:sim.events.find(e=>e.type==='carrier_contact')??null,
  actors:sim.agents.map(a=>({slot:a.slot,idx:a.idx})),loads:[...loads.values()],events:sim.events,frames};
 rows.push(row);if(error)break;
}
mkdirSync(dirname(output),{recursive:true});writeFileSync(output,gzipSync(JSON.stringify({source:sourceVersion(),flags:{RUN_LANE:process.env.RUN_LANE,CLIMB_EXIT:process.env.CLIMB_EXIT},elapsedSeconds:(performance.now()-start)/1000,rows})));
console.log(JSON.stringify(rows.map(({frames,events,actors,...r})=>r),null,2));
if(rows.some(r=>r.error))process.exitCode=1;
