/** Cost-only candidate: compare against immutable pre-optimization planning,
 * not against the new helper's own answers. No physical World stepping. */
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {sourceVersion} from '../../source-version.js';
import {sha} from './grip-bounded-fixtures.js';
import {recoveryFixture} from './grip-recovery-input.js';
import {turnRouteDelta} from '../../../src/physics/turn-route.js';
import {World} from '../../../src/physics/world.js';
import {fatigueFactor} from '../../../src/physics/kinematics.js';
import {cpus} from 'node:os';
const root='out/turn-planner-cost',pin='0eb6fc56afba7590e8a26616b5ff8d30a1d60d3d';
mkdirSync(root,{recursive:true});
const commit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),source=sourceVersion(),started=performance.now(),
  oldRoute=execFileSync('git',['show',`${pin}:src/physics/turn-route.ts`],{encoding:'utf8'}),
  oldWorld=execFileSync('git',['show',`${pin}:src/physics/world.ts`],{encoding:'utf8'});
const routePath=resolve(root,'pinned-turn-route.ts'),worldPath=resolve(root,'pinned-world.ts');
writeFileSync(routePath,oldRoute);
// Preserve every statement; adapt imports only so the saved module can live
// in ignored output. Pin its selector too, rather than importing the candidate.
const rewritten=oldWorld.replace(/from (['"])(\.{1,2}\/[^'"]+)\1/g,(_all,q,p)=>
  `from ${q}${pathToFileURL(p==='./turn-route.js'?routePath:resolve('src/physics',p)).href}${q}`);
writeFileSync(worldPath,rewritten);
const reference=await import(pathToFileURL(routePath).href),OldWorld=(await import(pathToFileURL(worldPath).href)).World;
if(process.argv.includes('--native')){
  // Reuse one ordinary success, the retained adverse contact, and the saved
  // newer escape. No new cohort, game campaign or outcome target.
  const {rep}=await import('../tackle/panel.js'),{recoverySpanInterval}=await import('./grip-recovery-span.js'),
    priorPath='data/reviews/current/turn-planner-cost.json',prior=JSON.parse(readFileSync(priorPath,'utf8')).nativeReference,
    referenceHash=sha(JSON.stringify(prior)),rows=[];
  for(const row of prior.rows){
    const {input,enabled}=row,result=rep(input.cell,input.side,input.seed,{handContact:'patch',substeps:96,configureWorld:world=>{
      const w:any=world;w.materialTransport='owned';w.correctiveGrip=recoverySpanInterval;if(enabled)w.turnChoice='arrival-time';
    }});
    assert.deepEqual(JSON.parse(JSON.stringify(result)),row.result,`${input.id}/${enabled}`);rows.push({input,enabled,result,exactMatch:true});
  }
  assert.equal(rows.length,6);assert.equal(sourceVersion(),source);
  assert.equal(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),commit);
  assert.equal(sha(JSON.stringify(JSON.parse(readFileSync(priorPath,'utf8')).nativeReference)),referenceHash);
  const result={commit,source,pin,node:process.version,rows,elapsedSeconds:(performance.now()-started)/1000,
    prior:{path:priorPath,subtree:'nativeReference',sha256:referenceHash},collectorSha256:sha(readFileSync('scripts/diag/physics/turn-planner-cost.ts')),
    settings:{handContact:'patch',substeps:96,materialTransport:'owned',correctiveGrip:'PR55 only; PR56 uncombined',turnChoice:'arrival-time only in enabled arms'}};
  writeFileSync(`${root}/native.json`,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({commit,rows:rows.length,exactMatches:true,elapsedSeconds:result.elapsedSeconds}));process.exit(0);
}
if(process.argv.includes('--benchmark')){
  // Complement the original constructor-per-sample screen, not replace it.
  // Pair all three arms in one process, with reusable bodies and no fixture
  // allocations between clocks. Exact same frozen profiles and intents.
  const v=recoveryFixture(),scenes=['loaded','normal'].flatMap(id=>['default','prior','scalar'].map(arm=>{
    const bodies=Array.from({length:22},(_,i)=>structuredClone(v.w.bodies[i%2])),Host=arm==='prior'?OldWorld:World,
      w=new Host(bodies,{handContact:'patch',...(arm==='default'?{}:{turnChoice:'arrival-time'})}) as any;
    bodies.forEach((b,i)=>{b.support.foot=structuredClone(v.w.bodies[i%2].support.foot);w.fat[i]=fatigueFactor(b.energy);w.amx[i]=v.w.amx[i%2];w.amy[i]=v.w.amy[i%2];if(id==='normal'){b.facing=.4;b.spin=0;}});
    return {id,arm,w,bodies,intents:bodies.map(()=>({vel:{x:8,y:0},facing:id==='normal'?1:0}))};
  })),warm=2500,repeats=5001,samples=scenes.map(()=>new Float64Array(repeats));
  for(let k=0;k<warm+repeats;k++)for(let j=0;j<scenes.length;j++){
    const n=(k+j)%scenes.length,{w,bodies,intents}=scenes[n],t=performance.now();
    for(let i=0;i<22;i++)w.plan(bodies[i],i,intents[i],.05);
    const elapsed=performance.now()-t;if(k>=warm)samples[n][k-warm]=elapsed;
  }
  const rows=scenes.map(({id,arm},i)=>{const a=[...samples[i]].sort((a,b)=>a-b);
    return {id,arm,median:a[Math.floor(.5*a.length)],p95:a[Math.floor(.95*a.length)],maximum:a.at(-1)};});
  const output=process.argv.find(v=>v.startsWith('--output='))?.slice(9)??`${root}/paired.json`,raw=output.replace(/\.json$/,'.raw.json');
  assert.equal(sourceVersion(),source);assert.equal(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),commit);
  writeFileSync(raw,JSON.stringify(samples.map(a=>[...a])));
  const profile=JSON.parse(readFileSync('config/baseline.json','utf8')),
    flags=Object.fromEntries(Object.keys(profile.flags).map(k=>[k,process.env[k]??null]));assert.deepEqual(flags,profile.flags);
  const result={commit,source,pin,node:process.version,cpu:cpus()[0].model,flags,warm,repeats,rows,medianBudget:.1,p95Budget:.25,
    scope:'22 frozen-body World.plan calls, rotating three arms, fixtures prepared once, no physical stepping or profiler; original cold/preparation-heavy screen retained separately',
    collectorSha256:sha(readFileSync('scripts/diag/physics/turn-planner-cost.ts')),raw:{path:raw,sha256:sha(readFileSync(raw))}};
  writeFileSync(output,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));process.exit(0);
}
let routes=0,plans=0,seed=0x1b873593;
const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32;};
const compare=(d:number,w:number,A:number,R:number)=>{
  assert(Object.is(turnRouteDelta(d,w,A,R),reference.turnRoute(d,w,A,R).delta),`route ${JSON.stringify([d,w,A,R])}`);routes++;
};
for(const d of [-Infinity,-20,-2*Math.PI,-Math.PI-.01,-Math.PI,-.01,-0,0,.01,Math.PI,Math.PI+.01,20,Infinity,NaN])
  for(const w of [-9,-8,-1.3,-Number.MIN_VALUE,-0,0,Number.MIN_VALUE,1.3,8,9,NaN])
    for(const A of [0,.01,60,Infinity])for(const R of [0,8,Infinity])compare(d,w,A,R);
