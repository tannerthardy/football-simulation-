/** Archived original-input catch/contact probe. No production imports.
 * Node22: node --import tsx pair-probe.ts BASELINE_SOURCE CANDIDATE_SOURCE OUTPUT
 * See README.md. Old used collector hashes remain historical evidence.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { gzipSync } from 'node:zlib';
import { encodeBody } from './native-body-codec.mjs';
const [baselineArg,candidateArg,outputArg]=process.argv.slice(2);
if(!baselineArg||!candidateArg||!outputArg||process.argv.length!==5)
  throw Error('Usage: pair-probe.ts BASELINE_SOURCE CANDIDATE_SOURCE OUTPUT_DIRECTORY');
const source=resolve(baselineArg),candidate=resolve(candidateArg),out=resolve(outputArg);
if([source,candidate].some(p=>out===p||out.startsWith(p+'/')))throw Error('Output must be outside source archives');
mkdirSync(out,{recursive:true});
const sha=(x:string|Buffer)=>createHash('sha256').update(x).digest('hex');
const hash=(x:any)=>sha(JSON.stringify(x));
const clone=(x:any)=>x===undefined?undefined:JSON.parse(JSON.stringify(x));
function sourceSha(root:string){const files=(d:string):string[]=>readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(join(d,e.name)):[join(d,e.name)]);
 const h=createHash('sha256');for(const f of files(join(root,'src')).map(f=>relative(root,f)).sort())h.update(f).update('\0').update(readFileSync(join(root,f))).update('\0');return h.digest('hex');}
const baselineSource=sourceSha(source),candidateSource=sourceSha(candidate);
if(baselineSource!=='0398418c6e8b8d53a1517a17f7087c697230ac62f12dd37373af2b6548bd1df7')throw Error('Baseline pin mismatch');
let expected=baselineSource;
const imp=(root:string,p:string)=>import(pathToFileURL(join(root,p)).href);
const {Rng}=await imp(source,'src/core/rng.ts');
const {generateTeam}=await imp(source,'src/league/team.ts');
const {Game}=await imp(source,'src/game/game.ts');
const tool=sha(readFileSync(import.meta.filename));
const clean=(r:any)=>({...r,frames:undefined,telemetry:undefined});
const signature=(s:any,r:any)=>hash({result:clean(r),bodies:s.agents.map((a:any)=>encodeBody(a.body)),intents:s.intents,minds:s.agents.map((a:any)=>a.mind),rng:{...s.rng}});
const copiedNext=(s:any)=>Object.assign(new Rng(0),s.rng).nextU32();
const snapshot=(a:any)=>({idx:a.idx,slot:a.slot,team:a.team,body:encodeBody(a.body),behavior:a.behavior.kind,behaviorClass:a.behavior.constructor.name,
 downUntil:a.downUntil,nextTackleAt:a.nextTackleAt,runFit:clone(a.runFit??null),engagement:a.engagement?{blocker:a.engagement.blocker.idx,defender:a.engagement.defender.idx,win:a.engagement.win}:null});
const initialSha=(sim:any)=>hash({bodies:sim.agents.map((a:any)=>encodeBody(a.body)),rng:{...sim.rng},
 profiles:sim.agents.map((a:any)=>({idx:a.idx,player:a.player,profile:a.profile})),offCall:sim.offCall,defCall:sim.defCall,los:sim.los,ballY:sim.ballY,firstDownX:sim.firstDownX});
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
  const enabled=()=>true;
  const worldJoints=()=>sim.world.joints.map((j:any)=>({kind:j.kind,a:sim.world.bodies.indexOf(j.a),b:sim.world.bodies.indexOf(j.b),broken:!!j.broken,extension:j.extension,hold:j.hold,reach:j.reach,force:j.force}));
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
      controller:active?.behaviorClass??null,scale:scale??1,cue:clone(cue),
      actualReadContext:{worldTime:sim.world.time,body:encodeBody(a.body),mind:{focus:a.mind.focus,stress:a.mind.stress},heldCommand:clone(sim.intents[a.idx]),worldJoints:worldJoints(),lastStepActorContacts:sim.lastStep?.contacts.filter((h:any)=>h.i===a.idx||h.j===a.idx)??[]},
      site:(new Error().stack??'').split('\n').slice(1).filter((f:string)=>f.includes('/src/sim/tackle.')||f.includes('/src/sim/behaviors/')).map((f:string)=>f.trim()).slice(0,3)});
    return cue;
  };
  sim.world.step=function(intents:any,dt:number){
    if(!enabled())return original.step.call(this,intents,dt);
    const before={t:sim.t,dt,carrier:sim.carrier?.idx??null,ball:sim.ball.kind,catchAt:sim.catchAt,
      rawCommands:clone(sim.cmds),appliedIntents:clone(intents),agents:sim.agents.map(snapshot),holds:holdState(),worldJoints:worldJoints()};
    const report=original.step.call(this,intents,dt);
    steps.push({...before,report:clone(report),achievedAgents:sim.agents.map(snapshot),achievedHolds:holdState(),achievedWorldJoints:worldJoints()});
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

// Immutable nativeCD105pins, checked before candidate claims.
const knownNativePins={"S105-P121":{"initialSha256":"1dbaf51c2a92a18d615ee5f3a0f06300d721456a85e1c7629e7e68e8ed2ac6bd","executionSha256":"a15bc9bb698a9a77ee2ecd2e72527702964762b023a1f0f5145d7d3c05742f87","nextCopiedRng":3151239629,"inputSha256":"6df5928a3688f4eac59a084e8c64062570db143b57c7ea1c94b25a8e428b54b7"},"S105-P154":{"initialSha256":"56a9dbc21793b83b4743e4d94692bd3c63d0e7233bedd982002065e1846d2cde","executionSha256":"3b2d0a769d85eacd7eb8516795a862b635b3e817a391771ac4c5b8ff4a44ac4b","nextCopiedRng":2628307788,"inputSha256":"79c7c9b6cc319554688a1f61c55eae4625c694f68fd53e5106f016ba0b5c2982"},"S105-P159":{"initialSha256":"2273c62cde9b7425cdbfed37ef88fe9a3d572f95dfbf2101536f17c46a1fce4c","executionSha256":"a7e5d42c6c5644da95e1c7501422e4b8b745301cdf166588419c995653919e5d","nextCopiedRng":1334914682,"inputSha256":"6181e380c65929dd501897217060f468d022fdc56b2d92baf97369a3619a8edc"},"S105-P165":{"initialSha256":"2faa260f39896d29d97d5c293a142a38cf3a06de4e69b830eab1980a13d731cc","executionSha256":"9276a6142b315c6cd366e132759af10ea5dd7d1026ab330e730d3ae1fec2162d","nextCopiedRng":1292435314,"inputSha256":"7c892866bb76be138706af4ef3202e67d1614612e113fde61809c00b4576b441"}};
const ids=['S105-P121','S105-P154','S105-P159','S105-P165'];
const inputs=new Map<string,any>(),nativePins=new Map<string,any>();
const inputsPath=join(out,'exact-inputs.json');
const regeneratedInputs=!existsSync(inputsPath);
if(!regeneratedInputs){const saved=JSON.parse(readFileSync(inputsPath,'utf8'));if(saved.source!==baselineSource||hash(saved.ids)!==hash(ids)||Object.keys(saved.inputs).length!==4)throw Error('Captured inputs mismatch');for(const[id,v]of Object.entries(saved.inputs))inputs.set(id,v);for(const[id,v]of Object.entries(saved.nativePins))nativePins.set(id,v);}
else{
const rng=new Rng(101),home=generateTeam(rng,'Ironmen','IRN',{strength:.55}),away=generateTeam(rng,'Comets','COM',{strength:.55});
let game:any,lastOff:any,lastDef:any;
game=new Game(home,away,{seed:105,record:true,handContact:'center',hooks:{playResult(sim:any,kind:any){
 const id=`S105-P${game.log.length+1}`;if(kind!=='scrimmage'||!ids.includes(id))return undefined;
 const offSide=game.state.possession,defSide=offSide==='home'?'away':'home';
 const scouting=game.scouting[defSide],coverageScouting=game.coverageScouting[offSide];
 const setup={offense:Object.fromEntries(sim.offense.map((a:any)=>[a.slot,clone(a.player)])),defense:Object.fromEntries(sim.defense.map((a:any)=>[a.slot,clone(a.player)])),
   offCall:clone(lastOff),defCall:clone(lastDef.call),los:sim.los,ballY:sim.ballY,firstDownX:sim.firstDownX,
   seed:sim.rng.key,handContact:'center',record:true,recordLevel:undefined,energy:[...game.energy],
   manPrefs:clone(lastDef.prefs),hurry:sim.hurry,down:game.state.down,audibles:true,wind:clone(sim.wind),
   scouting:{strength:scouting.strength,cells:clone([...scouting.cells])},
   coverageScouting:clone(coverageScouting)};
 inputs.set(id,setup);const initial=initialSha(sim),result=sim.run();
 nativePins.set(id,{initialSha256:initial,executionSha256:signature(sim,result),nextCopiedRng:copiedNext(sim)});
 const saved=knownNativePins[id as keyof typeof knownNativePins];
 if(saved.initialSha256!==initial||saved.executionSha256!==signature(sim,result)||saved.nextCopiedRng!==copiedNext(sim))throw Error(`${id}: original-prefix capture changed`);
 return result;
}}});
for(const side of ['home','away']){
 const oc=game.oc[side],dc=game.dc[side],ocCall=oc.call,dcCall=dc.call;
 oc.call=function(...args:any[]){const r=ocCall.apply(this,args);lastOff=r;return r;};
 dc.call=function(...args:any[]){const r=dcCall.apply(this,args);lastDef=r;return r;};
}
game.kickoffToStart();while(!game.state.over&&game.log.length<=164)game.step();
writeFileSync(join(out,'exact-inputs.json'),JSON.stringify({schema:'original-native-play-setup-v1',source:baselineSource,
 toolSha256:tool,ids,inputs:Object.fromEntries(inputs),nativePins:Object.fromEntries(nativePins),
 limits:'Original actual coordinator returns, native seed key and fatigue/scouting before game writeback. No extra call/RNG. Classes and Map explicitly restored, no hidden checkpoint assumption.'},null,2),{flag:'wx'});
}
for(const id of ids){const saved=knownNativePins[id as keyof typeof knownNativePins],p=nativePins.get(id);
 if(!p||p.initialSha256!==saved.initialSha256||p.executionSha256!==saved.executionSha256||p.nextCopiedRng!==saved.nextCopiedRng
   ||hash(inputs.get(id))!==saved.inputSha256)throw Error(`${id}: saved input/native pin mismatch`);}
const receipts:any[]=[];
for(const id of ids){
 const setup=inputs.get(id),phases:any={};
 for(const[phase,root]of [['baseline',source],['candidate',candidate]]){
  const {PlaySim}=await imp(root,'src/sim/playsim.ts');const {ScoutingReport}=await imp(root,'src/sim/recognition.ts');const {CoverageScouting}=await imp(root,'src/sim/qbmind.ts');
  function make(){const raw=clone(setup),scout=new ScoutingReport(raw.scouting.strength),cs=new CoverageScouting(raw.coverageScouting.strength);
   scout.cells=new Map(raw.scouting.cells);Object.assign(cs,raw.coverageScouting);
   return new PlaySim({...raw,energy:new Map(raw.energy),scouting:scout,coverageScouting:cs});}
  expected=sourceSha(root);const sim=make(),initialMindSha256=hash(sim.agents.map((a:any)=>a.mind)),initialRngSha256=hash({...sim.rng}),row=observe(sim,id),plain=make(),plainInitial=initialSha(plain),plainInitialMind=hash(plain.agents.map((a:any)=>a.mind)),plainResult=plain.run();
  if(initialMindSha256!==plainInitialMind||row.initialSha256!==plainInitial||row.executionSha256!==signature(plain,plainResult)||row.nextCopiedRng!==copiedNext(plain))throw Error(`${id}/${phase}: observer parity`);
  if(row.initialSha256!==nativePins.get(id).initialSha256)throw Error(`${id}/${phase}: exact native initial changed`);
  if(phase==='baseline'&&row.executionSha256!==nativePins.get(id).executionSha256)throw Error(`${id}: direct baseline replay changed original`);
  const packet={...row,observerVerified:true,source:expected,phase,inputSha256:hash(setup),nativeInitialExact:true,
   baselineNativeExecutionExact:phase==='baseline',plainExecutionSha256:signature(plain,plainResult)};
  writeFileSync(join(out,`${id}-${phase}.json.gz`),gzipSync(JSON.stringify(packet),{level:6}),{flag:'wx'});
  phases[phase]={source:expected,initialSha256:row.initialSha256,initialMindSha256,initialRngSha256,executionSha256:row.executionSha256,
   observerVerified:true,nativeInitialExact:true,outcome:row.result.outcome,yards:row.result.offenseYards,yac:row.result.stats.yac,
   holds:row.holds.length,nextCopiedRng:row.nextCopiedRng};
 }
 if(phases.baseline.initialMindSha256!==phases.candidate.initialMindSha256||phases.baseline.initialRngSha256!==phases.candidate.initialRngSha256)throw Error(`${id}: source pair initial mind/RNG changed`);
 const r={id,inputSha256:hash(setup),phases};receipts.push(r);console.log(JSON.stringify(r));
}
if(sourceSha(source)!==baselineSource||sourceSha(candidate)!==candidateSource)throw Error('Frozen source changed');
writeFileSync(join(out,'receipt.json'),JSON.stringify({schema:'native-catch-contact-pair-probe-v1',baselineSource,candidateSource,toolSha256:tool,regeneratedInputs,
 bodyCodecSha256:sha(readFileSync(new URL('./native-body-codec.mjs',import.meta.url))),
 method:'Replayed exact original inputs in source-only pair, not current full-game P IDs. Original native baseline retained exactly; observed/plain execution and initial bodies/profiles/minds/RNG match.',
 receipts},null,2),{flag:'wx'});
