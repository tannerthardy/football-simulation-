/** Matched frozen-source, once-per-fixture collection. No roster generation or engine edits.
 * run INPUT GAME_ID accepted OUT [REMAINING_SECONDS]
 * Completed native log rows are append-only durable prefixes; reporting never resimulates.
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {appendFileSync,existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {gzipSync} from 'node:zlib';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const root=process.cwd();
const load=p=>import(pathToFileURL(resolve(root,p)).href);
const {Game}=await load('src/game/game.ts');
const {packReplayPlay}=await load('scripts/replay-data.ts');
const {compactReplayPlays}=await load('scripts/replay-telemetry-packing.ts');
const {sourceVersion}=await load('scripts/source-version.ts');

const launcherStarted=performance.now();
const [mode,input,id,arm,out,remainingArgument,...extra]=process.argv.slice(2);
const hash=x=>createHash('sha256').update(x).digest('hex');
const jsonHash=x=>hash(JSON.stringify(x));
const fileHash=p=>hash(readFileSync(p));
const save=(p,x)=>{mkdirSync(dirname(p),{recursive:true});writeFileSync(p,JSON.stringify(x,null,2)+'\n');};
const describeError=e=>({name:e?.name??'Error',message:e?.message??String(e),stack:e?.stack??null});
class GameAuditTimeout extends Error { constructor(message){super(message);this.name='GameAuditTimeout';} }
class GameAuditStepLimit extends Error { constructor(message){super(message);this.name='GameAuditStepLimit';} }
assert.ok(mode==='run'&&input&&id&&['baseline','candidate'].includes(arm)&&out&&!extra.length,'Use run INPUT GAME_ID baseline|candidate OUT [REMAINING_SECONDS]');
const manifest=JSON.parse(readFileSync(input,'utf8'));
const expectedSource=manifest.arms[arm].sourceSha256;
assert.match(expectedSource,/^[a-f0-9]{64}$/);
let frozenInputs=null;
if(manifest.frozenInputPath){
  assert.equal(fileHash(manifest.frozenInputPath),manifest.frozenInputSha256,'Frozen source input bytes changed');
  frozenInputs=JSON.parse(readFileSync(manifest.frozenInputPath,'utf8'));
  for(const declaration of manifest.fixtures){
    const frozen=frozenInputs.fixtures.find(f=>f.id===declaration.id);
    assert.ok(frozen,'Unknown frozen fixture');
    const {teams,...originalDeclaration}=frozen;
    assert.deepEqual(declaration,originalDeclaration,'Declared fixture differs from frozen source');
    assert.equal(jsonHash(teams),declaration.teamsSha256);
  }
}
const fixtureIndex=manifest.fixtures.findIndex(f=>f.id===id);
const declaration=manifest.fixtures[fixtureIndex];
const fixture=declaration&&(frozenInputs?{...declaration,teams:frozenInputs.fixtures.find(f=>f.id===id).teams}:declaration);
assert.ok(fixture,'Unknown predeclared game');
assert.equal(process.version,manifest.node);
assert.equal(manifest.fixtures.length,2,'Only the declared two-game matched cohort is allowed');
assert.equal(manifest.budget.totalGames,4);
assert.ok(manifest.budget.maxGameSeconds<=120&&manifest.budget.maxCombinedGameSeconds<=480&&manifest.budget.maxGameSteps<=600);
assert.equal(manifest.settings.record,true);
assert.equal(manifest.settings.recordLevel,'full','Freeze full recording in the working manifest before collecting');
const profile=JSON.parse(readFileSync('config/baseline.json','utf8'));
const flags=Object.fromEntries(Object.keys(profile.flags).map(k=>[k,process.env[k]??null]));
assert.deepEqual(flags,manifest.flags);assert.equal(Object.keys(flags).length,44);assert.equal(flags.RUN_CONTACT_COMPONENTS,'1');
assert.equal(sourceVersion(),expectedSource);assert.equal(manifest.arms[arm].sourceSha256,expectedSource);
assert.deepEqual(profile.worldDefaults,manifest.worldDefaults);
assert.equal(jsonHash(fixture.teams),fixture.teamsSha256);
const commit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
assert.equal(commit,manifest.arms[arm].commit,'Working manifest must pin this exact arm commit');
const remainingSeconds=Number(remainingArgument??process.env.CHECKPOINT_REMAINING_SECONDS??manifest.budget.maxCombinedGameSeconds);
assert.ok(Number.isFinite(remainingSeconds)&&remainingSeconds>0,'Remaining batch budget must be positive');
const requestedSoftSeconds=Number(manifest.budget.maxCollectionSeconds??100);
assert.ok(Number.isFinite(requestedSoftSeconds)&&requestedSoftSeconds>0&&requestedSoftSeconds<=100);
const effectiveCollectionSeconds=Math.min(requestedSoftSeconds,manifest.budget.maxGameSeconds,Math.max(0,remainingSeconds-5));
assert.ok(effectiveCollectionSeconds>0,'Insufficient remaining budget to preserve artifacts');
const deadline=launcherStarted+effectiveCollectionSeconds*1000;
const destination=join(out,arm,id);
for(const name of ['started.json','summary.json','plays.jsonl','observations.jsonl'])assert.ok(!existsSync(join(destination,name)),`Previous attempt exists (${name}); do not repeat or overwrite it`);
mkdirSync(destination,{recursive:true});
const provenance={commit,sourceSha256:expectedSource,collectorSha256:fileHash(import.meta.filename),inputSha256:fileHash(input),frozenInputPath:manifest.frozenInputPath??null,frozenInputSha256:manifest.frozenInputPath?fileHash(manifest.frozenInputPath):null,fixtureSha256:jsonHash(fixture),teamsSha256:fixture.teamsSha256,profileSha256:fileHash('config/baseline.json'),lockSha256:fileHash('package-lock.json'),flags,worldDefaults:profile.worldDefaults,node:process.version,platform:process.platform,arch:process.arch,startedAt:new Date().toISOString(),arm,id,gameIndex:fixtureIndex,gameSeed:fixture.seed,recordLevel:'full',remainingBatchSeconds:remainingSeconds,effectiveCollectionSeconds,externalHardCeilingSeconds:manifest.budget.maxGameSeconds};
save(join(destination,'started.json'),provenance);
const {home,away}=structuredClone(fixture.teams),observations=[];
let game,activeSim=null,activeObservation=null,lastCompletedWorldReport=null,activeStartState=null;
let steps=0,writtenLog=0,writtenObservations=0,error=null;
const guard=()=>{if(performance.now()>=deadline)throw new GameAuditTimeout('Soft collection wall budget exhausted; preserving completed prefix and interrupted snap');};
// Passive report copying only: no extra sensing, controller calls, forces or RNG.
const observe=(sim,kind)=>{
  activeSim=sim;activeStartState=structuredClone(game.state);lastCompletedWorldReport=null;
  const row={observationIndex:observations.length,kind,seedState:structuredClone(sim.rng),gameState:activeStartState,call:structuredClone(sim.offCall),defense:structuredClone(sim.defCall),initialPlayers:sim.agents.map(a=>({idx:a.idx,id:a.player.id,listedPosition:a.player.position,slot:a.slot,team:a.team,energy:a.body.energy,vmax:a.profile.vmax,massKg:a.profile.massKg,brake:a.profile.brake,balance:a.profile.balance})),worldSteps:0,teammateContacts:[],teammateImpulse:0};
  observations.push(row);activeObservation=row;
  const step=sim.world.step.bind(sim.world);
  sim.world.step=(intents,dt)=>{
    const report=step(intents,dt);row.worldSteps++;
    lastCompletedWorldReport=report;
    for(const c of report.contacts){
      const a=sim.agents[c.i],b=sim.agents[c.j];
      if(a.team===b.team&&c.impulse>1e-8){row.teammateImpulse+=c.impulse;row.teammateContacts.push({t:sim.t+dt,i:c.i,j:c.j,slots:[a.slot,b.slot],team:a.team,impulse:c.impulse});}
    }
    // World has advanced; PlaySim's enclosing tick may not yet commit its time/frame.
    guard();
    return report;
  };
  return undefined;
};
const appendCompletedPrefix=()=>{
  const rows=game.result().log;
  if(rows.length>writtenLog){appendFileSync(join(destination,'plays.jsonl'),rows.slice(writtenLog).map(p=>JSON.stringify(p)+'\n').join(''));writtenLog=rows.length;}
  if(observations.length>writtenObservations){appendFileSync(join(destination,'observations.jsonl'),observations.slice(writtenObservations).map(o=>JSON.stringify(o)+'\n').join(''));writtenObservations=observations.length;}
};
const validateFrames=rows=>{
  for(const p of rows)for(const f of p.replay?.frames??[])assert.ok(Number.isFinite(f.t)&&f.agents.length===66&&[...f.agents,...f.ball].every(Number.isFinite),'Nonfinite/malformed native film');
};
game=new Game(home,away,{seed:fixture.seed,record:true,recordLevel:'full',handContact:manifest.settings.handContact,hooks:{playResult:observe}});
const start=performance.now();
try{
  guard();game.kickoffToStart();appendCompletedPrefix();
  while(!game.state.over){
    if(steps>=manifest.budget.maxGameSteps)throw new GameAuditStepLimit('Game step budget exhausted');
    guard();
    const previousLog=game.result().log.length;
    game.step();steps++;
    appendCompletedPrefix();
    validateFrames(game.result().log.slice(previousLog));
    activeSim=null;activeObservation=null;lastCompletedWorldReport=null;activeStartState=null;
    guard();
    if(steps%20===0)console.log(JSON.stringify({progress:true,arm,id,steps,quarter:game.state.quarter,clock:game.state.clock,score:game.state.score,elapsedSeconds:(performance.now()-start)/1000,launcherSeconds:(performance.now()-launcherStarted)/1000}));
  }
  assert.equal(jsonHash({home,away}),fixture.teamsSha256,'Game mutated frozen teams');
  assert.equal(sourceVersion(),provenance.sourceSha256);assert.equal(fileHash(input),provenance.inputSha256);
  assert.equal(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),commit);
}catch(e){error=describeError(e);}
const elapsedSeconds=(performance.now()-start)/1000,collectionLauncherSeconds=(performance.now()-launcherStarted)/1000;
const result=game.result(),complete=game.state.over&&!error;
// Never call buildResult on a live/interrupted sim: it mutates statistics while resolving.
const unfinished=activeSim&&error?{
  observationIndex:activeObservation?.observationIndex,kind:activeObservation?.kind,stateAtStart:activeStartState,
  t:activeSim.t,phase:activeSim.phase,outcome:activeSim.outcome,possession:activeSim.possession,los:activeSim.los,firstDownX:activeSim.firstDownX,
  call:structuredClone(activeSim.offCall),defense:structuredClone(activeSim.defCall),rng:structuredClone(activeSim.rng),
  frames:activeSim.frames,events:activeSim.events,telemetry:activeSim.trace.data,
  bodies:activeSim.agents.map(a=>({idx:a.idx,id:a.player.id,team:a.team,slot:a.slot,body:structuredClone(a.body)})),
  lastCompletedWorldReport,
  boundary:'Interrupted World report may be newer than PlaySim.t, events and recorded frames; no terminal result or physical outcome inferred.',
}:null;
const quarters=[...result.quarterScores];
if(!quarters.length||jsonHash(quarters.at(-1))!==jsonHash(result.score))quarters.push({...result.score});
const teams=[home,away].map(t=>({abbr:t.abbr,name:t.name,scheme:t.offScheme,defScheme:t.defScheme,coach:t.coach,box:result.box.team(t.abbr),players:result.box.teamPlayers(t.abbr)}));
const limitations=[
  'Native positional frames sample every two 0.05-second ticks; this source records positions to 0.01 yard.',
  'Full telemetry samples last-step contact reports; teammate observation arrays retain reported teammate impulses at every observed live World step.',
  'Game two-point tries do not forward record options; their observations exist but native film is unavailable.',
  'No causal trigger, rejected option or discarded request stage is inferred when the controller does not expose it.',
  'World steps during PlaySim construction before the Game hook are outside this live observer.',
  ...(unfinished?['Interrupted snap frames/trace are saved separately as unfinished; the film contains only completed native log entries.']:[]),
];
const raw={schema:'matched-controller-game-checkpoint-v1',provenance,complete,censored:error?.name==='GameAuditTimeout'||error?.name==='GameAuditStepLimit',error,finalState:game.state,score:result.score,quarters,teams,log:result.log,observations,unfinished,elapsedSeconds,collectionLauncherSeconds,steps,limitations};
const artifactStarted=performance.now();
writeFileSync(join(destination,'game.json.gz'),gzipSync(JSON.stringify(raw)));
if(error)save(join(destination,'failed.json'),{provenance,complete:false,censored:raw.censored,state:game.state,steps,elapsedSeconds,error,unfinishedObservation:unfinished?.observationIndex??null});
let packed=[],artifactError=null;
const meta={title:`Matched checkpoint · ${arm} · ${id}${complete?'':' · INCOMPLETE PREFIX'}`,seed:fixture.seed,final:result.score,quarters,sourceSha256:expectedSource,telemetryLevel:'full',complete,error,limitations,home:{name:home.name,abbr:home.abbr,color:'#1d4f91',text:'#ffffff'},away:{name:away.name,abbr:away.abbr,color:'#a3302a',text:'#ffffff'}};
const catalog={coverage:{},front:{},formation:{}};
for(const p of result.log){if(p.plan?.coverage)catalog.coverage[p.plan.coverage]=p.plan.coverage;if(p.plan?.front)catalog.front[p.plan.front]=p.plan.front;if(p.plan?.formation)catalog.formation[p.plan.formation]=p.plan.formation;}
try{packed=result.log.map(p=>packReplayPlay(p,fixtureIndex));}catch(e){artifactError=describeError(e);}
const film={meta,games:manifest.fixtures.map((f,i)=>({seed:f.seed,...(i===fixtureIndex?{final:result.score,quarters}:{}),uncollectedInThisFile:i!==fixtureIndex})),plays:compactReplayPlays(packed),catalog};
const template=readFileSync('viewer/replay.template.html','utf8'),marker='/*__REPLAY_DATA__*/null';assert.ok(template.includes(marker));
writeFileSync(join(destination,'film.html'),'<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body>\n'+template.replace(marker,()=>JSON.stringify(film).replace(/<\//g,'<\\/'))+'\n</body></html>\n');
const artifactSeconds=(performance.now()-artifactStarted)/1000;
const summary={schema:raw.schema,provenance,complete,censored:raw.censored,error,artifactError,finalState:game.state,score:result.score,quarters,teams,log:result.log.map(({replay,...p})=>({...p,filmFrames:replay?.frames.length??0,events:replay?.events})),elapsedSeconds,collectionLauncherSeconds,artifactSeconds,launcherSeconds:(performance.now()-launcherStarted)/1000,steps,filmedPlays:packed.filter(p=>'frames'in p).length,physicalScrimmages:observations.length,observedScrimmages:observations.filter(o=>o.kind==='scrimmage').length,observedTwoPointTries:observations.filter(o=>o.kind==='two-point').length,unfinishedObservation:unfinished?.observationIndex??null,teammateContacts:observations.reduce((n,o)=>n+o.teammateContacts.length,0),teammateImpulse:observations.reduce((n,o)=>n+o.teammateImpulse,0),worldSteps:observations.reduce((n,o)=>n+o.worldSteps,0),durablePrefixRows:writtenLog,durableObservationRows:writtenObservations,limitations,artifacts:['game.json.gz','film.html','plays.jsonl','observations.jsonl'].filter(p=>existsSync(join(destination,p))).map(p=>({path:p,sha256:fileHash(join(destination,p))}))};
save(join(destination,'summary.json'),summary);
console.log(JSON.stringify({complete,censored:raw.censored,arm,id,score:result.score,steps,filmedPlays:summary.filmedPlays,elapsedSeconds,artifactSeconds,launcherSeconds:(performance.now()-launcherStarted)/1000,error,artifactError}));
if(error||artifactError)process.exitCode=1;
