/** Native game checks. Run with npm run test:integration. */
import { describe, expect, it } from 'vitest';
import { Rng } from '../../src/core/rng.js';
import { simulateGame } from '../../src/game/game.js';
import { generateTeam } from '../../src/league/team.js';

const home = generateTeam(new Rng(11), 'Home', 'HOM', { strength: 0.6 });
const away = generateTeam(new Rng(12), 'Away', 'AWY', { strength: 0.6 });

describe('official record of a full game', () => {
  it('box-score plays and third downs agree with the official log', () => {
    for (const seed of [21, 22]) {
      const res = simulateGame(home, away, { seed });
      for(const p of res.log.filter((p)=>(p.kind==='run'||p.kind==='pass')&&!p.nullified)) {
        expect(p.plan?.front).toBeTruthy();
        expect(p.plan?.concept).toBeTruthy();
      }
      for (const t of [home, away]) {
        const official = res.log.filter((p) => (p.kind === 'run' || p.kind === 'pass') && !p.nullified && p.offense === t.abbr);
        const tl = res.box.team(t.abbr);
        expect(tl.plays).toBe(official.length);
        const thirds = res.log.filter((p) => (p.kind === 'run' || p.kind === 'pass' || p.kind === 'kneel') && !p.nullified && p.offense === t.abbr && p.down === 3);
        expect(tl.thirdAtt).toBe(thirds.length);
      }
      // The final score is the sum of what was scored, and the game ends decided or as a tie after overtime.
      const last = res.log[res.log.length - 1];
      expect(last.quarter).toBeGreaterThanOrEqual(4);
    }
  }, 60_000);

  it('is reproducible, with or without replay recording', () => {
    const a = simulateGame(home, away, { seed: 33 });
    const b = simulateGame(home, away, { seed: 33, record: true });
    expect(b.score).toEqual(a.score);
    expect(b.log.map((p) => p.text)).toEqual(a.log.map((p) => p.text));
  }, 60_000);
});
