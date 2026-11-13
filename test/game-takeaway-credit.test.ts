import { describe, expect, it } from 'vitest';
import { restore } from './helpers/saved-game-result-accounting.js';

describe('official team takeaways from saved results', () => {
  it('counts G1-P156 once despite the defensive TD and returner own recovery', () => {
    const { result, record, off, def } = restore('G1-P156');
    expect(result.score).toEqual({ team: 'D', kind: 'TD' });
    expect(result.segments.map(s => [s.team, s.how, s.end])).toEqual([
      ['O', 'snap', 'pass'], ['D', 'interception', 'fumble'], ['D', 'recovery', 'dead'],
    ]);
    const box = record();
    expect(box.team(off.abbr).turnovers).toBe(1);
    expect(box.team(def.abbr).turnovers).toBe(0);
    expect(box.players.get('A1-QB1')!.int).toBe(1);
    expect(box.players.get('H1-LB1')!.defInt).toBe(1);
  });

  it('retains ordinary G1-P141 interception and offensive-return-tackler credit', () => {
    const { result, record, off } = restore('G1-P141');
    expect(result.score).toBeNull();
    const box = record();
    expect(box.team(off.abbr).turnovers).toBe(1);
    expect(box.players.get('H1-TE2')!.team).toBe(off.abbr);
    expect(box.players.get('H1-TE2')!.tackles).toBe(1);
  });

  it('does not turn an ordinary offensive scoring catch into a giveaway', () => {
    const { result, record, off, def } = restore('G1-P137');
    expect(result.score).toEqual({ team: 'O', kind: 'TD' });
    const box = record();
    expect(box.team(off.abbr).turnovers).toBe(0);
    expect(box.team(def.abbr).turnovers).toBe(0);
    expect(box.players.get(result.stats.receiver!)!.recTD).toBe(1);
  });
});
