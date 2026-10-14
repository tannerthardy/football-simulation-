/** Focused accuracy and serial unobserved cost. No new snaps or World edits. */
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {deepStrictEqual} from 'node:assert';
import {cpus} from 'node:os';
import {World} from '../../../src/physics/world.js';
import {sourceVersion} from '../../source-version.js';
import {boundedGripInterval} from './grip-force-bounded.js';
import {prepareBoundedCase,prescribeBoundedSupport,boundedCases,sha} from './grip-bounded-fixtures.js';
const root='out/grip-bounded',fixture=JSON.parse(readFileSync('config/grip-bounded-reference.json','utf8')),
  source=sourceVersion(),commit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),
  files=['scripts/diag/physics/grip-force-bounded.ts','scripts/diag/physics/grip-bounded-fixtures.ts',
    'scripts/diag/physics/grip-bounded-evidence.ts','config/grip-bounded-reference.json'],hashes=Object.fromEntries(files.map(p=>[p,sha(readFileSync(p))])),
  flags=Object.fromEntries(Object.keys(JSON.parse(readFileSync('config/baseline.json','utf8')).flags).map(k=>[k,process.env[k]??null]));
deepStrictEqual(flags,fixture.flags);if(source!==fixture.source)throw Error('Incompatible mechanical reference');
const norm=(a:any,b:any)=>Math.hypot(a.x-b.x,a.y-b.y),rows:any[]=[],bench:any[]=[];
function compare(r:any,z:any) {
  const error={position:Math.max(norm(r.a.pos,z.a.pos),norm(r.b.pos,z.b.pos)),velocity:Math.max(norm(r.a.vel,z.a.vel),norm(r.b.vel,z.b.vel)),
    facing:Math.max(Math.abs(r.a.facing-z.a.facing),Math.abs(r.b.facing-z.b.facing)),spin:Math.max(Math.abs(r.a.spin-z.a.spin),Math.abs(r.b.spin-z.b.spin)),
    material:norm(r.material,z.material),point:norm(r.point,z.point),foot:norm(r.footOffset,z.footOffset),legs:Math.abs(r.legs-z.legs),hold:Math.abs(r.hold-z.hold),
    impulse:norm(r.impulse,z.impulse),moment:norm(r.moment,z.moment),angularImpulse:Math.max(...r.angularImpulse.map((v:number,i:number)=>Math.abs(v-z.angularImpulse[i]))),
    angularMoment:Math.max(...r.angularMoment.map((v:number,i:number)=>Math.abs(v-z.angularMoment[i]))),
    bodyWork:Math.abs(r.bodyWork-z.bodyWork),motorWork:Math.abs(r.motorWork-z.motorWork),passiveWork:Math.abs(r.passiveWork-z.passiveWork)};
  const normalized=Math.max(error.position/5e-7,error.velocity/2.5e-5,error.facing/2.5e-6,error.spin/2.5e-4,
    error.material/5e-7,error.point/5e-7,error.foot/5e-7,error.legs/1e-6,error.hold/5e-7,error.bodyWork/.01,error.motorWork/.01,error.passiveWork/.01);
  return {error,normalized,matches:normalized<=1&&r.slipping===z.slipping};
}
for(const c of fixture.cases)for(const integration of ['uniform','adaptive'] as const) {
  if(!c.physical||!c.convergence.converged)throw Error('Untrusted reference');
  const input=structuredClone(c.input),saved=structuredClone(input),r=boundedGripInterval(input,integration);deepStrictEqual(input,saved);
  rows.push({id:c.id,integration,result:r,...compare(r,c.reference)});
}
if(rows.some(r=>!r.matches))throw Error('Accuracy blocker; dependent cost work stopped');
const prototype:any=World.prototype,feet=prototype.feet;
function sample(c:any,mode:'midpoint'|'resolved'|'uniform'|'adaptive') {
  if(mode==='uniform'||mode==='adaptive') {
    const input=structuredClone(c.input),start=performance.now(),result=boundedGripInterval(input,mode),seconds=(performance.now()-start)/1000;
    deepStrictEqual(input,c.input);return {seconds,result,...compare(result,c.reference)};
  }
  const v=prepareBoundedCase(boundedCases.find(p=>p.packetId+(p.offset?'-offset':'-acquired')===c.id)!);
  deepStrictEqual(v.input,c.input);v.w.gripTiming=mode;
  const before={work:v.p.args[5].work.grasps,motor:v.p.args[5].supportMotorWork[v.ib],passive:v.p.args[5].passiveGraspWork,
    dose:v.joint.force??0,contact:v.p.args[5].work.contacts,ground:structuredClone(v.p.args[5].groundImpulse)};
  const start=performance.now();v.w.integrateSubstep(...v.p.args);const seconds=(performance.now()-start)/1000,
    a=v.particle(v.joint.a),b=v.particle(v.joint.b),input=v.input,H=input.duration;
  if(v.p.args[5].work.contacts!==before.contact||v.p.args[5].groundImpulse.some((g:any,i:number)=>norm(g,before.ground[i])>0)
    ||v.joint.broken||v.joint.a.support.state!=='up'||v.joint.b.support.state!=='up')throw Error('Benchmark left mechanical scope');
  const result={a,b,material:{...v.attachment.material},footOffset:{...v.attachment.foot.offset},point:v.w.graspPoint(v.joint),
    legs:v.joint.legs,hold:v.joint.hold,slipping:v.joint.slipping??false,
    impulse:{x:(b.vel.x-input.b.vel.x)*b.mass,y:(b.vel.y-input.b.vel.y)*b.mass},
    moment:{x:(b.pos.x-input.b.pos.x-input.b.vel.x*H)*b.mass,y:(b.pos.y-input.b.pos.y-input.b.vel.y*H)*b.mass},
    angularImpulse:[a,b].map((p,i)=>(p.spin-[input.a,input.b][i].spin)*p.inertia),
    angularMoment:[a,b].map((p,i)=>(p.facing-[input.a,input.b][i].facing-[input.a,input.b][i].spin*H)*p.inertia),
    bodyWork:v.p.args[5].work.grasps-before.work,motorWork:v.p.args[5].supportMotorWork[v.ib]-before.motor,
    passiveWork:v.p.args[5].passiveGraspWork-before.passive,dose:(v.joint.force??0)-before.dose,
    integration:v.p.args[5].gripTiming??null};
  if(sha(v.bytes)!==v.checksum)throw Error('Input bytes mutated');
  return {seconds,result,...compare(result,c.reference)};
}
try {
  prototype.feet=prescribeBoundedSupport(feet);
  for(const id of ['patch-45-8-0-3001-1-acquired','patch-45-8-0-3001-1-offset','patch-0-3-0-3001-1-acquired']) {
    const c=fixture.cases.find((c:any)=>c.id===id);
    for(const mode of ['midpoint','resolved','uniform','adaptive'] as const) {
      sample(c,mode);const samples=Array.from({length:7},()=>sample(c,mode)),endpoint=JSON.stringify(samples[0].result);
      if(samples.some(s=>JSON.stringify(s.result)!==endpoint))throw Error('Identical input changed endpoint');
      const times=samples.map(s=>s.seconds).sort((a,b)=>a-b);
      bench.push({id,mode,seconds:{median:times[3],p95:times[6],maximum:times[6],samples:samples.map(s=>s.seconds)},
        endpoint:samples[0].result,comparison:{error:samples[0].error,normalized:samples[0].normalized,matches:samples[0].matches}});
      console.log(JSON.stringify({id,mode,medianMs:times[3]*1000,maxMs:times[6]*1000,matches:samples[0].matches}));
    }
  }
}finally{prototype.feet=feet;}
if(sourceVersion()!==source||files.some(p=>sha(readFileSync(p))!==hashes[p]))throw Error('Collection bytes changed');
mkdirSync(root,{recursive:true});writeFileSync(`${root}/evidence.json`,JSON.stringify({source,commit,baseline:fixture.baseline,flags,
  node:process.version,cpu:cpus()[0].model,hashes,rows,bench,prototypeRestored:prototype.feet===feet,
  protocol:{serial:true,repetitions:7,warmups:1,noObserversOrProfilers:true,restoreOutsideClock:true,
    prescribedSupport:'prototype hook inherited by all scratch/live Worlds',scope:fixture.scope},
  retained:{firstReference:'reference-32768-65536.json',offsetRefinement:'reference-262144-524288.json',
    initialUniform:'uniform-candidate.json',rejectedAdaptiveKernel:'kernel-adaptive-first.ts',
    adaptiveCorrection:'Impulse-ledger delta kinetic energy avoids subtracting large energies/tiny rounded velocity differences. Independently integrated work and global gates unchanged.'}},null,2));
