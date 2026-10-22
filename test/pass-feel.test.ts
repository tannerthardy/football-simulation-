/** PASS_FEEL (engagement.ts stepPassRep, the blocker's mirror): the blocker
 * mirrors the rusher he has acquired, by touch (about 60 ms) or, with his
 * hands cleared, by sight, not the rusher's current velocity. Off: the
 * rusher's current velocity and position. */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { PASS_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import type { Intent } from '../src/physics/world.js';
import { PlaySim } from '../src/sim/playsim.js';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

/** A rusher sliding +y for the whole remembered history reverses this
 * instant. Returns the blocker's requested lateral (y) speed. */
async function mirror(enabled: boolean) {
  vi.stubEnv('PASS_FEEL', enabled ? '1' : '0');
  vi.resetModules();
  const { createEngagement, updateEngagements } = await import('../src/sim/engagement.js');
  const off = generateTeam(new Rng(7), 'O', 'OFF', { strength: 0.6 });
  const def = generateTeam(new Rng(19), 'D', 'DEF', { strength: 0.6 });
  const sim = new PlaySim({ offense: pickOffense(off, '11'), defense: pickDefense(def, 'nickel'),
    offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: false, kind: 'pass', pass: PASS_BY_ID.four_verts, label: '' },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: '' },
    los: 40, ballY: 26, firstDownX: 50, seed: 3 });
  const b = sim.slot('RG')!, d = sim.slot('DT_S')!;
  sim.qb.body.pos = { x: 33, y: 26 };
  b.body.pos = { x: 37, y: 26 };
  d.body.pos = { x: 37 + b.profile.radius + d.profile.radius, y: 26 };
  b.body.vel = { x: 0, y: 0 }; d.body.vel = { x: 0, y: 2.5 };
  for (const a of sim.agents) {
    if (a === b || a === d || a === sim.qb) continue;
    a.body.pos = { x: 5 + a.idx * 0.1, y: 1 + a.idx * 2 }; a.downUntil = 99;
  }
  for (let i = 0; i < 24; i++) sim.perception.record(sim.agents);
  const e = createEngagement(sim, b, d, 'pass', null)!;
  e.nextMoveAt = Infinity;
  d.body.vel = { x: 0, y: -2.5 };
  const intents: Intent[] = sim.agents.map(() => ({ vel: { x: 0, y: 0 }, facing: 0 }));
  updateEngagements(sim, intents);
  return intents[b.idx].vel.y;
}

describe('the pass blocker mirrors what he has felt or seen', () => {
  it('off: he follows the reversal at once', async () => {
    expect(await mirror(false)).toBeLessThan(-1);
  });
  it('on: he is still going with the slide he felt', async () => {
    expect(await mirror(true)).toBeGreaterThan(1);
  });
});
