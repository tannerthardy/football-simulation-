import { describe, expect, it } from 'vitest';
import { FIELD_WIDTH } from '../src/core/field.js';
import { World } from '../src/physics/world.js';
import type { Body } from '../src/physics/kinematics.js';
import type { PhysicalProfile } from '../src/players/physical.js';
import { ROUTES } from '../src/playbook/routes.js';
import { routePath, steerRoute } from '../src/sim/route-motion.js';
import { PlaySim } from '../src/sim/playsim.js';
import { RouteRunner } from '../src/sim/behaviors/receiver.js';
import { nativeTraceSetup } from '../scripts/diag/command-trace.js';

const profile = (): PhysicalProfile => ({ massKg: 90, radius: .27, reach: 1, heightYd: 2.05,
  vmax: 9, tau: 1.3, brake: 6, lateral: 6, turnRate: 8, backpedal: .6, shuffle: .6,
  maxCatchHeight: 3, reactReach: 2.6, reactionTime: .25, power: 95, balance: .6,
  bend: .5, stepSpeed: 3.4, getUp: .9 });

// The route has already reached the field-side boundary. A continuation may
// turn up, but must not retrace its completed segment to an inner margin.
function wideFlat(side: number) {
  const start = { x: 40, y: side > 0 ? 48 : FIELD_WIDTH - 48 };
  const route = ROUTES.flat;
  return routePath(start, 40, side, route.points, true, route.family);
}

describe('route continuation at the sideline', () => {
  it.each([-1, 1])('keeps the completed flat and continues upfield on side %s', side => {
    const path = wideFlat(side), terminal = path[1].p;
    expect(terminal.x).toBe(43.5);
    expect(terminal.y).toBeCloseTo(side > 0 ? FIELD_WIDTH - 1.2 : 1.2, 12);
    expect(path[2].p.x).toBeGreaterThan(terminal.x);
    expect(path[2].p.y).toBeCloseTo(terminal.y, 12);
    expect(path).toHaveLength(3);
    const pr = profile();
    const body: Body = { pos: { ...terminal }, vel: { x: 0, y: 0 }, facing: 0, energy: 1, profile: pr };
    const world = new World([body]), state = { idx: 1 };
    for (let k = 0; k < 6; k++) {
      const cmd = steerRoute(body, state, path, 'continue', .8, .7, 1.08);
      expect(cmd).not.toBeNull();
      expect(cmd!.vel.x).toBeGreaterThan(0);
      expect(cmd!.vel.y).toBeCloseTo(0, 12);
      world.step([cmd!], .05);
    }
    expect(body.pos.x).toBeGreaterThan(terminal.x + .01);
    expect(body.pos.y).toBeCloseTo(terminal.y, 10);
    expect(body.support!.state).toBe('up');
  });

  it.each([-1, 1])('preserves an ordinary flat extension before turning up on side %s', side => {
    const start = { x: 40, y: FIELD_WIDTH / 2 };
    const route = ROUTES.flat;
    const path = routePath(start, 40, side, route.points, true, route.family);
    expect(path).toHaveLength(4);
    expect((path[2].p.y - path[1].p.y) * side).toBeGreaterThan(0);
    expect(path[2].p.x).toBeGreaterThan(path[1].p.x);
    expect(path[2].p.y).toBeCloseTo(side > 0 ? FIELD_WIDTH - 5 : 5, 12);
    expect(path[3].p).toEqual({ x: path[2].p.x + 5, y: path[2].p.y });
  });

  it('preserves a called comeback instead of banning backward routes', () => {
    const route = ROUTES.comeback;
    const path = routePath({ x: 40, y: 25 }, 40, 1, route.points, false, route.family);
    expect(path).toHaveLength(2);
    expect(path[0].p.x).toBe(56);
    expect(path[1].p.x).toBe(53.5);
    expect(path[1].p.x).toBeLessThan(path[0].p.x);
  });

  it('keeps the installed Mesh corner from turning back after its final landmark', () => {
    // Native constructor, not an assertion that this snap reaches the final
    // landmark before the catch changes the receiver's responsibility.
    const sim = new PlaySim(nativeTraceSetup({ coverage: 'cover3', concept: 'mesh',
      seed: 7, roster: 7, formation: 'gun_doubles_11', flip: false }));
    const runner = sim.slot('Z')!.behavior;
    expect(runner).toBeInstanceOf(RouteRunner);
    const route = runner as RouteRunner, last = route.path[route.route.points.length - 1].p;
    expect(route.route.id).toBe('corner');
    expect(last.y).toBeLessThan(5);
    const next = route.path[route.route.points.length].p;
    expect(next.x).toBeGreaterThan(last.x);
    expect(next.y).toBe(last.y);
  });
});
