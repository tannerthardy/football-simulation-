import { afterEach, describe, expect, it, vi } from 'vitest';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { SCREEN_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import type { Agent } from '../src/sim/agent.js';
import type { RouteRunner } from '../src/sim/behaviors/receiver.js';
import { PlaySim } from '../src/sim/playsim.js';
import type { ReceiverForecast } from '../src/sim/receiver-forecast.js';
import { screenSpot } from '../src/sim/screen-spot.js';

function quick(flip = false) {
  const sim = new PlaySim({
    offense: pickOffense(generateTeam(new Rng(41), 'O', 'O', { strength: .55 }), '11'),
    defense: pickDefense(generateTeam(new Rng(42), 'D', 'D', { strength: .55 }), 'nickel'),
    offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip, kind: 'pass', pass: SCREEN_BY_ID.tunnel_screen, label: 'tunnel' },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'Over3' },
    los: 35, ballY: 26, firstDownX: 45, seed: 1007 });
  const spot = screenSpot(sim, sim.offCall.pass!)!, r = spot.receiver, a = sim.qb;
  const work = a.behavior as unknown as {
    toSpot: (a: Agent, sim: PlaySim, r: Agent) => { spot: { x: number; y: number }; lead: number; natural: number; float: number } | null;
    ready: (r: Agent, sim: PlaySim) => boolean;
  };
  const forecast = (Reflect.get(work, 'receiverForecasts') as Map<Agent, ReceiverForecast>).get(r)!;
  const release = Reflect.get(r.behavior, 'continuation') as () => RouteRunner;
  sim.t = sim.world.time = 2; a.body.pos = { x: 31, y: 26 };
  const sample = (pos: { x: number; y: number }, vel = { x: 0, y: 0 }, pose: 'up' | 'down' | 'rising' = 'up') =>
    forecast.acquire({ pos, vel, facing: Math.atan2(vel.y, vel.x), pose, sampledAt: sim.t, acquiredAt: sim.t });
  const record = () => { for (let i = 0; i < 24; i++) sim.perception.record(sim.agents, a.idx); };
  const depart = () => {
    const start = forecast.prior.start, waypoint = forecast.prior.path[0].p;
    const pos = { x: (start.x + waypoint.x) / 2, y: (start.y + waypoint.y) / 2 };
    const vel = { x: waypoint.x - start.x, y: waypoint.y - start.y };
    r.body.pos = { ...pos }; r.body.vel = { ...vel }; sample(pos, vel); record();
  };
  return { sim, a, r, work, forecast, spot, sample, record, depart, release };
}
afterEach(() => vi.restoreAllMocks());

describe('quick sell-screen QB acquired-information boundary', () => {
  it.each([false, true].flatMap(flip => ['body', 'fatigue'].map(hidden => ({ flip, hidden }))))(
    'held look excludes unseen $hidden changes, flip $flip', ({ flip, hidden }) => {
      const base = quick(flip); base.depart();
      const expected = base.work.toSpot(base.a, base.sim, base.r); expect(expected).not.toBeNull();
      const f = quick(flip); f.depart();
      if (hidden === 'body') {
        f.r.body.pos.x += 8; f.r.body.pos.y += 4; f.r.body.vel = { x: -7, y: 3 }; f.record();
      } else { f.r.body.energy = .05; f.r.body.sprintLoad = 10; f.r.body.squeeze = 1; }
      const see = vi.spyOn(f.sim, 'see');
      expect(f.work.toSpot(f.a, f.sim, f.r)).toEqual(expected);
      expect(see).not.toHaveBeenCalled();
    });

  it.each([false, true])('private release and route progress cannot change eligibility before or after acquired arrival, flip %s', flip => {
    const f = quick(flip); f.depart();
    expect(f.r.behavior.kind).toBe('block-look');
    const to = f.work.toSpot(f.a, f.sim, f.r)!; expect(to.lead).toBeLessThanOrEqual(to.float);
    expect(f.work.ready(f.r, f.sim)).toBe(true);
    f.r.behavior = f.release(); Reflect.set(f.r.behavior, 'breakTime', Infinity);
    expect(f.work.ready(f.r, f.sim)).toBe(true);
    f.sample(f.spot.spot); f.r.body.pos = { ...f.spot.spot }; f.record();
    expect(f.work.toSpot(f.a, f.sim, f.r)).toBeNull(); // Acquired arrival latches spotDone.
    expect(Reflect.get(f.work, 'spotDone')).toBe(true);
    f.r.behavior = { kind: 'block-look', update: () => ({ vel: { x: 0, y: 0 } }) };
    expect(f.work.ready(f.r, f.sim)).toBe(true);
    f.r.behavior = f.release(); Reflect.set(f.r.behavior, 'breakTime', Infinity);
    expect(f.work.ready(f.r, f.sim)).toBe(true);
  });

  it('unknown release, an acquired stationary sell and contradictory pose cannot create a throw opportunity', () => {
    const unknown = quick(); unknown.record(); unknown.r.behavior = unknown.release();
    expect(unknown.forecast.prior.startDelay).toBeNull(); expect(unknown.forecast.estimate).toBeNull();
    expect(unknown.work.toSpot(unknown.a, unknown.sim, unknown.r)).toBeNull();
    expect(unknown.work.ready(unknown.r, unknown.sim)).toBe(false);
    const waiting = quick(); waiting.sample(waiting.forecast.prior.start); waiting.record();
    waiting.r.behavior = waiting.release();
    expect(waiting.work.toSpot(waiting.a, waiting.sim, waiting.r)).toBeNull();
    expect(waiting.work.ready(waiting.r, waiting.sim)).toBe(false);
    for (const pose of ['down', 'rising'] as const) {
      const f = quick(); f.depart(); f.sample(f.r.pos, f.r.vel, pose); f.r.behavior = f.release();
      expect(f.work.toSpot(f.a, f.sim, f.r)).toBeNull(); expect(f.work.ready(f.r, f.sim)).toBe(false);
      const arrived = quick(); arrived.sample(arrived.spot.spot); arrived.r.body.pos = { ...arrived.spot.spot }; arrived.record();
      arrived.work.toSpot(arrived.a, arrived.sim, arrived.r);
      arrived.sample(arrived.spot.spot, { x: 0, y: 0 }, pose);
      expect(arrived.work.ready(arrived.r, arrived.sim)).toBe(false);
    }
  });

  it.each([false, true])('an acquired pre-turn departure can anticipate; new motion changes arrival without a private turn gate, flip %s', flip => {
    const f = quick(flip), start = f.forecast.prior.start;
    // Still selling outward/upfield: explicitly not recognized as route progress.
    const pos = { x: start.x + .6, y: start.y }, vel = { x: .2, y: .2 * f.spot.side };
    f.sample(pos, vel); f.r.body.pos = { ...pos }; f.r.body.vel = { ...vel }; f.record();
    expect(f.forecast.estimate?.progress).toBeNull();
    const before = f.work.toSpot(f.a, f.sim, f.r)!;
    expect(before).not.toBeNull(); expect(before.lead).toBeLessThanOrEqual(before.float);
    expect(f.work.ready(f.r, f.sim)).toBe(true);
    f.depart(); // A new acquired post-turn picture supplies different arrival evidence.
    expect(f.forecast.estimate?.progress).not.toBeNull();
    const after = f.work.toSpot(f.a, f.sim, f.r)!;
    expect(after.lead).not.toBe(before.lead); expect(after.float).toBe(before.float);
    expect(f.work.ready(f.r, f.sim)).toBe(true);
  });
});
