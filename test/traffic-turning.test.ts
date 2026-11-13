import { describe, expect, it, vi } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import * as MovementPreview from '../src/physics/movement-preview.js';
import { newSupport } from '../src/physics/support.js';
import { World, type Intent, type StepReport } from '../src/physics/world.js';
import { PASS_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { PlaySim } from '../src/sim/playsim.js';
import { spaceTeammates } from '../src/sim/spacing.js';

function stage(side = 1) {
  const sim = new PlaySim({
    offense: pickOffense(generateTeam(new Rng(19), 'O', 'OFF'), '11'),
    defense: pickDefense(generateTeam(new Rng(20), 'D', 'DEF'), 'nickel'),
    offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: false,
      kind: 'pass', pass: PASS_BY_ID.four_verts, label: 'traffic' },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over,
      coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'traffic' },
    los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 83,
  });
  const a = sim.slot('FS')!, b = sim.slot('NB')!;
  a.body.pos = { x: 50, y: CENTER_Y }; a.body.vel = { x: 9, y: 0 };
  a.body.facing = 0; a.body.support = newSupport();
  b.body.pos = { x: 54.3, y: CENTER_Y + side * 1.1 };
  b.body.vel = { x: 0, y: 0 }; b.body.facing = 0; b.body.support = newSupport();
  return { sim, a, b };
}

function bounded(report: StepReport) {
  expect(Math.abs(report.work.residual)).toBeLessThan(1e-8);
  for (let i = 0; i < report.supportMotorWork.length; i++) {
    expect(report.supportMotorWork[i]).toBeLessThanOrEqual(report.supportMotorWorkLimit[i] + 1e-8);
    expect(report.armImpulse[i]).toBeLessThanOrEqual(report.armImpulseLimit[i] + 1e-8);
    expect(report.armWork[i]).toBeLessThanOrEqual(report.armWorkLimit[i] + 1e-8);
  }
}

function turning(side: number, explicitFacing: boolean, context: boolean) {
  const { a, b } = stage(side), world = new World([a.body, b.body]);
  world.time = 2;
  const original: Intent = { vel: { x: 0, y: side * 9 }, cutSkill: 1,
    ...(explicitFacing ? { facing: side * Math.PI / 2 } : {}) };
  const commands: Intent[] = [], contacts: StepReport['contacts'] = [];
  for (let k = 0; k < 16; k++) {
    const intents: Intent[] = [structuredClone(original), { vel: { x: 0, y: 0 } }];
    spaceTeammates([a, b], intents, (_a, other) => other,
      context ? { now: world.time } : undefined);
    commands.push(structuredClone(intents[0]));
    const report = world.step(intents, .05); bounded(report);
    contacts.push(...report.contacts);
    expect(a.body.support!.state).toBe('up');
    expect(b.body.support!.state).toBe('up');
  }
  return { commands, contacts, original, a, b };
}

