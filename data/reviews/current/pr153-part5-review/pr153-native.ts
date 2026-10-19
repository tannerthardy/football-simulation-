import {writeFileSync} from 'node:fs';
import {makeSim} from './scripts/diag/zone-lab/lab.js';
import {runContactObservers} from './src/sim/run-contact-observer.js';
const sim=makeSim({concept:'power',dir:'strong',formation:'ace_12',look:'under3',roster:'pair31',seed:77});
const out=process.argv[2],frames:any[]=[],moves:any[]=[];
const initial=structuredClone(sim.agents.map(a=>({slot:a.slot,pos:a.pos,vel:a.vel,profile:a.profile})));
runContactObservers.set(sim,(e,kind,data)=>{
 if(kind!=='movement' && kind!=='end')return;
 moves.push(structuredClone({t:sim.t,b:e.blocker.slot,d:e.defender.slot,start:e.start,kind,data}));
});
while(sim.phase==='live'&&sim.t<20){
 sim.tick();
 frames.push(structuredClone({t:sim.t,actors:sim.agents.map(a=>({slot:a.slot,pos:a.pos,vel:a.vel,intent:sim.intents[a.idx],support:a.body.support?.state,rep:a.engagement?{b:a.engagement.blocker.slot,d:a.engagement.defender.slot,start:a.engagement.start}:null})),reps:sim.engagements.map(e=>({b:e.blocker.slot,d:e.defender.slot,start:e.start,hands:e.hands?{normal:e.hands.normalForce,tangent:e.hands.tangentForce}:null}))}));
}
const res=sim.buildResult();
writeFileSync(out,JSON.stringify({case:'power/strong/ace_12/under3/pair31/77',drive:process.env.DRIVE_CONNECT,initial,frames,moves,events:sim.events,result:{gain:res.offenseYards,outcome:res.outcome},terminal:sim.phase!=='live'}));
console.log(JSON.stringify({out,frames:frames.length,gain:res.offenseYards,outcome:res.outcome}));
