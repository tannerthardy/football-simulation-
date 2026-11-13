/** PA_CALL (game/playcaller.ts; experimental, off): play action as a tag on the call at the NFL's rate for the
 * situation and the QB's alignment (docs/reviews/2026-11-12-pa-call.md). Over many calls of one team:
 * - off, no call is tagged (play action is only the three PA concepts);
 * - on, the share of tagged drop-backs by alignment follows the table: under center far above the gun, the gun high on
 *   1st down and low on 3rd and long; screens are never tagged;
 * - a tagged call is the same concept with the fake and the PA drop. */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function calls(flag: string, down: number, distance: number, n = 2500) {
  vi.resetModules();
  vi.stubEnv('PA_CALL', flag);
  const { OffensiveCoordinator } = await import('../src/game/playcaller.js');
  const { generateTeam } = await import('../src/league/team.js');
  const { Rng } = await import('../src/core/rng.js');
  const team = generateTeam(new Rng(7), 'Ironmen', 'IRN', { strength: 0.55 }), defense = generateTeam(new Rng(8), 'Comets', 'COM', { strength: 0.55 });
  const oc = new OffensiveCoordinator(team, new Rng(11));
  const out: { gun: boolean; pa: boolean; family: string; id: string; drop: string; fake?: string }[] = [];
  for (let i = 0; i < n; i++) {
    const c = oc.call({ down, distance, yardline: 40, quarter: 2, clock: 600, scoreDiff: 0, ballY: 26.6, hurry: false }, defense);
    if (c.kind !== 'pass' || !c.pass) continue;
    out.push({ gun: c.formation.qb === 'gun', pa: c.pass.family === 'playaction', family: c.pass.family, id: c.pass.id, drop: c.pass.drop, fake: c.pass.fake });
  }
  return out;
}
const share = (R: { pa: boolean }[]) => R.filter((r) => r.pa).length / Math.max(1, R.length);

describe('PA_CALL', () => {
  it('off, play action is only the PA concepts; on, it follows the situation and the alignment', async () => {
    const off = await calls('0', 1, 10), on1 = await calls('1', 1, 10), on3 = await calls('1', 3, 9);
    expect(off.some((r) => r.id.endsWith('+pa'))).toBe(false);
    const gun1 = on1.filter((r) => r.gun), under1 = on1.filter((r) => !r.gun);
    expect(under1.length).toBeGreaterThan(100);
    expect(share(under1)).toBeGreaterThan(0.5);
    expect(share(gun1)).toBeGreaterThan(0.15);
    expect(share(gun1)).toBeLessThan(share(under1) - 0.25);
    expect(share(on3.filter((r) => r.gun))).toBeLessThan(0.08);
    expect(on1.filter((r) => r.family === 'screen' || r.id.includes('screen')).every((r) => !r.id.endsWith('+pa'))).toBe(true);
  }, 60000);
  it('a tagged call is the same concept with the fake and the PA drop', async () => {
    const on = await calls('1', 1, 10, 600);
    const tagged = on.filter((r) => r.id.endsWith('+pa'));
    expect(tagged.length).toBeGreaterThan(50);
    for (const r of tagged) { expect(r.drop).toBe('pa'); expect(r.fake).toBeTruthy(); expect(r.family).toBe('playaction'); }
  }, 60000);
});
