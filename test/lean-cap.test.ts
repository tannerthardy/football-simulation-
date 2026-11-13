/** Intent.leanCap (world.ts lean law; set by ANCHOR_BASE): the most lean a body is willing to commit into a felt
 * load. Unset, the lean law is untouched; set, his lean into a sustained press stays at or under it. A staged press: a
 * 130 kg rusher drives a 140 kg protector who asks to hold his ground, through a hands joint. */
import { describe, expect, it } from 'vitest';
import { World } from '../src/physics/world.js';
import { newSupport } from '../src/physics/support.js';

function press(leanCap?: number) {
  const body = (mass: number, x: number, facing: number) => ({ pos: { x, y: 0 }, vel: { x: 0, y: 0 }, facing, energy: 1, support: newSupport(0.5),
    profile: { massKg: mass, radius: 0.3, reach: 1.06, heightYd: 2.05, vmax: 7.5, tau: 1.3, brake: 6, lateral: 6, turnRate: 8, backpedal: 0.6,
      shuffle: 0.55, maxCatchHeight: 3, reactReach: 2.6, reactionTime: 0.25, power: mass, balance: 0.5, bend: 0.5, stepSpeed: 3.4, getUp: 0.9 } }) as any;
  const b = body(140, 0, 0), d = body(130, 1.2, Math.PI);
  const w = new World([b, d], { substeps: 12 });
  w.joints.push({ kind: 'hands', a: b, b: d, actor: b, extension: 1.2, push: 1500, hold: 0, steer: 600 } as any);
  const trace: { lean: number; x: number; vx: number }[] = [];
  for (let k = 0; k < 20; k++) {
    w.step([{ vel: { x: 0, y: 0 }, facing: 0, push: 1, posture: 0.55, ...(leanCap === undefined ? {} : { leanCap }) },
      { vel: { x: -1.5, y: 0 }, facing: Math.PI, push: 1, posture: 0.6 }] as any, 0.05);
    trace.push({ lean: Math.hypot(b.support.lean.x, b.support.lean.y), x: b.pos.x, vx: b.vel.x });
  }
  return trace;
}

describe('Intent.leanCap', () => {
  it('unset is the lean law as it was: identical to an infinite cap, tick for tick', () => {
    expect(press()).toEqual(press(Infinity));
  });
  it('set, his lean into a sustained press stays at or under it; the press it no longer meets moves him', () => {
    const free = press(), capped = press(400);
    expect(Math.max(...free.map((r) => r.lean))).toBeGreaterThan(800);
    expect(Math.max(...capped.map((r) => r.lean))).toBeLessThanOrEqual(400 + 1e-6);
    expect(capped.at(-1)!.x).toBeLessThan(free.at(-1)!.x - 0.05);   // walked back further: the rest of the press moves him
  });
});
