import { describe, expect, it, vi } from 'vitest';
import { Rng } from '../src/core/rng.js';
import { generatePlayer } from '../src/players/generator.js';
import type { PhysicalProfile } from '../src/players/physical.js';
import { World, type HandJoint } from '../src/physics/world.js';
import { supportParams } from '../src/physics/support.js';
import { Agent } from '../src/sim/agent.js';
import { RouteRunner } from '../src/sim/behaviors/receiver.js';
import { TrackBall } from '../src/sim/behaviors/receiver.js';
import { onBallCaught, onInterception, onLooseBall, onRecovery, onThrow } from '../src/sim/assign.js';
import type { PlaySim } from '../src/sim/playsim.js';

const idle = { kind: 'idle', update: () => ({ vel: { x: 0, y: 0 } }) };
const profile = (): PhysicalProfile => ({ massKg: 90, radius: 0.27, reach: 1, heightYd: 2.05, vmax: 9, tau: 1.3,
  brake: 6, lateral: 6, turnRate: 8, backpedal: 0.6, shuffle: 0.6, maxCatchHeight: 3, reactReach: 2.6,
  reactionTime: 0.25, power: 95, balance: 0.6, bend: 0.5, stepSpeed: 3.4, getUp: 0.9 });

/** Hold all sprint/size/strength capacities constant while varying hand
 * technique. Use the actual route controller and actual shared world. */
function setup({ side = 1, press = 70, release = 70, time = 0 } = {}) {
  const p = generatePlayer(new Rng(7), 'WR'), q = generatePlayer(new Rng(9), 'CB');
  p.ratings.releaseVsPress = release; p.ratings.routeRunning = 70;
  q.ratings.press = press; p.measurables.armIn = q.measurables.armIn = 32;
  const pr = profile(), pd = profile();
  const r = new Agent(0, 'O', 'X', p, pr, { pos: { x: 40, y: 26 }, vel: { x: 0, y: 0 }, facing: 0, energy: 1, profile: pr }, idle);
  const d = new Agent(1, 'D', 'CB_W', q, pd, { pos: { x: 40.9, y: 26 - side * 0.25 }, vel: { x: 0, y: 0 }, facing: side * Math.PI, energy: 1, profile: pd }, idle);
  const world = new World([r.body, d.body]);
  const rng = new Rng(5), events: string[] = [];
  const sim = { t: time, dt: 0.05, los: 40, ballY: 26, world, rng, dice: () => rng, defense: [d], offense: [r], qb: d,
    ball: { kind: 'held', carrier: d }, scrambleDrill: false, agents: [r, d], engagements: [],
    teammates: (a: Agent) => a.team === 'O' ? [r] : [d], opponents: (a: Agent) => a.team === 'O' ? [d] : [r],
    defAlign: { coverage: { man: true }, spots: { CB_W: { press: true, manTarget: 'X' } } },
    event: (type: string) => events.push(type) } as unknown as PlaySim;
  const runner = new RouteRunner(r, sim, { id: 'go', family: 'deep', end: 'continue', depth: 20, points: [{ d: 20, l: 0 }] }, side);
  r.behavior = runner;
  return { sim, r, d, world, runner, events, rng, side };
}

function run(o: Parameters<typeof setup>[0] = {}, substeps?: number) {
  const f = setup(o);
  f.world.substeps = substeps;
  let error = 0, penetration = 0, impulse = 0, touchTicks = 0;
  for (let k = 0; k < 24; k++) {
    const px = (f.r.vel.x + f.d.vel.x) * 90, py = (f.r.vel.y + f.d.vel.y) * 90;
    const cmd = f.runner.update(f.r, f.sim);
    const hands = f.world.joints.find((j): j is HandJoint => j.kind === 'hands');
    if (hands) touchTicks++;
    const report = f.world.step([cmd, { vel: { x: 0, y: 0 }, facing: Math.atan2(f.r.pos.y - f.d.pos.y, f.r.pos.x - f.d.pos.x) }], f.sim.dt);
    impulse += Math.abs(hands?.normalForce ?? 0) * f.sim.dt + Math.abs(hands?.tangentForce ?? 0) * f.sim.dt;
    error = Math.max(error, Math.hypot((f.r.vel.x + f.d.vel.x) * 90 - px - report.groundImpulse[0].x - report.groundImpulse[1].x,
      (f.r.vel.y + f.d.vel.y) * 90 - py - report.groundImpulse[0].y - report.groundImpulse[1].y));
    penetration = Math.max(penetration, report.maxPenetration);
    f.sim.t += f.sim.dt;
  }
  return { ...f, error, penetration, impulse, touchTicks, depth: f.r.pos.x - 40, dy: f.side * (f.r.pos.y - 26) };
}

