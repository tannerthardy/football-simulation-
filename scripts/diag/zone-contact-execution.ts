/** One full-context zone contact prefix; passive request/execution trace.
 * node --import tsx scripts/diag/zone-contact-execution.ts --case oz/strong/ace_12/over3/pair11/77 --until 3 --out out/zone-contact/strong.json.gz
 * The roster/case construction follows Claude's pinned zone-lab helper,
 * without importing its experimental runtime or collecting a broad panel. */
import {createHash} from 'node:crypto';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {dirname} from 'node:path';
import {gzipSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
import {Rng} from '../../src/core/rng.js';
import {generateTeam,pickDefense,pickOffense} from '../../src/league/team.js';
import {RUN_BY_ID} from '../../src/playbook/concepts.js';
import {FORMATION_BY_ID} from '../../src/playbook/formations.js';
import {FRONT_BY_ID,COVERAGE_BY_ID} from '../../src/playbook/defense.js';
import {PlaySim} from '../../src/sim/playsim.js';
import {RunBlocker} from '../../src/sim/behaviors/blocking.js';
import {runContactObservers} from '../../src/sim/run-contact-observer.js';
import type {DefensivePlayCall} from '../../src/playbook/types.js';
const arg=(n:string,d='')=>{const i=process.argv.indexOf(n);return i<0?d:process.argv[i+1]};
const id=arg('--case'),until=Number(arg('--until','3')),output=arg('--out');
if(!id||!output||!(until>0&&until<=8))throw Error('Require --case, --out and bounded --until (0,8].');
const [concept,dir,formationId,look,rosterId,seedText]=id.split('/');
const fronts:Record<string,[string,string,string,string]>={over3:['base43','over','cover3','box'],under3:['base43','under','cover3','spill'],over2:['base43','over','cover2','box'],wide9:['nickel','wide9','cover3','spill'],tite4:['base34','tite','cover4','box']};
const lookSpec=fronts[look],pair=rosterId==='pair11'?[11,12]:rosterId==='pair31'?[31,32]:null;
if(!lookSpec||!pair||!['strong','weak'].includes(dir))throw Error('Unsupported explicit input.');
const formation=structuredClone(FORMATION_BY_ID[formationId]);
const run=structuredClone(RUN_BY_ID[concept+'_'+dir]??RUN_BY_ID[concept]);
if(!formation||!run)throw Error('Unknown call');run.direction=dir as 'strong'|'weak';
const [personnel,front,coverage,edge]=lookSpec;
const setup={offense:pickOffense(generateTeam(new Rng(pair[0]),rosterId+' O',rosterId+'O',{strength:.55}),formation.personnel),
 defense:pickDefense(generateTeam(new Rng(pair[1]),rosterId+' D',rosterId+'D',{strength:.55}),personnel as any),
 offCall:{formation,flip:false,kind:'run' as const,run,label:concept},
 defCall:{personnel,front:FRONT_BY_ID[front],coverage:COVERAGE_BY_ID[coverage],pressure:null,zoneStyle:'match',runPolicy:{edge,linebacker:'stack'},label:look} as DefensivePlayCall,
 los:40,ballY:26.67,firstDownX:50,down:1,seed:Number(seedText),audibles:false,hurry:false,record:false};
const sim=new PlaySim(structuredClone(setup));
const hash=(b:string|Buffer)=>createHash('sha256').update(b).digest('hex');
const inputSha256=hash(JSON.stringify(setup));
const frames:any[]=[],moves:any[]=[];
const plan=(a:any)=>{if(!(a.behavior instanceof RunBlocker))return null;const p=a.behavior.plan;return{kind:p.kind,target:p.target?.slot,drive:p.drive,
 combination:p.combination?{members:p.combination.members.map((p:any)=>p.slot),defender:p.combination.defender.slot,backer:p.combination.backer?.slot,released:p.combination.released}:null,
 zoneRead:a.behavior.zoneRead,track:a.behavior.calledMotion?.()};};
const bodies=()=>sim.agents.map(a=>({slot:a.slot,pos:{...a.pos},vel:{...a.vel},facing:a.facing,support:structuredClone(a.body.support),plan:structuredClone(plan(a))}));
const joints=()=>sim.engagements.map(e=>({b:e.blocker.slot,d:e.defender.slot,helpers:e.helpers.map(h=>h.slot),start:e.start,drive:e.drive,axis:e.surfaceAxis,sealTarget:e.sealTarget,
 hands:e.hands?{normal:e.hands.normalForce,tangent:e.hands.tangentForce,push:e.hands.push,hold:e.hands.hold,steer:e.hands.steer,extension:e.hands.extension}:null,
 helperHands:[...(e.helperHands??new Map())].map(([h,j])=>({h:h.slot,normal:j.normalForce,tangent:j.tangentForce,push:j.push,steer:j.steer,extension:j.extension}))}));
runContactObservers.set(sim,(e,kind,data)=>{
 if(!['C','LG','RG','LT','RT','Y','H'].includes(e.blocker.slot))return;
 moves.push(structuredClone({t:sim.t,b:e.blocker.slot,d:e.defender.slot,helpers:e.helpers.map(h=>h.slot),start:e.start,kind,data}));
});
const step=sim.world.step.bind(sim.world);
sim.world.step=(commands,dt)=>{
 const t=sim.t,before=bodies(),handsBefore=structuredClone(joints());
 const raw=(sim as any).cmds.map((c:any)=>structuredClone(c));
 const final=structuredClone(commands);
 const report=step(commands,dt);
 frames.push({t,end:t+dt,before,raw,final,after:bodies(),handsBefore,handsAfter:structuredClone(joints()),
 report:{contacts:report.contacts,groundImpulse:report.groundImpulse,groundWork:report.groundWork,armImpulse:report.armImpulse,armImpulseLimit:report.armImpulseLimit,armWork:report.armWork,armWorkLimit:report.armWorkLimit,
  supportMotorWork:report.supportMotorWork,supportMotorWorkLimit:report.supportMotorWorkLimit,work:report.work}});
 return report;
};
while(sim.phase==='live'&&sim.t<until-1e-9)sim.tick();
const signature=(s:PlaySim)=>hash(JSON.stringify({t:s.t,phase:s.phase,body:s.agents.map(a=>a.body),rng:s.rng,events:s.events}));
let passiveObserverVerified:boolean|null=null;
if(process.argv.includes('--verify-observer')){
 const plain=new PlaySim(structuredClone(setup));while(plain.phase==='live'&&plain.t<until-1e-9)plain.tick();
 passiveObserverVerified=signature(plain)===signature(sim);if(!passiveObserverVerified)throw Error('Observer changed state, RNG or events');
}
const result=sim.phase==='live'?null:sim.buildResult();
const profile=JSON.parse(readFileSync('config/baseline.json','utf8'));
const outputData={case:id,inputSha256,setup,slots:sim.agents.map(a=>a.slot),profiles:sim.agents.map(a=>a.profile),
 commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),flags:Object.fromEntries(Object.keys(profile.flags).map(k=>[k,process.env[k]??null])),
 node:process.version,dt:sim.dt,until,terminal:sim.phase!=='live',censored:sim.phase==='live',passiveObserverVerified,
 result:result?{gain:result.offenseYards,outcome:result.outcome}:null,events:sim.events,moves,frames};
const bytes=Buffer.from(JSON.stringify(outputData));mkdirSync(dirname(output),{recursive:true});writeFileSync(output,gzipSync(bytes,{mtime:0} as any));
console.log(JSON.stringify({output,case:id,frames:frames.length,passiveObserverVerified,sha256:hash(bytes),terminal:outputData.terminal}));
