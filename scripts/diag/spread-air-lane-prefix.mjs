/** One newly needed decision, at native P033. Earlier plays only establish
 * its real state; no completed game, candidate policy, new observations/RNG.
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync,readdirSync} from 'node:fs';
import {resolve,dirname,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {gzipSync,gunzipSync} from 'node:zlib';
const [engineRoot,expectedSource,output,mode='reference']=process.argv.slice(2);
assert(engineRoot&&expectedSource&&output);
assert(['reference','candidate','intervention'].includes(mode));
if(mode==='intervention')globalThis.__gapCorrectionCases=new WeakSet();
const root=resolve(engineRoot),out=resolve(output),start=performance.now();
const sha=x=>createHash('sha256').update(x).digest('hex'),hash=x=>sha(JSON.stringify(x));
const source=()=>{const files=p=>readdirSync(join(root,p),{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(join(p,e.name)):[join(p,e.name)]).sort();const h=createHash('sha256');for(const p of files('src'))h.update(p).update('\0').update(readFileSync(join(root,p))).update('\0');return h.digest('hex');};
assert.equal(source(),expectedSource);
const base=resolve('out/spread-air-lanes/evidence/notes/data/reviews/current');
const nativeBytes=readFileSync(join(base,'experimental-game-checkpoint/experimental/spread-air/game.json.gz'));
assert.equal(sha(nativeBytes),'15e553e26449ff44806293f1611bffd3362cbf2e4dd80d3f1447f0264681057f');
const native=JSON.parse(gunzipSync(nativeBytes)),inputBytes=readFileSync(join(base,'experimental-game-inputs.json'));
assert.equal(sha(inputBytes),'c1c7cef835d143da40c62e6572e6e1d024dff281058a98215ecb78c93e6b5870');
const inputs=JSON.parse(inputBytes),fixture=inputs.fixtures.find(x=>x.id==='spread-air');
assert.equal(process.version,inputs.node);
assert.deepEqual(Object.fromEntries(Object.keys(inputs.flags).map(k=>[k,process.env[k]??null])),inputs.flags);
const load=p=>import(pathToFileURL(join(root,p)).href);
const [{Game},{PlaySim},{Agent},{runReadObservers}]=await Promise.all([load('src/game/game.ts'),load('src/sim/playsim.ts'),load('src/sim/agent.ts'),load('src/sim/run-read-observer.ts')]);
const snap=x=>JSON.parse(JSON.stringify(x,(_k,v)=>v instanceof Agent?{agent:v.idx}:v instanceof PlaySim?{sim:true}:v instanceof Map?[...v]:v instanceof Set?[...v]:v));
const filmed=native.log.filter(l=>l.replay),targetOrdinal=filmed.findIndex(l=>l.index===32);
let game,ordinal=0,selected=null,physical=0,steps=0;
const observe=(sim,kind)=>{
 physical++;
 const i=ordinal++,ref=filmed[i];
 assert.equal(sim.offCall.label,ref.call,'Native prefix call changed');
 assert.equal(hash(snap(sim.rng)),hash(native.observations[i].seedState),'Native initialization RNG changed');
 if(i!==targetOrdinal)return undefined;
 assert.equal(kind,'scrimmage');
 if(mode==='intervention')globalThis.__gapCorrectionCases.add(sim);
 selected={play:33,ordinal:i,los:sim.los,ballY:sim.ballY,firstDownX:sim.firstDownX,state:snap(game.state),
  input:{call:snap(sim.offCall),defense:snap(sim.defCall),rng:snap(sim.rng),
   actors:sim.agents.map(a=>({idx:a.idx,slot:a.slot,team:a.team,player:snap(a.player),profile:snap(a.profile),body:snap(a.body),mind:snap(a.mind),behavior:snap(a.behavior)}))},frames:[],cues:[],reads:[]};
 const see=sim.see.bind(sim),info=sim.teammateInformation.bind(sim);
 const caller=()=>new Error().stack.split('\n').slice(3,5).map(x=>x.trim());
 sim.see=(a,b,scale)=>{const v=see(a,b,scale);if(a.team==='O')selected.cues.push({t:sim.t,observer:a.idx,target:b.idx,kind:'see',picture:snap(v),caller:caller()});return v;};
 sim.teammateInformation=(a,b)=>{const v=info(a,b);if(a.team==='O')selected.cues.push({t:sim.t,observer:a.idx,target:b.idx,kind:'owned',picture:snap(v),caller:caller()});return v;};
 runReadObservers.set(sim,e=>selected.reads.push(snap(e)));
 const joint=j=>{const{a,b,actor,holder,...rest}=j;return snap({...rest,a:sim.world.indexOf(a),b:sim.world.indexOf(b),...(actor?{actor:sim.world.indexOf(actor)}:{}),...(holder?{holder:sim.world.indexOf(holder)}:{})});};
 const step=sim.world.step.bind(sim.world);
 sim.world.step=(intents,dt)=>{const row={t:sim.t,before:sim.agents.map(a=>snap(a.body)),raw:snap(sim.cmds),final:snap(intents),
  behavior:sim.agents.map(a=>snap(a.behavior)),engagements:snap(sim.engagements),joints:sim.world.joints.map(joint)};
  const report=step(intents,dt);row.after=sim.agents.map(a=>snap(a.body));row.report=snap(report);selected.frames.push(row);return report;};
 return undefined;
};
const {home,away}=structuredClone(fixture.teams);
game=new Game(home,away,{seed:fixture.seed,record:true,recordLevel:'full',hooks:{playResult:observe}});
game.kickoffToStart();
while(!selected){assert(steps<40&&performance.now()-start<15000,'Bounded native prefix exhausted');game.step();steps++;}
const normalize=l=>{const {telemetry,...replay}=l.replay??{};return {...l,...(l.replay?{replay}:{})};};
const actual=game.result().log.map(normalize),expected=native.log.slice(0,actual.length).map(normalize);
const nativeMatches=hash(actual)===hash(expected);
const earlierPrefixMatches=hash(actual.slice(0,32))===hash(expected.slice(0,32));
selected.replay=game.result().log.find(l=>l.index===32).replay;
const result={schema:'spread-air-lane-prefix-v1',sourceSha256:source(),recordedRuntime:'f62511a513f2187884d74ae3b94435835e43309c',
 nativeGameSha256:sha(nativeBytes),inputSha256:sha(inputBytes),collectorSha256:sha(readFileSync(import.meta.filename)),node:process.version,
 flags:inputs.flags,worldDefaults:inputs.worldDefaults,physicalScrimmages:physical,completedGames:0,gameSteps:steps,nativeMatches,
 mode,earlierPrefixMatches,matchedEntries:mode==='reference'?actual.length:32,selected,
 selectedResult:game.result().log.find(l=>l.index===32),elapsedSeconds:(performance.now()-start)/1000};
assert.equal(source(),expectedSource);mkdirSync(dirname(out),{recursive:true});writeFileSync(out,gzipSync(JSON.stringify(result)));
const {selectedResult,...metadata}=result;
console.log(JSON.stringify({...metadata,selected:{play:33,frames:selected.frames.length,cues:selected.cues.length,reads:selected.reads.length},
 result:{yards:selectedResult.yards,duration:selectedResult.duration,outcome:selectedResult.outcome}}));
assert(earlierPrefixMatches,'Earlier native context changed: P033 would not be a paired encounter');
if(mode==='reference')assert(nativeMatches,'Passive prefix changed native stored positions/events/log');
