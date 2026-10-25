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
    expect(acc.x).toBeCloseTo((6.4 - 2) / profile.tau, 12);
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

  type Pic = { x: number; y: number; vx?: number; vy?: number };
  /** One FS chasing Z, with chosen pictures of the runner and of teammates. */
  function scene(runner: Pic, mates: Pic[] = []) {
    const sim = new PlaySim(nativeTraceSetup({ coverage: 'cover3', concept: 'four_verts', seed: 19, roster: 7,
      formation: 'gun_doubles_11', flip: false }));
    const d = sim.slot('FS')!, c = sim.slot('Z')!;
    d.body.pos = { x: 40, y: 26 }; d.body.vel = { x: 0, y: 0 };
    sim.ball = { kind: 'held', carrier: c };
    const others = sim.defense.filter(m => m !== d).slice(0, mates.length);
    const pics = new Map<unknown, Pic>([[c, runner], ...others.map((m, k) => [m, mates[k]] as const)]);
    const see = vi.spyOn(sim, 'see').mockImplementation((_o, t) => {
      const p = pics.get(t) ?? { x: -50, y: 0 };
      return { pos: { x: p.x, y: p.y }, vel: { x: p.vx ?? 0, y: p.vy ?? 0 }, facing: 0, stance: null, age: .2 };
    });
    vi.spyOn(sim, 'opponents').mockReturnValue([c]);
    vi.spyOn(sim, 'teammates').mockReturnValue([d, ...others]);
    const r = d.r.bind(d); vi.spyOn(d, 'r').mockImplementation(key => key === 'workRate' ? .2 : r(key));
    const run = () => {
      const trace = sim.recordCommands({ actor: { playerId: d.player.id }, from: sim.t, to: sim.t + .05 }); trace.begin(sim);
      const command = chase(sim, d, c);
      trace.finish(sim);
      const p = trace.steps[0].pursuit!.find(r => r.data.kind === 'intercept')!.data;
      const q = trace.steps[0].pursuit!.find(r => r.data.kind === 'chase')!.data;
      if (p.kind !== 'intercept' || q.kind !== 'chase') throw new Error('Missing active request');
      return { command, p, q };
    };
    return { sim, d, c, see, run };
  }

  it('the last chance sprints at any distance, and plans on that budget in the same tick', () => {
    // Runner 20 yd away crossing toward the FS's side of the field: reachable, nobody else.
    const { run } = scene({ x: 60, y: 10, vx: 0, vy: 6 });
    const { command, p, q } = run();
    expect(q.effortRead).toMatchObject({ feasible: true, betterPlaced: 0, wants: 'sprint', mode: 'sprint', effort: 1 });
    expect(p.prediction.estimate.request).toMatchObject({ speed: 1, effort: 1 });
    expect(q.requests.find(r => r.stage === 'intercept-sprint')!.command.effort).toBe(1);
    expect(command.effort).toBe(1);
    expect(p.steeringPointEstimate).toBe('not-evaluated');
    vi.restoreAllMocks();
  });

  it('paces close to the ball when two teammates are already better placed', () => {
    // A 5-yd gain with two teammates in front of the runner: the trailer paces.
    const { run } = scene({ x: 45, y: 26, vx: 3, vy: 0 }, [{ x: 47, y: 26 }, { x: 47.5, y: 27 }]);
    const { command, p, q } = run();
    expect(q.effortRead).toMatchObject({ feasible: true, betterPlaced: 2, wants: 'pace', mode: 'pace' });
    expect(q.effortRead!.effort).toBeCloseTo(.79, 12);
    expect(p.prediction.estimate.request!.effort).toBeCloseTo(.79, 12);
    expect(command.effort).toBeCloseTo(.79, 12);
    vi.restoreAllMocks();
  });

  it('one better-placed teammate still leaves him among the two best placed', () => {
    const { run } = scene({ x: 45, y: 26, vx: 3, vy: 0 }, [{ x: 47, y: 26 }]);
    expect(run().q.effortRead).toMatchObject({ betterPlaced: 1, mode: 'sprint', effort: 1 });
    vi.restoreAllMocks();
  });

  it('paces a hopeless trail, but a committed sprint holds for the hold time first', () => {
    // Runner 14 yd ahead and pulling away at full speed: no feasible intercept.
    const away = { x: 54, y: 26, vx: 9.5, vy: 0 };
    const hopeless = scene(away);
    expect(hopeless.run().q.effortRead).toMatchObject({ feasible: false, wants: 'pace', mode: 'pace' });
    vi.restoreAllMocks();

    // Committed on a reachable crosser, then the runner breaks away.
    const s = scene({ x: 55, y: 18, vx: 0, vy: 5 });
    expect(s.run().q.effortRead!.mode).toBe('sprint');
    s.see.mockImplementation((_o, t) => ({ pos: t === s.c ? { x: away.x, y: away.y } : { x: -50, y: 0 },
      vel: t === s.c ? { x: away.vx, y: 0 } : { x: 0, y: 0 }, facing: 0, stance: null, age: .2 }));
    s.sim.t += .05;
    expect(s.run().q.effortRead).toMatchObject({ feasible: false, wants: 'pace', mode: 'sprint', effort: 1 });
    s.sim.t += .2;
    expect(s.run().q.effortRead!.mode).toBe('sprint');
    s.sim.t += .1;
    expect(s.run().q.effortRead).toMatchObject({ mode: 'pace' });
    vi.restoreAllMocks();
  });

  it('reads only pictures: unacquired reality cannot move the effort decision', () => {
    const { c, run } = scene({ x: 60, y: 10, vx: 0, vy: 6 });
    const first = run().command;
    c.body.pos = { x: -100, y: 50 }; c.body.vel = { x: -8, y: 0 };
    expect(run().command).toEqual(first);
    vi.restoreAllMocks();
  });
});
