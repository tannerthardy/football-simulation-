import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/rng.js';
import { stepBody } from '../src/physics/kinematics.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { PASS_BY_ID } from '../src/playbook/concepts.js';
import { FRONT_BY_ID, COVERAGE_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { ManCoverage, ZoneCoverage, playBall } from '../src/sim/behaviors/defense.js';
import { RouteObservation } from '../src/sim/coverage-read.js';
import { PerceptionBuffer, type Perceived } from '../src/sim/perception.js';
import { PlaySim } from '../src/sim/playsim.js';
import { containCoverage } from '../src/sim/coverage-space.js';
import { END_LINE_X } from '../src/core/field.js';
import { zoneLandmark } from '../src/playbook/alignment.js';
import { movementObjective } from '../src/sim/movement-objective.js';

const home = generateTeam(new Rng(7).fork('offense'), 'Home', 'HOM', { strength: 0.6 });
const away = generateTeam(new Rng(7).fork('defense'), 'Away', 'AWY', { strength: 0.6 });
function setup(coverage = 'cover1', los = 40, zoneStyle: 'spot' | 'match' = 'match') {
  return new PlaySim({ offense: pickOffense(home, '11'), defense: pickDefense(away, 'nickel'), seed: 1,
    offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: false, kind: 'pass', pass: PASS_BY_ID.four_verts, label: '' },
    // dropStart 'early': these scenes stage a pass read and test the drop's technique, not when it starts.
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID[coverage], pressure: null, zoneStyle, dropStart: 'early', label: '' },
    los, ballY: 26, firstDownX: Math.min(110, los + 10) });
}
const cue = (vx = 6, vy = 0, facing = 0): Perceived => ({ pos: { x: 50, y: 30 }, vel: { x: vx, y: vy }, facing, stance: null });

describe('compressed coverage space', () => {
  it('compresses goal-line alignment and landmarks while preserving midfield depth', () => {
    const middle = setup('cover2'), goal = setup('cover2', 109);
    expect(zoneLandmark('deep_half_w', middle.offAlign).x).toBe(55);
    expect(zoneLandmark('deep_half_w', goal.offAlign).x).toBeLessThan(116);
    for (const slot of ['FS', 'SS', 'CB_W', 'CB_S']) expect(goal.slot(slot)!.pos.x).toBeLessThan(116);
  });

  it('brakes an intentional drop before the end line using the movement integrator', () => {
    const d = setup('cover2', 104).slot('FS')!;
    d.body.pos = { x: 114, y: 26 }; d.body.vel = { x: 0, y: 0 };
    let furthest = d.pos.x;
    for (let i = 0; i < 100; i++) {
      stepBody(d.body, containCoverage(d, { vel: { x: 8, y: 0 }, facing: Math.PI }), 0.05);
      furthest = Math.max(furthest, d.pos.x);
    }
    expect(furthest).toBeLessThan(END_LINE_X);
  });

  it('allows outside momentum and recovers instead of imposing a field wall', () => {
    const d = setup('cover2', 104).slot('FS')!;
    d.body.pos = { x: 119.9, y: 26 }; d.body.vel = { x: 6, y: 0 };
    stepBody(d.body, containCoverage(d, { vel: { x: 6, y: 0 } }), 0.05);
    expect(d.pos.x).toBeGreaterThan(END_LINE_X);
    for (let i = 0; i < 100; i++) stepBody(d.body, containCoverage(d, { vel: { x: 6, y: 0 } }), 0.05);
    expect(d.pos.x).toBeLessThan(END_LINE_X);
  });

  it.each(['spot', 'match'] as const)('Cover 2 %s corner carries #1 in the low red zone and responds to a true flat threat', style => {
    const s = setup('cover2', 104, style), d = s.slot('CB_W')!, b = d.behavior as ZoneCoverage;
    for (const r of s.offense) { r.body.pos.x = s.los - 3; r.body.vel = { x: 0, y: 0 }; }
    const one = s.slot(s.offAlign.numbering.W1!)!, two = s.slot(s.offAlign.numbering.W2!)!;
    one.body.pos.x = s.los + 4; one.body.vel = { x: 5, y: 0 };
    for (let i = 0; i < 20; i++) s.perception.record(s.agents);
    s.t = 1.5; d.recog!.read = 'pass'; b.update(d, s);
    expect(b.target).toBe(one);
    const sign = -s.offAlign.strongSign;
    two.body.pos = { x: s.los + 2, y: one.pos.y - sign * 3 };
    two.body.vel = { x: 0, y: sign * 5 };
    for (let i = 0; i < 20; i++) s.perception.record(s.agents);
    s.t = 2; b.update(d, s);
    expect(b.target).toBe(two);
  });
});

