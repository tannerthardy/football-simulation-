/** One bounded native witness/control evaluation. All observations below are
 * passive copies of actual see calls; neither mind nor future path is injected.
 * Runtime composition belongs to the launcher/receipt, not this collector. */
import {writeFileSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
import {makeSaved,savedInputs} from './saved.js';
import {sourceVersion} from '../../source-version.js';

const output=process.argv[2];if(!output)throw Error('explicit output required');
const start=performance.now(),rows=[];
for(const id of ['G3-P087','G3-P140']){
 const c=savedInputs().cases.find((c:any)=>c.id===id);if(!c)throw Error('missing frozen input');
 const sim=makeSaved(c),frames:any[]=[],observations:any[]=[];
 const see=sim.see.bind(sim);
 sim.see=(a,b,delayScale=1)=>{
  const picture=see(a,b,delayScale);
  if((a.team==='D'&&(b===sim.qb||b.slot==='RB'))||(a===sim.qb&&b.slot==='RB'))
   observations.push({t:sim.t,a:a.idx,b:b.idx,slot:a.slot,target:b.slot,kind:a.behavior.kind,
    belief:a.recog?.read??null,picture:structuredClone(picture)});
  return picture;
 };
 let maxResidual=0,maxArmExcess=0,maxSupportExcess=0;
 const caseStart=performance.now();
 while(sim.phase==='live'&&sim.t<12){
  if(performance.now()-caseStart>8000)throw Error(`${id}: wall budget`);
  const startT=sim.t;sim.tick();
  const r=sim.lastStep!;maxResidual=Math.max(maxResidual,Math.abs(r.work.residual));
  for(let i=0;i<sim.agents.length;i++){
   maxArmExcess=Math.max(maxArmExcess,r.armImpulse[i]-r.armImpulseLimit[i],r.armWork[i]-r.armWorkLimit[i]);
   maxSupportExcess=Math.max(maxSupportExcess,r.supportMotorWork[i]-r.supportMotorWorkLimit[i]);
  }
  frames.push({startT,t:sim.t,carrier:sim.carrier?.slot??null,
   bodies:sim.agents.map(a=>({slot:a.slot,pos:{...a.pos},vel:{...a.vel},facing:a.body.facing,
    kind:a.behavior.kind,intent:structuredClone(sim.intents[a.idx]),support:a.body.support?.state??null})),
   impacts:r.contacts.filter(c=>c.impulse>0&&sim.agents[c.i].team==='O'&&sim.agents[c.j].team==='O')
    .map(c=>({a:sim.agents[c.i].slot,b:sim.agents[c.j].slot,impulse:c.impulse}))});
 }
 const terminal=sim.phase!=='live',result=terminal?sim.buildResult():null;
 const row={id,los:sim.los,slots:sim.agents.map(a=>a.slot),elapsedSeconds:(performance.now()-caseStart)/1000,
  terminal,t:sim.t,outcome:result?.outcome??'explicit12secondcensor',gain:result?.offenseYards??null,
  maxResidual,maxArmExcess,maxSupportExcess,handoffAt:sim.handoffAt,events:sim.events,
  decisions:sim.trace.data?.decisions??[],observations,frames};
 rows.push(row);
 console.log(JSON.stringify({...row,frames:undefined,observations:undefined,
  events:row.events.filter(e=>['carrier_contact','tackle_wrap','tackle','out_of_bounds','touchdown','handoff'].includes(e.type)||e.note?.includes('exchange passed')),
  decisions:row.decisions.filter(d=>d.kind==='run-fit-mesh')}));
}
writeFileSync(output,gzipSync(JSON.stringify({source:sourceVersion(),elapsedSeconds:(performance.now()-start)/1000,
 qualification:'Fresh native all-player reconstruction; observer memory starts empty and only actual see calls are copied. Tick startT emits the request whose achieved state is at t.',rows})));
