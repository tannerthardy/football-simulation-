/** SHORT_PACKAGE (playcaller.ts DefensiveCoordinator.call, alignment.ts Bear):
 * a short-yardage package answers the offense's heavy package anywhere on
 * the field (goal-line personnel and the Bear at 2 yd or less vs 13, 21 or 22;
 * vs 12 at a yard or less), and the Bear's Sam is on the line outside the
 * attached end. Off: the package only inside the 2-yard line. */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function calls(on: boolean, personnel: '22' | '12' | '11', distance: number, yardline = 45, n = 30) {
  vi.stubEnv('SHORT_PACKAGE', on ? '1' : '0');
  vi.resetModules();
  const { Rng } = await import('../src/core/rng.js');
  const { generateTeam, pickOffense } = await import('../src/league/team.js');
  const { DefensiveCoordinator } = await import('../src/game/playcaller.js');
  const team = generateTeam(new Rng(5), 'ONE', 'ONE'), offense = generateTeam(new Rng(6), 'OFF', 'OFF');
  const dc = new DefensiveCoordinator(team, new Rng(7));
  const s = { down: 3, distance, yardline, quarter: 1, clock: 900, scoreDiff: 0, ballY: CENTER_Y, hurry: false };
  return Array.from({ length: n }, () => dc.call(s, personnel, offense, pickOffense(offense, personnel)).call);
}

describe('the short-yardage package answers a heavy package', () => {
  it('off: at midfield a heavy package still meets base personnel', async () => {
    expect((await calls(false, '22', 1)).some(c => c.personnel === 'goalline')).toBe(false);
  });
  it('on: 22 personnel at a yard to go meets goal-line personnel and the Bear', async () => {
    const all = await calls(true, '22', 1);
    expect(all.every(c => c.personnel === 'goalline' && c.front.id === 'bear')).toBe(true);
  });
  it('on: 12 at a yard does, at 2 yd it does not; 11 never does', async () => {
    expect((await calls(true, '12', 1)).every(c => c.personnel === 'goalline')).toBe(true);
    expect((await calls(true, '12', 2)).some(c => c.personnel === 'goalline')).toBe(false);
    expect((await calls(true, '11', 1)).some(c => c.personnel === 'goalline')).toBe(false);
  });
  it('on: the Bear\'s Sam is on the line', async () => {
    const [call] = await calls(true, '22', 1, 45, 1);
    const { alignDefense, alignOffense } = await import('../src/playbook/alignment.js');
    const { FORMATION_BY_ID } = await import('../src/playbook/formations.js');
    const { DEF_PERSONNEL } = await import('../src/playbook/types.js');
    const off = alignOffense(FORMATION_BY_ID.i_jumbo_22, false, 40, CENTER_Y);
    const def = alignDefense(call, off, Object.keys(DEF_PERSONNEL.goalline) as Parameters<typeof alignDefense>[2]);
    expect(def.spots.LB_S!.pos.x - 40).toBeLessThan(2);
  });
});