describe('press release through physical hand contact', () => {
  it('acquires bounded hands without a random outcome, strike, or immediate body change', () => {
    const f = setup();
    const normal = vi.spyOn(f.rng, 'normal'), strike = vi.spyOn(f.world, 'strike');
    const before = [f.r, f.d].map((a) => ({ pos: { ...a.pos }, vel: { ...a.vel }, lean: { ...a.body.support!.lean } }));
    f.runner.update(f.r, f.sim);
    expect(f.world.joints).toHaveLength(1);
    const hands = f.world.joints[0] as HandJoint;
    expect(hands.kind).toBe('hands');
    expect(hands.push).toBeGreaterThan(0);
    expect(hands.push).toBeLessThanOrEqual(supportParams(f.d.profile).armForce);
    expect(hands.steer).toBeLessThanOrEqual(supportParams(f.d.profile).armForce);
    expect(hands.hold).toBe(0);
    expect([f.r, f.d].map((a) => ({ pos: { ...a.pos }, vel: { ...a.vel }, lean: { ...a.body.support!.lean } }))).toEqual(before);
    expect(f.events).not.toContain('jam');
    expect(normal).not.toHaveBeenCalled(); expect(strike).not.toHaveBeenCalled();
  });

  it('initiates from reachable football geometry even after the former elapsed-time gate', () => {
    const late = setup({ time: 2 });
    late.runner.update(late.r, late.sim);
    expect(late.world.joints).toHaveLength(1);
    for (const condition of ['distance', 'facing', 'down', 'depth', 'busy'] as const) {
      const f = setup();
      if (condition === 'distance') f.d.pos.x = 43;
      if (condition === 'facing') f.d.body.facing = 0;
      if (condition === 'down') f.d.body.support!.state = 'down';
      if (condition === 'depth') { f.r.pos.x = 46; f.d.pos.x = 46.9; }
      if (condition === 'busy') f.world.joints.push({ kind: 'grasp', a: f.d.body, b: f.r.body, reach: 1.4, capacity: 200, legs: 0 });
      f.runner.update(f.r, f.sim);
      expect(f.world.joints.some((j) => j.kind === 'hands')).toBe(false);
    }
  });

  it('sustains a measured jam and explains all momentum through ground impulses on either side', () => {
    const a = run(), b = run({ side: -1 });
    for (const r of [a, b]) {
      expect(r.events).toContain('jam'); expect(r.touchTicks).toBeGreaterThan(1);
      expect(r.impulse).toBeGreaterThan(1);
      expect(r.error).toBeLessThan(1e-6); expect(r.penetration).toBeLessThan(0.2);
      expect(Number.isFinite(r.depth)).toBe(true);
    }
    expect(b.depth).toBeCloseTo(a.depth, 8); expect(b.dy).toBeCloseTo(a.dy, 8);
    expect(b.impulse).toBeCloseTo(a.impulse, 6);
  });

  it('keeps the release close under coarse and fine contact stepping', () => {
    // Coarse is the world's own minimum island substep count (MIN_SUBSTEPS 12); fine is four times finer.
    // Below that, 4-8 substeps fall in a band where this jam drifts sideways less (develop: up to 0.03 yd at 5;
    // with the direction-free start, #353: up to 0.07 yd at 6), while 2-3 and 10+ agree within 0.01 yd. The band
    // is a coarse-step contact-solve artifact the world never runs; it is a named follow-up, not hidden here.
    const coarse = run({}, 12), fine = run({}, 48);
    expect(coarse.error).toBeLessThan(1e-6); expect(fine.error).toBeLessThan(1e-6);
    expect(Math.abs(coarse.depth - fine.depth)).toBeLessThan(0.05);
    expect(Math.abs(coarse.dy - fine.dy)).toBeLessThan(0.05);
    expect(Math.abs(coarse.impulse - fine.impulse)).toBeLessThan(0.1 * fine.impulse);
  });

  it('a better hand release slips the same corner sooner and recovers more route depth', () => {
    const slow = run({ press: 60, release: 15 }), fast = run({ press: 60, release: 95 });
    expect(fast.touchTicks).toBeLessThan(slow.touchTicks);
    expect(fast.depth).toBeGreaterThan(slow.depth);
  });

  it('better press hands transfer more bounded force without changing either player physical capacity', () => {
    const weak = run({ press: 15, release: 60 }), strong = run({ press: 95, release: 60 });
    expect(strong.impulse).toBeGreaterThan(weak.impulse);
    expect(strong.depth).toBeLessThan(weak.depth);
  });

  it('detaches contact when the receiver leaves reach, the corner falls, or the ball is thrown', () => {
    for (const condition of ['reach', 'down', 'air'] as const) {
      const f = setup();
      f.runner.update(f.r, f.sim);
      expect(f.world.joints).toHaveLength(1);
      if (condition === 'reach') f.r.pos.y += 2;
      if (condition === 'down') f.d.body.support!.state = 'falling';
      if (condition === 'air') f.sim.ball = { kind: 'dead' };
      f.runner.update(f.r, f.sim);
      expect(f.world.joints).toHaveLength(0);
    }
  });

  it('records a real one-frame jam when the receiver escapes before the next read', () => {
    const f = setup();
    const cmd = f.runner.update(f.r, f.sim);
    f.world.step([cmd, { vel: { x: 0, y: 0 }, facing: Math.PI }], f.sim.dt);
    expect(f.events).not.toContain('jam');
    f.r.pos.y += 2;
    f.runner.update(f.r, f.sim);
    expect(f.world.joints).toHaveLength(0);
    expect(f.events.filter((x) => x === 'jam')).toHaveLength(1);
  });

  it('does not clear a stationary palm merely because the controller is queried repeatedly', () => {
    const f = setup({ press: 15, release: 95 });
    for (let k = 0; k < 30; k++) f.runner.update(f.r, f.sim);
    expect(f.world.joints).toHaveLength(1);
  });

  it.each(['throw', 'catch', 'interception', 'fumble', 'recovery', 'wrapped-fumble'] as const)(
    'removes only its press joint on %s before changing the controller', (event) => {
      const f = setup();
      const cmd = f.runner.update(f.r, f.sim);
      f.world.step([cmd, { vel: { x: 0, y: 0 }, facing: Math.PI }], f.sim.dt);
      const other: HandJoint = { kind: 'hands', a: f.d.body, b: f.r.body, extension: 0.9, push: 100, hold: 0, steer: 20 };
      f.world.joints.push(other);
      if (event === 'throw') {
        f.sim.ball = { kind: 'air', target: f.r } as PlaySim['ball'];
        onThrow(f.sim);
      } else if (event === 'catch') onBallCaught(f.sim, f.r);
      else if (event === 'interception') onInterception(f.sim, f.d);
      else if (event === 'recovery') onRecovery(f.sim, f.r);
      else {
        if (event === 'wrapped-fumble') f.r.behavior = new TrackBall(f.r, f.sim, f.runner);
        onLooseBall(f.sim);
      }
      expect(f.world.joints).toEqual([other]);
      expect(f.events.filter((x) => x === 'jam')).toHaveLength(1);
    });
});
