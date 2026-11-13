import { describe, expect, it, vi } from 'vitest';
// The installed alley and cap. SAFETY_TEMPO (default on) holds a deep
// safety's depth until the back declares, as tracked; these cases check the
// installed support it replaces.
vi.hoisted(() => { process.env.SAFETY_TEMPO = '0'; });
import { Rng } from '../src/core/rng.js';
import { World } from '../src/physics/world.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { PASS_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { CoverageDefender } from '../src/sim/coverage/defender.js';
import { ManCoverage, playBall, runFit, sawThrow } from '../src/sim/behaviors/defense.js';
import type { Perceived } from '../src/sim/perception.js';
import type { Read } from '../src/sim/recognition.js';
import { PlaySim } from '../src/sim/playsim.js';

function stage(alley = false, side = 1, carrying: Perceived['carrying'] = true) {
  const sim = new PlaySim({
    offense: pickOffense(generateTeam(new Rng(31), 'O', 'OBS'), '11'),
    defense: pickDefense(generateTeam(new Rng(32), 'D', 'DEF'), 'nickel'),
    offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: side < 0, kind: 'pass', pass: PASS_BY_ID.four_verts, label: '' },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover4, pressure: null, label: '' },
    los: 40, ballY: 26, firstDownX: 50, seed: 3,
  });
  const a = sim.slot(alley ? 'FS' : 'LB_M')!, rb = sim.slot('RB')!, receiver = sim.slot('H')!;
  a.body.pos = { x: alley ? 50 : 44, y: 26 + side * 2 };
  a.body.vel = { x: 2, y: side * .2 }; a.body.facing = Math.PI;
  a.runFit = { gap: 'B', side, kind: alley ? 'alley' : 'insert', technique: 'attack', edge: 'box', pace: 'stack' };
  a.recog!.read = 'run'; sim.t = 1.6;
  let picture: Perceived = { pos: { x: 36.8, y: 26 + side }, vel: { x: 1.2, y: side * 1.85 },
    facing: 0, stance: null, pose: 'up', carrying, age: .2 };
  const see = sim.see.bind(sim);
  sim.see = (observer, target, scale) => target === rb ? picture : see(observer, target, scale);
  const behavior = new CoverageDefender(a, sim, 'q_apex', 'hook_s', 'match', 'B', side);
  a.behavior = behavior;
  let match = false;
  // Control only the assignment boundary; native saved film establishes the
  // natural rule change. The controller still consumes its own pictures.
  behavior.judgment.decide = (_a, _s, _reader, primary) => match
    ? { t: 'man', r: receiver, opts: { lev: 'inside' } } : primary;
  return { sim, a, rb, receiver, behavior, picture: () => picture,
    setPicture: (p: Perceived) => { picture = p; },
    reassign: () => { match = true; }, update: () => behavior.update(a, sim) };
}

function flight(f: ReturnType<typeof stage>, recognized = false) {
  f.sim.throwAt = recognized ? .1 : f.sim.t;
  f.sim.ball = { kind: 'air', flight: { pos: { x: 43, y: 26, z: 2 }, vel: { x: 20, y: 0, z: -1 }, drag: 0 },
    thrower: f.sim.qb, target: f.receiver, releaseT: f.sim.throwAt, releaseX: 35,
    intended: { x: 46, y: 26, z: 1.2 }, arrivalT: 1.9, deflected: false, throwaway: false }; f.sim.throwSight.stageRelease(f.sim, f.sim.throwAt);
  f.sim.ballPath = [{ t: 1.9, x: 46, y: 26, z: 1.2 }];
}

