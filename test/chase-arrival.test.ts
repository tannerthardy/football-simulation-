import { describe, expect, it, vi } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import * as MovementPreview from '../src/physics/movement-preview.js';
import { criticalDeviation, newSupport, supportParams } from '../src/physics/support.js';
import { newVirtualFoot } from '../src/physics/virtual-foot.js';
import { World } from '../src/physics/world.js';
import { PASS_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { chase } from '../src/sim/behaviors/common.js';
import { PlaySim } from '../src/sim/playsim.js';

function stage(side = 1) {
  const sim = new PlaySim({ offense: pickOffense(generateTeam(new Rng(19), 'O', 'OFF'), '11'),
    defense: pickDefense(generateTeam(new Rng(20), 'D', 'DEF'), 'nickel'),
    offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: false, kind: 'pass',
      pass: PASS_BY_ID.four_verts, label: 'arrival control' },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3,
      pressure: null, label: 'arrival control' }, los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 83 });
  const carrier = sim.slot('Z')!, defender = sim.slot('FS')!;
  sim.t = sim.world.time = 2;
  carrier.body.pos = { x: 50, y: CENTER_Y }; carrier.body.vel = { x: 6, y: 0 };
  carrier.body.facing = 0; carrier.body.support = newSupport();
  defender.body.pos = { x: 54, y: CENTER_Y }; defender.body.vel = { x: 0, y: 0 };
  defender.body.facing = Math.PI; defender.body.support = newSupport();
  defender.runFit = { kind: 'alley', side, gap: 'D', technique: 'attack', edge: 'box', pace: 'stack' };
  return { sim, carrier, defender, side };
}

type Fixture = ReturnType<typeof stage>;
// A consistent constant-velocity past, rather than 24 identical positions
// which dead-reckoning would incorrectly move ahead of the fixture's present.
function observe(f: Fixture) {
  for (let k = 0; k < 24; k++) {
    const lag = (23 - k) * f.sim.dt;
    f.sim.perception.record(f.sim.agents.map(a => ({
      pos: { x: a.pos.x - a.vel.x * lag, y: a.pos.y - a.vel.y * lag },
      vel: a.vel, facing: a.facing, stance: a.stance, pose: a.pose,
    })));
  }
}

function execute(f: Fixture, ticks = 16) {
  const world = new World([f.defender.body, f.carrier.body]);
  world.time = f.sim.t;
  const carrierVelocity = { ...f.carrier.vel };
  let contactAt: number | null = null;
  let residual = 0;
  const positions: { x: number; y: number }[] = [];
  for (let k = 0; k < ticks; k++) {
    const report = world.step([chase(f.sim, f.defender, f.carrier),
      { vel: carrierVelocity, facing: Math.atan2(carrierVelocity.y, carrierVelocity.x) }], f.sim.dt);
    f.sim.t += f.sim.dt; f.sim.perception.record(f.sim.agents);
    positions.push({ ...f.defender.pos });
    if (report.contacts.length && contactAt === null) contactAt = (k + 1) * f.sim.dt;
    residual = Math.max(residual, Math.abs(report.work.residual));
  }
  return { positions, contactAt, residual };
}

