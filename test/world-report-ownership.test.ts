import { describe, expect, it } from 'vitest';
import type { Body } from '../src/physics/kinematics.js';
import { World, type StepReport } from '../src/physics/world.js';

const scalars = ['groundWork', 'groundYawImpulse', 'groundYawWork', 'armWork', 'armWorkLimit',
  'armImpulse', 'armImpulseLimit', 'supportMotorWork', 'supportMotorWorkLimit'] as const;
const vectors = ['groundImpulse', 'leanRelease'] as const;

function body(x: number): Body {
  return { pos: { x, y: 0 }, vel: { x: 0, y: 0 }, facing: 0, energy: 1,
    profile: { massKg: 100, radius: .28, reach: 1, heightYd: 2.05, vmax: 9, tau: 1.3,
      brake: 6, lateral: 6, turnRate: 8, backpedal: .6, shuffle: .55,
      maxCatchHeight: 3, reactReach: 2.6, reactionTime: .25, power: 100 } };
}

function freeze(value: object): void {
  for (const child of Object.values(value)) if (child && typeof child === 'object') freeze(child);
  Object.freeze(value);
}

describe('World report array ownership', () => {
  it.each([0, 1, 3])('keeps reports independent across channels, bodies and steps (%i bodies)', count => {
    const bodies = Array.from({ length: count }, (_, i) => body(i * 10));
    const world = new World(bodies), intents = bodies.map(() => ({ vel: { x: 0, y: 0 }, free: true }));
    const first = world.step(intents, .05);
    const arrays = [...scalars, ...vectors].map(key => first[key]);
    expect(new Set(arrays).size).toBe(arrays.length);
    for (const array of arrays) {
      expect(Array.isArray(array)).toBe(true);
      expect(array.length).toBe(count);
      expect(Object.keys(array)).toEqual(Array.from({ length: count }, (_, i) => String(i)));
    }
    const entries = vectors.flatMap(key => first[key]);
    expect(new Set(entries).size).toBe(entries.length);
    if (count) {
      first.armWork[0] = 123;
      first.groundImpulse[0].x = 456;
      expect(first.groundWork[0]).toBe(0);
      expect(first.leanRelease[0].x).toBe(0);
      if (count > 1) expect(first.groundImpulse[1].x).toBe(0);
    }
    const saved: StepReport = structuredClone(first);
    freeze(first);
    const next = world.step(intents, .05);
    expect(next).not.toBe(first);
    for (const key of [...scalars, ...vectors]) expect(next[key]).not.toBe(first[key]);
    expect(next.armWork).toEqual(new Array(count).fill(0));
    expect(next.groundImpulse).toEqual(bodies.map(() => ({ x: 0, y: 0 })));
    expect(first).toStrictEqual(saved);
  });
});