describe('visible route reads', () => {
  it('uses a delayed hip cue, never the current hidden change of direction', () => {
    const s = setup(), r = s.slot('X')!;
    const buffer = new PerceptionBuffer(1, 0.05);
    for (let i = 0; i < 8; i++) buffer.record([cue()]);
    buffer.record([cue(6, 0, 1)]);
    const read = new RouteObservation();
    expect(read.read(buffer.perceive(0, 0.2), 0.4, r.profile, 0.2, 1).vel.y).toBe(0);
    for (let i = 0; i < 4; i++) buffer.record([cue(6, 0, 1)]);
    const forecast = read.read(buffer.perceive(0, 0.2), 0.6, r.profile, 0.2, 1);
    expect(forecast.vel.y).toBeGreaterThan(0);
    expect(forecast.vel.y).toBeLessThanOrEqual(r.profile.lateral * 0.2);
  });

  it('reacts to observed braking without predicting a reversal or inventing a burst', () => {
    const profile = setup().slot('X')!.profile;
    const read = new RouteObservation();
    read.read(cue(7), 1, profile, 0.25, 1);
    const braking = read.read(cue(6), 1.2, profile, 0.25, 1);
    expect(braking.vel.x).toBeLessThan(6);
    expect(braking.vel.x).toBeGreaterThanOrEqual(6 - profile.brake * 0.25);
    expect(read.read(cue(7), 1.4, profile, 0.25, 1).vel.x).toBe(7);
    expect(read.read(cue(0.1, 0, Math.PI), 1.6, profile, 0.25, 1).vel.x).toBe(0.1);
  });

  it('bounds commitment to a hip fake, with less anticipation under low confidence', () => {
    const profile = setup().slot('X')!.profile;
    const strong = new RouteObservation().read(cue(7, 0, 1.4), 1, profile, 0.25, 1);
    const weak = new RouteObservation().read(cue(7, 0, 1.4), 1, profile, 0.25, 0.2);
    expect(strong.vel.x).toBeGreaterThan(6);
    expect(strong.vel.y).toBeGreaterThan(weak.vel.y);
    expect(new RouteObservation().read(cue(7, 0, Math.PI), 1, profile, 0.25, 1).vel).toEqual({ x: 7, y: 0 });
  });

  it('corrects a stale constant-velocity image only after a plant becomes visible', () => {
    const profile = setup().slot('X')!.profile;
    const read = new RouteObservation();
    read.read({ ...cue(7), age: 0.3 }, 1, profile, 0.2, 1);
    const planted = read.read({ ...cue(6), age: 0.3 }, 1.2, profile, 0.2, 1);
    const fresh = new RouteObservation();
    fresh.read(cue(7), 1, profile, 0.2, 1);
    const samePlantFresh = fresh.read(cue(6), 1.2, profile, 0.2, 1);
    expect(planted.vel.x).toBeLessThan(samePlantFresh.vel.x);
    expect(planted.pos.x).toBeLessThan(samePlantFresh.pos.x);
    expect(planted.vel.x).toBeGreaterThanOrEqual(0);
    // An unchanged stem remains unchanged even when the visual sample is old.
    expect(read.read({ ...cue(6), age: 0.3 }, 1.4, profile, 0.2, 1).vel.x).toBe(6);
  });
});

