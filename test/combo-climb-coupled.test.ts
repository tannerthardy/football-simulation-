import { describe, expect, it, vi } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { fatigueFactor } from '../src/physics/kinematics.js';
import { availability, baseRadiusAt, criticalDeviation, supportParams } from '../src/physics/support.js';
import type { HandJoint, Intent, StepReport } from '../src/physics/world.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { RUN_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { RunBlocker, readCombination, type Combination } from '../src/sim/behaviors/blocking.js';
import { axisOf, contactControl, helperSupport, updateEngagements } from '../src/sim/engagement.js';
import { goTo } from '../src/sim/behaviors/common.js';
import { PlaySim } from '../src/sim/playsim.js';
// Scenes recorded, and dice forced, on the play's single random stream (see PlaySim.dice).
PlaySim.recordedSingleStream = true;

const offense = generateTeam(new Rng(31), 'O', 'O', { strength: .55 });
const defense = generateTeam(new Rng(32), 'D', 'D', { strength: .55 });

/** Fixed ordinary profiles and a legal two-blocker contact. Only positions
 * and the installed jobs are controlled. First hands, control and support
 * come from sim.engage and the real World, rather than a declared block win. */
function fixture(side = 1, poorAngle = false, reverseInstallation = false, seed = 11, recognition?: number,
  run = RUN_BY_ID.iz_strong) {
  const formation = FORMATION_BY_ID.ace_11;
  const personnel = pickOffense(offense, formation.personnel);
  if (recognition !== undefined) personnel.C = { ...personnel.C, ratings: {
    ...personnel.C.ratings, playRecognition: recognition,
  } };
  const sim = new PlaySim({
    offense: personnel, defense: pickDefense(defense, 'base43'),
    offCall: { formation, flip: side > 0, kind: 'run', run, label: 'combo transfer' },
    defCall: { personnel: 'base43', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3,
      pressure: null, label: 'Over' },
    los: 40, ballY: CENTER_Y, firstDownX: 50, seed,
  });
  for (const a of sim.agents) {
    a.body.pos = { x: 70 + (a.idx % 5) * 3, y: 3 + Math.floor(a.idx / 5) * 3 };
    a.body.vel = { x: 0, y: 0 };
    a.behavior = { kind: 'idle', update: () => ({ vel: { x: 0, y: 0 }, facing: a.facing }) };
  }
  sim.t = 1; sim.world.time = 1;
  const primary = sim.slot('C')!, helper = sim.slot('LG')!, defender = sim.slot('DT_W')!, backer = sim.slot('LB_W')!;
  primary.body.pos = { x: 40, y: CENTER_Y - side * .4 };
  helper.body.pos = poorAngle ? { x: 40.75, y: CENTER_Y + side * .95 }
    : { x: 40, y: CENTER_Y + side * .4 };
  defender.body.pos = { x: 40.75, y: CENTER_Y };
  backer.body.pos = poorAngle ? { x: 43, y: CENTER_Y + side }
    : { x: 42, y: CENTER_Y - side * 1.2 };
  // A runner who has not arrived cannot silently replace the linebacker cue.
  sim.slot('RB')!.body.pos = { x: 34, y: CENTER_Y };
  sim.qb.body.pos = { x: 36, y: CENTER_Y - side * 2 };
  primary.body.facing = helper.body.facing = 0; defender.body.facing = Math.PI;
  const combination: Combination = { members: reverseInstallation ? [helper, primary] : [primary, helper],
    defender, backer, released: false, secureSince: -1, nextRead: 0, soloKind: 'drive' };
  for (const [index, a] of combination.members.entries()) a.behavior = new RunBlocker({
    kind: index === 0 ? 'drive' : 'combo', target: defender, drive: { x: 1, y: 0 }, combination,
  });
  const observe = () => { for (let k = 0; k < 24; k++) sim.perception.record(sim.agents); };
  observe();
  const engagement = sim.engage(primary, defender, 'run', { x: 1, y: 0 })!;
  expect(engagement).not.toBeNull();
  expect(sim.engage(helper, defender, 'run', { x: 1, y: 0 })).toBe(engagement);
  expect(engagement.hands!.a).toBe(primary.body);
  expect(engagement.helperHands!.get(helper)!.a).toBe(helper.body);
  return { sim, primary, helper, defender, backer, combination, engagement, observe, side };
}

