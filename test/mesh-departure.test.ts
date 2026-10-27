import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { RUN_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { RunnerToMesh } from '../src/sim/assign.js';
import { stand } from '../src/sim/behaviors/common.js';
import { PlaySim } from '../src/sim/playsim.js';

const offense = generateTeam(new Rng(11), 'O', 'O', { strength: .55 });
const defense = generateTeam(new Rng(12), 'D', 'D', { strength: .55 });

/** A power handoff with everyone but the back parked. The back's own body,
 * the installed exchange time and the QB he sees are the only inputs. */
function stage(start: { x: number; y: number }, qbAtMesh: boolean) {
  const formation = FORMATION_BY_ID.ace_11;
  const sim = new PlaySim({ offense: pickOffense(offense, formation.personnel), defense: pickDefense(defense, 'base43'),
    offCall: { formation, flip: false, kind: 'run', run: RUN_BY_ID.power, label: 'Power' },
    defCall: { personnel: 'base43', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'C3' },
    los: 40, ballY: 26.67, firstDownX: 50, seed: 77 });
  for (const a of sim.agents) {
    a.body.pos = { x: 70 + a.idx % 5 * 3, y: 3 + Math.floor(a.idx / 5) * 3 }; a.body.vel = { x: 0, y: 0 };
    a.behavior = { kind: 'idle', update: () => stand(a.facing) };
  }
  const rb = sim.slot('RB')!, mesh = { x: 36, y: 27.8 }, aim = { x: 40.6, y: 30 };
  rb.body.pos = { ...start }; rb.body.vel = { x: 0, y: 0 }; rb.body.facing = 0;
  sim.qb.body.pos = qbAtMesh ? { x: mesh.x + .1, y: mesh.y - .6 } : { x: 39, y: 26.67 };
  const behavior = new RunnerToMesh(mesh, 1.3, aim, true);
  rb.behavior = behavior;
  for (let k = 0; k < 24; k++) sim.perception.record(sim.agents);
  return { sim, rb, behavior, mesh };
}

describe('the back leaves the mesh as late as his own start allows', () => {
  it('holds his stance when his body reaches the mesh in time from a later beat, and goes when it would not', () => {
    const near = stage({ x: 35, y: 27.3 }, true);
    near.sim.t = 0;
    const held = near.behavior.update(near.rb, near.sim);
    expect(Math.hypot(held.vel.x, held.vel.y)).toBe(0);
    // A long trip from the same body: waiting one more beat would be late.
    const far = stage({ x: 30, y: 22 }, true);
    far.sim.t = 0;
    const going = far.behavior.update(far.rb, far.sim);
    expect(Math.hypot(going.vel.x, going.vel.y)).toBeGreaterThan(1);
    // The held back still leaves before the exchange.
    let t = 0, moved = -1;
    while (t < 1.3 && moved < 0) {
      near.sim.t = t;
      const c = near.behavior.update(near.rb, near.sim);
      if (Math.hypot(c.vel.x, c.vel.y) > 0) moved = t;
      t += .05;
    }
    expect(moved).toBeGreaterThan(.1);
    expect(moved).toBeLessThan(1.3);
  });

  it('runs through the mesh only with the QB there, as he sees him', () => {
    for (const qbAtMesh of [true, false]) {
      const f = stage({ x: 35.4, y: 27.6 }, qbAtMesh);
      f.sim.t = 1.25;
      Reflect.set(f.behavior, 'departed', true);
      const c = f.behavior.update(f.rb, f.sim);
      const passed = Reflect.get(f.behavior, 'passed') as boolean;
      expect(passed).toBe(qbAtMesh);
      // Without the QB he gathers at the mesh instead of running past it.
      if (!qbAtMesh) expect((c.vel.x * (f.mesh.x - f.rb.pos.x) + c.vel.y * (f.mesh.y - f.rb.pos.y))).toBeGreaterThanOrEqual(0);
    }
  });

  it('carries his exchange tempo into the pocket with the QB there, not the on-time pace of a late clock', () => {
    for (const qbAtMesh of [true, false]) {
      // Half a yard short, a beat before the window, with little clock left.
      const f = stage({ x: 35.5, y: 27.6 }, qbAtMesh);
      f.sim.t = 1.1;
      Reflect.set(f.behavior, 'departed', true);
      const c = f.behavior.update(f.rb, f.sim), v = Math.hypot(c.vel.x, c.vel.y);
      if (qbAtMesh) expect(v).toBeGreaterThanOrEqual(f.rb.profile.vmax * .5);
      else expect(v).toBeLessThan(f.rb.profile.vmax * .5);
    }
  });
});
