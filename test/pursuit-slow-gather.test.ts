import { describe, expect, it } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { PASS_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { gatheringApproach } from '../src/sim/behaviors/common.js';
import type { Perceived } from '../src/sim/perception.js';
import { PlaySim } from '../src/sim/playsim.js';

const offense = pickOffense(generateTeam(new Rng(19), 'O', 'OFF'), '11');
const defense = pickDefense(generateTeam(new Rng(20), 'D', 'DEF'), 'nickel');
/** A runner crossing at 7 yd/s, 2.5 yd from a pursuer moving at `speed` toward his path. */
function scene(speed: number, distance = 2.5) {
  const sim = new PlaySim({ offense, defense,
    offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: false, kind: 'pass',
      pass: PASS_BY_ID.four_verts, label: 'slow gather' },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3,
      pressure: null, label: 'slow gather' },
    los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 19 });
  const runner = sim.slot('Z')!, d = sim.slot('FS')!;
  const picture: Perceived = { pos: { x: 55, y: CENTER_Y }, vel: { x: 0, y: 7 }, facing: Math.PI / 2,
    stance: null, carrying: true, age: .2 };
  d.body.pos = { x: 55 + distance, y: CENTER_Y };
  d.body.vel = { x: -speed * .6, y: speed * .8 };
  d.body.facing = Math.atan2(d.vel.y, d.vel.x);
  const contact = runner.profile.radius + d.profile.radius + d.profile.reach * .65;
  return { d, picture, contact };
}

describe('TKL-2: a slower pursuer keeps his intercept line instead of chasing the hip', () => {
  it('a pursuer at or above the runner\'s speed still gathers on the hip', () => {
    const { d, picture, contact } = scene(7.5);
    expect(gatheringApproach(d, picture, contact, 0).gather).toBe(1);
  });

  it('a slower pursuer does not gather on the hip from the same spot', () => {
    const { d, picture, contact } = scene(4.5);
    expect(gatheringApproach(d, picture, contact, 0).gather).toBe(0);
  });

  it('a slower pursuer still gathers for the grab at arm\'s length', () => {
    const { contact } = scene(4.5);
    const { d, picture } = scene(4.5, contact - .4);
    expect(gatheringApproach(d, picture, contact, 0).gather).toBe(1);
  });
});
