/** Leg force-velocity (PHY-1, world.ts feet()): ground drive along a body's
 * own motion falls as 1 - v/vmax; legs yielding against it keep up to 1.2x
 * isometric, bounded by friction on the actual normal load (the report's
 * groundImpulseLimit, checked on its own below). Two square bodies on the World
 * with hands on, as scripts/diag/lateral-carry.ts stages seed 10 P46: a law
 * in a neutral frame, not an outcome target. */
import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/rng.js';
import { generatePlayer } from '../src/players/generator.js';
import { derivePhysical, type PhysicalProfile } from '../src/players/physical.js';
import type { Body } from '../src/physics/kinematics.js';
import { G } from '../src/core/units.js';
import { padHeightAt, supportParams } from '../src/physics/support.js';
import { World, type HandJoint, type Intent } from '../src/physics/world.js';

const DT = 0.05;

function profile(position: 'TE' | 'EDGE', massKg: number, strength: number, seed: number): PhysicalProfile {
  const p = derivePhysical(generatePlayer(new Rng(seed), position));
  const lb = massKg / 0.45359237;
  return { ...p, massKg, power: massKg * (0.55 + 0.75 * strength), radius: Math.min(0.42, Math.max(0.22, 0.24 + (lb - 180) / 1100)) };
}

/** The end's speed along the line (+ = carried by the blocker), yd/s, sampled each tick for 3 s. */
function carry(y: { m: number; s: number }, d: { m: number; s: number }, resist: boolean): number[] {
  const yP = profile('TE', y.m, y.s, 11), dP = profile('EDGE', d.m, d.s, 12);
  dP.vmax = yP.vmax; dP.tau = yP.tau; dP.brake = yP.brake; dP.lateral = yP.lateral; dP.shuffle = yP.shuffle; dP.backpedal = yP.backpedal;
  dP.balance = yP.balance; dP.bend = yP.bend; dP.heightYd = yP.heightYd; dP.stepSpeed = yP.stepSpeed;
  const sep = yP.radius + dP.radius + 0.05;
  const Y: Body = { pos: { x: 0, y: 0 }, vel: { x: 0, y: 0 }, facing: Math.PI / 2, energy: 1, profile: yP };
  const D: Body = { pos: { x: 0, y: sep }, vel: { x: 0, y: 0 }, facing: -Math.PI / 2, energy: 1, profile: dP };
  const w = new World([Y, D]);
  Y.support!.posture = 0.6; D.support!.posture = 0.6;
  const spY = supportParams(yP);
  const hands: HandJoint = { kind: 'hands', a: Y, b: D, actor: Y, extension: sep, push: spY.pressForce * 0.675, hold: 0, steer: spY.armForce * 0.425 };
  w.joints.push(hands);
  const yIntent: Intent = { vel: { x: 0, y: 4 }, facing: Math.PI / 2, push: 1, posture: 0.6 };
  const dIntent: Intent = resist ? { vel: { x: 0, y: -4.1 }, facing: -Math.PI / 2, push: 1, posture: 0.6 } : { vel: { x: 0, y: 0 }, facing: -Math.PI / 2, posture: 0.6 };
  const v: number[] = [];
  for (let k = 0; k < 3 / DT; k++) { w.step([yIntent, dIntent], DT); v.push(D.vel.y); }
  return v;
}
const mean = (v: number[], from: number, to: number) => { const s = v.slice(Math.round(from / DT), Math.round(to / DT)); return s.reduce((a, b) => a + b, 0) / s.length; };

describe('legs lose force as they speed up', () => {
  const y = { m: 113, s: 0.77 }, d = { m: 111, s: 0.62 };
  it('a slightly stronger blocker drifts a resisting end a few tenths of a yard per second, and stops gaining', () => {
    const v = carry(y, d, true);
    // Without the law the pair kept accelerating: 0.73 yd/s at 1-2 s, 1.54 at 3 s.
    expect(v.at(-1)!).toBeGreaterThan(0.25);
    expect(v.at(-1)!).toBeLessThan(0.55);
    expect(Math.abs(mean(v, 2.5, 3) - mean(v, 2, 2.5))).toBeLessThan(0.05);
  });
  it('equal strength stalls', () => {
    for (const s of [0.62, 0.77]) expect(Math.abs(mean(carry({ m: 112, s }, { m: 112, s }, true), 1, 3))).toBeLessThan(0.05);
  });
  it('an end who does not resist is still carried at running speed', () => {
    expect(mean(carry(y, d, false), 1, 2)).toBeGreaterThan(2.2);
  });
  it('the stronger end drives the blocker back, also at a bounded drift', () => {
    const v = carry({ m: 113, s: 0.62 }, { m: 111, s: 0.77 }, true);
    expect(v.at(-1)!).toBeLessThan(-0.1);
    expect(v.at(-1)!).toBeGreaterThan(-0.5);
  });
});

/** groundImpulseLimit is the bound the budget tests lean on, and the same feet()
 * computes it, so it is checked here against inputs the test derives itself:
 * the standing weight, and the lift the hands' compression puts through the
 * pad-height difference (a push from pads to pads tilts up into the higher man). */
