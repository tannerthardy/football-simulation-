/** Contact-owner question, not a proposed law or football outcome. A known
 * acquired hand-control state is an explicit initial condition, not a dice win. */
import {mkdirSync,writeFileSync} from 'node:fs';
import {makeSim,rosters} from './inputs.js';
import {syncJoints} from '../../../src/sim/engagement.js';
import {tryTackles} from '../../../src/sim/tackle.js';
import {sourceVersion} from '../../source-version.js';
const R=rosters(),rows=[];
for(const control of [.6,-.3]){
 const sim=makeSim({concept:'wz',dir:'strong',look:'over3',roster:'pair11',seed:77,formation:'ace_12'},R);
 for(const a of sim.agents){a.body.pos={x:5+a.idx*.5,y:2};a.body.vel={x:0,y:0};a.downUntil=99;}
 const b=sim.slot('C')!,d=sim.slot('LB_M')!,rb=sim.slot('RB')!;
 for(const a of[b,d,rb])a.downUntil=-1;
 b.body.pos={x:50,y:25.9};d.body.pos={x:50,y:26.67};rb.body.pos={x:50.75,y:26.67};
 b.body.facing=Math.PI/2;d.body.facing=0;rb.body.facing=0;
 sim.t=sim.world.time=2;sim.ball={kind:'held',carrier:rb};sim.handoffAt=1;
 const rep=sim.engage(b,d,'run',{x:1,y:0});if(!rep)throw Error('Physical reach did not acquire contact');
 rep.control=control;rep.win=.8;syncJoints(sim,rep);
 const hands=rep.hands!;
 const intents=sim.agents.map(a=>({vel:{x:0,y:0},facing:a.facing,push:0}));
 // One ordinary solve establishes real loaded hands and enforces all budgets.
 const report=sim.world.step(intents,sim.dt);sim.lastStep=report;
 const snapshot=()=>({b:{pos:{...b.pos},vel:{...b.vel}},d:{pos:{...d.pos},vel:{...d.vel}},rb:{pos:{...rb.pos},vel:{...rb.vel}},
  liveHands:sim.world.joints.includes(hands),actor:hands.actor===b.body?'blocker':'defender',hold:hands.hold,normal:hands.normalForce,tangent:hands.tangentForce});
 const before=snapshot(),oldChance=sim.rng.chance.bind(sim.rng);
 // Isolate admission/conversion after conditioning on an ordinary successful
 // attempt: no miss or fumble. This is explicitly not a native win-rate trial.
 sim.rng.chance=()=>false;
 tryTackles(sim);sim.rng.chance=oldChance;
 rows.push({initialControl:control,before,after:snapshot(),wrapped:sim.bond?.tacklers.includes(d)??false,
  blockerEngaged:!!b.engagement,workResidual:report.work.residual,
  maxArmExcess:Math.max(...report.armImpulse.map((x,i)=>x-report.armImpulseLimit[i])),
  events:sim.events,question:control>0?'Does a defender tackle choice authorize deleting a blocker-owned acquired tensile/steering connection?':'Opposing control: defender can cease his own steering when reaching for the runner.'});
}
mkdirSync('out/stretch-access',{recursive:true});
writeFileSync(process.argv[2]??'out/stretch-access/retention.json',JSON.stringify({source:sourceVersion(),rows},null,2)+'\n');
console.log(JSON.stringify(rows,null,2));
