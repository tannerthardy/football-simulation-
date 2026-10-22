/** SHED_PURSUE (on; SHED_PURSUE=0 for comparison): once the runner a blocked
 * defender sees is past the line he works off the block toward the ball at
 * any range, and when the rep ends because the runner has passed him the same
 * blocker cannot re-latch him at once. Decisions and hand re-acquisition only. */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { contactFixture } from '../scripts/diag/run-contact-technique.js';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

/** C vs DT_W engaged a second after contact; the carrying QB is staged at `at`. */
async function staged(on: boolean, at: { x: number; y: number }) {
  vi.stubEnv('SHED_PURSUE', on ? '1' : '0');
  vi.resetModules();
  const { updateEngagements } = await import('../src/sim/engagement.js');
  const f = contactFixture({ type: 'run', runBlock: 60, passBlock: 60, side: 1 });
  f.defender.recog = { read: 'run' } as never;
  f.engagement.nextMoveAt = 0;
  f.sim.qb.body.pos = { ...at };
  f.sim.t = f.sim.world.time = f.sim.t + 1;
  for (let k = 0; k < 24; k++) f.sim.perception.record(f.sim.agents, f.sim.carrier?.idx ?? null);
  const intents = f.sim.agents.map(a => ({ vel: { x: 0, y: 0 }, facing: a.facing }));
  updateEngagements(f.sim, intents);
  return f;
}

describe('SHED_PURSUE', () => {
  it('lets the same blocker re-latch a passed defender at once only when off', async () => {
    for (const on of [false, true]) {
      const f = await staged(on, { x: f0los + 4, y: CENTER_Y + 5 });
      expect(f.defender.engagement).toBeFalsy();
      const again = f.sim.engage(f.blocker, f.defender, 'run', { x: 1, y: 0 });
      expect(!!again).toBe(!on);
    }
  });

  it('works off toward a runner past the line beyond close range, not before he crosses', async () => {
    const past = { x: f0los + 1.5, y: CENTER_Y + 6 }, behind = { x: f0los - 2, y: CENTER_Y + 6 };
    const off = await staged(false, past), on = await staged(true, past), early = await staged(true, behind);
    for (const f of [off, on, early]) expect(f.defender.engagement).toBeTruthy();
    expect(off.defender.tags.has('shed-attempt')).toBe(false);
    expect(on.defender.tags.has('shed-attempt')).toBe(true);
    expect(early.defender.tags.has('shed-attempt')).toBe(false);
  });
});

/** The fixture's line of scrimmage. */
const f0los = 40;
