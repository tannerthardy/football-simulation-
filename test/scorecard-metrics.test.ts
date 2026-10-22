import { describe, expect, it } from 'vitest';
import { METRICS, SPLITS, evaluate, interval, status } from '../scripts/scorecard/metrics.js';
import { gameSpecs, type GameRec, type PlayRec } from '../scripts/scorecard/records.js';

const play = (o: Partial<PlayRec>): PlayRec => ({
  kind: 'run', down: 1, dist: 10, yl: 25, quarter: 1, concept: 'iz', coverage: 'cover3', family: 'cover3',
  formation: 'gun', personnel: '11', playAction: false, yards: 0, att: false, comp: false, sack: false,
  int: false, td: false, scramble: false, throwaway: false, missed: 0, broken: 0, firstDown: false, ...o,
});
const game = (i: number, plays: PlayRec[], o: Partial<GameRec> = {}): GameRec => ({
  game: i, league: 0, seed: 100 + i, home: 'A', away: 'B', points: 40, totalYds: 700, penalties: 6, third: 10,
  thirdConv: 4, fga: 2, fgm: 2, xpa: 4, xpm: 4, fumLost: 1, punts: 8, tie: false, ms: 1000, plays, probe: {}, ...o,
});
const m = (id: string) => METRICS.find((x) => x.id === id)!;

describe('scorecard metrics', () => {
  it('computes ratios of sums over plays and games', () => {
    const g = [game(0, [play({ yards: 4 }), play({ yards: 10 }), play({ kind: 'pass', att: true, comp: true, yards: 8 })])];
    expect(evaluate(m('ypc'), g).value).toBe(7);
    expect(evaluate(m('run10'), g).value).toBe(50);
    expect(evaluate(m('points'), g).value).toBe(20);
    expect(evaluate(m('plays'), g).value).toBe(1.5);
  });

  it('evaluates a split by filtering plays', () => {
    const g = [game(0, [play({ concept: 'iz', yards: 2 }), play({ concept: 'power', yards: 12 })])];
    const concept = SPLITS.find((s) => s.id === 'concept')!;
    expect(evaluate(m('ypc'), g, (p) => concept.key(p) === 'power').value).toBe(12);
  });

  it('reads a band as a diagnosis label only', () => {
    expect(status(m('ypc'), 4.3)).toBe('OK');
    expect(status(m('ypc'), 9)).toBe('HIGH');
  });

  it('gives a zero-width paired interval when nothing changed', () => {
    const gs = Array.from({ length: 8 }, (_, i) => game(i, [play({ yards: i })]));
    expect(interval(m('ypc'), gs, gs)).toEqual([0, 0]);
    const [lo, hi] = interval(m('ypc'), gs);
    expect(lo).toBeLessThan(hi);
  });

  it('builds the same game list for every arm and worker', () => {
    expect(gameSpecs(7, 12, 2)).toEqual(gameSpecs(7, 12, 2));
    expect(gameSpecs(7, 12, 2).map((s) => s.league)).toEqual([0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1]);
  });
});
