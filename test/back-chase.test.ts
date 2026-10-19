/** BACK_CHASE (experimental, off): an engaged first-level defender the ball
 * has gone away from pursues down the line a yard behind the ball instead of
 * holding his shoulder on the blocker. RUN_LATERAL (experimental, off): run-rep
 * lateral requests are bounded by the body's square lateral speed rather than
 * the pass-protection mirror trait. Requests only. */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { contactFixture } from '../scripts/diag/run-contact-technique.js';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

/** C vs DT_W, engaged; the QB holds the ball deep and the back is staged at
 * `lateral` yd from the defender with lateral speed `speed` (same sign). */
async function request(flags: Record<string, string>, opts: { lateral: number; speed: number; side?: number; technique?: string }) {
  for (const [k, v] of Object.entries({ BACK_CHASE: '0', RUN_LATERAL: '0', ...flags })) vi.stubEnv(k, v);
  vi.resetModules();
  const { updateEngagements } = await import('../src/sim/engagement.js');
  const f = contactFixture({ type: 'run', runBlock: 60, passBlock: 60, side: opts.side ?? 1 });
  const d = f.defender, back = f.sim.slot('RB')!;
  expect(d.runFit?.kind === 'interior' || d.runFit?.kind === 'edge').toBe(true);
  if (opts.technique) d.runFit = { ...d.runFit!, technique: opts.technique as never };
  d.recog = { read: 'run' } as never;
  f.engagement.nextMoveAt = Infinity;
  back.body.pos = { x: f.sim.los - 4, y: d.pos.y + opts.lateral };
  back.body.vel = { x: 0, y: opts.speed };
  // A new decision beat: the fixture's own acquisition already held an aim.
  f.sim.t = f.sim.world.time = f.sim.t + 1;
  for (let k = 0; k < 24; k++) f.sim.perception.record(f.sim.agents);
  const intents = f.sim.agents.map(a => ({ vel: { x: 0, y: 0 }, facing: a.facing }));
  updateEngagements(f.sim, intents);
  return intents[d.idx].vel.y;
}

describe('BACK_CHASE backside pursuit', () => {
  it.each([1, -1])('is off by default and pursues the ball once it has gone away, direction %s', async s => {
    const off = await request({}, { lateral: 3 * s, speed: 2.5 * s });
    const on = await request({ BACK_CHASE: '1' }, { lateral: 3 * s, speed: 2.5 * s });
    expect(on * s).toBeGreaterThan(off * s + .5);
  });

  it('does not chase a ball that has not passed him', async () => {
    const off = await request({}, { lateral: .5, speed: .4 });
    const on = await request({ BACK_CHASE: '1' }, { lateral: .5, speed: .4 });
    expect(on).toBeCloseTo(off, 12);
  });

  it('leaves a lag (cutback) duty on its landmark', async () => {
    const off = await request({}, { lateral: 3, speed: 2.5, technique: 'lag' });
    const on = await request({ BACK_CHASE: '1' }, { lateral: 3, speed: 2.5, technique: 'lag' });
    expect(on).toBeCloseTo(off, 12);
  });
});

describe('RUN_LATERAL run-rep lateral bound', () => {
  it('lets a far lateral aim request more than the mirror trait, never above square speed', async () => {
    const { traits } = await import('../src/sim/engagement.js');
    const f = contactFixture({ type: 'run', runBlock: 60, passBlock: 60, side: 1 });
    const cap = traits(f.defender, 'run').lateral, square = f.defender.profile.vmax * f.defender.profile.shuffle;
    const off = await request({ BACK_CHASE: '1' }, { lateral: 9, speed: 6 });
    const on = await request({ BACK_CHASE: '1', RUN_LATERAL: '1' }, { lateral: 9, speed: 6 });
    expect(Math.abs(off)).toBeLessThanOrEqual(cap + 1e-9);
    expect(Math.abs(on)).toBeGreaterThan(Math.abs(off));
    expect(Math.abs(on)).toBeLessThanOrEqual(Math.max(cap, square) + 1e-9);
  });
});
