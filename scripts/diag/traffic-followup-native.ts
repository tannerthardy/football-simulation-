/** Opt-in stage capture. Copies existing observations/commands only. */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { PlaySim } from '../../src/sim/playsim.js';
import { sourceVersion } from '../source-version.js';

const args=process.argv.slice(2),arg=(k:string)=>args[args.indexOf(k)+1];
const cases=[{id:'A028',until:2.8},{id:'A018',until:3.95},{id:'A006',until:3.95}];
if(!args.includes('--run')){console.log(JSON.stringify({cases,budgetSeconds:10,extraObservations:0}));process.exit(0);}
const input=arg('--input'),out=arg('--out');
if(!input||!out||existsSync(out))throw Error('Use saved --input and fresh --out');
const hash=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const profile=JSON.parse(readFileSync('config/baseline.json','utf8'));
if(process.versions.node!==profile.nodeVersion||Object.entries(profile.flags).some(([k,v])=>(process.env[k]??null)!==v))throw Error('Use pinned launcher');
mkdirSync(out,{recursive:true});
const start=performance.now(),rows=[];
for(const spec of cases){
 const saved=JSON.parse(readFileSync(`${input}/${spec.id}.json`,'utf8'));
 const sim=new PlaySim(structuredClone(saved.setup));
 if(hash(sim.agents.map(a=>({idx:a.idx,id:a.player.id,body:a.body})))!==hash(saved.initialBodies))throw Error('Initial bodies drift');
 const ticks:any[]=[],pictures:any[]=[],raw=new Map();let preSpacing:unknown;
 const see=sim.see.bind(sim);
 sim.see=(a,b,delay)=>{const seen=see(a,b,delay);const spacing=new Error().stack?.includes('spaceTeammates');
  if(spacing&&!preSpacing)preSpacing=structuredClone(sim.intents);
  pictures.push({a:a.idx,b:b.idx,delay,spacing,seen:structuredClone(seen)});return seen;};
 for(const a of sim.agents){const update=a.behavior.update.bind(a.behavior);a.behavior.update=(actor,play)=>{
  const command=update(actor,play);raw.set(a.idx,structuredClone(command));return command;};}
 sim.event('snap',sim.slot('C')??sim.qb);
 while(sim.phase==='live'&&sim.t<spec.until){
  if(performance.now()-start>10000)throw Error('Budget');
  raw.clear();pictures.length=0;preSpacing=undefined;
  const t=sim.t,before=sim.agents.map(a=>structuredClone(a.body));sim.tick();
  ticks.push({t,before,raw:[...raw],preSpacing,pictures:[...pictures],final:structuredClone(sim.intents),
   after:sim.agents.map(a=>structuredClone(a.body)),contacts:structuredClone(sim.lastStep?.contacts)});
 }
 const frames=saved.result.frames.filter((f:any)=>f.t<=sim.t-.05);
 // The saved collector records post-tick frames with the pre-tick label.
 const equalFrames=hash(sim.frames)===hash(frames);
 const result={caseId:spec.id,inputSha256:hash(saved.setup),source:sourceVersion(),actors:saved.actors,ticks,events:sim.events,stoppedAt:sim.t,equalSavedFrames:equalFrames};
 writeFileSync(`${out}/${spec.id}.json.gz`,gzipSync(JSON.stringify(result)));
 rows.push({caseId:spec.id,ticks:ticks.length,stoppedAt:sim.t,equalSavedFrames:equalFrames});
}
writeFileSync(`${out}/summary.json`,JSON.stringify({rows,elapsedSeconds:(performance.now()-start)/1000},null,2)+'\n');
console.log(JSON.stringify({rows,elapsedSeconds:(performance.now()-start)/1000}));
