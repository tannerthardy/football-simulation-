/** Diagnosis only. Reuses the native catch-contact-review context/restore
 * protocol and ReplayTrace. Observers copy existing reads; no added see/RNG.
 * native OUT COHORT GAME: uniformly sample 16 completed passes after one game.
 * panel OUT: declared route/coverage lab; ordinary QB decisions, full 22 bodies.
 * trace INPUT OUT: full per-tick cues, raw/applied commands, achieved load.
 */
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { gzipSync } from 'node:zlib';
import { CENTER_Y, FIELD_WIDTH } from '../../src/core/field.js';
import { clamp, norm } from '../../src/core/vec.js';
import { Rng } from '../../src/core/rng.js';
import { Game } from '../../src/game/game.js';
import { generateTeam, pickDefense, pickOffense } from '../../src/league/team.js';
import { PASS_BY_ID } from '../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../src/playbook/formations.js';
import { effectiveVmax } from '../../src/physics/kinematics.js';
import { interceptPoint, timeToReach } from '../../src/physics/reach.js';
import type { Agent } from '../../src/sim/agent.js';
import { leverage } from '../../src/sim/behaviors/common.js';
import { catchSpot } from '../../src/sim/behaviors/receiver.js';
import { TRACKING_REACH_BONUS } from '../../src/sim/catching.js';
import { CoverageDefender } from '../../src/sim/coverage/defender.js';
import type { Perceived } from '../../src/sim/perception.js';
import { PlaySim, type PlaySetup } from '../../src/sim/playsim.js';
import { ScoutingReport } from '../../src/sim/recognition.js';
import { CoverageScouting } from '../../src/sim/qbmind.js';
import type { PlayResult } from '../../src/sim/types.js';
import { sourceVersion } from '../source-version.js';

type Saved = Omit<PlaySetup, 'seed'|'energy'|'scouting'|'coverageScouting'> & {
  seed: number; energy?: [string,number][];
  scouting?: {strength:number; cells:[string,{n:number;passes:number;expected:number}][]};
  coverageScouting?: Record<string,unknown>;
};
interface Clip { id:string; setup:Saved; signature:string; result:PlayResult; input?:unknown }
const copy = <T>(x:T):T => structuredClone(x);
const hash = (x:unknown) => createHash('sha256').update(JSON.stringify(x)).digest('hex');
const profile = JSON.parse(readFileSync('config/baseline.json','utf8'));
const provenance = {commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),
  sourceSha256:sourceVersion(), collectorSha256:createHash('sha256').update(readFileSync(import.meta.filename)).digest('hex'),
  flags:Object.fromEntries(Object.keys(profile.flags).map(k=>[k,process.env[k]??null])),
  worldDefaults:profile.worldDefaults, startedAt:new Date().toISOString()};
