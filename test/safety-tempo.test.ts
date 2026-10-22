/** SAFETY_TEMPO (run-fits.ts executeRunFit, the alley fit): until the back
 * declares, an alley safety eases down about a yard from his alignment
 * instead of coming to 5-8 yd, so he is still the last level over the ball.
 * Off: the installed 65% of his alignment depth. */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { RUN_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import type { Perceived } from '../src/sim/perception.js';
import { PlaySim } from '../src/sim/playsim.js';

const offense = generateTeam(new Rng(81), 'O', 'O', { strength: .55 });
const defense = generateTeam(new Rng(82), 'D', 'D', { strength: .55 });
afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

/** Before the handoff, the free safety at his alignment spot, the back deep
 * in the backfield. Returns the downhill speed his alley fit asks for. */
async function downhill(enabled: boolean) {
  vi.stubEnv('SAFETY_TEMPO', enabled ? '1' : '0');
  vi.resetModules();
  const { executeRunFit } = await import('../src/sim/run-fits.js');
  const sim = new PlaySim({ offense: pickOffense(offense, '11'), defense: pickDefense(defense, 'base43'),
    offCall: { formation: FORMATION_BY_ID.ace_11, flip: false, kind: 'run', run: RUN_BY_ID.iz_strong, label: 'Tempo' },
    defCall: { personnel: 'base43', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'Over' },
    los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 3 });
  sim.t = .8;
  const a = sim.slot('FS')!, back = sim.slot('RB')!;
  a.runFit = { gap: 'B', side: 1, kind: 'alley', technique: 'control', edge: 'box', pace: 'stack' };
  const home = sim.defAlign.spots.FS!.pos;
  a.body.pos = { x: Math.max(home.x, sim.los + 12), y: home.y }; a.body.vel = { x: 0, y: 0 };
  sim.defAlign.spots.FS!.pos = { ...a.body.pos };
  Object.defineProperty(a.mind, 'placementError', { get: () => 0 });
  const picture = new Map([
    [sim.qb, { pos: { x: 38.6, y: CENTER_Y }, vel: { x: 0, y: 0 }, carrying: true, age: .2, stance: null, facing: 0, pose: 'up' } as Perceived],
    [back, { pos: { x: 34, y: CENTER_Y + .5 }, vel: { x: 2, y: 0 }, carrying: false, age: .2, stance: null, facing: 0, pose: 'up' } as Perceived],
  ]);
  const see = sim.see.bind(sim);
  sim.see = (observer, target, delay) => picture.get(target) ?? see(observer, target, delay);
  return executeRunFit(a, sim, 'B', 1).vel.x * sim.attackDir('D');
}

describe('an alley safety stays the last level until the back declares', () => {
  it('off: from 12 yd he comes down hard toward 8', async () => {
    expect(await downhill(false)).toBeGreaterThan(1.5);
  });
  it('on: he eases down instead', async () => {
    const on = await downhill(true), off = await downhill(false);
    expect(on).toBeLessThan(off / 2);
  });
});
