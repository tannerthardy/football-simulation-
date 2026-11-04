import { afterEach, describe, expect, it, vi } from 'vitest';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { SCREEN_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { PassProtector, ProtectionCoordinator } from '../src/sim/behaviors/blocking.js';
import type { Perceived } from '../src/sim/perception.js';
import { PlaySim } from '../src/sim/playsim.js';

function gate(side: number) {
  const sim = new PlaySim({
    offense: pickOffense(generateTeam(new Rng(41), 'O', 'O', { strength: .55 }), '11'),
    defense: pickDefense(generateTeam(new Rng(42), 'D', 'D', { strength: .55 }), 'nickel'),
    offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: side < 0, kind: 'pass', pass: SCREEN_BY_ID.tunnel_screen, label: 'tunnel' },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'Over3' },
    los: 35, ballY: 26, firstDownX: 45, seed: 1007 });
  const a = sim.slot(side > 0 ? 'LT' : 'RT')!, r = sim.slot('DE_S')!;
  sim.t = sim.world.time = .75;
  a.body.pos = { x: 34, y: 26 + side * 3 }; a.body.vel = { x: 0, y: 0 };
  r.body.pos = { x: 36, y: 26 + side * 4 }; r.body.vel = { x: -3, y: -side };
  const cue: Perceived = { pos: { ...r.pos }, vel: { ...r.vel }, facing: Math.PI, pose: 'up', stance: null };
  const coord = new ProtectionCoordinator(); coord.add(a); coord.assigned.set(a, r);
  vi.spyOn(coord, 'update').mockImplementation(() => {});
  const work = new PassProtector(coord, () => ({ kind: 'released', update: () => ({ vel: { x: 0, y: 0 } }) }), 10, true);
  a.behavior = work;
  const see = sim.see.bind(sim), qbCue = { ...see(a, sim.qb), carrying: true };
  vi.spyOn(sim, 'see').mockImplementation((observer, target, delay) => target === r ? structuredClone(cue)
    : target === sim.qb ? structuredClone(qbCue) : see(observer, target, delay));
  return { sim, a, r, cue, qbCue, work };
}
afterEach(() => vi.restoreAllMocks());

describe('called screen lineman gate uses the acquired rusher picture', () => {
  it.each([-1, 1])('unseen rusher position and velocity cannot move the gate or facing, side %s', side => {
    const base = gate(side), expected = base.work.update(base.a, base.sim);
    for (const hidden of ['position', 'velocity'] as const) {
      const f = gate(side);
      if (hidden === 'position') f.r.body.pos = { x: 31, y: 26 - side * 5 };
      else f.r.body.vel = { x: 7, y: side * 8 };
      const ownBody = structuredClone(f.a.body);
      expect(f.work.update(f.a, f.sim)).toEqual(expected);
      expect(f.a.body).toEqual(ownBody);
    }
  });

  it.each([-1, 1])('new acquired position/velocity changes the open-gate request without granting a block, side %s', side => {
    const base = gate(side), expected = base.work.update(base.a, base.sim);
    const seenPosition = gate(side); seenPosition.cue.pos.y = 26 - side * 3;
    const engage = vi.spyOn(seenPosition.sim, 'engage').mockReturnValue(null);
    const changed = seenPosition.work.update(seenPosition.a, seenPosition.sim);
    expect(changed.vel).not.toEqual(expected.vel); expect(changed.facing).not.toBe(expected.facing);
    expect(engage).not.toHaveBeenCalled();
    const seenVelocity = gate(side); seenVelocity.cue.vel.y = side * 8;
    expect(seenVelocity.work.update(seenVelocity.a, seenVelocity.sim).vel).not.toEqual(expected.vel);
  });

  it.each([-1, 1])('pre-count gate follows acquired QB possession, side %s', side => {
    const base = gate(side), expected = base.work.update(base.a, base.sim);
    expect(Math.hypot(expected.vel.x, expected.vel.y)).toBeGreaterThan(0);
    const hidden = gate(side);
    hidden.sim.ball = { kind: 'held', carrier: hidden.sim.slot('RB')! };
    expect(hidden.work.update(hidden.a, hidden.sim)).toEqual(expected);
    const acquired = gate(side); acquired.qbCue.carrying = false;
    expect(acquired.work.update(acquired.a, acquired.sim).vel).toEqual({ x: 0, y: 0 });
  });
});
