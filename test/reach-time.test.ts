/** REACH_TIME: a reach takes time and resolves on the bodies' geometry when the hands arrive, not on a roll. */
import { describe, expect, it, vi } from 'vitest';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { PASS_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { PlaySim } from '../src/sim/playsim.js';
import { REACH_TIME, reachOf, tryTackles } from '../src/sim/tackle.js';
import { reachTo } from '../src/sim/tackle-reach.js';

function scene(gap: number, carrierVel: { x: number; y: number }, tacklerVel: { x: number; y: number }) {
  const home = generateTeam(new Rng(91), 'R offense', 'ROF'), away = generateTeam(new Rng(92), 'R defense', 'RDF');
  const sim = new PlaySim({ offense: pickOffense(home, '11'), defense: pickDefense(away, 'nickel'), seed: 45,
    offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: false, kind: 'pass', pass: PASS_BY_ID.curl_flat, label: 'curl' },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'Cover 3' },
    los: 40, ballY: 26, firstDownX: 50, audibles: false });
  const c = sim.slot('X')!, d = sim.slot('CB_S')!;
  for (const a of sim.agents) if (a !== c && a !== d) { a.downUntil = 99; a.body.pos = { x: 5, y: a.idx * 2 }; }
  c.body.pos = { x: 60, y: 20 }; c.body.vel = carrierVel; c.body.facing = Math.atan2(carrierVel.y, carrierVel.x);
  d.body.pos = { x: 60 - gap, y: 20 }; d.body.vel = tacklerVel; d.body.facing = 0;
  sim.ball = { kind: 'held', carrier: c }; sim.catchAt = 0; sim.t = 2; sim.world.time = 2;
  for (let i = 0; i < 24; i++) sim.perception.record(sim.agents, c.idx);
  sim.intents[d.idx] = { vel: { ...tacklerVel }, facing: 0 };
  return { sim, c, d };
}

describe.runIf(REACH_TIME)('REACH_TIME contracts', () => {
  it('starts a reach, makes no hold at once, and draws no tackle roll', () => {
    const probe = scene(1, { x: 2, y: 0 }, { x: 2.5, y: 0 });
    const s = scene(probe.c.profile.radius + probe.d.profile.radius + 0.1, { x: 2, y: 0 }, { x: 2.5, y: 0 });
    const roll = vi.spyOn(s.sim.dice('tackle', s.d), 'chance');
    tryTackles(s.sim);
    expect(reachOf(s.d)).toBeDefined();
    expect(s.sim.bond).toBeNull();
    // The hands get there: a hold, made from the geometry when they arrive.
    for (let k = 0; k < 6 && !s.sim.bond; k++) s.sim.tick();
    expect(s.sim.bond?.tacklers).toContain(s.d);
    expect(roll).not.toHaveBeenCalled();
    roll.mockRestore();
  });

  it('a carrier who is out of the reach when the hands arrive is missed, and the miss costs the tackler his lean', () => {
    const probe = scene(1, { x: 8, y: 0 }, { x: 3, y: 0 });
    const s = scene(reachTo(probe.d, probe.c, 1) - 0.03, { x: 8, y: 0 }, { x: 3, y: 0 });
    tryTackles(s.sim);
    expect(reachOf(s.d)).toBeDefined();
    for (let k = 0; k < 8 && reachOf(s.d); k++) s.sim.tick();
    const missed = s.sim.events.some(e => e.type === 'missed_tackle' && e.note === 'reach');
    expect(missed).toBe(true);
    expect(s.sim.bond?.tacklers.includes(s.d) ?? false).toBe(false);
  });
});
