import { describe, expect, it } from 'vitest';
import { nativeTraceSetup } from '../scripts/diag/command-trace.js';
import { World } from '../src/physics/world.js';
import type { Body } from '../src/physics/kinematics.js';
import { ROUTES } from '../src/playbook/routes.js';
import { RouteRunner } from '../src/sim/behaviors/receiver.js';
import { PlaySim } from '../src/sim/playsim.js';
import { routeEffort, routePath, steerRoute } from '../src/sim/route-motion.js';

function native(formation = 'gun_doubles_11', flip = false) {
  return new PlaySim(nativeTraceSetup({ coverage: 'cover3', concept: 'slant_flat',
    seed: 1, roster: 7, formation, flip }));
}

describe('flat release gains width before climbing to the outlet', () => {
  it.each([-1, 1])('earns the early width in World without changing effort or its terminal landmark (side %s)', side => {
    const sim = native(), receiver = sim.slot('H')!, rr = receiver.r('routeRunning');
    const start = { x: sim.los - 1.2, y: 26 };
    const path = routePath(start, sim.los, side, ROUTES.flat.points, true, ROUTES.flat.family);
    expect(path[1].p).toEqual({ x: sim.los + 3.5, y: start.y + side * 12 });
    // Historical first waypoint, frozen only as the opposing geometry arm.
    // Same profile, World, time, effort and final outlet in both arms.
    const previous = routePath(start, sim.los, side,
      [{ d: 1.5, l: 2, s: .9 }, ROUTES.flat.points[1]], true, ROUTES.flat.family);
    const run = (points: typeof path) => {
      const body: Body = { pos: { ...start }, vel: { x: 0, y: 0 }, facing: 0,
        energy: 1, profile: receiver.profile };
      const world = new World([body]), state = { idx: 0 };
      for (let step = 0; step < 18; step++) {
        const command = steerRoute(body, state, points, 'continue', routeEffort('flat', rr), rr, .8 + .4 * rr)!;
        expect(Math.hypot(command.vel.x, command.vel.y)).toBeLessThanOrEqual(receiver.profile.vmax * routeEffort('flat', rr) + 1e-9);
        world.step([command], .05);
      }
      return body;
    };
    const current = run(path), old = run(previous);
    expect((current.pos.y - start.y) * side).toBeGreaterThan((old.pos.y - start.y) * side);
    expect(current.pos.x).toBeLessThan(old.pos.x);
    expect(current.vel.y * side).toBeGreaterThan(current.vel.x);
    expect(current.support!.state).toBe('up');
    expect(Math.hypot(current.vel.x, current.vel.y)).toBeLessThanOrEqual(receiver.profile.vmax);
  });

  it.each([
    ['gun_doubles_11', false, 'H'], ['gun_doubles_11', true, 'H'],
    ['gun_doubles_11', false, 'Y'], ['ace_11', true, 'Y'],
  ] as const)('keeps a usable native %s flat release, flip=%s, slot=%s', (formation, flip, slot) => {
    const sim = native(formation, flip), receiver = sim.slot(slot)!, runner = receiver.behavior as RouteRunner;
    expect(runner).toBeInstanceOf(RouteRunner);
    expect(runner.route.id).toBe('flat');
    const start = { ...receiver.pos }, side = Math.sign(runner.path[0].p.y - start.y);
    const trace = sim.recordCommands({ actor: { team: 'O', slot }, from: 0, to: .9 });
    while (sim.t < .9 - 1e-9) sim.tick();
    const move = trace.steps.find(s => Math.hypot(s.decision!.raw.vel.x, s.decision!.raw.vel.y) > 1)!;
    expect(move.decision!.owner.controller).toBe('RouteRunner');
    expect(move.decision!.raw.vel.y * side).toBeGreaterThan(move.decision!.raw.vel.x);
    expect(receiver.vel.y * side).toBeGreaterThan(receiver.vel.x);
    expect((receiver.pos.y - start.y) * side).toBeGreaterThan(receiver.pos.x - start.x);
    expect(receiver.body.support!.state).toBe('up');
    // The improvement must survive the normal command pipeline, not only a
    // synthetic free-body forecast or a changed request later overwritten.
    expect(trace.steps.flatMap(s => s.endpoint!.lastStepContacts)).toEqual([]);
  });
});
