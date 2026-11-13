/** TKL_WHIFF: an open-field reach misses only when the carrier's body can get
 * out of the tackler's reachable hands in the reach window. */
import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { PASS_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { PlaySim } from '../src/sim/playsim.js';
import { whiffs } from '../src/sim/tackle.js';

function scene(gap: number, carrierVel: { x: number; y: number }, tacklerVel: { x: number; y: number }) {
  const home = generateTeam(new Rng(91), 'W offense', 'WOF'), away = generateTeam(new Rng(92), 'W defense', 'WDF');
  const sim = new PlaySim({ offense: pickOffense(home, '11'), defense: pickDefense(away, 'nickel'), seed: 45,
    offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: false, kind: 'pass', pass: PASS_BY_ID.curl_flat, label: 'curl' },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'Cover 3' },
    los: 40, ballY: 26, firstDownX: 50, audibles: false });
  const c = sim.slot('X')!, d = sim.slot('CB_S')!;
  c.body.pos = { x: 60, y: 20 }; c.body.vel = carrierVel; c.body.facing = Math.atan2(carrierVel.y, carrierVel.x);
  d.body.pos = { x: 60 - gap, y: 20 }; d.body.vel = tacklerVel; d.body.facing = 0;
  for (let i = 0; i < 24; i++) sim.perception.record(sim.agents);
  const arms = c.profile.radius + d.profile.radius + d.profile.reach;
  return { sim, c, d, arms };
}

describe('TKL_WHIFF: a whiff comes from the bodies, not a roll', () => {
  it('a tackler at body distance does not whiff', () => {
    const { sim, c, d, arms } = scene(0.75, { x: 4, y: 0 }, { x: 5, y: 0 });
    expect(whiffs(sim, d, c, arms, false, 0.2)).toBe(false);
  });
  it('a reach at full extension from behind a faster runner misses', () => {
    const probe = scene(1, { x: 8, y: 0 }, { x: 4, y: 0 });
    const s = scene(probe.arms - 0.02, { x: 8, y: 0 }, { x: 4, y: 0 });
    expect(whiffs(s.sim, s.d, s.c, s.arms, false, 0.2)).toBe(true);
  });
  it('the same full reach on a runner coming at him does not', () => {
    const s = scene(1.5, { x: -6, y: 0 }, { x: 3, y: 0 });
    // the carrier runs toward the tackler: still inside reach when the hands arrive
    expect(whiffs(s.sim, s.d, s.c, s.arms, false, 0.2)).toBe(false);
  });
});
