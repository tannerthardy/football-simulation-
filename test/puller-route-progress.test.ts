import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { goTo } from '../src/sim/behaviors/common.js';
import { RunBlocker } from '../src/sim/behaviors/blocking.js';
import { PlaySim, type PlaySetup } from '../src/sim/playsim.js';
// BOX_ALIGN puts the one-high down safety in the box, where the wrapper is
// assigned him at the snap; these scenes are staged on the installed spot.
vi.hoisted(() => { process.env.BOX_ALIGN = '0'; });

const inputs = JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/puller-access-inputs.json.gz', import.meta.url))).toString());

describe('a wrapper collects after its flat pull clears', () => {
  function wrapper(obstructed = false, privateContact = false, mirror = false, unavailable = false) {
    const sim = new PlaySim(structuredClone(inputs.rows.find((r: { id: string }) => r.id === 'K01').setup) as PlaySetup);
    const a = sim.offense.find(a => a.behavior instanceof RunBlocker && a.behavior.plan.pullRole === 'lead')!;
    const controller = a.behavior as RunBlocker;
    if (mirror) {
      const reflect = (y: number) => 2 * sim.ballY - y;
      for (const body of sim.agents.map(p => p.body)) {
        body.pos.y = reflect(body.pos.y); body.vel.y *= -1; body.facing *= -1;
      }
      for (const spot of Object.values(sim.offAlign.spots)) if (spot) spot.pos.y = reflect(spot.pos.y);
      sim.offAlign.strongSign *= -1;
      controller.plan.drive.y *= -1;
      for (const point of controller.plan.pullPath!) point.y = reflect(point.y);
    }
    Object.defineProperty(a.mind, 'placementError', { get: () => 0 });
    const flat = controller.plan.pullPath![1], side = mirror ? -1 : 1;
    sim.t = 2;
    a.body.pos = { x: flat.x - .5, y: flat.y };
    a.body.vel = { x: 0, y: side * 2 };
    Reflect.set(controller, 'pullIdx', unavailable ? 3 : 1);
    const target = controller.plan.target!;
    // The real hook must use this acquired picture, regardless of private contact.
    const ordinarySee = sim.see.bind(sim);
    sim.see = (observer, other, scale) => {
      const original = ordinarySee(observer, other, scale);
      const picture = mirror ? { ...original, pos: { x: original.pos.x, y: 2 * sim.ballY - original.pos.y }, vel: { x: original.vel.x, y: -original.vel.y }, facing: -original.facing } : original;
      if (observer !== a) return picture;
      if (other === target) return { ...picture, pos: { x: 42, y: flat.y + side * 2 }, vel: { x: 0, y: side * 2 }, pose: unavailable ? 'down' : 'up' };
      if (obstructed && ['C', 'LG', 'RG', 'LT', 'Y', 'H'].includes(other.slot))
        return { ...picture, pos: { ...picture.pos, x: 38 }, vel: { x: 0, y: 0 } };
      return picture;
    };
    if (privateContact) target.engagement = { blocker: sim.slot('C')!, defender: target, helpers: [] } as unknown as NonNullable<typeof target.engagement>;
    const before = structuredClone(a.body), rng = JSON.stringify(sim.rng);
    const command = controller.update(a, sim);
    expect(a.body).toEqual(before);
    expect(JSON.stringify(sim.rng)).toBe(rng);
    expect(a.engagement).toBeNull();
    expect(sim.world.joints).toHaveLength(0);
    // Past the corner the wrapper runs through the hole toward his work (he is
    // not asked to stop on the hole point): the same installed track, at speed.
    if (!unavailable && !obstructed) expect(command).toEqual(goTo(a, controller.plan.pullPath![2], { speed: .95, through: a.profile.vmax * .8 }));
    const picked = controller.plan.target, hole = controller.plan.pullPath!.at(-1)!, seen = picked && sim.see(a, picked);
    // The replacement as he sees it: an upright defender in front of him and
    // inside the hole's lane, not merely a different name.
    const threat = !!seen && picked!.team !== a.team && seen.pose === 'up' && seen.pos.x > a.pos.x - .5
      && Math.abs(seen.pos.y - hole.y) <= 4 && seen.pos.x - sim.los >= -1.5 && seen.pos.x - sim.los <= 7;
    return { command, target: picked?.idx, original: target.idx, threat };
  }
  it.each([false, true])('preserves the installed flat-to-upfield track, mirror=%s', mirror => {
    expect(wrapper(false, false, mirror).command.facing).toBeUndefined();
  });
  it.each([false, true])('keeps the route behind an obstructed wall, mirror=%s', mirror => {
    expect(wrapper(true, false, mirror).command.facing).toBeUndefined();
  });
  it.each([false, true])('leaves an acquired unavailable target for the next threat in the hole, without claiming contact, mirror=%s', mirror => {
    // A lead blocks the first threat to show, not a man he sees on the ground.
    const r = wrapper(false, false, mirror, true);
    expect(r.target).not.toBe(r.original);
    expect(r.threat).toBe(true);
  });
  it('retains normal acquisition for an initially unassigned wrapper', () => {
    const sim = new PlaySim(structuredClone(inputs.rows.find((r: { id: string }) => r.id === 'K02').setup) as PlaySetup);
    const a = sim.offense.find(a => a.behavior instanceof RunBlocker && a.behavior.plan.pullRole === 'lead')!;
    const controller = a.behavior as RunBlocker;
    expect(controller.plan.target).toBeNull();
    sim.t = 2; controller.update(a, sim);
    expect(controller.plan.target).not.toBeNull();
  });
  it.each([false, true])('ignores private defender contact, mirror=%s', mirror => {
    expect(wrapper(false, true, mirror)).toEqual(wrapper(false, false, mirror));
  });
});
