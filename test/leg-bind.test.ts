/** LEG_BIND (experimental, off): arms wrapped round a runner's legs take his
 * stride. A tackler holds a running back from behind; a hold at or below his
 * thighs, times its grip, limits the speed the carrier's gait may hold. A hold
 * on his upper body, or a tackler in front of him, leaves his stride alone. */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function held(flag: string, legs: number, inFront = false) {
  vi.stubEnv('LEG_BIND', flag);
  vi.resetModules();
  const { Rng } = await import('../src/core/rng.js');
  const { generateTeam, pickDefense, pickOffense } = await import('../src/league/team.js');
  const { RUN_BY_ID } = await import('../src/playbook/concepts.js');
  const { COVERAGE_BY_ID, FRONT_BY_ID } = await import('../src/playbook/defense.js');
  const { FORMATION_BY_ID } = await import('../src/playbook/formations.js');
  const { updateBond } = await import('../src/sim/tackle.js');
  const { PlaySim } = await import('../src/sim/playsim.js');
  type Intent = Parameters<typeof updateBond>[2][number];
  const sim = new PlaySim({ offense: pickOffense(generateTeam(new Rng(61), 'O', 'BO'), '11'),
    defense: pickDefense(generateTeam(new Rng(62), 'D', 'BD'), 'base43'),
    offCall: { formation: FORMATION_BY_ID.ace_11, flip: false, kind: 'run', run: RUN_BY_ID.iz_strong, label: 'bind' },
    defCall: { personnel: 'base43', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'bind' },
    los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 3 });
  const c = sim.slot('RB')!, d = sim.defense.find(a => a.slot.startsWith('LB'))!;
  sim.ball = { kind: 'held', carrier: c } as never;
  c.body.pos = { x: 50, y: CENTER_Y }; c.body.vel = { x: 6, y: 0 }; c.body.facing = 0;
  d.body.pos = { x: inFront ? 50.7 : 49.3, y: CENTER_Y }; d.body.vel = { x: inFront ? -1 : 6, y: 0 }; d.body.facing = inFront ? Math.PI : 0;
  const joint = { kind: 'grasp' as const, a: d.body, b: c.body, reach: 1.6, capacity: 1500, legs, pull: 1.5, hold: .7 };
  sim.world.joints.push(joint);
  sim.bond = { carrier: c, tacklers: [d], start: sim.t, progressX: c.pos.x, down: false, stalled: 0,
    grip: new Map([[d, .8]]), holds: new Map([[d, joint]]), execution: new Map([[d, 1]]) };
  const intents: Intent[] = sim.agents.map(a => ({ vel: { x: a === c ? 8 : 0, y: 0 }, facing: 0 }));
  updateBond(sim, sim.bond, intents);
  return { effort: intents[c.idx].effort, grip: sim.bond?.grip?.get(d) ?? NaN };
}

describe('LEG_BIND', () => {
  it('off: a held runner still asks for his full stride', async () => {
    const f = await held('0', .8);
    expect(f.effort ?? 1).toBe(1);
  });

  it('on: a hold at or below his thighs limits his stride by its grip', async () => {
    const f = await held('1', .8);
    expect(f.grip).toBeGreaterThan(0);
    expect(f.effort).toBeCloseTo(1 - f.grip, 6);
  });

  it('on: a hold at his hips binds proportionally less', async () => {
    const f = await held('1', .25);
    expect(f.effort).toBeCloseTo(1 - .5 * f.grip, 6);
  });

  it('on: a tackler in front who wraps his thighs is driven back, not a bind', async () => {
    const f = await held('1', .8, true);
    expect(f.effort ?? 1).toBe(1);
  });

  it('on: a hold on his upper body leaves the stride alone', async () => {
    const f = await held('1', 0);
    expect(f.effort ?? 1).toBe(1);
  });
});
