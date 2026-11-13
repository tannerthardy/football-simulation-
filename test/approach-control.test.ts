import { describe, expect, it, vi } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { angleDiff } from '../src/core/vec.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { PASS_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { movingArrivalVelocity, type MoveCommand } from '../src/physics/kinematics.js';
import * as MovementPreview from '../src/physics/movement-preview.js';
import { newVirtualFoot } from '../src/physics/virtual-foot.js';
import { World, type Intent } from '../src/physics/world.js';
import { chooseApproach } from '../src/sim/approach-control.js';
import type { Engagement } from '../src/sim/agent.js';
import { blendApproach, chase, pursuitPoint, runThrough } from '../src/sim/behaviors/common.js';
import type { Perceived } from '../src/sim/perception.js';
import { PlaySim } from '../src/sim/playsim.js';

function stage(side = 1) {
  const sim = new PlaySim({ offense: pickOffense(generateTeam(new Rng(19), 'O', 'OFF'), '11'),
    defense: pickDefense(generateTeam(new Rng(20), 'D', 'DEF'), 'nickel'),
    offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: false, kind: 'pass',
      pass: PASS_BY_ID.four_verts, label: 'lab' },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3,
      pressure: null, label: 'lab' }, los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 19 });
  const c = sim.slot('Z')!, d = sim.slot('FS')!;
  c.body.pos = { x: 50, y: CENTER_Y }; c.body.vel = { x: 6, y: 0 }; c.body.facing = 0;
  d.body.pos = { x: 53, y: CENTER_Y + side * 6 };
  d.body.vel = { x: 6, y: -side * 6 }; d.body.facing = Math.atan2(d.vel.y, d.vel.x);
  sim.ball = { kind: 'held', carrier: c }; sim.catchAt = 0;
  const world = new World([c.body, d.body], { substeps: 12 });
  for (let k = 0; k < 24; k++) sim.perception.record(sim.agents);
  const seen: Perceived = { pos: { ...c.pos }, vel: { ...c.vel }, facing: 0, stance: null };
  const contact = c.profile.radius + d.profile.radius + d.profile.reach * .65;
  const original: MoveCommand = { vel: { x: 4.5, y: -side * 8.6 }, effort: 1 };
  return { sim, c, d, world, seen, contact, original };
}

describe('gathering opens the body toward the acquired near hip', () => {
  it.each([-1, 1])('turns toward the hip through the partial gather, side %s', side => {
    const far: MoveCommand = { vel: { x: 6, y: 0 }, facing: 0 };
    const near: MoveCommand = { vel: { x: 3, y: side * 2 }, facing: side * Math.PI / 3 };
    const command = blendApproach(far, near, .5);
    expect(angleDiff(far.facing!, command.facing!)).toBeCloseTo(side * Math.PI / 6, 12);
    expect(Math.abs(angleDiff(command.facing!, near.facing!)))
      .toBeLessThan(Math.abs(angleDiff(far.facing!, near.facing!)));
    // Body response stays force-limited; the controller cannot teleport a turn.
    const { d, c, world } = stage(side);
    d.body.facing = 0; d.body.vel = { x: 6, y: 0 };
    const report = world.step([{ vel: { ...c.vel }, facing: 0 }, command], .05);
    expect(d.body.facing * side).toBeGreaterThan(0);
    expect(Math.abs(d.body.facing)).toBeLessThan(Math.abs(command.facing!));
    expect(Math.abs(report.work.residual)).toBeLessThan(1e-8);
    expect(report.contacts).toHaveLength(0);
  });

  it('takes the short turn across the angle boundary and reaches the near-facing endpoint', () => {
    const far: MoveCommand = { vel: { x: -6, y: .2 }, facing: Math.PI - .2 };
    const near: MoveCommand = { vel: { x: -3, y: -.2 }, facing: -Math.PI + .2 };
    const halfway = blendApproach(far, near, .5);
    expect(angleDiff(far.facing!, halfway.facing!)).toBeCloseTo(.2, 12);
    expect(angleDiff(blendApproach(far, near, 1).facing!, near.facing!)).toBeCloseTo(0, 12);
    expect(blendApproach(far, near, 0)).toBe(far);
  });
});

