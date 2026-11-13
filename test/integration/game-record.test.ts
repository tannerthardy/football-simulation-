/** Native game checks. Run with npm run test:integration. */
import { beforeAll, describe, expect, it } from 'vitest';
import { Rng } from '../../src/core/rng.js';
import { simulateGame } from '../../src/game/game.js';
import { generateTeam } from '../../src/league/team.js';

const home = generateTeam(new Rng(11), 'Home', 'HOM', { strength: 0.6 });
const away = generateTeam(new Rng(12), 'Away', 'AWY', { strength: 0.6 });

describe('official record of a full game', () => {
  // Each native game gets the existing 60-second budget. Bundling two games
  // into one test made a valid pair exceed that deadline in cloud runs.
  it.each([21, 22])('box-score plays and third downs agree with the official log, seed %s', async seed => {
    try {
    const res = simulateGame(home, away, { seed });
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
    } finally {
      // Yield even if an assertion fails; two event-loop turns let the worker
      // flush reports before the next CPU-bound native game starts.
      await new Promise<void>(resolve => setImmediate(resolve));
      await new Promise<void>(resolve => setImmediate(resolve));
    }
  // A full game takes 30-45 s alone; under test:all's three workers seed 21 passed 60 s twice on 2026-11-10.
  }, 180_000);

  describe('replay recording preserves the same full game', () => {
    let plain: ReturnType<typeof simulateGame>;
    beforeAll(async () => {
      plain = simulateGame(home, away, { seed: 33 });
      await new Promise<void>(resolve => setImmediate(resolve));
      await new Promise<void>(resolve => setImmediate(resolve));
    }, 60_000);

    it('is reproducible, with or without replay recording', async () => {
      try {
      const recorded = simulateGame(home, away, { seed: 33, record: true });
      expect(recorded.score).toEqual(plain.score);
      expect(recorded.log.map((p) => p.text)).toEqual(plain.log.map((p) => p.text));
      } finally {
        await new Promise<void>(resolve => setImmediate(resolve));
        await new Promise<void>(resolve => setImmediate(resolve));
      }
    }, 60_000);
  });
});
