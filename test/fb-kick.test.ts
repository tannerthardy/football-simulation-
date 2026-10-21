/** FB_KICK (src/sim/behaviors/blocking.ts): the power fullback's kick-out
 * fits the end's inside shoulder and matches his motion, as the pulling
 * guard's kick does. Zone lab case power/strong/i_pro_21/over3/pair11/3:
 * approaching like a linebacker lead, the fullback hit the end running
 * upfield, carried past him, and the end slipped under into the backfield;
 * with the kick fit he still has the end, kicked wider, when the back
 * arrives. */
import { afterEach, describe, expect, it, vi } from 'vitest';
// These witnesses predate the under-center exchange package (UC_MESH
// MESH_TEMPO QB_CARRYOUT PACE_LEAD) and are timed on the installed exchange;
// pin it off here. test/run-game-flags.test.ts covers the package itself.
vi.hoisted(() => { for (const k of ['UC_MESH', 'MESH_TEMPO', 'QB_CARRYOUT', 'PACE_LEAD']) process.env[k] = '0'; });
// Recorded under the default gait, pull and gun-exchange laws. GAIT_STEP,
// PULL_STEP and MESH_POINT (on in the pinned profile) change its timing or
// first command; pin them off here. test/gait-step.test.ts and
// test/pull-step.test.ts cover those laws.
vi.hoisted(() => { for (const k of ['GAIT_STEP', 'PULL_STEP', 'MESH_POINT']) process.env[k] = '0'; });

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function at(flag: boolean, t: number) {
  vi.stubEnv('FB_KICK', flag ? '1' : '0');
  vi.resetModules();
  const { makeSim, rosters } = await import('../scripts/diag/zone-lab/lab.js');
  const sim = makeSim({ concept: 'power', dir: 'strong', formation: 'i_pro_21', look: 'over3', roster: 'pair11', seed: 3 } as never, rosters());
  const fb = sim.slot('F')!, end = sim.slot('DE_S')!;
  while (sim.phase === 'live' && sim.t < t) sim.tick();
  const ps = Math.sign(end.pos.y - sim.ballY);
  return { held: end.engagement?.blocker === fb, depth: end.pos.x - sim.los, inside: (fb.pos.y - end.pos.y) * ps };
}

describe('FB_KICK: the fullback kicks the end out from his inside shoulder', () => {
  it('keeps the end on the block instead of losing him into the backfield', async () => {
    const off = await at(false, 2.8), on = await at(true, 2.8);
    expect(off.held).toBe(false);
    expect(off.depth).toBeLessThan(-1.2);
    expect(on.held).toBe(true);
    expect(on.depth).toBeGreaterThan(-.6);
    expect(on.inside).toBeLessThan(0);
  }, 60000);
});
