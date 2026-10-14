/** Censored witness: distinguish the fresh PBU timing from lost geometry. */
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {performance} from 'node:perf_hooks';
import {PlaySim} from '../../src/sim/playsim.ts';
import {ZoneCoverage} from '../../src/sim/behaviors/defense.ts';
import {sourceVersion} from '../source-version.ts';
const copy=x=>structuredClone(x),hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex'),
 fileHash=p=>createHash('sha256').update(readFileSync(p)).digest('hex'),input='out/coverage-cue/fresh/declared-inputs.json',
 f=JSON.parse(readFileSync(input,'utf8')).fixtures.find(f=>f.id==='FRESH-13964-four_verts-match-61002'),destination=process.argv[2];
if(!destination)throw Error('OUTDIR required');mkdirSync(destination,{recursive:true});
const profile=JSON.parse(readFileSync('config/baseline.json','utf8')),provenance={
 commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sourceSha256:sourceVersion(),collectorSha256:fileHash(import.meta.filename),
 inputSha256:fileHash(input),setupSha256:hash(f.setup),flags:Object.fromEntries(Object.keys(profile.flags).map(k=>[k,process.env[k]??null])),
 worldDefaults:profile.worldDefaults,node:process.version,platform:process.platform,arch:process.arch,lockSha256:fileHash('package-lock.json'),startedAt:new Date().toISOString()};
if(provenance.sourceSha256!==profile.sourceSha256)throw Error('Requires baseline');
function trial(remove,observe){
 const sim=new PlaySim({...copy(f.setup),record:false}),update=ZoneCoverage.prototype.update,next=sim.rng.next.bind(sim.rng),draws=[];let ordinal=0;
 ZoneCoverage.prototype.update=function(a,s){const eyes=s.qbEyes;if(remove)s.qbEyes=null;try{return update.call(this,a,s);}finally{s.qbEyes=eyes;}};
 if(observe)sim.rng.next=()=>{
  const value=next(),stack=new Error().stack.split('\n').filter(x=>x.includes('/src/')),
   source=stack.find(x=>!x.includes('/core/rng.ts'))??'unclassified';
  const d={ordinal:ordinal++,t:sim.t,value,source};
  if(stack.some(x=>x.includes('/sim/catching.ts'))&&sim.t>=2.7){
   d.contest={line:source,defender:{idx:15,id:sim.agents[15].player.id,body:copy(sim.agents[15].body),tags:[...sim.agents[15].tags]},
    receiver:{idx:7,id:sim.agents[7].player.id,body:copy(sim.agents[7].body),tags:[...sim.agents[7].tags]},
    ball:sim.ball.kind==='air'?{pos:copy(sim.ball.flight.pos),vel:copy(sim.ball.flight.vel),deflected:sim.ball.deflected,target:sim.ball.target?.idx??null}:sim.ball.kind};
  }
  draws.push(d);return value;
 };
 try{while(sim.t<2.95-1e-9&&sim.phase!=='dead')sim.tick();}finally{ZoneCoverage.prototype.update=update;}
 const signature=hash({t:sim.t,bodies:sim.agents.map(a=>a.body),intents:sim.intents,rng:sim.rng,perception:sim.perception,events:sim.events});
 return {remove,t:sim.t,signature,draws,events:copy(sim.events).filter(e=>e.t>=2),censored:sim.phase!=='dead',outcome:sim.phase==='dead'?sim.outcome:null};
}
const start=performance.now(),cases=[];
for(const remove of [false,true]){const recorded=trial(remove,true),plain=trial(remove,false);if(recorded.signature!==plain.signature)throw Error('RNG observer changes prefix');
 cases.push({...recorded,observerVerified:true});}
writeFileSync(join(destination,'summary.json'),JSON.stringify({schema:'coverage-contest-rng-v1',provenance,cases,wallMs:performance.now()-start,
 scope:'Four native prefixes ending at 2.95 s, no changed draws or new full plays. Actual RNG draw/call-site and live contest body/ball states copied. Both recorded/plain prefix signatures exact. No catch/tackle/physics law altered.'})+'\n');
if(sourceVersion()!==provenance.sourceSha256)throw Error('Runtime changed');
