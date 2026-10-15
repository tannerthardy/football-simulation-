/** Accuracy, uninstrumented cost and native football run as separate modes.
 * Reuse native histories and hold capacities/recovery/controller laws fixed. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {cpus} from 'node:os';
import {sourceVersion} from '../../source-version.js';
import {sha} from './grip-bounded-fixtures.js';
import {recoveryFixture,watchRecoveryInput,type RecoveryGripInput} from './grip-recovery-input.js';
import {recoveryForce} from './grip-recovery-force.js';
import {recoverySpanInterval,recoverySpanReference,recoverySpanDifference} from './grip-recovery-span.js';
import {observeWorldLedger} from './grip-world-ledger.js';
import {rep} from '../tackle/panel.js';
const root='out/grip-recovery-work';mkdirSync(root,{recursive:true});
const mode=process.argv.includes('--benchmark')?'benchmark':process.argv.includes('--football')?'football':'accuracy',
  output=process.argv.find(v=>v.startsWith('--output='))?.slice(9)??`${root}/${mode}.json`,source=sourceVersion(),
  commit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),profile=JSON.parse(readFileSync('config/baseline.json','utf8')),
  flags=Object.fromEntries(Object.keys(profile.flags).map(k=>[k,process.env[k]??null])),files=['src/physics/world.ts','src/physics/corrective-grip.ts',
    'scripts/diag/physics/grip-native-span-model.ts','scripts/diag/physics/grip-native-span-interval.ts','scripts/diag/physics/grip-native-span-reference.ts',
    'scripts/diag/physics/grip-recovery-input.ts','scripts/diag/physics/grip-recovery-force.ts','scripts/diag/physics/grip-recovery-span.ts',
    'scripts/diag/physics/grip-recovery-evidence.ts','test/grip-recovery-work.test.ts','config/grip-native-support-packets.json'],
  hashes=Object.fromEntries(files.map(p=>[p,sha(readFileSync(p))]));
assert.deepEqual(flags,profile.flags);
for(const p of ['src/physics/support.ts','src/physics/kinematics.ts','src/physics/virtual-foot.ts','src/physics/grip-fast.ts','src/physics/grip-timing.ts','config/baseline.json','test/grip-fast.test.ts'])
  assert.equal(sha(readFileSync(p)),sha(execFileSync('git',['show',`337be32:${p}`])));
const meta={commit,source,hashes,flags,node:process.version,cpu:cpus()[0].model,timestamp:new Date().toISOString(),
  parent:'337be328dc8d00f13ad8db7d7004dc7c6f501793',baseline:'4ded6b600fd3785e65034aa5623d7a9f8f3c5db1',
  settings:{handContact:'patch',gripTiming:'midpoint',constraintWork:'per-solve',materialTransport:'owned',correctiveGrip:'explicit only',nativeSubsteps:96},
  costBudgetMilliseconds:{median:2,p95:5,fallbackScreen:10},accuracyAllowance:1/16};
const specs=[{history:'previous',phase:0},{history:'previous',phase:23},{history:'transition',phase:0},{history:'transition',phase:23}];
let payload:any;
if(mode==='accuracy'){
  const raw:any[]=[],mechanical=[],law=[],ledger=[],continuation=[];
  for(const c of specs){
    const v=recoveryFixture(c.history,c.phase);let q!:RecoveryGripInput;watchRecoveryInput(v.w,input=>q=input);
    const observed=observeWorldLedger(v.w,()=>v.w.integrateSubstep(...v.args),v.args[3]);
    for(const k of ['bodyLedgerResidual','motorLedgerResidual','passiveLedgerResidual','kineticResidual','doseResidual'] as const)assert(Math.abs(observed.accounting[k])<1e-8);
    ledger.push({...c,accounting:observed.accounting});
    for(const zero of [false,true]){
      const input={...q,desired:zero?{x:0,y:0}:q.desired};
      if(zero&&c.history==='transition'&&c.phase===23){assert.throws(()=>recoverySpanInterval(input),/scope/);mechanical.push({...c,zero,refused:'same existing shared cap boundary'});continue;}
      const r=recoverySpanInterval(input),lo=recoverySpanReference(input,1024),hi=recoverySpanReference(input,2048),error=recoverySpanDifference(r,hi),convergence=recoverySpanDifference(lo,hi);
      assert(error<=1/16&&convergence<=1/16);mechanical.push({...c,zero,error,convergence,motorWork:r.motorWork,correctionWork:r.correctionWork,viscousWork:r.viscousWork,
        positiveMotorWork:r.positiveMotorWork,budget:r.motorWorkBudget,evaluations:r.evaluations,energyResidual:r.energyResidual});raw.push({c,zero,input,r,lo,hi});
    }
    const limits=[];
    for(const h of [1e-5,1e-7,1e-9]){
      const v=recoveryFixture(c.history,c.phase);let input!:RecoveryGripInput,row:any,limited=0;watchRecoveryInput(v.w,q=>input=q);
      const rows=v.w.jointRows,impulse=v.w.supportImpulse;
      v.w.jointRows=function(H:number){const r=rows.call(this,H);row=r[0];return r;};
      v.w.supportImpulse=function(...a:any[]){const f=impulse.apply(this,a);if(f<1-1e-10)limited++;return f;};
      const a=[...v.args];a[3]=h;v.w.integrateSubstep(...a);const ref=recoveryForce(input),normal=(row.ln-row.reel)/h,tangent=row.lt/h;
      assert(limited===0&&ref.reel===0);limits.push({h,normal,tangent,target:ref.tangent,error:Math.abs(tangent-ref.tangent),limited,powerResidual:ref.balance});
    }
    assert(limits.at(-1)!.error<limits[0].error);law.push({...c,limits});
  }
  for(const history of ['previous','transition']){
    const variants:Array<{n:number;trace:any[];bodies:any[];report:any}>=[];
    for(const n of [-1,0,1024,2048]){
      const v=recoveryFixture(history);delete v.w.activeGrip;const trace:any[]=[];
      if(n>=0)v.w.correctiveGrip=(q:RecoveryGripInput)=>{try{const r=n?recoverySpanReference(q,n):recoverySpanInterval(q);trace.push({time:v.w.time,q,r});return r;}
        catch(e){trace.push({time:v.w.time,q,refusal:String(e)});throw e;}};
      for(let k=0;k<96;k++){const a=[...v.args];a[4]-=k*a[3];v.w.integrateSubstep(...a);}
      variants.push({n,trace,bodies:v.w.bodies,report:v.w.report});
    }
    const diff=(a:typeof variants[number],b:typeof variants[number])=>({position:Math.max(...a.bodies.map((p:any,i:number)=>Math.hypot(p.pos.x-b.bodies[i].pos.x,p.pos.y-b.bodies[i].pos.y))),
      support:Math.max(...a.bodies.map((p:any,i:number)=>Math.hypot(p.support.xi.x-b.bodies[i].support.xi.x,p.support.xi.y-b.bodies[i].support.xi.y))),
      bodyWork:Math.abs(a.report.work.grasps-b.report.work.grasps),motorWork:Math.abs(a.report.supportMotorWork[0]-b.report.supportMotorWork[0]),
      worstInterval:Math.max(...a.trace.map((v:any,i:number)=>v.r&&b.trace[i]?.r?recoverySpanDifference(v.r,b.trace[i].r):0))});
    const accuracy=diff(variants[1],variants[3]),convergence=diff(variants[2],variants[3]);
    for(const d of [accuracy,convergence])assert(d.position<=5e-10/16&&d.support<=5e-10/16&&d.bodyWork<=1e-9/16&&d.motorWork<=1e-9/16&&d.worstInterval<=1/16);
    continuation.push({history,accuracy,convergence,variants:variants.map(v=>({n:v.n,audit:v.report.correctiveGrip,xi:v.bodies[0].support.xi,
      refusals:v.trace.filter(t=>t.refusal).map(t=>({time:t.time,reason:t.refusal}))}))});raw.push({history,variants});
  }
  const path=output.replace(/\.json$/,'.raw.json');writeFileSync(path,JSON.stringify(raw));payload={mechanical,law,ledger,continuation,raw:{path,sha256:sha(readFileSync(path))}};
}else if(mode==='benchmark'){
  const cases=[...specs.map(c=>({...c,prepare:0})),{history:'transition',phase:0,prepare:77}],items=cases.flatMap(c=>[false,true].map(enabled=>({c,enabled}))),samples:any[]=[],warm=11,repeats=101;
  for(let k=0;k<warm+repeats;k++)for(let z=0;z<items.length;z++){
    const {c,enabled}=items[(k+z)%items.length],v=recoveryFixture(c.history,c.phase);delete v.w.activeGrip;
    if(c.prepare){v.w.correctiveGrip=recoverySpanInterval;for(let i=0;i<c.prepare;i++){const a=[...v.args];a[4]-=i*a[3];v.w.integrateSubstep(...a);}v.args[4]-=c.prepare*v.args[3];}
    if(enabled)v.w.correctiveGrip=recoverySpanInterval;else delete v.w.correctiveGrip;
    const t=performance.now();v.w.integrateSubstep(...v.args);const milliseconds=performance.now()-t;
    if(k>=warm)samples.push({...c,enabled,milliseconds,repeat:k-warm});
  }
  const rows=items.map(({c,enabled})=>{const a=samples.filter(r=>r.history===c.history&&r.phase===c.phase&&r.prepare===c.prepare&&r.enabled===enabled).map(r=>r.milliseconds).sort((a,b)=>a-b),
    median=a[Math.floor(a.length*.5)],p95=a[Math.floor(a.length*.95)],p99=a[Math.floor(a.length*.99)],maximum=a.at(-1)!;
    return {...c,enabled,median,p95,p99,maximum,pass:median<=2&&p95<=5};});
  const path=output.replace(/\.json$/,'.samples.json');writeFileSync(path,JSON.stringify(samples));payload={warm,repeats,serial:true,uninstrumented:true,preparationOutsideClock:true,
    scope:'One native.520833ms interval in portable two-body World, not prior22-body clocks or game cost.',rows,samples:{path,sha256:sha(readFileSync(path))}};
}else{
  const prior=JSON.parse(readFileSync('data/reviews/current/grip-native-football.json','utf8')),rows=[];
  for(const input of prior.inputs){const calls={accepted:0,fallbacks:0,reasons:{} as Record<string,number>};
    const result=rep(input.cell,input.side,input.seed,{handContact:'patch',substeps:96,configureWorld:world=>{
      const w:any=world;w.materialTransport='owned';w.correctiveGrip=recoverySpanInterval;
      const step=w.step;w.step=function(...a:any[]){const r=step.apply(this,a),p=r.correctiveGrip;if(p){calls.accepted+=p.accepted;calls.fallbacks+=p.fallbacks;for(const[k,v]of Object.entries(p.reasons))calls.reasons[k]=(calls.reasons[k]??0)+(v as number);}return r;};
    }});rows.push({input,result,calls,prior:prior.rows.filter((r:any)=>r.id===input.id)});console.log(JSON.stringify({input:input.id,result,calls}));}
  payload={rows,interpretation:'Corrective candidate alone; earlier tangent/active callback absent. Compare ownership-only and prior candidate separately. Endings are observations, not automatic physics gains.'};
}
assert.equal(sourceVersion(),source);assert.equal(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),commit);for(const p of files)assert.equal(sha(readFileSync(p)),hashes[p]);
writeFileSync(output,JSON.stringify({meta,...payload},null,2)+'\n');console.log(JSON.stringify({output,...(mode==='accuracy'?{mechanical:payload.mechanical,continuation:payload.continuation}:mode==='benchmark'?{rows:payload.rows}:{})},null,2));
