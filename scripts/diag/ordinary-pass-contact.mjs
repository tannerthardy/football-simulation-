/** Existing replay-telemetry fixture only; no controller/physics edits.
 * Native pair first. Optional reciprocal first-LT-move variate comparison.
 * The deliberate QB mutation in the copy test is never applied here. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import ts from 'typescript';
import {Rng} from '../../src/core/rng.ts';
import {CENTER_Y} from '../../src/core/field.ts';
import {generateTeam,pickDefense,pickOffense} from '../../src/league/team.ts';
import {PASS_BY_ID,RUN_BY_ID} from '../../src/playbook/concepts.ts';
import {COVERAGE_BY_ID,FRONT_BY_ID} from '../../src/playbook/defense.ts';
import {FORMATION_BY_ID} from '../../src/playbook/formations.ts';
import {PlaySim} from '../../src/sim/playsim.ts';
import {PassProtector,isOL} from '../../src/sim/behaviors/blocking.ts';
import {goTo,stand,track} from '../../src/sim/behaviors/common.ts';
import {traits,passSetDepth} from '../../src/sim/engagement.ts';
import {clamp,norm,sub} from '../../src/core/vec.ts';
import {sourceVersion} from '../source-version.ts';

const base='8c891f4cf887b54297efbbc4c7993ba5e2f318b5';
const [out='out/pass-ordinary/native',referencePath]=process.argv.slice(2);
const hash=x=>createHash('sha256').update(typeof x==='string'||Buffer.isBuffer(x)?x:JSON.stringify(x)).digest('hex');
const testSource=readFileSync('test/replay-telemetry.test.ts','utf8');
const parse=(name,source)=>ts.createSourceFile(name,source,ts.ScriptTarget.Latest,true);
const testAST=parse('replay-telemetry.test.ts',testSource);
const setupCode=testAST.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name.text==='setup').getText(testAST);
const compile=(code,bindings)=>new Function(...Object.keys(bindings),
 ts.transpile(code,{target:ts.ScriptTarget.ES2022})+`\nreturn ${code.match(/function\s+(\w+)/)[1]};`)(...Object.values(bindings));
const offense=generateTeam(new Rng(21),'Offense','OFF',{strength:.6});
const defense=generateTeam(new Rng(22),'Defense','DEF',{strength:.6});
const setup=compile(setupCode,{offense,defense,pickOffense,pickDefense,FORMATION_BY_ID,
 PASS_BY_ID,RUN_BY_ID,COVERAGE_BY_ID,FRONT_BY_ID,CENTER_Y});
const acceptedSource=execFileSync('git',['show',`${base}:src/sim/behaviors/blocking.ts`],{encoding:'utf8'});
const ast=parse('blocking.ts',acceptedSource);
const cls=ast.statements.find(n=>ts.isClassDeclaration(n)&&n.name.text==='PassProtector');
const method=cls.members.find(n=>n.name?.getText(ast)==='update').getText(ast);
const fn=name=>ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name.text===name).getText(ast);
const cutOffPoint=compile(fn('cutOffPoint'),{clamp,norm,sub}),runLook=compile(fn('runLook'),{});
const rollback=compile('function '+method,{isOL,passSetDepth,stand,goTo,track,runLook,norm,sub,traits,clamp,cutOffPoint});
const nativeUpdate=PassProtector.prototype.update;
const snapshot=a=>({pos:{...a.pos},vel:{...a.vel},facing:a.facing,omega:a.body.omega,
 energy:a.body.energy,support:structuredClone(a.body.support),passSet:a.passSet?{...a.passSet}:null,
 behavior:a.behavior.kind});
const rep=e=>({b:e.blocker.idx,d:e.defender.idx,start:e.start,type:e.type,phi:e.phi,
 control:e.control,move:e.move,moveOk:e.moveOk,moveUntil:e.moveUntil,nextMoveAt:e.nextMoveAt,
 repEdge:e.repEdge,side:e.side,baseB:e.baseB,baseD:e.baseD,win:e.win,
 contactReported:e.contactReported??false,hands:e.hands?structuredClone(e.hands):null});
// Joint bodies are references; retain the joint's mechanical fields separately.
const cleanRep=e=>{const {hands,...r}=rep({...e,hands:undefined});
 r.hands=e.hands?Object.fromEntries(Object.entries(e.hands).filter(([k])=>!['a','b'].includes(k))):null;
 return structuredClone(r);};
const reference=referencePath?JSON.parse(gunzipSync(readFileSync(referencePath))):null;
const rows=[],started=performance.now();
function firstMoveTape(row){
 const j=row.rngCalls.findIndex(c=>c.kind==='weighted'&&c.site.some(s=>s.includes('chooseMove')));
 assert(j>=0);const calls=row.rngCalls.slice(j,j+3);
 assert.deepEqual(calls.map(c=>c.kind),['weighted','chance','range']);
 assert.equal(calls[0].reps[0].b,1);assert.equal(calls[0].reps[0].d,11);
 return {referenceTime:calls[0].t,calls,uniforms:calls.map(c=>Object.assign(new Rng(0),c.rngBefore).next())};
}
for(const arm of ['accepted','candidate']){
 const sim=new PlaySim(setup('pass','full'));
 const initial=sim.agents.map(snapshot),initialRng={...sim.rng};
 const frames=[],requests=[],engagementStarts=[],rngCalls=[],retained=[];
 const opposite=reference?.rows.find(r=>r.arm===(arm==='accepted'?'candidate':'accepted'));
 const tape=opposite?firstMoveTape(opposite):null;
 let engagePair=null,retainedStage=0;
 const nativeRng=Object.fromEntries(['normal','range','weighted','chance'].map(k=>[k,sim.rng[k].bind(sim.rng)]));
 for(const k of Object.keys(nativeRng))sim.rng[k]=(...args)=>{
  const rngBefore=structuredClone(Object.fromEntries(Object.entries(sim.rng).filter(([,v])=>typeof v!=='function')));
  const actual=nativeRng[k](...args);
  const site=new Error().stack.split('\n').slice(2,6).map(s=>s.trim().replace(process.cwd(),'$ROOT'));
  let result=actual;
  const lt=sim.agents[1].engagement;
  if(tape&&retainedStage===0&&k==='weighted'&&site.some(s=>s.includes('chooseMove'))){
   assert(lt&&lt.blocker.idx===1&&lt.defender.idx===11&&sim.t>=lt.nextMoveAt);
   const [items,weights]=args;let u=tape.uniforms[0]*weights.reduce((s,w)=>s+Math.max(0,w),0);
   result=items.at(-1);for(let i=0;i<items.length;i++){u-=Math.max(0,weights[i]);if(u<=0){result=items[i];break;}}
   retainedStage=1;
  }else if(tape&&retainedStage===1&&k==='chance'&&site.some(s=>s.includes('resolveMove'))){
   result=tape.uniforms[1]<args[0];retainedStage=2;
  }else if(tape&&retainedStage===2&&k==='range'&&site.some(s=>s.includes('resolveMove'))){
   result=args[0]+(args[1]-args[0])*tape.uniforms[2];retainedStage=3;
  }
  const retainedNow=tape&&((retainedStage===1&&k==='weighted')||(retainedStage===2&&k==='chance')||(retainedStage===3&&k==='range'&&retained.length===2));
  if(retainedNow)retained.push({t:sim.t,kind:k,actual,delivered:result,args:structuredClone(args),
   referenceArm:opposite.arm,referenceTime:tape.referenceTime,uniform:tape.uniforms[retained.length],
   qualification:'Only first subsequent LT/DE_W move-choice, execution and interval variates. Current weights/probability and native timing/geometry. Native calls consumed; later draws remain native and coupled.'});
  rngCalls.push({t:sim.t,kind:k,args:structuredClone(args),result,actual,pair:engagePair,site,
   rngBefore,rngAfter:structuredClone(Object.fromEntries(Object.entries(sim.rng).filter(([,v])=>typeof v!=='function'))),
   reps:sim.engagements.map(cleanRep)});
  return result;
 };
 const activeUpdate=arm==='accepted'?rollback:nativeUpdate;
 PassProtector.prototype.update=function(a,s){
  const before=snapshot(a),rngStart=rngCalls.length;
  const command=activeUpdate.call(this,a,s),target=this.recordedTarget(a);
  requests.push({t:s.t,idx:a.idx,slot:a.slot,before,target,
   rusher:target===null?null:snapshot(s.agents[target]),command:structuredClone(command),
   rngStart,rngEnd:rngCalls.length});return command;
 };
 const engage=sim.engage.bind(sim);
 sim.engage=(b,d,...rest)=>{
  const had=b.engagement,rngBefore=structuredClone(Object.fromEntries(Object.entries(sim.rng).filter(([,v])=>typeof v!=='function')));
  const rngStart=rngCalls.length;engagePair=[b.idx,d.idx];let e;
  e=engage(b,d,...rest);
  engagePair=null;
  if(e&&!had)engagementStarts.push({t:sim.t,b:b.idx,d:d.idx,rngBefore,
   rngAfter:structuredClone(Object.fromEntries(Object.entries(sim.rng).filter(([,v])=>typeof v!=='function'))),
   rngStart,rngEnd:rngCalls.length,initial:cleanRep(e),bBody:snapshot(b),dBody:snapshot(d),qb:snapshot(sim.qb)});
  return e;
 };
 const step=sim.world.step.bind(sim.world);
 sim.world.step=(intents,dt)=>{
  const before=sim.agents.map(snapshot),raw=structuredClone(sim.cmds),final=structuredClone(intents),repsBefore=sim.engagements.map(cleanRep);
  const report=step(intents,dt);
  frames.push({t:sim.t,before,raw,final,repsBefore,after:sim.agents.map(snapshot),repsAfter:sim.engagements.map(cleanRep),report});return report;
 };
 const start=performance.now();
 // Same 45 native ticks as the existing recorder check, before its QB mutation.
 for(let i=0;i<45&&sim.phase==='live';i++)sim.tick();
 if(reference){
  assert.equal(retainedStage,3);assert.equal(retained.length,3);
  const native=reference.rows.find(r=>r.arm===arm),fork=retained[0].t;
  assert.deepEqual(frames.filter(f=>f.t<fork),native.frames.filter(f=>f.t<fork),'Pre-fork World history must remain native');
 }

 rows.push({arm,comparison:reference?'opposite-first-move-variates':'native',endTime:sim.t,phase:sim.phase,throwAt:sim.throwAt,initial,initialRng,
  events:sim.events,decisions:sim.trace.data.decisions,frames,requests,engagementStarts,rngCalls,retained,
  film:sim.frames,telemetry:sim.trace.data,elapsedSeconds:(performance.now()-start)/1000});
 console.log(JSON.stringify({arm,endTime:sim.t,events:sim.events.filter(e=>['block_contact','shed','pressure','throw','sack'].includes(e.type)),
  initialLT:engagementStarts.find(e=>e.b===1)?.initial,retained,elapsedSeconds:rows.at(-1).elapsedSeconds}));
}
PassProtector.prototype.update=nativeUpdate;
if(!reference){assert.deepEqual(rows[0].initial,rows[1].initial);assert.deepEqual(rows[0].initialRng,rows[1].initialRng);}
const profile=JSON.parse(readFileSync('config/baseline.json'));
const receipt={schema:'ordinary-pass-contact-v2',commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),
 acceptedDevelop:base,acceptedDocsOnlyDevelop:'7d1451b2c31786e075550183a6a93bbda23da29b',sourceSha256:sourceVersion(),node:process.version,
 flags:Object.fromEntries(Object.keys(profile.flags).map(k=>[k,process.env[k]??null])),worldDefaults:profile.worldDefaults,
 testSourceSha256:hash(testSource),setupSourceSha256:hash(setupCode),acceptedMethodSha256:hash(method),
 collectorSha256:hash(readFileSync(import.meta.filename)),fixtureSha256:hash(setup('pass','full')),
 actors:setup('pass','full').offense.map((p,i)=>({idx:i,team:'O',slot:p.slot??null,id:p.player?.id??p.id})).concat(setup('pass','full').defense.map((p,i)=>({idx:i+11,team:'D',slot:p.slot??null,id:p.player?.id??p.id}))),
 retainedReferenceSha256:referencePath?hash(readFileSync(referencePath)):null,
 qualification:'Same existing roster generation seeds21/22, strength.6, GunDoubles/FourVerts vs Over/Cover4Palms, playseed5; all22 normal. Existing recorder fixture; no new roster or game. No deliberate QB mutation.',
 fullGames:0,nativeSegments:rows.length,elapsedSeconds:(performance.now()-started)/1000};
mkdirSync(out,{recursive:true});writeFileSync(out+'/trace.json.gz',gzipSync(JSON.stringify({receipt,rows})));
writeFileSync(out+'/receipt.json',JSON.stringify(receipt,null,2)+'\n');
writeFileSync(out+'/input.json',JSON.stringify(setup('pass','full'),null,2)+'\n');
