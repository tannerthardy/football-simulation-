/** Same natural histories up to the first escape; no state/action overrides. */
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {dirname} from 'node:path';
import {PlaySim} from '../../../src/sim/playsim.js';
import {runContactObservers} from '../../../src/sim/run-contact-observer.js';
import {sourceVersion} from '../../source-version.js';
import {makeSim, rosters} from './inputs.js';
const output=process.argv[2]; if(!output)throw new Error('Explicit output required');
const R=rosters(),fixture=JSON.parse(gunzipSync(readFileSync('test/fixtures/planned-climb-fit.json.gz')).toString());
const specs=[
 {id:'wz-strong-over3',make:()=>makeSim({concept:'wz',dir:'strong',look:'over3',roster:'pair11',seed:77,formation:'ace_12'},R),until:1},
 {id:'wz-weak-over3',make:()=>makeSim({concept:'wz',dir:'weak',look:'over3',roster:'pair11',seed:77,formation:'ace_12'},R),until:.9},
 {id:'useful-climb-opponent',make:()=>new PlaySim(structuredClone(fixture.setup)),until:.9},
];
const rows=[];
for(const s of specs){
 const sim=s.make(),observations:any[]=[];
 runContactObservers.set(sim,(e,stage,data)=>{
  if(stage!=='movement')return;
  observations.push(structuredClone({t:sim.t,blocker:e.blocker.slot,defender:e.defender.slot,
   side:e.side,escape:e.defender.tags.has('escape-drive'),nextMoveAt:e.nextMoveAt,
   ownFelt:e.defender.body.support?.felt,ownVelocity:e.defender.vel,mass:e.defender.profile.massKg,data}));
 });
 while(sim.t<s.until-.00001){
  observations.length=0;
  const before=structuredClone({t:sim.t,rng:sim.rng,
   agents:sim.agents.map(a=>({slot:a.slot,body:a.body,mind:a.mind}))});
  sim.tick();
  if(sim.t>=s.until-.00001)rows.push({id:s.id,before,observations,
   after:structuredClone({t:sim.t,rng:sim.rng,agents:sim.agents.map(a=>({slot:a.slot,pos:a.pos,vel:a.vel,request:sim.intents[a.idx]}))})});
 }
}
mkdirSync(dirname(output),{recursive:true});
writeFileSync(output,JSON.stringify({source:sourceVersion(),DL_ESCAPE:process.env.DL_ESCAPE??'0',rows},null,2));
console.log(`${rows.length} native prefixes -> ${output}`);
