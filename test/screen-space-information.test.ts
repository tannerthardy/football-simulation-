import { afterEach, describe, expect, it, vi } from 'vitest';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { SCREEN_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import type { Agent, Engagement } from '../src/sim/agent.js';
import type { Perceived } from '../src/sim/perception.js';
import { ScreenBlocker } from '../src/sim/behaviors/screen.js';
import { carrierLane, laneFrom, threatOf } from '../src/sim/behaviors/space-block.js';
import { PlaySim } from '../src/sim/playsim.js';

function stage(side = 1) {
  const pass = structuredClone(SCREEN_BY_ID.rb_slip_screen);
  const sim = new PlaySim({
    offense: pickOffense(generateTeam(new Rng(41), 'O', 'O', { strength: .55 }), '11'),
    defense: pickDefense(generateTeam(new Rng(42), 'D', 'D', { strength: .55 }), 'nickel'),
    offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: side < 0, kind: 'pass', pass, label: 'slip' },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'Over3' },
    los: 35, ballY: 26, firstDownX: 45, seed: 1007 });
  const a = sim.slot('Z')!, mate = sim.slot('C')!, back = sim.slot('RB')!;
  const d = sim.slot('LB_M')!, other = sim.slot('CB_S')!;
  for (const x of sim.agents) {
    x.body.pos = { x: 80 + x.idx, y: 5 }; x.body.vel = { x: 0, y: 0 };
    x.behavior = { kind: 'idle', update: () => ({ vel: { x: 0, y: 0 } }) };
  }
  a.body.pos = { x: 36, y: 26 }; d.body.pos = { x: 39, y: 26 + side };
  other.body.pos = { x: 41, y: 26 - 2 * side }; back.body.pos = { x: 33, y: 26 };
  // The other candidate's job is a called fact. His current controller is not.
  pass.screen!.blocks = [{ who: 'C', job: 'up' }];
  const spot = { x: 33, y: 26 };
  const work = new ScreenBlocker(a, 'up', side, spot, false); a.behavior = work;
  mate.behavior = new ScreenBlocker(mate, 'up', side, spot, true);
  sim.t = sim.world.time = 2; sim.ball = { kind: 'held', carrier: back };
  const pictures = new Map<Agent, Perceived>(sim.agents.map(x => [x, {
    pos: { ...x.pos }, vel: { ...x.vel }, facing: x === d || x === other ? Math.PI : 0,
    pose: 'up', stance: null, age: 0, carrying: x === back,
  }]));
  vi.spyOn(sim, 'see').mockImplementation((_observer, x) => structuredClone(pictures.get(x)!));
  return { sim, a, mate, back, d, other, work, pictures, spot, side };
}
type Scene = ReturnType<typeof stage>;
function decision(f: Scene) {
  const own = structuredClone(f.a.body);
  const command = f.work.update(f.a, f.sim);
  expect(f.a.body).toEqual(own);
  return { command, target: f.work.target?.slot ?? null };
}
const hiddenChanges: Array<[string, (f: Scene) => void]> = [
  ['carrier body', f => { f.back.body.pos = { x: 45, y: 26 + f.side * 10 }; f.back.body.vel = { x: 8, y: -5 }; }],
  ['holder identity', f => { f.sim.ball = { kind: 'held', carrier: f.sim.qb }; }],
  ['remote contact', f => { const e = { blocker: f.mate, defender: f.d } as Engagement; f.mate.engagement = f.d.engagement = e; }],
  ['remote fall', f => { f.d.downUntil = 3; }],
  ['teammate position', f => { f.mate.body.pos = { x: 38, y: 26 + f.side }; }],
  ['teammate movement and fatigue', f => { f.mate.body.vel = { x: -8, y: f.side * 9 }; f.mate.body.energy = .05; f.mate.body.sprintLoad = 10; }],
  ['teammate private controller', f => { f.mate.behavior = { kind: 'pass-pro', update: () => ({ vel: { x: 0, y: 0 } }) }; }],
];
afterEach(() => vi.restoreAllMocks());