describe('one attainable pursuit arrival policy', () => {
  it.each([-1, 1])('does not change command or achieved path abruptly at a tiny heading change, side=%s', side => {
    const fixtures = [.6999, .7001].map(ratio => {
      const f = stage(side); f.defender.body.pos.x = 56;
      f.carrier.body.vel = { x: 6 * ratio, y: side * 6 * Math.sqrt(1 - ratio * ratio) };
      observe(f); return f;
    });
    const commands = fixtures.map(f => chase(f.sim, f.defender, f.carrier));
    expect(Math.hypot(commands[0].vel.x - commands[1].vel.x,
      commands[0].vel.y - commands[1].vel.y)).toBeLessThan(.02);
    const paths = fixtures.map(f => execute(f));
    for (let k = 0; k < paths[0].positions.length; k++) {
      expect(Math.hypot(paths[0].positions[k].x - paths[1].positions[k].x,
        paths[0].positions[k].y - paths[1].positions[k].y)).toBeLessThan(.03);
    }
    // These oblique runners still escape body contact in this short window;
    // smooth control is not a guaranteed tackle or extra physical capacity.
    expect(paths[0].contactAt).toBeNull(); expect(paths[1].contactAt).toBeNull();
  });

  it('runs the distant oblique interception rather than gathering on radial incoming speed alone', () => {
    const f = stage(); f.defender.body.pos = { x: 55, y: CENTER_Y + 4 };
    f.carrier.body.vel = { x: 8, y: 0 }; observe(f);
    const command = chase(f.sim, f.defender, f.carrier);
    expect(Math.hypot(command.vel.x, command.vel.y)).toBeGreaterThan(f.defender.profile.vmax * .9);
    expect(command.vel.y).toBeLessThan(-1);
  });

  it('approaches complementary force and alley shoulders without favoring a field side', () => {
    const rows = [-1, 1].map(side => ['force', 'alley'].map(kind => {
      const f = stage(side);
      f.carrier.body.pos.y = CENTER_Y + side * 12;
      f.defender.body.pos.y = f.carrier.pos.y + side * 1.5;
      f.defender.body.facing = Math.atan2(f.carrier.pos.y - f.defender.pos.y, -4);
      f.defender.runFit!.kind = kind as 'force' | 'alley'; observe(f);
      return chase(f.sim, f.defender, f.carrier);
    }));
    for (let k = 0; k < 2; k++) {
      expect(rows[0][k].vel.x).toBeCloseTo(rows[1][k].vel.x, 10);
      expect(rows[0][k].vel.y).toBeCloseTo(-rows[1][k].vel.y, 10);
    }
    // From the outside, force retains that shoulder longer while alley
    // closes harder inside-out. A permanent two-yard offset is not required.
    expect(rows[1][0].vel.y).toBeGreaterThan(rows[1][1].vel.y);
    expect(Math.abs(rows[1][0].vel.y - rows[1][1].vel.y)).toBeGreaterThan(.1);
  });

  it('uses the fatigued body budget without changing the profile or requiring a passive frontal retreat', () => {
    const fresh = stage(), tired = stage(); tired.defender.body.energy = .35;
    observe(fresh); observe(tired);
    const profile = structuredClone(tired.defender.profile);
    const a = chase(fresh.sim, fresh.defender, fresh.carrier);
    const b = chase(tired.sim, tired.defender, tired.carrier);
    expect(b.vel.x).toBeLessThan(0); // Still attacks the approaching near hip.
    expect(Math.hypot(b.vel.x, b.vel.y)).toBeLessThan(Math.hypot(a.vel.x, a.vel.y));
    expect(tired.defender.profile).toEqual(profile);
  });

  it('uses actual recovering support when planning frontal closure', () => {
    const balanced = stage(), recovering = stage(), s = recovering.defender.body.support!;
    const critical = criticalDeviation(supportParams(recovering.defender.profile), s.posture, 0, 1);
    s.xi = { x: critical * .8, y: 0 }; s.out = .04;
    observe(balanced); observe(recovering);
    const first = chase(balanced.sim, balanced.defender, balanced.carrier);
    const limited = chase(recovering.sim, recovering.defender, recovering.carrier);
    expect(Math.hypot(limited.vel.x, limited.vel.y)).toBeLessThan(Math.hypot(first.vel.x, first.vel.y));
    expect(limited.vel.x).toBeLessThan(0);
  });

  it('preserves sprint urgency when a faster runner is escaping', () => {
    const f = stage(); f.defender.body.pos.x = 46; f.defender.body.vel = { x: 6, y: 0 };
    f.defender.body.facing = 0; f.carrier.body.vel = { x: 8, y: 0 }; observe(f);
    const command = chase(f.sim, f.defender, f.carrier);
    expect(command.vel.x).toBeGreaterThan(f.defender.profile.vmax * .9);
    expect(Math.abs(command.vel.y)).toBeLessThan(.1);
    expect(execute(f).contactAt).toBeNull();
  });

  it('keeps a normal frontal drive physically executable with unchanged work accounting', () => {
    const f = stage(); observe(f);
    const before = f.defender.vel.x;
    const command = chase(f.sim, f.defender, f.carrier);
    expect(command.vel.x).toBeLessThan(0); expect(f.defender.vel.x).toBe(before);
    const result = execute(f);
    expect(result.contactAt).not.toBeNull();
    expect(result.contactAt!).toBeGreaterThan(.2); // No immediate teleport/contact.
    expect(result.residual).toBeLessThan(1e-7);
  });

  it('ignores unseen live motion and preserves bodies, perception, and random streams after policy initialization', () => {
    const f = stage(); f.defender.body.pos.x = 56;
    f.carrier.body.vel = { x: 4.2, y: 4.3 }; observe(f);
    chase(f.sim, f.defender, f.carrier); // Existing stable per-play pursuit bias.
    const bodies = structuredClone(f.sim.agents.map(a => a.body));
    const buffer = structuredClone(f.sim.perception);
    const rng = JSON.stringify(f.sim.rng), mind = JSON.stringify(f.defender.mind);
    const draw = vi.spyOn(Rng.prototype, 'nextU32');
    try {
      const before = chase(f.sim, f.defender, f.carrier);
      expect(f.sim.agents.map(a => a.body)).toEqual(bodies);
      f.carrier.body.pos = { x: 75, y: 4 }; f.carrier.body.vel = { x: -8, y: 0 };
      f.carrier.body.facing = Math.PI;
      expect(chase(f.sim, f.defender, f.carrier)).toEqual(before);
      expect(f.defender.body).toEqual(bodies[f.defender.idx]);
      expect(structuredClone(f.sim.perception)).toEqual(buffer);
      expect(JSON.stringify(f.sim.rng)).toBe(rng); expect(JSON.stringify(f.defender.mind)).toBe(mind);
      expect(draw).not.toHaveBeenCalled();
    } finally { draw.mockRestore(); }
  });

  it.each(['foot', 'load'] as const)('does not forecast free movement while support has an actual %s constraint', kind => {
    const f = stage(); f.defender.body.pos = { x: 54, y: CENTER_Y - 3 };
    f.defender.body.vel = { x: -7, y: 0 }; f.carrier.body.vel = { x: 2, y: 6 };
    const s = f.defender.body.support!;
    if (kind === 'foot') s.foot = newVirtualFoot(f.defender.pos);
    else s.load = { x: 10, y: -5 };
    observe(f);
    const preview = vi.spyOn(MovementPreview, 'previewFreeMovement');
    try {
      const command = chase(f.sim, f.defender, f.carrier);
      expect(Number.isFinite(command.vel.x + command.vel.y)).toBe(true);
      expect(preview).not.toHaveBeenCalled();
    } finally { preview.mockRestore(); }
  });

  it('respects pending grip ownership even before its physical load is registered', () => {
    const f = stage(); observe(f);
    // Ownership-only fixture, before registering a joint/load. It establishes
    // the controller exclusion, not the physical reach of a four-yard grip.
    f.sim.bond = { carrier: f.carrier, tacklers: [f.defender], start: f.sim.t,
      progressX: f.carrier.pos.x, down: false };
    expect(f.defender.body.support!.load).toEqual({ x: 0, y: 0 });
    const preview = vi.spyOn(MovementPreview, 'previewFreeMovement');
    try {
      const command = chase(f.sim, f.defender, f.carrier);
      expect(Math.hypot(command.vel.x, command.vel.y)).toBeGreaterThan(f.defender.profile.vmax * .9);
      expect(preview).not.toHaveBeenCalled();
    } finally { preview.mockRestore(); }
  });
});
