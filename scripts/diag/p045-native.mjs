/** Exact frozen P006/P010/P045 setups and passive native controller tapes.
 * prepare MANIFEST GAME OUT.json | inspect INPUT OUT.json.gz [primary-only]
 * flight INPUT OUT.json.gz: same execution, add passive consumed-flight inputs
 * Historical capture is an ignored archive, never a production branch merge.
 */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {dirname} from 'node:path';
import {gunzipSync,gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {Game} from '../../src/game/game.ts';
import {PlaySim} from '../../src/sim/playsim.ts';
import {ScoutingReport} from '../../src/sim/recognition.ts';
import {CoverageScouting} from '../../src/sim/qbmind.ts';
import {catchSpot} from '../../src/sim/behaviors/receiver.ts';
import {sourceVersion} from '../source-version.ts';

const copy=x=>structuredClone(x),hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex'),
 fileHash=p=>createHash('sha256').update(readFileSync(p)).digest('hex'),
 read=p=>JSON.parse(p.endsWith('.gz')?gunzipSync(readFileSync(p)):readFileSync(p,'utf8')),
 save=(p,x)=>{assert.ok(!existsSync(p),'Do not overwrite evidence');mkdirSync(dirname(p),{recursive:true});writeFileSync(p,p.endsWith('.gz')?gzipSync(JSON.stringify(x)):JSON.stringify(x,null,2)+'\n');};
const profile=read('config/baseline.json'),provenance={sourceSha256:sourceVersion(),
 checkout:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),collectorSha256:fileHash(import.meta.filename),
 flags:Object.fromEntries(Object.keys(profile.flags).map(k=>[k,process.env[k]??null])),worldDefaults:profile.worldDefaults,
 node:process.version,lockSha256:fileHash('package-lock.json')};
assert.deepEqual(provenance.flags,profile.flags);assert.equal(process.version,'v22.23.3');
function restore(s,record){s=copy(s);const scouting=new ScoutingReport(s.scouting.strength);Reflect.set(scouting,'cells',new Map(s.scouting.cells));
 return new PlaySim({...s,energy:new Map(s.energy),scouting,coverageScouting:Object.assign(new CoverageScouting(),s.coverageScouting),
 record,recordLevel:'full',recordEvery:1});}
const lean=r=>({...r,frames:undefined,telemetry:undefined});
function signature(sim,r){return hash({result:lean(r),bodies:sim.agents.map(a=>a.body),intents:sim.intents,
 minds:sim.agents.map(a=>a.mind),rng:sim.rng,perception:sim.perception});}
