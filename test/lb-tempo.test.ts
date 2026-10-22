/** LB_TEMPO (run-fits.ts executeRunFit, insert fits): until the runner
 * declares, a box backer goes to his landmark at the pace that puts him there
 * when the back he sees reaches the line, net of his reaction; a back at the
 * line leaves him the installed pace. Off: the installed pace, same landmark. */
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
afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

/** Before the handoff, the Mike 5 yd off the ball; the back at `backX` coming
 * downhill at 4 yd/s, straight at his gap. Returns the fit's landmark depth
 * past the line and the downhill speed he asks for. */
async function fit(enabled: boolean, backX: number) {
  vi.stubEnv('LB_TEMPO', enabled ? '1' : '0');
  vi.resetModules();
  const { executeRunFit } = await import('../src/sim/run-fits.js');
  const { movementObjective } = await import('../src/sim/movement-objective.js');
  const sim = new PlaySim({ offense: pickOffense(offense, '11'), defense: pickDefense(defense, 'base43'),
    offCall: { formation: FORMATION_BY_ID.ace_11, flip: false, kind: 'run', run: RUN_BY_ID.iz_strong, label: 'Tempo' },
    defCall: { personnel: 'base43', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'Over' },
    los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 3 });
  sim.t = .8;
  const a = sim.slot('LB_M')!, back = sim.slot('RB')!;
  a.runFit = { gap: 'A', side: 1, kind: 'insert', technique: 'attack', edge: 'box', pace: 'stack' };
  a.body.pos = { x: 45, y: CENTER_Y + .5 }; a.body.vel = { x: 0, y: 0 };
  Object.defineProperty(a.mind, 'placementError', { get: () => 0 });
  const picture = new Map([
    [sim.qb, { pos: { x: 38.6, y: CENTER_Y }, vel: { x: 0, y: 0 }, carrying: true, age: .2, stance: null, facing: 0, pose: 'up' } as Perceived],
    [back, { pos: { x: backX, y: CENTER_Y + .5 }, vel: { x: 4, y: 0 }, carrying: false, age: .2, stance: null, facing: 0, pose: 'up' } as Perceived],
  ]);
  const see = sim.see.bind(sim);
  sim.see = (observer, target, delay) => picture.get(target) ?? see(observer, target, delay);
  const command = executeRunFit(a, sim, 'A', 1);
  return { depth: movementObjective(command)!.point.x - sim.los, downhill: -command.vel.x };
}

describe('a box backer fits at the back\'s tempo', () => {
  it('on: the same surface landmark', async () => {
    expect((await fit(true, 34)).depth).toBeCloseTo((await fit(false, 34)).depth, 9);
  });
  it('on: with the back deep in the backfield he comes down at the pace that meets him', async () => {
    const off = await fit(false, 34), on = await fit(true, 34);
    expect(on.downhill).toBeGreaterThan(.5);
    expect(on.downhill).toBeLessThan(off.downhill / 2);
  });
  it('on: with the back arriving he comes at the installed pace', async () => {
    expect((await fit(true, 39.5)).downhill).toBeCloseTo((await fit(false, 39.5)).downhill, 9);
  });
});
