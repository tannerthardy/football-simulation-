import { describe, expect, it } from 'vitest';
import type { PlayLog, PlayPlan } from '../src/game/game.js';
import { packReplayPlay, replayConcept, replayOptions } from '../scripts/replay-data.js';

const play = (overrides: Partial<PlayLog> = {}): PlayLog => ({
  index: 4, quarter: 1, clock: 810, offense: 'IRN', down: 1, distance: 10, yardline: 25,
  call: 'Gun Doubles Inside Zone Weak', defense: 'Over Cover 3', text: 'Rush for 4.2 yards',
  yards: 4.2, score: { home: 0, away: 0 }, kind: 'run',
  plan: { concept: 'insideZone' } as PlayPlan,
  ...overrides,
});

describe('replay export', () => {
  it('keeps numeric flag values separate from the seed regardless of argument order', () => {
    expect(replayOptions(['--games', '6', '--out', 'out/film.html', '19', '--doc']))
      .toEqual({ seed: 19, games: 6, out: 'out/film.html', document: true });
    expect(replayOptions([])).toEqual({ seed: 7, games: 1, out: 'out/replay.html', document: false });
  });

  it.each([['--games'], ['--out', '--doc'], ['--games', '0'], ['--games', '1.5'], ['--games', '51'], ['--games', 'NaN'], ['NaN'], ['-1'], ['4294967295', '--games', '2'], ['7', '8'], ['--unknown']])('rejects invalid replay arguments %j', (...args) => {
    expect(() => replayOptions(args)).toThrow();
  });

  it('groups run directions together and uses the actual post-audible plan', () => {
    expect(replayConcept(play())).toEqual({ id: 'insideZone', name: 'Inside Zone', family: 'zone' });
    const audible = play({ call: 'Gun Doubles Mesh (checked from Inside Zone)', kind: 'pass', plan: { concept: 'mesh' } as PlayPlan });
    expect(replayConcept(audible)).toEqual({ id: 'mesh', name: 'Mesh', family: 'dropback' });
    expect(replayConcept(play({ plan: { concept: 'duo' } as PlayPlan })).family).toBe('gap');
    expect(replayConcept(play({ kind: 'pass', plan: { concept: 'future_pass' } as PlayPlan })).family).toBe('other');
  });

  it('marks nullified film explicitly without treating wiped-out outcomes as official highlights', () => {
    const p = packReplayPlay(play({ nullified: true, outcome: 'touchdown', firstDown: false, yards: -10 }), 2);
    expect(p).toMatchObject({ game: 2, index: 4, nullified: true, yds: -10, flags: { td: false, big: false, stuff: false } });
    expect(packReplayPlay(play({ yards: -0.2 }), 0).flags.stuff).toBe(true);
    expect(packReplayPlay(play({ kind: 'pass', yards: -3 }), 0).flags.stuff).toBe(false);
  });

  it('preserves frame time, roster identity, carrier posture and inspection events across games', () => {
    const p = packReplayPlay(play({ replay: {
      los: 35, firstDownX: 45, flip: false,
      players: [{ team: 'O', slot: 'RB', name: 'Example Runner', jersey: 28, pos: 'RB' }],
      frames: [
        { t: -0.5, agents: [31.24, 26.67, 0.7], ball: [33, 26, 1.1], carrier: 0 },
        { t: 0, agents: [31.31, 26.74, 0.9], ball: [34, 26, 1], carrier: 0, carrierPosture: [0.8, 0.9] },
      ],
      events: [{ t: 0, type: 'carrier_contact' }, { t: 0, type: 'block_exchange' }],
    } }), 3);
    expect('frames' in p).toBe(true);
    if (!('frames' in p)) throw new Error('Missing filmed replay');
    expect(p.game).toBe(3);
    expect(p.roster[0]).toEqual(['O', 'RB', 'Example Runner', 28]);
    expect(p.frames.t).toEqual([-0.5, 0]);
    expect(p.frames.p).toEqual([312, 267, 7, 313, 267, 9]);
    expect(p.frames.s).toEqual([0, 0, 8, 9]);
    expect(p.ev).toEqual([[0, 'carrier_contact'], [0, 'block_exchange']]);
  });

  it('does not offer an unfilmed log entry or one-frame recording as a clip', () => {
    expect(packReplayPlay(play(), 0)).not.toHaveProperty('frames');
    expect(packReplayPlay(play({ replay: {
      los: 35, firstDownX: 45, flip: false, players: [], events: [],
      frames: [{ t: 0, agents: [], ball: [35, 26, 1], carrier: -1 }],
    } }), 0)).not.toHaveProperty('frames');
  });
});
