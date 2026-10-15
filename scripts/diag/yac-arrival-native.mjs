/** Bounded exact native capture/inspection with explicit diagnostic request ablations.
 * No production controller, capacity or physics changes.
 * prepare CHECKPOINT_ROOT MANIFEST OUT.json ; inspect INPUT.json OUT.json.gz
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
import {sourceVersion} from '../source-version.ts';
import {previewFreeMovement} from '../../src/physics/movement-preview.ts';
import {interceptPoint} from '../../src/physics/reach.ts';
import {gatheringApproach,leverage} from '../../src/sim/behaviors/common.ts';
const copy=x=>structuredClone(x),hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex'),
 fileHash=p=>createHash('sha256').update(readFileSync(p)).digest('hex'),
 read=p=>JSON.parse(p.endsWith('.gz')?gunzipSync(readFileSync(p)):readFileSync(p,'utf8')),
 save=(p,x)=>{assert.ok(!existsSync(p),'Do not overwrite evidence');mkdirSync(dirname(p),{recursive:true});writeFileSync(p,p.endsWith('.gz')?gzipSync(JSON.stringify(x)):JSON.stringify(x,null,2)+'\n');};
const profile=read('config/baseline.json'),provenance={sourceSha256:sourceVersion(),
 commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),collectorSha256:fileHash(import.meta.filename),
 flags:Object.fromEntries(Object.keys(profile.flags).map(k=>[k,process.env[k]??null])),worldDefaults:profile.worldDefaults,
 node:process.version,lockSha256:fileHash('package-lock.json')};
assert.deepEqual(provenance.flags,profile.flags);assert.equal(process.version,'v22.23.3');
function restore(s,record){s=copy(s);const scouting=new ScoutingReport(s.scouting.strength);Reflect.set(scouting,'cells',new Map(s.scouting.cells));
 return new PlaySim({...s,energy:new Map(s.energy),scouting,coverageScouting:Object.assign(new CoverageScouting(),s.coverageScouting),
 record,recordLevel:'full',recordEvery:1});}
const lean=r=>({...r,frames:undefined,telemetry:undefined});
function signature(sim,r){return hash({result:lean(r),bodies:sim.agents.map(a=>a.body),intents:sim.intents,
 minds:sim.agents.map(a=>a.mind),rng:sim.rng,perception:sim.perception});}
function inspect(c,record,model=null){const sim=restore(c.setup,record),rows=[],wrapped=new WeakSet();let cues=[],raw=[],world=null;
 const see=sim.see.bind(sim);sim.see=(a,b,...rest)=>{const seen=see(a,b,...rest);if((record||model)&&a.team==='D')cues.push({actor:a.idx,target:b.idx,args:rest,picture:copy(seen)});return seen;};
 function wrap(b){if(wrapped.has(b))return b;wrapped.add(b);const update=b.update.bind(b);
  b.update=(a,s)=>{const start=cues.length,original=update(a,s);let request=original;
   if(['near-intercept','both','gather-intercept'].includes(model)&&a.idx===20&&b.kind==='pursuit'&&s.catchAt>=0&&!a.engagement
    &&!s.bond?.tacklers.includes(a)&&a.body.support?.state==='up'){
    const target=s.carrier,seen=cues.slice(start).find(q=>q.target===target?.idx)?.picture;
    if(seen){const radius=a.profile.radius+target.profile.radius+a.profile.reach*.65,
     distance=Math.hypot(a.pos.x-seen.pos.x,a.pos.y-seen.pos.y),
     force=a.runFit?.kind==='force'||(a.runFit?.kind==='edge'&&a.runFit.edge==='box'),
     offset=(force?Math.abs(leverage(a,seen.pos.y))*a.runFit.side:leverage(a,seen.pos.y))*Math.max(0,Math.min(1,(distance-radius)/6)),
     scope=model!=='gather-intercept'||(gatheringApproach(a,seen,radius,offset).gather>=1&&distance>radius+.5
      &&Math.hypot(a.vel.x,a.vel.y)>=2&&Math.hypot(seen.vel.x,seen.vel.y)>=.5
      &&!a.body.support.foot&&!a.body.support.strike&&Math.hypot(a.body.support.load.x,a.body.support.load.y)<1e-9);
     const path=t=>({x:seen.pos.x+seen.vel.x*t,y:Math.max(.3,Math.min(53.033,seen.pos.y+(model==='gather-intercept'?offset:0)+seen.vel.y*t))});
     const ip=interceptPoint({pos:a.pos,vel:a.vel,profile:a.profile,speedScale:a.speedScale},path,{horizon:.6,step:.05,radius});
     const dx=ip.point.x-a.pos.x,dy=ip.point.y-a.pos.y,d=Math.hypot(dx,dy)||1,
      candidate={...original,vel:{x:dx/d*a.profile.vmax*a.speedScale,y:dy/d*a.profile.vmax*a.speedScale}};
     const score=cmd=>{let px=a.pos.x-seen.pos.x,py=a.pos.y-seen.pos.y,best=Math.hypot(px,py);
      for(const q of previewFreeMovement(a.body,cmd,s.t,12)){if(q.support!=='up')return Infinity;
       const p=path(q.t),rx=q.pos.x-p.x,ry=q.pos.y-p.y,ex=rx-px,ey=ry-py,
        t=Math.max(0,Math.min(1,-(px*ex+py*ey)/Math.max(1e-12,ex*ex+ey*ey)));
       best=Math.min(best,Math.hypot(px+ex*t,py+ey*t));px=rx;py=ry;}return best;};
     const before=score(original),after=score(candidate);
     if(scope&&before>radius&&after+.1<before)request=candidate;
    }
   }
   if((record||model)&&a.team==='D')raw.push({actor:a.idx,kind:b.kind,target:b.target?.idx??null,
    request:copy(request),original:model?copy(original):undefined,cueStart:start,cueEnd:cues.length});return request;};return b;}
 if(record||model)for(const a of sim.defense){let behavior=wrap(a.behavior);Object.defineProperty(a,'behavior',{get:()=>behavior,set:b=>{behavior=wrap(b);}});}
 const step=sim.world.step.bind(sim.world);sim.world.step=(intents,dt)=>{
  // Causal ablation only. It restores the controller's own already-requested
  // motion for this actual safety, not an information/physics improvement.
  const request=raw.find(r=>r.actor===20)?.request;
  if(['no-fs-stop','both'].includes(model)&&sim.catchAt>=0&&request&&Math.hypot(request.vel.x,request.vel.y)>1
   &&Math.hypot(intents[20].vel.x,intents[20].vel.y)<1e-9)intents[20]=copy(request);
  const before=record?sim.agents.map(a=>copy(a.body)):null,applied=record?copy(intents):null;
  const report=step(intents,dt);if(record)world={before,applied,after:sim.agents.map(a=>copy(a.body)),contacts:copy(report.contacts),
   groundImpulse:copy(report.groundImpulse),grasps:sim.world.joints.filter(j=>j.kind==='grasp').map(j=>{const {a,b,...rest}=j;return {a:sim.world.indexOf(a),b:sim.world.indexOf(b),...copy(rest)};})};return report;};
 const tick=sim.tick.bind(sim);sim.tick=()=>{const t=sim.t;raw=[];cues=[];world=null;tick();if(record)rows.push({t,
  carrier:sim.carrier?.idx??null,ball:sim.ball.kind,catchAt:sim.catchAt,raw,cues,world});};
 const began=performance.now(),result=sim.run();return {id:c.id,signature:signature(sim,result),result:lean(result),seconds:(performance.now()-began)/1000,
  players:sim.agents.map(a=>({idx:a.idx,id:a.player.id,slot:a.slot,profile:a.profile})),rows:record?rows:undefined,
  frames:record?result.frames:undefined,telemetry:record?result.telemetry:undefined};}
const [mode,arg1,arg2,arg3]=process.argv.slice(2),began=performance.now();
if(mode==='prepare'){
 assert.equal(sourceVersion(),'e5c318a1082c3738b9782107fa9faec67ada38b02245d1a529af4adaf6825c54');
 const manifest=read(arg2),f=manifest.fixtures.find(f=>f.id==='power-zone'),packetPath=`${arg1}/power-zone/game.json.gz`,packet=read(packetPath),
  selected=new Set([8,45]),clips=[];let game,offCall,defCall,manPrefs;
 game=new Game(copy(f.teams.home),copy(f.teams.away),{seed:f.seed,record:true,recordLevel:'standard',hooks:{playResult(sim,kind){
  const index=Reflect.get(game,'playIndex');if(kind!=='scrimmage'||!selected.has(index))return undefined;
  const off=sim.qb.player.id.startsWith(f.teams.home.abbr)?'home':'away',def=off==='home'?'away':'home',
   scouting=Reflect.get(game,'scouting')[def],coverageScouting=Reflect.get(game,'coverageScouting')[off],
   setup=copy({offense:Object.fromEntries(sim.offense.map(a=>[a.slot,a.player])),defense:Object.fromEntries(sim.defense.map(a=>[a.slot,a.player])),
    offCall,defCall,manPrefs,los:sim.los,ballY:sim.ballY,firstDownX:sim.firstDownX,seed:sim.rng.key,energy:[...Reflect.get(game,'energy')],
    hurry:sim.hurry,down:sim.snapContext.down,audibles:true,scouting:{strength:Reflect.get(scouting,'strength'),cells:[...Reflect.get(scouting,'cells')]},
    coverageScouting:{...coverageScouting}});
  const result=sim.run(),cached=packet.log.find(p=>p.index===index);
  assert.equal(hash(result.stats),hash(cached.stats));assert.equal(result.outcome,cached.outcome);assert.equal(hash(result.frames),hash(cached.replay.frames));
  clips.push({id:`power-zone/P${index+1}`,setup,result:lean(result),signature:signature(sim,result),filmSha256:hash(cached.replay.frames)});
  return result;
 }}});
 for(const oc of Object.values(Reflect.get(game,'oc'))){const fn=oc.call.bind(oc);oc.call=(...args)=>{offCall=fn(...args);return offCall;};}
 for(const dc of Object.values(Reflect.get(game,'dc'))){const fn=dc.call.bind(dc);dc.call=(...args)=>{const r=fn(...args);defCall=r.call;manPrefs=r.prefs;return r;};}
 game.kickoffToStart();let steps=0;while(Reflect.get(game,'playIndex')<=45){assert.ok(++steps<=46);assert.ok(performance.now()-began<30000);game.step();}
 assert.equal(clips.length,2);for(const c of clips)assert.equal(inspect(c,false).signature,c.signature,'Single play restored with drift');
 save(arg3,{schema:'yac-arrival-native-inputs-v1',provenance,manifestSha256:fileHash(arg2),packetSha256:fileHash(packetPath),
  selection:'Accepted actual P046 failed approach versus P009 successful side-tackle control (nearest defender trails at catch; actual first tackler arrives from the side). One necessary prefix captures full restartable initial inputs absent from light film; cached outcomes reused.',
  prefixSteps:steps,seconds:(performance.now()-began)/1000,clips});
 console.log(JSON.stringify({out:arg3,seconds:(performance.now()-began)/1000,clips:clips.map(c=>({id:c.id,yac:c.result.stats.yac}))}));
}else if(mode==='inspect'){
 const frozen=read(arg1),clips=[];
 assert.ok(!arg3||['no-fs-stop','near-intercept','both','gather-intercept'].includes(arg3),'Unknown diagnostic ablation');
 for(const c of frozen.clips){assert.ok(performance.now()-began<30000);const r=inspect(c,true,arg3),plain=inspect(c,false,arg3);
  assert.equal(r.signature,plain.signature,'Observer changed native execution');if(!arg3&&provenance.sourceSha256===frozen.provenance.sourceSha256)assert.equal(r.signature,c.signature);
  clips.push({...r,observerNeutral:true});console.log(JSON.stringify({id:r.id,yac:r.result.stats.yac,outcome:r.result.outcome,seconds:r.seconds}));}
 assert.equal(sourceVersion(),provenance.sourceSha256);save(arg2,{schema:'yac-arrival-native-inspection-v1',provenance,model:arg3??null,inputSha256:fileHash(arg1),seconds:(performance.now()-began)/1000,clips});
}else throw Error('prepare CHECKPOINT MANIFEST OUT | inspect INPUT OUT');
