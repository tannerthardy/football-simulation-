/** Check the report's named OZ mechanism on accepted code, without DL_ESCAPE. */
import {mkdirSync,writeFileSync} from 'node:fs';
import {dirname} from 'node:path';
import {makeSim,rosters} from './inputs.js';
import {runContactObservers} from '../../../src/sim/run-contact-observer.js';
import {sourceVersion} from '../../source-version.js';
const output=process.argv[2];if(!output)throw new Error('Explicit output required');
const input={concept:'oz',dir:'strong' as const,look:'over3',roster:'pair11',seed:77,formation:'ace_12'};
const sim=makeSim(input,rosters()),samples:any[]=[];
runContactObservers.set(sim,(e,stage,data)=>{
 if(stage==='movement'&&e.blocker.slot==='Y'&&[.95,1.45,1.95].some(t=>Math.abs(sim.t-t)<1e-8))
  samples.push(structuredClone({t:sim.t,stage,blocker:e.blocker.slot,defender:e.defender.slot,data}));
});
while(sim.t<2-.00001&&sim.phase==='live'){
 sim.tick();
 if([1,1.5,2].some(t=>Math.abs(sim.t-t)<1e-8))samples.push(structuredClone({t:sim.t,stage:'achieved',
  actors:['Y','DE_S'].map(slot=>{const a=sim.slot(slot as 'Y')!;return {slot,pos:a.pos,vel:a.vel,request:sim.intents[a.idx],support:a.body.support};})}));
}
mkdirSync(dirname(output),{recursive:true});writeFileSync(output,JSON.stringify({source:sourceVersion(),input,samples},null,2));
console.log(`${samples.length} samples -> ${output}`);
