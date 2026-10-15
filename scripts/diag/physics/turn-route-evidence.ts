/** One controller candidate, fixed existing yaw/contact/recovery laws.
 * Modes separate accuracy/tasks, native transfer and uninstrumented cost. */
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {cpus} from 'node:os';
import {sourceVersion} from '../../source-version.js';
import {sha} from './grip-bounded-fixtures.js';
import {boundedArrival,turnRoute,arrivalReference} from './turn-route-model.js';
import {turnTask,turnTasks,type TurnTask} from './turn-route-task.js';
import {recoveryFixture} from './grip-recovery-input.js';
import {recoverySpanInterval} from './grip-recovery-span.js';
import {checkIntervalReference} from './support-command-audit.js';
import {rep} from '../tackle/panel.js';
import {World} from '../../../src/physics/world.js';
import {commandFacing,turnRateOf,fatigueFactor} from '../../../src/physics/kinematics.js';
const root='out/momentum-turn-choice';mkdirSync(root,{recursive:true});
const mode=process.argv.includes('--football')?'football':process.argv.includes('--benchmark')?'benchmark':'tasks',
  output=process.argv.find(v=>v.startsWith('--output='))?.slice(9)??`${root}/${mode}.json`,source=sourceVersion(),
  commit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),profile=JSON.parse(readFileSync('config/baseline.json','utf8')),
  flags=Object.fromEntries(Object.keys(profile.flags).map(k=>[k,process.env[k]??null])),
  files=['src/physics/world.ts','src/physics/turn-route.ts','scripts/diag/physics/turn-route-model.ts','scripts/diag/physics/turn-route-task.ts',
    'scripts/diag/physics/turn-route-evidence.ts','test/turn-route.test.ts','config/grip-native-support-packets.json'],hashes=Object.fromEntries(files.map(p=>[p,sha(readFileSync(p))]));
assert.deepEqual(flags,profile.flags);
for(const p of ['src/physics/actuation.ts','src/physics/yaw-response.ts','src/physics/kinematics.ts','src/physics/support.ts','src/physics/virtual-foot.ts',
  'src/physics/corrective-grip.ts','scripts/diag/physics/grip-recovery-span.ts','scripts/diag/physics/grip-native-span-model.ts','config/baseline.json','test/grip-fast.test.ts'])
  assert.equal(sha(readFileSync(p)),sha(execFileSync('git',['show',`4db2ffa:${p}`])));
const start=performance.now(),raw:any[]=[],meta={commit,source,flags,hashes,node:process.version,cpu:cpus()[0].model,timestamp:new Date().toISOString(),
  parent:'4db2ffa77298a00dd475a6565c4f427cabb03634',baseline:'4ded6b600fd3785e65034aa5623d7a9f8f3c5db1',
  settings:{turnChoice:'arrival-time only in candidate arms; absent otherwise',handContact:'patch',gripTiming:'midpoint',constraintWork:'per-solve',materialTransport:'owned',nativeSubsteps:96,correctiveGrip:'same PR55 callback only; earlier active/tangent callback absent'},
  interpretation:'Reach requested orientation and settle under existing limits. Estimated bang-bang time is a route-ranking surrogate, not the existing servo finish time. No guaranteed speed, matched trajectories or football win.'};
