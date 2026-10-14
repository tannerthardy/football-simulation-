import { describe, expect, it } from 'vitest';
import type { Body } from '../src/physics/kinematics.js';
import { newSupport, supportParams } from '../src/physics/support.js';
import { World, type Intent, type StepReport } from '../src/physics/world.js';
import { readWitness, reflectWitness, replayKeeper } from '../scripts/diag/physics/keeper-contact-law.js';

function budgets(r: StepReport) {
  expect(Math.abs(r.work.residual)).toBeLessThan(1e-8);
  r.armImpulse.forEach((v, i) => expect(v).toBeLessThanOrEqual(r.armImpulseLimit[i] + 1e-9));
  r.armWork.forEach((v, i) => expect(v).toBeLessThanOrEqual(r.armWorkLimit[i] + 1e-9));
  r.supportMotorWork.forEach((v, i) => expect(v).toBeLessThanOrEqual(r.supportMotorWorkLimit[i] + 1e-9));
}
function angular(bs: Body[]) {
  return bs.reduce((s, b) => s + b.profile.massKg * (b.pos.x * b.vel.y - b.pos.y * b.vel.x)
    + supportParams(b.profile).yawInertia * (b.spin ?? 0), 0);
}

describe('common contact can retain the baseline ground law', () => {
  it('keeps historical center/full-patch selection unless an explicit ground model is supplied', () => {
    const body = readWitness().beforeBodies[0];
    const center = new World([structuredClone(body)]), patch = new World([structuredClone(body)], { handContact: 'patch' });
    expect(center.groundMovement).toBe('legacy');
    expect(patch.groundMovement).toBe('response');
    Reflect.set(center, 'handContact', 'patch'); // Existing identical-prefix diagnostic mode switch.
    expect(center.groundMovement).toBe('response');
    const isolated = new World([structuredClone(body)], { handContact: 'patch', groundMovement: 'legacy' });
    expect(isolated.groundMovement).toBe('legacy');
  });

  it.each(['turn', 'reverse', 'falling'] as const)('retains every no-contact body/ground result for %s, including reflected motion', kind => {
    for (const side of [-1, 1]) {
      const b = structuredClone(readWitness().beforeBodies[0]);
      b.pos = { x: 0, y: 0 }; b.vel = { x: 1.3, y: side * 2.2 }; b.facing = side * .4; b.spin = side * .7;
      b.energy = .85; b.support = newSupport(.7);
      if (kind === 'falling') { b.support.state = 'falling'; b.support.since = 0; b.support.fall = { x: .2, y: side * .1 }; }
      const a = structuredClone(b), c = structuredClone(b);
      const baseline = new World([a]), isolated = new World([c], { handContact: 'patch', groundMovement: 'legacy' });
      const command: Intent = { vel: { x: kind === 'reverse' ? -1.2 : 2.1, y: side * (kind === 'reverse' ? -2.8 : 3.6) },
        facing: side * 1.7, posture: .85, cutSkill: .95 };
      for (let k = 0; k < 6; k++) {
        const old = baseline.step([command], .05), current = isolated.step([command], .05);
        expect(current.contacts).toHaveLength(0);
        expect(c).toEqual(a); expect(current).toEqual(old); budgets(current);
      }
    }
  });

  it.each([false, true])('retains angular law, real torque and budgets on the exact free keeper, reflected %s', mirror => {
    const w = readWitness(), input = mirror ? reflectWitness(w) : w;
    for (const substeps of [1, 12, 48]) {
      const isolated = replayKeeper(input, 'patch', { groundMovement: 'legacy', free: true, substeps });
      const existing = replayKeeper(input, 'patch', { free: true, substeps });
      expect(isolated.clean).toBe(true); expect(isolated.bodies).toEqual(existing.bodies);
      expect(Math.abs(isolated.angularChange)).toBeLessThan(1e-8);
      expect(isolated.linearResidual).toBeLessThan(1e-10);
      expect(Math.abs(isolated.joints[0].momentOnA!)).toBeGreaterThan(1);
      expect(Math.abs(isolated.joints[0].momentOnB!)).toBeGreaterThan(1);
      isolated.reports.forEach(budgets);
    }
  });

  it('keeps the loaded native hand and support budgets without cancelling delivered torque', () => {
    const isolated = replayKeeper(readWitness(), 'patch', { groundMovement: 'legacy' });
    expect(Math.abs(isolated.joints[0].momentOnA!)).toBeGreaterThan(1);
    expect(Math.abs(isolated.joints[0].momentOnB!)).toBeGreaterThan(1);
    isolated.reports.forEach(budgets);
  });

  it.each([-1, 1])('closes angular momentum and represented work with simultaneous hand/torso forces, side %s', side => {
    // Reuse the established mixed-law geometry, with unequal masses/radii.
    const make = (x: number, radius: number, mass: number): Body => ({ pos: { x, y: 0 }, vel: { x: .7, y: 0 },
      facing: 0, spin: 0, energy: 1, profile: { massKg: mass, radius, reach: 1, heightYd: 2.05,
        vmax: 9, tau: 1.3, brake: 6, lateral: 6, turnRate: 8, backpedal: .6, shuffle: .55,
        maxCatchHeight: 3, reactReach: 2.6, reactionTime: .25, power: 100, balance: .5, stepSpeed: 3.4, getUp: .9 } });
    for (const substeps of [1, 12, 48]) {
      const a = make(0, .25, 100), b = make(.5, .35, 80), bs = [a, b];
      a.vel.x = 1.2; b.vel = { x: .2, y: side };
      const before = angular(bs), world = new World(bs, { handContact: 'patch', groundMovement: 'legacy', substeps });
      world.joints.push({ kind: 'hands', a, b, extension: .9, push: 20, hold: 0, steer: 20 });
      const report = world.step(bs.map(() => ({ vel: { x: 0, y: 0 }, free: true })), .05);
      expect(report.contacts.length).toBeGreaterThan(0); expect(report.armImpulse[0]).toBeGreaterThan(0);
      expect(report.groundImpulse).toEqual(bs.map(() => ({ x: 0, y: 0 })));
      expect(report.groundYawImpulse).toEqual(bs.map(() => 0));
      expect(angular(bs)).toBeCloseTo(before, 8); budgets(report);
    }
  });
});