function signature(sim:PlaySim,r:PlayResult) {
  return hash({result:{...r,frames:undefined,telemetry:undefined},bodies:sim.agents.map(a=>a.body),
    intents:sim.intents,rng:sim.rng,perception:sim.perception});
}
function restore(s:Saved,record=false) {
  let scouting:ScoutingReport|undefined, coverageScouting:CoverageScouting|undefined;
  if(s.scouting){scouting=new ScoutingReport(s.scouting.strength);Reflect.set(scouting,'cells',new Map(copy(s.scouting.cells)));}
  if(s.coverageScouting)coverageScouting=Object.assign(new CoverageScouting(),copy(s.coverageScouting));
  return new PlaySim({...copy(s),energy:s.energy?new Map(s.energy):undefined,scouting,coverageScouting,
    record,recordEvery:1,recordLevel:'full'});
}
function native(cohort:number,seed:number) {
  const rng=new Rng(cohort),home=generateTeam(rng,'Ironmen','IRN',{strength:.55}),away=generateTeam(rng,'Comets','COM',{strength:.55});
  const completions:Clip[]=[],population:any[]=[];
  let game:Game,offCall:PlaySetup['offCall'],defCall:PlaySetup['defCall'],prefs:PlaySetup['manPrefs'];
  game=new Game(home,away,{seed,record:false,hooks:{playResult(sim,kind){
    if(kind!=='scrimmage'||!sim.isPass)return undefined;
    const id=`R${cohort}-S${seed}-P${Reflect.get(game,'playIndex')+1}`;
    const off=sim.qb.player.id.startsWith(home.abbr)?'home':'away',def=off==='home'?'away':'home';
    const scouting=Reflect.get(game,'scouting')[def] as ScoutingReport;
    const coverageScouting=Reflect.get(game,'coverageScouting')[off] as CoverageScouting;
    const setup:Saved=copy({offense:Object.fromEntries(sim.offense.map(a=>[a.slot,a.player])),
      defense:Object.fromEntries(sim.defense.map(a=>[a.slot,a.player])),offCall,defCall,manPrefs:prefs,
      los:sim.los,ballY:sim.ballY,firstDownX:sim.firstDownX,seed:sim.rng.key,
      energy:[...Reflect.get(game,'energy')],hurry:sim.hurry,down:sim.snapContext.down,audibles:true,
      scouting:{strength:Reflect.get(scouting,'strength'),cells:[...Reflect.get(scouting,'cells')]},
      coverageScouting:{...coverageScouting}});
    const result=sim.run();
    population.push({id,concept:sim.offCall.pass?.id,coverage:sim.defCall.coverage.id,completed:result.stats.completed??false,
      outcome:result.outcome,flag:result.penalty??null,yac:result.stats.yac??null});
    if(result.stats.completed)completions.push({id,setup,signature:signature(sim,result),result});
    return result;
  }}});
  for(const oc of Object.values(Reflect.get(game,'oc')) as any[]){const call=oc.call.bind(oc);oc.call=(...args:any[])=>{offCall=call(...args);return offCall;};}
  for(const dc of Object.values(Reflect.get(game,'dc')) as any[]){const call=dc.call.bind(dc);dc.call=(...args:any[])=>{const c=call(...args);defCall=c.call;prefs=c.prefs;return c;};}
  game.play();
  const draw=new Rng(`catch-pursuit-20261013:${cohort}`),order=completions.map((_,i)=>i);
  for(let i=order.length-1;i>0;i--){const j=draw.int(0,i);[order[i],order[j]]=[order[j],order[i]];}
  const clips=order.slice(0,16).map(i=>completions[i]);
  return {protocol:'fresh-native-uniform-completions-v1',cohort,seed,
    sampling:'16 uniform completed-pass snaps per fixed roster/game, seeded before gain/film review; flagged/timeout catches retained and labelled separately',
    sampleSeed:`catch-pursuit-20261013:${cohort}`,population,clips};
}
// Matchups are hypotheses, not scores or claims about a universal NFL rule.
const routePairs=[
  {concept:'mesh',formation:'gun_doubles_11',attack:'cover1',control:'cover3_match',conflict:'Opposed shallow crossers stress man leverage; match hooks can cut/deliver.'},
  {concept:'flood',formation:'gun_trips_11',attack:'cover3',control:'cover4_stubbie',conflict:'Go/out/flat stretches a thirds curl-flat player; trips match can distribute the three.'},
  {concept:'smash',formation:'gun_doubles_11',attack:'cover2',control:'cover2man',conflict:'Hitch/corner high-low on cloud corner; 2-Man retains individual underneath ownership and two roofs.'},
  {concept:'dagger',formation:'gun_trips_11',attack:'cover3_match',control:'cover1_robber',conflict:'Seam clears hook/roof for dig; robber can sit in the in-breaking lane.'},
  {concept:'four_verts',formation:'gun_doubles_11',attack:'cover3',control:'cover4_meg',conflict:'Two seams stress one middle safety; quarters has four deep matches.'},
  {concept:'quick_outs',formation:'gun_doubles_11',attack:'cover3',control:'cover4_palms',conflict:'Speed out attacks off thirds; two-read corner can trap only after its installed #2 cue.'},
  {concept:'levels',formation:'gun_trips_11',attack:'cover3_match',control:'cover1_robber',conflict:'Short in + dig replaces the shallow threat; robber is an adverse inside-window control.'},
  {concept:'hitches',formation:'gun_doubles_11',attack:'cover3',control:'cover1',conflict:'Stop routes take off-corner cushion; press man is deliberately poor static separation.'},
] as const;
function panel() {
  const clips:Clip[]=[],manifest:any[]=[];
  for(const roster of [3101,4202]) {
    const rng=new Rng(roster),off=generateTeam(rng,'Lab Offense',`O${roster}`,{strength:.55}),def=generateTeam(rng,'Lab Defense',`D${roster}`,{strength:.55});
    for(const pair of routePairs)for(const arm of ['attack','control'] as const)for(const seed of [701,907,1201])for(const flip of [false,true]){
      const form=FORMATION_BY_ID[pair.formation],id=`LAB-R${roster}-${pair.concept}-${arm}-S${seed}-${flip?'L':'R'}`;
      const input={id,roster,seed,flip,arm,...pair,coverage:pair[arm]};manifest.push(input);
      const setup:Saved={offense:pickOffense(off,form.personnel),defense:pickDefense(def,'nickel'),
        offCall:{formation:form,flip,kind:'pass',pass:PASS_BY_ID[pair.concept],label:id},
        defCall:{personnel:'nickel',front:FRONT_BY_ID.over,coverage:COVERAGE_BY_ID[pair[arm]],pressure:null,zoneStyle:'match',label:id},
        los:40,ballY:CENTER_Y,firstDownX:50,seed,audibles:false};
      const sim=restore(setup),result=sim.run();
      clips.push({id,setup,signature:signature(sim,result),result,input:{...input,effectiveCoverage:sim.defCall.coverage.id}});
    }
  }
  return {protocol:'route-coverage-native-22-body-lab-v1',routePairs,manifest,inputSha256:hash(manifest),clips};
}
function body(a:Agent){return {pos:{...a.pos},vel:{...a.vel},facing:a.facing,energy:a.body.energy,
  support:copy(a.body.support),engaged:!!a.engagement,downUntil:a.downUntil};}
