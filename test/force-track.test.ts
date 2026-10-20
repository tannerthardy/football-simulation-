import { describe, expect, it } from 'vitest';
import { CENTER_Y, FIELD_WIDTH } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { PASS_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { forceTrack, retainedForceTrack, type ForceTrack } from '../src/sim/force-track.js';
import type { Perceived } from '../src/sim/perception.js';
import { PlaySim } from '../src/sim/playsim.js';

const offense = generateTeam(new Rng(41), 'Force track offense', 'FTO', { strength: .55 });
const defense = generateTeam(new Rng(42), 'Force track defense', 'FTD', { strength: .55 });

/** An explicitly acquired picture at the helper boundary. These tests do not
 * claim natural recognition/acquisition or execute a reacting football play. */
function stage(side = 1) {
  const sim = new PlaySim({ offense: pickOffense(offense, '11'), defense: pickDefense(defense, 'nickel'),
    offCall: { formation: FORMATION_BY_ID.gun_trey_11, flip: side > 0, kind: 'pass',
      pass: PASS_BY_ID.four_verts, label: 'Acquired force boundary' },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3,
      pressure: null, label: 'Over Cover 3' }, los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 3 });
  const a = sim.slot('FS')!, runner = sim.slot('RB')!;
  a.runFit = { gap: 'D', side, kind: 'force', technique: 'attack', edge: 'box', pace: 'stack' };
  a.body.pos = { x: 44, y: CENTER_Y + side * 5 };
  a.body.vel = { x: -1, y: 0 }; a.body.facing = Math.PI;
  const seen: Perceived = { pos: { x: 39.3, y: CENTER_Y + side * 5 },
    vel: { x: 5, y: side * 3 }, carrying: true, age: .25,
    facing: Math.atan2(side * 3, 5), stance: null, pose: 'up' };
  const surface = CENTER_Y + side * 2;
  const plan = (picture: Perceived = seen, line = surface, lineVelocity = 0) =>
    forceTrack(a, picture, 40.3, line, lineVelocity, side);
  return { sim, a, runner, seen, surface, side, plan };
}

describe('force tracking uses the acquired outside boundary and its motion', () => {
  it.each([-1, 1])('matches a widening known runner without leading the landmark twice, side=%s', side => {
    const f = stage(side), before = structuredClone(f.a.body), picture = structuredClone(f.seen);
    const moving = f.plan(), stationary = f.plan({ ...f.seen, vel: { x: 5, y: 0 } });
    expect(side * (moving.point.y - f.seen.pos.y)).toBeGreaterThan(0);
    expect(moving.point).toEqual(stationary.point);
    expect(moving.velocity.y).toBe(f.seen.vel.y);
    expect(f.a.body).toEqual(before);
    expect(f.seen).toEqual(picture);
  });

  it('mirrors the boundary and motion with the installed side', () => {
    const left = stage(-1).plan(), right = stage(1).plan();
    expect(left.point.x).toBe(right.point.x);
    expect(left.point.y + right.point.y).toBeCloseTo(FIELD_WIDTH, 10);
    expect(left.velocity.y).toBeCloseTo(-right.velocity.y, 10);
  });

  it.each([0, -3])('does not extrapolate stationary/inward runner motion vy*side=%s', outwardSpeed => {
    for (const side of [-1, 1]) {
      const f = stage(side);
      const plan = f.plan({ ...f.seen, vel: { x: 5, y: side * outwardSpeed } }, f.surface, side * 4);
      expect(plan.velocity).toEqual({ x: 0, y: 0 });
      expect(plan.point).toEqual(f.plan({ ...f.seen, vel: { x: 5, y: 0 } }).point);
    }
  });

  it.each([false, null, undefined])('does not promote carrying=%s into a moving-runner forecast', carrying => {
    const f = stage(), plan = f.plan({ ...f.seen, carrying }, f.surface, 4);
    expect(plan.velocity).toEqual({ x: 0, y: 0 });
    // This retains the current fit landmark; it does not assert that an
    // unknown possessor is physically stationary or certify a clear path.
    expect(plan.point).toEqual(f.plan({ ...f.seen, vel: { x: 5, y: 0 } }).point);
  });

  it.each([undefined, Number.NaN, Number.POSITIVE_INFINITY])('requires a known finite cue age, age=%s', age => {
    const f = stage(), plan = f.plan({ ...f.seen, age }, f.surface, 4);
    expect(plan.velocity).toEqual({ x: 0, y: 0 });
    expect(plan.point).toEqual(f.plan({ ...f.seen, vel: { x: 5, y: 0 } }).point);
  });

  it.each([-1, 1])('tracks the acquired surface motion when the surface owns the outside boundary, side=%s', side => {
    const f = stage(side), picture = { ...f.seen,
      pos: { x: 39.3, y: CENTER_Y + side * 2 }, vel: { x: 5, y: side } };
    const surface = CENTER_Y + side * 7;
    const movingLine = f.plan(picture, surface, side * 2), fixedLine = f.plan(picture, surface, 0);
    expect(side * (movingLine.point.y - picture.pos.y)).toBeGreaterThan(0);
    expect(movingLine.point).toEqual(fixedLine.point);
    expect(movingLine.velocity.y).toBe(side * 2);
    expect(movingLine.velocity.y).not.toBe(picture.vel.y);
  });

  it.each([-1, 1])('stops extending a forecast beyond the field, side=%s', side => {
    const f = stage(side), plan = f.plan({ ...f.seen,
      pos: { x: 39.3, y: side > 0 ? FIELD_WIDTH - .1 : .1 },
      vel: { x: 5, y: side * 7 } });
    expect(plan.point.y).toBeGreaterThan(0);
    expect(plan.point.y).toBeLessThan(FIELD_WIDTH);
    expect(plan.velocity).toEqual({ x: 0, y: 0 });
  });
});

