import { describe, expect, it, vi } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import * as MovementPreview from '../src/physics/movement-preview.js';
import { newSupport } from '../src/physics/support.js';
import { World, type Intent } from '../src/physics/world.js';
import { PASS_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { PlaySim } from '../src/sim/playsim.js';
import { spaceTeammates } from '../src/sim/spacing.js';

function stage(side: number, lateral: number) {
  const sim = new PlaySim({
    offense: pickOffense(generateTeam(new Rng(19), 'O', 'OFF'), '11'),
    defense: pickDefense(generateTeam(new Rng(20), 'D', 'DEF'), 'nickel'),
    offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: false,
      kind: 'pass', pass: PASS_BY_ID.four_verts, label: 'spacing yield' },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over,
      coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'spacing yield' },
    los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 83,
  });
  const a = sim.slot('FS')!, b = sim.slot('NB')!;
  a.body.pos = { x: 50, y: CENTER_Y }; a.body.vel = { x: 9, y: 0 };
  a.body.facing = 0; a.body.support = newSupport();
  b.body.pos = { x: 54.3, y: CENTER_Y + side * lateral };
  b.body.vel = { x: 0, y: 0 }; b.body.facing = 0; b.body.support = newSupport();
  const world = new World([a.body, b.body]); world.time = 2;
  return { sim, a, b, world };
}

describe('moving teammate gathers', () => {
  it.each([-1, 1])('keeps making progress through a safe curved gather in mirror %s', side => {
    const { a, b, world } = stage(side, 1.1);
    const request: Intent = { vel: { x: 0, y: side * 9 }, facing: side * Math.PI / 2, cutSkill: 1 };
    const before = structuredClone([a.body, b.body]);
    const commands: Intent[] = [];
    for (let k = 0; k < 16; k++) {
      const intents: Intent[] = [structuredClone(request), { vel: { x: 0, y: 0 } }];
      spaceTeammates([a, b], intents, (_a, target) => target, { now: world.time });
      if (k === 0) {
        expect([a.body, b.body]).toEqual(before);
      }
      expect(intents[0].facing).toBe(request.facing);
      expect(intents[0].cutSkill).toBe(request.cutSkill);
      commands.push(structuredClone(intents[0]));
      const report = world.step(intents, .05);
      expect(report.contacts).toHaveLength(0);
      expect(a.body.support!.state).toBe('up');
      expect(b.body.support!.state).toBe('up');
      expect(Math.abs(report.work.residual)).toBeLessThan(1e-8);
      report.supportMotorWork.forEach((work, i) =>
        expect(work).toBeLessThanOrEqual(report.supportMotorWorkLimit[i] + 1e-8));
    }
    expect(a.pos.y * side).toBeGreaterThan(CENTER_Y * side + .5);
    expect(commands.some(command => Math.hypot(command.vel.x, command.vel.y) < 9)).toBe(true);
    expect(commands.some(command => command.vel.y === request.vel.y)).toBe(true);
  });

  it.each([-1, 1])('still gathers before a genuinely obstructed turn in mirror %s', side => {
    const { a, b, world } = stage(side, .9);
    const request: Intent = { vel: { x: 0, y: side * 9 }, cutSkill: 1 };
    // The unmodified production movement is the obstruction control. Keep
    // identical physical starts; a safe receding prefix need not stop at t0.
    const control = stage(side, .9), controlContacts = [];
    for (let k = 0; k < 16; k++) {
      const report = control.world.step([structuredClone(request), { vel: { x: 0, y: 0 } }], .05);
      controlContacts.push(...report.contacts);
    }
    expect(controlContacts.some(contact => contact.impulse > 0)).toBe(true);
    const preview = vi.spyOn(MovementPreview, 'previewFreeMovement');
    try {
      const commands: Intent[] = [];
      for (let k = 0; k < 16; k++) {
        const intents: Intent[] = [structuredClone(request), { vel: { x: 0, y: 0 } }];
        spaceTeammates([a, b], intents, (_a, target) => target, { now: world.time });
        expect(intents[0].cutSkill).toBe(request.cutSkill);
        commands.push(structuredClone(intents[0]));
        const report = world.step(intents, .05);
        expect(report.contacts).toHaveLength(0);
        expect(Math.abs(report.work.residual)).toBeLessThan(1e-8);
        report.supportMotorWork.forEach((work, i) =>
          expect(work).toBeLessThanOrEqual(report.supportMotorWorkLimit[i] + 1e-8));
        expect(a.body.support!.state).toBe('up');
        expect(b.body.support!.state).toBe('up');
      }
      expect(commands.some(command => Math.hypot(command.vel.x, command.vel.y) < 9)).toBe(true);
      expect(preview).toHaveBeenCalled();
      expect((a.pos.y - CENTER_Y) * side).toBeGreaterThan(.5);
    } finally { preview.mockRestore(); }
  });

  it.each([-1, 1])('rejects both gathers that create a new trailing conflict in mirror %s', side => {
    const { sim, a, b, world } = stage(side, 1.1), rear = sim.slot('LB_W')!;
    rear.body.pos = { x: 49, y: CENTER_Y };
    rear.body.vel = { x: 9, y: 0 }; rear.body.facing = 0; rear.body.support = newSupport();
    const request: Intent = { vel: { x: 0, y: side * 9 } };
    for (const peers of [[b, rear], [rear, b]]) {
      const intents: Intent[] = [structuredClone(request), ...peers.map(p => ({ vel: { ...p.vel } }))];
      spaceTeammates([a, ...peers], intents, (_a, target) => target, { now: world.time });
      expect(intents[0]).toEqual(request);
    }
  });

  it('does not invent a free forecast while a contact constrains the player', () => {
    const { a, b, world } = stage(1, 1.1);
    const request: Intent = { vel: { x: 0, y: 9 }, facing: Math.PI / 2, cutSkill: 1 };
    const preview = vi.spyOn(MovementPreview, 'previewFreeMovement');
    try {
      const intents: Intent[] = [structuredClone(request), { vel: { x: 0, y: 0 } }];
      spaceTeammates([a, b], intents, (_a, target) => target,
        { now: world.time, constrained: new Set([a.body]) });
      expect(intents[0]).toEqual(request);
      expect(preview).not.toHaveBeenCalled();
    } finally { preview.mockRestore(); }
  });

  it('keeps an empty attainable turn unchanged', () => {
    const { a, b, world } = stage(1, 4);
    b.body.pos.x = 52;
    const request: Intent = { vel: { x: 0, y: 9 }, facing: Math.PI / 2, cutSkill: 1 };
    const intents: Intent[] = [structuredClone(request), { vel: { x: 0, y: 0 } }];
    spaceTeammates([a, b], intents, (_a, target) => target, { now: world.time });
    expect(intents[0]).toEqual(request);
  });
});
