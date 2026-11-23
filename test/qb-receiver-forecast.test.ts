import { describe, expect, it, vi } from 'vitest';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { PASS_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { getRoute } from '../src/playbook/routes.js';
import type { RouteDef } from '../src/playbook/types.js';
import { QBPass } from '../src/sim/behaviors/qb.js';
import { RouteRunner } from '../src/sim/behaviors/receiver.js';
import { ReceiverForecast, installReceiverRoute } from '../src/sim/receiver-forecast.js';
import { PlaySim } from '../src/sim/playsim.js';

const home = generateTeam(new Rng(91), 'Estimate offense', 'EOF');
const away = generateTeam(new Rng(92), 'Estimate defense', 'EDF');
function fixture() {
  const sim = new PlaySim({ offense: pickOffense(home, '11'), defense: pickDefense(away, 'nickel'), seed: 45,
    offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: false, kind: 'pass', pass: PASS_BY_ID.slant_flat, label: 'slant' },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3,
      pressure: null, zoneStyle: 'match', label: 'Over Cover 3' },
    los: 40, ballY: 26, firstDownX: 50, audibles: false });
  return { sim, qb: sim.qb.behavior as QBPass, r: sim.slot('X')! };
}
function snapshot(f: ReturnType<typeof fixture>, pos: { x: number; y: number }, vel = { x: 0, y: 0 }) {
  f.r.body.pos = { ...pos }; f.r.body.vel = { ...vel }; f.r.body.facing = Math.atan2(vel.y, vel.x);
  for (let i = 0; i < 24; i++) f.sim.perception.record(f.sim.agents);
}

