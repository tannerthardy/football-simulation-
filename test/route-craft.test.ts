/** ROUTE_CRAFT (experimental, off): a receiver who sees a defender in his lane
 * works to a shoulder. A short loop on the receiver's own controller: he runs
 * at 6 yd/s up a line with a defender on it 4 yd ahead, who either stands or
 * mirrors his step after 0.2 s (lateral speed capped by the defender's skill). */
import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { PASS_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { PlaySim } from '../src/sim/playsim.js';
import { routeCraft } from '../src/sim/behaviors/receiver.js';

function lane(mirror: number, rr: number, craft: boolean, seed = 1) {
  PlaySim.recordedSingleStream = true;
  const sim = new PlaySim({ offense: pickOffense(generateTeam(new Rng(7), 'O', 'OFF'), '11'),
    defense: pickDefense(generateTeam(new Rng(19), 'D', 'DEF'), 'nickel'),
    offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: false, kind: 'pass', pass: PASS_BY_ID.four_verts, label: '' },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: '' },
    los: 40, ballY: 26, firstDownX: 50, seed });
  const r = sim.slot('X')!, cb = sim.defense.find(d => d.player.position === 'CB')!;
  for (const a of sim.agents) { a.body.pos = { x: 10, y: 5 + a.idx }; a.body.vel = { x: 0, y: 0 }; }
  r.body.pos = { x: 45, y: 20 }; r.body.vel = { x: 6, y: 0 }; r.body.facing = 0;
  cb.body.pos = { x: 49, y: 20.1 }; cb.body.vel = { x: 0, y: 0 }; cb.body.facing = Math.PI;
  const dt = sim.dt, lagTicks = Math.round(0.2 / dt), rv: number[] = [];
  let minD = Infinity;
  for (let k = 0; k < 24; k++) {
    sim.t += dt;
    sim.perception.record(sim.agents, null);
    const cmd = { vel: { x: 6, y: 0 } };
    const out = craft ? routeCraft(r, sim, cmd, rr, 0) : cmd;
    r.body.vel = { ...out.vel }; rv.push(out.vel.y);
    r.body.pos = { x: r.pos.x + out.vel.x * dt, y: r.pos.y + out.vel.y * dt };
    const follow = rv.length > lagTicks ? rv[rv.length - 1 - lagTicks] : 0;
    const vy = Math.max(-mirror, Math.min(mirror, follow));
    cb.body.vel = { x: 0, y: vy };
    cb.body.pos = { x: cb.pos.x, y: cb.pos.y + vy * dt };
    if (r.pos.x < cb.pos.x + 1) minD = Math.min(minD, Math.hypot(r.pos.x - cb.pos.x, r.pos.y - cb.pos.y));
  }
  const touch = r.profile.radius + cb.profile.radius;
  return { minD, touch, x: r.pos.x };
}

describe('ROUTE_CRAFT', () => {
  it('off: he runs his line into a defender standing on it', () => {
    const o = lane(0, 0.8, false);
    expect(o.minD).toBeLessThan(o.touch);
  });
  it('a defender who does not react is cleared, at a small cost in ground gained', () => {
    const off = lane(0, 0.8, false), on = lane(0, 0.8, true);
    expect(on.minD).toBeGreaterThan(on.touch);
    expect(on.x).toBeLessThan(off.x);
  });
  // Re-recorded on the engine defaults (2026-11-15): with ALIGN_HABIT the play's stream (and so the receiver's delayed
  // picture of the defender) differs, and on seed 1 alone the 0.2 runner kept more of the gap (0.446 vs 0.414). Over 20
  // seeds the better runner keeps more on 18 (seeds 1 and 14 are the exceptions on develop 0f5f7645), and the mirror closes the
  // gap on all 20, so the claim is read over the seeds, not on one draw.
  it('a defender who mirrors the step closes the gap again; the better route runner keeps more of it', () => {
    let closes = 0, better = 0;
    for (let seed = 1; seed <= 20; seed++) {
      const still = lane(0, 0.8, true, seed), mirrored = lane(3, 0.8, true, seed), poor = lane(3, 0.2, true, seed);
      if (mirrored.minD < still.minD) closes++;
      if (mirrored.minD > poor.minD) better++;
    }
    expect(closes).toBe(20);
    expect(better).toBeGreaterThanOrEqual(16);
  });
});
