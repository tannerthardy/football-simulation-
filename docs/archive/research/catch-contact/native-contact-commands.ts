/** Read-only original-game-prefix observer. Captures existing calls only. */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { gzipSync } from 'node:zlib';
import { encodeBody } from './native-body-codec.mjs';
const [sourceArg, outArg, seedsArg] = process.argv.slice(2);
if (!sourceArg || !outArg) throw Error('Usage: native-contact-commands.ts SOURCE OUTPUT_DIRECTORY [comma-separated original game seeds]');
const source = resolve(sourceArg), out = resolve(outArg);
const expected = '0398418c6e8b8d53a1517a17f7087c697230ac62f12dd37373af2b6548bd1df7';
const sha = (x: string | Buffer) => createHash('sha256').update(x).digest('hex');
const hash = (x: any) => sha(JSON.stringify(x));
const clone = (x: any) => x === undefined ? undefined : JSON.parse(JSON.stringify(x));
function sourceSha() {
  const files = (d: string): string[] => readdirSync(d, {withFileTypes:true}).flatMap(e =>
    e.isDirectory() ? files(join(d,e.name)) : [join(d,e.name)]);
  const h=createHash('sha256');
  for (const f of files(join(source,'src')).map(f=>relative(source,f)).sort())
    h.update(f).update('\0').update(readFileSync(join(source,f))).update('\0');
  return h.digest('hex');
}
if(sourceSha()!==expected)throw Error('Frozen source mismatch');
const imp=(p:string)=>import(pathToFileURL(join(source,p)).href);
const {Rng}=await imp('src/core/rng.ts');
const {generateTeam}=await imp('src/league/team.ts');
const {Game}=await imp('src/game/game.ts');
const selection=JSON.parse(readFileSync('out/catch-contact-census/random-sample.json','utf8'));
const ids=[...selection.selectedIds,'S105-P159'];
const refs=[101,202].map(c=>JSON.parse(readFileSync(`out/pursuit-controller/combined-outcomes${c}.json`,'utf8')));
if(refs.some(r=>r.sourceBefore!==expected||r.sourceAfter!==expected))throw Error('Reference source mismatch');
const references=new Map(refs.flatMap(r=>r.plays.map((p:any)=>[p.id,p])));
const allSeeds=[...new Set(ids.map(id=>Number(id.match(/^S(\d+)/)![1])))].sort((a,b)=>a-b);
const seeds=seedsArg?seedsArg.split(',').map(Number):allSeeds;
if(seeds.some(s=>!allSeeds.includes(s)))throw Error('Only original selected seeds allowed');
mkdirSync(out,{recursive:true});
const tool=sha(readFileSync(import.meta.filename));
const clean=(r:any)=>({...r,frames:undefined,telemetry:undefined});
const signature=(s:any,r:any)=>hash({result:clean(r),bodies:s.agents.map((a:any)=>encodeBody(a.body)),
  intents:s.intents,minds:s.agents.map((a:any)=>a.mind),rng:{...s.rng}});
const copiedNext=(s:any)=>Object.assign(new Rng(0),s.rng).nextU32();
const snapshot=(a:any)=>({idx:a.idx,slot:a.slot,team:a.team,body:encodeBody(a.body),behavior:a.behavior.kind,
  behaviorClass:a.behavior.constructor.name,downUntil:a.downUntil,nextTackleAt:a.nextTackleAt,
  runFit:clone(a.runFit??null),engagement:a.engagement?{blocker:a.engagement.blocker.idx,
    defender:a.engagement.defender.idx,win:a.engagement.win}:null});
