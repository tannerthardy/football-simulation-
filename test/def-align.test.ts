/** DEF_ALIGN (experimental, off): the secondary aligns by its job, as
 * tracked by PFF coverage assignment. Pure alignment from gun doubles:
 * corners over the #1s, safeties by role. Shade is outward from the #1
 * (negative = inside). Receivers stand as WR_ALIGN tracks them unless a case
 * needs the installed 18 yd split. */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CENTER_Y, HASH_LEFT_Y, HASH_RIGHT_Y } from '../src/core/field.js';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function align(flag: string, coverage: string, ballY = 26.65, wr = '1') {
  vi.stubEnv('DEF_ALIGN', flag);
  vi.stubEnv('WR_ALIGN', wr);
  vi.stubEnv('HALF_ALIGN', '0'); // engine-99 (Coverage, pinned test-only): these cases record DEF_ALIGN's fixed two-high safety width (13.8 apart, shading part way to the ball); HALF_ALIGN aligns a halves safety off the receivers on his side instead (on a detached #2's line, else halfway to #1). Coverage to re-record the two-high rows with it on
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
    const f = await align('0', 'cover4', 26.65, '0');
    expect(f.cs).toEqual({ depth: 6, shade: -0.8 });
    expect(f.fs.x - 40).toBe(12);
    expect(Math.abs(f.fs.y - f.ss.y)).toBeCloseTo(18, 6);
  });

  it('on: quarters corners 7.3 and outside; quarters safeties 12 deep, 13.3 apart', async () => {
    const f = await align('1', 'cover4');
    expect(f.cs).toEqual({ depth: 7.3, shade: 0.8 });
    expect(f.cw).toEqual({ depth: 7.3, shade: 0.8 });
    expect(f.fs.x - 40).toBe(12);
    expect(Math.abs(f.fs.y - f.ss.y)).toBeCloseTo(13.3, 6);
  });

  it('on: Cover 2 hard corners 4 yd and outside; halves safeties 14 deep, 13.8 apart', async () => {
    const f = await align('1', 'cover2');
    expect(f.cs).toEqual({ depth: 4, shade: 0.5 });
    expect(f.fs.x - 40).toBe(14);
    expect(Math.abs(f.fs.y - f.ss.y)).toBeCloseTo(13.8, 6);
  });

  it('on: Cover 3 corners 7.3 and outside; the middle safety stays in the middle on either hash', async () => {
    for (const ballY of [HASH_LEFT_Y, HASH_RIGHT_Y]) {
      const f = await align('1', 'cover3', ballY);
      expect(f.cs).toEqual({ depth: 7.3, shade: 0.8 });
      expect(f.fs.x - 40).toBeCloseTo(14.5, 9);
      expect(f.fs.y).toBeCloseTo(CENTER_Y, 9);
    }
  });

  it('on: two-high safeties hold the field, shading only part way to the ball', async () => {
    const mid = await align('1', 'cover2', CENTER_Y), hash = await align('1', 'cover2', HASH_LEFT_Y);
    const centre = (g: typeof mid) => (g.fs.y + g.ss.y) / 2;
    expect(centre(hash) - centre(mid)).toBeCloseTo(.36 * (HASH_LEFT_Y - CENTER_Y), 9);
  });

  it('on: a pressed man corner sits about head-up at 1.3 yd; the man-free safety 14.7 deep, shading to the ball', async () => {
    const f = await align('1', 'cover1', HASH_LEFT_Y);
    expect(f.cs).toEqual({ depth: 1.3, shade: 0.15 });
    expect(f.fs.x - 40).toBeCloseTo(14.7, 9);
    expect(f.fs.y - CENTER_Y).toBeCloseTo(.34 * (HASH_LEFT_Y - CENTER_Y), 9);
  });

  it('on: against a receiver near the sideline the corner takes the inside', async () => {
    const f = await align('1', 'cover4', 16);
    // The ball outside the left hash leaves the weak #1 within 9 yd of the near sideline.
    const near = [f.cs, f.cw].find(c => c.shade < 0)!;
    expect(near.shade).toBe(-0.2);
  });
});
