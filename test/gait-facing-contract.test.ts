import { describe, expect, it } from 'vitest';
import { fatigueFactor, locomotionAccel, type Body } from '../src/physics/kinematics.js';
import { availability, newSupport, supportParams } from '../src/physics/support.js';
import { World, type HandJoint, type Intent, type StepReport } from '../src/physics/world.js';

const DT = .05;
function body(x: number, side: number, speed: number, posture: number): Body {
  return { pos: { x, y: 0 }, vel: { x: 0, y: side * speed }, facing: 0, spin: 0, energy: 1,
    support: newSupport(posture), profile: { massKg: 150, radius: .4, reach: 1, heightYd: 2.02,
      vmax: 7.2, tau: 1.4, brake: 5.5, lateral: 5.5, turnRate: 6, backpedal: .55, shuffle: .5,
      maxCatchHeight: 2.8, reactReach: 2.4, reactionTime: .25, power: 150, balance: .65,
      bend: .55, stepSpeed: 2.8, getUp: 1 } };
}
interface Plan { ax: number; ay: number; facing: number }
interface Observer {
  plan(b: Body, i: number, intent: Intent, dt: number): Plan;
  feet(i: number, intent: Intent, plan: Plan, h: number, remaining: number, r: StepReport): void;
}
function run(mode: 'center' | 'patch', side: number, substeps = 12, loaded = false,
  posture = .2, below = false, observe = true, fixed = false, free = false) {
  const low = 1 - .12 * Math.max(0, posture - .3), speed = below ? 1 : 7.2 * .5 * low;
  const a = body(0, side, speed, posture), b = body(1, side, speed, posture); b.facing = Math.PI;
  const bs = [a, b], w = new World(bs, { substeps, handContact: mode });
  const hand: HandJoint = { kind: 'hands', a, b, extension: 1, push: 0, hold: 0, steer: loaded ? 1000 : 0 };
  w.joints.push(hand);
  const intent: Intent = { vel: { x: 0, y: side * (below ? 1.3 : 5) }, facing: fixed ? 0 : side * Math.PI / 2,
    push: 0, posture, free };
  const other: Intent = { ...intent, facing: Math.PI };
  const records: Array<{ initial: Body; intent: Intent; dt: number; plan: Plan }> = [];
  const forces: Array<{ h: number; x: number; y: number }> = [];
  if (observe) {
    const engine = w as unknown as Observer, plan = engine.plan, feet = engine.feet;
    engine.plan = function(subject, i, command, dt) {
      const initial = structuredClone(subject), result = plan.call(w, subject, i, command, dt);
      if (i === 0) records.push({ initial, intent: structuredClone(command), dt, plan: { ...result } });
      return result;
    };
    engine.feet = function(i, command, movement, h, remaining, report) {
      const before = { ...report.groundImpulse[i] }; feet.call(w, i, command, movement, h, remaining, report);
      if (i === 0) forces.push({ h, x: (report.groundImpulse[i].x - before.x) / h / a.profile.massKg,
        y: (report.groundImpulse[i].y - before.y) / h / a.profile.massKg });
    };
  }
  const report = w.step([intent, other], DT);
  expect(Math.abs(report.work.residual)).toBeLessThan(1e-8);
  expect(report.contacts).toHaveLength(0); expect(report.falls).toHaveLength(0);
  const p = bs.reduce((sum, v) => sum + v.profile.massKg * v.vel.y, 0);
  expect(p - 300 * side * speed).toBeCloseTo(report.groundImpulse[0].y + report.groundImpulse[1].y, 8);
  return { records, forces, signature: JSON.stringify({ bs, hand, report }), a, b, report };
}
function currentCommand(record: ReturnType<typeof run>['records'][number]) {
  const b = record.initial, low = 1 - .12 * Math.max(0, b.support!.posture - .3);
  const command = low < 1 ? { ...record.intent, effort: (record.intent.effort ?? 1) * low } : record.intent;
  return locomotionAccel(b, command, record.dt,
    availability(b.support!, supportParams(b.profile), fatigueFactor(b.energy)));
}

