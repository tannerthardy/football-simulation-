// QB_V2 role resolver (QB lane with Flex, 2026-11-24): a coached role named to a man in his own picture, the same man
// before and after the snap, kept until he leaves the role's area by its exit margin.
import { describe, expect, it } from 'vitest';
import { RoleResolver, resolveRole, type PicturedMan, type RolePicture } from '../src/sim/qbv2/roles.js';

const m = (id: number, deep: number, out: number) => ({ id, x: 50 + deep, y: 26.65 + out, vx: 0, vy: 0 });
const pic = (defs: PicturedMan[], t = -1): RolePicture => ({
  defenders: defs, receivers: { S1: m(101, 0, 20), S2: m(102, 0, 9), W1: m(103, 0, -20) }, los: 50, dir: 1, ballY: 26.65, strong: 1, t,
});

describe('QB_V2 resolveRole', () => {
  it('names the widest corner, the deepest middle safety and the apex between #2 and the box', () => {
    const p = pic([m(1, 7, 21), m(2, 6, 15), m(3, 13, 1), m(4, 11, -10), m(5, 5, 5)]);
    expect(resolveRole(p, 'corner', 'S')?.id).toBe(1);
    expect(resolveRole(p, 'mofSafety')?.id).toBe(3);
    expect(resolveRole(p, 'apex', 'S')?.id).toBe(5);
    expect(resolveRole(pic([m(4, 11, -10)]), 'mofSafety')).toBeNull(); // two-high, nobody in the middle
  });

  it('finds the corner over a nub end inside 8 yd, by the defensive-back group (Flex)', () => {
    const p = pic([{ ...m(1, 6, 6), db: true }, { ...m(2, 2, 7), db: false }, { ...m(3, 12, 2), db: true }]);
    expect(resolveRole(p, 'corner', 'S')?.id).toBe(1); // a linebacker wider at 7 yd is not a defensive back
  });

  it('keeps the man it named while he stays within the exit margin, then lets go; a vacated flat is nobody', () => {
    const r = new RoleResolver();
    expect(r.resolve(pic([m(7, 2, 12), m(8, 3, 15)], 0.5), 'flat', 'S')?.id).toBe(7);
    // he sinks to 7 yd (past the flat's 6 yd, inside the 1.5 yd margin): still the flat defender
    expect(r.resolve(pic([m(7, 7, 12), m(8, 3, 15)], 0.8), 'flat', 'S')?.id).toBe(7);
    // he keeps sinking to 9 yd: the role re-resolves to the man now in the flat
    expect(r.resolve(pic([m(7, 9, 12), m(8, 3, 15)], 1.1), 'flat', 'S')?.id).toBe(8);
    expect(r.resolve(pic([m(7, 9, 12)], 1.2), 'flat', 'S')).toBeNull();
  });
});
