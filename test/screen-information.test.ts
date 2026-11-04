import { afterEach, describe, expect, it, vi } from 'vitest';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { SCREEN_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import type { Agent, Engagement } from '../src/sim/agent.js';
import { ScreenBlocker } from '../src/sim/behaviors/screen.js';
import { PassProtector, ProtectionCoordinator } from '../src/sim/behaviors/blocking.js';
import type { Perceived } from '../src/sim/perception.js';
import { PlaySim } from '../src/sim/playsim.js';
import { sawThrow } from '../src/sim/behaviors/defense.js';
import type { ReceiverForecast } from '../src/sim/receiver-forecast.js';
import type { RouteRunner } from '../src/sim/behaviors/receiver.js';
import { timeToReach } from '../src/physics/reach.js';

function screenSetup() {
  const formation = FORMATION_BY_ID.gun_doubles_11;
  return new PlaySim({ offense: pickOffense(generateTeam(new Rng(41), 'O', 'O', { strength: .55 }), '11'),
    defense: pickDefense(generateTeam(new Rng(42), 'D', 'D', { strength: .55 }), 'nickel'),
    offCall: { formation, flip: false, kind: 'pass', pass: SCREEN_BY_ID.rb_slip_screen, label: 'slip' },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'Over3' },
    los: 35, ballY: 26, firstDownX: 45, seed: 1007 });
}

function stage(side = 1) {
  const sim = screenSetup(), a = sim.slot('Z')!, mate = sim.slot('X')!, back = sim.slot('RB')!;
  const d = sim.slot('LB_M')!, other = sim.slot('CB_S')!;
  for (const x of sim.agents) {
    x.body.pos = { x: 80 + x.idx, y: 5 }; x.body.vel = { x: 0, y: 0 };
    x.behavior = { kind: 'idle', update: () => ({ vel: { x: 0, y: 0 } }) };
  }
  a.body.pos = { x: 36, y: 26 }; d.body.pos = { x: 39, y: 26 + side }; other.body.pos = { x: 41, y: 26 - 2 * side };
  back.body.pos = { x: 33, y: 26 };
  const work = new ScreenBlocker(a, 'up', side, { x: 33, y: 26 }, false); a.behavior = work;
  sim.t = sim.world.time = 2; sim.ball = { kind: 'held', carrier: back };
  for (let i = 0; i < 24; i++) sim.perception.record(sim.agents, back.idx);
  const pictures = new Map(sim.agents.map(x => [x, structuredClone(sim.see(a, x))]));
  vi.spyOn(sim, 'see').mockImplementation((_observer, x) => structuredClone(pictures.get(x)!));
  return { sim, a, mate, back, d, other, work, pictures };
}
type Scene = ReturnType<typeof stage>;
function decision(f: Scene) {
  const body = structuredClone(f.a.body), rng = JSON.stringify(f.sim.rng);
  const command = f.work.update(f.a, f.sim);
  expect(f.a.body).toEqual(body); expect(JSON.stringify(f.sim.rng)).toBe(rng);
  return { command, target: f.work.target?.slot };
}
afterEach(() => vi.restoreAllMocks());

