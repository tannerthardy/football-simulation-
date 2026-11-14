/** MAN_SLOT (src/playbook/alignment.ts; experimental, off): the off-man defender on a detached #2 takes the slot's
 * depth by the situation (tracked p50: 3.1 yd on 1st down, 2.9 long, 2.5 medium, 2.4 short), not the corner's 6-yd
 * cushion; an attached end's man and the outside corners are unchanged. */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function depths(flag: string, down: number, dist: number) {
  vi.resetModules();
  vi.stubEnv('MAN_SLOT', flag);
  const { CENTER_Y } = await import('../src/core/field.js');
  const { Rng } = await import('../src/core/rng.js');
  const { generateTeam, pickDefense, pickOffense } = await import('../src/league/team.js');
  const { PASS_BY_ID } = await import('../src/playbook/concepts.js');
  const { COVERAGE_BY_ID, FRONT_BY_ID } = await import('../src/playbook/defense.js');
  const { FORMATION_BY_ID } = await import('../src/playbook/formations.js');
  const { PlaySim } = await import('../src/sim/playsim.js');
  const offense = generateTeam(new Rng(41), 'O', 'O', { strength: .55 }), defense = generateTeam(new Rng(42), 'D', 'D', { strength: .55 });
  const formation = FORMATION_BY_ID.gun_doubles_11;
  const sim: any = new PlaySim({ offense: pickOffense(offense, formation.personnel), defense: pickDefense(defense, 'nickel'),
    offCall: { formation, flip: false, kind: 'pass', pass: PASS_BY_ID.stick, label: 'x' },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover1_off, pressure: null, label: 'c' },
    los: 35, ballY: CENTER_Y, firstDownX: 35 + dist, down, seed: 1007 });
  const spot = (pred: (sp: any) => boolean) => {
    const sp: any = Object.values(sim.defAlign.spots).find((x: any) => x && pred(x));
    return sp ? sp.pos.x - sim.los : NaN;
  };
  const on = (ref: string) => (sp: any) => sp.manTarget === sim.offAlign.numbering[ref];
  return { slot: spot(on('W2')), end: spot(on('S2')), corner: spot(on('S1')) };
}

describe('MAN_SLOT', () => {
  it('the off-man defender on a detached slot plays the slot depth, tighter on short yardage', async () => {
    const off = await depths('0', 1, 10), first = await depths('1', 1, 10), short = await depths('1', 3, 2);
    expect(off.slot).toBeGreaterThan(4.5);
    expect(first.slot).toBeLessThan(3.6);
    expect(short.slot).toBeLessThan(first.slot);
    // The man on the attached end (gun doubles' Y) and the outside corner keep their depths.
    expect(first.end).toBeCloseTo(off.end, 6);
    expect(first.corner).toBeCloseTo(off.corner, 6);
  }, 60000);
});
