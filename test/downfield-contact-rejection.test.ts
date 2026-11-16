import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/rng.js';
import { CENTER_Y } from '../src/core/field.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { PASS_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { PlaySim } from '../src/sim/playsim.js';
import { DownfieldBlocker } from '../src/sim/behaviors/receiver.js';
import { World } from '../src/physics/world.js';

function stage() {
  const sim = new PlaySim({
    offense: pickOffense(generateTeam(new Rng(31), 'O', 'OFF'), '11'),
    defense: pickDefense(generateTeam(new Rng(32), 'D', 'DEF'), 'nickel'),
    offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: false, kind: 'pass', pass: PASS_BY_ID.four_verts, label: '' },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: '' },
    los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 3,
  });
  const c = sim.slot('X')!, b = sim.slot('Z')!, d = sim.slot('FS')!;
  for (const a of sim.agents) {
    a.body.pos = { x: 5, y: 2 }; a.downUntil = 99;
    a.behavior = { kind: 'idle', update: () => ({ vel: { x: 0, y: 0 } }) };
  }
  c.downUntil = b.downUntil = d.downUntil = -1;
  c.body.pos = { x: 50, y: CENTER_Y };
  b.body.pos = { x: 52, y: CENTER_Y }; b.body.facing = 0;
  d.body.pos = { x: 52 + b.profile.radius + d.profile.radius + .1, y: CENTER_Y };
  sim.ball = { kind: 'held', carrier: c }; sim.t = 2;
  // Re-recorded on the engine defaults (2026-11-15): with RCV_SEEN the blocker acts on his delayed picture, so the
  // staged bodies are recorded into perception before he looks (as a held scene, not teleported into his eyes).
  for (let i = 0; i < 24; i++) sim.perception.record(sim.agents);
  const behavior = new DownfieldBlocker(); b.behavior = behavior;
  return { sim, b, d, behavior };
}

describe('downfield contact ownership', () => {
  it('continues a physical approach when the real engagement guard rejects a recently shed blocker', () => {
    const { sim, b, d, behavior } = stage();
    b.shedBy.set(d, sim.t + .3);
    const command = behavior.update(b, sim);
    expect(b.engagement).toBeNull();
    expect(sim.world.joints).toHaveLength(0);
    expect(command.vel.x).toBeLessThan(0); // Recover to the carrier-side fit.
    const x = b.pos.x;
    new World([b.body]).step([command], .05);
    expect(b.pos.x).toBeLessThan(x);
    expect(b.body.support!.state).toBe('up');
  });

  it('still relinquishes movement to an accepted engagement', () => {
    const { sim, b, d, behavior } = stage();
    const command = behavior.update(b, sim);
    expect(b.engagement?.defender).toBe(d);
    expect(sim.world.joints).toHaveLength(1);
    expect(command.vel).toEqual({ x: 0, y: 0 });
  });
});
