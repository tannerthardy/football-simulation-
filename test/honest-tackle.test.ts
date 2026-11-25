import { afterEach, describe, expect, it, vi } from 'vitest';
import { tackleNow } from './helpers/tackle-now.js';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

// A defender squared up on the true carrier, inside standing reach. The only thing that varies is what his delayed
// picture says about possession (recorded as the perception system records it) and HONEST_TACKLE.
async function stage(flag: '0' | '1', carrying: boolean | undefined) {
  vi.stubEnv('HONEST_TACKLE', flag);
  vi.resetModules();
  const { CENTER_Y } = await import('../src/core/field.js');
  const { Rng } = await import('../src/core/rng.js');
  const { generateTeam, pickDefense, pickOffense } = await import('../src/league/team.js');
  const { PASS_BY_ID } = await import('../src/playbook/concepts.js');
  const { COVERAGE_BY_ID, FRONT_BY_ID } = await import('../src/playbook/defense.js');
  const { FORMATION_BY_ID } = await import('../src/playbook/formations.js');
  const { PlaySim } = await import('../src/sim/playsim.js');
  const T = await import('../src/sim/tackle.js'); const { tryTackles } = T;
  const sim = new PlaySim({ offense: pickOffense(generateTeam(new Rng(19), 'O', 'OFF'), '11'),
    defense: pickDefense(generateTeam(new Rng(20), 'D', 'DEF'), 'nickel'),
    offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: false, kind: 'pass', pass: PASS_BY_ID.four_verts, label: 'lab' },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'lab' },
    los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 83 });
  const c = sim.slot('Z')!, d = sim.slot('FS')!;
  for (const a of sim.agents) if (a !== c && a !== d) { a.downUntil = 99; a.body.pos = { x: 5, y: a.idx * 2 }; }
  const body = c.profile.radius + d.profile.radius;
  d.body.pos = { x: 50, y: CENTER_Y }; d.body.vel = { x: 2, y: 0 }; d.body.facing = 0;
  c.body.pos = { x: 50 + body + .1, y: CENTER_Y }; c.body.vel = { x: 1, y: 0 }; c.body.facing = Math.PI;
  sim.t = 2; sim.world.time = 2;
  sim.intents[d.idx] = { vel: { x: 2, y: 0 }, facing: 0 };
  sim.ball = { kind: 'held', carrier: c }; sim.catchAt = 0;
  for (let k = 0; k < 24; k++) sim.perception.record(sim.agents.map(a => ({ pos: { ...a.pos }, vel: a.vel,
    facing: a.facing, pose: a.pose })), carrying === true ? c.idx : carrying === false ? null : undefined);
  const attempts = vi.spyOn(sim.rng, 'chance');
  tackleNow(sim, T);
  return { attempted: !!sim.bond || attempts.mock.calls.length > 0 || sim.outcome !== null, seen: sim.see(d, c).carrying };
}

describe('HONEST_TACKLE: a tackler reaches for the carrier his picture shows with the ball', () => {
  it('off: he reaches for the true carrier whatever his picture says', async () => {
    expect((await stage('0', false)).attempted).toBe(true);
    expect((await stage('0', true)).attempted).toBe(true);
  });

  it('on: a picture showing the carrier without the ball holds the reach', async () => {
    const r = await stage('1', false);
    expect(r.seen).toBe(false);
    expect(r.attempted).toBe(false);
  });

  it('on: once his picture shows the ball he reaches; unknown possession still counts', async () => {
    expect((await stage('1', true)).attempted).toBe(true);
    expect((await stage('1', undefined)).attempted).toBe(true);
  });
});
