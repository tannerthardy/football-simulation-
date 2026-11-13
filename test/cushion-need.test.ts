/** CUSHION_NEED (defense.ts ManCoverage.trackReceiver; experimental, off): a
 * linebacker in man on the back, 5 yd over him, hips not yet open. The back
 * releases short, angling to the flat: off, the backer keeps his alignment cushion and
 * does not come down; on, he keeps only what the back's vertical threat needs
 * and closes. A back climbing straight up the field still has the backer
 * giving ground at about his speed. */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function step(flag: string, vel: { x: number; y: number }) {
  vi.resetModules();
  vi.stubEnv('CUSHION_NEED', flag);
  const { Rng } = await import('../src/core/rng.js');
  const { generateTeam, pickDefense, pickOffense } = await import('../src/league/team.js');
  const { PASS_BY_ID } = await import('../src/playbook/concepts.js');
  const { COVERAGE_BY_ID, FRONT_BY_ID } = await import('../src/playbook/defense.js');
  const { FORMATION_BY_ID } = await import('../src/playbook/formations.js');
  const { ManCoverage } = await import('../src/sim/behaviors/defense.js');
  const { PlaySim } = await import('../src/sim/playsim.js');
  const offense = generateTeam(new Rng(31), 'Back offense', 'BKO', { strength: .55 });
  const defense = generateTeam(new Rng(32), 'Back defense', 'BKD', { strength: .55 });
  const sim = new PlaySim({ offense: pickOffense(offense, '11'), defense: pickDefense(defense, 'nickel'),
    offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: false, kind: 'pass', pass: PASS_BY_ID.four_verts, label: 'back release' },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover1,
      pressure: null, label: 'back release' }, los: 40, ballY: 26, firstDownX: 50, seed: 3 });
  const a = sim.defense.find(d => d.slot.startsWith('LB'))!, r = sim.slot('RB')!;
  // The back is 1 yd past the line; the backer is 5 yd over him, square, still.
  r.body.pos = { x: sim.los + 1, y: 26 }; r.body.vel = { ...vel };
  a.body.pos = { x: sim.los + 6, y: 26.5 }; a.body.vel = { x: 0, y: 0 }; a.body.facing = Math.PI;
  a.recog!.read = 'pass';
  const see = sim.see.bind(sim);
  sim.see = (who, target, delay) => target === r
    ? { pos: { ...r.pos }, vel: { ...r.vel }, facing: 0, stance: null, pose: 'up', carrying: false, age: .2 }
    : see(who, target, delay);
  sim.t = 1.2;
  const behavior = new ManCoverage(a, sim, r, false, 'B', 1, { lev: 'inside', initialPosition: { x: sim.los - 1, y: 26 } });
  behavior.update(a, sim); // observes the release
  return behavior.update(a, sim);
}

describe('CUSHION_NEED: a man backer keeps only the cushion the receiver threatens', () => {
  it('closes on a back releasing short instead of holding his alignment cushion', async () => {
    const flat = { x: 2, y: 2.5 };
    const off = await step('0', flat), on = await step('1', flat);
    expect(off.vel.x).toBeGreaterThan(-.5);
    expect(on.vel.x).toBeLessThan(off.vel.x - 1);
  });
  it('still gives ground on a back climbing straight up the field', async () => {
    const up = { x: 7, y: 0 };
    const off = await step('0', up), on = await step('1', up);
    expect(off.vel.x).toBeGreaterThan(5);
    expect(on.vel.x).toBeGreaterThan(off.vel.x - .5);
  });
});
