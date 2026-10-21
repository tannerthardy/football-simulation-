/** Outcome-selected native Game-prefix witnesses. No controller counterfactual.
 * Only target records full telemetry; all earlier snaps run ordinary unchanged Game.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { gzipSync, gunzipSync } from 'node:zlib';
import { EXPECTED, sha, fileSha, sourceSha, canonical, snapshot, rawResult, stripReplay } from './common.js';
const [archiveArg,indexArg,outArg,...targets]=process.argv.slice(2);
if(!archiveArg||!indexArg||!outArg||!targets.length)throw Error('Usage: selected-native.ts ARCHIVE INDEX OUTPUT_DIR G1-P077 ...');
const archive=resolve(archiveArg),indexPath=resolve(indexArg),output=resolve(outArg);
if(sourceSha(archive)!==EXPECTED)throw Error('Source pin mismatch');
const index=JSON.parse(gunzipSync(readFileSync(indexPath)).toString());
if(index.sourceBefore!==EXPECTED||index.sourceAfter!==EXPECTED)throw Error('Input source mismatch');
const {Rng}=await import(pathToFileURL(join(archive,'src/core/rng.ts')).href);
const {Game}=await import(pathToFileURL(join(archive,'src/game/game.ts')).href);
mkdirSync(output,{recursive:true});
function fullState(sim:any){
  return {...snapshot(sim,Rng), context:canonical(sim,Object.fromEntries(['offCall','defCall','offAlign','defAlign','isPass','hurry','wind','los','ballY','firstDownX','snapX','snapContext','qbEyes','windupAt','scoreKind','ballPath','coverageScouting'].map(k=>[k,sim[k]]))),world:canonical(sim,sim.world,true)};
}
function bodies(sim:any){return sim.agents.map((a:any)=>({idx:a.idx,slot:a.slot,team:a.team,body:canonical(sim,a.body,true),mind:canonical(sim,a.mind,true),recognition:canonical(sim,a.recog,true),behavior:canonical(sim,a.behavior,true),runFit:canonical(sim,a.runFit),stance:a.stance,engagement:a.engagement?{owner:a.engagement.blocker.idx,defender:a.engagement.defender.idx}:null,nextTackleAt:a.nextTackleAt}));}
for(const target of targets){
  const parsed=/^G(\d+)-P(\d+)$/.exec(target);if(!parsed)throw Error('Invalid target '+target);
  const g=index.rows.find((r:any)=>r.gameIndex===Number(parsed[1])),saved=g?.log.find((r:any)=>r.index===Number(parsed[2]));
  if(!saved?.nativeInput||saved.nativeInput.kind!=='scrimmage')throw Error('Target is not native scrimmage');
  const teams=index.leagueInputs.find((l:any)=>l.league===g.league).teams;
  const originalHome=teams.find((t:any)=>t.id===g.home.id),originalAway=teams.find((t:any)=>t.id===g.away.id);
  if(sha([originalHome,originalAway])!==g.beforeRosterSha256)throw Error('Starting rosters mismatch');
  function run(observe:boolean){
    const home=structuredClone(originalHome),away=structuredClone(originalAway),opts:any={seed:g.seed,record:false};
    let selected:any=null;const seeds:number[]=[];let game:any;
    opts.hooks={playResult(sim:any,kind:string){
      seeds.push(sim.rng.key);
      if(kind!=='scrimmage'||game.playIndex!==saved.index)return sim.run();
      if(selected||sim.rng.key!==saved.nativeInput.seed)throw Error('Selected native seed mismatch');
      const initial=snapshot(sim,Rng),fullInitial=fullState(sim),prior=game.result().log.map(stripReplay);
      if(sha(initial)!==saved.nativeInput.initialSha256||sha(prior)!==saved.nativeInput.earlierLogSha256)throw Error('Initial state or prior history changed for '+target);
      const pictures:any[]=[],commands:any[]=[],samples:any[]=[],ticks:any[]=[],wrappers=new Map<any,any>();
      const oldSee=sim.see,oldStep=sim.world.step,oldPair=sim.world.pairImpulse,oldTick=sim.tick;
      let activeAgent:number|null=null,handImpulses:any[]=[],beforeTickHash:string|null=null;
      const wrapBehaviors=()=>{
        for(const a of sim.agents){const b=a.behavior;if(wrappers.has(b))continue;const update=b.update;wrappers.set(b,update);
          b.update=function(actor:any,s:any){const start=pictures.length,previous=activeAgent;activeAgent=actor.idx;
            const before={t:s.t,a:actor.idx,slot:actor.slot,kind:this.kind,target:this.target?.idx??null};
            let command:any;try{command=update.call(this,actor,s);}finally{activeAgent=previous;}
            commands.push({...before,command:structuredClone(command),picturesFrom:start,picturesTo:pictures.length,newTarget:this.target?.idx??null});return command;};
        }
      };
      if(observe){
        sim.see=function(a:any,b:any,...rest:any[]){const cue=oldSee.call(this,a,b,...rest);pictures.push({t:sim.t,a:a.idx,b:b.idx,actor:activeAgent,scale:rest[0]??1,cue:structuredClone(cue),carrier:sim.carrier?.idx??null,ball:sim.ball.kind});return cue;};
        sim.world.pairImpulse=function(i:number,j:number,x:number,y:number,actor:number,channel:string,active:boolean=true,ledger:any){const fraction=oldPair.call(this,i,j,x,y,actor,channel,active,ledger);if(channel==='hands'||channel==='grasps')handImpulses.push({i,j,actor,channel,active,x:x*fraction,y:y*fraction});return fraction;};
        sim.world.step=function(intents:any,dt:number){
          const before={agents:bodies(sim),cmds:structuredClone(sim.cmds),intents:structuredClone(intents),ball:canonical(sim,sim.ball),bond:canonical(sim,sim.bond),engagements:canonical(sim,sim.engagements)};
          handImpulses=[];const report=oldStep.call(this,intents,dt);
          const grouped=new Map<string,any>();for(const imp of handImpulses){const key=`${imp.channel}:${imp.i}:${imp.j}`;let value=grouped.get(key);if(!value){value={i:imp.i,j:imp.j,channel:imp.channel,x:0,y:0,calls:0};grouped.set(key,value);}value.x+=imp.x;value.y+=imp.y;value.calls++;}
          samples.push({t:sim.t,dt,before,after:{agents:bodies(sim),ball:canonical(sim,sim.ball),bond:canonical(sim,sim.bond),engagements:canonical(sim,sim.engagements)},report:canonical(sim,report),actualPairImpulses:[...grouped.values()]});return report;
        };
      }
      sim.tick=function(){const t=this.t;beforeTickHash=sha(fullState(this));if(observe)wrapBehaviors();const result=oldTick.call(this);ticks.push({t,before:beforeTickHash,after:sha(fullState(this))});return result;};
      let result:any,final:any,fullFinal:any;
      try{result=sim.run();final=snapshot(sim,Rng);fullFinal=fullState(sim);}
      finally{sim.see=oldSee;sim.world.step=oldStep;sim.world.pairImpulse=oldPair;sim.tick=oldTick;for(const [b,u]of wrappers)b.update=u;}
      if(sha(rawResult(result))!==saved.nativeInput.resultSha256||sha(final)!==saved.nativeInput.finalSha256||final.nextRng!==saved.nativeInput.nextRng)throw Error('Selected native execution differs from ordinary light collection '+target);
      selected={id:target,gameIndex:g.gameIndex,gameSeed:g.seed,snapSeed:sim.rng.key,observe,initial,initialPerception:canonical(sim,initial.perception),fullInitial,initialSha256:sha(initial),fullInitialSha256:sha(fullInitial),priorLogSha256:sha(prior),seedsThroughTarget:[...seeds],
        result:observe?result:rawResult(result),resultSha256:sha(rawResult(result)),finalSha256:sha(final),fullFinalSha256:sha(fullFinal),nextRng:final.nextRng,fullFinal,ticks,pictures,commands,samples,
        players:sim.agents.map((a:any)=>({idx:a.idx,slot:a.slot,team:a.team,player:a.player,profile:a.profile})),rawOutcome:rawResult(result)};
      return result;
    }};
    game=new Game(home,away,opts);const oldScrimmage=game.scrimmage;
    game.scrimmage=function(sit:any){const record=opts.record,level=opts.recordLevel;opts.record=observe&&this.playIndex===saved.index;opts.recordLevel='full';try{return oldScrimmage.call(this,sit);}finally{opts.record=record;opts.recordLevel=level;}};
    game.kickoffToStart();let steps=0;
    while(!selected&&!game.state.over){game.step();if(++steps>1000)throw Error('Prefix step guard');}
    if(!selected)throw Error('Target not reached');
    const actual=game.result().log.find((r:any)=>r.index===saved.index),{nativeInput,...savedLog}=saved;
    if(sha(stripReplay(actual))!==sha(savedLog))throw Error('Settled target log changed');
    selected.targetLog=stripReplay(actual);return selected;
  }
  const plain=run(false),observed=run(true);
  if(plain.fullFinalSha256!==observed.fullFinalSha256){
    writeFileSync(join(output,target+'-state-mismatch.json.gz'),gzipSync(JSON.stringify({plain:plain.fullFinal,observed:observed.fullFinal}),{level:9}));
  }
  for(const key of ['initialSha256','fullInitialSha256','priorLogSha256','resultSha256','finalSha256','fullFinalSha256','nextRng'])if(plain[key]!==observed[key])throw Error('Observer/plain mismatch '+target+' '+key);
  if(sha(plain.ticks)!==sha(observed.ticks)||sha(plain.seedsThroughTarget)!==sha(observed.seedsThroughTarget))throw Error('Observer changes whole-tick execution or prior seeds');
  observed.observerVerified=true;observed.ordinaryLightVerified=true;observed.plainReceipts=Object.fromEntries(['initialSha256','fullInitialSha256','priorLogSha256','resultSha256','finalSha256','fullFinalSha256','nextRng'].map(k=>[k,plain[k]]));observed.ticksSha256=sha(observed.ticks);
  const packet={schema:'selected-native-game-prefix-v1',sourceBefore:EXPECTED,sourceAfter:sourceSha(archive),archiveRoot:archive,toolSha256:fileSha(new URL(import.meta.url).pathname),commonSha256:fileSha(new URL('./common.ts',import.meta.url).pathname),inputSha256:fileSha(indexPath),
    method:'Outcome-selected unchanged native Game prefix from original league rosters/game seed, then natural complete target PlaySim. Only target full-recorded before its constructor. Wrap actual behavior/see/World calls once without new observations, decisions, RNG or prescribed movement. Complete enumerable projections, whole-tick hashes, natural result and copied next RNG match plain and original light game; settled target log and earlier prefix match original.',
    limits:['Selected retrospective mechanism witnesses, not frequency or calibration estimates.','Prehistory is reproduced natively; module WeakMaps are not serialized or independently hashed.','Stops after selected snap naturally finishes and normal Game bookkeeping; no full-game-after-target parity claim.','Full telemetry and raw diagnostic support/world fields are diagnostic, not information supplied to controllers.'],row:observed};
  if(packet.sourceAfter!==EXPECTED)throw Error('Source changed');
  writeFileSync(join(output,target+'.json.gz'),gzipSync(JSON.stringify(packet),{level:9}));
  console.log(JSON.stringify({id:target,gain:observed.rawOutcome.offenseYards,outcome:observed.rawOutcome.outcome,duration:observed.rawOutcome.duration,steps:observed.samples.length,commands:observed.commands.length,pictures:observed.pictures.length,observerVerified:true}));
}
