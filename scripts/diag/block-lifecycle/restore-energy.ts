/** Recover incoming energy for the recorded physical pre-snap movement.
 * No live ticks or controller-history injection. Save original failed prefix. */
import {writeFileSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
import {makeSaved,savedInputs} from './saved.js';
const output=process.argv[2];if(!output)throw Error('explicit ignored output required');
const input='test/fixtures/block-lifecycle-inputs.json.gz',data=savedInputs(input),case0=data.cases.find((c:any)=>c.id==='G1-P015');
const iterations=[];
for(let n=0;n<6;n++){
 const sim=makeSaved(case0);let error=0;const next:any={};
 for(const p of case0.observation.initialPlayers){
  const a=sim.agents.find(a=>a.player.id===p.id)!;
  const delta=p.energy-a.body.energy;error=Math.max(error,Math.abs(delta));
  next[p.id]=(case0.preStageEnergy?.[p.id]??p.energy)+delta;
 }
 iterations.push({n,maxError:error});if(error<1e-13)break;
 if(n===5)throw Error('incoming energy unresolved');
 case0.preStageEnergy=next;
}
for(const c of data.cases)delete c.players;
data.reconstruction={incomingEnergyRecovery:'Iterate existing native constructor physical staging only to match recorded full-precision post-staging initial energy; no live tick, pose/mind/observer injection or capability change.',iterations};
writeFileSync(output,gzipSync(JSON.stringify(data)));
console.log(JSON.stringify(data.reconstruction));
