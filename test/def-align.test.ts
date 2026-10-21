/** DEF_ALIGN (experimental, off): the secondary aligns as tracked. Pure
 * alignment from gun doubles at midfield: corners over the #1s, safeties by
 * shell. Measured shade is outward from the #1 (negative = inside). */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function align(flag: string, coverage: string, ballY = 26.65) {
  vi.stubEnv('DEF_ALIGN', flag);
  vi.resetModules();
  const { alignOffense, alignDefense } = await import('../src/playbook/alignment.js');
  const { FORMATION_BY_ID } = await import('../src/playbook/formations.js');
  const { COVERAGE_BY_ID, FRONT_BY_ID } = await import('../src/playbook/defense.js');
  const { DEF_PERSONNEL } = await import('../src/playbook/types.js');
  const off = alignOffense(FORMATION_BY_ID.gun_doubles_11, false, 40, ballY);
  const present = Object.keys(DEF_PERSONNEL.nickel) as Parameters<typeof alignDefense>[2];
  const def = alignDefense({ personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID[coverage], pressure: null, label: '' }, off, present);
  const corner = (slot: 'CB_S' | 'CB_W', ref: 'S1' | 'W1') => {
    const r = off.spots[off.numbering[ref]!].pos, c = def.spots[slot]!.pos;
    return { depth: +(c.x - 40).toFixed(2), shade: +((c.y - r.y) * Math.sign(r.y - ballY)).toFixed(2) };
  };
  return { cs: corner('CB_S', 'S1'), cw: corner('CB_W', 'W1'), fs: def.spots.FS!.pos, ss: def.spots.SS!.pos };
}

describe('DEF_ALIGN', () => {
  it('off: installed spots (two-high corners 6 yd and inside, safeties 12 yd and 18 apart)', async () => {
    const f = await align('0', 'cover4');
    expect(f.cs).toEqual({ depth: 6, shade: -0.8 });
    expect(f.fs.x - 40).toBe(12);
    expect(Math.abs(f.fs.y - f.ss.y)).toBeCloseTo(18, 6);
  });

  it('on: off zone corners give 7 yd and align outside; two-high safeties 13 yd, 13 apart', async () => {
    const f = await align('1', 'cover4');
    expect(f.cs).toEqual({ depth: 7, shade: 0.7 });
    expect(f.cw).toEqual({ depth: 7, shade: 0.7 });
    expect(f.fs.x - 40).toBe(13);
    expect(Math.abs(f.fs.y - f.ss.y)).toBeCloseTo(13, 6);
  });

  it('on: a pressed man corner sits about head-up at 1.3 yd; the single-high safety at 14', async () => {
    const f = await align('1', 'cover1');
    expect(f.cs).toEqual({ depth: 1.3, shade: 0.15 });
    expect(f.fs.x - 40).toBe(14);
  });

  it('on: against a receiver near the sideline the corner takes the inside', async () => {
    const f = await align('1', 'cover4', 16);
    // The ball on the left hash puts the weak #1 within 8 yd of the near sideline.
    const near = [f.cs, f.cw].find(c => c.shade < 0)!;
    expect(near.shade).toBe(-0.6);
  });
});
