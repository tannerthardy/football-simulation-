import { describe, expect, it } from 'vitest';
import { run } from '../scripts/diag/runblock/bullrush-panel.js';
import { newSupport, supportParams } from '../src/physics/support.js';
import type { PhysicalProfile } from '../src/players/physical.js';
import { World, type Intent } from '../src/physics/world.js';
import type { Body } from '../src/physics/kinematics.js';

function lineman(x: number, facing: number, posture: number): Body {
  const profile: PhysicalProfile = { massKg: 140, radius: .38, reach: 1, heightYd: 2.13, vmax: 7, tau: 1.3,
    brake: 5, lateral: 5, turnRate: 7, backpedal: .5, shuffle: .5, maxCatchHeight: 3, reactReach: 2.6,
    reactionTime: .25, power: 140 * 1.1, balance: .5, bend: .3, padBend: .5, stepSpeed: 3, getUp: 1 };
  return { pos: { x, y: 0 }, vel: { x: 0, y: 0 }, facing, energy: 1, profile, support: newSupport(posture) };
}

/** Two linemen pushing chest to chest for half a second at chosen pad levels. */
function shove(postureA: number, postureB: number, mirror = 1) {
  const a = lineman(0, mirror > 0 ? 0 : Math.PI, postureA), b = lineman(.74 * mirror, mirror > 0 ? Math.PI : 0, postureB);
  const world = new World([a, b]);
  const intents: Intent[] = [
    { vel: { x: 2 * mirror, y: 0 }, facing: a.facing, push: 1, posture: postureA },
    { vel: { x: -2 * mirror, y: 0 }, facing: b.facing, push: 1, posture: postureB },
  ];
  let traction = [0, 0], residual = 0, last = world.step(intents, .05);
  for (let k = 0; k < 10; k++) {
    last = world.step(intents, .05);
    traction = [traction[0] + last.tractionImpulse[0], traction[1] + last.tractionImpulse[1]];
    residual = Math.max(residual, Math.abs(last.work.residual));
    for (const i of [0, 1]) expect(Math.hypot(last.groundImpulse[i].x, last.groundImpulse[i].y))
      .toBeLessThanOrEqual(last.tractionImpulse[i] + 1e-8);
  }
  const statics = supportParams(a.profile).traction * .05 * 10;
  return { a, b, traction, statics, residual };
}

describe('contact loads along the line between two players\' pads', () => {
  it('leaves traction at body weight when pads are level', () => {
    const r = shove(.8, .8);
    expect(r.traction[0]).toBeCloseTo(r.statics, 6);
    expect(r.traction[1]).toBeCloseTo(r.statics, 6);
  });

  it('lets the lower player take traction from the higher one, conserving the total load', () => {
    const r = shove(.9, .3);
    expect(r.traction[0]).toBeGreaterThan(r.statics);
    expect(r.traction[1]).toBeLessThan(r.statics);
    expect(r.traction[0] + r.traction[1]).toBeCloseTo(2 * r.statics, 6);
    expect(r.residual).toBeLessThan(1e-8);
  });

  it('is mirror symmetric', () => {
    const r = shove(.9, .3), m = shove(.9, .3, -1);
    expect(m.traction[0]).toBeCloseTo(r.traction[0], 6);
    expect(m.traction[1]).toBeCloseTo(r.traction[1], 6);
    expect(m.a.pos.x).toBeCloseTo(-r.a.pos.x, 6);
  });
});

describe('a bull rush succeeds or fails for physical reasons', () => {
  it('drives back a blocker who stands up, and stalls when the rusher stands up', () => {
    const level = run({ brace: 'brace3', same: true });
    const highBlocker = run({ brace: 'brace3', same: true, bPosture: .4 });
    const highRusher = run({ brace: 'brace3', same: true, dPosture: .4 });
    expect(highBlocker.driven).toBeGreaterThan(level.driven + .5);
    expect(highRusher.driven).toBeLessThan(level.driven);
  });

  it('lets leverage beat a modest weight edge', () => {
    const heavier = run({ brace: 'brace3', same: true, massScale: 1.15 });
    const heavierButHigh = run({ brace: 'brace3', same: true, massScale: 1.15, dPosture: .4 });
    expect(heavierButHigh.driven).toBeLessThan(heavier.driven - .5);
  });

  it('makes fatigue cost leverage: a tired blocker gives more ground', () => {
    const fresh = run({ brace: 'brace3', same: true });
    const tired = run({ brace: 'brace3', same: true, blockerEnergy: .3 });
    expect(tired.driven).toBeGreaterThan(fresh.driven + .3);
  });

  it('anchors a driven run blocker instead of spending traction on lateral drive', () => {
    const native = run({ brace: 'native', same: true }), braced = run({ brace: 'brace3', same: true });
    expect(native.driven).toBeLessThan(braced.driven + .3);
  });
});
