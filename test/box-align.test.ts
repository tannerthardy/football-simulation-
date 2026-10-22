/** BOX_ALIGN (alignment.ts): in a zone call an unanswered detached inside
 * receiver gets the nearest off-ball backer at his apex, halfway to the next
 * receiver inside or the end of the line, 4.6 deep; a blitzing or mugged
 * backer stays; man calls already align on their men. Off: unchanged. */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { DEF_PERSONNEL, type DefSlot, type DefensivePlayCall } from '../src/playbook/types.js';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function align(on: boolean, coverage: string, extra: Partial<DefensivePlayCall> = {}, formation = 'gun_empty_11') {
  vi.stubEnv('BOX_ALIGN', on ? '1' : '0');
  vi.resetModules();
  const { alignDefense, alignOffense } = await import('../src/playbook/alignment.js');
  const { COVERAGE_BY_ID, FRONT_BY_ID } = await import('../src/playbook/defense.js');
  const { FORMATION_BY_ID } = await import('../src/playbook/formations.js');
  const off = alignOffense(FORMATION_BY_ID[formation], false, 40, CENTER_Y);
  const def = alignDefense({ personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID[coverage], pressure: null, label: 'box', ...extra },
    off, Object.keys(DEF_PERSONNEL.nickel) as DefSlot[]);
  const w2 = off.spots[off.numbering.W2!].pos, w = -off.strongSign;
  return { def, off, w2, w, apexY: (w2.y + off.coreEdge.W) / 2 };
}

describe('every detached inside receiver is answered', () => {
  it('empty, Cover 3: the weak #2 is unanswered off; on, a backer walks to his apex', async () => {
    const off = await align(false, 'cover3'), on = await align(true, 'cover3');
    // Over him (within 1.5 yd laterally) or at his apex (between him and the
    // end of the line), under 8 deep.
    const answering = (a: typeof on) => Object.values(a.def.spots).filter(sp => {
      const y = (sp!.pos.y - a.off.ballY) * a.w, y2 = (a.w2.y - a.off.ballY) * a.w, edge = (a.off.coreEdge.W - a.off.ballY) * a.w;
      return sp!.pos.x - 40 < 8 && (Math.abs(y - y2) < 1.5 || (sp!.pos.x - 40 > 1 && y > edge + .5 && y < y2 - 1.5));
    });
    expect(answering(off)).toHaveLength(0);
    const lb = Object.values(on.def.spots).find(sp => sp!.slot.startsWith('LB') && Math.abs(sp!.pos.y - on.apexY) < 1e-9)!;
    expect(lb).toBeDefined();
    expect(lb.pos.x - 40).toBeCloseTo(4.6, 9);
  });
  it('a blitzing backer does not walk out', async () => {
    const { PRESSURE_BY_ID } = await import('../src/playbook/defense.js');
    const on = await align(true, 'cover3', { pressure: PRESSURE_BY_ID.will_b });
    expect(on.def.spots.LB_W!.role.kind).toBe('blitz');
    expect(Math.abs(on.def.spots.LB_W!.pos.y - on.apexY)).toBeGreaterThan(1);
  });
  it('man calls are unchanged', async () => {
    const off = await align(false, 'cover1'), on = await align(true, 'cover1');
    for (const slot of Object.keys(off.def.spots) as DefSlot[]) expect(on.def.spots[slot]!.pos).toEqual(off.def.spots[slot]!.pos);
  });
  it('a 2x2 look with the slot already over-covered is unchanged', async () => {
    const off = await align(false, 'cover4', {}, 'gun_doubles_11'), on = await align(true, 'cover4', {}, 'gun_doubles_11');
    expect(on.def.spots.LB_M!.pos).toEqual(off.def.spots.LB_M!.pos);
  });
});
