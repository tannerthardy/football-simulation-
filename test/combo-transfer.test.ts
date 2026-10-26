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
  it.each([-1, 1])('lets an insecure primary leave when his partner has earned the keeping contact, side %s', side => {
    const f = fixture(side, false, false, 3);
    step(f);
    expect(Math.hypot(f.engagement.helperHands!.get(f.helper)!.normalForce ?? 0,
      f.engagement.helperHands!.get(f.helper)!.tangentForce ?? 0)).toBeGreaterThan(0);
    readCombination(f.primary, f.sim, f.combination);
    while (f.sim.t + 1e-9 < nextRead(f, f.primary)) step(f);
    expect(f.engagement.control).toBeLessThan(-.12);
    const keeperControl = contactControl(f.engagement, f.helper);
    expect(keeperControl).not.toBeNull();
    expect(keeperControl!).toBeGreaterThan(-.1);
    expect(keeperControl!).toBeGreaterThan(f.engagement.control);
    const keeperHands = f.engagement.helperHands!.get(f.helper)!;
    readCombination(f.primary, f.sim, f.combination);
    expect(f.combination.released).toBe(true);
    expect(f.engagement.blocker.idx).toBe(f.helper.idx);
    expect(f.engagement.hands).toBe(keeperHands);
    expect(f.engagement.control).toBe(keeperControl);
    budget(f, step(f, true));
  });

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

  it.each([-1, 1])('does not leave an insecure primary with a poorly fitted helper, side %s', side => {
    const f = fixture(side, true, false, 3);
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

  it('does not certify separated keeper hands from their old positive load and delayed picture', () => {
    const f = ready(fixture()), joint = f.engagement.helperHands!.get(f.helper)!;
    expect(Math.hypot(joint.normalForce ?? 0, joint.tangentForce ?? 0)).toBeGreaterThan(0);
    const arm = f.helper.player.measurables.armIn / 36;
    const sep = f.helper.profile.radius + f.defender.profile.radius;
    const outsideWorkingReach = sep + .30 * arm + (.10 + .15 * arm) / 2;
    f.helper.body.pos = { x: f.defender.pos.x-outsideWorkingReach, y: f.defender.pos.y };
    expect(contactControl(f.engagement, f.helper)).not.toBeNull();
    expect(f.sim.world.joints).toContain(joint);
    // The reader still has the old acquired surface. The stale solved force
    // cannot make an unreachable remaining arm physically support a release.
    readCombination(f.primary, f.sim, f.combination);
    expect(f.combination.released).toBe(false);
    expect(f.engagement.blocker.idx).toBe(f.primary.idx);
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
  it.each([-1, 1])('requests a clear first step off the observed double and executes it through World, side %s', side => {
    const f = ready(fixture(side));
    const pictures = new Map<Fixture['primary'], ReturnType<PlaySim['see']>>();
    const see = f.sim.see;
    const spy = vi.spyOn(f.sim, 'see').mockImplementation(function (a, b, ...rest) {
      const seen = see.call(f.sim, a, b, ...rest);
      if (a === f.primary) pictures.set(b, structuredClone(seen));
      return seen;
    });
    readCombination(f.primary, f.sim, f.combination);
    spy.mockRestore();
    expect(f.combination.released).toBe(true);
    expect((f.primary.behavior as RunBlocker).plan.departure).toBeDefined();
    const exit = f.combination.reads!.find(r => r.proposal?.climber === f.primary)!.proposal!.departure!.exit!;
    const start = { ...f.primary.pos }, lane = { x: exit.x-start.x, y: exit.y-start.y };
    for (const body of [f.defender, f.helper]) {
      const seen = pictures.get(body)!;
      const relative = { x: seen.pos.x-start.x, y: seen.pos.y-start.y };
      const along = Math.max(0, Math.min(1, (relative.x*lane.x+relative.y*lane.y)/(lane.x*lane.x+lane.y*lane.y)));
      const nearest = Math.hypot(relative.x-along*lane.x, relative.y-along*lane.y);
      expect(nearest).toBeGreaterThanOrEqual(Math.min(f.primary.profile.radius+body.profile.radius,
        Math.hypot(relative.x, relative.y))-1e-8);
    }
    for (let k = 0; k < 6; k++) step(f, true);
    expect(Math.hypot(f.primary.pos.x-start.x, f.primary.pos.y-start.y)).toBeGreaterThan(.05);
    expect(f.primary.body.support!.state).toBe('up');
    expect(f.helper.engagement?.blocker.idx).toBe(f.helper.idx);
    // A first available step is not a promised linebacker block. Moving DL
    // and delayed later pictures may still close that route.
  });

  it.each([-1, 1])('retains the same solved joint across the assignment read and following sync, side %s', side => {
    for (const reverse of [false, true]) {
      const f = ready(fixture(side, false, reverse)), e = f.engagement;
      const oldPrimary = e.hands!, keeperJoint = e.helperHands!.get(f.helper)!;
      expect(helperSupport(f.sim, e, f.helper)).toBeGreaterThan(.25);
      expect(Math.abs(keeperJoint.normalForce ?? 0) + Math.abs(keeperJoint.tangentForce ?? 0)).toBeGreaterThan(0);
      const saved = native(keeperJoint), control = contactControl(e, f.helper), drive = { ...e.drive! }, seal = e.sealTarget;
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

describe('Duo keeps the surface while its acquired backer belongs to the other half', () => {
  it.each([-1, 1])('retains the double instead of sending a climber across its covered half, side %s', side => {
    const f = ready(fixture(side, false, false, 11, undefined, RUN_BY_ID.duo), 'helper');
    const hands = f.engagement.hands!, helperHands = f.engagement.helperHands!.get(f.helper)!;
    const bodies = f.sim.agents.map(a => structuredClone(a.body)), rng = JSON.stringify(f.sim.rng);
    readCombination(f.helper, f.sim, f.combination);
    expect(f.combination.released).toBe(false);
    expect(f.engagement.hands).toBe(hands);
    expect(f.engagement.helperHands!.get(f.helper)).toBe(helperHands);
    expect(f.sim.world.joints).toContain(hands);
    expect(f.sim.world.joints).toContain(helperHands);
    expect(f.sim.agents.map(a => a.body)).toEqual(bodies);
    expect(JSON.stringify(f.sim.rng)).toBe(rng);
    budget(f, step(f));
  });

  it.each([-1, 1])('still admits the near-half climber around a real down-body obstruction, side %s', side => {
    const f = fixture(side, false, false, 11, undefined, RUN_BY_ID.duo);
    f.backer.body.pos.y = CENTER_Y + side * 1.2; f.observe(); ready(f, 'helper');
    const hands = f.engagement.hands!;
    readCombination(f.helper, f.sim, f.combination);
    expect(f.combination.released).toBe(true);
    expect((f.helper.behavior as RunBlocker).plan.departure).toBeDefined();
    expect((f.helper.behavior as RunBlocker).target).toBe(f.backer);
    expect(f.engagement.hands).toBe(hands);
    budget(f, step(f, true));
  });

  it('changes the admission only after the production hook acquires the changed backer half', () => {
    const f = ready(fixture(1, false, false, 11, undefined, RUN_BY_ID.duo), 'helper');
    const seen = f.sim.see(f.helper, f.backer);
    f.backer.body.pos.y = CENTER_Y + 1.2;
    expect(f.sim.see(f.helper, f.backer)).toEqual(seen);
    readCombination(f.helper, f.sim, f.combination);
    expect(f.combination.released).toBe(false);
    f.observe();
    while (f.sim.t + 1e-9 < nextRead(f, f.helper)) step(f);
    expect(f.sim.see(f.helper, f.backer).pos.y).toBeGreaterThan(CENTER_Y);
    readCombination(f.helper, f.sim, f.combination);
    expect(f.combination.released).toBe(true);
  });

  it.each([-1, 1])('admits an acquired backer crossing onto the climber half before the next read, side %s', side => {
    const f = ready(fixture(side, false, false, 11, undefined, RUN_BY_ID.duo), 'helper');
    const down = f.sim.see(f.helper, f.defender);
    const age = f.sim.see(f.helper, f.backer).age!;
    f.backer.body.vel = { x: 0, y: side * 2 };
    f.backer.body.pos.y = down.pos.y - side * .2 - f.backer.vel.y * age;
    f.observe();
    const backer = f.sim.see(f.helper, f.backer);
    expect((backer.pos.y - down.pos.y) * side).toBeLessThan(0);
    expect((backer.pos.y - down.pos.y + (backer.vel.y - down.vel.y) * f.helper.mind.decisionInterval) * side)
      .toBeGreaterThan(0);
    readCombination(f.helper, f.sim, f.combination);
    expect(f.combination.released).toBe(true);
  });
});


describe('loaded combination preparation',()=>{
 it.each([-1,1])('does not prepare the uncovered keeper across his partner for the other half, side %s',side=>{
  const f=fixture(side),controller=f.helper.behavior as RunBlocker;
  f.sim.tick();
  expect(controller.contactMotion(f.helper,'prepare')).toBeNull();
  expect(f.combination.released).toBe(false);
  expect(f.engagement.helpers).toContain(f.helper);
  expect(f.sim.world.joints).toContain(f.engagement.hands);
 });
 it('holds acquired preparation only for the installed combination and next job',()=>{
  const f=fixture(),controller=f.helper.behavior as RunBlocker;
  f.backer.body.pos.y=CENTER_Y+1.2;f.observe();f.sim.tick();
  expect(controller.contactMotion(f.helper,'prepare')).not.toBeNull();
  expect(f.combination.released).toBe(false);
  const held=controller.contactMotion(f.helper,'prepare');
  // Unseen backer motion is not a new preparation cue between decisions.
  f.backer.body.pos={x:48,y:CENTER_Y-8};
  expect(controller.contactMotion(f.helper,'prepare')).toEqual(held);
  // A different intervening job must retire preparation even when that
  // branch never consumes its feet, preserving target/action lifetime.
  controller.plan.target=f.backer;controller.update(f.helper,f.sim);
  controller.plan.target=f.defender;
  expect(controller.contactMotion(f.helper,'prepare')).toBeNull();
 });
 it.each(['primary','helper'] as const)('preserves current normal work when consuming preparation as %s',role=>{
  const plain=fixture(),prepared=fixture();
  const actor=prepared[role],spy=vi.spyOn(actor.behavior as RunBlocker,'contactMotion')
   .mockImplementation((_a,work)=>work==='prepare'?{x:-4,y:3}:null);
  const requests=(f:Fixture)=>{
   const intents=f.sim.agents.map(a=>({vel:{x:0,y:0},facing:a.facing}));
   updateEngagements(f.sim,intents);return intents;
  };
  const a=requests(plain)[plain[role].idx],b=requests(prepared)[actor.idx],axis=axisOf(plain.sim,plain.engagement);
  expect(spy.mock.calls.some(c=>c[1]==='prepare')).toBe(true);
  expect(b.vel.x*axis.x+b.vel.y*axis.y).toBeCloseTo(a.vel.x*axis.x+a.vel.y*axis.y,12);
  expect(b.vel).not.toEqual(a.vel);
  expect({...b,vel:a.vel}).toEqual(a);
  spy.mockRestore();
 });
});
