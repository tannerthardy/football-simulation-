import { describe, expect, it, vi } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { RUN_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { World } from '../src/physics/world.js';
import { RunBlocker } from '../src/sim/behaviors/blocking.js';
import { goTo } from '../src/sim/behaviors/common.js';
import type { Perceived } from '../src/sim/perception.js';
import { PlaySim } from '../src/sim/playsim.js';

const formation = FORMATION_BY_ID.ace_11;
const offense = generateTeam(new Rng(31), 'O', 'O', { strength: .55 });
const defense = generateTeam(new Rng(32), 'D', 'D', { strength: .55 });

function stage(perimeter = true, mirror = false) {
  const sim = new PlaySim({ offense: pickOffense(offense, formation.personnel), defense: pickDefense(defense, 'base43'),
    offCall: { formation, flip: false, kind: 'run', run: RUN_BY_ID.oz_strong, label: 'stalk surface' },
    defCall: { personnel: 'base43', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'Over' },
    los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 3 });
  const a = sim.slot('Z')!, d = sim.slot('CB_S')!;
  a.body.pos = { x: 44, y: CENTER_Y }; a.body.vel = { x: 0, y: 0 }; a.body.facing = 0;
  d.body.pos = { x: 45.5, y: CENTER_Y + (mirror ? -2 : 2) };
  d.body.vel = { x: -1, y: mirror ? -3 : 3 };
  const controller = new RunBlocker({ kind: 'stalk', target: d,
    drive: { x: 1, y: 0 }, perimeterStalk: perimeter ? d : undefined });
  a.behavior = controller; sim.t = 1; sim.world.time = 1;
  for (let i = 0; i < 24; i++) sim.perception.record(sim.agents);
  return { sim, a, d, controller };
}

describe('installed perimeter stalk movement', () => {
  it('marks the installed perimeter job and leaves the inside H/backer job distinct', () => {
    const { sim } = stage();
    const x = sim.slot('X')!.behavior as RunBlocker;
    expect(x.plan.perimeterStalk).toBe(x.target);
    expect(x.plan.perimeterStalk?.slot).toBe('CB_W');
    const h = sim.slot('H')!.behavior as RunBlocker;
    expect(h.target?.slot.startsWith('LB')).toBe(true);
    expect(h.plan.perimeterStalk).toBeUndefined();
  });

  it('can request a downhill correction while the body still has forward momentum', () => {
    const f = stage(); f.d.body.pos = { x: 42.5, y: CENTER_Y }; f.d.body.vel = { x: -2, y: 0 };
    f.a.body.vel = { x: 3, y: 0 };
    for (let i = 0; i < 24; i++) f.sim.perception.record(f.sim.agents);
    const before = structuredClone(f.a.body), rng = JSON.stringify(f.sim.rng);
    const request = f.controller.update(f.a, f.sim);
    expect(request.vel.x).toBeLessThan(0);
    expect(Math.hypot(request.vel.x, request.vel.y)).toBeLessThanOrEqual(f.a.profile.vmax * .85 + 1e-9);
    expect(request.posture).toBeUndefined();
    expect(f.a.body).toEqual(before); expect(JSON.stringify(f.sim.rng)).toBe(rng);
    const body = structuredClone(before), world = new World([body]); world.time = 1;
    const report = world.step([request], .05);
    expect(body.pos.x).toBeGreaterThan(before.pos.x);
    expect(body.vel.x).toBeLessThan(before.vel.x);
    expect(report.armImpulse).toEqual([0]);
    expect(Math.abs(report.work.residual)).toBeLessThan(1e-8);
    expect(f.a.engagement).toBeNull(); expect(f.sim.world.joints).toHaveLength(0);
  });

  it('does not use a hidden far shift or add observation age to an already projected picture', () => {
    const run = (hiddenX: number, age: number) => {
      const f = stage(), picture = structuredClone(f.sim.see(f.a, f.d));
      f.d.body.pos.x += hiddenX;
      const spy = vi.spyOn(f.sim, 'see').mockReturnValue({ ...picture, age });
      const command = f.controller.update(f.a, f.sim);
      expect(spy.mock.calls).toHaveLength(1); spy.mockRestore(); return command;
    };
    expect(run(-.2, .3)).toEqual(run(.2, .3));
    expect(run(0, .3)).toEqual(run(0, .8));
  });

  it('responds to acquired defender movement with the same position and physical capacities', () => {
    const run = (velocity: { x: number; y: number }) => {
      const f = stage(), picture: Perceived = { ...f.sim.see(f.a, f.d), vel: velocity };
      const spy = vi.spyOn(f.sim, 'see').mockReturnValue(picture);
      const command = f.controller.update(f.a, f.sim); spy.mockRestore(); return command;
    };
    const patient = run({ x: 0, y: 0 }), trigger = run({ x: -3, y: 4 });
    expect(trigger.vel.y).toBeGreaterThan(patient.vel.y);
    expect(trigger.vel.x).toBeLessThan(patient.vel.x);
  });

  it('mirrors the acquired approach without changing the movement envelope', () => {
    const a = stage(true, false), b = stage(true, true);
    const left = a.controller.update(a.a, a.sim), right = b.controller.update(b.a, b.sim);
    expect(right.vel.x).toBeCloseTo(left.vel.x, 10);
    expect(right.vel.y).toBeCloseTo(-left.vel.y, 10);
    expect(right.facing).toBeCloseTo(-left.facing!, 10);
  });

  it.each(['inside', 'retargeted'] as const)('preserves the ordinary acquired fit for %s work', mode => {
    const f = stage(false);
    if (mode === 'retargeted') f.controller.plan.perimeterStalk = f.sim.slot('CB_W')!;
    const seen = f.sim.see(f.a, f.d);
    const expected = goTo(f.a, { x: Math.max(seen.pos.x - 1.2, f.a.pos.x), y: seen.pos.y }, { speed: .85, through: 1 });
    expect(f.controller.update(f.a, f.sim)).toEqual(expected);
    expect(f.controller.target).toBe(f.d);
  });

  it('keeps the existing physical acquisition before the movement request', () => {
    const f = stage(); f.d.body.pos = { x: 44.5, y: CENTER_Y };
    const engage = vi.spyOn(f.sim, 'engage'), see = vi.spyOn(f.sim, 'see');
    expect(f.controller.update(f.a, f.sim).vel).toEqual({ x: 0, y: 0 });
    expect(engage).toHaveBeenCalledOnce();
    // The defender may legitimately read its key while actual contact is
    // acquired. The stalker's far-movement query must still be bypassed.
    expect(see.mock.calls.some(([observer]) => observer === f.a)).toBe(false);
    expect(f.a.engagement?.defender).toBe(f.d);
    engage.mockRestore(); see.mockRestore();
  });
});
