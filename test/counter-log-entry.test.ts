import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { describe, it, expect } from 'vitest';
import { RunBlocker, playSideSign } from '../src/sim/behaviors/blocking.js';
import { PlaySim, type PlaySetup } from '../src/sim/playsim.js';

const inputs = JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/puller-access-inputs.json.gz', import.meta.url))).toString());

/** Constructed pictures through the real update, not historical G10-P180.
 * The end's private body stays out of physical reach and contradicts the
 * delivered picture; no contact or future path is awarded by this fixture. */
function scene(mirror: boolean, depth: number, closing = false) {
  const setup = structuredClone(inputs.rows.find((r: { id: string }) => r.id === 'K03').setup) as PlaySetup;
  setup.offCall.flip = mirror;
  const sim = new PlaySim(setup);
  const a = sim.offense.find(p => p.behavior instanceof RunBlocker && p.behavior.plan.pullRole === 'kick')!;
  const c = a.behavior as RunBlocker, target = c.plan.target!, rb = sim.slot('RB')!;
  c.update(a, sim);
  sim.t = sim.world.time = 2;
  a.body.pos = { x: sim.los - 1.15, y: sim.ballY }; a.body.vel = { x: 0, y: 0 };
  a.body.facing = 0;
  target.body.pos = { x: sim.los + 6, y: sim.ballY + 10 };
  sim.ball = { kind: 'held', carrier: rb };
  Reflect.set(c, 'pullIdx', 2); Reflect.set(c, 'pullCleared', true);
  const side = playSideSign(sim, sim.offCall.run!), see = sim.see.bind(sim);
  sim.see = (observer, other, scale) => {
    const s = see(observer, other, scale);
    if (observer !== a) return s;
    if (other === target) return { ...s, pos: { x: a.pos.x + depth, y: a.pos.y - side * .5 },
      vel: { x: closing ? 3 : 0, y: 0 }, facing: 0, pose: 'up' };
    if (other === rb) return { ...s, pos: { x: a.pos.x - 1, y: a.pos.y }, vel: { x: 0, y: 0 }, carrying: true };
    return { ...s, pos: { x: sim.los + 10, y: 4 }, vel: { x: 0, y: 0 }, carrying: false };
  };
  return { sim, a, c, target };
}

describe('Counter log cue belongs to the puller entry surface', () => {
  it.each([false, true])('does not call a distant rear end a log or abandon him, flip=%s', mirror => {
    const { sim, a, c, target } = scene(mirror, -3, true);
    const before = structuredClone(a.body), rng = structuredClone(sim.rng);
    const command = c.update(a, sim);
    expect(c.plan.target).toBe(target); expect(c.plan.pullRole).toBe('kick');
    expect(a.tags.has('block-log')).toBe(false);
    expect(sim.events.some(e => e.type === 'block_log' || e.type === 'block_abandon')).toBe(false);
    expect(command.vel.x).toBeLessThan(0); // Still protects against the returning edge.
    expect(a.body).toEqual(before); expect(sim.rng).toEqual(rng); expect(sim.world.joints).toHaveLength(0);
  });

  it.each([false, true])('retains a real inside entry crossing, flip=%s', mirror => {
    const { sim, a, c, target } = scene(mirror, .65);
    c.update(a, sim);
    expect(c.plan.target).toBe(target); expect(a.tags.has('block-log')).toBe(true);
    expect(sim.events.find(e => e.type === 'block_log')?.b).toBe(target.idx);
  });

  it.each([false, true])('does not discard a penetrator still within the rear strike envelope, flip=%s', mirror => {
    const { sim, a, c } = scene(mirror, -.5, true);
    c.update(a, sim);
    expect(a.tags.has('block-log')).toBe(true);
  });
});
