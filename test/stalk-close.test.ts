/** STALK_CLOSE (src/sim/behaviors/screen.ts; experimental, off): a receiver's stalk closes the cushion to a breakdown
 * point on his man's line to the catch and puts his hands on, instead of waiting at his alignment for the man to
 * come. On the now screen against the off-coverage calls the stalk engages his man before the play is over far more
 * often than off, and from the front or side, not from behind (a block from behind is a flag, not a block). */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function stalks(flag: string) {
  vi.resetModules();
  vi.stubEnv('STALK_CLOSE', flag); vi.stubEnv('SCREEN_QB', '1');
  const { CENTER_Y } = await import('../src/core/field.js');
  const { Rng } = await import('../src/core/rng.js');
  const { generateTeam, pickDefense, pickOffense } = await import('../src/league/team.js');
  const { SCREEN_BY_ID } = await import('../src/playbook/concepts.js');
  const { COVERAGE_BY_ID, FRONT_BY_ID } = await import('../src/playbook/defense.js');
  const { FORMATION_BY_ID } = await import('../src/playbook/formations.js');
  const { PlaySim } = await import('../src/sim/playsim.js');
  const offense = generateTeam(new Rng(41), 'O', 'O', { strength: .55 }), defense = generateTeam(new Rng(42), 'D', 'D', { strength: .55 });
  let plays = 0, engaged = 0, behind = 0;
  for (const cov of ['cover3', 'cover3_cloud', 'cover4']) for (let seed = 1; seed <= 4; seed++) {
    const formation = FORMATION_BY_ID.gun_doubles_11;
    const sim: any = new PlaySim({ offense: pickOffense(offense, formation.personnel), defense: pickDefense(defense, 'nickel'),
      offCall: { formation, flip: false, kind: 'pass', pass: SCREEN_BY_ID.wide_now_screen, label: 'now' },
      defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID[cov], pressure: null, label: cov },
      los: 35, ballY: CENTER_Y, firstDownX: 45, seed: 1000 * seed + 7 });
    if (sim.offCall.pass?.id !== 'wide_now_screen') continue;
    sim.tick();
    const b = sim.offense.find((a: any) => a.behavior?.kind === 'screen-block' && a.behavior.job === 'stalk');
    if (!b) continue;
    plays++;
    let got = false;
    while (sim.phase !== 'dead' && sim.t < 5 && !got) {
      sim.tick();
      const e = b.engagement;
      if (e) {
        got = true; engaged++;
        const d = e.defender === b ? e.blocker : e.defender;
        const rel = Math.atan2(b.pos.y - d.pos.y, b.pos.x - d.pos.x) - d.body.facing;
        if (Math.abs(Math.atan2(Math.sin(rel), Math.cos(rel))) >= (2 * Math.PI) / 3) behind++;
      }
    }
  }
  return { plays, engaged, behind };
}

describe('STALK_CLOSE', () => {
  it('the now screen\'s stalk engages his man far more often, from the front or side', async () => {
    const off = await stalks('0'), on = await stalks('1');
    expect(on.plays).toBeGreaterThan(8);
    expect(on.engaged / on.plays).toBeGreaterThan(off.engaged / Math.max(1, off.plays) + 0.3);
    expect(on.behind).toBeLessThanOrEqual(1);
  }, 120000);
});
