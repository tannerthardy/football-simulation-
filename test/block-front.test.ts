/** BLOCK_FRONT (experimental, off): a run block starts only with the blocker in
 * front of or beside the defender's chest. Hands that arrive on his back start
 * no rep (the bodies still collide in the World). Pass reps are unchanged. */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

/** C and DT_W at arm's length; the defender faces `facing`, the blocker is downfield-facing at his chest. */
async function attempt(flag: string, facing: number, type: 'run' | 'pass' = 'run') {
  vi.stubEnv('BLOCK_FRONT', flag);
  vi.resetModules();
  const { contactFixture } = await import('../scripts/diag/run-contact-technique.js');
  const f = contactFixture({ type, runBlock: 60, passBlock: 60, side: 1 });
  f.sim.disengage(f.engagement);
  f.blocker.body.pos = { x: 40, y: CENTER_Y };
  f.defender.body.pos = { x: 40.82, y: CENTER_Y };
  f.defender.body.vel = { x: 0, y: 0 };
  f.defender.body.facing = facing;
  f.blocker.shedBy.delete(f.defender);
  return f.sim.engage(f.blocker, f.defender, type, { x: 1, y: 0 });
}

describe('BLOCK_FRONT', () => {
  it('a defender facing the blocker is blocked with the flag on or off', async () => {
    for (const flag of ['0', '1']) expect(await attempt(flag, Math.PI)).toBeTruthy();
  });

  it('a defender turned away (blocker at his back) is not run-blocked only with the flag on', async () => {
    expect(await attempt('0', 0)).toBeTruthy();
    expect(await attempt('1', 0)).toBeFalsy();
  });

  it('beside his chest still counts as the front', async () => {
    expect(await attempt('1', Math.PI / 2)).toBeTruthy();
  });

  it('pass reps are unchanged', async () => {
    expect(await attempt('1', 0, 'pass')).toBeTruthy();
  });
});
