/** SEEN_EYES (defense.ts seenQbEyes; experimental, off): a zone defender
 * reads the QB's look from what he sees of him. Off, every defender gets the
 * QB's internal read target. On, a defender facing the QB takes the receiver
 * the QB's perceived facing points at; one turned away from the QB gets no
 * read, whatever the QB's internal target is. */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function stage(flag: string) {
  vi.resetModules();
  vi.stubEnv('SEEN_EYES', flag);
  const { Rng } = await import('../src/core/rng.js');
  const { generateTeam, pickDefense, pickOffense } = await import('../src/league/team.js');
  const { PASS_BY_ID } = await import('../src/playbook/concepts.js');
  const { COVERAGE_BY_ID, FRONT_BY_ID } = await import('../src/playbook/defense.js');
  const { FORMATION_BY_ID } = await import('../src/playbook/formations.js');
  const { seenQbEyes } = await import('../src/sim/behaviors/defense.js');
  const { PlaySim } = await import('../src/sim/playsim.js');
  const offense = generateTeam(new Rng(31), 'Eyes offense', 'EYO', { strength: .55 });
  const defense = generateTeam(new Rng(32), 'Eyes defense', 'EYD', { strength: .55 });
  const sim = new PlaySim({ offense: pickOffense(offense, '11'), defense: pickDefense(defense, 'nickel'),
    offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: false, kind: 'pass', pass: PASS_BY_ID.four_verts, label: 'eyes' },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'eyes' },
    los: 40, ballY: 26, firstDownX: 50, seed: 3 });
  const qb = sim.qb, a = sim.defense.find(d => d.slot.startsWith('LB'))!;
  const eligible = sim.offense.filter(o => o !== qb && !['LT', 'LG', 'C', 'RG', 'RT'].includes(o.slot));
  // Receivers fanned out 10 yd downfield; the QB looks at the far-left one, but his read target is the far-right one.
  eligible.forEach((o, i) => { o.body.pos = { x: sim.los + 10, y: 6 + i * 10 }; o.body.vel = { x: 0, y: 0 }; });
  const looked = eligible[0], target = eligible[eligible.length - 1];
  qb.body.pos = { x: sim.los - 5, y: 26 }; qb.body.vel = { x: 0, y: 0 };
  qb.body.facing = Math.atan2(looked.pos.y - qb.pos.y, looked.pos.x - qb.pos.x);
  sim.qbEyes = target;
  a.body.pos = { x: sim.los + 6, y: 26 }; a.body.vel = { x: 0, y: 0 };
  const see = sim.see.bind(sim);
  sim.see = (who, t, delay) => ({ ...see(who, t, delay), pos: { ...t.pos }, vel: { ...t.vel }, facing: t.body.facing });
  return { sim, a, looked, target, seenQbEyes, faceQB: () => { a.body.facing = Math.PI; }, faceAway: () => { a.body.facing = 0; } };
}

describe('SEEN_EYES: a zone defender reads the QB from what he sees', () => {
  it('off: every defender gets the QB internal read target', async () => {
    const f = await stage('0');
    f.faceAway();
    expect(f.seenQbEyes(f.a, f.sim)).toBe(f.target);
  });
  it('on: facing the QB, he reads where the QB is facing', async () => {
    const f = await stage('1');
    f.faceQB();
    expect(f.seenQbEyes(f.a, f.sim)).toBe(f.looked);
  });
  it('on: turned away from the QB, he has no read', async () => {
    const f = await stage('1');
    f.faceAway();
    expect(f.seenQbEyes(f.a, f.sim)).toBeNull();
  });
});
