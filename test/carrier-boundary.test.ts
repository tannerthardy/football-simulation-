import { describe, expect, it, vi } from 'vitest';
vi.hoisted(() => { process.env.SIGHT_PURE = '0'; }); // engine-72: fixture recorded on the query-order picture, before the per-pair sight history; the lane that owns it re-records with SIGHT_PURE on (docs/reviews/2026-11-16-pin-delta-engine72.md)
import { FIELD_WIDTH } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { PASS_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { BallCarrier } from '../src/sim/behaviors/carrier.js';
import { stand } from '../src/sim/behaviors/common.js';
import { PlaySim } from '../src/sim/playsim.js';

const home = generateTeam(new Rng(7), 'Home', 'HOM');
const away = generateTeam(new Rng(19), 'Away', 'AWY');
function scenario(mirror = false, room = 5.5, outward = 8) {
  const sim = new PlaySim({ offense: pickOffense(home, '11'), defense: pickDefense(away, 'nickel'), seed: 1,
    offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: false, kind: 'pass', pass: PASS_BY_ID.four_verts, label: '' },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: '' },
    los: 40, ballY: 26, firstDownX: 45, down: 3 });
  for (const a of sim.agents) {
    a.downUntil = Infinity; a.body.pos = { x: 10, y: 1 + a.idx * 2 }; a.body.vel = { x: 0, y: 0 };
    a.behavior = { kind: 'parked', update: () => stand() };
  }
  const runner = sim.slot('X')!, inward = mirror ? -1 : 1;
  runner.downUntil = 0; runner.body.pos = { x: 48, y: mirror ? FIELD_WIDTH - room : room };
  runner.body.vel = { x: 3.7, y: -inward * outward }; runner.body.facing = Math.atan2(runner.vel.y, runner.vel.x);
  runner.behavior = new BallCarrier({}, runner);
  sim.ball = { kind: 'held', carrier: runner }; sim.crossedLOS = true;
  for (let i = 0; i < 24; i++) sim.perception.record(sim.agents);
  return { sim, runner, inward };
}

describe('carrier boundary braking through actual movement', () => {
  it.each([false, true])('finishes a recoverable redirect in open space, mirror=%s', mirror => {
    const { sim, runner, inward } = scenario(mirror);
    let minimumRoom = 5.5, steps = 0;
    while (runner.vel.y * inward < 0 && sim.phase === 'live' && steps++ < 60) {
      const previous = { ...runner.pos }, before = { ...runner.vel };
      const command = runner.behavior.update(runner, sim);
      // Cancellation has priority over more downfield propulsion. Neither
      // position nor velocity is overwritten: World executes every step.
      expect(command.vel.x).toBeCloseTo(before.x, 12);
      expect(command.vel.y * inward).toBeGreaterThan(0);
      const intents = sim.agents.map(a => a === runner ? command : stand());
      sim.world.step(intents, sim.dt); sim.t += sim.dt;
      const room = Math.min(runner.pos.y, FIELD_WIDTH - runner.pos.y);
      minimumRoom = Math.min(minimumRoom, room);
      expect(Math.hypot(runner.pos.x - previous.x, runner.pos.y - previous.y)).toBeLessThan(.6);
    }
    expect(steps).toBeLessThan(60);
    expect(minimumRoom).toBeGreaterThan(.25);
    expect(runner.vel.y * inward).toBeGreaterThanOrEqual(0);
    expect(runner.tags.has('chose-sideline')).toBe(false);
    expect(sim.world.joints).toHaveLength(0);
  });

  it.each([false, true])('does not manufacture a save when momentum cannot be stopped, mirror=%s', mirror => {
    const { sim, runner, inward } = scenario(mirror, .1, 8);
    const before = { ...runner.vel }, command = runner.behavior.update(runner, sim);
    expect(command.vel.y * inward).toBeGreaterThan(0);
    expect(runner.vel).toEqual(before);
    sim.world.step(sim.agents.map(a => a === runner ? command : stand()), sim.dt);
    expect(runner.pos.y * inward).toBeLessThan(mirror ? -FIELD_WIDTH : 0);
    expect(runner.vel.y * inward).toBeLessThan(0);
  });

  it.each([false, true])('still permits a deliberate exit when an imminent hit makes it worthwhile, mirror=%s', mirror => {
    const { sim, runner, inward } = scenario(mirror, .75, 8);
    expect(runner.behavior.update(runner, sim).vel.y * inward).toBeGreaterThan(0);
    runner.body.vel = { x: 6, y: -inward }; runner.body.facing = 0;
    sim.t = .2;
    const defender = sim.slot('LB_M')!;
    defender.downUntil = 0; defender.body.pos = { x: runner.pos.x + 2, y: runner.pos.y + inward };
    defender.body.vel = { x: -5, y: -inward * 2 };
    for (let i = 0; i < 24; i++) sim.perception.record(sim.agents);
    const cmd = runner.behavior.update(runner, sim);
    expect(runner.tags.has('chose-sideline')).toBe(true);
    expect(cmd.vel.y * inward).toBeLessThan(0);
    expect(sim.phase).toBe('live');
    expect(sim.outcome).toBeNull();
  });
});