type Fixture = ReturnType<typeof fixture>;

function budget(f: Fixture, report: StepReport) {
  expect(Math.abs(report.work.residual)).toBeLessThan(1e-8);
  for (const a of f.sim.agents) {
    const i = a.idx;
    expect(report.armImpulse[i]).toBeLessThanOrEqual(report.armImpulseLimit[i] + 1e-8);
    expect(report.armWork[i]).toBeLessThanOrEqual(report.armWorkLimit[i] + 1e-8);
    expect(report.supportMotorWork[i]).toBeLessThanOrEqual(report.supportMotorWorkLimit[i] + 1e-8);
    expect(Math.hypot(report.groundImpulse[i].x, report.groundImpulse[i].y))
      .toBeLessThanOrEqual(report.groundImpulseLimit[i] + 1e-8);
  }
}

describe('earned combination-to-climb execution in the coupled World',()=>{
 it.each([-1,1])('collects the backer with a real keeper before the controlled runner arrives, side %s',side=>{
  // Controlled opportunity, installed before the first physics step. This
  // backer threatens the helper's half; the runner approaches outside the
  // down surface. Release is earned by the ordinary joined reads, never
  // forced by the test. Other bodies remain present in World.
  // Seed 16 with the start law (#336), the back's own mesh start (#344) and the off-hip climb (#362): on seed 11
  // the climber now falls under the scripted backer's drive at 2.0 and LB_W wraps the runner at 2.5. The scene
  // passes on 7 of seeds 1-30 here (10 on develop 90daa454, 7 on #336 + #344 alone); seed 16 passes here and on
  // #336 + #344 alone.
  const f=fixture(side,false,false,16);
  const rb=f.sim.slot('RB')!;
  f.backer.body.pos={x:42,y:CENTER_Y+side*1.2};
  f.backer.body.facing=Math.PI;
  f.backer.behavior={kind:'idle',update:()=>goTo(f.backer,{x:38,y:CENTER_Y+side*2.2},{speed:.5})};
  rb.body.pos={x:34,y:CENTER_Y+side*2.2};
  rb.behavior={kind:'idle',update:()=>goTo(rb,{x:48,y:CENTER_Y+side*2.2},{speed:.65})};
  f.sim.ball={kind:'held',carrier:rb};f.observe();
  const keeperHands=f.engagement.hands;
  let loaded=false,passed=false,loadedAhead=Infinity;
  while(f.sim.phase==='live'&&f.sim.t<3.6){
   f.sim.tick();budget(f,f.sim.lastStep!);
   if(f.helper.engagement?.defender===f.backer
     &&Math.hypot(f.helper.engagement.hands!.normalForce??0,f.helper.engagement.hands!.tangentForce??0)>1){
    expect(f.combination.released).toBe(true);
    expect(f.sim.world.joints).toContain(f.helper.engagement.hands);
    if(!loaded)loadedAhead=f.backer.pos.x-rb.pos.x;
    loaded=true;
   }
   expect(f.primary.engagement?.defender===f.defender).toBe(true);
   expect(f.primary.engagement!.hands).toBe(keeperHands);
   expect(f.sim.world.joints).toContain(keeperHands);
   expect(Math.hypot(keeperHands!.normalForce??0,keeperHands!.tangentForce??0)).toBeGreaterThan(1);
   expect(f.sim.events.some(e=>e.type==='tackle_wrap')).toBe(false);
   expect(rb.body.support!.state).toBe('up');
   if(rb.pos.x>f.sim.los){passed=true;break;}
  }
  // The climber has the backer loaded while the runner is still well short
  // of him, and the keeper holds the down man until the runner reaches the
  // first level. Under SEAL_HOLD the climber keeps the leverage he caught the
  // scraping backer with and takes him where he is going; this scripted
  // runner holds a fixed line into that scrape rather than cutting off the
  // block, so the scene ends at the first level, not past the backer.
  // The first level is the line of scrimmage, not the down man's current
  // depth: a keeper who drives the down man back (or a down man squeezing
  // across him) must not lengthen the scene into the backer's scrape spot.
  expect(loaded).toBe(true);
  expect(loadedAhead).toBeGreaterThan(4);
  expect(passed).toBe(true);
  expect(f.helper.engagement?.defender).toBe(f.backer);
  expect(f.helper.engagement?.defender===f.backer).toBe(true);
 });
});
