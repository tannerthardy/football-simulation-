import {writeFileSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
import {sourceVersion} from '../../source-version.js';
import {makeSaved,savedInputs} from './saved.js';
const start=performance.now(),rows=[];
for(const c of savedInputs().cases){
 const sim=makeSaved(c),initialRng=JSON.stringify(sim.rng)===JSON.stringify(c.observation.seedState);
 while(sim.phase==='live'&&sim.t<2.5)sim.tick();
 const emitted=sim.frames.filter(f=>f.t>=0&&f.t<=2.5),old=c.expected.frames.filter((f:any)=>f.t>=0&&f.t<=2.5);
 const first=emitted.find((f,i)=>JSON.stringify(f)!==JSON.stringify(old[i]));
 let maxQB=0,maxRB=0;
 for(const f of emitted){const o=old.find((p:any)=>p.t===f.t);if(!o)continue;for(const[a,k]of[[0,'QB'],[6,'RB']] as const){const d=Math.hypot(f.agents[a*3]-o.agents[a*3],f.agents[a*3+1]-o.agents[a*3+1]);if(k==='QB')maxQB=Math.max(maxQB,d);else maxRB=Math.max(maxRB,d);}}
 rows.push({id:c.id,initialRng,firstDifference:first?.t??null,maxQB,maxRB,frames:emitted,events:sim.events});
}
writeFileSync('out/run-failed-exchange/prefix.json.gz',gzipSync(JSON.stringify({source:sourceVersion(),elapsedSeconds:(performance.now()-start)/1000,rows})));console.log(JSON.stringify(rows.map(({frames,events,...r})=>r)));
