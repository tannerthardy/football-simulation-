/** Three short saved-input, naturally reacting pairs; one mesh opposing pair.
 * No game prefix, frame injection or recorded future commands. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,readdirSync} from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
const start=performance.now(),sha=v=>createHash('sha256').update(typeof v==='string'||Buffer.isBuffer(v)?v:JSON.stringify(v)).digest('hex');
const fixture=readFileSync('test/fixtures/rb-local-traffic.json.gz'),saved=JSON.parse(gunzipSync(fixture)),rows=[];
function source(root){const files=p=>readdirSync(join(root,p),{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(join(p,e.name)):[join(p,e.name)]).sort();const h=createHash('sha256');for(const p of files('src'))h.update(p).update('\0').update(readFileSync(join(root,p))).update('\0');return h.digest('hex');}
for(const arm of ['accepted','candidate']){
 const root=resolve(arm==='accepted'?'out/rb-local-traffic/accepted-engine':'.');
 const load=p=>import(pathToFileURL(join(root,p)).href);
 const [{PlaySim},{Agent}]=await Promise.all([load('src/sim/playsim.ts'),load('src/sim/agent.ts')]);
 const snap=v=>JSON.parse(JSON.stringify(v,(_k,v)=>v instanceof Agent?{agent:v.idx}:v instanceof PlaySim?{sim:true}:v instanceof Map?[...v]:v instanceof Set?[...v]:v));
 const sourceSha256=source(root);
 for(const input of saved.inputs){
  const began=performance.now(),roster=team=>Object.fromEntries(input.input.agents.filter(a=>a.team===team).map(a=>[a.slot,a.player]));
  const sim=new PlaySim({offense:roster('O'),defense:roster('D'),offCall:structuredClone(input.input.call),defCall:structuredClone(input.input.defense),
   los:input.los,ballY:input.ballY,firstDownX:Math.min(110,input.los+input.state.distance),down:input.state.down,
   seed:input.input.seedState.key,energy:new Map(input.input.agents.map(a=>[a.player.id,a.initialBody.energy])),record:false});
  // Original witnesses contain post-constructor bodies/RNG. Restore once at
  // snap so a pre-snap stem is not charged twice. Recognition/scouting use the
  // current constructor in both arms; no claim of exact original game replay.
  for(const a of sim.agents)Object.assign(a.body,structuredClone(input.input.agents[a.idx].initialBody),{profile:a.profile});
  Object.assign(sim.rng,input.input.seedState);
  const initial={bodies:sim.agents.map(a=>snap(a.body)),rng:snap(sim.rng),minds:sim.agents.map(a=>snap(a.mind)),behaviors:sim.agents.map(a=>snap(a.behavior)),recog:sim.defense.map(a=>snap(a.recog))};
  const row={play:input.play,call:sim.offCall.label,arm,sourceSha256,initialSha256:sha(initial),los:input.los,frames:[],cues:[]};rows.push(row);
  const see=sim.see.bind(sim);sim.see=(a,b,scale)=>{const p=see(a,b,scale);if(a.idx===6)row.cues.push({t:sim.t,target:b.idx,scale:scale??1,picture:snap(p)});return p;};
  const step=sim.world.step.bind(sim.world);sim.world.step=(intents,dt)=>{
   const f={t:sim.t,carrier:sim.carrier?.idx??null,behavior:sim.agents[6].behavior.kind,before:sim.agents.map(a=>snap(a.body)),raw:snap(sim.cmds),final:snap(intents)};
   const report=step(intents,dt);f.after=sim.agents.map(a=>snap(a.body));f.report=snap(report);
   f.loads=sim.world.joints.filter(j=>j.kind==='hands').map(j=>({a:sim.world.indexOf(j.a),b:sim.world.indexOf(j.b),normal:j.normalForce??0,tangent:j.tangentForce??0}));row.frames.push(f);return report;};
  const stop=input.play===45?3:3.5;
  while(sim.phase==='live'&&sim.t<stop-1e-9){assert(performance.now()-began<5000,'5s per encounter');sim.tick();}
  row.end=sim.t;row.censored=sim.phase==='live';row.events=snap(sim.events);row.outcome=sim.outcome;row.seconds=(performance.now()-began)/1000;row.final={bodies:sim.agents.map(a=>snap(a.body)),rng:snap(sim.rng),ball:snap(sim.ball)};
  assert.equal(source(root),sourceSha256,'Runtime changed during capture');
 }
}
function measure(row){
 let slow=0,stopped=0,impulse=0,contacts=0,load=0;const body=row.frames.at(-1).after[6];
 for(const f of row.frames){
  const raw=Math.hypot(f.raw[6].vel.x,f.raw[6].vel.y),final=Math.hypot(f.final[6].vel.x,f.final[6].vel.y);
  if(f.behavior==='carrier'&&raw>2&&final<raw*.6)slow+=.05;
  if(f.behavior==='carrier'&&raw>2&&final<.01)stopped+=.05;
  for(const c of f.report.contacts)if((c.i===6&&c.j<11)||(c.j===6&&c.i<11)){impulse+=c.impulse;contacts++;}
  for(const j of f.loads)if(j.a<11&&j.b>=11)load+=Math.max(0,j.normal)*.05;
 }
 const los=row.frames.find(f=>f.carrier===6&&f.after[6].pos.x>=row.los);
 return {end:row.end,censored:row.censored,los:los?los.t+.05:null,spacingSlowSeconds:slow,spacingStopSeconds:stopped,rbTeammateContacts:contacts,rbTeammateImpulse:impulse,offensiveNormalImpulse:load,rbPosition:body.pos,rbSpeed:Math.hypot(body.vel.x,body.vel.y),support:body.support.state,events:row.events.filter(e=>['carrier_contact','handoff','tackle','fall'].includes(e.type))};
}
const comparisons=saved.inputs.map(input=>{const [a,b]=rows.filter(r=>r.play===input.play);assert.equal(a.initialSha256,b.initialSha256);
 const f=b.frames.find((f,i)=>sha(f.final)!==sha(a.frames[i]?.final));const old=f&&a.frames.find(g=>g.t===f.t);
 return {play:input.play,call:b.call,initialStatesEqual:true,allFramesEqual:sha(a.frames)===sha(b.frames),firstDifference:f?{t:f.t,sameBodies:sha(f.before)===sha(old.before),actors:f.final.flatMap((v,i)=>sha(v)===sha(old.final[i])?[]:[i]),old:old.final[6],next:f.final[6],raw:f.raw[6]}:null,before:measure(a),after:measure(b)};});
const report={schema:'rb-local-traffic-coupled-v1',fixtureSha256:sha(fixture),collectorSha256:sha(readFileSync(import.meta.filename)),node:process.version,comparisons,rows,limits:['Saved calls/players/post-constructor physical bodies and RNG, current constructor recognition/scouting in both arms; not an exact original game replay.','No mid-play state reset, no future-frame or private intent supplied to any controller.','Default accepted center contact; no experimental physics.'],elapsedSeconds:(performance.now()-start)/1000};
mkdirSync('out/rb-local-traffic',{recursive:true});writeFileSync('out/rb-local-traffic/native.json.gz',gzipSync(JSON.stringify(report)));writeFileSync('out/rb-local-traffic/native-summary.json',JSON.stringify({...report,rows:undefined},null,2)+'\n');console.log(JSON.stringify({...report,rows:undefined}));
