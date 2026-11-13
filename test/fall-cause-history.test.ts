import { describe, expect, it } from 'vitest';
import type { PhysicalProfile } from '../src/players/physical.js';
import type { Body } from '../src/physics/kinematics.js';
import { newSupport, type SupportStateKind } from '../src/physics/support.js';
import { World, type Intent } from '../src/physics/world.js';

function body(mass: number, x = 0): Body {
  const profile: PhysicalProfile = {
    massKg: mass, radius: .24 + (mass * 2.20462 - 180) / 1100, reach: 1,
    heightYd: 2.05, vmax: 9, tau: 1.3, brake: 6, lateral: 6, turnRate: 8,
    backpedal: .6, shuffle: .55, maxCatchHeight: 3, reactReach: 2.6,
    reactionTime: .25, power: mass, balance: .5, bend: .5, stepSpeed: 3.4, getUp: .9,
  };
  return { pos: { x, y: 0 }, vel: { x: 0, y: 0 }, facing: 0,
    energy: 1, profile, support: newSupport() };
}

const stand: Intent = { vel: { x: 0, y: 0 } };
const passive: Intent = { vel: { x: 0, y: 0 }, free: true };
function physical(bodies: Body[]) {
  return structuredClone(bodies).map(b => {
    delete b.support!.causes;
    delete b.support!.cause;
    return b;
  });
}

describe('recent fall-cause history', () => {
  it('decays through each off-feet state over equal elapsed time', () => {
    const initial = { contact: .4, legs: .7, overspeed: .2 };
    for (const state of ['falling', 'down', 'rising'] as SupportStateKind[]) {
      for (const dt of [.05, .1]) {
        const a = body(90), world = new World([a]);
        a.support!.state = state;
        a.support!.since = 0;
        a.support!.causes = { ...initial };
        for (let k = 0; k < Math.round(.2 / dt); k++) world.step([stand], dt);
        expect(a.support!.state).toBe(state);
        for (const key of ['contact', 'legs', 'overspeed'] as const)
          expect(a.support!.causes![key]).toBeCloseTo(initial[key] * Math.exp(-.2 / .3), 12);
      }
    }
  });

  it('does not attribute a new contact fall to a leg episode before normal recovery', () => {
    const cases = [0, 2].map(legs => {
      const source = body(100, -10), target = body(90);
      target.support!.state = 'down';
      target.support!.since = 0;
      target.support!.causes = { contact: 0, legs, overspeed: 0 };
      return { source, target, world: new World([source, target]) };
    });
    const states = new Set<SupportStateKind>(['down']);
    let recoveryTicks = 0;
    while (cases.some(c => c.target.support!.state !== 'up') && recoveryTicks++ < 60) {
      for (const c of cases) {
        c.world.step([stand, stand], .05);
        states.add(c.target.support!.state);
      }
      expect(physical(cases[0].world.bodies)).toEqual(physical(cases[1].world.bodies));
    }
    expect([...states]).toEqual(expect.arrayContaining(['down', 'rising', 'up']));
    for (const c of cases) expect(c.target.support!.state).toBe('up');

    // Reuse the existing hard-contact control's bodies, speed and .62 yd
    // separation. This identical new stimulus is prescribed after recovery;
    // it is not a simulated football approach or another leg restraint.
    for (const c of cases) {
      c.source.pos = { x: c.target.pos.x - .62, y: c.target.pos.y };
      c.source.vel = { x: 9, y: 0 };
    }
    let hitTicks = 0, actualContact = false;
    while (cases.some(c => c.target.support!.state !== 'falling') && hitTicks++ < 20) {
      for (const c of cases) {
        const report = c.world.step([passive, stand], .05);
        actualContact ||= report.contacts.some(p => p.impulse > 0);
        expect(c.world.joints).toHaveLength(0);
      }
      expect(physical(cases[0].world.bodies)).toEqual(physical(cases[1].world.bodies));
    }
    expect(actualContact).toBe(true);
    for (const c of cases) {
      expect(c.target.support!.state).toBe('falling');
      expect(c.target.support!.cause).toBe('contact');
      expect(c.target.support!.causes!.contact).toBeGreaterThan(c.target.support!.causes!.legs);
    }
  });
});
