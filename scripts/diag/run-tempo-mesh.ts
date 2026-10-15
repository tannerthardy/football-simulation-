/** Same-snap two-body mesh experiment. No all-22 play or forced transfer. */
import {mkdirSync, writeFileSync} from 'node:fs';
import {Rng} from '../../src/core/rng.js';
import {generateTeam,pickDefense,pickOffense} from '../../src/league/team.js';
import {RUN_BY_ID} from '../../src/playbook/concepts.js';
import {COVERAGE_BY_ID,FRONT_BY_ID} from '../../src/playbook/defense.js';
import {FORMATION_BY_ID} from '../../src/playbook/formations.js';
import {World,type Intent} from '../../src/physics/world.js';
import {RunnerToMesh} from '../../src/sim/assign.js';
import {handoffReach} from '../../src/sim/ball-transfer.js';
import {PlaySim} from '../../src/sim/playsim.js';
import {sourceVersion} from '../source-version.js';

export function meshExperiment(rolling:boolean|null,delay:number,concept='iz_strong') {
 const formation=FORMATION_BY_ID.ace_12;
 const sim=new PlaySim({
  offense:pickOffense(generateTeam(new Rng(31),'O','O',{strength:.55}),formation.personnel),
  defense:pickDefense(generateTeam(new Rng(32),'D','D',{strength:.55}),'base43'),
  offCall:{formation,flip:false,kind:'run',run:RUN_BY_ID[concept],label:concept},
  defCall:{personnel:'base43',front:FRONT_BY_ID.over,coverage:COVERAGE_BY_ID.cover3,pressure:null,label:'Over'},
  los:40,ballY:26.666666666666668,firstDownX:50,seed:3});
 const qb=sim.qb,rb=sim.slot('RB')!,old=rb.behavior as RunnerToMesh;
 rb.behavior=new RunnerToMesh(old.mesh,old.meshTime,old.aim,rolling ?? old.ride);
 const initial=[structuredClone(qb.body),structuredClone(rb.body)],world=new World([qb.body,rb.body]);
 const frames:any[]=[];let steps=0;
 for(let k=0;k<80&&sim.carrier===qb;k++) {
  sim.t=k*.05;world.time=sim.t;
  sim.perception.record(sim.agents,sim.carrier?.idx??null);
  sim.teammateAwareness.sense(sim.agents,sim.t,sim.dt);
  const before=[structuredClone(qb.body),structuredClone(rb.body)];
  const q=sim.t<qb.snapReadyAt?{vel:{x:0,y:0}}:qb.behavior.update(qb,sim);
  const r=sim.carrier===rb||sim.t<rb.snapReadyAt?{vel:{x:0,y:0}}:rb.behavior.update(rb,sim);
  frames.push({t:sim.t,before,commands:[q,r],handed:sim.carrier===rb});
  if(sim.carrier===rb)break;
  world.step([sim.t<delay?{vel:{x:0,y:0}}:q,r] as Intent[],.05);steps++;
 }
 const f=frames.find(f=>f.handed);
 return {rolling,installedRolling:old.ride,delay,concept,initial,steps,handoff:f?{t:f.t,rbSpeed:Math.hypot(f.before[1].vel.x,f.before[1].vel.y),
  distance:Math.hypot(f.before[0].pos.x-f.before[1].pos.x,f.before[0].pos.y-f.before[1].pos.y),
  physicalReach:handoffReach(qb,rb)}:null,frames};
}
if(process.argv[1]?.endsWith('/run-tempo-mesh.ts')) {
const start=performance.now();
const cases=[meshExperiment(false,0),meshExperiment(null,0),meshExperiment(false,1),meshExperiment(null,1)];
const result={kind:'isolated same-snap QB/RB World experiment; no native all-22 play',sourceSha256:sourceVersion(),
 ordinaryOwnWorldSteps:cases.reduce((n,c)=>n+c.steps,0),nativePlays:0,elapsedSeconds:(performance.now()-start)/1000,cases};
mkdirSync('out/tempo-climb',{recursive:true});writeFileSync('out/tempo-climb/mesh-experiment.json',JSON.stringify(result)+'\n');
console.log(JSON.stringify({...result,cases:cases.map(({frames,initial,...rest})=>rest)}));
}
