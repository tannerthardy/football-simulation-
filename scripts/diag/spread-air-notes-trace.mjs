/** One bounded prefix replay for missing catch/readiness evidence. No tuning. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {Game} from '../../src/game/game.ts';
import {sourceVersion} from '../source-version.ts';

const out=process.argv[2];assert.ok(out,'Output directory required');
const sha=x=>createHash('sha256').update(x).digest('hex');
const inputPath='data/reviews/current/experimental-game-inputs.json';
const nativePath='data/reviews/current/experimental-game-checkpoint/experimental/spread-air/game.json.gz';
const input=JSON.parse(readFileSync(inputPath)),fixture=input.fixtures.find(f=>f.id==='spread-air');
const original=JSON.parse(gunzipSync(readFileSync(nativePath)));
assert.equal(sourceVersion(),original.provenance.sourceSha256);assert.equal(process.version,original.provenance.node);
const flags=Object.fromEntries(Object.keys(original.provenance.flags).map(k=>[k,process.env[k]??null]));
assert.deepEqual(flags,original.provenance.flags);
const savedPlays=original.log.filter(p=>p.replay),savedObs=original.observations.filter(o=>o.kind==='scrimmage');
const detail=new Set([2,3,4,5,6,10,12,18,22,23,24,34,37,38,40,43,45]);
let physical=0;const traces=[];const began=performance.now();
const summarizeBall=sim=>({kind:sim.ball.kind,carrier:sim.carrier?.idx??null,
  ...(sim.ball.kind==='air'?{target:sim.ball.target?.idx??null,deflected:sim.ball.deflected,
    releaseT:sim.ball.releaseT,pos:{...sim.ball.flight.pos},vel:{...sim.ball.flight.vel}}:{})});
const snapshot=sim=>sim.agents.map(a=>({idx:a.idx,slot:a.slot,id:a.player.id,kind:a.behavior.kind,
  pos:{...a.pos},vel:{...a.vel},facing:a.body.facing,passOption:a.behavior.passOption??null,
  releaseAfter:a.behavior.releaseAfter??null,releaseInstalled:!!a.behavior.releaseTo,
  noCatchUntil:a.noCatchUntil,target:a.behavior.target?.idx??null,
  engagement:a.engagement?{blocker:a.engagement.blocker.idx,defender:a.engagement.defender.idx}:null,
  reach:a.profile.reach,reactReach:a.profile.reactReach,maxCatchHeight:a.profile.maxCatchHeight,
  radius:a.profile.radius,read:a.recog?.read??null,tags:[...a.tags]}));
const game=new Game(structuredClone(fixture.teams.home),structuredClone(fixture.teams.away),{
 seed:fixture.seed,record:true,recordLevel:'full',hooks:{playResult(sim,kind){
  assert.equal(kind,'scrimmage','No unexpected physical try within this prefix');
  const p=savedPlays[physical],o=savedObs[physical++];
  assert.deepEqual(sim.offCall,o.call);assert.deepEqual(structuredClone(sim.rng),o.seedState);
  assert.deepEqual(sim.agents.map(a=>a.body.energy),o.initialPlayers.map(a=>a.energy));
  if(!detail.has(p.index+1))return undefined;
  const row={play:p.index+1,index:p.index,call:p.call,catchDraws:[],catchRatings:[],ticks:[],fullReplay:null};traces.push(row);
  let catchActor=null;
  for(const a of sim.agents){const rate=a.r.bind(a);a.r=(...args)=>{
   const value=rate(...args);
   if(['hands','ballSkills'].includes(args[0])&&sim.ball.kind==='air'){
    const stack=new Error().stack??'';
    if(stack.includes('receiverContest')||stack.includes('defenderPlay')){
     if(args[0]==='hands'&&stack.includes('receiverContest'))catchActor=a.idx;
     row.catchRatings.push({t:sim.t,idx:a.idx,rating:args[0],value,site:stack.includes('receiverContest')?'receiverContest':'defenderPlay'});
    }
   }return value;
  };}
  const chance=sim.rng.chance.bind(sim.rng);
  sim.rng.chance=(...args)=>{const stack=new Error().stack??'',value=chance(...args);
   if(sim.ball.kind==='air'&&(stack.includes('receiverContest')||stack.includes('defenderPlay')))
    row.catchDraws.push({t:sim.t,site:stack.includes('receiverContest')?'receiverContest':'defenderPlay',receiver:catchActor,p:args[0],success:value,ball:summarizeBall(sim),actors:snapshot(sim)});
   return value;};
  const tick=sim.tick.bind(sim);
  sim.tick=()=>{const t=sim.t,before=summarizeBall(sim);tick();
   const after=summarizeBall(sim);
   if(t>=0&&(before.kind==='air'||after.kind==='air'||(p.index+1===38&&t<=1.6)))
    row.ticks.push({tickStart:t,before,after,actors:snapshot(sim)});
   assert.ok(performance.now()-began<45000,'Prefix replay exceeded 45 s');
  };
  return undefined;
 }}});
game.kickoffToStart();let steps=0;
while(!game.log.some(p=>p.index>=44)){
 assert.ok(++steps<=45,'Prefix exceeded 45 game steps');assert.ok(performance.now()-began<45000);
 game.step();
}
const produced=game.log.filter(p=>p.index<=44),expected=original.log.filter(p=>p.index<=44);
assert.equal(produced.length,expected.length);
for(let k=0;k<produced.length;k++){
 const actual=structuredClone(produced[k]),wanted=structuredClone(expected[k]);
 if(actual.replay){
  const row=traces.find(t=>t.index===actual.index);
  if(row)row.fullReplay=structuredClone(actual.replay);
  delete actual.replay.telemetry;delete wanted.replay.telemetry;
 }
 // The original native file is JSON: undefined fields are omitted and -0 is
 // serialized as 0. Compare that exact storage contract, not JS-only values.
 assert.deepEqual(JSON.parse(JSON.stringify(actual)),wanted,
   `Native log/positions/events drift at P${expected[k].index+1}`);
}
assert.equal(sourceVersion(),original.provenance.sourceSha256);
mkdirSync(out,{recursive:true});
const receipt={schema:'spread-air-notes-prefix-v1',purpose:'Resolve protection-versus-readiness, unlogged deflection and actual catch opportunities for user-nominated film; other owners reuse the packet.',sourceSha256:sourceVersion(),inputSha256:sha(readFileSync(inputPath)),nativeGameSha256:sha(readFileSync(nativePath)),collectorSha256:sha(readFileSync(import.meta.filename)),flags,worldDefaults:original.provenance.worldDefaults,node:process.version,fixture:'spread-air',gameSeed:fixture.seed,lastReviewedLogIndex:44,recordLevel:'full',completedFullGames:0,physicalScrimmagesReplayed:physical,gameSteps:steps,nativeLogPositionEventMatches:produced.length,observers:'Existing full recorder; passive tick snapshots and variadic rating/chance forwards. No extra observations or random draws requested.',elapsedSeconds:(performance.now()-began)/1000};
const packed=gzipSync(JSON.stringify({receipt,traces}));
writeFileSync(`${out}/prefix-trace.json.gz`,packed);
writeFileSync(`${out}/prefix-receipt.json`,JSON.stringify({...receipt,traceSha256:sha(packed)},null,2)+'\n');
console.log(JSON.stringify(receipt));
