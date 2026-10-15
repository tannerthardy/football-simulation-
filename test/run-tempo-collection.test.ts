import {readFileSync} from 'node:fs';
import {afterEach,describe,expect,it,vi} from 'vitest';
import {Rng} from '../src/core/rng.js';
import {generateTeam,pickDefense,pickOffense} from '../src/league/team.js';
import {movingArrivalVelocity,fatigueFactor} from '../src/physics/kinematics.js';
import {availability,supportParams} from '../src/physics/support.js';
import {World,type Intent} from '../src/physics/world.js';
import * as Preview from '../src/physics/movement-preview.js';
import {RUN_BY_ID} from '../src/playbook/concepts.js';
import {COVERAGE_BY_ID,FRONT_BY_ID} from '../src/playbook/defense.js';
import {FORMATION_BY_ID} from '../src/playbook/formations.js';
import {RunBlocker} from '../src/sim/behaviors/blocking.js';
import {PlaySim} from '../src/sim/playsim.js';
import * as Fits from '../src/sim/run-block-fit.js';
import {meshExperiment} from '../scripts/diag/run-tempo-mesh.js';

const rows=JSON.parse(readFileSync('test/fixtures/climb-collection.json','utf8'));
function stage(index:number) {
 const row=rows[index],formation=FORMATION_BY_ID.ace_12;
 const sim=new PlaySim({
  offense:pickOffense(generateTeam(new Rng(31),'O','O',{strength:.55}),formation.personnel),
  defense:pickDefense(generateTeam(new Rng(32),'D','D',{strength:.55}),'base43'),
  offCall:{formation,flip:false,kind:'run',run:RUN_BY_ID[row.concept],label:row.concept},
  defCall:{personnel:'base43',front:FRONT_BY_ID.over,coverage:COVERAGE_BY_ID.cover3,pressure:null,label:'Over'},
  los:40,ballY:26.666666666666668,firstDownX:50,seed:3});
 const a=sim.slot(row.slot)!,target=sim.slot(row.targetSlot)!;
 a.body=structuredClone(row.body);a.body.support!.since=-Infinity;
 a.behavior=new RunBlocker({kind:'climb',target,drive:row.behavior.plan.drive});
 Reflect.set(a.behavior,'climbRead',{...structuredClone(row.behavior.climbRead),target});
 Object.defineProperty(a.mind,'placementError',{get:()=>0});
 const strike=a.profile.radius+target.profile.radius+.1+a.player.measurables.armIn/36*.45;
 sim.t=row.t;
 const select=()=>Reflect.get(a.behavior,'plannedClimb').call(a.behavior,a,sim,target,strike,structuredClone(row.picture)) as Intent;
 return {row,sim,a,target,strike,select};
}
afterEach(()=>vi.restoreAllMocks());

describe('inside-zone mesh is an exchange on the move',()=>{
 it('preserves identical starting bodies and earns an earlier moving transfer',()=>{
  const old=meshExperiment(false,0),next=meshExperiment(null,0);
  expect(next.initial).toEqual(old.initial);expect(next.installedRolling).toBe(true);
  expect(next.handoff).not.toBeNull();expect(old.handoff).not.toBeNull();
  expect(next.handoff!.t).toBeLessThan(old.handoff!.t);
  expect(next.handoff!.rbSpeed).toBeGreaterThan(old.handoff!.rbSpeed);
  expect(next.handoff!.distance).toBeLessThanOrEqual(next.handoff!.physicalReach);
 });
 it('reacts to a genuinely delayed QB without a distant timed transfer',()=>{
  const clear=meshExperiment(null,0),delayed=meshExperiment(null,1),stopped=meshExperiment(null,4);
  expect(delayed.handoff!.t).toBeGreaterThan(clear.handoff!.t);
  expect(delayed.handoff!.distance).toBeLessThanOrEqual(delayed.handoff!.physicalReach);
  expect(stopped.handoff).toBeNull();
 });
 it.each(['counter','trap','duo','draw'])('preserves the installed stopping approach for %s',concept=>{
  const old=meshExperiment(false,0,concept),next=meshExperiment(null,0,concept);
  expect(next.installedRolling).toBe(false);expect(next.frames).toEqual(old.frames);
 });
});

describe('a planned climb still collects the second-level block',()=>{
 it('keeps the existing long-range steering outside collection distance',()=>{
  const s=stage(0);s.a.body.pos.x-=4;
  const before=structuredClone(s.a.body),read=s.row.behavior.climbRead;
  const capacity=availability(s.a.body.support!,supportParams(s.a.profile),fatigueFactor(s.a.body.energy));
  const ordinary={vel:movingArrivalVelocity(s.a.body,read.meet,read.seenVel,s.a.profile.vmax,.1,read.through,1,capacity),
   facing:Math.atan2(read.meet.y-s.a.pos.y,read.meet.x-s.a.pos.x)};
  const selected=s.select();
  expect(selected.vel).toEqual(ordinary.vel);
  expect(selected.facing).toBe(ordinary.facing);
  expect(selected.posture).toBeUndefined();expect(s.a.body).toEqual(before);
 });
 it('uses the existing near-fit request instead of bypassing it at a saved closing state',()=>{
  const s=stage(1),fit=vi.spyOn(Fits,'secondLevelBlockApproach');
  const before=structuredClone(s.a.body),selected=s.select();
  expect(fit).toHaveBeenCalledTimes(1);expect(selected.posture).toBe(.7);
  expect(s.row.requested.posture).toBeUndefined();expect(s.a.body).toEqual(before);
  const raw=structuredClone(s.row.body),next=structuredClone(s.row.body);
  raw.support.since=next.support.since=-Infinity;
  const oldWorld=new World([raw]),nextWorld=new World([next]);
  oldWorld.time=nextWorld.time=s.sim.t;
  for(let k=0;k<4;k++) {
   oldWorld.step([s.row.requested],.05);const r=nextWorld.step([selected],.05);
   expect(Math.abs(r.work.residual)).toBeLessThan(1e-8);
   expect(r.armImpulse[0]).toBe(0);
  }
  expect(next.support.posture).toBeGreaterThan(raw.support.posture);
  expect(next.support.state).toBe('up');
 });
 it('does not read a hidden backer body, refresh information or mutate body/RNG',()=>{
  const s=stage(1),body=structuredClone(s.a.body),rng=structuredClone(s.sim.rng);
  const see=vi.spyOn(s.sim,'see').mockImplementation(()=>{throw Error('Use the supplied acquired picture');});
  const first=s.select();s.target.body.pos={x:80,y:50};s.target.body.vel={x:9,y:-9};
  s.target.behavior={kind:'hidden-job',update:()=>{throw Error('Private job');}};
  expect(s.select()).toEqual(first);expect(see).not.toHaveBeenCalled();
  expect(s.a.body).toEqual(body);expect(s.sim.rng).toEqual(rng);
 });
 it('previews the same bounded collection operator when making a new plan',()=>{
  const s=stage(1);Reflect.set(s.a.behavior,'climbRead',null);
  const fit=vi.spyOn(Fits,'secondLevelBlockApproach'),preview=vi.spyOn(Preview,'previewFreeMovement');
  s.select();expect(preview).toHaveBeenCalledTimes(6);expect(fit).toHaveBeenCalledTimes(7);
  for(let i=0;i<6;i++)expect(preview.mock.calls[i][1]).toEqual(fit.mock.results[i].value);
 });
});
