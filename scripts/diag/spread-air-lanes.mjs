/** One saved native encounter, never a game or serialized mid-play restart.
 * Refuse an incompatible snap before stepping. Passive cue/request capture.
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync,readdirSync} from 'node:fs';
import {resolve,dirname,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {gzipSync,gunzipSync} from 'node:zlib';

const [engineRoot,expectedSource,playText,output,stopText='2.25']=process.argv.slice(2);
assert(engineRoot&&expectedSource&&playText&&output);
const root=resolve(engineRoot),out=resolve(output),n=Number(playText),stop=Number(stopText);
assert(n===33&&stop>0&&stop<=2.8,'Only the nominated P033 encounter is authorized here');
const sha=x=>createHash('sha256').update(x).digest('hex');
const hash=x=>sha(JSON.stringify(x));
const source=()=>{const files=p=>readdirSync(join(root,p),{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(join(p,e.name)):[join(p,e.name)]).sort();const h=createHash('sha256');for(const p of files('src'))h.update(p).update('\0').update(readFileSync(join(root,p))).update('\0');return h.digest('hex');};
assert.equal(source(),expectedSource);
const start=performance.now();
const base=resolve('out/spread-air-lanes/evidence/notes/data/reviews/current');
const nativeBytes=readFileSync(join(base,'experimental-game-checkpoint/experimental/spread-air/game.json.gz'));
assert.equal(sha(nativeBytes),'15e553e26449ff44806293f1611bffd3362cbf2e4dd80d3f1447f0264681057f');
const native=JSON.parse(gunzipSync(nativeBytes)),inputsBytes=readFileSync(join(base,'experimental-game-inputs.json'));
assert.equal(sha(inputsBytes),'c1c7cef835d143da40c62e6572e6e1d024dff281058a98215ecb78c93e6b5870');
const inputs=JSON.parse(inputsBytes),fixture=inputs.fixtures.find(x=>x.id==='spread-air');
assert.equal(process.version,inputs.node);
assert.deepEqual(Object.fromEntries(Object.keys(inputs.flags).map(k=>[k,process.env[k]??null])),inputs.flags);
const entry=native.log[n-1],observation=native.observations[native.log.filter(x=>x.replay&&x.index<=entry.index).length-1];
assert.equal(observation.call.label,entry.call);
const roster=new Map(Object.values(fixture.teams).flatMap(t=>t.roster.map(p=>[p.id,p])));
const offense={},defense={},energy=new Map();
for(const a of observation.initialPlayers){(a.team==='O'?offense:defense)[a.slot]=structuredClone(roster.get(a.id));energy.set(a.id,a.energy);}
const load=p=>import(pathToFileURL(join(root,p)).href);
const [{PlaySim},{Agent},{runReadObservers}]=await Promise.all([load('src/sim/playsim.ts'),load('src/sim/agent.ts'),load('src/sim/run-read-observer.ts')]);
const snap=x=>JSON.parse(JSON.stringify(x,(_k,v)=>v instanceof Agent?{agent:v.idx}:v instanceof PlaySim?{sim:true}:v instanceof Map?[...v]:v instanceof Set?[...v]:v));
const sim=new PlaySim({offense,defense,offCall:structuredClone(observation.call),defCall:structuredClone(observation.defense),
 los:entry.replay.los,ballY:entry.replay.frames[0].ball[1],firstDownX:entry.replay.firstDownX,seed:observation.seedState.key,
 energy,down:entry.down,record:true,recordLevel:'full',recordEvery:2,handContact:'center'});
const rounded=x=>Math.round(x*10)/10;
const initialized={rng:snap(sim.rng),agents:sim.agents.flatMap(a=>[rounded(a.pos.x),rounded(a.pos.y),rounded(a.facing)])};
const initialization={rngMatches:hash(initialized.rng)===hash(observation.seedState),filmPoseMatches:hash(initialized.agents)===hash(entry.replay.frames[0].agents)};
const result={schema:'spread-air-one-encounter-v1',sourceSha256:source(),recordedSource:native.provenance.sourceSha256,nativeGameSha256:sha(nativeBytes),inputSha256:sha(inputsBytes),collectorSha256:sha(readFileSync(import.meta.filename)),node:process.version,flags:inputs.flags,worldDefaults:inputs.worldDefaults,play:n,stop,initialization,frames:[],cues:[],reads:[],steps:0,complete:false};
const save=()=>{result.elapsedSeconds=(performance.now()-start)/1000;assert.equal(source(),expectedSource);mkdirSync(dirname(out),{recursive:true});writeFileSync(out,gzipSync(JSON.stringify(result)));console.log(JSON.stringify({out,initialization,steps:result.steps,complete:result.complete,parity:result.parity,elapsedSeconds:result.elapsedSeconds}));};
if(!initialization.rngMatches||!initialization.filmPoseMatches){save();process.exitCode=1;}else{
 const see=sim.see.bind(sim),information=sim.teammateInformation.bind(sim);
 sim.see=(a,b,scale)=>{const v=see(a,b,scale);if(a.team==='O')result.cues.push({t:sim.t,observer:a.idx,target:b.idx,kind:'see',picture:snap(v)});return v;};
 sim.teammateInformation=(a,b)=>{const v=information(a,b);if(a.team==='O')result.cues.push({t:sim.t,observer:a.idx,target:b.idx,kind:'owned',picture:snap(v)});return v;};
 runReadObservers.set(sim,event=>result.reads.push(snap(event)));
 const step=sim.world.step.bind(sim.world);
 sim.world.step=(intents,dt)=>{const row={t:sim.t,before:sim.agents.map(a=>snap(a.body)),raw:snap(sim.cmds),final:snap(intents),behaviors:sim.agents.map(a=>snap(a.behavior))};const report=step(intents,dt);row.after=sim.agents.map(a=>snap(a.body));row.report=snap(report);result.frames.push(row);result.steps++;return report;};
 while(sim.phase==='live'&&sim.t<stop-1e-9){assert(performance.now()-start<10000,'10s encounter wall budget');sim.tick();}
 const referenceFrames=entry.replay.frames.filter(f=>f.t<=sim.t+1e-9),referenceTelemetry=entry.replay.telemetry.frames.filter(f=>f.t<=sim.t+1e-9);
 const poses=sim.frames.filter(f=>f.t<=sim.t+1e-9).map(f=>({t:f.t,agents:f.agents,ball:f.ball,carrier:f.carrier,carrierPosture:f.carrierPosture}));
 const standard=f=>({t:f.t,agents:f.agents.map(({body,...a})=>a),links:f.links});
 const telemetry=sim.trace.data.frames.map(standard),expectedTelemetry=referenceTelemetry.map(standard);
 result.parity={poses:hash(poses)===hash(referenceFrames),appliedRequests:hash(telemetry)===hash(expectedTelemetry),events:hash(sim.events)===hash(entry.replay.events.filter(e=>e.t<sim.t-1e-9)),referenceFrames:referenceFrames.length};
 const firstDifference=(a,b)=>{for(let i=0;i<Math.max(a.length,b.length);i++)if(hash(a[i]??null)!==hash(b[i]??null))return {index:i,actual:a[i],expected:b[i]};return null;};
 result.firstPoseDifference=firstDifference(poses,referenceFrames);result.firstRequestDifference=firstDifference(telemetry,expectedTelemetry);
 result.replay={frames:sim.frames,telemetry:sim.trace.data,events:sim.events};result.complete=true;save();
}
