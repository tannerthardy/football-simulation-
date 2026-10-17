import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync,gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {makeSim,rosters} from '../../scripts/diag/box-defense-review/inputs.js';
import {axisOf} from '../../src/sim/engagement.js';
import {sourceVersion} from '../../scripts/source-version.js';
const sim=makeSim({concept:'wz',dir:'weak',look:'over3',roster:'pair11',seed:77,formation:'ace_12'},rosters());
const lg=sim.slot('LG')!,center=sim.slot('C')!,down=sim.slot('DT_W')!;
const see=sim.see.bind(sim),samples:any[]=[],frames:any[]=[];
let observed:any[]=[],writes:any[]=[],intent=sim.intents[lg.idx];
sim.see=(observer,target,scale)=>{const picture=see(observer,target,scale);
 if(observer===lg)observed.push({target:target.slot,picture:structuredClone(picture)});return picture;};
Object.defineProperty(sim.intents,lg.idx,{configurable:true,enumerable:true,get:()=>intent,set:(command)=>{
 intent=command;if(sim.t<.45||sim.t>1.1)return;
 const e=lg.engagement,axis=e?axisOf(sim,e):null,hand=e?.helperHands?.get(lg);
 writes.push({command:structuredClone(command),stack:new Error().stack?.split('\n').slice(2,5),
  ownBody:structuredClone(lg.body),ownerBody:structuredClone(center.body),downBody:structuredClone(down.body),
  axis,drive:e?.drive,primary:e?.blocker.slot,helper:e?.helpers.includes(lg),
  hands:hand?{normal:hand.normalForce,tangent:hand.tangentForce,extension:hand.extension}:null});
}});
const start=performance.now();while(sim.phase==='live'&&sim.t<1.15){
 observed=[];writes=[];sim.tick();samples.push({t:sim.t-.05,writes,observed});
 frames.push({t:sim.t,bodies:sim.agents.map(a=>({slot:a.slot,pos:{...a.pos},vel:{...a.vel},facing:a.facing}))});
}
const old=JSON.parse(gunzipSync(readFileSync('out/weak-departure/baseline.json.gz')).toString()).rows[0];
const exact=frames.every((f,i)=>f.bodies.every((a,j)=>['slot','pos','vel','facing'].every(k=>
 JSON.stringify(a[k as keyof typeof a])===JSON.stringify(old.frames[i].bodies[j][k]))));
const result={source:sourceVersion(),scriptSha256:createHash('sha256').update(readFileSync('out/weak-departure/opening.ts')).digest('hex'),exactAcceptedPrefix:exact,
 elapsedSeconds:(performance.now()-start)/1000,samples};
writeFileSync('out/weak-departure/opening.json.gz',gzipSync(JSON.stringify(result)));
console.log(JSON.stringify({exact,cost:result.elapsedSeconds,samples:samples.filter(s=>s.t>=.65&&s.t<=1).map(s=>({t:s.t,writes:s.writes.map((w:any)=>({command:w.command,stack:w.stack,
 axis:w.axis,drive:w.drive,hands:w.hands,helper:w.helper,ownPos:w.ownBody.pos,ownerPos:w.ownerBody.pos,downPos:w.downBody.pos}))}))}));
if(!exact)process.exitCode=1;
