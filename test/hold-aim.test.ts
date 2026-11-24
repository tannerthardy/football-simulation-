/** HOLD_AIM: the taught aim for the situation he sees, executed with error, and a lower aim costs reach. */
import { describe, expect, it, vi } from 'vitest';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { PASS_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { PlaySim } from '../src/sim/playsim.js';
import { HOLD_AIM, aimOf } from '../src/sim/tackle.js';
import { recordPicture, tackleNow } from './helpers/tackle-now.js';

function scene(gap: number, carrierVel: { x: number; y: number }, tacklerVel: { x: number; y: number }, behind = false) {
  const sim = new PlaySim({ offense: pickOffense(generateTeam(new Rng(91), 'A offense', 'AOF'), '11'), defense: pickDefense(generateTeam(new Rng(92), 'A defense', 'ADF'), 'nickel'), seed: 45,
    offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: false, kind: 'pass', pass: PASS_BY_ID.curl_flat, label: 'curl' },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'Cover 3' },
    los: 40, ballY: 26, firstDownX: 50, audibles: false });
  const c = sim.slot('X')!, d = sim.slot('CB_S')!;
  for (const a of sim.agents) if (a !== c && a !== d) { a.downUntil = 99; a.body.pos = { x: 5, y: a.idx * 2 }; }
  c.body.pos = { x: 60, y: 20 }; c.body.vel = carrierVel; c.body.facing = Math.atan2(carrierVel.y, carrierVel.x);
  d.body.pos = { x: behind ? 60 - gap : 60 + gap, y: 20 }; d.body.vel = tacklerVel; d.body.facing = behind ? 0 : Math.PI;
  sim.ball = { kind: 'held', carrier: c }; sim.catchAt = 0; sim.t = 2; sim.world.time = 2;
  sim.intents[d.idx] = { vel: { ...tacklerVel }, facing: d.body.facing };
  recordPicture(sim);
  return { sim, c, d };
}

describe.runIf(HOLD_AIM)('HOLD_AIM', () => {
  it('a tackler the carrier runs at aims at the thighs; one behind him at the hips and legs', () => {
    const front = scene(0.8, { x: 3, y: 0 }, { x: -1, y: 0 });
    vi.spyOn(front.sim.rng, 'chance').mockReturnValue(false);
    tackleNow(front.sim);
    expect(aimOf(front.d)?.region).toBe('thigh');
    const back = scene(0.8, { x: 3, y: 0 }, { x: 4, y: 0 }, true);
    vi.spyOn(back.sim.rng, 'chance').mockReturnValue(false);
    tackleNow(back.sim);
    expect(aimOf(back.d)?.region).toBe('hips/legs');
  });
});
