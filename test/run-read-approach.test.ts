import { describe, expect, it } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { RUN_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { PlaySim } from '../src/sim/playsim.js';
import { entryRisk } from '../src/sim/run-read.js';
import { sprintTime, timeToReach } from '../src/physics/reach.js';
import type { Vec2 } from '../src/core/vec.js';

function scene() {
  const formation = FORMATION_BY_ID.ace_11;
  const sim = new PlaySim({
    offense: pickOffense(generateTeam(new Rng(31), 'O', 'O', { strength: .55 }), formation.personnel),
    defense: pickDefense(generateTeam(new Rng(32), 'D', 'D', { strength: .55 }), 'base43'),
    offCall: { formation, flip: false, kind: 'run', run: RUN_BY_ID.wz_weak, label: 'approach witness' },
    defCall: { personnel: 'base43', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'Over' },
    los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 3,
  });
  const rb = sim.slot('RB')!, threat = sim.slot('DE_W')!;
  sim.opponents = () => [threat];
  sim.see = (_a, d) => ({ pos: { ...d.pos }, vel: { ...d.vel }, stance: null, facing: d.facing, pose: 'up', age: .25 });
  // Historical straight-sprint prediction, retained only as a counterexample.
  const oldRisk = (entry: Vec2) => {
    const dx = entry.x - rb.pos.x, dy = entry.y - rb.pos.y, D = Math.hypot(dx, dy);
    const v = Math.max(0, (rb.vel.x * dx + rb.vel.y * dy) / D);
    return Math.max(...[.35, .7, 1].map(u => {
      const p = { x: rb.pos.x + dx * u, y: rb.pos.y + dy * u };
      return Math.max(0, sprintTime(D * u, v, rb.profile.vmax, rb.profile.tau)
        - timeToReach(threat, p, rb.profile.radius + threat.profile.radius)) * 3;
    }));
  };
  return { sim, rb, threat, oldRisk };
}

describe('parked run approach candidate includes the carrier redirect', () => {
  it.each([-1, 1])('does not erase outward momentum before an inward entry, mirror %s', side => {
    const { sim, rb, threat, oldRisk } = scene();
    rb.body.pos = { x: 37.8841720983, y: CENTER_Y };
    rb.body.vel = { x: 3.8773632641, y: side * 3.08610461 };
    threat.body.pos = { x: 40.2618755179, y: CENTER_Y - side * .0088455117 };
    threat.body.vel = { x: -.6883418835, y: side * 1.3776010076 };
    const entry = { x: 40.5, y: CENTER_Y - side * 1.2392255656 };
    expect(oldRisk(entry)).toBeLessThan(.6);
    expect(entryRisk(rb, sim, entry, false)).toBeLessThan(.6);
    expect(entryRisk(rb, sim, entry, true)).toBeGreaterThan(.6);
  });

  it('preserves a clean aligned approach with a receding defender', () => {
    const { sim, rb, threat, oldRisk } = scene();
    rb.body.pos = { x: 37, y: CENTER_Y }; rb.body.vel = { x: 6, y: 0 };
    threat.body.pos = { x: 46, y: CENTER_Y }; threat.body.vel = { x: 4, y: 0 };
    const entry = { x: 40.5, y: CENTER_Y };
    expect(oldRisk(entry)).toBe(0);
    expect(entryRisk(rb, sim, entry, false)).toBe(0);
    expect(entryRisk(rb, sim, entry, true)).toBe(0);
  });
});
