import { afterEach, describe, expect, it, vi } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { RUN_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import type { Perceived } from '../src/sim/perception.js';
import { PlaySim } from '../src/sim/playsim.js';
import type { RunFitJob } from '../src/sim/run-fits.js';
import type { Engagement } from '../src/sim/agent.js';

const offense = generateTeam(new Rng(31), 'O', 'O', { strength: .55 });
const defense = generateTeam(new Rng(32), 'D', 'D', { strength: .55 });

/** Interpreted guard picture, not a replacement for the native cue-acquisition
 * panel. A departed guard has crossed behind the line; the back is deep. */
function stage(side: number, pulling = true, kind: RunFitJob['kind'] = 'insert', technique: RunFitJob['technique'] = 'attack') {
  const sim = new PlaySim({ offense: pickOffense(offense, '11'), defense: pickDefense(defense, 'base43'),
    offCall: { formation: FORMATION_BY_ID.ace_11, flip: false, kind: 'run', run: RUN_BY_ID.power, label: 'Guard picture' },
    defCall: { personnel: 'base43', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3,
      pressure: null, label: 'Over Cover 3' }, los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 3 });
  const a = sim.slot('LB_M')!;
  sim.t = 1;
  a.runFit = { gap: 'A', side, kind, technique, edge: 'box', pace: 'stack' };
  a.body.pos = { x: 44, y: CENTER_Y - side * .4 };
  a.body.vel = { x: -1, y: -side * .5 };
  Object.defineProperty(a.mind, 'placementError', { get: () => 0 });
  const guard = sim.offense.find(o => ['LG', 'RG'].includes(o.slot)
    && (sim.offAlign.spots[o.slot].pos.y - CENTER_Y) * side < 0)!;
  const picture = new Map(sim.offense.map(o => {
    const pos = { ...sim.offAlign.spots[o.slot].pos };
    const vel = { x: 0, y: 0 };
    // The pulling guard has dropped 0.65 yd behind his stance (to 38.8 from
    // the installed 0.55 yd line; OL_STAGGER stands him deeper).
    if (o === guard && pulling) { pos.x = 38.8 - (40 - .55 - pos.x); pos.y = CENTER_Y + side * .3; vel.y = side * 2; }
    if (o.slot === 'RB') { pos.x = 36; pos.y = CENTER_Y; }
    return [o, { pos, vel, age: .2, carrying: null, stance: null, facing: 0, pose: 'up' } as Perceived] as const;
  }));
  const see = sim.see.bind(sim);
  sim.see = (observer, target, delay) => picture.get(target) ?? see(observer, target, delay);
  return { sim, a, guard, picture };
}

async function controller(enabled: boolean) {
  vi.stubEnv('PULL_PLAN', enabled ? '1' : '0');
  vi.stubEnv('LB_PLAN', '1'); vi.stubEnv('PULL_READ', '1');
  vi.resetModules();
  const { executeRunFit } = await import('../src/sim/run-fits.js');
  const { movementObjective } = await import('../src/sim/movement-objective.js');
  return (...args: Parameters<typeof executeRunFit>) => {
    const command = executeRunFit(...args);
    // Each flag arm reloads the modules, so its private Symbol has a distinct
    // identity. Compare every physical field AND the full consumed own goal;
    // do not drop the metadata or change production symbol ownership.
    const keys = Object.getOwnPropertySymbols(command);
    expect(keys).toHaveLength(1);
    expect(keys[0].description).toBe('own movement objective');
    const goal = movementObjective(command);
    expect(goal).toBeDefined();
    expect(Reflect.get(command, keys[0])).toEqual(goal);
    const comparable = { ...command, movementObjective: goal };
    Reflect.deleteProperty(comparable, keys[0]);
    return comparable;
  };
}

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

describe('observed pull activates existing insertion planner', () => {
  it.each([-1, 1])('requests achievable lateral work without changing targets or bodies, side=%s', async side => {
    const off = stage(side), on = stage(side);
    const before = structuredClone(on.a.body), job = structuredClone(on.a.runFit);
    const old = (await controller(false))(off.a, off.sim, 'A', side);
    const next = (await controller(true))(on.a, on.sim, 'A', side);
    expect(on.a.tags.has('fit-pull-read')).toBe(true);
    expect(next.vel.y * side).toBeGreaterThan(old.vel.y * side);
    expect(Math.abs(next.vel.y)).toBeLessThanOrEqual(on.a.profile.vmax);
    expect(next.vel.x).toEqual(old.vel.x);
    expect(Reflect.get(on.a.mind, 'aims')).toEqual(Reflect.get(off.a.mind, 'aims'));
    expect(on.a.runFit).toEqual(job); expect(on.a.body).toEqual(before);
  });

  it.each([-1, 1])('does not amplify a still-held target away from a new pull, side=%s', async side => {
    const off = stage(side), on = stage(side);
    for (const { a } of [off, on]) a.mind.aim('run-fit', { x: 41.5, y: a.pos.y - side }, 1);
    const old = (await controller(false))(off.a, off.sim, 'A', side);
    const next = (await controller(true))(on.a, on.sim, 'A', side);
    expect(on.a.tags.has('fit-pull-read')).toBe(true);
    expect(next).toEqual(old);
  });

  it.each(['edge', 'force', 'cutback'] as const)('does not activate a new planner for %s responsibility', async kind => {
    const off = stage(1, true, kind), on = stage(1, true, kind);
    expect((await controller(true))(on.a, on.sim, 'A', 1))
      .toEqual((await controller(false))(off.a, off.sim, 'A', 1));
  });

  it('preserves lag and a stationary guard picture', async () => {
    for (const [pulling, technique] of [[true, 'lag'], [false, 'attack']] as const) {
      const off = stage(1, pulling, 'insert', technique), on = stage(1, pulling, 'insert', technique);
      expect((await controller(true))(on.a, on.sim, 'A', 1))
        .toEqual((await controller(false))(off.a, off.sim, 'A', 1));
    }
  });
});

describe('observed pull cue does not reveal the guard’s hidden engagement', () => {
  it.each([-1, 1])('retains the same acquired pull after contact, side=%s', async side => {
    vi.stubEnv('PULL_CUE', '1'); vi.resetModules();
    const { pullers } = await import('../src/sim/run-fits.js');
    const free = stage(side), engaged = stage(side);
    engaged.guard.engagement = { blocker: engaged.guard, defender: engaged.sim.slot('DE_S')! } as Engagement;
    const before = structuredClone(engaged.a.body);
    expect(pullers(engaged.sim, engaged.a)).toEqual(pullers(free.sim, free.a));
    expect(pullers(engaged.sim, engaged.a)).toContainEqual(engaged.picture.get(engaged.guard));
    expect(engaged.a.body).toEqual(before);
  });

  it.each([-1, 1])('does not invent a pull from a still surface or a stopped guard, side=%s', async side => {
    vi.stubEnv('PULL_CUE', '1'); vi.resetModules();
    const { pullers } = await import('../src/sim/run-fits.js');
    const surface = stage(side, false), stopped = stage(side);
    stopped.picture.get(stopped.guard)!.vel.y = 0;
    expect(pullers(surface.sim, surface.a)).toEqual([]);
    expect(pullers(stopped.sim, stopped.a)).toEqual([]);
  });
});
