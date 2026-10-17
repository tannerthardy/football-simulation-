import {afterEach,describe,expect,it,vi} from 'vitest';
import {CENTER_Y} from '../src/core/field.js';
import {clamp} from '../src/core/vec.js';
import {Rng} from '../src/core/rng.js';
import {generateTeam,pickDefense,pickOffense} from '../src/league/team.js';
import {RUN_BY_ID} from '../src/playbook/concepts.js';
import {COVERAGE_BY_ID,FRONT_BY_ID} from '../src/playbook/defense.js';
import {FORMATION_BY_ID} from '../src/playbook/formations.js';
import {gaitLag} from '../src/physics/kinematics.js';
import {World,type Intent} from '../src/physics/world.js';
import {supportParams} from '../src/physics/support.js';
import {liveGap} from '../src/sim/live-gaps.js';
import {requestToCover} from '../src/sim/motion-plan.js';
import {movementObjective} from '../src/sim/movement-objective.js';
import type {Perceived} from '../src/sim/perception.js';
import {PlaySim} from '../src/sim/playsim.js';
import {executeRunFit,type RunFitJob} from '../src/sim/run-fits.js';

const offense=generateTeam(new Rng(31),'O','O',{strength:.55});
const defense=generateTeam(new Rng(32),'D','D',{strength:.55});

/** Explicit acquired moving-line picture, not a claim of native acquisition.
 * Same body already co-flowing with its insertion landmark; RB remains deep.
 * No opponent's private instruction, engagement or live velocity supplies it. */
function fixture(side:number,velocity=2,kind:RunFitJob['kind']='insert',technique:RunFitJob['technique']='attack'){
 const sim=new PlaySim({offense:pickOffense(offense,'11'),defense:pickDefense(defense,'base43'),
  offCall:{formation:FORMATION_BY_ID.ace_11,flip:false,kind:'run',run:RUN_BY_ID.counter,label:'Acquired fit'},
  defCall:{personnel:'base43',front:FRONT_BY_ID.over,coverage:COVERAGE_BY_ID.cover3,pressure:null,label:'Over'},
  los:40,ballY:CENTER_Y,firstDownX:50,seed:3});
 const a=sim.slot('LB_M')!,rb=sim.slot('RB')!;
 sim.t=1;sim.handoffAt=.5;sim.ball={kind:'held',carrier:rb};
 a.runFit={gap:'A',side,kind,technique,edge:'box',pace:'stack'};
 Object.defineProperty(a.mind,'placementError',{get:()=>0});
 const picture=new Map(sim.offense.map(o=>[o,{pos:{...sim.offAlign.spots[o.slot].pos},
  vel:{x:0,y:side*velocity},age:.2,pose:'up',carrying:o===rb,stance:null,facing:0} as Perceived]));
 picture.get(rb)!.pos={x:36,y:CENTER_Y};picture.get(rb)!.vel={x:0,y:0};
 const see=sim.see.bind(sim);sim.see=(observer,target,delay)=>picture.get(target)??see(observer,target,delay);
 const gap=liveGap(sim,a,'A',side),flow=clamp(gap.vel*a.mind.decisionInterval*2,-2,2);
 a.body.pos={x:41.5,y:gap.y+flow};a.body.vel={x:0,y:side*velocity};a.body.facing=Math.PI;
 return {sim,a,rb,picture,read:()=>executeRunFit(a,sim,'A',side)};
}

afterEach(()=>vi.restoreAllMocks());

describe('second-level insertion owns a moving fit rather than a stationary stop',()=>{
 it.each([-1,1])('keeps achievable co-flow on arrival, side=%s',side=>{
  const f=fixture(side),before=structuredClone(f.a.body),rng=structuredClone(f.sim.rng);
  const command=f.read(),goal=movementObjective(command)!;
  expect(goal.velocity).toEqual({x:0,y:side*2});
  expect(command.vel.y).toBeCloseTo(side*2,10);
  expect(f.a.body).toEqual(before);expect(f.sim.rng).toEqual(rng);
  const old:Intent={...command,vel:{...command.vel,y:clamp(requestToCover(gaitLag(f.a.profile),0,
   2*f.a.mind.decisionInterval,before.vel.y),-f.a.profile.vmax,f.a.profile.vmax)}};
  const actual=structuredClone(before),legacy=structuredClone(before);
  const world=new World([actual]),oldWorld=new World([legacy]);
  for(let k=0;k<4;k++){
   const report=world.step([command],.05);oldWorld.step([old],.05);
   expect(Math.abs(report.work.residual)).toBeLessThan(1e-8);
   expect(Math.hypot(report.groundImpulse[0].x,report.groundImpulse[0].y))
    .toBeLessThanOrEqual(supportParams(f.a.profile).traction*.05+1e-8);
  }
  expect(actual.pos.y*side).toBeGreaterThan(legacy.pos.y*side);
  expect(actual.vel.y*side).toBeCloseTo(2,8);expect(actual.support!.state).toBe('up');
 });

 it('holds point and velocity from one read, then admits an observed reversal on the next read',()=>{
  const f=fixture(1),first=f.read(),goal=movementObjective(first)!;
  const until=f.sim.t+f.a.mind.decisionInterval;
  for(const [o,s] of f.picture)if(o!==f.rb)s.vel.y=-2;
  f.sim.t+=.05;
  const held=movementObjective(f.read())!;
  expect(held.velocity).toEqual(goal.velocity);
  expect(held.point.y).toBeCloseTo(goal.point.y+2*.05,10);
  f.sim.t=until+1e-6;
  expect(movementObjective(f.read())!.velocity).toEqual({x:0,y:-2});
 });

 it('stops carrying old motion when the next acquired picture is stationary',()=>{
  const f=fixture(1);f.read();const until=f.sim.t+f.a.mind.decisionInterval;
  for(const s of f.picture.values())s.vel.y=0;
  f.sim.t=until+1e-6;
  expect(movementObjective(f.read())!.velocity).toEqual({x:0,y:0});
 });

 it('still requests braking when it would overrun the moving fit',()=>{
  const f=fixture(1);f.a.body.pos.y+=1;f.a.body.vel.y=4;
  const command=f.read();
  expect(command.vel.y).toBeLessThan(f.a.vel.y);
  const body=structuredClone(f.a.body);new World([body]).step([command],.05);
  expect(body.vel.y).toBeLessThan(f.a.vel.y);expect(body.vel.y).toBeGreaterThan(0);
 });

 it.each(['interior','cutback','lag'] as const)('keeps %s responsibility out of new insertion tracking',kind=>{
  const f=fixture(1,2,kind==='lag'?'insert':kind,kind==='lag'?'lag':'attack');
  expect(movementObjective(f.read())!.velocity).toEqual({x:0,y:0});
 });

 it('does not infer fit motion from a stationary acquired surface or private live motion',()=>{
  const f=fixture(1,0),command=f.read();
  for(const o of f.sim.offense){o.body.vel={x:8,y:9};o.body.pos={x:60,y:45};}
  f.sim.t+=f.a.mind.decisionInterval+.01;
  expect(f.read()).toEqual(command);
  expect(movementObjective(command)!.velocity).toEqual({x:0,y:0});
 });
});
