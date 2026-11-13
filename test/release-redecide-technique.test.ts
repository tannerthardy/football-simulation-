import { describe, expect, it } from 'vitest';
import { contactFixture } from '../scripts/diag/run-contact-technique.js';

// RELEASE_REDECIDE: a player whose block ends in the engagement update decides
// again in that step. A dive or lunge that decision requests belongs to this
// step's intent, as an ordinary decision's does; it must not wait in the
// technique maps and execute on a later step the next decision no longer asks
// for. Constructed pipeline fixture (integration review on #410), not ordinary
// football frequency.
function released(kind: 'dive' | 'lunge') {
  const f = contactFixture({ type: 'run', runBlock: 60, passBlock: 60 });
  const { sim, blocker, defender } = f as any;
  // Far enough apart that the engagement update ends the block (separation).
  blocker.body.pos = { x: 37, y: blocker.pos.y };
  let freeCalls = 0;
  defender.behavior = { kind: 'idle', update: (a: any, s: any) => {
    if (!a.engagement && ++freeCalls === 1) {
      if (kind === 'dive') s.diveAt(a, { x: -1, y: 0 }); else s.lungeAt(a, { x: -0.2, y: 0 });
    }
    return { vel: { x: 0, y: 0 }, facing: a.facing };
  } };
  return { sim, defender, freeCalls: () => freeCalls };
}

describe('a released player\'s technique request executes in its own step only', () => {
  it.each(['dive', 'lunge'] as const)('%s requested by the redecision is in this step\'s intent and never re-runs', (kind) => {
    const { sim, defender, freeCalls } = released(kind);
    expect(defender.engagement).toBeTruthy();
    sim.tick();
    expect(defender.engagement).toBeNull();
    expect(freeCalls()).toBe(1);
    // Collected into this step's intent and cleared from the pending maps.
    expect(sim.intents[defender.idx][kind]).toBeDefined();
    expect((kind === 'dive' ? sim.dives : sim.lunges).has(defender)).toBe(false);
    sim.tick();
    expect(freeCalls()).toBe(2);
    // The next decision asks for nothing: no obsolete request executes.
    expect(sim.intents[defender.idx][kind]).toBeUndefined();
  });
});
