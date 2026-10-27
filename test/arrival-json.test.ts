import { describe, expect, it } from 'vitest';
import { arrivalJson, parseArrivalJson } from '../scripts/diag/pursuit-arrival.js';

describe('portable pursuit-state JSON', () => {
  it('preserves both signs of zero, including a scalar root', () => {
    for (const value of [-0, 0]) {
      expect(Object.is(parseArrivalJson(arrivalJson(value)), value)).toBe(true);
    }
    expect(arrivalJson(0)).toBe('0\n');
  });

  it('preserves signed vector/array fields alongside existing special values', () => {
    const value = { desired: { x: 0, y: -0 }, samples: [-0, 0, Infinity, -Infinity, NaN], absentValue: undefined };
    expect(parseArrivalJson(arrivalJson(value))).toStrictEqual(value);
  });
});
