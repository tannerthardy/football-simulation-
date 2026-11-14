/** A free backside edge whose own picture shows the ball carried away from
 * his side behind the line trails it (squeeze and flatten) instead of holding
 * his landmark; without an acquired carrier he keeps the ordinary edge fit.
 * docs/reviews/backside-edge.md. */
import { describe, expect, it } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { RUN_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import type { Perceived } from '../src/sim/perception.js';
import { PlaySim } from '../src/sim/playsim.js';
import { executeRunFit } from '../src/sim/run-fits.js';

const offense = generateTeam(new Rng(51), 'Backside offense', 'BSO', { strength: .55 });
const defense = generateTeam(new Rng(52), 'Backside defense', 'BSD', { strength: .55 });

function stage(side: number, carrying: boolean | null) {
  const sim = new PlaySim({ offense: pickOffense(offense, '11'), defense: pickDefense(defense, 'nickel'),
    offCall: { formation: FORMATION_BY_ID.gun_trey_11, flip: side > 0, kind: 'run', run: RUN_BY_ID.oz_weak, label: 'Staged run' },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'Over Cover 3' },
    los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 5 });
  const e = sim.slot('DE_S')!, r = sim.slot('RB')!;
  // Everyone else stands in formation, so no blocker reads as a kick-out.
  for (const o of sim.agents) o.body.vel = { x: 0, y: 0 };
  sim.t = 2; sim.ball = { kind: 'held', carrier: r }; sim.handoffAt = 1;
  e.runFit = { gap: 'D', side, kind: 'edge', technique: 'attack', edge: 'box', pace: 'stack' };
  e.body.pos = { x: 40.3, y: CENTER_Y + side * 7 }; e.body.vel = { x: 0, y: 0 }; e.body.facing = Math.PI;
  r.body.pos = { x: 36, y: CENTER_Y - side }; r.body.vel = { x: 1, y: -side * 5 };
  sim.qb.body.pos = { x: 35, y: CENTER_Y };
  Object.defineProperty(e.mind, 'placementError', { get: () => 0 });
  const picture: Perceived = { pos: { ...r.pos }, vel: { ...r.vel }, age: .25, carrying, stance: null, facing: 0, pose: 'up' };
  const oldSee = sim.see.bind(sim);
  sim.see = (observer, target, delay) => target === r ? picture : oldSee(observer, target, delay);
  // An explicit read: his picture of this runner (carrying or not), not the
  // true carrier a no-read fallback once supplied.
  return executeRunFit(e, sim, 'D', side, { possession: { target: r, cue: picture } });
}

describe('backside edge trail', () => {
  it.each([-1, 1])('trails the ball carried away behind the line, side=%s', side => {
    const trail = stage(side, true), fit = stage(side, null);
    // Toward the ball, where the ordinary fit holds his outside landmark.
    expect(trail.vel.y * side).toBeLessThan(-1);
    expect(trail.vel.y * side).toBeLessThan(fit.vel.y * side - 1);
    // Flat, at the ball's depth: not upfield past the line.
    expect(trail.vel.x).toBeLessThanOrEqual(fit.vel.x + 1e-9);
  });

  it('mirrors', () => {
    const l = stage(-1, true), r = stage(1, true);
    expect(l.vel.x).toBeCloseTo(r.vel.x, 9);
    expect(l.vel.y).toBeCloseTo(-r.vel.y, 9);
  });
});
