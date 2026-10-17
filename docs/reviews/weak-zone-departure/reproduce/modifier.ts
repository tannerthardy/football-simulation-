import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync,gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {makeSim,rosters} from '../../scripts/diag/box-defense-review/inputs.js';
import {movementObjective} from '../../src/sim/movement-objective.js';
import {sourceVersion} from '../../scripts/source-version.js';
const input={concept:'wz',dir:'weak' as const,look:'over3',roster:'pair11',seed:77,formation:'ace_12'};
const sim=makeSim(input,rosters()),lg=sim.slot('LG')!,b:any=lg.behavior;
const seen=sim.see.bind(sim),update=b.update.bind(b),samples:any[]=[],frames:any[]=[];
let pictures:any[]=[],pending:any;
sim.see=(observer,target,scale)=>{
 const picture=seen(observer,target,scale);
 if(observer===lg)pictures.push({target:target.slot,picture:structuredClone(picture)});
 return picture;
};
b.update=(...args:any[])=>{
 const command=update(...args);
 pending={t:sim.t,body:structuredClone(lg.body),raw:structuredClone(command),
  objective:structuredClone(movementObjective(command)),departure:!!b.plan.departure,
  climbRead:b.climbRead?{nextRead:b.climbRead.nextRead,meet:{...b.climbRead.meet},through:b.climbRead.through,
   attainable:b.climbRead.attainable,seenVel:{...b.climbRead.seenVel}}:null};
 return command;
};
const start=performance.now();
while(sim.phase==='live'&&sim.t<20){
 if(performance.now()-start>10000)throw Error('wallbudget');
 pictures=[];pending=null;sim.tick();
 if(pending&&pending.t>=2.25&&pending.t<=2.75)samples.push({...pending,pictures,
  final:structuredClone(sim.intents[lg.idx]),postBody:structuredClone(lg.body),
  impacts:sim.lastStep!.contacts.filter(p=>p.impulse>0&&sim.agents[p.i].team==='O'&&sim.agents[p.j].team==='O')});
 frames.push({t:sim.t,bodies:sim.agents.map(a=>({slot:a.slot,pos:{...a.pos},vel:{...a.vel},facing:a.facing}))});
}
const old=JSON.parse(gunzipSync(readFileSync('out/weak-departure/forecast.json.gz')).toString()).rows[0];
const exact=frames.length===old.frames.length&&frames.every((f,i)=>f.bodies.every((a,j)=>
 ['slot','pos','vel','facing'].every(k=>JSON.stringify(a[k as keyof typeof a])===JSON.stringify(old.frames[i].bodies[j][k]))));
const result={input,source:sourceVersion(),scriptSha256:createHash('sha256').update(readFileSync('out/weak-departure/modifier.ts')).digest('hex'),
 exactToSavedForecastNative:exact,elapsedSeconds:(performance.now()-start)/1000,samples};
writeFileSync('out/weak-departure/modifier.json.gz',gzipSync(JSON.stringify(result)));
console.log(JSON.stringify({exact,elapsedSeconds:result.elapsedSeconds,samples:samples.map(s=>({t:s.t,raw:s.raw,final:s.final,
  objective:s.objective,climbRead:s.climbRead,own:{pos:s.body.pos,vel:s.body.vel},pictures:s.pictures.filter((p:any)=>['LB_M','LT'].includes(p.target))}))}));
if(!exact)process.exitCode=1;
