import { describe, expect, it } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { World } from '../src/physics/world.js';
import { PASS_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { ManCoverage, type ManOptions } from '../src/sim/behaviors/defense.js';
import type { Perceived } from '../src/sim/perception.js';
import { PlaySim } from '../src/sim/playsim.js';

const offense = generateTeam(new Rng(31), 'Awareness offense', 'AOF', { strength: .55 });
const defense = generateTeam(new Rng(32), 'Awareness defense', 'ADF', { strength: .55 });
function make(gap = 11.27326257609023, speed = 3.109551938502868,
  opts: ManOptions = {}, press = false, side = 1) {
  const sim = new PlaySim({ offense: pickOffense(offense, '11'), defense: pickDefense(defense, 'nickel'),
    offCall: { formation: FORMATION_BY_ID.gun_trips_11, flip: false, kind: 'pass', pass: PASS_BY_ID.four_verts, label: 'test' },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover4,
      pressure: null, zoneStyle: 'match', label: 'test' }, los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 3 });
  const a = sim.slot('LB_W')!, r = sim.slot('RB')!;
  sim.t = 2.1;
  r.body.pos = { x: 37.54160365364649, y: CENTER_Y + side * 1.83527961490437 };
  r.body.vel = { x: speed, y: side * .6452453675303703 };
  a.body.pos = { x: r.pos.x + gap, y: CENTER_Y - side * .615742657370152 };
  a.body.vel = { x: 3.502377976993737, y: -side * 2.9587972032846546 };
  a.body.facing = Math.PI;
  let picture: Perceived = { pos: { ...r.pos }, vel: { ...r.vel }, facing: 0, age: .25, pose: 'up', stance: 'high' };
  const ordinarySee = sim.see.bind(sim);
  sim.see = (observer, target, delay) => target === r ? picture : ordinarySee(observer, target, delay);
  const behavior = new ManCoverage(a, sim, r, press, 'B', side, opts);
  return { sim, a, r, behavior, update: () => behavior.update(a, sim),
    picture: () => picture, setPicture: (p: Perceived) => { picture = p; } };
}

describe('man coverage closes excess cushion from a consumed moving release', () => {
  it.each([-1, 1])('closes the native late-match gap without instantly reversing momentum, side=%s', side => {
    const f = make(undefined, undefined, {}, false, side);
    const initial = { ...f.a.pos }, initialVelocity = { ...f.a.vel };
    const command = f.update();
    expect(f.behavior.recordedTechnique().hipsOpen).toBe(false);
    expect(command.vel.x).toBeLessThan(0);
    expect(f.a.pos).toEqual(initial);
    expect(f.a.vel).toEqual(initialVelocity);
    const world = new World([f.a.body, f.r.body]);
    const step = world.step([command, { vel: f.r.vel }], .05);
    expect(f.a.vel.x).toBeLessThan(initialVelocity.x);
    expect(f.a.vel.x).toBeGreaterThan(0);
    expect(Math.abs(step.work.residual)).toBeLessThan(1e-8);
  });

  it('holds the initial off-man depth while the consumed receiver is stationary', () => {
    const f = make(undefined, 0);
    f.setPicture({ ...f.picture(), vel: { x: 0, y: 0 } });
    expect(f.update().vel.x).toBeCloseTo(-.32, 10);
    expect(f.behavior.recordedTechnique().hipsOpen).toBe(false);
  });

  it('tracks an ordinary moving cushion rather than charging every released receiver', () => {
    const f = make(4);
    const command = f.update();
    expect(command.vel.x).toBeGreaterThan(1.5);
    expect(command.vel.x).toBeLessThan(5);
    expect(f.behavior.recordedTechnique().hipsOpen).toBe(false);
  });

  it('does not change the request or RNG when only the hidden current receiver is displaced', () => {
    const one = make(), two = make();
    two.r.body.pos = { x: 80, y: 2 };
    two.r.body.vel = { x: -8, y: 3 };
    expect(one.update()).toEqual(two.update());
    expect(one.sim.rng.next()).toEqual(two.sim.rng.next());
  });

  it('changes the motor request when the consumed motion picture actually changes', () => {
    const moving = make(), idle = make();
    idle.setPicture({ ...idle.picture(), vel: { x: 0, y: 0 } });
    expect(moving.update().vel.x).toBeLessThan(-1);
    expect(idle.update().vel.x).toBeCloseTo(-.32, 10);
  });

  it('continues closing excess cushion after the observed release plants behind the line', () => {
    const f = make();
    expect(f.update().vel.x).toBeLessThan(-1);
    f.sim.t += .05;
    f.setPicture({ ...f.picture(), vel: { x: 0, y: 0 }, facing: Math.PI });
    expect(f.update().vel.x).toBeLessThan(-1);
  });

  it('does not acquire release knowledge from a hidden current burst before the moving cue arrives', () => {
    const f = make(undefined, 0);
    f.setPicture({ ...f.picture(), vel: { x: 0, y: 0 } });
    f.r.body.vel = { x: 8, y: 0 };
    expect(f.update().vel.x).toBeCloseTo(-.32, 10);
    f.sim.t += .05;
    expect(f.update().vel.x).toBeCloseTo(-.32, 10);
  });

  it('preserves a safety roof and press release while using the same moving picture', () => {
    const roof = make(undefined, undefined, { overTop: true });
    const press = make(undefined, undefined, {}, true);
    // The roof stays above the receiver; the press player does not acquire
    // a newly invented downhill close from the off-man compression branch.
    const roofCommand = roof.update();
    expect(roofCommand.vel.x).toBeLessThan(0);
    expect(roof.behavior.recordedTechnique().overTop).toBe(true);
    expect(press.update().vel.x).toBeGreaterThan(0);
  });

  it('preserves the trail hip for an already declared vertical', () => {
    const trail = make(2, 6, { trail: true }), ordinary = make(2, 6);
    for (const f of [trail, ordinary]) {
      f.setPicture({ ...f.picture(), pos: { x: 46, y: f.picture().pos.y }, vel: { x: 6, y: 0 } });
      f.a.body.pos.x = 48;
    }
    expect(trail.update().vel.x).toBeLessThan(ordinary.update().vel.x);
    expect(trail.behavior.recordedTechnique().hipsOpen).toBe(true);
  });
});
