/** Passive adverse-ending diagnostic: distinguish new protection from the
 * later, naturally drawn hold execution. No substitutions or extra queries. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {PlaySim} from '../../src/sim/playsim.ts';
import {sourceVersion} from '../source-version.ts';
const [out,manifestPath]=process.argv.slice(2),hash=x=>createHash('sha256').update(x).digest('hex');
const manifestBytes=readFileSync(manifestPath),input=JSON.parse(manifestBytes).rows.find(r=>r.id==='A030');
assert.equal(hash(JSON.stringify(input.setup)),input.inputSha256);
const sim=new PlaySim(structuredClone(input.setup)),frames=[],wraps=[];
const bond=()=>sim.bond?{carrier:sim.bond.carrier.idx,tacklers:sim.bond.tacklers.map(a=>a.idx),
 holds:[...sim.bond.holds].map(([a,j])=>({a:a.idx,grip:sim.bond.grip.get(a),execution:sim.bond.execution.get(a),
  joint:Object.fromEntries(Object.entries(j).filter(([k])=>!['a','b'].includes(k)))}))}:null;
const event=sim.event.bind(sim);
sim.event=(type,a,b,...args)=>{event(type,a,b,...args);if(type==='tackle_wrap')wraps.push({t:sim.t,a:a.idx,b:b.idx,bond:bond(),bodies:[structuredClone(a.body),structuredClone(b.body)]});};
const step=sim.world.step.bind(sim.world);
sim.world.step=(intents,dt)=>{const beforeBond=bond(),before=sim.agents.map(a=>structuredClone(a.body)),report=step(intents,dt);
 frames.push({t:sim.t,beforeBond,afterBond:bond(),before,after:sim.agents.map(a=>structuredClone(a.body)),rng:JSON.stringify(sim.rng),work:report.work});return report;};
const start=performance.now();while(sim.phase==='live'&&sim.t<4.55){assert(performance.now()-start<5000);sim.tick();}
const profile=JSON.parse(readFileSync('config/baseline.json'));
const receipt={source:sourceVersion(),node:process.version,collectorSha256:hash(readFileSync(import.meta.filename)),
 inputSha256:input.inputSha256,inputManifestSha256:hash(manifestBytes),until:4.55,endTime:sim.t,phase:sim.phase,
 elapsedSeconds:(performance.now()-start)/1000,flags:Object.fromEntries(Object.keys(profile.flags).map(k=>[k,process.env[k]??null])),worldDefaults:profile.worldDefaults,
 qualification:'Pure observer at native World and tackle_wrap hooks. All22 native. Live prefix is censored; no terminal gain inferred.'};
mkdirSync(out,{recursive:true});writeFileSync(out+'/receipt.json',JSON.stringify(receipt,null,2)+'\n');
writeFileSync(out+'/trace.json.gz',gzipSync(JSON.stringify({receipt,wraps,frames,events:sim.events})));
console.log(JSON.stringify({receipt,wraps:wraps.map(w=>({t:w.t,a:w.a,b:w.b,bond:w.bond}))}));
