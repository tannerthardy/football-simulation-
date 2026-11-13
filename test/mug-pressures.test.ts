/** MUG_PRESSURES (playcaller.ts package pick, defense.ts catalog; experimental,
 * off): a call that mugs backers in the A gaps also says who of them comes.
 * Off: no mug package is ever called. On: mug packages appear only on mug
 * calls, a double mug in nickel is played from the Even, and the double-mug
 * bail share sits near the 2022 rate (no mugger rushes on 42%). */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { HASH_LEFT_Y } from '../src/core/field.js';
import type { DefensivePlayCall } from '../src/playbook/types.js';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function calls(flags: Record<string, string>, n = 3000) {
  for (const [k, v] of Object.entries(flags)) vi.stubEnv(k, v);
  vi.stubEnv('MUG_CALLS', '1'); vi.resetModules();
  const playcaller = await import('../src/game/playcaller.js');
  const team = await import('../src/league/team.js');
  const { Rng } = await import('../src/core/rng.js');
  const defTeam = team.generateTeam(new Rng(3), 'D', 'D', { defScheme: '4-3' }), offTeam = team.generateTeam(new Rng(4), 'O', 'O');
  const dc = new playcaller.DefensiveCoordinator(defTeam, new Rng(9)); const players = team.pickOffense(offTeam, '11');
  return Array.from({ length: n }, () => dc.call({ down: 3, distance: 8, yardline: 40, quarter: 1, clock: 600, scoreDiff: 0, ballY: HASH_LEFT_Y, hurry: false }, '11', offTeam, players).call as DefensivePlayCall);
}
const isMugPkg = (c: DefensivePlayCall) => !!c.pressure?.id.startsWith('mug_');

describe('MUG_PRESSURES', () => {
  it('off: no mug package is called', async () => {
    const cs = await calls({ MUG_PRESSURES: '0' });
    expect(cs.some((c) => c.mug)).toBe(true);
    expect(cs.filter(isMugPkg)).toHaveLength(0);
  });

  it('on: mug packages only on mug calls; a mug call carries a mug package or bails', async () => {
    const cs = await calls({ MUG_PRESSURES: '1' });
    expect(cs.filter((c) => !c.mug && isMugPkg(c))).toHaveLength(0);
    const mugs = cs.filter((c) => c.mug);
    expect(mugs.length).toBeGreaterThan(100);
    for (const c of mugs) expect(c.pressure === null || isMugPkg(c)).toBe(true);
    expect(mugs.filter((c) => c.mug === 2 && c.personnel === 'nickel').every((c) => c.front.id === 'even')).toBe(true);
  });

  it('on: the nickel double-mug bail share is near the 2022 rate', async () => {
    const dbl = (await calls({ MUG_PRESSURES: '1' }, 6000)).filter((c) => c.mug === 2 && c.personnel === 'nickel');
    expect(dbl.length).toBeGreaterThan(60);
    const bail = dbl.filter((c) => !c.pressure).length / dbl.length;
    expect(bail).toBeGreaterThan(.3); expect(bail).toBeLessThan(.65);
    expect(dbl.some((c) => c.pressure?.id === 'mug_both')).toBe(true);
  });
});
