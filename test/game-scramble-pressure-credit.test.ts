import { describe, expect, it } from 'vitest';
import { restore, saved } from './helpers/saved-game-result-accounting.js';

describe('pressure credit survives a later scramble', () => {
  it.each(saved.pressureIds)('preserves the emitted defender in saved %s', id => {
    const { result, record, off, def } = restore(id);
    expect(result.stats).toMatchObject({ pressured: true, scramble: true });
    const before = structuredClone(result);
    const actor = result.stats.hurriedBy!;
    expect(actor).toBeTruthy();
    const box = record();
    expect(box.players.get(actor)).toMatchObject({ team: def.abbr, pressures: 1 });
    expect(box.players.get(result.stats.rusher!)).toMatchObject({ rushAtt: 1, rushYds: result.offenseYards });
    expect(box.team(off.abbr)).toMatchObject({ rushYds: result.offenseYards, passYds: 0, sacksAllowed: 0 });
    expect(result).toEqual(before);
  });

  it('retains ordinary G2-P038 pressure and sack credit exactly once', () => {
    const { result, record } = restore('G2-P038');
    expect(result.stats).toMatchObject({ pressured: true, sacked: true, scramble: false });
    expect(record().players.get(result.stats.hurriedBy!)).toMatchObject({ pressures: 1, sacks: 1 });
  });

  it('does not invent a pressure actor from an ordinary safety with no cue', () => {
    const { result, record } = restore('G2-P140');
    expect(result.stats.hurriedBy).toBeUndefined();
    expect([...record().players.values()].reduce((n,p) => n+p.pressures, 0)).toBe(0);
  });
});
