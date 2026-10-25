import { describe, expect, it } from 'vitest';
import type { Agent } from '../src/sim/agent.js';
import type { Perceived } from '../src/sim/perception.js';
import type { PlaySim } from '../src/sim/playsim.js';
import { qbRunning } from '../src/sim/possession-read.js';

// qbRunning answers only from the observer's delayed pictures; these scenes
// give it those pictures directly. Field: offense attacks +x, LOS at x=50,
// tackles pictured at y=24 and y=29.67.
type Picture = Pick<Perceived, 'pos' | 'vel' | 'carrying'>;
function scene() {
  const qb = { slot: 'QB' } as Agent, lt = { slot: 'LT' } as Agent, rt = { slot: 'RT' } as Agent;
  const defender = { slot: 'DE_L' } as Agent;
  let picture: Picture = { pos: { x: 43, y: 26.67 }, vel: { x: 0, y: 0 }, carrying: true };
  const sim = {
    t: 0, qb,
    slot: (name: string) => (name === 'LT' ? lt : name === 'RT' ? rt : undefined),
    see: (_: Agent, target: Agent) => ({
      stance: null, facing: 0, age: 0.2,
      ...(target === qb ? picture : { pos: { x: 49, y: target === lt ? 24 : 29.67 }, vel: { x: 0, y: 0 }, carrying: false }),
    }),
  } as unknown as PlaySim;
  return {
    sim, defender,
    show(p: Partial<Picture>, t = sim.t) { picture = { ...picture, ...p }; (sim as { t: number }).t = t; return qbRunning(defender, sim); },
  };
}

describe('qbRunning: a scramble from what a defender can see', () => {
  it('sees a QB breaking the pocket toward the line', () => {
    const s = scene();
    expect(s.show({ vel: { x: 1.5, y: 0 } }, 2.0)).toBe(false);
    expect(s.show({ vel: { x: 3.2, y: 0.5 } }, 2.1)).toBe(true);
  });

  it('does not treat a sideways rollout as a scramble until he turns upfield', () => {
    const s = scene();
    expect(s.show({ pos: { x: 43, y: 33 }, vel: { x: 0.3, y: 2 } }, 2.0)).toBe(false);
    expect(s.show({ pos: { x: 43.2, y: 34 }, vel: { x: 0.6, y: 2 } }, 2.3)).toBe(false);
    // Outside the box and now moving downfield: the visible cue.
    expect(s.show({ pos: { x: 43.5, y: 34.5 }, vel: { x: 1.6, y: 1.5 } }, 2.6)).toBe(true);
  });

  it('does not convert on a QB stepping up inside the pocket', () => {
    const s = scene();
    expect(s.show({ pos: { x: 44, y: 27 }, vel: { x: 2.0, y: 0.3 } }, 2.0)).toBe(false);
    expect(s.show({ pos: { x: 45, y: 27.5 }, vel: { x: 2.4, y: 0 } }, 2.4)).toBe(false);
  });

  it('holds through a stutter and releases when the QB resets to throw', () => {
    const s = scene();
    expect(s.show({ vel: { x: 3.5, y: 0 } }, 2.0)).toBe(true);
    expect(s.show({ vel: { x: 0.2, y: 1 } }, 2.1)).toBe(true);   // Settling starts.
    expect(s.show({ vel: { x: 1.0, y: 1 } }, 2.25)).toBe(true);  // Moving again: timer restarts.
    expect(s.show({ vel: { x: 0.1, y: 0 } }, 2.3)).toBe(true);
    expect(s.show({ vel: { x: 0.1, y: 0 } }, 2.55)).toBe(true);
    expect(s.show({ vel: { x: 0.1, y: 0 } }, 2.6)).toBe(false);  // Settled 0.3 s: reset.
    expect(s.show({ vel: { x: 1.5, y: 0 } }, 2.7)).toBe(false);  // A new cue is needed.
  });

  it('ignores a pump fake and lets go once the ball has left his hands', () => {
    const s = scene();
    expect(s.show({ vel: { x: 0.4, y: 0 } }, 2.0)).toBe(false);
    expect(s.show({ vel: { x: 3, y: 0 } }, 2.4)).toBe(true);
    expect(s.show({ vel: { x: 3, y: 0 }, carrying: false }, 2.5)).toBe(false);
  });

  it('keeps the latch through an unknown picture but never starts on one', () => {
    const s = scene();
    expect(s.show({ vel: { x: 4, y: 0 }, carrying: null }, 2.0)).toBe(false);
    expect(s.show({ vel: { x: 4, y: 0 }, carrying: true }, 2.1)).toBe(true);
    expect(s.show({ vel: { x: 0, y: 0 }, carrying: null }, 3.0)).toBe(true);
  });
});
