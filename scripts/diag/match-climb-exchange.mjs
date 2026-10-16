/** Diagnostic only: match the first named RT/Mike hand exchange, while
 * consuming the native draws. All 22 controllers and physical laws remain live.
 * A changed event schedule must not masquerade as a better hand execution. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
import {PlaySim} from '../../src/sim/playsim.ts';
import {sourceVersion} from '../source-version.ts';

const [mode,out,manifestPath,tapePath]=process.argv.slice(2);
assert(['record','match'].includes(mode));
const hash=x=>createHash('sha256').update(x).digest('hex');
const manifestBytes=readFileSync(manifestPath),input=JSON.parse(manifestBytes).rows.find(r=>r.id==='DuoUnder');
assert(input);assert.equal(hash(JSON.stringify(input.setup)),input.inputSha256);
const tape=mode==='match'?JSON.parse(readFileSync(tapePath)):null;
if(tape)assert.equal(tape.inputSha256,input.inputSha256);
const sim=new PlaySim(structuredClone(input.setup)),rt=sim.slot('RT'),mike=sim.slot('LB_M');
const engage=sim.engage.bind(sim),frames=[],exchanges=[];
let done=false;
sim.engage=(b,d,type,...args)=>{
 if(done||b!==rt||d!==mike||type!=='run')return engage(b,d,type,...args);
 const draws=[],native={normal:sim.rng.normal,range:sim.rng.range};
 for(const name of Object.keys(native))sim.rng[name]=function(...params){
  const actual=native[name].apply(this,params),expected=tape?.draws[draws.length];
  if(tape){assert(expected,'Unexpected extra first-exchange draw');assert.equal(expected.name,name);assert.deepEqual(expected.params,params);}
  const delivered=expected?.delivered??actual;
  draws.push({name,params,actual,delivered});return delivered;
 };
 let e;
 try{e=engage(b,d,type,...args);}finally{Object.assign(sim.rng,native);}
 if(draws.length){
  assert(e&&e.blocker===b&&e.defender===d);if(tape)assert.equal(draws.length,tape.draws.length);
  exchanges.push({at:sim.t,control:e.control,repEdge:e.repEdge,nextMoveAt:e.nextMoveAt,draws});done=true;
 }
 return e;
};
const step=sim.world.step.bind(sim.world);
sim.world.step=(intents,dt)=>{
 const before=sim.agents.map(a=>structuredClone(a.body)),requests=structuredClone(intents),report=step(intents,dt);
 frames.push({t:sim.t,before,requests,after:sim.agents.map(a=>structuredClone(a.body)),
  reps:sim.engagements.map(e=>({b:e.blocker.idx,d:e.defender.idx,helpers:e.helpers.map(a=>a.idx),control:e.control,phi:e.phi,
    hands:e.hands?{normal:e.hands.normalForce,tangent:e.hands.tangentForce,extension:e.hands.extension}:null})),
  work:report.work,groundImpulse:report.groundImpulse,armImpulse:report.armImpulse,armImpulseLimit:report.armImpulseLimit,
  contacts:report.contacts,rng:JSON.stringify(sim.rng)});
 return report;
};
const start=performance.now(),until=mode==='record'?1.9:3.6;
while(sim.phase==='live'&&sim.t<until){assert(performance.now()-start<5000);sim.tick();}
assert(done,'Named first hand exchange was not reached');assert.equal(exchanges.length,1);
if(tape)assert.equal(exchanges[0].control,tape.control,'Identical traits and first-exchange variates must yield identical hand control');
const profile=JSON.parse(readFileSync('config/baseline.json'));
const receipt={mode,source:sourceVersion(),head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),node:process.version,
 collectorSha256:hash(readFileSync(import.meta.filename)),inputSha256:input.inputSha256,inputManifestSha256:hash(manifestBytes),
 tapeSha256:tape?hash(readFileSync(tapePath)):null,until,endTime:sim.t,phase:sim.phase,elapsedSeconds:(performance.now()-start)/1000,
 flags:Object.fromEntries(Object.keys(profile.flags).map(k=>[k,process.env[k]??null])),worldDefaults:profile.worldDefaults,
 qualification:'Only first RT/Mike exchange variates substituted; native RNG draws still consumed. Later execution is native and can differ. No bodies, commands, controller cues, ratings, laws or other players replaced.'};
mkdirSync(out,{recursive:true});
writeFileSync(out+'/exchange.json',JSON.stringify({inputSha256:input.inputSha256,...exchanges[0]},null,2)+'\n');
writeFileSync(out+'/trace.json.gz',gzipSync(JSON.stringify({receipt,initial:sim.agents.map(a=>({idx:a.idx,slot:a.slot})),frames,exchanges,events:sim.events})));
writeFileSync(out+'/receipt.json',JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify({receipt,exchanges,events:sim.events.filter(e=>['block_contact','carrier_contact','hit'].includes(e.type))}));