describe('the ground impulse limit is friction on the actual normal load', () => {
  const mk = (position: 'TE' | 'EDGE', seed: number) => derivePhysical(generatePlayer(new Rng(seed), position));
  const pair = (postureY: number, postureD: number, pushScale: number, lightKg?: number) => {
    const yP = mk('TE', 11), dP = mk('EDGE', 12);
    if (lightKg) dP.massKg = lightKg;
    const sep = yP.radius + dP.radius + 0.05;
    const Y: Body = { pos: { x: 0, y: 0 }, vel: { x: 0, y: 0 }, facing: Math.PI / 2, energy: 1, profile: yP };
    const D: Body = { pos: { x: 0, y: sep }, vel: { x: 0, y: 0 }, facing: -Math.PI / 2, energy: 1, profile: dP };
    const w = new World([Y, D]);
    Y.support!.posture = postureY; D.support!.posture = postureD;
    const sp = [supportParams(yP), supportParams(dP)];
    const hands: HandJoint = { kind: 'hands', a: Y, b: D, actor: Y, extension: sep, push: sp[0].pressForce * 0.675 * pushScale, hold: 0, steer: sp[0].armForce * 0.425 };
    w.joints.push(hands);
    const yIntent: Intent = { vel: { x: 0, y: 4 }, facing: Math.PI / 2, push: 1, posture: postureY };
    const dIntent: Intent = { vel: { x: 0, y: -4.1 }, facing: -Math.PI / 2, push: 1, posture: postureD };
    return { w, Y, D, sp, hands, yIntent, dIntent, bodies: [Y, D], profiles: [yP, dP] };
  };

  it('a free standing or running body has exactly standing traction x dt', () => {
    const yP = mk('TE', 11);
    const Y: Body = { pos: { x: 0, y: 0 }, vel: { x: 0, y: 0 }, facing: 0, energy: 1, profile: yP };
    const Z: Body = { pos: { x: 40, y: 20 }, vel: { x: 0, y: 0 }, facing: 0, energy: 1, profile: mk('EDGE', 12) };
    const w = new World([Y, Z]);
    const sp = [supportParams(yP), supportParams(Z.profile)];
    for (let k = 0; k < 60; k++) {
      const r = w.step([{ vel: { x: k < 20 ? 0 : 8, y: 0 }, facing: 0 }, { vel: { x: 0, y: 0 }, facing: 0 }], DT);
      for (const i of [0, 1]) expect(r.groundImpulseLimit[i]).toBeCloseTo(sp[i].traction * DT, 9);
    }
  });

  it('a pad-pressed pair: the higher man loses traction x lift/(m g), the lower man gains it, never more than 2x', () => {
    const { w, hands, yIntent, dIntent, sp, profiles, bodies } = pair(0.2, 0.9, 1);
    let checked = 0;
    for (let k = 0; k < 60; k++) {
      const r = w.step([yIntent, dIntent], DT);
      if (k < 20) continue; // the felt lift settles over a few ticks
      const d = Math.hypot(bodies[1].pos.x - bodies[0].pos.x, bodies[1].pos.y - bodies[0].pos.y);
      const heights = bodies.map((b, i) => padHeightAt(sp[i], b.support!.posture));
      const higher = heights[0] > heights[1] ? 0 : 1;
      const rise = Math.min(0.6, Math.abs(heights[0] - heights[1]) / Math.max(d, 0.3));
      const lift = (hands.normalForce ?? 0) * rise;
      expect(lift).toBeGreaterThan(0);
      for (const i of [0, 1]) {
        const expected = 1 - (i === higher ? lift : -lift) / (profiles[i].massKg * G);
        const factor = r.groundImpulseLimit[i] / (sp[i].traction * DT);
        expect(factor).toBeCloseTo(Math.min(2, Math.max(0, expected)), 1);
        expect(factor).toBeLessThanOrEqual(2 + 1e-9);
      }
      const lifted = r.groundImpulseLimit[higher] / (sp[higher].traction * DT), pressed = r.groundImpulseLimit[1 - higher] / (sp[1 - higher].traction * DT);
      expect(lifted).toBeLessThan(0.9);
      expect(pressed).toBeGreaterThan(1.1);
      checked++;
    }
    expect(checked).toBe(40);
  });

  it('whatever lift is felt, the limit stays between 0 and 2x standing traction', () => {
    // The hands cannot press hard enough to reach the clamp (the pair above tops out near 1.8x),
    // so set the felt lift directly: a body pressed down far past his weight, and one lifted off the ground.
    const yP = mk('TE', 11);
    const sp = supportParams(yP);
    const factorAt = (felt: number) => {
      const Y: Body = { pos: { x: 0, y: 0 }, vel: { x: 0, y: 0 }, facing: 0, energy: 1, profile: yP };
      const w = new World([Y]);
      (w as unknown as { liftFelt: Float64Array }).liftFelt[0] = felt;
      return w.step([{ vel: { x: 0, y: 0 }, facing: 0 }], DT).groundImpulseLimit[0] / (sp.traction * DT);
    };
    const weight = yP.massKg * G;
    expect(factorAt(-1e6)).toBeCloseTo(2, 6);
    expect(factorAt(1e6)).toBeCloseTo(0, 6);
    expect(factorAt(-0.25 * weight)).toBeCloseTo(1.25, 1);
    expect(factorAt(0.25 * weight)).toBeCloseTo(0.75, 1);
  });
});
