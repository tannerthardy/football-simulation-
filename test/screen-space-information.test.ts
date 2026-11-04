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

function flight() {
  const f = stage(); f.pictures.get(f.back)!.carrying = false; f.pictures.get(f.sim.qb)!.carrying = false;
  f.sim.ball = { kind: 'air', flight: { pos: { x: 32, y: 26, z: 2 } }, arrivalT: 2.8 } as typeof f.sim.ball;
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
