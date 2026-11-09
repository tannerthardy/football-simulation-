/** BACKER_TAKEON (defense.ts runFit; experimental, off): an unblocked backer who
 * sees a blocker climbing at him breaks down before contact. Reproducer: 2-Man
 * vs outside zone (Coverage's grid, seed 1909). The H-back climbs onto the Sam
 * at about 5.5 yd/s closing; off, the Sam is knocked down at 1.4 s (the hit
 * plus the engagement's drive past his capture limit, Flex). On, he meets the
 * H settled and stays on his feet. */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function snap(flag: string) {
  vi.stubEnv('BACKER_TAKEON', flag); vi.resetModules();
  const { PlaySim } = await import('../src/sim/playsim.js');
  const { Rng } = await import('../src/core/rng.js');
  const { generateTeam, pickOffense, pickDefense } = await import('../src/league/team.js');
  const { RUN_BY_ID } = await import('../src/playbook/concepts.js');
  const { FORMATION_BY_ID } = await import('../src/playbook/formations.js');
  const { COVERAGE_BY_ID, FRONT_BY_ID } = await import('../src/playbook/defense.js');
  const o = generateTeam(new Rng(102), 'O', 'O', { strength: .55 }), d = generateTeam(new Rng(202), 'D', 'D', { strength: .55 });
  const formation = FORMATION_BY_ID.ace_12;
  const sim: any = new PlaySim({ offense: pickOffense(o, formation.personnel), defense: pickDefense(d, 'base43'),
    offCall: { formation, flip: false, kind: 'run', run: RUN_BY_ID.oz_strong, label: 'oz' } as any,
    defCall: { personnel: 'base43', front: FRONT_BY_ID.under, coverage: COVERAGE_BY_ID.cover2man, pressure: null, label: '2man' } as any,
    los: 35, ballY: 23.6, firstDownX: 55, seed: 1909, audibles: false } as any);
  const lb = sim.defense.find((a: any) => a.slot === 'LB_S'), h = sim.offense.find((a: any) => a.slot === 'H');
  let fellAt = -1, intoH = 0;
  while (sim.t < 2.1 && !sim.outcome) {
    sim.tick();
    if (fellAt < 0 && lb.body.support?.state !== 'up') fellAt = sim.t;
    const dx = h.pos.x - lb.pos.x, dy = h.pos.y - lb.pos.y, dist = Math.hypot(dx, dy);
    if (dist < 1.5) intoH = Math.max(intoH, (lb.vel.x * dx + lb.vel.y * dy) / dist);
  }
  return { fellAt, intoH };
}

describe('BACKER_TAKEON', () => {
  it('off: the climbing H-back knocks the Sam down; on: he breaks down into the block and stays on his feet', async () => {
    const off = await snap('0'), on = await snap('1');
    expect(off.fellAt).toBeGreaterThan(0); expect(off.fellAt).toBeLessThan(2);
    expect(on.fellAt).toBe(-1);
    // He meets the block at a fitting pace: the brakes start from his picture
    // about a second before contact, so he arrives slower, not stopped.
    expect(on.intoH).toBeLessThan(off.intoH - 0.4);
  });
});