describe('screen space matching consumes each blocker\'s acquired picture', () => {
  for (const side of [-1, 1]) {
    it.each(hiddenChanges)('ignores hidden %s, side ' + side, (_name, mutate) => {
      const expected = decision(stage(side)); expect(expected.target).not.toBeNull();
      const changed = stage(side); mutate(changed);
      expect(decision(changed)).toEqual(expected);
    });

    it('responds to acquired carrier movement, contact and falling, side ' + side, () => {
      const original = stage(side), expected = decision(original);
      const moved = stage(side); moved.pictures.get(moved.back)!.pos.y += 10 * side;
      expect(decision(moved).command).not.toEqual(expected.command);
      const target = original.work.target!;
      const contact = stage(side), ctarget = contact.sim.slot(target.slot)!;
      const p = contact.pictures.get(contact.mate)!, ds = contact.pictures.get(ctarget)!;
      p.pos = { x: ds.pos.x - .8, y: ds.pos.y }; p.facing = 0;
      expect(decision(contact).target).not.toBe(expected.target);
      const down = stage(side); down.pictures.get(down.sim.slot(target.slot)!)!.pose = 'down';
      expect(decision(down).target).not.toBe(expected.target);
    });

    it('anticipates a free called lineman from his pictured departure, not his private phase, side ' + side, () => {
      const f = stage(side), expected = decision(f), target = f.work.target!;
      const waiting = stage(side); waiting.sim.ball = { kind: 'held', carrier: waiting.sim.qb };
      waiting.pictures.get(waiting.back)!.carrying = false; waiting.pictures.get(waiting.sim.qb)!.carrying = true;
      const before = decision(waiting);
      const departure = stage(side); departure.sim.ball = { kind: 'held', carrier: departure.sim.qb };
      departure.pictures.get(departure.back)!.carrying = false; departure.pictures.get(departure.sim.qb)!.carrying = true;
      const p = departure.pictures.get(departure.mate)!;
      const ds = departure.pictures.get(departure.sim.slot(target.slot)!)!;
      p.pos = { x: ds.pos.x - 1.5, y: ds.pos.y }; p.vel = { x: 3, y: 0 }; p.facing = 0;
      departure.mate.behavior = { kind: 'pass-pro', update: () => ({ vel: { x: 0, y: 0 } }) };
      expect(before.target).not.toBeNull(); expect(expected.target).not.toBeNull();
      expect(decision(departure).target).not.toBe(before.target);
    });

    it('keeps an active teammate candidate when only his private controller changes, side ' + side, () => {
      const near = () => {
        const f = stage(side), p = { x: f.d.pos.x - 1.5, y: f.d.pos.y };
        f.mate.body.pos = { ...p }; f.pictures.get(f.mate)!.pos = { ...p };
        return f;
      };
      const f = near(), expected = decision(f);
      // He is visibly taking the first threat, so our blocker gets another.
      expect(expected.target).not.toBeNull(); expect(expected.target).not.toBe(f.d.slot);
      const hidden = near();
      hidden.mate.behavior = { kind: 'pass-pro', update: () => ({ vel: { x: 0, y: 0 } }) };
      expect(decision(hidden)).toEqual(expected);
      const fallen = near(); fallen.pictures.get(fallen.mate)!.pose = 'down';
      expect(decision(fallen).target).toBe(fallen.d.slot);
    });
  }

  it('unknown possession does not follow a hidden holder, while acquired possession does', () => {
    const a = stage(), b = stage();
    a.pictures.get(a.back)!.carrying = undefined; b.pictures.get(b.back)!.carrying = false;
    a.back.body.pos = { x: 50, y: 3 };
    expect(carrierLane(a.sim, a.a, a.spot)(1)).toEqual(carrierLane(b.sim, b.a, b.spot)(1));
    const known = stage(); known.pictures.get(known.back)!.pos = { x: 38, y: 18 };
    expect(carrierLane(known.sim, known.a, known.spot)(0)).toEqual({ x: 38, y: 18 });
  });

  it('remote fatigue cannot change a threat inferred from the same picture', () => {
    const f = stage(), lane = laneFrom(f.spot, { x: 1, y: 0 }, 0, 0);
    const first = threatOf(f.sim, f.a, f.d, lane); expect(first).not.toBeNull();
    f.d.body.energy = .05; f.d.body.sprintLoad = 10;
    expect(threatOf(f.sim, f.a, f.d, lane)).toEqual(first);
    f.pictures.get(f.d)!.pos = { x: 80, y: 5 };
    expect(threatOf(f.sim, f.a, f.d, lane)).not.toEqual(first);
  });

  it('keeps real contact as an execution gate even with an old far picture', () => {
    const f = stage(), engage = vi.spyOn(f.sim, 'engage').mockReturnValue(null);
    f.work.target = f.d; Reflect.set(f.work, 'retargetAt', Infinity);
    f.work.update(f.a, f.sim); expect(engage).not.toHaveBeenCalled();
    f.d.body.pos = { x: f.a.pos.x + .4, y: f.a.pos.y };
    f.work.update(f.a, f.sim); expect(engage).toHaveBeenCalledWith(f.a, f.d, 'run', expect.any(Object));
  });
});

