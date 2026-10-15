/** Exact method-source instrumentation; shared blocking.ts stays untouched.
 * Captures internal steering targets without extra controller/sensing/RNG calls. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
import ts from 'typescript';
import {clamp,norm,sub} from '../../src/core/vec.ts';
import {PassProtector,isOL} from '../../src/sim/behaviors/blocking.ts';
import {traits,passSetDepth} from '../../src/sim/engagement.ts';
import {goTo,stand,track} from '../../src/sim/behaviors/common.ts';
import {timeToReach} from '../../src/physics/reach.ts';
import {previewFreeMovement} from '../../src/physics/movement-preview.ts';
import {savedNativePlay} from './saved-native-play.mjs';
import {sourceVersion} from '../source-version.ts';

const [out,arm='baseline',indices='39']=process.argv.slice(2);assert(out);
assert(['baseline','accelerating-reach','accelerating-lt','contact-reach','stationary-fallback','installed-set','downfield-seed','measured-speed','measured-seed'].includes(arm));
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
for(const index of indices.split(',').map(Number)){
 const {sim,play,observation,initialization}=savedNativePlay('spread-air',index);
 assert.equal(sim.isPass,true);
 const decisions=[],frames=[],contacts=[];
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
 const start=performance.now(),until=index===39?2:3;
 while(sim.phase==='live'&&sim.t<until){assert(performance.now()-start<30000);sim.tick();}
 PassProtector.prototype.update=prototypeUpdate;
 const actual=sim.frames.filter(f=>f.t>=0),original=play.replay.frames.filter(f=>f.t>=0&&f.t<=actual.at(-1).t);
 const firstFrameDifference=original.find((f,i)=>hash(f)!==hash(actual[i]));
 const events=play.replay.events.filter(e=>e.t<sim.t);
 const summary={play:index+1,index,arm,endTime:sim.t,censoring:'Opening only; no ending inferred',
  nativeFilmParity:!firstFrameDifference,nativeEventParity:hash(sim.events.filter(e=>e.t<sim.t))===hash(events),
  firstFrameDifference:firstFrameDifference?.t??null,observedEvents:sim.events,
  teammateImpacts:contacts.filter(c=>(c.i<11)===(c.j<11)),elapsedSeconds:(performance.now()-start)/1000};
 rows.push({...summary,initialization,decisions,frames});
 console.log(JSON.stringify({...summary,observedEvents:undefined,teammateImpacts:summary.teammateImpacts.length}));
}
const baseline=JSON.parse(readFileSync('config/baseline.json'));
const receipt={schema:'native-pass-set-opening-v1',commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),
 sourceSha256:sourceVersion(),node:process.version,arm,indices:indices.split(',').map(Number),
 flags:Object.fromEntries(Object.keys(baseline.flags).map(k=>[k,process.env[k]??null])),worldDefaults:baseline.worldDefaults,
 blockingSourceSha256:hash(source),instrumentedMethodSha256:hash(instrumentedMethod),cutoffSourceSha256:hash(cutoffText),
 manifestSha256:hash(readFileSync('data/reviews/current/experimental-game-inputs.json').toString()),
 nativeGameSha256:createHash('sha256').update(readFileSync('data/reviews/current/experimental-game-checkpoint/experimental/spread-air/game.json.gz')).digest('hex'),
 fullGames:0,nativeSnaps:rows.length,elapsedSeconds:(performance.now()-started)/1000};
mkdirSync(out,{recursive:true});writeFileSync(out+'/trace.json.gz',gzipSync(JSON.stringify({receipt,rows})));
writeFileSync(out+'/receipt.json',JSON.stringify(receipt,null,2)+'\n');
if(arm==='baseline')for(const row of rows){
 assert(row.nativeFilmParity,`Native film mismatch P${row.play} at ${row.firstFrameDifference}`);
 assert(row.nativeEventParity,`Native event mismatch P${row.play}`);
}
