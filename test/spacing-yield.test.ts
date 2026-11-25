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
import { HEADWAY_HOLD, spaceTeammates } from '../src/sim/spacing.js';

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
    // HEADWAY_HOLD: the closing limit is left a body width beyond its entry, so the full request returns smoothly two ticks
    // later (off: tick 14 at once; on: 7.9, 8.9, then 9.0 at tick 16); the window is that much longer under the flag.
    const ticks = HEADWAY_HOLD ? 18 : 16;
    for (let k = 0; k < ticks; k++) {
      const intents: Intent[] = [structuredClone(request), { vel: { x: 0, y: 0 } }];
      spaceTeammates([a, b], intents, (_a, target) => target, { now: world.time });
      if (k === 0) {
        expect([a.body, b.body]).toEqual(before);
        const speed = Math.hypot(intents[0].vel.x, intents[0].vel.y);
        expect(speed).toBeGreaterThan(1);
        expect(speed).toBeLessThan(9);
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
    expect(commands.some(command => command.vel.y === request.vel.y)).toBe(true);
  });

  it.each([-1, 1])('still stops when a slower turn would also hit the teammate in mirror %s', side => {
    const { a, b, world } = stage(side, .9);
    const request: Intent = { vel: { x: 0, y: side * 9 }, cutSkill: 1 };
    const preview = vi.spyOn(MovementPreview, 'previewFreeMovement');
    try {
      const intents: Intent[] = [request, { vel: { x: 0, y: 0 } }];
      spaceTeammates([a, b], intents, (_a, target) => target, { now: world.time });
      expect(intents[0].vel).toEqual({ x: 0, y: 0 });
      expect(intents[0].cutSkill).toBe(request.cutSkill);
      expect(preview).toHaveBeenCalled();
      const report = world.step(intents, .05);
      expect(report.contacts).toHaveLength(0);
      expect(Math.abs(report.work.residual)).toBeLessThan(1e-8);
      expect(a.body.support!.state).toBe('up');
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
    const preview = vi.spyOn(MovementPreview, 'previewFreeMovement');
    try {
      const intents: Intent[] = [structuredClone(request), { vel: { x: 0, y: 0 } }];
      spaceTeammates([a, b], intents, (_a, target) => target, { now: world.time });
      expect(intents[0]).toEqual(request);
      expect(preview).not.toHaveBeenCalled();
    } finally { preview.mockRestore(); }
  });
});