function flight(side = 1) {
  const f = stage(side); f.pictures.get(f.back)!.carrying = false; f.pictures.get(f.sim.qb)!.carrying = false;
  f.sim.ball = { kind: 'air', flight: { pos: { x: 32, y: 26, z: 2 }, vel: { x: 4, y: side, z: 8 }, drag: .003027 }, intended: { ...f.spot }, arrivalT: 2.8 } as typeof f.sim.ball;
  f.sim.ballPath = [{ x: 31, y: 26, z: 2, t: 2 }, { x: 33, y: 26, z: 1.3, t: 2.8 }, { x: 35, y: 26, z: 0, t: 3.2 }];
  return f;
}

describe('screen lane forecasts require acquired flight evidence', () => {
  it('cannot read the hidden flight clock or path before recognition', () => {
    const a = flight(), b = flight();
    if (b.sim.ball.kind === 'air') b.sim.ball.arrivalT = 6;
    b.sim.ballPath[1].t = 5;
    expect(carrierLane(a.sim, a.a, a.spot)(1)).toEqual(carrierLane(b.sim, b.a, b.spot)(1));
  });

  it('uses a recognized trajectory once and preserves it across unseen flight changes', () => {
    const unseen = flight(), known = flight();
    vi.spyOn(known.sim.throwSight, 'seenAt').mockReturnValue(0);
    known.work.update(known.a, known.sim);
    const lane = carrierLane(known.sim, known.a, known.spot)(1);
    expect(lane).not.toEqual(carrierLane(unseen.sim, unseen.a, unseen.spot)(1));
    if (known.sim.ball.kind === 'air') known.sim.ball.arrivalT = 6;
    known.sim.ballPath[1].t = 5;
    known.work.update(known.a, known.sim);
    expect(carrierLane(known.sim, known.a, known.spot)(1)).toEqual(lane);
    expect(carrierLane(known.sim, known.a, known.spot)(0)).toEqual(known.spot);
  });
});

// Exercise the real incidental sensor. The ball is just over the shoulder
// (cosine -.2), inside its -.35 cone; ThrowSight has not recognized a throw.
function peripheralFlight(side = 1) {
  const f = flight(side);
  f.a.body.pos = { x: 33, y: 26 };
  f.a.body.facing = Math.acos(.2) * side;
  f.sim.incidentalCatchReadiness.sense(f.sim);
  return f;
}
function deliver(f: Scene) {
  f.sim.t = f.sim.world.time = 2.4;
  f.sim.incidentalCatchReadiness.sense(f.sim);
  const sample = f.sim.incidentalCatchReadiness.query(f.a, f.sim.t);
  expect(sample?.sampledAt).toBe(2);
  expect(sample!.availableAt).toBeLessThanOrEqual(f.sim.t);
  return sample!;
}
function picturedLane(f: Scene, ahead: number) {
  return carrierLane(f.sim, f.a, f.spot, undefined, Reflect.get(f.work, 'flightPicture'), Reflect.get(f.work, 'sawRelease'))(ahead);
}