function observe(sim:any,id:string){
  const initial=hash({bodies:sim.agents.map((a:any)=>encodeBody(a.body)),rng:{...sim.rng},
    profiles:sim.agents.map((a:any)=>({idx:a.idx,player:a.player,profile:a.profile})),
    offCall:sim.offCall,defCall:sim.defCall,los:sim.los,ballY:sim.ballY,firstDownX:sim.firstDownX});
  const players=sim.agents.map((a:any)=>({idx:a.idx,slot:a.slot,team:a.team,player:a.player,profile:a.profile}));
  const pictures:any[]=[],commands:any[]=[],steps:any[]=[],catches:any[]=[],attempts:any[]=[],decisions:any[]=[];
  const holds:any[]=[],known=new Map<any,any>();
  const behaviors=new Map<any,PropertyDescriptor|undefined>();
  const properties:any[]=[];
  const original={see:sim.see,step:sim.world.step,event:sim.event,possess:sim.possess,updateBall:sim.updateBall,decide:sim.trace.decide};
  let active:any=null,airPrev:any=null;
  const enabled=()=>sim.ball.kind==='air'||sim.catchAt>=0;
  const noteHold=(j:any,d:any,c:any)=>{
    let row=known.get(j);if(row)return row;
    row={id:holds.length,createdAt:sim.t,defender:d.idx,carrier:c.idx,origin:j.origin??null,
      initialCapacity:j.capacity,initialQuality:sim.bond?.grip?.get(d)??null};
    known.set(j,row);holds.push(row);return row;
  };
  const discover=()=>{if(sim.bond)for(const[d,j]of sim.bond.holds??[])noteHold(j,d,sim.bond.carrier);};
  const holdState=()=>{discover();return [...known].map(([j,row])=>({id:row.id,defender:row.defender,carrier:row.carrier,
    force:j.force??0,nominalCapacity:j.capacity,effectiveCapacity:sim.world.gripCapacity(j),
    hold:j.hold,reach:j.reach,legs:j.legs,slipping:!!j.slipping,broken:!!j.broken,
    stillInWorld:sim.world.joints.includes(j),distance:Math.hypot(j.a.pos.x-j.b.pos.x,j.a.pos.y-j.b.pos.y),
    quality:sim.bond?.grip?.get(sim.agents[row.defender])??null}));};
  function wrap(b:any){
    if(behaviors.has(b))return;
    const own=Object.getOwnPropertyDescriptor(b,'update'),update=b.update;behaviors.set(b,own);
    b.update=function(a:any,s:any){
      if(!enabled())return update.call(this,a,s);
      const before:any={t:s.t,a:a.idx,slot:a.slot,kind:this.kind,behaviorClass:this.constructor.name,
        carrierBefore:s.carrier?.idx??null,ballBefore:s.ball.kind,catchAt:s.catchAt,
        bodyBefore:encodeBody(a.body),speedScale:a.speedScale,runFit:clone(a.runFit??null),
        ratings:Object.fromEntries(['tackling','pursuit','awareness','workRate'].map(k=>[k,a.r(k)])),
        bondTacklersBefore:s.bond?.tacklers.map((d:any)=>d.idx)??[],
        picturesFrom:pictures.length};
      const parent=active;active=before;let command:any;
      try{command=update.call(this,a,s);}finally{active=parent;}
      before.rawCommand=clone(command);before.picturesTo=pictures.length;commands.push(before);return command;
    };
  }
  for(const a of sim.agents){
    const descriptor=Object.getOwnPropertyDescriptor(a,'behavior');
    if(!descriptor||!('value'in descriptor)||!descriptor.configurable)throw Error('Unexpected behavior property');
    properties.push({a,descriptor});let current=a.behavior;wrap(current);
    Object.defineProperty(a,'behavior',{configurable:true,enumerable:descriptor.enumerable,
      get(){return current;},set(b){current=b;wrap(b);}});
  }
  sim.see=function(a:any,b:any,scale:any){
    const cue=original.see.call(this,a,b,scale);
    if(enabled())pictures.push({t:sim.t,a:a.idx,b:b.idx,actor:active?.a??null,
      controller:active?.behaviorClass??null,scale:scale??1,cue:clone(cue)});
    return cue;
  };
  sim.world.step=function(intents:any,dt:number){
    if(!enabled())return original.step.call(this,intents,dt);
    const before={t:sim.t,dt,carrier:sim.carrier?.idx??null,ball:sim.ball.kind,catchAt:sim.catchAt,
      rawCommands:clone(sim.cmds),appliedIntents:clone(intents),agents:sim.agents.map(snapshot),holds:holdState()};
    const report=original.step.call(this,intents,dt);
    steps.push({...before,report:clone(report),achievedAgents:sim.agents.map(snapshot),achievedHolds:holdState()});
    return report;
  };
  sim.updateBall=function(){
    airPrev=sim.ball.kind==='air'?clone(sim.ball.flight.pos):null;
    try{return original.updateBall.call(this);}finally{airPrev=null;}
  };
  sim.possess=function(a:any,how:any){
    let record:any=null;
    if(how==='catch')record={t:sim.t,catcher:a.idx,previousAir:clone(airPrev),
      currentAir:sim.ball.kind==='air'?clone(sim.ball.flight.pos):null,
      catcherPosition:clone(a.pos),profile:clone(a.profile),bodyBefore:encodeBody(a.body),
      flight:sim.ball.kind==='air'?clone(sim.ball.flight):null};
    const r=original.possess.call(this,a,how);
    if(record){record.bodyAfter=encodeBody(a.body);record.supportUnchanged=hash(record.bodyBefore)===hash(record.bodyAfter);catches.push(record);}
    return r;
  };
  sim.event=function(type:any,a:any,b:any,note:any){
    const r=original.event.call(this,type,a,b,note);
    if(enabled()&&['carrier_contact','tackle_wrap','missed_tackle','broken_tackle','hit','fall','tackle','touchdown'].includes(type)){
      discover();attempts.push({t:sim.t,type,a:a?.idx??null,b:b?.idx??null,note:note??null,
        agents:[a,b].filter(Boolean).map(snapshot),holds:holdState(),
        appliedIntents:[a,b].filter(Boolean).map((x:any)=>({idx:x.idx,intent:clone(sim.intents[x.idx])}))});
    }return r;
  };
  sim.trace.decide=function(choice:any){if(enabled()&&choice.kind==='tackle-opportunity')decisions.push(clone(choice));
    return original.decide.call(this,choice);};
  let result:any;
  try{result=sim.run();}finally{
    sim.see=original.see;sim.world.step=original.step;sim.event=original.event;
    sim.possess=original.possess;sim.updateBall=original.updateBall;sim.trace.decide=original.decide;
    for(const{a,descriptor}of properties)Object.defineProperty(a,'behavior',{...descriptor,value:a.behavior});
    for(const[b,own]of behaviors)if(own)Object.defineProperty(b,'update',own);else delete b.update;
  }
  const row={id,source:expected,toolSha256:tool,initialSha256:initial,executionSha256:signature(sim,result),
    nextCopiedRng:copiedNext(sim),players,result:clean(result),pictures,commands,steps,catches,attempts,decisions,holds};
  Object.defineProperty(row,'nativeRunResult',{value:result});return row;
}
const manifests:any[]=[];
for(const seed of seeds){
  const cohort=seed<200?101:202,reference=refs.find(r=>r.cohort.seed===cohort);
  const rng=new Rng(cohort),home=generateTeam(rng,'Ironmen','IRN',{strength:.55}),away=generateTeam(rng,'Comets','COM',{strength:.55});
  if(hash([home,away])!==reference.cohort.rosterSha256)throw Error('Roster mismatch');
  const selected=new Set(ids.filter(id=>id.startsWith(`S${seed}-`)));
  const lastIndex=Math.max(...[...selected].map(id=>references.get(id).index));
  const rows=new Map<string,any>(),plainRows=new Map<string,any>();
  function prefix(observed:boolean){
    let game:any;
    game=new Game(home,away,{seed,record:true,handContact:'center',hooks:{playResult(sim:any,kind:any){
      const id=`S${seed}-P${game.log.length+1}`;
      if(kind!=='scrimmage'||!selected.has(id))return undefined;
      if(observed){const row=observe(sim,id);rows.set(id,row);return row.nativeRunResult;}
      const initial=hash({bodies:sim.agents.map((a:any)=>encodeBody(a.body)),rng:{...sim.rng},
        profiles:sim.agents.map((a:any)=>({idx:a.idx,player:a.player,profile:a.profile})),
        offCall:sim.offCall,defCall:sim.defCall,los:sim.los,ballY:sim.ballY,firstDownX:sim.firstDownX});
      const result=sim.run();plainRows.set(id,{initialSha256:initial,executionSha256:signature(sim,result),nextCopiedRng:copiedNext(sim)});return result;
    }}});
    game.kickoffToStart();while(!game.state.over&&game.log.length<=lastIndex)game.step();
    return game.result();
  }
  const observed=prefix(true),plain=prefix(false);
  const trimmed=(game:any)=>game.log.map((p:any)=>({...p,replay:undefined}));
  if(hash(trimmed(observed))!==hash(trimmed(plain)))throw Error(`Prefix observer/plain changed ${seed}`);
  const gameRows:any[]=[];
  for(const id of selected){
    const row=rows.get(id),control=plainRows.get(id),ref=references.get(id);
    if(!row||!control)throw Error(`Selected ID not reproduced ${id}`);
    for(const key of ['initialSha256','executionSha256','nextCopiedRng'])if(row[key]!==control[key])throw Error(`${id} observer/plain ${key}`);
    const log=observed.log.find((p:any)=>p.index===ref.index);
    if(!log||hash(log.stats)!==hash(ref.stats)||hash(row.result.events)!==hash(ref.events)
      ||log.yards!==ref.yards||log.outcome!==ref.outcome||log.call!==ref.call||log.defense!==ref.defense)
      throw Error(`${id} original native reference mismatch`);
    const packet={...row,observerVerified:true,plainExecutionSha256:control.executionSha256,
      cohort,gameSeed:seed,nativeReference:ref,referenceExact:true};
    const path=join(out,`${id}.json.gz`);writeFileSync(path,gzipSync(JSON.stringify(packet),{level:6}),{flag:'wx'});
    const receipt={id,path,observerVerified:true,referenceExact:true,initialSha256:row.initialSha256,
      executionSha256:row.executionSha256,nextCopiedRng:row.nextCopiedRng,steps:row.steps.length,
      commands:row.commands.length,catches:row.catches.length,holds:row.holds.length,
      gain:ref.yards,nativeYac:ref.stats.yac,outcome:ref.outcome};
    gameRows.push(receipt);console.log(JSON.stringify(receipt));
  }
  const receipt={schema:'ordinary-contact-native-prefix-observer-v1',source:expected,sourceAfter:sourceSha(),toolSha256:tool,
    bodyCodecSha256:sha(readFileSync(new URL('./native-body-codec.mjs',import.meta.url))),
    gameSeed:seed,cohort,rosterSha256:reference.cohort.rosterSha256,
    selectionSha256:sha(readFileSync('out/catch-contact-census/random-sample.json')),
    retainedWitness:'S105-P159',prefixLastIndex:lastIndex,prefixNativePlays:observed.log.length,
    prefixObserverPlainExact:true,rows:gameRows,
    limits:['Original adaptive-game prefixes, not isolated reconstructed play setups.',
      'Snapshots are actual calls/returns; no extra see, behavior update, RNG draw or movement preview.',
      'Grip force is tick average; effectiveCapacity is at sampled boundary, not a claimed substep maximum.',
      'Catch exact air segment comes from ordinary updateBall and possess entry; held-ball height is not used.',
      'Selected clean offensive catches include ordinary negative/low gains and all subsequent possession events.']};
  if(receipt.sourceAfter!==expected)throw Error('Frozen source changed');
  writeFileSync(join(out,`manifest-${seed}.json`),JSON.stringify(receipt,null,2),{flag:'wx'});manifests.push(receipt);
}
console.log(JSON.stringify({source:expected,seeds,rows:manifests.flatMap(r=>r.rows).length,observerPlainVerified:true}));
