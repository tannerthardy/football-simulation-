/** Two saved inputs, accepted method versus the minimal extracted method.
 * No game prefixes, future-state hydration, retained draws or prototype policy.
 * The rollback arm compiles the exact accepted PassProtector method; all other
 * bytes are identical to accepted develop and the production arm stays native.
 */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import ts from 'typescript';
import {PlaySim} from '../../../../src/sim/playsim.ts';
import {PassProtector,isOL} from '../../../../src/sim/behaviors/blocking.ts';
import {goTo,stand,track} from '../../../../src/sim/behaviors/common.ts';
import {traits,passSetDepth} from '../../../../src/sim/engagement.ts';
import {clamp,norm,sub} from '../../../../src/core/vec.ts';
import {ScoutingReport} from '../../../../src/sim/recognition.ts';
import {CoverageScouting} from '../../../../src/sim/qbmind.ts';
import {sourceVersion} from '../../../../scripts/source-version.ts';

const base='8c891f4cf887b54297efbbc4c7993ba5e2f318b5';
const [destination='out/pass-cutoff-review/paired']=process.argv.slice(2);
const fixtureBytes=readFileSync('test/fixtures/pass-cutoff-inputs.json.gz');
const fixture=JSON.parse(gunzipSync(fixtureBytes));
const source=execFileSync('git',['show',`${base}:src/sim/behaviors/blocking.ts`],{encoding:'utf8'});
const ast=ts.createSourceFile('blocking.ts',source,ts.ScriptTarget.Latest,true);
const cls=ast.statements.find(n=>ts.isClassDeclaration(n)&&n.name.text==='PassProtector');
const method=cls.members.find(n=>n.name?.getText(ast)==='update').getText(ast);
const fn=name=>ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name.text===name).getText(ast);
const compile=(code,bindings)=>new Function(...Object.keys(bindings),
  ts.transpile(code,{target:ts.ScriptTarget.ES2022})+`\nreturn ${code.match(/function\s+(\w+)/)[1]};`)(...Object.values(bindings));
const cutOffPoint=compile(fn('cutOffPoint'),{clamp,norm,sub});
const runLook=compile(fn('runLook'),{});
const rollback=compile('function '+method,{isOL,passSetDepth,stand,goTo,track,runLook,norm,sub,traits,clamp,cutOffPoint});
const native=PassProtector.prototype.update;
const hash=x=>createHash('sha256').update(typeof x==='string'?x:JSON.stringify(x)).digest('hex');
const snapshot=a=>({pos:{...a.pos},vel:{...a.vel},facing:a.facing,
  omega:a.body.omega,energy:a.body.energy,support:structuredClone(a.body.support)});
