/** SET_SQUEEZE (defense.ts / coverage-leverage.ts; experimental, off): a deep
 * match corner in a zone call carrying a climbing vertical with banked cushion.
 * Before he sees the QB set, he matches the receiver's stem speed whether the
 * flag is on or off. Once his own picture shows the QB set at the top of his
 * drop, with the flag on he gives ground slower than the receiver (spending
 * cushion) but still gives ground: the depth check keeps his roof. */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function step(flag: string, qbSet: boolean) {
  vi.resetModules();
  vi.stubEnv('SET_SQUEEZE', flag);
  const { Rng } = await import('../src/core/rng.js');
  const { generateTeam, pickDefense, pickOffense } = await import('../src/league/team.js');
  const { PASS_BY_ID } = await import('../src/playbook/concepts.js');
  const { COVERAGE_BY_ID, FRONT_BY_ID } = await import('../src/playbook/defense.js');
  const { FORMATION_BY_ID } = await import('../src/playbook/formations.js');
  const { ManCoverage, observeQbSet } = await import('../src/sim/behaviors/defense.js');
  const { PlaySim } = await import('../src/sim/playsim.js');
  const offense = generateTeam(new Rng(31), 'Deep offense', 'DPO', { strength: .55 });
  const defense = generateTeam(new Rng(32), 'Deep defense', 'DPD', { strength: .55 });
  const sim = new PlaySim({ offense: pickOffense(offense, '11'), defense: pickDefense(defense, 'nickel'),
    offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: false, kind: 'pass', pass: PASS_BY_ID.four_verts, label: 'vertical duty' },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3_match,
      pressure: null, zoneStyle: 'match', label: 'vertical duty' }, los: 40, ballY: 26, firstDownX: 50, seed: 3 });
  const a = sim.slot('CB_S')!, r = sim.slot(sim.offAlign.numbering.S1!)!, qb = sim.qb;
  // Receiver 8 yd downfield climbing at 6 yd/s; corner 5 yd over him, hips open, running with him.
  r.body.pos = { x: sim.los + 8, y: r.pos.y }; r.body.vel = { x: 6, y: 0 };
  a.body.pos = { x: r.pos.x + 5, y: r.pos.y - .7 }; a.body.vel = { x: 6, y: 0 }; a.body.facing = 0;
  a.recog!.read = 'pass';
  const snap = sim.offAlign.spots.QB!.pos;
  const qbPicture = qbSet ? { pos: { x: snap.x - 5, y: snap.y }, vel: { x: 0, y: 0 } } : { pos: { x: snap.x - 2, y: snap.y }, vel: { x: -4, y: 0 } };
  const see = sim.see.bind(sim);
  sim.see = (who, target, delay) => target === r
    ? { pos: { ...r.pos }, vel: { ...r.vel }, facing: 0, stance: null, pose: 'up', carrying: false, age: .2 }
    : target === qb ? { ...see(who, target, delay), ...structuredClone(qbPicture) } : see(who, target, delay);
  sim.t = 1.6;
  observeQbSet(a, sim); // dropped 5 yd and stopped (or still dropping)
  const behavior = new ManCoverage(a, sim, r, false, 'B', 1,
    { lev: 'outside', overTop: true, protectDepth: true, zoneEyes: true, initialPosition: { ...r.pos } });
  behavior.update(a, sim); // observes the release, opens
  return behavior.update(a, sim);
}

describe('SET_SQUEEZE: a deep match corner spends banked cushion once he sees the QB set', () => {
  it('matches the stem before the set, flag on or off', async () => {
    const off = await step('0', false), on = await step('1', false);
    expect(on.vel.x).toBeCloseTo(off.vel.x, 6);
    expect(off.vel.x).toBeGreaterThan(5);
  });
  it('after the set, gives ground slower than the receiver but still gives ground', async () => {
    const off = await step('0', true), on = await step('1', true);
    expect(off.vel.x).toBeGreaterThan(5);
    expect(on.vel.x).toBeLessThan(off.vel.x - 1);
    expect(on.vel.x).toBeGreaterThan(0);
  });
});
