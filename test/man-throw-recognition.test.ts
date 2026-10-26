import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/rng.js';
import { World } from '../src/physics/world.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { PASS_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { ManCoverage, playBall, sawThrow, type ManOptions } from '../src/sim/behaviors/defense.js';
import { PlaySim } from '../src/sim/playsim.js';

function stage(air: boolean, opts: ManOptions = {}, press = false) {
  const sim = new PlaySim({
    offense: pickOffense(generateTeam(new Rng(171), 'O', 'OBS'), '11'),
    defense: pickDefense(generateTeam(new Rng(172), 'D', 'DEF'), 'nickel'),
    offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: false, kind: 'pass', pass: PASS_BY_ID.four_verts, label: '' },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover1_off, pressure: null, label: '' },
    los: 40, ballY: 26, firstDownX: 50, seed: 19,
  });
  const r = sim.slot('X')!, d = sim.slot('CB_W')!;
  r.body.pos = { x: 50, y: 33 }; r.body.vel = { x: 6, y: 0 };
  d.body.pos = { x: press ? 50.8 : opts.trail ? 49.5 : 54, y: 33.5 };
  d.body.vel = { x: 4, y: 0 }; d.body.facing = Math.PI;
  d.recog!.read = 'pass';
  const behavior = new ManCoverage(d, sim, r, press, 'C', 1, opts);
  d.behavior = behavior;
  const rp = { ...r.pos }, dp = { ...d.pos };
  for (let i = 0; i < 24; i++) {
    const age = (23 - i) * sim.dt;
    r.body.pos = { x: rp.x - r.vel.x * age, y: rp.y };
    d.body.pos = { x: dp.x - d.vel.x * age, y: dp.y };
    sim.perception.record(sim.agents);
  }
  sim.t = 2;
  if (air) release(sim, r);
  return { sim, r, d, behavior };
}

function release(sim: PlaySim, r: PlaySim['offense'][number]) {
  sim.throwAt = sim.t;
  sim.ball = { kind: 'air', flight: { pos: { x: 40, y: 26, z: 2 }, vel: { x: 20, y: 0, z: 2 }, drag: 0 },
    thrower: sim.qb, target: r, releaseT: sim.t, releaseX: 35, intended: { x: 55, y: 33, z: 1.2 },
    arrivalT: sim.t + .8, deflected: false, throwaway: false }; sim.throwSight.stageRelease(sim, sim.throwAt);
  sim.ballPath = [{ t: sim.t + .8, x: 55, y: 33, z: 1.2 }];
}

describe('man technique before acquired throw recognition', () => {
  it.each([
    ['off inside', {}, false], ['off outside', { lev: 'outside' }, false],
    ['head up', { lev: 'head' }, false], ['press', { lev: 'outside' }, true],
    ['trail with deep help', { trail: true }, false], ['over the top', { overTop: true }, false],
  ] as const)('preserves %s requests and achieved movement when only hidden release changes', (_, opts, press) => {
    const held = stage(false, opts, press), air = stage(true, opts, press);
    const worlds = [held, air].map(s => new World([s.r.body, s.d.body]));
    for (let i = 0; i < 2; i++) {
      expect(sawThrow(air.d, air.sim, air.r)).toBe(false);
      const commands = [held, air].map(s => s.behavior.update(s.d, s.sim));
      expect(commands[1]).toEqual(commands[0]);
      expect(air.behavior.recordedTechnique()).toEqual(held.behavior.recordedTechnique());
      expect(air.sim.rng).toEqual(held.sim.rng);
      for (const [j, s] of [held, air].entries()) {
        worlds[j].step([{ vel: { x: 6, y: 0 } }, commands[j]], simDt);
        s.sim.t += simDt; s.sim.perception.record(s.sim.agents);
      }
      expect(air.d.body).toEqual(held.d.body);
    }
  });

  it('retains history and responds to acquired plants while the throw remains unrecognized', () => {
    const held = stage(false, { overTop: true }), air = stage(false, { overTop: true });
    const initial = stage(false, { overTop: true });
    const initialCommand = initial.behavior.update(initial.d, initial.sim);
    for (const s of [held, air]) {
      const world = new World([s.r.body, s.d.body]);
      // The plant develops through real movement and past sensing samples
      // before either arm's hidden throw. Queries alone add no pictures.
      for (let i = 0; i < 8; i++) {
        world.step([{ vel: { x: 1, y: -2 } }, s.behavior.update(s.d, s.sim)], simDt);
        s.sim.t += simDt; s.sim.perception.record(s.sim.agents);
      }
    }
    release(air.sim, air.r);
    expect(sawThrow(air.d, air.sim, air.r)).toBe(false);
    const acquired = air.sim.see(air.d, air.r);
    const rng = structuredClone(air.sim.rng), buffer = structuredClone(air.sim.perception);
    air.r.body.pos = { x: 90, y: 2 }; air.r.body.vel = { x: 0, y: 9 };
    air.r.body.facing = 2.5;
    if (air.sim.ball.kind !== 'air') throw new Error('Expected flight');
    air.sim.ball.target = air.sim.slot('H')!;
    const changed = air.behavior.update(air.d, air.sim);
    expect(changed).toEqual(held.behavior.update(held.d, held.sim));
    expect(changed).not.toEqual(initialCommand);
    expect(air.sim.see(air.d, air.r)).toEqual(acquired);
    expect(air.sim.rng).toEqual(rng);
    expect(air.sim.perception).toEqual(buffer);
  });

  it('switches to the unchanged attainable ball contest after recognition', () => {
    const s = stage(true, { overTop: true });
    s.sim.throwAt = 1; s.sim.throwSight.stageRelease(s.sim, s.sim.throwAt);
    s.d.tags.add('looking');
    s.sim.ballPath = [{ t: 2.1, x: 53.8, y: 33.5, z: 1.2 }, { t: 2.8, x: 55, y: 33, z: 1.2 }];
    expect(sawThrow(s.d, s.sim, s.r)).toBe(true);
    const command = s.behavior.update(s.d, s.sim);
    expect(command).toEqual(playBall(s.d, s.sim, s.r));
    expect(s.d.tags.has('onBall')).toBe(true);
    expect(command.vel.x).toBeLessThan(0);
  });
});

const simDt = .05;
