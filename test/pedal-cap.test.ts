/** PEDAL_CAP (physical.ts; experimental, off): for DBs and linebackers the
 * backpedal is the slowest way to cover ground backward. The facing cap is
 * monotonic from forward to backpedal; side-on and forward are unchanged;
 * offensive players are unchanged; a pedaling corner tops out at the new cap. */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { newSupport } from '../src/physics/support.js';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function profiles(flag: string) {
  vi.resetModules(); vi.stubEnv('PEDAL_CAP', flag);
  const { Rng } = await import('../src/core/rng.js');
  const { generateTeam } = await import('../src/league/team.js');
  const { derivePhysical } = await import('../src/players/physical.js');
  const k = await import('../src/physics/kinematics.js');
  const { World } = await import('../src/physics/world.js');
  const roster = [1, 2, 3].flatMap(s => generateTeam(new Rng(s), 'P', 'PPP', { strength: .55 }).roster);
  return { roster: roster.map(p => ({ pos: p.position, prof: derivePhysical(p) })), k, World };
}

describe('PEDAL_CAP: the backpedal is the slowest way back for DBs and linebackers', () => {
  it('the facing cap falls monotonically from forward to backpedal; forward and side-on unchanged', async () => {
    const off = await profiles('0'), on = await profiles('1');
    let checked = 0;
    on.roster.forEach(({ pos, prof }, i) => {
      if (!['CB', 'S', 'LB'].includes(pos)) return;
      checked++;
      expect(prof.backpedal).toBeLessThan(prof.shuffle);
      expect(prof.shuffle).toBe(off.roster[i].prof.shuffle);
      let prev = Infinity;
      for (let d = 0; d <= 180; d += 5) {
        const f = on.k.directionalSpeedFactor(prof, d * Math.PI / 180);
        expect(f).toBeLessThanOrEqual(prev + 1e-12);
        prev = f;
        if (d <= 90) expect(f).toBeCloseTo(off.k.directionalSpeedFactor(off.roster[i].prof, d * Math.PI / 180), 12);
      }
    });
    expect(checked).toBeGreaterThan(20);
  });

  it('offensive players are unchanged', async () => {
    const off = await profiles('0'), on = await profiles('1');
    on.roster.forEach(({ pos, prof }, i) => {
      if (['CB', 'S', 'LB'].includes(pos)) return;
      expect(prof).toEqual(off.roster[i].prof);
    });
  });

  it('a pedaling corner tops out at the new cap, below his old pedal speed', async () => {
    const top = async (flag: string) => {
      const { roster, World } = await profiles(flag);
      const cb = roster.find(r => r.pos === 'CB')!.prof;
      const b = { pos: { x: 40, y: 26 }, vel: { x: 0, y: 0 }, facing: Math.PI, energy: 1, profile: cb, support: newSupport() };
      const world = new World([b as any]);
      for (let i = 0; i < 100; i++) world.step([{ vel: { x: cb.vmax, y: 0 }, facing: Math.PI }], 0.05);
      return { speed: b.vel.x, cap: cb.vmax * cb.backpedal, side: cb.vmax * cb.shuffle };
    };
    const off = await top('0'), on = await top('1');
    expect(on.speed).toBeGreaterThan(on.cap * 0.95);
    expect(on.speed).toBeLessThanOrEqual(on.cap * 1.01);
    expect(on.speed).toBeLessThan(on.side);
    expect(off.speed).toBeGreaterThan(on.speed + 1);
  });
});