describe('achievable teammate turning', () => {
  it.each([-1, 1])('gathers before the real curved contact in mirror %s', side => {
    const preview = vi.spyOn(MovementPreview, 'previewFreeMovement');
    try {
      const legacy = turning(side, false, false);
      expect(legacy.contacts.some(c => c.impulse > 0)).toBe(true);
      expect(preview).not.toHaveBeenCalled();
      const candidate = turning(side, false, true);
      const firstSpeed = Math.hypot(candidate.commands[0].vel.x, candidate.commands[0].vel.y);
      expect(firstSpeed).toBeGreaterThan(1);
      expect(firstSpeed).toBeLessThan(9);
      expect(candidate.commands.slice(1).some(c => c.vel.x === 0 && c.vel.y === side * 9)).toBe(true);
      expect(candidate.contacts).toHaveLength(0);
      expect(candidate.a.vel.y * side).toBeGreaterThan(1);
      expect(preview).toHaveBeenCalled();
    } finally { preview.mockRestore(); }
  });

  it.each([-1, 1])('preserves explicit body facing while gathering in mirror %s', side => {
    const candidate = turning(side, true, true);
    const firstSpeed = Math.hypot(candidate.commands[0].vel.x, candidate.commands[0].vel.y);
    expect(firstSpeed).toBeGreaterThan(1);
    expect(firstSpeed).toBeLessThan(9);
    expect(candidate.commands.every(c => c.facing === side * Math.PI / 2 && c.cutSkill === 1)).toBe(true);
    expect(candidate.contacts).toHaveLength(0);
    expect(candidate.commands.slice(1).some(c => c.vel.y === side * 9)).toBe(true);
  });

  it('uses the consumed delayed picture without changing bodies, memory or random streams', () => {
    const { sim, a, b } = stage();
    for (let k = 0; k < 24; k++) sim.perception.record(sim.agents);
    const run = () => {
      let actorReads = 0;
      const bodies = structuredClone([a.body, b.body]);
      const memory = structuredClone(sim.perception), random = structuredClone(sim.rng);
      const intents: Intent[] = [{ vel: { x: 0, y: 9 }, facing: Math.PI / 2 }, { vel: { x: 0, y: 0 } }];
      spaceTeammates([a, b], intents, (observer, target) => {
        if (observer === a && target === b) actorReads++;
        return sim.see(observer, target);
      }, { now: 2 });
      expect(actorReads).toBe(1);
      expect([a.body, b.body]).toEqual(bodies);
      expect(structuredClone(sim.perception)).toEqual(memory);
      expect(structuredClone(sim.rng)).toEqual(random);
      return intents[0];
    };
    const before = run();
    expect(Math.hypot(before.vel.x, before.vel.y)).toBeGreaterThan(1);
    expect(Math.hypot(before.vel.x, before.vel.y)).toBeLessThan(9);
    b.body.pos = { x: 15, y: 2 }; b.body.vel = { x: -7, y: 4 };
    expect(run()).toEqual(before);
  });

  it('does not choose a gather that creates a new conflict behind the observer', () => {
    const { sim, a, b } = stage(), rear = sim.slot('LB_W')!;
    rear.body.pos = { x: 49, y: CENTER_Y };
    rear.body.vel = { x: 9, y: 0 }; rear.body.facing = 0; rear.body.support = newSupport();
    const original: Intent = { vel: { x: 0, y: 9 } };
    for (const peers of [[b, rear], [rear, b]]) {
      const intents: Intent[] = [structuredClone(original), ...peers.map(p => ({ vel: { ...p.vel } }))];
      spaceTeammates([a, ...peers], intents, (_a, other) => other, { now: 2 });
      // Original turn clears the trailing picture; both a moving gather and
      // a stop let it cross the observer. Neither cures the forward conflict
      // by creating a new one behind the observer.
      expect(intents[0]).toEqual(original);
    }
  });

  it('keeps loaded actors out of the free preview and retains actual grip forces', () => {
    const { sim, a, b } = stage(), holder = sim.slot('RB')!;
    holder.body.pos = { x: 49.2, y: CENTER_Y }; holder.body.vel = { x: 0, y: 0 };
    holder.body.facing = 0; holder.body.support = newSupport();
    b.body.pos = { x: 56, y: CENTER_Y };
    const world = new World([a.body, b.body, holder.body]); world.time = 2;
    world.joints.push({ kind: 'grasp', a: holder.body, b: a.body,
      reach: 1.4, capacity: 350, legs: .4, hold: .8 });
    const constrained = new Set(world.joints.flatMap(j => [j.a, j.b]));
    const intents: Intent[] = [{ vel: { x: 9, y: 0 }, posture: .4 }, { vel: { x: 0, y: 0 } }];
    const preview = vi.spyOn(MovementPreview, 'previewFreeMovement');
    try {
      spaceTeammates([a, b], intents, (_a, other) => other, { now: 2, constrained });
      expect(preview).not.toHaveBeenCalled();
      expect(intents[0].vel.x).toBeLessThan(9);
      expect(intents[0].posture).toBe(.4);
      b.body.pos = { x: 54.3, y: CENTER_Y + 1.1 };
      const turn: Intent[] = [{ vel: { x: 0, y: 9 }, facing: Math.PI / 2, posture: .4 },
        { vel: { x: 0, y: 0 } }];
      spaceTeammates([a, b], turn, (_a, other) => other, { now: 2, constrained });
      expect(preview).not.toHaveBeenCalled();
      expect(turn[0]).toEqual({ vel: { x: 0, y: 9 }, facing: Math.PI / 2, posture: .4 });
    } finally { preview.mockRestore(); }
    const report = world.step([...intents, { vel: { x: 0, y: 0 } }], .05);
    bounded(report);
    expect(report.work.grasps).toBeLessThan(0);
    expect(world.joints).toHaveLength(1);
  });

  it.each(['requested', 'active'] as const)('preserves native shoulder-turn movement outside scope when squeeze is %s', kind => {
    function execute(context: boolean) {
      const { a, b } = stage(), world = new World([a.body, b.body]);
      world.time = 2;
      a.body.squeeze = kind === 'active' ? .8 : 0;
      a.body.squeezeHeading = 0;
      const requested: Intent = { vel: { x: 0, y: 9 }, facing: Math.PI / 2,
        squeeze: kind === 'requested' ? .8 : 0 };
      const frames = [];
      // A released active posture decays physically. Inspect only while it
      // remains active; once it clears the body may legitimately gather again.
      const steps = kind === 'active' ? 4 : 16;
      for (let k = 0; k < steps; k++) {
        const intents: Intent[] = [structuredClone(requested), { vel: { x: 0, y: 0 } }];
        spaceTeammates([a, b], intents, (_a, other) => other,
          context ? { now: world.time } : undefined);
        if (k === 0) expect(intents[0]).toEqual(requested);
        expect(intents[0].facing).toBe(requested.facing);
        expect(intents[0].squeeze).toBe(requested.squeeze);
        const report = world.step(intents, .05); bounded(report);
        expect(a.body.support!.state).toBe('up');
        frames.push({ command: structuredClone(intents[0]),
          bodies: structuredClone([a.body, b.body]), report: structuredClone(report) });
      }
      expect(a.body.squeeze).toBeGreaterThan(0);
      return frames;
    }
    const legacy = execute(false), preview = vi.spyOn(MovementPreview, 'previewFreeMovement');
    try {
      const current = execute(true);
      expect(preview).not.toHaveBeenCalled();
      // Preserve actual shape, support, motion and contact, including any
      // collisions; the scope guard does not award a successful squeeze.
      expect(current).toEqual(legacy);
    } finally { preview.mockRestore(); }
  });

  it('preserves fast straight, parallel and close passable lanes', () => {
    for (const kind of ['original straight', 'parallel', 'close passable'] as const) {
      const { a, b } = stage();
      if (kind === 'parallel') b.body.vel = { x: 9, y: 0 };
      if (kind === 'close passable') {
        a.body.vel = { x: 5, y: 0 }; b.body.pos = { x: 51, y: CENTER_Y + 1 };
      }
      const original: Intent = { vel: { ...a.vel } };
      const world = new World([a.body, b.body]); world.time = 2;
      const preview = vi.spyOn(MovementPreview, 'previewFreeMovement');
      try {
        for (let k = 0; k < 16; k++) {
          const intents: Intent[] = [structuredClone(original), { vel: { ...b.vel } }];
          spaceTeammates([a, b], intents, (_a, other) => other, { now: world.time });
          expect(intents[0]).toEqual(original);
          const report = world.step(intents, .05); bounded(report);
          expect(report.contacts).toHaveLength(0);
        }
        expect(preview).not.toHaveBeenCalled();
      } finally { preview.mockRestore(); }
      expect(a.pos.x).toBeGreaterThan(53);
    }
  });

  it('does not preview a material turn when observed traffic is outside attainable deflection', () => {
    for (const side of [-1, 1]) {
      const { a, b } = stage(side);
      b.body.pos = { x: 52, y: CENTER_Y + side * 4 };
      const world = new World([a.body, b.body]); world.time = 2;
      const original: Intent = { vel: { x: 0, y: side * 9 } };
      const preview = vi.spyOn(MovementPreview, 'previewFreeMovement');
      try {
        for (let k = 0; k < 16; k++) {
          const intents: Intent[] = [structuredClone(original), { vel: { x: 0, y: 0 } }];
          spaceTeammates([a, b], intents, (_a, other) => other, { now: world.time });
          expect(intents[0]).toEqual(original);
          const report = world.step(intents, .05); bounded(report);
          expect(report.contacts).toHaveLength(0);
          expect(a.body.support!.state).toBe('up');
        }
        expect(preview).not.toHaveBeenCalled();
      } finally { preview.mockRestore(); }
      expect(a.vel.y * side).toBeGreaterThan(1);
    }
  });

  it('still previews a matched request when support is recovering or an acquired peer crosses the travel line', () => {
    for (const kind of ['recovering', 'crossing'] as const) {
      const { a, b } = stage();
      if (kind === 'recovering') a.body.support!.xi.y = .1;
      const picture = { pos: { ...b.pos }, vel: { x: 0, y: kind === 'crossing' ? -2 : 0 } };
      const preview = vi.spyOn(MovementPreview, 'previewFreeMovement');
      try {
        const intents: Intent[] = [{ vel: { ...a.vel } }, { vel: { x: 0, y: 0 }, free: true }];
        const source = structuredClone(a.body);
        // Private peer motion stays still; only the supplied picture crosses.
        spaceTeammates([a, b], intents, () => picture, { now: 2 });
        expect(preview).toHaveBeenCalled();
        expect(a.body).toEqual(source);
      } finally { preview.mockRestore(); }
    }
  });

  it('still collides when a straight runner is already too close to stop', () => {
    const { a, b } = stage(); b.body.pos = { x: 51, y: CENTER_Y };
    const world = new World([a.body, b.body]); world.time = 2;
    const contacts: StepReport['contacts'] = [];
    for (let k = 0; k < 5; k++) {
      const intents: Intent[] = [{ vel: { x: 9, y: 0 } }, { vel: { x: 0, y: 0 } }];
      spaceTeammates([a, b], intents, (_a, other) => other, { now: world.time });
      const report = world.step(intents, .05); bounded(report); contacts.push(...report.contacts);
    }
    expect(contacts.some(c => c.impulse > 0 && Number.isFinite(c.impulse))).toBe(true);
  });
});
