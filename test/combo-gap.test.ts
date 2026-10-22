/** COMBO_GAP: an uncovered zone blocker doubles the man in the gap beside
 * him. Inside zone weak against an over front puts the weak tackle (a shade
 * in the play-side A gap) between the center and the uncovered guard, and
 * the weak end outside the tackle: the guard and center double the shade
 * instead of the guard joining the tackle on the end. */
import { afterEach, describe, expect, it, vi } from 'vitest';
// FRONT_ALIGN moves the front off its installed spots; this scene is staged on them.
vi.hoisted(() => { process.env.FRONT_ALIGN = '0'; });
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { RUN_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';

const offense = generateTeam(new Rng(11), 'O', 'O', { strength: .55 });
const defense = generateTeam(new Rng(12), 'D', 'D', { strength: .55 });
afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function plans(on: boolean) {
  vi.stubEnv('COMBO_GAP', on ? '1' : '0');
  vi.resetModules();
  const { PlaySim } = await import('../src/sim/playsim.js');
  const { RunBlocker } = await import('../src/sim/behaviors/blocking.js');
  const formation = FORMATION_BY_ID.ace_12;
  const sim = new PlaySim({ offense: pickOffense(offense, formation.personnel), defense: pickDefense(defense, 'base43'),
    offCall: { formation, flip: false, kind: 'run', run: RUN_BY_ID.iz_weak, label: 'iz' },
    defCall: { personnel: 'base43', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'Over' },
    los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 7 });
  const plan = (slot: string) => (sim.slot(slot)!.behavior as InstanceType<typeof RunBlocker>).plan;
  return { lg: plan('LG'), c: plan('C'), lt: plan('LT'), sim };
}

describe('COMBO_GAP', () => {
  it('the uncovered guard doubles the shade in the gap beside him, not the end outside his tackle', async () => {
    const on = await plans(true), off = await plans(false);
    // The front as described: the C's man is between C and LG; the LT's is outside the LT.
    const between = (y: number, a: number, b: number) => (y - a) * (y - b) < 0;
    expect(between(on.c.target!.pos.y, on.sim.slot('C')!.pos.y, on.sim.slot('LG')!.pos.y)).toBe(true);
    expect(between(on.lt.target!.pos.y, on.sim.slot('LT')!.pos.y, on.sim.slot('LG')!.pos.y)).toBe(false);
    expect(on.lg.kind).toBe('combo');
    expect(on.lg.target).toBe(on.c.target);
    expect(off.lg.kind).toBe('combo');
    expect(off.lg.target).toBe(off.lt.target);
  });
});
