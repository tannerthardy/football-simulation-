/** Read-only retained-native terminal/contact audit. No production changes. */
import {createHash} from 'node:crypto';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {gzipSync,gunzipSync} from 'node:zlib';
import {CENTER_Y} from '../tackle-breakthrough/final-source/src/core/field.js';
import {Rng} from '../tackle-breakthrough/final-source/src/core/rng.js';
import {generateTeam,pickDefense,pickOffense} from '../tackle-breakthrough/final-source/src/league/team.js';
import {PASS_BY_ID,RUN_BY_ID} from '../tackle-breakthrough/final-source/src/playbook/concepts.js';
import {COVERAGE_BY_ID,FRONT_BY_ID,PRESSURE_BY_ID} from '../tackle-breakthrough/final-source/src/playbook/defense.js';
import {FORMATION_BY_ID} from '../tackle-breakthrough/final-source/src/playbook/formations.js';
import {PlaySim} from '../tackle-breakthrough/final-source/src/sim/playsim.js';
import {sourceVersion} from '../tackle-breakthrough/final-source/scripts/source-version.js';
const root=resolve(import.meta.dirname,'../..'),archive=resolve(root,'out/tackle-breakthrough/final-source');
const output=resolve(root,'out/contact-follow-up/terminal-contact-audit.json.gz');process.chdir(archive);
const hash=(x:any)=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const sourceBefore=sourceVersion();if(sourceBefore!=='8bc3eec8d0b842021d000585bb71331be17d6a644c763b2e510303cb4372d942')throw new Error('Wrong archive');
const published=JSON.parse(gunzipSync(readFileSync(resolve(root,'data/reviews/pursuit-and-tackle/passing/final.json.gz'))).toString());
const approach=JSON.parse(gunzipSync(readFileSync(resolve(root,'data/reviews/pursuit-and-tackle/approach/final.json.gz'))).toString());
const ids=['DA-R2-curl_flat-cover3-R','DA-R2-curl_flat-cover2-R','DA-R2-pa_post_dig-cover3-R',
 'DA-R1-four_verts-cover6-R','DA-R1-four_verts-cover6-L','DA-R1-pa_post_dig-cover0-R',
 'DA-R1-four_verts-cover0-R','DA-R1-curl_flat-cover3-R','TA-R2-iz_strong-over-L-S3'];
const teams=[[31,32],[41,42]].map(([o,d])=>({offense:generateTeam(new Rng(o),'Awareness offense','AOF',{strength:.55}),
 defense:generateTeam(new Rng(d),'Awareness defense','ADF',{strength:.55})}));
