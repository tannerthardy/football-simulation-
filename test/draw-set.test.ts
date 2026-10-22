/** DRAW_SET (experimental, off; on in this branch's profile): on a draw the
 * linemen sell pass by setting on their men, so the defensive tackles are
 * engaged during the presentation instead of running free past linemen who
 * walk to a spot and block nobody. */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function presentation(on: boolean) {
  vi.stubEnv('DRAW_SET', on ? '1' : '0'); vi.resetModules();
  const { makeSim, rosters } = await import('../scripts/diag/zone-lab/lab.js');
  const R = rosters();
  let engaged = 0, freeDeep = 0;
  for (const seed of [77, 71001, 1, 2, 3]) for (const look of ['call1', 'call4', 'call7']) {
    const sim = makeSim({ concept: 'draw', dir: 'strong', formation: 'gun_doubles_11', look, roster: 'pair11', seed } as never, R);
    while (sim.phase === 'live' && sim.t < 0.9) sim.tick();
    for (const d of sim.defense) if (/^(DT|NT)/.test(d.slot)) {
      if (d.engagement) engaged++;
      else if (sim.los - d.pos.x > 1) freeDeep++;
    }
  }
  return { engaged, freeDeep };
}

describe('DRAW_SET', () => {
  it('the defensive tackles are engaged, not free behind the line, while the draw sells pass', async () => {
    const off = await presentation(false), on = await presentation(true);
    expect(on.engaged).toBeGreaterThan(off.engaged);
    expect(on.freeDeep).toBeLessThanOrEqual(off.freeDeep);
  }, 60000);
});
