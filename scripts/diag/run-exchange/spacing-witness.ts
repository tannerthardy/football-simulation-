/** One saved prefix to name the consumed teammate constraint. Frozen peer
 * omission is diagnostic only; no continued route or production bypass. */
import {writeFileSync} from 'node:fs';
import {makeSaved,savedInputs} from './saved.js';
import {spaceTeammates} from '../../../src/sim/spacing.js';
import {previewFreeMovement} from '../../../src/physics/movement-preview.js';
import {sourceVersion} from '../../source-version.js';
const start=performance.now(),c=savedInputs('test/fixtures/climb-access-inputs.json.gz').cases[0],sim=makeSaved(c),actor=sim.slot('C')!;
let peers:any[]=[],active=false,last=-1,saved:any=null;
const see=sim.see.bind(sim);
sim.see=((...args:Parameters<typeof sim.see>)=>{
 const p=see(...args);active=args[0]===actor&&sim.t===2.35&&!!new Error().stack?.includes('spaceTeammates');last=args[1].idx;
 if(active){if(!saved)saved=structuredClone({t:sim.t,body:actor.body,raw:sim.intents[actor.idx]});peers.push({idx:last,slot:args[1].slot,profile:args[1].profile,picture:structuredClone(p),called:null});}
 return p;
})as typeof sim.see;
for(const a of sim.offense){const f=a.behavior.calledMotion?.bind(a.behavior);if(f)a.behavior.calledMotion=()=>{const v=f();if(active&&last===a.idx){const p=peers.at(-1);p.called=v?{...v}:null;}return v;};}
while(sim.t<2.4)sim.tick();
if(!saved||peers.length!==10)throw Error('expected all10 personally consumed teammates');
saved.final=structuredClone(sim.intents[actor.idx]);saved.actualAfter=structuredClone(actor.body);
peers=peers.map(p=>{const q=structuredClone(p.picture);if(p.called){const age=q.age??0;q.pos.x+=(p.called.x-q.vel.x)*age;q.pos.y+=(p.called.y-q.vel.y)*age;q.vel=p.called;}return{...p,picture:q};});
const rows=[];
for(const omitted of [null,'RB','RG','LG']){
 const clones=sim.agents.map(a=>Object.assign(Object.create(Object.getPrototypeOf(a)),a,{body:structuredClone(a===actor?saved.body:a.body)}));
 const own=clones[actor.idx],intents=clones.map(()=>({vel:{x:0,y:0},free:true}as any));intents[actor.idx]=structuredClone(saved.raw);
 const included=clones.filter(a=>a.slot!==omitted);
 // Array indices own the intent array; retain corresponding entries after omission.
 const commands=included.map(a=>intents[a.idx]);
 spaceTeammates(included,commands,(a,b)=>peers.find(p=>p.idx===b.idx)?.picture??{pos:b.pos,vel:b.vel},{now:2.35,constrained:new Set()});
 const command=commands[included.indexOf(own)];
 rows.push({omitted,command});
}
const finalStep=previewFreeMovement(structuredClone(saved.body),saved.final,saved.t,1)[0];
const error=Math.hypot(finalStep.pos.x-saved.actualAfter.pos.x,finalStep.pos.y-saved.actualAfter.pos.y);
const data={source:sourceVersion(),elapsedSeconds:(performance.now()-start)/1000,qualification:'Frozen one-call peer omission identifies constraint; no production bypass or future-route proof. Other actors skipped only in this frozen call. Actual native prefix keptall22.',saved,peers,rows,finalRequestOneStep:{predicted:finalStep,actual:{pos:saved.actualAfter.pos,vel:saved.actualAfter.vel},positionError:error}};
writeFileSync('out/run-failed-exchange/spacing-witness.json',JSON.stringify(data,null,2));console.log(JSON.stringify({rows,exact:JSON.stringify(rows[0].command)===JSON.stringify(saved.final),oneStepError:error}));