function inspect(c,record,model=null,audit=false,flight=false,allDefense=false){const sim=restore(c.setup,record),rows=[],wrapped=new WeakSet(),
 recordedActors=new Set(allDefense?sim.defense.map(a=>a.idx):[18,19,20]);let cues=[],raw=[],world=null;
 const catchAudit={draws:[],chances:[],ratings:[],tackleNormals:[]};
 if(audit){
  const actors={};let index=0;
  const site=()=>{const stack=new Error().stack??'';return stack.includes('/sim/tackle.ts')?'tackle':stack.includes('receiverContest')?'receiverContest':stack.includes('defenderPlay')?'defenderPlay':stack.includes('playBall')?'playBall':'other';};
  for(const a of sim.agents){const rate=a.r.bind(a);a.r=(...args)=>{const value=rate(...args);
   if(sim.ball.kind==='air'&&sim.t>=3&&['hands','ballSkills'].includes(args[0])){
    const at=site();actors[at]=a.idx;if(at==='receiverContest'||at==='defenderPlay')catchAudit.ratings.push({t:sim.t,actor:a.idx,rating:args[0],value,site:at});
   }return value;};}
  const next=sim.rng.next.bind(sim.rng);sim.rng.next=(...args)=>{const value=next(...args);index++;
   const at=site();if((sim.ball.kind==='air'&&sim.t>=3)||at==='tackle'){catchAudit.draws.push({t:sim.t,index,site:at,actor:actors[at]??null,value});}return value;};
  const chance=sim.rng.chance.bind(sim.rng);sim.rng.chance=(...args)=>{const value=chance(...args);
   const at=site();if((sim.ball.kind==='air'&&sim.t>=3)||at==='tackle'){catchAudit.chances.push({t:sim.t,site:at,actor:actors[at]??null,probability:args[0],success:value});}return value;};
  const normal=sim.rng.normal.bind(sim.rng);sim.rng.normal=(...args)=>{const value=normal(...args);
   if(site()==='tackle')catchAudit.tackleNormals.push({t:sim.t,index,args,value});return value;};
 }
 if(model==='primary-only'){
  assert.equal(c.id,'spread-air/P45');const judgment=sim.agents[20].behavior.judgment;
  assert.ok(judgment);const decide=judgment.decide.bind(judgment);
  judgment.decide=(a,s,reader,primary,deep)=>{
   const chosen=decide(a,s,reader,primary,deep);
   // Diagnostic only: execute the installed rule rather than discretionary
   // prethrow help. Normal consumed reads, decision cadence and draws run.
   // Once flight starts, ordinary ball perception/contests remain in charge.
   if(s.ball.kind!=='air'&&s.catchAt<0){judgment.override=null;
    if(chosen!==primary)judgment.reason='diagnostic-primary-only';return primary;}
   return chosen;
  };
 }
 const see=sim.see.bind(sim);sim.see=(a,b,...rest)=>{const picture=see(a,b,...rest);
  if(record&&recordedActors.has(a.idx))cues.push({actor:a.idx,target:b.idx,args:rest,picture:copy(picture)});return picture;};
 function wrap(b){if(wrapped.has(b))return b;wrapped.add(b);const update=b.update.bind(b);
  b.update=(a,s)=>{const start=cues.length,
   // Snapshot inputs already available to playBall. catchSpot is a pure
   // own-body/flight estimate: no see, tags, sensing or random draw.
   flightInputs=record&&flight&&s.ball.kind==='air'&&recordedActors.has(a.idx)
    ? {path:copy(s.ballPath),spot:copy(catchSpot(a,s)),speedScale:a.speedScale,tagsBefore:[...a.tags]} : undefined,
   request=update(a,s);
   if(record&&recordedActors.has(a.idx))raw.push({actor:a.idx,kind:b.kind,job:b.job??null,target:b.target?.idx??null,
    request:copy(request),rule:b.recordedRule?.(s.t)??null,man:b.recordedMan?.()??b.recordedTechnique?.()??null,
    cueStart:start,cueEnd:cues.length,flight:flightInputs?{...flightInputs,tagsAfter:[...a.tags]}:undefined});return request;};return b;}
 if(record)for(const a of sim.defense){let behavior=wrap(a.behavior);Object.defineProperty(a,'behavior',{get:()=>behavior,set:b=>{behavior=wrap(b);}});}
 const step=sim.world.step.bind(sim.world);sim.world.step=(intents,dt)=>{
  const before=record?sim.agents.map(a=>copy(a.body)):null,applied=record?copy(intents):null,report=step(intents,dt);
  if(record)world={before,applied,after:sim.agents.map(a=>copy(a.body)),contacts:copy(report.contacts),
   grasps:sim.world.joints.filter(j=>j.kind==='grasp').map(j=>{const {a,b,...rest}=j;return {a:sim.world.indexOf(a),b:sim.world.indexOf(b),...copy(rest)};})};return report;};
 const tick=sim.tick.bind(sim);sim.tick=()=>{const t=sim.t;raw=[];cues=[];world=null;tick();if(record)rows.push({t,
  carrier:sim.carrier?.idx??null,ball:sim.ball.kind,catchAt:sim.catchAt,raw,cues,world});};
 const began=performance.now(),result=sim.run();return {id:c.id,signature:signature(sim,result),result:lean(result),seconds:(performance.now()-began)/1000,
  players:sim.agents.map(a=>({idx:a.idx,id:a.player.id,slot:a.slot,profile:a.profile})),rows:record?rows:undefined,
  frames:record?result.frames:undefined,telemetry:record?result.telemetry:undefined,catchAudit:audit?catchAudit:undefined};}
