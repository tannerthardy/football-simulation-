/** Short matched native test of the production modifier. Hooks only record
 * values from existing calls; they request no new information or RNG draw.
 */
import {createHash} from 'node:crypto';
import {existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync,gzipSync} from 'node:zlib';
import {PlaySim,type PlaySetup} from '../../src/sim/playsim.js';
import {sourceVersion} from '../source-version.js';

const args=process.argv.slice(2),outIndex=args.indexOf('--out'),out=args[outIndex+1];
const cases=[{id:'A044',until:3.55},{id:'A008',until:3.4}];
if(!args.includes('--run')){console.log(JSON.stringify({cases,nativeExecutions:2,fullGames:0,generatedRosters:0,budgetMs:15000}));process.exit(0);}
if(!out||outIndex<0||existsSync(`${out}/summary.json`))throw Error('Specify fresh --out');
const input='data/reviews/current/mesh-traffic-controller/input/flex-windows.json.gz';
const hash=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const sha=(v:Buffer|string)=>createHash('sha256').update(v).digest('hex');
if(sha(readFileSync(input))!=='11637c8ff81b32b06faa21f87995fc870e37ff089d4f03496717856b5eb05191')throw Error('Saved input mismatch');
const saved=JSON.parse(gunzipSync(readFileSync(input)).toString()),profile=JSON.parse(readFileSync('config/baseline.json','utf8'));
const flags=Object.fromEntries(Object.keys(profile.flags).map(k=>[k,process.env[k]??null]));
if(hash(flags)!==hash(profile.flags)||process.versions.node!==profile.nodeVersion)throw Error('Use pinned launcher');
const objectivePath='../../src/sim/movement-objective.js';
const ownObjective=existsSync('src/sim/movement-objective.ts')?(await import(objectivePath)).movementObjective:()=>undefined;
const provenance={sourceSha256:sourceVersion(),scriptSha256:sha(readFileSync('scripts/diag/mesh-traffic-controller.ts')),flags,node:process.version,worldDefaults:profile.worldDefaults};
mkdirSync(out,{recursive:true});
const start=performance.now(),cpu=process.cpuUsage(),rows=[];
for(const c of cases){
  const spec=saved.cases.find((s:any)=>s.caseId===c.id);
  if(hash(spec.setup)!==spec.inputSha256)throw Error('Frozen setup mismatch');
  const begin=performance.now(),sim=new PlaySim(structuredClone(spec.setup) as PlaySetup),ticks:any[]=[];
  const raw=new Map<number,unknown>(),pictures=new Map<string,unknown>(),chance:any[]=[];
  for(const a of sim.agents){
    const update=a.behavior.update.bind(a.behavior);
    a.behavior.update=(actor,play)=>{
      const command=update(actor,play);
      raw.set(a.idx,{command:structuredClone(command),objective:structuredClone(ownObjective(command)),body:structuredClone(a.body)});
      return command;
    };
  }
  const see=sim.see.bind(sim);
  sim.see=(a,b,delay)=>{const seen=see(a,b,delay);pictures.set(`${a.idx}:${b.idx}`,structuredClone(seen));return seen;};
  const draw=sim.rng.chance.bind(sim.rng);
  sim.rng.chance=p=>{
    const before={...sim.rng},result=draw(p);
    chance.push({t:sim.t,p,before,after:{...sim.rng},result,producer:new Error().stack?.split('\n').slice(2,5)});
    return result;
  };
  const step=sim.world.step.bind(sim.world);let inputs:unknown;
  sim.world.step=(intents,dt)=>{
    inputs=sim.agents.map(a=>({idx:a.idx,body:structuredClone(a.body),raw:raw.get(a.idx),command:structuredClone(intents[a.idx]),
      objective:structuredClone(ownObjective(intents[a.idx])),
      peers:a.team==='D'?[...pictures].filter(([key])=>key.startsWith(`${a.idx}:`)).map(([key,seen])=>({peer:Number(key.split(':')[1]),seen})):undefined}));
    return step(intents,dt);
  };
  sim.event('snap',sim.slot('C')??sim.qb);
  while(sim.phase==='live'&&sim.t<c.until){
    if(performance.now()-start>15000)throw Error('Bounded native budget exhausted');
    raw.clear();pictures.clear();chance.length=0;
    const t=sim.t,rngBefore={...sim.rng};sim.tick();
    ticks.push({t,after:sim.t,inputs,agents:sim.agents.map(a=>({idx:a.idx,pos:{...a.pos},vel:{...a.vel},state:a.body.support?.state})),
      commands:structuredClone(sim.intents),contacts:structuredClone(sim.lastStep?.contacts),rngBefore,rngAfter:{...sim.rng},chance:[...chance],
      blocks:sim.engagements.map(e=>({blocker:e.blocker.idx,defender:e.defender.idx,type:e.type,
        normalForce:e.hands?.normalForce??null,tangentForce:e.hands?.tangentForce??null}))});
  }
  const data={schema:'mesh-traffic-controller-v1',caseId:c.id,provenance,setupSha256:hash(spec.setup),
    actors:sim.agents.map(a=>({idx:a.idx,slot:a.slot,profile:a.profile,id:a.player.id})),
    ticks,events:sim.events,rng:{...sim.rng},phase:sim.phase,stoppedAt:sim.t,elapsedMs:performance.now()-begin};
  const bytes=gzipSync(JSON.stringify(data));writeFileSync(`${out}/${c.id}.json.gz`,bytes);
  rows.push({caseId:c.id,sha256:sha(bytes),stoppedAt:sim.t,phase:sim.phase,elapsedMs:data.elapsedMs,events:sim.events,
    impacts:ticks.flatMap(t=>(t.contacts??[]).filter((p:any)=>p.i===15&&p.j===21||p.i===21&&p.j===15).map((p:any)=>({t:t.t,...p})))});
}
const used=process.cpuUsage(cpu),summary={cases,provenance,rows,elapsedMs:performance.now()-start,cpuMs:(used.user+used.system)/1000};
writeFileSync(`${out}/summary.json`,JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify(summary));
