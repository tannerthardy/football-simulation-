import {createHash} from 'node:crypto';
import {readFileSync,readdirSync,mkdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {gzipSync} from 'node:zlib';
const root='/workspace/football-simulation-';
const hash=(x:unknown)=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
function source(base:string){const files=(dir:string):string[]=>readdirSync(join(base,dir),{withFileTypes:true})
 .flatMap(e=>e.isDirectory()?files(join(dir,e.name)):[join(dir,e.name)]).sort();
 const h=createHash('sha256');for(const f of files('src'))h.update(f).update('\0').update(readFileSync(join(base,f))).update('\0');return h.digest('hex');}
const cases=[
 {id:'Split-Over-L-S11',run:'split_zone',front:'over',flip:true,seed:11,group:'retained'},
 {id:'Split-Over-R-S11',run:'split_zone',front:'over',flip:false,seed:11,group:'mirror'},
 {id:'IZ-Over-L-S3',run:'iz_strong',front:'over',flip:true,seed:3,group:'ordinary'},
 {id:'IZ-Over-R-S3',run:'iz_strong',front:'over',flip:false,seed:3,group:'ordinary'},
];
const rows:any[]=[];
for(const [phase,base,expected] of [
 ['baseline',join(root,'out/tackle-breakthrough/baseline-source'),'178751b67048eeaa91741090a4a19e43c108add8c5f1c5e0a586c09d57b3402c'],
 ['v3',join(root,'out/tackle-breakthrough/candidate-v3-source'),'030e0f3fb252f4c63ecbb81c8c7544728a6c54b2fa91c5827689ea1fb6e7cdeb'],
]){
 const before=source(base);if(before!==expected)throw Error('Unexpected archive source');
 const imp=(p:string)=>import(pathToFileURL(join(base,p)).href);
 const [{Rng},{generateTeam,pickOffense,pickDefense},{RUN_BY_ID},{COVERAGE_BY_ID,FRONT_BY_ID},{FORMATION_BY_ID},{PlaySim},{CENTER_Y},
  {spaceTeammates},{previewFreeMovement}]=await Promise.all([imp('src/core/rng.ts'),imp('src/league/team.ts'),imp('src/playbook/concepts.ts'),
   imp('src/playbook/defense.ts'),imp('src/playbook/formations.ts'),imp('src/sim/playsim.ts'),imp('src/core/field.ts'),
   imp('src/sim/spacing.ts'),imp('src/physics/movement-preview.ts')]);
 const off=generateTeam(new Rng(31),'Panel offense 1','O1',{strength:.55}),def=generateTeam(new Rng(32),'Panel defense 1','D1',{strength:.55});
 for(const input of cases){
  const formation=FORMATION_BY_ID[input.run==='split_zone'?'gun_wing_12':'ace_11'],personnel=FRONT_BY_ID[input.front].personnel[0];
  const make=()=>new PlaySim({offense:pickOffense(off,formation.personnel),defense:pickDefense(def,personnel),
   offCall:{formation,flip:input.flip,kind:'run',run:RUN_BY_ID[input.run],label:input.id},
   defCall:{personnel,front:FRONT_BY_ID[input.front],coverage:COVERAGE_BY_ID.cover3,pressure:null,label:input.id},
   los:40,ballY:CENTER_Y,firstDownX:50,seed:input.seed,record:false});
  const sim=make(),actor=sim.slot('FS')!,steps:any[]=[];let reads:any[]=[];
  const tick=sim.tick,see=sim.see,step=sim.world.step;
  sim.tick=function(){reads=[];return tick.call(this);};
  sim.see=function(a:any,b:any,...rest:any[]){const picture=see.call(this,a,b,...rest);
   if(a===actor&&b.team===a.team)reads.push({target:b.slot,image:structuredClone(picture)});return picture;};
  sim.world.step=function(intents:any,dt:number){
   if(sim.t>=2&&sim.t<=4.05){
    const ownJoints=sim.world.joints.filter((j:any)=>(j.a===actor.body||j.b===actor.body)&&(j.kind!=='grasp'||!j.broken));
    steps.push({t:sim.t,carrier:sim.carrier?.slot??null,carrierPos:sim.carrier?{...sim.carrier.pos}:null,
     body:structuredClone(actor.body),raw:structuredClone(sim.cmds[actor.idx]),held:structuredClone(intents[actor.idx]),
     engaged:!!actor.engagement,ownJoints:ownJoints.map((j:any)=>j.kind),
     ownContacts:(sim.lastStep?.contacts??[]).filter((c:any)=>c.i===actor.idx||c.j===actor.idx),
     peers:sim.defense.filter((a:any)=>a!==actor).map((a:any)=>({slot:a.slot,body:structuredClone(a.body),
      raw:structuredClone(sim.cmds[a.idx]),held:structuredClone(intents[a.idx]),engaged:!!a.engagement})),reads:structuredClone(reads)});
   }
   return step.call(this,intents,dt);
  };
  const result=sim.run();sim.tick=tick;sim.see=see;sim.world.step=step;
  const signature=(s:any,r:any)=>hash({result:{...r,frames:undefined,telemetry:undefined},bodies:s.agents.map((a:any)=>a.body),intents:s.intents,rng:{...s.rng}});
  const plain=make(),plainResult=plain.run();if(signature(sim,result)!==signature(plain,plainResult))throw Error('Observation changed execution');
  for(const s of steps){
   const a=Object.assign(Object.create(Object.getPrototypeOf(actor)),actor,{body:structuredClone(s.body),engagement:s.engaged?{}:null});
   const peers=sim.defense.filter((b:any)=>b!==actor),last=new Map(s.reads.map((r:any)=>[r.target,r.image]));
   const picture=(observer:any,b:any)=>{const image=last.get(b.slot);if(!image)throw Error(`Missing peer picture ${b.slot}`);return image;};
   if(last.size!==peers.length||s.engaged||s.ownJoints.length||s.ownContacts.length){s.forecasts=null;s.reconstructionMatches=null;s.reconstructionScope='excluded: missing pictures or contact layer';continue;}
   const scalar=[structuredClone(s.raw),...peers.map(()=>undefined)];spaceTeammates([a,...peers],scalar,picture);
   s.scalar=scalar[0];
   const constrained=s.ownJoints.length||s.ownContacts.length?new Set([a.body]):new Set();
   const reconstructed=[structuredClone(s.raw),...peers.map(()=>undefined)];spaceTeammates([a,...peers],reconstructed,picture,{now:s.t,constrained});
   s.reconstructionMatches=hash(reconstructed[0])===hash(s.held);
   const support=s.body.support;
   const available=!s.engaged&&!s.ownJoints.length&&!s.ownContacts.length&&support?.state==='up'&&!support.foot&&!support.strike
    &&Math.hypot(support.lean.x,support.lean.y)<=1e-6&&Math.hypot(support.load.x,support.load.y)<=1e-6
    &&!s.raw.free&&!s.raw.dive&&!s.raw.lunge&&(s.raw.push??0)<=0&&(s.raw.squeeze??0)<=0&&(s.body.squeeze??0)<=0;
   if(!available){s.forecasts=null;continue;}
   function clearance(samples:any[],peer:any,touch:number){
    let previous={x:s.body.pos.x-peer.pos.x,y:s.body.pos.y-peer.pos.y},minimum=Math.hypot(previous.x,previous.y)-touch,at=0;
    for(const p of samples){const r={x:p.pos.x-peer.pos.x-peer.vel.x*p.t,y:p.pos.y-peer.pos.y-peer.vel.y*p.t};
     const ex=r.x-previous.x,ey=r.y-previous.y,k=Math.max(0,Math.min(1,-(previous.x*ex+previous.y*ey)/Math.max(1e-12,ex*ex+ey*ey)));
     const distance=Math.hypot(previous.x+ex*k,previous.y+ey*k)-touch;if(distance<minimum){minimum=distance;at=p.t-.05+.05*k;}
     previous=r;}
    return{clearance:minimum,at};
   }
   s.forecasts=[];
   for(const [name,fraction] of [['raw',1],['scalar',1],['three-quarter',.75],['half',.5],['quarter',.25],['stop',0],['held',1]] as [string,number][]){
    const cmd=structuredClone(name==='raw'?s.raw:name==='held'?s.held:s.scalar);cmd.vel.x*=fraction;cmd.vel.y*=fraction;
    const samples=previewFreeMovement(a.body,cmd,s.t,12);
    const clearances=[...last].map(([slot,p]:[string,any])=>({slot,...clearance(samples,p,.9*(s.body.profile.radius+peers.find((b:any)=>b.slot===slot).profile.radius))}));
    s.forecasts.push({name,command:cmd,upright:samples.every((p:any)=>p.support==='up'),end:samples.at(-1),
     worst:Math.min(...clearances.map((p:any)=>p.clearance)),clearances,samples});
   }
  }
  rows.push({phase,input,source:before,observerVerified:true,result,steps});
  process.stdout.write(JSON.stringify({phase,id:input.id,gain:result.offenseYards,observerVerified:true,
   stops:steps.filter(s=>Math.hypot(s.held.vel.x,s.held.vel.y)<.01&&Math.hypot(s.raw.vel.x,s.raw.vel.y)>2).length,
   reconstructionMismatches:steps.filter(s=>s.reconstructionMatches===false).length})+'\n');
 }
 if(source(base)!==before)throw Error('Archive source changed');
}
const path=join(root,'out/tackle-breakthrough/review/spacing-boundary.json.gz');mkdirSync(join(root,'out/tackle-breakthrough/review'),{recursive:true});
writeFileSync(path,gzipSync(JSON.stringify({schema:'spacing-boundary-review-v1',
 scope:'Two phases of one retained Split escape and its native mirror, plus two ordinary Inside Zone mirrors. No population-rate claim. Existing consumed peer pictures only; offline forecasts are counterfactual held commands in empty World, not native future outcomes.',rows})));
process.stdout.write(path+'\n');
