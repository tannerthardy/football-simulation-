import { describe, expect, it } from 'vitest';
import { packTelemetry, unpackTelemetry } from '../scripts/replay-telemetry-packing.js';
import type { ReplayTelemetry } from '../src/sim/types.js';

describe('lossless per-play telemetry compression', () => {
  it('roundtrips source snapshots, decisions and Unicode without changing numbers', () => {
    const t: ReplayTelemetry = { version: 1, level: 'full', sampleEvery: 2, sampleSeconds: 0.1,
      unavailable: ['Cause unavailable'],
      frames: Array.from({ length: 30 }, (_, i) => ({ t: i * 0.1,
        agents: [{ kind: 'man', job: 'man:X', target: 1, intent: { velocity: [1.23456789, -0.2] },
          body: { velocity: [1, 2], energy: 0.9, posture: 0.3, balance: 0.7, state: 'up', squeeze: 0,
            lean: [10.12, -18.765], padHeight: 1.4, supportDeviation: [0.05, 0.01] } }],
        links: [{ kind: 'man', a: 0, b: 1 }] })),
      decisions: [{ t: 0.05, a: 0, kind: 'coverage-job', chose: 'man:X', cue: null, detail: 'φ: inside → outside 🏈' }] };
    const original = JSON.stringify(t);
    const packed = packTelemetry(t);
    expect(unpackTelemetry(packed)).toEqual(JSON.parse(original));
    expect(JSON.stringify(t)).toBe(original);
    expect(packed.level).toBe('full');
    expect(packed.sampleSeconds).toBe(0.1);
    expect(JSON.stringify(packed).length).toBeLessThan(original.length / 3);
  });

  it('fails explicitly for a damaged or unsupported payload', () => {
    const valid = packTelemetry({ version: 1, level: 'standard', sampleEvery: 2, unavailable: [], frames: [], decisions: [] });
    expect(() => unpackTelemetry({ ...valid, data: 'invalid-gzip' })).toThrow();
    expect(() => unpackTelemetry({ ...valid, version: 2 } as unknown as typeof valid)).toThrow('Unsupported');
    expect(() => unpackTelemetry({ ...valid, level: 'full' })).toThrow('Invalid');
  });
});
