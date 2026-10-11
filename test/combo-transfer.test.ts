import { describe, expect, it } from 'vitest';
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
import { helperSupport, updateEngagements } from '../src/sim/engagement.js';
import { PlaySim } from '../src/sim/playsim.js';

const offense = generateTeam(new Rng(31), 'O', 'O', { strength: .55 });
const defense = generateTeam(new Rng(32), 'D', 'D', { strength: .55 });

/** Fixed ordinary profiles and a legal two-blocker contact. Only positions
 * and the installed jobs are controlled. First hands, control and support
 * come from sim.engage and the real World, rather than a declared block win. */
function fixture(side = 1, poorAngle = false, reverseInstallation = false, seed = 11, recognition?: number) {
  const formation = FORMATION_BY_ID.ace_11;
  const personnel = pickOffense(offense, formation.personnel);
  if (recognition !== undefined) personnel.C = { ...personnel.C, ratings: {
    ...personnel.C.ratings, playRecognition: recognition,
  } };
  const sim = new PlaySim({
    offense: personnel, defense: pickDefense(defense, 'base43'),
    offCall: { formation, flip: side > 0, kind: 'run', run: RUN_BY_ID.iz_strong, label: 'combo transfer' },
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
  primary.body.pos = { x: 40, y: CENTER_Y };
  helper.body.pos = poorAngle ? { x: 40.75, y: CENTER_Y + side * .95 }
    : { x: 40.05, y: CENTER_Y + side * .65 };
  defender.body.pos = { x: 40.85, y: CENTER_Y };
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
      .toBeLessThanOrEqual(supportParams(a.profile).traction * .05 + 1e-8);
  }
}

/** Real bounded movement/contact, without hand-written impulses or body edits. */
function step(f: Fixture, runClimber = false) {
  const intents: Intent[] = f.sim.agents.map(a => ({ vel: { x: 0, y: 0 }, facing: a.facing }));
  if (runClimber) for (const a of f.combination.members)
    if (!a.engagement) intents[a.idx] = a.behavior.update(a, f.sim);
  updateEngagements(f.sim, intents);
  const report = f.sim.world.step(intents, .05);
  budget(f, report);
  f.sim.t += .05;
  f.sim.perception.record(f.sim.agents);
  return report;
}

function nextRead(f: Fixture, observer: Fixture['primary']) {
  const index = f.combination.members.indexOf(observer);
  return f.combination.reads?.[index]?.nextRead ?? f.combination.nextRead;
}

function ready(f: Fixture, departing: 'primary' | 'helper' = 'primary') {
  const reader = f[departing];
  const first = step(f);
  expect(f.engagement.baseB).toBeGreaterThan(.60);
  expect(Math.abs(f.engagement.phi)).toBeLessThan(.55);
  expect(first.armImpulse[f.primary.idx]).toBeGreaterThan(0);
  readCombination(reader, f.sim, f.combination);
  while (f.sim.t + 1e-9 < nextRead(f, reader)) step(f);
  return { ...f, reader };
}

function native(j: HandJoint) {
  return { normalForce: j.normalForce, tangentForce: j.tangentForce,
    push: j.push, hold: j.hold, steer: j.steer, extension: j.extension };
}

describe('a combination release asks whether the actual remaining blocker can keep contact', () => {
  it.each([-1, 1])('lets a poorly fitted helper climb while the secure primary stays, side %s', side => {
    for (const reverse of [false, true]) {
      const f = ready(fixture(side, true, reverse), 'helper'), { engagement: e } = f;
      expect(e.control).toBeGreaterThan(0);
      expect(helperSupport(f.sim, e, f.helper)).toBeLessThan(.25);
      const primaryHands = e.hands!, before = f.sim.agents.map(a => structuredClone(a.body));
      readCombination(f.reader, f.sim, f.combination);
      expect(f.combination.released).toBe(true);
      expect(e.blocker).toBe(f.primary);
      expect(e.hands).toBe(primaryHands);
      expect(f.primary.tags.has('combo-stay')).toBe(true);
      expect(f.helper.tags.has('combo-climb')).toBe(true);
      expect((f.helper.behavior as RunBlocker).target).toBe(f.backer);
      expect(f.sim.agents.map(a => a.body)).toEqual(before);
      const start = { ...f.helper.pos }, report = step(f, true);
      expect(f.sim.world.joints).toContain(primaryHands);
      expect(e.helperHands!.has(f.helper)).toBe(false);
      expect(report.armImpulse[f.primary.idx]).toBeGreaterThan(0);
      for (let k = 0; k < 5; k++) step(f, true);
      expect(f.helper.pos.x).toBeGreaterThan(start.x);
      expect(f.helper.body.support!.state).toBe('up');
    }
  });

  it.each([-1, 1])('retains a double when real first hands leave the primary insecure, side %s', side => {
    const f = fixture(side, false, false, 3);
    for (let k = 0; k < 7; k++) {
      step(f); readCombination(f.primary, f.sim, f.combination);
    }
    expect(f.engagement.control).toBeLessThan(-.12);
    expect(f.combination.released).toBe(false);
    expect(f.engagement.blocker).toBe(f.primary);
    expect(f.engagement.helpers).toContain(f.helper);
    expect(f.sim.world.joints).toContain(f.engagement.hands!);
    expect(f.sim.world.joints).toContain(f.engagement.helperHands!.get(f.helper)!);
    expect(f.primary.tags.has('combo-climb')).toBe(false);
    expect(f.helper.tags.has('combo-climb')).toBe(false);
  });

  it.each([-1, 1])('does not promote a preferred helper who is recovering his support, side %s', side => {
    const f = ready(fixture(side), 'helper'), sup = f.helper.body.support!, sp = supportParams(f.helper.profile);
    const radius = baseRadiusAt(sp, sup.posture), critical = criticalDeviation(sp, sup.posture, 0, 1);
    // A controlled, physically legal perturbation is the initial condition;
    // its recovery continues through World after the assignment read.
    sup.xi = { x: radius + .75 * (critical - radius), y: 0 };
    expect(availability(sup, sp, fatigueFactor(f.helper.body.energy))).toBeLessThan(.60);
    expect(sup.state).toBe('up');
    readCombination(f.reader, f.sim, f.combination);
    expect(f.combination.released).toBe(true);
    expect(f.engagement.blocker).toBe(f.primary);
    expect(f.primary.tags.has('combo-climb')).toBe(false);
    expect(f.helper.tags.has('combo-climb')).toBe(true);
    step(f, true);
  });

  it('does not transfer contact when neither proposed keeper has a live physical hand joint', () => {
    const f = ready(fixture());
    f.sim.world.joints = f.sim.world.joints.filter(j => j.kind !== 'hands' || j.b !== f.defender.body);
    const bodies = f.sim.agents.map(a => structuredClone(a.body));
    // Leaving the stale mapping in place is intentional: an object reference
    // alone must not be mistaken for contact solved by the physics world.
    readCombination(f.primary, f.sim, f.combination);
    expect(f.combination.released).toBe(false);
    expect(f.engagement.blocker).toBe(f.primary);
    expect(f.sim.agents.map(a => a.body)).toEqual(bodies);
  });

  it('keeps the real primary when the preferred helper has only a stale joint reference', () => {
    const f = ready(fixture(), 'helper'), helperJoint = f.engagement.helperHands!.get(f.helper)!;
    f.sim.world.joints = f.sim.world.joints.filter(j => j !== helperJoint);
    readCombination(f.reader, f.sim, f.combination);
    expect(f.combination.released).toBe(true);
    expect(f.engagement.blocker).toBe(f.primary);
    expect(f.helper.tags.has('combo-climb')).toBe(true);
  });
});

describe('promoting a real helper preserves the existing physical hand state', () => {
  it.each([-1, 1])('retains the same solved joint across the assignment read and following sync, side %s', side => {
    for (const reverse of [false, true]) {
      const f = ready(fixture(side, false, reverse)), e = f.engagement;
      const oldPrimary = e.hands!, keeperJoint = e.helperHands!.get(f.helper)!;
      expect(helperSupport(f.sim, e, f.helper)).toBeGreaterThan(.25);
      expect(Math.abs(keeperJoint.normalForce ?? 0) + Math.abs(keeperJoint.tangentForce ?? 0)).toBeGreaterThan(0);
      const saved = native(keeperJoint), control = e.control, drive = { ...e.drive! }, seal = e.sealTarget;
      const body = f.sim.agents.map(a => structuredClone(a.body)), joints = [...f.sim.world.joints];
      readCombination(f.primary, f.sim, f.combination);
      expect(f.combination.released).toBe(true);
      expect(e.blocker).toBe(f.helper);
      expect(e.hands).toBe(keeperJoint);
      expect(native(keeperJoint)).toEqual(saved);
      expect(e.control).toBe(control); expect(e.drive).toEqual(drive); expect(e.sealTarget).toBe(seal);
      expect(f.sim.agents.map(a => a.body)).toEqual(body);
      expect(f.sim.world.joints).toEqual(joints);
      expect((f.primary.behavior as RunBlocker).plan.kind).toBe('climb');
      expect((f.helper.behavior as RunBlocker).plan.kind).toBe('drive');
      const start = { ...f.primary.pos }, report = step(f, true);
      expect(e.hands).toBe(keeperJoint);
      expect(f.sim.world.joints).toContain(keeperJoint);
      expect(f.sim.world.joints).not.toContain(oldPrimary);
      expect(e.helperHands!.has(f.helper)).toBe(false);
      expect(f.helper.engagement).toBe(e); expect(f.defender.engagement).toBe(e);
      expect(report.armImpulse[f.helper.idx]).toBeGreaterThan(0);
      for (let k = 0; k < 5; k++) step(f, true);
      expect(f.primary.pos.x).toBeGreaterThan(start.x);
    }
  });

  it('does not give a promoted helper the former primary\'s cloth-grab capacity or erase the call', () => {
    const f = ready(fixture()), e = f.engagement;
    e.holding = true; f.primary.tags.add('held');
    const penalty = { kind: 'holding' as const, against: 'O' as const, playerId: f.primary.player.id,
      yards: 10, autoFirst: false, spotX: f.primary.pos.x };
    f.sim.penalty = penalty;
    const primaryJoint = e.hands!, keeperJoint = e.helperHands!.get(f.helper)!;
    const report = step(f);
    expect(primaryJoint.hold).toBeGreaterThan(0);
    expect(report.armImpulse[f.primary.idx]).toBeGreaterThan(0);
    readCombination(f.primary, f.sim, f.combination);
    expect(e.blocker).toBe(f.helper); expect(e.hands).toBe(keeperJoint);
    expect(e.holding).toBe(false);
    expect(f.primary.tags.has('held')).toBe(true); expect(f.sim.penalty).toBe(penalty);
    step(f, true);
    expect(e.hands).toBe(keeperJoint);
    expect(keeperJoint.hold).toBeLessThan(primaryJoint.hold);
    expect(f.sim.penalty).toBe(penalty);
  });

  it('retains the original primary\'s hold when that player keeps the block', () => {
    const f = ready(fixture(1, true), 'helper'), e = f.engagement;
    e.holding = true; f.primary.tags.add('held');
    const primaryJoint = e.hands!;
    step(f);
    expect(primaryJoint.hold).toBeGreaterThan(0);
    readCombination(f.reader, f.sim, f.combination);
    expect(f.combination.released).toBe(true);
    expect(e.blocker).toBe(f.primary); expect(e.hands).toBe(primaryJoint);
    expect(e.holding).toBe(true); expect(f.primary.tags.has('held')).toBe(true);
    step(f, true);
    expect(primaryJoint.hold).toBeGreaterThan(0);
  });
});

describe('a combo responds to the filling backer that the observer actually saw', () => {
  it('lets better recognition act on a changing fill earlier with the same strength and movement envelope', () => {
    const quick = fixture(1, false, false, 11, 95), slow = fixture(1, false, false, 11, 35);
    const capabilities = (f: Fixture) => {
      const { reactionTime: _latency, ...physical } = f.primary.profile;
      return physical;
    };
    expect(capabilities(quick)).toEqual(capabilities(slow));
    expect(quick.primary.player.measurables).toEqual(slow.primary.player.measurables);
    expect(quick.primary.profile.reactionTime).toBeLessThan(slow.primary.profile.reactionTime);
    expect(quick.primary.mind.decisionInterval).toBeLessThan(slow.primary.mind.decisionInterval);
    const releaseAt = (f: Fixture) => {
      f.backer.body.pos = { x: 48, y: CENTER_Y + 1 }; f.observe();
      step(f); readCombination(f.primary, f.sim, f.combination);
      f.backer.body.pos = { x: 42, y: CENTER_Y + 1 };
      f.sim.perception.record(f.sim.agents);
      for (let k = 0; k < 14 && !f.combination.released; k++) {
        step(f); readCombination(f.primary, f.sim, f.combination);
      }
      expect(f.combination.released).toBe(true);
      expect(f.engagement.control).toBeGreaterThan(0);
      return f.sim.t;
    };
    // This is a response-time control, not a promise of an improved block,
    // an automatic win, or more rushing yards for the better observer.
    expect(releaseAt(quick)).toBeLessThan(releaseAt(slow));
  });

  it.each([-1, 1])('holds while a newly arriving backer is still outside the delayed picture, side %s', side => {
    const f = fixture(side);
    f.backer.body.pos = { x: 48, y: CENTER_Y + side }; f.observe(); ready(f, 'helper');
    f.backer.body.pos = { x: 42, y: CENTER_Y + side };
    f.sim.perception.record(f.sim.agents);
    const seen = f.sim.see(f.helper, f.backer);
    expect(seen.pos.x).toBe(48); expect(seen.age).toBeGreaterThan(.05);
    readCombination(f.helper, f.sim, f.combination);
    expect(f.combination.released).toBe(false);
    // The visual sample can take longer to arrive than the next decision.
    // Advance the real World until that ordinary buffer latency has elapsed.
    let ticks = 0;
    while (f.sim.see(f.helper, f.backer).pos.x !== 42 && ticks++ < 14) step(f);
    while (f.sim.t + 1e-9 < nextRead(f, f.helper)) step(f);
    expect(f.sim.see(f.helper, f.backer).pos.x).toBe(42);
    readCombination(f.helper, f.sim, f.combination);
    expect(f.combination.released).toBe(true);
  });

  it.each([-1, 1])('can commit to a fill that has disappeared from the current world, side %s', side => {
    const f = ready(fixture(side));
    f.backer.body.pos = { x: 48, y: CENTER_Y + side };
    f.sim.perception.record(f.sim.agents);
    const seen = f.sim.see(f.primary, f.backer);
    expect(seen.pos.x).toBe(42); expect(seen.age).toBeGreaterThan(.05);
    readCombination(f.primary, f.sim, f.combination);
    expect(f.combination.released).toBe(true);
    expect(f.sim.events.filter(e => e.type === 'block_climb')).toHaveLength(1);
  });
});