describe('screen blockers retain delivered incidental flight without hidden refresh', () => {
  for (const side of [-1, 1]) {
    it('waits for sensor availability, then acts on the peripheral cue, side ' + side, () => {
      const waiting = peripheralFlight(side), unseen = flight(side);
      unseen.a.body.pos = { ...waiting.a.pos }; unseen.a.body.facing = waiting.a.facing;
      expect(waiting.sim.incidentalCatchReadiness.query(waiting.a, waiting.sim.t)).toBeNull();
      expect(decision(waiting)).toEqual(decision(unseen));
      deliver(waiting); unseen.sim.t = unseen.sim.world.time = waiting.sim.t;
      expect(waiting.sim.throwSight.seenAt(waiting.a)).toBeUndefined();
      expect(decision(waiting).command).not.toEqual(decision(unseen).command);
      expect(picturedLane(waiting, 1)).not.toEqual(picturedLane(unseen, 1));
      expect(picturedLane(waiting, 0)).toEqual(waiting.spot); // no invented catcher
    });

    it('cannot acquire an out-of-view or expired sample, side ' + side, () => {
      const stale = peripheralFlight(side); deliver(stale);
      stale.sim.t = stale.sim.world.time = 2.6;
      expect(stale.sim.incidentalCatchReadiness.query(stale.a, stale.sim.t)).toBeNull();
      const unseen = flight(side); unseen.a.body.pos = { ...stale.a.pos }; unseen.a.body.facing = stale.a.facing;
      unseen.sim.t = unseen.sim.world.time = stale.sim.t;
      expect(decision(stale)).toEqual(decision(unseen));
      const away = flight(side); away.a.body.pos = { ...stale.a.pos }; away.a.body.facing = 0;
      away.sim.incidentalCatchReadiness.sense(away.sim);
      away.sim.t = away.sim.world.time = 2.4; away.sim.incidentalCatchReadiness.sense(away.sim);
      expect(away.sim.incidentalCatchReadiness.query(away.a, away.sim.t)).toBeNull();
    });

    it('ignores hidden path, clock, velocity and holder changes behind a delivered sample, side ' + side, () => {
      const original = peripheralFlight(side), hidden = peripheralFlight(side);
      deliver(original); deliver(hidden);
      if (hidden.sim.ball.kind === 'air') {
        hidden.sim.ball.arrivalT = 12;
        hidden.sim.ball.flight.pos = { x: 75, y: 4, z: 30 };
        hidden.sim.ball.flight.vel = { x: -20, y: 30, z: 40 };
      }
      hidden.sim.ballPath = [{ x: 75, y: 4, z: 30, t: 12 }];
      expect(decision(hidden)).toEqual(decision(original));
      expect(picturedLane(hidden, 1)).toEqual(picturedLane(original, 1));
      hidden.sim.ball = { kind: 'held', carrier: hidden.other };
      expect(decision(hidden)).toEqual(decision(original));
      expect(picturedLane(hidden, 0)).toEqual(hidden.spot);
    });

    it('retains a sample acquired during own contact, without changing the held command, side ' + side, () => {
      const held = peripheralFlight(side), unseen = flight(side);
      unseen.a.body.pos = { ...held.a.pos }; unseen.a.body.facing = held.a.facing;
      const contact = (f: Scene) => { f.a.engagement = { blocker: f.a, defender: f.d } as Engagement; };
      contact(held); contact(unseen); deliver(held);
      unseen.sim.t = unseen.sim.world.time = held.sim.t;
      expect(decision(held)).toEqual(decision(unseen));
      expect(held.work.target).toBeNull();
      held.a.engagement = unseen.a.engagement = null;
      held.sim.t = held.sim.world.time = unseen.sim.t = unseen.sim.world.time = 2.6;
      expect(held.sim.incidentalCatchReadiness.query(held.a, held.sim.t)).toBeNull();
      expect(decision(held).command).not.toEqual(decision(unseen).command);
      expect(picturedLane(held, 1)).not.toEqual(picturedLane(unseen, 1));
      held.sim.t = held.sim.world.time = 6;
      expect(picturedLane(held, 1)).toEqual(laneFrom(held.spot, { x: 1, y: 0 }, 0, 0)(1));
      expect(picturedLane(held, 0)).toEqual(held.spot);
    });
  }

  it('allows later full recognition, then a newer delivered sample without reviving the old flight', () => {
    const f = peripheralFlight(); deliver(f); decision(f);
    const incidentalLane = picturedLane(f, 1);
    f.sim.t = f.sim.world.time = 2.45;
    f.sim.ballPath = [{ x: 31, y: 26, z: 2, t: 2.45 }, { x: 33, y: 26, z: 1, t: 9 }, { x: 35, y: 26, z: 0, t: 10 }];
    vi.spyOn(f.sim.throwSight, 'seenAt').mockReturnValue(0);
    decision(f);
    expect(picturedLane(f, 1)).not.toEqual(incidentalLane);
    // A later, actually sensed flight picture supersedes that first copied
    // trajectory. Its own expiry cannot resurrect the nine-second arrival.
    f.sim.t = f.sim.world.time = 2.5;
    f.sim.incidentalCatchReadiness.sense(f.sim);
    f.sim.t = f.sim.world.time = 2.9;
    f.sim.incidentalCatchReadiness.sense(f.sim);
    expect(f.sim.incidentalCatchReadiness.query(f.a, f.sim.t)?.sampledAt).toBe(2.5);
    decision(f);
    expect(picturedLane(f, 1)).not.toEqual(laneFrom(f.spot, { x: 1, y: 0 }, 6.1, 0)(1));
    f.sim.t = f.sim.world.time = 6;
    expect(picturedLane(f, 1)).toEqual(laneFrom(f.spot, { x: 1, y: 0 }, 0, 0)(1));
    expect(picturedLane(f, 0)).toEqual(f.spot);
  });

  it('treats an empty recognized path as known release without a hidden fallback', () => {
    const f = flight(); f.sim.ballPath = [];
    vi.spyOn(f.sim.throwSight, 'seenAt').mockReturnValue(0);
    expect(() => decision(f)).not.toThrow();
    expect(picturedLane(f, 1)).toEqual(laneFrom(f.spot, { x: 1, y: 0 }, 0, 0)(1));
  });

  it('bounds a high nominal flight by the existing three-second forecast horizon', () => {
    const f = flight(); f.a.body.pos = { x: 33, y: 26 }; f.a.body.facing = Math.acos(.2);
    if (f.sim.ball.kind === 'air') f.sim.ball.flight.vel.z = 80;
    f.sim.incidentalCatchReadiness.sense(f.sim); deliver(f); decision(f);
    const path = Reflect.get(f.work, 'flightPicture')?.path;
    expect(path).toBeDefined();
    expect(path.at(-1).t).toBeCloseTo(5, 10);
    expect(path.at(-1).z).toBeGreaterThan(0); // prediction ends, no ground/catch claim
    f.sim.t = f.sim.world.time = 5.1;
    expect(picturedLane(f, 1)).toEqual(laneFrom(f.spot, { x: 1, y: 0 }, 0, 0)(1));
    expect(picturedLane(f, 0)).toEqual(f.spot);
  });
});

