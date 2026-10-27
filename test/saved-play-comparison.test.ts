import { serialize } from 'node:v8';
import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/rng.js';
import { compareExecution, firstDifference, type SavedPlay } from '../scripts/diag/saved-play.js';
import { executionBytes } from '../scripts/film-pairs/model.js';

const leftHole = Array(2); leftHole[1] = undefined;
const rightHole = Array(2); rightHole[0] = undefined;

// Synthetic comparator inputs, not evidence of these shapes in native plays.
const equal: Array<[string, unknown, unknown]> = [
  ['dense arrays', [1, null, undefined], [1, null, undefined]],
  ['equal holes', Array(2), Array(2)],
  ['same hole positions', leftHole, [, undefined]],
  ['explicit undefined', [undefined], [undefined]],
  ['nested objects', { x: { y: [undefined] } }, { x: { y: [undefined] } }],
  ['Maps with value-equal object keys', new Map([[{ id: 1 }, { x: undefined }]]), new Map([[{ id: 1 }, { x: undefined }]])],
  ['ordered Sets', new Set([1, undefined]), new Set([1, undefined])],
  ['typed values', new Float64Array([NaN, Infinity, -Infinity, -0]), new Float64Array([NaN, Infinity, -Infinity, -0])],
  ['equal NaN', NaN, NaN],
  ['equal positive infinity', Infinity, Infinity],
  ['equal negative infinity', -Infinity, -Infinity],
  ['equal negative zero', -0, -0],
];
const different: Array<[string, unknown, unknown, string]> = [
  ['hole versus undefined', Array(1), [undefined], '$[0]'],
  ['undefined versus hole', [undefined], Array(1), '$[0]'],
  ['different hole positions', leftHole, rightHole, '$[0]'],
  ['nested hole', { x: [Array(1)] }, { x: [[undefined]] }, '$.x[0][0]'],
  ['absent object field', {}, { x: undefined }, '$.x'],
  ['Map value', new Map([['a', 1]]), new Map([['a', 2]]), '$.entries[0][1]'],
  ['Map key', new Map([['a', 1]]), new Map([['b', 1]]), '$.entries[0][0]'],
  ['absent Map entry versus undefined', new Map(), new Map([['a', undefined]]), '$.entries[0]'],
  ['Map insertion order', new Map([['a', 1], ['b', 2]]), new Map([['b', 2], ['a', 1]]), '$.entries[0][0]'],
  ['nested Map value', { x: new Map([['a', { y: Array(1) }]]) }, { x: new Map([['a', { y: [undefined] }]]) }, '$.x.entries[0][1].y[0]'],
  ['Set value', new Set([1]), new Set([2]), '$.values[0]'],
  ['Set insertion order', new Set([1, 2]), new Set([2, 1]), '$.values[0]'],
  ['typed value', new Uint8Array([1]), new Uint8Array([2]), '$.values[0]'],
  ['typed signed zero', new Float64Array([-0]), new Float64Array([0]), '$.values[0]'],
  ['typed element kind', new Uint8Array([1]), new Uint16Array([1]), '$'],
  ['array versus object', [undefined], { 0: undefined }, '$'],
  ['Map versus object', new Map(), {}, '$'],
  ['Set versus Map', new Set(), new Map(), '$'],
  ['typed array versus array', new Uint8Array([1]), [1], '$'],
  ['signed zero', -0, 0, '$'],
  ['infinity sign', Infinity, -Infinity, '$'],
  ['NaN versus null', NaN, null, '$'],
];

describe('saved-play exact diagnostic comparison', () => {
  it.each(equal)('preserves equality for %s', (_name, expected, actual) => {
    expect(executionBytes(expected).equals(executionBytes(actual))).toBe(true);
    expect(firstDifference(expected, actual)).toBeNull();
  });

  it.each(different)('finds %s consistently with lossless execution bytes', (_name, expected, actual, path) => {
    expect(executionBytes(expected).equals(executionBytes(actual))).toBe(false);
    expect(firstDifference(expected, actual)).toMatchObject({ path });
    expect(firstDifference(actual, expected)).not.toBeNull();
  });

  it('distinguishes absent indices from present undefined without changing length witnesses', () => {
    expect(firstDifference(Array(1), [undefined])).toMatchObject({ path: '$[0]', expected: '<absent>', actual: '<undefined>' });
    expect(firstDifference([undefined], Array(1))).toMatchObject({ path: '$[0]', expected: '<undefined>', actual: '<absent>' });
    expect(firstDifference([], [undefined])).toMatchObject({ path: '$[0]', expected: '<absent>', actual: '<undefined>' });
    expect(firstDifference(Array(1), Array(2))).not.toBeNull();
  });

  it('retains the recorded clock for a hole difference nested in a frame', () => {
    expect(firstDifference([{ t: .4, values: Array(1) }], [{ t: .4, values: [undefined] }]))
      .toMatchObject({ path: '$[0].values[0]', time: .4, timeBasis: 'recorded' });
  });

  it('exposes synthetic presence/Map mismatches to the capture-source guard comparator', () => {
    // Deliberately minimal diagnostic packets, not restorable constructor captures.
    const packet = (value: unknown) => ({ initial: { actors: value }, result: { duration: 1, events: [] }, replay: undefined }) as unknown as SavedPlay['original'];
    for (const [a, b, path] of [
      [Array(1), [undefined], '$.initial.actors[0]'],
      [new Map([['a', 1]]), new Map([['a', 2]]), '$.initial.actors.entries[0][1]'],
    ] as const) {
      const expected = packet(a), actual = packet(b);
      expect(executionBytes(expected).equals(executionBytes(actual))).toBe(false);
      expect(compareExecution(expected, actual)).toMatchObject({ path, time: 0, timeBasis: 'initialization' });
    }
  });

  it('leaves compared graphs and advanced random state unchanged', () => {
    const rng = new Rng(17); rng.normal(0, 1);
    const expected = { rng, values: new Map([['a', leftHole]]) };
    const actual = { rng, values: new Map([['a', rightHole]]) };
    const before = serialize({ expected, actual });
    expect(firstDifference(expected, actual)).not.toBeNull();
    expect(serialize({ expected, actual })).toEqual(before);
  });
});
