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

describe('a wrapper collects after its flat pull clears', () => {
  function wrapper(obstructed = false, privateContact = false) {
    const sim = new PlaySim(structuredClone(inputs.rows.find((r: { id: string }) => r.id === 'K01').setup) as PlaySetup);
    const a = sim.offense.find(a => a.behavior instanceof RunBlocker && a.behavior.plan.pullRole === 'lead')!;
    const controller = a.behavior as RunBlocker;
    const flat = controller.plan.pullPath![1];
    sim.t = 2;
    a.body.pos = { x: flat.x - .5, y: flat.y };
    a.body.vel = { x: 0, y: 2 };
    Reflect.set(controller, 'pullIdx', 1);
    const target = controller.plan.target!;
    // The real hook must use this acquired picture, regardless of private contact.
    const ordinarySee = sim.see.bind(sim);
    sim.see = (observer, other, scale) => {
      const picture = ordinarySee(observer, other, scale);
      if (observer !== a) return picture;
      if (other === target) return { ...picture, pos: { x: 42, y: flat.y + 2 }, vel: { x: 0, y: 2 }, pose: 'up' };
      if (obstructed && ['C', 'LG', 'RG', 'LT', 'Y', 'H'].includes(other.slot))
        return { ...picture, pos: { ...picture.pos, x: 38 }, vel: { x: 0, y: 0 } };
      return picture;
    };
    if (privateContact) target.engagement = { blocker: sim.slot('C')!, defender: target, helpers: [] } as NonNullable<typeof target.engagement>;
    const before = structuredClone(a.body), rng = JSON.stringify(sim.rng);
    const command = controller.update(a, sim);
    expect(a.body).toEqual(before);
    expect(JSON.stringify(sim.rng)).toBe(rng);
    expect(a.engagement).toBeNull();
    expect(sim.world.joints).toHaveLength(0);
    return { command, target: controller.plan.target?.idx };
  }
  it('switches from the completed flat track to the acquired moving backer', () => {
    expect(wrapper().command.facing).toBeDefined();
  });
  it('keeps the installed route while an observed first-level wall obstructs it', () => {
    expect(wrapper(true).command.facing).toBeUndefined();
  });
  it('does not abandon the installed wrapper job from private defender contact', () => {
    expect(wrapper(false, true)).toEqual(wrapper(false, false));
  });
});
