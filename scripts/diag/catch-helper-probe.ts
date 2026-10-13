/** Diagnostic controller contrast on complete native plays. Uses acquired
 * runner/teammate pictures; no capacity, perception or shared-source edits.
 * This deliberately small reserve rule is a hypothesis, not an NFL policy.
 */
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {FIELD_WIDTH} from '../../src/core/field.js';
import {clamp} from '../../src/core/vec.js';
import {track} from '../../src/sim/behaviors/common.js';
import {PlaySim,type PlaySetup} from '../../src/sim/playsim.js';
import {ScoutingReport} from '../../src/sim/recognition.js';
import {CoverageScouting} from '../../src/sim/qbmind.js';
import {sourceVersion} from '../source-version.js';
const hash=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const copy=<T>(v:T):T=>structuredClone(v);
const packet=JSON.parse(readFileSync('data/reviews/current/catch-chain-inputs.json','utf8'));
const profile=JSON.parse(readFileSync('config/baseline.json','utf8'));
const declared=packet.clips.map((f:any)=>({id:f.id,primary:f.defender,
 helper:f.id==='R3101-S1001-P58'||f.id==='R3101-S1001-P173'?21:f.helper}));
const provenance={commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sourceSha256:sourceVersion(),
 collectorSha256:createHash('sha256').update(readFileSync(import.meta.filename)).digest('hex'),inputSha256:hash(packet),
 flags:Object.fromEntries(Object.keys(profile.flags).map(k=>[k,process.env[k]??null])),worldDefaults:profile.worldDefaults};
function restore(f:any){const s=copy(f.setup),scouting=new ScoutingReport(s.scouting.strength);
 Reflect.set(scouting,'cells',new Map(s.scouting.cells));const coverageScouting=Object.assign(new CoverageScouting(),s.coverageScouting);
 return new PlaySim({...s,energy:new Map(s.energy),scouting,coverageScouting,record:false} as PlaySetup);}
function trial(f:any,def:any,policy:boolean,observe:boolean){
 const sim=restore(f),catchAt=f.nativeResult.events.find((e:any)=>e.type==='catch').t;
 while(sim.phase==='live'&&sim.t<catchAt+.05-1e-8)sim.tick();
 const helper=sim.agents[def.helper],primary=sim.agents[def.primary],runner=sim.carrier!;
 const prefixSha256=hash({bodies:sim.agents.map(a=>a.body),rng:sim.rng,perception:sim.perception});
 let decisions:any[]=[];const behavior=helper.behavior,update=behavior.update.bind(behavior);
 if(policy)behavior.update=(a,s)=>{
  const original=update(a,s);if(a.engagement||a.isDown(s.t)||s.carrier!==runner||a.body.support?.foot
   ||Math.hypot(a.body.support?.load.x??0,a.body.support?.load.y??0)>1e-6)return original;
  const look=(.12+.12*(1-a.r('awareness')))/Math.max(.1,a.profile.reactionTime);
  const seen=s.see(a,runner,look),mate=s.see(a,primary),distance=Math.hypot(seen.pos.x-a.pos.x,seen.pos.y-a.pos.y),
   mateDistance=Math.hypot(seen.pos.x-mate.pos.x,seen.pos.y-mate.pos.y);
  // Help can only be relied upon while its acquired picture is upright,
  // nearby and closer. Contact and a lost roof immediately exit this gate.
  if(distance<=4||a.pos.x<=seen.pos.x+1||seen.vel.x<=1.5||mate.pose!=='up'
   ||mateDistance>6||mateDistance>=distance-1.5)return original;
  const side=Math.sign(mate.pos.y-seen.pos.y)||Math.sign(a.pos.y-seen.pos.y)||1;
  const goal={x:seen.pos.x+Math.max(1.5,seen.vel.x*.65),y:clamp(seen.pos.y-side*1.5,.5,FIELD_WIDTH-.5)};
  const command=track(a,goal,seen.vel,{cutSkill:.85+.35*a.r('tackling')});
  if(observe)decisions.push({t:s.t,seen:copy(seen),mate:copy(mate),goal,original:copy(original),command:copy(command),
   body:copy(a.body)});
  return command;
 };
 const world=sim.world.step.bind(sim.world);let motion:any[]=[];
 if(observe)sim.world.step=(intents,dt)=>{const before=copy(helper.body),raw=copy(intents[helper.idx]),r=world(intents,dt);
  motion.push({t:sim.t,before,applied:raw,after:copy(helper.body),runner:copy(runner.body)});return r;};
 while(sim.phase==='live'&&sim.t<25)sim.tick();const unfinished=sim.phase==='live';
 if(unfinished)sim.whistle('timeout',runner.pos);
 const result=sim.buildResult(),signature=hash({result:{...result,frames:undefined,telemetry:undefined},
  bodies:sim.agents.map(a=>a.body),intents:sim.intents,rng:sim.rng,perception:sim.perception});
 return {arm:policy?'reserve-opposite-moving-lane':'unchanged-native',prefixSha256,signature,result,censored:unfinished,
  helper:{idx:helper.idx,id:helper.player.id,slot:helper.slot},runner:{idx:runner.idx,id:runner.player.id,slot:runner.slot},
  primary:{idx:primary.idx,id:primary.player.id,slot:primary.slot},decisions,motion};
}
const cases=declared.map((def:any)=>{const f=packet.clips.find((f:any)=>f.id===def.id),baseline=trial(f,def,false,true),
 probe=trial(f,def,true,true),plain=trial(f,def,true,false);
 if(baseline.prefixSha256!==probe.prefixSha256||probe.signature!==plain.signature)throw Error('Observer/prefix mismatch');
 // sim.run adds snap; exact native comparison here excludes that logging-only event.
 const expected=copy(f.nativeResult);expected.events=expected.events.filter((e:any)=>e.type!=='snap');
 if(hash({...baseline.result,frames:undefined,telemetry:undefined})!==hash({...expected,frames:undefined,telemetry:undefined}))throw Error('Native outcome mismatch');
 return {id:f.id,observerVerified:true,baseline,probe};});
if(sourceVersion()!==provenance.sourceSha256)throw Error('Runtime changed');
writeFileSync(process.argv[2],JSON.stringify({schema:'catch-helper-native-probe-v1',provenance,declared,
 interpretation:'Full original 22-body prefix and complete native endings. Diagnostic-only override of one helper after the catch; additional delayed teammate/runner pictures are actual inputs to the proposed rule, not observer reads. Original first tackler, coverage, capability and physics preserved. Not calibrated; no shared controller patch installed.',cases}));
console.log(JSON.stringify(cases.map(c=>({id:c.id,changedDecisions:c.probe.decisions.length,
 baseline:[c.baseline.result.outcome,c.baseline.result.stats.yac],probe:[c.probe.result.outcome,c.probe.result.stats.yac]}))));
