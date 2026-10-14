/** Acceptance-only experiment. Reuse checked mechanical references; no new
 * football inputs or reference collection. Serial cost excludes preparation. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {cpus} from 'node:os';
import {World} from '../../../src/physics/world.js';
import {sourceVersion} from '../../source-version.js';
import {boundedCases,prepareBoundedCase,prescribeBoundedSupport,sha} from './grip-bounded-fixtures.js';
const reference=JSON.parse(readFileSync('config/grip-bounded-reference.json','utf8'));
const old='62f1f0e344c84e6501bb15257519f367eda9d58d';
// The acceptance change does not invalidate the independent physical reference.
for(const file of ['scripts/diag/physics/grip-bounded-fixtures.ts','config/grip-bounded-reference.json'])
  assert.equal(sha(readFileSync(file)),sha(execFileSync('git',['show',`${old}:${file}`])));
// The sole World edit moves its existing .3-s constant into a shared module.
// Normalize exactly that extraction, then demand identical physical code.
const physical=readFileSync('src/physics/world.ts','utf8')
  .replace("import { LEG_SLIDE } from './grip-sliding.js';\n",'')
  .replace('const FOLLOW_MARGIN = 1.1;\n',
    'const FOLLOW_MARGIN = 1.1;\n/** Time constant of a slipping hold sliding down to the legs, s. */\nconst LEG_SLIDE = 0.3;\n');
