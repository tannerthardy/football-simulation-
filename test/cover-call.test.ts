/** COVER_CALL (playcaller.ts): the coverage call reads the corner/receiver
 * matchup against the league's norms, checks to the formation seen and
 * calls early downs at their own tracked shares. Off: unchanged. */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import type { DefensivePlayCall } from '../src/playbook/types.js';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function load(on: boolean) {
  vi.stubEnv('COVER_CALL', on ? '1' : '0');
  // The shell shown also reads the formation; this contract is the call's.
  vi.stubEnv('SHELL_SHOW', '0');
  vi.resetModules();
  const playcaller = await import('../src/game/playcaller.js');
  const team = await import('../src/league/team.js');
  const { FORMATION_BY_ID } = await import('../src/playbook/formations.js');
  const { Rng } = await import('../src/core/rng.js');
  /** First and 10 at midfield against 11 personnel, over many coordinators. */
  const calls = (formation: string, teams = 24, n = 60) => {
    const out: DefensivePlayCall[] = [];
    for (let i = 0; i < teams; i++) {
      const d = team.generateTeam(new Rng(100 + i), 'D', 'D'), o = team.generateTeam(new Rng(500 + i), 'O', 'O');
      const dc = new playcaller.DefensiveCoordinator(d, new Rng(7 + i)), players = team.pickOffense(o, '11');
      for (let k = 0; k < n; k++) out.push(dc.call({ down: 1, distance: 10, yardline: 50, quarter: 1, clock: 800, scoreDiff: 0, ballY: CENTER_Y, hurry: false },
        '11', o, players, FORMATION_BY_ID[formation]).call);
    }
    return out;
  };
  return { calls, playcaller, team, Rng };
}
const share = (cs: DefensivePlayCall[], fam: string) => cs.filter(c => (c.coverage.family ?? c.coverage.id) === fam).length / cs.length;

describe('the coverage call', () => {
  it('the league norms match the generator: an average matchup reads as even', async () => {
    const { playcaller, team, Rng } = await load(true);
    const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
    const cb: number[] = [], wr: number[] = [];
    for (let i = 0; i < 200; i++) {
      const d = team.generateTeam(new Rng(3000 + i), 'D', 'D'), o = team.generateTeam(new Rng(6000 + i), 'O', 'O');
      cb.push(avg(d.roster.filter(p => p.position === 'CB').map(p => p.ratings.manCoverage).sort((a, b) => b - a).slice(0, 2)));
      wr.push(avg(Object.values(team.pickOffense(o, '11')).filter(p => p?.position === 'WR').map(p => (p!.ratings.routeRunning + p!.ratings.releaseVsPress) / 2)));
    }
    expect(Math.abs(avg(cb) - playcaller.CB_NORM)).toBeLessThan(1.5);
    expect(Math.abs(avg(wr) - playcaller.WR_NORM['11']!)).toBeLessThan(1.5);
  });
  it('on: Cover 1 on first and 10 near its tracked early-down share (18%); off, the raw matchup overcalls it', async () => {
    const on = (await load(true)).calls('gun_doubles_11'), off = (await load(false)).calls('gun_doubles_11');
    expect(share(on, 'cover1')).toBeLessThan(.21);
    expect(share(off, 'cover1')).toBeGreaterThan(share(on, 'cover1') + .04);
  });
  it('on: under center the call leans to Cover 3, away from two-high; off, the formation changes nothing', async () => {
    const on = await load(true), off = await load(false);
    const gun = on.calls('gun_doubles_11'), uc = on.calls('ace_11');
    expect(share(uc, 'cover3')).toBeGreaterThan(share(gun, 'cover3') + .05);
    expect(share(uc, 'cover6')).toBeLessThan(share(gun, 'cover6'));
    expect(off.calls('ace_11', 4, 40)).toEqual(off.calls('gun_doubles_11', 4, 40));
  });
});
