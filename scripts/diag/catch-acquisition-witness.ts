/** A causal information-boundary probe, not a valid football candidate.
 * Preserve the native prefix, change only one defender's access to global
 * carrier identity during one existing controller call, then inspect one
 * World step. Never delay/freeze a defender or change real possession.
 * node --import tsx scripts/diag/catch-acquisition-witness.ts OUT.json
 */
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {dirname} from 'node:path';
import {PlaySim,type PlaySetup} from '../../src/sim/playsim.js';
import {ScoutingReport} from '../../src/sim/recognition.js';
import {CoverageScouting} from '../../src/sim/qbmind.js';
import {sourceVersion} from '../source-version.js';
const hash=(x:unknown)=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const profile=JSON.parse(readFileSync('config/baseline.json','utf8'));
const provenance={commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sourceSha256:sourceVersion(),
 collectorSha256:createHash('sha256').update(readFileSync(import.meta.filename)).digest('hex'),
 flags:Object.fromEntries(Object.keys(profile.flags).map(k=>[k,process.env[k]??null])),worldDefaults:profile.worldDefaults};
const declared=[
 {cohort:3101,id:'R3101-S1001-P65',actor:'CB_W',alternate:'X',group:'actual/target mismatch; remote prior man'},
 {cohort:3101,id:'R3101-S1001-P106',actor:'DT_S',alternate:'X',group:'remote rush control'},
 {cohort:4202,id:'R4202-S2001-P91',actor:'LB_W',alternate:'X',group:'remote blitz control'},
 {cohort:4202,id:'R4202-S2001-P95',actor:'LB_M',alternate:'Z',group:'ordinary successful in-phase tackle; possession might be inferred'},
 {cohort:4202,id:'R4202-S2001-P78',actor:'CB_S',alternate:'H',group:'ordinary successful near-hip tackle; possession might be inferred'},
];
function restore(s:any){
 const scouting=new ScoutingReport(s.scouting.strength);Reflect.set(scouting,'cells',new Map(structuredClone(s.scouting.cells)));
 const coverageScouting=Object.assign(new CoverageScouting(),structuredClone(s.coverageScouting));
 return new PlaySim({...structuredClone(s),energy:new Map(s.energy),scouting,coverageScouting,record:false} as PlaySetup);
}
function run(c:any,f:typeof declared[number],redirect:boolean,observe:boolean){
 const sim=restore(c.setup),catchT=c.result.events.find((e:any)=>e.type==='catch').t;
 while(sim.phase==='live'&&sim.t<catchT+.05-1e-9)sim.tick();
 if(sim.phase!=='live')throw Error('Witness ended before probe');
 const a=sim.agents.find(a=>a.slot===f.actor)!,alt=sim.agents.find(a=>a.team==='O'&&a.slot===f.alternate)!;
 const carrier=sim.carrier!;
 if(a.engagement||a.behavior.kind!=='pursuit'||alt===carrier)throw Error('Invalid information probe');
 const prefix={bodies:sim.agents.map(a=>structuredClone(a.body)),rng:structuredClone(sim.rng),perception:structuredClone(sim.perception),
  catchAt:sim.catchAt,carrier:carrier.idx};
 const b=a.behavior,update=b.update.bind(b),cues:any[]=[];
 let raw:any,applied:any,after:any,before:any,inside=false;
 const nativeSee=sim.see.bind(sim);
 if(observe)sim.see=(a,b,d)=>{const seen=nativeSee(a,b,d);if(inside)cues.push({actor:a.idx,target:b.idx,delay:d,seen:structuredClone(seen)});return seen;};
 if(observe||redirect)b.update=(actor,s)=>{
  inside=true;
  const view=redirect?new Proxy(s,{get(target,key,receiver){return key==='carrier'?alt:Reflect.get(target,key,receiver);}}):s;
  try{const command=update(actor,view);raw=structuredClone(command);return command;}finally{inside=false;}
 };
 const step=sim.world.step.bind(sim.world);
 if(observe)sim.world.step=(intents,dt)=>{before=structuredClone(sim.agents.map(a=>a.body));applied=structuredClone(intents[a.idx]);
  const report=step(intents,dt);after=structuredClone(sim.agents.map(a=>a.body));return report;};
 sim.tick();
 const final={bodies:sim.agents.map(a=>a.body),intents:sim.intents,rng:sim.rng,perception:sim.perception,
  events:sim.events,phase:sim.phase};
 return {prefixSha256:hash(prefix),finalSha256:hash(final),t:catchT+.05,
  identity:{actor:a.idx,actorId:a.player.id,actual:carrier.idx,actualId:carrier.player.id,alternate:alt.idx,alternateId:alt.player.id},
  raw,applied,cues,before,after,censored:sim.phase==='live',realPossessionChanged:sim.carrier!==carrier};
}
const cases=declared.map(f=>{
 const packet=JSON.parse(readFileSync(`out/catch-pursuit/native${f.cohort}.json`,'utf8')),c=packet.clips.find((c:any)=>c.id===f.id);
 if(!c)throw Error(`Missing context ${f.id}`);
 const original=run(c,f,false,true),plain=run(c,f,false,false),redirected=run(c,f,true,true);
 if(original.prefixSha256!==redirected.prefixSha256||original.finalSha256!==plain.finalSha256)throw Error('Prefix or observer mismatch');
 const a=original.identity.actor,x=original.after[a],y=redirected.after[a];
 return {fixture:f,inputSha256:hash(c.setup),observerVerified:true,prefixVerified:true,original,redirected,
  commandDifference:Math.hypot(original.raw.vel.x-redirected.raw.vel.x,original.raw.vel.y-redirected.raw.vel.y),
  firstStepPositionDifference:Math.hypot(x.pos.x-y.pos.x,x.pos.y-y.pos.y),
  firstStepVelocityDifference:Math.hypot(x.vel.x-y.vel.x,x.vel.y-y.vel.y)};
});
const out=process.argv[2];if(!out)throw Error('Supply output.json');mkdirSync(dirname(out),{recursive:true});
writeFileSync(out,JSON.stringify({schema:'catch-acquisition-identity-intervention-v1',provenance,declared,
 interpretation:'Redirect one global identity argument at an identical native decision boundary. This proves reliance on the private pointer, not an NFL gaze model, a YAC cause or a deployable acquisition controller. One-step endings are not complete play outcomes.',cases})+'\n');
console.log(JSON.stringify(cases.map(c=>({id:c.fixture.id,actor:c.fixture.actor,commandDifference:c.commandDifference,
 firstStepPositionDifference:c.firstStepPositionDifference,firstStepVelocityDifference:c.firstStepVelocityDifference}))));