describe('QB receiver acquired picture and immutable installation', () => {
  it('uses the installed definition, deep copies it, and never adopts a converted live path', () => {
    const f = fixture();
    const route: RouteDef = { ...getRoute('out'), points: getRoute('out').points.map(p => ({ ...p })) };
    const prior = installReceiverRoute(f.r.pos, f.sim.los, 1, route, 0, f.r.profile, f.r.r('routeRunning'));
    const forecast = new ReceiverForecast(f.sim.qb, prior, f.sim.dt);
    const expected = forecast.predict(.2, 1.5);
    route.points[0].d += 30;
    const rr = f.r.behavior as RouteRunner;
    rr.path[0] = { p: { x: 90, y: 3 }, s: .1 }; rr.idx = 4; rr.settled = true;
    f.r.body.energy = .1; f.r.body.vel = { x: -7, y: 2 };
    expect(Object.isFrozen(prior.path[0].p)).toBe(true);
    expect(forecast.predict(.2, 1.5)).toEqual(expected);
    expect(forecast.estimate?.progress).toBeNull(); // Installed expectation is not acquired progress.
  });

  it('does not reinterpret an unobserved conditional release as stationary motion', () => {
    const f = fixture();
    const prior = installReceiverRoute(f.r.pos, 40, 1, getRoute('checkdown'), null, f.r.profile, f.r.r('routeRunning'));
    const forecast = new ReceiverForecast(f.sim.qb, prior, f.sim.dt);
    expect(forecast.predict(1, 1)).toBeNull(); expect(forecast.estimate).toBeNull();
    forecast.acquire({ pos: prior.start, vel: { x: 0, y: 0 }, facing: 0, sampledAt: .8, acquiredAt: 1 });
    expect(forecast.estimate).toMatchObject({ progress: null, motion: 'observed-motion' });
  });

  it('gates receiver acquisition by the delayed look, bypasses automatic teammate refresh, and preserves timestamps without RNG', () => {
    const f = fixture(); snapshot(f, { x: 48, y: 45 }, { x: 3, y: 0 }); f.sim.t = .4;
    const rng = { ...f.sim.rng };
    const see = vi.spyOn(f.sim, 'see');
    expect(f.sim.qbMind.receiverLook(f.r, { x: 60, y: 6 })).toBeNull();
    // Hidden current position enters the look, but the delayed position remains outside.
    f.r.body.pos = { x: 48, y: 6 };
    expect(f.sim.qbMind.receiverLook(f.r, { x: 60, y: 6 })).toBeNull();
    const p = f.sim.qbMind.receiverLook(f.r, { x: 48, y: 45 })!;
    // The delayed position (PERIPH_ACUITY: within his stated error for the look's small eccentricity), not the hidden one.
    expect(Math.hypot(p.pos.x - 48, p.pos.y - 45)).toBeLessThan(4 * Math.hypot(p.sigP ?? 0, p.sigV ?? 0) + 1e-9);
    expect(Math.hypot(p.pos.x - 48, p.pos.y - 45)).toBeLessThan(0.2);
    expect(p.acquiredAt).toBe(.4); expect(p.sampledAt).toBeLessThan(.35);
    expect(see).not.toHaveBeenCalled(); expect({ ...f.sim.rng }).toEqual(rng);
  });

  it('keeps observer/estimate caches separate and changes only on a new picture', () => {
    const f = fixture(), start = { x: 40, y: 18 };
    const prior = installReceiverRoute(start, 40, 1, getRoute('go'), 0, f.r.profile, f.r.r('routeRunning'));
    const a = new ReceiverForecast({}, prior, .05), b = new ReceiverForecast({}, prior, .05);
    a.acquire({ pos: { x: 44, y: 18 }, vel: { x: 5, y: 0 }, facing: 0, sampledAt: .6, acquiredAt: .8 });
    b.acquire({ pos: { x: 44, y: 21 }, vel: { x: 0, y: 4 }, facing: Math.PI / 2, sampledAt: .6, acquiredAt: .8 });
    const first = a.predict(.8, .5);
    expect(b.predict(.8, .5)).not.toEqual(first);
    expect(a.predict(.8, .5)).toEqual(first);
    a.acquire({ pos: { x: 44, y: 21 }, vel: { x: 0, y: 4 }, facing: Math.PI / 2, sampledAt: .7, acquiredAt: .8 });
    expect(a.predict(.8, .5)).not.toEqual(first);
    expect(a.estimate).toMatchObject({ progress: null, motion: 'observed-motion', sampledAt: .7 });
  });

  it('keeps geometrically ambiguous progress unknown rather than guessing a private waypoint', () => {
    const f = fixture();
    const route: RouteDef = { id: 'overlap-control', family: 'cross', depth: 10, end: 'settle',
      points: [{ d: 10, l: 0 }, { d: 0, l: 0 }, { d: 10, l: 0 }] };
    const forecast = new ReceiverForecast(f.sim.qb,
      installReceiverRoute({ x: 40, y: 18 }, 40, 1, route, 0, f.r.profile, f.r.r('routeRunning')), .05);
    forecast.acquire({ pos: { x: 45, y: 18 }, vel: { x: 5, y: 0 }, facing: 0, sampledAt: .6, acquiredAt: .8 });
    expect(forecast.estimate).toMatchObject({ progress: null, motion: 'observed-motion' });
  });

  it('retains anticipatory route bending before the receiver reaches the installed break', () => {
    const f = fixture(), start = { x: 40, y: 18 };
    const prior = installReceiverRoute(start, 40, 1, getRoute('out'), 0, f.r.profile, f.r.r('routeRunning'));
    const forecast = new ReceiverForecast(f.sim.qb, prior, .05);
    forecast.acquire({ pos: { x: 43, y: 18 }, vel: { x: 5, y: 0 }, facing: 0, sampledAt: .6, acquiredAt: .8 });
    expect(forecast.estimate?.progress).toBe(0);
    expect(forecast.predict(.8, 1.5)!.y).toBeGreaterThan(19);
    // Current linear extrapolation would still be at y18.
  });

  it('uses a newly visible deviation without copying the receiver conversion/path', () => {
    const f = fixture(), start = { x: 40, y: 18 };
    const forecast = new ReceiverForecast(f.sim.qb,
      installReceiverRoute(start, 40, 1, getRoute('go'), 0, f.r.profile, f.r.r('routeRunning')), .05);
    snapshot(f, { x: 45, y: 18 }, { x: 5, y: 0 }); f.sim.t = .8;
    forecast.acquire(f.sim.qbMind.receiverLook(f.r, { x: 48, y: 20 })!);
    const stem = forecast.predict(.8, .7)!;
    // QB still holds the old picture while the receiver actually cuts.
    f.r.body.pos = { x: 45, y: 20 }; f.r.body.vel = { x: 0, y: 5 };
    expect(forecast.predict(.8, .7)).toEqual(stem);
    snapshot(f, { x: 45, y: 20 }, { x: 0, y: 5 }); f.sim.t = .9;
    forecast.acquire(f.sim.qbMind.receiverLook(f.r, { x: 48, y: 20 })!);
    expect(forecast.estimate).toMatchObject({ progress: null, motion: 'observed-motion' });
    expect(forecast.predict(.9, .7)!.y).toBeGreaterThan(stem.y + 3);
  });

  it('feeds a newly acquired deviation through both production forecast consumers', () => {
    const f = fixture();
    const forecasts = Reflect.get(f.qb, 'receiverForecasts') as Map<typeof f.r, ReceiverForecast>;
    const forecast = forecasts.get(f.r)!;
    const start = forecast.prior.start;
    snapshot(f, { x: start.x + 3, y: start.y }, { x: 5, y: 0 }); f.sim.t = .8;
    const gaze = { x: start.x + 10, y: start.y };
    forecast.acquire(f.sim.qbMind.receiverLook(f.r, gaze)!);
    f.sim.t = .9;
    const evaluate = Reflect.get(f.qb, 'evaluate').bind(f.qb);
    const release = Reflect.get(f.qb, 'release').bind(f.qb);
    const ev = evaluate(f.sim.qb, f.sim, f.r, .2);
    const thrown = vi.spyOn(f.sim, 'throwBall').mockImplementation(() => {});
    release(f.sim.qb, f.sim, ev);
    const heldAim = thrown.mock.calls[0][3];
    snapshot(f, { x: start.x + 3, y: start.y + 2 }, { x: 0, y: 5 });
    // Body changes alone do not refresh this receiver estimate.
    expect(evaluate(f.sim.qb, f.sim, f.r, .2).point).toEqual(ev.point);
    forecast.acquire(f.sim.qbMind.receiverLook(f.r, gaze)!);
    expect(evaluate(f.sim.qb, f.sim, f.r, .2).point).not.toEqual(ev.point);
    release(f.sim.qb, f.sim, ev); // The same pending throw re-aims from the new look.
    expect(thrown.mock.calls[1][3]).not.toEqual(heldAim);
  });

  it('can start an anticipatory throw before the installed break using the ordinary QB decision hook', () => {
    // Controlled open-window fixture, not evidence of live-play benefit.
    const concept = { ...PASS_BY_ID.curl_flat, strong: { 1: 'out', 2: 'out' }, weak: { 1: 'out', 2: 'out' }, back: 'block' };
    const sim = new PlaySim({ offense: pickOffense(home, '11'), defense: pickDefense(away, 'nickel'), seed: 45,
      offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: false, kind: 'pass', pass: concept, label: 'out control' },
      defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3,
        pressure: null, label: 'open-window control' }, los: 40, ballY: 26, firstDownX: 50, audibles: false });
    const qb = sim.qb.behavior as QBPass;
    const r = sim.agents[qb.recordedState().read!], rr = r.behavior as RouteRunner;
    sim.t = rr.breakTime - .15 * sim.qb.r('anticipation');
    sim.qb.body.pos = { x: sim.los - 7.3, y: sim.ballY };
    r.body.pos = { x: sim.los + 8, y: r.pos.y }; r.body.vel = { x: 6, y: 0 };
    // In his view and off the throw's path (SIGHT_PURE holds a man he never sees at his alignment; parked 25 yd behind
    // him, out of view, they read as still in the window: Tools/Physics, 2026-11-23).
    for (const d of sim.defense) { d.body.pos = { x: sim.los + 25, y: 50 }; d.body.vel = { x: 0, y: 0 }; }
    for (let i = 0; i < 24; i++) sim.perception.record(sim.agents);
    sim.qbMind.observe({ x: sim.los + 25, y: 50 }); // Acquire the deliberately empty window honestly.
    const ownState = qb as unknown as { phase: string; setAt: number; readStart: number; lookOffChecked: boolean };
    ownState.phase = 'set'; ownState.setAt = sim.t; ownState.readStart = sim.t; ownState.lookOffChecked = true;
    qb.update(sim.qb, sim);
    const state = qb.recordedState();
    expect(sim.t).toBeLessThan(rr.breakTime);
    expect(state.phase).toBe('windup');
    expect(state.pending?.target).toBe(r.idx);
    expect(Math.abs(state.pending!.point[1] - r.pos.y)).toBeGreaterThan(1);
  });
});
