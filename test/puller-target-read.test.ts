import { afterEach, describe, expect, it, vi } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { RUN_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { World } from '../src/physics/world.js';
import { cornerSpeed } from '../src/physics/kinematics.js';
import { RunBlocker, pullTurnRadius } from '../src/sim/behaviors/blocking.js';
import { goTo } from '../src/sim/behaviors/common.js';
import type { Perceived } from '../src/sim/perception.js';
import { PlaySim } from '../src/sim/playsim.js';

const formation = FORMATION_BY_ID.ace_11;
const offense = generateTeam(new Rng(31), 'O', 'O', { strength: .55 });
const defense = generateTeam(new Rng(32), 'D', 'D', { strength: .55 });

function stage(side = 1, role: 'kick' | 'trap' = 'kick') {
  const sim = new PlaySim({ offense: pickOffense(offense, formation.personnel), defense: pickDefense(defense, 'base43'),
    offCall: { formation, flip: side < 0, kind: 'run', run: RUN_BY_ID.counter, label: 'Counter' },
    defCall: { personnel: 'base43', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'Over' },
    los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 3 });
  const blocker = sim.slot('RG')!, target = sim.slot('DE_W')!;
  for (const a of sim.offense) if (a !== blocker && a.behavior instanceof RunBlocker) {
    a.body.pos.x = 40.5;
    if (a.behavior.plan.kind === 'pull') a.behavior.plan.kind = 'climb';
  }
  blocker.body.pos = { x: 38.8, y: CENTER_Y };
  blocker.body.vel = { x: 0, y: side * 2 };
  target.body.pos = { x: 38, y: CENTER_Y + side * 3 };
  target.body.vel = { x: -3, y: 0 };
  const path = [{ x: 38.75, y: CENTER_Y }, { x: 38.85, y: CENTER_Y + side * 4 },
    { x: 39.9, y: CENTER_Y + side * 4.2 }];
  const behavior = new RunBlocker({ kind: 'pull', pullRole: role, target,
    drive: { x: .3, y: side }, pullPath: path });
  blocker.behavior = behavior;
  sim.t = .5; sim.world.time = .5;
  for (let k = 0; k < 24; k++) sim.perception.record(sim.agents);
  return { sim, blocker, target, behavior, path };
}

afterEach(() => vi.restoreAllMocks());

describe('a puller reads the moving target after clearing the wall', () => {
  it.each(['kick', 'trap'] as const)('fits a visible penetrating %s target before completing stale waypoints', role => {
    const f = stage(1, role), before = structuredClone(f.blocker.body), see = vi.spyOn(f.sim, 'see');
    const command = f.behavior.update(f.blocker, f.sim);
    expect(see.mock.calls.some(([a, b]) => a === f.blocker && b === f.target)).toBe(true);
    expect(command.vel.x).toBeLessThan(0);
    expect(command.facing).toBeDefined();
    expect(Math.hypot(command.vel.x, command.vel.y)).toBeLessThanOrEqual(f.blocker.profile.vmax);
    expect(f.behavior.target).toBe(f.target);
    expect(f.blocker.engagement).toBeNull();
    expect(f.sim.world.joints).toHaveLength(0);
    expect(f.blocker.body).toEqual(before);
    // The request still goes through ordinary traction, acceleration and
    // work accounting. Reading penetration cannot teleport feet or grant hands.
    const moved = structuredClone(before), world = new World([moved]); world.time = .5;
    const report = world.step([command], .05);
    expect(Math.abs(report.work.residual)).toBeLessThan(1e-8);
    expect(report.armImpulse[0]).toBe(0);
    expect(Math.hypot(moved.pos.x-before.pos.x, moved.pos.y-before.pos.y)).toBeLessThan(.2);
  });

  it('retains the first pull step before looking for the kick fit', () => {
    const f = stage(); f.blocker.body.pos = { x: 40, y: CENTER_Y };
    const see = vi.spyOn(f.sim, 'see');
    const expected = goTo(f.blocker, f.path[0], { speed: .95,
      through: cornerSpeed(f.blocker.body, f.path[0], f.path[1], pullTurnRadius(f.blocker)) });
    const command = f.behavior.update(f.blocker, f.sim);
    expect(see.mock.calls.some(([a, b]) => a === f.blocker && b === f.target)).toBe(false);
    expect(command.vel.x).toBe(expected.vel.x);
    expect(command.vel.y).toBe(expected.vel.y);
    expect(f.blocker.engagement).toBeNull();
  });

  it('reads a wrapper target while preserving its uncleared flat path', () => {
    const f = stage(); f.behavior.plan.pullRole = 'lead';
    const see = vi.spyOn(f.sim, 'see');
    const expected = goTo(f.blocker, f.path[1], { speed: .95,
      through: cornerSpeed(f.blocker.body, f.path[1], f.path[2], pullTurnRadius(f.blocker)) });
    expect(f.behavior.update(f.blocker, f.sim)).toEqual(expected);
    expect(see.mock.calls.some(([a, b]) => a === f.blocker && b === f.target)).toBe(true);
    expect(f.behavior.plan.pullRole).toBe('lead');
  });

  it('does not treat waypoint tolerance as achieved body clearance', () => {
    const f = stage();
    for (const a of f.sim.offense) if (a !== f.blocker && a.behavior instanceof RunBlocker) a.body.pos.x = 38.8;
    for (let k = 0; k < 24; k++) f.sim.perception.record(f.sim.agents);
    const command = f.behavior.update(f.blocker, f.sim);
    expect(command.vel.y).toBeGreaterThan(0);
    expect(command.facing).toBeUndefined();
    expect(f.blocker.engagement).toBeNull();
  });

  it('cannot see current penetration through an older stationary picture', () => {
    const f = stage(), ordinarySee = f.sim.see.bind(f.sim);
    const seen: Perceived = { pos: { x: 41, y: CENTER_Y + 4.65 }, vel: { x: 0, y: 0 }, facing: Math.PI, stance: 'low', age: .3 };
    vi.spyOn(f.sim, 'see').mockImplementation((a, b, scale) => a === f.blocker && b === f.target ? seen : ordinarySee(a, b, scale));
    const command = f.behavior.update(f.blocker, f.sim);
    expect(command.facing).toBeUndefined();
    expect(command.vel.x).toBeGreaterThan(0);
    expect(command.vel.y).toBeGreaterThan(0);
    expect(f.blocker.engagement).toBeNull();
  });

  it('keeps the installed corner request for a stationary square target', () => {
    const f = stage();
    f.target.body.pos = { x: 41, y: CENTER_Y + 4.65 };
    f.target.body.vel = { x: 0, y: 0 };
    for (let k = 0; k < 24; k++) f.sim.perception.record(f.sim.agents);
    const expected = goTo(f.blocker, f.path[1], { speed: .95,
      through: cornerSpeed(f.blocker.body, f.path[1], f.path[2], pullTurnRadius(f.blocker)) });
    const before = structuredClone(f.blocker.body), command = f.behavior.update(f.blocker, f.sim);
    expect(command.vel.x).toBeCloseTo(expected.vel.x, 12);
    expect(command.vel.y).toBeCloseTo(expected.vel.y, 12);
    expect(command.facing).toBe(expected.facing);
    expect(f.blocker.body).toEqual(before);
    expect(f.behavior.plan.pullRole).toBe('kick');
  });

  it('turns up after reaching the observed widened-target waypoint', () => {
    const f = stage();
    f.target.body.pos = { x: 41, y: CENTER_Y + 5.65 };
    f.target.body.vel = { x: 0, y: 0 };
    for (let k = 0; k < 24; k++) f.sim.perception.record(f.sim.agents);
    f.behavior.update(f.blocker, f.sim);
    // Stage the achieved arrival separately from the decision under test.
    // The target remains stationary and outside contact; no block is granted.
    f.blocker.body.pos = { x: 38.85, y: CENTER_Y + 5 };
    f.blocker.body.vel = { x: 0, y: 0 };
    f.sim.t += .05;
    const command = f.behavior.update(f.blocker, f.sim);
    expect(command.vel.x).toBeGreaterThan(0);
    expect(f.blocker.engagement).toBeNull();
    expect(f.behavior.target).toBe(f.target);
  });

  it('holds its consumed picture until the next ordinary decision', () => {
    const f = stage(), see = vi.spyOn(f.sim, 'see');
    f.behavior.update(f.blocker, f.sim);
    const reads = () => see.mock.calls.filter(([a, b]) => a === f.blocker && b === f.target).length;
    expect(reads()).toBe(1);
    f.target.body.pos.y += 8;
    f.sim.t += f.blocker.mind.decisionInterval / 2;
    f.behavior.update(f.blocker, f.sim);
    expect(reads()).toBe(1);
    f.sim.t += f.blocker.mind.decisionInterval;
    f.behavior.update(f.blocker, f.sim);
    expect(reads()).toBe(2);
  });

  it('mirrors the observed approach without changing physical capacities', () => {
    const right = stage(1), left = stage(-1);
    // Same bodies and read geometry on both sides; the installed side changes.
    left.blocker.body.profile = right.blocker.profile;
    vi.spyOn(left.blocker.mind, 'placementError', 'get').mockReturnValue(0);
    vi.spyOn(right.blocker.mind, 'placementError', 'get').mockReturnValue(0);
    const a = right.behavior.update(right.blocker, right.sim), b = left.behavior.update(left.blocker, left.sim);
    expect(b.vel.x).toBeCloseTo(a.vel.x, 10);
    expect(b.vel.y).toBeCloseTo(-a.vel.y, 10);
    expect(left.blocker.profile).toEqual(right.blocker.profile);
  });
});