describe('force tracking retains a whole action until the next read', () => {
  it.each([-1, 1])('keeps adopted point and motion together, then adopts an observed cut, side=%s', side => {
    const f = stage(side), now = 3, cadence = f.a.mind.decisionInterval;
    const outward = f.plan(), first = retainedForceTrack(f.a, outward, now);
    const inwardCue = { ...f.seen, pos: { x: 40.5, y: CENTER_Y + side * 2 },
      vel: { x: 5, y: -side * 3 } };
    const observedCut = f.plan(inwardCue);
    expect(observedCut.velocity).toEqual({ x: 0, y: 0 });
    const dt = cadence / 2, held = retainedForceTrack(f.a, observedCut, now + dt);
    expect(held.velocity).toEqual(first.velocity);
    expect(held.point.x).toBe(first.point.x);
    expect(held.point.y - first.point.y).toBeCloseTo(first.velocity.y * dt, 10);
    expect(held.point).not.toEqual(observedCut.point);
    // A newly acquired cut may replace the complete plan on the existing
    // decision cadence, rather than mixing new velocity with the old aim.
    const adopted = retainedForceTrack(f.a, observedCut, now + cadence + 1e-6);
    expect(adopted).toEqual(observedCut);
  });

  it.each([-1, 1])('uses the frozen acquired picture until a cut is supplied as a new observation, side=%s', side => {
    const f = stage(side), acquired = structuredClone(f.seen), expected = f.plan(acquired);
    f.runner.body.pos = { x: 55, y: CENTER_Y - side * 8 };
    f.runner.body.vel = { x: 8, y: -side * 5 }; f.runner.body.facing = -side * Math.PI / 2;
    expect(f.plan(acquired)).toEqual(expected);
    const nextCue: Perceived = { ...acquired, pos: { ...f.runner.pos }, vel: { ...f.runner.vel },
      facing: f.runner.facing, age: .25 };
    const cut = f.plan(nextCue);
    expect(cut).not.toEqual(expected);
    expect(cut.velocity).toEqual({ x: 0, y: 0 });
    // Only the helper's acquired-picture dependency is tested. Caller
    // possession/activation gates and natural acquisition remain separate.
  });

  it.each([-1, 1])('bounds retained motion at the field without borrowing a new desired velocity, side=%s', side => {
    const f = stage(side), now = 3;
    const atRail: ForceTrack = { point: { x: 40.3, y: side > 0 ? FIELD_WIDTH - .31 : .31 },
      velocity: { x: 0, y: side * 4 } };
    const first = retainedForceTrack(f.a, atRail, now);
    const unrelated: ForceTrack = { point: { x: 42, y: CENTER_Y }, velocity: { x: 0, y: -side * 3 } };
    const held = retainedForceTrack(f.a, unrelated, now + f.a.mind.decisionInterval / 2);
    expect(held.point.y).toBeGreaterThan(0);
    expect(held.point.y).toBeLessThan(FIELD_WIDTH);
    expect(held.velocity).toEqual({ x: 0, y: 0 });
    expect(held.point.x).toBe(first.point.x);
  });

  it('adopts its own force point without changing an already held edge-fit action', () => {
    const f = stage(), now = 3;
    const existingEdge = f.a.mind.aim('edge-fit', { x: 43, y: CENTER_Y + 9 }, now);
    const currentBoundary = f.plan(), adoptedForce = retainedForceTrack(f.a, currentBoundary, now);
    expect(adoptedForce).toEqual(currentBoundary);
    expect(adoptedForce.point).not.toEqual(existingEdge);
    expect(f.a.mind.aim('edge-fit', { x: 40, y: CENTER_Y }, now + f.a.mind.decisionInterval / 2))
      .toEqual(existingEdge);
  });
});
