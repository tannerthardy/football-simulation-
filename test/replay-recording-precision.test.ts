import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';
import type { PlayLog } from '../src/game/game.js';
import { PlaySim } from '../src/sim/playsim.js';
import { packReplayPlay } from '../scripts/replay-data.js';

const template = readFileSync(new URL('../viewer/replay.template.html', import.meta.url), 'utf8');
const decoder = template.slice(template.indexOf('  for (const p of plays) {'), template.indexOf('  const filmed ='));

function decode(plays: unknown[]) {
  runInNewContext(decoder, { plays });
}

describe('replay coordinate precision through native recording and viewing', () => {
  it('preserves a slow native movement through recording, packing and decoding without advancing the world', () => {
    const body = { facing: 1.234 }, pos = { x: 31.243, y: 26.674 };
    const frames: NonNullable<PlayLog['replay']>['frames'] = [];
    const host = { agents: [{ pos, body }], frames, t: 0, carrier: null,
      ballPos: () => ({ x: 33.243, y: 26.674, z: 1.234 }), trace: { state: () => {} } };
    const record = (PlaySim.prototype as unknown as { recordFrame(): void }).recordFrame;
    record.call(host);
    pos.x += .03; pos.y += .04; host.t = .1;
    record.call(host);
    expect(frames.map(f => f.agents)).toEqual([[31.24, 26.67, 1.23], [31.27, 26.71, 1.23]]);
    const packed = packReplayPlay({ index: 0, quarter: 1, clock: 900, offense: 'O', down: 1, distance: 10,
      yardline: 25, call: 'Recorded fixture', defense: 'D', text: '', yards: 0, score: { home: 0, away: 0 }, kind: 'run',
      replay: { los: 35, firstDownX: 45, flip: false, players: [], events: [], frames } }, 0);
    if (!('frames' in packed)) throw new Error('Missing recorded frames');
    decode([packed]);
    expect(packed.frames.p[0]).toBeCloseTo(31.24, 5);
    expect(packed.frames.p[3] - packed.frames.p[0]).toBeCloseTo(.03, 5);
    expect(packed.frames.p[4] - packed.frames.p[1]).toBeCloseTo(.04, 5);
    expect(packed.frames.b[0]).toBeCloseTo(33.24, 5);
    expect(packed.frames.b[2]).toBeCloseTo(1.23, 5);
    expect(pos).toEqual({ x: 31.273, y: 26.714 });
    expect(body.facing).toBe(1.234);
  });

  it('decodes old unscaled clips and explicit tenths beside hundredths, including posture', () => {
    const clips = [
      { frames: { p: [312, 267, -7], b: [330, 260, 11], s: [8, -9] } },
      { frames: { scale: 10, p: [312, 267, -7], b: [330, 260, 11], s: [8, -9] } },
      { frames: { scale: 100, p: [3120, 2670, -70], b: [3300, 2600, 110], s: [80, -90] } },
    ];
    decode(clips);
    for (const clip of clips) {
      expect(clip.frames.p[0]).toBeCloseTo(31.2, 5);
      expect(clip.frames.p[2]).toBeCloseTo(-.7, 5);
      expect(clip.frames.b[2]).toBeCloseTo(1.1, 5);
      expect(clip.frames.s[0]).toBeCloseTo(.8, 5);
      expect(clip.frames.s[1]).toBeCloseTo(-.9, 5);
    }
  });
});