describe('installed support survives a coverage target replacement', () => {
  it.each([-1, 1])('tracks an acquired moving alley laterally while keeping its depth, side=%s', side => {
    const positive = stage(true, side), negative = stage(true, side);
    for (const f of [positive, negative]) f.reassign();
    negative.setPicture({ ...negative.picture(), vel: { x: 1.2, y: -side * 1.85 } });
    const p = positive.update(), n = negative.update();
    expect(p.vel.y * side).toBeGreaterThan(0);
    expect(n.vel.y * side).toBeLessThan(0);
    for (const [f, command] of [[positive, p], [negative, n]] as const) {
      const before = structuredClone(f.a.body), world = new World([f.a.body]);
      const result = world.step([command], .05);
      expect(f.a.vel.x).toBeLessThan(before.vel.x);
      expect(f.a.pos.x).toBeGreaterThan(f.sim.los + 4);
      expect(f.a.body.support!.state).toBe('up');
      expect(Math.abs(result.work.residual)).toBeLessThan(1e-8);
      expect(f.a.runFit!.kind).toBe('alley');
    }
    expect(positive.a.vel.y * side).toBeGreaterThan(negative.a.vel.y * side);
  });

  it('does not turn observed forward speed into permission to collapse the alley cap', () => {
    const slow = stage(true), fast = stage(true);
    slow.reassign(); fast.reassign();
    fast.setPicture({ ...fast.picture(), vel: { x: 9, y: fast.picture().vel.y } });
    expect(fast.update()).toEqual(slow.update());
  });

  it('retains the same moving-cap request across hidden back changes and advancing reality snapshots', () => {
    const reference = stage(true), changed = stage(true);
    reference.reassign(); changed.reassign();
    for (let k = 0; k < 4; k++) {
      changed.rb.body.pos = { x: 85+k, y: 5+k };
      changed.rb.body.vel = { x: -8, y: 9-k };
      // The controller's acquired back picture remains unchanged. Advancing
      // reality is not permission to replace that picture with hidden truth.
      reference.sim.perception.record(reference.sim.agents);
      changed.sim.perception.record(changed.sim.agents);
      const before = structuredClone(changed.sim.perception);
      expect(changed.update()).toEqual(reference.update());
      expect(changed.sim.perception).toEqual(before);
      expect(changed.sim.rng).toEqual(reference.sim.rng);
      changed.sim.t += .05; reference.sim.t += .05;
    }
  });

  it.each([-1, 1])('retains the acquired insertion after zone becomes man on another receiver, side=%s', side => {
    const f = stage(false, side), expected = stage(false, side);
    const first = f.update();
    // The initial zone-kind technique now reads its installed #2 while
    // preserving the same run fit; it has not completed a man assignment.
    expect(f.behavior.kind).toBe('zone');
    expect(f.behavior.job.startsWith('read:')).toBe(true);
    expect(first).toEqual(runFit(expected.a, expected.sim, 'B', side));
    f.reassign();
    expect(f.update()).toEqual(runFit(expected.a, expected.sim, 'B', side, { target: expected.rb, cue: expected.picture() }));
    expect(f.behavior.job).toBe('man:H');
    expect(f.behavior.target).toBe(f.receiver);
    expect(f.a.runFit!.kind).toBe('insert');
  });

  it.each([-1, 1])('preserves the alley cap and achieved braking instead of becoming another insertion, side=%s', side => {
    const f = stage(true, side), expected = stage(true, side);
    f.reassign();
    const command = f.update();
    expect(command).toEqual(runFit(expected.a, expected.sim, 'B', side, { target: expected.rb, cue: expected.picture() }));
    const initial = f.a.vel.x, report = new World([f.a.body]).step([command], .05);
    expect(f.a.vel.x).toBeLessThan(initial);
    expect(f.a.pos.x).toBeGreaterThan(f.sim.los + 4);
    expect(f.a.body.support!.state).toBe('up');
    expect(Math.abs(report.work.residual)).toBeLessThan(1e-8);
  });

  it('uses acquired back information instead of hidden possession, body motion or call identity', () => {
    const one = stage(), two = stage(); one.reassign(); two.reassign();
    two.sim.ball = { kind: 'held', carrier: two.rb }; two.sim.handoffAt = .5; two.sim.isPass = false;
    two.rb.body.pos = { x: 90, y: 2 }; two.rb.body.vel = { x: -8, y: 9 };
    const buffer = structuredClone(two.sim.perception);
    expect(one.update()).toEqual(two.update());
    expect(one.sim.rng).toEqual(two.sim.rng);
    expect(two.sim.perception).toEqual(buffer);
  });

  it('does not latch run belief or positive carrying after the current evidence changes', () => {
    for (const read of ['pass', 'unsure'] as Read[]) {
      const f = stage(), control = stage(); f.reassign(); control.reassign(); f.update();
      f.a.recog!.read = control.a.recog!.read = read;
      expect(f.update()).toEqual(new ManCoverage(control.a, control.sim, control.receiver, false, 'B', 1).update(control.a, control.sim));
    }
    for (const carrying of [false, null, undefined]) {
      const f = stage(), control = stage(); f.reassign(); control.reassign(); f.update();
      f.setPicture({ ...f.picture(), carrying }); control.setPicture({ ...control.picture(), carrying });
      expect(f.update()).toEqual(control.update());
    }
  });

  it.each([false, true])('expires positive support through advancing sensing snapshots, alley=%s', alley => {
    for (const replacement of [null, undefined]) {
      const f = stage(alley); f.reassign();
      // Use the production buffer/query, not the factory's supplied RB cue.
      // Keep belief fixed so only the acquired possession can cancel support.
      f.sim.see = PlaySim.prototype.see;
      f.a.mind.observationDelay = () => .1;
      f.a.eyes = { keys: [f.rb], peripheral: .15 };
      for (let i = 0; i < 24; i++) f.sim.perception.record(f.sim.agents, f.rb.idx);
      expect(f.sim.see(f.a, f.rb).carrying).toBe(true);
      f.update();

      for (let i = 0; i < 3; i++) {
        f.sim.t += f.sim.dt;
        f.sim.perception.record(f.sim.agents, replacement);
        const cue = f.sim.see(f.a, f.rb);
        const buffer = structuredClone(f.sim.perception), rng = structuredClone(f.sim.rng);
        for (let j = 0; j < 4; j++) expect(f.sim.see(f.a, f.rb)).toEqual(cue);
        expect(f.sim.perception).toEqual(buffer);
        expect(f.sim.rng).toEqual(rng);
        // The original image survives the sensing latency, not a new query.
        expect(cue.carrying).toBe(i < 2 ? true : replacement === null ? false : null);
        if (i < 2) f.update();
      }
      expect(f.a.recog!.read).toBe('run');
      // Hidden possession cannot restore an expired/unknown acquired picture.
      f.sim.ball = { kind: 'held', carrier: f.rb };
      const man = new ManCoverage(f.a, f.sim, f.receiver, false, 'B', 1, { lev: 'inside' });
      expect(f.update()).toEqual(man.update(f.a, f.sim));
      expect(f.sim.see(f.a, f.rb).carrying).toBe(replacement === null ? false : null);
    }
  });

  it('retains acquired support through unrecognized flight, then recognized ball priority wins', () => {
    for (const alley of [false, true]) {
      const held = stage(alley), air = stage(alley), recognized = stage(alley);
      for (const f of [held, air, recognized]) f.reassign();
      flight(air); flight(recognized, true);
      recognized.a.tags.add('looking');
      recognized.sim.ballPath = [{ t: recognized.sim.t + .1,
        x: recognized.a.pos.x - .2, y: recognized.a.pos.y, z: 1.2 }];
      expect(sawThrow(air.a, air.sim, air.receiver)).toBe(false);
      expect(air.update()).toEqual(held.update());
      expect(sawThrow(recognized.a, recognized.sim, recognized.receiver)).toBe(true);
      const actual = recognized.update();
      expect(recognized.a.tags.has('onBall')).toBe(true);
      expect(actual).toEqual(playBall(recognized.a, recognized.sim, recognized.receiver));
    }
  });

  it('preserves vertical and PA responsibility without both run belief and affirmative carrying', () => {
    for (const carrying of [false, null]) for (const read of ['run', 'pass', 'unsure'] as Read[]) {
      const f = stage(false, 1, carrying), expected = stage(false, 1, carrying);
      f.a.recog!.read = expected.a.recog!.read = read;
      f.sim.offCall.pass = expected.sim.offCall.pass = PASS_BY_ID.pa_post_dig;
      f.reassign();
      expect(f.update()).toEqual(new ManCoverage(expected.a, expected.sim, expected.receiver, false, 'B', 1).update(expected.a, expected.sim));
    }
  });

  it('does not redirect a force/cutback job or a back originally aligned out of the backfield', () => {
    for (const kind of ['force', 'cutback'] as const) {
      const f = stage(), expected = stage(); f.reassign(); f.a.runFit!.kind = expected.a.runFit!.kind = kind;
      expect(f.update()).toEqual(new ManCoverage(expected.a, expected.sim, expected.receiver, false, 'B', 1).update(expected.a, expected.sim));
    }
    const f = stage(), expected = stage(); f.reassign();
    f.sim.offAlign.spots.RB.backfield = expected.sim.offAlign.spots.RB.backfield = false;
    expect(f.update()).toEqual(new ManCoverage(expected.a, expected.sim, expected.receiver, false, 'B', 1).update(expected.a, expected.sim));
  });
});
