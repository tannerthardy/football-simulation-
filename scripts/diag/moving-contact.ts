/** Fixed-body approach geometry, without tackle rolls or carrier evasion.
 * node --import tsx scripts/diag/moving-contact.ts out/moving-contact.json
 * Ordinary chase commands and the ordinary World; no invented body capacities.
 */
import {mkdirSync,writeFileSync} from 'node:fs';
import {dirname} from 'node:path';
import {CENTER_Y} from '../../src/core/field.js';
import {Rng} from '../../src/core/rng.js';
import {generateTeam,pickOffense,pickDefense} from '../../src/league/team.js';
import {PASS_BY_ID} from '../../src/playbook/concepts.js';
import {COVERAGE_BY_ID,FRONT_BY_ID} from '../../src/playbook/defense.js';
import {FORMATION_BY_ID} from '../../src/playbook/formations.js';
import {PlaySim} from '../../src/sim/playsim.js';
import {chase} from '../../src/sim/behaviors/common.js';
import {World} from '../../src/physics/world.js';
import type {Vec2} from '../../src/core/vec.js';
import type {PhysicalProfile} from '../../src/players/physical.js';
import {sourceVersion} from '../source-version.js';

const scenarios={cross:{x:5,y:6,vx:0,vy:-7},nearCross:{x:3,y:3.5,vx:-2,vy:-7},
  frontal:{x:8,y:1,vx:-3,vy:0},trailing:{x:-2,y:1,vx:7,vy:0}};
interface Rep {
  seed:number;side:number;scenario:string;substeps:number;
  profiles:{carrier:PhysicalProfile;defender:PhysicalProfile};closest:number;contactClosing:number;firstContact:number|null;
  falls:number[];momentumError:number;workError:number;
  frames:{t:number;carrier:Vec2;defender:Vec2;command:Vec2;distance:number}[];
}
const reps:Rep[]=[];
for(const seed of [7,19,31,43])for(const side of [1,-1])for(const [scenario,g] of Object.entries(scenarios))for(const substeps of [6,12,48]){
  const sim=new PlaySim({offense:pickOffense(generateTeam(new Rng(seed),'O','OFF'),'11'),
    defense:pickDefense(generateTeam(new Rng(seed+1),'D','DEF'),'nickel'),
    offCall:{formation:FORMATION_BY_ID.gun_doubles_11,flip:false,kind:'pass',pass:PASS_BY_ID.four_verts,label:'lab'},
    defCall:{personnel:'nickel',front:FRONT_BY_ID.over,coverage:COVERAGE_BY_ID.cover3,pressure:null,label:'lab'},
    los:40,ballY:CENTER_Y,firstDownX:50,seed});
  const c=sim.slot('Z')!,d=sim.slot('FS')!;
  c.body.pos={x:50,y:CENTER_Y};c.body.vel={x:6,y:0};c.body.facing=0;
  d.body.pos={x:50+g.x,y:CENTER_Y+side*g.y};d.body.vel={x:g.vx,y:side*g.vy};d.body.facing=Math.atan2(d.vel.y,d.vel.x);
  const world=new World([c.body,d.body],{substeps});
  for(let k=0;k<24;k++)sim.perception.record(sim.agents);
  let closest=Infinity,contactClosing=0,firstContact:number|null=null,momentumError=0,workError=0;
  const falls=new Set<number>(),frames=[];
  for(let k=0;k<100;k++){
    const before={x:c.profile.massKg*c.vel.x+d.profile.massKg*d.vel.x,y:c.profile.massKg*c.vel.y+d.profile.massKg*d.vel.y};
    sim.perception.record(sim.agents);
    const cmd=chase(sim,d,c);
    const r=world.step([{vel:{x:6,y:0},facing:0},cmd],.05);sim.t+=.05;
    const dist=Math.hypot(c.pos.x-d.pos.x,c.pos.y-d.pos.y);closest=Math.min(closest,dist);
    for(const co of r.contacts){firstContact??=sim.t;contactClosing=Math.max(contactClosing,co.closing);}
    for(const f of r.falls)falls.add(f);
    momentumError=Math.max(momentumError,Math.hypot(c.profile.massKg*c.vel.x+d.profile.massKg*d.vel.x-before.x-r.groundImpulse[0].x-r.groundImpulse[1].x,
      c.profile.massKg*c.vel.y+d.profile.massKg*d.vel.y-before.y-r.groundImpulse[0].y-r.groundImpulse[1].y));
    workError=Math.max(workError,Math.abs(r.work.residual));
    frames.push({t:sim.t,carrier:{...c.pos},defender:{...d.pos},command:cmd.vel,distance:dist});
  }
  reps.push({seed,side,scenario,substeps,profiles:{carrier:c.profile,defender:d.profile},closest,contactClosing,firstContact,
    falls:[...falls],momentumError,workError,frames});
}
const out=process.argv[2]??'out/moving-contact.json';mkdirSync(dirname(out),{recursive:true});
const summaries=Object.keys(scenarios).map(scenario=>{
  const rs=reps.filter(r=>r.scenario===scenario&&r.substeps===12);
  return {scenario,reps:rs.length,bodyContacts:rs.filter(r=>r.firstContact!==null).length,
    meanClosest:rs.reduce((s,r)=>s+r.closest,0)/rs.length,meanContactClosing:rs.filter(r=>r.firstContact!==null).reduce((s,r)=>s+r.contactClosing,0)/Math.max(1,rs.filter(r=>r.firstContact!==null).length),
    falls:rs.reduce((s,r)=>s+r.falls.length,0),maxMomentumError:Math.max(...rs.map(r=>r.momentumError)),maxWorkError:Math.max(...rs.map(r=>r.workError))};
});
writeFileSync(out,JSON.stringify({sourceSha256:sourceVersion(),note:'Mechanical approach probe; straight 6 yd/s carrier, four roster seeds, both sides, fixed geometry, 6/12/48 steps. No tackle attempt rolls, wraps, evasion or assignments. Contact rate is not an NFL tackle rate.',summaries,reps},null,2)+'\n');
console.table(summaries);
