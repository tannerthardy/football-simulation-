/**
 * The sim adapter for the shared NFL/sim mechanism metrics: plays are written
 * with x measured past the line in the offense's direction, on a 0.1 s grid,
 * whichever way the offense was moving.
 */
import { describe, expect, it } from 'vitest';
import type { PlayLog } from '../src/game/game.js';
import { commonPlay } from '../scripts/mechanics/sim-export.js';

function play(dir: 1 | -1): PlayLog {
  const los = 50;
  // QB 5 yd behind the line; RB runs 6 yd/s downfield after a 1 s handoff.
  const frames = [0, 0.05, 0.1, 0.15, 0.2].map(t => ({
    t, ball: [los, 20, 0], carrier: 0,
    agents: [los - 5 * dir, 20, 0, los - 6 * dir + 6 * t * dir, 22, 0, los + 1 * dir, 21, 0],
  }));
  return {
    kind: 'run', yards: 3, index: 0,
    replay: {
      frames, los, firstDownX: los + 10 * dir, flip: dir < 0,
      players: [
        { team: 'O', slot: 'QB', name: 'q', jersey: 1, pos: 'QB' },
        { team: 'O', slot: 'RB', name: 'r', jersey: 2, pos: 'RB' },
        { team: 'D', slot: 'DT_S', name: 'd', jersey: 3, pos: 'DT' },
      ],
      events: [{ t: 0.1, type: 'handoff', a: 0, b: 1 }, { t: 0.2, type: 'tackle', a: 2, b: 1 }],
    },
  } as unknown as PlayLog;
}

describe('sim mechanism export', () => {
  it('measures x past the line in the offense direction on a 0.1 s grid', () => {
    for (const dir of [1, -1] as const) {
      const p = commonPlay(play(dir), 'x')!;
      expect(p.xy.length).toBe(3);
      expect(p.xy[0].slice(0, 2)[0]).toBeCloseTo(-5);
      expect(p.xy[2][2]).toBeCloseTo(-6 + 1.2);
      expect(p.xy[0][4]).toBeCloseTo(1);
      expect(p.players.map(x => x.group)).toEqual(['QB', 'RB', 'DL']);
      expect(p.events).toEqual({ handoff: 0.1, first_contact: 0.2, end: 0.2 });
      expect(p.carrier).toBe(1);
    }
  });

  it('mirrors y with x so a left-moving play matches its right-moving twin', () => {
    const right = commonPlay(play(1), 'x')!, left = commonPlay(play(-1), 'x')!;
    expect(left.xy[1][3]).toBeCloseTo(160 / 3 - 22);
    expect(right.xy[1][3]).toBeCloseTo(22);
  });

  it('keeps the intended target separate from the catcher and his post-catch contact', () => {
    const p = play(1);
    p.kind = 'pass';
    p.replay!.players.push({ team: 'O', slot: 'X', name: 'w', jersey: 4, pos: 'WR' });
    for (const frame of p.replay!.frames) frame.agents.push(52 + frame.t, 24, 0);
    p.replay!.events = [
      { t: 0.05, type: 'carrier_contact', a: 2, b: 0 },
      { t: 0.1, type: 'throw', a: 0, b: 1 },
      { t: 0.15, type: 'catch', a: 3 },
      { t: 0.2, type: 'tackle_wrap', a: 2, b: 3 },
      { t: 0.2, type: 'tackle', a: 2, b: 3 },
    ];
    const exported = commonPlay(p, 'different-catcher')!;
    expect(exported.target).toBe(1);
    expect(exported.receiver).toBe(3);
    expect(exported.events.first_contact).toBe(0.2);
    expect(exported.events.catch).toBe(0.15);
    expect(exported.carrier).toBeNull();
  });

  it('exports a strip-sack fumble and the change of possession although no ball was thrown', () => {
    const p = play(1);
    p.kind = 'pass';
    p.replay!.events = [
      { t: 0.1, type: 'sack', a: 2, b: 0 },
      { t: 0.1, type: 'fumble', a: 0, b: 2 },
      { t: 0.15, type: 'recovery', a: 2 },
    ];
    const exported = commonPlay(p, 'strip-sack')!;
    expect(exported.events.fumble).toBe(0.1);
    expect(exported.events.possession_change).toBe(0.15);
    expect(exported.events.end).toBe(0.1);
    expect(exported.labels.ballEvents).toEqual([]);
    expect(exported.labels.ballSecurity).toEqual([
      { t: 0.1, type: 'fumble', a: 0, side: 'O' },
      { t: 0.15, type: 'recovery', a: 2, side: 'D' },
    ]);
    expect(exported.labels.possessionChanges).toEqual([{ t: 0.15, to: 'D', by: 2 }]);
  });

  it('does not call an offensive recovery of its own fumble a change of possession', () => {
    const p = play(1);
    p.replay!.events = [{ t: 0.1, type: 'fumble', a: 1, b: 2 }, { t: 0.2, type: 'recovery', a: 0 }, { t: 0.2, type: 'tackle', a: 2, b: 0 }];
    const exported = commonPlay(p, 'own-recovery')!;
    expect(exported.events.fumble).toBe(0.1);
    expect(exported.events.possession_change).toBeUndefined();
    expect(exported.labels.possessionChanges).toEqual([]);
  });
});