function make(id:string,record:boolean){
 if(id.startsWith('TA-')){const o=generateTeam(new Rng(41),'Approach offense 2','O2',{strength:.55}),d=generateTeam(new Rng(42),'Approach defense 2','D2',{strength:.55}),formation=FORMATION_BY_ID.ace_11;
  return new PlaySim({offense:pickOffense(o,formation.personnel),defense:pickDefense(d,'base43'),offCall:{formation,flip:true,kind:'run',run:RUN_BY_ID.iz_strong,label:id},
   defCall:{personnel:'base43',front:FRONT_BY_ID.over,coverage:COVERAGE_BY_ID.cover3,pressure:null,zoneStyle:'match',label:id},
   los:40,ballY:CENTER_Y,firstDownX:50,seed:3,audibles:false,record,recordLevel:'full',recordEvery:1});}
 const input=published.rows.find((r:any)=>r.id===id),roster=input.roster[0]===31?0:1,formation=FORMATION_BY_ID[input.formation];
 return new PlaySim({offense:pickOffense(teams[roster].offense,formation.personnel),defense:pickDefense(teams[roster].defense,'nickel'),
  offCall:{formation,flip:input.flip,kind:'pass',pass:PASS_BY_ID[input.concept],label:`${input.formation}/${input.concept}`},
  defCall:{personnel:'nickel',front:FRONT_BY_ID.over,coverage:COVERAGE_BY_ID[input.coverage],pressure:input.coverage==='cover0'?PRESSURE_BY_ID.zero_6:null,zoneStyle:'match',label:`Over ${input.coverage}`},
  los:40,ballY:CENTER_Y,firstDownX:50,seed:3,record,recordLevel:'full',recordEvery:1,audibles:false});
}
const body=(a:any)=>({idx:a.idx,slot:a.slot,pos:{...a.pos},vel:{...a.vel},speed:a.speed,energy:a.body.energy,support:structuredClone(a.body.support)});
const signature=(s:PlaySim,r:any)=>hash({result:{...r,frames:undefined,telemetry:undefined},bodies:s.agents.map(a=>a.body),intents:s.intents,minds:s.agents.map(a=>a.mind),rng:{...s.rng}});
const compactResult=(r:any)=>({...r,frames:undefined,telemetry:undefined});
const rows=[];
for(const id of ids){const sim=make(id,true),initial=hash(sim.agents.map(a=>({slot:a.slot,player:a.player,profile:a.profile}))),steps:any[]=[],terminals:any[]=[];
 const context=()=>({t:sim.t,worldTime:sim.world.time,phase:sim.phase,ball:sim.ball.kind,carrier:sim.carrier?body(sim.carrier):null,
  bond:sim.bond?{start:sim.bond.start,age:sim.t-sim.bond.start,stalled:sim.bond.stalled,progressX:sim.bond.progressX,carrier:sim.bond.carrier.idx,
   holders:sim.bond.tacklers.map(a=>({body:body(a),quality:sim.bond?.grip?.get(a),joint:(()=>{const j=sim.bond?.holds?.get(a);return j?{...j,a:undefined,b:undefined}:null;})()}))}:null,
  lastStep:sim.lastStep?{falls:sim.lastStep.falls,downs:sim.lastStep.downs,substeps:sim.lastStep.substeps}:null,lastEvents:sim.events.slice(-5)});
 const worldStep=sim.world.step,finish=sim.finishCarry,whistle=sim.whistle;
 sim.world.step=function(intents,dt){const pre=context(),report=worldStep.call(this,intents,dt);if(pre.bond||sim.bond)steps.push({pre,post:context(),report:structuredClone(report)});return report;};
 sim.finishCarry=function(kind,spot){terminals.push({entry:'finishCarry',kind,spot:{...spot},context:context(),stack:new Error().stack?.split('\n').slice(1,7)});return finish.call(this,kind,spot);};
 sim.whistle=function(kind,spot){terminals.push({entry:'whistle',kind,spot:{...spot},context:context(),stack:new Error().stack?.split('\n').slice(1,7)});return whistle.call(this,kind,spot);};
 const result=sim.run(),control=make(id,false),plain=control.run(),neutral=signature(sim,result)===signature(control,plain);if(!neutral)throw new Error('Observer changes '+id);
 const retained=id.startsWith('TA-')?approach.rows.find((r:any)=>r.input.id===id):published.rows.find((r:any)=>r.id===id);
 const exactResult=result.outcome===retained.outcome&&result.offenseYards===retained.offenseYards&&result.duration===retained.duration&&hash(result.events)===hash(retained.events);
 if(!exactResult)throw new Error('Published result mismatch '+id);
 if(!id.startsWith('TA-')&&initial!==retained.profilesSha256)throw new Error('Profiles mismatch '+id);
 rows.push({id,sourceBefore,initialProfilesSha256:initial,observerVerified:neutral,publishedResultVerified:exactResult,result:compactResult(result),terminals,steps});
 console.log(JSON.stringify({id,outcome:result.outcome,yards:result.offenseYards,yac:result.stats.yac,neutral,terminals:terminals.map(t=>({entry:t.entry,kind:t.kind,t:t.context.t,carrier:t.context.carrier?.slot,state:t.context.carrier?.support?.state,bondAge:t.context.bond?.age,stall:t.context.bond?.stalled}))}));
}
const sourceAfter=sourceVersion();if(sourceBefore!==sourceAfter)throw new Error('Archive changed');
mkdirSync(dirname(output),{recursive:true});writeFileSync(output,gzipSync(JSON.stringify({schema:'terminal-contact-read-only-v1',sourceBefore,sourceAfter,
 toolSha256:createHash('sha256').update(readFileSync(import.meta.filename)).digest('hex'),ids,
 definitions:{selection:'Three retrospective largest pass YAC escapes; retained standing-wrap mirrors, explicit dive/slip adverse control, pocket-QB ordinary control, ordinary curl-flat and previous unclassified fumble recovery. Not an NFL rate population.',
 observer:'Only existing current state/entrypoints/report are copied. No extra observations, commands or RNG. Every observed final result/bodies/intents/minds/RNG matches unrecorded execution. Published events/outcomes/gains/durations match.',
 terminal:'Captures actual entrypoint caller stack and current support/bond at whistle, separating physical down, QB grasp, stalled forward progress, cap and direct fumble recovery. No new finish is imposed.'},rows}),{level:9}));