function countedScreen(side = 1, count = 2.5) {
  const f = stage(side);
  f.pictures.get(f.back)!.carrying = false;
  const qb = f.pictures.get(f.sim.qb)!; qb.carrying = true; qb.pos = { x: 25, y: 26 };
  f.work = new ScreenBlocker(f.a, 'up', side, f.spot, false, count); f.a.behavior = f.work;
  return f;
}
function clearScene(side = 1, lineman = false) {
  const f = flight(side);
  f.spot.x = 43; f.a.body.pos = { x: 36, y: 26 + side * .5 };
  f.work = new ScreenBlocker(f.a, 'up', side, f.spot, lineman); f.a.behavior = f.work;
  f.sim.ball = { kind: 'air', flight: { pos: { x: 30, y: 26, z: 2 }, vel: { x: 20, y: 0, z: 3 }, drag: .003027 },
    intended: { ...f.spot }, arrivalT: 2.65 } as typeof f.sim.ball;
  f.sim.ballPath = [{ x: 30, y: 26, z: 2, t: 2 }, { x: 40, y: 26, z: 1.5, t: 2.5 }, { x: 43, y: 26, z: 1, t: 2.65 }, { x: 46, y: 26, z: 0, t: 3 }];
  return f;
}
const releaseKnown = (f: Scene) => Reflect.get(f.work, 'sawRelease') as boolean;
const clearCommand = (f: Scene) => Reflect.get(f.work, 'clearLane').call(f.work, f.a, f.sim);

