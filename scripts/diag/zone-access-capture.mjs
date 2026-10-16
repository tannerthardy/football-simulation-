/** Predeclared transfer inputs; native source, all22 normal reactions.
 * Read-only method/intent observation; no extra sensing or random draws. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {PlaySim} from '../../src/sim/playsim.ts';
import {RunBlocker} from '../../src/sim/behaviors/blocking.ts';
import {FORMATION_BY_ID} from '../../src/playbook/formations.ts';
import {RUN_BY_ID} from '../../src/playbook/concepts.ts';
import {FRONT_BY_ID,COVERAGE_BY_ID} from '../../src/playbook/defense.ts';
import {sourceVersion} from '../source-version.ts';
import {contactControl,helperSupport} from '../../src/sim/engagement.ts';

const root='data/reviews/current/second-level-access';
const hash=x=>createHash('sha256').update(typeof x==='string'||Buffer.isBuffer(x)?x:JSON.stringify(x)).digest('hex');
const [mode='plan',out='out/second-level-access/current',idsText,untilText,manifestOverride]=process.argv.slice(2);
const manifestPath=manifestOverride??root+'/inputs.json';
if(mode==='plan'){
 const config=JSON.parse(readFileSync(root+'/audit-config.json'));
 const fixture=JSON.parse(readFileSync('config/roster-screen.json'));
 const old=JSON.parse(readFileSync(root+'/selected-old-summary.json'));
 const rows=['A018','A030','A027'].map(id=>{
  const index=Number(id.slice(1))-1,callIndex=index%12,m=fixture.matchups[Math.floor(index/12)],c=config.calls[callIndex];
  const formation=FORMATION_BY_ID[c.formation],run=RUN_BY_ID[c.concept],front=FRONT_BY_ID[c.front],coverage=COVERAGE_BY_ID[c.coverage];
  const setup={offense:structuredClone(m.offense),defense:structuredClone(m.defense),
   offCall:{formation,flip:false,kind:'run',run,label:`${formation.name} · ${run.name}`},
   defCall:{personnel:'nickel',front,coverage,pressure:null,label:`${front.name} · ${coverage.name}`},
   los:config.los,ballY:config.ballY,firstDownX:config.firstDownX,down:config.down,
   seed:c.seed,audibles:false,record:true,recordEvery:1,recordLevel:'full'};
  const prior=old.find(r=>r.id===id);assert(prior);assert.equal(hash(setup),prior.inputSha256);
  return {id,matchup:m.id,concept:c.concept,setup,inputSha256:hash(setup),old:prior};
 });
 writeFileSync(manifestPath,JSON.stringify({schema:'second-level-access-inputs-v1',rows,
  reference:'8ca8deebe4afa91c3021bdd119bed8976cf00e47',accepted:'90edc52530caa71efdebf257f17d954a8a629ea0',
  selection:'A018/A030 unachieved Duo jobs; predeclared successful achieved A027 wide-zone block/defensive recovery',
  budget:'Three exact existing inputs per necessary source, max5 native seconds/10wall seconds each; no games/new rosters.'},null,2)+'\n');
 console.log('Frozen three saved inputs, zero simulations');process.exit(0);
}
assert.equal(mode,'run');
const manifestBytes=readFileSync(manifestPath),manifest=JSON.parse(manifestBytes);
const selected=idsText?manifest.rows.filter(r=>idsText.split(',').includes(r.id)):manifest.rows;
assert(selected.length>0);const until=untilText?Number(untilText):5;assert(until>0&&until<=5);
const nativeMethods=Object.fromEntries(['update','attack','zoneFlow','readRules','readZone','leaveCombination','plannedClimb','startDeparture'].map(k=>[k,RunBlocker.prototype[k]]));
const body=a=>structuredClone(a.body);
const rep=e=>e?{b:e.blocker.idx,d:e.defender.idx,helpers:e.helpers.map(a=>a.idx),phi:e.phi,baseB:e.baseB,baseD:e.baseD,
 control:e.control,move:e.move,side:e.side,helperHands:e.helpers.map(a=>({a:a.idx,control:contactControl(e,a),support:helperSupport(active.sim,e,a),live:!!e.helperHands?.get(a)&&active.sim.world.joints.includes(e.helperHands.get(a)),hands:e.helperHands?.get(a)?{normal:e.helperHands.get(a).normalForce,tangent:e.helperHands.get(a).tangentForce,extension:e.helperHands.get(a).extension}:null})),hands:e.hands?{normal:e.hands.normalForce,tangent:e.hands.tangentForce,extension:e.hands.extension}:null}:null;
const proposal=p=>p?{t:p.t,cost:p.cost,climber:p.climber.idx,keeper:p.keeper.idx,phi:p.phi,departure:p.departure}:null;
const combo=c=>c?{members:c.members.map(a=>a.idx),defender:c.defender.idx,backer:c.backer?.idx,released:c.released,
 helpPolicy:c.helpPolicy,secureSince:c.secureSince,checkSince:c.checkSince,checkNextRead:c.checkNextRead,nextRead:c.nextRead,
 reads:c.reads?.map(r=>({...r,proposal:proposal(r.proposal)})),rep:rep(c.defender.engagement)}:null;
const plan=c=>({kind:c.plan.kind,target:c.plan.target?.idx,drive:c.plan.drive,combination:combo(c.plan.combination),zoneRead:c.zoneRead?structuredClone(c.zoneRead):null,collectionRead:c.collectionRead?{target:c.collectionRead.target.idx,partner:c.collectionRead.partner.idx,at:c.collectionRead.at,nextRead:c.collectionRead.nextRead,down:c.collectionRead.down,choice:c.collectionRead.choice}:null,
 departure:c.plan.departure?Object.fromEntries(Object.entries(c.plan.departure).map(([k,a])=>[k,a.idx])):null,
 departureRead:c.departureRead?structuredClone(c.departureRead):null,climbRead:c.climbRead?{nextRead:c.climbRead.nextRead,
 meet:c.climbRead.meet,through:c.climbRead.through,attainable:c.climbRead.attainable,seenVel:c.climbRead.seenVel}:null});
let active=null;const all=[],started=performance.now();
for(const input of selected){
 assert(performance.now()-started<30000,'Predeclared batch budget');
 assert.equal(hash(input.setup),input.inputSha256,'Frozen setup hash');
 const sim=new PlaySim(structuredClone(input.setup)),frames=[],calls=[],reads=[],joined=[];
 const initial=sim.agents.map(a=>({idx:a.idx,slot:a.slot,id:a.player.id,body:body(a),profile:a.profile,
  plan:a.behavior instanceof RunBlocker?plan(a.behavior):null})),stack=[];
 active={sim,calls,stack};
 for(const [name,native] of Object.entries(nativeMethods))RunBlocker.prototype[name]=function(a,s,...args){
  const entry={t:s.t,a:a.idx,slot:a.slot,method:name,depth:stack.length,mind:{urgency:a.mind.urgency,decisionInterval:a.mind.decisionInterval},body:body(a),before:plan(this)};
  if(name==='startDeparture')entry.acquiredDeparture=args.at(-1);
  stack.push(name);calls.push(entry);try{const value=native.call(this,a,s,...args);entry.returned=structuredClone(value);entry.after=plan(this);return value;}
  finally{stack.pop();}
 };
 const see=sim.see.bind(sim);let join=false,spacingBefore=null;
 sim.see=(a,b,...args)=>{const picture=see(a,b,...args);
  const spacing=!stack.length&&!join&&['RT','Y'].includes(a.slot)&&new Error().stack.includes('spaceTeammates');
  if(stack.length||join||spacing)reads.push({t:sim.t,a:a.idx,b:b.idx,context:spacing?'spacing':join?'joined-security':stack.join('/'),
   picture:structuredClone(picture),...(spacing?{calledMotion:b.behavior.calledMotion?.()??null}:{})});
  return picture;};
 const prepare=sim.prepareJoinedRunBlocks.bind(sim);
 sim.prepareJoinedRunBlocks=()=>{
  const combinations=()=>[...new Set(sim.offense.flatMap(a=>a.behavior instanceof RunBlocker&&a.behavior.plan.combination?[a.behavior.plan.combination]:[]))].map(combo);
  const entry={t:sim.t,before:combinations()};join=true;
  try{prepare();}finally{join=false;}entry.after=combinations();joined.push(entry);
 };
 sim.intents=new Proxy(sim.intents,{set(target,key,value){
  if(spacingBefore===null&&/^\d+$/.test(String(key))&&new Error().stack.includes('spaceTeammates'))
   spacingBefore=structuredClone([...target]);
  return Reflect.set(target,key,value);
 }});
 const step=sim.world.step.bind(sim.world);
 sim.world.step=(intents,dt)=>{
  const before=sim.agents.map(body),raw=structuredClone(sim.cmds),preSpacing=spacingBefore,final=structuredClone([...intents]);
  const beforeReps=sim.engagements.map(rep),report=step(intents,dt);
  frames.push({t:sim.t,before,raw,preSpacing,final,after:sim.agents.map(body),beforeReps,afterReps:sim.engagements.map(rep),
   rng:JSON.stringify(sim.rng),report:{contacts:report.contacts,strikes:report.strikes,work:report.work,
    groundImpulse:report.groundImpulse,armImpulse:report.armImpulse,armImpulseLimit:report.armImpulseLimit}});
  spacingBefore=null;return report;
 };
 const start=performance.now();while(sim.phase==='live'&&sim.t<until){assert(performance.now()-start<5000,'Named short-case wall budget');sim.tick();}
 for(const [name,native]of Object.entries(nativeMethods))RunBlocker.prototype[name]=native;
 const result=sim.buildResult();
 const summary={id:input.id,source:sourceVersion(),inputSha256:input.inputSha256,elapsedSeconds:(performance.now()-start)/1000,
  phase:sim.phase,endTime:sim.t,censor:sim.phase==='live'?`live at${sim.t}s`:'native ending',outcome:result.outcome,
  yards:result.offenseYards,events:sim.events};
 all.push({...summary,initial,frames,calls,reads,joined,result});console.log(JSON.stringify(summary));
}
const profile=JSON.parse(readFileSync('config/baseline.json'));
const receipt={schema:'second-level-access-native-v1',commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),
 sourceSha256:sourceVersion(),node:process.version,flags:Object.fromEntries(Object.keys(profile.flags).map(k=>[k,process.env[k]??null])),
 worldDefaults:profile.worldDefaults,inputManifestSha256:hash(manifestBytes),collectorSha256:hash(readFileSync(import.meta.filename)),
 cases:selected.map(r=>({id:r.id,inputSha256:r.inputSha256})),until,elapsedSeconds:(performance.now()-started)/1000,
 qualification:'Read-only wrappers on original methods, no extra cue/RNG calls. preSpacing captured before first spacing assignment; final after spacing/snap gate. Native event times retained.',fullGames:0};
mkdirSync(out,{recursive:true});writeFileSync(out+'/trace.json.gz',gzipSync(JSON.stringify({receipt,rows:all})));
writeFileSync(out+'/receipt.json',JSON.stringify(receipt,null,2)+'\n');