describe('screen jobs consume acquired information', () => {
  it.each([-1, 1])('hidden assignments, contact, pose and possession cannot choose the block, side %s', side => {
    const base = decision(stage(side));
    expect(base.target).toBe('LB_M');
    for (const mutate of [
      (f: Scene) => { Object.assign(f.mate.behavior, { target: f.d }); },
      (f: Scene) => { const e = { blocker: f.mate, defender: f.d } as Engagement; f.d.engagement = f.mate.engagement = e; },
      (f: Scene) => { f.back.body.pos = { x: 33, y: 26 + side * 10 }; f.back.body.vel = { x: 8, y: -5 }; },
      (f: Scene) => { f.sim.ball = { kind: 'held', carrier: f.sim.qb }; },
      (f: Scene) => { f.d.downUntil = 3; },
    ]) {
      const f = stage(side); mutate(f); expect(decision(f)).toEqual(base);
    }
  });

  it('takes a free man when acquired contact or pose makes the first man unavailable', () => {
    const contact = stage(), p = contact.pictures.get(contact.mate)!;
    p.pos = { x: contact.d.pos.x - .8, y: contact.d.pos.y }; p.facing = 0;
    expect(decision(contact).target).toBe('CB_S');
    const down = stage(); down.pictures.get(down.d)!.pose = 'down';
    expect(decision(down).target).toBe('CB_S');
  });

  it('changes the fit when a new acquired carrier picture changes, while unknown possession keeps the installed point', () => {
    const base = decision(stage()), moved = stage();
    moved.pictures.get(moved.back)!.pos.y += 10;
    expect(decision(moved).command).not.toEqual(base.command);
    const unknown = stage(), empty = stage();
    unknown.pictures.get(unknown.back)!.carrying = undefined;
    empty.pictures.get(empty.back)!.carrying = false;
    unknown.back.body.pos.y += 10;
    expect(decision(unknown)).toEqual(decision(empty));
  });

  it('prethrow line eligibility uses perceived target depth, not hidden depth across the limit', () => {
    const run = (hidden: boolean) => {
      const f = stage(); f.a.body.pos = { x: 34, y: 26 }; f.sim.ball = { kind: 'held', carrier: f.sim.qb };
      f.pictures.get(f.back)!.carrying = false; f.pictures.get(f.sim.qb)!.carrying = true;
      f.pictures.get(f.d)!.pos = { x: 35.7, y: 26 }; f.d.body.pos = { x: hidden ? 36 : 35.7, y: 26 };
      f.work = new ScreenBlocker(f.a, 'in', 1, { x: 33, y: 26 }, true); f.a.behavior = f.work;
      f.work.target = f.d; Reflect.set(f.work, 'retargetAt', Infinity);
      return decision(f);
    };
    expect(run(true)).toEqual(run(false));
  });

  it('keeps actual body contact as an execution gate, independent of a stale far picture', () => {
    const f = stage(), engage = vi.spyOn(f.sim, 'engage').mockReturnValue(null);
    f.work.target = f.d; Reflect.set(f.work, 'retargetAt', Infinity);
    f.work.update(f.a, f.sim); expect(engage).not.toHaveBeenCalled();
    f.d.body.pos = { x: f.a.pos.x + .4, y: f.a.pos.y };
    f.work.update(f.a, f.sim); expect(engage).toHaveBeenCalledWith(f.a, f.d, 'run', expect.any(Object));
  });

  it('an active screen blocker sees an in-view flight through the existing throw sensor', () => {
    const sim = screenSetup(), a = sim.slot('Z')!;
    a.behavior = new ScreenBlocker(a, 'stalk', 1, { x: 34, y: 26 }, false);
    a.body.pos = { x: 35, y: 26 }; a.body.facing = 0;
    sim.ball = { kind: 'air', flight: { pos: { x: 37, y: 26, z: 2 } } } as typeof sim.ball;
    sim.t = 1; sim.throwSight.sense(sim);
    expect(sim.throwSight.seenAt(a)).toBe(1); expect(sawThrow(a, sim, null)).toBe(false);
    sim.t = 2; expect(sawThrow(a, sim, null)).toBe(true);
  });

  it('called back release requires visible help, not a remote engagement flag', () => {
    const release = (hidden: boolean, visible: boolean) => {
      const f = stage(), a = f.back, coord = new ProtectionCoordinator(); coord.add(a); coord.assigned.set(a, f.d);
      vi.spyOn(coord, 'update').mockImplementation(() => {});
      f.sim.ball = { kind: 'held', carrier: f.sim.qb };
      f.pictures.get(f.back)!.carrying = false; f.pictures.get(f.sim.qb)!.carrying = true;
      if (hidden) f.d.engagement = { blocker: f.mate, defender: f.d } as Engagement;
      if (visible) { const p = f.pictures.get(f.mate)!; p.pos = { x: f.d.pos.x - .8, y: f.d.pos.y }; p.facing = 0; }
      const released = { kind: 'released', update: () => ({ vel: { x: 0, y: 0 } }) };
      const work = new PassProtector(coord, () => released, 1, true); a.behavior = work;
      work.update(a, f.sim); return a.behavior.kind;
    };
    expect(release(false, false)).toBe('pass-pro'); expect(release(true, false)).toBe('pass-pro');
    expect(release(false, true)).toBe('released');
  });
});

