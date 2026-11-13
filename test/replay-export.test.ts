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
      .toEqual({ seed: 19, games: 6, out: 'out/film.html', document: true, telemetry: 'light', runOnly: false });
    expect(replayOptions([])).toEqual({ seed: 7, games: 1, out: 'out/replay.html', document: false, telemetry: 'light', runOnly: false });
    expect(replayOptions(['--telemetry', 'full']).telemetry).toBe('full');
    expect(replayOptions(['11', '--games', '2', '--run-only']).runOnly).toBe(true);
  });

  it.each([['--games'], ['--out', '--doc'], ['--telemetry'], ['--telemetry', 'unknown'], ['--games', '0'], ['--games', '1.5'], ['--games', '51'], ['--games', 'NaN'], ['NaN'], ['-1'], ['4294967295', '--games', '2'], ['7', '8'], ['--unknown']])('rejects invalid replay arguments %j', (...args) => {
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
    expect(p.id).toBe('G4-P005');
    expect(packReplayPlay(play(), 2).id).toBe('G3-P005');
    expect(p.roster[0]).toEqual(['O', 'RB', 'Example Runner', 28]);
    expect(p.frames.t).toEqual([-0.5, 0]);
    // Hundredths: tenths at 10 Hz alias a slow mover into stop-and-go steps.
    expect(p.frames.scale).toBe(100);
    expect(p.frames.p).toEqual([3124, 2667, 70, 3131, 2674, 90]);
    expect(p.frames.s).toEqual([0, 0, 80, 90]);
    expect(p.ev).toEqual([[0, 'carrier_contact'], [0, 'block_exchange']]);
  });

  it('counts attached geometry as pressure only before release and apart from QB perception', () => {
    const packed = (nearAt: number, throwAt: number) => packReplayPlay(play({ kind: 'pass', replay: {
      los: 40, firstDownX: 50, flip: false,
      players: [{ team: 'O', slot: 'QB', name: 'Quarterback', jersey: 1, pos: 'QB' }, { team: 'D', slot: 'DE_W', name: 'Rusher', jersey: 97, pos: 'DE' }],
      frames: [{ t: 0.5, agents: [33, 26, 0, 38, 26, 0], ball: [33, 26, 2], carrier: 0 },
        { t: nearAt, agents: [33, 26, 0, 34.5, 26, 0], ball: [33, 26, 2], carrier: 0 }],
      events: [{ t: throwAt, type: 'throw' }, { t: 0.5, type: 'block_contact', a: 0, b: 1 }],
    } }), 0);
    const pressure = packed(2, 2.5), late = packed(3, 2.5);
    expect(pressure.flags.pressure).toBe(true);
    expect(pressure).toMatchObject({ stats: { pressure2yd: true, ttp: 2 } });
    expect('stats' in pressure && pressure.stats.pressured).toBeUndefined();
    expect(late.flags.pressure).toBe(false);
  });

  it('retains opt-in source telemetry and precise actor/event details for the standalone inspector', () => {
    const telemetry = { version: 1 as const, level: 'standard' as const, sampleEvery: 2,
      unavailable: ['Causal trigger unavailable'], decisions: [{ t: 0.05, a: 0, kind: 'coverage-job', chose: 'man:X', cue: null }],
      frames: [{ t: 0, agents: [{ kind: 'man', job: 'man:X', target: 1 }], links: [{ kind: 'man' as const, a: 0, b: 1 }] }] };
    const p = packReplayPlay(play({ replay: {
      los: 35, firstDownX: 45, flip: false,
      players: [{ team: 'D', slot: 'CB_W', name: 'Corner', jersey: 21, pos: 'CB' }],
      profiles: [{ position: 'CB', heightIn: 71, weightLb: 190, ratings: { manCoverage: 85 } }],
      frames: [{ t: 0, agents: [35, 26, 0], ball: [35, 26, 1], carrier: -1 },
        { t: 0.1, agents: [35, 26, 0], ball: [35, 26, 1], carrier: -1 }],
      events: [{ t: 0.05, type: 'read', a: 0, note: 'pass; pPass=0.85' }], telemetry,
    } }), 0);
    expect(p).toMatchObject({ telemetry, profiles: [{ position: 'CB', weightLb: 190 }],
      eventDetails: [{ t: 0.05, type: 'read', a: 0, note: 'pass; pPass=0.85' }] });
    expect('ev' in p && p.ev).toEqual([]); // Detailed events keep useful reads outside legacy highlights.
  });

  it('does not offer an unfilmed log entry or one-frame recording as a clip', () => {
    expect(packReplayPlay(play(), 0)).not.toHaveProperty('frames');
    expect(packReplayPlay(play({ replay: {
      los: 35, firstDownX: 45, flip: false, players: [], events: [],
      frames: [{ t: 0, agents: [], ball: [35, 26, 1], carrier: -1 }],
    } }), 0)).not.toHaveProperty('frames');
  });

  it('exports distinct intended/achieved air depth and recipient identities', () => {
    const replay: NonNullable<PlayLog['replay']> = {
      los: 35, firstDownX: 45, flip: false, players: [], events: [],
      frames: [{ t: 0, agents: [], ball: [35, 26, 1], carrier: -1 }, { t: 1, agents: [], ball: [31, 26, 1], carrier: -1 }],
    };
    const p = packReplayPlay(play({ kind: 'pass', stats: {
      target: 'intended-X', receiver: 'actual-RB', attempted: true, completed: true,
      airYards: 7, completedAirYards: -4, yac: 15,
    } as NonNullable<PlayLog['stats']>, replay }), 0);
    expect(p).toMatchObject({ targetId: 'intended-X', receiverId: 'actual-RB', stats: { air: 7, completedAir: -4, yac: 15 } });
    const legacy = packReplayPlay(play({ stats: { airYards: 7, completed: true } as NonNullable<PlayLog['stats']>, replay }), 0);
    expect(legacy).toMatchObject({ stats: { air: 7 } });
    expect('stats' in legacy && legacy.stats).not.toHaveProperty('completedAir');
  });
});
