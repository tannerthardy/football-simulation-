/** One saved mechanical witness and one opposing control. No new snaps,
 * World law edits or production insertion. Raw results remain in out/.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { deserialize } from 'node:v8';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { cpus } from 'node:os';
import { World, CONTACT_SCALE } from '../../../src/physics/world.js';
import { ARM_SPEED } from '../../../src/physics/actuation.js';
import { sourceVersion } from '../../source-version.js';
import { frozenInterval } from './contact-foundations.js';
import { dryGripInterval, type DryGripInput, type Particle } from './grip-force-interval.js';

const root='out/grip-force-feasibility';mkdirSync(root,{recursive:true});
const base=JSON.parse(readFileSync('out/grip-timing/baseline.json','utf8'));
const old=JSON.parse(readFileSync('out/grip-timing/candidate.json','utf8'));
const profile=JSON.parse(readFileSync('config/baseline.json','utf8'));
const flags=Object.fromEntries(Object.keys(profile.flags).map(k=>[k,process.env[k]??null]));
const sha=(bytes:Uint8Array|string)=>createHash('sha256').update(bytes).digest('hex');
if(JSON.stringify(flags)!==JSON.stringify(base.flags))throw Error('Flags differ');
const source=sourceVersion(),duration=.05/12,rows:any[]=[];
const restore=(bytes:Buffer)=>{
  const p=structuredClone(deserialize(bytes)),w:any=Object.assign(Object.create(World.prototype),p.fields);
  w.attachments=new WeakMap(p.attachments);return {p,w};
};
function load(id:string) {
  const bytes=readFileSync(`out/grip-timing/${id}.bin`),checksum=sha(bytes);
  if(checksum!==base.checkpoints.find((c:any)=>c.id===id).checksum)throw Error('Input packet differs');
  const {p,w}=restore(bytes),joint=w.joints[0],attachment=w.attachments.get(joint);
  if(w.joints.length!==1||joint.kind!=='grasp'||joint.brace!==undefined||!attachment?.material
    ||Math.hypot(attachment.material.x,attachment.material.y)>0||attachment.foot.mobility!==0
    ||w.pending.length)throw Error('Unsupported mechanical witness');
  const particle=(b:any):Particle=>({mass:b.profile.massKg,inertia:w.inertia[w.indexOf(b)],
    pos:{...b.pos},vel:{...b.vel},facing:b.facing,spin:b.spin??0});
  const input:DryGripInput={a:particle(joint.a),b:particle(joint.b),capacity:w.gripCapacity(joint),duration,
    minimumDistance:CONTACT_SCALE*(joint.a.profile.radius+joint.b.profile.radius),reach:joint.reach,
    pullSpeed:Math.min(ARM_SPEED,joint.pull??0)};
  return {bytes,checksum,p,w,input,a:w.indexOf(joint.a),b:w.indexOf(joint.b)};
}
const norm=(x:any,y:any)=>Math.hypot(x.x-y.x,x.y-y.y);
const energy=(b:Particle)=>.5*b.mass*(b.vel.x*b.vel.x+b.vel.y*b.vel.y)+.5*b.inertia*b.spin*b.spin;
const angular=(b:Particle)=>b.mass*(b.pos.x*b.vel.y-b.pos.y*b.vel.x)+b.inertia*b.spin;
for(const id of ['patch-45-8-0-3001-1','patch-45-8-0-3001--1','patch-0-3-0-3001-1']) {
  const c=load(id),started=performance.now(),kernel=dryGripInterval(c.input),seconds=(performance.now()-started)/1000;
  // Exact previously saved fine witness is reused; only the frontal opposing
  // interval is newly run. Those World primitives have not changed since 8e.
  const cached=old.frozen.find((r:any)=>r.id===id&&r.variant==='grip-only');
  const reference=cached?.reference??frozenInterval(c.p,4096,'grip-only',duration);
  if(reference.rows.some((r:any)=>r.mobility!==0||r.normalImpulse!==0||r.capacity!==c.input.capacity)
    ||reference.end.some((b:any)=>b.state!=='up'))throw Error('Reference outside dry kernel scope');
  const result=[{i:c.a,body:kernel.a},{i:c.b,body:kernel.b}],errors=result.map(({i,body})=>{
    const ref=reference.end[c.p.args[0].indexOf(i)];return {i,position:norm(body.pos,ref.pos),velocity:norm(body.vel,ref.vel),
      facing:Math.abs(body.facing-ref.facing),spin:Math.abs(body.spin-ref.spin)};
  });
  const sums=reference.rows.reduce((s:any,r:any)=>{
    const x=-r.normal.y*r.tangentImpulse,y=r.normal.x*r.tangentImpulse,t=duration-(r.t-c.p.fields.time+r.h/2),a=-r.arms[0]*r.tangentImpulse;
    s.impulse.x+=x;s.impulse.y+=y;s.moment.x+=t*x;s.moment.y+=t*y;s.angularImpulse+=a;s.angularMoment+=t*a;return s;
  },{impulse:{x:0,y:0},moment:{x:0,y:0},angularImpulse:0,angularMoment:0});
  const workResidual=energy(kernel.a)+energy(kernel.b)-energy(c.input.a)-energy(c.input.b)-kernel.work;
  const angularResidual=angular(kernel.a)+angular(kernel.b)-angular(c.input.a)-angular(c.input.b);
  const accounting={workResidual,angularResidual,representationError:kernel.representationError,
    forceDoseExcess:kernel.dose-c.input.capacity*duration,passiveWork:kernel.work,normalImpulse:0,
    armWork:0,supportMotorWork:0,attachmentPositionError:errors.find(r=>r.i===c.b)!.position};
  const row={id,checksum:c.checksum,input:c.input,reference:{cached:!!cached,source:cached?old.source:source,partitions:4096},
    kernel,errors,accounting,impulseError:norm(kernel.impulse,sums.impulse),momentError:norm(kernel.moment,sums.moment),
    angularImpulseError:Math.abs(kernel.angularImpulse-sums.angularImpulse),angularMomentError:Math.abs(kernel.angularMoment-sums.angularMoment),seconds};
  rows.push(row);console.log(JSON.stringify({id,errors,accounting,partitions:kernel.partitions,evaluations:kernel.evaluations}));
}
// Benchmark the witness only, with no observers/profiler in the timed World.
// Restore/construct outside clocks; repeated inputs and bytes are immutable.
const c=load('patch-45-8-0-3001-1'),bench:any[]=[];
for(const mode of ['resolved','kernel'] as const) {
  const samples=[];let end:any;
  for(let k=-1;k<7;k++) {
    if(mode==='resolved') {
      const {p,w}=restore(c.bytes);w.gripTiming='resolved';
      for(const i of p.args[0]){p.args[2][i].free=true;p.args[2][i].dive=null;}
      p.args[3]=duration;
      const start=performance.now();w.integrateSubstep(...p.args);const elapsed=(performance.now()-start)/1000;
      if(k>=0)samples.push(elapsed);end=[c.a,c.b].map(i=>w.bodies[i]);
    } else {
      const start=performance.now();end=dryGripInterval(c.input);const elapsed=(performance.now()-start)/1000;
      if(k>=0)samples.push(elapsed);
    }
    if(sha(c.bytes)!==c.checksum)throw Error('Serialized input mutated');
  }
  const sorted=samples.slice().sort((a,b)=>a-b);
  bench.push({mode,seconds:{median:sorted[3],p95:sorted[6],maximum:sorted[6],samples},end});
}
if(sourceVersion()!==source)throw Error('Runtime changed');
writeFileSync(`${root}/result.json`,JSON.stringify({source,commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),
  baseline:base.baseline,referenceCommit:'8e36cce80e138133acd6afc7aba0befc21d5a746',flags,node:process.version,cpu:cpus()[0].model,
  collectorSha256:sha(readFileSync(import.meta.filename)),kernelSha256:sha(readFileSync(new URL('./grip-force-interval.ts',import.meta.url))),
  worldOptions:{handContact:'patch',variant:'grip-only',duration},rows,bench},null,2));
console.log(JSON.stringify(bench.map(({mode,seconds})=>({mode,seconds}))));
