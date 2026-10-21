/** Team alignment habits (league/team.ts `alignStyle`): fixed per team, drawn
 * without touching roster generation, and applied only under the alignment
 * flags: receivers' room, zone corners' and deep safeties' depth. */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CENTER_Y, FIELD_WIDTH } from '../src/core/field.js';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function load(flag: string) {
  vi.stubEnv('WR_ALIGN', flag); vi.stubEnv('DEF_ALIGN', flag);
  vi.resetModules();
  const { alignDefense, alignOffense } = await import('../src/playbook/alignment.js');
  const { FORMATION_BY_ID } = await import('../src/playbook/formations.js');
  const { COVERAGE_BY_ID, FRONT_BY_ID } = await import('../src/playbook/defense.js');
  const { DEF_PERSONNEL } = await import('../src/playbook/types.js');
  return (style: { wrRoom?: number; cbDepth?: number; safetyDepth?: number }) => {
    const off = alignOffense(FORMATION_BY_ID.gun_doubles_11, false, 40, CENTER_Y, { style });
    const def = alignDefense({ personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: '' },
      off, Object.keys(DEF_PERSONNEL.nickel) as Parameters<typeof alignDefense>[2], {}, style);
    const z = off.spots.Z.pos.y;
    return { room: Math.min(z, FIELD_WIDTH - z), cb: def.spots.CB_S!.pos.x - 40, fs: def.spots.FS!.pos.x - 40 };
  };
}

describe('team alignment style', () => {
  it('is fixed per team and leaves roster generation untouched', async () => {
    const { Rng } = await import('../src/core/rng.js');
    const { alignStyle, generateTeam } = await import('../src/league/team.js');
    const a = new Rng(5), b = new Rng(5);
    const t1 = generateTeam(a, 'One', 'ONE'); alignStyle(t1);
    const u1 = generateTeam(b, 'One', 'ONE');
    expect(generateTeam(a, 'Two', 'TWO').roster.map(p => p.id)).toEqual(generateTeam(b, 'Two', 'TWO').roster.map(p => p.id));
    expect(alignStyle(t1)).toEqual(alignStyle(u1));
    expect(alignStyle({ id: 'ONE' })).not.toEqual(alignStyle({ id: 'TWO' }));
  });

  it('off: the installed spots ignore it', async () => {
    const f = await load('0');
    expect(f({ wrRoom: 1.5, cbDepth: -1.5, safetyDepth: 1 })).toEqual(f({}));
  });

  it('on: it moves the receiver, the zone corner and the deep safety by the habit', async () => {
    const f = await load('1');
    const base = f({}), habit = f({ wrRoom: 1.5, cbDepth: -1.5, safetyDepth: 1 });
    expect(habit.room - base.room).toBeCloseTo(1.5, 9);
    expect(habit.cb - base.cb).toBeCloseTo(-1.5, 9);
    expect(habit.fs - base.fs).toBeCloseTo(1, 9);
  });
});