describe('physics-limited approach shortlist', () => {
  it('keeps an ordinary sprint when a faster carrier is pulling away', () => {
    const { d, seen, contact, original } = stage();
    d.body.pos = { x: 47, y: CENTER_Y + 2 }; d.body.vel = { x: 4, y: 0 };
    seen.vel = { x: 8, y: 0 };
    expect(chooseApproach(d, seen, contact, 0, original, 0)).toBe(original);
  });

  it('does not replace a stationary player\'s initial pursuit command', () => {
    const { d, seen, contact, original } = stage();
    d.body.vel = { x: 0, y: 0 };
    expect(chooseApproach(d, seen, contact, 0, original, 0)).toBe(original);
  });

  it('preserves a distant interception even when an arrival command slightly improves short-forecast separation', () => {
    const { d, contact } = stage();
    // Ordinary fast-running state from the distant CB interception witness.
    // The short forecast is informative about a next plant, not the eventual
    // interception several running steps beyond it.
    d.body.pos = { x: 49.510734, y: 29.468287 };
    d.body.vel = { x: 2.202906, y: 8.268672 };
    d.body.facing = 1.031883; d.body.energy = .943295;
    const seen: Perceived = { pos: { x: 45.473419, y: 38.395648 },
      vel: { x: 5.473845, y: 4.640428 }, facing: .7, stance: null };
    const original: MoveCommand = { vel: { x: 5.555, y: 8.436 } };
    const dx = seen.pos.x - d.pos.x, dy = seen.pos.y - d.pos.y, distance = Math.hypot(dx, dy);
    const ux = dx / distance, uy = dy / distance;
    const rvx = d.vel.x - seen.vel.x, rvy = d.vel.y - seen.vel.y;
    // Verify that this reaches the predictive guard rather than an earlier
    // stationary, separating, near-strike, or cheap-distance exclusion.
    expect(distance).toBeGreaterThan(contact + .5);
    expect(distance).toBeLessThan(contact + (d.speed + Math.hypot(seen.vel.x, seen.vel.y)) * .6);
    expect(rvx * ux + rvy * uy).toBeGreaterThan(0);
    expect(Math.abs(-rvx * uy + rvy * ux)).toBeGreaterThan(1);
    const cutSkill = .85 + .35 * d.r('tackling');
    const arrival: Intent = { vel: movingArrivalVelocity(d.body, seen.pos, seen.vel,
      d.profile.vmax * d.speedScale, contact, 2.5 + 2 * (1 - d.r('tackling')), cutSkill),
      cutSkill, posture: .4 + .25 * d.r('tackling') };
    function closest(command: MoveCommand) {
      let minimum = distance;
      let px = d.pos.x - seen.pos.x, py = d.pos.y - seen.pos.y;
      for (const p of MovementPreview.previewFreeMovement(d.body, command, 0, 12)) {
        const rx = p.pos.x - seen.pos.x - seen.vel.x * p.t;
        const ry = p.pos.y - seen.pos.y - seen.vel.y * p.t;
        const ex = rx - px, ey = ry - py;
        const t = Math.max(0, Math.min(1, -(px * ex + py * ey) / Math.max(1e-12, ex * ex + ey * ey)));
        minimum = Math.min(minimum, Math.hypot(px + t * ex, py + t * ey));
        px = rx; py = ry;
      }
      return minimum;
    }
    const ordinaryDistance = closest(original), arrivalDistance = closest(arrival);
    expect(ordinaryDistance).toBeGreaterThan(contact + 2.5);
    expect(arrivalDistance).toBeLessThan(ordinaryDistance);
    expect(arrivalDistance).toBeGreaterThan(contact + 2.5);
    const preview = vi.spyOn(MovementPreview, 'previewFreeMovement');
    try {
      expect(chooseApproach(d, seen, contact, 0, original, 0)).toBe(original);
      // One ordinary-path forecast establishes that no close approach is
      // imminent. Do not spend two more forecasts comparing distant plans.
      expect(preview).toHaveBeenCalledTimes(1);
    } finally { preview.mockRestore(); }
  });

  it('respects a scenario override that parks an otherwise upright body', () => {
    const { d, seen, contact, original } = stage();
    d.downUntil = 4;
    expect(chooseApproach(d, seen, contact, 0, original, 2)).toBe(original);
  });

  it('leaves the close strike approach to the existing tackle policy', () => {
    const { d, seen, contact, original } = stage();
    d.body.pos = { x: seen.pos.x, y: seen.pos.y + contact + .25 };
    expect(chooseApproach(d, seen, contact, 0, original, 0)).toBe(original);
  });

  it.each(['engaged', 'falling', 'down', 'rising', 'held support', 'strike', 'lean', 'load'] as const)(
    'does not forecast unconstrained movement for a body with %s', (constraint) => {
      const { d, seen, contact, original } = stage();
      const s = d.body.support!;
      if (constraint === 'engaged') d.engagement = {} as Engagement; // Only ownership is relevant to this gate.
      else if (constraint === 'falling' || constraint === 'down' || constraint === 'rising') s.state = constraint;
      else if (constraint === 'held support') s.foot = newVirtualFoot(d.pos);
      else if (constraint === 'strike') s.strike = { x: .5, y: -.2 };
      else if (constraint === 'lean') s.lean = { x: 20, y: 0 };
      else s.load = { x: 10, y: -5 };
      expect(chooseApproach(d, seen, contact, 0, original, 0)).toBe(original);
    });

  it('respects tackle-bond ownership before support registers a force or held foot', () => {
    const { sim, c, d } = stage();
    const freeCommand = chase(sim, d, c);
    // Inject only the ownership record at an otherwise preview-eligible
    // state. This checks controller exclusion; it does not invent a long
    // arm joint or claim this geometry can establish a real tackle grip.
    sim.bond = { carrier: c, tacklers: [d], start: sim.t, progressX: c.pos.x, down: false };
    expect(d.body.support!.foot).toBeUndefined();
    expect(d.body.support!.load).toEqual({ x: 0, y: 0 });
    const ordinary = { ...runThrough(d, pursuitPoint(sim, d, c), { speed: 1 }), effort: 1 };
    expect(chase(sim, d, c)).toEqual(ordinary);
    expect(freeCommand).not.toEqual(ordinary);
  });

  it('uses the same delayed observation after an unseen target change, with no body mutation or new random draws', () => {
    const { sim, c, d } = stage();
    // The existing pursuit bias draws from its named child stream once. Warm
    // that established policy before checking the deterministic new shortlist.
    chase(sim, d, c);
    const bodies = sim.agents.map((a) => structuredClone(a.body));
    const perception = structuredClone(sim.perception);
    const random = vi.spyOn(Rng.prototype, 'nextU32');
    try {
      const before = chase(sim, d, c);
      expect(sim.agents.map((a) => structuredClone(a.body))).toEqual(bodies);
      c.body.pos = { x: 80, y: 5 }; c.body.vel = { x: 0, y: -8 }; c.body.facing = -Math.PI / 2;
      expect(chase(sim, d, c)).toEqual(before);
      expect(structuredClone(d.body)).toEqual(bodies[d.idx]);
      expect(structuredClone(sim.perception)).toEqual(perception);
      expect(random).not.toHaveBeenCalled();
    } finally { random.mockRestore(); }
  });

  it('mirrors the diagnosed crossing approach and makes body contact through the ordinary two-body World', () => {
    const rows = [-1, 1].map((side) => {
      const { sim, c, d, world } = stage(side);
      const first = chase(sim, d, c);
      let contactAt: number | null = null;
      for (let k = 0; k < 60 && contactAt === null; k++) {
        sim.perception.record(sim.agents);
        const command = chase(sim, d, c);
        const report = world.step([{ vel: { x: 6, y: 0 }, facing: 0 }, command], .05);
        sim.t += .05;
        if (report.contacts.length) contactAt = sim.t;
      }
      return { first, contactAt, c: structuredClone(c.body), d: structuredClone(d.body) };
    });
    expect(rows[0].contactAt).not.toBeNull(); expect(rows[1].contactAt).not.toBeNull();
    expect(rows[0].contactAt).toBeCloseTo(rows[1].contactAt!, 10);
    expect(rows[0].first.vel.x).toBeCloseTo(rows[1].first.vel.x, 10);
    expect(rows[0].first.vel.y).toBeCloseTo(-rows[1].first.vel.y, 10);
    for (const which of ['c', 'd'] as const) {
      expect(rows[0][which].pos.x).toBeCloseTo(rows[1][which].pos.x, 9);
      expect(rows[0][which].pos.y - CENTER_Y).toBeCloseTo(CENTER_Y - rows[1][which].pos.y, 9);
      expect(rows[0][which].vel.x).toBeCloseTo(rows[1][which].vel.x, 9);
      expect(rows[0][which].vel.y).toBeCloseTo(-rows[1][which].vel.y, 9);
    }
    // No tackle rolls, grip-quality bonuses, evasion, or assignment overrides
    // are involved. This proves executable geometry for this specific probe,
    // not a guaranteed tackle or a calibrated NFL contact rate.
  });
});
