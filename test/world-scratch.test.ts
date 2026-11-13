/** Persistent World scratch must behave like fresh tick storage, including
 * transitions out of dives/passive motion and contact islands. */
import { describe, expect, it } from 'vitest';
import type { Body } from '../src/physics/kinematics.js';
import { newSupport } from '../src/physics/support.js';
import { World, type Intent } from '../src/physics/world.js';

function body(x = 0): Body {
  return { pos: { x, y: 0 }, vel: { x: 3, y: -.5 }, facing: .2, energy: .6,
    profile: { massKg: 100, radius: .28, reach: 1, heightYd: 2.05, vmax: 9, tau: 1.3,
      brake: 6, lateral: 6, turnRate: 8, backpedal: .6, shuffle: .55,
      maxCatchHeight: 3, reactReach: 2.6, reactionTime: .25, power: 100,
      balance: .5, bend: .5, stepSpeed: 3.4, getUp: .9 }, support: newSupport() };
}

describe('World tick scratch ownership', () => {
  it.each(['center', 'patch'] as const)('resets gait and effort after active, free, dive and down ticks (%s)', handContact => {
    const b = body(), world = new World([b], { handContact });
    const commands: Array<Intent | undefined> = [
      { vel: { x: -2, y: 7 }, cutSkill: .7, effort: .8, push: .5 },
      { vel: { x: 0, y: 0 }, free: true },
      { vel: { x: 4, y: 1 }, dive: { x: .7, y: -.2 } },
      { vel: { x: 8, y: 0 } }, undefined,
    ];
    for (let k = 0; k < 30; k++) {
      // A new decision can find a different support state. It must not
      // inherit the preceding tick's acceleration, dive or energy ledger.
      b.support!.state = k % 5 === 3 ? 'down' : k % 5 === 4 ? 'rising' : 'up';
      b.support!.since = world.time - .2;
      const fresh = new World([structuredClone(b)], { handContact });
      fresh.time = world.time;
      const intents = [commands[k % commands.length]], dt = k % 2 ? .025 : .05;
      const expected = fresh.step(intents, dt), actual = world.step(intents, dt);
      expect(actual).toStrictEqual(expected);
      expect(world.bodies).toStrictEqual(fresh.bodies);
      expect(world.time).toBe(fresh.time);
    }
  });

  it('rebuilds islands and contact aggregation without mutating retained reports or vectors', () => {
    const a = body(), b = body(.45), world = new World([a, b]);
    const retained: Array<{ report: ReturnType<World['step']>; copy: ReturnType<World['step']>;
      pos: Body['pos']; vel: Body['vel']; posCopy: Body['pos']; velCopy: Body['vel'] }> = [];
    for (let k = 0; k < 12; k++) {
      const close = k % 2 === 0;
      a.pos = { x: 0, y: 0 }; b.pos = { x: close ? .45 : 10, y: 0 };
      a.vel = { x: close ? 4 : 0, y: 0 }; b.vel = { x: 0, y: 0 };
      a.support = newSupport(); b.support = newSupport();
      const fresh = new World(structuredClone([a, b])); fresh.time = world.time;
      const intents: Intent[] = [{ vel: { x: 0, y: 0 }, free: true }, { vel: { x: 0, y: 0 }, free: true }];
      const expected = fresh.step(intents, .05), report = world.step(intents, .05);
      expect(report).toStrictEqual(expected);
      expect(world.bodies).toStrictEqual(fresh.bodies);
      if (close) expect(report.contacts.length).toBeGreaterThan(0);
      else { expect(report.contacts).toEqual([]); expect(report.substeps).toBe(1); }
      retained.push({ report, copy: structuredClone(report), pos: a.pos, vel: a.vel,
        posCopy: { ...a.pos }, velCopy: { ...a.vel } });
      for (const saved of retained) {
        expect(saved.report).toStrictEqual(saved.copy);
        expect(saved.pos).toStrictEqual(saved.posCopy); expect(saved.vel).toStrictEqual(saved.velCopy);
      }
    }
  });
});
