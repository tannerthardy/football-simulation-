/** Native game checks. Run with npm run test:integration. */
import { beforeAll, describe, expect, it } from 'vitest';
import { Rng } from '../../src/core/rng.js';
import { Game } from '../../src/game/game.js';
import { generateTeam } from '../../src/league/team.js';

const home = generateTeam(new Rng(11), 'Home', 'HOM', { strength: 0.6 });
const away = generateTeam(new Rng(12), 'Away', 'AWY', { strength: 0.6 });

/** Same kickoff/step sequence as Game.play(), with one bounded setup per period.
 * A full native game can exceed 60 s on a contended worker. Keep that limit on
 * each period, rather than increasing it or shortening the game/its assertions.
 */
function fullGame(seed: number, record = false): () => ReturnType<Game['result']> {
  let game: Game;
  beforeAll(() => {
    game = new Game(home, away, { seed, record });
    game.kickoffToStart();
  });
  // Regular-season games have four quarters and at most one overtime period.
  for (let period = 1; period <= 5; period++) {
    beforeAll(async () => {
      while (!game.state.over && game.state.quarter === period) game.step();
      await new Promise<void>(resolve => setImmediate(resolve));
    }, 60_000);
  }
  return () => {
    expect(game.state.over).toBe(true);
    return game.result();
  };
}

describe('official record of a full game', () => {
  describe.each([21, 22])('seed %s', seed => {
    const result = fullGame(seed);
    it('box-score plays and third downs agree with the official log', () => {
      const res = result();
      for(const p of res.log.filter((p)=>(p.kind==='run'||p.kind==='pass')&&(p.officialCredit?.playCharged ?? !p.nullified))) {
        expect(p.plan?.front).toBeTruthy();
        expect(p.plan?.concept).toBeTruthy();
      }
      for (const t of [home, away]) {
        const official = res.log.filter((p) => (p.kind === 'run' || p.kind === 'pass') && (p.officialCredit?.playCharged ?? !p.nullified) && p.offense === t.abbr);
        const tl = res.box.team(t.abbr);
        expect(tl.plays).toBe(official.length);
        const thirds = res.log.filter((p) => (p.kind === 'run' || p.kind === 'pass' || p.kind === 'kneel') && (p.officialCredit?.downAttempt ?? !p.nullified) && p.offense === t.abbr && p.down === 3);
        expect(tl.thirdAtt).toBe(thirds.length);
      }
      // The final score is the sum of what was scored, and the game ends decided or as a tie after overtime.
      const last = res.log[res.log.length - 1];
      expect(last.quarter).toBeGreaterThanOrEqual(4);
    });
  });

  describe('replay recording preserves the same full game', () => {
    const plainResult = fullGame(33);
    const recordedResult = fullGame(33, true);

    it('is reproducible, with or without replay recording', () => {
      const plain = plainResult(), recorded = recordedResult();
      expect(recorded.score).toEqual(plain.score);
      expect(recorded.log.map((p) => p.text)).toEqual(plain.log.map((p) => p.text));
    });
  });
});
