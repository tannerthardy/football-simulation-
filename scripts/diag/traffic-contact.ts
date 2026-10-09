/** Shared traffic control through the ordinary world; no outcome draws or wraps.
 * node --import tsx scripts/diag/traffic-contact.ts out/traffic-contact.json
 */
import {mkdirSync,writeFileSync} from 'node:fs';
import {dirname} from 'node:path';
import {CENTER_Y} from '../../src/core/field.js';
import {Rng} from '../../src/core/rng.js';
import type {Vec2} from '../../src/core/vec.js';
import type {PhysicalProfile} from '../../src/players/physical.js';
import {World,type Intent} from '../../src/physics/world.js';
import {generateTeam,pickOffense,pickDefense} from '../../src/league/team.js';
import {RUN_BY_ID} from '../../src/playbook/concepts.js';
import {COVERAGE_BY_ID,FRONT_BY_ID} from '../../src/playbook/defense.js';
import {FORMATION_BY_ID} from '../../src/playbook/formations.js';
import {PlaySim} from '../../src/sim/playsim.js';
import {goTo} from '../../src/sim/behaviors/common.js';
import {spaceTeammates} from '../../src/sim/spacing.js';
import {sourceVersion} from '../source-version.js';

interface Entry {slot:string;x:number;y:number;vx:number;vy:number;goal:Vec2}
const cases:Record<string,Entry[]>={
  blocker:[{slot:'RB',x:0,y:0,vx:6,vy:0,goal:{x:12,y:1}},{slot:'LG',x:4,y:0,vx:1,vy:0,goal:{x:8,y:0}}],
  converging:[{slot:'CB_S',x:0,y:2,vx:7,vy:-2,goal:{x:12,y:0}},{slot:'NB',x:3,y:-1,vx:2,vy:3,goal:{x:12,y:0}}],
  crease:[{slot:'RB',x:0,y:0,vx:5,vy:0,goal:{x:12,y:0}},{slot:'LG',x:2,y:.85,vx:1,vy:0,goal:{x:7,y:.85}},{slot:'RG',x:2,y:-.85,vx:1,vy:0,goal:{x:7,y:-.85}}],
  mesh:[{slot:'QB',x:0,y:0,vx:0,vy:0,goal:{x:-3.5,y:.5}},{slot:'F',x:-2.5,y:0,vx:0,vy:0,goal:{x:8,y:0}}],
};
interface Rep {seed:number;side:number;scenario:string;substeps:number;profiles:PhysicalProfile[];
  contacts:number;maxClosing:number;falls:number[];goalDistance:number;momentumError:number;workError:number;
  frames:{t:number;pos:Vec2[];vel:Vec2[];commands:Vec2[];states:string[]}[]}
const reps:Rep[]=[];
for(const seed of [11,19,31,43])for(const side of [1,-1])for(const [scenario,entries] of Object.entries(cases))for(const substeps of [6,12,48]){
  const sim=new PlaySim({offense:pickOffense(generateTeam(new Rng(seed),'O','OFF'),'21'),
    defense:pickDefense(generateTeam(new Rng(seed+1),'D','DEF'),'nickel'),
    offCall:{formation:FORMATION_BY_ID.i_pro_21,flip:false,kind:'run',run:RUN_BY_ID.iz_strong,label:'lab'},
    defCall:{personnel:'nickel',front:FRONT_BY_ID.over,coverage:COVERAGE_BY_ID.cover3,pressure:null,label:'lab'},
    los:40,ballY:CENTER_Y,firstDownX:50,seed});
  const agents=entries.map(e=>sim.slot(e.slot)!);
  for(let i=0;i<agents.length;i++){
    const e=entries[i],a=agents[i];a.body.pos={x:50+e.x,y:CENTER_Y+side*e.y};a.body.vel={x:e.vx,y:side*e.vy};
    a.body.facing=Math.hypot(e.vx,e.vy)>.1?Math.atan2(side*e.vy,e.vx):Math.atan2(side*(e.goal.y-e.y),e.goal.x-e.x);
  }
  const world=new World(agents.map(a=>a.body),{substeps});
  for(let k=0;k<24;k++)sim.perception.record(sim.agents);
  const falls=new Set<number>(),frames:Rep['frames']=[];let contacts=0,maxClosing=0,momentumError=0,workError=0;
  const momentum=()=>agents.reduce((s,a)=>({x:s.x+a.profile.massKg*a.vel.x,y:s.y+a.profile.massKg*a.vel.y}),{x:0,y:0});
  for(let k=0;k<60;k++){
    sim.perception.record(sim.agents);const before=momentum();
    const intents:Intent[]=agents.map((a,i)=>goTo(a,{x:50+entries[i].goal.x,y:CENTER_Y+side*entries[i].goal.y}));
    spaceTeammates(agents,intents,(a,b)=>sim.see(a,b));const report=world.step(intents,.05);sim.t+=.05;
    contacts+=report.contacts.length;for(const c of report.contacts)maxClosing=Math.max(maxClosing,c.closing);
    for(const f of report.falls)falls.add(f);
    const after=momentum(),ground=report.groundImpulse.reduce((s,g)=>({x:s.x+g.x,y:s.y+g.y}),{x:0,y:0});
    momentumError=Math.max(momentumError,Math.hypot(after.x-before.x-ground.x,after.y-before.y-ground.y));
    workError=Math.max(workError,Math.abs(report.work.residual));
    frames.push({t:sim.t,pos:agents.map(a=>({...a.pos})),vel:agents.map(a=>({...a.vel})),commands:intents.map(i=>i.vel),states:agents.map(a=>a.body.support!.state)});
  }
  const goal=entries[0].goal;
  reps.push({seed,side,scenario,substeps,profiles:agents.map(a=>a.profile),contacts,maxClosing,falls:[...falls],
    goalDistance:Math.hypot(agents[0].pos.x-50-goal.x,agents[0].pos.y-CENTER_Y-side*goal.y),momentumError,workError,frames});
}
const summaries=Object.keys(cases).map(scenario=>{const rs=reps.filter(r=>r.scenario===scenario&&r.substeps===12);return {scenario,reps:rs.length,
  contactReps:rs.filter(r=>r.contacts>0).length,meanPeakClosing:rs.reduce((s,r)=>s+r.maxClosing,0)/rs.length,
  falls:rs.reduce((s,r)=>s+r.falls.length,0),meanGoalDistance:rs.reduce((s,r)=>s+r.goalDistance,0)/rs.length,
  maxMomentumError:Math.max(...rs.map(r=>r.momentumError)),maxWorkError:Math.max(...rs.map(r=>r.workError))};});
const out=process.argv[2]??'out/traffic-contact.json';mkdirSync(dirname(out),{recursive:true});
writeFileSync(out,JSON.stringify({sourceSha256:sourceVersion(),note:'Four roster seeds, two mirrors, 6/12/48 substeps; same profiles, waypoint policy and world. Delayed teammate perception; traffic only changes requested velocity. Synthetic geometry, no NFL fitting, no opponent/tackle/block outcome rolls.',summaries,reps},null,2)+'\n');
console.table(summaries);
