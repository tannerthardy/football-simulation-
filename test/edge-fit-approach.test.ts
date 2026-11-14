import { describe, expect, it, vi } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { PASS_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { World, type Intent } from '../src/physics/world.js';
import { supportParams } from '../src/physics/support.js';
import type { Perceived } from '../src/sim/perception.js';
import { PlaySim } from '../src/sim/playsim.js';
import { executeRunFit } from '../src/sim/run-fits.js';

const offense = generateTeam(new Rng(41), 'Edge approach offense', 'EAO', { strength: .55 });
const defense = generateTeam(new Rng(42), 'Edge approach defense', 'EAD', { strength: .55 });

/** An explicitly interpreted picture, not a claim that eyes naturally acquired
 * it. A free force player closes toward a runner threatening his surface.
 * Both requests are then executed by the same ordinary World. */
function stage(side = -1, kind: 'edge' | 'force' = 'force', edge: 'box' | 'spill' = 'box') {
  const sim = new PlaySim({ offense: pickOffense(offense, '11'), defense: pickDefense(defense, 'nickel'),
    offCall: { formation: FORMATION_BY_ID.gun_trey_11, flip: side > 0, kind: 'pass',
      pass: PASS_BY_ID.four_verts, label: 'Interpreted run approach' },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3,
      pressure: null, label: 'Over Cover 3' }, los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 3 });
  const a = sim.slot('FS')!, r = sim.slot('RB')!;
  sim.t = 3; sim.ball = { kind: 'held', carrier: r }; sim.handoffAt = 1;
  a.runFit = { gap: 'D', side, kind, technique: 'attack', edge, pace: 'stack' };
  a.body.pos = { x: 44, y: CENTER_Y + side * 5 };
  a.body.vel = { x: -6, y: 0 }; a.body.facing = Math.PI;
  r.body.pos = { x: 39.3, y: CENTER_Y + side * 5 };
  r.body.vel = { x: 5, y: 0 }; r.body.facing = 0;
  Object.defineProperty(a.mind, 'placementError', { get: () => 0 });
  let picture: Perceived = { pos: { ...r.pos }, vel: { ...r.vel }, age: .25,
    carrying: true, stance: null, facing: 0, pose: 'up' };
  const oldSee = sim.see.bind(sim);
  sim.see = (observer, target, delay) => target === r ? picture : oldSee(observer, target, delay);
  return { sim, a, r, update: () => executeRunFit(a, sim, 'D', side, { possession: { target: r, cue: picture } }),
    picture: () => picture, setPicture: (next: Perceived) => { picture = next; } };
}

describe('edge fits use achievable gathering at an observed runner', () => {
  it.each([-1, 1])('gathers before contact without abandoning the outside shoulder, side=%s', side => {
    const one = stage(side), oldFit = stage(side);
    oldFit.setPicture({ ...oldFit.picture(), carrying: null });
    const before = structuredClone(one.a.body), command = one.update(), landmark = oldFit.update();
    expect(command.vel.x).toBeGreaterThan(landmark.vel.x);
    expect(command.vel.y * side).toBeGreaterThan(0);
    expect((command as Intent).posture).toBeGreaterThan(.4);
    expect(one.a.body).toEqual(before);
    expect(one.a.runFit!.side).toBe(side);
    const report = new World([one.a.body]).step([command], .05);
    new World([oldFit.a.body]).step([landmark], .05);
    expect(one.a.vel.x).toBeGreaterThan(oldFit.a.vel.x);
    expect(one.a.vel.x).toBeLessThan(0); // A request cannot instantly reverse momentum.
    expect(Math.hypot(report.groundImpulse[0].x, report.groundImpulse[0].y))
      .toBeLessThanOrEqual(report.groundImpulseLimit[0] + 1e-8);
    expect(Math.abs(report.work.residual)).toBeLessThan(1e-8);
  });

  it('mirrors the requested gather and the achieved braking', () => {
    const left = stage(-1), right = stage(1), l = left.update(), r = right.update();
    expect(l.vel.x).toBeCloseTo(r.vel.x, 10);
    expect(l.vel.y).toBeCloseTo(-r.vel.y, 10);
    new World([left.a.body]).step([l], .05); new World([right.a.body]).step([r], .05);
    expect(left.a.pos.x).toBeCloseTo(right.a.pos.x, 10);
    expect(left.a.pos.y + right.a.pos.y).toBeCloseTo(2 * CENTER_Y, 10);
    expect(left.a.vel.y).toBeCloseTo(-right.a.vel.y, 10);
  });

  it.each([false, null, undefined])('keeps the existing fit with carrying=%s', carrying => {
    const one = stage(), reference = stage();
    one.setPicture({ ...one.picture(), carrying });
    reference.setPicture({ ...reference.picture(), carrying: null });
    expect(one.update()).toEqual(reference.update());
  });

  it('does not improve a picture merely because the live runner has moved', () => {
    const one = stage(); const expected = one.update();
    one.r.body.pos = { x: 75, y: 3 }; one.r.body.vel = { x: 9, y: 0 };
    const draws = vi.spyOn(Rng.prototype, 'nextU32');
    try { expect(one.update()).toEqual(expected); expect(draws).not.toHaveBeenCalled(); }
    finally { draws.mockRestore(); }
  });

  it.each(['box', 'spill'] as const)('retains an %s edge when the runner stays inside its gap', edge => {
    const one = stage(-1, 'edge', edge), reference = stage(-1, 'edge', edge);
    const picture = { ...one.picture(), pos: { x: 39.3, y: CENTER_Y } };
    one.setPicture(picture); reference.setPicture({ ...picture, carrying: null });
    expect(one.update()).toEqual(reference.update());
    expect(one.a.runFit!.edge).toBe(edge);
  });

  it('does not chase a deep mesh or a separating runner away from its landmark', () => {
    for (const separating of [false, true]) {
      const one = stage(), reference = stage();
      const picture = { ...one.picture(), pos: { x: separating ? 39.3 : 33, y: one.r.pos.y },
        vel: { x: separating ? -9 : 1, y: 0 } };
      one.setPicture(picture); reference.setPicture({ ...picture, carrying: null });
      expect(one.update()).toEqual(reference.update());
    }
  });

  it.each(['load', 'lean', 'strike', 'down', 'bond'] as const)('keeps constrained %s execution out of a free-space gather', constraint => {
    const one = stage(), reference = stage();
    for (const f of [one, reference]) {
      if (constraint === 'load') f.a.body.support!.load = { x: 10, y: 0 };
      if (constraint === 'lean') f.a.body.support!.lean = { x: 10, y: 0 };
      if (constraint === 'strike') f.a.body.support!.strike = { x: 1, y: 0 };
      if (constraint === 'down') f.a.body.support!.state = 'down';
      if (constraint === 'bond') f.sim.bond = { carrier: f.r, tacklers: [f.a], start: 2, progressX: f.r.pos.x, down: false };
    }
    reference.setPicture({ ...reference.picture(), carrying: null });
    expect(one.update()).toEqual(reference.update());
  });
});
