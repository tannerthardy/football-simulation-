import { describe, expect, it } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { World } from '../src/physics/world.js';
import { newSupport, supportParams } from '../src/physics/support.js';
import { PASS_BY_ID, RUN_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { readLocalBlock, type InstalledBlockKey } from '../src/sim/local-block-response.js';
import { PassRusher } from '../src/sim/behaviors/defense.js';
import { OL_SLOTS } from '../src/playbook/types.js';
import type { Perceived } from '../src/sim/perception.js';
import { PlaySim } from '../src/sim/playsim.js';

const offense = generateTeam(new Rng(31), 'Block key offense', 'O', { strength: .55 });
const defense = generateTeam(new Rng(32), 'Block key defense', 'D', { strength: .55 });

function stage(side = 1, motion = 1, pass = false) {
  const formation = FORMATION_BY_ID.ace_12;
  const sim = new PlaySim({ offense: pickOffense(offense, '12'), defense: pickDefense(defense, 'base43'),
    offCall: { formation, flip: false, kind: pass ? 'pass' : 'run',
      run: pass ? undefined : RUN_BY_ID.wz_strong,
      pass: pass ? { ...PASS_BY_ID.smash, fake: 'wz_strong' } : undefined, label: 'Acquired block key' },
    defCall: { personnel: 'base43', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3,
      pressure: null, label: 'Over' }, los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 3 });
  const a = sim.slot('DT_S')!, blocker = sim.slot('RG')!;
  a.body.pos = { x: 40.9, y: CENTER_Y + side * .4 };
  a.body.vel = { x: -.5, y: 0 }; a.body.facing = Math.PI;
  a.body.support = newSupport(.3);
  const key: InstalledBlockKey = { home: { x: 39.45, y: CENTER_Y }, radius: blocker.profile.radius,
    gapY: CENTER_Y + side * .65, attackDirection: -1 };
  const seen: Perceived = { pos: { x: 39.55, y: CENTER_Y + motion * .3 },
    vel: { x: .2, y: motion * 2 }, stance: 'low', facing: 0, pose: 'up', age: .25 };
  sim.t = sim.world.time = .4;
  a.recog!.read = 'unsure';
  return { sim, a, blocker, key, seen };
}

/** The controller consumes this explicit acquired-picture map. Remote body
 * changes cannot replace it, and no native play is run by these fixtures. */
function controller(pass = false) {
  const f = stage(-1, -1, pass), behavior = f.a.behavior as PassRusher;
  expect(behavior).toBeInstanceOf(PassRusher);
  const home = f.sim.offAlign.spots.RG.pos;
  f.a.body.pos = { x: 40.9, y: home.y - .4 };
  const pictures = new Map(f.sim.offense.map(o => [o.idx, {
    pos: { ...o.pos }, vel: { ...o.vel }, stance: o.stance, facing: o.facing,
    pose: 'up', age: .25, carrying: o === f.sim.qb,
  } as Perceived]));
  pictures.set(f.blocker.idx, { ...f.seen,
    pos: { x: home.x + .1, y: home.y - .3 }, vel: { x: .2, y: -2 } });
  const queries: number[] = [];
  f.sim.see = (observer, target) => {
    expect(observer).toBe(f.a); queries.push(target.idx);
    const seen = pictures.get(target.idx);
    if (!seen) throw new Error(`No acquired picture for ${target.slot}`);
    return structuredClone(seen);
  };
  return { ...f, behavior, home, pictures, queries,
    update: () => behavior.update(f.a, f.sim) };
}

describe('a free DL responds to a local block key without knowing the play', () => {
  it.each([-1, 1])('preserves its gap-side shoulder against a reach, side=%s', side => {
    const f = stage(side, side), before = structuredClone(f.a.body), rng = structuredClone(f.sim.rng);
    const response = readLocalBlock(f.a, f.seen, f.key, f.sim.t)!;
    expect(response.kind).toBe('reach');
    expect((response.aim.y - f.seen.pos.y) * side).toBeGreaterThan(0);
    expect(response.command.vel.y * side).toBeGreaterThan(0);
    expect(f.a.body).toEqual(before); expect(f.sim.rng).toEqual(rng);
    expect(f.a.recog!.read).toBe('unsure');
    const moved = structuredClone(before), world = new World([moved]); world.time = f.sim.t;
    for (let tick = 0; tick < 6; tick++) {
      const report = world.step([response.command], .05);
      expect(Math.abs(report.work.residual)).toBeLessThan(1e-8);
      expect(Math.hypot(report.groundImpulse[0].x, report.groundImpulse[0].y))
        .toBeLessThanOrEqual(supportParams(moved.profile).traction * .05 + 1e-8);
      expect(report.armImpulse).toEqual([0]);
    }
    expect((moved.pos.y - before.pos.y) * side).toBeGreaterThan(0);
    expect(moved.support!.state).toBe('up');
  });

  it.each([-1, 1])('squeezes an acquired away step while keeping the installed shoulder, side=%s', side => {
    const f = stage(side, -side), response = readLocalBlock(f.a, f.seen, f.key, f.sim.t)!;
    expect(response.kind).toBe('squeeze');
    expect((response.aim.y - f.seen.pos.y) * side).toBeGreaterThan(0);
    expect(response.command.vel.y * side).toBeLessThan(0);
    expect(response.command.push).toBeUndefined();
  });

  it('responds identically to identical early run and play-action block pictures', () => {
    const run = stage(), pass = stage(1, 1, true);
    expect(run.a.body).toEqual(pass.a.body);
    expect(readLocalBlock(run.a, run.seen, run.key, run.sim.t))
      .toEqual(readLocalBlock(pass.a, pass.seen, pass.key, pass.sim.t));
    // Remote hidden state cannot improve the consumed local picture.
    pass.blocker.body.pos = { x: 70, y: 2 }; pass.blocker.body.vel = { x: -9, y: -7 };
    pass.blocker.behavior = { kind: 'hidden job', update: () => { throw new Error('Private job queried'); } };
    expect(readLocalBlock(run.a, run.seen, run.key, run.sim.t))
      .toEqual(readLocalBlock(pass.a, pass.seen, pass.key, pass.sim.t));
  });

  it.each(['high', 'stationary', 'vertical', 'departed', 'distant', 'down'] as const)(
    'leaves the installed rush alone for an acquired %s key', cue => {
      const f = stage();
      if (cue === 'high') f.seen.stance = 'high';
      if (cue === 'stationary') f.seen.vel = { x: 0, y: 0 };
      if (cue === 'vertical') f.seen.vel = { x: 3, y: 1 };
      if (cue === 'departed') f.seen.pos.x -= 3;
      if (cue === 'distant') f.seen.pos.y += 8;
      if (cue === 'down') f.seen.pose = 'down';
      expect(readLocalBlock(f.a, f.seen, f.key, f.sim.t)).toBeNull();
    });

  it.each(['load', 'lean', 'strike', 'down'] as const)('does not forecast a free response under own %s', constraint => {
    const f = stage(), support = f.a.body.support!;
    if (constraint === 'load') support.load = { x: 1, y: 0 };
    if (constraint === 'lean') support.lean = { x: 1, y: 0 };
    if (constraint === 'strike') support.strike = { x: 1, y: 0 };
    if (constraint === 'down') support.state = 'down';
    expect(readLocalBlock(f.a, f.seen, f.key, f.sim.t)).toBeNull();
  });
});

describe('the installed rusher answers a key while global recognition stays unsure', () => {
  it('preserves get-off and then uses only its personally acquired primary key', () => {
    const f = controller(), getOff = f.a.snapReadyAt;
    f.sim.t = 0;
    expect(f.update().vel).toEqual({ x: 0, y: 0 });
    expect(f.queries).toEqual([]);
    f.sim.t = .4;
    const before = structuredClone(f.a.body), command = f.update();
    expect(command.vel.y).toBeLessThan(0);
    expect(f.queries).toEqual([f.blocker.idx]);
    expect(f.a.body).toEqual(before); expect(f.a.snapReadyAt).toBe(getOff);
    expect(f.a.recog!.read).toBe('unsure');
  });

  it('is invariant to the hidden run/PA call, live key body and private offensive job', () => {
    const run = controller(), fake = controller(true);
    const command = run.update();
    expect(fake.update()).toEqual(command);
    const rng = structuredClone(fake.sim.rng);
    fake.blocker.body.pos = { x: 80, y: 1 }; fake.blocker.body.vel = { x: 9, y: 9 };
    fake.blocker.behavior = { kind: 'private branch', update: () => { throw new Error('Hidden job queried'); } };
    fake.sim.t = 1;
    expect(fake.update()).toEqual(command);
    expect(fake.sim.rng).toEqual(rng);
    expect(fake.a.recog!.read).toBe('unsure');
  });

  it('holds its decision beat and then answers a newly acquired opposing departure', () => {
    const f = controller(), original = f.update();
    f.pictures.set(f.blocker.idx, { ...f.pictures.get(f.blocker.idx)!,
      pos: { x: f.home.x + .1, y: f.home.y + .3 }, vel: { x: .2, y: 2 } });
    f.sim.t += .05;
    expect(f.update()).toEqual(original);
    f.sim.t += .5;
    expect(f.update().vel.y).toBeGreaterThan(0);
    expect(f.a.recog!.read).toBe('unsure');
  });

  it('answers a newly acquired lateral key at the next ordinary due read', () => {
    const f = controller(), lateral = structuredClone(f.pictures.get(f.blocker.idx)!);
    f.pictures.set(f.blocker.idx, { ...lateral, pos: { ...f.home }, vel: { x: 0, y: 0 }, stance: null });
    const firstReadAt = .35, firstAcquiredAt = .4;
    const firstResponseAt = Math.ceil((firstReadAt + f.a.mind.decisionInterval - 1e-9) / .05) * .05;
    f.sim.t = firstReadAt;
    f.update();
    expect(f.a.tags.has('dl-key-reach')).toBe(false);
    f.pictures.set(f.blocker.idx, lateral);
    f.sim.t = firstAcquiredAt;
    f.update();
    expect(f.a.tags.has('dl-key-reach')).toBe(false);
    expect(firstResponseAt).toBeGreaterThan(firstAcquiredAt);
    f.sim.t = firstResponseAt;
    expect(f.update().vel.y).toBeLessThan(0);
    expect(f.a.tags.has('dl-key-reach')).toBe(true);
    expect(f.a.recog!.read).toBe('unsure');
  });

  it('leaves an own physical hand constraint to the ordinary controller', () => {
    const f = controller();
    f.sim.world.joints.push({ kind: 'hands', a: f.a.body, b: f.blocker.body,
      extension: 1, push: 0, hold: 0, steer: 0 });
    f.update();
    expect(f.queries).not.toContain(f.blocker.idx);
    expect(f.queries).toContain(f.sim.qb.idx);
  });

  it('diverges only after later acquired pass-set/backfield versus mesh evidence changes belief', () => {
    const run = controller(), fake = controller(true);
    expect(run.update()).toEqual(fake.update());
    for (const f of [run, fake]) {
      for (const slot of OL_SLOTS) {
        const o = f.sim.slot(slot)!, home = f.sim.offAlign.spots[slot].pos;
        f.pictures.set(o.idx, { pos: { x: home.x + (f === fake ? -.8 : .5), y: home.y },
          vel: { x: f === fake ? -3 : 2, y: 0 }, stance: f === fake ? 'high' : 'low',
          facing: 0, pose: 'up', age: .25, carrying: false });
      }
      f.pictures.set(f.sim.qb.idx, { pos: { x: f === fake ? 34 : 35.8, y: CENTER_Y },
        vel: { x: f === fake ? -5 : -.5, y: f === fake ? 0 : -1.5 },
        stance: null, facing: 0, pose: 'up', age: .25, carrying: true });
      f.pictures.set(f.sim.slot('RB')!.idx, { pos: { x: 35.6, y: CENTER_Y - .5 },
        vel: { x: f === fake ? 0 : 3, y: f === fake ? 0 : -2 },
        stance: null, facing: 0, pose: 'up', age: .25, carrying: false });
      for (let tick = 0; tick < 24; tick++) {
        f.sim.t = .45 + tick * .05;
        f.a.recog!.update(f.a, f.sim);
      }
    }
    expect(fake.a.recog!.read).toBe('pass'); expect(run.a.recog!.read).toBe('run');
    fake.queries.length = run.queries.length = 0;
    expect(fake.update()).not.toEqual(run.update());
    expect(fake.queries).toContain(fake.sim.qb.idx);
    expect(run.queries).toContain(run.sim.slot('RB')!.idx);
    expect(fake.queries).not.toContain(fake.blocker.idx);
  });
});
