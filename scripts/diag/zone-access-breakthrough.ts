/** Bounded observation of existing blocking requests and native execution. */
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
import {PlaySim} from '../../src/sim/playsim.js';
import {runContactObservers} from '../../src/sim/run-contact-observer.js';
import {sourceVersion} from '../source-version.js';

const args=process.argv.slice(2),arg=(k:string)=>args[args.indexOf(k)+1];
const ids=(arg('--cases')??'A039').split(','),until=Number(arg('--until')??3.1),out=arg('--out'),input=arg('--input');
if(!args.includes('--run')){console.log(JSON.stringify({ids,until,worldSettings:'unchanged',budgetSeconds:20}));process.exit(0);}
if(!out||!input||existsSync(out)||ids.length>4||until>4.5)throw Error('Fresh output, saved input and short scope required');
const sha=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const profile=JSON.parse(readFileSync('config/baseline.json','utf8'));
if(process.versions.node!==profile.nodeVersion||Object.entries(profile.flags).some(([k,v])=>(process.env[k]??null)!==v))throw Error('Use pinned launcher');
mkdirSync(out,{recursive:true});const start=performance.now(),results=[];
for(const id of ids){
 const saved=JSON.parse(readFileSync(`${input}/${id}.json`,'utf8')),sim=new PlaySim(structuredClone(saved.setup));
 if(sha(sim.agents.map(a=>({idx:a.idx,id:a.player.id,body:a.body})))!==sha(saved.initialBodies))throw Error('Initial state differs');
 const events:any[]=[],reads:any[]=[],calls:any[]=[],frames:any[]=[];
 const plain=(p:any)=>p?{kind:p.kind,target:p.target?.idx,drive:p.drive,
  combination:p.combination?{members:p.combination.members.map((a:any)=>a.idx),defender:p.combination.defender.idx,backer:p.combination.backer?.idx,released:p.combination.released}:null,
  departure:p.departure?{defender:p.departure.defender?.idx,keeper:p.departure.keeper?.idx,backer:p.departure.backer?.idx}:null}:null;
 const see=sim.see.bind(sim);sim.see=(a,b,delay)=>{const seen=see(a,b,delay);reads.push({a:a.idx,b:b.idx,delay,seen:structuredClone(seen)});return seen;};
 for(const a of sim.offense){const behavior=a.behavior as any;
  for(const name of ['zoneFlow','attack','leaveCombination'])if(typeof behavior[name]==='function'){
   const method=behavior[name];behavior[name]=function(...values:any[]){const result=method.apply(this,values);calls.push({a:a.idx,name,plan:plain(this.plan),returned:structuredClone(result),departureRead:structuredClone(this.departureRead)});return result;};
  }
 }
 runContactObservers.set(sim,(e,phase,data)=>{events.push({owner:e.blocker.idx,defender:e.defender.idx,helpers:e.helpers.map(a=>a.idx),phase,data:structuredClone(data)});});
 sim.event('snap',sim.slot('C')??sim.qb);
 while(sim.phase==='live'&&sim.t<until){
  if(performance.now()-start>20000)throw Error('Native budget exhausted');
  events.length=0;reads.length=0;calls.length=0;
  const t=sim.t,before=sim.agents.map(a=>structuredClone(a.body)),jobs=sim.agents.map(a=>plain((a.behavior as any).plan)),rngBefore=JSON.stringify(sim.rng);
  sim.tick();frames.push({t,before,jobs,commands:structuredClone(sim.intents),calls:[...calls],reads:[...reads],movement:[...events],
   after:sim.agents.map(a=>structuredClone(a.body)),contacts:structuredClone(sim.lastStep?.contacts),
   work:sim.lastStep?.work,rngBefore,rngAfter:JSON.stringify(sim.rng),
   blocks:sim.engagements.map(e=>({b:e.blocker.idx,d:e.defender.idx,helpers:e.helpers.map(a=>a.idx),surfaceAxis:e.surfaceAxis,drive:e.drive,phi:e.phi,control:e.control,
    hands:e.hands?{normal:e.hands.normalForce,tangent:e.hands.tangentForce,extension:e.hands.extension}:null,
    helperHands:[...(e.helperHands??[])].map(([h,j])=>({a:h.idx,normal:j.normalForce,tangent:j.tangentForce,extension:j.extension}))}))});
 }
 const data={caseId:id,source:sourceVersion(),input:sha(saved.setup),initial:saved.initialBodies,frames,events:sim.events,until:sim.t,phase:sim.phase,flags:profile.flags,node:process.version,world:profile.worldDefaults,
  savedFramePrefixEqual:sha(sim.frames)===sha(saved.result.frames.filter((f:any)=>f.t<sim.t))};
 writeFileSync(`${out}/${id}.json.gz`,gzipSync(JSON.stringify(data)));results.push({id,source:data.source,until:sim.t,phase:sim.phase,savedFramePrefixEqual:data.savedFramePrefixEqual});
}
writeFileSync(`${out}/summary.json`,JSON.stringify({results,seconds:(performance.now()-start)/1000},null,2)+'\n');console.log(JSON.stringify({results,seconds:(performance.now()-start)/1000}));
