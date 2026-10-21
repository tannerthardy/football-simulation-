/** MESH_POINT (src/sim/behaviors/qb.ts, src/sim/assign.ts): the shotgun
 * exchange as tracked. The offset back's spot is on his own side, in front
 * of the QB (inside 0.4 up / 0.7 over; stretch 0.6 up / 0.2 over), and the
 * ball is given when his body reaches it, not at the QB's arm's length. */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function exchange(flag: boolean, concept: 'iz' | 'oz') {
  vi.stubEnv('MESH_POINT', flag ? '1' : '0');
  vi.resetModules();
  const { makeSim, rosters } = await import('../scripts/diag/zone-lab/lab.js');
  const sim = makeSim({ concept, dir: 'strong', formation: 'gun_doubles_11', look: 'over3', roster: 'pair11', seed: 77 } as never, rosters());
  const rb = sim.slot('RB')!, qb = sim.qb, side = Math.sign(rb.pos.y - sim.ballY);
  while (sim.phase === 'live' && sim.carrier !== rb && sim.t < 2) sim.tick();
  return { t: sim.t, own: (rb.pos.y - qb.pos.y) * side, up: rb.pos.x - qb.pos.x, speed: Math.hypot(rb.vel.x, rb.vel.y) };
}

describe('MESH_POINT: the shotgun handoff is given at the mesh', () => {
  it('the back takes the ball in front of the QB on his own side, at speed', async () => {
    for (const concept of ['iz', 'oz'] as const) {
      const off = await exchange(false, concept), on = await exchange(true, concept);
      // On the spot: in front of the QB, on the back's own side, closer to
      // the QB's line than at arm's length, and at run tempo.
      expect(on.own).toBeLessThan(off.own);
      expect(on.own).toBeGreaterThan(0);
      expect(on.up).toBeGreaterThan(.2);
      expect(on.speed).toBeGreaterThan(off.speed + 1);
    }
  }, 60000);
});
