/** One saved Flex Quarters opening, current native controllers; no game prefix.
 * FROZEN_INPUTS.json.gz OUTPUT.json.gz [play=19] [seconds=3.5]
 * Post-constructor bodies/RNG are restored only at snap, matching the saved
 * input convention. This is a reenactment, not an original-game replay.
 */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {dirname} from 'node:path';
import {gunzipSync,gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {PlaySim} from '../../src/sim/playsim.ts';
import {Agent} from '../../src/sim/agent.ts';
import {ManCoverage,ZoneCoverage} from '../../src/sim/behaviors/defense.ts';
import {sourceVersion} from '../source-version.ts';

const [inputPath,out,play='19',seconds='3.5']=process.argv.slice(2),
 sha=v=>createHash('sha256').update(v).digest('hex'),fileSha=p=>sha(readFileSync(p)),
 snap=v=>JSON.parse(JSON.stringify(v,(_k,v)=>v instanceof Agent?{agent:v.idx}:v instanceof PlaySim?{sim:true}:v instanceof Map?[...v]:v instanceof Set?[...v]:v)),
 packet=JSON.parse(gunzipSync(readFileSync(inputPath))),input=packet.inputs.find(i=>i.play===Number(play)),
 profile=JSON.parse(readFileSync('config/baseline.json')),source=sourceVersion(),maxTime=Number(seconds);
assert.ok(input&&input.input.defense.coverage.id.startsWith('cover4'));
assert.ok(!existsSync(out)&&maxTime>0&&maxTime<=4);
assert.deepEqual(Object.fromEntries(Object.keys(profile.flags).map(k=>[k,process.env[k]??null])),profile.flags);
const began=performance.now();
function run(record){
 const roster=team=>Object.fromEntries(input.input.agents.filter(a=>a.team===team).map(a=>[a.slot,a.player])),
  sim=new PlaySim({offense:roster('O'),defense:roster('D'),offCall:structuredClone(input.input.call),
   defCall:structuredClone(input.input.defense),los:input.los,ballY:input.ballY,
   firstDownX:Math.min(110,input.los+input.state.distance),down:input.state.down,
   seed:input.input.seedState.key,energy:new Map(input.input.agents.map(a=>[a.player.id,a.initialBody.energy])),record:false});
 for(const a of sim.agents)Object.assign(a.body,structuredClone(input.input.agents[a.idx].initialBody),{profile:a.profile});
 Object.assign(sim.rng,input.input.seedState);
 const initial=snap({bodies:sim.agents.map(a=>a.body),rng:sim.rng,minds:sim.agents.map(a=>a.mind),
  behaviors:sim.agents.map(a=>a.behavior),recognition:sim.defense.map(a=>a.recog)}),
  players=sim.agents.map(a=>({idx:a.idx,id:a.player.id,slot:a.slot,team:a.team,profile:a.profile})),rows=[];
 let cues=[],requests=[],techniques=[],world=null,active=null;
 const state=a=>({body:snap(a.body),read:a.recog?.read,runFit:snap(a.runFit??null),
  kind:a.behavior.kind,job:a.behavior.job??null,target:a.behavior.target?.idx??null,
  man:a.behavior.recordedMan?.()??a.behavior.recordedTechnique?.()??null});
 const originals=new Map();
 if(record){
  const see=sim.see.bind(sim);sim.see=(a,b,...rest)=>{const picture=see(a,b,...rest);
   if(active===a.idx)cues.push({actor:a.idx,target:b.idx,args:rest,picture:snap(picture)});return picture;};
  for(const C of [ManCoverage,ZoneCoverage]){
   const original=C.prototype.update;originals.set(C,original);
   C.prototype.update=function(a,s){const start=cues.length,before=state(a),request=original.call(this,a,s);
    techniques.push({actor:a.idx,kind:this.kind,target:this.target?.idx??null,before,
     cueStart:start,cueEnd:cues.length,request:snap(request)});return request;};
  }
  const wrapped=new WeakSet(),wrap=b=>{if(wrapped.has(b))return b;wrapped.add(b);const update=b.update.bind(b);
   b.update=(a,s)=>{const previous=active;active=a.idx;const start=cues.length,before=state(a);let request;
    try{request=update(a,s);}finally{active=previous;}
    requests.push({actor:a.idx,before,after:state(a),cueStart:start,cueEnd:cues.length,request:snap(request)});return request;};return b;};
  for(const a of sim.defense){let behavior=wrap(a.behavior);Object.defineProperty(a,'behavior',{get:()=>behavior,set:b=>{behavior=wrap(b);}});}
  const step=sim.world.step.bind(sim.world);sim.world.step=(intents,dt)=>{const before=snap(sim.agents.map(a=>a.body)),applied=snap(intents),report=step(intents,dt);
   world={before,applied,after:snap(sim.agents.map(a=>a.body)),report:snap(report)};return report;};
  const tick=sim.tick.bind(sim);sim.tick=()=>{const t=sim.t;world=null;cues=[];requests=[];techniques=[];tick();
   rows.push({t,ball:sim.ball.kind,carrier:sim.carrier?.idx??null,cues,requests,techniques,world});};
 }
 try{while(sim.phase==='live'&&sim.t<maxTime-1e-9){assert.ok(performance.now()-began<15000,'15s total budget');sim.tick();}}
 finally{for(const[C,original]of originals)C.prototype.update=original;}
 const final=snap({bodies:sim.agents.map(a=>a.body),rng:sim.rng,minds:sim.agents.map(a=>a.mind),
  behaviors:sim.agents.map(a=>a.behavior),recognition:sim.defense.map(a=>a.recog),
  perception:sim.perception,intents:sim.intents,ball:sim.ball,events:sim.events});
 return{initialSha256:sha(JSON.stringify(initial)),signature:sha(JSON.stringify(final)),players,rows,
  end:sim.t,censored:sim.phase==='live',outcome:sim.outcome,events:snap(sim.events)};
}
const observed=run(true),plain=run(false);
assert.equal(observed.initialSha256,plain.initialSha256);assert.equal(observed.signature,plain.signature,'Recorder changed behavior');
assert.equal(sourceVersion(),source);
const result={schema:'coverage-run-support-native-v1',provenance:{checkout:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),
 sourceSha256:source,inputSha256:fileSha(inputPath),inputSourceCommit:packet.sourceCommit,inputSourceSha256:packet.sourceSha256,
 collectorSha256:fileSha(import.meta.filename),worldSha256:fileSha('src/physics/world.ts'),flags:profile.flags,
 worldDefaults:profile.worldDefaults,node:process.version,lockSha256:fileSha('package-lock.json')},
 play:Number(play),call:input.input.call.label,coverage:input.input.defense.coverage.id,
 observerNeutral:true,nativeExecutions:2,seconds:(performance.now()-began)/1000,...observed};
mkdirSync(dirname(out),{recursive:true});writeFileSync(out,gzipSync(JSON.stringify(result)));
console.log(JSON.stringify({out,source,signature:result.signature,end:result.end,censored:result.censored,seconds:result.seconds}));
