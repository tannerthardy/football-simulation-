import { describe, expect, it } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { PASS_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { chase, pursuitPoint } from '../src/sim/behaviors/common.js';
import { PlaySim } from '../src/sim/playsim.js';

type Duty = 'force' | 'edge-box' | 'alley';
function stage(side: number, duty: Duty = 'force') {
  const sim = new PlaySim({
    offense: pickOffense(generateTeam(new Rng(19), 'O', 'OFF'), '11'),
    defense: pickDefense(generateTeam(new Rng(20), 'D', 'DEF'), 'nickel'),
    offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: false, kind: 'pass',
      pass: PASS_BY_ID.four_verts, label: 'installed pursuit shoulder' },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3,
      pressure: null, label: 'installed pursuit shoulder' },
    los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 83,
  });
  const carrier = sim.slot('Z')!, defender = sim.slot('FS')!;
  sim.t = sim.world.time = 2;
  carrier.body.pos = { x: 50, y: CENTER_Y };
  carrier.body.vel = { x: 6, y: 0 }; carrier.body.facing = 0;
  defender.body.pos = { x: 54, y: CENTER_Y + side * 2 };
  defender.body.vel = { x: 0, y: 0 };
  defender.body.facing = Math.atan2(-side * 2, -4);
  defender.runFit = { kind: duty === 'edge-box' ? 'edge' : duty,
    side, gap: 'D', technique: 'attack', edge: 'box', pace: 'stack' };
  sim.ball = { kind: 'held', carrier }; sim.catchAt = 0;
  return { sim, carrier, defender, side };
}

type Fixture = ReturnType<typeof stage>;
function observe(f: Fixture) {
  // Straight incoming observations end at the staged pose. Repeating one
  // moving pose would make delayed dead reckoning overshoot this boundary.
  for (let k = 0; k < 24; k++) {
    const lag = (23 - k) * f.sim.dt;
    f.sim.perception.record(f.sim.agents.map(a => ({
      pos: { x: a.pos.x - a.vel.x * lag, y: a.pos.y - a.vel.y * lag },
      vel: a.vel, facing: a.facing, stance: a.stance, pose: a.pose,
    })), f.carrier.idx);
  }
}

describe('installed outside pursuit remains meaningful at midfield', () => {
  it.each((['force', 'edge-box'] as const).flatMap(duty => [-1, 1].map(side => ({ duty, side })) ))(
    'keeps the installed $duty shoulder on side $side before closing to tackle reach', ({ duty, side }) => {
      const f = stage(side, duty); observe(f);
      const point = pursuitPoint(f.sim, f.defender, f.carrier);
      // The installed side is unambiguous even where field-middle "inside"
      // is not. This assertion does not prescribe a tackle or exact margin.
      expect(side * (point.y - f.carrier.pos.y)).toBeGreaterThan(0);
    });

  it.each([-1, 1])('keeps a complementary force request while the alley closes inside, side=%s', side => {
    const f = stage(side); observe(f);
    const outside = chase(f.sim, f.defender, f.carrier);
    f.defender.runFit!.kind = 'alley';
    const inside = chase(f.sim, f.defender, f.carrier);
    // Identical body, picture and pursuit error: outside support closes less
    // eagerly across the runner than the complementary inside pursuer.
    expect(side * (outside.vel.y - inside.vel.y)).toBeGreaterThan(0);
  });

  it('preserves the generic midpoint and mirrored pursuit requests', () => {
    const rows = [-1, 1].map(side => {
      const f = stage(side, 'alley'); observe(f);
      const point = pursuitPoint(f.sim, f.defender, f.carrier);
      expect(point.y).toBeCloseTo(CENTER_Y, 10);
      return chase(f.sim, f.defender, f.carrier);
    });
    expect(rows[0].vel.x).toBeCloseTo(rows[1].vel.x, 10);
    expect(rows[0].vel.y).toBeCloseTo(-rows[1].vel.y, 10);
  });

  it.each(['force', 'edge-box'] as const)('closes a $duty shoulder onto the near hip at contact', duty => {
    for (const side of [-1, 1]) {
      const f = stage(side, duty);
      f.defender.body.pos = { x: 50, y: CENTER_Y + side * .7 };
      f.defender.body.vel = { x: 6, y: 0 }; observe(f);
      const point = pursuitPoint(f.sim, f.defender, f.carrier);
      expect(Math.abs(point.y - f.carrier.pos.y)).toBeLessThan(f.defender.profile.radius);
    }
  });

  it.each(['force', 'edge-box'] as const)('uses acquired motion for $duty until another picture is acquired', duty => {
    const f = stage(1, duty); observe(f);
    const point = pursuitPoint(f.sim, f.defender, f.carrier);
    const command = chase(f.sim, f.defender, f.carrier);
    f.carrier.body.pos = { x: 60, y: CENTER_Y + 6 };
    f.carrier.body.vel = { x: 0, y: 4 }; f.carrier.body.facing = Math.PI / 2;
    expect(pursuitPoint(f.sim, f.defender, f.carrier)).toEqual(point);
    expect(chase(f.sim, f.defender, f.carrier)).toEqual(command);
    observe(f);
    expect(pursuitPoint(f.sim, f.defender, f.carrier)).not.toEqual(point);
    // The target identity is held throughout; this does not certify callers'
    // private carrier-selection gates or newly inferred teammate assistance.
  });
});
