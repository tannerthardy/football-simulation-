/** One ordinary full-context continuation; no controller/state overrides. */
import {writeFileSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
import {makeSaved,savedInputs} from './saved.js';
import {sourceVersion} from '../../source-version.js';
const id=process.argv[2],output=process.argv[3];if(!id||!output)throw Error('id/output required');
const c=savedInputs().cases.find((c:any)=>c.id===id);if(!c)throw Error('undeclared input');
const start=performance.now(),sim=makeSaved(c),frames:any[]=[];
let maxResidual=0,maxArmExcess=0,maxSupportExcess=0;
while(sim.phase==='live'&&sim.t<12){
 if(performance.now()-start>8000)throw Error('wall budget');sim.tick();
 const r=sim.lastStep!;maxResidual=Math.max(maxResidual,Math.abs(r.work.residual));
 for(let i=0;i<sim.agents.length;i++){maxArmExcess=Math.max(maxArmExcess,r.armImpulse[i]-r.armImpulseLimit[i],r.armWork[i]-r.armWorkLimit[i]);maxSupportExcess=Math.max(maxSupportExcess,r.supportMotorWork[i]-r.supportMotorWorkLimit[i]);}
 frames.push({t:sim.t,bodies:sim.agents.map(a=>({slot:a.slot,pos:{...a.pos},vel:{...a.vel},kind:a.behavior.kind,intent:structuredClone(sim.intents[a.idx])})),impacts:r.contacts.filter(c=>c.impulse>0&&sim.agents[c.i].team==='O'&&sim.agents[c.j].team==='O').map(c=>({a:sim.agents[c.i].slot,b:sim.agents[c.j].slot,impulse:c.impulse}))});
}
const terminal=sim.phase!=='live',r=terminal?sim.buildResult():null;
const d={id,source:sourceVersion(),elapsedSeconds:(performance.now()-start)/1000,terminal,t:sim.t,outcome:r?.outcome??'explicit12secondcensor',gain:r?.offenseYards??null,maxResidual,maxArmExcess,maxSupportExcess,handoffAt:sim.handoffAt,events:sim.events,frames};
writeFileSync(output,gzipSync(JSON.stringify(d)));console.log(JSON.stringify({...d,frames:undefined,events:d.events.filter(e=>['carrier_contact','tackle_wrap','tackle','out_of_bounds','touchdown','handoff'].includes(e.type)||e.note?.includes('exchange passed'))}));
