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

const home = generateTeam(new Rng(7).fork('offense'), 'Home', 'HOM', { strength: 0.6 });
const away = generateTeam(new Rng(7).fork('defense'), 'Away', 'AWY', { strength: 0.6 });
function setup(coverage = 'cover1') {
  return new PlaySim({ offense: pickOffense(home, '11'), defense: pickDefense(away, 'nickel'), seed: 1,
    offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: false, kind: 'pass', pass: PASS_BY_ID.four_verts, label: '' },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID[coverage], pressure: null, zoneStyle: 'match', label: '' },
    los: 40, ballY: 26, firstDownX: 50 });
}
const cue = (vx = 6, vy = 0, facing = 0): Perceived => ({ pos: { x: 50, y: 30 }, vel: { x: vx, y: vy }, facing, stance: null });

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
    expect(cmd.vel.x).toBeLessThan(6);
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
      thrower: s.qb, target: r, releaseT: 1, releaseX: 35, intended: { x: 50.5, y: 30, z: 1.2 }, arrivalT: 2.2, deflected: false, throwaway: false };
    s.ballPath = [{ t: 2.2, x: 50.5, y: 30, z: 1.2 }];
    const cmd = playBall(d, s, r);
    expect(Math.hypot(cmd.vel.x, cmd.vel.y)).toBeLessThan(d.profile.vmax / 2);
    expect(cmd.vel.x).toBeGreaterThan(0);
  });
});