for(let k=0;k<100000;k++){
  const R=10**(-2+4*random()),A=10**(-3+6*random()),w=k%10===0?0:(2*random()-1)*R*(k%11===0?1.2:1),
    d=(k%2?Math.PI+(random()-.5)*.1:(random()-.5)*20)+Math.floor(random()*5-2)*2*Math.PI;
  compare(d,w,A,R);
}
for(const history of ['previous','transition']){
  const v=recoveryFixture(history),w=v.w;w.turnChoice='arrival-time';
  for(let k=0;k<2000;k++){
    const i=k%2,a=structuredClone(w.bodies[i]),b=structuredClone(a),spin=k%5===0?0:(random()-.5)*8,
      facing=-Math.PI+(random()-.5)*.1,command={vel:{x:8*(random()-.5),y:8*(random()-.5)},facing:k%3===0?0:(random()-.5)*8};
    a.facing=b.facing=facing;a.spin=b.spin=spin;
    const dt=[.01,.05,.1][k%3],expected=OldWorld.prototype.plan.call(w,a,i,command,dt),actual=World.prototype['plan'].call(w,b,i,command,dt);
    assert.deepEqual(actual,expected,`plan ${history}/${k}`);assert.deepEqual(a,b);plans++;
  }
}
// Default, free and dive branches must retain their complete plans as well.
for(const enabled of [false,true])for(const special of [{},{free:true},{dive:{x:1,y:.5}}]){
  const v=recoveryFixture(),w=v.w;if(enabled)w.turnChoice='arrival-time';else delete w.turnChoice;
  const a=structuredClone(w.bodies[0]),b=structuredClone(a),command={vel:{x:8,y:0},facing:0,...special};
  assert.deepEqual(World.prototype['plan'].call(w,b,0,command,.05),OldWorld.prototype.plan.call(w,a,0,command,.05));plans++;
}
const profile=JSON.parse(readFileSync('config/baseline.json','utf8')),
  flags=Object.fromEntries(Object.keys(profile.flags).map(k=>[k,process.env[k]??null]));assert.deepEqual(flags,profile.flags);
assert.equal(sourceVersion(),source);assert.equal(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),commit);
const result={commit,source,pin,baseline:profile.id,flags,node:process.version,
  referenceHashes:{route:sha(oldRoute),world:sha(oldWorld),relocatedWorld:sha(rewritten)},
  inputHashes:{supportPackets:sha(readFileSync('config/grip-native-support-packets.json')),collector:sha(readFileSync('scripts/diag/physics/turn-planner-cost.ts'))},
  corpus:{rng:'LCG 1664525/1013904223, seed0x1b873593; fixed loops above',routes,plans},
  exactMatches:true,physicalSteps:0,elapsedSeconds:(performance.now()-started)/1000};
writeFileSync(`${root}/equivalence.json`,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
