import { describe, expect, it } from 'vitest';
import { serialize } from 'node:v8';
import { captureSetup, copySaved, firstDifference } from '../scripts/diag/saved-play.js';
import type { PlaySetup } from '../src/sim/playsim.js';
import { executionBytes } from '../scripts/film-pairs/model.js';

function view(bytes: number[], offset = 0, padding = 0): DataView {
  const storage = new Uint8Array(offset + bytes.length + padding).fill(99);
  storage.set(bytes, offset);
  return new DataView(storage.buffer, offset, bytes.length);
}
const buffer = (bytes: number[]) => Uint8Array.from(bytes).buffer;
const cases = [
  ['DataView', view([1, 2, 255]), [1, 2, 255]],
  ['offset DataView', view([1, 2, 255], 3, 4), [1, 2, 255]],
  ['empty DataView', view([], 2, 3), []],
  ['ArrayBuffer', buffer([1, 2, 255]), [1, 2, 255]],
  ['empty ArrayBuffer', buffer([]), []],
  ['Date', new Date(1234), 1234],
  ['invalid Date', new Date(NaN), NaN],
] as const;
const logical = (v: DataView | ArrayBuffer | Date) => v instanceof Date ? v.getTime()
  : [...(v instanceof DataView ? new Uint8Array(v.buffer, v.byteOffset, v.byteLength) : new Uint8Array(v))];

describe('recorded V8 value comparison (not PlaySetup type promotion)', () => {
  it.each(cases)('retains exact logical %s values through V8 copying', (_name, value, expected) => {
    const restored = copySaved(value);
    expect(logical(value)).toEqual(expected);
    expect(logical(restored)).toEqual(expected);
    expect(restored.constructor.name).toBe(value.constructor.name);
    expect(firstDifference(value, restored)).toBeNull();
    expect(executionBytes(restored)).toEqual(executionBytes(value));
  });

  it.each([
    ['DataView byte', view([1]), view([2]), '$.bytes[0]'],
    ['DataView length', view([1]), view([1, 2]), '$.bytes[1]'],
    ['ArrayBuffer byte', buffer([1]), buffer([2]), '$.bytes[0]'],
    ['ArrayBuffer length', buffer([1]), buffer([1, 2]), '$.bytes[1]'],
    ['Date epoch', new Date(1), new Date(2), '$.timestamp'],
    ['invalid versus valid Date', new Date(NaN), new Date(0), '$.timestamp'],
    ['DataView versus ArrayBuffer', view([1]), buffer([1]), '$'],
    ['DataView versus typed array', view([1]), Uint8Array.of(1), '$'],
    ['Date versus empty record', new Date(0), {}, '$'],
    ['ArrayBuffer versus empty record', buffer([]), {}, '$'],
  ] as const)('distinguishes %s in both diagnostics and canonical bytes', (_name, a, b, path) => {
    expect(executionBytes(a).equals(executionBytes(b))).toBe(false);
    expect(firstDifference(a, b)).toMatchObject({ path });
    expect(firstDifference(b, a)).not.toBeNull();
  });

  it('ignores DataView backing allocation outside the visible range', () => {
    const a = view([1, 2]), b = view([1, 2], 3, 4);
    new Uint8Array(b.buffer)[0] = 17;
    expect(a.byteOffset).not.toBe(b.byteOffset);
    expect(firstDifference(a, b)).toBeNull();
    expect(executionBytes(a)).toEqual(executionBytes(b));
    b.setUint8(1, 3);
    expect(firstDifference(a, b)).toMatchObject({ path: '$.bytes[1]', expected: 2, actual: 3 });
    expect(executionBytes(a).equals(executionBytes(b))).toBe(false);
  });

  it.each(cases.filter(([name]) => ['Date', 'DataView', 'ArrayBuffer'].includes(name)))(
    'still refuses %s in constructor inputs', (_name, value) => {
      // Only the existing prototype whitelist is exercised by this synthetic
      // input; it is not a restorable football setup.
      expect(() => captureSetup({ seed: 1, opaque: value } as unknown as PlaySetup)).toThrow('Unsupported PlaySetup prototype');
    });

  it('retains nested clocks and leaves compared recorded graphs untouched', () => {
    const a = { t: .4, value: new Map([['payload', { when: new Date(1), bytes: view([1, 2], 2) }]]) };
    const b = copySaved(a); b.value.get('payload')!.when.setTime(2);
    const original = serialize({ a, b });
    expect(firstDifference(a, b)).toMatchObject({ path: '$.value.entries[0][1].when.timestamp', time: .4, timeBasis: 'recorded' });
    expect(serialize({ a, b })).toEqual(original);
  });

  it('preserves existing ordinary-state encoding and special numbers exactly', () => {
    // Established v1 bytes, checked before this correction, not new-type output.
    expect(executionBytes(view([])).toString()).toBe('["typed","DataView",[]]');
    expect(executionBytes({ x: -0, y: [NaN, Infinity, undefined] }).toString()).toBe(
      '["object",[["x",["number","-0"]],["y",["array",[["number","NaN"],["number","Infinity"],["undefined"]]]]]]');
    for (const value of [NaN, Infinity, -Infinity, -0, 0]) {
      expect(firstDifference(value, copySaved(value))).toBeNull();
      expect(executionBytes(value)).toEqual(executionBytes(copySaved(value)));
    }
    expect(executionBytes(-0).equals(executionBytes(0))).toBe(false);
    expect(firstDifference(-0, 0)).not.toBeNull();
    expect(firstDifference(new Date(NaN), new Date(NaN))).toBeNull();
  });
});