let payload:any;
if(mode==='tasks'){
  let referenceError=0;for(const D of [-6.4,-3.14,-.1,0,.1,3.14,6.4])for(const w of [-3,-1.3,0,1.3,3])for(const A of [5,60])
    referenceError=Math.max(referenceError,Math.abs(boundedArrival(D,w,A,8)-arrivalReference(D,w,A,8)));
  assert(referenceError<1e-12);
  const fresh:TurnTask[]=[];for(const e of [-.25,-.1,.1,.25])for(const spin of [-2.5,-.5,.5,2.5])fresh.push({id:`fresh-${e}-${spin}`,facing:-Math.PI+e,spin,target:0});
  const rows=[];
  for(const c of [...turnTasks,...fresh]){
    const arms=[];for(const arm of ['shortest','arrival'] as const){const r=turnTask(c,arm);raw.push(r);assert(Math.abs(r.energyResidual)<1e-9);
      arms.push({mode:arm,finish:r.finish,reversalTime:r.reversalTime,first:r.trace[0],absoluteWork:r.absoluteWork,netWork:r.totalWork,energyResidual:r.energyResidual});}
    rows.push({input:c,fresh:c.id.startsWith('fresh'),arms,seconds:arms[0].finish!==null&&arms[1].finish!==null?arms[1].finish-arms[0].finish:null});
  }
  const loaded=[],refs=[];for(const history of ['previous','transition'])for(const enabled of [false,true]){
    const v=recoveryFixture(history),w=v.w;delete w.activeGrip;w.correctiveGrip=recoverySpanInterval;if(enabled)w.turnChoice='arrival-time';
    // The saved plans are already issued. Re-evaluate just facing from the
    // current candidate plan on a disposable body; preserve all actual gait,
    // support and pursuit requests for this one controller tick.
    if(enabled)for(let i=0;i<2;i++){const copy=structuredClone(w.bodies[i]),p=w.plan(copy,i,v.args[1][i],.05);v.args[2][i].facing=p.facing;}
    const initial=structuredClone(w.bodies),plan=structuredClone(v.args[2]);let selected:any;
    const solver=w.correctiveGrip;w.correctiveGrip=(q:any)=>{selected??=q;return solver(q);};
    for(let k=0;k<96;k++){const a=[...v.args];a[4]-=k*a[3];w.integrateSubstep(...a);}
    if(enabled){const ref=checkIntervalReference(selected);assert(!ref.refused&&ref.error!<=1/16&&ref.refinement!<=1/16);refs.push({history,...ref});}
    loaded.push({history,enabled,initial:initial.map((b:any)=>({facing:b.facing,spin:b.spin,xi:b.support.xi})),plans:plan,
      final:w.bodies.map((b:any)=>({pos:b.pos,facing:b.facing,spin:b.spin,xi:b.support.xi})),audit:w.report.correctiveGrip});
  }
  const partition=[];for(const id of ['saved-previous','normal','changed-command']){const c=turnTasks.find(c=>c.id===id)!;
    const a=turnTask(c,'arrival',96),b=turnTask(c,'arrival',192);assert(a.finish!==null&&b.finish!==null&&Math.abs(a.finish-b.finish)<=.05/96);
    partition.push({id,finish96:a.finish,finish192:b.finish});}
  payload={referenceError,taskOperator:{tick:.05,settledAngle:.01,settledSpin:.02,heldFor:.1,censorAt:5,substeps:96},rows,loaded,refs,partition};
}else if(mode==='football'){
  const priorPath='data/reviews/current/grip-recovery-work.json',prior=JSON.parse(readFileSync(priorPath,'utf8')),inputs=prior.football.map((r:any)=>r.input),rows=[];
  inputs.push({id:'patch-45-8-0-6001-1',name:'declared fresh angle',cell:{angle:45,speed:8,cut:false,difficulty:'difficult'},side:1,seed:6001});
  for(const input of inputs)for(const enabled of [false,true]){
    const changes:any[]=[],calls={accepted:0,fallbacks:0,reasons:{} as Record<string,number>};let residual=0;
    const result=rep(input.cell,input.side,input.seed,{handContact:'patch',substeps:96,configureWorld:world=>{
      const w:any=world;w.materialTransport='owned';w.correctiveGrip=recoverySpanInterval;if(enabled)w.turnChoice='arrival-time';
      const plan=w.plan;w.plan=function(b:any,i:number,intent:any,dt:number){const facing=b.facing,rate=turnRateOf(b),delta=(this.facingDelta(facing,commandFacing(b,intent))),
        expected=facing+Math.max(-rate*dt,Math.min(rate*dt,delta)),r=plan.call(this,b,i,intent,dt);
        if(enabled&&b.support.state==='up'&&!intent.free&&!intent.dive&&Math.abs(r.facing-expected)>1e-12)changes.push({time:this.time,i,facing,spin:b.spin,shortest:expected,chosen:r.facing});return r;};
      const step=w.step;w.step=function(...a:any[]){const r=step.apply(this,a),p=r.correctiveGrip;residual=Math.max(residual,Math.abs(r.work.residual));
        if(p){calls.accepted+=p.accepted;calls.fallbacks+=p.fallbacks;for(const[k,v]of Object.entries(p.reasons))calls.reasons[k]=(calls.reasons[k]??0)+(v as number);}return r;};
    }});
    const old=prior.football.find((r:any)=>r.input.id===input.id)?.result;
    if(!enabled&&old)for(const k of Object.keys(old))assert.deepEqual((result as any)[k],old[k]);
    assert(residual<1e-8);const path=`${root}/${input.id}-${enabled?'arrival':'shortest'}.changes.json`;writeFileSync(path,JSON.stringify(changes));
    rows.push({input,enabled,result,calls,changes:changes.length,first:changes[0]??null,maximumWorkResidual:residual,defaultReproduced:!enabled&&!!old,
      changesEvidence:{path,sha256:sha(readFileSync(path))}});console.log(JSON.stringify(rows.at(-1)));
  }
  payload={inputs,rows,prior:{path:priorPath,sha256:sha(readFileSync(priorPath))},note:'Six inputs/two arms, no games. Acquired-grip advance is not NFL YAC. Censored contacts are not successful tackles.'};
}else{
  const samples:any[]=[],warm=11,repeats=101,cases=['loaded-half-turn','normal'];
  for(let k=0;k<warm+repeats;k++)for(let z=0;z<4;z++){
    const j=(k+z)%4,id=cases[Math.floor(j/2)],enabled=j%2===1,v=recoveryFixture(),bodies=Array.from({length:22},(_,i)=>structuredClone(v.w.bodies[i%2])),
      w:any=new World(bodies,{handContact:'patch',...(enabled?{turnChoice:'arrival-time' as const}:{})});
    bodies.forEach((b,i)=>{b.support.foot=structuredClone(v.w.bodies[i%2].support.foot);w.fat[i]=fatigueFactor(b.energy);w.amx[i]=v.w.amx[i%2];w.amy[i]=v.w.amy[i%2];if(id==='normal'){b.facing=.4;b.spin=0;}});
    const intents=bodies.map(()=>({vel:{x:8,y:0},facing:id==='normal'?1:0})),t=performance.now();for(let i=0;i<22;i++)w.plan(bodies[i],i,intents[i],.05);const milliseconds=performance.now()-t;
    if(k>=warm)samples.push({id,enabled,milliseconds});
  }
  const rows=cases.flatMap(id=>[false,true].map(enabled=>{const a=samples.filter(r=>r.id===id&&r.enabled===enabled).map(r=>r.milliseconds).sort((a,b)=>a-b);
    return {id,enabled,median:a[Math.floor(.5*a.length)],p95:a[Math.floor(.95*a.length)],maximum:a.at(-1)};}));
  raw.push(...samples);payload={scope:'22 frozen-body World.plan calls, preparation outside clock, no physical World stepping',warm,repeats,medianBudget:.1,p95Budget:.25,rows};
}
assert.equal(sourceVersion(),source);assert.equal(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),commit);for(const p of files)assert.equal(sha(readFileSync(p)),hashes[p]);
const path=output.replace(/\.json$/,'.raw.json');writeFileSync(path,JSON.stringify(raw));
writeFileSync(output,JSON.stringify({meta:{...meta,instrumentedSeconds:mode==='benchmark'?undefined:(performance.now()-start)/1000},...payload,raw:{path,sha256:sha(readFileSync(path))}},null,2)+'\n');console.log(JSON.stringify({output,...(mode==='tasks'?{referenceError:payload.referenceError,rows:payload.rows.map((r:any)=>({id:r.input.id,seconds:r.seconds})),partition:payload.partition}:mode==='benchmark'?{rows:payload.rows}:{})}));
