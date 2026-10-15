/** Frozen checkpoint reconstruction and native single-play evidence. No added sensing.
 * baseline launcher -- node --import tsx scripts/diag/yac-containment.mjs prepare OUT
 * ... trace INPUT OUT [ID,...] ; ... compare INPUT OUT [ID,...]
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {dirname} from 'node:path';
import {gunzipSync,gzipSync} from 'node:zlib';
import {Game} from '../../src/game/game.ts';
import {Rng} from '../../src/core/rng.ts';
import {generateTeam,pickOffense,pickDefense} from '../../src/league/team.ts';
import {PASS_BY_ID,RUN_BY_ID} from '../../src/playbook/concepts.ts';
import {COVERAGE_BY_ID,FRONT_BY_ID} from '../../src/playbook/defense.ts';
import {FORMATION_BY_ID} from '../../src/playbook/formations.ts';
import {PlaySim} from '../../src/sim/playsim.ts';
import {ScoutingReport} from '../../src/sim/recognition.ts';
import {CoverageScouting} from '../../src/sim/qbmind.ts';
import {sourceVersion} from '../source-version.ts';
import {controlledApproach} from './yac-controlled-approach.ts';
import {timeToReach} from '../../src/physics/reach.ts';
import {catchSpot} from '../../src/sim/behaviors/receiver.ts';
import {TRACKING_REACH_BONUS} from '../../src/sim/catching.ts';
import {capApproach} from './yac-cap-model.ts';
const copy=x=>structuredClone(x),hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const fh=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
const save=(p,x)=>{mkdirSync(dirname(p),{recursive:true});writeFileSync(p,p.endsWith('.gz')?gzipSync(JSON.stringify(x)):JSON.stringify(x,null,2)+'\n');};
const read=p=>JSON.parse(p.endsWith('.gz')?gunzipSync(readFileSync(p)):readFileSync(p,'utf8'));
const profile=read('config/baseline.json');
const provenance={commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sourceSha256:sourceVersion(),
 collectorSha256:fh(import.meta.filename),node:process.version,platform:process.platform,arch:process.arch,
 flags:Object.fromEntries(Object.keys(profile.flags).map(k=>[k,process.env[k]??null])),worldDefaults:profile.worldDefaults,
 lockSha256:fh('package-lock.json'),startedAt:new Date().toISOString()};
assert.deepEqual(provenance.flags,profile.flags);assert.equal(process.version,'v22.23.3');
const leanResult=r=>({...r,frames:undefined,telemetry:undefined});
function signature(sim,result){return hash({result:leanResult(result),bodies:sim.agents.map(a=>a.body),intents:sim.intents,rng:sim.rng,perception:sim.perception});}
function restore(input,record=false){const s=copy(input),scouting=s.scouting?new ScoutingReport(s.scouting.strength):undefined;
 if(scouting)Reflect.set(scouting,'cells',new Map(s.scouting.cells));
 const coverageScouting=s.coverageScouting?Object.assign(new CoverageScouting(),s.coverageScouting):undefined;
 return new PlaySim({...s,energy:s.energy?new Map(s.energy):undefined,scouting,coverageScouting,record,recordEvery:record?1:2,recordLevel:record?'full':'standard'});}
function body(a){return {idx:a.idx,pos:copy(a.pos),vel:copy(a.vel),facing:a.facing,energy:a.body.energy,
 support:copy(a.body.support),stance:a.stance,downUntil:a.downUntil,engaged:!!a.engagement};}
function pair(c,d){const dx=c.pos.x-d.pos.x,dy=c.pos.y-d.pos.y,dist=Math.hypot(dx,dy),vx=c.vel.x-d.vel.x,vy=c.vel.y-d.vel.y;
 return {distance:dist,closing:-(vx*dx+vy*dy)/Math.max(1e-9,dist),transverseSpeed:Math.abs(vx*dy-vy*dx)/Math.max(1e-9,dist),
 rearCos:-(c.vel.x*dx+c.vel.y*dy)/Math.max(1e-9,c.speed*dist),defenderSpeed:d.speed,runnerSpeed:c.speed};}
function flightChoice(a,sim,consumed){
 if(sim.ball.kind!=='air')return null;
 const receivers=sim.offense.filter(r=>r!==sim.qb&&!['LT','LG','C','RG','RT'].includes(r.slot)),
  pictures=receivers.map(r=>({r,seen:consumed.findLast(c=>c.target===r.idx&&c.delay===undefined)?.seen}));
 if(pictures.some(p=>!p.seen))return null;
 let window=null;
 for(const s of sim.ballPath){const remaining=s.t-sim.t;if(remaining<0||s.z<.25)continue;
  for(const {r,seen} of pictures){if(s.z>r.profile.maxCatchHeight*.92)continue;const p={x:s.x,y:s.y},reach=r.profile.reach+TRACKING_REACH_BONUS;
   if(Math.hypot(p.x-seen.pos.x,p.y-seen.pos.y)>r.profile.vmax*remaining+reach)continue;
   if(Math.hypot(p.x-seen.pos.x-seen.vel.x*remaining,p.y-seen.pos.y-seen.vel.y*remaining)<=reach
    ||timeToReach({pos:seen.pos,vel:seen.vel,profile:r.profile},p,reach)<=remaining){window={p,t:s.t,receiver:r.idx,seen};break;}
  }if(window)break;
 }
 const spot=catchSpot(a,sim),tt=spot?timeToReach({pos:a.pos,vel:a.vel,profile:a.profile,speedScale:a.speedScale},spot.p,a.profile.reach):null,
  earlierBall=!!(spot&&window&&spot.t<window.t&&tt<=spot.t-sim.t+.05),
  carry=!!(window&&!earlierBall&&Math.hypot(window.seen.vel.x,window.seen.vel.y)>.5&&
   Math.hypot(window.seen.pos.x-a.pos.x,window.seen.pos.y-a.pos.y)<=a.profile.radius+sim.agents[window.receiver].profile.radius+a.profile.reach),
  ballReachable=!!(spot&&tt<=spot.t-sim.t+.05&&(!window||spot.t<=window.t+.05));
 return {window,spot,tt,earlierBall,ballReachable,branch:carry?'carry':ballReachable?'ball-arrival':'catch-window-drive',
  source:'Pure reconstruction from pictures consumed by this controller; no see, RNG or behavior call.'};
}
function trace(f,observe,model=null){const sim=restore(f.setup,observe),rows=[],wrapped=new WeakSet();let cues=[],stage='init',raw=[],world=null;
 const seen=sim.see.bind(sim);sim.see=(a,b,delay)=>{const p=seen(a,b,delay);if(observe&&a.team==='D')cues.push({stage,actor:a.idx,target:b.idx,delay,seen:copy(p)});return p;};
 const wrap=(b)=>{if(wrapped.has(b))return b;wrapped.add(b);const update=b.update.bind(b);
  b.update=(a,s)=>{const old=stage;stage='controller';const start=cues.length;const intent=update(a,s);
   let request=intent;
   if(model&&a.team==='D'&&b.kind==='pursuit'&&!sim.bond?.tacklers.includes(a)){
    const target=sim.carrier,seen=cues.slice(start).find(c=>c.target===target?.idx&&c.delay!==undefined)?.seen;
    // An engaged/down defender may return before reading a pursuit target.
    // No new query is allowed merely to make the diagnostic applicable.
    if(seen)request=model==='cap'?capApproach(a,s,target,seen,intent):controlledApproach(a,seen,a.profile.radius+target.profile.radius+a.profile.reach*.65,intent,s.t);
   }
   if(observe&&a.team==='D')raw.push({actor:a.idx,kind:b.kind,raw:copy(request),original:model?copy(intent):undefined,recognition:a.recog?.read,
    target:b.target?.idx??null,job:copy(b.job),tags:[...a.tags],flight:flightChoice(a,s,cues.slice(start)),cueStart:start,cueEnd:cues.length});stage=old;return request;};return b;};
 if(observe)for(const a of sim.defense){let behavior=wrap(a.behavior);Object.defineProperty(a,'behavior',{get:()=>behavior,set:b=>{behavior=wrap(b);},configurable:true});
  const update=a.recog.update.bind(a.recog);a.recog.update=(a,s)=>{stage='recognition';return update(a,s);};}
 const step=sim.world.step.bind(sim.world);sim.world.step=(intents,dt)=>{const before=observe?sim.agents.map(body):null;const applied=observe?copy(intents):null;
  const report=step(intents,dt);if(observe)world={before,applied,after:sim.agents.map(body),contacts:copy(report.contacts),
   strikes:copy(report.strikes),groundImpulse:copy(report.groundImpulse),armImpulse:copy(report.armImpulse),
   grasps:sim.world.joints.filter(j=>j.kind==='grasp').map(j=>{const {a,b,...data}=j;return {a:sim.world.indexOf(a),b:sim.world.indexOf(b),...copy(data)};})};return report;};
 const tick=sim.tick.bind(sim);sim.tick=()=>{const t=sim.t;raw=[];cues=[];world=null;stage='tick';tick();
  if(observe)rows.push({t,carrier:sim.carrier?.idx??null,ball:sim.ball.kind,throwAt:sim.throwAt,catchAt:sim.catchAt,raw,cues,world,
   recognition:sim.defense.map(a=>({idx:a.idx,read:a.recog.read,readAt:a.recog.readAt,pPass:a.recog.pPass(),evidence:Reflect.get(a.recog,'evidence')})),
   pairs:sim.carrier?sim.defense.map(d=>({idx:d.idx,...pair(sim.carrier,d)})):[]});};
 const start=performance.now(),result=sim.run(),elapsedSeconds=(performance.now()-start)/1000;
 return {id:f.id,inputSha256:hash(f.setup),signature:signature(sim,result),elapsedSeconds,result:leanResult(result),
  players:sim.agents.map(a=>({idx:a.idx,id:a.player.id,slot:a.slot,team:a.team,profile:a.profile})),
  events:result.events,frames:observe?result.frames:undefined,telemetry:observe?result.telemetry:undefined,rows:observe?rows:undefined};}
const [mode,input,out,ids,model]=process.argv.slice(2);
if(mode==='prepare'){
 assert.ok(input&&!existsSync(input),'Do not overwrite frozen inputs');
 const extractionArm=sourceVersion()==='e5c318a1082c3738b9782107fa9faec67ada38b02245d1a529af4adaf6825c54'?'accepted':'experimental';
 assert.equal(sourceVersion(),extractionArm==='accepted'?'e5c318a1082c3738b9782107fa9faec67ada38b02245d1a529af4adaf6825c54':'dd173a3ef44f22b5ee74f3cc17ef15b2137203cea58dd2fa12fbaad12c4784ba');
 const fixtureId=out??'power-zone';assert.ok(['power-zone','spread-air'].includes(fixtureId));
 const manifestPath='data/reviews/current/experimental-game-inputs.json',manifest=read(manifestPath),fixture=manifest.fixtures.find(f=>f.id===fixtureId);
 const packetPath=`data/reviews/current/experimental-game-checkpoint/${extractionArm}/${fixtureId}/game.json.gz`,packet=read(packetPath);
 const selected=new Set(ids?ids.split(',').map(p=>Number(p)-1):fixtureId==='power-zone'?[35,40,71,88]:[73]),lastIndex=Math.max(...selected),clips=[];let game,offCall,defCall,prefs;
 assert.ok([...selected].every(p=>Number.isInteger(p)&&p>=0&&p<=180),'Use positive film play numbers');
 game=new Game(...['home','away'].map(s=>copy(fixture.teams[s])),{seed:fixture.seed,record:true,recordLevel:'standard',hooks:{playResult(sim,kind){
  const index=Reflect.get(game,'playIndex');if(kind!=='scrimmage'||!selected.has(index))return undefined;
  const off=sim.qb.player.id.startsWith(fixture.teams.home.abbr)?'home':'away',def=off==='home'?'away':'home';
  const scouting=Reflect.get(game,'scouting')[def],coverageScouting=Reflect.get(game,'coverageScouting')[off];
  const setup=copy({offense:Object.fromEntries(sim.offense.map(a=>[a.slot,a.player])),defense:Object.fromEntries(sim.defense.map(a=>[a.slot,a.player])),
   offCall,defCall,manPrefs:prefs,los:sim.los,ballY:sim.ballY,firstDownX:sim.firstDownX,seed:sim.rng.key,
   energy:[...Reflect.get(game,'energy')],hurry:sim.hurry,down:sim.snapContext.down,audibles:true,
   scouting:{strength:Reflect.get(scouting,'strength'),cells:[...Reflect.get(scouting,'cells')]},coverageScouting:{...coverageScouting}});
  const result=sim.run(),cached=packet.log.find(p=>p.index===index);
  assert.ok(cached&&cached.replay,'Missing cached film');assert.equal(hash(result.stats),hash(cached.stats));
  assert.equal(result.outcome,cached.outcome);assert.equal(hash(result.frames),hash(cached.replay.frames),'Native cached film differs');
  const id=`${fixtureId}/P${index+1}`,clip={id,setup,signature:signature(sim,result),result:leanResult(result),cachedFilmSha256:hash(cached.replay.frames)};
  clips.push(clip);console.log(JSON.stringify({reconstructed:id,yac:result.stats.yac,outcome:result.outcome}));return result;
 }}});
 for(const oc of Object.values(Reflect.get(game,'oc'))){const call=oc.call.bind(oc);oc.call=(...a)=>{offCall=call(...a);return offCall;};}
 for(const dc of Object.values(Reflect.get(game,'dc'))){const call=dc.call.bind(dc);dc.call=(...a)=>{const c=call(...a);defCall=c.call;prefs=c.prefs;return c;};}
 const start=performance.now();game.kickoffToStart();let steps=0;
 while(!game.state.over&&Reflect.get(game,'playIndex')<=lastIndex){assert.ok(performance.now()-start<90000,'Prefix budget 90s');assert.ok(steps++<180);game.step();}
 assert.equal(clips.length,selected.size);for(const c of clips){const replay=trace(c,false);assert.equal(replay.signature,c.signature,`${c.id}: single-play restoration differs`);}
 save(input,{schema:'yac-containment-native-inputs-v1',provenance,fixtureId:fixture.id,manifestSha256:fh(manifestPath),packetSha256:fh(packetPath),
  selection:`Exact native prefix through P${lastIndex+1}; power-zone explosives/ordinary controls or independent spread explosive. No new full game.`,
  prefixSteps:steps,elapsedSeconds:(performance.now()-start)/1000,clips});
 console.log(JSON.stringify({saved:input,clips:clips.length,elapsedSeconds:(performance.now()-start)/1000}));
}else if(mode==='fresh-shaped'){
 assert.ok(input&&!existsSync(input),'Do not overwrite transfer inputs');
 const original=read('out/yac-containment/native-inputs.json').clips.find(c=>c.id==='power-zone/P36').setup,clips=[];
 for(const roster of [65101,66101]){
  const offense=generateTeam(new Rng(roster),'Fresh pistol offense',`O${roster}`,{strength:.55}),
   defense=generateTeam(new Rng(roster+1),'Fresh pistol defense',`D${roster+1}`,{strength:.55});
  for(const [i,concept] of ['hitches','pa_post_dig'].entries()){
   const id=`fresh-shaped-${roster}/${concept}`;
   clips.push({id,setup:{offense:pickOffense(offense,original.offCall.formation.personnel),
    defense:pickDefense(defense,original.defCall.personnel),
    offCall:{...copy(original.offCall),pass:PASS_BY_ID[concept],label:id},defCall:copy(original.defCall),
    los:40,ballY:original.ballY,firstDownX:50,seed:95100+i+roster,down:1,audibles:false}});
  }
 }
 save(input,{schema:'yac-containment-transfer-inputs-v1',provenance,selection:'Fresh two roster pairs, native P36 installed pistol/12/Cover2 shape with all-hitch and deceptive PA. Tests transfer where the run-leaning slow-release conflict exists; no copied fatigue/scouting or inspected outcomes.',clips});
 console.log(JSON.stringify({saved:input,clips:clips.length,simulations:0}));
}else if(mode==='fresh'){
 assert.ok(input&&!existsSync(input),'Do not overwrite transfer inputs');
 const declarations=[['hitches','cover2'],['comebacks','cover3_seam'],['four_verts','cover4_meg'],
  ['pa_post_dig','cover3_match'],['oz_strong','cover3'],['mesh','cover1']];
 const clips=[];
 for(const roster of [63101,64101]){
  const offense=generateTeam(new Rng(roster),'Fresh offense',`O${roster}`,{strength:.55}),
   defense=generateTeam(new Rng(roster+1),'Fresh defense',`D${roster+1}`,{strength:.55});
  for(const [i,[concept,coverage]] of declarations.entries()){
   const run=!!RUN_BY_ID[concept],formation=FORMATION_BY_ID[run?'ace_11':'gun_doubles_11'],id=`fresh-${roster}/${concept}`;
   assert.ok(COVERAGE_BY_ID[coverage]&&(RUN_BY_ID[concept]||PASS_BY_ID[concept]));
   clips.push({id,setup:{offense:pickOffense(offense,formation.personnel),defense:pickDefense(defense,'nickel'),
    offCall:{formation,flip:roster===64101,kind:run?'run':'pass',...(run?{run:RUN_BY_ID[concept]}:{pass:PASS_BY_ID[concept]}),label:id},
    defCall:{personnel:'nickel',front:FRONT_BY_ID.over,coverage:COVERAGE_BY_ID[coverage],pressure:null,zoneStyle:'match',label:id},
    los:40,ballY:roster===64101?30:23,firstDownX:50,seed:83100+i+roster,down:1,audibles:false}});
  }
 }
 save(input,{schema:'yac-containment-transfer-inputs-v1',provenance,selection:'Predeclared two fresh roster pairs, slow-release/stop routes, vertical win, play action, actual run blocks, man crossing. No outcomes inspected at preparation.',clips});
 console.log(JSON.stringify({saved:input,clips:clips.length,simulations:0}));
}else if(mode==='trace'||mode==='compare'){
 const frozen=read(input),chosen=ids?new Set(ids.split(',')):null,clips=frozen.clips.filter(c=>!chosen||chosen.has(c.id));
 assert.ok(out&&!existsSync(out)&&clips.length,'Output exists or no selected clips');const start=performance.now(),results=[];
 assert.ok(!model||(mode==='trace'&&['control','cap'].includes(model)),'Models require actual consumed trace pictures');
 for(const c of clips){assert.ok(performance.now()-start<30000,'Batch budget 30s');const r=trace(c,mode==='trace',model??null);
  if(c.signature&&!model&&provenance.sourceSha256===frozen.provenance.sourceSha256)assert.equal(r.signature,c.signature,`Observer/context mismatch: ${c.id}`);
  results.push(r);console.log(JSON.stringify({id:r.id,yac:r.result.stats.yac,outcome:r.result.outcome,seconds:r.elapsedSeconds,same:r.signature===c.signature}));}
 assert.equal(sourceVersion(),provenance.sourceSha256);save(out,{schema:'yac-containment-native-evidence-v1',provenance,inputSha256:fh(input),
  inputSource:frozen.provenance.sourceSha256,model:model??null,modelSha256:model?fh(model==='cap'?'scripts/diag/yac-cap-model.ts':'scripts/diag/yac-controlled-approach.ts'):null,elapsedSeconds:(performance.now()-start)/1000,clips:results});
}else throw Error('prepare OUT | trace/compare INPUT OUT [ID,...]');