const rows=[],started=performance.now();
for(const index of [39,18])for(const arm of ['accepted','candidate']){
  PassProtector.prototype.update=arm==='accepted'?rollback:native;
  const f=fixture.rows.find(r=>r.index===index),s=structuredClone(f.setup);
  const sim=new PlaySim({...s,energy:new Map(s.energy),
    scouting:Object.assign(new ScoutingReport(),{...s.scouting,cells:new Map(s.scouting.cells)}),
    coverageScouting:Object.assign(new CoverageScouting(),s.coverageScouting)});
  assert.deepEqual({...sim.rng},f.expectedInitialRng);
  const initial=sim.agents.map(snapshot),initialRng={...sim.rng};
  const frames=[],requests=[],engagementStarts=[];
  const activeUpdate=PassProtector.prototype.update;
  PassProtector.prototype.update=function(a,context){
    const command=activeUpdate.call(this,a,context);
    requests.push({t:context.t,idx:a.idx,slot:a.slot,command:structuredClone(command)});
    return command;
  };
  const engage=sim.engage.bind(sim);
  sim.engage=(b,d,...rest)=>{
    const had=b.engagement,rngBefore={...sim.rng};const e=engage(b,d,...rest);
    if(e&&!had)engagementStarts.push({t:sim.t,b:b.idx,d:d.idx,rngBefore,rngAfter:{...sim.rng},
      initial:{phi:e.phi,control:e.control,move:e.move,moveOk:e.moveOk,moveUntil:e.moveUntil,
        nextMoveAt:e.nextMoveAt,side:e.side,repEdge:e.repEdge},bPos:{...b.pos},dPos:{...d.pos}});
    return e;
  };
  const step=sim.world.step.bind(sim.world);
  sim.world.step=(intents,dt)=>{
    const before=sim.agents.map(snapshot),raw=structuredClone(sim.cmds),final=structuredClone(intents);
    const report=step(intents,dt);
    frames.push({t:sim.t,before,raw,final,after:sim.agents.map(snapshot),rng:{...sim.rng},report});
    return report;
  };
  sim.event('snap',sim.slot('C')??sim.qb);
  const start=performance.now();
  while(sim.phase==='live'&&sim.t<3.5){assert(performance.now()-start<30000);sim.tick();}
  const impacts=frames.flatMap(f=>f.report.contacts.filter(c=>c.impulse>1e-8&&(c.i<11)===(c.j<11)).map(c=>({t:f.t+.05,...c})));
  const contacts=sim.events.filter(e=>e.type==='block_contact').map(e=>{
    const f=frames.find(f=>Math.abs(f.t+.05-e.t)<1e-7);if(!f)return {...e,phi:null};
    const b=f.after[e.a].pos,d=f.after[e.b].pos,q=f.after[sim.qb.idx].pos;
    const ax=q.x-d.x,ay=q.y-d.y,bx=b.x-d.x,by=b.y-d.y;
    return {...e,phi:Math.atan2(-(-bx*ay+by*ax),bx*ax+by*ay)/(Math.PI/2)};
  });
  const at24=frames.find(f=>Math.abs(f.t+.05-2.4)<1e-7);
  const summary={index,play:index+1,arm,endTime:sim.t,phase:sim.phase,throwAt:sim.throwAt,
    censoring:sim.phase==='live'?'Live at 3.50; no ending inferred':'Native dead-ball ending',
    contacts,events:sim.events.filter(e=>['shed','pressure','sack','throw','catch','incomplete'].includes(e.type)),
    teammateImpactCount:impacts.length,teammateImpulseKgYdPerS:impacts.reduce((s,c)=>s+c.impulse,0),
    edgeAt24:at24?Object.fromEntries(['DE_W','DE_S'].map(slot=>{
      const d=sim.slot(slot),q=at24.after[sim.qb.idx].pos,p=at24.after[d.idx].pos;
      return [slot,{distanceToQB:Math.hypot(p.x-q.x,p.y-q.y),position:p}];})):null,
    edgesAtThrow:sim.throwAt>=0?['LT','RT'].map(slot=>{const b=sim.slot(slot);return {slot,
      contact:b.engagement?.contactReported??false,support:b.body.support?.state};}):null,
    elapsedSeconds:(performance.now()-start)/1000};
  rows.push({...summary,initial,initialRng,frames,requests,engagementStarts,impacts});
  console.log(JSON.stringify(summary));
}
PassProtector.prototype.update=native;
const comparison=[39,18].map(index=>{
  const a=rows.find(r=>r.index===index&&r.arm==='accepted'),b=rows.find(r=>r.index===index&&r.arm==='candidate');
  assert.deepEqual(a.initial,b.initial);assert.deepEqual(a.initialRng,b.initialRng);
  const first=a.frames.findIndex((f,i)=>hash(f)!==hash(b.frames[i]));
  const f=a.frames[first],g=b.frames[first];
  return {index,play:index+1,identicalInitialBodiesAndRng:true,identicalPriorWorldFrames:first,
    firstWorldRequestDivergence:f?{t:f.t,sameBodies:hash(f.before)===hash(g.before),
      rawActors:f.raw.flatMap((x,i)=>hash(x)===hash(g.raw[i])?[]:[i])}:null};
});
const profile=JSON.parse(readFileSync('config/baseline.json'));
const receipt={schema:'accepted-pass-cutoff-paired-review-v1',acceptedDevelop:base,
  candidate:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sourceSha256:sourceVersion(),
  fixtureSha256:hash(fixtureBytes),node:process.version,
  flags:Object.fromEntries(Object.keys(profile.flags).map(k=>[k,process.env[k]??null])),worldDefaults:profile.worldDefaults,
  acceptedMethodSha256:hash(method),candidateMethodSha256:hash(native.toString()),
  question:'Does the minimal free-cutoff action retain its primary/opposing contracts and how do the known RT/RG losses transfer to accepted develop?',
  rollbackQualification:'Exact accepted method compiled with unchanged current helpers; production candidate method unmodified. No retained execution draws.',
  summaries:rows.map(({frames,requests,engagementStarts,initial,initialRng,impacts,...summary})=>summary),comparison,
  completedGames:0,nativeSegments:rows.length,elapsedSeconds:(performance.now()-started)/1000};
mkdirSync(destination,{recursive:true});
writeFileSync(destination+'/trace.json.gz',gzipSync(JSON.stringify({receipt,rows})));
writeFileSync(destination+'/receipt.json',JSON.stringify(receipt,null,2)+'\n');