describe('screen release count uses acquired QB transitions', () => {
  for (const side of [-1, 1]) {
    it('remembers true-to-false before the count but waits to open work, side ' + side, () => {
      const f = countedScreen(side); decision(f);
      f.sim.t = f.sim.world.time = 2.2; f.pictures.get(f.sim.qb)!.carrying = false;
      decision(f); expect(releaseKnown(f)).toBe(false);
      const waitingLane = picturedLane(f, 1);
      // Later unavailability does not erase knowledge already delivered.
      f.pictures.get(f.sim.qb)!.carrying = undefined; f.pictures.get(f.sim.qb)!.age = undefined;
      f.sim.t = f.sim.world.time = 2.5;
      decision(f); expect(releaseKnown(f)).toBe(true);
      expect(picturedLane(f, 1)).not.toEqual(waitingLane);
      expect(picturedLane(f, 1)).toEqual(laneFrom(f.spot, { x: 1, y: 0 }, 0, 0)(1));
      expect(picturedLane(f, 0)).toEqual(f.spot);
      expect(Reflect.get(f.work, 'flightPicture')).toBeNull();
    });

    it('does not promote count, false-first, unknown or stale contradiction to release, side ' + side, () => {
      for (const kind of ['count', 'false-first', 'unknown', 'stale', 'unknown-age'] as const) {
        const f = countedScreen(side);
        if (kind === 'false-first') f.pictures.get(f.sim.qb)!.carrying = false;
        decision(f); f.sim.t = f.sim.world.time = 3;
        const qb = f.pictures.get(f.sim.qb)!;
        if (kind === 'unknown') qb.carrying = undefined;
        if (kind === 'stale') { qb.carrying = false; qb.age = 1; }
        if (kind === 'unknown-age') { qb.carrying = false; qb.age = undefined; }
        decision(f); expect(releaseKnown(f), kind).toBe(false);
        expect(clearCommand(f), kind).toBeNull();
      }
    });

    it('a newer still-held cue refutes a pre-count empty picture, side ' + side, () => {
      const f = countedScreen(side); decision(f);
      f.sim.t = f.sim.world.time = 2.2; f.pictures.get(f.sim.qb)!.carrying = false; decision(f);
      f.sim.t = f.sim.world.time = 2.4; f.pictures.get(f.sim.qb)!.carrying = true; decision(f);
      f.sim.t = f.sim.world.time = 2.5; decision(f);
      expect(releaseKnown(f)).toBe(false);
      f.sim.t = f.sim.world.time = 2.6; f.pictures.get(f.sim.qb)!.carrying = false;
      const command = decision(f).command;
      expect(releaseKnown(f)).toBe(true);
      const waiting = countedScreen(side); waiting.sim.t = waiting.sim.world.time = f.sim.t;
      expect(command).not.toEqual(decision(waiting).command);
    });
  }
});

