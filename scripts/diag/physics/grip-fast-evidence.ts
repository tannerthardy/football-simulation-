/** Accuracy collection only. Native policies are paired by initial inputs;
 * held replays additionally freeze issued intents and grip-capacity commands.
 * Runtime benchmarks use a separate entry point without these observers.
 */
import { readFileSync,writeFileSync,mkdirSync } from 'node:fs';
import { serialize,deserialize } from 'node:v8';
import { createHash } from 'node:crypto';
import { World } from '../../../src/physics/world.js';
import { rep,type Cell } from '../tackle/panel.js';
import { sourceVersion } from '../../source-version.js';
type Private=any;
const root='out/grip-fast', source=sourceVersion();mkdirSync(root,{recursive:true});
const base=JSON.parse(readFileSync('out/grip-timing/baseline.json','utf8'));
const slow=JSON.parse(readFileSync('out/grip-timing/candidate.json','utf8'));
const profile=JSON.parse(readFileSync('config/baseline.json','utf8'));
const flags=Object.fromEntries(Object.keys(profile.flags).map(k=>[k,process.env[k]??null]));
if(JSON.stringify(flags)!==JSON.stringify(base.flags)) throw Error('Flag mismatch');
const hash=(x: unknown)=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const pose=(w:Private)=>[6,15].map(i=>({i,pos:{...w.bodies[i].pos},vel:{...w.bodies[i].vel},
  facing:w.bodies[i].facing,spin:w.bodies[i].spin??0,energy:w.bodies[i].energy,support:structuredClone(w.bodies[i].support)}));

if(process.argv.includes('--long')) {
  const input=base.inputs.find((i:Private)=>i.id==='patch-45-8-0-3001-1'), original=World.prototype.step;
  const native: Private[]=[], tapes:Private[]=[];
  for(const n of [12,96]) {
    let saved:Private, entries:Private[]=[];
    World.prototype.step=function(intents,dt) {
      // Production pursuit also creates one-body movement previews. They are
      // separate scratch worlds, not samples from this 22-player native rep.
      if(this.bodies.length!==22) return original.call(this,intents,dt);
      const w=this as Private, before=pose(w),commands=w.joints.map((j:Private)=>({kind:j.kind,capacity:j.capacity,pull:j.pull}));
      if(!saved && w.joints.some((j:Private)=>j.kind==='grasp'&&!j.broken)) {
        const f={...w};delete f.attachments;
        saved=structuredClone({fields:f,attachments:w.joints.map((j:Private)=>[j,w.attachments.get(j)]).filter((p:Private)=>p[1])});
      }
      if(saved) entries.push({time:w.time,dt,intents:structuredClone(intents),commands:structuredClone(commands)});
      const r=original.call(this,intents,dt);
      native.push({n,time:w.time,before,after:pose(w),commands,grips:w.joints.map((j:Private)=>({capacity:j.capacity,
        legs:j.legs,hold:j.hold,broken:j.broken??false,slipping:j.slipping??false})),integration:r.gripTiming});
      return r;
    };
    let result;
    try{result=rep(input.cell,input.side,input.seed,{handContact:'patch',substeps:n,gripTiming:'resolved'});}
    finally{World.prototype.step=original;}
    const packet={...saved,entries,n,source,flags,input};
    writeFileSync(`${root}/long-${n}.bin`,serialize(packet));tapes.push({n,result,frames:entries.length});
    console.log(JSON.stringify({longNative:n,result}));
  }
  writeFileSync(`${root}/long-native.json`,JSON.stringify({source,flags,input,native,tapes},null,2));
  // Same acquired world, same 96-step input tape. Separate grip-control
  // feedback from evolution caused by physical partitioning itself.
  const tape=deserialize(readFileSync(`${root}/long-96.bin`));
  for(const mode of ['resolved','fast'] as const) for(const n of [12,96]) for(const controls of [false,true]) {
    const p=structuredClone(tape),w:Private=Object.assign(Object.create(World.prototype),p.fields);
    w.attachments=new WeakMap(p.attachments);w.substeps=n;w.gripTiming=mode;
    const rows:Private[]=[];
    for(const e of p.entries) {
      if(controls) for(let k=0;k<e.commands.length;k++) if(w.joints[k]?.kind==='grasp') {
        w.joints[k].capacity=e.commands[k].capacity;w.joints[k].pull=e.commands[k].pull;
      }
      const r=w.step(e.intents,e.dt); rows.push({time:w.time,bodies:pose(w),integration:r.gripTiming});
    }
    writeFileSync(`${root}/long-${mode}-${n}-${Number(controls)}.json`,JSON.stringify({source,flags,n,mode,controls,rows},null,2));
    console.log(JSON.stringify({held:mode,n,controls,end:rows.at(-1)!.bodies.map((b:Private)=>({i:b.i,pos:b.pos,state:b.support.state}))}));
  }
} else {
  const fresh:Private[]=[
    {name:'new frontal',cell:{angle:0,speed:3,cut:false,difficulty:'ordinary'} as Cell,seed:6109,mode:'patch'},
    {name:'new angled',cell:{angle:70,speed:6,cut:false,difficulty:'difficult'} as Cell,seed:6109,mode:'patch'},
    {name:'new rear',cell:{angle:135,speed:6,cut:false,difficulty:'difficult'} as Cell,seed:6109,mode:'patch'},
  ].flatMap(i=>([1,-1] as const).map(side=>({...i,side,id:`fresh-${i.cell.angle}-${i.seed}-${side}`})));
  const baseline=process.argv.includes('--baseline'), onlyFresh=process.argv.includes('--fresh');
  const inputs=onlyFresh?fresh:base.inputs, rows:Private[]=[];
  for(const input of inputs) for(const n of [12,96]) {
    const mode=baseline?'midpoint':process.argv.includes('--slow')?'resolved':'fast';
    const stats={trials:0,intervals:0,limited:0,fallbacks:0,commits:0,eventSplits:0,workResidual:0,
      passiveWork:0,armExcess:0,supportExcess:0};
    const step=World.prototype.step;
    World.prototype.step=function(intents,dt) {
      const r=step.call(this,intents,dt),g=r.gripTiming;
      if(g) for(const k of ['trials','intervals','limited','fallbacks','commits','eventSplits'] as const) stats[k]+=g[k]??0;
      stats.workResidual=Math.max(stats.workResidual,Math.abs(r.work.residual));stats.passiveWork=Math.max(stats.passiveWork,r.passiveGraspWork);
      this.bodies.forEach((_,i)=>{stats.armExcess=Math.max(stats.armExcess,r.armImpulse[i]-r.armImpulseLimit[i],r.armWork[i]-r.armWorkLimit[i]);
        stats.supportExcess=Math.max(stats.supportExcess,r.supportMotorWork[i]-r.supportMotorWorkLimit[i]);});return r;
    };
    let result;const start=performance.now();
    try{result=rep(input.cell,input.side,input.seed,{handContact:input.mode,substeps:n,gripTiming:mode});}
    finally{World.prototype.step=step;}
    const row={id:input.id,n,mode,result,stats,seconds:(performance.now()-start)/1000};rows.push(row);console.log(JSON.stringify(row));
  }
  const filename=`${onlyFresh?'fresh':'matched'}-${baseline?'baseline':process.argv.includes('--slow')?'slow':'fast'}`;
  writeFileSync(`${root}/${filename}.json`,JSON.stringify({source,flags,inputs,inputManifest:hash(inputs),baseline:base.baseline,
    referenceSource:slow.source,rows},null,2));
}
if(sourceVersion()!==source) throw Error('Source changed during collection');