describe('held patch gait is planned from attained tick-entry facing', () => {
  it.each([.2, .85].flatMap(posture => [-1, 1].map(side => ({ posture, side }))))
    ('does not borrow a future sideways cap: posture $posture, side $side', ({ posture, side }) => {
      const result = run('patch', side, 12, true, posture), record = result.records[0];
      expect(result.records).toHaveLength(1); expect(record.initial.facing).toBe(0); expect(record.dt).toBe(DT);
      const expected = currentCommand(record);
      expect(expected.x).toBeCloseTo(0, 12); expect(expected.y).toBeCloseTo(0, 12);
      expect(record.plan.ax).toBeCloseTo(expected.x, 12); expect(record.plan.ay).toBeCloseTo(expected.y, 12);
      expect(result.forces[0].x).toBeCloseTo(expected.x, 10); expect(result.forces[0].y).toBeCloseTo(expected.y, 10);
      // The motor's facing goal remains the held request; the plan must not
      // require the physical torso to jump to that goal before propulsion.
      expect(Math.abs(record.plan.facing)).toBeGreaterThan(Math.abs(record.initial.facing));
    });

  it.each([-1, 1])('preserves the historical center-mode prospective-face counterexample, side %s', side => {
    const result = run('center', side), record = result.records[0];
    // The original 20 Hz plan credits 0.3 rad of requested turn. Its analytic
    // desired-speed clip then feeds the established propulsion lag law, which
    // starts from the body's full start force (7.2) in any direction (#353):
    // the lag law lifted by 7.2 / desired.
    const desired = 7.2 * (1 - .5 * ((Math.PI / 2 - .3) / (Math.PI / 2)) ** 2);
    const expected = (desired - 3.6) / 1.4 * (7.2 / desired);
    expect(expected).toBeCloseTo(1.3205817620342934, 12);
    expect(record.plan.ay * side).toBeCloseTo(expected, 12);
    for (const force of result.forces) expect(force.y * side).toBeCloseTo(expected, 10);
  });

  it.each([-1, 1])('preserves the below-directional-cap held propulsion law, side %s', side => {
    const legacy = run('center', side, 12, false, .2, true), patch = run('patch', side, 12, false, .2, true);
    const expected = currentCommand(patch.records[0]);
    // Below the sideways cap (7.2 x .5 shuffle = 3.6) the legs push from the
    // body's full start force, 7.2 in any direction (#353), and level off at the
    // wanted 1.3: the lag law scaled by 7.2 / 1.3.
    expect(expected.y * side).toBeCloseTo((1.3 - 1) / 1.4 * (7.2 / 1.3), 12);
    expect(patch.records[0].plan.ax).toBe(legacy.records[0].plan.ax);
    expect(patch.records[0].plan.ay * side).toBeCloseTo(expected.y * side, 12);
    // The start force does not depend on the hips' direction (#353), so legacy
    // center mode's prospective turn no longer changes it: the same push.
    expect(legacy.records[0].plan.ay * side).toBeCloseTo(patch.records[0].plan.ay * side, 12);
    for (const force of patch.forces) expect(force.y).toBeCloseTo(expected.y, 10);
  });

  it.each([1, 12, 48])('keeps the actual-pose plan held across refinement and loaded/unloaded controls at %s steps', substeps => {
    for (const loaded of [false, true]) for (const side of [-1, 1]) {
      const observed = run('patch', side, substeps, loaded), plain = run('patch', side, substeps, loaded, .2, false, false);
      expect(observed.signature).toBe(plain.signature); expect(observed.records).toHaveLength(1);
      for (const force of observed.forces) {
        expect(force.x).toBeCloseTo(0, 10); expect(force.y).toBeCloseTo(0, 10);
      }
      expect(observed.forces.reduce((sum, v) => sum + v.h, 0)).toBeCloseTo(DT, 12);
    }
  });

  it('preserves fixed-facing and FREE baseline translation', () => {
    for (const side of [-1, 1]) {
      const legacy = run('center', side, 12, false, .2, false, true, true);
      const patch = run('patch', side, 12, false, .2, false, true, true);
      expect(patch.a.vel).toEqual(legacy.a.vel); expect(patch.a.pos).toEqual(legacy.a.pos);
      const loose = run('patch', side, 12, false, .2, false, true, false, true);
      expect(loose.a.vel).toEqual({ x: 0, y: side * 3.6 }); expect(loose.a.facing).toBe(0);
      expect(loose.report.groundImpulse).toEqual([{ x: 0, y: 0 }, { x: 0, y: 0 }]);
    }
  });
});
