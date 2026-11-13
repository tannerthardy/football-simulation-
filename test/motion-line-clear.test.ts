/** An across motion crosses behind the line wherever it stands. With the
 * tracked stagger (OL_STAGGER, default on: tackles 0.98 yd off the ball, an
 * inline end 1.19) a slot at 1.2 yd ran into the tackle and stopped on his own
 * side. He steps back to clear the line's bodies, crosses and sets outside the
 * far inline end. */
import { describe, expect, it, vi } from 'vitest';
vi.hoisted(() => { process.env.MOTION = '1'; process.env.OL_SPLITS = '1'; process.env.OL_STAGGER = '1'; });
import { sceneSim } from '../src/lab/coverage-scene.js';

const LINE = ['LT', 'LG', 'C', 'RG', 'RT'];

describe('across motion on the tracked line', () => {
  it('crosses behind the staggered line and sets on the far side, clear of the line', () => {
    const sim = sceneSim({ formation: 'gun_doubles_11', coverage: 'cover4', motion: { slot: 'H', kind: 'across' } });
    const h = sim.slot('H')!;
    expect(Math.sign(h.pos.y - sim.ballY)).toBe(sim.offAlign.strongSign);
    expect(Math.hypot(h.vel.x, h.vel.y)).toBeLessThan(0.6);
    expect(Math.abs(h.pos.y - sim.ballY)).toBeLessThan(7);
    const front = sim.agents.filter(a => a.team === 'O' && (LINE.includes(a.slot) || sim.offAlign.spots[a.slot]?.inline));
    for (const a of front) expect(Math.hypot(a.pos.x - h.pos.x, a.pos.y - h.pos.y)).toBeGreaterThan(0.6);
    // Still a legal off-the-line receiver.
    expect(sim.los - h.pos.x).toBeGreaterThan(1.0);
  });
});