describe('screen throw clearance preserves acquired geometry', () => {
  for (const side of [-1, 1]) {
    it('cannot clear from hidden ball or intended target, then clears a recognized flight, side ' + side, () => {
      const hidden = clearScene(side), held = clearScene(side);
      held.sim.ball = { kind: 'held', carrier: held.sim.qb };
      expect(decision(hidden)).toEqual(decision(held));
      expect(clearCommand(hidden)).toBeNull();
      const seen = clearScene(side); vi.spyOn(seen.sim.throwSight, 'seenAt').mockReturnValue(0);
      const expected = decision(seen);
      expect(expected.command.vel.x).toBeCloseTo(0, 10);
      expect(expected.command.vel.y * side).toBeGreaterThan(0);
      if (seen.sim.ball.kind === 'air') {
        seen.sim.ball.flight.pos = { x: 80, y: 2, z: 40 };
        seen.sim.ball.intended = { x: 0, y: 50, z: 1 }; seen.sim.ball.arrivalT = 20;
      }
      seen.sim.ballPath = [{ x: 80, y: 2, z: 40, t: 20 }];
      expect(decision(seen)).toEqual(expected);
      seen.sim.ball = { kind: 'held', carrier: seen.other };
      expect(decision(seen)).toEqual(expected);
    });

    it('clears the copied planned QB line after release without inventing flight, side ' + side, () => {
      const f = countedScreen(side, 2); f.spot.x = 43; f.a.body.pos.y = 26 + side * .5;
      decision(f); f.sim.t = f.sim.world.time = 2.1; f.pictures.get(f.sim.qb)!.carrying = false;
      const expected = decision(f);
      expect(expected.command.vel.x).toBeCloseTo(0, 10);
      expect(expected.command.vel.y * side).toBeGreaterThan(0);
      expect(Reflect.get(f.work, 'flightPicture')).toBeNull();
      f.sim.qb.body.pos = { x: 80, y: 2 }; f.sim.ball = { kind: 'held', carrier: f.other };
      expect(decision(f)).toEqual(expected);
      f.pictures.get(f.sim.qb)!.pos = { x: 25, y: 35 }; f.sim.t = f.sim.world.time = 2.2;
      decision(f); expect(clearCommand(f)).toBeNull();
    });

    it('keeps the eligible catch-area exemption and stops behind the forecast ball, side ' + side, () => {
      const eligible = clearScene(side), lineman = clearScene(side, true);
      for (const f of [eligible, lineman]) {
        f.a.body.pos.x = 42; vi.spyOn(f.sim.throwSight, 'seenAt').mockReturnValue(0); decision(f);
      }
      expect(clearCommand(eligible)).toBeNull();
      expect(clearCommand(lineman)).not.toBeNull();
      lineman.a.body.pos.x = 29; expect(clearCommand(lineman)).toBeNull();
      lineman.a.body.pos.x = 36; lineman.sim.t = lineman.sim.world.time = 2.4;
      expect(clearCommand(lineman)).toBeNull(); // forecast now beyond him
    });

    it('retires an inferred corridor when a newer acquired QB picture holds the ball again, side ' + side, () => {
      const f = countedScreen(side, 2); f.spot.x = 43; f.a.body.pos.y = 26 + side * .5;
      decision(f); f.sim.t = f.sim.world.time = 2.1; f.pictures.get(f.sim.qb)!.carrying = false; decision(f);
      expect(clearCommand(f)).not.toBeNull();
      f.sim.t = f.sim.world.time = 2.2; f.pictures.get(f.sim.qb)!.carrying = true; decision(f);
      expect(releaseKnown(f)).toBe(true); // prior ball-out evidence is not erased
      expect(clearCommand(f)).toBeNull(); // the old inferred line is obsolete
    });

    it('clears from an actually delivered incidental sample without full recognition, side ' + side, () => {
      const f = clearScene(side); f.a.body.pos.x = 39; f.a.body.facing = Math.PI;
      if (f.sim.ball.kind === 'air') f.sim.ball.flight.vel.z = 12;
      f.sim.incidentalCatchReadiness.sense(f.sim);
      expect(clearCommand(f)).toBeNull();
      deliver(f); expect(f.sim.throwSight.seenAt(f.a)).toBeUndefined();
      decision(f); expect(clearCommand(f)).not.toBeNull();
      expect(Reflect.get(f.work, 'flightPicture').sampledAt).toBe(2);
    });
  }

  it('does not revive the planned QB line after acquired flight expires or possession is acquired', () => {
    const f = countedScreen(1, 2); f.spot.x = 43; f.a.body.pos.y = 26.5; decision(f);
    f.sim.t = f.sim.world.time = 2.1; f.pictures.get(f.sim.qb)!.carrying = false; decision(f);
    expect(clearCommand(f)).not.toBeNull();
    f.sim.ball = { kind: 'air', flight: { pos: { x: 30, y: 26, z: 2 }, vel: { x: 20, y: 0, z: 3 }, drag: .003027 },
      intended: { ...f.spot }, arrivalT: 2.4 } as typeof f.sim.ball;
    f.sim.ballPath = [{ x: 30, y: 26, z: 2, t: 2.1 }, { x: 43, y: 26, z: 0, t: 2.5 }];
    vi.spyOn(f.sim.throwSight, 'seenAt').mockReturnValue(0); decision(f);
    expect(Reflect.get(f.work, 'flightPicture')).not.toBeNull();
    f.sim.t = f.sim.world.time = 2.6; expect(clearCommand(f)).toBeNull();
    const caught = clearScene(); vi.spyOn(caught.sim.throwSight, 'seenAt').mockReturnValue(0); decision(caught);
    caught.pictures.get(caught.back)!.carrying = true;
    caught.sim.t = caught.sim.world.time = 2.4;
    const clear = vi.spyOn(caught.work as unknown as { clearLane: () => unknown }, 'clearLane');
    decision(caught); expect(clear).not.toHaveBeenCalled();
    expect(picturedLane(caught, 0)).toEqual(caught.pictures.get(caught.back)!.pos);
  });

  it('does not invent a current ball position before the first copied forecast point', () => {
    const f = clearScene();
    f.sim.ballPath = [{ x: 31, y: 26, z: 2, t: 2.05 }, { x: 43, y: 26, z: 1, t: 2.65 }, { x: 46, y: 26, z: 0, t: 3 }];
    vi.spyOn(f.sim.throwSight, 'seenAt').mockReturnValue(0); decision(f);
    expect(clearCommand(f)).toBeNull();
    f.sim.t = f.sim.world.time = 2.05;
    expect(clearCommand(f)).not.toBeNull();
  });
});
