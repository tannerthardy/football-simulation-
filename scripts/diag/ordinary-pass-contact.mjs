/** Existing replay-telemetry fixture only; no controller/physics edits.
 * Native pair first. Optional single-arm initial-LT-execution diagnostic.
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
const originalLT=reference?.rows.find(r=>r.arm==='accepted').engagementStarts.find(e=>e.b===1&&e.d===11);
if(reference)assert(originalLT);
const rows=[],started=performance.now();
for(const arm of reference?['candidate-retain-LT-initial']:['accepted','candidate']){
 const sim=new PlaySim(setup('pass','full'));
 const initial=sim.agents.map(snapshot),initialRng={...sim.rng};
 const frames=[],requests=[],engagementStarts=[],rngCalls=[],retained=[];
 let engagePair=null;
 const nativeRng=Object.fromEntries(['normal','range','weighted','chance'].map(k=>[k,sim.rng[k].bind(sim.rng)]));
 for(const k of Object.keys(nativeRng))sim.rng[k]=(...args)=>{
  const rngBefore=structuredClone(Object.fromEntries(Object.entries(sim.rng).filter(([,v])=>typeof v!=='function')));
  const result=nativeRng[k](...args);
  rngCalls.push({t:sim.t,kind:k,args:structuredClone(args),result,pair:engagePair,
   site:new Error().stack.split('\n').slice(2,6).map(s=>s.trim().replace(process.cwd(),'$ROOT')),
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
  if(originalLT&&!had&&b.idx===1&&d.idx===11&&!retained.length){
   const tapeRng=Object.assign(new Rng(0),originalLT.rngBefore);
   const tape={rangeU:tapeRng.next(),normalZ:[tapeRng.gaussian(),tapeRng.gaussian()],planU:tapeRng.next()};
   tape.normalZ.push(tapeRng.gaussian());assert.deepEqual({...tapeRng},originalLT.rngAfter);
   const captureRng=Object.fromEntries(['normal','range','weighted'].map(k=>[k,sim.rng[k]]));
   let normals=0,ranges=0,plans=0;const delivered=[];
   sim.rng.normal=(m,sd)=>{const actual=captureRng.normal(m,sd);assert(normals<3);
    const v=m+sd*tape.normalZ[normals++];delivered.push({kind:'normal',actual,delivered:v});return v;};
   sim.rng.range=(lo,hi)=>{const actual=captureRng.range(lo,hi);assert.equal(ranges++,0);
    const v=lo+(hi-lo)*tape.rangeU;delivered.push({kind:'range',actual,delivered:v});return v;};
   sim.rng.weighted=(items,weights)=>{const actual=captureRng.weighted(items,weights);assert.equal(plans++,0);
    let u=tape.planU*weights.reduce((s,w)=>s+Math.max(0,w),0),v=items.at(-1);
    for(let i=0;i<items.length;i++){u-=Math.max(0,weights[i]);if(u<=0){v=items[i];break;}}
    delivered.push({kind:'weighted',actual,delivered:v,items,weights});return v;};
   try{e=engage(b,d,...rest);}finally{Object.assign(sim.rng,captureRng);}
   if(e){assert.equal(normals,3);assert.equal(ranges,1);assert.equal(plans,1);
    retained.push({t:sim.t,referenceTime:originalLT.t,tape,delivered,
     qualification:'Initial LT/DE_W variates only; current weights and physical geometry. Native calls still consumed; subsequent execution remains native and coupled.'});}
   else assert.equal(delivered.length,0);
  }else e=engage(b,d,...rest);
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
 rows.push({arm,endTime:sim.t,phase:sim.phase,throwAt:sim.throwAt,initial,initialRng,
  events:sim.events,decisions:sim.trace.data.decisions,frames,requests,engagementStarts,rngCalls,retained,
  film:sim.frames,telemetry:sim.trace.data,elapsedSeconds:(performance.now()-start)/1000});
 console.log(JSON.stringify({arm,endTime:sim.t,events:sim.events.filter(e=>['block_contact','shed','pressure','throw','sack'].includes(e.type)),
  initialLT:engagementStarts.find(e=>e.b===1)?.initial,retained,elapsedSeconds:rows.at(-1).elapsedSeconds}));
}
PassProtector.prototype.update=nativeUpdate;
if(!reference){assert.deepEqual(rows[0].initial,rows[1].initial);assert.deepEqual(rows[0].initialRng,rows[1].initialRng);}
const profile=JSON.parse(readFileSync('config/baseline.json'));
const receipt={schema:'ordinary-pass-contact-v1',commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),
 acceptedDevelop:base,acceptedDocsOnlyDevelop:'7d1451b2c31786e075550183a6a93bbda23da29b',sourceSha256:sourceVersion(),node:process.version,
 flags:Object.fromEntries(Object.keys(profile.flags).map(k=>[k,process.env[k]??null])),worldDefaults:profile.worldDefaults,
 testSourceSha256:hash(testSource),setupSourceSha256:hash(setupCode),acceptedMethodSha256:hash(method),
 collectorSha256:hash(readFileSync(import.meta.filename)),fixtureSha256:hash(setup('pass','full')),
 actors:rows[0].initial.map((_,i)=>({idx:i})),
 retainedReferenceSha256:referencePath?hash(readFileSync(referencePath)):null,
 qualification:'Same existing roster generation seeds21/22, strength.6, GunDoubles/FourVerts vs Over/Cover4Palms, playseed5; all22 normal. Existing recorder fixture; no new roster or game. No deliberate QB mutation.',
 fullGames:0,nativeSegments:rows.length,elapsedSeconds:(performance.now()-started)/1000};
mkdirSync(out,{recursive:true});writeFileSync(out+'/trace.json.gz',gzipSync(JSON.stringify({receipt,rows})));
writeFileSync(out+'/receipt.json',JSON.stringify(receipt,null,2)+'\n');
writeFileSync(out+'/input.json',JSON.stringify(setup('pass','full'),null,2)+'\n');