assert.equal(sha(physical),sha(execFileSync('git',['show',`${old}:src/physics/world.ts`])),'Physical operator changed');
assert.equal(readFileSync('src/physics/grip-sliding.ts','utf8').includes('export const LEG_SLIDE = 0.3;'),true);
const flags=Object.fromEntries(Object.keys(JSON.parse(readFileSync('config/baseline.json','utf8')).flags).map(k=>[k,process.env[k]??null]));
assert.deepEqual(flags,reference.flags);
mkdirSync('out/grip-state-convergence',{recursive:true});
const legacyPath='out/grip-state-convergence/legacy-grip-timing.ts',legacyBytes=execFileSync('git',['show',`${old}:src/physics/grip-timing.ts`]);
writeFileSync(legacyPath,legacyBytes);
const legacy=await import(pathToFileURL(resolve(legacyPath)).href);
const prototype:any=World.prototype,feet=prototype.feet,norm=(a:any,b:any)=>Math.hypot(a.x-b.x,a.y-b.y);
function sample(c:any,mode:'legacy'|'resolved'|'fast'|number) {
  const v=prepareBoundedCase(boundedCases.find(p=>p.packetId+(p.offset?'-offset':'-acquired')===c.id)!);
  assert.deepEqual(v.input,c.input);const before={work:v.p.args[5].work.grasps,motor:v.p.args[5].supportMotorWork[v.ib],passive:v.p.args[5].passiveGraspWork};
  const started=performance.now();
  if(typeof mode==='number') {
    const h=v.input.duration/mode;
    for(let k=0;k<mode;k++){const args=[...v.p.args];args[3]=h;args[4]=v.p.args[4]-k*h;v.w.integrateSubstep(...args);}
  }else if(mode==='legacy') {
    v.w.gripTiming='resolved';v.p.args[5].gripTiming=legacy.resolveGripInterval(v.w,v.p.args,(w:any,args:any[])=>w.integrateInterval(...args));
  }else{v.w.gripTiming=mode;v.w.integrateSubstep(...v.p.args);}
  const seconds=(performance.now()-started)/1000;
  // Fast trial commit preserves body/foot identity, but replaces the private
  // attachment record. Always query its live record after committing.
  const attachment=v.w.attachments.get(v.joint);
  const result={a:v.particle(v.joint.a),b:v.particle(v.joint.b),material:{...attachment.material},
    footOffset:{...attachment.foot.offset},point:v.w.graspPoint(v.joint),legs:v.joint.legs,
    hold:v.joint.hold,slipping:!!v.joint.slipping,bodyWork:v.p.args[5].work.grasps-before.work,
    motorWork:v.p.args[5].supportMotorWork[v.ib]-before.motor,passiveWork:v.p.args[5].passiveGraspWork-before.passive,
    integration:v.p.args[5].gripTiming??null};
  const z=c.reference;
  const error={position:Math.max(norm(result.a.pos,z.a.pos),norm(result.b.pos,z.b.pos)),
    velocity:Math.max(norm(result.a.vel,z.a.vel),norm(result.b.vel,z.b.vel)),
    facing:Math.max(Math.abs(result.a.facing-z.a.facing),Math.abs(result.b.facing-z.b.facing)),
    spin:Math.max(Math.abs(result.a.spin-z.a.spin),Math.abs(result.b.spin-z.b.spin)),
    material:norm(result.material,z.material),foot:norm(result.footOffset,z.footOffset),point:norm(result.point,z.point),
    legs:Math.abs(result.legs-z.legs),hold:Math.abs(result.hold-z.hold),bodyWork:Math.abs(result.bodyWork-z.bodyWork),
    motorWork:Math.abs(result.motorWork-z.motorWork),passiveWork:Math.abs(result.passiveWork-z.passiveWork)};
  const normalized=Math.max(error.position/5e-7,error.velocity/2.5e-5,error.facing/2.5e-6,error.spin/2.5e-4,
    error.material/5e-7,error.foot/5e-7,error.point/5e-7,error.legs/1e-6,error.hold/5e-7,
    error.bodyWork/.01,error.motorWork/.01,error.passiveWork/.01);
  assert.equal(sha(v.bytes),v.checksum);
  return {mode,seconds,result,error,normalized,matches:normalized<=1&&result.slipping===z.slipping};
}
const rows:any[]=[],benchmark=process.argv.includes('--benchmark');
try {
  prototype.feet=prescribeBoundedSupport(feet);
  for(const c of reference.cases) {
    assert(c.physical&&c.convergence.converged);
    if(benchmark&&['patch-45-8-0-3001--1-acquired','patch-45-8-0-3001--1-offset'].includes(c.id))continue;
    const modes=process.argv.includes('--grid')?[128,256,512,1024,2048,4096,8192,16384] as const:['legacy','resolved','fast'] as const;
    const samples=modes.map(mode=>{
      if(!benchmark)return sample(c,mode);
      sample(c,mode);const repeats=Array.from({length:7},()=>sample(c,mode)),endpoint=JSON.stringify(repeats[0].result);
      assert(repeats.every(r=>JSON.stringify(r.result)===endpoint),'Repeated endpoint changed');
      const times=repeats.map(r=>r.seconds).sort((a,b)=>a-b);
      return {...repeats[0],runtime:{median:times[3],p95:times[6],maximum:times[6],samples:repeats.map(r=>r.seconds)}};
    });
    rows.push({id:c.id,samples});
    console.log(JSON.stringify({id:c.id,samples:samples.map(s=>({mode:s.mode,normalized:s.normalized,matches:s.matches,
      integration:s.result.integration,...('runtime'in s?{runtime:s.runtime}:{milliseconds:s.seconds*1000})}))}));
  }
}finally{prototype.feet=feet;}
const output=process.argv.find(a=>a.startsWith('--output='))?.slice(9)??'out/grip-state-convergence/first.json';
mkdirSync('out/grip-state-convergence',{recursive:true});
writeFileSync(output,JSON.stringify({commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),
  source:sourceVersion(),flags,referenceCommit:old,node:process.version,
  collector:sha(readFileSync(import.meta.filename)),estimator:sha(readFileSync('src/physics/grip-timing.ts')),
  legacyEstimator:sha(legacyBytes),cpu:cpus()[0].model,
  benchmark:benchmark?{serial:true,repetitions:7,warmups:1,preparationOutsideClock:true,observers:false}:null,
  prototypeRestored:prototype.feet===feet,rows},null,2)+'\n');
if(!process.argv.includes('--grid')&&rows.some(r=>r.samples.some((s:any)=>s.mode!=='legacy'&&!s.matches)))process.exitCode=2;
