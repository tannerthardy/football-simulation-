/** Passive short-prefix contact/footwork tape. No extra sensing, RNG, previews,
 * player commands or outcome overrides. All22 controllers and World react. */
import {createHash} from 'node:crypto';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {dirname} from 'node:path';
import {gzipSync,gunzipSync} from 'node:zlib';
import {RunBlocker} from '../../../src/sim/behaviors/blocking.js';
import {runContactObservers} from '../../../src/sim/run-contact-observer.js';
import {PlaySim} from '../../../src/sim/playsim.js';
import {sourceVersion} from '../../source-version.js';
import {makeSim,rosters} from './inputs.js';

const output=process.argv[2]; if(!output)throw Error('Explicit output required');
const selected=(process.argv[3]??'oz-strong').split(',');
const until=Number(process.argv[4]??3);if(!(until>0&&until<=3.5))throw Error('Prefix cap is3.5s');
const R=rosters(),source=sourceVersion(),start=performance.now(),rows:any[]=[];
const hash=(x:unknown)=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
for(const id of selected){
 const fresh=id==='fresh-wide9';
 const duo=id==='duo';
 const concept=id.startsWith('oz-')?'oz':'wz';
 const direction=id.includes('weak')?'weak':'strong';
 const setup=duo?JSON.parse(gunzipSync(readFileSync('test/fixtures/planned-climb-fit.json.gz')).toString()).setup:null;
 const spec={concept,dir:direction,look:fresh?'wide9':'over3',roster:fresh?'pair31':'pair11',seed:fresh?83:77,formation:'ace_12'} as const;
 if(!['oz-strong','wz-strong','wz-weak','duo','fresh-wide9'].includes(id))throw Error('Unknown case '+id);
 const sim=duo?new PlaySim(structuredClone(setup)):makeSim(spec,R);
 const initial=sim.agents.map(a=>({idx:a.idx,slot:a.slot,player:a.player,body:structuredClone(a.body)}));
 const movement:any[]=[],frames:any[]=[];let tick=0;
 runContactObservers.set(sim,(e,phase,data)=>{
  if(phase!=='movement')return;
  const behavior=e.blocker.behavior;
  movement.push({t:sim.t,tick,blocker:e.blocker.slot,defender:e.defender.slot,
   helpers:e.helpers.map(a=>a.slot),control:e.control,
   ownKind:behavior instanceof RunBlocker?behavior.plan.kind:null,
   liveCombination:behavior instanceof RunBlocker?!!behavior.plan.combination&&!behavior.plan.combination.released:false,
   zoneRead:behavior instanceof RunBlocker?structuredClone(behavior.zoneRead):null,
   ...structuredClone(data)});
 });
 while(sim.phase==='live'&&sim.t<until-1e-8){
  if(performance.now()-start>12000)throw Error('12s batch budget');
  const before=sim.agents.map(a=>structuredClone(a.body));
  sim.tick();
  const report=sim.lastStep!;
  frames.push({t:sim.t,before,bodies:sim.agents.map(a=>structuredClone(a.body)),
   commands:structuredClone(sim.intents),
   reps:sim.engagements.map(e=>({blocker:e.blocker.slot,defender:e.defender.slot,helpers:e.helpers.map(a=>a.slot),
    drive:e.drive,surface:e.surfaceAxis,sealTarget:e.sealTarget,control:e.control,
    hands:[e.hands,...(e.helperHands?.values()??[])].filter(Boolean).map(j=>({
     actor:sim.agents.find(a=>a.body===j!.actor)?.slot,normal:j!.normalForce,tangent:j!.tangentForce,hold:j!.hold}))})),
   contacts:report.contacts,work:report.work,armImpulse:report.armImpulse,armLimit:report.armImpulseLimit});
  tick++;
 }
 rows.push({id,spec:duo?'saved-Duo':spec,initial,initialHash:hash(initial),movement,frames,
  until:sim.t,terminal:sim.phase!=='live',events:sim.events,firstContact:sim.events.find(e=>e.type==='carrier_contact')??null});
}
if(source!==sourceVersion())throw Error('Engine changed during collection');
mkdirSync(dirname(output),{recursive:true});
writeFileSync(output,gzipSync(JSON.stringify({source,node:process.version,elapsedSeconds:(performance.now()-start)/1000,rows})));
console.log(JSON.stringify({source,rows:rows.map(r=>({id:r.id,ticks:r.frames.length,terminal:r.terminal,firstContact:r.firstContact,
 phases:r.movement.reduce((o:any,m:any)=>{const k=m.blocker+':'+m.ownKind+':'+(m.zoneRead?.phase??'none');o[k]=(o[k]??0)+1;return o;},{})}))}));
