import {describe,expect,it,vi} from 'vitest';
import {Rng} from '../src/core/rng.js';
import {generateTeam,pickDefense,pickOffense} from '../src/league/team.js';
import {RUN_BY_ID} from '../src/playbook/concepts.js';
import {COVERAGE_BY_ID,FRONT_BY_ID} from '../src/playbook/defense.js';
import {FORMATION_BY_ID} from '../src/playbook/formations.js';
import {QBHandoff} from '../src/sim/behaviors/qb.js';
import type {Perceived} from '../src/sim/perception.js';
import {PlaySim} from '../src/sim/playsim.js';

const offense=generateTeam(new Rng(11),'O','O',{strength:.55});
const defense=generateTeam(new Rng(12),'D','D',{strength:.55});
function setup(pitch=0){
 const formation=FORMATION_BY_ID.ace_11;
 const sim=new PlaySim({offense:pickOffense(offense,formation.personnel),defense:pickDefense(defense,'base43'),
  offCall:{formation,flip:false,kind:'run',run:RUN_BY_ID.oz_strong,label:'OZ'},
  defCall:{personnel:'base43',front:FRONT_BY_ID.over,coverage:COVERAGE_BY_ID.cover3,pressure:null,label:'C3'},
  los:40,ballY:26.67,firstDownX:50,seed:77});
 const qb=sim.qb,rb=sim.slot('RB')!,mesh={x:35.6,y:28.77};
 qb.body.pos={...mesh};qb.body.vel={x:0,y:0};qb.body.facing=0;
 // The private live back remains outside real transfer reach in cue controls.
 rb.body.pos={x:20,y:20};rb.body.vel={x:0,y:0};
 qb.behavior=new QBHandoff(mesh,1.15,rb,pitch);
 let picture:Perceived={pos:{x:mesh.x-2,y:mesh.y+1},vel:{x:3,y:0},facing:0,stance:null,age:.05,pose:'up',carrying:false};
 const see=sim.see.bind(sim);vi.spyOn(sim,'see').mockImplementation((a,b,s)=>a===qb&&b===rb?structuredClone(picture):see(a,b,s));
 const read=(t:number,pos={x:mesh.x+2,y:mesh.y+1},vel={x:3,y:0})=>{
  picture={...picture,pos,vel};sim.t=t;return qb.behavior.update(qb,sim);
 };
 const approach=()=>read(1.2,{x:mesh.x-2,y:mesh.y+1});
 return{sim,qb,rb,mesh,read,approach};
}

describe('personally observed failed exchange continuation',()=>{
 it.each([-1,1])('secures snap possession after observed closing then passed/separating track, side %s',side=>{
  const f=setup();f.read(1.2,{x:f.mesh.x-2,y:f.mesh.y+side});
  const request=f.read(1.8,{x:f.mesh.x+2,y:f.mesh.y+side});
  expect(f.qb.behavior.kind).toBe('carrier');
  expect(f.sim.carrier).toBe(f.qb);expect(f.sim.handoffAt).toBe(-1);
  expect(f.sim.stats.rusher).toBe(f.qb.player.id);expect(f.sim.stats.scramble).toBe(false);
  expect(Math.hypot(request.vel.x,request.vel.y)).toBeGreaterThan(0);
  expect(Math.hypot(request.vel.x,request.vel.y)).toBeLessThanOrEqual(f.qb.profile.vmax);
 });
 it('does not turn a late still-closing approach into a keep or a forced transfer',()=>{
  const f=setup();f.approach();f.read(9,{x:f.mesh.x-2,y:f.mesh.y+1});
  expect(f.qb.behavior.kind).toBe('qb-handoff');expect(f.sim.carrier).toBe(f.qb);expect(f.sim.handoffAt).toBe(-1);
 });
 it('does not retire a mesh from elapsed time or one unexplained separating picture',()=>{
  const f=setup();f.read(9);expect(f.qb.behavior.kind).toBe('qb-handoff');
 });
 it('retains a closing-to-opening picture while the back is still on the near mesh',()=>{
  const f=setup();f.approach();f.read(1.8,{x:f.mesh.x+.2,y:f.mesh.y+1.5});
  expect(f.qb.behavior.kind).toBe('qb-handoff');
 });
 it('does not acquire a failed approach before the installed exchange window',()=>{
  const f=setup();f.read(.2,{x:f.mesh.x-2,y:f.mesh.y+1});f.read(.8);
  expect(f.qb.behavior.kind).toBe('qb-handoff');
 });
 it('keeps real reachable transfer ahead of a stale contradictory picture',()=>{
  const f=setup();f.approach();f.rb.body.pos={x:f.qb.pos.x+.7,y:f.qb.pos.y};f.read(1.8);
  expect(f.sim.carrier).toBe(f.rb);expect(f.sim.handoffAt).toBe(1.8);
 });
 it('does not treat a toss receiver leaving handoff reach as a failed handoff',()=>{
  const f=setup(5);f.approach();f.read(1.8);expect(f.qb.behavior.kind).toBe('qb-handoff');expect(f.sim.carrier).toBe(f.qb);
 });
 it('uses the acquired back picture for the decision, not refreshed hidden body/engagement',()=>{
  const a=setup(),b=setup();a.approach();b.approach();
  b.rb.body.pos={x:70,y:45};b.rb.body.vel={x:-5,y:2};b.rb.engagement={} as never;
  const x=a.read(1.8),y=b.read(1.8);
  expect(a.qb.behavior.kind).toBe('carrier');expect(b.qb.behavior.kind).toBe('carrier');expect(x).toEqual(y);
 });
});
