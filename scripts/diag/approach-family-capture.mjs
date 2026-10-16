/** Passive current-source openings from the existing audit inputs.
 * INPUT.json OUTPUT.json.gz ACTOR START STOP. Each runs observed/plain once.
 * No restored mid-play state, new observations, RNG draws or intervention.
 */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync,mkdirSync} from 'node:fs';
import {dirname} from 'node:path';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {Agent} from '../../src/sim/agent.ts';
import {PlaySim} from '../../src/sim/playsim.ts';
import {movementObjective} from '../../src/sim/movement-objective.js';
import {sourceVersion} from '../source-version.ts';

const [inputPath,out,actorText,startText,stopText]=process.argv.slice(2),
 actor=Number(actorText),start=Number(startText),stop=Number(stopText),
 raw=JSON.parse(readFileSync(inputPath)),began=performance.now(),source=sourceVersion(),
 hash=v=>createHash('sha256').update(v).digest('hex'),
 snap=v=>JSON.parse(JSON.stringify(v,(_k,x)=>x instanceof Agent?{agent:x.idx}:x instanceof PlaySim?{sim:true}
  :x instanceof Map?[...x]:x instanceof Set?[...x]:x)),
 profile=JSON.parse(readFileSync('config/baseline.json')),
 target=raw.actors.find(a=>a.id===(raw.result.stats.receiver??raw.result.stats.rusher)).idx;
assert.ok(!existsSync(out)&&actor>=11&&actor<22&&start>=0&&stop>start&&stop<=6);
assert.deepEqual(Object.fromEntries(Object.keys(profile.flags).map(k=>[k,process.env[k]??null])),profile.flags);
function run(observe){
 const sim=new PlaySim(structuredClone(raw.setup));
 assert.deepEqual(snap(sim.agents.map(a=>({idx:a.idx,id:a.player.id,body:a.body}))),raw.initialBodies);
 const d=sim.agents[actor],rows=[];let active=false,cues=[],pending=null,seeCalls=0;
 const see=sim.see.bind(sim);
 sim.see=(a,b,...rest)=>{seeCalls++;const picture=see(a,b,...rest);
  if(observe&&(active||pending)&&a===d&&(b.idx===target||b.team===d.team))cues.push({observedTarget:b.idx,
   phase:active?'behavior':'modifier',scale:rest[0]??1,
   caller:new Error().stack.split('\n')[2].trim(),picture:snap(picture)});
  return picture;};
 if(observe){
  const wrapped=new WeakSet(),wrap=b=>{if(wrapped.has(b))return b;wrapped.add(b);const update=b.update.bind(b);
   b.update=(a,s)=>{if(sim.t<start||sim.t>=stop)return update(a,s);
    const body=snap(a.body);cues=[];active=true;let command;
    try{command=update(a,s);}finally{active=false;}
    pending={t:sim.t,body,ratings:{tackling:a.r('tackling'),awareness:a.r('awareness'),pursuit:a.r('pursuit'),anticipation:a.r('anticipation')},
     speedScale:a.speedScale,runFit:snap(a.runFit??null),down:a.isDown(sim.t),engaged:!!a.engagement,
     bonded:!!sim.bond?.tacklers.includes(a),hasJoint:sim.world.joints.some(j=>j.a===a.body||j.b===a.body),
     job:a.behavior.job??a.behavior.kind,target:a.behavior.target?.idx??null,cues,command:snap(command),
     objective:snap(movementObjective(command)??null)};
    return command;};return b;};
  let behavior=wrap(d.behavior);Object.defineProperty(d,'behavior',{get:()=>behavior,set:b=>{behavior=wrap(b);}});
  const step=sim.world.step.bind(sim.world);
  sim.world.step=(intents,dt)=>{const before=snap(d.body),result=step(intents,dt);
   if(pending){rows.push({...pending,worldBefore:before,applied:snap(intents[actor]),
    appliedObjective:snap(movementObjective(intents[actor])??null),worldAfter:snap(d.body),
    contacts:snap(result.contacts.filter(c=>c.i===actor||c.j===actor))});pending=null;}
   return result;};
 }
 sim.event('snap',sim.slot('C')??sim.qb);
 while(sim.phase==='live'&&sim.t<stop-1e-9){assert.ok(performance.now()-began<20000,'20s total budget');sim.tick();}
 const result=sim.buildResult(),signature=hash(JSON.stringify(snap({bodies:sim.agents.map(a=>a.body),
  behaviors:sim.agents.map(a=>a.behavior),minds:sim.agents.map(a=>a.mind),perception:sim.perception,
  recognition:sim.defense.map(a=>a.recog),ball:sim.ball,intents:sim.intents,rng:sim.rng,result})));
 const oldFrames=raw.result.frames.filter(f=>f.t<stop),oldStates=raw.result.telemetry.frames.filter(f=>f.t<stop),
  firstSavedDifference=result.telemetry.frames.find((s,i)=>JSON.stringify(s.agents)!==JSON.stringify(oldStates[i]?.agents)
   ||JSON.stringify(result.frames[i]?.agents)!==JSON.stringify(oldFrames[i]?.agents))?.t??null;
 return{rows,signature,seeCalls,end:sim.t,censored:sim.phase==='live',events:snap(sim.events),
  native:{frames:snap(result.frames),states:result.telemetry.frames.map(s=>({t:s.t,agents:snap(s.agents)})),
   decisions:snap(result.telemetry.decisions)},
  firstSavedDifference,frameCount:result.frames.length,stats:sim.stats};
}
const observed=run(true),plain=run(false);
assert.equal(observed.signature,plain.signature,'Observer altered native behavior');
assert.equal(observed.seeCalls,plain.seeCalls,'Observer added queries');
assert.equal(sourceVersion(),source);
const result={schema:'approach-family-capture-v1',sourceSha256:source,
 checkout:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),
 operatorSha256:hash(readFileSync(import.meta.filename)),inputNativeSha256:hash(readFileSync(inputPath)),
 inputSha256:raw.inputSha256,actors:raw.actors,actor,target,start,stop,node:process.version,
 lockSha256:hash(readFileSync('package-lock.json')),flags:profile.flags,worldDefaults:profile.worldDefaults,
 observerNeutral:true,nativeExecutions:2,seconds:(performance.now()-began)/1000,...observed};
mkdirSync(dirname(out),{recursive:true});writeFileSync(out,gzipSync(JSON.stringify(result)));
console.log(JSON.stringify({out,source,rows:result.rows.length,end:result.end,censored:result.censored,
 firstSavedDifference:result.firstSavedDifference,seconds:result.seconds,observerNeutral:true}));
