import assert from 'node:assert/strict';
import { test } from 'node:test';
import { stateBytes } from '../scripts/diag/performance/state-bytes.mjs';

test('ignores packed versus holey storage with identical logical entries', () => {
  const packed = [{ x: 1.25, y: -0 }], holey = new Array(1);
  holey[0] = { x: 1.25, y: -0 };
  assert.deepStrictEqual(packed, holey);
  assert.equal(stateBytes(packed), stateBytes(holey));
});
test('retains exact numeric distinctions and types', () => {
  const values = [0, -0, NaN, Infinity, -Infinity, Number.MIN_VALUE, 1, 1 + Number.EPSILON, '1', undefined, null];
  assert.equal(new Set(values.map(stateBytes)).size, values.length);
});
test('retains missing properties and array holes', () => {
  assert.notEqual(stateBytes({}), stateBytes({ x: undefined }));
  assert.notEqual(stateBytes(new Array(1)), stateBytes([undefined]));
});
test('retains aliasing, cycles and container types', () => {
  const v = { x: 2 }, cycle = {}; cycle.self = cycle;
  assert.notEqual(stateBytes([v, v]), stateBytes([{ x: 2 }, { x: 2 }]));
  assert.equal(stateBytes(cycle), stateBytes(cycle));
  assert.notEqual(stateBytes(new Map([['x', 2]])), stateBytes({ x: 2 }));
  assert.notEqual(stateBytes(new Set([2])), stateBytes([2]));
});
test('retains iteration order and binary view contents', () => {
  assert.notEqual(stateBytes({ x: 1, y: 2 }), stateBytes({ y: 2, x: 1 }));
  assert.notEqual(stateBytes(new Float64Array([0])), stateBytes(new Float64Array([-0])));
});
test('fails instead of silently omitting unsupported state', () => {
  assert.throws(() => stateBytes({ fn() {} }));
  assert.throws(() => stateBytes(new WeakMap()));
});
test('retains private command symbols and distinct symbol identities', () => {
  const first = Symbol('goal'), second = Symbol('goal');
  assert.notEqual(stateBytes({ [first]: 1 }), stateBytes({}));
  assert.notEqual(stateBytes([first, first]), stateBytes([first, second]));
  assert.notEqual(stateBytes(Symbol.for('goal')), stateBytes(first));
});
