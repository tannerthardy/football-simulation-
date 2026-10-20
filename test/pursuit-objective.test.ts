import { describe, expect, it, vi } from 'vitest';
import * as MovementPreview from '../src/physics/movement-preview.js';
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { PASS_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { chase, gatheringApproach, leverage, pursuitPoint, runThrough } from '../src/sim/behaviors/common.js';
import { movementObjective } from '../src/sim/movement-objective.js';
import type { Perceived } from '../src/sim/perception.js';
import { PlaySim } from '../src/sim/playsim.js';

const offense = pickOffense(generateTeam(new Rng(19), 'O', 'OFF'), '11');
const defense = pickDefense(generateTeam(new Rng(20), 'D', 'DEF'), 'nickel');
function stage(close = false, side = 1) {
  const sim = new PlaySim({ offense, defense,
    offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: false, kind: 'pass',
      pass: PASS_BY_ID.four_verts, label: 'pursuit objective contract' },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3,
      pressure: null, label: 'pursuit objective contract' },
    los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 19 });
  const runner = sim.slot('Z')!, defender = sim.slot('FS')!;
  const picture: Perceived = { pos: { x: 50, y: CENTER_Y + side * 5 },
    vel: { x: 6, y: 0 }, facing: 0, stance: null, carrying: true, age: .2 };
  defender.body.pos = { x: close ? 51 : 40, y: picture.pos.y + side * (close ? 1.5 : 6) };
  defender.body.vel = { x: close ? 0 : 4, y: -side * 3 };
  defender.body.facing = Math.atan2(defender.vel.y, defender.vel.x);
  // This fixture supplies an acquired picture, not a claim about natural gaze.
  const see = vi.spyOn(sim, 'see').mockImplementation(() => structuredClone(picture));
  return { sim, runner, defender, picture, see };
}

describe('pursuit carries its acquired responsibility through teammate navigation', () => {
  it('returns the exact complete pursuit request scored by the preview through a partial gather', () => {
    const { sim, runner, defender, picture } = stage();
    defender.body.pos = { x: 52, y: picture.pos.y + 3 };
    defender.body.vel = { x: 6, y: -6 };
    defender.body.facing = -Math.PI / 4;
    const contact = runner.profile.radius + defender.profile.radius + defender.profile.reach * .65;
    const distance = Math.hypot(picture.pos.x - defender.pos.x, picture.pos.y - defender.pos.y);
    const offset = leverage(defender, picture.pos.y) * Math.max(0, Math.min(1, (distance - contact) / 6));
    const { gather } = gatheringApproach(defender, picture, contact, offset);
    expect(gather).toBeGreaterThan(0);
    expect(gather).toBeLessThan(1);
    // Pass-through spy: all samples still come from the production World.
    const preview = vi.spyOn(MovementPreview, 'previewFreeMovement');
    try {
      const command = chase(sim, defender, runner);
      expect(preview).toHaveBeenCalledTimes(3);
      const scored = preview.mock.calls.map(call => call[1]);
      expect(scored).toContain(command);
      for (const candidate of scored) {
        expect(movementObjective(candidate)).toEqual(movementObjective(command));
        expect(candidate.facing).toBeDefined();
        expect(candidate.posture).toBeDefined();
        expect(candidate.cutSkill).toBeDefined();
      }
      expect(movementObjective(command)!.point.x).toBe(picture.pos.x);
    } finally { preview.mockRestore(); }
  });

  it.each([false, true])('advertises the current moving hip, not the future intercept; close=%s', close => {
    const { sim, runner, defender, picture } = stage(close);
    const contact = runner.profile.radius + defender.profile.radius + defender.profile.reach * .65;
    const distance = Math.hypot(picture.pos.x - defender.pos.x, picture.pos.y - defender.pos.y);
    const offset = leverage(defender, picture.pos.y) * Math.max(0, Math.min(1, (distance - contact) / 6));
    const gather = gatheringApproach(defender, picture, contact, offset);
    expect(close ? gather.gather >= 1 : gather.gather === 0).toBe(true);
    const command = chase(sim, defender, runner);
    const goal = movementObjective(command)!;
    expect(goal.kind).toBe('moving');
    expect(goal.point.x).toBe(picture.pos.x);
    expect(goal.point.y).toBeCloseTo(picture.pos.y + offset, 12);
    expect(goal.kind === 'moving' && goal.velocity).toEqual(picture.vel);
    if (close) expect(command.vel).toEqual(gather.near!.vel);
    else {
      const intercept = pursuitPoint(sim, defender, runner);
      expect(intercept.x).toBeGreaterThan(goal.point.x + 1);
      expect(command.vel).toEqual(runThrough(defender, intercept, { speed: 1 }).vel);
    }
  });

  it.each([-1, 1])('retains the installed force shoulder, side %s', side => {
    const { sim, runner, defender, picture } = stage(false, side);
    defender.runFit = { kind: 'force', gap: 'D', side, technique: 'attack', edge: 'box', pace: 'stack' };
    const goal = movementObjective(chase(sim, defender, runner))!;
    expect(side * (goal.point.y - picture.pos.y)).toBeGreaterThan(0);
    expect(goal.point.x).toBe(picture.pos.x);
    expect(goal.kind === 'moving' && goal.velocity).toEqual(picture.vel);
  });

  it('does not substitute hidden motion or create new sightings to describe its goal', () => {
    const { sim, runner, defender, picture, see } = stage();
    const before = chase(sim, defender, runner);
    const calls = see.mock.calls.length;
    runner.body.pos = { x: 90, y: 2 }; runner.body.vel = { x: -8, y: 5 };
    const draws = vi.spyOn(Rng.prototype, 'nextU32');
    try {
      const after = chase(sim, defender, runner);
      expect(after).toEqual(before);
      expect(see.mock.calls.length - calls).toBe(calls);
      expect(draws).not.toHaveBeenCalled();
      const held = structuredClone(movementObjective(before));
      picture.pos.x += 2; picture.vel.y += 1;
      expect(movementObjective(before)).toEqual(held);
      const next = movementObjective(chase(sim, defender, runner))!;
      expect(next.point.x).toBe(picture.pos.x);
      expect(next.kind === 'moving' && next.velocity).toEqual(picture.vel);
    } finally { draws.mockRestore(); }
  });

  it('leaves a held tackle with its existing contact owner', () => {
    const { sim, runner, defender } = stage();
    sim.bond = { carrier: runner, tacklers: [defender], start: sim.t, progressX: runner.pos.x, down: false };
    const command = chase(sim, defender, runner);
    expect(movementObjective(command)).toBeUndefined();
    expect(command).toEqual({ ...runThrough(defender, pursuitPoint(sim, defender, runner), { speed: 1 }), effort: 1 });
  });
});