describe('coverage footwork and distribution', () => {
  it('stays square at press depth until the receiver releases', () => {
    const s = setup();
    const d = s.slot('CB_W')!, b = d.behavior as ManCoverage;
    expect(b).toBeInstanceOf(ManCoverage);
    d.recog!.read = 'pass';
    const cmd = b.update(d, s);
    expect(cmd.vel.x).toBeGreaterThanOrEqual(-0.01);
    expect(cmd.facing).toBe(Math.PI);
  });

  it('can stay in phase on an isolated vertical without stepping downhill at release', () => {
    const s = setup(), d = s.slot('CB_W')!, b = d.behavior as ManCoverage, r = b.target;
    d.recog!.read = 'pass';
    // Remove the jam contest: test coverage steering through real movement,
    // observation latency and hip rotation, with no route/outcome coin flips.
    let maxTrail = 0;
    for (let i = 0; i < 60; i++) {
      s.t = i * 0.05;
      s.perception.record(s.agents);
      const cmd = b.update(d, s);
      stepBody(r.body, { vel: { x: r.profile.vmax * 0.94, y: 0 } }, 0.05);
      stepBody(d.body, cmd, 0.05);
      maxTrail = Math.max(maxTrail, r.pos.x - d.pos.x);
    }
    expect(maxTrail).toBeLessThan(3);
  });

  it('quarters safety carries #2 while the corner carries #1', () => {
    const s = setup('cover4');
    const d = s.slot('FS')!, b = d.behavior as ZoneCoverage;
    expect(b.zone).toBe('quarter_w_in');
    for (const r of s.offense) { r.body.pos.x = s.los - 3; r.body.vel = { x: 0, y: 0 }; }
    const one = s.slot(s.offAlign.numbering.W1!)!, two = s.slot(s.offAlign.numbering.W2!)!;
    one.body.pos.x = s.los + 9; two.body.pos.x = s.los + 8;
    one.body.vel = two.body.vel = { x: 6, y: 0 };
    for (let i = 0; i < 20; i++) s.perception.record(s.agents);
    s.t = 1.5; d.recog!.read = 'pass';
    b.update(d, s);
    expect(b.target).toBe(two);
    const corner = s.slot('CB_W')!;
    (corner.behavior as ZoneCoverage).update(corner, s);
    expect((corner.behavior as ZoneCoverage).target).toBe(one);
  });

  it('a deep corner manages the developing release instead of sprinting to empty drop depth', () => {
    const s = setup('cover3'), d = s.slot('CB_W')!, b = d.behavior as ZoneCoverage;
    for (const r of s.offense) { r.body.pos.x = s.los - 3; r.body.vel = { x: 0, y: 0 }; }
    const r = s.slot(s.offAlign.numbering.W1!)!;
    r.body.pos.x = s.los + 3; r.body.vel = { x: 3, y: 0 };
    for (let i = 0; i < 20; i++) s.perception.record(s.agents);
    s.t = 1; d.recog!.read = 'pass';
    const cmd = b.update(d, s);
    expect(b.target).toBe(r);
    // The contract is a receiver-relative objective, not a command-speed
    // ceiling which mistakes burst demand for achieved movement.
    const goal = movementObjective(cmd);
    expect(goal?.kind).toBe('moving');
    expect(goal!.point.x).toBeLessThan(zoneLandmark(b.zone, s.offAlign).x);
    const start = { ...d.pos };
    stepBody(d.body, cmd, .05);
    expect(d.pos.x - start.x).toBeLessThan(.1);
  });

  it('a match defender opens his hips to carry a crosser rather than shuffling forever', () => {
    const s = setup('cover3');
    const d = s.defense.find(d => d.behavior instanceof ZoneCoverage && d.behavior.zone === 'hook_w')!;
    const b = d.behavior as ZoneCoverage;
    for (const r of s.offense) { r.body.pos.x = s.los - 3; r.body.vel = { x: 0, y: 0 }; }
    const r = s.slot('H')!;
    r.body.pos = { x: s.los + 6, y: s.ballY + 3 }; r.body.vel = { x: 0, y: 6 };
    for (let i = 0; i < 20; i++) s.perception.record(s.agents);
    s.t = 1.5; d.recog!.read = 'pass';
    const cmd = b.update(d, s);
    expect(b.target).toBe(r);
    expect(cmd.facing).toBeCloseTo(Math.PI / 2);
  });

  it('brakes into a reachable catch instead of charging across it', () => {
    const s = setup(), d = s.slot('CB_W')!, r = s.slot('X')!;
    s.t = 2; s.throwAt = 1;
    d.body.pos = { x: 50, y: 30 }; d.body.vel = { x: 0, y: 0 };
    s.ball = { kind: 'air', flight: { pos: { x: 49, y: 30, z: 1.5 }, vel: { x: 10, y: 0, z: 0 }, drag: 0 },
      thrower: s.qb, target: r, releaseT: 1, releaseX: 35, intended: { x: 50.5, y: 30, z: 1.2 }, arrivalT: 2.2, deflected: false, throwaway: false }; s.throwSight.stageRelease(s, s.throwAt);
    s.ballPath = [{ t: 2.2, x: 50.5, y: 30, z: 1.2 }];
    const cmd = playBall(d, s, r);
    expect(Math.hypot(cmd.vel.x, cmd.vel.y)).toBeLessThan(d.profile.vmax / 2);
    expect(cmd.vel.x).toBeGreaterThan(0);
  });

  it('closes an earlier observed receiver catch rather than a reachable later ground point', () => {
    const s = setup(), d = s.slot('CB_W')!, r = s.slot('X')!;
    s.t = 2; s.throwAt = 1;
    d.body.pos = { x: 55, y: 30 }; d.body.vel = { x: 0, y: 0 };
    for (const o of s.offense) o.body.pos = { x: 35, y: 10 };
    r.body.pos = { x: 45, y: 30 }; r.body.vel = { x: 0, y: 0 };
    for (let i = 0; i < 24; i++) s.perception.record(s.agents);
    s.ball = { kind: 'air', flight: { pos: { x: 43, y: 30, z: 2 }, vel: { x: 20, y: 0, z: -1 }, drag: 0 },
      thrower: s.qb, target: s.slot('H')!, releaseT: 1, releaseX: 35, intended: { x: 55, y: 30, z: 1 }, arrivalT: 2.6, deflected: false, throwaway: false }; s.throwSight.stageRelease(s, s.throwAt);
    // The intended target deliberately differs from the visible catcher.
    s.ballPath = [{ t: 2.2, x: 45, y: 30, z: 1.8 }, { t: 2.6, x: 55, y: 30, z: 0.4 }];
    expect(playBall(d, s, null).vel.x).toBeLessThan(0);
  });
});