function qbStage() {
  const sim = screenSetup(), a = sim.qb, r = sim.slot('RB')!, d = sim.slot('LB_M')!, mate = sim.slot('X')!;
  const work = a.behavior as unknown as {
    screenTouch: (a: Agent, s: PlaySim, r: Agent, pt: { x: number; y: number }, t: number) => string;
    ready: (r: Agent, s: PlaySim) => boolean;
  };
  const forecast = (Reflect.get(work, 'receiverForecasts') as Map<Agent, ReceiverForecast>).get(r)!;
  a.body.pos = { x: 30, y: 26 }; sim.t = sim.world.time = 2;
  const pictures = new Map<Agent, Perceived>(sim.agents.map(x => [x, {
    pos: { x: 80 + x.idx, y: 5 }, vel: { x: 0, y: 0 }, facing: 0, pose: 'up', stance: null, age: 0,
  }]));
  pictures.get(d)!.pos = { x: 35, y: 28 };
  pictures.get(r)!.pos = { x: 34, y: 26 }; pictures.get(r)!.vel = { x: 2, y: 0 };
  const estimates = vi.spyOn(sim.qbMind, 'estimate').mockImplementation(x => structuredClone(pictures.get(x)!));
  vi.spyOn(sim.qbMind, 'receiverLook').mockImplementation(x => {
    const p = pictures.get(x)!;
    return { ...structuredClone(p), sampledAt: sim.t, acquiredAt: sim.t };
  });
  forecast.acquire({ ...pictures.get(r)!, sampledAt: sim.t, acquiredAt: sim.t });
  const pt = { x: 35, y: 26 }, cue = pictures.get(d)!;
  const T = timeToReach({ pos: cue.pos, vel: cue.vel, profile: d.profile }, pt, d.profile.reach) - .1;
  const touch = () => work.screenTouch(a, sim, r, pt, T);
  return { sim, a, r, d, mate, work, forecast, pictures, estimates, touch };
}

describe('slow-screen QB decisions use his acquired look', () => {
  it('hidden remote contact, pose and fatigue do not choose touch', () => {
    const base = qbStage(); expect(base.touch()).toBe('firm');
    for (const mutate of [
      (f: ReturnType<typeof qbStage>) => { f.d.engagement = { blocker: f.mate, defender: f.d } as Engagement; },
      (f: ReturnType<typeof qbStage>) => { f.d.downUntil = 3; },
      (f: ReturnType<typeof qbStage>) => { f.d.body.energy = .05; f.d.body.sprintLoad = 10; },
    ]) { const f = qbStage(); mutate(f); expect(f.touch()).toBe('firm'); }
  });

  it('visible contact and a newly remembered fall can still permit the drifting receiver touch', () => {
    const contact = qbStage(), p = contact.pictures.get(contact.mate)!;
    p.pos = { x: 34.2, y: 28 }; p.facing = 0;
    expect(contact.touch()).toBe('float');
    const down = qbStage();
    // The existing look owns this memory; the live defender remains upright.
    Reflect.get(down.sim.qbMind, 'memory').get(down.d).pose = 'down';
    expect(down.touch()).toBe('float');
  });

  it('receiver drift comes from the held forecast, never an automatic teammate estimate', () => {
    const f = qbStage(); f.pictures.get(f.d)!.pos = { x: 80, y: 5 };
    expect(f.touch()).toBe('float');
    f.pictures.get(f.r)!.vel = { x: -4, y: 0 }; f.r.body.vel = { x: -9, y: 5 };
    expect(f.touch()).toBe('float');
    expect(f.estimates.mock.calls.some(([x]) => x === f.r)).toBe(false);
    f.forecast.acquire({ ...f.pictures.get(f.r)!, sampledAt: f.sim.t + .05, acquiredAt: f.sim.t + .05 });
    f.sim.t += .05; expect(f.touch()).toBe('firm');
  });

  it('slow-screen readiness follows acquired departure and arrival, not private route progress', () => {
    const f = qbStage(), release = Reflect.get(f.r.behavior, 'releaseTo') as () => RouteRunner;
    f.r.behavior = release();
    const prior = f.forecast.prior, last = prior.path.at(-1)!.p;
    f.forecast.acquire({ pos: prior.start, vel: { x: 0, y: 0 }, facing: 0, sampledAt: f.sim.t, acquiredAt: f.sim.t });
    expect(f.work.ready(f.r, f.sim)).toBe(false);
    f.r.body.pos = { ...last }; (f.r.behavior as RouteRunner).settled = true;
    expect(f.work.ready(f.r, f.sim)).toBe(false);
    f.forecast.acquire({ pos: last, vel: { x: 0, y: 0 }, facing: 0, pose: 'up', sampledAt: f.sim.t, acquiredAt: f.sim.t });
    expect(f.work.ready(f.r, f.sim)).toBe(true);
    f.forecast.acquire({ pos: last, vel: { x: 0, y: 0 }, facing: 0, pose: 'down', sampledAt: f.sim.t, acquiredAt: f.sim.t });
    expect(f.work.ready(f.r, f.sim)).toBe(false);
  });
});
