/** SHED_HANDS (experimental, off): a defender working off a run block who has
 * won the hands (control < 0) gets off it; a blocker who controls the hands
 * keeps his man. Staged like test/shed-pursue.test.ts: C vs DT_W in a run rep,
 * the carrying QB past the line so the defender decides to work off. */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

const LOS = 40;

/** Two engagement updates: the first starts the shed attempt, the second may end the rep. */
async function staged(hands: string, control: number) {
  vi.stubEnv('SHED_PURSUE', '1');
  vi.stubEnv('SHED_HANDS', hands);
  vi.resetModules();
  const { updateEngagements } = await import('../src/sim/engagement.js');
  const { contactFixture } = await import('../scripts/diag/run-contact-technique.js');
  const f = contactFixture({ type: 'run', runBlock: 60, passBlock: 60, side: 1 });
  f.defender.recog = { read: 'run' } as never;
  f.engagement.nextMoveAt = 0;
  f.sim.qb.body.pos = { x: LOS + 1.5, y: CENTER_Y + 6 };
  f.sim.t = f.sim.world.time = f.sim.t + 1;
  const step = () => {
    for (let k = 0; k < 24; k++) f.sim.perception.record(f.sim.agents, f.sim.carrier?.idx ?? null);
    f.engagement.control = control;
    updateEngagements(f.sim, f.sim.agents.map(a => ({ vel: { x: 0, y: 0 }, facing: a.facing })));
  };
  step();
  const attempted = f.defender.tags.has('shed-attempt');
  f.sim.t = f.sim.world.time = f.sim.t + f.sim.dt;
  step();
  return { f, attempted, shed: f.sim.events.some(e => e.type === 'shed' && e.a === f.defender.idx) };
}

describe('SHED_HANDS', () => {
  it('off: winning the hands alone does not end the rep', async () => {
    const { f, attempted, shed } = await staged('0', -0.6);
    expect(attempted).toBe(true);
    expect(shed).toBe(false);
    expect(f.defender.engagement).toBeTruthy();
  });

  it('on: a defender working off with the hands won sheds the block', async () => {
    const { f, attempted, shed } = await staged('1', -0.6);
    expect(attempted).toBe(true);
    expect(shed).toBe(true);
    expect(f.defender.engagement).toBeFalsy();
    // The usual re-grab window: the same blocker cannot latch him at once.
    expect(f.sim.engage(f.blocker, f.defender, 'run', { x: 1, y: 0 })).toBeNull();
  });

  it('on: a blocker who controls the hands keeps his man', async () => {
    const { f, shed } = await staged('1', 0.4);
    expect(shed).toBe(false);
    expect(f.defender.engagement).toBeTruthy();
  });
});
