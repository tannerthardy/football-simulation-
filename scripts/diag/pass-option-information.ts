/** One native-prefix information dependency; no completed outcome claim.
 * Run on the unchanged integration source with the portable P58 input.
 */
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {performance} from 'node:perf_hooks';
import {PlaySim,type PlaySetup} from '../../src/sim/playsim.js';
import {RouteRunner} from '../../src/sim/behaviors/receiver.js';
import {ScoutingReport} from '../../src/sim/recognition.js';
import {CoverageScouting} from '../../src/sim/qbmind.js';
import {sourceVersion} from '../source-version.js';
const hash=(x:unknown)=>createHash('sha256').update(JSON.stringify(x)).digest('hex'),
 fileHash=(p:string)=>createHash('sha256').update(readFileSync(p)).digest('hex'),copy=<T>(x:T):T=>structuredClone(x),
 input='data/reviews/current/catch-transition-inputs.json',packet=JSON.parse(readFileSync(input,'utf8')),
 fixture=packet.clips.find((f:any)=>f.id==='R3101-S1001-P58'),destination=process.argv[2];
if(!destination)throw Error('OUTDIR required');mkdirSync(destination,{recursive:true});
const profile=JSON.parse(readFileSync('config/baseline.json','utf8')),provenance={
 commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sourceSha256:sourceVersion(),collectorSha256:fileHash(import.meta.filename),
 inputSha256:fileHash(input),setupSha256:hash(fixture.setup),flags:Object.fromEntries(Object.keys(profile.flags).map(k=>[k,process.env[k]??null])),
 worldDefaults:profile.worldDefaults,node:process.version,platform:process.platform,arch:process.arch,lockSha256:fileHash('package-lock.json'),startedAt:new Date().toISOString()};
if(provenance.sourceSha256!==packet.runtimeSha256)throw Error('Requires unchanged baseline runtime');
function restore(){const s=copy(fixture.setup),scouting=s.scouting?new ScoutingReport(s.scouting.strength):undefined;
 if(scouting)Reflect.set(scouting,'cells',new Map(s.scouting.cells));
 const coverageScouting=s.coverageScouting?Object.assign(new CoverageScouting(),copy(s.coverageScouting)):undefined;
 return new PlaySim({...s,scouting,coverageScouting,energy:s.energy?new Map(s.energy):undefined,record:false} as PlaySetup);}
function trial(mode:'option'|'converted-control'|'non-option-control',flip:boolean){
 const sim=restore();let target:typeof sim.agents[number]|undefined;
 for(let k=0;k<45;k++){
  target=sim.offense.find(a=>a.behavior instanceof RouteRunner&&a.behavior.route.end==='sitVsZone'
   &&Reflect.get(a.behavior,'converted')===false&&sim.t>=Reflect.get(a.behavior,'readAt'));
  if(target)break;sim.tick();
 }
 if(!target||!(target.behavior instanceof RouteRunner)||sim.throwAt>=0)throw Error('No pre-throw option decision found');
 const option=target,optionTick=sim.t;
 if(mode==='non-option-control')target=sim.offense.find(a=>a.behavior instanceof RouteRunner&&a.behavior.route.end!=='sitVsZone');
 if(!target||!(target.behavior instanceof RouteRunner))throw Error('No route control');
 const rr=target.behavior;
 if(mode==='converted-control'){rr.update(target,sim);if(!Reflect.get(rr,'converted'))throw Error('Option did not commit');}
 const own=()=>({path:rr.path,idx:rr.idx,converted:Reflect.get(rr,'converted'),readAt:Reflect.get(rr,'readAt')}),
  before={t:sim.t,bodies:sim.agents.map(a=>a.body),rng:sim.rng,perception:sim.perception,route:own()},prefixSha256=hash(before),
  bodySha256=hash(sim.agents.map(a=>a.body)),perceptionSha256=hash(sim.perception),rngBefore=hash(sim.rng),beforeRoute=copy(own()),
  originalMan=sim.defAlign.coverage.man,consumed:any[]=[],see=sim.see.bind(sim);
 sim.see=(a,r,scale)=>{const picture=see(a,r,scale);consumed.push({observer:a.idx,target:r.idx,scale,picture:copy(picture)});return picture;};
 if(flip)sim.defAlign.coverage.man=!originalMan;
 let command;try{command=rr.update(target,sim);}finally{sim.defAlign.coverage.man=originalMan;}
 const afterRoute=copy(own()),after={bodySha256:hash(sim.agents.map(a=>a.body)),perceptionSha256:hash(sim.perception),rngSha256:hash(sim.rng)},
  result={mode,flip,t:optionTick,actor:{idx:target.idx,id:target.player.id,slot:target.slot,route:rr.route.id},actualCoverage:sim.defCall.coverage.id,
   classifiedMan:flip?!originalMan:originalMan,prefixSha256,rngBefore,bodySha256,perceptionSha256,consumed,beforeRoute,afterRoute,command,after,
   censored:true,outcome:null,observerSource:option.player.id};
 if(after.bodySha256!==bodySha256||after.perceptionSha256!==perceptionSha256)throw Error('Decision mutates physical/perception state');
 if(mode==='option'&&!Reflect.get(rr,'converted'))throw Error('Decision did not commit');
 return result;
}
const start=performance.now(),pairs=[];
for(const mode of ['option','converted-control','non-option-control'] as const){const ordinary=trial(mode,false),hiddenBit=trial(mode,true);
 if(ordinary.prefixSha256!==hiddenBit.prefixSha256||ordinary.after.rngSha256!==hiddenBit.after.rngSha256||hash(ordinary.consumed)!==hash(hiddenBit.consumed))throw Error('Not a matched information/draw comparison');
 const pathChanged=hash(ordinary.afterRoute.path)!==hash(hiddenBit.afterRoute.path),commandChanged=hash(ordinary.command)!==hash(hiddenBit.command);
 if(mode==='option'&&!pathChanged)throw Error('Hidden flag did not select different route branch');
 if(mode!=='option'&&(pathChanged||commandChanged))throw Error('Opposing control changed');
 pairs.push({mode,pathChanged,commandChanged,ordinary,hiddenBit});
 console.log(JSON.stringify({mode,pathChanged,commandChanged,t:ordinary.t,actor:ordinary.actor,observations:ordinary.consumed.length}));
}
writeFileSync(join(destination,'summary.json'),JSON.stringify({schema:'pass-option-information-v1',provenance,fixture:fixture.id,pairs,wallMs:performance.now()-start,
 scope:'Six reconstructed native prefixes and one direct route update per arm. Only the hidden coverage.man flag is inverted during that actor update and immediately restored; installed assignments, bodies, route call, pictures and actual draw stay fixed. No achieved continuation or completed-play effect is inferred. Both controls must preserve command/path.'})+'\n');
if(sourceVersion()!==provenance.sourceSha256)throw Error('Source changed');
