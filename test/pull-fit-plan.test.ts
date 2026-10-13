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
    if (o === guard && pulling) { pos.x = 38.8; pos.y = CENTER_Y + side * .3; vel.y = side * 2; }
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
  return (await import('../src/sim/run-fits.js')).executeRunFit;
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

describe('acquired pull hands insertion to an observed carrying runner', () => {
  async function handover(enabled: boolean) {
    vi.stubEnv('PULL_HANDOVER', enabled ? '1' : '0');
    vi.stubEnv('PULL_PLAN', '0'); vi.stubEnv('PULL_READ', '1'); vi.stubEnv('PULL_CUE', '1');
    vi.resetModules();
    return (await import('../src/sim/run-fits.js')).executeRunFit;
  }

  function runnerCue(f: ReturnType<typeof stage>, side: number, carrying: boolean | null = true) {
    const back = f.sim.slot('RB')!;
    f.sim.ball = { kind: 'held', carrier: back }; f.sim.handoffAt = .9;
    Object.assign(f.picture.get(back)!, { pos: { x: 37.3, y: CENTER_Y + side * 3.2 },
      vel: { x: 3, y: side * .4 }, carrying });
    // The guard has moved beyond the old reach gate. No current pull can
    // supply the target, while the personally acquired earlier read remains.
    f.picture.get(f.guard)!.pos.y = CENTER_Y + side * 9;
  }

  it.each([-1, 1])('keeps the slow runner target instead of falling back to the down-block gap, side=%s', async side => {
    const on = stage(side), off = stage(side);
    const next = await handover(true), old = await handover(false);
    expect(next(on.a, on.sim, 'A', side)).toEqual(old(off.a, off.sim, 'A', side));
    runnerCue(on, side); runnerCue(off, side);
    on.sim.t += .01; off.sim.t += .01;
    // A new cue cannot replace the action already being executed.
    expect(next(on.a, on.sim, 'A', side)).toEqual(old(off.a, off.sim, 'A', side));
    on.sim.t += on.a.mind.decisionInterval + .01; off.sim.t = on.sim.t;
    const before = structuredClone(on.sim.agents.map(a => a.body));
    const rngBefore = structuredClone(on.sim.rng);
    const aim = vi.spyOn(on.a.mind, 'aim');
    const candidate = next(on.a, on.sim, 'A', side), baseline = old(off.a, off.sim, 'A', side);
    const seen = on.picture.get(on.sim.slot('RB')!)!;
    expect(aim.mock.calls.at(-1)![1].y).toBeCloseTo(seen.pos.y + seen.vel.y * 2 * on.a.mind.decisionInterval - side, 12);
    expect(candidate.vel.y * side).toBeGreaterThan(baseline.vel.y * side);
    // A wider target shares the existing speed bound with insertion; the
    // depth landmark stays at the surface, rather than chasing the deep back.
    expect(aim.mock.calls.at(-1)![1].x).toBe(on.sim.los + 1.5);
    expect(candidate.vel.x).toBeLessThan(0);
    expect(Math.hypot(candidate.vel.x, candidate.vel.y)).toBeLessThanOrEqual(on.a.profile.vmax);
    expect(on.a.tags.has('fit-pull-runner-cue')).toBe(true);
    expect(on.sim.agents.map(a => a.body)).toEqual(before);
    expect(on.sim.rng).toEqual(rngBefore);
  });

  it.each(['edge', 'force', 'cutback'] as const)('preserves the %s responsibility', async kind => {
    const on = stage(1, true, kind), off = stage(1, true, kind);
    const next = await handover(true), old = await handover(false);
    next(on.a, on.sim, 'A', 1); old(off.a, off.sim, 'A', 1);
    runnerCue(on, 1); runnerCue(off, 1);
    on.sim.t += 1; off.sim.t += 1;
    expect(next(on.a, on.sim, 'A', 1)).toEqual(old(off.a, off.sim, 'A', 1));
  });

  it('preserves lag, deep keyed mesh, unobserved possession and a runner without a preceding pull', async () => {
    for (const mode of ['lag', 'deep-mesh', 'no-possession', 'no-pull'] as const) {
      const on = stage(1, mode !== 'no-pull', 'insert', mode === 'lag' ? 'lag' : 'attack');
      const off = stage(1, mode !== 'no-pull', 'insert', mode === 'lag' ? 'lag' : 'attack');
      const next = await handover(true), old = await handover(false);
      next(on.a, on.sim, 'A', 1); old(off.a, off.sim, 'A', 1);
      runnerCue(on, 1, mode === 'no-possession' ? null : true);
      runnerCue(off, 1, mode === 'no-possession' ? null : true);
      on.sim.t += 1; off.sim.t += 1;
      const key = (f: typeof on) => mode === 'deep-mesh'
        ? { target: f.sim.slot('RB')!, cue: f.picture.get(f.sim.slot('RB')!)! } : undefined;
      expect(next(on.a, on.sim, 'A', 1, key(on))).toEqual(old(off.a, off.sim, 'A', 1, key(off)));
      expect(on.a.tags.has('fit-pull-runner-cue')).toBe(false);
    }
  });

  it('uses the same acquired picture despite hidden runner motion', async () => {
    const next = await handover(true), a = stage(1), b = stage(1);
    next(a.a, a.sim, 'A', 1); next(b.a, b.sim, 'A', 1);
    runnerCue(a, 1); runnerCue(b, 1);
    b.sim.slot('RB')!.body.pos.y += 10; b.sim.slot('RB')!.body.vel.y = -8;
    a.sim.t += 1; b.sim.t += 1;
    expect(next(a.a, a.sim, 'A', 1)).toEqual(next(b.a, b.sim, 'A', 1));
  });
});