function flightChoice(a:Agent,sim:PlaySim,cues:any[]) {
  // Reconstruct only if playBall consumed all five eligible pictures.
  if(sim.ball.kind!=='air')return null;
  const receivers=sim.offense.filter(r=>r!==sim.qb&&!['LT','LG','C','RG','RT'].includes(r.slot));
  const pictures=receivers.map(r=>({r,seen:cues.filter(c=>c.target===r.idx&&c.delay===undefined).at(-1)?.seen as Perceived|undefined}));
  if(pictures.some(p=>!p.seen))return null;
  let window:any=null;
  for(const s of sim.ballPath){const remaining=s.t-sim.t;if(remaining<0||s.z<.25)continue;
    for(const {r,seen} of pictures){if(s.z>r.profile.maxCatchHeight*.92)continue;
      const p={x:s.x,y:s.y},reach=r.profile.reach+TRACKING_REACH_BONUS;
      if(Math.hypot(p.x-seen!.pos.x,p.y-seen!.pos.y)>r.profile.vmax*remaining+reach)continue;
      const passing=Math.hypot(p.x-seen!.pos.x-seen!.vel.x*remaining,p.y-seen!.pos.y-seen!.vel.y*remaining)<=reach;
      if(passing||timeToReach({pos:seen!.pos,vel:seen!.vel,profile:r.profile},p,reach)<=remaining){
        window={p,t:s.t,receiver:r.idx,seen:copy(seen)};break;}
    }if(window)break;
  }
  const spot=catchSpot(a,sim),tt=spot?timeToReach({pos:a.pos,vel:a.vel,profile:a.profile,speedScale:a.speedScale},spot.p,a.profile.reach):null;
  const earlierBall=!!(spot&&window&&spot.t<window.t&&tt!<=spot.t-sim.t+.05);
  const wr=window?sim.agents[window.receiver]:null;
  const carry=!!(window&&!earlierBall&&Math.hypot(window.seen.vel.x,window.seen.vel.y)>.5&&
    Math.hypot(window.seen.pos.x-a.pos.x,window.seen.pos.y-a.pos.y)<=a.profile.radius+wr!.profile.radius+a.profile.reach);
  const ballReachable=!!(spot&&tt!<=spot.t-sim.t+.05&&(!window||spot.t<=window.t+.05));
  return {window,spot,earlierBall,ballReachable,branch:carry?'carry-visible-catcher':ballReachable?'arrive-ball':'drive-window-or-fallback',
    source:'read-only reconstruction from pictures actually consumed by playBall; no additional see/RNG'};
}
function pursueAim(a:Agent,sim:PlaySim,cues:Array<{target:number;delay:number|undefined;seen:Perceived}>) {
  const c=sim.carrier;if(!c||c.team===a.team)return null;
  const look=(.12+.12*(1-a.r('awareness')))/Math.max(.1,a.profile.reactionTime);
  const hits=cues.filter(x=>x.target===c.idx);
  const older=hits.find(x=>x.delay!==undefined&&Math.abs(x.delay-look-.2/Math.max(.1,a.profile.reactionTime))<1e-9)?.seen;
  const seen=hits.find(x=>x.delay!==undefined&&Math.abs(x.delay-look)<1e-9)?.seen;
  if(!older||!seen)return null; // gather returned before selecting an intercept
  const sp=Math.hypot(seen.vel.x,seen.vel.y),heading=sp>.1?norm(seen.vel):{x:0,y:0};
  const acc=clamp((sp-Math.hypot(older.vel.x,older.vel.y))/.2,-c.profile.brake,Math.max(0,(c.profile.vmax-sp)/c.profile.tau));
  const tau=.3+.3*a.r('anticipation'),v=clamp(sp+acc*tau,0,c.profile.vmax);
  const path=(t:number)=>{const d=v*t-(v-sp)*tau*(1-Math.exp(-t/tau));return{x:seen.pos.x+heading.x*d,y:clamp(seen.pos.y+heading.y*d,0,FIELD_WIDTH)};};
  const reach=a.profile.radius+c.profile.radius+a.profile.reach*.75;
  const ip=interceptPoint({pos:a.pos,vel:a.vel,profile:a.profile,speedScale:a.speedScale},path,{horizon:3,step:.1,radius:reach});
  // Independent named-stream reconstruction; no draw from sim.rng or controller.
  const bias=new Rng(sim.rng.key).fork(`pursuit:${a.idx}`).normal(0,.12*(1.2-a.r('pursuit')));
  const p=path(clamp(ip.t-bias,0,3)),dist=Math.hypot(seen.pos.x-a.pos.x,seen.pos.y-a.pos.y);
  const force=a.runFit?.kind==='force'||(a.runFit?.kind==='edge'&&a.runFit.edge==='box');
  const lev=(force?Math.abs(leverage(a,p.y))*a.runFit!.side:leverage(a,p.y))*clamp((dist-reach)/6,0,1);
  return {p:{x:p.x,y:p.y+lev},interceptT:ip.t,bias,source:'pure reconstruction of baseline pursuitPoint from consumed cues; raw command may be blended by approach control'};
}
function trace(c:Clip) {
  const sim=restore(c.setup,true),rows:any[]=[],wrapped=new WeakSet<object>();
  let stage='tick',actor:number|null=null,cues:any[]=[],commands:any[]=[],world:any=null;
  const see=sim.see.bind(sim);sim.see=(a,b,delay)=>{const seen=see(a,b,delay);if(a.team==='D')cues.push({stage,actor:a.idx,target:b.idx,delay,seen:copy(seen)});return seen;};
  const step=sim.world.step.bind(sim.world);sim.world.step=(intents,dt)=>{
    stage='world';const before=sim.agents.map(body),applied=copy(intents);
    const report=step(intents,dt);
    world={before,applied,after:sim.agents.map(body),contacts:copy(report.contacts),strikes:copy(report.strikes),
      groundImpulse:copy(report.groundImpulse),armImpulse:copy(report.armImpulse),work:copy(report.work),
      grasps:sim.world.joints.filter(j=>j.kind==='grasp').map(j=>{const {a,b,...data}=j;return {a:sim.world.indexOf(a),b:sim.world.indexOf(b),...copy(data)};})};
    stage='after-world';return report;
  };
  const tick=sim.tick.bind(sim);sim.tick=()=>{
    const t=sim.t,pre={ball:sim.ball.kind,carrier:sim.carrier?.idx??null,catchAt:sim.catchAt,throwAt:sim.throwAt};
    cues=[];commands=[];world=null;stage='recognition';
    for(const a of sim.agents){const b=a.behavior;if(wrapped.has(b))continue;wrapped.add(b);const update=b.update.bind(b);
      b.update=(a,s)=>{stage='controller';actor=a.idx;const start=cues.length;const raw=update(a,s);
        if(a.team==='D')commands.push({actor:a.idx,kind:b.kind,raw:copy(raw),tags:[...a.tags],
          rule:b instanceof CoverageDefender?b.recordedRule(t):null,job:b instanceof CoverageDefender?b.job:null,
          target:Reflect.get(b,'target')?.idx??null,recognition:a.recog?.read??null,
          effectiveVmax:effectiveVmax(a.body,Math.atan2(raw.vel.y,raw.vel.x),raw.effort??1),
          aim:b.kind==='pursuit'?pursueAim(a,sim,cues.slice(start)):null,
          flight:flightChoice(a,sim,cues.slice(start))});
        actor=null;stage='modifiers';return raw;};}
    tick();
    rows.push({t,pre,cues,commands,world,after:{carrier:sim.carrier?.idx??null,catchAt:sim.catchAt,ball:sim.ball.kind},
      jobs:sim.agents.map(a=>({kind:a.behavior.kind,job:a.behavior instanceof CoverageDefender?a.behavior.job:null,
        rule:a.behavior instanceof CoverageDefender?a.behavior.recordedRule(t):null}))});
  };
  const result=sim.run(),sig=signature(sim,result),plain=restore(c.setup),control=plain.run();
  if(sig!==signature(plain,control)||sig!==c.signature)throw Error(`Observer/native context mismatch: ${c.id}`);
  return {id:c.id,input:c.input,setupSha256:hash(c.setup),signature:sig,observerVerified:true,
    players:sim.agents.map(a=>({idx:a.idx,id:a.player.id,team:a.team,slot:a.slot,profile:a.profile,ratings:a.player.ratings})),
    numbering:sim.offAlign.numbering,installed:sim.defAlign.spots,result:{...result,frames:undefined,telemetry:undefined},
    frames:result.frames,telemetry:result.telemetry,rows};
}
const [mode,out,arg,arg2]=process.argv.slice(2);if(!out)throw Error('native OUT COHORT GAME | panel OUT | trace INPUT OUT');
let report:any,destination=out;
if(mode==='native')report=native(Number(arg),Number(arg2));
else if(mode==='panel')report=panel();
else if(mode==='trace'){
  const input=JSON.parse(readFileSync(out,'utf8'));destination=arg;
  report={protocol:'catch-pursuit-trace-v1',inputSha256:hash(input),inputSource:input.provenance,clips:input.clips.map(trace)};
}else throw Error('Unknown mode');
if(sourceVersion()!==provenance.sourceSha256)throw Error('Runtime changed during collection');
report.provenance={...provenance,finishedAt:new Date().toISOString()};
mkdirSync(dirname(destination),{recursive:true});
const json=JSON.stringify(report);writeFileSync(destination,destination.endsWith('.gz')?gzipSync(json):json+'\n');
console.log(JSON.stringify({destination,protocol:report.protocol,clips:report.clips.length,source:provenance.sourceSha256,
  inputSha256:report.inputSha256??null,completed:report.clips.filter((c:Clip)=>c.result.stats.completed).length}));
