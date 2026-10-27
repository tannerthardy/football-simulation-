/** Leg force-velocity (PHY-1, world.ts feet()): ground drive along a body's
 * own motion falls as 1 - v/vmax; legs yielding against it keep up to 1.2x
 * isometric, never beyond standing friction. Two square bodies on the World
 * with hands on, as scripts/diag/lateral-carry.ts stages seed 10 P46: a law
 * in a neutral frame, not an outcome target. */
import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/rng.js';
import { generatePlayer } from '../src/players/generator.js';
import { derivePhysical, type PhysicalProfile } from '../src/players/physical.js';
import type { Body } from '../src/physics/kinematics.js';
import { supportParams } from '../src/physics/support.js';
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
