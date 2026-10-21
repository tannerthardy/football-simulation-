/** RB_AWAY (src/sim/assign.ts alignBackAway, called before the defense
 * aligns): on a shotgun zone call the offset back lines up away from the run
 * and takes the ball crossing the QB's face. Other calls keep the formation. */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function snap(away: boolean, concept: string, dir: 'strong' | 'weak', formation = 'gun_doubles_11') {
  vi.stubEnv('RB_AWAY', away ? '1' : '0');
  vi.resetModules();
  const { makeSim, rosters } = await import('../scripts/diag/zone-lab/lab.js');
  const { playSideSign } = await import('../src/sim/behaviors/blocking.js');
  const sim = makeSim({ concept, dir, formation, look: 'over3', roster: 'pair11', seed: 77 } as never, rosters());
  const ps = sim.offCall.run ? playSideSign(sim, sim.offCall.run) : 1;
  const rb = sim.slot('RB')!, side = (rb.pos.y - sim.ballY) * ps;
  let handoff: number | null = null;
  while (sim.phase === 'live' && sim.t < 2 && handoff === null) {
    sim.tick();
    if (sim.carrier === rb) handoff = rb.vel.y * ps;
  }
  return { side, handoff, spot: sim.offAlign.spots.RB!.pos.y - sim.ballY };
}

describe('RB_AWAY: the shotgun back aligns away from a zone run', () => {
  it.each(['oz', 'wz', 'iz'])('%s toward the back: he moves across and takes it going play side', async concept => {
    const off = await snap(false, concept, 'weak'), on = await snap(true, concept, 'weak');
    expect(off.side).toBeGreaterThan(1);
    expect(on.side).toBeLessThan(-1);
    expect(on.spot).toBeCloseTo(-off.spot, 9);
    expect(on.handoff!).toBeGreaterThan(0);
    if (concept !== 'iz') expect(off.handoff!).toBeLessThan(0);
  }, 60000);

  it('keeps a back already away from the run, and gap runs, where they were', async () => {
    for (const [concept, dir] of [['oz', 'strong'], ['iz', 'strong']] as const) {
      const off = await snap(false, concept, dir), on = await snap(true, concept, dir);
      expect(on.spot).toBe(off.spot);
      expect(on.side).toBeLessThan(0);
    }
  }, 60000);
});
