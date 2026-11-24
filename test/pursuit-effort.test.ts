import { describe, expect, it, vi } from 'vitest';
import type { PhysicalProfile } from '../src/players/physical.js';
import { locomotionAccel, type Body } from '../src/physics/kinematics.js';
import { newSupport } from '../src/physics/support.js';
import { World } from '../src/physics/world.js';
import { interceptPoint, requestedSprintTime, timeToReach, timeToReachRequested } from '../src/physics/reach.js';
import { nativeTraceSetup } from '../scripts/diag/command-trace.js';
import { chase } from '../src/sim/behaviors/common.js';
import { PlaySim } from '../src/sim/playsim.js';

const profile: PhysicalProfile = { vmax: 8, tau: 1, brake: 8, lateral: 6, turnRate: 8,
  backpedal: .6, shuffle: .6, massKg: 90, heightYd: 2, radius: .3, reach: 1,
  maxCatchHeight: 3, reactReach: 2.6, reactionTime: .25, power: 1.3, balance: .7,
  bend: .5, stepSpeed: 4, getUp: 1 };
const body = (speed = 0): Body => ({ pos: { x: 40, y: 26 }, vel: { x: speed, y: 0 }, facing: 0,
  energy: 1, profile, support: newSupport() });

describe('interception uses the sprint request budget', () => {
  it.each([{ speed: .8, effort: .8 }, { speed: .8, effort: 1 }, { speed: 1, effort: .8 }, { speed: 1, effort: 1 }])
  ('matches aligned finite World response for $speed wanted-speed / $effort effort', request => {
    const b = body(), before = structuredClone(profile), target = { x: 45, y: 26 }, radius = .7;
    const time = timeToReachRequested({ pos: b.pos, vel: b.vel, profile }, target, radius, request);
    const world = new World([b]);
    let arrival: number | null = null;
    for (let k = 0; k < 80 && arrival === null; k++) {
      world.step([{ vel: { x: profile.vmax * request.speed, y: 0 }, effort: request.effort }], .05);
      if (Math.hypot(target.x - b.pos.x, target.y - b.pos.y) <= radius) arrival = (k + 1) * .05;
    }
    expect(arrival).not.toBeNull();
    expect(Math.abs(arrival! - time)).toBeLessThan(.1); // Two ordinary control intervals, not a capacity claim.
    expect(profile).toStrictEqual(before);
    const p = interceptPoint({ pos: { x: 40, y: 26 }, vel: { x: 0, y: 0 }, profile }, () => target,
      { request, radius, recordSamples: true });
    expect(p.estimate.request!.wantedSpeedCeiling).toBe(8 * Math.min(request.speed, request.effort));
    expect(p.estimate.physicalGuarantee).toBe(false);
    expect(p.estimate.assumptions.model).toBe('requested-sprint-with-approximate-redirect');
  });

  it('does not multiply desired speed and effort twice, or lower the full physical drive/cut envelope', () => {
    const b = body(2), request = { speed: .8, effort: .8 }, target = { x: 45, y: 26 };
    expect(timeToReachRequested({ pos: b.pos, vel: b.vel, profile }, target, .7, request))
      .toBe(timeToReachRequested({ pos: b.pos, vel: b.vel, profile }, target, .7, { speed: 1, effort: .8 }));
    const acc = locomotionAccel(b, { vel: { x: 6.4, y: 0 }, effort: .8 }, .05);
    // Wanted 6.4 of a full 8: full start force, leveling at 6.4 (8 / 6.4 on the lag law).
    expect(acc.x).toBeCloseTo((6.4 - 2) / profile.tau * (8 / 6.4), 12);
    expect(acc.y).toBe(0);
    expect(profile.vmax).toBe(8); expect(profile.lateral).toBe(6); expect(profile.brake).toBe(8);
    // With a short leveling time the FULL 8yd/s drive curve is the first
    // bound; replacing profile.vmax with 4 gives the wrong acceleration law.
    const correct = requestedSprintTime(4, 0, 4, 8, 1, .2, 8);
    const capOnly = requestedSprintTime(4, 0, 4, 4, 1, .2, 8);
    expect(correct).toBeLessThan(capOnly);
  });

  it('preserves carried velocity above the request cap and brakes toward it', () => {
    const b = body(7), world = new World([b]);
    const request = { speed: .5, effort: .5 }, target = { x: 42, y: 26 };
    const predicted = timeToReachRequested({ pos: b.pos, vel: b.vel, profile }, target, 0, request);
    const fromRest = timeToReachRequested({ pos: b.pos, vel: { x: 0, y: 0 }, profile }, target, 0, request);
    expect(predicted).toBeLessThan(fromRest);
    world.step([{ vel: { x: 4, y: 0 }, effort: .5 }], .05);
    expect(b.vel.x).toBeCloseTo(7 - profile.brake * .05, 12); // Momentum survives the first reduced-budget command.
    for (let k = 1; k < 8; k++) world.step([{ vel: { x: 4, y: 0 }, effort: .5 }], .05);
    expect(b.pos.x).toBeGreaterThan(target.x);
    // The later budget can be slightly below 4 as the ordinary energy model
    // spends effort; the test does not demand immunity to fatigue.
    expect(predicted).toBeCloseTo((7 - Math.sqrt(49 - 32)) / 8, 12);
    expect(requestedSprintTime(5, 0, 0, 8, 1, 1, 8)).toBe(Infinity);
  });

  it('respects the existing fast-leveling gait through finite World motion, with capacities fixed', async () => {
    vi.stubEnv('GAIT_STEP', '.2'); vi.resetModules();
    try {
      const { World: GaitWorld } = await import('../src/physics/world.js');
      const { timeToReachRequested: estimate } = await import('../src/physics/reach.js');
      const b = body(), target = { x: 45, y: 26 }, request = { speed: .5, effort: .5 };
      const predicted = estimate({ pos: b.pos, vel: b.vel, profile }, target, .7, request);
      const world = new GaitWorld([b]);
      let arrival: number | null = null;
      for (let k = 0; k < 80 && arrival === null; k++) {
        world.step([{ vel: { x: 4, y: 0 }, effort: .5 }], .05);
        if (Math.hypot(target.x - b.pos.x, target.y - b.pos.y) <= .7) arrival = (k + 1) * .05;
      }
      expect(arrival).not.toBeNull(); expect(Math.abs(arrival! - predicted)).toBeLessThan(.1);
      expect(b.profile).toBe(profile); expect(b.profile.vmax).toBe(8);
    } finally { vi.unstubAllEnvs(); vi.resetModules(); }
  });

  it('keeps full-effort aligned/transverse/crossing/fallback scalar controls, without promising body success', () => {
    const controls = [
      { vel: { x: 4, y: 0 }, path: (t: number) => ({ x: 12 - 3 * t, y: 0 }) },
      { vel: { x: 0, y: 7 }, path: (t: number) => ({ x: 12 - 3 * t, y: 0 }) },
      { vel: { x: 4, y: 0 }, path: (t: number) => ({ x: 6, y: -12 + 10 * t }) },
      { vel: { x: 4, y: 0 }, path: (t: number) => ({ x: 60 + 10 * t, y: 15 }) },
    ];
    for (const c of controls) {
      const m = { pos: { x: 0, y: 0 }, vel: c.vel, profile };
      const old = interceptPoint(m, c.path, { horizon: 3, step: .1, radius: .7 });
      const now = interceptPoint(m, c.path, { horizon: 3, step: .1, radius: .7, request: { speed: 1, effort: 1 } });
      expect(now.t).toBe(old.t); expect(now.point).toStrictEqual(old.point);
      expect(now.estimate.status).toBe(old.estimate.status);
      expect(now.estimate.physicalGuarantee).toBe(false);
      expect(timeToReachRequested(m, now.point, .7, { speed: 1, effort: 1 })).toBeCloseTo(timeToReach(m, now.point, .7), 12);
    }
  });

  it.each([11.99, 12, 12.01])('uses the same acquired-distance effort on both sides of 12yd: %s', distance => {
    const sim = new PlaySim(nativeTraceSetup({ coverage: 'cover3', concept: 'four_verts', seed: 19, roster: 7,
      formation: 'gun_doubles_11', flip: false }));
    const d = sim.slot('FS')!, c = sim.slot('Z')!;
    d.body.pos = { x: 40, y: 26 }; d.body.vel = { x: 0, y: 0 };
    sim.ball = { kind: 'held', carrier: c };
    const seen = vi.spyOn(sim, 'see').mockReturnValue({ pos: { x: 40 + distance, y: 26 }, vel: { x: 4, y: 0 }, facing: 0, stance: null, age: .2 });
    vi.spyOn(sim, 'opponents').mockReturnValue([c]);
    const r = d.r.bind(d); vi.spyOn(d, 'r').mockImplementation(key => key === 'workRate' ? .2 : r(key));
    const trace = sim.recordCommands({ actor: { playerId: d.player.id }, from: 0, to: .05 }); trace.begin(sim);
    const command = chase(sim, d, c);
    trace.finish(sim);
    const p = trace.steps[0].pursuit!.find(r => r.data.kind === 'intercept')!.data;
    const q = trace.steps[0].pursuit!.find(r => r.data.kind === 'chase')!.data;
    if (p.kind !== 'intercept' || q.kind !== 'chase') throw new Error('Missing active request');
    const expected = distance > 12 ? .79 : 1;
    expect(p.prediction.estimate.request!.effort).toBe(expected);
    expect(p.prediction.estimate.request!.speed).toBe(expected);
    const far = q.requests.find(r => r.stage === 'intercept-sprint')!.command;
    expect(far.effort).toBe(expected);
    expect(Math.hypot(far.vel.x, far.vel.y)).toBeCloseTo(d.profile.vmax * expected, 12);
    expect(command.effort).toBe(expected);
    expect(p.steeringPointEstimate).toBe('not-evaluated');
    // Reads of the carrier: existing chase, current forecast and older cue only. (TRAIL_LEVERAGE also reads his
    // teammates, a different body; those are not reads of the carrier.)
    const carrierReads = () => seen.mock.calls.filter(call => call[1] === c).length;
    expect(carrierReads()).toBe(3);
    c.body.pos = { x: -100, y: 50 }; c.body.vel = { x: -8, y: 0 };
    expect(chase(sim, d, c)).toEqual(command); // Unacquired reality cannot move the effort boundary.
    expect(carrierReads()).toBe(6);
    vi.restoreAllMocks();
  });
});
