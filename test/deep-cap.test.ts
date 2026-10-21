/** DEEP_CAP (experimental, off): the installed deep cap keeps his depth until
 * the runner he sees crosses the line, then pursues like everyone else. */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { RUN_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { PlaySim } from '../src/sim/playsim.js';

const offense = generateTeam(new Rng(41), 'Cap offense', 'CO', { strength: .55 });
const defense = generateTeam(new Rng(42), 'Cap defense', 'CD', { strength: .55 });
const LOS = 40;

async function load(flag: string, mesh = '0') {
  vi.stubEnv('DEEP_CAP', flag);
  vi.stubEnv('CAP_MESH', mesh);
  vi.resetModules();
  const fits = await import('../src/sim/run-fits.js');
  const common = await import('../src/sim/behaviors/common.js');
  const { PlaySim: Sim } = await import('../src/sim/playsim.js');
  return { fits, common, Sim: Sim as typeof PlaySim };
}

/** Cover 3 over: the free safety is the deep-middle alley player. Runner at
 * depth `rb` (negative: behind the line), running straight upfield. */
function scene(Sim: typeof PlaySim, rb: number, m: 1 | -1 = 1) {
  const formation = FORMATION_BY_ID.ace_12;
  const sim = new Sim({ offense: pickOffense(offense, formation.personnel), defense: pickDefense(defense, 'base43'),
    offCall: { formation, kind: 'run', flip: false, run: RUN_BY_ID.iz_strong, label: 'cap' },
    defCall: { personnel: 'base43', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'cap' },
    los: LOS, ballY: CENTER_Y, firstDownX: 50, seed: 9, record: false });
  const fs = sim.slot('FS')!, c = sim.slot('RB')!;
  sim.t = sim.world.time = 2.4; sim.handoffAt = 1;
  c.body.pos = { x: LOS + rb, y: CENTER_Y + m * 1 }; c.body.vel = { x: 6, y: 0 };
  fs.body.pos = { x: LOS + 13, y: CENTER_Y + m * .5 }; fs.body.vel = { x: 0, y: 0 };
  sim.ball = { kind: 'held', carrier: c } as never;
  for (let i = 0; i < 24; i++) sim.perception.record(sim.agents);
  return { sim, fs, c };
}

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

describe('DEEP_CAP run cap', () => {
  it('is off by default: the deep safety comes down to the alley landmark', async () => {
    const { fits, Sim } = await load('0');
    const { sim, fs } = scene(Sim, -2);
    expect(fits.isRunCap(fs, sim)).toBe(false);
    const cmd = fits.executeRunFit(fs, sim, 'B', 1);
    expect(cmd.vel.x).toBeLessThan(-2);
  });

  it('keeps installed depth while the runner is behind the line, on either side', async () => {
    const { fits, Sim } = await load('1');
    for (const m of [1, -1] as const) {
      const { sim, fs } = scene(Sim, -2, m);
      expect(fits.isRunCap(fs, sim)).toBe(true);
      const cmd = fits.executeRunFit(fs, sim, fs.runFit!.gap, fs.runFit!.side);
      // Not downhill: he stays at his installed depth.
      expect(Math.abs(cmd.vel.x)).toBeLessThan(.5);
    }
  });

  it('CAP_MESH: holds his depth through the mesh too; without it the mesh walks him down', async () => {
    for (const [mesh, down] of [['0', true], ['1', false]] as const) {
      const { fits, Sim } = await load('1', mesh);
      const { sim, fs } = scene(Sim, -2);
      // Before the exchange: the QB holds the ball and the back is the expected runner.
      sim.handoffAt = -1; sim.ball = { kind: 'held', carrier: sim.qb } as never;
      for (let i = 0; i < 24; i++) sim.perception.record(sim.agents);
      const cmd = fits.executeRunFit(fs, sim, fs.runFit!.gap, fs.runFit!.side);
      if (down) expect(cmd.vel.x).toBeLessThan(-2);
      else expect(Math.abs(cmd.vel.x)).toBeLessThan(.5);
    }
  });

  it('CAP_MESH: an empty back past the line at the mesh is not chased', async () => {
    const { fits, Sim } = await load('1', '1');
    const { sim, fs } = scene(Sim, 2);
    sim.handoffAt = -1; sim.ball = { kind: 'held', carrier: sim.qb } as never;
    for (let i = 0; i < 24; i++) sim.perception.record(sim.agents);
    const cmd = fits.executeRunFit(fs, sim, fs.runFit!.gap, fs.runFit!.side);
    expect(Math.abs(cmd.vel.x)).toBeLessThan(.5);
  });

  it('pursues with the ordinary chase once the runner he sees is past the line', async () => {
    const { fits, common, Sim } = await load('1');
    const { sim, fs, c } = scene(Sim, 2);
    const cmd = fits.executeRunFit(fs, sim, fs.runFit!.gap, fs.runFit!.side);
    expect(cmd).toEqual(common.chase(sim, fs, c));
  });
});
