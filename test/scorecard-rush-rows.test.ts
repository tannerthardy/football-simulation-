import { describe, expect, it } from 'vitest';
import { METRICS, RUN_MIX, evaluate } from '../scripts/scorecard/metrics.js';
import type { GameRec, PlayRec } from '../scripts/scorecard/records.js';

const play = (o: Partial<PlayRec>): PlayRec => ({ kind: 'run', down: 1, dist: 10, yl: 30, quarter: 1, concept: 'insideZone', coverage: 'cover3', family: 'cover3',
  formation: 'x', personnel: '11', playAction: false, yards: 4, att: false, comp: false, sack: false, int: false, td: false, scramble: false,
  throwaway: false, missed: 0, broken: 0, firstDown: false, ...o });
const game = (plays: PlayRec[]): GameRec => ({ game: 0, league: 0, seed: 0, home: 'a', away: 'b', points: 0, totalYds: 0, penalties: 0, third: 0, thirdConv: 0,
  fga: 0, fgm: 0, xpa: 0, xpm: 0, fumLost: 0, punts: 0, tie: false, ms: 1, plays, probe: {} });
const m = (id: string) => [...METRICS, ...RUN_MIX].find(x => x.id === id)!;

// Runs of 2, 6 and 52 yd, a scramble for 9 and a sack: the card's row is the mean of the three runs only.
const g = game([play({ yards: 2 }), play({ yards: 6, down: 2, dist: 3 }), play({ yards: 52, down: 3, dist: 12, yl: 85 }),
  play({ kind: 'pass', scramble: true, yards: 9 }), play({ kind: 'pass', sack: true, yards: -7 })]);

describe('rush row split', () => {
  it('counts designed runs only in the card row, uncapped', () => {
    expect(evaluate(m('ypc'), [g]).value).toBeCloseTo(20, 9);
  });
  it('splits the mean into the part capped at 20 yd and the tail beyond it', () => {
    expect(evaluate(m('ypc20'), [g]).value).toBeCloseTo((2 + 6 + 20) / 3, 9);
    expect(evaluate(m('ypcTail'), [g]).value).toBeCloseTo(32 / 3, 9);
    expect(evaluate(m('ypc20'), [g]).value + evaluate(m('ypcTail'), [g]).value).toBeCloseTo(evaluate(m('ypc'), [g]).value, 9);
  });
  it('reports scramble yards apart, and a sack is not a scramble', () => {
    expect(evaluate(m('scrYds'), [g])).toEqual({ value: 9, n: 1 });
  });
  it('reports the run mix by situation', () => {
    expect(evaluate(m('mix.runShare'), [g]).value).toBeCloseTo(60, 9);
    expect(evaluate(m('mix.runShareDown3'), [g]).value).toBeCloseTo(100, 9);
    expect(evaluate(m('mix.down1'), [g]).value).toBeCloseTo(100 / 3, 9);
    expect(evaluate(m('mix.dist.short (1-3)'), [g]).value).toBeCloseTo(100 / 3, 9);
    expect(evaluate(m('mix.dist.long (8+)'), [g]).value).toBeCloseTo(200 / 3, 9);
    expect(evaluate(m('mix.zone.red zone'), [g]).value).toBeCloseTo(100 / 3, 9);
  });
  it('gives the shares of runs in each bucket a total of one', () => {
    const sum = (ids: string[]) => ids.reduce((a, id) => a + evaluate(m(id), [g]).value, 0);
    expect(sum(['mix.down1', 'mix.down2', 'mix.down3'])).toBeCloseTo(100, 9);
    expect(sum(RUN_MIX.filter(x => x.id.startsWith('mix.dist.')).map(x => x.id))).toBeCloseTo(100, 9);
    expect(sum(RUN_MIX.filter(x => x.id.startsWith('mix.zone.')).map(x => x.id))).toBeCloseTo(100, 9);
  });
});
