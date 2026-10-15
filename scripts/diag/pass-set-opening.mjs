/** Exact method-source instrumentation; shared blocking.ts stays untouched.
 * Captures internal steering targets without extra controller/sensing/RNG calls. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import ts from 'typescript';
import {Rng} from '../../src/core/rng.ts';
import {clamp,norm,sub} from '../../src/core/vec.ts';
import {PassProtector,isOL} from '../../src/sim/behaviors/blocking.ts';
import {traits,passSetDepth} from '../../src/sim/engagement.ts';
import {goTo,stand,track} from '../../src/sim/behaviors/common.ts';
import {timeToReach} from '../../src/physics/reach.ts';
import {previewFreeMovement} from '../../src/physics/movement-preview.ts';
import {savedNativePlay} from './saved-native-play.mjs';
import {sourceVersion} from '../source-version.ts';

const [out,arm='baseline',indices='39',untilText,retainedReference]=process.argv.slice(2);assert(out);
assert(['baseline','production','accelerating-reach','accelerating-lt','contact-reach','stationary-fallback','installed-set','downfield-seed','measured-speed','measured-seed','cutoff-through'].includes(arm));
const source=readFileSync('src/sim/behaviors/blocking.ts','utf8');
const ast=ts.createSourceFile('blocking.ts',source,ts.ScriptTarget.Latest,true);
const cls=ast.statements.find(n=>ts.isClassDeclaration(n)&&n.name.text==='PassProtector');
const method=cls.members.find(n=>n.name?.getText(ast)==='update').getText(ast);
const fn=name=>ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name.text===name).getText(ast);
let active=null;
const capture=data=>{if(active)active.cutoff=data;};
let cutoffText=fn('cutOffPoint').replace('if (tReach <= tau) return inside;',
 'if (tReach <= tau) { capture({tau,tReach,inside,rusherPoint:p,contact}); return inside; }');
assert(cutoffText.includes('capture({'));
const originalCutoffText=cutoffText;
if(arm==='accelerating-reach'||arm==='accelerating-lt'||arm==='contact-reach'){
 const expression='d / Math.max(0.5, Math.min(vmax, speed + (vmax - speed) * 0.5)) + 0.05';
 assert(cutoffText.includes(expression),'Expected cutoff reach expression changed');
 cutoffText=cutoffText.replace(expression,
  'timeToReach({pos:b.pos,vel:b.vel,profile:b.profile,speedScale:.75},inside,.2)');
}
if(arm==='contact-reach')cutoffText=cutoffText.replace('speedScale:.75},inside,.2)',
 'speedScale:.75},inside,contact*.4+.15)');
if(arm==='downfield-seed'){
 cutoffText=cutoffText.replace(': Math.atan2(qb.y - r.pos.y, qb.x - r.pos.x)',': Math.PI');
 assert.notEqual(cutoffText,originalCutoffText);
}
if(arm==='measured-speed'){
 cutoffText=cutoffText.replace('Math.max(2, Math.hypot(r.vel.x, r.vel.y))','Math.hypot(r.vel.x, r.vel.y)');
 assert.notEqual(cutoffText,originalCutoffText);
}
if(arm==='measured-seed'){
 cutoffText=cutoffText.replace('Math.max(2, Math.hypot(r.vel.x, r.vel.y))',
  '(Math.hypot(r.vel.x,r.vel.y)>.5 ? Math.max(2,Math.hypot(r.vel.x,r.vel.y)) : Math.hypot(r.vel.x,r.vel.y))');
 assert.notEqual(cutoffText,originalCutoffText);
}
const compile=(code,bindings)=>new Function(...Object.keys(bindings),
 ts.transpile(code,{target:ts.ScriptTarget.ES2022})+`\nreturn ${code.match(/function\s+(\w+)/)[1]};`)(...Object.values(bindings));
if(arm==='stationary-fallback')cutoffText=cutoffText.replace('const vmax = b.profile.vmax * 0.75;',
 'if (Math.hypot(r.vel.x,r.vel.y)<=.5) return null;\n const vmax = b.profile.vmax * 0.75;');
const changedCutoff=compile(cutoffText,{clamp,norm,sub,capture,timeToReach});
const originalCutoff=compile(originalCutoffText,{clamp,norm,sub,capture,timeToReach});
const cutOffPoint=arm==='accelerating-lt'?((b,...rest)=>(b.slot==='LT'?changedCutoff:originalCutoff)(b,...rest)):changedCutoff;
const runLook=compile(fn('runLook'),{});
const captureSteer=(kind,original)=>(a,target,...rest)=>{
 const command=original(a,target,...rest);
 if(active)active.steering={kind,target:{...target},arguments:structuredClone(rest),command:structuredClone(command)};
 return command;
};
let instrumentedMethod=method;
if(arm==='cutoff-through'){
 instrumentedMethod=instrumentedMethod.replace('let ride = false;', 'let ride = false; let cuttingOff = false;');
 instrumentedMethod=instrumentedMethod.replace('if (meet) set = { x: meet.x, y: meet.y + out * overset };',
  'if (meet) { set = { x: meet.x, y: meet.y + out * overset }; cuttingOff = true; }');
 instrumentedMethod=instrumentedMethod.replace('if (ride) return track(a, set, r.vel, { cutSkill: quick, gain: 3 });',
  'if (ride) return track(a, set, r.vel, { cutSkill: quick, gain: 3 });\n if (cuttingOff) return goTo(a,set,{speed:.75,through:a.profile.vmax*.75,facing,cutSkill:quick});');
 assert(instrumentedMethod.includes('if (cuttingOff) return goTo'));
}
if(arm==='installed-set')instrumentedMethod=instrumentedMethod.replace(
 'if (runLook(a, sim)) set = { x: Math.max(set.x, sim.los - 0.3), y: set.y };',
 'if (edgeRusher && isOL(a) && r.speed <= .5) { set = {x:sim.los-.6-setDepth,y:a.passSet.laneY}; ride=false; }\n if (runLook(a, sim)) set = { x: Math.max(set.x, sim.los - 0.3), y: set.y };');
const update=compile('function '+instrumentedMethod,{isOL,passSetDepth,stand,
 goTo:captureSteer('goTo',goTo),track:captureSteer('track',track),runLook,norm,sub,traits,clamp,
 cutOffPoint});
const prototypeUpdate=PassProtector.prototype.update;
const snapBody=a=>({pos:{...a.pos},vel:{...a.vel},facing:a.facing,support:structuredClone(a.body.support)});
const hash=x=>createHash('sha256').update(typeof x==='string'?x:JSON.stringify(x)).digest('hex');
const started=performance.now(),rows=[];
const punchReference=retainedReference?JSON.parse(gunzipSync(readFileSync(retainedReference))):null;
function initialTape(entry){
 const r=new Rng(0);Object.assign(r,entry.rngBefore);
 const tape={rangeU:r.next(),normalZ:[r.gaussian(),r.gaussian()],planU:r.next()};
 tape.normalZ.push(r.gaussian());
 assert.deepEqual({...r},entry.rngAfter,'Decoded initial-contact tape must exactly consume recorded state');
 return tape;
}
for(const index of indices.split(',').map(Number)){
 const {sim,play,observation,initialization}=savedNativePlay('spread-air',index);
 assert.equal(sim.isPass,true);
 const decisions=[],frames=[],contacts=[],engagementStarts=[],retainedPunches=[];
 const retainedPair=index===39?'2:12':index===18?'5:13':null;
 const referenceStart=punchReference?.rows.find(r=>r.index===index)?.engagementStarts.find(e=>`${e.b}:${e.d}`===retainedPair);
 if(punchReference)assert(referenceStart);
 let retained=false;
 const nativeEngage=sim.engage.bind(sim);
 sim.engage=(b,d,...rest)=>{
  const had=b.engagement;
  const rngBefore={...sim.rng};
  let e;
  if(referenceStart&&!retained&&!had&&`${b.idx}:${d.idx}`===retainedPair){
   const tape=initialTape(referenceStart),rng=sim.rng,descriptors={};
   const native=Object.fromEntries(['normal','range','weighted'].map(k=>[k,rng[k].bind(rng)]));
   for(const k of Object.keys(native))descriptors[k]=Object.getOwnPropertyDescriptor(rng,k);
   const calls=[];let normals=0,ranges=0,plans=0;
   rng.normal=(mean,sd)=>{
    const actual=native.normal(mean,sd);assert(normals<3);
    const delivered=mean+sd*tape.normalZ[normals++];calls.push({kind:'normal',mean,sd,actual,delivered});return delivered;
   };
   rng.range=(min,max)=>{
    const actual=native.range(min,max);assert.equal(ranges++,0);
    const delivered=min+(max-min)*tape.rangeU;calls.push({kind:'range',min,max,actual,delivered});return delivered;
   };
   rng.weighted=(items,weights)=>{
    const actual=native.weighted(items,weights);assert.equal(plans++,0);
    const total=weights.reduce((s,w)=>s+Math.max(0,w),0);assert(total>0);
    let u=tape.planU*total,delivered=items.at(-1);
    for(let i=0;i<items.length;i++){u-=Math.max(0,weights[i]);if(u<=0){delivered=items[i];break;}}
    calls.push({kind:'weighted',items,weights,actual,delivered});return delivered;
   };
   try{e=nativeEngage(b,d,...rest);}finally{
    for(const k of Object.keys(native))if(descriptors[k])Object.defineProperty(rng,k,descriptors[k]);else delete rng[k];
   }
   if(e){
    assert.equal(normals,3);assert.equal(ranges,1);assert.equal(plans,1);retained=true;
    retainedPunches.push({t:sim.t,b:b.idx,d:d.idx,referenceTime:referenceStart.t,tape,calls,
     qualification:'Initial-contact variates only; native draws still consumed. Later execution remains coupled and is not a retained full-play randomness comparison.'});
   }else assert.equal(calls.length,0);
  }else e=nativeEngage(b,d,...rest);
  if(e&&!had)engagementStarts.push({t:sim.t,b:b.idx,d:d.idx,rngBefore,rngAfter:{...sim.rng},
   initial:{phi:e.phi,control:e.control,move:e.move,moveOk:e.moveOk,moveUntil:e.moveUntil,
    nextMoveAt:e.nextMoveAt,side:e.side,repEdge:e.repEdge},bPos:{...b.pos},dPos:{...d.pos}});
  return e;
 };
 PassProtector.prototype.update=function(a,s){
  const entry={t:s.t,a:a.idx,slot:a.slot,before:snapBody(a),profile:a.profile};
  active=entry;const command=update.call(this,a,s);active=null;
  entry.raw=structuredClone(command);entry.target=this.recordedTarget(a);
  if(entry.target!==null){const r=s.agents[entry.target];entry.rusher=snapBody(r);entry.rusherPlan=r.behavior.plan;}
  if(entry.cutoff&&a.slot==='LT'&&s.t<=.3){
   const steps=Math.round(entry.cutoff.tau/.05);
   const path=previewFreeMovement(a.body,command,s.t,steps,s.world.handContact);
   entry.probe={qualification:'Own unloaded body, held current request; future resampling/contact unknown',
    sprintReach:timeToReach({pos:a.pos,vel:a.vel,profile:a.profile,speedScale:.75},entry.cutoff.inside,.2),
    path,distanceAtDeadline:Math.hypot(path.at(-1).pos.x-entry.cutoff.inside.x,path.at(-1).pos.y-entry.cutoff.inside.y)};
  }
  decisions.push(entry);return command;
 };
 const step=sim.world.step.bind(sim.world);
 sim.world.step=(intents,dt)=>{
  const before=sim.agents.map(snapBody),raw=structuredClone(sim.cmds),final=structuredClone(intents);
  const report=step(intents,dt);
  frames.push({t:sim.t,before,raw,final,after:sim.agents.map(snapBody),report});
  for(const c of report.contacts)if(c.impulse>1e-8)contacts.push({t:sim.t+dt,...c});return report;
 };
 sim.event('snap',sim.slot('C')??sim.qb);
 const start=performance.now(),until=untilText?Number(untilText):index===39?2:3;
 assert(until>0&&until<=6);
 while(sim.phase==='live'&&sim.t<until){assert(performance.now()-start<30000);sim.tick();}
 PassProtector.prototype.update=prototypeUpdate;
 const actual=sim.frames.filter(f=>f.t>=0),original=play.replay.frames.filter(f=>f.t>=0&&f.t<=actual.at(-1).t);
 const firstFrameDifference=original.find((f,i)=>hash(f)!==hash(actual[i]));
 const events=play.replay.events.filter(e=>e.t<sim.t);
 const summary={play:index+1,index,arm,endTime:sim.t,phase:sim.phase,
  censoring:sim.phase==='live'?`Live at ${sim.t}; no later ending inferred`:'Native dead-ball ending',
  nativeFilmParity:!firstFrameDifference,nativeEventParity:hash(sim.events.filter(e=>e.t<sim.t))===hash(events),
  firstFrameDifference:firstFrameDifference?.t??null,observedEvents:sim.events,
  teammateImpacts:contacts.filter(c=>(c.i<11)===(c.j<11)),elapsedSeconds:(performance.now()-start)/1000};
 rows.push({...summary,initialization,decisions,frames,engagementStarts,retainedPunches,telemetry:sim.buildResult().telemetry});
 console.log(JSON.stringify({...summary,observedEvents:undefined,teammateImpacts:summary.teammateImpacts.length}));
}
const baseline=JSON.parse(readFileSync('config/baseline.json'));
const receipt={schema:'native-pass-set-opening-v1',commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),
 sourceSha256:sourceVersion(),node:process.version,arm,indices:indices.split(',').map(Number),
 flags:Object.fromEntries(Object.keys(baseline.flags).map(k=>[k,process.env[k]??null])),worldDefaults:baseline.worldDefaults,
 blockingSourceSha256:hash(source),instrumentedMethodSha256:hash(instrumentedMethod),cutoffSourceSha256:hash(cutoffText),
 manifestSha256:hash(readFileSync('data/reviews/current/experimental-game-inputs.json').toString()),
 nativeGameSha256:createHash('sha256').update(readFileSync('data/reviews/current/experimental-game-checkpoint/experimental/spread-air/game.json.gz')).digest('hex'),
 retainedInitialPunchReferenceSha256:retainedReference?createHash('sha256').update(readFileSync(retainedReference)).digest('hex'):null,
 fullGames:0,nativeSnaps:rows.length,elapsedSeconds:(performance.now()-started)/1000};
mkdirSync(out,{recursive:true});writeFileSync(out+'/trace.json.gz',gzipSync(JSON.stringify({receipt,rows})));
writeFileSync(out+'/receipt.json',JSON.stringify(receipt,null,2)+'\n');
if(arm==='baseline')for(const row of rows){
 assert(row.nativeFilmParity,`Native film mismatch P${row.play} at ${row.firstFrameDifference}`);
 assert(row.nativeEventParity,`Native event mismatch P${row.play}`);
}
