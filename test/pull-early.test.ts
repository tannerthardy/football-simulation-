/** PULL_EARLY (run-fits.ts pullers): a backer keys the pull step itself, a
 * guard opening back and across from his stance, rather than waiting for a
 * yard of displacement. A lineman stepping across at his own depth (a zone
 * step) is not a pull. Off: the installed departed-lineman picture. */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { RUN_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import type { Perceived } from '../src/sim/perception.js';
import { PlaySim } from '../src/sim/playsim.js';

const offense = generateTeam(new Rng(31), 'O', 'O', { strength: .55 });
const defense = generateTeam(new Rng(32), 'D', 'D', { strength: .55 });

/** The backer's picture 0.3 s after the snap: one guard `back` yd behind his
 * stance, moving 2 yd/s across; everyone else home and still. */
function stage(back: number) {
  const sim = new PlaySim({ offense: pickOffense(offense, '11'), defense: pickDefense(defense, 'base43'),
    offCall: { formation: FORMATION_BY_ID.ace_11, flip: false, kind: 'run', run: RUN_BY_ID.power, label: 'Pull step' },
    defCall: { personnel: 'base43', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3,
      pressure: null, label: 'Over Cover 3' }, los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 3 });
  sim.t = .3;
  const guard = sim.slot('LG')!;
  const picture = new Map(sim.offense.map(o => {
    const pos = { ...sim.offAlign.spots[o.slot].pos }, vel = { x: 0, y: 0 };
    if (o === guard) { pos.x -= back; vel.y = 2; }
    return [o, { pos, vel, age: .2, carrying: null, stance: null, facing: 0, pose: 'up' } as Perceived] as const;
  }));
  const see = sim.see.bind(sim);
  sim.see = (observer, target, delay) => picture.get(target) ?? see(observer, target, delay);
  return { sim, guard, backer: sim.slot('LB_M')! };
}
async function read(enabled: boolean, back: number) {
  vi.stubEnv('PULL_EARLY', enabled ? '1' : '0'); vi.stubEnv('PULL_CUE', '0');
  vi.resetModules();
  const { pullers } = await import('../src/sim/run-fits.js');
  const { sim, guard, backer } = stage(back);
  return pullers(sim, backer).some(s => s.pos.x === sim.offAlign.spots[guard.slot].pos.x - back);
}
afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

describe('backers key the pull step', () => {
  it('off: a guard a third of a yard into his pull is not yet seen pulling', async () => {
    expect(await read(false, .3)).toBe(false);
  });
  it('on: the open-and-cross step is a pull', async () => {
    expect(await read(true, .3)).toBe(true);
  });
  it('on: stepping across at his own depth is not', async () => {
    expect(await read(true, 0)).toBe(false);
  });
});
