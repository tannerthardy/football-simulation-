/** One native prefix, one selected three-second encounter and an earlier
 * contrasting control. Reuse PR57 reference frames; no baseline game rerun.
 * The diagnostic source applies exact information and approach corrections to selected
 * PlaySims through 3s. That gate is not part of the production candidate.
 */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,readdirSync} from 'node:fs';
import {join,resolve,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import {sourceVersion} from '../source-version.ts';
const [engineRoot,expectedSource,originalManifest,nativeFile,witnessFile,outFile]=process.argv.slice(2);
assert(engineRoot&&expectedSource&&originalManifest&&nativeFile&&witnessFile&&outFile);
const start=performance.now(),root=resolve(engineRoot),sha=x=>createHash('sha256').update(x).digest('hex'),hash=x=>sha(JSON.stringify(x));
const source=()=>{const files=p=>readdirSync(join(root,p),{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(join(p,e.name)):[join(p,e.name)]).sort();const h=createHash('sha256');for(const p of files('src'))h.update(p).update('\0').update(readFileSync(join(root,p))).update('\0');return h.digest('hex');};
assert.equal(sourceVersion(),'ec8bdc6fda7c89b60f5e5efaa80c194a22bba9effa3c947800b9e7e5311db885');
assert.equal(source(),expectedSource);
const inputs=JSON.parse(readFileSync(originalManifest)),nativeBytes=readFileSync(nativeFile),native=JSON.parse(gunzipSync(nativeBytes));
assert.equal(sha(readFileSync(originalManifest)),native.provenance.inputSha256);
assert.equal(native.provenance.sourceSha256,'dd173a3ef44f22b5ee74f3cc17ef15b2137203cea58dd2fa12fbaad12c4784ba');
assert.equal(process.version,inputs.node);
assert.deepEqual(Object.fromEntries(Object.keys(inputs.flags).map(k=>[k,process.env[k]??null])),inputs.flags);
const fixture=inputs.fixtures.find(f=>f.id==='zone-reference'),w=JSON.parse(gunzipSync(readFileSync(witnessFile)));
const refs=w.games.find(g=>g.id==='zone-reference').selected;
const controlRef=refs.find(r=>r.index===18),targetRef=refs.find(r=>r.index===31);
assert(controlRef&&targetRef);
const load=p=>import(pathToFileURL(join(root,p)).href);
globalThis.__entryCueCases=new WeakSet();
const [{Game},{Agent},{PlaySim},{runReadObservers}]=await Promise.all([load('src/game/game.ts'),load('src/sim/agent.ts'),load('src/sim/playsim.ts'),load('src/sim/run-read-observer.ts')]);
const snap=x=>JSON.parse(JSON.stringify(x,(_k,v)=>v instanceof Agent?{agent:v.idx}:v instanceof PlaySim?{sim:true}:v instanceof Map?[...v]:v instanceof Set?[...v]:v));
const filmed=native.log.filter(l=>l.replay),stop={selectedEncounterCompleted:true};
let game,ordinal=0,physical=0,gameSteps=0;
const rows=[];
const same=(a,b)=>hash(a)===hash(b);
const bodyView=(a,ref)=>Object.fromEntries(Object.keys(ref).map(k=>[k,a[k]]));
function observe(sim,kind){
 const i=ordinal++,entry=filmed[i];physical++;
 assert.equal(sim.offCall.label,entry.call,'Native prefix call changed');
 const ref=same(snap(sim.rng),controlRef.input.seedState)?controlRef:same(snap(sim.rng),targetRef.input.seedState)?targetRef:null;
 if(!ref)return undefined;
 assert.equal(kind,'scrimmage');assert.equal(entry.index,ref===controlRef?18:31);
 const row={nativePlay:entry.index+1,role:ref===controlRef?'waiting-control':'failing-entry',los:sim.los,ballY:sim.ballY,
  input:{rng:snap(sim.rng),call:snap(sim.offCall),defense:snap(sim.defCall),
   actors:sim.agents.map(a=>({idx:a.idx,slot:a.slot,team:a.team,player:snap(a.player),profile:snap(a.profile),body:snap(a.body)}))},
  frames:[],reads:[],cues:[]};rows.push(row);
 assert(same(row.input.rng,ref.input.seedState));
 for(let j=0;j<22;j++)assert(same(row.input.actors[j].body,ref.input.agents[j].initialBody),'Selected initial body changed');
 globalThis.__entryCueCases.add(sim);
 const see=sim.see.bind(sim),info=sim.teammateInformation.bind(sim);
 sim.see=(a,b,scale)=>{const v=see(a,b,scale);if(a.idx===6&&sim.t<3)row.cues.push({t:sim.t,observer:a.idx,target:b.idx,kind:'see',picture:snap(v)});return v;};
 sim.teammateInformation=(a,b)=>{const v=info(a,b);if(a.idx===6&&sim.t<3)row.cues.push({t:sim.t,observer:a.idx,target:b.idx,kind:'owned',picture:snap(v)});return v;};
 runReadObservers.set(sim,e=>{if(e.actor===6&&sim.t<3)row.reads.push(snap(e));});
 const joint=j=>{const{a,b,actor,holder,...rest}=j;return snap({...rest,a:sim.world.indexOf(a),b:sim.world.indexOf(b),...(actor?{actor:sim.world.indexOf(actor)}:{}),...(holder?{holder:sim.world.indexOf(holder)}:{})});};
 const step=sim.world.step.bind(sim.world);
 sim.world.step=(intents,dt)=>{
  if(sim.t>=3-1e-9)return step(intents,dt);
  const f={t:sim.t,before:sim.agents.map(a=>snap(a.body)),raw:snap(sim.cmds),final:snap(intents),behavior:sim.agents.map(a=>snap(a.behavior)),
   joints:sim.world.joints.map(joint),engagements:snap(sim.engagements)};
  const report=step(intents,dt);f.after=sim.agents.map(a=>snap(a.body));f.report=snap(report);row.frames.push(f);return report;
 };
 const finish=()=>{
  row.events=snap(sim.events);row.end=sim.t;row.censored=sim.phase==='live';row.firstContactX=sim.firstContactX;
  row.finalBodies=sim.agents.map(a=>snap(a.body));
  row.comparison={framesCompared:0,firstChangedRequest:null,firstChangedBody:null};
  for(const f of row.frames){const old=ref.frames.find(x=>Math.abs(x.t-f.t)<1e-8);assert(old);
   row.comparison.framesCompared++;
   const before=f.before.map((b,i)=>bodyView(b,old.before[i]));
   if(!same(before,old.before)&&!row.comparison.firstChangedBody)row.comparison.firstChangedBody={t:f.t};
   if((!same(f.raw,old.raw)||!same(f.final,old.final))&&!row.comparison.firstChangedRequest)
    row.comparison.firstChangedRequest={t:f.t,sameBodiesBefore:same(before,old.before),
     actors:sim.agents.filter((a,i)=>!same(f.raw[i],old.raw[i])||!same(f.final[i],old.final[i])).map(a=>a.idx),
     originalRaw:old.raw[6],candidateRaw:f.raw[6],originalFinal:old.final[6],candidateFinal:f.final[6]};
  }
 };
 if(ref===controlRef){const result=sim.run();finish();row.completedResult=snap(result);
  assert(!row.comparison.firstChangedRequest&&!row.comparison.firstChangedBody,'Contrasting control changed; stop before another case');
  return result;
 }
 while(sim.phase==='live'&&sim.t<3-1e-9){assert(performance.now()-start<15000,'15s native prefix budget');sim.tick();}
 finish();throw stop;
}
const {home,away}=structuredClone(fixture.teams);
game=new Game(home,away,{seed:fixture.seed,record:true,recordLevel:'standard',hooks:{playResult:observe}});
game.kickoffToStart();let failure=null;
try{while(!rows.some(r=>r.role==='failing-entry'&&r.end!==undefined)){
 assert(gameSteps<40&&performance.now()-start<15000,'Bounded prefix exhausted');game.step();gameSteps++;
 const logs=game.result().log;
 assert(same(logs,native.log.slice(0,logs.length)),'Earlier native prefix changed; no paired target claim');
}}catch(e){if(e!==stop)failure=String(e?.stack??e);}
const logs=game.result().log,earlierPrefixMatches=same(logs,native.log.slice(0,logs.length));
const result={schema:'run-entry-approach-continuation-v1',rootSourceSha256:sourceVersion(),isolatedSourceSha256:source(),originalSource:native.provenance.sourceSha256,
 originalGameSha256:sha(nativeBytes),manifestSha256:sha(readFileSync(originalManifest)),witnessSha256:sha(readFileSync(witnessFile)),collectorSha256:sha(readFileSync(import.meta.filename)),
 node:process.version,flags:inputs.flags,worldDefaults:inputs.worldDefaults,gameSteps,physicalScrimmages:physical,completedGames:0,
 earlierPrefixMatches,matchedEarlierEntries:logs.length,intervention:'Information correction plus full run-approach policy on selected P019/P032 PlaySims through 3s; earlier plays original.',
 rows,failure,elapsedSeconds:(performance.now()-start)/1000};
assert.equal(source(),expectedSource);assert.equal(sourceVersion(),result.rootSourceSha256);
mkdirSync(dirname(outFile),{recursive:true});writeFileSync(outFile,gzipSync(JSON.stringify(result)));
console.log(JSON.stringify({out:outFile,earlierPrefixMatches,matchedEarlierEntries:logs.length,physicalScrimmages:physical,rows:rows.map(r=>({nativePlay:r.nativePlay,role:r.role,end:r.end,comparison:r.comparison})),failure,elapsedSeconds:result.elapsedSeconds}));
assert(!failure&&earlierPrefixMatches&&rows.length===2,'Focused continuation failed; preserve result and diagnose before more simulation');