const [mode,a1,a2,a3]=process.argv.slice(2),began=performance.now();
if(mode==='prepare'){
 const manifest=read(a1),f=manifest.fixtures.find(f=>f.id==='spread-air'),packet=read(a2),selected=new Set([5,9,44]),clips=[];
 assert.equal(sourceVersion(),packet.provenance.sourceSha256);
 let game,offCall,defCall,manPrefs,physical=0;
 game=new Game(copy(f.teams.home),copy(f.teams.away),{seed:f.seed,record:true,recordLevel:'standard',hooks:{playResult(sim,kind){
  assert.equal(kind,'scrimmage');physical++;const index=Reflect.get(game,'playIndex');if(!selected.has(index))return undefined;
  const off=sim.qb.player.id.startsWith(f.teams.home.abbr)?'home':'away',def=off==='home'?'away':'home',
   scouting=Reflect.get(game,'scouting')[def],coverageScouting=Reflect.get(game,'coverageScouting')[off],
   setup=copy({offense:Object.fromEntries(sim.offense.map(a=>[a.slot,a.player])),defense:Object.fromEntries(sim.defense.map(a=>[a.slot,a.player])),
    offCall,defCall,manPrefs,los:sim.los,ballY:sim.ballY,firstDownX:sim.firstDownX,seed:sim.rng.key,energy:[...Reflect.get(game,'energy')],
    hurry:sim.hurry,down:sim.snapContext.down,audibles:true,scouting:{strength:Reflect.get(scouting,'strength'),cells:[...Reflect.get(scouting,'cells')]},
    coverageScouting:{...coverageScouting}});
  const result=sim.run(),cached=packet.log.find(p=>p.index===index);
  assert.equal(hash(result.stats),hash(cached.stats));assert.equal(result.outcome,cached.outcome);assert.equal(hash(result.frames),hash(cached.replay.frames));
  clips.push({id:`spread-air/P${index+1}`,setup,result:lean(result),signature:signature(sim,result),filmSha256:hash(cached.replay.frames)});
  return result;
 }}});
 for(const oc of Object.values(Reflect.get(game,'oc'))){const fn=oc.call.bind(oc);oc.call=(...args)=>{offCall=fn(...args);return offCall;};}
 for(const dc of Object.values(Reflect.get(game,'dc'))){const fn=dc.call.bind(dc);dc.call=(...args)=>{const r=fn(...args);defCall=r.call;manPrefs=r.prefs;return r;};}
 game.kickoffToStart();let steps=0;while(Reflect.get(game,'playIndex')<=44){assert.ok(++steps<=45);assert.ok(performance.now()-began<30000);game.step();}
 assert.equal(clips.length,3);for(const c of clips)assert.equal(inspect(c,false).signature,c.signature,'Single play restored with drift');
 save(a3,{schema:'p045-native-inputs-v1',provenance,manifestSha256:fileHash(a1),packetSha256:fileHash(a2),
  selection:'User-selected P045, useful P006 tackle and P010 interception. Existing passive prefix lacks restartable initial setups/full prethrow body states; one necessary historical prefix captures them. No full game.',
  physicalScrimmages:physical,restorationCheckExecutions:3,prefixSteps:steps,seconds:(performance.now()-began)/1000,clips});
 console.log(JSON.stringify({out:a3,seconds:(performance.now()-began)/1000,physical,clips:clips.map(c=>({id:c.id,outcome:c.result.outcome,yac:c.result.stats.yac}))}));
}else if(mode==='inspect'||mode==='audit'||mode==='flight'||mode==='transfer'||mode==='grip-audit'){
 const frozen=read(a1),clips=[];
 const gripAudit=mode==='grip-audit',model=gripAudit?null:a3;
 assert.ok(!model||model==='primary-only','Unknown diagnostic model');
 const selected=frozen.clips.filter(c=>gripAudit?c.id===a3:(!a3&&mode!=='audit')||c.id==='spread-air/P45');
 assert.ok(selected.length,'No selected inputs');
 for(const c of selected){assert.ok(performance.now()-began<30000);const r=inspect(c,mode!=='audit'&&!gripAudit,model,mode==='audit'||gripAudit,mode==='flight'||mode==='transfer',mode==='transfer'),plain=inspect(c,false,model);
  assert.equal(r.signature,plain.signature,'Observer changed native execution');if(!model&&provenance.sourceSha256===frozen.provenance.sourceSha256)assert.equal(r.signature,c.signature);
  clips.push({...r,observerNeutral:true});console.log(JSON.stringify({id:r.id,yac:r.result.stats.yac,outcome:r.result.outcome,seconds:r.seconds}));}
 assert.equal(sourceVersion(),provenance.sourceSha256);save(a2,{schema:'p045-native-inspection-v1',provenance,model:model??null,selectedInput:gripAudit?a3:null,inputSha256:fileHash(a1),seconds:(performance.now()-began)/1000,clips});
}else throw Error('prepare MANIFEST GAME OUT | inspect/flight INPUT OUT');
