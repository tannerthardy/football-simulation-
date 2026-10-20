import { describe, expect, it, vi } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import * as MovementPreview from '../src/physics/movement-preview.js';
import type { Intent } from '../src/physics/world.js';
import { PASS_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { chooseApproach } from '../src/sim/approach-control.js';
import { blendApproach } from '../src/sim/behaviors/common.js';
import { movementObjective, withMovementObjective } from '../src/sim/movement-objective.js';
import type { Perceived } from '../src/sim/perception.js';
import { PlaySim } from '../src/sim/playsim.js';

/** Synthetic free crossing approach, using the existing approach fixture's
 * bodies. It tests the command/forecast boundary, not a promised tackle or
 * reconstruction of a rounded recording. No preview result is substituted.
 */
function stage() {
  const sim = new PlaySim({
    offense: pickOffense(generateTeam(new Rng(19), 'O', 'OFF'), '11'),
    defense: pickDefense(generateTeam(new Rng(20), 'D', 'DEF'), 'nickel'),
    offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: false, kind: 'pass',
      pass: PASS_BY_ID.four_verts, label: 'composition contract' },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3,
      pressure: null, label: 'composition contract' },
    los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 19,
  });
  const runner = sim.slot('Z')!, defender = sim.slot('FS')!;
  runner.body.pos = { x: 50, y: CENTER_Y }; runner.body.vel = { x: 6, y: 0 };
  defender.body.pos = { x: 53, y: CENTER_Y + 6 };
  defender.body.vel = { x: 6, y: -6 }; defender.body.facing = -Math.PI / 4;
  const seen: Perceived = { pos: { ...runner.pos }, vel: { ...runner.vel }, facing: 0, stance: null };
  const contact = runner.profile.radius + defender.profile.radius + defender.profile.reach * .65;
  const original = withMovementObjective<Intent>({ vel: { x: 4.5, y: -8.6 }, effort: 1 },
    { kind: 'fixed', point: { x: 55, y: CENTER_Y } });
  const near = withMovementObjective<Intent>({ vel: { x: 4.5, y: -7 },
    facing: Math.atan2(-6, -3), cutSkill: 1.07, posture: .57, push: .4 },
    { kind: 'moving', point: seen.pos, velocity: seen.vel });
  return { defender, seen, contact, original, near };
}

describe('approach forecasts the command that will actually be emitted', () => {
  it('scores composed alternatives through the production World and returns the exact scored winner', () => {
    const { defender, seen, contact, original, near } = stage();
    const emitted: Intent[] = [];
    const compose = vi.fn((command: Intent) => {
      const final: Intent = blendApproach(command, near, .35);
      emitted.push(final);
      return final;
    });
    // Pass-through spy: each forecast still runs the production World.
    const preview = vi.spyOn(MovementPreview, 'previewFreeMovement');
    try {
      const chosen = chooseApproach(defender, seen, contact, 0, original, 0, compose);
      expect(preview).toHaveBeenCalledTimes(3);
      expect(compose).toHaveBeenCalledTimes(3);
      const scored = preview.mock.calls.map(call => call[1]);
      for (const command of scored) {
        expect(emitted).toContain(command);
        expect(command.posture).toBe(near.posture);
        expect(command.push).toBe(near.push);
        expect(command.cutSkill).toBe(near.cutSkill);
        expect(movementObjective(command)).toEqual(movementObjective(near));
      }
      // Recomposition after scoring creates a different unscored object; the
      // chosen command must be the same complete object the forecast consumed.
      expect(scored).toContain(chosen);
      expect(chosen).not.toBe(original);
    } finally { preview.mockRestore(); }
  });

  it('keeps exclusion cheap while returning its composed original, with identity as the default', () => {
    const { defender, seen, contact, original, near } = stage();
    defender.body.vel = { x: 0, y: 0 };
    const final = blendApproach(original, near, .35);
    const compose = vi.fn(() => final);
    const preview = vi.spyOn(MovementPreview, 'previewFreeMovement');
    try {
      expect(chooseApproach(defender, seen, contact, 0, original, 0, compose)).toBe(final);
      expect(compose).toHaveBeenCalledExactlyOnceWith(original);
      expect(preview).not.toHaveBeenCalled();
      expect(chooseApproach(defender, seen, contact, 0, original, 0)).toBe(original);
      expect(movementObjective(original)).toEqual({ kind: 'fixed', point: { x: 55, y: CENTER_Y } });
    } finally { preview.mockRestore(); }
  });
});
