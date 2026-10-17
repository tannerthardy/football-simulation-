import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { RunBlocker } from '../src/sim/behaviors/blocking.js';
import { PlaySim } from '../src/sim/playsim.js';
import type { PlaySetup } from '../src/sim/playsim.js';

const inputs = JSON.parse(readFileSync(new URL('../data/reviews/current/puller-access/inputs.json', import.meta.url), 'utf8'));
function stage(id: string) {
  const sim = new PlaySim(structuredClone(inputs.rows.find((r: { id: string }) => r.id === id).setup) as PlaySetup);
  const a = sim.offense.find(a => a.behavior instanceof RunBlocker && a.behavior.plan.pullRole === 'force')!;
  const controller = a.behavior as RunBlocker;
  const edge = controller.plan.pullPath!.at(-1)!;
  const side = Math.sign(edge.y - sim.ballY);
  sim.t = 1;
  Reflect.set(controller, 'pullIdx', 2);
  a.body.pos = { x: 38, y: edge.y + side * .1 };
  return { sim, a, controller, edge, side };
}

describe('completed perimeter corner is route progress', () => {
  it.each(['C01', 'C02'])('keeps collecting after ordinary pursuit crosses the old gate: %s', id => {
    const { sim, a, controller, edge, side } = stage(id);
    const target = controller.plan.target;
    const before = structuredClone(a.body), rng = JSON.stringify(sim.rng);
    const first = controller.update(a, sim);
    expect(first.facing).toBeDefined();
    expect(a.body).toEqual(before);
    // Separate achieved geometry from the command; no hand contact is granted.
    a.body.pos = { x: 38.2, y: edge.y - side * .1 };
    sim.t += .05;
    const next = controller.update(a, sim);
    expect(next.facing).toBeDefined();
    expect(next.vel.x).toBeGreaterThan(0);
    expect(controller.plan.target).toBe(target);
    expect(a.engagement).toBeNull();
    expect(sim.world.joints).toHaveLength(0);
    expect(JSON.stringify(sim.rng)).toBe(rng);
  });

  it.each(['C01', 'C02'])('cannot record a corner while the acquired wall is uncleared: %s', id => {
    const { sim, a, controller, edge, side } = stage(id);
    a.body.pos.x = sim.los - .3;
    expect(controller.update(a, sim).facing).toBeUndefined();
    // Moving back inside the gate must still request its ordinary clearance.
    a.body.pos.y = edge.y - side * .1;
    expect(controller.update(a, sim).facing).toBeUndefined();
    expect(a.engagement).toBeNull();
  });
});
